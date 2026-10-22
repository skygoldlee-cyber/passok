// tests/unit/usage-telemetry.test.js
// @spec none (텔레메트리 자체 검증 — 관측성 인프라)
// src/usage-telemetry.js — 페이로드 구성·세션 상한·미설정/실패 경로

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEventPayload, reportEvent, maybeReportUsageSnapshot, _resetUsageTelemetryForTest,
} from '../../../src/usage-telemetry.js';

beforeEach(() => _resetUsageTelemetryForTest());

// ── 페이로드 ────────────────────────────────────────────────

test('buildEventPayload: 이벤트명·session_id·meta 채움 + 이벤트명 상한', () => {
    const p = buildEventPayload('quiz_start', { count: 10 }, 'sess-test');
    assert.equal(p.session_id, 'sess-test');
    assert.equal(p.event, 'quiz_start');
    assert.equal(p.meta.count, 10);
    assert.ok(p.event.length <= 60);
    assert.equal(buildEventPayload('x'.repeat(100), {}, 's').event.length, 60);
});

test('buildEventPayload: session_id 기본값은 실행당 고정 UUID', () => {
    const a = buildEventPayload('e1'), b = buildEventPayload('e2');
    assert.equal(a.session_id, b.session_id);
    assert.ok(a.session_id.length > 0);
});

// ── 전송 ────────────────────────────────────────────────────

test('reportEvent: 성공 sent · 세션 상한 60 초과는 capped', async () => {
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    assert.equal(await reportEvent('quiz_start', { count: 10 }, { insert }), 'sent');
    for (let i = 0; i < 60; i++) {
        await reportEvent('quiz_complete', {}, { insert });
    }
    assert.equal(await reportEvent('daily_start', {}, { insert }), 'capped');
    assert.equal(rows.length, 60);
});

test('reportEvent: disabled·실패·예외도 상태 반환', async () => {
    assert.equal(await reportEvent('e', {}, { insert: async () => ({ disabled: true }) }), 'disabled');
    _resetUsageTelemetryForTest();
    assert.equal(await reportEvent('e', {}, { insert: async () => ({ error: new Error('db') }) }), 'failed');
    _resetUsageTelemetryForTest();
    assert.equal(await reportEvent('e', {}, { insert: async () => { throw new Error('net'); } }), 'failed');
});

// ── 사용 스냅샷 (UX-MET-05) ────────────────────────────────

test('maybeReportUsageSnapshot: 카운터를 usage_snapshot 이벤트 meta로 전송', async () => {
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    const load = async () => JSON.stringify({
        v: 1, owner: 'dev-x', firstUse: '2026-01-01T09:00', lastUse: '2026-01-10T09:00',
        days: { '2026-01-09': 3, '2026-01-10': 5 },
        views: { 'dashboard-view': 10, 'quiz-view': 4 },
        actions: { drill_from_review: 2, pro_badge_click: 1 },
    });
    const res = await maybeReportUsageSnapshot({ insert, load, today: '2026-01-10' });
    assert.equal(res, 'sent');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event, 'usage_snapshot');
    // 집계 수치만 — owner(영속 식별자)는 meta에 포함되지 않는다
    assert.equal(rows[0].meta.views['dashboard-view'], 10);
    assert.equal(rows[0].meta.actions.drill_from_review, 2);
    assert.equal(rows[0].meta.active_days, 2);
    assert.equal(rows[0].meta.owner, undefined);
});

test('maybeReportUsageSnapshot: 손상·빈 스냅샷은 skipped', async () => {
    const insert = async () => ({});
    assert.equal(await maybeReportUsageSnapshot({ insert, load: async () => 'not-json', today: '2026-01-10' }), 'skipped');
    assert.equal(await maybeReportUsageSnapshot({ insert, load: async () => 'null', today: '2026-01-10' }), 'skipped');
});

test('maybeReportUsageSnapshot: disabled·실패는 reportEvent 상태 그대로', async () => {
    const load = async () => JSON.stringify({ v: 1, days: {}, views: {}, actions: {} });
    assert.equal(await maybeReportUsageSnapshot({ insert: async () => ({ disabled: true }), load, today: '2026-01-10' }), 'disabled');
    _resetUsageTelemetryForTest();
    assert.equal(await maybeReportUsageSnapshot({ insert: async () => { throw new Error('net'); }, load, today: '2026-01-10' }), 'failed');
});
