// tests/dom/study/study-mastery.dom.test.js — PassLoop 개념 숙련도 카드
// @spec AI-40
// 검증: 신호 부재 온보딩(E), 시드 신호 → subj:§N.M 개념 집계·등급 배지·
//       추천 행 + 개념 드릴·교재 딥링크(H), 과목 간 동일 §앵커 분리(H)

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
    loadIndexHtml, el, resetStudyState, stubRegistry,
} from '../helpers.js';
import { renderAnalysisView } from '../../../src/views/analysis-view.js';
import { DataLoader } from '../../../src/content/data-loader.js';
import { state, safeSetItem } from '../../../src/core/state.js';
import { STORAGE_KEYS } from '../../../src/core/storage-keys.js';

/** 문항→챕터 번들 스텁 — data/exams/<id>/question_chapters.js 동형 */
function stubQuestionChapters() {
    DataLoader._questionChapters = {
        questions: { subja_q1: '1. 주제A-1', subja_q2: '1. 주제A-1' },
        ranges: {
            subja: [[1, 'Chapter 01. 장A'], [10, '1. 주제A-1'], [50, '2. 주제A-2']],
            subjb: [[1, 'Chapter 01. 장B'], [5, '1. 주제B-1']],
        },
        cidSection: { subja: { '100': '1.1' }, subjb: {} },
        chapterTitles: { subja: { '1': 'Chapter 01. 장A' }, subjb: { '1': 'Chapter 01. 장B' } },
        traps: {},
    };
}

function seedExam() {
    stubRegistry([
        {
            key: 'subja', name: '과목A',
            cards: [{ id: 'subja_card_1', term: 't', definition: 'd', category: '1. 주제A-1' }],
            quizzes: [
                { id: 'subja_q1', stem: 's', conceptId: 'L100' },
                { id: 'subja_q2', stem: 's', statements: [{ conceptId: 'L100' }] },
            ],
        },
        {
            key: 'subjb', name: '과목B',
            cards: [{ id: 'subjb_card_1', term: 't', definition: 'd', category: '1. 주제B-1' }],
            quizzes: [{ id: 'subjb_q1', stem: 's' }],
        },
    ]);
    stubQuestionChapters();
}

/** 진술 통계 + 리뷰 로그 시드 — 실제 저장 경로와 동형 */
function seedMasterySignals() {
    const day = (off) => {
        const d = new Date();
        d.setDate(d.getDate() - off);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    safeSetItem(STORAGE_KEYS.STATEMENT_STATS, JSON.stringify({
        'subja_st_aa11': { j: 6, w: 4, lw: day(1), truth: true, cid: 'L100' },
        'subjb_st_bb22': { j: 5, w: 1, lw: day(2), truth: true, cid: '1.1' },
    }));
    state.quizResults = {
        'subja_q1': { solved: true, correct: false, ts: Date.now() },
        'subja_q2': { solved: true, correct: true, ts: Date.now() },
        'subjb_q1': { solved: true, correct: true, ts: Date.now() },
    };
    safeSetItem(STORAGE_KEYS.FC_REVIEW_LOG, JSON.stringify([
        { c: 'subja_card_1', r: 1, e: 2.0, s: 0, t: Date.now() },
    ]));
}

describe('PassLoop 개념 숙련도 카드 (AI-40)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
    });

    it('신호 부재 → 온보딩 안내 + 훈련소 버튼', () => {
        seedExam();
        renderAnalysisView();
        const card = el('analysis-mastery');
        expect(card.textContent).toContain('개념 숙련도');
        expect(card.textContent).toContain('퀴즈·드릴·카드 복습이 쌓이면');
        expect(card.querySelector('[data-click="switchView"][data-arg="trainer-view"]')).not.toBeNull();
    });

    it('신호 시드 → 등급 배지·과목한정 개념 분리·추천 행 + 딥링크', () => {
        seedExam();
        seedMasterySignals();
        renderAnalysisView();
        const card = el('analysis-mastery');
        expect(card.textContent).toContain('PassLoop');
        // 과목 간 동일 §1.1 충돌 없이 분리 — 과목명이 개념 표시에 포함된다
        expect(card.textContent).toContain('과목A');
        // 등급 배지 행 — 신호가 있으므로 도입/진행/숙련 중 하나 이상 표시
        expect(card.querySelectorAll('.mastery-grade').length).toBeGreaterThan(0);
        // 추천 행 — 오판 많은 subja §1.1이 최하 숙련 후보
        const rec = card.querySelector('.wc-row .analysis-sid');
        expect(rec && rec.textContent).toContain('주제A-1');
        // 딥링크 — 개념 드릴(평탄 §앵커) + 교재(과목·섹션·챕터앵커)
        const drillBtn = card.querySelector('[data-click="gotoOxDrill"]');
        expect(drillBtn).not.toBeNull();
        expect(drillBtn.getAttribute('data-arg')).toBe('concept:§1.1');
        const bookBtn = card.querySelector('[data-click="openSubjectSection"]');
        expect(bookBtn).not.toBeNull();
        expect(JSON.parse(bookBtn.getAttribute('data-args'))).toEqual(['subja', '1. 주제A-1', 'ch01']);
    });
});
