// @spec DA-16,DA-17
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

import { pkDecode } from '../../src/content/unpack.js';

test('DA-16: 브라우저 pkDecode가 Node 인코딩과 호환된다 (번들 소비 경로)', () => {
  const src = '### Q12. 화장품법 제3조에 따른 …\n- 선지①\n- 선지②';
  assert.equal(pkDecode(encodeText(src)), src);
  assert.equal(pkDecode('plain'), 'plain');
});

const { embed, extract, verify } = require('../../tools/lib/watermark.js');

test('DA-17: 워터마크가 인코딩 전 삽입되고 디코드 후 출처 감정된다', () => {
  const marked = embed('본문 텍스트입니다.', 'content/x.md');
  assert.ok(marked.includes('<!--pk:w'), '지문 주석 삽입');
  const wm = extract(decodeText(encodeText(marked)));
  assert.ok(wm.hash && wm.contentVer, '지문+콘텐츠 버전 추출');
  assert.ok(verify(marked, 'content/x.md'), '경로·본문 검증');
});
