// tests/unit/exams/carework/care-trend.test.js
// @spec CO-03·CO-04 — 관찰 추세 확인 순수 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientTrends } from '../../../../src/exams/carework/care-trend.js';

const L = (date, obs) => ({ client: '김영희', clientId: 'cli_a', date, obs });

test('연속 감소 → 확인 권장 신호', () => {
    const logs = [L('11-01', { meal: '전' }), L('11-02', { meal: '반' }), L('11-03', { meal: '소' })];
    const t = clientTrends(logs, { clientId: 'cli_a' });
    assert.equal(t.length, 1);
    assert.match(t[0].message, /식사량 확인 권장/);
});

test('동일 수준·회복 → 신호 없음', () => {
    assert.equal(clientTrends([L('1', { meal: '반' }), L('2', { meal: '반' }), L('3', { meal: '반' })], { clientId: 'cli_a' }).length, 0);
    assert.equal(clientTrends([L('1', { meal: '소' }), L('2', { meal: '반' }), L('3', { meal: '전' })], { clientId: 'cli_a' }).length, 0);
});

test('관측 끊김·2건 미달·obs 없음 → 신호 없음', () => {
    assert.equal(clientTrends([L('1', { meal: '전' }), L('2', {}), L('3', { meal: '소' })], { clientId: 'cli_a' }).length, 0);
    assert.equal(clientTrends([L('1', { meal: '전' }), L('2', { meal: '소' })], { clientId: 'cli_a' }).length, 0);
    assert.equal(clientTrends([{ client: '김영희', clientId: 'cli_a', date: '1' }], { clientId: 'cli_a' }).length, 0);
});

test('수면 악화 + 타인 제외', () => {
    const logs = [L('1', { sleep: '양호' }), L('2', { sleep: '불량' }), L('3', { sleep: '불면' }),
        { client: '박철수', clientId: 'cli_b', date: '4', obs: { meal: '소' } }];
    const t = clientTrends(logs, { clientId: 'cli_a' });
    assert.equal(t.length, 1);
    assert.equal(t[0].key, 'sleep');
});
