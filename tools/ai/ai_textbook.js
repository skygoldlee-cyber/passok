#!/usr/bin/env node
/**
 * ai_textbook.js — ref_md 청크 → 교재 본문 초안 생성 (CS-11 도출 계약의 AI 단계)
 * @spec AI-24,AI-01,AI-03,AI-13,CS-11
 *
 * scaffold:chapter(BP-15) 골격의 `<!-- 작성: 본문 -->` 슬롯을 채울 본문 초안을
 * 참조자료 ref_md 청크에서 생성한다. 초안은 tmp/ai_drafts/에만 출력되고
 * content/ 편입은 사람 리뷰 경유 (AI-01). 📌출처·원문 보기 블록은 LLM이 아니라
 * 도구가 결정론적으로 생성해 말미에 첨부한다 (형식 결함류 원천 차단).
 *
 * 사용법:
 *   node tools/ai/ai_textbook.js --exam insadj --doc "보험업법" [--lines 1-200] [--dry-run]
 *
 * - --doc은 ref_md 문서 베이스명 또는 부분 문자열 (부분 매칭 다수 시 목록 출력 후 중단)
 * - 조호 자기검증: 생성 본문의 제N조 언급이 청크 원문에 없으면 [폐기 후보] 표시 (AI-03)
 * - --dry-run/키 부재 시 전송 예정 프롬프트만 기록 (AI-02 계약)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { parseArgs, getTargets, writeDraft, loadEnv, ROOT } = require('./lib/ai_common');
const { refLink } = require('../build/scaffold_chapter.js');
const llm = require('./llm_client');

const SYSTEM = `당신은 자격시험 교재 집필 보조입니다. 제공된 참조자료 원문 청크만을 근거로 교재 본문 초안을 작성한다.
출력 형식(섹션마다):
### <섹션 제목 — 조문 기반이면 조호 포함, 예: 제3조(정의)>
<본문 2~6문장 — 원문을 학습용 해설체로 재서술>
규칙:
- 제공된 원문에 없는 사실·수치·주체·고유명사를 만들지 말 것.
- 조호는 원문에 실재하는 것만 '제N조'로 표기할 것.
- 의무·금지·허가·기간·수치 등 규제 효력의 주체·대상·조건을 원문 그대로 보존할 것.
- 문제·선지·발문을 만들지 말 것 — 교재 본문만 작성.
- 📌출처·원문 보기 등 인용 블록은 쓰지 말 것 — 도구가 별도 생성한다.`;

/** ref_md 전체 문서 목록 — {docName, subjectDir, absPath, mdRel} (mdRel은 contentRoot 기준) */
function findRefDocs(target) {
    const base = path.join(ROOT, target.contentRoot, '참조자료', 'ref_md');
    if (!fs.existsSync(base)) return [];
    const docs = [];
    for (const sdir of fs.readdirSync(base, { withFileTypes: true })) {
        if (!sdir.isDirectory() || !/^과목\d+$/.test(sdir.name)) continue;
        const sdirAbs = path.join(base, sdir.name);
        for (const d of fs.readdirSync(sdirAbs, { withFileTypes: true })) {
            if (!d.isDirectory()) continue;
            const absPath = path.join(sdirAbs, d.name, `${d.name}.md`);
            if (fs.existsSync(absPath)) {
                docs.push({
                    docName: d.name, subjectDir: sdir.name, absPath,
                    mdRel: path.relative(path.join(ROOT, target.contentRoot), absPath).replace(/\\/g, '/'),
                });
            }
        }
    }
    return docs;
}

/**
 * ref_md 문서를 조문 경계(`^제N조`)로 청크 분할 — ref_md는 마크다운 헤딩이
 * 없는 평문이라 chunkTextbook(헤딩 경계)이 전체를 1청크로 만든다.
 * 연속 조문을 maxLines까지 묶고, 조문이 없는 문서(별표·표)는 고정폭 창으로 분할.
 */
function chunkRefDoc(absPath, maxLines = 100) {
    const lines = fs.readFileSync(absPath, 'utf-8').split(/\r?\n/);
    const artIdx = [];
    lines.forEach((l, i) => { if (/^제\d+조/.test(l)) artIdx.push(i); });
    const chunks = [];
    if (artIdx.length) {
        const bounds = [0, ...artIdx.slice(1), lines.length];
        let cur = null;
        for (let b = 0; b < bounds.length - 1; b++) {
            const s = bounds[b], e = bounds[b + 1];
            const head = lines[s].slice(0, 60);
            if (!cur || (e - cur.startLine0) > maxLines) {
                if (cur) chunks.push(fin(cur));
                cur = { heading: head, startLine0: s, buf: lines.slice(s, e) };
            } else {
                cur.buf.push(...lines.slice(s, e));
            }
        }
        if (cur) chunks.push(fin(cur));
    } else {
        for (let s = 0; s < lines.length; s += maxLines) {
            chunks.push({
                heading: `(고정폭 창)`, startLine: s + 1,
                endLine: Math.min(s + maxLines, lines.length),
                text: lines.slice(s, s + maxLines).join('\n'),
            });
        }
    }
    return chunks.filter(c => c.text.trim().length > 0);

    function fin(c) {
        return {
            heading: c.heading.slice(0, 80), startLine: c.startLine0 + 1,
            endLine: c.startLine0 + c.buf.length, text: c.buf.join('\n'),
        };
    }
}

/** 생성 본문의 제N조 언급이 청크 원문에 실재하는지 검증 → 위반 조호 목록 */
function invalidArticleRefs(text, chunkText) {
    const bad = new Set();
    for (const m of text.matchAll(/제(\d+)조/g)) {
        if (!new RegExp(`제${m[1]}조`).test(chunkText)) bad.add(`제${m[1]}조`);
    }
    return [...bad];
}

/** 청크용 프롬프트 — 라인 번호 부여 원문 + 작성 지시 */
function buildPrompt(chunk) {
    const numbered = chunk.text.split('\n')
        .map((l, i) => `L${chunk.startLine + i} | ${l}`).join('\n');
    return `참조자료 원문 청크 (라인 L번호 포함):\n\n${numbered}\n\n위 원문을 근거로 교재 본문 섹션을 작성하라.`;
}

/** 초안 파일 본문 라인 조립 (dryRun 시 프롬프트 기록, 아니면 생성물+자기검증) */
function assembleDraftLines({ target, doc, chunks, results }) {
    const lines = [
        `# 교재 본문 초안 — ${doc.docName}`,
        `> 대상: ${target.id} · 근거: ${target.contentRoot}/${doc.mdRel}`,
        '> 편입: scaffold:chapter 골격의 `<!-- 작성: 본문 -->` 슬롯에 리뷰 후 배치.',
        '>   📌출처·원문 보기 블록은 말미 "편입용 블록" 사용 — CS-11 형식으로 도구 생성.',
        '',
    ];
    chunks.forEach((chunk, i) => {
        lines.push(`## ${chunk.heading} (L${chunk.startLine}~L${chunk.endLine})`, '');
        lines.push(results[i], '');
    });
    const link = refLink(target.contentRoot, doc.mdRel);
    lines.push('---', '', '## 편입용 블록 (결정론 생성 — 챕터당 1세트)', '');
    lines.push(`> 📌 **출처**: ${doc.docName} 제N조 | **참조 자료**: [${doc.docName}.md](${link}) | **시행일**: <!-- 확인 --> | **최종 확인**: <!-- 확인 -->`, '');
    lines.push(`> **원문 보기**: [${doc.docName}.md](${link})`, '');
    return lines;
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();

    const target = getTargets(opts)[0];
    if (!target) { console.error('대상 시험을 찾을 수 없음 (--exam 지정)'); process.exit(1); }
    if (!opts.doc) { console.error('--doc <ref 문서명> 필요'); process.exit(1); }

    const docs = findRefDocs(target);
    const exact = docs.filter(d => d.docName === opts.doc);
    const partial = docs.filter(d => d.docName.includes(opts.doc));
    const matches = exact.length ? exact : partial;
    if (!matches.length) {
        console.error(`ref 문서 없음: ${opts.doc}\n사용 가능:\n${docs.map(d => `  ${d.subjectDir}/${d.docName}`).join('\n')}`);
        process.exit(1);
    }
    if (matches.length > 1) {
        console.error(`부분 매칭 다수 — 정확히 지정:\n${matches.map(d => `  ${d.subjectDir}/${d.docName}`).join('\n')}`);
        process.exit(1);
    }
    const doc = matches[0];

    let chunks = chunkRefDoc(doc.absPath);
    if (opts.lines) {
        const [lo, hi] = String(opts.lines).split('-').map(Number);
        chunks = chunks.filter(c => c.endLine >= lo && c.startLine <= (hi || Infinity));
    }
    if (!chunks.length) { console.log(`${doc.docName}: 범위 내 청크 없음`); return; }

    const results = [];
    for (const chunk of chunks) {
        const prompt = buildPrompt(chunk);
        if (dryRun) {
            results.push(['(미생성 — DRY RUN 또는 API 키 없음)', '',
                '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>'].join('\n'));
            continue;
        }
        const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 4000 });
        if (res.dryRun) {
            results.push('(미생성 — DRY RUN)');
            continue;
        }
        const bad = invalidArticleRefs(res.text, chunk.text);
        const flag = bad.length
            ? `> ⚠️ [폐기 후보] 원문에 없는 조호 언급: ${bad.join(', ')}\n`
            : '';
        results.push(flag + res.text);
    }

    const lines = assembleDraftLines({ target, doc, chunks, results });
    const out = writeDraft(`${target.id}/textbook_${doc.docName.replace(/[\\/:*?"<>|]/g, '_')}.md`, lines, { model: llm.modelName() });
    console.log(`${doc.docName} (${doc.subjectDir}): 청크 ${chunks.length}개 → ${path.relative(ROOT, out)}`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { findRefDocs, chunkRefDoc, invalidArticleRefs, buildPrompt, assembleDraftLines, SYSTEM };
