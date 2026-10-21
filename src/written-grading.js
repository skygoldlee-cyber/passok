// src/written-grading.js — 주관식 연습 AI 보조 채점 (설계 §4 2단계)
// @spec WP-07~08
// ============================================================
// 사용자 제공 API 키로 브라우저에서 LLM을 직접 호출해 서술·계산형 답안을
// 채점기준(rubric) 항목별로 평가한다. 공급자 계약은 tools/ai/llm_client.js와
// 동일 (openai·anthropic·gemini), 키는 디바이스 로컬 저장 — 백업·동기 제외.
// AI 판정은 "제안" — 체크박스에 반영되지만 사용자가 수정 가능하고,
// 자기평가 완료(d 플래그)는 여전히 사용자 수동 액션이다.
// ============================================================
import { getItem, setItem, removeItem } from './storage.js';
import { STORAGE_KEYS } from './storage-keys.js';

/* =========================================================
   공급자 계약 (tools/ai/llm_client.js PROVIDERS 미러 — 브라우저용)
   ========================================================= */

const PROVIDERS = {
    openai: {
        label: 'OpenAI',
        defaultModel: 'gpt-4o-mini',
        url: 'https://api.openai.com/v1/chat/completions',
        buildBody: (model, system, prompt, maxTokens) => ({
            model, max_tokens: maxTokens,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: prompt },
            ],
        }),
        headers: key => ({ 'Authorization': `Bearer ${key}` }),
        extract: j => (j.choices && j.choices[0] && j.choices[0].message
            ? j.choices[0].message.content : '') || '',
    },
    anthropic: {
        label: 'Anthropic',
        defaultModel: 'claude-haiku-4-5-20251001',
        url: 'https://api.anthropic.com/v1/messages',
        buildBody: (model, system, prompt, maxTokens) => ({
            model, max_tokens: maxTokens,
            ...(system ? { system } : {}),
            messages: [{ role: 'user', content: prompt }],
        }),
        headers: key => ({
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        }),
        extract: j => (j.content || []).map(b => b.text || '').join(''),
    },
    gemini: {
        label: 'Gemini',
        defaultModel: 'gemini-3.8-flash',
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        buildBody: (model, system, prompt) => ({
            contents: [{ parts: [{ text: prompt }] }],
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        }),
        headers: key => ({ 'x-goog-api-key': key }),
        extract: j => {
            const c = j.candidates && j.candidates[0];
            return ((c && c.content && c.content.parts) || []).map(p => p.text || '').join('');
        },
        buildUrl: (model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    },
};

export const AI_PROVIDERS = Object.keys(PROVIDERS);

/* =========================================================
   설정 (WP-07) — 키는 디바이스 로컬·백업 제외, 공급자·모델은 환경설정
   ========================================================= */

export function getAiProvider() {
    const p = (getItem(STORAGE_KEYS.WRITTEN_AI_PROVIDER) || 'gemini').toLowerCase();
    return PROVIDERS[p] ? p : 'gemini';
}
export function saveAiProvider(p) {
    const v = String(p || '').toLowerCase();
    if (!PROVIDERS[v]) return getAiProvider();
    setItem(STORAGE_KEYS.WRITTEN_AI_PROVIDER, v);
    return v;
}
export function getAiModel() {
    return (getItem(STORAGE_KEYS.WRITTEN_AI_MODEL) || '').trim()
        || PROVIDERS[getAiProvider()].defaultModel;
}
export function saveAiModel(model) {
    const m = String(model || '').slice(0, 80).trim()
        .replace(/[^a-zA-Z0-9._-]/g, '');
    if (!m) { removeItem(STORAGE_KEYS.WRITTEN_AI_MODEL); return PROVIDERS[getAiProvider()].defaultModel; }
    setItem(STORAGE_KEYS.WRITTEN_AI_MODEL, m);
    return m;
}
export function getAiKey() {
    return getItem(STORAGE_KEYS.WRITTEN_AI_KEY) || '';
}
export function saveAiKey(key) {
    const k = String(key || '').slice(0, 200).trim();
    if (!k) return false;
    setItem(STORAGE_KEYS.WRITTEN_AI_KEY, k);
    return true;
}
export function clearAiKey() { removeItem(STORAGE_KEYS.WRITTEN_AI_KEY); }
/** 표시용 마스킹 — 앞 4자리만 노출 */
export function maskAiKey(key) {
    const k = typeof key === 'string' ? key.trim() : '';
    if (!k) return '';
    return k.length <= 4 ? '••••' : `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

/* =========================================================
   채점 프롬프트 + 응답 파싱 (WP-08 — 순수 함수, 단위 테스트 대상)
   ========================================================= */

const SYSTEM_PROMPT = `당신은 자격시험 주관식(서술·계산형) 채점 보조입니다.
수험생 답안을 채점기준 항목별로 평가해 JSON으로만 응답하세요.
- 각 항목의 충족 여부(met)를 엄격히 판정하고 한 줄 피드백을 작성.
- 계산형은 계산 과정·답·단위가 모두 있어야 해당 항목 충족.
- 모범답안과 표현이 달라도 수치·기준·논리가 맞으면 충족으로 판정.
- summary에는 전체 평가와 보완점을 1~2문장으로.`;

/**
 * 채점 프롬프트 생성 — 문제·모범답안·rubric·수험생 답안을 구조화해 전달.
 * @param {object} q - WrittenQuestion (parseWrittenBank 출력)
 * @param {string} answer - 수험생 답안
 * @returns {string}
 */
export function buildGradingPrompt(q, answer) {
    const rubric = (q.rubricItems || [])
        .map((r, i) => `${i}: ${r.text} (${r.points}점)`).join('\n');
    return `## 문제 (${q.id} · ${q.type || '주관식'} · 배점 ${q.points ?? '?'}점)
${q.problem}

## 모범답안
${q.modelAnswer || '(없음)'}
${q.finalAnswer ? `\n## 최종 답\n${q.finalAnswer}\n` : ''}
## 채점기준 (rubric — 항목 번호 i)
${rubric || '(체크리스트 없음) ' + (q.rubricText || '')}

## 수험생 답안
${answer}

응답 형식(JSON만): {"items":[{"i":0,"met":true,"feedback":"항목별 한 줄 근거"}],"summary":"전체 평가 1~2문장"}
rubric 항목 수와 items 배열 길이를 맞추고 i는 항목 번호를 따르라.`;
}

/**
 * LLM 응답 텍스트 → 정규화된 채점 결과. 코드펜스·잡음 텍스트 허용.
 * @param {string} text
 * @param {number} rubricCount - 기대 항목 수
 * @returns {{items:Array<{i:number,met:boolean,feedback:string}>,summary:string}|null}
 */
export function parseGradingResponse(text, rubricCount) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const cleaned = text.replace(/```(?:json)?/g, '').trim();
    // 첫 { ... 마지막 } 블록 추출 — 앞뒤 잡음 허용
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s < 0 || e <= s) return null;
    let data;
    try { data = JSON.parse(cleaned.slice(s, e + 1)); }
    catch (err) { return null; }
    if (!data || !Array.isArray(data.items)) return null;
    const items = [];
    for (const it of data.items) {
        const i = Number(it && it.i);
        if (!Number.isInteger(i) || i < 0 || i >= rubricCount) continue;
        items.push({
            i,
            met: !!(it && it.met),
            feedback: String((it && it.feedback) || '').slice(0, 300),
        });
    }
    if (!items.length) return null;
    return { items, summary: String(data.summary || '').slice(0, 500) };
}

/** 채점 결과 → 항목별 충족 맵 + 합산 점수 (LLM 산출 불신 — 점수는 클라이언트 산정) */
export function applyGrading(rubricItems, grading) {
    const met = new Array(rubricItems.length).fill(false);
    for (const it of grading.items) {
        if (it.i >= 0 && it.i < rubricItems.length) met[it.i] = !!it.met;
    }
    const score = rubricItems.reduce((acc, r, i) => acc + (met[i] ? (r.points || 0) : 0), 0);
    return { met, score };
}

/* =========================================================
   LLM 호출 (WP-08)
   ========================================================= */

/**
 * 답안 AI 채점 — 네트워크·키·파싱 오류를 code로 분기 (product-vision 패턴).
 * @param {object} q - WrittenQuestion
 * @param {string} answer - 수험생 답안
 * @param {object} [opts] - {signal?, fetchImpl?}
 * @returns {Promise<{ok:boolean, grading?:object, met?:boolean[], score?:number,
 *   model?:string, error?:string, code?:string}>}
 */
export async function gradeAnswer(q, answer, opts = {}) {
    const key = getAiKey();
    if (!key) return { ok: false, code: 'nokey', error: 'AI API 키가 설정되지 않았습니다 — 상단 "AI 채점 설정"에서 키를 등록하세요.' };
    if (!answer || !answer.trim()) return { ok: false, code: 'noanswer', error: '채점할 답안을 먼저 작성하세요.' };
    if (!q.rubricItems || !q.rubricItems.length) {
        return { ok: false, code: 'norubric', error: '채점기준(rubric)이 없는 문항은 AI 채점을 지원하지 않습니다.' };
    }
    const prov = PROVIDERS[getAiProvider()];
    const model = getAiModel();
    const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchImpl) return { ok: false, code: 'network', error: '네트워크를 사용할 수 없습니다.' };

    const url = prov.buildUrl ? prov.buildUrl(model) : prov.url;
    let res;
    try {
        res = await fetchImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...prov.headers(key) },
            body: JSON.stringify(prov.buildBody(model, SYSTEM_PROMPT, buildGradingPrompt(q, answer), 1500)),
            signal: opts.signal,
        });
    } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return { ok: false, code: 'aborted', error: '채점이 취소되었습니다.' };
        return { ok: false, code: 'network', error: '네트워크 연결을 확인하세요 — AI 채점에는 온라인이 필요합니다.' };
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, code: 'key', error: 'API 키가 유효하지 않습니다 — 키를 다시 확인하거나 새로 발급하세요.' };
    }
    if (res.status === 429) {
        return { ok: false, code: 'quota', error: '사용량 한도를 초과했습니다 — 잠시 후 다시 시도하세요.' };
    }
    if (!res.ok) {
        return { ok: false, code: 'http', error: `채점 요청이 실패했습니다 (HTTP ${res.status}).` };
    }
    let json;
    try { json = await res.json(); }
    catch (e) { return { ok: false, code: 'unreadable', error: '채점 응답을 해석하지 못했습니다.' }; }
    const grading = parseGradingResponse(prov.extract(json), q.rubricItems.length);
    if (!grading) return { ok: false, code: 'unreadable', error: '채점 결과를 해석하지 못했습니다 — 다시 시도해 보세요.' };
    const { met, score } = applyGrading(q.rubricItems, grading);
    return { ok: true, grading, met, score, model };
}
