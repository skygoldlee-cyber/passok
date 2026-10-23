// tests/unit/app/pro-expiry.test.js
// @spec PAY-07
// pro-expiry.js proExpiryStatus + pro-redeem.js applyPlanToLocal(tombstone) 검증 —
// 만료 임박(D-7)·만료 후 분기, 시험 전 만료 경고, 만료자↔회수자 tombstone 정책.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStorageBackend, setStorageBackend, getStorageBackend, setItem, removeItem } from '../../../src/storage.js';
import { proExpiryStatus } from '../../../src/pro-expiry.js';
import { applyPlanToLocal } from '../../../src/pro-redeem.js';

function createMockStorage() {
    const store = {};
    return {
        getItem(key) { return key in store ? store[key] : null; },
        setItem(key, value) { store[key] = String(value); },
        removeItem(key) { delete store[key]; },
        get length() { return Object.keys(store).length; },
        key(i) { return Object.keys(store)[i] ?? null; },
        clear() { for (const k of Object.keys(store)) delete store[k]; },
    };
}

let mockStorage;
let originalLocalStorage;
let originalBackend;

beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', { value: mockStorage, configurable: true, writable: true });
    originalBackend = getStorageBackend();
    setStorageBackend(createLocalStorageBackend());
    mockStorage.clear();
});

afterEach(() => {
    setStorageBackend(originalBackend);
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
});

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();

test('proExpiryStatus: 만료일 키가 없으면 null (무기한·미구매)', () => {
    assert.equal(proExpiryStatus(), null);
    setItem('pro_entitled', '1');
    assert.equal(proExpiryStatus(), null); // 무기한 부여는 임박 개념 없음
});

test('proExpiryStatus: 유효 기간권도 D-7 이내가 아니면 null', () => {
    const now = Date.now();
    setItem('pro_entitled', '1');
    setItem('pro_expires_at', iso(now + 30 * DAY));
    assert.equal(proExpiryStatus(now), null);
});

test('proExpiryStatus: 임박(D-7 이내) → expiring + 잔여 일수', () => {
    const now = Date.now();
    setItem('pro_entitled', '1');
    setItem('pro_expires_at', iso(now + 5 * DAY));
    const st = proExpiryStatus(now);
    assert.equal(st.state, 'expiring');
    assert.equal(st.daysLeft, 5);
    assert.equal(st.beforeExam, false);   // 시험일 미설정
});

test('proExpiryStatus: 만료 경과 → expired (entitled 플래그가 아직 남아 있어도)', () => {
    const now = Date.now();
    setItem('pro_entitled', '1');                       // 동기 전 열람 중 만료
    setItem('pro_expires_at', iso(now - 1 * DAY));
    const st = proExpiryStatus(now);
    assert.equal(st.state, 'expired');
    assert.ok(st.daysLeft <= 0);
});

test('proExpiryStatus: entitled 제거 후 tombstone만 남아도 expired (만료자 안내)', () => {
    const now = Date.now();
    setItem('pro_expires_at', iso(now - 2 * DAY));      // tombstone — entitled 없음
    const st = proExpiryStatus(now);
    assert.equal(st.state, 'expired');
});

test('proExpiryStatus: 미래 만료일인데 entitled 없으면 null (회수자는 안내하지 않음)', () => {
    const now = Date.now();
    setItem('pro_expires_at', iso(now + 3 * DAY));
    assert.equal(proExpiryStatus(now), null);
});

test('proExpiryStatus: 만료일 < 시험일이면 beforeExam 경고', () => {
    const now = Date.now();
    setItem('pro_entitled', '1');
    setItem('pro_expires_at', iso(now + 5 * DAY));
    setItem('exam_date', new Date(now + 20 * DAY).toISOString().slice(0, 10));
    const st = proExpiryStatus(now);
    assert.equal(st.beforeExam, true);
    removeItem('exam_date');
    setItem('exam_date', new Date(now + 3 * DAY).toISOString().slice(0, 10));
    assert.equal(proExpiryStatus(now).beforeExam, false); // 만료일이 시험일 이후
});

test('applyPlanToLocal: 유효 pro → entitled + 만료일 반영 (PAY-03)', () => {
    const future = iso(Date.now() + 10 * DAY);
    assert.equal(applyPlanToLocal('pro', future), 'pro');
    assert.equal(mockStorage.getItem('pro_entitled'), '1');
    assert.equal(mockStorage.getItem('pro_expires_at'), future);
});

test('applyPlanToLocal: 무기한 pro → entitled만, 만료일 제거', () => {
    setItem('pro_expires_at', iso(Date.now() + DAY));
    assert.equal(applyPlanToLocal('pro', null), 'pro');
    assert.equal(mockStorage.getItem('pro_entitled'), '1');
    assert.equal(mockStorage.getItem('pro_expires_at'), null);
});

test('applyPlanToLocal: 만료 경과 pro → entitled 해제 + 만료일 tombstone 유지 (PAY-07)', () => {
    const past = iso(Date.now() - DAY);
    setItem('pro_entitled', '1');
    assert.equal(applyPlanToLocal('pro', past), 'free');
    assert.equal(mockStorage.getItem('pro_entitled'), null);
    assert.equal(mockStorage.getItem('pro_expires_at'), past); // tombstone — 만료자 분기용
});

test('applyPlanToLocal: 회수(free) → entitled·만료일 모두 제거', () => {
    setItem('pro_entitled', '1');
    setItem('pro_expires_at', iso(Date.now() + DAY));
    assert.equal(applyPlanToLocal('free', null), 'free');
    assert.equal(mockStorage.getItem('pro_entitled'), null);
    assert.equal(mockStorage.getItem('pro_expires_at'), null);
});
