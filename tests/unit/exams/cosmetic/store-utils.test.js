// tests/unit/store-utils.test.js
// @spec FO-16~18
// src/exams/cosmetic/store-utils.js — 스토어 공통 헬퍼 테스트.
// sanitizeCustomerFields: customer 정본·포뮬러 인라인 스냅샷이 공유하는
// 고객 공통 필드 정제 계약을 고정한다 (이중 정의 통합의 회귀 방지).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCustomerFields } from '../../../../src/exams/cosmetic/store-utils.js';
import { CUSTOMER_OPTIONS } from '../../../../src/exams/cosmetic/formula-store.js';

const BASE = {
  name: '  홍길동  ',
  age: '34',
  gender: '여성',
  skinType: '건성',
  concerns: ['건조', '잘못된값'],
  allergies: ['니켈'],
  pregnancy: '임신 중',
  products: '레티놀 세럼 사용',
};

test('sanitizeCustomerFields — 공통 필드 정제', () => {
  const c = sanitizeCustomerFields(BASE, CUSTOMER_OPTIONS);
  assert.equal(c.name, '홍길동'); // trim
  assert.equal(c.age, 34); // 문자열 → 숫자
  assert.equal(c.gender, '여성');
  assert.equal(c.skinType, '건성');
  assert.deepEqual(c.concerns, ['건조']); // 옵션 외 제거
  assert.deepEqual(c.allergies, ['니켈']);
  assert.equal(c.pregnancy, '임신 중');
  assert.equal(c.products, '레티놀 세럼 사용');
});

test('sanitizeCustomerFields — 열거형 외 값·비배열 목록은 빈 값으로', () => {
  const c = sanitizeCustomerFields({
    ...BASE,
    gender: '기타',
    skinType: '지성피부',
    concerns: '건조',
    allergies: null,
    pregnancy: '해당없음',
  }, CUSTOMER_OPTIONS);
  assert.equal(c.gender, '');
  assert.equal(c.skinType, '');
  assert.deepEqual(c.concerns, []);
  assert.deepEqual(c.allergies, []);
  assert.equal(c.pregnancy, '');
});

test('sanitizeCustomerFields — 목록 항목 trim·개수/길이 상한', () => {
  const long = '아'.repeat(100);
  const c = sanitizeCustomerFields({
    ...BASE,
    concerns: ['  건조  ', '각질'],
    allergies: Array.from({ length: 20 }, (_, i) => `알레르기${i}`).concat([long]),
  }, CUSTOMER_OPTIONS);
  assert.deepEqual(c.concerns, ['건조', '각질']); // trim 후 옵션 매칭
  assert.equal(c.allergies.length, 15); // MAX_ALLERGIES
  assert.ok(c.allergies.every(a => a.length <= 60)); // MAX_ALLERGY_LEN
});

test('sanitizeCustomerFields — 스토어 전용 필드는 포함하지 않는다 (호출처 책임)', () => {
  const c = sanitizeCustomerFields({
    ...BASE,
    scalpType: '지성',
    formulation: '크림·밤',
    purpose: '보습',
    consultLog: [{ date: '2026-01-01', text: 'x' }],
    notes: '메모',
  }, CUSTOMER_OPTIONS);
  assert.equal('scalpType' in c, false);
  assert.equal('formulation' in c, false);
  assert.equal('purpose' in c, false);
  assert.equal('consultLog' in c, false);
  assert.equal('notes' in c, false);
});
