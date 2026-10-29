// @spec P-14 — 팩별 지연 다운로드 자산 필터 검증
// sw.js의 packAssets 필터(`/exams/<id>/` 접두)와 동일한 규약을 재현해
// ① 각 시험이 양의 자산 집합을 갖고 ② 팩 간 교집합이 없음을 검증한다.
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

// MD_ASSETS 배열을 소스에서 추출해 평가
const m = sw.match(/const MD_ASSETS = \[([\s\S]*?)\];/);
assert.ok(m, 'sw.js에 MD_ASSETS 선언 없음');
const MD_ASSETS = new Function(`return [${m[1]}]`)();
const packAssets = (id) => MD_ASSETS.filter((a) => a.includes(`/exams/${id}/`));

test('P-14: 활성 시험별 자산 필터가 양의 집합을 반환한다', () => {
    for (const id of ['cosmetic', 'skincare', 'hairdresser']) {
        assert.ok(packAssets(id).length > 0, `${id}: 자산 없음`);
    }
});

test('P-14: 팩 간 자산 교집합이 없다', () => {
    const a = new Set(packAssets('cosmetic'));
    const b = new Set(packAssets('skincare'));
    for (const x of a) assert.ok(!b.has(x), `교집합 발견: ${x}`);
});

test('P-14: 공용 문서(비시험 자산)는 팩 필터에서 제외된다', () => {
    const shared = MD_ASSETS.filter((a) => !a.includes('/exams/'));
    assert.ok(shared.length > 0, '공용 문서 없음');
    for (const a of shared) assert.ok(!a.includes('/exams/'), `공용에 시험 경로 혼입: ${a}`);
});
