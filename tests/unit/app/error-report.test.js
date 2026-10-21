// tests/unit/error-report.test.js
// @spec none (관측성 인프라)
// tools/check/error_report.js — summarize() 순수 집계 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarize } = require('../../../tools/check/error_report.js');

const row = (kind, extra = {}) => ({
    created_at: '2026-10-14T01:00:00Z', kind, message: 'm', app_version: 'v1', view: 'quiz',
    ...extra,
});

test('summarize: 세션·오류 분리 + 오류율(오류/세션) 계산', () => {
    const s = summarize([
        row('session'), row('session'), row('session'), row('session'),
        row('error', { message: 'boom' }),
    ]);
    assert.equal(s.sessions, 4);
    assert.equal(s.errors, 1);
    assert.equal(s.rate, '25.00%');
});

test('summarize: 세션 0이면 오류율 n/a — 공백을 0%로 위장하지 않음', () => {
    const s = summarize([row('error'), row('unhandledrejection')]);
    assert.equal(s.sessions, 0);
    assert.equal(s.errors, 2);
    assert.match(s.rate, /n\/a/);
});

test('summarize: 일별 버킷 + 종류·버전·뷰·상위 메시지 분포', () => {
    const s = summarize([
        row('session', { created_at: '2026-10-13T09:00:00Z' }),
        row('error', { message: 'a', app_version: 'v1', view: 'quiz' }),
        row('error', { message: 'a', app_version: 'v2', view: 'quiz' }),
        row('unhandledrejection', { message: 'b', view: null, created_at: '2026-10-13T22:00:00Z' }),
    ]);
    assert.deepEqual(s.byDay['2026-10-13'], { sessions: 1, errors: 1 });
    assert.deepEqual(s.byDay['2026-10-14'], { sessions: 0, errors: 2 });
    assert.equal(s.byKind.error, 2);
    assert.equal(s.byKind.unhandledrejection, 1);
    assert.equal(s.byVersion.v1, 2);
    assert.equal(s.byVersion.v2, 1);
    assert.equal(s.byView['(없음)'], 1);
    assert.equal(s.topMessages[0][0], 'a');
    assert.equal(s.topMessages[0][1], 2);
});

test('summarize: 빈 입력 → 0·빈 분포', () => {
    const s = summarize([]);
    assert.equal(s.sessions, 0);
    assert.equal(s.errors, 0);
    assert.deepEqual(s.topMessages, []);
});
