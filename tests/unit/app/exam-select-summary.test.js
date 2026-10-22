// tests/unit/app/exam-select-summary.test.js
// @spec ES-06
// summarizeExamProgress — 시험 카드 요약 지표의 순수 집계 검증 (원시 저장값 → 표시 모델).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeExamProgress } from '../../../src/views/exam-select.js';

const TODAY = '2026-10-22';

test('빈 입력 — 전 지표 기본값', () => {
    const s = summarizeExamProgress({ today: TODAY });
    assert.deepEqual(s, { cards: 0, solved: 0, accuracy: null, lastStudy: null, dday: null });
});

test('암기카드 배열·퀴즈 객체·캘린더 집계', () => {
    const s = summarizeExamProgress({
        memorizedJson: '["a","b","c"]',
        quizJson: '{"q1":{"correct":true},"q2":{"correct":false}}',
        calendarJson: '{"2026-10-20":{"cards":2},"2026-10-22":{"quiz":1}}',
        today: TODAY,
    });
    assert.equal(s.cards, 3);
    assert.equal(s.solved, 2);
    assert.equal(s.accuracy, 50);
    assert.equal(s.lastStudy, '2026-10-22');
});

test('퀴즈 저장값이 배열이면 인덱스를 문항 수로 세지 않는다', () => {
    const s = summarizeExamProgress({ quizJson: '[true,false]', today: TODAY });
    assert.equal(s.solved, 0);
    assert.equal(s.accuracy, null);
});

test('D-day는 양쪽 날짜가 유효할 때만 계산 — 음수(기간 경과)도 그대로 반환', () => {
    const s = summarizeExamProgress({ examDate: '2026-11-01', today: TODAY });
    assert.equal(s.dday, 10);
    const past = summarizeExamProgress({ examDate: '2026-10-20', today: TODAY });
    assert.equal(past.dday, -2);
    const bad = summarizeExamProgress({ examDate: 'not-a-date', today: TODAY });
    assert.equal(bad.dday, null);
});

test('깨진 JSON은 무시하고 나머지 지표만 집계', () => {
    const s = summarizeExamProgress({
        memorizedJson: '{oops', quizJson: '[1]', calendarJson: '42',
        today: TODAY,
    });
    assert.equal(s.cards, 0);
    assert.equal(s.solved, 0);
    assert.equal(s.lastStudy, null);
});
