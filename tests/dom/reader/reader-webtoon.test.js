// tests/dom/reader/reader-webtoon.dom.test.js — 웹툰 모드 리더 렌더
// @spec none
// 검증: 좌측 목차·보조 UI 노출(H — 웹툰 직접 진입 시 목차 미표시 회귀) ·
//   Chapter 그룹핑 목차(H) · 씬 카드 앵커 규약 + TOC 클릭 이동(H) · 빈 슬롯(E)

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { renderWebtoonContent } from '../../../src/views/reader/reader-render.js';
import { parseStorySlots } from '../../../src/reader/webtoon-render.js';

const MD = [
    '## 📚 Chapter 01. 도입',
    '<!-- story:start -->',
    '### 첫 만남',
    '"안녕하세요"',
    '<!-- story:end -->',
    '<!-- story:start -->',
    '### 인사 연습',
    '"반갑습니다"',
    '<!-- story:end -->',
    '## 📚 Chapter 02. 전개',
    '<!-- story:start -->',
    '### 재회',
    '"다시 만났네요"',
    '<!-- story:end -->',
].join('\n');

function setupDom() {
    document.body.innerHTML = `
        <div id="reader-progress-bar" class="is-hidden"></div>
        <div id="reader-toolbar" class="is-hidden">
            <div class="reader-toolbar-divider"></div>
            <div id="reader-chapter-actions-group"></div>
        </div>
        <div id="reader-audio-player-area" class="is-hidden"></div>
        <aside id="reader-toc" class="is-hidden"><nav id="reader-toc-list"></nav></aside>
        <div id="reader-sticky-heading" class="is-hidden"></div>
        <div id="textbook-reader-container" class="story-mode"></div>`;
}

describe('renderWebtoonContent — 웹툰 모드 목차·보조 UI', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        setupDom();
    });

    it('보조 UI(툴바·목차·진행바) 노출 + story-mode 클래스 해제', () => {
        renderWebtoonContent('caretheory', 0, parseStorySlots(MD), undefined);
        expect(document.getElementById('reader-toc').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('reader-toolbar').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('reader-progress-bar').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('textbook-reader-container').classList.contains('story-mode')).toBe(false);
    });

    it('목차는 Chapter 부모 + 씬 자식으로 그룹핑', () => {
        renderWebtoonContent('caretheory', 0, parseStorySlots(MD), undefined);
        const toc = document.getElementById('reader-toc-list');
        const chapters = toc.querySelectorAll('.reader-toc-item.toc-chapter');
        expect(chapters.length).toBe(2);
        expect(chapters[0].textContent).toContain('Chapter 1');
        // Chapter 부모 클릭은 그 챕터 첫 씬 인덱스를 가리킨다
        expect(chapters[1].dataset.sectionIdx).toBe('2');
        const scenes = toc.querySelectorAll('.reader-toc-children .reader-toc-item');
        expect(scenes.length).toBe(3);
        expect(scenes[0].textContent).toContain('첫 만남');
    });

    it('씬 카드는 reader-section-N 앵커 규약 + TOC 클릭으로 이동', () => {
        const spy = vi.fn();
        Element.prototype.scrollIntoView = spy;
        renderWebtoonContent('caretheory', 0, parseStorySlots(MD), undefined);
        const cards = document.querySelectorAll('#textbook-reader-container .reader-section-card');
        expect(cards.length).toBe(3);
        cards.forEach((c, i) => {
            expect(c.id).toBe(`reader-section-${i}`);
            expect(c.dataset.sectionIdx).toBe(String(i));
        });
        // 목차 3번째 씬 클릭 → reader-section-2로 스크롤
        const item = document.querySelector('#reader-toc-list [data-section-idx="2"].toc-level-1');
        item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(spy).toHaveBeenCalled();
    });

    it('빈 슬롯 — 목차 숨김 + 안내 문구 (E)', () => {
        renderWebtoonContent('caretheory', 0, [], undefined);
        expect(document.getElementById('reader-toc-list').innerHTML).toBe('');
        expect(document.getElementById('reader-toc').classList.contains('is-hidden')).toBe(true);
        expect(document.querySelector('.reader-empty')).toBeTruthy();
    });
});
