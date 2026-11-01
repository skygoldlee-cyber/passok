// tests/unit/exams/carework/care-calc.test.js
// @spec none — carework 실무 계산 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCareCost } from '../../../../src/exams/carework/care-calc.js';

test('재가급여 1등급 한도 내 — 15% 본인부담', () => {
    const r = computeCareCost({ type: 'home', grade: 'g1', monthlyUse: 1000000, reduction: 'none' });
    assert.equal(r.selfPay, 150000);
    assert.equal(r.publicPay, 850000);
    assert.equal(r.overLimit, 0);
});
test('재가급여 한도 초과 — 초과분 전액 자부담', () => {
    const r = computeCareCost({ type: 'home', grade: 'g5', monthlyUse: 1300000, reduction: 'none' });
    assert.equal(r.covered, 1151200);
    assert.equal(r.overLimit, 148800);
    assert.equal(r.selfPay, Math.round(1151200 * 0.15) + 148800);
});
test('시설급여 — 20% 본인부담', () => {
    const r = computeCareCost({ type: 'facility', grade: 'g1', monthlyUse: 2000000, reduction: 'none' });
    assert.equal(r.selfPay, 400000);
});
test('감경 60% 적용 — 부담금 40%만 납부', () => {
    const r = computeCareCost({ type: 'home', grade: 'g1', monthlyUse: 1000000, reduction: 'r60' });
    assert.equal(r.selfPay, Math.round(1000000 * 0.15 * 0.4));
});
test('입력 오류 — null', () => {
    assert.equal(computeCareCost({ type: 'home', grade: 'bad', monthlyUse: 0, reduction: 'none' }), null);
    assert.equal(computeCareCost({ type: 'x', grade: 'g1', monthlyUse: 0, reduction: 'none' }), null);
});
