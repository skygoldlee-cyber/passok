// tests/e2e/journeys/j-101-nonlogin-study.spec.js — J-101 비로그인 학습 (로컬 퍼스트 계약)
// @spec none
// 계정 없이 퀴즈 풀이 → localStorage 진도 저장 → 새로고침 후 진도 유지
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
    test('로그인 없이 퀴즈 풀이 → 진도 저장 → 새로고침 후 유지', async ({ page }) => {
        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        // 로그인 없이 앱이 정상 초기화 — 대시보드 영역 표시
        await expect(page.locator('.view-section').first()).toBeVisible();

        // 퀴즈 뷰에서 풀이 시작
        await page.goto('/index.html#/quiz');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const select = page.locator('#quiz-subject-select');
        await expect(select).toBeVisible({ timeout: 15_000 });
        await select.selectOption({ index: 1 });
        await page.locator('#start-quiz-btn').click();
        await expect(page.locator('#quiz-arena-panel')).toBeVisible({ timeout: 30_000 });

        // 첫 문항 응답 — 객관식 또는 OX
        const keyCountBefore = await page.evaluate(() => Object.keys(localStorage).length);
        const option = page.locator(
            '#quiz-options-container:not(.is-hidden) button, #quiz-ox-container:not(.is-hidden) .quiz-ox-btn',
        ).first();
        await expect(option).toBeVisible({ timeout: 10_000 });
        await option.click();
        await page.waitForTimeout(800);

        // 진도·통계가 localStorage에 기록됐는지 — 키 증가로 확인
        const keyCountAfter = await page.evaluate(() => Object.keys(localStorage).length);
        expect(keyCountAfter).toBeGreaterThan(keyCountBefore);

        // 새로고침 후에도 로그인 없이 학습 상태 유지
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        await expect(page.locator('#quiz-subject-select')).toBeVisible({ timeout: 15_000 });
        const persisted = await page.evaluate(() => Object.keys(localStorage).length);
        expect(persisted).toBe(keyCountAfter);
    });
});
