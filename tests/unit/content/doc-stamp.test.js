// tests/unit/content/doc-stamp.test.js
// @spec CO-13 — 문서 추적 번호 계약: `유형-YYYYMMDD-해시6`, 내용 결정적 (cosmetic fpDocStamp와 동일 체계)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docStamp } from '../../../src/content/doc-stamp.js';

test('형식 — 접두어-날짜8자리-해시6자리', () => {
    const no = docStamp('LOG', '요양일지 본문');
    assert.match(no, /^LOG-\d{8}-[0-9a-f]{6}$/);
});

test('동일 시드 → 동일 번호 — 중복 발행 자동 탐지', () => {
    assert.equal(docStamp('LOG', '같은 내용'), docStamp('LOG', '같은 내용'));
});

test('내용 변경 → 번호 변경 — 변조·혼합 대조', () => {
    assert.notEqual(docStamp('LOG', '내용A'), docStamp('LOG', '내용B'));
});

test('유형별 접두어 분리 + 대문자 정규화', () => {
    assert.match(docStamp('inc', 'x'), /^INC-\d{8}-[0-9a-f]{6}$/);
    assert.notEqual(docStamp('LOG', 'x'), docStamp('INC', 'x'));
});

test('빈 시드·빈 접두어도 발급 — 기본 DOC', () => {
    assert.match(docStamp('', ''), /^DOC-\d{8}-[0-9a-f]{6}$/);
});
