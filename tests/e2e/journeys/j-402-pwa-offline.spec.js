// tests/e2e/journeys/j-402-pwa-offline.spec.js — J-402 PWA·오프라인 (O-01~07 계약)
// @spec none
// 오프라인 전환 → SW 캐시로 셸 서빙·오프라인 배너 표시 → 온라인 복구 시 배너 해제
// 검증 — carework 팩 기준 (DSN-46 §4, P3).
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

test.describe('J-402 PWA·오프라인', () => {
    test('오프라인 캐시 부팅 → 배너 표시 → 온라인 복구 해제 @p3', async ({ page, context }) => {
        test.setTimeout(120_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // SW 등록·컨트롤 대기 — 최초 방문이면 설치 후 1회 재로드로 컨트롤 확보
        await page.waitForFunction(() => navigator.serviceWorker?.ready !== undefined, null, { timeout: 20_000 })
            .catch(() => {});
        let controlled = await page.evaluate(() => !!navigator.serviceWorker?.controller);
        if (!controlled) {
            await page.reload();
            await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
            controlled = await page.evaluate(() => !!navigator.serviceWorker?.controller);
        }
        test.skip(!controlled, 'service worker 미등록 환경 — SW 캐시 검증 불가');

        // 오프라인 전환 → SW 캐시로 재부팅 (네트워크 0건 셸 서빙)
        await context.setOffline(true);
        await page.goto('/index.html#/dashboard', { timeout: 30_000 });
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        await expect(page.locator('#dashboard-view')).toBeVisible({ timeout: 15_000 });

        // 오프라인 배너 — ping 프로브 실패 누적(유예 15s + 실패 3회×2.5s) 후 표시
        await expect(page.locator('#offline-banner')).toHaveClass(/show/, { timeout: 45_000 });

        // 온라인 복구 → 재부팅 시 배너 비표시 + 정상 서빙
        await context.setOffline(false);
        await page.goto('/index.html#/dashboard', { timeout: 30_000 });
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        await expect(page.locator('#dashboard-view')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('#offline-banner')).not.toHaveClass(/show/, { timeout: 15_000 });

        // 오프라인 프로브 경고(console.warn)는 pageerror가 아님 — 수집 대상 아님
        expect(errors).toEqual([]);
    });
});
