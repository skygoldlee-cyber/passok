// tests/unit/feedback-report.test.js
// @spec AD-06 (관리자 운영 CLI)
// tools/check/feedback_report.js — summarize() 순수 집계 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarize } = require('../../../tools/check/feedback_report.js');

const row = (kind, extra = {}) => ({
    created_at: '2026-10-14T01:00:00Z', kind, rating: null, body: 'b', view: 'quiz',
    ...extra,
});

test('summarize: kind별 건수 + 평점 평균(응답 건 기준)', () => {
    const s = summarize([
        row('bug'), row('bug'), row('praise', { rating: 5 }), row('idea', { rating: 3 }),
    ]);
    assert.equal(s.total, 4);
    assert.equal(s.byKind.bug, 2);
    assert.equal(s.byKind.idea, 1);
    assert.equal(s.ratingAvg, '4.00');
    assert.equal(s.ratingCount, 2);
});

test('summarize: 일별 버킷 + bug의 meta.session_id를 연결 조회용으로 노출', () => {
    const s = summarize([
        row('bug', {
            created_at: '2026-10-13T09:00:00Z',
            user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            meta: { session_id: 'sess-1' },
        }),
        row('improve', { created_at: '2026-10-14T22:00:00Z' }),
    ]);
    assert.equal(s.byDay['2026-10-13'], 1);
    assert.equal(s.byDay['2026-10-14'], 1);
    assert.equal(s.items[0].session_id, 'sess-1');
    assert.equal(s.items[0].user, 'aaaaaaaa…');
    assert.equal(s.items[1].user, '(익명)');
    assert.equal(s.items[1].session_id, null);
});

test('summarize: 평점 없으면 n/a — 공백을 0으로 위장하지 않음', () => {
    const s = summarize([row('improve')]);
    assert.equal(s.ratingAvg, 'n/a');
    assert.equal(s.ratingCount, 0);
});

test('summarize: 본문 120자 절단 + 빈 입력', () => {
    const s = summarize([row('bug', { body: 'x'.repeat(200) })]);
    assert.equal(s.items[0].body.length, 120);
    const empty = summarize([]);
    assert.equal(empty.total, 0);
    assert.deepEqual(empty.items, []);
});
