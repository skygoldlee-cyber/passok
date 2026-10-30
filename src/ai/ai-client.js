// src/ai/ai-client.js — 런타임 AI 호출 래퍼 (AI-25~30)
// @spec AI-27~30
// 설계: docs/dev/design/AI_COACH_DESIGN.md §3
// ------------------------------------------------------------
// 서버 프록시(ai-proxy Edge Function)를 우선 쓰고, 실패·미로그인 시 기존
// BYOK(written-grading.js 공급자 계약)로 순차 폴백한다 (AI-29). 둘 다
// 불가하면 호출부는 해당 기능을 표시하지 않는다.
// - 세션 토큰: getAuthSession()의 access_token을 Bearer로 첨부 (로그인 게이트)
// - 타임아웃: 10s AbortController
// - 캐시: 콘텐츠 해시(ai_cache_<sha256>) — 동일 오답 재요청은 쿼터·비용을 쓰지 않음
// - 계측: ai_feature 이벤트로 기능·성공/실패·캐시 히트만 집계 (내용 미수집, AI-28)
// ------------------------------------------------------------
import { SUPABASE_URL, isSupabaseConfigured } from '../auth-sync/supabase-config.js';
import { getAuthSession } from '../auth-sync/supabase-client.js';
import { reportEvent } from '../telemetry/usage-telemetry.js';
import { getItem, setItem, listKeys, removeItemRaw } from '../storage.js';
import { unscopedKey } from '../exam-context.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { sha256hex } from '../sha256.js';
import { getAiKey, callProviderLLM } from '../written/written-grading.js';

const PROXY_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일 — 교재 교체 전까지는 해설이 유효
const CACHE_MAX = 100;                          // 응답 캐시 키 상한 — 초과 시 가장 오래된 것부터

/* =========================================================
   프롬프트 계약 (AI-30) — BYOK 폴백 전용 미러.
   ⚠️ 서버 템플릿은 tools/supabase/functions/ai-proxy/index.ts가 정본 —
      템플릿 변경 시 양쪽을 함께 바꿀 것. 자유 입력 채널은 없고
      구조화 인자만 길이 제한과 함께 허용한다.
   ========================================================= */

const BYOK_SYSTEM = `당신은 자격시험 학습 코치입니다. 수험생이 틀린 문항을 보내면 왜 틀렸는지 분석합니다.
- 해설은 1~2문장으로 짧게, 오답을 고른 이유(혼동 포인트)에 집중합니다.
- 정답을 다시 나열하지 말고, 혼동 개념(confused_concept)은 1어절로 짚습니다.
- 교재 근거가 주어지면 그 범위 안에서만 설명하고, 근거에 없는 사실은 단정하지 않습니다.
- JSON만 응답합니다.`;

const _clip = (v, max) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s ? s.slice(0, max) : '';
};
const _clipList = (v) => Array.isArray(v)
    ? v.slice(0, 8).map(x => _clip(x, 300)).filter(Boolean) : [];

/**
 * wrong_feedback 프롬프트 조립 (서버 미러) — 구조화 인자 → 고정 템플릿.
 * @param {{question:string, selected:string, correct:string,
 *   options?:string[], misjudged?:string[], citation?:string}} input
 * @returns {string|null} 필수 인자 부족 시 null
 */
export function buildWrongFeedbackPrompt(input) {
    const question = _clip(input?.question, 3000);
    const selected = _clip(input?.selected, 600);
    const correct = _clip(input?.correct, 600);
    if (!question || !selected || !correct) return null;
    const options = _clipList(input?.options);
    const misjudged = _clipList(input?.misjudged);
    const citation = _clip(input?.citation, 600);
    return `## 문항
${question}
${options.length ? `\n## 선지\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n` : ''}
## 수험생이 고른 오답
${selected}

## 정답
${correct}
${misjudged.length ? `\n## 수험생이 오판한 진술\n${misjudged.map(s => `- ${s}`).join('\n')}\n` : ''}${citation ? `\n## 교재 근거\n${citation}\n` : ''}
응답 형식(JSON만): {"explain":"오답 원인 해설 1~2문장","confused_concept":"혼동 개념 1어절"}`;
}

/** LLM 텍스트 → {explain, confused} — 코드펜스·잡음 텍스트 허용 */
export function parseFeedbackResponse(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const cleaned = text.replace(/```(?:json)?/g, '').trim();
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s < 0 || e <= s) return null;
    let data;
    try { data = JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
    const explain = String(data?.explain ?? '').trim().slice(0, 500);
    const confused = String(data?.confused_concept ?? data?.confused ?? '').trim().slice(0, 60);
    return explain ? { explain, confused } : null;
}

/* =========================================================
   응답 캐시 — 콘텐츠 해시 키 (동일 오답 재요청 무료)
   ========================================================= */

function _cacheKey(kind, input) {
    // kind별 입력 전 필드를 정규화 — 문자열은 서버 상한으로 잘라 결정적 키 생성
    const canon = JSON.stringify([kind, input && typeof input === 'object'
        ? Object.keys(input).sort().map(k => [k,
            typeof input[k] === 'string' ? input[k].slice(0, 3000)
                : Array.isArray(input[k]) ? input[k].slice(0, 8) : input[k]])
        : input]);
    return STORAGE_KEYS.AI_CACHE_PREFIX + sha256hex(canon);
}

function _cacheGet(key) {
    try {
        const v = JSON.parse(getItem(key) || 'null');
        if (!v || typeof v.explain !== 'string' || !v.explain) return null;
        if (v.ts && Date.now() - v.ts > CACHE_TTL_MS) return null;
        return { explain: v.explain, confused: String(v.confused || '') };
    } catch { return null; }
}

function _cacheSet(key, result) {
    // 키 상한 — 초과 시 ts가 가장 오래된 항목부터 정리
    try {
        const keys = listKeys(k => k.startsWith(STORAGE_KEYS.AI_CACHE_PREFIX));
        if (keys.length >= CACHE_MAX) {
            const aged = keys.map(k => {
                let ts = 0;
                try { ts = JSON.parse(getItem(unscopedKey(k)) || '{}').ts || 0; } catch { ts = 0; }
                return { k, ts };
            }).sort((a, b) => a.ts - b.ts);
            aged.slice(0, keys.length - CACHE_MAX + 1).forEach(({ k }) => removeItemRaw(k));
        }
    } catch { /* 정리 실패는 캐시 쓰기를 막지 않음 */ }
    setItem(key, JSON.stringify({ ts: Date.now(), ...result }));
}

/* =========================================================
   가용성·호출
   ========================================================= */

/**
 * AI 기능 사용 가능 여부 — 로그인 세션(서버 경로) 또는 BYOK 키(폴백 경로).
 * UI는 이 결과가 false일 때 기능을 표시하지 않는다 (AI-29 무표시 계약).
 * @param {object} [deps] 테스트 주입용 { session }
 */
export async function aiFeedbackAvailable(deps = {}) {
    if (getAiKey()) return true;
    if (!isSupabaseConfigured()) return false;
    const session = 'session' in deps ? deps.session : await getAuthSession().catch(() => null);
    return !!session;
}

function _featureEvent(result, extra = {}) {
    const { feature = 'wrong_feedback', ...rest } = extra;
    void reportEvent('ai_feature', { feature, result, ...rest })
        .catch(() => {});
}

/**
 * 런타임 AI 공용 호출 — 서버 프록시 우선, BYOK 순차 폴백 (AI-29).
 * @param {object} spec {kind, feature, buildPrompt, system, featureLabel}
 *   - kind: ai-proxy kind (서버 템플릿 라우팅 키)
 *   - feature: ai_feature 계측용 기능명
 *   - buildPrompt: BYOK 미러 템플릿 (서버 정본과 동형 유지)
 *   - system: BYOK 폴백용 시스템 프롬프트 (서버 KINDS[kind].system 미러)
 *   - featureLabel: 사용자 오류 문구용 기능명
 *   - extractBody?: 서버 JSON 응답 → 결과 객체|null (기본 explain/confused 추출)
 *   - parseText?: BYOK 원문 → 결과 객체|null (기본 parseFeedbackResponse)
 * @param {object} input - 구조화 인자 (AI-30 — 자유 입력 없음)
 * @param {object} [deps] 테스트 주입용 { fetchImpl, session }
 * @returns {Promise<{ok:boolean, explain?:string, confused?:string, items?:object[],
 *   remaining?:number|null, route?:'server'|'byok'|'cache', cached?:boolean,
 *   code?:string, error?:string}>}
 */
async function _requestAi(spec, input, deps = {}) {
    const { kind, feature, buildPrompt, system, featureLabel } = spec;
    // 필수 인자 검증 — 부족하면 서버·BYOK 어느 경로도 성립하지 않으므로 호출 전에 차단.
    // 조립된 프롬프트는 BYOK 폴백에서 재사용한다 (서버는 인자를 받아 자체 템플릿으로 조립).
    const byokPrompt = buildPrompt(input);
    if (!byokPrompt) {
        _featureEvent('error', { feature, route: 'none', code: 'invalid' });
        return { ok: false, code: 'invalid', error: `${featureLabel}에 필요한 정보가 부족합니다.` };
    }
    const cacheKey = _cacheKey(kind, input);
    const hit = _cacheGet(cacheKey);
    if (hit) {
        _featureEvent('cache_hit', { feature });
        return { ok: true, ...hit, route: 'cache', cached: true };
    }

    // ── 1차: 서버 프록시 (로그인 필요) ──
    const session = 'session' in deps ? deps.session
        : (isSupabaseConfigured() ? await getAuthSession().catch(() => null) : null);
    let serverFail = null;
    if (session?.access_token) {
        const fetchImpl = deps.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), PROXY_TIMEOUT_MS) : null;
        try {
            const res = await fetchImpl(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ kind, input }),
                signal: ctrl?.signal,
            });
            let body = null;
            try { body = await res.json(); } catch { /* 비-JSON */ }
            const extracted = body?.ok
                ? (spec.extractBody ? spec.extractBody(body)
                    : (body.explain ? { explain: String(body.explain), confused: String(body.confused || '') } : null))
                : null;
            if (res.ok && extracted) {
                const result = extracted;
                _cacheSet(cacheKey, result);
                _featureEvent('success', { feature, route: 'server' });
                return { ok: true, ...result, route: 'server', remaining: body.remaining ?? null };
            }
            if (res.status === 429 || body?.code === 'quota') {
                // 서버 일일 쿼터 소진 — 기능적 응답이므로 폴백하지 않는다 (AI-26)
                _featureEvent('quota', { feature, route: 'server' });
                return {
                    ok: false, code: 'quota',
                    error: '오늘 무료 AI 사용 횟수를 모두 사용했습니다 — 내일 다시 시도하거나 Pro를 이용하세요.',
                    remaining: body?.remaining ?? 0,
                };
            }
            serverFail = body?.code === 'unauthorized' || res.status === 401
                ? { code: 'unauthorized' }
                : { code: res.status ? 'http' : 'upstream', status: res.status };
        } catch (e) {
            serverFail = { code: e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network' };
        } finally {
            if (timer) clearTimeout(timer);
        }
        if (!fetchImpl) serverFail = { code: 'network' };
    } else {
        serverFail = { code: 'unauthorized' };
    }

    // ── 2차: BYOK 폴백 — 사용자 본인 키가 있으면 같은 템플릿으로 직접 호출 ──
    if (getAiKey()) {
        const res = await callProviderLLM(system, byokPrompt, {
            fetchImpl: deps.fetchImpl, maxTokens: 400,
        });
        if (res.ok) {
            const parsed = (spec.parseText || parseFeedbackResponse)(res.text);
            if (parsed) {
                _cacheSet(cacheKey, parsed);
                _featureEvent('success', { feature, route: 'byok' });
                return { ok: true, ...parsed, route: 'byok' };
            }
            _featureEvent('error', { feature, route: 'byok', code: 'unreadable' });
            return { ok: false, code: 'unreadable', error: `${featureLabel} 결과를 해석하지 못했습니다 — 다시 시도해 보세요.` };
        }
        _featureEvent('error', { feature, route: 'byok', code: res.code || 'http' });
        return { ok: false, code: res.code || 'http', error: res.error || `${featureLabel}을 불러오지 못했습니다.` };
    }

    // ── 둘 다 불가 → 무표시 계약 (호출부는 기능을 숨긴다) ──
    _featureEvent('error', { feature, route: 'none', code: serverFail.code });
    return {
        ok: false, code: serverFail.code,
        error: serverFail.code === 'unauthorized'
            ? `${featureLabel}은 로그인 후 이용할 수 있습니다.`
            : `${featureLabel}을 불러오지 못했습니다 — 잠시 후 다시 시도하세요.`,
    };
}

/**
 * 오답 맞춤 피드백 요청 — 서버 프록시 우선, BYOK 순차 폴백 (AI-27/29).
 * @param {object} input - buildWrongFeedbackPrompt 인자 계약
 * @param {object} [deps] 테스트 주입용 { fetchImpl, session }
 * @returns {Promise<{ok:boolean, explain?:string, confused?:string,
 *   remaining?:number|null, route?:'server'|'byok'|'cache', cached?:boolean,
 *   code?:string, error?:string}>}
 */
export function requestWrongFeedback(input, deps = {}) {
    return _requestAi({
        kind: 'wrong_feedback', feature: 'wrong_feedback', featureLabel: 'AI 해설',
        buildPrompt: buildWrongFeedbackPrompt, system: BYOK_SYSTEM,
    }, input, deps);
}

/* =========================================================
   weekly_diagnosis — 자연어 주간 진단 (AI-33)
   집계 수치·라벨만 입력 — 문항 내용·학습 원문 미포함 (AI-30 계약)
   ========================================================= */

const BYOK_DIAG_SYSTEM = `당신은 자격시험 학습 코치입니다. 수험생의 주간 학습 수치를 보내면 이번 주 평가와 다음 주 행동을 조언합니다.
- 평가 1문장 + 다음 주 행동 제안 1~2문장, 총 2~3문장으로 짧게.
- 수치에 없는 사실은 단정하지 않고, 과목·개념 라벨이 주어지면 그 이름으로만 언급합니다.
- JSON만 응답합니다.`;

const _diagNum = (v, lo, hi) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(lo, Math.round(n)), hi) : null;
};

/**
 * weekly_diagnosis 프롬프트 조립 (서버 미러) — 집계 수치+라벨 → 고정 템플릿.
 * @param {object} input {solvedWeek?, planWeek?, wrongWeek?, weekRate?, rateDelta?,
 *   dday?, projectedCoverage?, neededPerDay?, topCluster?, weakestSubject?}
 * @returns {string|null} 핵심 수치가 하나도 없으면 null
 */
export function buildWeeklyDiagnosisPrompt(input) {
    const lines = [];
    const solved = _diagNum(input?.solvedWeek, 0, 9999);
    const plan = _diagNum(input?.planWeek, 0, 9999);
    const wrong = _diagNum(input?.wrongWeek, 0, 9999);
    const rate = _diagNum(input?.weekRate, 0, 100);
    const delta = _diagNum(input?.rateDelta, -100, 100);
    const dday = _diagNum(input?.dday, -999, 999);
    const cover = _diagNum(input?.projectedCoverage, 0, 100);
    const needed = _diagNum(input?.neededPerDay, 0, 999);
    const cluster = _clip(input?.topCluster, 60);
    const weakSubj = _clip(input?.weakestSubject, 60);
    const hasNum = [solved, plan, wrong, rate, dday, cover, needed].some(v => v !== null);
    if (solved !== null) lines.push(`- 이번 주 풀이: ${solved}문${plan !== null ? ` (계획 ${plan}문)` : ''}`);
    else if (plan !== null) lines.push(`- 주간 계획: ${plan}문`);
    if (wrong !== null) lines.push(`- 이번 주 오답: ${wrong}문`);
    if (rate !== null) lines.push(`- 주간 정답률: ${rate}%${delta !== null ? ` (전주 대비 ${delta > 0 ? '+' : ''}${delta}%p)` : ''}`);
    if (dday !== null) lines.push(dday >= 0 ? `- 시험까지: D-${dday}` : `- 시험 경과: D+${-dday}`);
    if (cover !== null) lines.push(`- 현재 페이스 커버 예상: ${cover}%${needed !== null ? ` (필요 페이스 학습일당 ${needed}장)` : ''}`);
    if (cluster) lines.push(`- 최다 오개념: ${cluster}`);
    if (weakSubj) lines.push(`- 취약 과목: ${weakSubj}`);
    if (!hasNum) return null;  // 라벨만으로는 진단 불가 — 수치가 최소 1개 필요
    return `## 이번 주 학습 수치\n${lines.join('\n')}
응답 형식(JSON만): {"explain":"평가+다음 주 행동 제안 2~3문장","confused_concept":"핵심 키워드 1어절"}`;
}

/**
 * 자연어 주간 진단 요청 (AI-33) — analysis-engine 집계 수치 → 코칭 문장.
 * @param {object} input - buildWeeklyDiagnosisPrompt 인자 계약
 * @param {object} [deps] 테스트 주입용 { fetchImpl, session }
 */
export function requestWeeklyDiagnosis(input, deps = {}) {
    return _requestAi({
        kind: 'weekly_diagnosis', feature: 'weekly_diagnosis', featureLabel: 'AI 주간 코칭',
        buildPrompt: buildWeeklyDiagnosisPrompt, system: BYOK_DIAG_SYSTEM,
    }, input, deps);
}

/* =========================================================
   plan_adjust — 주간 계획 조정 조언 (AI-35)
   구조화 입력(여유 선택지)만 — 자유 텍스트 없음 (AI-30 준수)
   ========================================================= */

const BYOK_PLAN_SYSTEM = `당신은 자격시험 학습 코치입니다. 수험생의 주간 수치와 이번 주 여유 선택을 보내면 계획 조정을 조언합니다.
- 조정 방향 1문장 + 구체 배분 제안 1~2문장, 총 2~3문장으로 짧게.
- 수치에 없는 사실은 단정하지 않고, 과목·개념 라벨은 주어진 이름으로만 언급합니다.
- JSON만 응답합니다.`;

const PLAN_BANDWIDTH_LABEL = { 부족: '시간 부족(줄여야 함)', 보통: '보통(현행 유지)', 넉넉: '넉넉(늘릴 수 있음)' };

/**
 * plan_adjust 프롬프트 조립 (서버 미러) — 주간 수치 + 여유 선택지 → 조정 조언.
 * @param {object} input - buildWeeklyDiagnosisPrompt 인자 + {bandwidth: '부족'|'보통'|'넉넉'}
 * @returns {string|null}
 */
export function buildPlanAdjustPrompt(input) {
    const base = buildWeeklyDiagnosisPrompt(input);
    if (!base) return null;
    const bw = _clip(input?.bandwidth, 10);
    const label = PLAN_BANDWIDTH_LABEL[bw] || PLAN_BANDWIDTH_LABEL.보통;
    return `${base}\n- 이번 주 학습 여유: ${label}
조정 지시: 여유에 맞춰 다음 주 배분·우선순위를 조언 (수치 목표는 바꾸지 말고 배분만)`;
}

/**
 * 주간 계획 조정 요청 (AI-35) — 구조화 입력 전용, 실제 배분 변경 없음(조언만).
 * @param {object} input - buildPlanAdjustPrompt 인자 계약
 * @param {object} [deps]
 */
export function requestPlanAdjust(input, deps = {}) {
    return _requestAi({
        kind: 'plan_adjust', feature: 'plan_adjust', featureLabel: 'AI 플랜 조정',
        buildPrompt: buildPlanAdjustPrompt, system: BYOK_PLAN_SYSTEM,
    }, input, deps);
}

/* =========================================================
   quiz_gen — 약점 생성형 미니퀴즈 (AI-38)
   출력은 gen-gate(AI-37) 통과분만 출제 — 호출부 책임
   ========================================================= */

const BYOK_QUIZ_SYSTEM = `당신은 자격시험 출제자입니다. 주어진 근거 범위 내에서만 객관식 문항을 만듭니다.
- 근거에 없는 사실은 출제하지 않고, 모든 문항에 인용(citation)을 답니다.
- 기존 문항이 주어지면 중복되지 않는 문항을 만듭니다.
- 정답은 선지 중 하나와 완전히 동일해야 합니다.
- JSON만 응답합니다.`;

/**
 * quiz_gen 프롬프트 조립 (서버 미러) — 취약 개념+교재 근거 → 문항 생성.
 * @param {object} input {cluster?, evidence?, existing?[], count?}
 * @returns {string|null}
 */
export function buildQuizGenPrompt(input) {
    const cluster = _clip(input?.cluster, 80);
    const evidence = _clip(input?.evidence, 1200);
    if (!cluster && !evidence) return null;
    const existing = (Array.isArray(input?.existing) ? input.existing : [])
        .slice(0, 8).map(q => _clip(q, 300)).filter(Boolean);
    const n = _diagNum(input?.count, 1, 3) ?? 2;
    return `## 출제 대상 개념\n${cluster ?? '약점 복습'}
${evidence ? `\n## 교재 근거 (반드시 이 범위에서 출제)\n${evidence}\n` : ''}
${existing.length ? `\n## 기존 문항 (중복 금지)\n${existing.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n` : ''}
위 근거로 객관식 문항 ${n}개 생성 — 각 문항은 인용 근거(citation)와 4개 선지 필수.
응답 형식(JSON만): {"items":[{"question":"...","options":["...","...","...","..."],"answer":"선지 중 하나와 동일","citation":"근거 조문·구절","explain":"1문장 해설"}]}`;
}

/**
 * BYOK 응답 원문 → items 배열 파싱 — 배열 본문·{items:[...]} 모두 수용.
 * @param {string} rawText
 * @returns {{items:object[]}|null}
 */
export function parseItemsResponse(rawText) {
    const t = String(rawText || '').trim();
    if (!t) return null;
    const start = t.search(/[[{]/);
    if (start < 0) return null;
    const end = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
    if (end < start) return null;
    try {
        const parsed = JSON.parse(t.slice(start, end + 1));
        const items = Array.isArray(parsed) ? parsed
            : Array.isArray(parsed?.items) ? parsed.items : [];
        return items.length ? { items: items.slice(0, 5) } : null;
    } catch {
        return null;
    }
}

/**
 * 약점 생성형 미니퀴즈 요청 (AI-38) — 결과는 반드시 gen-gate로 걸러 출제.
 * @param {object} input - buildQuizGenPrompt 인자 계약
 * @param {object} [deps]
 */
export function requestWeakQuizGen(input, deps = {}) {
    return _requestAi({
        kind: 'quiz_gen', feature: 'weak_quiz_gen', featureLabel: 'AI 미니퀴즈',
        buildPrompt: buildQuizGenPrompt, system: BYOK_QUIZ_SYSTEM,
        extractBody: b => (Array.isArray(b.items) && b.items.length ? { items: b.items } : null),
        parseText: parseItemsResponse,
    }, input, deps);
}
