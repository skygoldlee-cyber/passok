// tests/dom/exam-sim-review.dom.test.js — 시뮬레이터 결과 리뷰·요약·과목/단원 분석
// @spec E-04,E-06,E-07
// 검증: 오답 리뷰 패널(만점·유형 배지·combo 정오표 오판 표시), 패널 전환,
//       chapterForQuestion(combo 출처 역추적·L라인 범위·일반 id), 결과 브레이크다운
//       (점수·과락 배지·단원 취약 정렬·합격/과락/평균미달 피드백 박스)

import { describe, it, beforeEach, expect } from 'vitest';
import { simState } from '../../../src/views/exam-sim-state.js';
import {
    showSimAnswerReview, showSimResultsSummary,
    chapterForQuestion, renderSimResultBreakdown,
} from '../../../src/views/exam-sim-review.js';

const HTML = `
<div class="main-content"></div>
<div id="sim-arena-panel"></div>
<div id="sim-result-panel" class="is-hidden">
  <span id="sim-result-score"></span>
  <span id="sim-result-rate"></span>
  <div id="sim-result-breakdown" class="is-hidden"></div>
</div>
<div id="sim-review-panel" class="is-hidden">
  <div id="sim-review-list-container"></div>
</div>`;

const SUBJECTS = [
    { key: 'law', name: '화장품법', order: 1 },
    { key: 'manufacture', name: '화장품 제조', order: 2 },
];

const COMBO_Q = {
    num: 3, type: 'combo',
    question: '옳은 것을 모두 고르시오.',
    answer: '①', userAnswer: '②',
    statements: [
        { id: 'ㄱ', text: '진술 ㄱ', truth: true },
        { id: 'ㄴ', text: '진술 ㄴ', truth: false },
    ],
    comboOptions: [
        { members: ['ㄱ'] },
        { members: ['ㄱ', 'ㄴ'] },
    ],
    citation: '📖 출처: 과목1 문제은행 Q5',
    explanation: '해설',
};

describe('시뮬레이터 결과 리뷰 (E-04·E-07)', () => {
    beforeEach(() => {
        document.body.innerHTML = HTML;
        simState.wrongQuestions = [];
    });

    it('만점이면 축하 메시지만 렌더', () => {
        showSimAnswerReview();
        const c = document.getElementById('sim-review-list-container');
        expect(c.innerHTML).toContain('만점입니다');
        expect(document.getElementById('sim-review-panel').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('sim-result-panel').classList.contains('is-hidden')).toBe(true);
    });

    it('오답 카드 — 유형 배지·내 답/정답·해설 렌더', () => {
        simState.wrongQuestions = [{
            num: 1, type: 'choice', question: '문제 <b>텍스트</b>',
            options: ['선지1', '선지2'], answer: '선지1', userAnswer: '선지2',
            explanation: '해설\n두 줄',
        }];
        showSimAnswerReview();
        const item = document.querySelector('.sim-review-item');
        expect(item.textContent).toContain('객관식');
        expect(item.textContent).toContain('선지2');
        expect(item.textContent).toContain('선지1');
        expect(item.innerHTML).not.toContain('<b>텍스트</b>'); // esc/safeText — 태그 문자 그대로
    });

    it('combo 오답 — 진술 정오표에 오판 진술이 표시된다', () => {
        simState.wrongQuestions = [COMBO_Q];
        showSimAnswerReview();
        const c = document.getElementById('sim-review-list-container');
        expect(c.textContent).toContain('ㄱㄴㄷ 조합형');
        const rows = c.querySelectorAll('.combo-truth-row');
        expect(rows.length).toBe(2);
        // ②(ㄱ+ㄴ) 선택 → ㄴ을 참으로 오판
        const rowN = rows[1];
        expect(rowN.classList.contains('is-misjudged')).toBe(true);
        expect(rowN.textContent).toContain('실제 X');
        expect(rowN.textContent).toContain('참으로 판정');
        expect(rows[0].classList.contains('is-misjudged')).toBe(false);
    });

    it('요약 패널로 복귀 — 패널 토글', () => {
        document.getElementById('sim-review-panel').classList.remove('is-hidden');
        showSimResultsSummary();
        expect(document.getElementById('sim-review-panel').classList.contains('is-hidden')).toBe(true);
        expect(document.getElementById('sim-result-panel').classList.contains('is-hidden')).toBe(false);
    });
});

describe('chapterForQuestion — 단원 매핑 (E-06)', () => {
    const qc = {
        questions: { q1: 'Chapter 01. 기초', subject1_q5: 'Chapter 02. 법규' },
        ranges: { law: [[10, 'Chapter 01. 기초'], [50, 'Chapter 03. 제조']] },
    };

    it('일반 문항 — id로 단원 조회', () => {
        expect(chapterForQuestion({ id: 'q1' }, 'law', qc)).toBe('Chapter 01. 기초');
        expect(chapterForQuestion({ id: 'q9' }, 'law', qc)).toBeNull();
    });

    it('combo — 출처 Q번호 역추적 우선', () => {
        expect(chapterForQuestion(COMBO_Q, 'law', qc)).toBe('Chapter 02. 법규');
    });

    it('combo — 출처 없으면 L라인 범위로 해석', () => {
        const q = { ...COMBO_Q, citation: '📖 화장품법 (L60)' };
        expect(chapterForQuestion(q, 'law', qc)).toBe('Chapter 03. 제조');
        const q2 = { ...COMBO_Q, citation: '📖 (L5)' };
        expect(chapterForQuestion(q2, 'law', qc)).toBeNull();
    });
});

describe('renderSimResultBreakdown — 과목/단원 분석 (E-06)', () => {
    const render = (subjectScores, chapterStats, score = 14, total = 20) =>
        renderSimResultBreakdown({ score, total, subjectScores, chapterStats, subjects: SUBJECTS });
    const bd = () => document.getElementById('sim-result-breakdown');

    beforeEach(() => { document.body.innerHTML = HTML; });

    it('점수·정답률 표시 + 과락 과목 배지·경고 박스', () => {
        render(
            { law: { score: 2, total: 10 }, manufacture: { score: 12, total: 10 } },
            { law: { 'Ch1. 기초': { score: 2, total: 6 } } },
        );
        expect(document.getElementById('sim-result-score').textContent).toBe('14 / 20 개');
        expect(document.getElementById('sim-result-rate').textContent).toBe('70%');
        const html = bd().innerHTML;
        expect(html).toContain('과락');           // law 20% < 40 과락선
        expect(html).toContain('과락 주의 경고');
        expect(html).toContain('단원별 취약 분석');
        expect(html).toContain('Ch1. 기초');
        expect(bd().classList.contains('is-hidden')).toBe(false);
    });

    it('전 과목 과락 없음 + 평균 60% 이상 → 합격 안정권 박스', () => {
        render(
            { law: { score: 8, total: 10 }, manufacture: { score: 8, total: 10 } },
            {},
            16, 20,
        );
        const html = bd().innerHTML;
        expect(html).toContain('합격 안정권');
        expect(html).not.toContain('과락 주의 경고');
        // 오답 과목 복습 버튼 존재
        expect(html).toContain('data-click="startFocusSubjectStudy"');
    });

    it('과락 없음 + 평균 60% 미만 → 평균 미달 박스', () => {
        render(
            { law: { score: 5, total: 10 }, manufacture: { score: 5, total: 10 } },
            {},
            10, 20,
        );
        expect(bd().innerHTML).toContain('전체 평균 미달');
    });

    it('전부 정답인 단원은 취약 분석에서 제외', () => {
        render(
            { law: { score: 9, total: 10 } },
            { law: { 'Ch1. 만점단원': { score: 5, total: 5 }, 'Ch2. 오답단원': { score: 1, total: 4 } } },
            9, 10,
        );
        const html = bd().innerHTML;
        expect(html).not.toContain('만점단원');
        expect(html).toContain('오답단원');
    });
});
