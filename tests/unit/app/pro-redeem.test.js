// tests/unit/app/pro-redeem.test.js
// @spec PAY-01, PAY-05, PAY-06
// pro-redeem.js normalizeCode + isEntitledToPro + issue_pro_code.js 코드 생성·티어 규약 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { normalizeCode, isEntitledToPro } from '../../../src/pro-redeem.js';

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
