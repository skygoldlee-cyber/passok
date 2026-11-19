// 공유 받기 — share_target 쿼리 파라미터 파싱 (P-18)
// @spec P-18
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSharePayload } from '../../../src/pwa/share-target.js';

test('text 우선, 없으면 title, 둘 다 없고 url만 있으면 url', () => {
    assert.equal(parseSharePayload('?text=hello&title=ignored'), 'hello');
    assert.equal(parseSharePayload('?title=제목만'), '제목만');
    assert.equal(parseSharePayload('?url=https%3A%2F%2Fexample.com'), 'https://example.com');
});

test('공유 파라미터 부재·빈 값은 null', () => {
    assert.equal(parseSharePayload(''), null);
    assert.equal(parseSharePayload('?src=ad'), null);
    assert.equal(parseSharePayload('?text=&title='), null);
});

test('앱 파라미터와 공존 — 공유 텍스트만 추출', () => {
    assert.equal(parseSharePayload('?src=qr&text=공유본'), '공유본');
});
