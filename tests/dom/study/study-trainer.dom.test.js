// tests/dom/study-trainer.dom.test.js — 훈련소 시나리오
// @spec T-01~05,UX-NAV-14
// 설계: docs/dev/design/DOM_TEST_DESIGN.md §5.2 (Phase 4)
// 검증: 메뉴/서브뷰 전이(R) · 수치 훈련 채점(H) · 계산 연습 정답/오답/비수치(X)
//       · 원료 챌린지 객관식(H/B) — 취약 진술 리뷰는 study-review.dom.test.js (RV-02)
// 스크래치패드는 jsdom canvas 미지원으로 모킹

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', async (importOriginal) => ({
    ...await importOriginal(),
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));
vi.mock('../../../src/scratchpad.js', () => ({
    clearScratchpad: vi.fn(),
    initScratchpad: vi.fn(),
    toggleCalcScratchpad: vi.fn(),
    toggleScratchpadEraser: vi.fn(),
    scratchpadUndo: vi.fn(),
}));

import { showToast } from '../../../src/ui-utils.js';
import {
    loadIndexHtml, el, isVisible, resetStudyState, storedJson,
} from '../helpers.js';
import { state } from '../../../src/state.js';
import {
    initTrainer, exitTrainerSubView,
    startLimitsTrainer, nextLimitsQuestion,
} from '../../../src/views/trainer.js';
import { startCalcPractice, submitCalcAnswer } from '../../../src/views/trainer-calc-practice.js';
import { startIngredientsChallenge } from '../../../src/exams/cosmetic/views/trainer-ingredients.js';
import { DataLoader } from '../../../src/data-loader.js';
import { openOxDrillSetup } from '../../../src/views/trainer-drills.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

describe('훈련소 — 수치·계산·원료', () => {
    // 선택지 버튼의 표시 문자열("<값><단위> 이하/이상")에서 원본 수치만 추출 —
    // '5'가 '50'·'0.5'에 부분문자열로 매칭되는 오선택을 방지 (flaky 원인)
    function limitsOptValue(btn, unit) {
        const t = btn.querySelector('.limits-opt-text').textContent.trim();
        return t.replace(/\s*(이하|이상)\s*$/, '').split(unit).join('').trim();
    }

    // 수치 훈련 데이터는 limits-trainer.json 콘텐츠 파일 — fetch 스텁으로 주입
    const LIMITS_FIXTURE = [
        { category: '보존제 사용한도', key: '테스트성분A', value: '1.0', unit: '%', condition: '최대 한도', explanation: '설명A' },
        { category: '안전성 기준', key: '테스트성분B', value: '20', unit: '㎍/g', condition: '허용 한도', explanation: '설명B' },
    ];

    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn((url) => {
            if (String(url).includes('limits-trainer.json')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(LIMITS_FIXTURE) });
            }
            return Promise.resolve({ ok: false, status: 404 });
        }));
    });

    it('initTrainer → 메뉴 표시 + 서브 패널 전부 숨김 (재진입 초기화)', async () => {
        // 먼저 서브뷰를 연 뒤 초기화
        await startLimitsTrainer();
        expect(isVisible('trainer-limits-panel')).toBe(true);

        initTrainer();
        expect(isVisible('trainer-menu-panel')).toBe(true);
        ['trainer-limits-panel', 'trainer-calc-panel', 'trainer-ingredients-panel',
            'trainer-oxdrill-panel', 'trainer-combo-panel']
            .forEach(id => expect(el(id).classList.contains('is-hidden')).toBe(true));
    });

    it('메뉴가 기출 드릴·암기/실무 2그룹으로 분리되고 기출 그룹이 상단에 온다 (UX-NAV-14)', () => {
        const groups = [...document.querySelectorAll('#trainer-menu-panel .trainer-menu-group')];
        expect(groups).toHaveLength(2);
        const [drill, practical] = groups.map(g => g.querySelector('.trainer-group-label').textContent);
        expect(drill).toContain('기출 드릴');
        expect(practical).toContain('암기');

        const cardClicks = g => [...g.querySelectorAll('.trainer-menu-card')].map(c => c.dataset.click);
        expect(cardClicks(groups[0])).toEqual(['openOxDrillSetup', 'openComboDrillSetup']);
        expect(cardClicks(groups[1])).toEqual(['startLimitsTrainer', 'startIngredientsChallenge', 'startCalcPractice']);
        // 배지·feature 게이트 속성은 그룹 이동과 무관하게 유지
        expect(groups[0].querySelector('#oxdrill-due-badge')).not.toBeNull();
        expect(groups[0].querySelector('[data-pro-feature="combo_drill"]')).not.toBeNull();
    });

    it('수치 훈련 → 문제·4지선다 렌더, 정답 클릭 → 정답 피드백', async () => {
        await startLimitsTrainer();

        const cur = state.trainer.limits.shuffledData[0];
        expect(el('limits-progress-indicator').textContent).toContain('1 /');
        expect(el('limits-q-category').textContent).toBe(cur.category);
        expect(el('limits-question-text').innerHTML).toContain(cur.key);

        const opts = el('limits-options-container').querySelectorAll('.limits-opt-btn');
        expect(opts.length).toBe(4);

        // 정답 수치와 정확히 일치하는 버튼을 찾아 클릭
        const correctBtn = [...opts].find(b => limitsOptValue(b, cur.unit) === cur.value);
        correctBtn.click();

        expect(state.trainer.limits.correctCount).toBe(1);
        expect(el('limits-feedback-title').textContent).toBe('정답입니다!');
        expect(isVisible('limits-feedback-panel')).toBe(true);
        expect(isVisible('next-limits-btn')).toBe(true);
        opts.forEach(b => expect(b.disabled).toBe(true));
    });

    it('수치 훈련 오답 → incorrect 표시 + 정답 하이라이트 + solvedList 기록', async () => {
        await startLimitsTrainer();
        const cur = state.trainer.limits.shuffledData[0];
        const opts = el('limits-options-container').querySelectorAll('.limits-opt-btn');
        const wrongBtn = [...opts].find(b => limitsOptValue(b, cur.unit) !== cur.value);
        wrongBtn.click();

        expect(state.trainer.limits.correctCount).toBe(0);
        expect(el('limits-feedback-panel').classList.contains('incorrect')).toBe(true);
        expect(el('limits-feedback-title').textContent).toContain('오답입니다');
        expect(el('limits-feedback-desc').textContent).toBe(cur.explanation);
        expect(state.trainer.limits.solvedList.length).toBe(1);
        expect(state.trainer.limits.solvedList[0].correct).toBe(false);
    });

    it('수치 훈련 완주 → 결과 화면(훈련 완료·정답률)', async () => {
        await startLimitsTrainer();
        const total = state.trainer.limits.shuffledData.length;
        for (let i = 0; i < total; i++) nextLimitsQuestion();

        expect(el('trainer-limits-panel').textContent).toContain('훈련 완료');
        expect(el('trainer-limits-panel').textContent).toContain(`0 / ${total}`);
    });

    it('계산 연습 → 문제 렌더 + 정답 제출 → 피드백·이력 영속', () => {
        startCalcPractice();

        expect(isVisible('trainer-calc-panel')).toBe(true);
        const q = state.trainer.calc.currentQuestion;
        expect(q).not.toBeNull();
        expect(el('calc-question-text').innerHTML).not.toBe('');

        el('calc-answer-input').value = q.answer;
        submitCalcAnswer();

        expect(state.trainer.calc.correctCount).toBe(1);
        expect(el('calc-feedback-title').textContent).toBe('정답입니다!');
        expect(isVisible('calc-solution-panel')).toBe(true);
        expect(el('calc-answer-input').disabled).toBe(true);
        // 이력 저장
        const hist = storedJson(STORAGE_KEYS.CALC_HISTORY);
        expect(hist.length).toBe(1);
        expect(hist[0].isCorrect).toBe(true);
        expect(el('calc-history-list').textContent).toContain('정답');
    });

    it('계산 연습 오답 → 오답 피드백 + 이력에 오답 기록', () => {
        startCalcPractice();
        const q = state.trainer.calc.currentQuestion;

        el('calc-answer-input').value = String(parseFloat(q.answer) + 50);
        submitCalcAnswer();

        expect(state.trainer.calc.correctCount).toBe(0);
        expect(el('calc-feedback-panel').classList.contains('incorrect')).toBe(true);
        expect(el('calc-feedback-title').textContent).toContain('오답입니다');
        expect(storedJson(STORAGE_KEYS.CALC_HISTORY)[0].isCorrect).toBe(false);
    });

    it('계산 연습 비수치 입력 → 경고 토스트, 채점 미진행 (X)', () => {
        startCalcPractice();
        el('calc-answer-input').value = 'abc';
        submitCalcAnswer();

        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('숫자'), 'warning');
        expect(state.trainer.calc.totalSolved).toBe(0);
    });

    it('원료 챌린지 → 안전성 판별 객관식 렌더 + 정답 채점 (approved/banned만 시딩해 choice 확정)', async () => {
        // 지식DB 데이터셋은 registry.knowledge 스키마로 해석 — DataLoader 캐시에 직접 주입
        DataLoader._knowledge = { ingredients: [
            { name: '글리세린', engName: 'Glycerin', type: 'approved', category: '보습제' },
            { name: '금지원료X', engName: 'Banned X', type: 'banned', category: '금지' },
        ] };
        await startIngredientsChallenge();

        expect(isVisible('trainer-ingredients-panel')).toBe(true);
        const qs = state.trainer.ingredients.shuffledQuestions;
        expect(qs.length).toBe(2);
        // approved/banned 원료는 모두 choice 문항으로 생성됨
        qs.forEach(q => expect(q.type).toBe('choice'));

        const cur = qs[0];
        const opts = el('ing-options-container').querySelectorAll('.limits-opt-btn');
        const correctBtn = [...opts].find(b => b.querySelector('.limits-opt-text').textContent === cur.correct);
        correctBtn.click();

        expect(state.trainer.ingredients.correctCount).toBe(1);
        expect(el('ing-feedback-title').textContent).toContain('정답');
    });

    it('지식DB 없음 → 경고 토스트 + 메뉴 유지, 크래시 없음 (E/X)', async () => {
        DataLoader._knowledge = {}; // loadDictionary가 빈 결과 반환하도록 캐시만 비움
        await startIngredientsChallenge();
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('지식 데이터'), 'warning');
        expect(state.trainer.ingredients.shuffledQuestions.length).toBe(0);
        expect(el('trainer-menu-panel').classList.contains('is-hidden')).toBe(false);
    });

    // 취약 진술 리뷰 테스트는 복습 뷰 이관과 함께
    // tests/dom/study-review.dom.test.js로 이동했다 (RV-02).

    it('exitTrainerSubView → 메뉴 복귀', () => {
        startCalcPractice();
        expect(isVisible('trainer-calc-panel')).toBe(true);
        exitTrainerSubView();
        expect(isVisible('trainer-menu-panel')).toBe(true);
        expect(el('trainer-calc-panel').classList.contains('is-hidden')).toBe(true);
    });

    // UX-NAV-07 — 인트라뷰 서브패널 전환 시 .main-content 스크롤 리셋
    // (공유 컨테이너라 이전 화면의 scrollTop이 잔류하면 새 화면 상단이 잘림)
    it('스크롤 잔류 상태에서 서브패널 전환 → 맨 위로 리셋', async () => {
        const mc = document.querySelector('.main-content');

        mc.scrollTop = 400;
        await startLimitsTrainer();
        expect(mc.scrollTop).toBe(0);

        mc.scrollTop = 400;
        startCalcPractice();
        expect(mc.scrollTop).toBe(0);

        mc.scrollTop = 400;
        openOxDrillSetup();
        expect(mc.scrollTop).toBe(0);

        // 서브패널 → 메뉴 복귀도 리셋
        mc.scrollTop = 400;
        initTrainer();
        expect(mc.scrollTop).toBe(0);
    });

    it('limits 문항 진행 중 스크롤 잔류 → 다음 문항/결과 진입 시 리셋', async () => {
        const mc = document.querySelector('.main-content');
        await startLimitsTrainer();

        mc.scrollTop = 300;
        nextLimitsQuestion();
        expect(mc.scrollTop).toBe(0);

        // 완주 → 결과 화면(innerHTML 교체)도 리셋
        mc.scrollTop = 300;
        const total = state.trainer.limits.shuffledData.length;
        for (let i = state.trainer.limits.currentIndex; i < total; i++) nextLimitsQuestion();
        expect(el('trainer-limits-panel').textContent).toContain('훈련 완료');
        expect(mc.scrollTop).toBe(0);
    });
});
