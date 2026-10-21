// tests/unit/usage-telemetry.test.js
// @spec none (텔레메트리 자체 검증 — 관측성 인프라)
// src/usage-telemetry.js — 페이로드 구성·세션 상한·미설정/실패 경로

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEventPayload, reportEvent, _resetUsageTelemetryForTest,
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
