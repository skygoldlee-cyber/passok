// tests/dom/pro-plan.dom.test.js — 플랜 안내 모달 (Free/Pro 비교)
// @spec ROAD-P0, PAY-07
// feature-plan.json의 현재 값을 반영해 기능별 PRO/무료 태그를 렌더링한다 —
// 플랜 전환 시 고객이 보는 비교 표가 설정과 어긋나지 않음을 고정한다.

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
import { loadFeaturePlan, showPlanCompare, showUpgradeNotice, proFeatureNotice, canCloudSync, hasProEntitlement } from '../../../src/pro/pro-upgrade.js';

function stubPlan(features) {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: 1, features }),
    })));
    return loadFeaturePlan();
}

function overlay() { return document.getElementById('pro-upgrade-overlay'); }

beforeEach(async () => {
    localStorage.clear();
    loadIndexHtml();
    overlay()?.remove();
    // 저장 한도 혜택 행은 hasFeature('formula') 게이트 — Formula OS 보유 시험 컨텍스트 주입
    window.EXAMS_LIST = { exams: [{
        id: 'cosmetic', default: true, name: '테스트 시험',
        features: { formula: true },
    }] };
    // 한도 행의 엔티티 라벨은 manifest uiText.planLimits 소유 — 미선언 시험은 행 생략
    const { DataLoader } = await import('../../../src/content/data-loader.js');
    DataLoader.registry = {
        uiText: {
            planLimits: {
                title: '저장 한도 무제한 — 무료 플랜:',
                formula: 'My 포뮬러', customer: '고객',
                material: '원료', batch: '조제 기록',
            },
        },
    };
});

describe('플랜 안내 모달 (showPlanCompare)', () => {
    it('기능별 PRO/무료 태그를 feature-plan.json 값대로 렌더링한다', async () => {
        await stubPlan({ personal_analysis: 'pro', story_textbook: 'pro', mock_exam: 'free' });
        await showPlanCompare();
        const items = [...overlay().querySelectorAll('li')].map(li => li.textContent);
        // 개인화 분석·이야기형은 PRO, 모의고사는 무료 제공
        expect(items.some(t => t.includes('학습 진단') && t.includes('PRO'))).toBe(true);
        expect(items.some(t => t.includes('이야기형') && t.includes('PRO'))).toBe(true);
        expect(items.some(t => t.includes('실전 모의고사') && t.includes('무료 제공'))).toBe(true);
        // Pro 전용 혜택 — 멀티디바이스 동기화·한도 무제한 안내 (formula 시험에서 스토어 상수 유도)
        expect(overlay().textContent).toContain('여러 디바이스 간 학습 상태 공유');
        expect(overlay().textContent).toContain('무제한');
        // 로그인 정책 — 무료 로그인 불필요 / Pro 로그인 필요
        expect(overlay().textContent).toContain('로그인 불필요');
        expect(overlay().textContent).toContain('로그인 필요');
    });

    it('플랜이 free로 바뀌면 해당 기능 태그가 무료 제공으로 전환된다', async () => {
        await stubPlan({ personal_analysis: 'free', story_textbook: 'free' });
        await showPlanCompare();
        const items = [...overlay().querySelectorAll('li')].map(li => li.textContent);
        expect(items.some(t => t.includes('학습 진단') && t.includes('무료 제공'))).toBe(true);
        expect(items.some(t => t.includes('이야기형') && t.includes('무료 제공'))).toBe(true);
    });

    it('도움말 메뉴에 플랜 안내 진입점이 있다', () => {
        const btn = document.querySelector('#help-panel [data-click="showPlanCompare"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toContain('플랜 안내');
    });

    it('설정 메뉴에 라이선스 코드 입력 진입점이 있다', () => {
        const btn = document.querySelector('#settings-panel [data-click="showRedeemCode"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toContain('라이선스 코드');
    });

    it('클라우드 동기화 행이 feature-plan.json의 cloud_sync 값을 반영한다', async () => {
        await stubPlan({ cloud_sync: 'pro' });
        await showPlanCompare();
        const items = [...overlay().querySelectorAll('li')].map(li => li.textContent);
        expect(items.some(t => t.includes('클라우드 동기화') && t.includes('PRO'))).toBe(true);
    });

    it('플랜이 free로 전환되면 Pro 전용 혜택 목록에서도 해당 항목이 빠진다', async () => {
        await stubPlan({ personal_analysis: 'free', story_textbook: 'free', cloud_sync: 'free', audiobook: 'free' });
        await showPlanCompare();
        const text = overlay().textContent;
        expect(text).not.toContain('복합 예상 점수');
        expect(text).not.toContain('서사 삽입 본문');
        expect(text).not.toContain('로그인 계정 기준 여러 디바이스');
    });

    it('오디오북 혜택은 시험 보유 + 플랜 pro일 때만 표시된다', async () => {
        window.EXAMS_LIST.exams[0].features.audiobook = true;
        await stubPlan({ audiobook: 'pro' });
        await showPlanCompare();
        expect(overlay().textContent).toContain('챕터 MP3 청취');
        overlay().remove();
        await stubPlan({ audiobook: 'free' });
        await showPlanCompare();
        expect(overlay().textContent).not.toContain('챕터 MP3 청취');
    });

    it('한도 초과 모달도 플랜·플래그에서 혜택 목록을 유도한다', async () => {
        await stubPlan({ personal_analysis: 'free', story_textbook: 'free', cloud_sync: 'free', audiobook: 'free' });
        showUpgradeNotice('My 포뮬러', 'Free 플랜은 My 포뮬러를 5개까지 저장할 수 있습니다.');
        const text = overlay().textContent;
        expect(text).toContain('My 포뮬러 저장 한도 무제한');
        expect(text).not.toContain('복합 예상 점수');
        expect(text).not.toContain('로그인 계정 기준 여러 디바이스');
        expect(text).not.toContain('챕터 MP3');
    });
});

describe('Pro entitlement 게이트 (canCloudSync)', () => {
    it('cloud_sync가 pro이고 entitlement가 없으면 동기화 불가', async () => {
        await stubPlan({ cloud_sync: 'pro' });
        expect(hasProEntitlement()).toBe(false);
        expect(canCloudSync()).toBe(false);
    });

    it('pro_entitled 플래그가 있으면 동기화 허용', async () => {
        await stubPlan({ cloud_sync: 'pro' });
        localStorage.setItem('pro_entitled', '1');
        expect(hasProEntitlement()).toBe(true);
        expect(canCloudSync()).toBe(true);
    });

    it('cloud_sync가 free로 전환되면 entitlement 없이 동기화 허용', async () => {
        await stubPlan({ cloud_sync: 'free' });
        expect(canCloudSync()).toBe(true);
    });

    // PAY-07 — 로컬 만료일 즉시 판정 (열람 중 만료 경과 시 다음 판정부터 해제)
    it('만료일이 지난 entitlement는 해제된다', async () => {
        await stubPlan({ cloud_sync: 'pro' });
        localStorage.setItem('pro_entitled', '1');
        localStorage.setItem('pro_expires_at', new Date(Date.now() - 86400000).toISOString());
        expect(hasProEntitlement()).toBe(false);
        expect(canCloudSync()).toBe(false);
    });

    it('만료일이 미래면 entitlement 유지, 만료일 없음은 무기한', async () => {
        await stubPlan({ cloud_sync: 'pro' });
        localStorage.setItem('pro_entitled', '1');
        localStorage.setItem('pro_expires_at', new Date(Date.now() + 86400000).toISOString());
        expect(hasProEntitlement()).toBe(true);
        localStorage.removeItem('pro_expires_at');
        expect(hasProEntitlement()).toBe(true);   // 무기한 (관리자 부여)
    });
});

describe('Pro 기능 안내 모달 (proFeatureNotice)', () => {
    it('Pro 기능 진입 시 멀티디바이스 동기화 안내와 비교 버튼을 표시한다', async () => {
        await stubPlan({ story_textbook: 'pro' });
        proFeatureNotice('story_textbook', '이야기형 교재 본문 읽기');
        expect(overlay()).not.toBeNull();
        expect(overlay().textContent).toContain('여러 디바이스 간 학습 상태가 공유');
        expect(overlay().querySelector('.app-confirm-compare')).not.toBeNull();
    });

    it('free 플랜 기능에는 안내를 표시하지 않는다', async () => {
        await stubPlan({ mock_exam: 'free' });
        proFeatureNotice('mock_exam', '실전 모의고사');
        expect(overlay()).toBeNull();
    });
});
