// @spec DA-16
// data-loader 폴백 번들 pk1 디코드 캐시 — 재호출도 디코드 맵 반환 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pkDecodeFiles } from '../../../src/content/unpack.js';

const PK_KEY = 'passok-pk1-5f3a';
function enc(s) {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ^ PK_KEY.charCodeAt(i % PK_KEY.length));
    return 'pk1:' + Buffer.from(bin, 'binary').toString('base64');
}

test('pkDecodeFiles — pk1 값 디코드, 평문 통과', () => {
    const d = pkDecodeFiles({ a: enc('# 한글 본문'), b: 'plain' });
    assert.equal(d.a, '# 한글 본문');
    assert.equal(d.b, 'plain');
});

test('덮어캐시된 디코드 맵 재디코드 — 멱등 (pk1 미노출 보장)', () => {
    const once = pkDecodeFiles({ a: enc('## 이야기 본문') });
    const twice = pkDecodeFiles(once);
    assert.equal(twice.a, '## 이야기 본문');
    assert.ok(!twice.a.startsWith('pk1:'));
});
