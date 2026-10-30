// tests/dom/study/ai-keysettings.dom.test.js — 설정 "AI API 키" BYOK 오버레이
// @spec none
// 검증: 열기→공급자/키/모델 저장→getAiKey 반영(E)·placeholder 마스킹(E)·키 삭제(E)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import { loadIndexHtml } from '../helpers.js';
import { getAiKey, getAiProvider, clearAiKey } from '../../../src/written/written-grading.js';

let openAiKeySettings;

describe('AI API 키 설정 오버레이 (BYOK)', () => {
    beforeEach(async () => {
        localStorage.clear();
        loadIndexHtml();
        clearAiKey();
        // 오버레이 싱글턴이 이전 DOM에 부착돼 분리되는 것 방지 — 모듈 새로 로드
        vi.resetModules();
        ({ openAiKeySettings } = await import('../../../src/ai/ai-key-settings.js'));
    });

    function openAndFill() {
        openAiKeySettings();
        const ov = document.getElementById('aikey-overlay');
        expect(ov).not.toBeNull();
        return ov;
    }

    it('열기 → 공급자·키·모델 저장 → getAiKey 반영 + placeholder 마스킹', async () => {
        const ov = openAndFill();
        ov.querySelector('[data-ak-provider]').value = 'gemini';
        ov.querySelector('[data-ak-key]').value = 'sk-test-key-123456';
        ov.querySelector('[data-ak-model]').value = 'gemini-2.5-flash';
        ov.querySelector('[data-ak-save]').click();
        expect(getAiKey()).toBe('sk-test-key-123456');
        expect(getAiProvider()).toBe('gemini');
        // 재열 때 placeholder에 마스킹된 키 표시
        vi.resetModules();
        ({ openAiKeySettings } = await import('../../../src/ai/ai-key-settings.js'));
        const ov2 = openAndFill();
        expect(ov2.querySelector('[data-ak-key]').placeholder).toContain('키 저장됨');
        expect(ov2.querySelector('[data-ak-key]').placeholder).not.toContain('sk-test-key-123456');
    });

    it('키 삭제 → getAiKey null + placeholder 초기화', async () => {
        const ov = openAndFill();
        ov.querySelector('[data-ak-key]').value = 'sk-x';
        ov.querySelector('[data-ak-save]').click();
        expect(getAiKey()).toBe('sk-x');
        vi.resetModules();
        ({ openAiKeySettings } = await import('../../../src/ai/ai-key-settings.js'));
        const ov2 = openAndFill();
        ov2.querySelector('[data-ak-clear]').click();
        expect(getAiKey()).toBeFalsy();
        expect(ov2.querySelector('[data-ak-key]').placeholder).toContain('API 키 (디바이스 로컬 저장)');
    });
});
