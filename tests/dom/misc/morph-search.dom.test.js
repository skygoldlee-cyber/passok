// tests/dom/morph-search.dom.test.js — 형태소 경계 매칭·동의어 확장 시나리오
// @spec TS-13,TS-14
// 검증: '유화' 검색 시 복합어 '보조유화제'는 형태소 경계 매치(본매치)로,
//       우연한 음절열 '석유화학'은 부분 일치 티어로 분류되는지 고정한다.
//       registry.synonyms 동의어(에멀전·방부제)도 그룹 내 OR로 매치된다.

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
import { DataLoader } from '../../../src/content/data-loader.js';

// '보조유화제'는 '보조|유화|제'로 분해되는 복합어 — 보조가 다른 어절의 두어로도
// 재사용되므로(보조성분·보조제) 형태소 경계 어휘에 채택되어 본매치가 된다.
// '석유화학'의 '유화'는 '석|유화'로 1글자 접두라 부분(중간) 매치다.
const SUBJ_M = {
    key: 'morph',
    name: '유화과목',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: 'Chapter 01. 유화와 안정화',
        filePath: 'content/exams/cosmetic/교재/morph.md',
        sections: [
            { title: '유화제의 종류', content: '유화 작용은 에멀전 안정화를 돕는다.' },
            { title: '안정화 방법', content: '보조유화제와 보조성분으로 안정화한다. 보조제도 쓰인다.' },
            { title: '원료의 분류', content: '석유화학 계열 원료는 보조제로 쓰인다.' },
            { title: '첨가제 기준', content: '보존제는 사용한도가 정해져 있다.' },
        ],
    }],
};

function stubFetch() {
    vi.stubGlobal('fetch', vi.fn((url) => {
        const u = String(url);
        if (u.includes('manifest.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ subjects: [] }) });
        }
        return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    }));
}

function search(query) {
    el('textbook-search-input').value = query;
    el('textbook-search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

// 본매치 영역(구분선 이전)과 부분 일치 영역(구분선 이후)의 카드 텍스트를 나눈다.
function resultTexts() {
    const container = el('textbook-results-container');
    const children = [...container.children];
    const dividerIdx = children.findIndex(c => c.classList.contains('search-weak-divider'));
    const cards = children.filter(c => c.classList.contains('textbook-result-card'));
    const strong = dividerIdx < 0 ? cards : cards.filter(c => children.indexOf(c) < dividerIdx);
    const weak = dividerIdx < 0 ? [] : cards.filter(c => children.indexOf(c) > dividerIdx);
    return { divider: dividerIdx >= 0, strong: strong.map(c => c.textContent), weak: weak.map(c => c.textContent) };
}

describe('형태소 경계 매칭·동의어 확장 (TS-13/TS-14)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_M]);
        DataLoader.registry.synonyms = {
            '유화': ['에멀전', '에멀션', 'emulsion'],
            '보존제': ['방부제'],
        };
        stubFetch();
        renderTextbookSearch();
        setTextbookFilter('all'); // 모듈 상태 리셋
        vi.clearAllMocks();
    });

    it('복합어 경계 — 보조유화제는 본매치, 석유화학은 부분 일치 티어', async () => {
        search('유화');

        await vi.waitFor(() => {
            const { strong, weak } = resultTexts();
            expect(strong.length).toBe(2);
            expect(weak.length).toBe(1);
        }, { timeout: 3000 });

        const { divider, strong, weak } = resultTexts();
        expect(divider).toBe(true);
        // 어절 시작 매치 + 형태소 경계(보조|유화|제) 매치가 본매치 카드
        expect(strong.some(t => t.includes('유화제의 종류'))).toBe(true);
        expect(strong.some(t => t.includes('안정화 방법'))).toBe(true);
        // '석유화학'의 음절열만 겹치는 결과는 부분 일치 구분선 아래
        expect(weak.some(t => t.includes('원료의 분류'))).toBe(true);
        expect(strong.some(t => t.includes('원료의 분류'))).toBe(false);
        // 요약문에 부분 일치 건수 병기
        expect(el('textbook-search-summary').innerHTML).toContain('부분 일치 1건');
    });

    it('동의어 확장 — 에멀전으로 유화 본문 검색', async () => {
        search('에멀전');

        await vi.waitFor(() => {
            const { strong } = resultTexts();
            expect(strong.length).toBeGreaterThanOrEqual(2);
        }, { timeout: 3000 });

        const { strong, weak } = resultTexts();
        expect(strong.some(t => t.includes('유화제의 종류'))).toBe(true);
        expect(strong.some(t => t.includes('안정화 방법'))).toBe(true);
        expect(weak.some(t => t.includes('원료의 분류'))).toBe(true);
    });

    it('동의어 역방향 — 방부제로 보존제 본문 검색', async () => {
        search('방부제');

        await vi.waitFor(() => {
            const { strong } = resultTexts();
            expect(strong.length).toBe(1);
        }, { timeout: 3000 });

        const { strong } = resultTexts();
        expect(strong.some(t => t.includes('첨가제 기준'))).toBe(true);
        // 동의어 변형도 하이라이트된다
        const container = el('textbook-results-container');
        expect(container.innerHTML).toContain('보존제');
    });
});
