// tests/unit/app/landing.test.js — 랜딩 페이지 위젯 순수 로직
// @spec LP-04,LP-05,LP-09
// computePlanPreview(잔여일→주차 단계 배분)·subjectShares(비중)·daysUntil을 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePlanPreview, subjectShares, daysUntil } from '../../../src/shell/landing.js';

test('LP-09: daysUntil — 자정 기준 잔여 일수', () => {
    const now = new Date(2026, 9, 25, 15, 30); // 2026-10-25 15:30
    assert.equal(daysUntil('2026-10-26', now), 1);
    assert.equal(daysUntil('2026-10-25', now), 0);
    assert.equal(daysUntil('2026-10-20', now), -5);
    assert.ok(Number.isNaN(daysUntil('invalid', now)));
});

test('LP-09: computePlanPreview — 주수 환산과 단계 배분', () => {
    const p = computePlanPreview(90, 90);
    assert.equal(p.weeks, Math.ceil(90 / 7));
    assert.equal(p.compressed, false);
    assert.equal(p.phases.reduce((s, x) => s + x.weeks, 0), p.weeks, '단계 합 = 총 주수');
    assert.deepEqual(p.phases.map(x => x.name), ['개념 통독', '문제 풀이 · 오답 복습', '모의고사 · 마무리']);
    // 권장 리드타임 미만 → 압축 플랜
    assert.equal(computePlanPreview(30, 90).compressed, true);
    // 극단적 단기도 합계 일관
    for (const d of [1, 7, 14, 21, 365]) {
        const r = computePlanPreview(d, 90);
        assert.equal(r.phases.reduce((s, x) => s + x.weeks, 0), r.weeks, `${d}일`);
    }
    // 불가 입력 → null
    assert.equal(computePlanPreview(0, 90), null);
    assert.equal(computePlanPreview(-3, 90), null);
    assert.equal(computePlanPreview(NaN, 90), null);
});

test('LP-09: subjectShares — 문항 수 비중(%)', () => {
    const s = subjectShares([{ name: 'a', count: 300 }, { name: 'b', count: 100 }]);
    assert.deepEqual(s.map(x => x.pct), [75, 25]);
    // 전부 0이면 균등
    const eq = subjectShares([{ name: 'a', count: 0 }, { name: 'b', count: 0 }]);
    assert.deepEqual(eq.map(x => x.pct), [50, 50]);
    assert.deepEqual(subjectShares([]), []);
    assert.deepEqual(subjectShares(null), []);
});
