// tests/e2e/exams/carework/care-share.spec.js — Care OS 공유·내보내기 메뉴 실브라우저 계약
// @spec CO-13 — 통합 내보내기 메뉴 (Word .docx 포함), 인수인계 기록 우선 자동 저장
// @spec UX-NAV-17 — 다운로드 파일명·공유 제목이 uiText.title과 동일 명칭 (표시명 단일성)
// jsdom 스크러드와 별개로 실제 다운로드 이벤트·저장 흐름을 검증한다.

import { test, expect } from '@playwright/test';

test.describe('Care OS — 공유·내보내기 (CO-13)', () => {
    test.beforeEach(({ page }) => {
        page.addInitScript(() => {
            localStorage.setItem('current_exam', 'carework');
            localStorage.setItem('onboarding_seen_v1', '1');
            localStorage.setItem('carework:onboarding_seen_v1', '1');
        });
        page._errors = [];
        page.on('pageerror', err => page._errors.push(String(err)));
    });

    const boot = async (page, slug) => {
        await page.goto(`/index.html#/${slug}`);
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
    };

    test('평가 체크리스트 — 메뉴 항목 전체 노출 + Word .docx 다운로드 이벤트', async ({ page }) => {
        await boot(page, 'care-audit');
        await expect(page.locator('#audit-list .care-audit-item').first()).toBeVisible({ timeout: 10_000 });
        await page.locator('#care-audit-view [data-click="careShare"]').click();
        const sheet = page.locator('.care-export-sheet');
        await expect(sheet).toBeVisible();
        for (const label of ['인쇄·PDF 저장', '본문 복사', 'PDF 파일 다운로드', 'Word·한글 파일 다운로드'])
            await expect(sheet.locator('button', { hasText: label })).toBeVisible();
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            sheet.locator('button', { hasText: 'Word·한글 파일 다운로드' }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/평가 체크리스트_\d{4}-\d{2}-\d{2}\.docx$/);
        expect(page._errors).toEqual([]);
    });

    test('인수인계서 — 미저장 공유 시 자동 저장 후 메뉴 오픈 (기록 우선)', async ({ page }) => {
        await boot(page, 'care-handover');
        await page.locator('#ho-from').fill('김계자');
        await page.locator('#ho-to').fill('박수자');
        await page.locator('[data-click="careHandoverExport"]').click();
        await expect(page.locator('.care-export-sheet')).toBeVisible();
        await expect(page.locator('#ho-saved .care-log-saved-item')).toHaveCount(1); // 자동 저장 확인
        expect(page._errors).toEqual([]);
    });
});
