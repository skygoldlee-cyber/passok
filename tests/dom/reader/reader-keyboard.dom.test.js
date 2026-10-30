// @spec TR-24,TR-25
// reader-toolbar.js — 키보드 내비(←/→·Home/End·/·b·ESC) + TOC 활성 항목 자동 스크롤
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { bindReaderKeyboard, syncActiveTocItem } from '../../../src/views/reader/reader-toolbar.js';

const READER_DOM = `
<div id="textbook-reader-view" class="view-section active">
  <input id="reader-in-content-search" type="text" />
  <aside id="reader-toc">
    <nav id="reader-toc-list">
      <a class="reader-toc-item" data-section-idx="0">섹션1</a>
      <a class="reader-toc-item" data-section-idx="1">섹션2</a>
      <a class="reader-toc-item" data-section-idx="2">섹션3</a>
    </nav>
  </aside>
  <div id="reader-toc-backdrop" class="is-hidden"></div>
  <div id="textbook-reader-container">
    <div class="reader-section-card" data-section-idx="0">
      <div class="reader-section-header"><h4 class="reader-section-title">섹션1</h4>
        <button class="reader-bookmark-btn"></button></div>
    </div>
    <div class="reader-section-card collapsed" data-section-idx="1">
      <div class="reader-section-header"><h4 class="reader-section-title">섹션2</h4>
        <button class="reader-bookmark-btn"></button></div>
    </div>
    <div class="reader-section-card" data-section-idx="2">
      <div class="reader-section-header"><h4 class="reader-section-title">섹션3</h4>
        <button class="reader-bookmark-btn"></button></div>
    </div>
  </div>
</div>`;

const cards = () => document.querySelectorAll('.reader-section-card');
const press = (key, target = document.body) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('리더 키보드 내비 (TR-24)', () => {
    let scrollSpy;

    beforeEach(() => {
        document.body.innerHTML = READER_DOM;
        scrollSpy = vi.fn();
        Element.prototype.scrollIntoView = scrollSpy;
        bindReaderKeyboard();
    });

    it('ArrowLeft: 현재 섹션에서 이전 카드로 이동하며 collapsed를 해제한다', () => {
        // jsdom은 getBoundingClientRect가 전부 0 → 스파이 휴리스틱상 cur = 마지막 카드(2)
        press('ArrowLeft');
        expect(scrollSpy).toHaveBeenCalled();
        expect(cards()[1].classList.contains('collapsed')).toBe(false);
    });

    it('ArrowRight: 마지막 섹션에서는 이동하지 않는다', () => {
        press('ArrowRight');
        expect(scrollSpy).not.toHaveBeenCalled();
    });

    it('Home/End: 첫·마지막 섹션으로 이동한다', () => {
        press('Home');
        expect(scrollSpy).toHaveBeenCalledTimes(1);
        press('End');
        expect(scrollSpy).toHaveBeenCalledTimes(2);
    });

    it('/ 키: 본문 검색 입력에 포커스한다', () => {
        press('/');
        expect(document.activeElement.id).toBe('reader-in-content-search');
    });

    it('b 키: 현재 섹션 북마크 버튼을 클릭한다', () => {
        const clicked = vi.fn();
        cards()[2].querySelector('.reader-bookmark-btn').addEventListener('click', clicked);
        press('b');
        expect(clicked).toHaveBeenCalledTimes(1);
    });

    it('입력 필드 포커스 시 단축키가 동작하지 않는다', () => {
        const input = document.getElementById('reader-in-content-search');
        input.focus();
        press('ArrowLeft', input);
        press('b', input);
        expect(scrollSpy).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(input);
    });

    it('ESC: 모바일 TOC 드로어가 열려 있으면 닫는다', () => {
        const toc = document.getElementById('reader-toc');
        toc.classList.add('mobile-open');
        document.getElementById('reader-toc-backdrop').classList.remove('is-hidden');
        press('Escape');
        expect(toc.classList.contains('mobile-open')).toBe(false);
        expect(document.getElementById('reader-toc-backdrop').classList.contains('is-hidden')).toBe(true);
    });

    it('리더 뷰가 비활성이면 단축키가 동작하지 않는다', () => {
        document.getElementById('textbook-reader-view').classList.remove('active');
        press('ArrowLeft');
        press('Home');
        expect(scrollSpy).not.toHaveBeenCalled();
    });
});

describe('TOC 활성 항목 자동 스크롤 (TR-25)', () => {
    beforeEach(() => {
        document.body.innerHTML = READER_DOM;
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('활성 항목이 목차 가시 영역 밖이면 nearest로 스크롤한다', () => {
        const list = document.getElementById('reader-toc-list');
        const active = list.querySelectorAll('.reader-toc-item')[2];
        active.classList.add('active');
        vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 200 });
        vi.spyOn(active, 'getBoundingClientRect').mockReturnValue({ top: 500, bottom: 540 });
        syncActiveTocItem(list);
        expect(active.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('활성 항목이 이미 보이면 스크롤하지 않는다', () => {
        const list = document.getElementById('reader-toc-list');
        const active = list.querySelectorAll('.reader-toc-item')[0];
        active.classList.add('active');
        vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 200 });
        vi.spyOn(active, 'getBoundingClientRect').mockReturnValue({ top: 20, bottom: 50 });
        syncActiveTocItem(list);
        expect(active.scrollIntoView).not.toHaveBeenCalled();
    });
});
