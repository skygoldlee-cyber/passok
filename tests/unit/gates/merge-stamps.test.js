// tests/unit/gates/merge-stamps.test.js — 배포 스탬프 머지 드라이버 규칙 검증
// @spec none (검증 인프라 테스트)
// 양 머신 배포 스탬프 충돌 재발 차단 — 버전 max 채택·노트 합집합·스탬프 외 양측
// 변경 시 수동 해결(null)로 넘기는 안전 규칙을 고정한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import mergeMod from '../../../tools/merge/merge_stamps.js';

const { mergeStampFile, mergeNotes, mergePackageJson, newerVersion } = mergeMod;

const VER_JS = (v) =>
    `// data/version.js — 앱 버전 전역 (배포 시 tools/build/stamp_release_notes.js가 갱신)\n` +
    `// sw.js CACHE_VERSION과 동일 값을 유지한다.\n` +
    `window.APP_VERSION = '${v}';\n`;

test('newerVersion — 날짜 내림차, 동일 날짜는 theirs 우선', () => {
    assert.equal(newerVersion('v20261024-aaaaaaa', 'v20261026-bbbbbbb'), 'v20261026-bbbbbbb');
    assert.equal(newerVersion('v20261026-bbbbbbb', 'v20261024-aaaaaaa'), 'v20261026-bbbbbbb');
    assert.equal(newerVersion('v20261024-aaaaaaa', 'v20261024-bbbbbbb'), 'v20261024-bbbbbbb');
});

test('version.js — 스탬프만 다르면 큰 버전 채택', () => {
    const base = VER_JS('v20261023-0000000');
    const ours = VER_JS('v20261024-980ef49');
    const theirs = VER_JS('v20261026-1f88495');
    const out = mergeStampFile(base, ours, theirs, 'data/version.js');
    assert.match(out, /APP_VERSION = 'v20261026-1f88495'/);
});

test('sw.js — 한쪽의 실변경(DATA_ASSETS) 보존 + CACHE_VERSION은 큰 값', () => {
    const sw = (v, extra = '') =>
        `const CACHE_VERSION = '${v}';\nconst A = ['./x.js'${extra}];\n`;
    const base = sw('v20261023-0000000');
    const ours = sw('v20261024-980ef49');                       // 스탬프만
    const theirs = sw('v20261026-1f88495', ",\n  './new.js'"); // 스탬프+실변경
    const out = mergeStampFile(base, ours, theirs, 'sw.js');
    assert.match(out, /CACHE_VERSION = 'v20261026-1f88495'/);
    assert.match(out, /\.\/new\.js/);
});

test('sw.js — 양쪽 모두 스탬프 외 변경이면 null(수동 해결)', () => {
    const base = `const CACHE_VERSION = 'v20261023-x';\nconst A = 1;\n`;
    const ours = `const CACHE_VERSION = 'v20261024-x';\nconst A = 2;\n`;
    const theirs = `const CACHE_VERSION = 'v20261026-x';\nconst A = 3;\n`;
    assert.equal(mergeStampFile(base, ours, theirs, 'sw.js'), null);
});

test('release-notes.json — version 키 합집합·날짜 내림차·20건 트림', () => {
    const mk = (v, d) => ({ version: v, date: d, notes: [`n-${v}`] });
    const oursArr = [mk('v20261024-980ef49', '2026-10-24')];
    const theirsArr = Array.from({ length: 20 }, (_, i) =>
        mk(`v20261026-${String(i).padStart(7, '0')}`, '2026-10-26'));
    const out = JSON.parse(mergeStampFile('[]', JSON.stringify(oursArr), JSON.stringify(theirsArr), 'data/release-notes.json'));
    assert.equal(out.length, 21); // 리모트 20 + 로컬 전용 1
    assert.ok(out[0].date >= out[20].date); // 날짜 내림차 정렬
    assert.equal(out[20].version, 'v20261024-980ef49'); // 로컬 전용은 말미
    // 동일 version은 중복 없이 1건
    const dup = JSON.parse(mergeStampFile('[]',
        JSON.stringify([mk('v20261026-aaaaaaa', '2026-10-26')]),
        JSON.stringify([mk('v20261026-aaaaaaa', '2026-10-26'), mk('v20261026-bbbbbbb', '2026-10-26')]),
        'data/release-notes.json'));
    assert.equal(dup.length, 2);
});

test('release-notes.js — 래퍼 병합 후 writeNotes 형식 재생성', () => {
    const wrap = (arr) => `// 헤더\nwindow.RELEASE_NOTES = ${JSON.stringify(arr)};\n`;
    const o = [{ version: 'v20261024-980ef49', date: '2026-10-24', notes: ['a'] }];
    const t = [{ version: 'v20261026-1f88495', date: '2026-10-26', notes: ['b'] }];
    const out = mergeStampFile('', wrap(o), wrap(t), 'data/release-notes.js');
    assert.match(out, /^\/\/ data\/release-notes\.js — 생성 파일/);
    assert.match(out, /window\.RELEASE_NOTES = \[/);
    const arr = JSON.parse(/RELEASE_NOTES = (\[[\s\S]*\]);/.exec(out)[1]);
    assert.deepEqual(arr.map((e) => e.version), ['v20261026-1f88495', 'v20261024-980ef49']);
});

test('mergeNotes — pending 항목은 최대 1개, 선두 유지', () => {
    const p = { pending: true, date: '2026-10-26', notes: ['draft'] };
    const s = { version: 'v20261026-aaaaaaa', date: '2026-10-26', notes: ['x'] };
    const out = mergeNotes([p, s], [{ pending: true, notes: ['other'] }, s]);
    assert.equal(out.length, 2);
    assert.equal(out[0].pending, true);
});

test('package.json — version만 다른 스탬프 충돌 자동 병합', () => {
    const base = JSON.stringify({ name: 'passok', version: '2026.10.23' }, null, 2) + '\n';
    const ours = JSON.stringify({ name: 'passok', version: '2026.10.24' }, null, 2) + '\n';
    const theirs = JSON.stringify({ name: 'passok', version: '2026.10.26' }, null, 2) + '\n';
    const out = JSON.parse(mergePackageJson(base, ours, theirs));
    assert.equal(out.version, '2026.10.26');
    // 양쪽 실변경(scripts 갈아끼움)은 null
    const o2 = JSON.stringify({ name: 'passok', version: '2026.10.24', a: 1 });
    const t2 = JSON.stringify({ name: 'passok', version: '2026.10.26', b: 2 });
    assert.equal(mergePackageJson(base, o2, t2), null);
});
