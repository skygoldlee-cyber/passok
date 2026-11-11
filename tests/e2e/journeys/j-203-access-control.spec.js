// tests/e2e/journeys/j-203-access-control.spec.js — J-203 접근 제어 (Pro 배지 게이트)
// @spec none
// 비인가 상태에서 feature-plan의 pro 표기 항목 — 배지 노출(free 대비)·최초 진입 안내·
// 1회성·무료 체험 비차단 계약 검증 — carework 팩 기준 (DSN-46 §4, 결제 미도입으로 게이트는 안내형).
import { test, expect } from '@playwright/test';

const SEED = `(() => {
    const L = localStorage;
    L.setItem('current_exam', 'carework');
    L.setItem('onboarding_seen_v1', '1');
    L.setItem('carework:onboarding_seen_v1', '1');
    L.setItem('telemetry_notice_shown', '1');
    L.setItem('ui_mode', 'practice');
    const d = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    L.setItem('exam_date', d);
})()`;

test.describe('J-203 접근 제어 (Pro 배지 게이트)', () => {
    test('pro 배지 노출·최초 안내 1회·무료 체험 비차단 @p1', async ({ page }) => {
        test.setTimeout(60_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);

        // free 표기(mock_exam) 배지는 숨김 — feature-plan 매핑이 DOM에 반영됨
        // (practice 모드에서 exam 뷰는 비활성이라 요소 존재·클래스만 검증)
        await page.goto('/index.html#/exam');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        await page.waitForSelector('[data-pro-feature="mock_exam"]', { state: 'attached', timeout: 15_000 });
        const mockBadge = page.locator('[data-pro-feature="mock_exam"]').first();
        await expect(mockBadge).toHaveClass(/is-hidden/);

        // pro 표기(care_log_save) 배지는 요양일지 뷰의 저장 버튼에 노출
        await page.goto('/index.html#/care-log');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        // 저장 버튼은 "더보기" details 안 — 펼친 뒤 노출
        await page.locator('#care-log-view .care-more-actions > summary').click();
        const saveBtn = page.locator('[data-click="careLogSave"]');
        await expect(saveBtn).toBeVisible({ timeout: 15_000 });
        const saveBadge = saveBtn.locator('[data-pro-feature="care_log_save"]');
        await expect(saveBadge).toBeVisible();
        await expect(saveBadge).toHaveText('유료');

        // pro 기능 최초 진입 — 필수 폼 충족 후 저장 시 유료 안내 모달 표시
        await page.fill('#log-date', '2026-11-15');
        await page.fill('#log-client', '김○○');
        await page.fill('#log-start', '09:00');
        await page.fill('#log-end', '11:00');
        await saveBtn.click();
        const notice = page.locator('#pro-upgrade-overlay');
        await expect(notice).toBeVisible();
        await expect(notice).toContainText('유료 기능 안내');
        // pro_notice_seen은 GLOBAL_KEYS — 시험 스코프 없이 루트 키
        const seen = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('pro_notice_seen') || '{}'));
        expect(seen._global).toBeTruthy();

        // 안내는 차단이 아님 — 닫으면 저장이 완료돼 목록에 반영
        await notice.locator('.app-confirm-ok').click();
        await expect(page.locator('#log-saved .care-log-saved-item')).toHaveCount(1, { timeout: 15_000 });

        // seen 기록 후 재진입 — 같은 pro 기능 재호출에 안내 재표시 없음 (전역 1회 계약)
        await saveBtn.click();
        await expect(page.locator('#pro-upgrade-overlay')).toBeHidden();
        await expect(page.locator('#log-saved .care-log-saved-item')).toHaveCount(2, { timeout: 15_000 });

        expect(errors).toEqual([]);
    });
});
