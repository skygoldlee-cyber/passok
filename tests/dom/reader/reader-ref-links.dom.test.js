// tests/dom/reader-ref-links.dom.test.js — 참조자료 링크 프리뷰·클릭 위임·원문 배지
// @spec TR-10,G-03,RR-02~06,RR-17,RR-19
// 검증: data-exam-md/data-ref-md/data-ref-html/data-ref-subject/data-glossary 클릭 위임,
//       law.go.kr 오프라인 차단, hover 프리뷰(fetch 스니펫·캐시·실패 처리), 배지 갱신 트리거

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));
vi.mock('../../../src/reader/html-viewer.js', () => ({ openHtmlViewer: vi.fn() }));
vi.mock('../../../src/views/glossary-renderer.js', () => ({ scrollToGlossary: vi.fn() }));
vi.mock('../../../src/views/textbook-reader.js', () => ({ openSubjectChapter: vi.fn() }));
vi.mock('../../../src/notice-check.js', () => ({
    ensureNoticeStatus: vi.fn(() => Promise.resolve({})),
    markStaleRefLinks: vi.fn(),
}));

import { showToast } from '../../../src/ui-utils.js';
import { openHtmlViewer } from '../../../src/reader/html-viewer.js';
import { scrollToGlossary } from '../../../src/views/glossary-renderer.js';
import { openSubjectChapter } from '../../../src/views/textbook-reader.js';
import { ensureNoticeStatus, markStaleRefLinks } from '../../../src/notice-check.js';
import { refreshRefLinkNotices, bindReferenceLinks } from '../../../src/views/reader-ref-links.js';

const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

describe('참조 링크 클릭 위임 (RR-02~06)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '<div id="root"></div>';
        window.ExamViewer = { openExam: vi.fn() };
        bindReferenceLinks();
    });

    it('data-exam-md → ExamViewer.openExam(경로)', () => {
        document.getElementById('root').innerHTML = '<a data-exam-md="exams/s1.md">링크</a>';
        click(document.querySelector('a'));
        expect(window.ExamViewer.openExam).toHaveBeenCalledWith('exams/s1.md');
    });

    it('data-ref-md + data-ref-line → openExam(경로, 라인)', () => {
        document.getElementById('root').innerHTML = '<a data-ref-md="docs/ref.md" data-ref-line="42">링크</a>';
        click(document.querySelector('a'));
        expect(window.ExamViewer.openExam).toHaveBeenCalledWith('docs/ref.md', 42, '');
    });

    it('data-ref-md + data-ref-search → openExam(경로, 라인, 검색어) — 검색 컨텍스트 전달', () => {
        document.getElementById('root').innerHTML =
            '<a data-ref-md="docs/ref.md" data-ref-search="cgmp">링크</a>';
        click(document.querySelector('a'));
        expect(window.ExamViewer.openExam).toHaveBeenCalledWith('docs/ref.md', null, 'cgmp');
    });

    it('data-ref-html → openHtmlViewer(경로·검색·앵커·라인)', () => {
        document.getElementById('root').innerHTML =
            '<a data-ref-html="docs/r.html" data-ref-search="키워드" data-ref-anchor="sec1" data-ref-line="7">링크</a>';
        click(document.querySelector('a'));
        expect(openHtmlViewer).toHaveBeenCalledWith('docs/r.html', '키워드', 'sec1', '7');
    });

    it('data-ref-subject → openSubjectChapter(과목·단원)', () => {
        document.getElementById('root').innerHTML = '<a data-ref-subject="law" data-ref-chapter="1.2">링크</a>';
        click(document.querySelector('a'));
        expect(openSubjectChapter).toHaveBeenCalledWith('law', '1.2');
    });

    it('data-glossary → scrollToGlossary', () => {
        document.getElementById('root').innerHTML = '<a data-glossary="term-1">용어</a>';
        const a = document.querySelector('a');
        click(a);
        expect(scrollToGlossary).toHaveBeenCalledWith('term-1', a);
    });

    it('data-ref-subject 빈 값이면 핸들러 미호출', () => {
        document.getElementById('root').innerHTML = '<a data-ref-subject="">링크</a>';
        click(document.querySelector('a'));
        expect(openSubjectChapter).not.toHaveBeenCalled();
    });

    it('오프라인이면 law.go.kr 외부 링크 차단 + 안내 토스트', () => {
        const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        document.getElementById('root').innerHTML = '<a class="ref-law-ext" href="https://law.go.kr/x">원문</a>';
        const e = new MouseEvent('click', { bubbles: true, cancelable: true });
        document.querySelector('a').dispatchEvent(e);
        expect(e.defaultPrevented).toBe(true);
        expect(showToast).toHaveBeenCalledWith('공식 원문 보기는 온라인 연결이 필요합니다');
        spy.mockRestore();
    });

    it('관련 없는 요소 클릭은 무시', () => {
        document.getElementById('root').innerHTML = '<span>텍스트</span>';
        click(document.querySelector('span'));
        expect(window.ExamViewer.openExam).not.toHaveBeenCalled();
        expect(openHtmlViewer).not.toHaveBeenCalled();
    });
});

describe('참조 링크 프리뷰 (TR-10, RR-17)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        // 모듈 내부 _previewEl은 싱글턴 — body 초기화로 분리되면 재부착이 필요
        const tip = document.getElementById('ref-preview-tooltip');
        document.body.innerHTML = '';
        if (tip) document.body.appendChild(tip);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('data-ref-bound 가드 — 중복 바인딩 방지', () => {
        document.body.insertAdjacentHTML('beforeend', '<a data-ref-html="docs/r.html">링크</a>');
        bindReferenceLinks();
        const a = document.querySelector('a');
        expect(a.getAttribute('data-ref-bound')).toBe('true');
    });

    it('hover → fetch 스니펫 툴팁 표시 (파일명·검색어 컨텍스트)', async () => {
        document.body.insertAdjacentHTML('beforeend',
            '<a data-ref-html="docs/규정.html" data-ref-search="제3조">링크</a>');
        const md = '제1조 총칙. '.repeat(3) + '제3조 정의 및 적용 범위 문단. ' + '후문. '.repeat(40);
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ text: () => Promise.resolve(md) })));
        bindReferenceLinks();
        const a = document.querySelector('a');
        a.dispatchEvent(new MouseEvent('mouseenter'));
        await vi.advanceTimersByTimeAsync(400);
        await vi.runAllTimersAsync();
        const tip = document.getElementById('ref-preview-tooltip');
        expect(tip).toBeTruthy();
        expect(tip.classList.contains('is-hidden')).toBe(false);
        expect(tip.textContent).toContain('규정');
        expect(tip.textContent).toContain('제3조');
    });

    it('fetch 실패 시 오류 메시지 툴팁', async () => {
        // 싱글턴 _previewEl 재부착 유지를 위해 대입 대신 append
        document.body.insertAdjacentHTML('beforeend', '<a data-ref-html="docs/x.html">링크</a>');
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('net'))));
        bindReferenceLinks();
        document.querySelector('a').dispatchEvent(new MouseEvent('mouseenter'));
        await vi.advanceTimersByTimeAsync(400);
        await vi.runAllTimersAsync();
        const tip = document.getElementById('ref-preview-tooltip');
        expect(tip.textContent).toContain('미리보기를 불러올 수 없습니다');
    });

    it('data-ref-html 없는 링크는 프리뷰 바인딩 안 됨', () => {
        document.body.insertAdjacentHTML('beforeend', '<a>링크</a>');
        bindReferenceLinks();
        expect(document.querySelector('a').getAttribute('data-ref-bound')).toBeNull();
    });
});

describe('refreshRefLinkNotices (RR-19)', () => {
    it('상태 확보 후 배지 갱신 호출', async () => {
        const root = document.createElement('div');
        refreshRefLinkNotices(root);
        await vi.waitFor(() => expect(markStaleRefLinks).toHaveBeenCalledWith(root));
        expect(ensureNoticeStatus).toHaveBeenCalled();
    });
});
