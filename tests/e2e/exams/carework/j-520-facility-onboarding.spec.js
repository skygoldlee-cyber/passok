// tests/e2e/exams/carework/j-520-facility-onboarding.spec.js — J-520 기관 생성·가입 (DSN-46)
// @spec none
// 관리책임자가 기관을 등록(UI → create_facility RPC)하면 초대 코드가 발급되고,
// 다른 브라우저 컨텍스트의 요양보호사가 그 코드로 가입(UI → join_facility RPC)한다.
// 멱등: beforeEach가 시드 계정 소유 기관을 service role로 삭제해 매 실행 미가입 상태에서 시작.
// 선행: TEST_SUPABASE_* 4키 + seed_test_accounts.js (e2e-facility-admin/member 계정)
import { test, expect } from '@playwright/test';
import { requireSupabaseOverride } from '../../support/supabase-override.js';
import {
    requireFacilitySeed, resetFacilityState, restSelect,
    facilityUserIds, bootAndLogin, enterView,
    FACILITY_ADMIN_EMAIL, FACILITY_MEMBER_EMAIL,
} from '../../support/facility-setup.js';

test.describe('J-520 기관 생성·가입 (Supabase 다중 사용자)', () => {
    // SW precache가 supabase-config.js 오버라이드를 우회하는 경합 차단 (J-102와 동일)
    test.use({ serviceWorkers: 'block' });
    test.beforeEach(async () => {
        requireSupabaseOverride(test);
        requireFacilitySeed(test);
        test.setTimeout(150_000);
        await resetFacilityState();
    });

    test('admin 기관 등록 → 초대 코드 발급 / member 코드 가입 → 멤버 목록 반영 @p1', async ({ browser, contextOptions }) => {
        const ctxA = await browser.newContext(contextOptions);
        const ctxB = await browser.newContext(contextOptions);
        try {
            const pageA = await ctxA.newPage();
            const pageB = await ctxB.newPage();
            const errors = [];
            pageA.on('pageerror', (e) => errors.push(`A: ${e}`));
            pageB.on('pageerror', (e) => errors.push(`B: ${e}`));

            // — 관리책임자: 로그인 → 기관 관리 뷰 → 기관 등록 —
            await bootAndLogin(pageA, FACILITY_ADMIN_EMAIL);
            await enterView(pageA, 'facility-admin', pageA.locator('#fa-name'));
            await pageA.locator('#fa-name').fill('E2E행복요양원');
            await pageA.locator('#fa-biz').fill('123-45-67890');
            await pageA.locator('#facility-admin-view [data-click="facilityAdminCreate"]').click();
            // 등록 성공 → 기관 카드 + 초대 코드 렌더
            const codeEl = pageA.locator('#facility-admin-body strong.care-card-cat');
            await expect(codeEl, '초대 코드 미발급').toBeVisible({ timeout: 15_000 });
            const inviteCode = (await codeEl.textContent() || '').trim();
            expect(inviteCode).toMatch(/^[0-9A-F]{8}$/);
            await expect(pageA.locator('#facility-admin-body')).toContainText('멤버 1명');

            // — 요양보호사: 별도 컨텍스트 로그인 → 코드 가입 → 소속 카드 —
            await bootAndLogin(pageB, FACILITY_MEMBER_EMAIL);
            await enterView(pageB, 'facility-join', pageB.locator('#fj-code'));
            await pageB.locator('#fj-code').fill(inviteCode);
            await pageB.locator('#facility-join-view [data-click="facilityJoin"]').click();
            await expect(pageB.locator('#facility-join-body'),
                '가입 후 소속 카드 미표시').toContainText('E2E행복요양원', { timeout: 15_000 });
            await expect(pageB.locator('#facility-join-body')).toContainText('요양보호사');

            // — 관리책임자: 재진입 시 멤버 2명 반영 —
            await pageA.reload();
            await pageA.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
            await expect(pageA.locator('#facility-admin-body'),
                '가입 반영 후 멤버 수 미갱신').toContainText('멤버 2명', { timeout: 15_000 });

            // — DB측 단언: 기관·멤버십 행 —
            const { admin, member } = await facilityUserIds();
            const facilities = await restSelect(
                `facilities?created_by=eq.${admin}&name=eq.${encodeURIComponent('E2E행복요양원')}&select=id,invite_code`);
            expect(facilities).toHaveLength(1);
            expect(facilities[0].invite_code).toBe(inviteCode);
            const members = await restSelect(
                `facility_members?facility_id=eq.${facilities[0].id}&select=user_id,role`);
            expect(members).toHaveLength(2);
            expect(members.find((m) => m.user_id === admin)?.role).toBe('manager');
            expect(members.find((m) => m.user_id === member)?.role).toBe('worker');

            expect(errors, `pageerror: ${errors.join(' | ')}`).toHaveLength(0);
        } finally {
            await ctxA.close();
            await ctxB.close();
        }
    });

    test('유효하지 않은 초대 코드 — 오류 토스트·미가입 유지 @p2', async ({ browser, contextOptions }) => {
        const ctxB = await browser.newContext(contextOptions);
        try {
            const pageB = await ctxB.newPage();
            await bootAndLogin(pageB, FACILITY_MEMBER_EMAIL);
            await enterView(pageB, 'facility-join', pageB.locator('#fj-code'));
            await pageB.locator('#fj-code').fill('DEADBEEF');
            await pageB.locator('#facility-join-view [data-click="facilityJoin"]').click();
            await expect(pageB.locator('.app-toast-item:has-text("유효하지 않은 초대 코드")'),
                '무효 코드 오류 토스트 없음').toBeVisible({ timeout: 10_000 });
            // 가입 폼이 유지되어야 한다 (소속 카드로 전환되지 않음)
            await expect(pageB.locator('#fj-code')).toBeVisible();
        } finally {
            await ctxB.close();
        }
    });
});
