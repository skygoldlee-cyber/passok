#!/usr/bin/env node
// tools/check/check_doc_provenance.js — 문서 '원본' 선언 경로 존재 검증 (콘텐츠 출처 추적)
// @spec none — `> **원본**: <경로>` 선언이 있는 문서는 경로 존재를 단언. '직접 작성'·'외부'는 패스
const { readFileSync, existsSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const ROOT = join(__dirname, '../..');
const FILES = [];
const scan = (d) => {
    try {
        for (const e of readdirSync(d)) {
            const p = join(d, e);
            if (statSync(p).isDirectory()) scan(p);
            else if (e.endsWith('.md')) FILES.push(p);
        }
    } catch {}
};
scan(join(ROOT, 'docs/user'));
for (const ex of readdirSync(join(ROOT, 'content/exams'))) scan(join(ROOT, 'content/exams', ex, 'docs'));
let bad = 0, checked = 0;
for (const p of FILES) {
    const m = readFileSync(p, 'utf8').match(/\*\*원본\*\*:\s*([^\n(]+)/);
    if (!m || /직접 작성|외부/.test(m[1])) continue;
    checked++;
    if (!existsSync(join(ROOT, m[1].trim()))) {
        console.error(`X ${p.slice(ROOT.length + 1)} — 선언 원본 미존재: ${m[1].trim()}`);
        bad++;
    }
}
if (bad) { console.error(`FAIL — 원본 경로 ${bad}건 미존재`); process.exit(1); }
console.log(`OK — 문서 원본 선언 ${checked}건, 경로 존재 확인`);
