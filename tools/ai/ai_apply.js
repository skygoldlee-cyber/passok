#!/usr/bin/env node
/**
 * ai_apply.js — 리뷰된 해설 초안을 문제은행 정답 블록에 편입
 * @spec AI-01,AI-04,AI-05
 *
 * 사용법:
 *   node tools/ai/ai_apply.js                          # tmp/ai_drafts/explain_*.md 전수 미리보기
 *   node tools/ai/ai_apply.js --file explain_subject1  # 특정 초안
 *   node tools/ai/ai_apply.js --write                  # 실제 반영 (기본은 미리보기)
 *   node tools/ai/ai_apply.js --write --replace        # 기존 해설 교체 (--min-len 보강 초안 적용용)
 *   node tools/ai/ai_apply.js --drafts [--file law]    # draft_<subjectKey>.md 문항 초안 → 문제은행 편입
 *
 * 문항 초안 편입(--drafts, AI-05):
 *   - `### Q{n}`+선지+`**Q{n}답**`(정답·근거 라인·해설)을 정본 포맷으로 변환해
 *     문제은행 끝에 추가 (문항 번호는 기존 최대+1부터 재부여)
 *   - 근거 라인을 `📖 교재 근거` 링크+원문 인용으로 변환 — 인용문은 해당 라인을 교재에서 그대로 복사
 *   - [폐기 후보] 표시 청크·근거/해설 없는 문항은 스킵
 *   - --write 시 manifest.exams[].title N제·exams.json desc N문을 새 문항 수로 동기 갱신
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
const { parseArgs, getTargets, listQbanks, DRAFT_DIR, ROOT, listDraftFiles,
    draftBodyHash, parseDraftMeta, logAdoption } = require('./lib/ai_common');
const { listTextbooks } = require('./lib/textbook');

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

/** 정답 블록에 해설 삽입 — 마지막 `> ` 라인 직후. --replace면 기존 해설을 교체. returns 새 텍스트 또는 null */
function insertExplain(src, qnum, explain, replace = false) {
    const lines = src.split(/\r?\n/);
    const start = lines.findIndex(l => l.trim() === `**Q${qnum}.**`);
    if (start < 0) return null;
    // 블록 끝 = 다음 **Qn.** 헤더 또는 파일 끝
    let lastQ = -1;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^\*\*Q\d+\.\*\*/.test(lines[i])) break;
        if (lines[i].startsWith('>')) {
            if (/\*\*해설\*\*\s*[:：]/.test(lines[i])) {
                if (!replace) return null; // 이미 해설 있음
                lines[i] = `> **해설**: ${explain}`;
                return lines.join('\n');
            }
            lastQ = i;
        }
    }
    if (lastQ < 0) return null;
    lines.splice(lastQ + 1, 0, `> **해설**: ${explain}`);
    return lines.join('\n');
}

// ---------- 문항 초안 편입 (--drafts, AI-05) ----------

/**
 * draft_<subjectKey>.md 파싱 → 문항 배열.
 * [폐기 후보] 표시 청크는 통째 제외, 정답·근거·해설이 빠진 문항도 제외.
 * @returns {Array<{stem:string, options:string[], answer:string, lo:number, hi:number, explain:string}>}
 */
function parseQuestionDraft(draftPath) {
    const chunks = fs.readFileSync(draftPath, 'utf-8').split(/\n##\s/);
    const out = [];
    for (const chunk of chunks) {
        if (/\[폐기 후보\]/.test(chunk)) continue;
        const segs = chunk.split(/\n###\s+Q\d+\.\s*/);
        for (let i = 1; i < segs.length; i++) {
            const am = segs[i].match(/\*\*Q\d+답\*\*/);
            if (!am) continue;
            const head = segs[i].slice(0, am.index);
            const tail = segs[i].slice(am.index);
            const stem = head.split('\n')[0].trim();
            const options = head.split('\n').map(l => l.trim()).filter(l => /^[①②③④⑤]/.test(l));
            const ans = tail.match(/>\s*\*\*정답:\s*(.+?)\*\*/);
            const cite = tail.match(/근거 라인:\s*L(\d+)(?:\s*[-–~]\s*L?(\d+))?/);
            const ex = tail.match(/>\s*\*\*해설\*\*\s*[:：]\s*(.+)/);
            if (!stem || !ans || !cite || !ex || /미생성|DRY RUN/.test(ex[1])) continue;
            out.push({
                stem, options, answer: ans[1].trim(),
                lo: Number(cite[1]), hi: cite[2] ? Number(cite[2]) : Number(cite[1]),
                explain: ex[1].trim(),
            });
        }
    }
    return out;
}

/** 초안 파일의 배치 메타 + 리뷰 수정 여부 — 채택 로그용 공통 필드 (AI-23) */
function batchMeta(f) {
    const text = fs.readFileSync(path.join(DRAFT_DIR, f), 'utf-8');
    const meta = parseDraftMeta(text);
    return {
        model: meta.model, genDate: meta.date,
        edited: meta.sha ? draftBodyHash(text) !== meta.sha : undefined,
    };
}

/** 문항 초안을 문제은행 정본 포맷으로 편입 (미리보기 기본, --write 실반영) */
function applyDrafts(flags, opts) {
    const write = flags.has('write');
    const drafts = fs.existsSync(DRAFT_DIR)
        ? listDraftFiles().filter(f => /^draft_.+\.md$/.test(path.basename(f))
            && (!opts.file || f === `draft_${opts.file.replace(/^draft_/, '').replace(/\.md$/, '')}.md`))
        : [];
    if (!drafts.length) { console.log('draft_* 초안 없음 — ai:draft를 먼저 실행하세요'); return; }

    let applied = 0, skipped = 0;
    for (const target of getTargets(opts)) {
        for (const f of drafts) {
            const subjKey = f.replace(/^draft_/, '').replace(/\.md$/, '');
            const exam = (target.manifest.exams || []).find(e => e.subject === subjKey);
            const book = listTextbooks(target).find(b => b.subjectKey === subjKey);
            if (!exam || !book) continue;
            const qs = parseQuestionDraft(f);
            if (!qs.length) { console.log(`${f}: 편입 가능 문항 0건`); continue; }

            const bankAbs = path.join(ROOT, target.contentRoot, '문제은행', exam.file);
            const src = fs.readFileSync(bankAbs, 'utf-8');
            const bookLines = fs.readFileSync(book.absPath, 'utf-8').split(/\r?\n/);
            const rel = path.relative(path.dirname(bankAbs), book.absPath).split(path.sep).join('/');
            const maxQ = Math.max(0, ...[...src.matchAll(/^###\s*Q(\d+)\./gm)].map(m => Number(m[1])));

            const qLines = [], aBlocks = [];
            let n = maxQ, bad = 0;
            for (const q of qs) {
                const quotes = [];
                for (let l = q.lo; l <= Math.min(q.hi, q.lo + 4); l++) {
                    const t = (bookLines[l - 1] || '').trim();
                    if (t) quotes.push(`> ${t}`);
                }
                if (!quotes.length) { bad++; continue; } // 인용 라인 실측 부재 → 스킵
                n++;
                qLines.push(`### Q${n}. ${q.stem}\n${q.options.join('\n')}\n\n---\n`);
                aBlocks.push(`**Q${n}.**\n\n`
                    + `> **정답: ${q.answer}** [교재: L${q.lo}](<${rel}#L${q.lo}>)\n>\n`
                    + `> **📖 교재 근거 ([교재: L${q.lo}](<${rel}#L${q.lo}>)):**\n`
                    + `${quotes.join('\n')}\n> **해설**: ${q.explain}\n`);
            }
            skipped += bad + (qs.length - aBlocks.length - bad);

            if (aBlocks.length) {
                const newSrc = insertQuestions(src, qLines, aBlocks);
                const newTitle = (exam.title || '').replace(/\d[\d,]*제/, `${n}제`);
                console.log(`${target.id}/${exam.file}: ${write ? '편입' : '편입 예정'} ${aBlocks.length}건`
                    + ` (Q${maxQ + 1}~Q${n}${bad ? ` · 스킵 ${bad}건(인용 부재)` : ''})`);
                if (write) {
                    fs.writeFileSync(bankAbs, newSrc, 'utf-8');
                    syncQuestionCounts(target, exam, newTitle, n);
                    logAdoption({ ts: new Date().toISOString(), draft: f, kind: 'draft',
                        target: target.id, bank: exam.file, generated: qs.length,
                        applied: aBlocks.length, skipped: bad + (qs.length - aBlocks.length - bad),
                        ...batchMeta(f) });
                }
                applied += aBlocks.length;
            }
        }
    }
    console.log(`\n${write ? '반영 완료' : '미리보기'}: 문항 편입 ${applied}건 · 스킵 ${skipped}건`
        + (applied && !write ? '\n→ 적용하려면 --write. 이후 npm run check:content -- --build 로 게이트 확인' : ''));
}

/** 문항 목록은 첫 `## ` 섹션 헤더(🔑 정답부) 앞에, 정답 블록은 파일 끝에 삽입 */
function insertQuestions(src, qLines, aBlocks) {
    const lines = src.split('\n');
    const lastQ = lines.reduce((acc, l, i) => (/^###\s*Q\d+\./.test(l) ? i : acc), -1);
    const secIdx = lines.findIndex((l, i) => i > lastQ && /^##\s/.test(l));
    const insertAt = secIdx >= 0 ? secIdx : lines.length;
    const next = lines.slice();
    next.splice(insertAt, 0, ...qLines);
    return next.join('\n').replace(/\s*$/, '') + '\n\n' + aBlocks.join('\n');
}

/** 문항 수 표기 정합 — manifest.exams[].title N제 + exams.json desc "문제은행 N,N00문" */
function syncQuestionCounts(target, exam, newTitle, perBankCount) {
    if (newTitle !== exam.title) {
        const mf = path.join(ROOT, target.contentRoot, 'manifest.json');
        const src = fs.readFileSync(mf, 'utf-8');
        fs.writeFileSync(mf, src.replace(`"title": "${exam.title}"`, `"title": "${newTitle}"`), 'utf-8');
    }
    const exJson = path.join(ROOT, 'content', 'exams.json');
    const exSrc = fs.readFileSync(exJson, 'utf-8');
    const total = (target.manifest.exams || []).reduce((s, e) => {
        const p = path.join(ROOT, target.contentRoot, '문제은행', e.file);
        const c = fs.existsSync(p) ? (fs.readFileSync(p, 'utf-8').match(/^###\s*Q\d+\./gm) || []).length : 0;
        return s + (e === exam ? perBankCount : c);
    }, 0);
    const blockRe = new RegExp(`("id":\\s*"${target.id}"[\\s\\S]*?문제은행\\s*)[\\d,]+(문)`, '');
    fs.writeFileSync(exJson, exSrc.replace(blockRe, `$1${total.toLocaleString('en-US')}$2`), 'utf-8');
}

function main() {
    const { flags, opts } = parseArgs();
    if (flags.has('drafts')) return applyDrafts(flags, opts);
    const write = flags.has('write');
    const replace = flags.has('replace'); // 기존 해설 교체 모드 (min-len 보강 초안 적용용)

    // 초안 파일 ↔ 문제은행 매칭 — explain_<examKey>.md 규약
    const drafts = fs.existsSync(DRAFT_DIR)
        ? listDraftFiles().filter(f => /^explain_.+\.md$/.test(path.basename(f))
            && (!opts.file || f === `explain_${opts.file.replace(/^explain_/, '').replace(/\.md$/, '')}.md`))
        : [];
    if (!drafts.length) { console.log('explain_* 초안 없음 — ai:explain을 먼저 실행하세요'); return; }

    const targets = getTargets(opts);
    let applied = 0, skipped = 0;

    for (const target of targets) {
        for (const { exam, absPath } of listQbanks(target)) {
            const draft = drafts.find(d => d === `explain_${target.id}_${exam.key}.md`);
            if (!draft) continue;
            const entries = parseExplainDraft(draft);
            if (!entries.size) { console.log(`${draft}: 편입 가능한 해설 0건`); continue; }

            let src = fs.readFileSync(absPath, 'utf-8');
            const appliedNums = [];
            let fileSkipped = 0;
            for (const [qnum, explain] of entries) {
                const next = insertExplain(src, qnum, explain, replace);
                if (next === null) { fileSkipped++; continue; }
                src = next;
                appliedNums.push(qnum);
            }
            skipped += fileSkipped;
            if (appliedNums.length && write) {
                fs.writeFileSync(absPath, src, 'utf-8');
                logAdoption({ ts: new Date().toISOString(), draft, kind: 'explain',
                    target: target.id, bank: exam.file, generated: entries.size,
                    applied: appliedNums.length, skipped: fileSkipped, replace,
                    ...batchMeta(draft) });
            }
            applied += appliedNums.length;
            console.log(`${target.id}/${exam.file}: ${write ? '편입' : '편입 예정'} ${appliedNums.length}건`
                + ` (Q${appliedNums.slice(0, 10).join(', Q')}${appliedNums.length > 10 ? '…' : ''})`
                + (fileSkipped ? ` · 스킵 ${fileSkipped}건(${replace ? '블록 없음' : '기존 해설/블록 없음'})` : ''));
        }
    }
    console.log(`\n${write ? '반영 완료' : '미리보기'}: 편입 ${applied}건 · 스킵 ${skipped}건`
        + (applied && !write ? '\n→ 적용하려면 --write. 이후 npm run check:content -- --build 로 게이트 확인' : ''));
}

if (require.main === module) main();

module.exports = { parseExplainDraft, insertExplain, parseQuestionDraft, insertQuestions };
