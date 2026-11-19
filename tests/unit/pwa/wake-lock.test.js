// 화면 꺼짐 방지 — Wake Lock 지원 감지·sentinel 획득/해제 (P-16)
// @spec P-16
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wakeLockSupported, acquireWakeLock, releaseWakeLock } from '../../../src/pwa/wake-lock.js';

function fakeNav({ ok = true } = {}) {
    const calls = [];
    return {
        calls,
        wakeLock: {
            request: async (type) => {
                calls.push(type);
                if (!ok) throw new Error('denied');
                return { released: false, addEventListener: () => {}, release: async () => {} };
            },
        },
    };
}

test('지원 감지 — wakeLock.request 존재 여부', () => {
    assert.equal(wakeLockSupported(fakeNav()), true);
    assert.equal(wakeLockSupported({}), false);
    assert.equal(wakeLockSupported({ wakeLock: {} }), false);
    assert.equal(wakeLockSupported(null), false);
});

test('sentinel 획득 — screen 타입 요청, 실패 시 false 무해', async () => {
    const nav = fakeNav();
    assert.equal(await acquireWakeLock(nav), true);
    assert.deepEqual(nav.calls, ['screen']);
    assert.equal(await acquireWakeLock(fakeNav({ ok: false })), false);
    assert.equal(await acquireWakeLock({}), false); // 미지원
});

test('해제 — 미획득 상태에서도 무해', async () => {
    await releaseWakeLock(); // _sentinel=null — throw 없이 종료
});
