// src/ai/ai-client.js — 런타임 AI 호출 래퍼 (AI-25~30)
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
    const canon = JSON.stringify([kind, _clip(input?.question, 3000),
        _clip(input?.selected, 600), _clip(input?.correct, 600)]);
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
    void reportEvent('ai_feature', { feature: 'wrong_feedback', result, ...extra })
        .catch(() => {});
}

/**
 * 오답 맞춤 피드백 요청 — 서버 프록시 우선, BYOK 순차 폴백 (AI-27/29).
 * @param {object} input - buildWrongFeedbackPrompt 인자 계약
 * @param {object} [deps] 테스트 주입용 { fetchImpl, session }
 * @returns {Promise<{ok:boolean, explain?:string, confused?:string,
 *   remaining?:number|null, route?:'server'|'byok'|'cache', cached?:boolean,
 *   code?:string, error?:string}>}
 */
export async function requestWrongFeedback(input, deps = {}) {
    // 필수 인자 검증 — 부족하면 서버·BYOK 어느 경로도 성립하지 않으므로 호출 전에 차단.
    // 조립된 프롬프트는 BYOK 폴백에서 재사용한다 (서버는 인자를 받아 자체 템플릿으로 조립).
    const byokPrompt = buildWrongFeedbackPrompt(input);
    if (!byokPrompt) {
        _featureEvent('error', { route: 'none', code: 'invalid' });
        return { ok: false, code: 'invalid', error: 'AI 해설을 만들 정보가 부족합니다.' };
    }
    const cacheKey = _cacheKey('wrong_feedback', input);
    const hit = _cacheGet(cacheKey);
    if (hit) {
        _featureEvent('cache_hit');
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
                body: JSON.stringify({ kind: 'wrong_feedback', input }),
                signal: ctrl?.signal,
            });
            let body = null;
            try { body = await res.json(); } catch { /* 비-JSON */ }
            if (res.ok && body?.ok && body.explain) {
                const result = { explain: String(body.explain), confused: String(body.confused || '') };
                _cacheSet(cacheKey, result);
                _featureEvent('success', { route: 'server' });
                return { ok: true, ...result, route: 'server', remaining: body.remaining ?? null };
            }
            if (res.status === 429 || body?.code === 'quota') {
                // 서버 일일 쿼터 소진 — 기능적 응답이므로 폴백하지 않는다 (AI-26)
                _featureEvent('quota', { route: 'server' });
                return {
                    ok: false, code: 'quota',
                    error: '오늘 무료 AI 해설 횟수를 모두 사용했습니다 — 내일 다시 시도하거나 Pro를 이용하세요.',
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
        const res = await callProviderLLM(BYOK_SYSTEM, byokPrompt, {
            fetchImpl: deps.fetchImpl, maxTokens: 400,
        });
        if (res.ok) {
            const parsed = parseFeedbackResponse(res.text);
            if (parsed) {
                _cacheSet(cacheKey, parsed);
                _featureEvent('success', { route: 'byok' });
                return { ok: true, ...parsed, route: 'byok' };
            }
            _featureEvent('error', { route: 'byok', code: 'unreadable' });
            return { ok: false, code: 'unreadable', error: 'AI 해설을 해석하지 못했습니다 — 다시 시도해 보세요.' };
        }
        _featureEvent('error', { route: 'byok', code: res.code || 'http' });
        return { ok: false, code: res.code || 'http', error: res.error || 'AI 해설을 불러오지 못했습니다.' };
    }

    // ── 둘 다 불가 → 무표시 계약 (호출부는 기능을 숨긴다) ──
    _featureEvent('error', { route: 'none', code: serverFail.code });
    return {
        ok: false, code: serverFail.code,
        error: serverFail.code === 'unauthorized'
            ? 'AI 해설은 로그인 후 이용할 수 있습니다.'
            : 'AI 해설을 불러오지 못했습니다 — 잠시 후 다시 시도하세요.',
    };
}
