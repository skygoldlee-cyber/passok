// tests/unit/concept-drill.test.js
// @spec DR-08
// concept-drill.js 개념 문항 딥링크 선별 순수 로직 검증 (합성 데이터).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConceptCid, pickConceptQuestions } from '../../src/passloop/core/concept-drill.js';

const CID_SECTION = {
    subjA: { 'L100': '2.3', 'L200': '2.4' },
    subjB: { 'L100': '5.1' },
};

const studyData = {
    subjA: {
        quizzes: [
            { id: 'q1', conceptId: '§2.3' },
            { id: 'q2', conceptId: '§2.4' },                              // 같은 장 인접
            { id: 'q3', statements: [{ conceptId: '§2.3' }] },            // 진술 단위 일치
            { id: 'q4', conceptId: '§3.1' },                              // 다른 장
            { id: 'q5', conceptId: 'L100' },                              // 레거시 라인 → §2.3 (subjA)
            { id: 'q6', conceptId: '신고주체' },                           // 의미 그룹명
            { id: 'q7' },                                                  // conceptId 없음
        ],
    },
};

test('DR-08: normalizeConceptCid — §/숫자/레거시 라인 환산', () => {
    assert.equal(normalizeConceptCid('2.3'), '§2.3');
    assert.equal(normalizeConceptCid('§2.3'), '§2.3');
    assert.equal(normalizeConceptCid('3'), '§3');
    assert.equal(normalizeConceptCid('L100', CID_SECTION), '§2.3'); // 첫 일치 과목
    assert.equal(normalizeConceptCid('L200', CID_SECTION), '§2.4');
    assert.equal(normalizeConceptCid('L999', CID_SECTION), null);
    assert.equal(normalizeConceptCid(''), null);
    assert.equal(normalizeConceptCid(null), null);
});

test('DR-08: 직접 일치 — 문항·진술·레거시 라인 conceptId 모두 선별', () => {
    const items = pickConceptQuestions(studyData, '§2.3', { cidSection: CID_SECTION });
    const ids = items.map(q => q.id);
    assert.ok(ids.includes('q1') && ids.includes('q3') && ids.includes('q5'));
    assert.ok(!ids.includes('q7'));
});

test('DR-08: 인접 보충 — 같은 장(§2.) 문항으로 cap까지 채움, 다른 장 제외', () => {
    const items = pickConceptQuestions(studyData, '§2.3', { cap: 5, cidSection: CID_SECTION });
    assert.equal(items.length, 4); // 직접 3(q1·q3·q5) + 인접 1(q2)
    const ids = items.map(q => q.id);
    assert.ok(ids.indexOf('q2') > ids.indexOf('q1')); // 인접은 직접 일치 뒤
    assert.ok(!ids.includes('q4') && !ids.includes('q6'));
});

test('DR-08: 정렬 — 오답 → 미풀이 → 풀이 이력 순', () => {
    const items = pickConceptQuestions(studyData, '§2.3', {
        cidSection: CID_SECTION,
        wrongIds: new Set(['q3']),
        solvedIds: new Set(['q1']),
    });
    const ids = items.map(q => q.id);
    assert.equal(ids[0], 'q3');                    // 오답 최우선
    assert.ok(ids.indexOf('q5') < ids.indexOf('q1')); // 미풀이(q5) < 풀이 이력(q1)
});

test('DR-08: 의미 그룹명 cid — 직접 일치만, 인접 보충 없음', () => {
    const items = pickConceptQuestions(studyData, '신고주체', { cidSection: CID_SECTION });
    assert.deepEqual(items.map(q => q.id), ['q6']);
});

test('DR-08: 빈 결과·방어 입력', () => {
    assert.deepEqual(pickConceptQuestions(studyData, '§9.9'), []);
    assert.deepEqual(pickConceptQuestions(null, '§2.3'), []);
    assert.deepEqual(pickConceptQuestions(studyData, ''), []);
});
