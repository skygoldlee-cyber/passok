// tests/unit/funnel-report.test.js
// @spec none (관측성 인프라)
// tools/check/funnel_report.js — summarize() 순수 집계 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarize } = require('../../../tools/check/funnel_report.js');

const ev = (session_id, event, created_at, meta = null) => ({
    session_id, event, created_at, meta,
});

test('summarize: _start/_complete 쌍 자동 인식 — 이벤트 비·세션 쌍 비율', () => {
    const s = summarize([
        ev('s1', 'quiz_start', '2026-10-14T01:00:00Z'),
        ev('s1', 'quiz_complete', '2026-10-14T01:05:00Z', { correct: 8, total: 10 }),
        ev('s2', 'quiz_start', '2026-10-14T02:00:00Z'),           // 이탈
        ev('s3', 'quiz_start', '2026-10-14T03:00:00Z'),
        ev('s3', 'quiz_complete', '2026-10-14T03:04:00Z', { correct: 6, total: 10 }),
    ]);
    const f = s.funnels.quiz;
    assert.equal(f.starts, 3);
    assert.equal(f.completes, 2);
    assert.equal(f.sessionStarts, 3);
    assert.equal(f.sessionDone, 2);
    assert.ok(Math.abs(f.sessionRate - 2 / 3) < 1e-9);
    assert.ok(Math.abs(f.avgScore - 0.7) < 1e-9);          // (0.8+0.6)/2
    assert.equal(f.avgDurationMs, 4.5 * 60 * 1000);        // (5min+4min)/2
});

test('summarize: session_id 없는 행은 건수만 집계 — 쌍 비율에서 제외', () => {
    const s = summarize([
        ev(null, 'quiz_start', '2026-10-14T01:00:00Z'),
        ev('s1', 'quiz_start', '2026-10-14T02:00:00Z'),
        ev('s1', 'quiz_complete', '2026-10-14T02:03:00Z'),
    ]);
    const f = s.funnels.quiz;
    assert.equal(f.starts, 2);          // 이벤트 비는 session_id 무관
    assert.equal(f.sessionStarts, 1);   // 쌍 비율은 식별 가능한 세션만
    assert.equal(f.sessionRate, 1);
});

test('summarize: complete만 있고 start 없으면 퍼널 미생성', () => {
    const s = summarize([ev('s1', 'quiz_complete', '2026-10-14T01:00:00Z')]);
    assert.deepEqual(s.funnels, {});
});

test('summarize: 빈 입력 → 빈 분포', () => {
    const s = summarize([]);
    assert.equal(s.total, 0);
    assert.deepEqual(s.eventCounts, {});
});

test('summarize: 활성화 — session_start→core_learning_action 세션·설치 전환율', () => {
    const s = summarize([
        ev('s1', 'session_start', '2026-10-22T01:00:00Z', { install_id: 'dev-a' }),
        ev('s1', 'core_learning_action', '2026-10-22T01:01:00Z', { install_id: 'dev-a' }),
        ev('s2', 'session_start', '2026-10-22T02:00:00Z', { install_id: 'dev-b' }),   // 미도달
        ev('s3', 'session_start', '2026-10-22T03:00:00Z', { install_id: 'dev-a' }),   // 같은 기기 재방문, 미도달
    ]);
    const a = s.activation;
    assert.equal(a.sessions, 3);
    assert.equal(a.coreSessions, 1);
    assert.ok(Math.abs(a.sessionRate - 1 / 3) < 1e-9);
    assert.equal(a.installs, 2);            // dev-a·dev-b 고유 설치
    assert.equal(a.coreInstalls, 1);        // dev-a만 도달
    assert.equal(a.installRate, 0.5);
});

test('summarize: session_start는 과업 퍼널로 미생성 — activation으로만 집계', () => {
    const s = summarize([
        ev('s1', 'session_start', '2026-10-22T01:00:00Z', { install_id: 'dev-a' }),
        ev('s1', 'quiz_start', '2026-10-22T01:01:00Z'),
        ev('s1', 'quiz_complete', '2026-10-22T01:05:00Z'),
    ]);
    assert.equal(s.funnels.session, undefined);  // session_complete 없는 의사 퍼널 제외
    assert.ok(s.funnels.quiz);
});

test('summarize: install_id 없는 행은 설치 기준에서 제외 — 세션 기준만 집계', () => {
    const s = summarize([
        ev('s1', 'session_start', '2026-10-22T01:00:00Z'),              // install_id 없음
        ev('s1', 'core_learning_action', '2026-10-22T01:01:00Z'),
    ]);
    assert.equal(s.activation.sessions, 1);
    assert.equal(s.activation.coreSessions, 1);
    assert.equal(s.activation.installs, 0);
    assert.equal(s.activation.installRate, null);
});
