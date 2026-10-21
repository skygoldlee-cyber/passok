// tests/unit/emb-manifest.test.js
// @spec SEM-01,SEM-05
// 임베딩 manifest — 산출물 번들 존재·스키마·입력 해시 정합을 검증한다.
// check:embfresh와 동일 불변식을 테스트 관점에서 이중 확인 (SEM-05 회귀 보호).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EMB_DIR = join(ROOT, 'data', 'exams', 'cosmetic', 'embeddings');
const MANIFEST = join(EMB_DIR, 'manifest.js');

function loadManifest() {
    const src = readFileSync(MANIFEST, 'utf8');
    const m = src.match(/var\s+EMB_MANIFEST\s*=\s*/);
    assert.ok(m, 'EMB_MANIFEST 전역 선언이 없습니다');
    return JSON.parse(src.slice(m.index + m[0].length).trim().replace(/;\s*$/, ''));
}

const mf = loadManifest();

test('SEM-01: manifest 스키마 — 모델·차원·양자화·해시·파일 목록', () => {
    assert.equal(typeof mf.model, 'string');
    assert.ok(mf.dim > 0);
    assert.equal(mf.quant, 'int8');
    assert.match(mf.sourceHash, /^[0-9a-f]{16}$/);
    assert.ok(Array.isArray(mf.files) && mf.files.length >= 3);
    assert.ok(mf.files.some(f => f.file === 'neighbors.js'));
});

test('SEM-01: 선언된 산출물 파일이 모두 존재', () => {
    for (const f of mf.files) {
        assert.ok(existsSync(join(EMB_DIR, f.file)), `누락: embeddings/${f.file}`);
    }
});

test('SEM-05: manifest.inputs의 sha1이 현재 원본 번들과 일치', () => {
    const stale = [];
    for (const [rel, want] of Object.entries(mf.inputs)) {
        const p = join(ROOT, rel);
        if (!existsSync(p)) { stale.push(`소실: ${rel}`); continue; }
        const got = createHash('sha1').update(readFileSync(p)).digest('hex');
        if (got !== want) stale.push(`변경: ${rel}`);
    }
    assert.deepEqual(stale, [], '임베딩이 stale — npm run build:embeddings 재실행 필요');
});

test('SEM-05: neighbors.js에 adj·texts·sameText 구조', () => {
    const src = readFileSync(join(EMB_DIR, 'neighbors.js'), 'utf8');
    const m = src.match(/var\s+EMB_NEIGHBORS\s*=\s*/);
    assert.ok(m);
    const nb = JSON.parse(src.slice(m.index + m[0].length).trim().replace(/;\s*$/, ''));
    assert.ok(nb.adj && nb.texts && nb.sameText !== undefined);
    const key = Object.keys(nb.adj).find(k => k.startsWith('stmt:') && nb.adj[k].length);
    assert.ok(key, 'stmt 이웃이 비어있습니다');
    for (const [k2] of nb.adj[key]) {
        assert.ok(k2 in nb.texts, `texts 누락: ${k2}`);
    }
});
