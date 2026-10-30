// tests/e2e/content-pack.spec.js — DA-16 번들 폴백 경로 실측 (content 평문 차단 시뮬레이션)
// @spec DA-16
// 프로덕션 .vercelignore 적용 시 content/*.md가 404 → 번들(pk1) 폴백으로 교재가 렌더되어야 한다.
import { test, expect } from '@playwright/test';

test.describe('DA-16 폴백 경로', () => {
    test('content 평문 차단 시 교재 본문이 인코딩 번들로 렌더된다', async ({ page }) => {
        // 인코딩된 한글 경로 대응 — 디코드 후 교재/ 경로만 404 (manifest·문제은행 등은 유지)
        await page.route(
            url => decodeURIComponent(url.pathname).includes('/교재/'),
            route => route.fulfill({ status: 404 })
        );
        await page.goto('/index.html');
        await page.evaluate(() => {
            localStorage.setItem('current_exam', 'cosmetic');
            localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
        });
        await page.goto('/index.html');
        await page.evaluate(() => { location.hash = '/reader'; });
        await expect(page.locator('#reader-subject-select')).toBeVisible({ timeout: 15_000 });
        await page.locator('#reader-subject-select').selectOption({ index: 1 });
        await expect(page.locator('#textbook-reader-container .reader-section-card').first())
            .toBeVisible({ timeout: 30_000 });
    });
});
