// tests/unit/da15-content-independence.test.js
// @spec DA-15
// Logic Independent of Content — 콘텐츠 특정 규칙이 플랫폼·빌드 로직에
// 내장되지 않았음을 검증. docSubjectRules는 references.json이 유일한 소스다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { docSubject } = require('../../tools/build/ref_statements.js');

function tmpRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'passok-da15-'));
}

test('docSubject: 규칙 미선언 시험에서 cosmetic 문서명 패턴이 과목을 부여하지 않는다', () => {
    const root = tmpRoot();
    // 구버전 내장 폴백이 살아 있다면 '화장품법(법률)...' → 과목1을 반환한다.
    assert.equal(docSubject('화장품법(법률)(제21525호)', root), null);
    assert.equal(docSubject('시행규칙_별표1_품질관리기준', root), null);
});

test('docSubject: references.json docSubjectRules가 유일한 소스', () => {
    const root = tmpRoot();
    fs.writeFileSync(path.join(root, 'references.json'), JSON.stringify({
        docSubjectRules: [['^예시문서_', 7]],
    }));
    assert.equal(docSubject('예시문서_본문', root), 7);
    assert.equal(docSubject('시행규칙_별표1_품질관리기준', root), null);
});

test('DA-15 게이트: check:contentind 전수 스캔 — 위반 0건 유지', () => {
    const repoRoot = path.resolve(import.meta.dirname, '..', '..');
    const r = spawnSync(process.execPath,
        ['tools/check/check_content_independence.js'],
        { cwd: repoRoot, encoding: 'utf8' });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});
