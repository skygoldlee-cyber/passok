import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // DOM 테스트는 jsdom 환경에서 실행
        environment: 'jsdom',
        include: ['tests/dom/**/*.test.js'],
        globals: true,
        // FileReader·타이머 의존 테스트는 부하 상태에서 간헐 실패 가능 — 1회 재시도로 흡수.
        // 만성 플레이크를 숨기지 않도록 2회 이상으로 올리지 않는다.
        retry: 1,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            include: ['src/**/*.js'],
            exclude: [
                'src/auth-sync/supabase-config.js', // 상수 선언만 — 측정 대상 아님
                // jsdom으로 테스트 불가한 환경 의존 모듈 — 분모에서 제외
                'src/types.js',               // JSDoc typedef 선언 전용 (런타임 코드 없음)
                'src/app-fallback.js',        // ESM 로드 실패 복구 부트스트랩 (window.onerror)
                'src/pwa/pwa-install.js',         // beforeinstallprompt 브라우저 이벤트
                'src/pwa/pwa-install-capture.js', // 모듈 로드 즉시 beforeinstallprompt 캡처
                'src/pwa/pwa-manifest.js',        // 매니페스트 링크 교체 (로드 즉시 실행)
                'src/theme-init.js',          // DOM 이전 즉시 실행 스크립트
                'src/web-vitals.js',          // PerformanceObserver
                'src/views/reader-audio.js',  // Audio API
                'src/app.js',                 // 진입점 오케스트레이터 — import 자체가 부팅 부작용, E2E 영역
                'src/exam-data-boot.js',      // 클래식 스크립트(비ESM) — 모듈 import 불가
            ],
            // 커버리지 하한선 — 실측 베이스라인(2026-10-13, 부트스트랩 제외 분모 정정): stmts 67.49 / branches 53.03 / funcs 68.51 / lines 72.04
            // 대비 ~0.5pt 여유분. 테스트 추가 시 점진 상향 (하향 수정은 CHANGES.md에 사유 기록 필수).
            thresholds: {
                lines: 71.5,
                statements: 67,
                functions: 68,
                branches: 52.5,
            },
        },
    },
});
