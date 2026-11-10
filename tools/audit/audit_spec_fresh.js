#!/usr/bin/env node
// @spec none
// tools/audit/audit_spec_fresh.js — SPEC 활성(✅) 행 중 코드 @spec 참조 0건 나열 (노후 요구사항 후보)
// advisory — 실패해도 종료 0. 문서형·정책형 요구사항은 참조 0이 정상이라 수동 판독용
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');
const ROOT = join(__dirname, '../..');
const spec = readFileSync(join(ROOT, 'docs/dev/SPEC.md'), 'utf8');
const ids = new Set();
for (const m of spec.matchAll(/\|\s*([A-Z][A-Z0-9-]+)\s*\|[^|]*\|\s*✅/g)) ids.add(m[1]);
let files = [];
try {
    files = execSync('git grep -l "@spec" -- src tools tests html index.template.html', { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
} catch { /* no match */ }
const tagged = new Set();
for (const fp of files) {
    const txt = readFileSync(join(ROOT, fp), 'utf8');
    for (const id of ids) if (!tagged.has(id) && txt.includes('@spec ' + id)) tagged.add(id);
}
const stale = [...ids].filter(id => !tagged.has(id));
console.log(`SPEC 활성 ${ids.size}건 — 코드 참조 ${tagged.size}건, 미참조 후보 ${stale.length}건`);
if (stale.length) console.log('미참조 (문서형·정책형 여부 수동 확인):', stale.join(', '));
