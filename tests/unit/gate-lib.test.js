// tests/unit/gate-lib.test.js — 체커 공용 lib 회귀 (tools/lib/git_status.js·trace_scan.js)
// @spec none (검증 인프라 테스트)
// 배경: 2026-10-21 생성물 언트랙 전환 후 드러난 체커 버그 3건을 fixture로 고정
//   - porcelain 첫 줄 trim → slice(3)이 'sw.js'→'w.js' (deploy 차단)
//   - extractSpecStatus ROW_RE가 [PL] 두 자리 번호(ROAD-L10/L11) 미인식
//   - 노이즈 라인 규칙의 체커별 분기 — git_status.js로 단일화
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import gitStatus from '../../tools/lib/git_status.js';
import traceScan from '../../tools/lib/trace_scan.js';

const { parseStatusLine, parseStatus, isNoiseOnlyDiff } = gitStatus;
const { extractSpecStatus } = traceScan;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------- parseStatusLine / parseStatus ----------

test('porcelain: 표준 상태 열 조합에서 경로를 추출한다', () => {
    assert.equal(parseStatusLine(' M sw.js'), 'sw.js');          // 작업트리 수정
    assert.equal(parseStatusLine('M  src/a.js'), 'src/a.js');    // 스테이징 수정
    assert.equal(parseStatusLine('MM src/a.js'), 'src/a.js');    // 스테이징+작업트리
    assert.equal(parseStatusLine('?? data/new.js'), 'data/new.js');
    assert.equal(parseStatusLine('A  docs/x.md'), 'docs/x.md');
    assert.equal(parseStatusLine('D  old.js'), 'old.js');
});

test('porcelain: trim된 첫 줄(상태 1글자)도 경로가 깨지지 않는다 — 배포 차단 회귀', () => {
    // git() 헬퍼의 .trim()이 첫 줄 선행 공백을 제거 — ' M sw.js' → 'M sw.js'
    // 구 slice(3) 구현은 여기서 'w.js'를 반환했다
    assert.equal(parseStatusLine('M sw.js'), 'sw.js');
    const out = parseStatus('M sw.js\n M other.js');
    assert.deepEqual(out, ['sw.js', 'other.js']);
});

test('porcelain: rename·따옴표 경로를 해석한다', () => {
    assert.equal(parseStatusLine('R  old.js -> new.js'), 'new.js');
    assert.equal(parseStatusLine(' M "docs/띄어쓰기 파일.md"'), 'docs/띄어쓰기 파일.md');
    assert.equal(parseStatusLine(' M 내 파일.md'), '내 파일.md');
});

// ---------- isNoiseOnlyDiff ----------

const DIFF_CACHE_ONLY = [
    'diff --git a/sw.js b/sw.js',
    '@@ -24 +24 @@',
    "-const CACHE_VERSION = 'v20261021-aaaaaaa';   // 주석",
    "+const CACHE_VERSION = 'v20261021-bbbbbbb';   // 주석",
].join('\n');

const DIFF_REAL_CHANGE = [
    'diff --git a/sw.js b/sw.js',
    '@@ -24 +24 @@',
    "-const CACHE_VERSION = 'v20261021-aaaaaaa';",
    "+const NEW_CONST = 'x';",
].join('\n');

test('노이즈 diff: CACHE_VERSION·generatedAt만의 차이는 드리프트가 아니다', () => {
    assert.equal(isNoiseOnlyDiff(DIFF_CACHE_ONLY), true);
    assert.equal(isNoiseOnlyDiff(
        '+  "generatedAt": "2026-10-21T00:00:00.000Z",\n-  "generatedAt": "2026-10-20T00:00:00.000Z",'), true);
    assert.equal(isNoiseOnlyDiff('// 생성: x | 2026-10-21'), false); // diff +/- 라인이 아니면 무관
});

test('노이즈 diff: 실제 변경이 섞이면 드리프트다', () => {
    assert.equal(isNoiseOnlyDiff(DIFF_REAL_CHANGE), false);
    assert.equal(isNoiseOnlyDiff(''), false);      // diff 없음 = 노이즈 판정 불가 → 보수적 실패
    assert.equal(isNoiseOnlyDiff(DIFF_CACHE_ONLY + '\n+realLine = 1;'), false);
});

// ---------- extractSpecStatus ----------

test('spec status: [PL] 접두 두 자리 번호의 상태 셀을 추출한다 — ROAD-L10 회귀', () => {
    const fixture = [
        '| ID | 요구사항 | 근거 | 상태 |',
        '|---|---|---|---|',
        '| ROAD-L9 | a | b | 미구현 |',
        '| ROAD-L10 | a | b | 미구현 |',
        '| ROAD-L11 | a | b | 미구현 |',
        '| ROAD-P12 | a | b | 보류 |',
        '| AD-01 | a | b | ✅ |',
        '| SEM-06 | a | b | 보류 |',
        '| UX-PWA-07 | a | 세 셀 행 — 상태 없음 |',
    ].join('\n');
    const tmp = path.join(os.tmpdir(), `spec-fixture-${process.pid}.md`);
    fs.writeFileSync(tmp, fixture);
    try {
        const s = extractSpecStatus(tmp);
        assert.equal(s.get('ROAD-L9'), '미구현');
        assert.equal(s.get('ROAD-L10'), '미구현');  // 구 [PL]\d 정규식은 행 자체를 놓쳐 undefined
        assert.equal(s.get('ROAD-L11'), '미구현');
        assert.equal(s.get('ROAD-P12'), '보류');
        assert.equal(s.get('AD-01'), '✅');
        assert.equal(s.get('SEM-06'), '보류');
    } finally {
        fs.rmSync(tmp, { force: true });
    }
});

test('spec status: 실제 SPEC.md에서 미구현 로드맵 ID가 추출된다', () => {
    const s = extractSpecStatus(path.join(ROOT, 'docs', 'dev', 'SPEC.md'));
    // 미구현 표기 로드맵 — 회귀 시 undefined가 돼 커버리지 공백으로 오집계됐다
    for (const id of ['ROAD-L9', 'ROAD-L10', 'ROAD-L11']) {
        assert.match(s.get(id) || '', /미구현|보류/, `${id} 상태 셀 추출 실패`);
    }
});
