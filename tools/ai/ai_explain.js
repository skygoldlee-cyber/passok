#!/usr/bin/env node
/**
 * ai_explain.js — 해설 누락 문항 스캔 → 해설 초안 생성
 * @spec AI-04,AI-02,AI-03
 *
 * 사용법:
 *   node tools/ai/ai_explain.js [--exam cosmetic] [--limit 20] [--dry-run]
 *
 * 산출물: tmp/ai_drafts/explain_<examKey>.md — 사람 리뷰 후 문제은행 정답 블록에 편입.
 * 컨텍스트는 정답 + 인용 근거 구절(실제 파일 라인 해석)로 제한한다 (grounded generation).
 */

'use strict';

const { parseArgs, getTargets, listQbanks, writeDraft, loadEnv } = require('./lib/ai_common');
const { parseQuestionBank, primaryCitation, resolveCitation } = require('./lib/qbank');
const { readContext } = require('./lib/citations');
const llm = require('./llm_client');

const SYSTEM = '당신은 자격시험 문제은행의 해설 작성 보조입니다. 제공된 정답과 근거 구절만을 근거로, 수험생이 이해하기 쉬운 1~3문장의 해설을 한국어로 작성하라. 근거에 없는 주장은 하지 말 것.';

function buildPrompt(q, ans, evidence) {
    return [
        '아래 문항의 해설을 작성하라.',
        '',
        `[발문] ${q.stem}`,
        q.options.length ? `[선지] ${q.options.map(o => `${'①②③④⑤'[o.n - 1]} ${o.text}`).join(' / ')}` : '[단답형]',
        `[정답] ${ans.answer}${ans.accepts.length ? ` (허용: ${ans.accepts.join(', ')})` : ''}`,
        '',
        evidence ? `[근거 구절 — ${evidence.label}]\n${evidence.text}` : '[근거 구절 없음 — 인용 보강 필요]',
        '',
        '해설만 출력. 왜 정답인지 + 오답 선지가 있다면 왜 틀린지 1회 언급.',
    ].join('\n');
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = opts.limit ? Number(opts.limit) : Infinity;

    let totalMissing = 0, drafted = 0;
    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            const missing = questions.filter(q => {
                const a = answers.get(q.num);
                return a && !a.explain; // 정답 블록 자체가 없는 문항은 check:manifest 영역
            });
            if (!missing.length) continue;
            totalMissing += missing.length;

            if (drafted >= limit) continue; // 전역 상한 도달 시 잔여 파일은 스캔만
            const lines = [`# 해설 초안 — ${exam.file} (누락 ${missing.length}문)`, ''];
            for (const q of missing) {
                if (drafted >= limit) break;
                const ans = answers.get(q.num);
                const cit = primaryCitation(ans);
                const ctx = cit ? readContext(resolveCitation(absPath, cit.file), cit.lineNo, 4) : null;
                const prompt = buildPrompt(q, ans, ctx ? { label: cit.label, text: ctx.text } : null);

                lines.push(`## Q${q.num}`, '');
                if (dryRun) {
                    lines.push('> **해설**: (미생성 — DRY RUN 또는 API 키 없음)', '',
                        '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
                } else {
                    const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 400 });
                    lines.push(res.dryRun
                        ? '> **해설**: (미생성 — DRY RUN)'
                        : `> **해설**: ${res.text.trim().replace(/\n+/g, ' ')}`, '');
                }
                drafted++;
            }
            const out = writeDraft(`explain_${exam.key}.md`, lines, { model: llm.modelName() });
            console.log(`${exam.file}: 해설 누락 ${missing.length}문 → ${out}`);
        }
    }
    console.log(`\n총 해설 누락: ${totalMissing}문 · 초안 작성: ${drafted}문${dryRun ? ' (dry-run)' : ''}`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt };
