#!/usr/bin/env node
/**
 * ai_explain.js — 해설 누락·부실 문항 스캔 → 해설 초안 생성
 * @spec AI-04,AI-02,AI-03
 *
 * 사용법:
 *   node tools/ai/ai_explain.js [--exam cosmetic] [--limit 20] [--min-len 45] [--dry-run]
 *   --min-len N: 기존 해설이 N자 미만인 문항도 보강 대상에 포함 (초안 리뷰 후 --replace 적용)
 *
 * 산출물: tmp/ai_drafts/explain_<examKey>.md — 사람 리뷰 후 문제은행 정답 블록에 편입.
 * 컨텍스트는 정답 + 인용 근거 구절(실제 파일 라인 해석)로 제한한다 (grounded generation).
 * 근거 구절이 해석되지 않는 문항(인용 부재·깨진 링크)은 LLM에 보내지 않고
 * 초안 파일의 "근거 미해석" 섹션에 목록만 남긴다 — 비근거 해설 생성 차단.
 */

'use strict';

const { parseArgs, getTargets, listQbanks, writeDraft, loadEnv } = require('./lib/ai_common.js');
const { parseQuestionBank, primaryCitation, resolveCitation } = require('./lib/qbank.js');
const { readContext } = require('./lib/citations.js');
const llm = require('./llm_client.js');

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

/** 정답 블록의 대표 인용 → 실제 근거 구절 {label, text}. 인용 부재·링크 미해석 시 null (비근거 생성 금지) */
function evidenceFor(qbankPath, ans) {
    const cit = primaryCitation(ans);
    if (!cit) return null;
    const ctx = readContext(resolveCitation(qbankPath, cit.file), cit.lineNo, 4);
    return ctx ? { label: cit.label, text: ctx.text } : null;
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = opts.limit ? Number(opts.limit) : Infinity;

    let totalMissing = 0, drafted = 0, ungrounded = 0;
    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            const minLen = opts['min-len'] ? Number(opts['min-len']) : 0;
            const missing = questions.filter(q => {
                const a = answers.get(q.num);
                return a && (!a.explain || (minLen && a.explain.length < minLen));
            });
            if (!missing.length) continue;
            totalMissing += missing.length;

            if (drafted >= limit) continue; // 전역 상한 도달 시 잔여 파일은 스캔만
            const lines = [`# 해설 초안 — ${exam.file} (대상 ${missing.length}문${minLen ? ` · ${minLen}자 미만 보강 포함` : ''})`, ''];
            const ungroundedList = [];
            for (const q of missing) {
                if (drafted >= limit) break;
                const ans = answers.get(q.num);
                const evidence = evidenceFor(absPath, ans);
                if (!evidence) { // 근거 미해석 — 비근거 해설 생성 차단, 목록만 기록
                    ungrounded++;
                    ungroundedList.push(`- Q${q.num} — ${primaryCitation(ans) ? `인용 미해석: ${primaryCitation(ans).label}` : '인용 없음'}`);
                    continue;
                }
                const prompt = buildPrompt(q, ans, evidence);

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
            if (ungroundedList.length) {
                lines.push('## ⚠️ 근거 미해석 — 해설 미생성 (인용 보강 후 재실행)', '', ...ungroundedList, '');
            }
            // 파일명에 시험 id 포함 — 동일 examKey를 쓰는 다른 시험과 충돌 방지
            const out = writeDraft(`${target.id}/explain_${target.id}_${exam.key}.md`, lines, { model: llm.modelName() });
            console.log(`${exam.file}: 해설 누락 ${missing.length}문 (근거 미해석 ${ungroundedList.length}문 제외) → ${out}`);
        }
    }
    console.log(`\n총 해설 누락: ${totalMissing}문 · 초안 작성: ${drafted}문 · 근거 미해석: ${ungrounded}문${dryRun ? ' (dry-run)' : ''}`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt, evidenceFor };
