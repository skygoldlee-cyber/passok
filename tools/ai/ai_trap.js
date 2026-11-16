#!/usr/bin/env node
/**
 * ai_trap.js — 문항 함정 유형(trap) 초안 제안 + 리뷰 편입
 * @spec AI-39
 *
 * 사용법:
 *   node tools/ai/ai_trap.js [--exam carework] [--limit 50] [--dry-run]
 *   node tools/ai/ai_trap.js --write --exam carework [--file traps_caretheory]
 *
 * - 규칙 후보(tools/ai/lib/traps.js)를 먼저 계산 — 수치바꿔치기·절대표현·
 *   예외조항·유사용어혼동(선지 bigram 유사도)는 결정론으로 제안.
 * - LLM은 규칙 후보 검증 + 주어치환 등 규칙 비검출 유형 보완
 *   (AI_API_KEY 없거나 --dry-run이면 규칙만 — 초안은 여전히 생성).
 *
 * 초안: tmp/ai_drafts/<exam>/traps_<bank>.md — `| 문항 | 함정 | 근거 |` 표.
 * 사람이 함정 열을 수정한 뒤 --write가 문제은행 정답 블록에
 * `> **함정:** …` 행을 편입한다 (기존 함정 행은 교체 — 재실행 안전).
 * 어휘는 TRAP_TAGS(src/content/questions.js) 화이트리스트 — 초안에
 * 어휘 밖 값이 있으면 해당 문항을 스킵하고 경고한다.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, listQbanks, writeDraft, loadEnv, DRAFT_DIR,
    markDraftApplied, isDraftApplied, logAdoption } = require('./lib/ai_common.js');
const { parseQuestionBank } = require('./lib/qbank.js');
const { inferTrapCandidates } = require('./lib/traps.js');
const { TRAP_TAGS } = require('../../src/content/questions.js');
const llm = require('./llm_client.js');

const SYSTEM = `당신은 수험 문제은행의 오지(함정 선지) 분석가입니다.
문항의 발문·선지·정답을 보고, 오지가 수험자를 걸리게 하는 방식을 분류하라.
허용 유형(닫힌 어휘): ${TRAP_TAGS.join(', ')}.
- 유사용어혼동: 뜻/이름이 비슷한 용어를 바꿔치기 (예: 노인복지법↔노인장기요양보험법)
- 수치바꿔치기: 숫자·기간·비율만 바꾼 오지
- 절대표현: 항상·모두·반드시·절대 등 과도한 일반화 오지
- 주어치환: 행위 주체를 바꿈 (예: 요양보호사↔간호사↔사회복지사, 신고의무자↔비의무자)
- 예외조항: 예외·단서 조항의 적용 범위를 비틂
함정이 뚜렷하지 않으면 빈 배열. 문항당 최대 2개까지.`;

/** 문항 → LLM 입력 한 줄 (발문·선지·정답 번호) */
function qBrief(q, answerNum) {
    const opts = q.options.map(o => `${'①②③④⑤⑥⑦⑧⑨⑩'[o.n - 1] || o.n} ${o.text}`).join(' | ');
    return `Q${q.num}: ${q.stem}\n  선지: ${opts}\n  정답: ${'①②③④⑤⑥⑦⑧⑨⑩'[(answerNum || 0) - 1] || answerNum || '?'}`;
}

/** 리뷰 초안 md → Map<qnum, string[]> (함정 열만 — 근거 열은 편입하지 않음) */
function parseTrapDraft(draftPath) {
    const out = new Map();
    for (const line of fs.readFileSync(draftPath, 'utf-8').split(/\r?\n/)) {
        const m = line.match(/^\|\s*Q(\d+)\s*\|\s*([^|]*?)\s*\|/);
        if (!m) continue;
        const tags = m[2].split(/[,，·]/).map(s => s.trim())
            .filter(s => s && s !== '(없음)' && s !== '—');
        if (tags.length) out.set(Number(m[1]), tags);
    }
    return out;
}

/** 정답 블록 `**Q{n}.**`에 함정 행 편입 — 정답 행 다음에 삽입, 기존 함정 행은 교체. */
function applyTrapToBank(src, qnum, tags) {
    const lines = src.split(/\r?\n/);
    const start = lines.findIndex(l => l.trim() === `**Q${qnum}.**`);
    if (start < 0) return { src, applied: false, reason: 'block-missing' };
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^\*\*Q\d+\.\*\*/.test(lines[i]) || /^##\s/.test(lines[i])) { end = i; break; }
    }
    const block = lines.slice(start, end).filter(l => !/^>\s*\*\*함정/.test(l)); // 기존 함정 행 제거
    const ansIdx = block.findIndex(l => /^>\s*\*\*정답/.test(l));
    const trapLine = `> **함정:** ${tags.join(', ')}`;
    if (ansIdx < 0) block.splice(1, 0, trapLine);       // 정답 행 없으면 헤더 직후
    else block.splice(ansIdx + 1, 0, trapLine);          // 정답 행 직후
    return { src: [...lines.slice(0, start), ...block, ...lines.slice(end)].join('\n'), applied: true };
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();

    // ── 편입 경로: 리뷰된 초안 → 문제은행 함정 행 ──
    if (flags.has('write')) {
        for (const target of getTargets(opts)) {
            for (const { exam, absPath } of listQbanks(target)) {
                const draft = path.join(DRAFT_DIR, target.id, `traps_${exam.key}.md`);
                if (opts.file && !draft.includes(opts.file)) continue;
                if (!fs.existsSync(draft)) { console.log(`초안 없음 — 스킵: ${draft}`); continue; }
                const text = fs.readFileSync(draft, 'utf-8');
                if (isDraftApplied(text)) { console.log(`이미 편입됨 — 스킵: ${draft}`); continue; }
                const tagMap = parseTrapDraft(draft);
                if (!tagMap.size) { console.log(`편입 대상 없음: ${draft}`); continue; }
                let src = fs.readFileSync(absPath, 'utf-8');
                let applied = 0, skipped = 0;
                const badTags = new Set();
                for (const [qnum, tags] of tagMap) {
                    const bad = tags.filter(t => !TRAP_TAGS.includes(t));
                    if (bad.length) { bad.forEach(t => badTags.add(t)); skipped++; continue; }
                    const r = applyTrapToBank(src, qnum, tags);
                    if (r.applied) { src = r.src; applied++; }
                    else { skipped++; }
                }
                if (applied) fs.writeFileSync(absPath, src, 'utf-8');
                markDraftApplied(draft);
                logAdoption({ ts: new Date().toISOString(), draft: path.basename(draft),
                    kind: 'trap', target: target.id, bank: exam.key,
                    generated: tagMap.size, applied, skipped, model: 'review' });
                console.log(`${exam.file}: 함정 ${applied}문 편입 (스킵 ${skipped})` +
                    (badTags.size ? ` · 어휘 위반 스킵: ${[...badTags].join(', ')}` : ''));
            }
        }
        return;
    }

    // ── 초안 생성: 규칙 후보 + LLM 보완 ──
    const limit = Number(opts.limit || 50);
    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            const choiceQs = questions.filter(q => q.type === 'choice').slice(0, limit);
            const lines = [`# 함정 태그 초안 — ${exam.file} (객관식 ${choiceQs.length}문)`,
                '',
                `> 리뷰: 함정 열을 TRAP_TAGS 어휘(${TRAP_TAGS.join('/')})로 수정 후 \`ai:trap --write\`.`,
                '> 함정 없음은 함정 열을 `(없음)`으로 — 행 삭제해도 미편입.',
                '',
                '| 문항 | 함정 | 근거 |', '|---|---|---|'];

            // LLM 일괄 분류 — 규칙 후보를 힌트로 첨부해 검증·보완 유도
            const llmTags = new Map();
            if (!dryRun && choiceQs.length) {
                const batch = choiceQs.map(q => {
                    const rules = inferTrapCandidates(q, answers.get(q.num)?.answerNum);
                    return qBrief(q, answers.get(q.num)?.answerNum)
                        + (rules.length ? `\n  규칙 후보: ${rules.map(r => r.tag).join(', ')}` : '');
                }).join('\n\n');
                const res = await llm.completeJson(
                    `${batch}\n\n각 문항의 함정 유형을 분류해 {"Q1": ["유형"], "Q2": []} 형식 JSON으로 출력.`,
                    { system: SYSTEM, maxTokens: 3000 });
                if (res && res.data) {
                    for (const [k, v] of Object.entries(res.data)) {
                        const num = Number(String(k).replace(/\D/g, ''));
                        const tags = (Array.isArray(v) ? v : []).filter(t => TRAP_TAGS.includes(t)).slice(0, 2);
                        if (num && tags.length) llmTags.set(num, tags);
                    }
                }
            }

            let tagged = 0;
            for (const q of choiceQs) {
                const ans = answers.get(q.num);
                const rules = inferTrapCandidates(q, ans?.answerNum);
                const llmList = llmTags.get(q.num) || [];
                const merged = [...new Set([...rules.map(r => r.tag), ...llmList])];
                const basis = [
                    ...(rules.length ? [`규칙:${rules.map(r => r.tag).join('+')}`] : []),
                    ...(llmList.length ? ['LLM'] : []),
                ].join(' · ') || '—';
                if (merged.length) tagged++;
                lines.push(`| Q${q.num} | ${merged.join(', ') || '(없음)'} | ${basis} |`);
            }
            const out = writeDraft(`${target.id}/traps_${exam.key}.md`, lines,
                { model: dryRun ? 'rules' : llm.modelName() });
            console.log(`${exam.file}: 함정 후보 ${tagged}/${choiceQs.length}문 → ${out}` +
                (dryRun ? ' (규칙 전용)' : ''));
        }
    }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { parseTrapDraft, applyTrapToBank, qBrief };
