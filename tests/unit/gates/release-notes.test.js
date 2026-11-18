// tests/unit/gates/release-notes.test.js — 릴리스 노트 정합 복구(--fix) 검증
// @spec none (검증 인프라 테스트)
// version.js가 한쪽만 변경된 머지에서 merge_stamps 드라이버를 거치지 않아
// APP_VERSION이 노트 최신 버전과 어긋나는 드리프트의 기계적 복구를 고정한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mod from '../../../tools/check/check_release_notes.js';

const { reconcileAppVersion } = mod;

const VER_JS = (v) =>
    `// data/version.js — 앱 버전 전역\nwindow.APP_VERSION = '${v}';\n`;

function fixture({ notes, versionJs }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-fix-'));
    const notesPath = path.join(dir, 'release-notes.json');
    const versionJsPath = path.join(dir, 'version.js');
    fs.writeFileSync(notesPath, JSON.stringify(notes));
    if (versionJs !== undefined) fs.writeFileSync(versionJsPath, versionJs);
    return { notesPath, versionJsPath };
}

const STAMPED = (v) => ({ version: v, date: '2026-11-17', notes: ['n'] });

test('reconcileAppVersion — APP_VERSION을 최신 스탬프 노트 버전으로 정합', () => {
    const { notesPath, versionJsPath } = fixture({
        notes: [STAMPED('v20261117-0d38dc9'), STAMPED('v20261117-caa65fa')],
        versionJs: VER_JS('v20261117-caa65fa'),
    });
    const r = reconcileAppVersion({ notesPath, versionJsPath });
    assert.deepEqual(r, { changed: true, from: 'v20261117-caa65fa', to: 'v20261117-0d38dc9' });
    assert.match(fs.readFileSync(versionJsPath, 'utf8'), /APP_VERSION = 'v20261117-0d38dc9'/);
});

test('reconcileAppVersion — 이미 정합이면 변경 없음 (멱등)', () => {
    const { notesPath, versionJsPath } = fixture({
        notes: [STAMPED('v20261117-0d38dc9')],
        versionJs: VER_JS('v20261117-0d38dc9'),
    });
    const r = reconcileAppVersion({ notesPath, versionJsPath });
    assert.equal(r.changed, false);
    assert.equal(fs.readFileSync(versionJsPath, 'utf8'), VER_JS('v20261117-0d38dc9'));
});

test('reconcileAppVersion — pending 초안은 건너뛰고 첫 스탬프 항목 사용', () => {
    const { notesPath, versionJsPath } = fixture({
        notes: [{ pending: true, notes: ['draft'] }, STAMPED('v20261116-a66ca3b')],
        versionJs: VER_JS('v20261114-f189321'),
    });
    const r = reconcileAppVersion({ notesPath, versionJsPath });
    assert.equal(r.to, 'v20261116-a66ca3b');
    assert.equal(r.changed, true);
});

test('reconcileAppVersion — 스탬프 항목 없음·파일 부재면 안전 스킵', () => {
    const { notesPath, versionJsPath } = fixture({
        notes: [{ pending: true, notes: ['draft'] }],
        versionJs: VER_JS('v20261114-f189321'),
    });
    assert.equal(reconcileAppVersion({ notesPath, versionJsPath }).reason, 'no-stamped-entry');
    fs.rmSync(versionJsPath);
    const r = reconcileAppVersion({ notesPath: path.join(path.dirname(notesPath), 'x.json'), versionJsPath });
    assert.equal(r.changed, false);
});
