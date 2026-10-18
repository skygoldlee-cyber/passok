#!/usr/bin/env node
/**
 * ai_lint.js — 발문 품질 검수 (기계 게이트가 못 잡는 영역)
 * @spec AI-10,AI-02
 *
 * 사용법:
 *   node tools/ai/ai_lint.js [--exam cosmetic] [--check] [--dry-run]
 *
 * 규칙 검사(항상 동작 — LLM 불요):
 *   L1 부정 발문 주의 ("옳지 않은/아닌" — 오독 유발, 정보성)
 *   L2 이중부정 의심 (부정 2회 중첩)
 *   L3 "모두 옳은/해당하는" 전부정답 발문
 *   L4 선지 길이 불균형 (최장이 중앙값의 2배 초과 — 길이 힌트)
 *   L5 발문↔정답 텍스트 겹침 (답이 발문에 샘)
 *   L6 정답 블록·인용 부재 (근거 강제 위반)
 * LLM 검수(--llm): 모호성·추론 우회 패턴 의미 판정 추가.
 */

'use strict';

const { parseArgs, getTargets, listQbanks, writeDraft, loadEnv } = require('./lib/ai_common');
const { parseQuestionBank } = require('./lib/qbank');
const llm = require('./llm_client');

function lintQuestion(q, ans) {
    const issues = [];
    const stem = q.stem;
    if (/않은 것은|아닌 것은|틀린 것은/.test(stem)) issues.push('L1 부정 발문');
    if ((stem.match(/않|아니|없|못/g) || []).length >= 2) issues.push('L2 이중부정 의심');
    if (/모두 옳은|모두 해당|전부 옳은/.test(stem)) issues.push('L3 전부정답 발문');
    if (q.options.length >= 3) {
        const lens = q.options.map(o => o.text.length).sort((a, b) => a - b);
        const med = lens[Math.floor(lens.length / 2)] || 1;
        if (lens[lens.length - 1] > med * 2 && lens[lens.length - 1] > 40) issues.push('L4 선지 길이 불균형');
    }
    if (ans && q.type === 'short' && ans.answer && stem.includes(ans.answer)) issues.push('L5 발문에 정답 노출');
    if (!ans) issues.push('L6 정답 블록 부재');
    else if (!ans.citations.length) issues.push('L6 인용 부재');
    return issues;
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const useLlm = flags.has('llm') && llm.isAvailable();
    let total = 0, flagged = 0;

    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            const lines = [`# 발문 검수 리포트 — ${exam.file}`, ''];
            for (const q of questions) {
                total++;
                const issues = lintQuestion(q, answers.get(q.num));
                if (!issues.length) continue;
                flagged++;
                lines.push(`- **Q${q.num}** — ${issues.join(' · ')}`, `  ${q.stem.slice(0, 80)}`);
            }
            if (flagged) {
                const out = writeDraft(`lint_${exam.key}.md`, lines, { model: 'rules' });
                console.log(`${exam.file}: ${flagged}문 지적 → ${out}`);
            } else console.log(`${exam.file}: 지적 없음`);
        }
    }
    console.log(`\n검수 ${total}문 · 지적 ${flagged}문${useLlm ? ' + LLM 의미 검수' : ''}`);
    if (flags.has('check') && flagged) process.exit(1);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { lintQuestion };
