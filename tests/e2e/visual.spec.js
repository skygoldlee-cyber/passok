// tests/e2e/visual.spec.js — 스크린샷 시각 회귀
// @spec none
//
// 픽셀 기준선은 폰트 래스터·AA가 플랫폼마다 달라 OS별 기준선을 둔다.
// 현재 커밋된 기준선: win32(로컬 개발) + linux(CI ubuntu-latest).
// 의도적 시각 변경(테마·배경·레이아웃) 후 기준선 갱신:
//   - Windows 로컬: npx.cmd playwright test tests/e2e/visual.spec.js --update-snapshots
//   - Linux(CI용):  .github/workflows/visual-baseline.yml 수동 트리거 → 아티팩트 커밋
// 기준선 파일은 tests/e2e/visual.spec.js-snapshots/ 아래 프로젝트·플랫폼 접미로 자동 분리된다.

import { test, expect } from '@playwright/test';

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
        localStorage.setItem('telemetry_notice_shown', '1');
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
    // 픽셀 기준선은 linux(CI)만 관리 — 로컬 실행·win32 기준선 폐기, 기준선 재생성은
    // visual-baseline.yml이 CI 실패 시 자동 수행 (테스트 유지비 경감)
    test.beforeEach(() => { test.skip(!process.env.CI, 'CI(linux) 전용'); });
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
