#!/usr/bin/env node
// @spec none
// tools/audit/audit_doc_links.js — docs/dev/ 문서 중 어디서도 미참조 파일 나열 (노후 문서 후보)
// advisory — 실패해도 종료 0
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, basename } = require('node:path');
const ROOT = join(__dirname, '../..');
function* walk(d) {
    for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) yield* walk(p);
        else if (e.endsWith('.md') || e.endsWith('.js')) yield p;
    }
}
const docs = [...walk(join(ROOT, 'docs/dev'))].filter(f => f.endsWith('.md'));
const corpus = [join(ROOT, 'AGENTS.md'), join(ROOT, 'docs'), join(ROOT, 'tools'), join(ROOT, 'src')];
const refs = new Set();
for (const c of corpus) {
    const files = statSync(c).isDirectory() ? [...walk(c)] : [c];
    for (const f of files) {
        const txt = readFileSync(f, 'utf8');
        for (const d of docs) { const n = basename(d); if (!refs.has(n) && txt.includes(n)) refs.add(n); }
    }
}
const orphan = docs.filter(d => !refs.has(basename(d)));
console.log(`docs/dev 문서 ${docs.length}편 — 미참조 후보 ${orphan.length}편`);
for (const o of orphan) console.log('  · ' + basename(o));
