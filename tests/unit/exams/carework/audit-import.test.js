// tests/unit/exams/carework/audit-import.test.js
// @spec none — 기관 점검표 파일 → 섹션 파서 계약 (순수 로직)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRowsToSections } from '../../../../src/exams/carework/audit-import.js';

test('헤더 매핑 — 영역·점검항목·근거 컬럼', () => {
    const s = auditRowsToSections([
        ['평가영역', '점검항목', '근거'],
        ['인권', '인권교육 연간 실시', '노인복지법 §39'],
        ['감염', '손위생 시설 비치', '감염관리 기준'],
    ]);
    assert.equal(s.length, 2);
    assert.equal(s[0].title, '인권');
    assert.equal(s[0].items[0].text, '인권교육 연간 실시');
    assert.equal(s[0].items[0].ref, '노인복지법 §39');
    assert.equal(s[1].items[0].ref, '감염관리 기준');
});

test('헤더 병합 셀 — 빈 영역 칸은 직전 값 계승', () => {
    const s = auditRowsToSections([
        ['구분', '항목', '근거'],
        ['안전', '낙상 예방 환경 점검', '고시'],
        ['', '응급 대응 절차 훈련', '고시'],
    ]);
    assert.equal(s.length, 1);
    assert.equal(s[0].items.length, 2);
    assert.equal(s[0].items[1].text, '응급 대응 절차 훈련');
});

test('무헤더 3열 — 첫열 영역·가운데 항목·마지막 근거', () => {
    const s = auditRowsToSections([
        ['인권', '인권교육 실시', '노인복지법'],
        ['안전', '낙상 예방 점검', '평가방법 고시'],
    ]);
    assert.equal(s.map(x => x.title).join(','), '인권,안전');
    assert.equal(s[0].items[0].ref, '노인복지법');
});

test('무헤더 3열 번호열 — 첫열이 전부 숫자면 영역 아님', () => {
    const s = auditRowsToSections([
        ['1', '인권교육 실시', '노인복지법'],
        ['2', '낙상 예방 점검', '평가방법 고시'],
    ]);
    assert.equal(s.length, 1);
    assert.equal(s[0].title, '기관 점검표');
    assert.equal(s[0].items.length, 2);
});

test('무헤더 2열 — col0 고유면 [항목,근거], 반복이면 [영역,항목]', () => {
    const a = auditRowsToSections([['인권교육 실시', '노인복지법'], ['낙상 예방', '고시']]);
    assert.equal(a.length, 1);
    assert.equal(a[0].items[0].ref, '노인복지법'); // 근거로 인식
    const b = auditRowsToSections([['인권', '교육 실시'], ['인권', '불만 처리'], ['안전', '낙상 예방']]);
    assert.equal(b.length, 2); // col0 반복 → 영역 그룹
    assert.equal(b[0].items.length, 2);
});

test('비표 텍스트 — 제목행은 섹션, 나머지는 항목', () => {
    const s = auditRowsToSections([], ['■ 인권 보장', '인권교육 실시', '■ 안전 대응', '낙상 예방 점검']);
    assert.equal(s[0].title, '인권 보장');
    assert.equal(s[0].items[0].text, '인권교육 실시');
    assert.equal(s[1].title, '안전 대응');
    assert.equal(s[1].items[0].text, '낙상 예방 점검');
});

test('항목 id — 같은 입력은 같은 id (재업로드 시 체크 유지), 유니크', () => {
    const rows = [['구분', '항목'], ['인권', '교육 실시'], ['인권', '교육 실시']];
    const a = auditRowsToSections(rows);
    const b = auditRowsToSections(rows);
    const idsA = a[0].items.map(i => i.id);
    assert.deepEqual(idsA, b[0].items.map(i => i.id));
    assert.equal(new Set(idsA).size, 2); // 동일 문구 중복도 id 유니크
});

test('빈 입력·빈 텍스트 항목 — 빈 섹션 생성 없음', () => {
    assert.equal(auditRowsToSections([], []).length, 0);
    const s = auditRowsToSections([['구분', '항목'], ['인권', ''], ['안전', '점검']]);
    assert.equal(s.length, 1);
    assert.equal(s[0].items.length, 1);
});
