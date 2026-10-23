// tests/unit/pro-report.test.js
// @spec AD-09 (Pro 현황 리포트)
// tools/check/pro_report.js — summarize() 순수 집계 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarize, channelOf } = require('../../../tools/check/pro_report.js');

const NOW = new Date('2026-10-23T00:00:00Z');
const iso = (offsetDays) => new Date(NOW.getTime() + offsetDays * 86_400_000).toISOString();

test('channelOf: 프리픽스 추출 — 대문자 정규화·하이픈 없으면 기타', () => {
    assert.equal(channelOf('TEST-7P6Z-RX5F'), 'TEST');
    assert.equal(channelOf('pro1-AAAA-BBBB'), 'PRO1');
    assert.equal(channelOf('NOPREFIX'), '(기타)');
});

test('summarize: 코드 채널·티어별 발급/사용 집계', () => {
    const s = summarize({
        codes: [
            { code: 'TEST-AAAA-1111', valid_days: 30, redeemed_by: 'u1' },
            { code: 'TEST-BBBB-2222', valid_days: 30, redeemed_by: null },
            { code: 'PRO1-CCCC-3333', valid_days: 90, redeemed_by: 'u2' },
        ],
        profiles: [], users: [], now: NOW,
    });
    assert.equal(s.codes.total, 3);
    assert.equal(s.codes.used, 2);
    assert.equal(s.codes.unused, 1);
    assert.deepEqual(s.codes.byChannel['TEST'], { issued: 2, used: 1 });
    assert.deepEqual(s.codes.byChannel['PRO1'], { issued: 1, used: 1 });
    assert.deepEqual(s.codes.byDays['30'], { issued: 2, used: 1 });
    assert.deepEqual(s.codes.byDays['90'], { issued: 1, used: 1 });
});

test('summarize: 만료 버킷 — 활성·임박·만료·무기한·free 분류', () => {
    const s = summarize({
        codes: [],
        profiles: [
            { plan: 'pro', pro_expires_at: iso(30) },   // 활성
            { plan: 'pro', pro_expires_at: iso(5) },    // D-7 임박
            { plan: 'pro', pro_expires_at: iso(-2) },   // 만료 (stale plan 엣지)
            { plan: 'pro', pro_expires_at: null },      // 무기한 수동 부여
            { plan: 'free', pro_expires_at: iso(-10) }, // 만료 후 free 복귀 — 이탈 코호트
            { plan: 'free', pro_expires_at: null },     // 순수 free
        ],
        users: [], now: NOW,
    });
    assert.deepEqual(s.expiry, { lifetime: 1, expiring7: 1, active: 1, expired: 2, free: 1 });
});

test('summarize: 가입 수단 분포 — providers 복수 계정도 각각 카운트', () => {
    const s = summarize({
        codes: [], profiles: [],
        users: [
            { app_metadata: { providers: ['email'] } },
            { app_metadata: { providers: ['google'] } },
            { app_metadata: { providers: ['email', 'google'] } },
            {},
        ],
        now: NOW,
    });
    assert.equal(s.providers.email, 2);
    assert.equal(s.providers.google, 2);
    assert.equal(s.providers['(unknown)'], 1);
    assert.equal(s.totalUsers, 4);
});

test('summarize: 빈 입력 — 0 집계로 안전', () => {
    const s = summarize({ codes: [], profiles: [], users: [], now: NOW });
    assert.equal(s.codes.total, 0);
    assert.equal(s.totalUsers, 0);
    assert.deepEqual(s.expiry, { lifetime: 0, expiring7: 0, active: 0, expired: 0, free: 0 });
});
