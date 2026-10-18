#!/usr/bin/env node
/**
 * ai_distractors.js — 허용 정답 변형 + 오답 선지 보강 제안
 * @spec AI-06,AI-02
 *
 * 사용법:
 *   node tools/ai/ai_distractors.js [--exam cosmetic] [--limit 30] [--dry-run]
 *
 * - 단답형: 허용 정답(accepts) 변형 제안 — 공백/구두점 변형은 규칙으로 즉시 생성,
 *   약어·한자 병기·동의어는 LLM 제안 (dry-run 시 규칙 변형만)
 * - 선다형: LLM이 오답 선지 품질·보강 후보를 제안 (dry-run 시 스캔 리포트만)
 *
 * 산출물: tmp/ai_drafts/distractors_<examKey>.md — 리뷰 후 허용 정답 행·선지에 반영.
 */

'use strict';

const { parseArgs, getTargets, listQbanks, writeDraft, loadEnv } = require('./lib/ai_common');
const { parseQuestionBank } = require('./lib/qbank');
const llm = require('./llm_client');

const SYSTEM = '당신은 수험 문제은행의 정답 표기 다양성 보조입니다. 단답형 정답의 허용 표기 변형(약어·한자 병기·순서 바꿈·동의어)을 제안하라. 오답을 허용 정답으로 만들면 안 되므로 보수적으로 제안할 것.';

/** 규칙 기반 허용 표기 변형 — 공백·구두점 정규화 차이 흡수 */
function ruleVariants(answer, accepts) {
    const out = new Set();
    const has = s => s === answer || accepts.includes(s);
    const compact = answer.replace(/\s+/g, '');
    if (compact !== answer && !has(compact)) out.add(compact);                 // 공백 제거
    if (answer.includes('·')) {                                                // 중점 ↔ 쉼표/공백
        for (const v of [answer.replace(/·/g, ','), answer.replace(/·/g, ', '), answer.replace(/·/g, ' ')]) {
            if (!has(v)) out.add(v);
        }
    }
    if (answer.includes(',')) {                                                // 쉼표 ↔ 중점
        const v = answer.replace(/,/g, '·');
        if (!has(v)) out.add(v);
    }
    return [...out];
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = Number(opts.limit || 30);

    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            const shorts = questions.filter(q => q.type === 'short' && answers.get(q.num)?.answer);
            const lines = [`# 허용 정답·선지 보강 초안 — ${exam.file} (단답형 ${shorts.length}문)`, ''];
            let count = 0;

            for (const q of shorts) {
                if (count >= limit) break;
                const ans = answers.get(q.num);
                const rules = ruleVariants(ans.answer, ans.accepts);
                const llmSugs = [];
                if (!dryRun) {
                    const res = await llm.complete(
                        `정답: ${ans.answer}\n기존 허용: ${ans.accepts.join(', ') || '(없음)'}\n발문: ${q.stem}\n\n추가 허용 표기를 쉼표로 구분해 출력. 없으면 "없음".`,
                        { system: SYSTEM, maxTokens: 200 });
                    if (!res.dryRun && res.text.trim() !== '없음') {
                        llmSugs.push(...res.text.split(/[,，]/).map(s => s.trim())
                            .filter(s => s && !rules.includes(s) && s !== ans.answer && !ans.accepts.includes(s)));
                    }
                }
                const all = [...rules, ...llmSugs.map(s => `${s} (LLM)`)];
                if (!all.length) continue;
                count++;
                lines.push(`## Q${q.num} — 정답: ${ans.answer}`,
                    `- 기존 허용: ${ans.accepts.join(', ') || '(없음)'}`,
                    `- 제안 추가: ${all.join(', ')}`, '');
            }
            const out = writeDraft(`distractors_${exam.key}.md`, lines, { model: llm.modelName() });
            console.log(`${exam.file}: 변형 제안 ${count}문 → ${out}`);
        }
    }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { ruleVariants };
