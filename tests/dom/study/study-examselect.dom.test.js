// tests/dom/study-examselect.dom.test.js — 시험 선택 뷰 시나리오
// @spec ES-01~03,ES-06,ES-07
// 설계: docs/dev/design/DOM_TEST_DESIGN.md §5.2 (Phase 5)
// 검증: EXAMS_LIST→카드 렌더·현재 시험 표시(H) · 다른 시험 선택→저장·리로드(P)
//       · 같은 시험 선택→대시보드 복귀(H) · 목록 비어있음(E)

import { describe, it, beforeEach, expect, vi } from 'vitest';

import { loadIndexHtml, el } from '../helpers.js';
import { renderExamSelect, selectExamAction, summarizeExamProgress, showExamSelect, resetExamSelection } from '../../../src/views/exam-select.js';

const EXAMS = {
    exams: [
        { id: 'cosmetic', name: '맞춤형화장품 조제관리사', desc: '기본 시험', icon: 'fa-solid fa-flask', year: '2026', default: true, contentStamp: 'aaa111' },
        { id: 'other', name: '다른 시험', desc: '보조 시험', icon: 'fa-solid fa-book', year: '2026', contentStamp: 'bbb222' },
        { id: 'soon', name: '준비중 시험', desc: '아직 미개방', icon: 'fa-solid fa-hourglass', year: '2027', comingSoon: true },
    ],
};

describe('시험 선택 — 목록·전환·복귀', () => {
    beforeEach(() => {
        localStorage.clear();
        loadIndexHtml();
        window.EXAMS_LIST = EXAMS;
        vi.clearAllMocks();
    });

    it('목록 렌더 → 시험 카드 3장 + 명시 선택 시험만 현재 표시', () => {
        localStorage.setItem('current_exam', 'cosmetic');
        renderExamSelect();

        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        expect(cards.length).toBe(3);
        expect(cards[0].textContent).toContain('맞춤형화장품 조제관리사');
        expect(cards[0].classList.contains('current')).toBe(true);
        expect(cards[0].textContent).toContain('현재 시험');
        expect(cards[1].classList.contains('current')).toBe(false);
    });

    it('미선택 상태 → 어떤 카드도 현재로 표시되지 않음 (기본 시험 폴백 금지)', () => {
        renderExamSelect();

        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        expect(cards.length).toBe(3);
        cards.forEach(c => {
            expect(c.classList.contains('current')).toBe(false);
            expect(c.textContent).not.toContain('현재 시험');
        });
    });

    it('선택 해제 → current_exam 제거 + 모든 카드 비선택 표시', () => {
        localStorage.setItem('current_exam', 'cosmetic');
        renderExamSelect();
        expect(el('exam-select-list').querySelector('.exam-select-card.current')).not.toBeNull();

        resetExamSelection();

        expect(localStorage.getItem('current_exam')).toBeNull();
        expect(el('exam-select-list').querySelector('.exam-select-card.current')).toBeNull();
    });

    it('다른 시험 선택 → current_exam 저장 + 리로드 트리거(P)', () => {
        renderExamSelect();
        // jsdom에서 location.reload는 미구현 — 호출 시도만으로 selectExam이 true 반환
        selectExamAction('other');

        expect(localStorage.getItem('current_exam')).toBe('other');
        // 리로드 경로 → switchView 미호출 (dashboard는 index.html 기본 active이므로 사전에 제거 후 검증)
        el('dashboard-view').classList.remove('active');
        selectExamAction('other');
        expect(el('dashboard-view').classList.contains('active')).toBe(false);
    });

    it('미선택 상태에서 기본 시험 선택 → current_exam 저장 + 리로드 (브랜딩 갱신)', () => {
        // 회귀: current_exam 미설정 시 getActiveExamId()가 기본 시험으로 폴백해
        // "같은 시험"으로 오인 → 저장 생략 → 매번 피커가 뜨던 버그
        renderExamSelect();
        el('dashboard-view').classList.remove('active');
        selectExamAction('cosmetic');

        expect(localStorage.getItem('current_exam')).toBe('cosmetic');
        // 첫 명시 선택은 브랜딩·타이틀 전체 갱신을 위해 리로드 — 뷰 전환은 리로드 후 부팅이 담당
        expect(el('dashboard-view').classList.contains('active')).toBe(false);
    });

    it('같은 시험 선택 → 리로드 없이 대시보드로 복귀 (H)', () => {
        localStorage.setItem('current_exam', 'cosmetic');
        renderExamSelect();

        selectExamAction('cosmetic');

        expect(el('dashboard-view').classList.contains('active')).toBe(true);
    });

    it('준비중 시험 선택 → 알림 모달 표시, 전환·저장 없음 (H)', () => {
        renderExamSelect();

        // 카드에 준비중 배지 + 비활성 표시
        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        const soonCard = cards[2];
        expect(soonCard.classList.contains('coming-soon')).toBe(true);
        expect(soonCard.textContent).toContain('준비중');
        expect(soonCard.getAttribute('aria-disabled')).toBe('true');

        el('dashboard-view').classList.remove('active');
        selectExamAction('soon');

        // 저장·전환 없이 알림 모달만 표시
        expect(localStorage.getItem('current_exam')).toBeNull();
        expect(el('dashboard-view').classList.contains('active')).toBe(false);
        const overlay = document.getElementById('app-confirm-overlay');
        expect(overlay).toBeTruthy();
        expect(overlay.textContent).toContain('준비 중');
        overlay.remove();
    });

    it('목록 없음 → 안내 문구 (E)', () => {
        delete window.EXAMS_LIST;
        renderExamSelect();
        expect(el('exam-select-list').textContent).toContain('등록된 시험이 없습니다');
    });

    // ES-06 — 카드 진도 요약
    it('진도 요약: 카드에 외운 카드·퀴즈 정답률·최근 학습일·D-day 표시, 준비중 카드는 제외', () => {
        localStorage.setItem('other:fc_memorized', JSON.stringify(['c1', 'c2', 'c3']));
        localStorage.setItem('other:quiz_results', JSON.stringify({ q1: { correct: true }, q2: { correct: false }, q3: { correct: true }, q4: { correct: true } }));
        localStorage.setItem('other:study_calendar', JSON.stringify({ '2026-10-20': { cards: 2 }, '2026-10-22': { cards: 1 } }));
        localStorage.setItem('other:exam_date', '2027-01-01');
        renderExamSelect();

        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        const otherCard = cards[1];
        expect(otherCard.textContent).toContain('외운 카드 3');
        expect(otherCard.textContent).toContain('퀴즈 4문 · 75%');
        expect(otherCard.textContent).toContain('최근 학습 10/22');
        expect(otherCard.querySelector('.exam-select-dday')).toBeTruthy();
        // 준비중 카드는 요약 없음
        expect(cards[2].querySelector('.exam-select-stats')).toBeNull();
    });

    it('진도 요약: 학습 기록 없는 시험은 빈 상태 문구', () => {
        renderExamSelect();
        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        expect(cards[0].textContent).toContain('학습 기록이 없습니다');
    });

    it('진도 요약: 손상된 저장값은 무시하고 집계 (E)', () => {
        localStorage.setItem('other:fc_memorized', 'not-json{');
        localStorage.setItem('other:quiz_results', '["x"]');
        renderExamSelect();
        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        expect(cards[1].textContent).toContain('학습 기록이 없습니다');
    });

    it('ES-07 — 스탬프 불일치 시험은 갱신됨 배지, 맵에 없는 시험은 신규 배지', () => {
        localStorage.setItem('exam_stamp_seen', JSON.stringify({ cosmetic: 'aaa111', other: 'stale-old' }));
        renderExamSelect();
        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        // other: 확인 스탬프와 현재 스탬프가 다름 → 갱신됨
        expect(cards[1].querySelector('.exam-select-change:not(.is-new)')).toBeTruthy();
        expect(cards[1].querySelector('.exam-select-change').textContent).toContain('갱신됨');
        // cosmetic: 현재 시험이므로 방문 처리 → 배지 없음
        expect(cards[0].querySelector('.exam-select-change')).toBeNull();
        // 새로 등장한 시험(맵에 미등록) → 신규
        const exams4 = JSON.parse(JSON.stringify(EXAMS));
        exams4.exams.push({ id: 'fresh', name: '새 시험', desc: 'd', contentStamp: 'ccc333' });
        window.EXAMS_LIST = exams4;
        renderExamSelect();
        const freshCard = el('exam-select-list').querySelectorAll('.exam-select-card')[3];
        expect(freshCard.querySelector('.exam-select-change.is-new')).toBeTruthy();
        expect(freshCard.querySelector('.is-new').textContent).toContain('신규');
    });

    it('ES-07 — 최초 실행(맵 비어있음)은 배지 없이 전체 시딩', () => {
        renderExamSelect();
        const cards = el('exam-select-list').querySelectorAll('.exam-select-card');
        expect(cards[0].querySelector('.exam-select-change')).toBeNull();
        expect(cards[1].querySelector('.exam-select-change')).toBeNull();
        const seen = JSON.parse(localStorage.getItem('exam_stamp_seen'));
        expect(seen.other).toBe('bbb222');
    });

    it('summarizeExamProgress — 순수 집계 로직 (D-day·정답률·빈 입력)', () => {
        const s = summarizeExamProgress({
            memorizedJson: '["a","b"]',
            quizJson: '{"q1":{"correct":true},"q2":{"correct":false}}',
            calendarJson: '{"2026-01-02":{}}',
            examDate: '2026-01-12',
            today: '2026-01-10',
        });
        expect(s.cards).toBe(2);
        expect(s.solved).toBe(2);
        expect(s.accuracy).toBe(50);
        expect(s.lastStudy).toBe('2026-01-02');
        expect(s.dday).toBe(2);
        // 빈 입력
        const empty = summarizeExamProgress({ today: '2026-01-10' });
        expect(empty.cards).toBe(0);
        expect(empty.accuracy).toBeNull();
        expect(empty.dday).toBeNull();
    });

    it('showExamSelect — 시험 피커 뷰로 전환 위임', () => {
        expect(() => showExamSelect()).not.toThrow();
        const view = document.getElementById('exam-select-view');
        expect(view).toBeTruthy();
    });
});
