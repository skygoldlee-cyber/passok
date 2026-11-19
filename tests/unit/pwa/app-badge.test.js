// 설치형 PWA 아이콘 업데이트 배지 — applyAppBadge 코어 (P-15)
// @spec P-15
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAppBadge } from '../../../src/pwa/app-badge.js';

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
