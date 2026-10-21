// tests/dom/exam-search.dom.test.js — 문제은행 검색 시나리오
// @spec TS-12
// 검증: 첫 검색 시 registry.exams의 문제은행 MD를 지연 로드해 '문제은행' 배지
//       결과로 병합하고, 교재 → 참조자료 → 문제은행 순으로 배치되는지 고정한다.
//       결과 카드는 ExamViewer.openExam 라인 딥링크+검색어를 data-args로 전달.

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
    loadIndexHtml, el, stubRegistry, resetStudyState,
} from '../helpers.js';
import {
    renderTextbookSearch, setTextbookFilter,
} from '../../../src/views/textbook-search.js';
import { DataLoader } from '../../../src/data-loader.js';

const SUBJ_A = {
    key: 'subja',
    name: '과목A',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: '1장 품질관리',
        filePath: 'content/exams/cosmetic/교재/subja.md',
        sections: [
            { title: 'CGMP 개요', content: 'CGMP는 우수 화장품 제조 및 품질관리 기준이다.' },
        ],
    }],
};
const SUBJ_B = {
    key: 'subjb',
    name: '과목B',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: '1장 안전관리',
        filePath: 'content/exams/cosmetic/교재/subjb.md',
        sections: [
            { title: '안전 기준', content: '유통 화장품의 안전관리 기준을 다룬다.' },
        ],
    }],
};

const EXAM_MD_A = '# 과목A 문제은행\n\n### Q1\nCGMP 관리기준 문항.\n\n### Q2\n일반 문항.';
const EXAM_MD_B = '# 과목B 문제은행\n\n### Q1\nCGMP 위해평가 문항.';

const EXAM_ENTRIES = [
    { key: 'exa', subject: 'subja', title: '과목A 문제은행 (100제)', file: 'subja_문제은행.md' },
    { key: 'exb', subject: 'subjb', title: '과목B 문제은행 (50제)', file: 'subjb_문제은행.md' },
];

function stubFetch() {
    vi.stubGlobal('fetch', vi.fn((url) => {
        const u = String(url);
        if (u.includes('manifest.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ subjects: [] }) });
        }
        if (u.includes('subja_문제은행')) {
            return Promise.resolve({ ok: true, text: () => Promise.resolve(EXAM_MD_A) });
        }
        if (u.includes('subjb_문제은행')) {
            return Promise.resolve({ ok: true, text: () => Promise.resolve(EXAM_MD_B) });
        }
        return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    }));
}

function search(query) {
    el('textbook-search-input').value = query;
    el('textbook-search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

describe('문제은행 검색 — 지연 인덱싱·배치 순서·딥링크 (TS-12)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_A, SUBJ_B]);
        DataLoader.registry.exams = EXAM_ENTRIES.map(e => ({ ...e }));
        stubFetch();
        renderTextbookSearch();
        setTextbookFilter('all'); // 모듈 상태 리셋
        vi.clearAllMocks();
    });

    it('문제은행 매치 — 교재 결과 뒤에 문제은행 배지 카드 배치', async () => {
        search('CGMP');

        // 지연 인덱스 로드 완료 후 재검색될 때까지 대기 — 교재 1건 + 문제은행 2건
        await vi.waitFor(() => {
            const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
            expect(cards.length).toBe(3);
        }, { timeout: 3000 });

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        // 탐색 순서: 교재 → 참조자료 → 문제은행 — 교재 카드가 먼저, 문제은행이 뒤
        expect(cards[0].getAttribute('data-search-goto')).toBeTruthy();
        expect(cards[0].textContent).toContain('CGMP 개요');
        expect(cards[0].textContent).not.toContain('문제은행');
        expect(cards[1].textContent).toContain('문제은행');
        expect(cards[2].textContent).toContain('문제은행');
        // 문제은행 문서명 + 매치 스니펫 노출
        expect(cards[1].textContent).toContain('과목A 문제은행 (100제)');
        expect(cards[2].textContent).toContain('과목B 문제은행 (50제)');
        // 건수 요약 — 교재·참조자료·문제은행 합산
        expect(el('textbook-search-summary').innerHTML).toContain('3</strong>건');
    });

    it('문제은행 카드 — ExamViewer 라인 딥링크 + 검색어 전달', async () => {
        search('CGMP');
        await vi.waitFor(() => {
            expect(el('textbook-results-container')
                .querySelectorAll('button[data-click="ExamViewer.openExam"]').length).toBe(2);
        }, { timeout: 3000 });

        const btn = el('textbook-results-container')
            .querySelector('button[data-click="ExamViewer.openExam"]');
        const args = JSON.parse(btn.getAttribute('data-args'));
        // args = [문제은행 mdPath, lineNum, 검색어] — ExamViewer.openExam 규약
        // (검색어는 참조자료 카드와 동일하게 소문자 정규화 — 뷰어가 대소문자 무관 매칭)
        expect(args[0]).toContain('문제은행');
        expect(args[0]).toContain('subja_문제은행.md');
        expect(typeof args[1]).toBe('number');
        expect(args[2]).toBe('cgmp');
    });

    it('문제은행 카드 본체도 클릭 가능 — 카드 div에 data-click·role=link 부여', async () => {
        search('CGMP');
        await vi.waitFor(() => {
            expect(el('textbook-results-container')
                .querySelectorAll('.textbook-result-card.is-clickable[data-click="ExamViewer.openExam"]').length)
                .toBe(2);
        }, { timeout: 3000 });

        const card = el('textbook-results-container')
            .querySelector('.textbook-result-card.is-clickable[data-click="ExamViewer.openExam"]');
        expect(card.getAttribute('role')).toBe('link');
        expect(card.getAttribute('tabindex')).toBe('0');
        const args = JSON.parse(card.getAttribute('data-args'));
        expect(args[0]).toContain('문제은행');
        expect(args[2]).toBe('cgmp');
    });

    it('과목 필터 — 문제은행 결과도 귀속 과목으로 필터링', async () => {
        search('CGMP');
        await vi.waitFor(() => {
            expect(el('textbook-results-container')
                .querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length).toBe(3);
        }, { timeout: 3000 });

        setTextbookFilter('subjb');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).toContain('과목B 문제은행');
        expect(cards[0].textContent).toContain('문제은행');
    });
});
