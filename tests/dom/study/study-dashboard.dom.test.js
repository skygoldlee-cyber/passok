// tests/dom/study-dashboard.dom.test.js — 대시보드 통계·추천 시나리오
// @spec D-01~15,D-17,AN-01~03,AN-09,SC-10,SC-11,SC-14,TQ-01,TQ-03,TQ-05
// 설계: docs/dev/design/DOM_TEST_DESIGN.md §5.2 (Phase 3)
// 검증: 진도 0건 렌더(E), 시딩 진도→통계 반영(H/P), 과목 카드·히트맵(H),
//       약점 과목 추천(H — 최소 3문 응시 조건·헷갈림 카드最多)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import {
    loadIndexHtml, el,
    seedStudyData, seedProgress, resetStudyState, flushAsync,
} from '../helpers.js';
import { updateGlobalStats, renderDashboard } from '../../../src/views/dashboard.js';
import { renderAnalysisView, gotoSubjectAnalysis } from '../../../src/views/analysis-view.js';
import { setExamDate, setStudyGoals } from '../../../src/study-tracker.js';
import { state, safeSetItem } from '../../../src/state.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { scopedKey } from '../../../src/exam-context.js';

const todayPlus = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function seedTwoSubjects() {
    seedStudyData('subja', {
        name: '과목1',
        cards: [
            { id: 'subja_card_1', term: 't1', definition: 'd' },
            { id: 'subja_card_2', term: 't2', definition: 'd' },
        ],
        quizzes: [],
    });
    seedStudyData('subjb', {
        name: '과목2',
        cards: [
            { id: 'subjb_card_1', term: 't3', definition: 'd' },
            { id: 'subjb_card_2', term: 't4', definition: 'd' },
        ],
        quizzes: [],
    });
}

describe('대시보드 — 통계·과목 카드·약점 추천', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
    });

    it('진도 0건 → 전체 통계 0 + 빈 추천 안내', () => {
        seedTwoSubjects();
        updateGlobalStats();
        renderDashboard();

        expect(el('total-cards-count').textContent).toBe('4');
        expect(el('memorized-cards-count').textContent).toBe('0');
        expect(el('weak-cards-count').textContent).toBe('0');
        expect(el('total-progress-val').textContent).toBe('0%');
        expect(el('solved-quizzes-count').textContent).toBe('0');
        expect(el('quiz-success-rate').textContent).toBe('0%');
        // TQ-03 — 진도 0건이면 큐가 시작 안내(시험일 설정+첫 학습)로 대체된다
        const queueText = el('weak-subject-recommendation').textContent;
        expect(queueText).toContain('시험일 설정');
        expect(queueText).toContain('첫 학습 시작');
    });

    it('시딩 진도 → 암기율·정답률·복습 대기 반영', () => {
        seedTwoSubjects();
        seedProgress({
            memorized: ['subja_card_1', 'subja_card_2'],
            weak: ['subjb_card_1'],
            quizResults: {
                subja_quiz_1: { solved: true, correct: true },
                subja_quiz_2: { solved: true, correct: true },
                subjb_quiz_1: { solved: true, correct: false },
            },
        });
        updateGlobalStats();

        expect(el('memorized-cards-count').textContent).toBe('2');
        expect(el('weak-cards-count').textContent).toBe('1');
        expect(el('review-card-count').textContent).toBe('1');
        expect(el('total-progress-val').textContent).toBe('50%'); // 2/4
        expect(el('solved-quizzes-count').textContent).toBe('3');
        expect(el('quiz-success-rate').textContent).toBe('67%'); // 2/3
    });

    it('과목 카드 → 과목별 암기 수·퀴즈 정답률·진도율 렌더', () => {
        seedTwoSubjects();
        seedProgress({
            memorized: ['subja_card_1'],
            quizResults: {
                subja_quiz_1: { solved: true, correct: true },
                subja_quiz_2: { solved: true, correct: false },
            },
        });
        renderDashboard();

        const cards = el('subject-cards-container').querySelectorAll('.subject-card');
        expect(cards.length).toBe(2);

        const subjaCard = cards[0].textContent;
        expect(subjaCard).toContain('과목1');
        expect(subjaCard).toContain('1 / 2');   // 암기 1/2
        expect(subjaCard).toContain('50%');      // 정답률 1/2, 진도율 1/2
        expect(subjaCard).toContain('2문');

        const subjbCard = cards[1].textContent;
        expect(subjbCard).toContain('과목2');
        expect(subjbCard).toContain('0 / 2');
    });

    it('히트맵 → 미응시·정답률 구간 셀 렌더', () => {
        seedTwoSubjects();
        seedProgress({
            quizResults: {
                subja_quiz_1: { solved: true, correct: true },
                subja_quiz_2: { solved: true, correct: true },
            },
        });
        renderDashboard();

        const cells = el('subject-heatmap').querySelectorAll('.heatmap-cell');
        expect(cells.length).toBe(2);
        expect(cells[0].querySelector('.heatmap-value').textContent).toBe('100%');
        expect(cells[1].querySelector('.heatmap-value').textContent).toBe('미응시');
    });

    it('히트맵 색상 — 표준 그래디언트 토큰 매핑 (노랑 60-79 · 주황 40-59 · 빨강 <40, D-09)', () => {
        seedTwoSubjects();
        seedProgress({
            quizResults: {
                // 과목1: 4문 중 3正 = 75% → 노랑(--color-caution)
                subja_quiz_1: { solved: true, correct: true },
                subja_quiz_2: { solved: true, correct: true },
                subja_quiz_3: { solved: true, correct: true },
                subja_quiz_4: { solved: true, correct: false },
                // 과목2: 4문 중 2正 = 50% → 주황(--color-orange)
                subjb_quiz_1: { solved: true, correct: true },
                subjb_quiz_2: { solved: true, correct: true },
                subjb_quiz_3: { solved: true, correct: false },
                subjb_quiz_4: { solved: true, correct: false },
            },
        });
        const root = document.documentElement;
        root.style.setProperty('--color-caution', '#c0ffee');
        root.style.setProperty('--color-orange', '#0bad01');
        try {
            renderDashboard();
            const cells = el('subject-heatmap').querySelectorAll('.heatmap-cell');
            expect(cells[0].getAttribute('style')).toContain('#c0ffee');
            expect(cells[1].getAttribute('style')).toContain('#0bad01');
        } finally {
            root.style.removeProperty('--color-caution');
            root.style.removeProperty('--color-orange');
        }
    });

    it('약점 과목 추천 → 3문 이상 응시 과목 중 최저 정답률 + 헷갈림 最多', () => {
        seedTwoSubjects();
        seedProgress({
            weak: ['subja_card_1'],
            quizResults: {
                // 과목1: 3문 全正 (100%) — 추천 대상 아님
                subja_quiz_1: { solved: true, correct: true },
                subja_quiz_2: { solved: true, correct: true },
                subja_quiz_3: { solved: true, correct: true },
                // 과목2: 3문 중 1正 (33%) — 최저 정답률 추천
                subjb_quiz_1: { solved: true, correct: false },
                subjb_quiz_2: { solved: true, correct: false },
                subjb_quiz_3: { solved: true, correct: true },
            },
        });
        renderDashboard();

        const rec = el('weak-subject-recommendation').textContent;
        expect(rec).toContain('정답률 최저');
        expect(rec).toContain('과목2');
        expect(rec).toContain('33%');
        expect(rec).toContain('헷갈린 카드');
        expect(rec).toContain('과목1');
        expect(rec).toContain('1장');
    });

    it('시험일 미설정 — 최우선 설정 안내 + 카드 강조 (SC-10)', () => {
        seedTwoSubjects();
        updateGlobalStats();
        const card = el('exam-dday-count').closest('.stat-card');
        const desc = el('exam-dday-count').closest('.stat-info').querySelector('.stat-desc');
        expect(el('exam-dday-count').textContent).toBe('미설정');
        expect(card.closest('.stats-grid').querySelector('.stat-card')).toBe(card); // 통계 그리드 첫 카드
        expect(card.classList.contains('stat-card-attn')).toBe(true);
        expect(desc.textContent).toContain('학습 계획의 시작점');
        // 설정 CTA는 "오늘 할 일" 큐의 goal 항목이 단독 소유 — 카드는 안내 문구만 (중복 버튼 방지)
        expect(desc.querySelector('.dday-set-btn')).toBeNull();
        renderDashboard();
        const dashboardCtas = [...document.querySelectorAll('#dashboard-view [data-click="openGoalSettings"]')];
        expect(dashboardCtas).toHaveLength(1);
        expect(el('weak-subject-recommendation').textContent).toContain('시험일 설정');

        // 시험일 설정 후 강조 해제
        setExamDate(todayPlus(30));
        updateGlobalStats();
        expect(card.classList.contains('stat-card-attn')).toBe(false);
    });

    it('시험일 계획 등급 — tight·triage 시 역산 안내 문구 분기 (D-17)', () => {
        seedTwoSubjects(); // 카드 4장 전부 미암기
        setStudyGoals({ dailyCards: 1 });

        // D-2에 4장 남음 → 학습일 2일 ÷ 4장 = 학습일당 2장, 목표 1장 대비 ratio 2.0 → tight
        setExamDate(todayPlus(2));
        updateGlobalStats();
        const desc = el('exam-dday-count').closest('.stat-info').querySelector('.stat-desc');
        expect(el('exam-dday-count').textContent).toBe('D-2');
        expect(desc.textContent).toContain('학습일당 카드 2장');
        expect(desc.textContent).toContain('병행');

        // D-1에 4장 남음 → 학습일당 4장, ratio 4.0 → triage
        setExamDate(todayPlus(1));
        updateGlobalStats();
        expect(desc.textContent).toContain('학습일당 카드 4장');
        expect(desc.textContent).toContain('우선');
    });

    it('응시 3문 미만 → 정답률 추천 제외 (헷갈림 추천만)', () => {
        seedTwoSubjects();
        seedProgress({
            weak: ['subjb_card_1'],
            quizResults: {
                subja_quiz_1: { solved: true, correct: false }, // 2문만 응시 → 제외
                subja_quiz_2: { solved: true, correct: false },
            },
        });
        renderDashboard();

        const rec = el('weak-subject-recommendation').textContent;
        expect(rec).not.toContain('정답률 최저');
        expect(rec).toContain('과목2'); // 헷갈린 카드最多 추천은 유지
    });

    it('오늘 할 일 큐 — 복습 대기가 최상단, 번호 리스트·챌린지 항목 렌더 (TQ-01)', () => {
        seedTwoSubjects();
        seedProgress({
            weak: ['subjb_card_1'],
            memorized: ['subja_card_1'],
            quizResults: { subja_quiz_1: { solved: true, correct: true } },
        });
        // FSRS 복습 기한 도래 카드 시딩 (구 SM-2 레코드는 지연 변환됨)
        safeSetItem(STORAGE_KEYS.FC_SPACED_REPETITION,
            JSON.stringify({ subja_card_1: { nextReview: '2000-01-01' } }));
        // 시험일 미설정이면 goal 항목이 최우선으로 온다 — 이 테스트는 작업 항목 우선순위를 검증하므로 시험일을 시딩
        setExamDate(todayPlus(30));
        renderDashboard();

        const queue = el('weak-subject-recommendation');
        // 큐는 대시보드 최상단 액션 표면 — 데일리 챌린지·안내서 위젯 행보다 먼저 렌더되어야 한다 (첫 화면 위계)
        const widgetsRow = document.querySelector('.dashboard-widgets-row');
        expect(queue.compareDocumentPosition(widgetsRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const items = queue.querySelectorAll('ol.today-queue > li.tq-item');
        expect(items.length).toBeGreaterThan(0);
        // ① FSRS 복습 대기가 첫 항목 (TQ-01 우선순위)
        expect(items[0].textContent).toContain('복습 카드');
        expect(items[0].querySelector('.tq-num').textContent).toBe('1');
        // 번호가 1부터 순증
        items.forEach((li, i) => {
            expect(li.querySelector('.tq-num').textContent).toBe(String(i + 1));
        });
        // 오답 복습 + 미완료 일일 챌린지가 큐에 포함
        const text = queue.textContent;
        expect(text).toContain('복습 대기 1건');
        expect(text).toContain('일일 챌린지');
        // 모든 액션 버튼은 data-click 위임 스키마
        queue.querySelectorAll('button[data-click]').forEach(btn => {
            expect(btn.getAttribute('data-click').length).toBeGreaterThan(0);
        });
    });
});

describe('학습 진단 뷰 — 진단 요약 카드', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        state.wrongCauses = {};
        loadIndexHtml();
    });

    it('빈 데이터 → 분석 뷰 렌더 + 안내 카드 3종', () => {
        seedTwoSubjects();
        renderAnalysisView();

        // 과목 카드·히트맵은 analysis-view로 이동해도 ID 기반 렌더 유지
        expect(el('subject-cards-container').querySelectorAll('.subject-card').length).toBe(2);
        expect(el('subject-heatmap').querySelectorAll('.heatmap-cell').length).toBe(2);

        expect(el('analysis-wrong-cause').textContent).toContain('오답 패턴');
        expect(el('analysis-weak-statements').textContent).toContain('취약 진술');
        expect(el('analysis-study-rhythm').textContent).toContain('학습 리듬');
    });

    it('이번 주 주간 배분 카드 — 과목별 실적/배정 + 캘린더 링크 (SC-11)', () => {
        seedTwoSubjects();
        // 시험일 미설정 → 설정 유도 빈 상태 카드
        renderAnalysisView();
        let card = el('analysis-smart-plan');
        expect(card.textContent).toContain('시험일을 설정하면');
        expect(card.querySelector('[data-pro-feature="study_plan_pro"]')).not.toBeNull();

        // 시험일 설정 → 과목별 실적/배정 행 + 캘린더 딥링크
        setExamDate(todayPlus(60));
        renderAnalysisView();
        card = el('analysis-smart-plan');
        expect(card.textContent).toContain('이번 주 주간 배분');
        expect(card.textContent).toContain('과목1');
        expect(card.textContent).toMatch(/과목1.*\d+\/\d+장/s);
        const calBtn = card.querySelector('[data-click="switchView"][data-arg="calendar-view"]');
        expect(calBtn).not.toBeNull();
    });

    it('칩 이유 버튼 → gotoSubjectAnalysis 과목 카드 강조 (SC-11)', async () => {
        seedTwoSubjects();
        renderAnalysisView();
        expect(el('subj-card-subja')).not.toBeNull(); // 과목 카드 앵커 id

        // 뷰 전환 위임은 delegation-guard가 정적 검증 — 여기서는 앵커 강조만 본다
        gotoSubjectAnalysis('subja');
        await flushAsync(80);
        expect(el('subj-card-subja').classList.contains('subj-card-flash')).toBe(true);
    });

    it('합격 갭 미달 → 일일 목표 상향 권고 + 설정 버튼 (SC-14)', () => {
        seedTwoSubjects();
        // 예상 점수 40 — 합격선(평균 60) 미만 → gap = 20
        localStorage.setItem(scopedKey(STORAGE_KEYS.SIM_RESULTS_HISTORY), JSON.stringify([
            { date: '2026-10-01', examId: 'x', rate: 40, subjectRates: { subja: 40, subjb: 40 } },
        ]));
        // 잔여 4장 ÷ 학습일 1일(D-1, 주5일) = perStudyDay 4 > 일일 목표 1 → 권장치 제시
        setStudyGoals({ dailyCards: 1 });
        setExamDate(todayPlus(1));
        renderAnalysisView();

        const card = el('analysis-pass-gap');
        expect(card.textContent).toContain('합격선');
        expect(card.textContent).toContain('미달');
        expect(card.textContent).toContain('1→4장');
        // 과목 순위 행 — 최우선 외 2위 과목도 노출 (D-5 플랜의 순위 확인 동선)
        expect(card.textContent).toContain('최우선 보강');
        expect(card.textContent).toContain('2위 subjb');
        expect(card.querySelector('[data-click="openGoalSettings"]')).not.toBeNull();
    });

    it('오답 원인 태그 → 분포와 권장 학습법 표시', () => {
        seedTwoSubjects();
        state.wrongCauses = {
            subja_quiz_1: { cause: 'memorize', ts: Date.now(), subjectId: 'subja' },
            subja_quiz_2: { cause: 'memorize', ts: Date.now(), subjectId: 'subja' },
            subjb_quiz_1: { cause: 'calc', ts: Date.now(), subjectId: 'subjb' },
        };
        renderAnalysisView();

        const card = el('analysis-wrong-cause').textContent;
        expect(card).toContain('암기 부족');
        expect(card).toContain('3건');
        expect(card).toContain('플래시카드');
    });
});
