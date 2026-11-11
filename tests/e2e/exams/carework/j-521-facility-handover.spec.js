// tests/e2e/exams/carework/j-521-facility-handover.spec.js — J-521 기관 인수인계 공유 (DSN-46)
// @spec none
// 요양보호사가 care-handover 폼을 작성해 '기관에 공유'(shift_handovers insert)하면
// 같은 기관의 관리책임자(다른 브라우저 컨텍스트)가 대장에서 확인하고 '인수 확인'
// (handover_acks insert)한다 — 작성자 본인 서명은 RLS가 차단하므로 상대가 서명.
// 멱등: beforeEach가 기관을 정리하고 멤버십 2행을 REST 시드해 매 실행 동일 전제.
// 선행: TEST_SUPABASE_* 4키 + seed_test_accounts.js
import { test, expect } from '@playwright/test';
import { requireSupabaseOverride } from '../../support/supabase-override.js';
import {
    requireFacilitySeed, resetFacilityState, seedFacilityMembership, restSelect,
    facilityUserIds, bootAndLogin, enterView,
    FACILITY_ADMIN_EMAIL, FACILITY_MEMBER_EMAIL,
} from '../../support/facility-setup.js';

test.describe('J-521 기관 인수인계 공유 (Supabase 다중 사용자)', () => {
    test.use({ serviceWorkers: 'block' });
    test.beforeEach(async () => {
        requireSupabaseOverride(test);
        requireFacilitySeed(test);
        test.setTimeout(150_000);
        await resetFacilityState();
    });

    test('member 인수인계 공유 → admin 대장 확인 → 인수 서명 → REST 검증 @p1', async ({ browser, contextOptions }) => {
        const fac = await seedFacilityMembership();
        const ctxA = await browser.newContext(contextOptions);
        const ctxB = await browser.newContext(contextOptions);
        try {
            const pageA = await ctxA.newPage();   // 관리책임자 (인수자)
            const pageB = await ctxB.newPage();   // 요양보호사 (인계자)
            const errors = [];
            pageA.on('pageerror', (e) => errors.push(`A: ${e}`));
            pageB.on('pageerror', (e) => errors.push(`B: ${e}`));

            // — 요양보호사: 인수인계 작성 → 기관에 공유 —
            await bootAndLogin(pageB, FACILITY_MEMBER_EMAIL);
            await enterView(pageB, 'care-handover', pageB.locator('#ho-clients'));
            await pageB.locator('#ho-clients').fill('302호 김대상');
            await pageB.locator('#ho-status').fill('식사 양호·수면 보통');
            await pageB.locator('#ho-caution').fill('낙상 주의 — 야간 순회 강화');
            // 기관 인계 섹션은 멤버십 해석 후 지연 렌더
            await expect(pageB.locator('#ho-facility .care-audit-sec'),
                '기관 인계 섹션 미렌더 — 멤버십 해석 실패?').toBeVisible({ timeout: 20_000 });
            await pageB.locator('#ho-facility [data-click="careFacilityHandoverSubmit"]').click();
            await expect(pageB.locator('.app-toast-item:has-text("기관에 인계했습니다")'),
                '인계 성공 토스트 없음').toBeVisible({ timeout: 15_000 });
            await expect(pageB.locator('#ho-facility .care-log-saved-item'))
                .toContainText('김대상', { timeout: 15_000 });

            // — 관리책임자: 같은 기관 대장에서 확인 → 인수 서명 —
            await bootAndLogin(pageA, FACILITY_ADMIN_EMAIL);
            await enterView(pageA, 'care-handover', pageA.locator('#ho-clients'));
            await expect(pageA.locator('#ho-facility .care-audit-sec'),
                'admin 측 기관 인계 섹션 미렌더').toBeVisible({ timeout: 20_000 });
            const hoRow = pageA.locator('#ho-facility .care-log-saved-item', { hasText: '김대상' });
            await expect(hoRow, 'member가 공유한 인수인계가 admin 대장에 없음')
                .toBeVisible({ timeout: 15_000 });
            await hoRow.locator('[data-click="careHandoverAck"]').click();
            await expect(pageA.locator('.app-toast-item:has-text("인수 확인했습니다")'),
                '인수 서명 토스트 없음').toBeVisible({ timeout: 15_000 });
            await expect(pageA.locator('#ho-facility .care-log-saved-item em'))
                .toContainText('1명 인수', { timeout: 15_000 });

            // — DB측 단언: shift_handovers·handover_acks —
            const { admin, member } = await facilityUserIds();
            const handovers = await restSelect(
                `shift_handovers?facility_id=eq.${fac.id}&select=id,author_id,client,memo`);
            expect(handovers).toHaveLength(1);
            expect(handovers[0].author_id).toBe(member);
            expect(handovers[0].client).toBe('302호 김대상');
            const acks = await restSelect(
                `handover_acks?handover_id=eq.${handovers[0].id}&select=user_id`);
            expect(acks).toHaveLength(1);
            expect(acks[0].user_id).toBe(admin);

            expect(errors, `pageerror: ${errors.join(' | ')}`).toHaveLength(0);
        } finally {
            await ctxA.close();
            await ctxB.close();
        }
    });

    test('작성자 본인 인수 서명 — RLS 차단 오류 토스트 @p2', async ({ browser, contextOptions }) => {
        const fac = await seedFacilityMembership();
        // 작성·서명 시도를 같은 사람(member)이 하는 경로 — 멤버십만 있으면 됨
        const ctxB = await browser.newContext(contextOptions);
        try {
            const pageB = await ctxB.newPage();
            await bootAndLogin(pageB, FACILITY_MEMBER_EMAIL);
            await enterView(pageB, 'care-handover', pageB.locator('#ho-clients'));
            await pageB.locator('#ho-clients').fill('305호 이자기');
            await expect(pageB.locator('#ho-facility .care-audit-sec'))
                .toBeVisible({ timeout: 20_000 });
            await pageB.locator('#ho-facility [data-click="careFacilityHandoverSubmit"]').click();
            await expect(pageB.locator('.app-toast-item:has-text("기관에 인계했습니다")'))
                .toBeVisible({ timeout: 15_000 });
            // 본인 인수인계의 '인수 확인' 클릭 — RLS(author_id <> uid)가 insert 차단
            const ownRow = pageB.locator('#ho-facility .care-log-saved-item', { hasText: '이자기' });
            await expect(ownRow).toBeVisible({ timeout: 15_000 });
            await ownRow.locator('[data-click="careHandoverAck"]').click();
            await expect(pageB.locator('.app-toast-item:has-text("인수 확인 실패")'),
                '본인 서명이 RLS 없이 통과됨').toBeVisible({ timeout: 15_000 });
            // DB측 단언: ack 행 없음
            const handovers = await restSelect(
                `shift_handovers?facility_id=eq.${fac.id}&select=id`);
            const acks = await restSelect(
                `handover_acks?handover_id=eq.${handovers[0].id}&select=user_id`);
            expect(acks).toHaveLength(0);
        } finally {
            await ctxB.close();
        }
    });
});
