// tests/unit/app/telemetry-consent.test.js
// @spec UX-MET-06, UX-MET-07
// src/telemetry-consent.js — opt-out 플래그·고지 마커·익명 설치 ID
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    isTelemetryAllowed, setTelemetryAllowed,
    isTelemetryNoticeShown, markTelemetryNoticeShown, getInstallId,
} from '../../../src/telemetry-consent.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { safeGetItem, safeSetItem } from '../../../src/state.js';

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
});
afterEach(() => {
    if (_orig !== undefined) Object.defineProperty(global, 'localStorage', { value: _orig, writable: true, configurable: true });
    else delete global.localStorage;
});

// ── opt-out 플래그 (UX-MET-06) ─────────────────────────────

test('isTelemetryAllowed: 기본은 허용, opt-out 저장 후 거부', () => {
    assert.equal(isTelemetryAllowed(), true);
    setTelemetryAllowed(false);
    assert.equal(isTelemetryAllowed(), false);
    setTelemetryAllowed(true);
    assert.equal(isTelemetryAllowed(), true);
});

test('setTelemetryAllowed: 거부 시 "1"·허용 시 "0" 저장', () => {
    setTelemetryAllowed(false);
    assert.equal(safeGetItem(STORAGE_KEYS.TELEMETRY_OPT_OUT), '1');
    setTelemetryAllowed(true);
    assert.equal(safeGetItem(STORAGE_KEYS.TELEMETRY_OPT_OUT), '0');
});

// ── 최초 고지 마커 (UX-MET-06) ─────────────────────────────

test('isTelemetryNoticeShown/markTelemetryNoticeShown: 미표시 → 표시 전이', () => {
    assert.equal(isTelemetryNoticeShown(), false);
    markTelemetryNoticeShown();
    assert.equal(isTelemetryNoticeShown(), true);
});

// ── 익명 설치 ID (UX-MET-07) ───────────────────────────────

test('getInstallId: 없으면 생성·이후 동일 값 재사용 (DEVICE_ID 공유)', () => {
    const a = getInstallId();
    assert.ok(a && a.length > 0);
    assert.equal(getInstallId(), a); // 동일 값 재사용
    assert.equal(safeGetItem(STORAGE_KEYS.DEVICE_ID), a); // DEVICE_ID 키 공유
});

test('getInstallId: 기존 DEVICE_ID가 있으면 그대로 반환', () => {
    // sync.js·usage-stats가 먼저 만든 ID를 그대로 사용해야 한다
    safeSetItem(STORAGE_KEYS.DEVICE_ID, 'dev-existing');
    assert.equal(getInstallId(), 'dev-existing');
});
