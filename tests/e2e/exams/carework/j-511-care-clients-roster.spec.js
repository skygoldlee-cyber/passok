// tests/e2e/exams/carework/j-511-care-clients-roster.spec.js — J-511 수급자 명부·근무표
// @spec none
//
// 수급자 명부 등록 → 기록 작성 시 명부 datalist 제안 → 저장 기록이 명부 항목의
// 통합 이력(clientTimeline)으로 연동되는지 검증 — 스토어 간 이름/ID 해소 계약.
// 교대 근무표는 독립 스토어의 배정 등록·삭제 사이클.
import { test, expect } from '@playwright/test';
import { examSeed } from '../../support/exam-matrix.js';

async function bootTo(page, slug) {
    await page.goto(`/index.html#/${slug}`);
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('.view-section:visible').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('J-511 carework 수급자 명부·근무표', () => {
    test('수급자 등록 → 요양일지 기록 → 명부 이력 연동 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));

        // 1) 명부 등록
        await bootTo(page, 'care-client');
        await page.locator('#cli-name').fill('김연동');
        await page.locator('#cli-status').selectOption('입소중');
        await page.locator('#cli-room').fill('302호');
        await page.locator('#cli-caution').fill('낙상 위험');
        await page.locator('[data-click="careClientSave"]').click();
        await expect(page.locator('#cli-list .care-log-saved-item')).toContainText('김 연동');
        await expect(page.locator('#cli-list .care-log-saved-item')).toContainText('입소중');

        // 2) 일지 작성 — 대상자 입력 시 명부 datalist가 등록 이름을 제안
        await page.goto('/index.html#/care-log');
        await expect(page.locator('#log-client')).toBeVisible({ timeout: 20_000 });
        await page.locator('#log-client').fill('김연동');
        await expect(page.locator('#log-client-list option[value="김연동"]')).toHaveCount(1);
        await page.locator('#log-activities input[type="checkbox"]').first().check();
        await page.locator('[data-click="careLogGenerate"]').click();
        await page.locator('#care-log-view details.care-more-actions > summary').click();
        await page.locator('#care-log-view [data-click="careLogSave"]').click();
        await expect(page.locator('#log-saved .care-log-saved-item')).toContainText('김 연동');

        // 3) 명부 재방문 — 저장된 일지가 수급자 통합 이력으로 연동
        await page.goto('/index.html#/care-client');
        const item = page.locator('#cli-list .care-log-saved-item');
        await expect(item.locator('summary')).toContainText('이력');
        await item.locator('summary').click();
        await expect(item.locator('.care-client-timeline li').first()).toBeVisible();

        // 4) 명부 수정 경로 — '수정' 버튼이 폼에 기존값을 채운다
        await page.locator('#cli-list [data-click="careClientLoad"]').click();
        await expect(page.locator('#cli-name')).toHaveValue('김연동');
        await expect(page.locator('#cli-room')).toHaveValue('302호');
        await page.locator('#cli-room').fill('305호');
        await page.locator('[data-click="careClientSave"]').click();
        await expect(page.locator('#cli-list .care-log-saved-item')).toContainText('305호');
    });

    test('교대 근무표 — 배정 등록→목록→삭제 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-roster');

        await page.locator('#ros-date').fill('2026-11-20');
        await page.locator('#ros-shift').selectOption({ index: 0 });
        await page.locator('#ros-worker').fill('박요양');
        await page.locator('#ros-note').fill('야간 전담');
        await page.locator('[data-click="careRosterAdd"]').click();
        await expect(page.locator('#ros-list .care-log-saved-item')).toContainText('박 요양');
        await expect(page.locator('#ros-list .care-log-saved-item')).toContainText('야간 전담');

        await page.locator('#ros-list [data-click="careRosterDelete"]').click();
        await expect(page.locator('#app-confirm-overlay')).toBeVisible();
        await page.locator('#app-confirm-overlay .app-confirm-ok').click();
        await expect(page.locator('#ros-list .care-log-saved-item')).toHaveCount(0);
    });
});
