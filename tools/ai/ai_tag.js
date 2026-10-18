#!/usr/bin/env node
/**
 * ai_tag.js — STANDARD_TAGS·난이도·conceptId 자동 제안
 * @spec AI-09
 *
 * 사용법:
 *   node tools/ai/ai_tag.js [--exam cosmetic] [--limit 50]
 *
 * - tags: 규칙 기반 inferTags(tools/build/drill-utils.js — STANDARD_TAGS 어휘) 재사용
 * - difficulty(1~5): 수치 밀도·부정 발문·선지 수·단답형 여부의 결정론적 휴리스틱
 * - conceptId: 첫 인용 라인 클러스터(LNN 백의 자리 구간) 제안 — 수작업 의미 라벨은 사람이 리뷰
 *
 * 산출물: tmp/ai_drafts/tags_<examKey>.md — 문제은행 메타 편입 시 참고.
 */

'use strict';

const { parseArgs, getTargets, listQbanks, writeDraft } = require('./lib/ai_common');
const { parseQuestionBank, questionText, primaryCitation } = require('./lib/qbank');
const { inferTags } = require('../build/drill-utils');

/** 난이도 휴리스틱 1~5 — 수치·부정 발문·단답형·장문 선지가 가중 */
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

function main() {
    const { opts } = parseArgs();
    const limit = Number(opts.limit || 50);

    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            const lines = [`# 태그·난이도·conceptId 제안 — ${exam.file}`, '',
                '| 문항 | 유형 | 제안 태그 | 난이도 | conceptId(첫 인용) |', '|---|---|---|---|---|'];
            for (const q of questions.slice(0, limit)) {
                const ans = answers.get(q.num);
                const cit = primaryCitation(ans);
                lines.push(`| Q${q.num} | ${q.type} | ${inferTags(questionText(q)).join(', ') || '(없음)'} | ${estimateDifficulty(q, ans)} | ${cit ? `L${cit.lineNo}` : '—'} |`);
            }
            const out = writeDraft(`tags_${exam.key}.md`, lines, { model: 'rules' });
            console.log(`${exam.file}: ${Math.min(limit, questions.length)}문 제안 → ${out}`);
        }
    }
}

if (require.main === module) main();

module.exports = { estimateDifficulty };
