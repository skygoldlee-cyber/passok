// tests/dom/study-reader.dom.test.js — 교재 리더 시나리오
// @spec TR-01~18,TR-27,TR-28
// 설계: docs/dev/design/DOM_TEST_DESIGN.md §5.2 (Phase 4)
// 검증: 과목 목록 로드(H) · 과목 선택→본문·TOC 렌더(H) · 읽기 위치 저장·복원(P/R)
//       · 북마크 토글→영속(P) · 미선택 빈 상태(E)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showAlert: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    trapFocus: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import {
    loadIndexHtml, el, flushAsync, stubRegistry, resetStudyState, storedJson, waitFor,
} from '../helpers.js';
import { renderTextbookReader, textbookReaderState, startReadingSession, stopReadingSession, openSubjectSection } from '../../../src/views/textbook-reader.js';
import { safeGetItem, safeSetItem } from '../../../src/state.js';
import { showAlert } from '../../../src/ui-utils.js';
import { getTodayStr } from '../../../src/study/study-tracker.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

const SUBJ = {
    key: 'subja',
    name: '과목A',
    chapters: [{
        chapterKey: 'ch1',
        filePath: 'content/exams/cosmetic/교재/subja.md',
        sections: [
            { title: 'Chapter 01 개론', content: '첫 번째 섹션 본문입니다.' },
            { title: '1. 핵심 개념', content: '두 번째 섹션 본문입니다.' },
        ],
    }],
};

function resetReaderState() {
    textbookReaderState.selectedSubject = '';
    textbookReaderState.selectedChapter = '';
    textbookReaderState.storyMode = false;
}

describe('교재 리더 — 과목 선택·본문·이어하기·북마크', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        resetReaderState();
        loadIndexHtml();
        // jsdom 미구현 API 스텁
        Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn();
        vi.clearAllMocks();
    });

    it('초기 렌더 → 과목 셀렉트에 레지스트리 과목 옵션', () => {
        stubRegistry([SUBJ]);
        renderTextbookReader();

        const opts = el('reader-subject-select').querySelectorAll('option');
        expect(opts.length).toBe(2); // placeholder + subja
        expect(opts[1].value).toBe('subja');
        expect(opts[1].textContent).toBe('과목A');
    });

    it('과목 선택 → 본문 섹션 카드·TOC·툴바 렌더', async () => {
        stubRegistry([SUBJ]);
        renderTextbookReader();

        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        const cards = el('textbook-reader-container').querySelectorAll('.reader-section-card');
        expect(cards.length).toBe(2);
        expect(cards[0].querySelector('.reader-section-title').textContent).toContain('Chapter 01');
        // TOC 항목 생성 + 툴바 표시
        expect(el('reader-toc-list').querySelectorAll('.reader-toc-item').length).toBeGreaterThan(0);
        expect(el('reader-toolbar').classList.contains('is-hidden')).toBe(false);
        // 읽기 위치가 저장됨
        expect(storedJson(STORAGE_KEYS.READER_LAST_POSITION).subject).toBe('subja');
    });

    it('읽기 위치 이어하기 → 저장된 과목 자동 복원·본문 재렌더 (P/R)', async () => {
        stubRegistry([SUBJ]);
        // 이전 세션 위치 시딩
        safeSetItem(STORAGE_KEYS.READER_LAST_POSITION,
            JSON.stringify({ subject: 'subja', chapter: '0', scrollTop: 120, storyMode: false, ts: Date.now() }));

        renderTextbookReader();
        await flushAsync(30);

        expect(el('reader-subject-select').value).toBe('subja');
        expect(el('textbook-reader-container').querySelectorAll('.reader-section-card').length).toBe(2);
    });

    it('북마크 토글 → localStorage 영속 + 아이콘 상태 반영 (TR-27 콘텐츠 키)', async () => {
        stubRegistry([SUBJ]);
        renderTextbookReader();
        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        const btn = el('textbook-reader-container').querySelector('.reader-bookmark-btn');
        btn.click();

        // 위치 인덱스가 아닌 콘텐츠 키 — 과목|챕터키|섹션제목
        expect(storedJson(STORAGE_KEYS.READER_BOOKMARKS)).toContain('subja|ch1|Chapter 01 개론');
        expect(btn.classList.contains('bookmarked')).toBe(true);

        // 재클릭 → 해제
        btn.click();
        expect(storedJson(STORAGE_KEYS.READER_BOOKMARKS)).not.toContain('subja|ch1|Chapter 01 개론');
        expect(btn.classList.contains('bookmarked')).toBe(false);
    });

    it('구형 위치 인덱스 북마크 키는 읽기 시점에 정리 (TR-27)', async () => {
        stubRegistry([SUBJ]);
        // 구형 키 subja_0_0 + 신형 키 혼재 시딩
        safeSetItem(STORAGE_KEYS.READER_BOOKMARKS,
            JSON.stringify(['subja_0_0', 'subja|ch1|1. 핵심 개념', 'subjb_1_2']));
        renderTextbookReader();
        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        // 구형 키 제거 + 신형 키만 보존
        expect(storedJson(STORAGE_KEYS.READER_BOOKMARKS)).toEqual(['subja|ch1|1. 핵심 개념']);
        // 신형 키 섹션은 북마크 표시 유지
        const btns = [...el('textbook-reader-container').querySelectorAll('.reader-bookmark-btn')];
        expect(btns[1].classList.contains('bookmarked')).toBe(true);
        expect(btns[0].classList.contains('bookmarked')).toBe(false);
    });

    it('과목 해제 → 빈 상태 안내', async () => {
        stubRegistry([SUBJ]);
        renderTextbookReader();
        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        sel.value = '';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        expect(el('textbook-reader-container').textContent).toContain('읽을 교재를 선택하세요');
    });

    it('openSubjectSection — 렌더 제외 메타 섹션 제목은 소속 챕터 헤더로 폴백', async () => {
        // '✅ 확인문제'는 표준형 리더에서 필터링되어 카드가 없다 —
        // 제목 매칭 실패 시 STUDY_DATA에서 소속 챕터를 역해석해 그 헤더로 가야 한다.
        const subj = {
            key: 'subja', name: '과목A',
            chapters: [{
                chapterKey: 'full', filePath: 'x.md',
                sections: [
                    { title: 'Chapter 01 개론', content: 'a' },
                    { title: '1. 핵심 개념', content: 'b' },
                    { title: '✅ 확인문제', content: 'q' },
                    { title: 'Chapter 02 응용', content: 'c' },
                ],
            }],
        };
        stubRegistry([subj]);
        renderTextbookReader();
        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        // 과목 재선택으로 재렌더되므로 카드 단위가 아닌 프로토타입 레벨에서 추적
        const scrolled = [];
        const origScroll = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function () { scrolled.push(this); };
        try {
            openSubjectSection('subja', '✅ 확인문제');
            await waitFor(() => scrolled.length > 0, 3000);
        } finally {
            Element.prototype.scrollIntoView = origScroll;
        }

        expect(scrolled.length).toBe(1);
        expect(scrolled[0].querySelector('.reader-section-title').textContent).toContain('Chapter 01');
    });

    it('openSubjectSection — 중복 제목은 표시 제목(챕터 병기) 정확 매칭으로 해당 챕터에 착지', async () => {
        const subj = {
            key: 'subja', name: '과목A',
            chapters: [{
                chapterKey: 'full', filePath: 'x.md',
                sections: [
                    { title: 'Chapter 01 개론', content: 'a' },
                    { title: '📌 챕터 핵심 요약', content: '1장 요약' },
                    { title: 'Chapter 02 응용', content: 'b' },
                    { title: '📌 챕터 핵심 요약', content: '2장 요약' },
                ],
            }],
        };
        stubRegistry([subj]);
        renderTextbookReader();
        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        const scrolled = [];
        const origScroll = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function () { scrolled.push(this); };
        try {
            // 검색·팔레트가 전달하는 표시 제목 — 부분 매칭이면 첫(Chapter 01) 요약으로 갔을 것
            openSubjectSection('subja', '📌 챕터 핵심 요약 — Chapter 02 응용');
            await waitFor(() => scrolled.length > 0, 3000);
        } finally {
            Element.prototype.scrollIntoView = origScroll;
        }

        expect(scrolled.length).toBe(1);
        expect(scrolled[0].querySelector('.reader-section-title').textContent).toContain('Chapter 02');
    });

    it('openSubjectSection — 표준형 결과(story 미지정)는 이야기형 모드를 해제하고 표준형 섹션으로 이동', async () => {
        // 이야기형 모드에서 표준형 검색 결과를 클릭하면 섹션 제목 세트가 달라
        // 매칭에 실패할 수 있다 — 결과 출처에 맞춰 모드를 되돌려야 한다.
        stubRegistry([SUBJ]);
        renderTextbookReader();
        textbookReaderState.storyMode = true;
        el('reader-story-mode-toggle').checked = true;

        const scrolled = [];
        const origScroll = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function () { scrolled.push(this); };
        try {
            openSubjectSection('subja', '1. 핵심 개념');
            expect(textbookReaderState.storyMode).toBe(false);
            expect(el('reader-story-mode-toggle').checked).toBe(false);
            await waitFor(() => scrolled.length > 0, 3000);
        } finally {
            Element.prototype.scrollIntoView = origScroll;
        }

        expect(scrolled.length).toBe(1);
        expect(scrolled[0].querySelector('.reader-section-title').textContent).toContain('핵심 개념');
    });

    it('openSubjectSection — query 지정 시 카드 본문 검색어 하이라이트 + 해당 위치로 스크롤', async () => {
        const subj = {
            key: 'subja', name: '과목A',
            chapters: [{
                chapterKey: 'full', filePath: 'x.md',
                sections: [
                    { title: '1. 핵심 개념', content: '앞쪽 내용입니다.\n\n여기에 계면활성제 설명이 있다.\n\n뒤쪽 내용입니다.' },
                ],
            }],
        };
        stubRegistry([subj]);
        renderTextbookReader();
        const sel = el('reader-subject-select');
        sel.value = 'subja';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsync(30);

        const scrolled = [];
        const origScroll = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function () { scrolled.push(this); };
        try {
            openSubjectSection('subja', '1. 핵심 개념', '', { query: '계면활성제' });
            await waitFor(() => scrolled.length > 0, 3000);
        } finally {
            Element.prototype.scrollIntoView = origScroll;
        }

        const marks = el('textbook-reader-container').querySelectorAll('mark.reader-search-hit');
        expect(marks.length).toBe(1);
        expect(marks[0].textContent).toBe('계면활성제');
        // 카드 상단이 아니라 검색어 mark 자체로 스크롤
        expect(scrolled[scrolled.length - 1]).toBe(marks[0]);
    });
});

/* =======================================================
   리더 툴바·본문 검색·TOC 드로어·표 모달 (initReaderToolbar 경로)
   ======================================================= */

const SUBJ_RICH = {
    key: 'subja',
    name: '과목A',
    chapters: [{
        chapterKey: 'ch1',
        filePath: 'content/exams/cosmetic/교재/subja.md',
        sections: [
            { title: 'Chapter 01 개론', content: '화장품 개념 본문입니다.\n\n### 세부 항목\n\n세부 본문.' },
            { title: '1. 핵심 개념', content: '화장품 정의 본문입니다.\n\n| 항목 | 내용 |\n|---|---|\n| a | b |' },
        ],
    }],
};

async function renderRichChapter() {
    stubRegistry([SUBJ_RICH]);
    renderTextbookReader();
    const sel = el('reader-subject-select');
    sel.value = 'subja';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await flushAsync(30);
}

describe('교재 리더 — 툴바·검색·드로어·표 모달', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        resetReaderState();
        loadIndexHtml();
        Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn();
        vi.clearAllMocks();
    });

    it('툴바 접기 토글 → collapsed + aria-expanded', async () => {
        await renderRichChapter();

        el('reader-toolbar-toggle').click();
        expect(el('reader-toolbar').classList.contains('collapsed')).toBe(true);
        expect(el('reader-toolbar-toggle').getAttribute('aria-expanded')).toBe('false');
    });

    it('본문 검색 → 하이라이트 마크 + 카운트, next/prev 순환, clear 해제', async () => {
        await renderRichChapter();

        const input = el('reader-in-content-search');
        input.value = '화장품';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

        const view = el('textbook-reader-view');
        const marks = view.querySelectorAll('.reader-search-highlight');
        expect(marks.length).toBe(2); // 섹션 2곳에 '화장품'
        expect(el('reader-search-count').textContent).toBe('1/2');
        expect(marks[0].classList.contains('current-match')).toBe(true);

        el('reader-search-next').click();
        expect(el('reader-search-count').textContent).toBe('2/2');
        expect(marks[1].classList.contains('current-match')).toBe(true);

        el('reader-search-prev').click();
        expect(el('reader-search-count').textContent).toBe('1/2');

        el('reader-search-clear').click();
        expect(view.querySelectorAll('.reader-search-highlight').length).toBe(0);
    });

    it('본문 검색 — 2글자 미만 쿼리는 무시', async () => {
        await renderRichChapter();

        const input = el('reader-in-content-search');
        input.value = '화';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(el('textbook-reader-view').querySelectorAll('.reader-search-highlight').length).toBe(0);
    });

    it('모바일 TOC 드로어 — 버튼 토글 + backdrop 클릭 닫기', async () => {
        await renderRichChapter();

        el('reader-toc-mobile-btn').click();
        expect(el('reader-toc').classList.contains('mobile-open')).toBe(true);
        expect(el('reader-toc-backdrop').classList.contains('is-hidden')).toBe(false);

        el('reader-toc-backdrop').click();
        expect(el('reader-toc').classList.contains('mobile-open')).toBe(false);
        expect(el('reader-toc-backdrop').classList.contains('is-hidden')).toBe(true);
    });

    it('표는 인라인으로만 렌더되고 확장 버튼·모달은 생성되지 않는다 (핀치 줌 대체)', async () => {
        await renderRichChapter();

        const container = el('textbook-reader-container');
        expect(container.querySelector('.reader-table-wrapper table')).toBeTruthy();
        expect(container.querySelector('.reader-table-expand-btn')).toBeNull();
        expect(document.getElementById('reader-table-modal')).toBeNull();
    });

    it('TOC 항목 클릭 → 해당 섹션으로 스크롤 + 접힘 해제', async () => {
        await renderRichChapter();
        const scrollSpy = vi.fn();
        Element.prototype.scrollIntoView = scrollSpy;

        const cards = el('textbook-reader-container').querySelectorAll('.reader-section-card');
        cards[1].classList.add('collapsed');
        const tocItem = el('reader-toc-list').querySelector('.reader-toc-item[data-section-idx="1"]');
        expect(tocItem).toBeTruthy();
        tocItem.click();

        expect(scrollSpy).toHaveBeenCalled();
        expect(cards[1].classList.contains('collapsed')).toBe(false);
    });

    it('themechange 이벤트 → 리더 테마 클래스 동기화', async () => {
        await renderRichChapter();
        document.documentElement.classList.add('light-theme');
        document.dispatchEvent(new Event('themechange'));
        expect(el('textbook-reader-view').classList.contains('reader-light-theme')).toBe(true);
        document.documentElement.classList.remove('light-theme');
    });
});

import { markStoryNarrative } from '../../../src/reader/reader-format.js';

describe('이야기형 서사 태깅 — markStoryNarrative', () => {
    function buildCard(title, innerHtml) {
        document.body.innerHTML = `
            <div class="reader-section-card">
                <div class="reader-section-header"><h4 class="reader-section-title">${title}</h4></div>
                <div class="textbook-reader-section-content">${innerHtml}</div>
            </div>`;
        return document.querySelector('.textbook-reader-section-content');
    }

    it('📖 장면 헤딩 ~ 동급 본문 헤딩 전까지 서사 태깅', () => {
        const content = buildCard('📚 Chapter 01', `
            <h4 class="md-h4">1.1 본문 소제목</h4>
            <p class="md-para">본문 설명</p>
            <h4 class="md-h4">📖 민수의 상황</h4>
            <p class="md-para">서사 문단</p>
            <div class="md-quote">"대사입니다"</div>
            <div class="md-quote">🔖 기억 태그: 콜아웃</div>
            <h4 class="md-h4">2.1 다음 본문</h4>
            <p class="md-para">다시 본문</p>`);
        markStoryNarrative(content);

        const paras = content.querySelectorAll('p.md-para');
        expect(paras[0].classList.contains('story-narrative')).toBe(false); // 장면 이전 본문
        expect(paras[1].classList.contains('story-narrative')).toBe(true);  // 장면 서사
        expect(paras[2].classList.contains('story-narrative')).toBe(false); // 장면 종료 후 본문
        const heads = content.querySelectorAll('.md-h4');
        expect(heads[1].classList.contains('story-narrative')).toBe(true);  // 📖 헤딩
        expect(heads[2].classList.contains('story-narrative')).toBe(false);
        const quotes = content.querySelectorAll('.md-quote');
        expect(quotes[0].classList.contains('story-narrative')).toBe(true);  // 대사
        expect(quotes[1].classList.contains('story-narrative')).toBe(false); // 🔖 콜아웃 제외
    });

    it('💭 에필로그 인용구부터 섹션 끝까지 서사 태깅', () => {
        const content = buildCard('📚 Chapter 01', `
            <p class="md-para">본문</p>
            <div class="md-quote">💭 에필로그 — Chapter 01을 마치며</div>
            <p class="md-para">에필로그 서사</p>`);
        markStoryNarrative(content);

        const paras = content.querySelectorAll('p.md-para');
        expect(paras[0].classList.contains('story-narrative')).toBe(false);
        expect(paras[1].classList.contains('story-narrative')).toBe(true);
        expect(content.querySelector('.md-quote').classList.contains('story-narrative')).toBe(true);
    });

    it('h3 장면 이후의 h4 본문 소제목은 서사로 물들지 않는다 (리프 블록 종료)', () => {
        const content = buildCard('📚 Chapter 01', `
            <h3 class="md-h3">📖 수진, 조제대 앞에서 얼어붙다</h3>
            <p class="md-para">서사 문단</p>
            <h4 class="md-h4">1.1 「화장품법」</h4>
            <p class="md-para">본문 설명</p>`);
        markStoryNarrative(content);

        const paras = content.querySelectorAll('p.md-para');
        expect(paras[0].classList.contains('story-narrative')).toBe(true);
        expect(paras[1].classList.contains('story-narrative')).toBe(false);
        expect(content.querySelector('.md-h3').classList.contains('story-narrative')).toBe(true);
        expect(content.querySelector('.md-h4').classList.contains('story-narrative')).toBe(false);
    });

    it('명시 마커 모드 — 📖┈이야기┈ ~ ┈본문┈📘 사이만 서사 태깅', () => {
        const content = buildCard('📚 Chapter 01', `
            <p class="md-para">본문 문단</p>
            <p class="md-para">📖 ┈┈┈┈ 이야기 ┈┈┈┈</p>
            <h4 class="md-h4">📖 민수의 상황</h4>
            <p class="md-para">서사 문단</p>
            <div class="md-quote">🔖 기억 태그도 마커 안이면 서사</div>
            <p class="md-para">┈┈┈┈ 본문 ┈┈┈┈ 📘</p>
            <p class="md-para">다시 본문</p>
            <h4 class="md-h4">📖 마커 밖 📖 헤딩은 무시</h4>
            <p class="md-para">본문</p>`);
        markStoryNarrative(content);

        const paras = content.querySelectorAll('p.md-para');
        expect(paras[0].classList.contains('story-narrative')).toBe(false);
        expect(paras[1].classList.contains('story-boundary-start')).toBe(true);
        expect(paras[2].classList.contains('story-narrative')).toBe(true);
        expect(paras[3].classList.contains('story-boundary-end')).toBe(true);
        expect(paras[4].classList.contains('story-narrative')).toBe(false);
        expect(paras[5].classList.contains('story-narrative')).toBe(false);
        // 마커 모드에서는 헤딩 휴리스틱이 개입하지 않는다
        expect(content.querySelectorAll('.md-h4')[0].classList.contains('story-narrative')).toBe(true);
        expect(content.querySelectorAll('.md-h4')[1].classList.contains('story-narrative')).toBe(false);
        // 마커 안 콜아웃은 명시 범위라 서사로 태깅된다
        expect(content.querySelector('.md-quote').classList.contains('story-narrative')).toBe(true);
    });

    it('컨테이너 div는 textContent가 마커 패턴이어도 경계로 오인하지 않음', () => {
        // .reader-subsection-content가 마커 문단으로 시작/끝나면 div 전체가
        // .story-boundary로 태깅되어 내부 전체가 중앙정렬되는 회귀 방지
        const content = buildCard('📚 Chapter 01', `
            <p class="md-para">본문 문단</p>
            <div class="reader-subsection-content">
                <p class="md-para">📖 ┈┈┈┈ 이야기 ┈┈┈┈</p>
                <p class="md-para">서사 문단</p>
                <p class="md-para">┈┈┈┈ 본문 ┈┈┈┈ 📘</p>
                <p class="md-para">다시 본문</p>
            </div>
            <p class="md-para">뒤따르는 본문</p>`);
        markStoryNarrative(content);

        const sub = content.querySelector('.reader-subsection-content');
        // 컨테이너 div 자체는 경계가 아니지만, 바깥 호출은 하위 리프 마커를 정상 태깅한다
        expect(sub.classList.contains('story-boundary')).toBe(false);
        expect(sub.classList.contains('story-narrative')).toBe(false);
        const paras = sub.querySelectorAll('p.md-para');
        expect(paras[0].classList.contains('story-boundary-start')).toBe(true);
        expect(paras[1].classList.contains('story-narrative')).toBe(true);
        expect(paras[2].classList.contains('story-boundary-end')).toBe(true);
        expect(paras[3].classList.contains('story-narrative')).toBe(false);
        // 마커 범위 밖의 본문은 태깅되지 않는다
        expect(content.querySelectorAll(':scope > p.md-para.story-narrative').length).toBe(0);
    });

    it('끝 마커만 단독으로 있는 컨테이너 — 이어지는 서사 범위로 처리', () => {
        // 서사 범위가 서브섹션 경계를 넘나들어 끝 마커만 남은 경우:
        // 마커 앞 요소는 서사, 끝 마커는 숨김 태깅되어야 한다
        const content = buildCard('📚 Chapter 01', `
            <p class="md-para">서사 문단</p>
            <div class="md-quote">"대사"</div>
            <p class="md-para">┈┈┈┈ 본문 ┈┈┈┈ 📘</p>
            <p class="md-para">이후 본문</p>`);
        markStoryNarrative(content);

        const paras = content.querySelectorAll('p.md-para');
        expect(paras[0].classList.contains('story-narrative')).toBe(true);
        expect(content.querySelector('.md-quote').classList.contains('story-narrative')).toBe(true);
        expect(paras[1].classList.contains('story-boundary-end')).toBe(true);
        expect(paras[2].classList.contains('story-narrative')).toBe(false);
    });

    it('이야기 접기 칩이 서사 멤버를 토글한다', () => {
        const content = buildCard('📚 Chapter 01', `
            <p class="md-para">📖 ┈┈┈┈ 이야기 ┈┈┈┈</p>
            <p class="md-para">서사 문단1</p>
            <div class="md-quote">"대사"</div>
            <p class="md-para">서사 문단2</p>
            <p class="md-para">┈┈┈┈ 본문 ┈┈┈┈ 📘</p>
            <p class="md-para">본문</p>`);
        markStoryNarrative(content);

        const toggle = content.querySelector('.story-toggle');
        expect(toggle).not.toBeNull();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        const members = [...content.querySelectorAll('.story-narrative')];
        expect(members.length).toBe(3);
        expect(members.every(m => !m.hidden)).toBe(true);

        toggle.click();
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(toggle.classList.contains('is-collapsed')).toBe(true);
        expect(members.every(m => m.hidden)).toBe(true);
        expect(toggle.textContent).toContain('펼치기');

        toggle.click();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(members.every(m => !m.hidden)).toBe(true);
    });

    it('중첩 컨테이너 중복 호출 시 접기 칩은 1개만 생성된다', () => {
        // textbook-reader는 .textbook-reader-section-content와 .reader-subsection-content
        // 각각에 markStoryNarrative를 호출한다 — 같은 그룹에 칩이 두 번 삽입되면 안 된다
        const content = buildCard('📚 Chapter 01', `
            <div class="reader-subsection-content">
                <p class="md-para">📖 ┈┈┈┈ 이야기 ┈┈┈┈</p>
                <p class="md-para">서사 문단</p>
                <p class="md-para">┈┈┈┈ 본문 ┈┈┈┈ 📘</p>
            </div>`);
        markStoryNarrative(content);
        markStoryNarrative(content.querySelector('.reader-subsection-content'));
        markStoryNarrative(content); // 재렌더 중복 호출
        expect(content.querySelectorAll('.story-toggle').length).toBe(1);
    });

    it('서사 구간 양끝에 스크린리더 라벨이 삽입되고 중복 호출에도 1쌍만 유지된다', () => {
        const content = buildCard('📚 Chapter 01', `
            <p class="md-para">본문</p>
            <p class="md-para">📖 ┈┈┈┈ 이야기 ┈┈┈┈</p>
            <p class="md-para">서사 문단</p>
            <p class="md-para">┈┈┈┈ 본문 ┈┈┈┈ 📘</p>
            <p class="md-para">다시 본문</p>`);
        markStoryNarrative(content);
        markStoryNarrative(content); // 중복 호출
        const labels = content.querySelectorAll('.story-sr-label');
        expect(labels.length).toBe(2);
        expect(labels[0].textContent).toBe('이야기 구간 시작');
        expect(labels[1].textContent).toBe('이야기 구간 끝');
        // 라벨은 접기 대상 멤버 밖에 있어 접혀도 구조 전달 유지
        expect(labels[0].classList.contains('story-narrative')).toBe(false);
        expect(labels[0].classList.contains('sr-only')).toBe(true);
    });

    it('프롤로그·등장인물 카드는 전체 서사', () => {
        const content = buildCard('프롤로그 — 민수의 첫 번째 화장품', `
            <p class="md-para">서사 문단</p>
            <div class="md-quote">"혼자 질문하는 대사"</div>
            <div class="md-quote">📌 출처: 화장품법</div>`);
        markStoryNarrative(content);

        expect(content.querySelector('p.md-para').classList.contains('story-narrative')).toBe(true);
        const quotes = content.querySelectorAll('.md-quote');
        expect(quotes[0].classList.contains('story-narrative')).toBe(true);
        expect(quotes[1].classList.contains('story-narrative')).toBe(false);
    });
});

import { attachImageZoomIn, openImageZoom, closeImageZoom } from '../../../src/reader/image-zoom.js';

describe('이미지 확대 모달 — image-zoom', () => {
    function buildContentWithImg() {
        document.body.innerHTML = `
            <div class="textbook-reader-section-content">
                <p class="md-para"><img class="reader-img" src="./content/exams/cosmetic/교재/law/images/1과목_삽화.webp" alt="삽화"></p>
                <p class="md-para">본문 문단</p>
            </div>`;
        return document.querySelector('.textbook-reader-section-content');
    }

    it('.reader-img 클릭 시 확대 모달이 열리고 클릭 원본 src/alt를 복제한다', () => {
        const content = buildContentWithImg();
        attachImageZoomIn(content);
        const img = content.querySelector('img.reader-img');
        img.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const modal = document.getElementById('reader-img-zoom-modal');
        expect(modal).toBeTruthy();
        expect(modal.classList.contains('is-hidden')).toBe(false);
        const zoomed = modal.querySelector('.img-zoom-target');
        expect(zoomed.src).toContain('images/1%');
        expect(zoomed.alt).toBe('삽화');
        expect(zoomed.classList.contains('reader-img')).toBe(false);
        closeImageZoom();
        expect(modal.classList.contains('is-hidden')).toBe(true);
    });

    it('본문 문단 클릭은 모달을 열지 않고, 재바인딩은 위임이라 중복되지 않는다', () => {
        const content = buildContentWithImg();
        attachImageZoomIn(content);
        attachImageZoomIn(content); // 재렌더 재호출 방어
        content.querySelectorAll('p.md-para')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const modal = document.getElementById('reader-img-zoom-modal');
        expect(!modal || modal.classList.contains('is-hidden')).toBe(true);
    });

    it('닫기 버튼·배율 버튼이 동작한다', () => {
        const content = buildContentWithImg();
        openImageZoom(content.querySelector('img.reader-img'));
        const modal = document.getElementById('reader-img-zoom-modal');
        const level = () => parseInt(modal.querySelector('#img-zoom-level').textContent, 10);
        const before = level();
        modal.querySelector('#img-zoom-in').click();
        expect(level()).toBeGreaterThan(before);
        modal.querySelector('#img-zoom-out').click();
        expect(level()).toBe(before);
        modal.querySelector('#img-zoom-close').click();
        expect(modal.classList.contains('is-hidden')).toBe(true);
    });

    it('주 포인터가 coarse(모바일)여도 바인딩한다 — 모달 내 핀치 제스처가 대체 (TR-26)', () => {
        const origMM = window.matchMedia;
        window.matchMedia = (q) => ({
            matches: q === '(pointer: coarse)',
            media: q,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            onchange: null,
            dispatchEvent: () => false,
        });
        try {
            const content = buildContentWithImg();
            attachImageZoomIn(content);
            content.querySelector('img.reader-img')
                .dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(document.getElementById('reader-img-zoom-modal')).not.toBeNull();
        } finally {
            window.matchMedia = origMM;
        }
    });
});

describe('SC-15 읽기 하트비트·청크 커버리지', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        resetReaderState();
        loadIndexHtml();
        vi.clearAllMocks();
    });

    it('뷰 활성 동안 스크롤 없는 체류 시간도 readMin으로 누적된다', () => {
        vi.useFakeTimers();
        try {
            stopReadingSession(); // 이전 테스트가 시작한 실타이머 제거
            el('textbook-reader-view').classList.add('active');
            startReadingSession();
            vi.advanceTimersByTime(61000); // 15초 틱 × 4 → 누적 60초 경과 시 readMin 1
            const cal = storedJson(STORAGE_KEYS.STUDY_CALENDAR) || {};
            expect(cal[getTodayStr()].readMin).toBeGreaterThanOrEqual(1);
        } finally {
            stopReadingSession();
            vi.useRealTimers();
        }
    });

    it('뷰 비활성 동안은 누적되지 않고 누적분이 리셋된다', () => {
        vi.useFakeTimers();
        try {
            stopReadingSession();
            const view = el('textbook-reader-view');
            view.classList.add('active');
            startReadingSession();
            vi.advanceTimersByTime(45000); // 3틱(45초) 누적 — 아직 1분 미달
            view.classList.remove('active'); // 뷰 이탈
            vi.advanceTimersByTime(120000); // 비활성 동안 틱은 no-op + 누적 리셋
            const cal = storedJson(STORAGE_KEYS.STUDY_CALENDAR) || {};
            expect(cal[getTodayStr()]?.readMin || 0).toBe(0);
        } finally {
            stopReadingSession();
            vi.useRealTimers();
        }
    });

    it('체류 청크만 커버리지에 누적 — 점프는 착지 청크 1개만 반영', () => {
        vi.useFakeTimers();
        try {
            stopReadingSession();
            el('textbook-reader-view').classList.add('active');
            const cont = el('textbook-reader-container');
            Object.defineProperty(cont, 'scrollHeight', { value: 1000, configurable: true });
            Object.defineProperty(cont, 'clientHeight', { value: 100, configurable: true });
            textbookReaderState.selectedSubject = 'subja';
            cont.scrollTop = 500; // frac 0.55 → 청크 55
            startReadingSession();
            vi.advanceTimersByTime(15000); // 1틱
            let prog = storedJson(STORAGE_KEYS.READER_PROGRESS) || {};
            expect(prog.subja.chunks).toEqual([55]);
            expect(prog.subja.frac).toBeCloseTo(0.01, 5);
            // 이어하기/목차 점프 → 끝으로 이동해도 착지 청크 1개만 추가
            cont.scrollTop = 895; // frac ≈0.994 → 청크 99
            vi.advanceTimersByTime(15000);
            prog = storedJson(STORAGE_KEYS.READER_PROGRESS) || {};
            expect(prog.subja.chunks).toEqual([55, 99]);
            expect(prog.subja.frac).toBeCloseTo(0.02, 5);
        } finally {
            stopReadingSession();
            vi.useRealTimers();
        }
    });

    it('전 과목 커버리지 100% 도달 시 일독 완료 모달 1회 통지 (TR-28)', () => {
        vi.useFakeTimers();
        try {
            stopReadingSession();
            el('textbook-reader-view').classList.add('active');
            const cont = el('textbook-reader-container');
            Object.defineProperty(cont, 'scrollHeight', { value: 1000, configurable: true });
            Object.defineProperty(cont, 'clientHeight', { value: 100, configurable: true });
            textbookReaderState.selectedSubject = 'subja';
            // 레지스트리 미스텁 → 분모는 관측 과목 수(1). 99개 청크 완료 상태로 시드
            safeSetItem(STORAGE_KEYS.READER_PROGRESS, JSON.stringify({
                subja: { chunks: Array.from({ length: 99 }, (_, i) => i), frac: 0.99, ts: Date.now() }
            }));
            cont.scrollTop = 895; // 청크 99 방문 → 커버리지 100%
            startReadingSession();
            vi.advanceTimersByTime(15000); // 1틱 — 완료 도달
            const prog = storedJson(STORAGE_KEYS.READER_PROGRESS) || {};
            expect(prog.subja.frac).toBe(1);
            expect(showAlert).toHaveBeenCalledTimes(1);
            expect(safeGetItem(STORAGE_KEYS.READ_THROUGH_DONE)).toBeTruthy();
            vi.advanceTimersByTime(45000); // 추가 틱 — 플래그로 재통지 억제
            expect(showAlert).toHaveBeenCalledTimes(1);
        } finally {
            stopReadingSession();
            vi.useRealTimers();
        }
    });

    it('커버리지 미달 시 통지 없음 — 진행 중에는 발화하지 않는다 (TR-28)', () => {
        vi.useFakeTimers();
        try {
            stopReadingSession();
            el('textbook-reader-view').classList.add('active');
            const cont = el('textbook-reader-container');
            Object.defineProperty(cont, 'scrollHeight', { value: 1000, configurable: true });
            Object.defineProperty(cont, 'clientHeight', { value: 100, configurable: true });
            textbookReaderState.selectedSubject = 'subja';
            cont.scrollTop = 500; // 청크 55 하나만 — 커버리지 1%
            startReadingSession();
            vi.advanceTimersByTime(30000); // 2틱
            expect(showAlert).not.toHaveBeenCalled();
            expect(safeGetItem(STORAGE_KEYS.READ_THROUGH_DONE)).toBeNull();
        } finally {
            stopReadingSession();
            vi.useRealTimers();
        }
    });
});
