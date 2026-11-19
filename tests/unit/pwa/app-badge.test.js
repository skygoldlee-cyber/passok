// 설치형 PWA 아이콘 업데이트 배지 — applyAppBadge 코어 (P-15)
// @spec P-15
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAppBadge, shouldNotifyUpdate, notifyUpdateAvailable } from '../../../src/pwa/app-badge.js';

test('미적용 업데이트 — standalone + API 존재 시 setAppBadge(1) 부착', () => {
    const calls = [];
    const nav = {
        setAppBadge: (n) => calls.push(['set', n]),
        clearAppBadge: () => calls.push(['clear']),
    };
    assert.equal(applyAppBadge(true, nav, true), 'set');
    assert.deepEqual(calls, [['set', 1]]);
});

test('버전 일치·적용 완료 — clearAppBadge로 배지 해제', () => {
    const calls = [];
    const nav = {
        setAppBadge: (n) => calls.push(['set', n]),
        clearAppBadge: () => calls.push(['clear']),
    };
    assert.equal(applyAppBadge(false, nav, true), 'clear');
    assert.deepEqual(calls, [['clear']]);
});

test('미설치(브라우저 탭) — standalone=false면 호출 자체 차단 (UX-PWA-02)', () => {
    const calls = [];
    const nav = { setAppBadge: (n) => calls.push(n), clearAppBadge: () => calls.push('clear') };
    assert.equal(applyAppBadge(true, nav, false), 'skip');
    assert.equal(applyAppBadge(false, nav, false), 'skip');
    assert.deepEqual(calls, []);
});

test('API 미지원(Android·구형 브라우저)·nav 부재 — 무해 skip', () => {
    assert.equal(applyAppBadge(true, {}, true), 'skip');
    assert.equal(applyAppBadge(false, {}, true), 'skip');
    assert.equal(applyAppBadge(true, null, true), 'skip');
});

test('setAppBadge가 예외를 던져도 무해 skip — 배지 실패가 앱을 깨지 않음', () => {
    const nav = { setAppBadge: () => { throw new Error('denied'); }, clearAppBadge: () => { throw new Error('denied'); } };
    assert.equal(applyAppBadge(true, nav, true), 'skip');
    assert.equal(applyAppBadge(false, nav, true), 'skip');
});

/* ── P-17: Android 대체 표면 — 업데이트 알림 판정 ── */

const base = { standalone: true, badgeOk: false, permission: 'granted', notifiedVer: 'v1', version: 'v2' };

test('Android — 배지 불가 + 권한 부여 + 새 버전이면 알림 발송 대상', () => {
    assert.equal(shouldNotifyUpdate(base), true);
});

test('배지가 붙은 환경·미설치·권한 미부여·동일 버전은 알림 억제', () => {
    assert.equal(shouldNotifyUpdate({ ...base, badgeOk: true }), false);   // 배지로 충분
    assert.equal(shouldNotifyUpdate({ ...base, standalone: false }), false); // 브라우저 탭
    assert.equal(shouldNotifyUpdate({ ...base, permission: 'default' }), false); // 무단 요청 금지
    assert.equal(shouldNotifyUpdate({ ...base, permission: 'denied' }), false);
    assert.equal(shouldNotifyUpdate({ ...base, notifiedVer: 'v2' }), false); // 버전당 1회
    assert.equal(shouldNotifyUpdate({ ...base, version: '' }), false);
});

test('알림 발송 — showNotification 주입형, 실패 시 false 무해', async () => {
    const calls = [];
    const reg = { showNotification: async (t, o) => { calls.push([t, o.tag]); } };
    assert.equal(await notifyUpdateAvailable('v2', reg), true);
    assert.deepEqual(calls, [['PassOK 업데이트', 'passok-update']]);
    assert.equal(await notifyUpdateAvailable('v2', null), false);
    assert.equal(await notifyUpdateAvailable('v2', {}), false);
    const bad = { showNotification: async () => { throw new Error('x'); } };
    assert.equal(await notifyUpdateAvailable('v2', bad), false);
});
