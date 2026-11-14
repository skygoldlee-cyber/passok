// tests/unit/exams/carework/name-fmt.test.js
// @spec none — carework 성명 표기 유틸 (성·이름 사이 한 칸)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDocName, fmtDocNames } from '../../../../src/exams/carework/name-fmt.js';

test('fmtDocName — 단성 성명', () => {
    assert.equal(fmtDocName('김수'), '김 수');
    assert.equal(fmtDocName('김철수'), '김 철수');
    assert.equal(fmtDocName('홍길동이'), '홍 길동이'); // 4글자 비복성 — 성 1글자
});
test('fmtDocName — 복성 성명', () => {
    assert.equal(fmtDocName('남궁민수'), '남궁 민수');
    assert.equal(fmtDocName('제갈량'), '제갈 량');
    assert.equal(fmtDocName('선우진'), '선우 진');
});
test('fmtDocName — 마스크 성명', () => {
    assert.equal(fmtDocName('김○○'), '김 ○○');
    assert.equal(fmtDocName('남궁○○'), '남궁 ○○');
    assert.equal(fmtDocName('이△'), '이 △');
});
test('fmtDocName — 비성명 값 원형 유지', () => {
    assert.equal(fmtDocName('아들'), '아들');   // 성씨 집합 밖
    assert.equal(fmtDocName('요양보호사'), '요양보호사');
    assert.equal(fmtDocName('김 철수'), '김 철수'); // 이미 공백 있음 — 멱등
    assert.equal(fmtDocName('홍길동(3)'), '홍길동(3)');
    assert.equal(fmtDocName(''), '');
    assert.equal(fmtDocName(null), '');
    assert.equal(fmtDocName('John Doe'), 'John Doe');
});
test('fmtDocNames — 이름 목록 필드 (근무자)', () => {
    assert.equal(fmtDocNames('김○○, 정○○'), '김 ○○, 정 ○○');
    assert.equal(fmtDocNames('김철수/이영희'), '김 철수/이 영희');
    assert.equal(fmtDocNames('박○○ 요양보호사'), '박 ○○ 요양보호사'); // 5글자 직책은 통과
    assert.equal(fmtDocNames('302호 김○○ 외 4명'), '302호 김 ○○ 외 4명'); // 호수·수량 통과
});
test('fmtDocNames — maskedOnly: 일반 문장 오변환 방지', () => {
    assert.equal(fmtDocNames('자녀 김△△ (주보호자)', true), '자녀 김 △△ (주보호자)');
    assert.equal(fmtDocNames('자녀 방문 예정', true), '자녀 방문 예정'); // '방문' 동음어 보호
    assert.equal(fmtDocNames('보호자 김철수 방문', true), '보호자 김철수 방문'); // 무마스크 이름은 유지
    assert.equal(fmtDocNames('요양보호사 근무 배정', true), '요양보호사 근무 배정');
});
test('fmtDocNames — 비성명 입력', () => {
    assert.equal(fmtDocNames(''), '');
    assert.equal(fmtDocNames(null), '');
});
