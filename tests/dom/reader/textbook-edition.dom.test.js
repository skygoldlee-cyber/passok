// tests/dom/textbook-edition.dom.test.js — 교재 개정 감지 배너 (대시보드)
// @spec P-14
// 검증: 개정 시 배너 표시·문구 반영 → 확인 클릭 시 판본 기록·재억제.
//       동일 판본·미선언·이미 표시 중에는 동작하지 않는다.

import { describe, it, beforeEach, expect } from 'vitest';
import { checkTextbookEditionBanner } from '../../../src/reader/textbook-edition.js';
import { getItem, setItem } from '../../../src/storage.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

const BANNER_HTML = `
<div id="textbook-edition-banner" class="is-hidden">
  <span id="textbook-edition-desc"></span>
  <button id="textbook-edition-dismiss" type="button">확인</button>
</div>`;

const banner = () => document.getElementById('textbook-edition-banner');

describe('교재 개정 배너 (P-14)', () => {
    beforeEach(() => {
        document.body.innerHTML = BANNER_HTML;
        localStorage.clear();
        window.DATA_REGISTRY = { textbookEdition: '2027' };
    });

    it('개정 판본이면 배너를 표시하고 판본 문구를 반영', () => {
        checkTextbookEditionBanner();
        expect(banner().classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('textbook-edition-desc').textContent).toContain('2027');
    });

    it('확인 클릭 시 판본을 기록하고 다음 호출에서 억제', () => {
        checkTextbookEditionBanner();
        document.getElementById('textbook-edition-dismiss').click();
        expect(getItem(STORAGE_KEYS.TEXTBOOK_EDITION_SEEN)).toBe('2027');
        expect(banner().classList.contains('is-hidden')).toBe(true);
        // 같은 판본 재호출 — 재표시되지 않음
        document.getElementById('textbook-edition-desc').textContent = '';
        checkTextbookEditionBanner();
        expect(banner().classList.contains('is-hidden')).toBe(true);
        expect(document.getElementById('textbook-edition-desc').textContent).toBe('');
    });

    it('동일 판본이면 표시하지 않음', () => {
        setItem(STORAGE_KEYS.TEXTBOOK_EDITION_SEEN, '2027');
        checkTextbookEditionBanner();
        expect(banner().classList.contains('is-hidden')).toBe(true);
    });

    it('판본 미선언이면 표시하지 않음', () => {
        window.DATA_REGISTRY = {};
        checkTextbookEditionBanner();
        expect(banner().classList.contains('is-hidden')).toBe(true);
    });

    it('이미 표시 중(is-hidden 없음)이면 재처리하지 않음', () => {
        banner().classList.remove('is-hidden');
        checkTextbookEditionBanner();
        expect(document.getElementById('textbook-edition-desc').textContent).toBe('');
    });
});
