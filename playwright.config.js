// playwright.config.js — E2E (실브라우저) 설정
// jsdom으로 커버 불가한 영역: 앱 부트스트랩, SW 등록, PWA 자산, 네비게이션
// 실행: npm run test:e2e
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 30_000,
    // CI는 공유 러너 부하로 간헐 플레이크(스크롤·타이밍)가 발생해 1회 재시도로 흡수.
    // 로컬은 0 유지 — 만성 플레이크를 숨기지 않도록 로컬에서 먼저 드러나게 한다.
    retries: process.env.CI ? 1 : 0,
    workers: 1, // 단일 정적 서버 — 직렬 실행
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
        // 태블릿 대역 (769–900px 상단 바 네비) — R-*/UX-NAV-01 적응형 경계 커버.
        // Chromium 유지 — WebKit 의존(iPad 프리셋)은 로컬 미설치로 제외
        { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 } } },
    ],
    webServer: {
        command: 'node serve.js 3000',
        url: 'http://localhost:3000/index.html',
        reuseExistingServer: !process.env.CI,
        timeout: 15_000,
    },
});
