// tests/unit/weak-items.test.js — 약점 항목 ID 문법 + STUDY_DATA 해석 경로
// @spec Q-08,DR-04
// property-based.test.js가 순수 함수(weakItemKey·parseWeakSimId·subjectKeyFromItemId)의
// 불변식을 커버하고, 이 파일은 window.STUDY_DATA 인덱스 기반 해석 경로
// (resolveWrongQuiz·resolveCard·cardSubjectOf·subjectForWeakItem)와
// 인덱스 증분 무효화를 예제로 검증한다 — 변이 테스트 생존 밀집 구간.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    weakItemKey, resolveWrongQuiz, resolveCard, cardSubjectOf,
    parseWeakSimId, subjectForWeakItem, subjectKeyFromItemId,
} from '../../../src/weak-items.js';

// STUDY_DATA/DATA_REGISTRY를 매 테스트 새 객체로 교체 — 인덱스가 과목 객체 참조로
// 무효화되므로 새 객체는 재색인·구 항목 정리 경로를 함께 검증한다.
const QUIZ_A = { id: 'qa1' };
const QUIZ_B = { id: 'qb1' };
const CARD_A = { id: 'subja_card_1' };
const CARD_B = { id: 'subjb_card_2' };

function setStudyData(data, registry) {
    global.window = { STUDY_DATA: data, DATA_REGISTRY: registry || null };
}

const REGISTRY = {
    exams: [{ key: 'examsim', subject: 'subjb' }],
    subjects: [{ key: 'subja' }, { key: 'subjb' }]
};

let originalWindow;
beforeEach(() => { originalWindow = global.window; });
afterEach(() => {
    if (originalWindow !== undefined) global.window = originalWindow;
    else delete global.window;
});

// ---------- weakItemKey ----------

test('weakItemKey: 약점 접두사·카드 ID는 통과, 일반 퀴즈는 접두사 부여', () => {
    assert.equal(weakItemKey('weak_quiz_qa1'), 'weak_quiz_qa1');
    assert.equal(weakItemKey('weak_sim_x_q3'), 'weak_sim_x_q3');
    assert.equal(weakItemKey('subja_card_1'), 'subja_card_1');   // _card_ 포함 → 그대로
    assert.equal(weakItemKey('qa1'), 'weak_quiz_qa1');
});

// ---------- STUDY_DATA 인덱스 해석 ----------

test('resolveWrongQuiz: weak_quiz_ 접두사를 벗기고 원본 퀴즈 해석', () => {
    setStudyData({ subja: { quizzes: [QUIZ_A], cards: [CARD_A] } });
    const r = resolveWrongQuiz('weak_quiz_qa1');
    assert.equal(r.quiz, QUIZ_A);
    assert.equal(r.subjectId, 'subja');
});

test('resolveWrongQuiz: 접두사 없는 퀴즈 ID도 해석, 미등록은 null', () => {
    setStudyData({ subja: { quizzes: [QUIZ_A], cards: [] } });
    assert.equal(resolveWrongQuiz('qa1').quiz, QUIZ_A);
    assert.equal(resolveWrongQuiz('weak_quiz_unknown'), null);
});

test('resolveCard·cardSubjectOf: 카드 ID → 카드 객체·과목', () => {
    setStudyData({ subja: { quizzes: [], cards: [CARD_A] }, subjb: { quizzes: [], cards: [CARD_B] } });
    assert.equal(resolveCard('subjb_card_2').card, CARD_B);
    assert.equal(cardSubjectOf('subja_card_1'), 'subja');
    assert.equal(cardSubjectOf('ghost_card_9'), null);
});

test('resolve*: STUDY_DATA 부재·과목 교체 시 인덱스 무효화', () => {
    setStudyData(null);
    assert.equal(resolveWrongQuiz('weak_quiz_qa1'), null);
    assert.equal(cardSubjectOf('subja_card_1'), null);

    setStudyData({ subja: { quizzes: [QUIZ_A], cards: [] } });
    assert.ok(resolveWrongQuiz('weak_quiz_qa1'));

    // 같은 subjId인데 객체 교체 → 구 항목은 지워지고 새 과목만 해석
    setStudyData({ subja: { quizzes: [QUIZ_B], cards: [] } });
    assert.equal(resolveWrongQuiz('weak_quiz_qa1'), null);
    assert.equal(resolveWrongQuiz('weak_quiz_qb1').subjectId, 'subja');

    // 인덱스 구축 후 STUDY_DATA 제거 → stale 항목이 남으면 안 됨 (clear() 변이 가드)
    setStudyData(null);
    assert.equal(resolveWrongQuiz('weak_quiz_qb1'), null);

    // null → 동일 객체 복원: _subjectRef.clear() 누락 시 구 참조가 남아 재색인이
    // 건너뛰어져 해석이 실패한다 (CallExpression `;` 변이 가드)
    setStudyData({ subja: { quizzes: [QUIZ_B], cards: [] } });
    assert.equal(resolveWrongQuiz('weak_quiz_qb1').subjectId, 'subja');
});

test('resolve*: window 자체가 없는 환경(SSR·노드)도 안전하게 null', () => {
    setStudyData({ subja: { quizzes: [QUIZ_A], cards: [CARD_A] } });
    assert.ok(resolveWrongQuiz('weak_quiz_qa1'));
    delete global.window; // `typeof window !== 'undefined'` 가드 변이 가드
    assert.equal(resolveWrongQuiz('weak_quiz_qa1'), null);
    assert.equal(cardSubjectOf('subja_card_1'), null);
});

test('resolve*: 미변경 과목의 인덱스 항목은 다른 과목 교체 후에도 유지된다', () => {
    const stable = { quizzes: [QUIZ_A], cards: [CARD_A] };
    setStudyData({ subja: stable, subjb: { quizzes: [QUIZ_B], cards: [CARD_B] } });
    assert.ok(resolveCard('subjb_card_2'));
    // subjb만 새 객체로 교체 — subja 항목이 함께 지워지면 안 됨 (v.subjectId !== subjId 변이 가드)
    setStudyData({ subja: stable, subjb: { quizzes: [], cards: [] } });
    assert.equal(resolveCard('subjb_card_2'), null, '교체된 과목의 카드는 제거');
    assert.equal(resolveCard('subja_card_1').subjectId, 'subja', '미변경 과목의 카드는 유지');
    assert.equal(resolveWrongQuiz('weak_quiz_qa1').subjectId, 'subja');
});

test('resolve*: quizzes/cards 배열이 없는 과목도 안전하게 건너뜀', () => {
    setStudyData({ subja: { quizzes: [QUIZ_A] }, subjb: {} });
    assert.equal(resolveWrongQuiz('weak_quiz_qa1').subjectId, 'subja');
    assert.equal(resolveCard('subjb_card_2'), null);
});

// ---------- parseWeakSimId 경계 ----------

test('parseWeakSimId: _q<num> 꼬리만 해석 — combo·비정형은 null', () => {
    assert.deepEqual(parseWeakSimId('weak_sim_examx_q12'), { examId: 'examx', qNum: 12 });
    assert.equal(parseWeakSimId('weak_sim_subj_combo_ab12'), null); // parts.length !== 2
    assert.equal(parseWeakSimId('weak_sim_e_q1_q2'), null);          // _q 다중
    assert.equal(parseWeakSimId('weak_sim_e_qabc'), null);           // NaN
    assert.equal(parseWeakSimId('weak_quiz_qa1'), null);             // sim 접두사 아님
    assert.equal(parseWeakSimId(''), null);
    assert.equal(parseWeakSimId(null), null);
});

// ---------- subjectForWeakItem ----------

test('subjectForWeakItem: sim ID → 레지스트리 과목, quiz/card → 인덱스 과목', () => {
    setStudyData(
        { subja: { quizzes: [QUIZ_A], cards: [CARD_A] } },
        REGISTRY
    );
    assert.equal(subjectForWeakItem('weak_sim_examsim_q3'), 'subjb');   // exam → subject
    assert.equal(subjectForWeakItem('weak_quiz_qa1'), 'subja');          // 퀴즈 인덱스
    assert.equal(subjectForWeakItem('subja_card_1'), 'subja');           // 카드 인덱스
    assert.equal(subjectForWeakItem('weak_quiz_ghost', 'fallback'), 'fallback');
    assert.equal(subjectForWeakItem('weak_quiz_ghost'), null);
});

// ---------- subjectKeyFromItemId ----------

test('subjectKeyFromItemId: 접두사 제거 후 꼬리 패턴에서 과목 키 복원', () => {
    assert.equal(subjectKeyFromItemId('subja_card_1'), 'subja');
    assert.equal(subjectKeyFromItemId('weak_quiz_subja_quiz_3'), 'subja');
    assert.equal(subjectKeyFromItemId('weak_sim_subj2_q4'), null);     // _q<num> 꼬리는 card/quiz 패턴 아님
    assert.equal(subjectKeyFromItemId('plain_id'), null);
    // ^ 앵커 변이 가드 — ID 중간의 'weak_quiz_'를 벗기면 과목 키가 달라진다
    assert.equal(subjectKeyFromItemId('xweak_quiz_subja_card_1'), 'xweak_quiz_subja');
});
