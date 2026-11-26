// tests/dom/study/study-notes.dom.test.js — PassLoop 통합 학습 노트 카드
// @spec AI-44
// 검증: 메모 부재 온보딩(E), 시드 메모 → 최신순 나열·제목·미리보기·섹션 회귀 링크(H),
//       8건 초과 시 최근 8건 절단 + 안내(H)

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
import { safeSetItem } from '../../../src/core/state.js';
import { STORAGE_KEYS } from '../../../src/core/storage-keys.js';

function seedExam() {
    stubRegistry([{ key: 'subja', name: '과목A', cards: [], quizzes: [] }]);
}

/** 리더 섹션 메모 시드 — 실제 저장 경로와 동형 {bookmarkKey:{note,subject,title,updated}} */
function seedNotes(count = 2) {
    const map = {};
    for (let i = 1; i <= count; i++) {
        map[`subja|1. 주제A-${i}|주제A-${i}`] = {
            note: `메모 본문 ${i}`,
            subject: 'subja',
            title: `${i}. 주제A-${i}`,
            updated: `2026-11-${String(20 + i).padStart(2, '0')}T10:00`,
        };
    }
    safeSetItem(STORAGE_KEYS.READER_NOTES, JSON.stringify(map));
}

describe('PassLoop 내 노트 카드 (AI-44)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
    });

    it('메모 부재 → 온보딩 안내 + 리더 버튼', () => {
        seedExam();
        renderAnalysisView();
        const card = el('analysis-notes');
        expect(card.textContent).toContain('내 노트');
        expect(card.textContent).toContain('메모를 남기면');
        expect(card.querySelector('[data-click="switchView"][data-arg="textbook-reader-view"]')).not.toBeNull();
    });

    it('메모 시드 → 최신순 나열·미리보기·섹션 회귀 링크', () => {
        seedExam();
        seedNotes(2);
        renderAnalysisView();
        const card = el('analysis-notes');
        expect(card.textContent).toContain('2개');
        const titles = [...card.querySelectorAll('.analysis-sid')].map(n => n.textContent);
        // 최신순 — updated 큰 것(주제A-2)이 먼저
        expect(titles[0]).toContain('주제A-2');
        expect(titles[1]).toContain('주제A-1');
        expect(card.textContent).toContain('메모 본문 1');
        // 섹션 회귀 링크 — openSubjectSection [subject, title, '']
        const btn = card.querySelector('[data-click="openSubjectSection"]');
        expect(btn).not.toBeNull();
        expect(JSON.parse(btn.getAttribute('data-args'))).toEqual(['subja', '2. 주제A-2', '']);
    });

    it('8건 초과 → 최근 8건만 표시 + 안내 문구', () => {
        seedExam();
        seedNotes(10);
        renderAnalysisView();
        const card = el('analysis-notes');
        expect(card.textContent).toContain('10개');
        expect(card.querySelectorAll('.analysis-sid').length).toBe(8);
        expect(card.textContent).toContain('최근 8건');
    });
});
