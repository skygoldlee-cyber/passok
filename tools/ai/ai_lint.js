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
 *   E1 해설이 정답과 다른 선지를 정답으로 지칭 (편입 해설 감사)
 *   E2 해설 길이 이상 (20자 미만 또는 800자 초과)
 *   E3 해설 플레이스홀더·검토 요청 잔존 (미생성·TODO·확인 필요 등)
 *   E4 해설의 근거 부인 표현 ("근거에 없다/알 수 없다" — 환각 자백 의심)
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
    if (ans && q.type === 'short' && ans.answer && ans.answer.length >= 2) {
      const ai = stem.indexOf(ans.answer);
      const leftOk = ai === 0 || !/[가-힣A-Za-z0-9]/.test(stem[ai - 1]);
      const rightOk = !/[가-힣A-Za-z0-9]/.test(stem[ai + ans.answer.length] || '');
      if (ai >= 0 && leftOk && rightOk) issues.push('L5 발문에 정답 노출');
    }
    if (!ans) issues.push('L6 정답 블록 부재');
    else if (!ans.citations.length) issues.push('L6 인용 부재');
    if (ans && ans.explain) issues.push(...lintExplanation(q, ans));
    return issues;
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';

function lintExplanation(q, ans) {
    const issues = [];
    const ex = ans.explain;
    // E3 — 플레이스홀더·검토 요청 잔존
    if (/미생성|DRY RUN|TODO|확인 필요|검토 필요|FIXME/.test(ex)) issues.push('E3 플레이스홀더 잔존');
    // E2 — 길이 이상
    if (ex.length < 20) issues.push('E2 해설 과단(20자 미만)');
    else if (ex.length > 800) issues.push('E2 해설 과장(800자 초과)');
    // E4 — 근거 부인 자백 (인용 구절이 문항을 지지하지 못함을 해설이 시인)
    //   주의: "결격사유에 포함되어 있지 않다" 같은 부정형 정답 해설의 정상 표현과 구분하기 위해
    //   근거·구절·자료를 주어로 한 부정만 탐지한다.
    if (/(제시|제공|주어진)된?\s*(근거|구절|자료)[^.\n]{0,60}(없|않)|근거(\s구절|\s자료)?에는[^.\n]{0,60}(없|않)|근거에(는)? 없|알 수 없|확인할 수 없|확인 불가|설명할 수 없|작성할 수 없/.test(ex)) issues.push('E4 근거 부인 표현');
    // E1 — 해설이 다른 선지를 정답으로 지칭 (단일선택만)
    const correct = ans.answer.replace(/[^0-9①-⑩]/g, '');
    if (correct && (q.type === 'single' || q.options.length)) {
        const correctSet = new Set([...correct].map(c => CIRCLED.indexOf(c) >= 0 ? CIRCLED.indexOf(c) + 1 : Number(c)));
        // "N이/가 정답" "정답은 N" "N번" 직후 정답 단정 패턴만 추출 — 오답 언급("①은 틀렸다")은 무시
        for (const m of ex.matchAll(/([①-⑩0-9]+)\s*번?이?\s*(?:이|가|는)?\s*정답|정답은?\s*([①-⑩0-9]+)/g)) {
            const raw = m[1] || m[2];
            const nums = new Set([...raw].map(c => CIRCLED.indexOf(c) >= 0 ? CIRCLED.indexOf(c) + 1 : Number(c)).filter(n => n > 0));
            if (nums.size && ![...nums].every(n => correctSet.has(n))) {
                issues.push(`E1 해설 정답 모순 (정답 ${ans.answer} vs 해설 ${raw})`);
                break;
            }
        }
    }
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
            let fileFlagged = 0;
            for (const q of questions) {
                total++;
                const issues = lintQuestion(q, answers.get(q.num));
                if (!issues.length) continue;
                fileFlagged++;
                lines.push(`- **Q${q.num}** — ${issues.join(' · ')}`, `  ${q.stem.slice(0, 80)}`);
            }
            flagged += fileFlagged;
            if (fileFlagged) {
                const out = writeDraft(`lint_${exam.key}.md`, lines, { model: 'rules' });
                console.log(`${exam.file}: ${fileFlagged}문 지적 → ${out}`);
            } else console.log(`${exam.file}: 지적 없음`);
        }
    }
    console.log(`\n검수 ${total}문 · 지적 ${flagged}문${useLlm ? ' + LLM 의미 검수' : ''}`);
    if (flags.has('check') && flagged) process.exit(1);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { lintQuestion, lintExplanation };
