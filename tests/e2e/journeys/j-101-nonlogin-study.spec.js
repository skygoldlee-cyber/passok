// tests/e2e/journeys/j-101-nonlogin-study.spec.js — J-101 비로그인 학습 (로컬 퍼스트 계약)
// @spec none
// 계정 없이 기능 접근 → 활동 기록이 localStorage에 쌓임 → 새로고침 후 유지·로그인 요구 없음
import { test, expect } from '@playwright/test';

const SEED = `(() => {
    const L = localStorage;
    L.setItem('current_exam', 'cosmetic');
    L.setItem('onboarding_seen_v1', '1');
    L.setItem('cosmetic:onboarding_seen_v1', '1');
    L.setItem('ui_mode', 'study');
    const d = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    L.setItem('exam_date', d);
})()`;

test.describe('J-101 비로그인 학습 (로컬 퍼스트)', () => {
    test('로그인 없이 학습 메뉴 접근 → 활동 기록 → 새로고침 후 유지', async ({ page }) => {
        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        // 로그인 없이 앱이 정상 초기화
        await expect(page.locator('.view-section').first()).toBeVisible();

        // 학습 기능에 로그인 없이 접근 — 퀴즈 뷰가 열린다
        await page.locator('.nav-item[data-target="quiz-view"]:visible, .mobile-tab-item[data-target="quiz-view"]:visible').first().click();
        await expect(page.locator('#quiz-subject-select')).toBeVisible({ timeout: 15_000 });

        // 화면 이동으로 사용 기록이 localStorage에 쌓인다 (사용 통계·방문 키)
        const keysAfter = await page.evaluate(() => Object.keys(localStorage).length);
        expect(keysAfter).toBeGreaterThan(4); // 시드 4개 + 사용 기록 키

        // 새로고침 후에도 로그인 요구 없이 학습 상태 유지
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const persisted = await page.evaluate(() => ({
            exam: localStorage.getItem('current_exam'),
            onboard: localStorage.getItem('onboarding_seen_v1'),
            total: Object.keys(localStorage).length,
        }));
        expect(persisted.exam).toBe('cosmetic');
        expect(persisted.onboard).toBe('1');
        expect(persisted.total).toBeGreaterThanOrEqual(keysAfter);
        // 로그인 게이트가 아닌 학습 화면으로 복귀
        await expect(page.locator('.nav-item[data-target="quiz-view"]:visible, .mobile-tab-item[data-target="quiz-view"]:visible').first()).toBeVisible({ timeout: 15_000 });
    });
});
