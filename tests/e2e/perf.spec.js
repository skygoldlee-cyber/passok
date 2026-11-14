// tests/e2e/perf.spec.js — 부트 성능 예산 간소판 (실브라우저)
// @spec none
// DOMContentLoaded·LCP 상한 단언 — SW 캐시 미동작·번들 비대화·부트 경로 회귀를
// 숫자로 감지하는 간소 예산. 상한은 "재앙적 회귀" 검출용 여유치이며 미세 성능
// 추적은 별도 프로파일링 대상이다 (런너 부하 변동으로 플레이크 방지).
// chromium 프로젝트만 실행 — 네트워크·렌더 경로는 뷰포트와 무관하게 동일.
import { test, expect } from '@playwright/test';

// 재앙적 회귀 검출용 상한 (ms) — 로컬/CI localhost 정적 서버 기준 여유치
const BUDGET = {
    coldDcl: 15_000,   // 콜드 부트 DOMContentLoaded (~100개 ESM 모듈 fetch 포함)
    warmDcl: 8_000,    // 재방문(활성 SW·HTTP 캐시) DOMContentLoaded
    warmLcp: 10_000,   // 재방문 LCP
};

const measure = (page) => page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const lcp = performance.getEntriesByType('largest-contentful-paint');
    return {
        dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : -1,
        load: nav ? Math.round(nav.loadEventEnd) : -1,
        lcp: lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : -1,
        resources: performance.getEntriesByType('resource').length,
    };
});

// LCP는 지연 콘텐츠의 최종 페인트까지 갱신되므로 buffered 옵저버로 재수집한다 —
// 초기화 시점 직후 getEntries가 비는 타이밍을 흡수.
const measureLcp = (page) => page.evaluate(() => new Promise((resolve) => {
    const seen = [];
    try {
        new PerformanceObserver((list) => seen.push(...list.getEntries()))
            .observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* 미지원 환경 — 예산 판정 생략 */ }
    setTimeout(() => {
        resolve(seen.length ? Math.round(seen[seen.length - 1].startTime) : -1);
    }, 1_500);
}));

test.describe('부트 성능 예산', () => {
    test('콜드·웜 부트의 DCL·LCP가 상한 이내다', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', '성능 예산은 chromium 프로젝트 전용');
        await page.addInitScript(() => {
            localStorage.setItem('current_exam', 'cosmetic');
            localStorage.setItem('onboarding_seen_v1', '1');
            localStorage.setItem('telemetry_notice_shown', '1');
            localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
        });

        // 콜드 부트 — SW 미등록·HTTP 캐시 빈 상태
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const cold = await measure(page);
        expect(cold.dcl, '콜드 DCL 측정 불가').toBeGreaterThan(0);
        expect(cold.dcl, `콜드 DCL ${cold.dcl}ms > ${BUDGET.coldDcl}ms`)
            .toBeLessThan(BUDGET.coldDcl);

        // 웜 리로드 — SW가 제어권을 잡은 뒤면 캐시 히트 경로
        const swControlled = await page.evaluate(() =>
            !!(navigator.serviceWorker && navigator.serviceWorker.controller));
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const warm = await measure(page);
        warm.lcp = await measureLcp(page);
        console.log(`[perf] sw=${swControlled} cold dcl=${cold.dcl} load=${cold.load} res=${cold.resources}`
            + ` | warm dcl=${warm.dcl} load=${warm.load} lcp=${warm.lcp} res=${warm.resources}`);
        expect(warm.dcl, `웜 DCL ${warm.dcl}ms > ${BUDGET.warmDcl}ms`)
            .toBeLessThan(BUDGET.warmDcl);
        if (warm.lcp > 0) {
            expect(warm.lcp, `웜 LCP ${warm.lcp}ms > ${BUDGET.warmLcp}ms`)
                .toBeLessThan(BUDGET.warmLcp);
        }
    });
});
