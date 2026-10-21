// tests/dom/exam-index-scope.dom.test.js — 검색 인덱스의 시험 스코프 무효화
// @spec TS-17
// 검증: 활성 시험 id가 바뀌면 과목 키가 같아도 검색 인덱스가 재구축된다 —
//       리로드 없는 전환 경로에서 이전 시험의 인덱스가 오재사용되지 않음을 고정한다.

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import {
    loadIndexHtml, el, stubRegistry, resetStudyState,
} from './helpers.js';
import {
    renderTextbookSearch, setTextbookFilter,
} from '../../src/views/textbook-search.js';

const EXAMS = {
    exams: [
        { id: 'cosmetic', name: '화장품', default: true, features: {} },
        { id: 'insadj', name: '손해사정사', features: {} },
    ],
};

// 두 시험이 같은 과목 키 'shared'를 공유하는 최악의 시나리오 — 내용은 시험별로 다르다.
function stubSharedSubject(marker) {
    stubRegistry([{
        key: 'shared',
        name: '공유과목',
        chapters: [{
            chapterKey: 'ch1',
            chapterTitle: 'Chapter 01. 공유',
            filePath: 'content/exams/x/교재/shared.md',
            sections: [{ title: '공유 섹션', content: `${marker} 본문입니다.` }],
        }],
    }]);
}

function stubFetch() {
    vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })));
}

function search(query) {
    el('textbook-search-input').value = query;
    el('textbook-search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

function resultTexts() {
    return [...el('textbook-results-container').children]
        .filter(c => c.classList.contains('textbook-result-card'))
        .map(c => c.textContent);
}

describe('검색 인덱스 시험 스코프 무효화 (TS-17)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        window.EXAMS_LIST = EXAMS;
        stubFetch();
        renderTextbookSearch();
        setTextbookFilter('all'); // 모듈 상태 리셋
        vi.clearAllMocks();
    });

    it('시험 전환 시 같은 과목 키라도 인덱스가 재구축된다', async () => {
        localStorage.setItem('current_exam', 'cosmetic');
        stubSharedSubject('알파전용어');
        search('알파전용어');
        await vi.waitFor(() => {
            expect(resultTexts().some(t => t.includes('공유 섹션'))).toBe(true);
        }, { timeout: 3000 });

        // insadj로 전환 — 과목 키 'shared'는 동일하지만 내용은 '베타전용어'
        localStorage.setItem('current_exam', 'insadj');
        window.STUDY_DATA.shared.chapters[0].sections[0].content = '베타전용어 본문입니다.';
        search('베타전용어');
        await vi.waitFor(() => {
            expect(resultTexts().some(t => t.includes('공유 섹션'))).toBe(true);
        }, { timeout: 3000 });

        // 이전 시험 인덱스 재사용이면 '알파전용어'가 여전히 매치된다 — 무효화됐으면 0건
        search('알파전용어');
        await vi.waitFor(() => {
            expect(el('textbook-search-summary').textContent).toBeTruthy();
        }, { timeout: 3000 });
        expect(resultTexts().some(t => t.includes('공유 섹션'))).toBe(false);
    });
});
