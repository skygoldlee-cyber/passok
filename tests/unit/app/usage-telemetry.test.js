// tests/unit/usage-telemetry.test.js
// @spec UX-MET-05, UX-MET-06, UX-MET-07, UX-MET-08, PAY-04
// src/telemetry/usage-telemetry.js — 페이로드 구성·세션 상한·미설정/실패 경로·동의·화이트리스트·큐

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEventPayload, reportEvent, maybeReportUsageSnapshot, flushTelemetryQueue,
  reportSessionStart, ALLOWED_EVENTS, _resetUsageTelemetryForTest,
} from '../../../src/telemetry/usage-telemetry.js';
import { setTelemetryAllowed, getInstallId } from '../../../src/telemetry/telemetry-consent.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { safeGetItem } from '../../../src/state.js';

// localStorage 모킹 — storage.js 백엔드가 localStorage를 경유
function _mockStorage() {
    const store = {};
    return {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => Object.keys(store).forEach((k) => delete store[k]),
        key: (i) => Object.keys(store)[i] ?? null,
        get length() { return Object.keys(store).length; },
    };
}

let _orig;
beforeEach(() => {
    _orig = global.localStorage;
    Object.defineProperty(global, 'localStorage', { value: _mockStorage(), writable: true, configurable: true });
    _resetUsageTelemetryForTest();
    setTelemetryAllowed(true); // 기본 상태로 복원
});
afterEach(() => {
    if (_orig !== undefined) Object.defineProperty(global, 'localStorage', { value: _orig, writable: true, configurable: true });
    else delete global.localStorage;
});

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
    assert.equal(await reportEvent('quiz_start', {}, { insert: async () => ({ disabled: true }) }), 'disabled');
    _resetUsageTelemetryForTest();
    assert.equal(await reportEvent('quiz_start', {}, { insert: async () => ({ error: new Error('db') }) }), 'failed');
    _resetUsageTelemetryForTest();
    assert.equal(await reportEvent('quiz_start', {}, { insert: async () => { throw new Error('net'); } }), 'failed');
});

// ── 동의 게이트 (UX-MET-06) ────────────────────────────────

test('reportEvent: opt-out 시 consent_denied — 전송 차단, 기능 제한 없음', async () => {
    setTelemetryAllowed(false);
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    assert.equal(await reportEvent('quiz_start', {}, { insert }), 'consent_denied');
    assert.equal(rows.length, 0); // 전송 시도 자체가 안 일어남
    setTelemetryAllowed(true);
    assert.equal(await reportEvent('quiz_start', {}, { insert }), 'sent'); // 재허용 시 즉시 전송
});

// ── 화이트리스트 (UX-MET-06, ADR-0019) ─────────────────────

test('reportEvent: 화이트리스트 외 이벤트는 skipped', async () => {
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    assert.equal(await reportEvent('page_view', {}, { insert }), 'skipped');
    assert.equal(await reportEvent('random_custom', {}, { insert }), 'skipped');
    assert.equal(rows.length, 0);
    // 허용 이벤트는 통과
    for (const ev of ALLOWED_EVENTS) {
        _resetUsageTelemetryForTest();
        assert.equal(await reportEvent(ev, {}, { insert }), 'sent', `${ev} should be allowed`);
    }
});

// ── 자동화 런타임 게이트 — 지표 오염 차단 ────────────────────

test('reportEvent: 자동화 런타임은 automated — 전송 차단, false 우회 시 전송', async () => {
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    assert.equal(await reportEvent('quiz_start', {}, { insert, automated: true }), 'automated');
    assert.equal(rows.length, 0);
    assert.equal(await reportEvent('quiz_start', {}, { insert, automated: false }), 'sent');
    assert.equal(rows.length, 1);
});

// ── 전환 퍼널 (PAY-04) ─────────────────────────────────────

test('PAY-04: 결제 전환 이벤트 5종이 화이트리스트에 등록·전송 가능', async () => {
    const funnel = ['plan_compare_view', 'payment_notice_view', 'payment_link_click',
        'code_redeem_attempt', 'code_redeem_success'];
    for (const ev of funnel) {
        assert.ok(ALLOWED_EVENTS.has(ev), `${ev} not whitelisted`);
        _resetUsageTelemetryForTest();
        const rows = [];
        const insert = async (r) => { rows.push(...r); return {}; };
        assert.equal(await reportEvent(ev, {}, { insert }), 'sent');
        assert.equal(rows[0].event, ev);
    }
});

test('PAY-04: reportSessionStart는 entry_source를 meta.entry_src로 탑재', async () => {
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    // 캡처값 없음 — meta 생략
    reportSessionStart({ insert });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event, 'session_start');
    assert.equal(rows[0].meta.entry_src, undefined);
    // 캡처값 있음 — entry_src 첨부
    _resetUsageTelemetryForTest();
    rows.length = 0;
    global.localStorage.setItem('entry_source', 'cafe');
    reportSessionStart({ insert });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(rows[0].meta.entry_src, 'cafe');
});

// ── install_id (UX-MET-07) ─────────────────────────────────

test('buildEventPayload: meta.install_id 자동 첨부 — 익명 기기 식별', () => {
    const p = buildEventPayload('session_start', {});
    assert.ok(p.meta.install_id); // install_id 존재
    assert.equal(p.meta.install_id, getInstallId()); // DEVICE_ID 재사용
    // 호출자 meta와 병존 — install_id는 호출자가 덮어쓰지 않음(기본값 우선 순위: 호출자 meta가 뒤)
    const p2 = buildEventPayload('quiz_start', { count: 5 });
    assert.equal(p2.meta.count, 5);
    assert.ok(p2.meta.install_id);
});

// ── 오프라인 큐 (UX-MET-08) ────────────────────────────────

test('reportEvent: 오프라인 시 queued — 큐에 보관, 전송 안 함', async () => {
    const rows = [];
    const insert = async (r) => { rows.push(...r); return {}; };
    const res = await reportEvent('quiz_start', {}, { insert, online: false });
    assert.equal(res, 'queued');
    assert.equal(rows.length, 0); // 전송 안 함
    const queue = JSON.parse(safeGetItem(STORAGE_KEYS.TELEMETRY_QUEUE) || '[]');
    assert.equal(queue.length, 1);
    assert.equal(queue[0].event, 'quiz_start');
});

test('flushTelemetryQueue: 큐 재전송 — 성공분 제거, 실패분 재큐잉', async () => {
    // 오프라인으로 2건 적재
    const failInsert = async () => ({ error: new Error('offline') });
    await reportEvent('quiz_start', {}, { insert: failInsert, online: false });
    await reportEvent('daily_start', {}, { insert: failInsert, online: false });
    // 온라인 복귀 — 성공 insert로 플러시
    const sent = [];
    const okInsert = async (r) => { sent.push(...r); return {}; };
    assert.equal(await flushTelemetryQueue({ insert: okInsert }), 'sent');
    assert.equal(sent.length, 2); // 둘 다 재전송
    const remain = JSON.parse(safeGetItem(STORAGE_KEYS.TELEMETRY_QUEUE) || '[]');
    assert.equal(remain.length, 0); // 큐 비워짐
    // 빈 큐는 'empty'
    assert.equal(await flushTelemetryQueue({ insert: okInsert }), 'empty');
});

test('flushTelemetryQueue: 실패분은 큐에 남김 (부분 성공)', async () => {
    const failInsert = async () => ({ error: new Error('x') });
    await reportEvent('quiz_start', {}, { insert: failInsert, online: false });
    await reportEvent('quiz_complete', {}, { insert: failInsert, online: false });
    // 첫 건만 성공하는 insert
    let n = 0;
    const partialInsert = async () => (++n === 1 ? {} : { error: new Error('db') });
    assert.equal(await flushTelemetryQueue({ insert: partialInsert }), 'sent');
    const remain = JSON.parse(safeGetItem(STORAGE_KEYS.TELEMETRY_QUEUE) || '[]');
    assert.equal(remain.length, 1); // 실패분 1건만 남음
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
