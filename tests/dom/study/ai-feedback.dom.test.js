// tests/dom/study/ai-feedback.dom.test.js — 퀴즈 오답 AI 해설 시나리오
// @spec AI-27, AI-29
// 설계: docs/dev/design/AI_COACH_DESIGN.md §3·§5 단계 1
// 검증: 미로그인 시 버튼 은닉(E), 쿼터 초과 시 에러 표시(E),
//       성공 시 해설+AI 생성 배지 인라인 렌더(H), BYOK 폴백 경로(H)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

// supabase-js 스텁 — session 변수로 로그인 상태를 제어 (common-auth 패턴).
// getSupabase()는 window.supabase가 있으면 vendor 로드를 건너뛴다.
let session = null;
const authStub = {
    getSession: vi.fn(async () => ({ data: { session } })),
};
window.supabase = { createClient: vi.fn(() => ({ auth: authStub })) };

import {
    loadIndexHtml, el,
    seedStudyData, resetStudyState, waitFor,
} from '../helpers.js';
import { state } from '../../../src/state.js';
import {
    startQuiz, renderQuizQuestion, submitQuizAnswer, nextQuizQuestion,
    requestAiFeedback,
} from '../../../src/views/quiz/quiz.js';
import { saveAiKey, clearAiKey } from '../../../src/written/written-grading.js';

const QUIZ = {
    id: 'subj1_quiz_1', type: 'short', category: '법령', context: '화장품법',
    question: '맞춤형화장품 [빈칸]를 두어야 한다.', answer: '조제관리사',
};

/** 오답 1문항을 풀고 결과 화면까지 진행 */
async function finishQuizWrong() {
    seedStudyData('subj1', { name: '과목1', quizzes: [QUIZ] });
    state.quiz.subject = 'subj1';
    startQuiz();
    state.quiz.data = [QUIZ];
    state.quiz.currentIndex = 0;
    renderQuizQuestion();
    el('quiz-answer-input').value = '판매관리사';
    submitQuizAnswer();
    nextQuizQuestion(); // → renderQuizResult
}

const fetchStub = (payload, status = 200) => vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
}));

describe('AI 오답 해설 (AI-27/29)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        vi.clearAllMocks();
        session = null;
        clearAiKey();
    });

    it('미로그인+BYOK 키 없음 → AI 해설 버튼 은닉', async () => {
        await finishQuizWrong();
        // 가용성 확인은 비동기 — settle 대기 후에도 버튼이 숨겨져 있어야 함
        await waitFor(() => el('quiz-review-list').querySelectorAll('.ai-feedback-btn:not(.is-hidden)').length > 0, 500);
        const btn = el('quiz-review-list').querySelector('.ai-feedback-btn');
        expect(btn).not.toBeNull();
        expect(btn.classList.contains('is-hidden')).toBe(true);
    });

    it('로그인 상태 → 버튼 노출, 쿼터 초과 시 에러 표시 + 버튼 비활성 유지', async () => {
        session = { access_token: 'tok' };
        await finishQuizWrong();
        const btn = el('quiz-review-list').querySelector('.ai-feedback-btn');
        await waitFor(() => !btn.classList.contains('is-hidden'));
        expect(btn.classList.contains('is-hidden')).toBe(false);

        vi.stubGlobal('fetch', fetchStub({ ok: false, code: 'quota', remaining: 0 }, 429));
        await requestAiFeedback('subj1_quiz_1');
        const slot = el('quiz-review-list').querySelector('.ai-feedback-slot');
        expect(slot.querySelector('.ai-feedback-error')).not.toBeNull();
        expect(slot.textContent).toContain('무료 AI 해설 횟수');
        expect(btn.disabled).toBe(true); // 쿼터 소진은 재시도 불가
        vi.unstubAllGlobals();
    });

    it('성공 경로 — 해설 + 혼동 개념 + AI 생성 배지 인라인 렌더', async () => {
        session = { access_token: 'tok' };
        await finishQuizWrong();
        vi.stubGlobal('fetch', fetchStub({
            ok: true, explain: '조제관리사 배치 의무 주체를 혼동했습니다.', confused_concept: '조제관리사', remaining: 9,
        }));
        await requestAiFeedback('subj1_quiz_1');
        const slot = el('quiz-review-list').querySelector('.ai-feedback-slot');
        expect(slot.textContent).toContain('조제관리사 배치 의무 주체를 혼동했습니다');
        expect(slot.textContent).toContain('조제관리사');
        expect(slot.querySelector('.ai-badge')?.textContent).toBe('AI 생성');
        vi.unstubAllGlobals();
    });

    it('BYOK 폴백 — 미로그인이어도 사용자 키가 있으면 직접 호출로 해설 표시', async () => {
        saveAiKey('sk-test');
        await finishQuizWrong();
        const btn = el('quiz-review-list').querySelector('.ai-feedback-btn');
        await waitFor(() => !btn.classList.contains('is-hidden'));
        expect(btn.classList.contains('is-hidden')).toBe(false);

        vi.stubGlobal('fetch', fetchStub({
            candidates: [{ content: { parts: [{ text: '{"explain":"책임판매업과 맞춤형판매업의 배치 의무를 혼동했습니다.","confused_concept":"조제관리사"}' }] } }],
        }));
        await requestAiFeedback('subj1_quiz_1');
        const slot = el('quiz-review-list').querySelector('.ai-feedback-slot');
        expect(slot.textContent).toContain('배치 의무를 혼동');
        expect(slot.querySelector('.ai-badge')).not.toBeNull();
        vi.unstubAllGlobals();
    });
});
