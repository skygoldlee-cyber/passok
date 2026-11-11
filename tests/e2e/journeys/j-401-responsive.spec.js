// tests/e2e/journeys/j-401-responsive.spec.js — J-401 반응형 (가로 오버플로 0 계약)
// @spec none
// 주요 뷰에서 문서 scrollWidth가 뷰포트 폭을 초과하지 않는지 검증 — spec이
// chromium(1280)/mobile(Pixel 7)/tablet(834) 3프로젝트로 자동 실행돼 뷰포트 매트릭스를 채운다 (DSN-46 §4).
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

const VIEWS = [
    ['dashboard', 'dashboard-view'],
    ['exam', 'exam-view'],
    ['quiz', 'quiz-view'],
    ['cards', 'flashcard-view'],
    ['calendar', 'calendar-view'],
    ['analysis', 'analysis-view'],
];

test.describe('J-401 반응형 (가로 오버플로 0)', () => {
    test('주요 뷰 가로 스크롤 없음 @p2', async ({ page }) => {
        test.setTimeout(90_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        const overflow = [];
        for (const [slug, viewId] of VIEWS) {
            await page.evaluate(s => { location.hash = `#/${s}`; }, slug);
            // 뷰 전환 대기 — 대상 섹션이 활성화될 때까지
            await expect(page.locator(`#${viewId}`)).toBeVisible({ timeout: 15_000 });
            await page.waitForTimeout(400); // 지연 렌더·레이아웃 안정화
            const m = await page.evaluate(() => ({
                sw: document.documentElement.scrollWidth,
                cw: document.documentElement.clientWidth,
            }));
            if (m.sw > m.cw + 1) overflow.push(`${viewId}: ${m.sw}px > ${m.cw}px`);
        }

        expect(overflow).toEqual([]);
        expect(errors).toEqual([]);
    });
});
