// tests/unit/exams/carework/care-timeline.test.js
// @spec CO-02 — 대상자 이력 통합 순수 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientTimeline, timelineSummary } from '../../../../src/exams/carework/care-timeline.js';

const stores = {
    logs: [
        { id: 'l1', client: '김영희', clientId: 'cli_a', date: '2026-11-01', service: 'visit-care', note: '식사 보조' },
        { id: 'l2', client: '박철수', clientId: 'cli_b', date: '2026-11-02', service: 'day' },
        { id: 'l3', client: '김영희', date: '2026-10-30', service: 'visit-care' }, // clientId 없는 기존 레코드 — 스냅샷 매칭
    ],
    visits: [{ id: 'v1', client: '김영희', clientId: 'cli_a', date: '2026-11-03', visitor: '아들' }],
    handovers: [{ id: 'h1', client: '김영희', clientId: 'cli_a', date: '2026-11-02', memo: '낙상 주의' }],
    incidents: [{ id: 'i1', client: '김영희', clientId: 'cli_a', date: '2026-11-01', type: '낙상', severity: '경미' }],
};

test('clientId + 스냅샷 통합 조회 — 최신순·타인 제외', () => {
    const tl = clientTimeline('cli_a', '김영희', stores);
    assert.equal(tl.length, 5);
    assert.equal(tl[0].date, '2026-11-03');
    assert.ok(!tl.some(t => t.ref.id === 'l2'));
    assert.deepEqual([...new Set(tl.map(t => t.kind))].sort(), ['사고', '방문', '인수인계', '일지'].sort());
});

test('timelineSummary — 건수·최근일·종류별', () => {
    const s = timelineSummary(clientTimeline('cli_a', '김영희', stores));
    assert.equal(s.count, 5);
    assert.equal(s.lastDate, '2026-11-03');
    assert.equal(s.kinds['일지'], 2);
    assert.equal(s.kinds['사고'], 1);
});

test('이력 없는 대상자 — 빈 배열', () => {
    assert.deepEqual(clientTimeline('cli_z', '없음', stores), []);
    assert.equal(timelineSummary([]).count, 0);
});
