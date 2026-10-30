// src/ai/gen-gate.js — 런타임 AI 생성물 검증 게이트
// @spec AI-30,AI-37
//
// 생성형 AI 출력이 콘텐츠로 들어오기 전의 구조·근거·중복 검증 (LEARNING_COACH §5.2):
//   1) 스키마 — 필수 필드·선지 수·정답 포함
//   2) 인용 강제 — 교재 인용 없는 생성물은 폐기 (환각 방지 계약)
//   3) dupcheck — 기존 문항 풀과 n-gram 중첩 상한 초과 시 폐기
//   4) AI 배지 규약 — 모든 생성물은 출처 배지 필수 (AI_BADGE_TEXT)
// 검증기는 DOM·저장소·공급자 무관 순수 함수 — 인용 실존 확인은 호출부 주입.

/** AI 생성물 UI 공통 배지 문구 (규약 — 렌더 시 이 문자열 사용) */
export const AI_BADGE_TEXT = 'AI 생성';

const MAX_SIMILARITY = 0.6;   // 기존 문항과의 허용 n-gram 중첩 상한 (저작성·중복 게이트)
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

/**
 * 텍스트 정규화 — 공백·구두점 제거 후 소문자 (중첩 비교용)
 * @param {unknown} s
 * @returns {string}
 */
function _normalize(s) {
    return String(s || '').toLowerCase().replace(/[\s\p{P}]+/gu, '');
}

/**
 * n-gram 집합 생성 — 정규화 문자열의 문자 n-gram
 * @param {string} norm
 * @param {number} n
 * @returns {Set<string>}
 */
function _ngrams(norm, n) {
    const out = new Set();
    for (let i = 0; i + n <= norm.length; i++) out.add(norm.slice(i, i + n));
    return out;
}

/**
 * 기존 문항 풀과의 최대 중첩률 — a가 b에 포함되는 정도의 최댓값.
 * @param {string} text - 신규 문항 발문 (정규화 전)
 * @param {string[]} poolTexts - 기존 문항 발문 배열
 * @returns {number} 0~1
 */
export function maxPoolOverlap(text, poolTexts) {
    const n = 4;
    const a = _ngrams(_normalize(text), n);
    if (!a.size) return 0;
    let best = 0;
    for (const t of poolTexts || []) {
        const b = _ngrams(_normalize(t), n);
        if (!b.size) continue;
        let inter = 0;
        for (const g of a) if (b.has(g)) inter++;
        best = Math.max(best, inter / a.size);
    }
    return best;
}

/**
 * 생성 문항 1건 검증 — 통과 시 {ok:true}, 폐기 시 {ok:false, reasons:[...]}.
 * @param {object} gen {question, options?, answer, citation, explain?}
 * @param {object} opts
 * @param {string[]} [opts.poolTexts] - 기존 문항 발문 (dupcheck 대상 풀)
 * @param {(citation:string)=>boolean} [opts.citeCheck] - 인용 실존 검증 (기본: 비어있지 않으면 통과)
 * @param {number} [opts.maxSimilarity] - dupcheck 임계 (기본 0.6)
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function validateGeneratedItem(gen, opts = {}) {
    const reasons = [];
    if (!gen || typeof gen !== 'object') {
        return { ok: false, reasons: ['schema'] };
    }
    const question = typeof gen.question === 'string' ? gen.question.trim() : '';
    if (!question) reasons.push('schema:question');
    const options = Array.isArray(gen.options) ? gen.options.map(o => String(o || '').trim()).filter(Boolean) : null;
    const answer = String(gen.answer ?? '').trim();
    if (options) {
        if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) reasons.push('schema:options_count');
        if (answer && options.length && !options.includes(answer)) reasons.push('schema:answer_not_in_options');
    } else if (!answer) {
        reasons.push('schema:answer');
    }
    // 인용 강제 — 근거 없는 생성물은 어떤 형태로도 노출하지 않는다
    const citation = typeof gen.citation === 'string' ? gen.citation.trim() : '';
    if (!citation) {
        reasons.push('citation_missing');
    } else if (opts.citeCheck && !opts.citeCheck(citation)) {
        reasons.push('citation_unresolved');
    }
    // dupcheck — 발문 중첩 상한
    if (question && Array.isArray(opts.poolTexts)) {
        const sim = maxPoolOverlap(question, opts.poolTexts);
        if (sim > (opts.maxSimilarity ?? MAX_SIMILARITY)) reasons.push('duplicate');
    }
    return { ok: reasons.length === 0, reasons };
}

/**
 * 생성 문항 배열 일괄 검증 — 통과분만 반환.
 * @param {object[]} items
 * @param {object} opts - validateGeneratedItem opts 동형
 * @returns {{passed:object[], rejected:Array<{item:object, reasons:string[]}>}}
 */
export function filterGeneratedItems(items, opts = {}) {
    const passed = [], rejected = [];
    for (const item of items || []) {
        const r = validateGeneratedItem(item, opts);
        (r.ok ? passed : rejected).push(r.ok ? item : { item, reasons: r.reasons });
    }
    return { passed, rejected };
}
