// tests/e2e/exams/carework/j-522-facility-records.spec.js — J-522 기관 기록 대장 연동 (DSN-46)
// @spec none
// 멤버가 면회 기록·사고 보고서의 '기관에 공유'로 family_visits·incident_reports에
// 기록하면 기관 대장 섹션(vis-facility·inc-facility)과 DB 양쪽에 반영된다.
// 격리: 매 테스트 고유 member 사용자 생성 후 멤버십 2행을 REST 시드.
// 선행: TEST_SUPABASE_* 4키
import { test, expect } from '@playwright/test';
import { requireSupabaseOverride } from '../../support/supabase-override.js';
import {
    requireFacilityEnv, createFacilityUsers, deleteFacilityUsers,
    seedFacilityMembership, restSelect, bootAndLogin, enterView,
} from '../../support/facility-setup.js';

test.describe('J-522 기관 기록 대장 연동 (Supabase)', () => {
    test.use({ serviceWorkers: 'block' });
    let users;
    test.beforeEach(async () => {
        requireSupabaseOverride(test);
        requireFacilityEnv(test);
        test.setTimeout(150_000);
        users = await createFacilityUsers();
    });
    test.afterEach(async () => { await deleteFacilityUsers(users); });

    test('면회 예약 기관 공유 → family_visits 행 + 기관 면회 대장 반영 @p1', async ({ page }) => {
        const fac = await seedFacilityMembership(users);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await bootAndLogin(page, users.member.email);
        await enterView(page, 'care-visit', page.locator('#vis-client'));
        await page.locator('#vis-client').fill('김면회');
        await page.locator('#vis-visitor').fill('홍가족');
        await page.locator('#vis-relation').selectOption({ index: 0 });
        await page.locator('#vis-purpose').fill('면회·물품 전달');
        await page.locator('#care-visit-view [data-click="careVisitFacilitySubmit"]').click();
        await expect(page.locator('.app-toast-item:has-text("기관 면회 대장에 등록했습니다")'),
            '면회 공유 토스트 없음').toBeVisible({ timeout: 15_000 });
        // 기관 면회 대장 섹션에 예약 행 반영
        await expect(page.locator('#vis-facility .care-audit-sec'),
            '기관 면회 대장 미렌더').toContainText('김면회', { timeout: 20_000 });
        await expect(page.locator('#vis-facility')).toContainText('홍가족');

        // DB측 단언 — family_visits (예약 상태 scheduled)
        const visits = await restSelect(
            `family_visits?facility_id=eq.${fac.id}&select=client,visitor_name,status,purpose`);
        expect(visits).toHaveLength(1);
        expect(visits[0].client).toBe('김면회');
        expect(visits[0].visitor_name).toBe('홍가족');
        expect(visits[0].status).toBe('scheduled');

        expect(errors, `pageerror: ${errors.join(' | ')}`).toHaveLength(0);
    });

    test('사고 보고서 기관 공유 → incident_reports 행 + 기관 사고 대장 반영 @p1', async ({ page }) => {
        const fac = await seedFacilityMembership(users);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await bootAndLogin(page, users.member.email);
        await enterView(page, 'care-incident', page.locator('#inc-client'));
        await page.locator('#inc-client').fill('이낙상');
        await page.locator('#inc-place').fill('302호 침실');
        await page.locator('#inc-type').selectOption({ index: 0 });
        await page.locator('#inc-severity').selectOption({ index: 0 });
        await page.locator('#inc-desc').fill('야간 순회 중 침대 옆 낙상 발견');
        await page.locator('#inc-action').fill('활력징후 확인·간호사 연락');
        await page.locator('#inc-family').check();
        // 기관에 공유 버튼은 더보기 details 안 — J-510과 동일하게 뷰 스코프로 오픈
        await page.locator('#care-incident-view details.care-more-actions > summary').click();
        await page.locator('#care-incident-view [data-click="careIncidentFacilitySubmit"]').click();
        await expect(page.locator('.app-toast-item:has-text("기관 사고 대장에 등록했습니다")'),
            '사고 공유 토스트 없음').toBeVisible({ timeout: 15_000 });
        // 기관 사고 대장 섹션에 행 반영 — 가족통지 표기 포함
        await expect(page.locator('#inc-facility .care-audit-sec'),
            '기관 사고 대장 미렌더').toContainText('이낙상', { timeout: 20_000 });
        await expect(page.locator('#inc-facility')).toContainText('가족통지');

        // DB측 단언 — incident_reports (append-only)
        const incidents = await restSelect(
            `incident_reports?facility_id=eq.${fac.id}&select=client,place,type,description,family_notified`);
        expect(incidents).toHaveLength(1);
        expect(incidents[0].client).toBe('이낙상');
        expect(incidents[0].place).toBe('302호 침실');
        expect(incidents[0].description).toContain('낙상');
        expect(incidents[0].family_notified).toBe(true);

        expect(errors, `pageerror: ${errors.join(' | ')}`).toHaveLength(0);
    });
});
