// tests/dom/study-review.dom.test.js — 복습 허브: 오답 카드 + 취약 진술 리뷰
// @spec RV-01,RV-02,RV-03,RV-04,UX-NAV-13
// RV-02로 취약 진술 리뷰가 훈련소 서브패널에서 복습 뷰 <details> 섹션으로 이관됐다.
// 드릴 실행은 훈련소에 잔류 — gotoOxDrill 딥링크가 뷰 전환 후 드릴을 시작한다 (RV-03).
// switchView만 부분 모킹 — jsdom에 라우터가 없어 nav-item click이 no-op이므로
// 실제 뷰 전환과 같은 최소 상태(currentView + .active)를 재현한다.

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        showToast: vi.fn(),
        showConfirm: vi.fn(() => Promise.resolve(true)),
        showGlobalLoading: vi.fn(),
        hideGlobalLoading: vi.fn(),
        vibrate: vi.fn(),
        trapFocus: vi.fn(() => () => {}),
    };
});
vi.mock('../../../src/study/scratchpad.js', () => ({
    clearScratchpad: vi.fn(),
    initScratchpad: vi.fn(),
    toggleCalcScratchpad: vi.fn(),
    toggleScratchpadEraser: vi.fn(),
    scratchpadUndo: vi.fn(),
}));
vi.mock('../../../src/views/navigation.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        switchView: vi.fn((target) => {
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(target)?.classList.add('active');
            applyCurrentView(target);
        }),
    };
});
// vi.mock 팩토리는 import보다 먼저 평가되므로 state 참조는 호출 시점의 동적 import로 지연 해석
function applyCurrentView(target) {
    import('../../../src/state.js').then(m => { m.state.currentView = target; });
}

import { switchView } from '../../../src/views/navigation.js';
import {
    loadIndexHtml, el, isVisible, resetStudyState, flushAsync,
} from '../helpers.js';
import { state } from '../../../src/state.js';
import { DataLoader } from '../../../src/content/data-loader.js';
import {
    openWeakReview, gotoWeakReview, gotoOxDrill, renderWeakReview,
    setWeakFilter, toggleSimilarStmts,
} from '../../../src/views/trainer-drills.js';
import { initTrainer } from '../../../src/views/trainer.js';
import { SemanticIndex } from '../../../src/search/semantic-index.js';
import { recordStatementJudgments } from '../../../src/study/statement-tracker.js';
import { safeSetItem } from '../../../src/state.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

const OX_ITEMS = [
    { type: 'ox', sid: 'law_1', context: '법규·제3조', stem: '판정하세요', statement: '진술A는 옳다', truth: true, explain: 'A 해설' },
    { type: 'ox', sid: 'law_2', context: '법규·제4조', stem: '', statement: '진술B는 틀리다', truth: false, explain: 'B 해설' },
];

function stubDrillData() {
    DataLoader.registry = {
        subjects: [
            { key: 'law', name: '화장품법규', shortName: '법규', order: 1 },
            { key: 'manu', name: '화장품제조', shortName: '제조', order: 2 },
        ],
        exams: [],
    };
    DataLoader._loadedDrills.subject1 = OX_ITEMS;
    DataLoader._loadedDrills.subject2 = [];
}

describe('복습 뷰 — 취약 진술 리뷰 (RV-02)', () => {
    it('학습 루프 경계 문구 — 4개 뷰에 .view-purpose 표기 (UX-NAV-13·RV-04)', () => {
        loadIndexHtml();
        const map = {
            'quiz-view': '단원별 연습',
            'exam-view': '실전 평가',
            'trainer-view': '반복 훈련',
            'review-view': '틀린·약한 것',
        };
        for (const [viewId, frag] of Object.entries(map)) {
            const node = el(viewId)?.querySelector('.view-purpose');
            expect(node, viewId).not.toBeNull();
            expect(node.textContent).toContain(frag);
        }
    });

    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        vi.clearAllMocks();
        stubDrillData();
        state.currentView = 'review-view';
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        el('review-view').classList.add('active');
    });

    it('openWeakReview → 취약 진술 섹션 펼침 + 오판 진술 렌더·필터 전환', () => {
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: '취약 진술 본문', truth: true },
            { sid: 'law_1', judgedCorrect: false },
            { sid: 'law_2', judgedCorrect: false, text: '다른 진술', truth: false },
        ]);
        safeSetItem(STORAGE_KEYS.FC_SPACED_REPETITION,
            JSON.stringify({ law_1: { nextReview: '2000-01-01' } }));

        // 섹션을 접어둔 상태에서 열면 다시 펼쳐진다
        el('review-weak-panel').open = false;
        openWeakReview();

        expect(el('review-weak-panel').open).toBe(true);
        expect(el('weak-summary').textContent).toContain('취약 진술 2개');
        expect(el('weak-summary').textContent).toContain('복습 대상 1개');

        const rows = el('weak-list').querySelectorAll('.weak-row');
        expect(rows.length).toBe(2);
        expect(rows[0].innerHTML).toContain('오판 2회'); // w 내림차순
        expect(rows[0].innerHTML).toContain('과목1'); // sid 'law_' → 과목 키 해석
        expect(rows[0].innerHTML).toContain('복습 대상');
        expect(rows[0].innerHTML).toContain('취약 진술 본문');

        // 'due' 필터 → 복습 대상만
        setWeakFilter('due');
        expect(el('weak-list').querySelectorAll('.weak-row').length).toBe(1);
        setWeakFilter('all');
        expect(el('weak-list').querySelectorAll('.weak-row').length).toBe(2);
    });

    it('다른 뷰에서 gotoWeakReview → 복습 뷰 전환 + 섹션 펼침', () => {
        state.currentView = 'dashboard-view';
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: '취약 진술', truth: true },
        ]);

        gotoWeakReview();

        expect(switchView).toHaveBeenCalledWith('review-view', { scrollTop: true });
        expect(el('review-weak-panel').open).toBe(true);
        expect(el('weak-list').querySelectorAll('.weak-row').length).toBe(1);
    });

    it('취약 리뷰 — 기록 없으면 빈 상태 안내', () => {
        openWeakReview();
        expect(el('weak-summary').textContent).toContain('오판 이력이 없습니다');
        expect(el('weak-list').textContent).toContain('취약 진술이 없습니다');
    });

    it('레거시 #/trainer/weak 해시 → 복습 뷰로 리다이렉트 + URL 정규화', () => {
        history.replaceState(null, '', '#/trainer/weak');
        state.currentView = 'trainer-view';

        initTrainer();

        expect(switchView).toHaveBeenCalledWith('review-view', { scrollTop: true });
        expect(location.hash).toBe('#/review');
        expect(el('review-weak-panel').open).toBe(true);
    });

    it('과목별 마스터리 셀 렌더 — 판정·취약·졸업 집계', () => {
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: 't1', truth: true },
            { sid: 'law_2', judgedCorrect: true, text: 't2', truth: true },
            { sid: 'law_2', judgedCorrect: true },
            { sid: 'law_2', judgedCorrect: true },
        ]);
        openWeakReview();
        const cells = el('weak-mastery').querySelectorAll('.weak-mastery-cell');
        expect(cells.length).toBeGreaterThan(0);
        expect(el('weak-mastery').textContent).toContain('과목1');
        expect(el('weak-mastery').textContent).toContain('판정');
    });
});

describe('복습 뷰 — weak 드릴 원클릭 진입 (RV-03)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        vi.clearAllMocks();
        stubDrillData();
        state.currentView = 'review-view';
    });

    it('취약·복습 대상 있으면 헤더 CTA 노출 + 배지 수 표시', () => {
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: 't', truth: true },
        ]);
        renderWeakReview();

        const btn = el('start-weak-oxdrill-btn');
        expect(isVisible('start-weak-oxdrill-btn')).toBe(true);
        expect(btn.dataset.click).toBe('gotoOxDrill');
        expect(btn.dataset.arg).toBe('weak');
        expect(el('review-weak-badge').textContent).toContain('취약 1개');
    });

    it('대상 없으면 CTA·배지 숨김', () => {
        renderWeakReview();
        expect(el('start-weak-oxdrill-btn').classList.contains('is-hidden')).toBe(true);
        expect(el('review-weak-badge').classList.contains('is-hidden')).toBe(true);
    });

    it('gotoOxDrill(\'weak\') → 훈련 뷰 전환 후 취약 진술만 편성해 드릴 시작', async () => {
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: 't', truth: true },
        ]);

        gotoOxDrill('weak');
        await flushAsync();

        expect(switchView).toHaveBeenCalledWith('trainer-view', { scrollTop: true });
        expect(isVisible('trainer-oxdrill-panel')).toBe(true);
        // law_1만 취약 — law_2는 필터링으로 제외
        expect(state.trainer.oxdrill.data.length).toBe(1);
        expect(state.trainer.oxdrill.data[0].sid).toBe('law_1');
    });

    it('취약 리뷰 행의 재시도 버튼은 gotoOxDrill sid: 경로를 가리킨다', () => {
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: 't', truth: true },
        ]);
        openWeakReview();
        const retry = el('weak-list').querySelector('[data-click="gotoOxDrill"][data-arg="sid:law_1"]');
        expect(retry).not.toBeNull();
    });
});

// SEM-03,SEM-04 — 의미 유사 진술 토글: 피처 게이트·지연 로드·비활성 경로
describe('유사 진술 (SemanticIndex)', () => {
    const NB = {
        dim: 384, k: 8,
        adj: {
            'stmt:law_1': [['stmt:law_9', 0.92], ['q:q1', 0.80], ['stmt:law_8', 0.71]],
        },
        texts: {
            'stmt:law_9': '스쿠알렌 관련 진술',
            'stmt:law_8': '스핑고신 관련 진술',
            'q:q1': '관련 문항',
        },
        sameText: {},
    };
    let savedExams;
    let savedLoader;

    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        vi.clearAllMocks();
        state.currentView = 'review-view';
        savedExams = window.EXAMS_LIST;
        savedLoader = DataLoader.loadBundleScript;
        SemanticIndex._reset();
        window.EXAMS_LIST = {
            exams: [{ id: 'cosmetic', default: true, features: { semantic: true } }],
        };
        recordStatementJudgments([
            { sid: 'law_1', judgedCorrect: false, text: '취약 진술 본문', truth: true },
        ]);
    });
    afterEach(() => {
        window.EXAMS_LIST = savedExams;
        DataLoader.loadBundleScript = savedLoader;
        SemanticIndex._reset();
    });

    it('semantic 피처 시험에서만 유사 버튼 노출 — 미선언 시 숨김', () => {
        openWeakReview();
        expect(el('weak-list').querySelector('.weak-sim-btn')).not.toBeNull();
        expect(el('weak-sim-law_1')).not.toBeNull();

        window.EXAMS_LIST = { exams: [{ id: 'cosmetic', default: true, features: {} }] };
        openWeakReview();
        expect(el('weak-list').querySelector('.weak-sim-btn')).toBeNull();
    });

    it('토글 → 지연 로드 후 유사 진술 목록·유사도·재시도 버튼 렌더', async () => {
        DataLoader.loadBundleScript = vi.fn(async () => {
            window.EMB_NEIGHBORS = NB;
        });
        openWeakReview();
        await toggleSimilarStmts('law_1');
        await flushAsync();

        const box = el('weak-sim-law_1');
        expect(box.classList.contains('is-hidden')).toBe(false);
        const rows = box.querySelectorAll('.weak-sim-row');
        expect(rows.length).toBe(2);              // q: 항목은 제외
        expect(rows[0].textContent).toContain('92%');
        expect(rows[0].textContent).toContain('스쿠알렌');
        expect(box.querySelector('[data-click="gotoOxDrill"][data-arg="sid:law_9"]')).not.toBeNull();
        expect(DataLoader.loadBundleScript).toHaveBeenCalledTimes(1);

        // 재토글 → 접기
        await toggleSimilarStmts('law_1');
        expect(box.classList.contains('is-hidden')).toBe(true);
    });

    it('번들 부재 시 안내 문구만 표시 (에러 무전파)', async () => {
        DataLoader.loadBundleScript = vi.fn(async () => { throw new Error('404'); });
        openWeakReview();
        await toggleSimilarStmts('law_1');
        await flushAsync();
        expect(el('weak-sim-law_1').textContent).toContain('불러올 수 없습니다');
    });
});
