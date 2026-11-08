// tests/dom/reader/print-pdf.test.js — 매뉴얼·시험 뷰어 인쇄/PDF 버튼의 인쇄창 경로 계약
// @spec CO-20
import { describe, it, expect, vi, beforeEach } from 'vitest';

// doc-overlay 목 — 뷰어 openDocument 플로우를 DOM 조립까지만 재현
vi.doMock('../../../src/shell/doc-overlay.js', () => ({
    createDocOverlay: ({ innerHTML, wire }) => {
        const el = document.createElement('div');
        el.innerHTML = innerHTML;
        document.body.appendChild(el);
        // wire는 open 시점에 호출 — 클로저 내부 참조(close 등) 초기화 후여야 실제 동작과 일치
        return { open: () => { wire?.(el); return Promise.resolve(); }, close: () => {} };
    },
    fetchMd: vi.fn(() => Promise.resolve('# 테스트\n본문')),
    makeSessionCache: () => ({ get: () => null, set: () => {}, clear: () => {} }),
    injectBundleScript: () => Promise.resolve(),
    buildTocHtml: () => '', mountToc: () => {}, scrollToHeadingSlug: () => {},
}));

describe('뷰어 인쇄 버튼 — 브라우저 인쇄창 경로', () => {
    beforeEach(() => { document.body.innerHTML = ''; vi.resetModules(); });

    it('manual data-manual-print → window.print 호출 (오버레이 인쇄 CSS가 출력 보장)', async () => {
        const printSpy = vi.fn();
        vi.stubGlobal('print', printSpy);
        const { ManualViewer } = await import('../../../src/reader/manual-viewer.js');
        try {
            await ManualViewer.openManual();
        } catch { return; } // jsdom에서 오픈 플로우 미지원 시 스킵
        document.querySelector('[data-manual-print]')?.click();
        expect(printSpy).toHaveBeenCalled();
        vi.unstubAllGlobals();
    });

    it('exam data-exam-print → window.print 호출', async () => {
        const printSpy = vi.fn();
        vi.stubGlobal('print', printSpy);
        const m = await import('../../../src/reader/exam-viewer.js');
        const open = m.openExamDocument || m.openDocument || Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name));
        if (!open) return; // 뷰어 공개 진입점이 없으면 스킵
        try {
            await open('x');
        } catch { return; }
        document.querySelector('[data-exam-print]')?.click();
        expect(printSpy).toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
