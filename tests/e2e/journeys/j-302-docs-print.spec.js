// tests/e2e/journeys/j-302-docs-print.spec.js — J-302 문서·인쇄 (CO-20 계약)
// @spec CO-20
// 학습안내서(사용자 매뉴얼) 열람 → 인쇄/PDF → 스타일드 PDF 새 탭 미리보기와
// 생성 실패 시 window.print() 폴백 두 분기를 검증 — carework 팩 기준 (DSN-46 §4).
import { test, expect } from '@playwright/test';

const SEED = `(() => {
    const L = localStorage;
    L.setItem('current_exam', 'carework');
    L.setItem('onboarding_seen_v1', '1');
    L.setItem('carework:onboarding_seen_v1', '1');
    L.setItem('telemetry_notice_shown', '1');
    L.setItem('ui_mode', 'study');
    const d = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    L.setItem('exam_date', d);
})()`;

test.describe('J-302 문서·인쇄 (PDF 미리보기·print 폴백)', () => {
    test('매뉴얼 열람 → PDF 미리보기 탭 + 생성 실패 시 인쇄창 폴백 @p2', async ({ page }) => {
        test.setTimeout(90_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 매뉴얼 열기 — 데스크톱 사이드바 / 모바일 더보기 시트
        const manualBtn = page.locator('[data-click="ManualViewer.openManual"]:visible').first();
        if (await manualBtn.count() > 0) {
            await manualBtn.click();
        } else {
            await page.locator('#mobile-more-btn').click();
            await page.locator('#mobile-more-sheet [data-click="ManualViewer.openManual"]').click();
        }
        const article = page.locator('#manual-article');
        await expect(article).toBeVisible({ timeout: 15_000 });
        await expect(article.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });

        // 성공 분기 — 스타일드 PDF 생성 → 새 탭(blob:) 미리보기
        const printBtn = page.locator('[data-manual-print]');
        await expect(printBtn).toBeVisible();
        const [popup] = await Promise.all([
            page.waitForEvent('popup', { timeout: 60_000 }),
            printBtn.click(),
        ]);
        // 새 탭 미리보기 성공 — blob: 팝업 + 성공 토스트 (팝업 URL은 headless에서 미커밋)
        await expect(page.locator('.app-toast-item', { hasText: 'PDF 미리보기' }))
            .toBeVisible({ timeout: 15_000 });
        await popup.close();

        // 실패 분기 — PDF 생성 예외 시 토스트 안내 + window.print() 폴백
        await page.evaluate(() => {
            window.html2canvas = () => Promise.reject(new Error('forced-e2e'));
            window.__printCalls = 0;
            window.print = () => { window.__printCalls++; };
        });
        await printBtn.click();
        await expect(page.locator('.app-toast-item', { hasText: 'PDF 생성 실패' }))
            .toBeVisible({ timeout: 15_000 });
        const printCalls = await page.evaluate(() => window.__printCalls);
        expect(printCalls).toBe(1);

        expect(errors).toEqual([]);
    });
});
