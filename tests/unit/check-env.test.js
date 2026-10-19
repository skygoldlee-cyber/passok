// tests/unit/check-env.test.js
// @spec none
// check_env.js 순수 판정 로직 — JWT 만료·스키마 대조·인라인 주석 오염 탐지.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isJwtLike, jwtExpiry, parseExample, analyze } = require('../../tools/check/check_env.js');

const NOW = 1_800_000_000; // 2027-01-15 부근

/** 최소 형태의 JWT 픽스처 — 서명은 검증하지 않으므로 더미 */
function jwt(exp) {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ sub: 'x', ...(exp ? { exp } : {}) })}.sig`;
}
const ent = (key, value, raw = value, line = 1) => ({ key, value, raw, line });

test('isJwtLike: eyJ 3세그먼트만 JWT로 인식', () => {
    assert.ok(isJwtLike(jwt(NOW)));
    assert.ok(!isJwtLike('gho_abcdef0123'));
    assert.ok(!isJwtLike('supabase-key-abc'));
    assert.ok(!isJwtLike(''));
});

test('jwtExpiry: exp 클레임 해석, 부재·손상은 null', () => {
    assert.equal(jwtExpiry(jwt(NOW)), NOW);
    assert.equal(jwtExpiry(jwt(null)), null);
    assert.equal(jwtExpiry('eyJh.sig.sig'), null);
});

test('parseExample: 선언 키와 @required 마커 추출', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'passory-env-'));
    const p = path.join(dir, '.env.example');
    fs.writeFileSync(p, [
        '# 주석 행은 무시',
        'FOO=            # 선택 키',
        'BAR=            # @required 필수 키',
        '  # 들여쓴 주석',
        'BAZ=',
    ].join('\n'));
    const declared = parseExample(p);
    assert.equal(declared.size, 3);
    assert.equal(declared.get('FOO').required, false);
    assert.equal(declared.get('BAR').required, true);
    assert.equal(parseExample(path.join(dir, 'missing')).size, 0);
});

test('analyze: 만료 JWT는 실패, 유효 JWT는 통과', () => {
    const declared = new Map([['TOK', { required: false, line: 1 }]]);
    const expired = analyze([ent('TOK', jwt(NOW - 100))], declared, NOW);
    assert.equal(expired.fail.length, 1);
    assert.match(expired.fail[0], /만료된 JWT/);
    const fresh = analyze([ent('TOK', jwt(NOW + 100))], declared, NOW);
    assert.equal(fresh.fail.length, 0);
});

test('analyze: 미선언 키 경고 · 빈 값 정보 · @required 누락 실패', () => {
    const declared = new Map([
        ['KNOWN', { required: false, line: 1 }],
        ['NEED', { required: true, line: 2 }],
    ]);
    const { fail, warn, info } = analyze(
        [ent('STRAY', 'x', 'x', 5), ent('KNOWN', '', '', 6), ent('NEED', '', '', 7)],
        declared, NOW);
    assert.ok(warn.some((m) => m.includes('STRAY')));
    assert.ok(info.some((m) => m.includes('KNOWN')));
    assert.ok(fail.some((m) => m.includes('NEED')));
});

test('analyze: 미인용 # 은 값 오염 경고, 인용이면 통과', () => {
    const declared = new Map([['K', { required: false, line: 1 }]]);
    const dirty = analyze([ent('K', 'abc#tail', 'abc#tail')], declared, NOW);
    assert.ok(dirty.warn.some((m) => m.includes("'#'")));
    const quoted = analyze([ent('K', 'abc#tail', '"abc#tail"')], declared, NOW);
    assert.ok(!quoted.warn.some((m) => m.includes("'#'")));
});

test('analyze: 중복 선언 경고 — env.js는 첫 값만 적용', () => {
    const declared = new Map([['K', { required: false, line: 1 }]]);
    const { warn } = analyze([ent('K', 'a', 'a', 1), ent('K', 'b', 'b', 2)], declared, NOW);
    assert.ok(warn.some((m) => m.includes('중복')));
});
