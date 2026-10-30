// @spec DA-16
// pk1 콘텐츠 패킹 라운드트립 — 번들 인코딩이 유실 없이 복원되는지 고정
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { encodeText, decodeText } = require('../../tools/lib/content_pack.js');

test('DA-16: pk1 인코딩이 평문을 감추고 완전 복원한다', () => {
  const src = '# 📕 1과목 화장품법의 이해\n\n> 화장품법 제3조에 따라…';
  const enc = encodeText(src);
  assert.ok(enc.startsWith('pk1:'), 'pk1 접두');
  assert.ok(!enc.includes('화장품법'), '평문 비노출');
  assert.equal(decodeText(enc), src, '라운드트립 복원');
});

test('DA-16: 평문 값은 디코더가 그대로 통과시킨다', () => {
  assert.equal(decodeText('plain text'), 'plain text');
  assert.equal(decodeText(12345), 12345);
});
