// tests/dom/misc/telemetry-consent.dom.test.js — 텔레메트리 동의 UX (UX-MET-06)
// @spec UX-MET-06
// 설정 패널 '사용 통계 전송' 토글이 opt-out 플래그를 토글하고 라벨을 갱신함을 고정.
// 거부 시 기능 제한 없이 전송만 차단됨을 검증한다.
import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', async (importOriginal) => ({
    ...(await importOriginal()),
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    trapFocus: vi.fn(() => vi.fn()),
}));

import { loadIndexHtml } from '../helpers.js';
import { isTelemetryAllowed, setTelemetryAllowed, isAutomatedRuntime } from '../../../src/telemetry/telemetry-consent.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

beforeEach(() => {
    localStorage.clear();
    loadIndexHtml();
});

describe('텔레메트리 동의 UX (UX-MET-06)', () => {
    it('설정 패널에 사용 통계 전송 토글 항목이 존재한다', () => {
        const btn = document.querySelector('[data-click="toggleTelemetry"]');
        expect(btn).toBeTruthy();
        expect(btn.textContent).toContain('사용 통계 전송');
        const label = document.getElementById('telemetry-toggle-label');
        expect(label).toBeTruthy();
    });

    it('opt-out 저장 시 isTelemetryAllowed가 false를 반환한다', () => {
        expect(isTelemetryAllowed()).toBe(true);
        setTelemetryAllowed(false);
        expect(isTelemetryAllowed()).toBe(false);
        expect(localStorage.getItem(STORAGE_KEYS.TELEMETRY_OPT_OUT)).toBe('1');
        setTelemetryAllowed(true);
        expect(isTelemetryAllowed()).toBe(true);
    });

    it('opt-out은 기능 제한 없이 전송만 차단 — 설정 항목에 안내 문구가 있다', () => {
        const btn = document.querySelector('[data-click="toggleTelemetry"]');
        // title 속성에 "기능 제한 없음" 안내가 포함되어야 한다
        expect(btn.title).toContain('기능 제한 없음');
    });
});

describe('자동화 런타임 판정 (프로덕션 지표 오염 차단)', () => {
    it('jsdom localhost 환경은 자동화로 판정한다', () => {
        // jsdom hostname=localhost → 프로덕션이 아니므로 true
        expect(isAutomatedRuntime()).toBe(true);
    });
});

describe('error 텔레메트리 — 자동화·동의 게이트', () => {
    it('자동화 런타임(jsdom)은 automated를 반환한다', async () => {
        const { reportClientError, reportSessionPing } = await import('../../../src/telemetry/error-telemetry.js');
        expect(await reportClientError('error', new Error('x'), {}, {})).toBe('automated');
        expect(await reportSessionPing({})).toBe('automated');
    });

    it('동의 거부 시 consent_denied를 반환한다', async () => {
        const { reportSessionPing } = await import('../../../src/telemetry/error-telemetry.js');
        setTelemetryAllowed(false);
        try {
            expect(await reportSessionPing({ automated: false })).toBe('consent_denied');
        } finally {
            setTelemetryAllowed(true);
        }
    });
});
