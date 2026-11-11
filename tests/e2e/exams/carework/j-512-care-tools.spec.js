// tests/e2e/exams/carework/j-512-care-tools.spec.js — J-512 실무 도구·평가
// @spec none
//
// 비용 계산기(입력→결과 표), 대처카드(목록→상세→사고보고서 선기입 연동),
// 평가 체크리스트(체크→진행률→재부팅 지속)를 검증한다.
// 카드→사고보고서는 STORAGE_KEYS.CARE_INCIDENT_DRAFT 초안 소비 계약이다.
import { test, expect } from '@playwright/test';
import { examSeed } from '../../support/exam-matrix.js';

async function bootTo(page, slug) {
    await page.goto(`/index.html#/${slug}`);
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('.view-section:visible').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('J-512 carework 실무 도구·평가', () => {
    test('비용 계산기 — 재가급여 입력→본인부담 결과 표 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-calc');

        await page.locator('#care-type').selectOption('home');
        await page.locator('#care-grade').selectOption({ index: 0 });
        await page.locator('#care-use').fill('1000000');
        await page.locator('#care-nc-meal').fill('300000');
        await page.locator('[data-click="careCalcRun"]').click();

        const result = page.locator('#care-result');
        await expect(result).toContainText('급여 본인부담금');
        await expect(result).toContainText('실제 월 납부액');
        await expect(result).toContainText('150,000'); // 재가 15% 본인부담
    });

    test('대처카드 — 목록→상세 열람→사고보고서 선기입 연동 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-card');

        await page.locator('#care-card-list .care-card-item').first().click();
        await expect(page.locator('#care-card-detail h3')).toBeVisible();
        await expect(page.locator('#care-card-detail .care-card-step').first()).toBeVisible();

        // 대처카드 → 사고보고서 작성 — 초안 소비로 유형·경위가 선기입된다
        await page.locator('[data-click="careCardToIncident"]').click();
        await page.waitForFunction(() => location.hash === '#/care-incident', null, { timeout: 15_000 });
        await expect(page.locator('#inc-desc')).toHaveValue(/대처카드/);
    });

    test('평가 체크리스트 — 항목 체크→진행률→재부팅 지속 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-audit');

        const first = page.locator('#audit-list input[data-audit]').first();
        await expect(first).toBeVisible();
        await first.check();
        await expect(page.locator('#audit-progress')).toContainText('점검 진행 1/');

        // 점검표 미리보기가 렌더된다 (docx·인쇄 파생 원본)
        await expect(page.locator('#audit-preview')).not.toBeEmpty();

        // 재부팅 후에도 체크 상태가 유지된다 (localStorage 지속)
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
        await page.goto('/index.html#/care-audit');
        await expect(page.locator('#audit-list input[data-audit]').first()).toBeChecked({ timeout: 20_000 });
        await expect(page.locator('#audit-progress')).toContainText('점검 진행 1/');
    });
});
