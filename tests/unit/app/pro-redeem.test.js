// tests/unit/app/pro-redeem.test.js
// @spec PAY-01, PAY-05
// pro-redeem.js normalizeCode + issue_pro_code.js 코드 생성 규약 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { normalizeCode } from '../../../src/pro-redeem.js';

const require = createRequire(import.meta.url);
const { normalizeChannel, genCode, CODE_BODY } = require('../../../tools/check/issue_pro_code.js');

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
