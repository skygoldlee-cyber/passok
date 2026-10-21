// tests/dom/story-search.dom.test.js — 이야기형 서사 검색 (TS-10)
// @spec TS-10
// story_textbook 활성 시험에서 첫 검색이 storyFile을 지연 로드해
// 서사 블록만 인덱스에 병합하고 '서사' 배지로 구분 표시하는지 고정한다.

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    trapFocus: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import {
    loadIndexHtml, el, stubRegistry, resetStudyState,
} from '../helpers.js';
import {
    renderTextbookSearch, setTextbookSearchQuery,
} from '../../../src/views/textbook-search.js';

const STORY_MD = [
    '# 📕 과목A 이야기형 학습교재',
    '',
    '## 📚 Chapter 01. 정의',
    '',
    '<!-- story:start -->',
    '',
    '## 프롤로그 — 민수의 첫 도전',
    '',
    '민수는 비누방울 원리로 계면활성제를 이해했다.',
    '',
    '<!-- story:end -->',
    '',
    '본문 내용.',
    '',
    '## 1. 법령 체계',
    '',
    '<!-- story:start -->',
    '',
    '#### 📖 민수의 장면 — 풍선껌 비유',
    '',
    '민수는 풍선껌으로 법령 위계를 이해했다.',
    '',
    '<!-- story:end -->',
    '',
    '본문 끝.',
    '',
    // 챕터마다 반복되는 ## 제목 — 표시 제목(챕터 병기)으로 목적지가 구분돼야 한다
    '## 📚 Chapter 02. 응용',
    '',
    '본문2.',
    '',
    '## 📌 챕터 핵심 요약',
    '',
    '첫 번째 요약 본문.',
    '',
    '## 📚 Chapter 03. 심화',
    '',
    '본문3.',
    '',
    '## 📌 챕터 핵심 요약',
    '',
    '<!-- story:start -->',
    '',
    '#### 📖 수진의 장면 — 제조기록지 비유',
    '',
    '수진은 제조기록지로 요약표를 외웠다.',
    '',
    '<!-- story:end -->',
    '',
    '두 번째 요약 본문.',
    '',
    // 메타 섹션 아래의 서사 블록 — 리더가 이 섹션을 렌더하지 않아 도달 불가
    '## ✅ 확인문제',
    '',
    '<!-- story:start -->',
    '',
    '메타블록서사 확인용 서사 본문.',
    '',
    '<!-- story:end -->',
].join('\n');

const SUBJ_A = {
    key: 'subja',
    name: '과목A',
    chapters: [{
        chapterKey: 'full',
        chapterTitle: '1장 정의',
        filePath: 'content/exams/cosmetic/교재/subja/subja_표준형.md',
        sections: [
            { title: '화장품 정의', content: '화장품은 인체를 청결 미화하는 물품이다.' },
        ],
    }],
};

const MANIFEST = {
    subjects: [{
        key: 'subja',
        name: '과목A',
        dir: '교재/subja',
        chapters: [{ key: 'full', title: '1장 정의', file: 'subja_표준형.md', storyFile: 'subja_이야기형.md' }],
    }],
};

function stubFetch() {
    vi.stubGlobal('fetch', vi.fn((url) => {
        const u = String(url);
        if (u.includes('manifest.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(MANIFEST) });
        }
        if (u.includes('이야기형')) {
            return Promise.resolve({ ok: true, text: () => Promise.resolve(STORY_MD) });
        }
        return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    }));
}

describe('이야기형 서사 검색 (TS-10)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_A]);
        window.EXAMS_LIST = { exams: [{
            id: 'cosmetic', default: true, name: '테스트',
            features: { story_textbook: true },
            contentRoot: 'content/exams/cosmetic',
        }] };
        stubFetch();
        renderTextbookSearch();
    });

    it('서사 전용 표현 검색 — 지연 로드된 storyFile에서 매칭 + 서사 배지', async () => {
        // '비누방울'은 서사에만 존재 — 첫 실행 시 인덱스 로딩 안내, 병합 후 재검색으로 1건
        setTextbookSearchQuery('비누방울');
        expect(el('textbook-results-container').textContent).toContain('확장하는 중');

        await vi.waitFor(() => {
            const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
            expect(cards.length).toBe(1);
        }, { timeout: 3000 });

        const card = el('textbook-results-container').querySelector('.textbook-result-card:not(.search-gloss-card)');
        expect(card.textContent).toContain('비누방울');
        expect(card.textContent).toContain('서사');
        // '전체 단원 보기'는 원시 .md 경로 대신 교재리더 이동 액션(data-search-goto)이다
        const link = card.querySelector('a[data-search-goto]');
        expect(link).toBeTruthy();
        // 서사 결과: 이야기형 ## 섹션('프롤로그 — …') + 소속 챕터 앵커 + story 모드 플래그 —
        // 표준형 모드에서 열면 서사 제목이 없어 맨 위로 튀는 오이동 재발 방지
        expect(JSON.parse(link.getAttribute('data-search-goto')))
            .toEqual(['subja', '프롤로그 — 민수의 첫 도전', 'ch01', 'story']);
    });

    it('서사 내부 #### 헤딩은 소속 ## 섹션 카드로 이동 (리더 카드는 ## 단위)', async () => {
        setTextbookSearchQuery('풍선껌');
        await vi.waitFor(() => {
            expect(el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length)
                .toBe(1);
        }, { timeout: 3000 });

        const link = el('textbook-results-container')
            .querySelector('.textbook-result-card a[data-search-goto]');
        // 표시 제목은 #### 서사 제목이지만 목적지는 소속 ## 섹션 '1. 법령 체계'
        expect(el('textbook-results-container').textContent).toContain('풍선껌 비유');
        expect(JSON.parse(link.getAttribute('data-search-goto')))
            .toEqual(['subja', '1. 법령 체계', 'ch01', 'story']);
    });

    it('서사 목적지 — 중복 ## 제목은 챕터 병기 표시 제목, 메타 섹션 소속 블록은 제외', async () => {
        // 두 번째 '📌 챕터 핵심 요약' 아래의 서사 — 원시 제목만 넘기면 첫 챕터로 오이동한다
        setTextbookSearchQuery('제조기록지');
        await vi.waitFor(() => {
            expect(el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length)
                .toBe(1);
        }, { timeout: 3000 });

        const link = el('textbook-results-container')
            .querySelector('.textbook-result-card a[data-search-goto]');
        expect(JSON.parse(link.getAttribute('data-search-goto')))
            .toEqual(['subja', '📌 챕터 핵심 요약 — Chapter 03. 심화', 'ch03', 'story']);

        // ✅ 확인문제 아래의 서사 블록은 리더 미렌더 — 도달 불가이므로 결과에서 제외
        setTextbookSearchQuery('메타블록서사');
        await vi.waitFor(() => {
            expect(el('textbook-results-container').textContent)
                .toContain('일치하는 내용이 없습니다');
        }, { timeout: 3000 });
    });

    it('본문 검색은 기존 동작 유지 — 서사 항목이 OR로 추가 매칭되지 않음', async () => {
        setTextbookSearchQuery('화장품');
        await vi.waitFor(() => {
            expect(el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length)
                .toBe(1);
        }, { timeout: 3000 });
        // 서사 인덱스 로드 후에도 '화장품'은 본문 섹션에만 매칭 (서사에 '화장품' 없음)
        await new Promise(r => setTimeout(r, 50));
        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).not.toContain('서사');
    });
});
