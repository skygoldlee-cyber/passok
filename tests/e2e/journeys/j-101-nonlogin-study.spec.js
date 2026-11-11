// tests/e2e/journeys/j-101-nonlogin-study.spec.js — J-101 비로그인 학습 (로컬 퍼스트 계약)
// @spec none
// 계정 없이 시험 진입 → 개념 학습(careFlow) 완주 → 진도 표시 → localStorage 기록 → 새로고침 후 유지·로그인 요구 없음
// 시험팩 자동화 우선순위: carework (DOC-DSN-46 §4)
// 학습 경로: careFlow 4단계(미리풀기→이야기→요약→시나리오) + 교재 용어표 파생 카드·퀴즈
// (caretheory Ch.02 파일럿 — data-needs="cards|quizzes" 게이트 해제 회귀도 함께 검증).
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

test.describe('J-101 비로그인 학습 (로컬 퍼스트)', () => {
    test('로그인 없이 개념 학습 완주 → 진도 표시 → localStorage 기록 → 새로고침 후 유지 @p1', async ({ page }) => {
        test.setTimeout(90_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        // 로그인 없이 앱이 정상 초기화
        await expect(page.locator('.view-section').first()).toBeVisible();

        // 로그인 없이 개념 학습 진입 — 첫 번째 개념 선택 (개념·문항 번들 온디맨드 로드)
        await page.locator('.nav-item[data-target="care-flow-view"]:visible, .mobile-tab-item[data-target="care-flow-view"]:visible').first().click();
        const conceptSel = page.locator('#flow-concept');
        await expect(conceptSel.locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
        const conceptId = await conceptSel.locator('option').nth(1).getAttribute('value');
        await conceptSel.selectOption(conceptId);
        await expect(page.locator('#flow-stage')).toHaveAttribute('data-step', 'home', { timeout: 15_000 });

        // 4단계 완주 — 단계별로 보기 응답 후 다음 버튼 진행 (미리풀기·시나리오는 응답 필수)
        const stage = page.locator('#flow-stage');
        const next = page.locator('#flow-next');
        for (let i = 0; i < 16; i++) {
            const step = await stage.getAttribute('data-step');
            if (step === 'complete') break;
            if (step === 'pre' || step === 'scenario') {
                const opt = stage.locator('.flow-opt[data-arg]').first();
                if (await opt.count() && await next.isDisabled()) await opt.click();
            }
            await expect(next).toBeEnabled({ timeout: 10_000 });
            await next.click();
        }

        // 진도 표시 — 완료 단계 도달 + 완료 집계(「N개 완료」)가 렌더된다
        await expect(stage).toHaveAttribute('data-step', 'complete', { timeout: 10_000 });
        await expect(stage.locator('.flow-sum')).toContainText('개 완료');

        // 진도 기록 — 로컬 퍼스트 저장소에 개념 진도·응답 로그·퀴즈 판정이 남는다
        const stored = await page.evaluate(() => ({
            progress: JSON.parse(localStorage.getItem('carework:flow_progress') || '{}'),
            attempts: JSON.parse(localStorage.getItem('carework:flow_attempts') || '[]'),
            results: JSON.parse(localStorage.getItem('carework:quiz_results') || '{}'),
        }));
        expect(Object.values(stored.progress).some((r) => r && r.stage === 'complete')).toBe(true);
        expect(stored.attempts.length).toBeGreaterThan(0);
        expect(Object.keys(stored.results).some((k) => k.includes('_quiz_flow_'))).toBe(true);

        // 새로고침 후에도 로그인 요구 없이 학습 상태·진도 기록 유지
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const persisted = await page.evaluate(() => ({
            exam: localStorage.getItem('current_exam'),
            onboard: localStorage.getItem('onboarding_seen_v1'),
            progress: JSON.parse(localStorage.getItem('carework:flow_progress') || '{}'),
        }));
        expect(persisted.exam).toBe('carework');
        expect(persisted.onboard).toBe('1');
        expect(Object.values(persisted.progress).some((r) => r && r.stage === 'complete')).toBe(true);
        // 로그인 게이트가 아닌 학습 화면으로 복귀
        await expect(page.locator('.nav-item[data-target="care-flow-view"]:visible, .mobile-tab-item[data-target="care-flow-view"]:visible').first()).toBeVisible({ timeout: 15_000 });

        // J-900 품질 신호 — 미처리 JS 예외 0건
        expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
    });

    test('교재 파생 카드·퀴즈 — data-needs 게이트 해제 후 플래시카드·퀴즈 학습 @p1', async ({ page }) => {
        test.setTimeout(90_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 게이트 해제 — 교재 카드·퀴즈가 존재하므로 내비 항목이 노출된다 (UX-NAV-16 회귀)
        const fcNav = page.locator('.nav-item[data-target="flashcard-view"]:visible, .mobile-tab-item[data-target="flashcard-view"]:visible');
        const quizNav = page.locator('.nav-item[data-target="quiz-view"]:visible, .mobile-tab-item[data-target="quiz-view"]:visible');
        await expect(fcNav.first()).toBeVisible({ timeout: 15_000 });
        await expect(quizNav.first()).toBeVisible({ timeout: 15_000 });

        // 플래시카드 — 과목 선택 시 파생 카드가 렌더된다
        await fcNav.first().click();
        const fcSelect = page.locator('#fc-subject-select');
        await fcSelect.selectOption('caretheory');
        await expect(page.locator('#card-front-term')).not.toHaveText('개념 용어', { timeout: 15_000 });
        const total = parseInt(await page.locator('#fc-total-count').textContent(), 10);
        expect(total).toBeGreaterThan(0);

        // 퀴즈 — caretheory 선택 → 시작 → 최대 10문제 유형별 응답 → 결과 패널
        await quizNav.first().click();
        await page.locator('#quiz-subject-select').selectOption('caretheory');
        await page.locator('#start-quiz-btn').click();
        await expect(page.locator('#quiz-arena-panel')).toBeVisible({ timeout: 30_000 });
        for (let i = 0; i < 10; i++) {
            if (await page.locator('#quiz-result-panel').isVisible()) break;
            const options = page.locator('#quiz-options-container:not(.is-hidden) button');
            const ox = page.locator('#quiz-ox-container:not(.is-hidden) .quiz-ox-btn');
            const input = page.locator('#quiz-input-group:not(.is-hidden) #quiz-answer-input');
            if (await options.count()) await options.first().click();
            else if (await ox.count()) await ox.first().click();
            else {
                await input.fill('1');
                await page.locator('#submit-quiz-btn').click();
            }
            await expect(page.locator('#next-quiz-btn')).toBeVisible({ timeout: 10_000 });
            await page.locator('#next-quiz-btn').click();
        }
        await expect(page.locator('#quiz-result-panel')).toBeVisible({ timeout: 10_000 });

        // 로컬 퍼스트 저장소에 carework 스코프 퀴즈 결과 기록
        const saved = await page.evaluate(() => localStorage.getItem('carework:quiz_results'));
        expect(saved).toBeTruthy();
        expect(Object.keys(JSON.parse(saved)).length).toBeGreaterThan(0);

        expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
    });
});
