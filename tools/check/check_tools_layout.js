#!/usr/bin/env node
/**
 * check_tools_layout.js — tools/ 배치 규약 검증 (docs:toolslayout)
 *
 * 배치 규약 (기능 기준 이분):
 *   tools/check/  — 차단 게이트·검증 인프라 (run.js·steps.js·check_*·verify_*·진단 유틸)
 *   tools/audit/  — 감사 도구 (audit_* — advisory 리포트·기준선 감사)
 *
 * 규칙:
 *   1) tools/check/ 에 audit_*.js 금지 — 감사 도구는 tools/audit/로 이동.
 *   2) tools/audit/ 는 audit_*.js 만 허용 — 게이트·유틸은 tools/check/ 또는 성격 디렉터리로.
 *
 * 사용: node tools/check/check_tools_layout.js   (docs·all·ci 프리셋 편입)
 */

// @spec none (저장소 배치 규약)
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AUDIT_RE = /^audit_.*\.js$/;

const jsFiles = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => e.name);

const errors = [];
for (const f of jsFiles('tools/check')) {
    if (AUDIT_RE.test(f)) errors.push(`tools/check/${f} — 감사 도구는 tools/audit/로 이동`);
}
for (const f of jsFiles('tools/audit')) {
    if (!AUDIT_RE.test(f)) errors.push(`tools/audit/${f} — audit_* 외 파일은 tools/check/ 또는 성격 디렉터리로`);
}

if (errors.length) {
    console.error('❌ tools/ 배치 규약 위반:');
    for (const e of errors) console.error(`   - ${e}`);
    process.exit(1);
}
console.log('✅ tools/ 배치 규약 통과 — check/ 게이트 · audit/ 감사 분리 유지');
