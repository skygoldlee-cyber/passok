// tests/dom/reader/print-prep.test.js — initPrintPrep beforeprint/afterprint 실동작
// @spec CO-21 — window.print() 경로 스크롤 클립·lazy 이미지 해제 안전망
import { describe, it, expect, beforeEach } from 'vitest';
import { initPrintPrep } from '../../../src/shell/app-shell.js';

describe('initPrintPrep — 인쇄 전 스크롤 클립 해제 + lazy 해제, 인쇄 후 복원', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('스크롤 발생 상자는 overflow/max-height 해제 후 복원된다', () => {
        initPrintPrep();
        const box = document.createElement('div');
        box.style.cssText = 'overflow:auto;max-height:200px';
        // jsdom은 레이아웃이 없어 scrollHeight/clientHeight를 직접 부여
        Object.defineProperty(box, 'scrollHeight', { value: 500, configurable: true });
        Object.defineProperty(box, 'clientHeight', { value: 200, configurable: true });
        const img = document.createElement('img');
        img.setAttribute('loading', 'lazy');
        document.body.append(box, img);

        window.dispatchEvent(new Event('beforeprint'));
        expect(box.style.overflow).toBe('visible');   // 스크롤포트 출력분을 전체로 펼침
        expect(box.style.maxHeight).toBe('none');
        expect(img.getAttribute('loading')).toBeNull(); // lazy 이미지 빈 칸 출력 방지

        window.dispatchEvent(new Event('afterprint'));
        expect(box.style.overflow).toBe('auto');      // 화면 상태 복원
        expect(box.style.maxHeight).toBe('200px');
    });

    it('스크롤 미발생 상자는 건드리지 않는다', () => {
        initPrintPrep();
        const box = document.createElement('div');
        box.style.cssText = 'overflow:auto;max-height:200px';
        Object.defineProperty(box, 'scrollHeight', { value: 200, configurable: true });
        Object.defineProperty(box, 'clientHeight', { value: 200, configurable: true });
        document.body.append(box);

        window.dispatchEvent(new Event('beforeprint'));
        expect(box.style.overflow).toBe('auto');      // 스크롤 없으면 원래 상태 유지
        expect(box.style.maxHeight).toBe('200px');
    });
});
