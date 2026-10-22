// tests/dom/pro-redeem.dom.test.js — 라이선스 코드 활성화 + plan 서버 동기화 + 결제 안내 게이트
// @spec PAY-01, PAY-02, PAY-03
// 설정의 '라이선스 코드' 다이얼로그가 redeem_code RPC를 호출해 Pro를 활성화하고,
// 로그인 시 profiles.plan → pro_entitled 동기화로 회수·타 기기 전파를 반영한다.

import { describe, it, beforeEach, expect, vi } from 'vitest';

const { mockGetSupabase, mockGetAuthSession, mockOnAuthChange, mockRpc, mockOpenAuthModal, mockReportEvent } = vi.hoisted(() => ({
    mockGetSupabase: vi.fn(),
    mockGetAuthSession: vi.fn(),
    mockOnAuthChange: vi.fn(),
    mockRpc: vi.fn(),
    mockOpenAuthModal: vi.fn(),
    mockReportEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../src/auth-sync/supabase-client.js', () => ({
    getSupabase: mockGetSupabase,
    getAuthSession: mockGetAuthSession,
    onAuthChange: mockOnAuthChange,
}));
vi.mock('../../../src/auth-sync/auth-view.js', () => ({
    openAuthModal: mockOpenAuthModal,
}));
vi.mock('../../../src/usage-telemetry.js', () => ({
    reportEvent: mockReportEvent,
}));
vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    trapFocus: vi.fn(() => () => {}),
}));

import { showToast } from '../../../src/ui-utils.js';
import { showRedeemDialog, syncPlanFromProfile, normalizeCode } from '../../../src/pro-redeem.js';
import { showUpgradeNotice } from '../../../src/pro-upgrade.js';
import { safeGetItem, safeSetItem } from '../../../src/state.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';

const SESSION = { user: { id: 'user-1' } };

function overlay() { return document.getElementById('redeem-overlay'); }
function redeemMsg() { return overlay()?.querySelector('#redeem-msg')?.textContent; }
async function submitCode(value) {
    overlay().querySelector('#redeem-code-input').value = value;
    overlay().querySelector('#redeem-submit').click();
    await vi.waitFor(() => expect(overlay().querySelector('#redeem-submit').disabled).toBe(false));
}

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.clearAllMocks();
    mockGetSupabase.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }) }), rpc: mockRpc });
    mockGetAuthSession.mockResolvedValue(SESSION);
});

describe('showRedeemDialog (PAY-01)', () => {
    it('Supabase 미설정이면 계정 불가 안내 후 종료한다', async () => {
        mockGetSupabase.mockResolvedValue(null);
        await showRedeemDialog();
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('계정 기능'), 'info');
        expect(overlay()).toBeNull();
    });

    it('비로그인이면 로그인 유도 + 인증 모달을 연다', async () => {
        mockGetAuthSession.mockResolvedValue(null);
        await showRedeemDialog();
        expect(mockOpenAuthModal).toHaveBeenCalled();
        expect(overlay()).toBeNull();
    });

    it('코드 성공 시 pro_entitled 설정 + 성공 토스트 + success 이벤트', async () => {
        mockRpc.mockResolvedValue({ data: true, error: null });
        await showRedeemDialog();
        expect(overlay()).not.toBeNull();
        await submitCode(' cafe-ab12-cd34 ');
        expect(mockRpc).toHaveBeenCalledWith('redeem_code', { p_code: 'CAFE-AB12-CD34' });
        expect(safeGetItem(STORAGE_KEYS.PRO_ENTITLED)).toBe('1');
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Pro가 활성화'), 'success');
        expect(mockReportEvent).toHaveBeenCalledWith('code_redeem_attempt');
        expect(mockReportEvent).toHaveBeenCalledWith('code_redeem_success');
        await vi.waitFor(() => expect(overlay()).toBeNull());
    });

    it('무효/사용된 코드는 동일 안내로 오라클을 최소화한다', async () => {
        mockRpc.mockResolvedValue({ data: false, error: null });
        await showRedeemDialog();
        await submitCode('CAFE-XXXX-XXXX');
        expect(safeGetItem(STORAGE_KEYS.PRO_ENTITLED)).toBeNull();
        expect(redeemMsg()).toContain('코드를 확인해주세요');
        expect(mockReportEvent).not.toHaveBeenCalledWith('code_redeem_success');
        expect(overlay()).not.toBeNull();
    });

    it('RPC 오류도 동일 안내, 네트워크 예외는 재시도 안내', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
        await showRedeemDialog();
        await submitCode('TEST-AAAA-BBBB');
        expect(redeemMsg()).toContain('코드를 확인해주세요');

        mockRpc.mockRejectedValue(new Error('network'));
        await submitCode('TEST-CCCC-DDDD');
        expect(redeemMsg()).toContain('네트워크 오류');
    });

    it('빈 코드는 제출하지 않는다', async () => {
        await showRedeemDialog();
        await submitCode('   ');
        expect(mockRpc).not.toHaveBeenCalled();
        expect(redeemMsg()).toContain('코드를 입력해주세요');
    });
});

describe('syncPlanFromProfile (PAY-03)', () => {
    it('plan=pro면 pro_entitled를 세운다', async () => {
        mockGetSupabase.mockResolvedValue({
            from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: { plan: 'pro' }, error: null }) }) }) }),
        });
        expect(await syncPlanFromProfile()).toBe('pro');
        expect(safeGetItem(STORAGE_KEYS.PRO_ENTITLED)).toBe('1');
    });

    it('plan=free면 로컬 잔재 플래그를 정리한다 (회수 반영)', async () => {
        safeSetItem(STORAGE_KEYS.PRO_ENTITLED, '1');
        mockGetSupabase.mockResolvedValue({
            from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: { plan: 'free' }, error: null }) }) }) }),
        });
        expect(await syncPlanFromProfile()).toBe('free');
        expect(safeGetItem(STORAGE_KEYS.PRO_ENTITLED)).toBeNull();
    });

    it('비로그인·조회 오류는 로컬 플래그를 건드리지 않는다', async () => {
        safeSetItem(STORAGE_KEYS.PRO_ENTITLED, '1');
        mockGetAuthSession.mockResolvedValue(null);
        expect(await syncPlanFromProfile()).toBe('skip');
        expect(safeGetItem(STORAGE_KEYS.PRO_ENTITLED)).toBe('1');
    });
});

describe('결제 안내 모달 (PAY-02)', () => {
    it('PAYMENT_NOTICE.enabled=true면 결제 안내·문의 버튼이 노출되고 조회가 계측된다', () => {
        window.EXAMS_LIST = { exams: [{ id: 'cosmetic', default: true, name: '테스트 시험', features: {} }] };
        showUpgradeNotice('카드', '카드의 무료 플랜 한도에 도달했습니다.');
        const dlg = document.querySelector('#pro-upgrade-overlay .app-confirm-dialog');
        expect(dlg).not.toBeNull();
        expect(dlg.textContent).toContain('9,900원 / 90일');
        expect(dlg.textContent).toContain('전액 환불');
        const notice = dlg.querySelector('.pro-payment-notice');
        const contact = dlg.querySelector('.pro-payment-contact');
        expect(notice).not.toBeNull();
        expect(contact).not.toBeNull();
        expect(mockReportEvent).toHaveBeenCalledWith('payment_notice_view');
        dlg.remove?.(); document.getElementById('pro-upgrade-overlay')?.remove();
    });

    it('결제 문의 클릭 시 payment_link_click 계측 + 오픈채팅 링크로 이동한다', () => {
        window.EXAMS_LIST = { exams: [{ id: 'cosmetic', default: true, name: '테스트 시험', features: {} }] };
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        showUpgradeNotice('카드', '한도 도달');
        const contact = document.querySelector('#pro-upgrade-overlay .pro-payment-contact');
        contact.click();
        expect(mockReportEvent).toHaveBeenCalledWith('payment_link_click');
        expect(openSpy).toHaveBeenCalledWith(
            'https://open.kakao.com/o/sWLzJCTi', '_blank', 'noopener');
        openSpy.mockRestore();
        document.getElementById('pro-upgrade-overlay')?.remove();
    });
});

describe('normalizeCode (PAY-01)', () => {
    it('공백·소문자·입력 잡음을 제거해 RPC 인자로 정규화한다', () => {
        expect(normalizeCode(' cafe ab12-cd34 ')).toBe('CAFEAB12-CD34');
        expect(normalizeCode('\t\n CAFE-AB12-CD34 ')).toBe('CAFE-AB12-CD34');
    });
});
