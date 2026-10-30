// tests/unit/gen-gate.test.js — 런타임 AI 생성물 검증 게이트
// @spec AI-30,AI-37
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maxPoolOverlap, validateGeneratedItem, filterGeneratedItems } from '../../../src/ai/gen-gate.js';

const GOOD = {
    question: '화장품 제조업 등록 신청은 누가 해야 하는가?',
    options: ['제조업자', '판매업자', '소비자', '수입자'],
    answer: '제조업자',
    citation: '화장품법 제3조 제1항',
};

test('AI-37: 정상 생성물 통과', () => {
    const r = validateGeneratedItem(GOOD, { poolTexts: ['전혀 다른 문장'] });
    assert.equal(r.ok, true);
    assert.deepEqual(r.reasons, []);
});

test('AI-37: 인용 없는 생성물은 폐기 (인용 강제)', () => {
    const r = validateGeneratedItem({ ...GOOD, citation: '' });
    assert.equal(r.ok, false);
    assert.ok(r.reasons.includes('citation_missing'));
    // 인용 미해석 — citeCheck가 false면 폐기
    const r2 = validateGeneratedItem(GOOD, { citeCheck: () => false });
    assert.ok(r2.reasons.includes('citation_unresolved'));
});

test('AI-37: 스키마 위반 — 정답이 선지에 없음 / 발문 부재', () => {
    assert.ok(validateGeneratedItem({ ...GOOD, answer: '없는 선지' }).reasons.includes('schema:answer_not_in_options'));
    assert.ok(validateGeneratedItem({ ...GOOD, question: ' ' }).reasons.includes('schema:question'));
    assert.ok(validateGeneratedItem({ ...GOOD, options: ['하나뿐'], answer: '하나뿐' }).reasons.includes('schema:options_count'));
    assert.ok(validateGeneratedItem(null).reasons.includes('schema'));
});

test('AI-37: dupcheck — 기존 발문과 4-gram 중첩 상한 초과 폐기', () => {
    const dupe = '화장품 제조업 등록 신청은 누가 해야 하는가';
    assert.ok(maxPoolOverlap(dupe, [GOOD.question]) > 0.6);
    assert.ok(maxPoolOverlap('전혀 무관한 발문', [GOOD.question]) < 0.2);
    const r = validateGeneratedItem(GOOD, { poolTexts: [GOOD.question] });
    assert.ok(r.reasons.includes('duplicate'));
    // 임계 오버라이드
    const r2 = validateGeneratedItem(GOOD, { poolTexts: [GOOD.question], maxSimilarity: 1 });
    assert.ok(!r2.reasons.includes('duplicate'));
});

test('AI-37: 일괄 필터 — 통과분·폐기분 분리', () => {
    const { passed, rejected } = filterGeneratedItems(
        [GOOD, { ...GOOD, citation: null }], { poolTexts: [] });
    assert.equal(passed.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reasons.includes('citation_missing'));
});
