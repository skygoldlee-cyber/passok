// tests/dom/pro-notice.dom.test.js — Pro 안내 수렴 (전역 1회 seen + 배지→플랜 비교 경로)
// @spec ROAD-P5,ROAD-P6
// 기능별 첫 진입 모달을 전역 1회로 수렴하고, PRO 배지를 플랜 비교 단일 진입점으로
// 만드는 정책을 고정한다 — 동일 내용의 모달 반복 노출과 재노출 회귀 차단.

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    trapFocus: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import { loadIndexHtml } from '../helpers.js';
import { loadFeaturePlan, proFeatureNotice, refreshProBadges, mountProMoment, shouldShowProMoment, showStoreError } from '../../../src/pro-upgrade.js';
import { safeGetItem, safeSetItem } from '../../../src/state.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

function stubPlan(features) {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: 1, features }),
    })));
    return loadFeaturePlan();
}

function overlay() { return document.getElementById('pro-upgrade-overlay'); }
function seenMap() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRO_NOTICE_SEEN) || '{}'); }

beforeEach(() => {
    localStorage.clear();
    loadIndexHtml();
    overlay()?.remove();
    window.EXAMS_LIST = { exams: [{
        id: 'cosmetic', default: true, name: '테스트 시험',
        features: { formula: true },
    }] };
});

describe('Pro 안내 전역 1회 수렴 (ROAD-P5)', () => {
    it('최초 Pro 기능 진입에만 모달을 표시하고 두 번째 기능부터는 표시하지 않는다', async () => {
        await stubPlan({ story_textbook: 'pro', personal_analysis: 'pro' });
        proFeatureNotice('story_textbook', '이야기형 교재 본문 읽기');
        expect(overlay()).not.toBeNull();
        expect(overlay().textContent).toContain('이야기형 교재 본문 읽기');
        expect(seenMap()._global).toBeTruthy();
        overlay().remove();

        proFeatureNotice('personal_analysis', '학습 진단');
        expect(overlay()).toBeNull();
    });

    it('기존 기능별 seen 데이터가 있으면 _global로 간주해 재노출하지 않는다', async () => {
        localStorage.setItem(STORAGE_KEYS.PRO_NOTICE_SEEN, JSON.stringify({ story_textbook: '2026-10-01T00:00:00' }));
        await stubPlan({ personal_analysis: 'pro' });
        proFeatureNotice('personal_analysis', '학습 진단');
        expect(overlay()).toBeNull();
        expect(seenMap()._global).toBeTruthy();
    });

    it('free 플랜 기능 진입은 seen을 기록하지 않고 이후 pro 기능에 모달을 표시한다', async () => {
        await stubPlan({ mock_exam: 'free', story_textbook: 'pro' });
        proFeatureNotice('mock_exam', '실전 모의고사');
        expect(overlay()).toBeNull();
        expect(seenMap()._global).toBeUndefined();

        proFeatureNotice('story_textbook', '이야기형');
        expect(overlay()).not.toBeNull();
    });
});

describe('PRO 배지 → 플랜 비교 단일 경로 (ROAD-P5)', () => {
    it('refreshProBadges가 배지에 showPlanCompare 위임 속성과 버튼 역할을 부여한다', async () => {
        document.body.innerHTML = '<span class="pro-badge" data-pro-feature="story_textbook">PRO</span>';
        await stubPlan({ story_textbook: 'pro' });
        refreshProBadges(); // 멱등 재호출 — 재부여해도 속성 동일해야 함
        const badge = document.querySelector('[data-pro-feature]');
        expect(badge.getAttribute('data-click')).toBe('showPlanCompare');
        expect(badge.getAttribute('role')).toBe('button');
        expect(badge.getAttribute('tabindex')).toBe('0');
        expect(badge.getAttribute('title')).toContain('플랜 비교');
    });

    it('free 플랜 기능의 배지는 숨기되 동일 진입 속성을 유지한다', async () => {
        document.body.innerHTML = '<span class="pro-badge" data-pro-feature="mock_exam">PRO</span>';
        await stubPlan({ mock_exam: 'free' });
        const badge = document.querySelector('[data-pro-feature]');
        expect(badge.classList.contains('is-hidden')).toBe(true);
        expect(badge.getAttribute('data-click')).toBe('showPlanCompare');
    });

    it('button 안의 배지는 인터랙티브로 승격하지 않는다 (nested-interactive 방지)', async () => {
        document.body.innerHTML = '<button class="nav-item"><span class="pro-badge" data-pro-feature="personal_analysis">PRO</span></button>';
        await stubPlan({ personal_analysis: 'pro' });
        const badge = document.querySelector('[data-pro-feature]');
        expect(badge.getAttribute('data-click')).toBeNull();
        expect(badge.getAttribute('role')).toBeNull();
        expect(badge.getAttribute('tabindex')).toBeNull();
    });
});

describe('Pro 모멘트 넛지 (ROAD-P6)', () => {
    it('pro 플랜 기능·미entitled·쿨다운 외 → 카드 표시 + seen 기록', async () => {
        await stubPlan({ mock_exam: 'pro' });
        document.body.innerHTML = '<div id="host"></div>';
        mountProMoment(document.getElementById('host'), 'sim_result');
        const card = document.querySelector('.pro-moment-card');
        expect(card).toBeTruthy();
        expect(card.textContent).toContain('실전 모의고사');
        expect(card.querySelector('[data-click="showPlanCompare"]')).toBeTruthy();
        const seen = JSON.parse(safeGetItem(STORAGE_KEYS.PRO_MOMENT_SEEN));
        expect(seen.sim_result).toBeTruthy();
    });

    it('쿨다운 이내 재호출은 카드를 다시 띄우지 않는다', async () => {
        await stubPlan({ mock_exam: 'pro' });
        safeSetItem(STORAGE_KEYS.PRO_MOMENT_SEEN,
            JSON.stringify({ sim_result: new Date().toISOString().slice(0, 19) }));
        document.body.innerHTML = '<div id="host"></div>';
        mountProMoment(document.getElementById('host'), 'sim_result');
        expect(document.querySelector('.pro-moment-card')).toBeNull();
    });

    it('free 플랜 기능·entitled 사용자·알 수 없는 모멘트는 표시 안 함', async () => {
        await stubPlan({ mock_exam: 'free' });
        document.body.innerHTML = '<div id="host"></div>';
        mountProMoment(document.getElementById('host'), 'sim_result');
        expect(document.querySelector('.pro-moment-card')).toBeNull();
        mountProMoment(document.getElementById('host'), 'nope');
        expect(document.querySelector('.pro-moment-card')).toBeNull();
        localStorage.setItem(STORAGE_KEYS.PRO_ENTITLED, '1');
        await stubPlan({ analysis_report: 'pro' });
        mountProMoment(document.getElementById('host'), 'analysis_report');
        expect(document.querySelector('.pro-moment-card')).toBeNull();
    });

    it('shouldShowProMoment — 순수 판정 (플랜·entitlement·쿨다운)', () => {
        const isPro = k => k === 'mock_exam';
        const now = Date.now();
        expect(shouldShowProMoment('sim_result', { isPro, entitled: false, seenMap: {}, now })).toBe(true);
        expect(shouldShowProMoment('sim_result', { isPro, entitled: true, seenMap: {}, now })).toBe(false);
        expect(shouldShowProMoment('sim_result', {
            isPro, entitled: false, now,
            seenMap: { sim_result: new Date(now - 86400000).toISOString() },
        })).toBe(false); // 1일 전 — 쿨다운 내
        expect(shouldShowProMoment('sim_result', {
            isPro, entitled: false, now,
            seenMap: { sim_result: new Date(now - 20 * 86400000).toISOString() },
        })).toBe(true); // 20일 전 — 쿨다운 경과
        expect(shouldShowProMoment('bogus', { isPro, now })).toBe(false);
    });

    it('닫기 버튼으로 카드 제거', async () => {
        await stubPlan({ mock_exam: 'pro' });
        document.body.innerHTML = '<div id="host"></div>';
        mountProMoment(document.getElementById('host'), 'sim_result');
        document.querySelector('[data-pro-moment-dismiss]').click();
        expect(document.querySelector('.pro-moment-card')).toBeNull();
    });
});

describe('showStoreError — 무료 한도 오류 분기', () => {
    it('Free 플랜 한도 오류는 업그레이드 안내 모달로 라우팅된다', async () => {
        const toast = vi.fn();
        await stubPlan({ personal_analysis: 'pro' });
        showStoreError({ error: 'Free 플랜 한도에 도달했습니다' }, '분석', toast);
        expect(toast).not.toHaveBeenCalled();
        expect(overlay() || document.querySelector('.pro-upgrade-dialog')).toBeTruthy();
        // 일반 오류는 토스트로 위임
        showStoreError({ error: '네트워크 오류' }, '분석', toast, '저장 실패');
        expect(toast).toHaveBeenCalledWith('네트워크 오류', 'error');
    });
});
