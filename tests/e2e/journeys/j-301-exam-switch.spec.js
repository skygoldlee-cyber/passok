// tests/e2e/journeys/j-301-exam-switch.spec.js — J-301 콘텐츠 팩 전환 (DA-13 스코프 분리)
// @spec none
// carework↔cosmetic 전환 시 브랜딩·활성 시험 교체와 `<exam>:` 네임스페이스 진도 보존을
// 검증 — 전환은 selectExam의 location.reload() 경로를 그대로 탄다 (DSN-46 §4, P2).
import { test, expect } from '@playwright/test';

// initScript는 전환 리로드마다 재실행 — current_exam은 최초 1회만 시드해야 전환이 유지된다
const SEED = `(() => {
    const L = localStorage;
    if (!L.getItem('current_exam')) L.setItem('current_exam', 'carework');
    L.setItem('onboarding_seen_v1', '1');
    L.setItem('carework:onboarding_seen_v1', '1');
    L.setItem('cosmetic:onboarding_seen_v1', '1');
    L.setItem('telemetry_notice_shown', '1');
    L.setItem('ui_mode', 'study');
    const d = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    L.setItem('exam_date', d);
    // 스코프 보존 검증용 마커 — carework 진도 1건
    L.setItem('carework:sim_results_history', JSON.stringify([
        { date: '2026-01-01T00:00:00Z', examId: 'integrated', rate: 75, subjectRates: { caretheory: 75, careprac: 75 } }
    ]));
})()`;

test.describe('J-301 콘텐츠 팩 전환 (스코프 분리)', () => {
    test('carework↔cosmetic 전환 시 브랜딩 교체·carework 스코프 진도 보존 @p2', async ({ page }) => {
        test.setTimeout(90_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        await expect(page).toHaveTitle(/PassCare|요양보호사/);

        // 시험 선택 뷰 → cosmetic 카드 선택 — selectExam이 리로드 발생
        await page.goto('/index.html#/exams');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const cosmeticCard = page.locator('[data-click="selectExamAction"][data-arg="cosmetic"]');
        await expect(cosmeticCard).toBeVisible({ timeout: 15_000 });
        await Promise.all([
            page.waitForFunction(() => document.title.includes('Passmula'), null, { timeout: 20_000 }),
            cosmeticCard.click(),
        ]);
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 활성 시험 교체 + carework 스코프 진도 무결 — 네임스페이스 분리
        const afterSwitch = await page.evaluate(() => ({
            current: localStorage.getItem('current_exam'),
            careHist: localStorage.getItem('carework:sim_results_history'),
        }));
        expect(afterSwitch.current).toBe('cosmetic');
        expect(afterSwitch.careHist).not.toBeNull();
        expect(JSON.parse(afterSwitch.careHist)[0].rate).toBe(75);

        // carework로 복귀 — 스코프 진도·브랜딩 복원
        await page.goto('/index.html#/exams');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const careworkCard = page.locator('[data-click="selectExamAction"][data-arg="carework"]');
        await expect(careworkCard).toBeVisible({ timeout: 15_000 });
        await Promise.all([
            page.waitForFunction(() => /PassCare|요양보호사/.test(document.title), null, { timeout: 20_000 }),
            careworkCard.click(),
        ]);
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const restored = await page.evaluate(() => ({
            current: localStorage.getItem('current_exam'),
            careHist: JSON.parse(localStorage.getItem('carework:sim_results_history') || '[]'),
        }));
        expect(restored.current).toBe('carework');
        expect(restored.careHist.length).toBe(1);

        expect(errors).toEqual([]);
    });
});
