// tests/unit/exams/carework/handover-digest.test.js
// @spec CO-05 — 인수인계 다이제스트 순수 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest } from '../../../../src/exams/carework/handover-digest.js';

const stores = {
    logs: [
        { client: '김영희', date: '2026-11-04', service: '방문요양', note: '식사 보조' },
        { client: '박철수', date: '2026-11-03', service: '주야간' }, // 다른 날짜
    ],
    visits: [{ client: '김영희', date: '2026-11-04', visitor: '아들', purpose: '면회' }],
    incidents: [{ client: '김영희', date: '2026-11-04', type: '낙상', severity: '경미' }],
};

test('해당 일자 대상자 집계 — clients·status·caution', () => {
    const d = buildDigest('2026-11-04', stores);
    assert.equal(d.count, 1);
    assert.equal(d.clients, '김영희');
    assert.match(d.status, /방문요양/);
    assert.match(d.status, /사고 1건/);
    assert.match(d.caution, /낙상\(경미\)/);
});

test('기록 없는 날짜 — 빈 결과', () => {
    const d = buildDigest('2026-11-05', stores);
    assert.equal(d.count, 0);
    assert.equal(d.clients, '');
});

test('빈 스토어 — 예외 없이 빈 결과', () => {
    assert.equal(buildDigest('2026-11-04', {}).count, 0);
});
