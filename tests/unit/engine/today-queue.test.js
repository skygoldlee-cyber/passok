// tests/unit/today-queue.test.js — 대시보드 "오늘 할 일" 단일 큐 병합 로직
// @spec TQ-01,TQ-02,TQ-03,TQ-04,D-19
// buildTodayQueue가 복습 대기·주간 배분·오답·취약 진술·일일 챌린지·개인화 추천을
// 규정 우선순위로 병합하고, 중복 실행·빈 상태·결정론을 보장하는지 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTodayQueue } from '../../../src/views/dashboard-queue.js';

const SUBJECTS = [
    { key: 'sub1', name: '과목1' },
    { key: 'sub2', name: '과목2' },
];

function baseInput(overrides = {}) {
    return {
        dueCardIds: [],
        subjects: SUBJECTS,
        recs: [],
        allocRemaining: [],
        reviewCount: 0,
        weakStatementCount: 0,
        dailyDone: true,
        dday: 30,
        hasProgress: true,
        ...overrides,
    };
}

const kinds = (items) => items.map((i) => i.kind);

function rec(icon, title, actions) {
    return {
        icon, color: 'var(--color-danger)', title, reason: `${title} 사유`,
        actions: actions || [{ click: 'startSubjectQuiz', arg: 'sub1', label: '지금 풀기', icon: 'fa-play', cls: 'btn-primary' }],
    };
}

// TQ-01 — 전 소스가 있는 경우 규정 우선순위로 정렬된다
test('TQ-01 우선순위: 복습→위험→배분→오답→취약→추천→챌린지 순서 병합', () => {
    const items = buildTodayQueue(baseInput({
        dueCardIds: ['sub1_card_a', 'sub1_card_b', 'sub2_card_c'],
        recs: [
            rec('fa-triangle-exclamation', '과락 위기 과목'),
            rec('fa-bullseye', '정답률 최저 과목', [{ click: 'startSubjectQuiz', arg: 'sub2', label: '지금 풀기', icon: 'fa-play', cls: 'btn-primary' }]),
        ],
        allocRemaining: [{ key: 'sub1', name: '과목1', cardsLeft: 5, quizzesLeft: 2 }],
        reviewCount: 3,
        weakStatementCount: 7,
        dailyDone: false,
    }));
    const k = kinds(items);
    assert.deepEqual(k.slice(0, 6), ['due', 'danger', 'alloc', 'review', 'weak', 'rec']);
    assert.equal(k[6], 'daily');
    // 복습 항목은 최다 과목을 사유에 표기
    assert.match(items[0].reason, /과목1/);
});

// TQ-01 — 일일 챌린지 완료 시 큐에서 제외, 미완료 시에만 포함
test('TQ-01 일일 챌린지는 미완료일 때만 큐에 들어간다', () => {
    assert.ok(!kinds(buildTodayQueue(baseInput())).includes('daily'));
    assert.ok(kinds(buildTodayQueue(baseInput({ dailyDone: false }))).includes('daily'));
});

// TQ-04 — 배정 잔여는 목표 미달분만 항목이 되고 상한 2개를 넘지 않는다
test('TQ-04 주간 배정 잔여 — 남은 과목만, 상한 2개', () => {
    const items = buildTodayQueue(baseInput({
        allocRemaining: [
            { key: 'sub1', name: '과목1', cardsLeft: 0, quizzesLeft: 0 }, // 완료 — 제외
            { key: 'sub2', name: '과목2', cardsLeft: 4, quizzesLeft: 0 },
            { key: 'sub3', name: '과목3', cardsLeft: 2, quizzesLeft: 1 },
            { key: 'sub4', name: '과목4', cardsLeft: 9, quizzesLeft: 9 }, // 상한 초과 — 제외
        ],
    }));
    const allocs = items.filter((i) => i.kind === 'alloc');
    assert.equal(allocs.length, 2);
    assert.deepEqual(allocs.map((i) => i.title), ['과목2 주간 배정 잔여', '과목3 주간 배정 잔여']);
    // 카드만 남은 항목은 카드 액션만, 병합 항목은 카드+퀴즈 액션
    assert.equal(allocs[0].actions.length, 1);
    assert.equal(allocs[1].actions.length, 2);
});

// TQ-02 — 같은 실행(click+arg)은 두 번 권하지 않는다
test('TQ-02 동일 click+arg 액션은 중복 큐잉되지 않는다', () => {
    const dup = rec('fa-bullseye', '정답률 최저', [{ click: 'startSubjectQuiz', arg: 'sub1', label: '풀기', icon: 'fa-play', cls: 'btn-primary' }]);
    const items = buildTodayQueue(baseInput({
        recs: [dup, { ...dup, title: '같은 과목 다른 사유' }],
        allocRemaining: [{ key: 'sub1', name: '과목1', cardsLeft: 5, quizzesLeft: 0 }], // startSubjectStudy — 다른 실행
    }));
    assert.equal(items.filter((i) => i.kind === 'rec').length, 1);
    assert.equal(items.find((i) => i.kind === 'alloc').actions[0].click, 'startSubjectStudy');
});

// TQ-02 — 모든 항목이 실행 가능한 액션 스키마를 갖는다
test('TQ-02 큐 항목은 kind·title·actions(click+label) 필수 스키마 충족', () => {
    const items = buildTodayQueue(baseInput({
        dueCardIds: ['sub1_card_a'],
        recs: [rec('fa-bullseye', '정답률 최저 과목')],
        allocRemaining: [{ key: 'sub2', name: '과목2', cardsLeft: 3, quizzesLeft: 1 }],
        reviewCount: 2,
        weakStatementCount: 4,
        dailyDone: false,
    }));
    assert.equal(items.length, 6);
    for (const it of items) {
        assert.ok(it.kind && it.title && it.icon && it.color, `필수 필드: ${it.kind}`);
        assert.ok(Array.isArray(it.actions) && it.actions.length > 0, `액션 존재: ${it.kind}`);
        for (const a of it.actions) {
            assert.ok(typeof a.click === 'string' && a.click.length > 0, 'click 지정');
            assert.ok(typeof a.label === 'string' && a.label.length > 0, 'label 지정');
        }
    }
});

// TQ-03 — 학습 이력이 없는 빈 큐는 시작 안내 항목으로 대체된다
test('TQ-03 이력 없음 빈 큐 → 시험일 설정 + 첫 학습 안내 (D-day 없으면)', () => {
    const items = buildTodayQueue(baseInput({ hasProgress: false, dday: null }));
    assert.deepEqual(kinds(items), ['goal', 'start']);
    assert.equal(items[1].actions[0].click, 'startSubjectStudy');
});

// TQ-03 — 이력 없음 + D-day 설정됨 → 시험일 설정 항목은 생략
test('TQ-03 이력 없음 + D-day 있음 → 첫 학습 안내만', () => {
    const items = buildTodayQueue(baseInput({ hasProgress: false, dday: 12 }));
    assert.deepEqual(kinds(items), ['start']);
});

// TQ-03 — 시험일 미설정은 이력과 무관하게 goal 항목을 최우선으로 올린다
// (D-day 카드의 중복 CTA 제거 — 설정 액션은 큐가 단독 소유)
test('TQ-03 이력 있음 + D-day 미설정 → goal 최우선 + 작업 항목 유지', () => {
    const items = buildTodayQueue(baseInput({ dday: null, reviewCount: 3 }));
    assert.equal(kinds(items)[0], 'goal');
    assert.ok(kinds(items).includes('review'));
});

// TQ-03 — 이력 있는데 할 일이 없으면 빈 배열(렌더러가 달성 문구 표시)
test('TQ-03 이력 있음 + 소스 공백 → 빈 큐', () => {
    assert.deepEqual(buildTodayQueue(baseInput()), []);
});

// D-19 — 시험 임박 + 위험 카드 있으면 취약 진술 뒤·잔여 추천 앞에 최종 인출 항목
test('D-19 최종 인출: 윈도 내 위험 카드 → weak 뒤·rec 앞에 examr 항목', () => {
    const items = buildTodayQueue(baseInput({
        dday: 5,
        examRiskIds: ['sub1_card_x', 'sub2_card_y'],
        weakStatementCount: 3,
        recs: [rec('fa-bullseye', '정답률 최저 과목')],
    }));
    const k = kinds(items);
    assert.deepEqual(k, ['weak', 'examr', 'rec']);
    const examr = items.find((i) => i.kind === 'examr');
    assert.match(examr.title, /최종 인출 2장/);
    assert.match(examr.reason, /95%/); // EXAM_TARGET_R=0.95 — UI 문구가 임계값과 정합해야 함
    assert.equal(examr.actions[0].click, 'startExamRiskReview');
});

// D-19 — 윈도 밖·미설정·공백이면 표시하지 않는다
test('D-19 최종 인출: dday>14·미설정·위험 카드 공백이면 미표시', () => {
    assert.ok(!kinds(buildTodayQueue(baseInput({ dday: 30, examRiskIds: ['sub1_card_x'] }))).includes('examr'));
    assert.ok(!kinds(buildTodayQueue(baseInput({ dday: 15, examRiskIds: ['sub1_card_x'] }))).includes('examr'));
    assert.ok(!kinds(buildTodayQueue(baseInput({ dday: null, examRiskIds: ['sub1_card_x'] }))).includes('examr'));
    assert.ok(!kinds(buildTodayQueue(baseInput({ dday: 5, examRiskIds: [] }))).includes('examr'));
    // 경계값: dday=14는 표시, dday=0(당일)도 표시
    assert.ok(kinds(buildTodayQueue(baseInput({ dday: 14, examRiskIds: ['sub1_card_x'] }))).includes('examr'));
    assert.ok(kinds(buildTodayQueue(baseInput({ dday: 0, examRiskIds: ['sub1_card_x'] }))).includes('examr'));
});

// TQ-03 — 결정론: 동일 입력에 동일 출력
test('TQ-03 동일 입력에 동일 출력(결정론)', () => {
    const input = baseInput({ dueCardIds: ['sub1_card_a'], reviewCount: 1, dailyDone: false });
    assert.equal(JSON.stringify(buildTodayQueue(input)), JSON.stringify(buildTodayQueue(input)));
});
