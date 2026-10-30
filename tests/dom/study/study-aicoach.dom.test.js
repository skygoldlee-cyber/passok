// tests/dom/study/study-aicoach.dom.test.js — 학습 진단 AI 코칭 시나리오
// @spec AI-33, AI-35, AI-36
// 설계: docs/dev/design/AI_COACH_DESIGN.md §5 단계 3·6
// 검증: 리듬 카드 AI 버튼 노출(E), 주간 코칭 성공 렌더(H),
//       플랜 조정 여유 선택지 반영(H), 교재 질의 근거+인용 표시(H)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

let session = null;
const authStub = {
    getSession: vi.fn(async () => ({ data: { session } })),
};
window.supabase = { createClient: vi.fn(() => ({ auth: authStub })) };

import {
    loadIndexHtml, el,
    seedStudyData, resetStudyState, stubRegistry, waitFor,
} from '../helpers.js';
import {
    renderAnalysisView, requestAiCoach, requestAiPlanAdjust, askTextbookQA,
} from '../../../src/views/analysis-view.js';
import { SemanticIndex } from '../../../src/search/semantic-index.js';
import { clearAiKey } from '../../../src/written/written-grading.js';

const SUBJ = {
    key: 'subj1', name: '과목1',
    cards: [{ front: '앞면', back: '뒷면' }],
    quizzes: [{ id: 'subj1_quiz_1', type: 'choice', question: '문항?', choices: ['A', 'B'], answer: 0 }],
};

const fetchStub = (payload, status = 200) => vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
}));

const rhythm = () => el('analysis-study-rhythm');

async function setupView() {
    seedStudyData(SUBJ.key, SUBJ);
    stubRegistry([SUBJ]);
    renderAnalysisView();
    await waitFor(() => rhythm() && rhythm().querySelector('.ai-coach-btn') !== null);
}

describe('학습 진단 AI 코칭 (AI-33/35/36)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        vi.clearAllMocks();
        session = null;
        clearAiKey();
        vi.spyOn(SemanticIndex, 'isEnabled').mockReturnValue(false);
        vi.spyOn(SemanticIndex, 'ensureLoaded').mockResolvedValue(false);
    });

    it('로그인 시 AI 코칭 버튼 노출, 미로그인 시 은닉', async () => {
        await setupView();
        await waitFor(() => true, 100); // aiFeedbackAvailable settle
        const coach = rhythm().querySelector('.ai-coach-btn');
        const plan = rhythm().querySelector('.ai-plan-adjust');
        expect(coach.classList.contains('is-hidden')).toBe(true);
        expect(plan.classList.contains('is-hidden')).toBe(true);

        session = { access_token: 'tok' };
        renderAnalysisView();
        // 재렌더로 요소가 교체되므로 새로 쿼리
        await waitFor(() => !rhythm().querySelector('.ai-coach-btn').classList.contains('is-hidden'));
        expect(rhythm().querySelector('.ai-plan-adjust').classList.contains('is-hidden')).toBe(false);
    });

    it('AI 주간 코칭 — 서버 성공 시 해석 문장 + AI 생성 배지 (AI-33)', async () => {
        session = { access_token: 'tok' };
        await setupView();
        vi.stubGlobal('fetch', fetchStub({ ok: true, explain: '정답률이 상승 중입니다. 취약 단원을 유지하세요.', remaining: 4 }));
        await requestAiCoach();
        const slot = rhythm().querySelector('.ai-coach-slot');
        expect(slot.querySelector('.ai-feedback-text').textContent).toContain('정답률이 상승');
        expect(slot.querySelector('.ai-badge')).not.toBeNull();
        vi.unstubAllGlobals();
    });

    it('AI 플랜 조정 — 여유 선택지가 요청에 반영되고 조언 표시 (AI-35)', async () => {
        session = { access_token: 'tok' };
        await setupView();
        let sent;
        vi.stubGlobal('fetch', vi.fn(async (u, init) => {
            sent = JSON.parse(init.body);
            return { ok: true, status: 200, json: async () => ({ ok: true, explain: '배분을 늘리세요.', remaining: 3 }) };
        }));
        el('ai-bandwidth-sel').value = '부족';
        await requestAiPlanAdjust();
        expect(sent.kind).toBe('plan_adjust');
        expect(sent.input.bandwidth).toBe('부족');
        const slot = rhythm().querySelector('.ai-coach-slot');
        expect(slot.querySelector('.ai-feedback-text').textContent).toContain('배분을 늘리세요');
        vi.unstubAllGlobals();
    });

    it('교재에 물어보기 — 임베딩 근거 스니펫 기반 답변 + 인용 표시 (AI-36)', async () => {
        session = { access_token: 'tok' };
        SemanticIndex.isEnabled.mockReturnValue(true);
        SemanticIndex.ensureLoaded.mockResolvedValue(true);
        vi.spyOn(SemanticIndex, 'searchByText').mockReturnValue([
            { key: 'stmt:s1', score: 0.9, text: '계면활성제는 두 가지 기원으로 나뉜다', anchorKey: 'stmt:s1', anchorText: '' },
        ]);
        await setupView();
        await waitFor(() => !rhythm().querySelector('.ai-qa-wrap').classList.contains('is-hidden'));

        vi.stubGlobal('fetch', fetchStub({ ok: true, answer: '근거에 따르면 두 기원으로 나뉩니다.', citations: ['1'], remaining: 2 }));
        el('ai-qa-input').value = '계면활성제란?';
        await askTextbookQA();
        const slot = rhythm().querySelector('.ai-qa-slot');
        expect(slot.querySelector('.ai-feedback-text').textContent).toContain('두 기원');
        expect(slot.querySelector('.ai-qa-cite').textContent).toContain('계면활성제는');
        expect(slot.querySelector('.ai-badge')).not.toBeNull();
        vi.unstubAllGlobals();
    });

    it('교재에 물어보기 — 근거 검색 실패 시 안내 후 조기 종료 (AI-36)', async () => {
        session = { access_token: 'tok' };
        SemanticIndex.isEnabled.mockReturnValue(true);
        SemanticIndex.ensureLoaded.mockResolvedValue(true);
        vi.spyOn(SemanticIndex, 'searchByText').mockReturnValue([]);
        await setupView();
        el('ai-qa-input').value = '알 수 없는 질문';
        await askTextbookQA();
        const slot = rhythm().querySelector('.ai-qa-slot');
        expect(slot.querySelector('.ai-feedback-error').textContent).toContain('검색 근거를 찾지 못했습니다');
    });
});
