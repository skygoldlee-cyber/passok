// tests/e2e/ux-surfaces.spec.js — UX 표면 실측 (실브라우저)
// @spec UX-HELP-01,TR-30
// 단축키 도움말 오버레이(? 키, 포커스 계약)와 리더 섹션 메모의
// 열기·저장·표시 발현을 검증한다.

import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) => {
    page.addInitScript(() => {
        localStorage.setItem('current_exam', 'cosmetic');
        localStorage.setItem('onboarding_seen_v1', '1');
        localStorage.setItem('telemetry_notice_shown', '1');
        localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
    });
    page._errors = [];
    page.on('pageerror', err => page._errors.push(String(err)));
});

async function boot(page) {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
    await page.evaluate(() => {
        document.querySelectorAll('#app-confirm-overlay, #onboarding-overlay').forEach(el => el.remove());
    });
}

test.describe('단축키 도움말 (UX-HELP-01)', () => {
    test('? 키로 오버레이가 열리고 Esc로 닫힌다', async ({ page }) => {
        await boot(page);
        await page.keyboard.press('?');
        const overlay = page.locator('#kbd-help-overlay');
        await expect(overlay).toBeVisible({ timeout: 5_000 });
        await expect(overlay.locator('[role="dialog"], .dialog-card').first()).toBeVisible();
        await expect(overlay.locator('.kbd-help-list li').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(overlay).toBeHidden({ timeout: 5_000 });
    });

    test('입력 필드 포커스에서는 ? 키가 무시된다', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const inp = document.createElement('input');
            inp.id = 'kbd-test-input';
            document.body.appendChild(inp);
            inp.focus();
        });
        await page.keyboard.press('?');
        await expect(page.locator('#kbd-help-overlay')).toBeHidden();
        expect(page._errors.filter(e => !/favicon|manifest/i.test(e))).toEqual([]);
    });
});

test.describe('리더 섹션 메모 (TR-30)', () => {
    test('메모 버튼 → 에디터 → 저장 → 카드에 표시된다', async ({ page }) => {
        test.setTimeout(60_000);
        await boot(page);
        await page.evaluate(() => { location.hash = '/reader'; });
        await expect(page.locator('#reader-subject-select')).toBeVisible({ timeout: 15_000 });
        await page.locator('#reader-subject-select').selectOption({ index: 1 });
        await page.waitForFunction(() =>
            document.querySelectorAll('#textbook-reader-container .reader-section-card').length > 0,
            null, { timeout: 30_000 });

        const btn = page.locator('.reader-note-btn').first();
        await expect(btn).toBeVisible();
        await btn.click();
        const editor = page.locator('.reader-note-editor');
        await expect(editor).toBeVisible();
        await editor.locator('.reader-note-input').fill('시험 직전 재확인 — 의무 대상 범위');
        await editor.locator('[data-note-save]').click();
        await expect(page.locator('.reader-note-view').first()).toBeVisible();
        await expect(page.locator('.reader-note-view').first()).toContainText('시험 직전 재확인');
        expect(page._errors.filter(e => !/favicon|manifest/i.test(e))).toEqual([]);
    });
});
