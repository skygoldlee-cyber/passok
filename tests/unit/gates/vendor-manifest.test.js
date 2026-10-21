// tests/unit/vendor-manifest.test.js
// @spec BP-13
// vendor-manifest — 스키마·해시 규약(LF 정규화)·verify() 불일치 탐지를 검증한다.
// check:vendor와 동일 불변식을 테스트 관점에서 이중 확인 (BP-13 회귀 보호).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MANIFEST_PATH = join(ROOT, 'vendor', 'vendor-manifest.json');
const { fileHash, collectVendorFiles, manifestFiles, probeVersion, verify } =
    require('../../../tools/check/check_vendor.js');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

test('BP-13: 매니페스트 스키마 — packages·files·sha256 형식', () => {
    assert.ok(manifest.version >= 1);
    const pkgs = Object.entries(manifest.packages);
    assert.ok(pkgs.length >= 3, 'vendor 패키지 최소 3개(fontawesome/mermaid/supabase)');
    for (const [key, pkg] of pkgs) {
        assert.ok(pkg.files && Object.keys(pkg.files).length > 0, `${key}: files 비어있음`);
        for (const [rel, sha] of Object.entries(pkg.files)) {
            assert.match(sha, /^[0-9a-f]{64}$/, `${key}/${rel}: sha256 형식 아님`);
        }
        // npm 추적 패키지는 버전·syncMap 필수 — versionFree는 해시 무결성만
        if (!pkg.versionFree) {
            assert.ok(pkg.npm, `${key}: npm 패키지명 없음`);
            assert.ok(pkg.version, `${key}: version 없음`);
            assert.ok(pkg.syncMap, `${key}: syncMap 없음 — sync:vendor 불가`);
        }
    }
});

test('BP-13: 실물 vendor/ ↔ 매니페스트 정합 (verify 무오류)', () => {
    const { errors } = verify(manifest, join(ROOT, 'vendor'));
    assert.deepEqual(errors, [], 'vendor 무결성 불일치 — check:vendor --update 또는 sync:vendor 필요');
});

test('BP-13: fileHash — 텍스트는 CRLF/LF 동일 해시, 바이너리는 원본', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vendortest-'));
    try {
        const lf = join(tmp, 'a.js'), crlf = join(tmp, 'b.js'), bin = join(tmp, 'c.woff2');
        writeFileSync(lf, Buffer.from('line1\nline2\n', 'binary'));
        writeFileSync(crlf, Buffer.from('line1\r\nline2\r\n', 'binary'));
        writeFileSync(bin, Buffer.from('bin\r\nary', 'binary'));
        assert.equal(fileHash(lf, 'a.js'), fileHash(crlf, 'b.js'), '텍스트 개행 정규화 실패');
        // 바이너리는 정규화하지 않으므로 동일 내용의 텍스트 해시와 달라야 함
        const raw = createHash('sha256').update(readFileSync(bin)).digest('hex');
        assert.equal(fileHash(bin, 'c.woff2'), raw);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
});

test('BP-13: verify() — 소실·해시불일치·미등록·버전불일치 탐지', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vendortest-'));
    try {
        mkdirSync(join(tmp, 'pkg'), { recursive: true });
        const content = 'lib version 1.0.0\n';
        writeFileSync(join(tmp, 'pkg', 'lib.js'), content);
        const goodHash = createHash('sha256').update(content, 'binary').digest('hex');
        const mf = {
            packages: {
                pkg: {
                    version: '1.0.0',
                    versionProbe: { file: 'lib.js', pattern: 'version ([0-9.]+)' },
                    files: { 'lib.js': goodHash },
                },
            },
        };
        assert.deepEqual(verify(mf, tmp).errors, [], '정상 상태에서 오류 발생');

        // 해시 불일치
        const bad = JSON.parse(JSON.stringify(mf));
        bad.packages.pkg.files['lib.js'] = '0'.repeat(64);
        assert.ok(verify(bad, tmp).errors.some((e) => e.includes('해시 불일치')));

        // 미등록 파일
        writeFileSync(join(tmp, 'pkg', 'extra.js'), 'x');
        assert.ok(verify(mf, tmp).errors.some((e) => e.includes('미등록')));

        // 소실 + 버전 불일치
        rmSync(join(tmp, 'pkg', 'lib.js'));
        assert.ok(verify(mf, tmp).errors.some((e) => e.includes('소실')));
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
});

test('BP-13: probeVersion — 정규식 추출과 매니페스트 실측 일치', () => {
    for (const [key, pkg] of Object.entries(manifest.packages)) {
        if (!pkg.versionProbe) continue;
        const got = probeVersion(join(ROOT, 'vendor', key), pkg.versionProbe);
        assert.equal(got, pkg.version, `[${key}] 파일 내 버전 ≠ manifest.version`);
    }
});

test('BP-13: collectVendorFiles — 매니페스트 자신·비디렉터리 제외', () => {
    const actual = collectVendorFiles(join(ROOT, 'vendor'));
    assert.ok(!actual.has('vendor-manifest.json'), '매니페스트가 스캔 대상에 포함됨');
    assert.ok([...actual.keys()].every((k) => k.includes('/')), 'pkg/file 형태가 아닌 항목 존재');
    assert.deepEqual(
        [...manifestFiles(manifest)].sort(),
        [...actual.keys()].sort(),
        '선언 ↔ 실물 파일 집합 불일치');
});
