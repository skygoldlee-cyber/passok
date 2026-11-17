// tests/dom/reader/reader-progress.dom.test.js — 읽기 진도 바 툴팁·ARIA
// @spec TR-21,TR-22,TR-23
// 검증: 스크롤 시 진도 바 title(호버 툴팁)·aria-valuenow·fill width 동기화

import { describe, it, expect } from 'vitest';
import { bindReaderScrollEvents } from '../../../src/views/reader/reader-toolbar.js';

function setScroll(container, { top, height, client }) {
    Object.defineProperty(container, 'scrollTop', { value: top, configurable: true });
    Object.defineProperty(container, 'scrollHeight', { value: height, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: client, configurable: true });
}

async function settle() {
    // rAF 디바운스 + 스크롤 이벤트 처리 대기
    await new Promise(r => setTimeout(r, 50));
}

describe('진도 바 호버 툴팁·ARIA 진행률', () => {
    it('스크롤 시 title·aria-valuenow·fill width가 진도 %로 갱신된다', async () => {
        document.body.innerHTML = `
            <div id="reader-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="읽기 진도">
                <div id="reader-progress-fill"></div>
                <span id="reader-section-progress"></span>
            </div>
            <div id="textbook-reader-container"></div>`;
        const container = document.getElementById('textbook-reader-container');
        const bar = document.getElementById('reader-progress-bar');
        const fill = document.getElementById('reader-progress-fill');

        bindReaderScrollEvents();

        setScroll(container, { top: 750, height: 2000, client: 500 }); // 750/1500 = 50%
        container.dispatchEvent(new Event('scroll'));
        await settle();
        expect(fill.style.width).toBe('50%');
        expect(bar.title).toBe('읽기 진도 50%');
        expect(bar.getAttribute('aria-valuenow')).toBe('50');

        // 동일 바인딩 재스크롤 — readerScrollBound는 모듈 상태라 새 바인딩 불가
        setScroll(container, { top: 1500, height: 2000, client: 500 }); // 끝
        container.dispatchEvent(new Event('scroll'));
        await settle();
        expect(bar.title).toBe('읽기 진도 100%');
        expect(bar.getAttribute('aria-valuenow')).toBe('100');
    });
});
