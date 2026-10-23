// tests/unit/app/pro-redeem.test.js
// @spec PAY-01, PAY-05, PAY-06, PAY-08
// pro-redeem.js normalizeCode + isEntitledToPro + callRedeemRpc + issue_pro_code.js 코드 생성·티어 규약 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { normalizeCode, isEntitledToPro, callRedeemRpc } from '../../../src/pro-redeem.js';
import { setItem, removeItem } from '../../../src/storage.js';

const require = createRequire(import.meta.url);
const { normalizeChannel, genCode, parseDays, TIER_LABELS, CODE_BODY } = require('../../../tools/check/issue_pro_code.js');

test('normalizeCode: 공백·소문자 입력을 대문자 무공백으로 정규화', () => {
    assert.equal(normalizeCode(' cafe-ab12-cd34 '), 'CAFE-AB12-CD34');
    assert.equal(normalizeCode('cafe ab12 cd34'), 'CAFEAB12CD34');
    assert.equal(normalizeCode(''), '');
    assert.equal(normalizeCode(null), '');
    assert.equal(normalizeCode(undefined), '');
});

test('normalizeChannel: 영숫자 외 제거·대문자화, 빈 값은 MISC', () => {
    assert.equal(normalizeChannel('cafe'), 'CAFE');
    assert.equal(normalizeChannel('Open-Chat!'), 'OPENCHAT');
    assert.equal(normalizeChannel(''), 'MISC');
    assert.equal(normalizeChannel(null), 'MISC');
    assert.equal(normalizeChannel('!!'), 'MISC');
});

test('genCode: <CHANNEL>-XXXX-XXXX 형식 + 혼동 문자 제외', () => {
    const re = /^CAFE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    for (let i = 0; i < 50; i++) {
        const code = genCode('CAFE');
        assert.match(code, re);
        // 혼동 문자(0·O·1·I·L)는 CODE_BODY에 없음
        for (const ch of code) {
            if (ch === '-') continue;
            assert.ok(CODE_BODY.includes(ch), `unexpected char ${ch}`);
            assert.ok(!'01ILO'.includes(ch), `confusable char ${ch}`);
        }
    }
    // 충돌 확률 확인용 — 100건 생성 시 모두 고유해야 함
    const set = new Set(Array.from({ length: 100 }, () => genCode('TEST')));
    assert.equal(set.size, 100);
});

test('isEntitledToPro: plan·만료일 조합 판정 (PAY-06)', () => {
    const now = Date.now();
    const future = new Date(now + 86400000).toISOString();
    const past = new Date(now - 86400000).toISOString();
    assert.equal(isEntitledToPro('pro', null, now), true);          // 무기한 관리자 부여
    assert.equal(isEntitledToPro('pro', future, now), true);       // 유효 기간권
    assert.equal(isEntitledToPro('pro', past, now), false);        // 만료 경과
    assert.equal(isEntitledToPro('free', future, now), false);     // free는 만료일 무관
    assert.equal(isEntitledToPro('free', null, now), false);
});

test('callRedeemRpc: 활성 시험일을 p_exam_date로 전달 (PAY-08)', async () => {
    // localStorage 목 — 기본 백엔드 메서드는 호출 시점에 global.localStorage를 참조
    const store = {};
    const mock = {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] ?? null,
    };
    const origLS = global.localStorage;
    Object.defineProperty(global, 'localStorage', { value: mock, configurable: true, writable: true });
    try {
        setItem('exam_date', '2026-11-30');
        const calls = [];
        const sb = { rpc: (fn, args) => { calls.push(args); return Promise.resolve({ data: true, error: null }); } };
        const res = await callRedeemRpc(sb, 'TEST-AAAA-BBBB');
        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0], { p_code: 'TEST-AAAA-BBBB', p_exam_date: '2026-11-30' });
        assert.equal(res.data, true);

        // 시험일 미설정이면 p_exam_date=null — 서버는 기존 규칙만 적용
        removeItem('exam_date');
        calls.length = 0;
        await callRedeemRpc(sb, 'TEST-AAAA-BBBB');
        assert.equal(calls[0].p_exam_date, null);
    } finally {
        Object.defineProperty(global, 'localStorage', { value: origLS, configurable: true, writable: true });
    }
});

test('callRedeemRpc: 구 서명 스키마 오류 시 p_code 단독 호출로 폴백 (PAY-08)', async () => {
    const calls = [];
    const sb = { rpc: (fn, args) => {
        calls.push(args);
        return Promise.resolve(calls.length === 1
            ? { data: null, error: { message: 'function not found' } }
            : { data: true, error: null });
    } };
    const res = await callRedeemRpc(sb, 'TEST-AAAA-BBBB');
    assert.equal(calls.length, 2);
    assert.equal('p_exam_date' in calls[0], true);   // 신 서명 시도
    assert.deepEqual(calls[1], { p_code: 'TEST-AAAA-BBBB' }); // 구 서명 폴백
    assert.equal(res.data, true);
});

test('parseDays: 기본 90일, 1~365 범위 검증 + 티어 라벨 (PAY-06)', () => {
    assert.equal(parseDays(null), 90);
    assert.equal(parseDays('30'), 30);
    assert.equal(parseDays('365'), 365);
    assert.throws(() => parseDays('0'), /1~365/);
    assert.throws(() => parseDays('366'), /1~365/);
    assert.throws(() => parseDays('abc'), /1~365/);
    assert.equal(TIER_LABELS[30], '스프린트');
    assert.equal(TIER_LABELS[60], '스탠다드');
    assert.equal(TIER_LABELS[90], '풀코스');
});
