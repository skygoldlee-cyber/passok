'use strict';
// lib/difficulty.js — 콜드스타트 난이도 시딩 공용
// @spec AI-32
// ai_tag.js의 예측 휴리스틱 + 오프라인 검증 평가기 — 순수·비LLM.

const { questionText } = require('./qbank.js');

/**
 * 난이도 휴리스틱 1~5 — 수치·부정 발문·단답형·장문 선지가 가중 (ai_tag 정본).
 * @param {object} q - parseQuestionBank 문항
 * @param {object|null} ans - 정답 레코드
 * @returns {number} 1~5
 */
function estimateDifficulty(q, ans) {
    let score = 2;
    const text = questionText(q);
    const digits = (text.match(/\d+/g) || []).length;
    if (digits >= 3) score += 1;                       // 수치 다수
    if (/않은|아닌|틀린/.test(q.stem)) score += 1;      // 부정·역발문
    if (q.type === 'short') score += 1;                // 단답형
    if (q.options.some(o => o.text.length > 60)) score += 1; // 장문 선지
    if (ans && ans.accepts.length > 3) score -= 1;     // 허용 정답 넓음 = 관대
    return Math.max(1, Math.min(5, score));
}

/**
 * 예측 난이도 vs 실측 오답률 오프라인 평가 — 시딩 유효성 판정 (AI-32).
 * 판정 기준(문서화): 표본 ≥minSample && 예측 버킷별 실측 오답률이 단조 증가하면 'valid',
 * 단조 위반이 인접 1쌍 이하이면 'borderline', 그 외 'invalid'.
 * @param {Array<{pred:number, wrong:boolean}>} pairs - 문항별 예측·실측 첫 시도
 * @param {number} [minSample]
 * @returns {{verdict:'valid'|'borderline'|'invalid'|'insufficient',
 *   sample:number, buckets:Array<{pred:number, n:number, wrongRate:number}>}}
 */
function evaluateSeedAccuracy(pairs, minSample = 30) {
    const byPred = new Map();
    for (const p of pairs || []) {
        const k = p.pred;
        const b = byPred.get(k) || { n: 0, wrong: 0 };
        b.n++;
        if (p.wrong) b.wrong++;
        byPred.set(k, b);
    }
    const buckets = [...byPred.entries()].sort((a, b) => a[0] - b[0])
        .map(([pred, b]) => ({ pred, n: b.n, wrongRate: +(b.wrong / b.n).toFixed(3) }));
    const sample = buckets.reduce((s, b) => s + b.n, 0);
    if (sample < minSample || buckets.length < 2) {
        return { verdict: 'insufficient', sample, buckets };
    }
    let violations = 0;
    for (let i = 1; i < buckets.length; i++) {
        if (buckets[i].wrongRate < buckets[i - 1].wrongRate) violations++;
    }
    return {
        verdict: violations === 0 ? 'valid' : violations === 1 ? 'borderline' : 'invalid',
        sample, buckets,
    };
}

module.exports = { estimateDifficulty, evaluateSeedAccuracy };
