// tests/e2e/visual.spec.js — 스크린샷 시각 회귀
// @spec none
//
// 픽셀 기준선은 폰트 래스터·AA가 플랫폼마다 달라 OS별 기준선을 둔다.
// 커밋된 기준선: linux(CI ubuntu-latest) 전용 — 로컬 실행은 스킵 조건이라
// 기준선 재생성은 visual-baseline.yml이 CI 실패 시 자동 수행(커밋)한다.
// 신규 표면 추가 시 로컬에서 --update-snapshots를 돌리면 win32 기준선이
// 생기므로 커밋하지 말 것 — CI가 최초 실패 후 자동 생성한다.
//
// 기준선 파일은 tests/e2e/visual.spec.js-snapshots/ 아래 프로젝트·플랫폼 접미로 자동 분리된다.

import { test, expect } from '@playwright/test';
import { waitForViewSettled } from './support/geometry.js';

// 렌더 시점에 따라 값이 달라지는 요소는 마스크 — 픽셀 비교 대상에서 제외.
// - #sidebar-version / #settings-version: 배포 스탬프로 매 배포 변경
// - #app-toast / #sw-update-toast: SW 갱신·동기화 토스트는 비동기 타이밍 의존
// - 오버레이류: 데이터 상태·버전 알림은 케이스별 등장이 다를 수 있어 제거
// - #home-date 등 care-home 요약: 오늘 날짜·기록 수 의존
const MASK = [
    '#sidebar-version', '#settings-version', '#app-toast', '#sw-update-toast',
    '#home-date', '#home-summary', '#home-warn', '#home-next',
];
const REMOVE_OVERLAYS = '#onboarding-overlay, #app-confirm-overlay, #whats-new-overlay,'
    + ' #pro-upgrade-overlay, #usage-stats-overlay, #feedback-overlay';

async function boot(page, theme, { exam = 'cosmetic' } = {}) {
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'light' : 'dark' });
    await page.addInitScript(({ t, ex }) => {
        localStorage.setItem('current_exam', ex);
        localStorage.setItem('appTheme', t);
        localStorage.setItem(`${ex}:appTheme`, t);
        localStorage.setItem('onboarding_seen_v1', '1');
        localStorage.setItem('telemetry_notice_shown', '1');
        localStorage.setItem(`${ex}:onboarding_seen_v1`, '1');
        localStorage.setItem('ui_mode', 'study');
        // Pro 배지 첫 진입 안내 오버레이 차단 — 스크린샷 방해 요소
        localStorage.setItem('pro_notice_seen', '{"_global":"2026-01-01T00:00:00"}');
    }, { t: theme, ex: exam });
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
    await page.evaluate((sel) =>
        document.querySelectorAll(sel).forEach(el => el.remove()), REMOVE_OVERLAYS);
    // 폰트·지연 렌더가 안정된 뒤 촬영
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    // CSS 배경화(webp) 디코드 완료 대기 — networkidle은 스타일시트 내
    // background-image 요청 완료를 보장하지 않아 CI에서 잔상 레이스가 났다.
    // computed style에서 url을 추출해 Image.decode()로 확정한다.
    await page.evaluate(() => {
        const urls = [...getComputedStyle(document.body).backgroundImage
            .matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]);
        return Promise.race([
            Promise.all(urls.map(u => {
                const img = new Image();
                img.src = u;
                return img.decode().catch(() => true);
            })),
            new Promise(r => setTimeout(() => r(true), 8_000)),
        ]);
    });
    await page.waitForTimeout(300);
}

test.describe('시각 회귀 — 앱 셸 배경·테마·주요 표면', () => {
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

    test('퀴즈 진행 — 다크 (문항·보기·아레나 크롬)', async ({ page }) => {
        await boot(page, 'dark');
        await page.evaluate(() => { location.hash = '/quiz'; });
        await expect(page.locator('#quiz-view')).toHaveClass(/active/, { timeout: 15_000 });
        const select = page.locator('#quiz-subject-select');
        await expect(select).toBeVisible({ timeout: 20_000 });
        const value = await select.locator('option').nth(1).getAttribute('value');
        await select.selectOption(value);
        // 문항·보기 셔플이 Math.random 기반이라 시드 고정으로 스냅샷 결정성 확보
        await page.evaluate(() => {
            let s = 42 >>> 0;
            Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        });
        await page.locator('#start-quiz-btn').click();
        await expect(page.locator('#quiz-arena-panel')).toBeVisible({ timeout: 30_000 });
        await expect(page).toHaveScreenshot('quiz-arena-dark.png', shotOpts(page));
    });

    test('리더 — 다크 (과목 로드·TOC·본문 카드)', async ({ page }) => {
        await boot(page, 'dark');
        await page.evaluate(() => { location.hash = '/reader'; });
        await expect(page.locator('#textbook-reader-view')).toHaveClass(/active/, { timeout: 15_000 });
        const sel = page.locator('#reader-subject-select');
        await expect(sel).toBeVisible({ timeout: 20_000 });
        await sel.selectOption({ index: 1 });
        await page.waitForFunction(() =>
            document.querySelectorAll('#textbook-reader-container .reader-section-card, #reader-toc-list .reader-toc-item').length > 0,
            null, { timeout: 30_000 });
        await expect(page).toHaveScreenshot('reader-dark.png', shotOpts(page));
    });

    test('설정 패널 오픈 — 다크 (패널 레이아웃·컨트롤 밀도)', async ({ page }) => {
        await boot(page, 'dark');
        await page.locator('#settings-toggle-btn').click();
        await expect(page.locator('#settings-panel')).not.toHaveClass(/is-hidden/);
        // 패널 전이 종료까지 대기 — shotOpts.animations이 CSS 전이를 완료 처리
        await expect(page.locator('.btn-sm[data-click="toggleFontSize"]').first())
            .toBeVisible({ timeout: 10_000 });
        await expect(page).toHaveScreenshot('settings-open-dark.png', shotOpts(page));
    });

    test('carework 실무 홈 — 다크 (시험 도메인 표면)', async ({ page }) => {
        await boot(page, 'dark', { exam: 'carework' });
        await page.evaluate(() => { location.hash = '/care-home'; });
        // 지연 주입(data-lazy-view) 뷰 — 정착 폴링으로 콘텐츠 주입까지 대기
        await waitForViewSettled(page, 'care-home-view');
        await expect(page).toHaveScreenshot('care-home-dark.png', shotOpts(page));
    });
});
