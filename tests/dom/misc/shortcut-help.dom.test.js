// tests/dom/misc/shortcut-help.dom.test.js — 키보드 단축키 도움말 오버레이
// @spec UX-HELP-01
// 검증: '?' 키로 열기·토글(H) · Esc/배경/닫기 버튼으로 닫기 · 입력 필드에서는 무시(E)

import { describe, it, beforeEach, expect } from 'vitest';
import {
    initShortcutHelp, openShortcutHelp, closeShortcutHelp, isShortcutHelpOpen,
    SHORTCUT_GROUPS,
} from '../../../src/shell/shortcuts-help.js';

function pressKey(key, target) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true,
    }));
    void target;
}

describe('단축키 도움말 오버레이 (UX-HELP-01)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.getElementById('kbd-help-overlay')?.remove();
    });

    it("'?' 키로 열리고 다시 누르면 닫힌다 (토글)", () => {
        initShortcutHelp();
        expect(isShortcutHelpOpen()).toBe(false);
        pressKey('?');
        expect(isShortcutHelpOpen()).toBe(true);
        pressKey('?');
        expect(isShortcutHelpOpen()).toBe(false);
    });

    it('열린 상태에서 Esc로 닫힌다', () => {
        initShortcutHelp();
        pressKey('?');
        expect(isShortcutHelpOpen()).toBe(true);
        pressKey('Escape');
        expect(isShortcutHelpOpen()).toBe(false);
    });

    it('입력 필드 포커스 중에는 ? 가 도움말을 열지 않는다 (E)', () => {
        document.body.innerHTML = '<input id="t" type="text">';
        initShortcutHelp();
        const input = document.getElementById('t');
        input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
        // dispatch on input — bubbles to document, target is INPUT
        expect(isShortcutHelpOpen()).toBe(false);
    });

    it('오버레이 배경 클릭·닫기 버튼으로 닫힌다', () => {
        openShortcutHelp();
        const overlay = document.getElementById('kbd-help-overlay');
        expect(isShortcutHelpOpen()).toBe(true);
        // 닫기 버튼
        overlay.querySelector('[data-kbd-help-close]').click();
        expect(isShortcutHelpOpen()).toBe(false);
        // 배경 클릭
        openShortcutHelp();
        overlay.click();
        expect(isShortcutHelpOpen()).toBe(false);
    });

    it('그룹 목록이 오버레이에 렌더된다', () => {
        openShortcutHelp();
        const body = document.querySelector('.kbd-help-body');
        expect(body).toBeTruthy();
        expect(body.textContent).toContain('Ctrl/⌘+K');
        for (const g of SHORTCUT_GROUPS) expect(body.textContent).toContain(g.title);
        closeShortcutHelp();
    });
});
