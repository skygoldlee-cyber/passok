#!/usr/bin/env node
/**
 * ai_apply.js — 리뷰된 해설 초안을 문제은행 정답 블록에 편입
 * @spec AI-01,AI-04
 *
 * 사용법:
 *   node tools/ai/ai_apply.js                          # tmp/ai_drafts/explain_*.md 전수 미리보기
 *   node tools/ai/ai_apply.js --file explain_subject1  # 특정 초안
 *   node tools/ai/ai_apply.js --write                  # 실제 반영 (기본은 미리보기)
 *
 * 편입 규칙:
 *   - 초안 `## Q{n}` 아래 `> **해설**: …` 행을 문제은행 `**Q{n}.**` 블록의
 *     마지막 `> ` 라인 뒤에 삽입
 *   - `(미생성` 플레이스홀더·이미 해설이 있는 문항·정답 블록 부재는 스킵
 *   - 반영 후엔 반드시 `npm run check:content -- --build` 게이트 통과 확인
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, listQbanks, DRAFT_DIR } = require('./lib/ai_common');

/** 초안 md에서 {qnum → 해설 텍스트} 추출 */
function parseExplainDraft(draftPath) {
    const out = new Map();
    let cur = null;
    for (const line of fs.readFileSync(draftPath, 'utf-8').split(/\r?\n/)) {
        const qm = line.match(/^##\s*Q(\d+)\s*$/);
        if (qm) { cur = Number(qm[1]); continue; }
        if (cur === null) continue;
        const em = line.match(/^>\s*\*\*해설\*\*\s*[:：]\s*(.+)$/);
        if (em && !em[1].includes('(미생성')) out.set(cur, em[1].trim());
    }
    return out;
}

/** 정답 블록에 해설 삽입 — 마지막 `> ` 라인 직후. returns 새 텍스트 또는 null */
function insertExplain(src, qnum, explain) {
    const lines = src.split(/\r?\n/);
    const start = lines.findIndex(l => l.trim() === `**Q${qnum}.**`);
    if (start < 0) return null;
    // 블록 끝 = 다음 **Qn.** 헤더 또는 파일 끝
    let lastQ = -1;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^\*\*Q\d+\.\*\*/.test(lines[i])) break;
        if (lines[i].startsWith('>')) {
            if (/\*\*해설\*\*\s*[:：]/.test(lines[i])) return null; // 이미 해설 있음
            lastQ = i;
        }
    }
    if (lastQ < 0) return null;
    lines.splice(lastQ + 1, 0, `> **해설**: ${explain}`);
    return lines.join('\n');
}

function main() {
    const { flags, opts } = parseArgs();
    const write = flags.has('write');

    // 초안 파일 ↔ 문제은행 매칭 — explain_<examKey>.md 규약
    const drafts = fs.existsSync(DRAFT_DIR)
        ? fs.readdirSync(DRAFT_DIR).filter(f => /^explain_.+\.md$/.test(f)
            && (!opts.file || f === `explain_${opts.file.replace(/^explain_/, '').replace(/\.md$/, '')}.md`))
        : [];
    if (!drafts.length) { console.log('explain_* 초안 없음 — ai:explain을 먼저 실행하세요'); return; }

    const targets = getTargets(opts);
    let applied = 0, skipped = 0;

    for (const target of targets) {
        for (const { exam, absPath } of listQbanks(target)) {
            const draft = drafts.find(d => d === `explain_${target.id}_${exam.key}.md`);
            if (!draft) continue;
            const entries = parseExplainDraft(path.join(DRAFT_DIR, draft));
            if (!entries.size) { console.log(`${draft}: 편입 가능한 해설 0건`); continue; }

            let src = fs.readFileSync(absPath, 'utf-8');
            const appliedNums = [];
            let fileSkipped = 0;
            for (const [qnum, explain] of entries) {
                const next = insertExplain(src, qnum, explain);
                if (next === null) { fileSkipped++; continue; }
                src = next;
                appliedNums.push(qnum);
            }
            skipped += fileSkipped;
            if (appliedNums.length && write) {
                fs.writeFileSync(absPath, src, 'utf-8');
            }
            applied += appliedNums.length;
            console.log(`${target.id}/${exam.file}: ${write ? '편입' : '편입 예정'} ${appliedNums.length}건`
                + ` (Q${appliedNums.slice(0, 10).join(', Q')}${appliedNums.length > 10 ? '…' : ''})`
                + (fileSkipped ? ` · 스킵 ${fileSkipped}건(기존 해설/블록 없음)` : ''));
        }
    }
    console.log(`\n${write ? '반영 완료' : '미리보기'}: 편입 ${applied}건 · 스킵 ${skipped}건`
        + (applied && !write ? '\n→ 적용하려면 --write. 이후 npm run check:content -- --build 로 게이트 확인' : ''));
}

if (require.main === module) main();

module.exports = { parseExplainDraft, insertExplain };
