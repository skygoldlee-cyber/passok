// tests/e2e/usage-metrics.spec.js — Phase 2 표면 진입 계측 실브라우저 검증
// @spec UX-MET-01,UX-MET-02,UX-MET-03,UX-MET-04,UX-MET-06
// 설계: docs/dev/design/LEARNING_UX_SIMPLIFICATION_DESIGN.md (DOC-DSN-24)
// jsdom 커버 불가 경로: 앱 부트스트랩의 setupEventListeners → initUsageMetrics
// 설치, 실 data-click 위임과의 공존, 클립보드 복사.
import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) => {
    // 첫 방문 분기(시험 선택 뷰 + 온보딩 오버레이)가 클릭을 가로막지 않도록 시드
    page.addInitScript(() => {
        localStorage.setItem('current_exam', 'cosmetic');
        localStorage.setItem('onboarding_seen_v1', '1');
        localStorage.setItem('telemetry_notice_shown', '1');
        localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
    });
});

const appBooted = (page) =>
    page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });

const readActions = (page) => page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('usage_stats') || 'null');
    return (d && d.actions) || {};
});
const actionSum = (actions, prefix) => Object.entries(actions)
    .filter(([k]) => k === prefix || k.startsWith(prefix + ':'))
    .reduce((s, [, n]) => s + n, 0);

test('오늘 할 일 큐 실행 → tq_run:* 계측 (UX-MET-01)', async ({ page }) => {
    await page.goto('/#/dashboard');
    await appBooted(page);
    const tqBtn = page.locator('#weak-subject-recommendation [data-click]').first();
    await expect(tqBtn).toBeVisible();
    const before = actionSum(await readActions(page), 'tq_run');
    await tqBtn.click();
    // 모달/뷰 전환 등 핸들러 동작을 기다릴 필요 없이 계측은 클릭 시점에 기록된다
    await expect.poll(async () => actionSum(await readActions(page), 'tq_run')).toBe(before + 1);
    await page.keyboard.press('Escape'); // 열린 모달 정리
});

test('훈련소 메뉴 카드 → trainer_menu:* 계측 (UX-MET-01)', async ({ page }) => {
    await page.goto('/#/trainer');
    await appBooted(page);
    const card = page.locator('.trainer-menu-card[data-click="openOxDrillSetup"]').first();
    await expect(card).toBeVisible();
    const before = actionSum(await readActions(page), 'trainer_menu');
    await card.click();
    await expect.poll(async () => actionSum(await readActions(page), 'trainer_menu')).toBe(before + 1);
});

test('취약 진술 리뷰 패널 개방 → review_weak_open 계측 (UX-MET-02)', async ({ page }) => {
    await page.goto('/#/review');
    await appBooted(page);
    const panel = page.locator('#review-weak-panel');
    await expect(panel).toBeAttached();
    // 기본 open — 닫은 뒤 재개방해 toggle 이벤트를 유발
    await panel.evaluate((d) => { d.open = false; });
    const before = (await readActions(page)).review_weak_open || 0;
    await panel.locator('summary').click();
    await expect.poll(async () => (await readActions(page)).review_weak_open || 0).toBe(before + 1);
});

test('PRO 배지 클릭 → pro_badge_click 계측 (UX-MET-02)', async ({ page }) => {
    // story_textbook은 feature-plan상 pro — 배지가 표시된다 (combo_drill·mock_exam은 free)
    await page.goto('/#/reader');
    await appBooted(page);
    const badge = page.locator('[data-pro-feature="story_textbook"]:visible').first();
    await expect(badge).toBeVisible();
    const before = (await readActions(page)).pro_badge_click || 0;
    await badge.click();
    await expect.poll(async () => (await readActions(page)).pro_badge_click || 0).toBe(before + 1);
    await page.keyboard.press('Escape'); // 플랜 비교 모달 정리
});

test('내 사용 통계 → 통계 복사가 JSON을 클립보드에 기록 (UX-MET-03)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/#/trainer');
    await appBooted(page);
    // 카드 클릭으로 계측 데이터를 하나 남겨 내보내기 페이로드가 비지 않게 한다
    await page.locator('.trainer-menu-card[data-click="openOxDrillSetup"]').first().click();
    await page.locator('#help-toggle-btn').click();
    await page.locator('[data-click="showUsageStats"]').click();
    const overlay = page.locator('#usage-stats-overlay');
    await expect(overlay.locator('[role="alertdialog"]')).toBeVisible();
    // UX-MET-04 — 표면 진입 계측(trainer_menu)은 유료가치 판정에 산입되지 않는다
    await expect(overlay.locator('.pro-upgrade-benefits')).toContainText('0/20회');
    await overlay.locator('[data-copy-usage]').click();
    await expect.poll(async () => {
        try { return await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { return ''; }
    }).toContain('"v": 1');
    const exported = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
    expect(exported.actions['trainer_menu:openOxDrillSetup']).toBeGreaterThanOrEqual(1);
    await page.keyboard.press('Escape');
});

test('설정 사용 통계 전송 토글 → opt-out 플래그·라벨 갱신 (UX-MET-06)', async ({ page }) => {
    await page.goto('/#/dashboard');
    await appBooted(page);
    await page.locator('#settings-toggle-btn').click();
    const toggle = page.locator('[data-click="toggleTelemetry"]');
    await expect(toggle).toBeVisible();
    // 기본 켜짐 → 클릭하면 opt-out 저장 + 라벨 '꺼짐'
    await toggle.click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('telemetry_opt_out'))).toBe('1');
    await page.locator('#settings-toggle-btn').click();
    await expect(page.locator('#telemetry-toggle-label')).toHaveText('꺼짐');
    // 재클릭 시 복귀
    await page.locator('[data-click="toggleTelemetry"]').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('telemetry_opt_out'))).toBe('0');
});
