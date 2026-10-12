// tests/e2e/visual.spec.js — 스크린샷 시각 회귀 (로컬 게이트)
// @spec none
//
// 픽셀 기준선은 폰트 래스터·AA가 플랫폼마다 달라 생성 OS에서만 유효하다.
// 로컬(Windows)에서 기준선을 생성·커밋하므로 CI(Linux)는 스킵한다.
// 다른 OS에서 개발하면 기준선을 재생성할 것:
//   npx.cmd playwright test tests/e2e/visual.spec.js --update-snapshots
//
// 의도적 시각 변경(테마·배경·레이아웃) 시에도 같은 명령으로 기준선을 갱신하고
// diff를 리뷰한다. 기준선 파일은 tests/e2e/visual.spec.js-snapshots/ 아래
// 프로젝트·플랫폼 접미로 자동 분리된다.

import { test, expect } from '@playwright/test';

test.skip(Boolean(process.env.CI), '시각 기준선은 로컬 플랫폼 전용 — CI 스킵');

// 렌더 시점에 따라 값이 달라지는 요소는 마스크 — 픽셀 비교 대상에서 제외.
// - #sidebar-version / #settings-version: 배포 스탬프로 매 배포 변경
// - #app-toast / #sw-update-toast: SW 갱신·동기화 토스트는 비동기 타이밍 의존
// - 오버레이류: 데이터 상태·버전 알림은 케이스별 등장이 다를 수 있어 제거
const MASK = [
    '#sidebar-version', '#settings-version', '#app-toast', '#sw-update-toast',
];
const REMOVE_OVERLAYS = '#onboarding-overlay, #app-confirm-overlay, #whats-new-overlay,'
    + ' #pro-upgrade-overlay, #usage-stats-overlay, #feedback-overlay';

async function boot(page, theme) {
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'light' : 'dark' });
    await page.addInitScript((t) => {
        localStorage.setItem('current_exam', 'cosmetic');
        localStorage.setItem('appTheme', t);
        localStorage.setItem('cosmetic:appTheme', t);
        localStorage.setItem('onboarding_seen_v1', '1');
        localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
    }, theme);
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
    await page.evaluate((sel) =>
        document.querySelectorAll(sel).forEach(el => el.remove()), REMOVE_OVERLAYS);
    // 폰트·배경 이미지·지연 렌더가 안정된 뒤 촬영
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(500);
}

test.describe('시각 회귀 — 앱 셸 배경·테마', () => {
    const shotOpts = (page) => ({
        animations: 'disabled',
        maxDiffPixelRatio: 0.01, // 안티앨리어싱 미세 차이 허용폭
        mask: MASK.map(s => page.locator(s)), // 미존재 셀렉터는 빈 로케이터로 무시
    });

    test('대시보드 — 다크 테마 (배경화 포함)', async ({ page }) => {
        await boot(page, 'dark');
        await expect(page).toHaveScreenshot('dashboard-dark.png', shotOpts(page));
    });

    test('대시보드 — 라이트 테마 (배경화 포함)', async ({ page }) => {
        await boot(page, 'light');
        await expect(page).toHaveScreenshot('dashboard-light.png', shotOpts(page));
    });
});
