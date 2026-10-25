// tests/e2e/exam-switch.spec.js — 멀티시험 전환·도메인 격리 검증
// @spec ES-03,ES-05,DA-13,UX-PWA-07
// 비기본 시험(lossadj, comingSoon) 부팅을 실브라우저로 증명한다.
// comingSoon 카드는 UI 클릭 전환이 막혀 있으므로 current_exam을 시드해
// "다른 시험으로 부팅" 경로를 검증한다 — 시험별 브랜딩·기능 게이팅·
// 도메인 모듈 미로드가 cosmetic 하드코딩 없이 동작하는지가 관점.

import { test, expect } from '@playwright/test';

test.describe('비기본 시험(lossadj) 부팅 — 도메인 격리', () => {
    test.beforeEach(({ page }) => {
        page.addInitScript(() => {
            localStorage.setItem('current_exam', 'lossadj');
            localStorage.setItem('onboarding_seen_v1', '1');
            localStorage.setItem('telemetry_notice_shown', '1');
            localStorage.setItem('lossadj:onboarding_seen_v1', '1');
        });
        page._errors = [];
        page.on('pageerror', err => page._errors.push(String(err)));
    });

    test('시험별 브랜딩 — 타이틀·로고·앱명이 손해평가사로 렌더된다', async ({ page }) => {
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // applyExamBranding: title·로고가 exams.json lossadj 엔트리로 치환
        await expect(page).toHaveTitle('PassOK — 농어업재해보험 손해평가사 (Passess)');
        await expect(page.locator('.logo-text h1')).toHaveText('PassOK');
        await expect(page.locator('.logo-text span')).toHaveText('손해평가사 · Passess');
        await expect(page.locator('.logo-icon')).toHaveClass(/fa-tractor/);
        // 저작권 표기는 플랫폼 귀속 — 시험과 무관하게 '© PassOK' 고정
        await expect(page.locator('.sidebar-footer-meta p').first()).toHaveText('© PassOK');
        // pwa-manifest.js가 실제 파일로 링크 교체 (단일 앱 id='passok' — 시험별 shortcuts·desc만 교체)
        await expect(page.locator('link[rel="manifest"]'))
            .toHaveAttribute('href', /manifest\.lossadj\.webmanifest/);
        expect(page._errors.filter(e => !/favicon|manifest/i.test(e))).toEqual([]);
    });

    test('기능 플래그 게이팅 — cosmetic 전용 실무 메뉴가 노출되지 않는다', async ({ page }) => {
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // lossadj.features = { writtenPractice } — formula·ingredients·dictionary·practiceMode는 is-hidden
        await expect(page.locator('[data-target="formula-view"]').first()).toHaveClass(/is-hidden/);
        await expect(page.locator('#ui-mode-toggle')).toHaveClass(/is-hidden/);
        // dictionary는 lossadj에 미선언 → 네비 항목도 숨김
        await expect(page.locator('[data-target="dictionary-view"]').first()).toHaveClass(/is-hidden/);
        // 시험 전환 버튼은 등록 시험 2개(comingSoon 포함)라 multiExam=true로 유지
        await expect(page.locator('[data-feature="examSwitch"]').first()).not.toHaveClass(/is-hidden/);
    });

    test('도메인 뷰 미로드 — formula-view 진입이 네비로 불가하고 DOM만 빈 섹션이다', async ({ page }) => {
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // practice-registry가 formula 피처 로더를 등록하지 않았는지 — 뷰 DOM은 빈 파셸만 존재
        const formulaView = page.locator('#formula-view');
        await expect(formulaView.first()).toHaveClass(/is-hidden/);
        // 훈련소 뷰에서 원료 챌린지 카드도 게이팅 (features.ingredients 미선언)
        const nav = page.locator('.nav-item[data-target="trainer-view"]:visible, .mobile-tab-item[data-target="trainer-view"]:visible');
        if (await nav.count() > 0) {
            await nav.first().click();
            await expect(page.locator('[data-click="startIngredientsChallenge"]')).toHaveClass(/is-hidden/);
        }
    });

    test('네트워크 격리 — lossadj 부팅 중 exams/cosmetic/ 자산 요청이 없다', async ({ page }) => {
        const examReqs = [];
        page.on('request', r => { if (/exams\/(cosmetic|lossadj)\//.test(r.url())) examReqs.push(r.url()); });
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // 도메인 경로 규약 — 비활성 시험의 모듈·마크업·콘텐츠를 요청하지 않아야 한다
        // (warmPracticeFeatures는 lossadj가 formula 미보유로 발화하지 않음)
        expect(examReqs.filter(u => u.includes('exams/cosmetic/'))).toEqual([]);
        // 대조: lossadj 자산은 실제로 요청됐어야 한다 (격리가 아닌 미부팅 오탐 방지)
        expect(examReqs.some(u => u.includes('exams/lossadj/'))).toBe(true);
    });
});

test.describe('시험 전환 실경로 — selectExam → 리로드 → 부팅', () => {
    test('comingSoon 카드 클릭은 전환 없이 안내만 띄운다', async ({ page }) => {
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // 피커를 직접 렌더링해 comingSoon 가드를 검증 (UI 도달 경로와 무관하게 계약 확인)
        await page.evaluate(async () => {
            const m = await import('./src/views/exam-select.js');
            m.renderExamSelect();
        });
        const card = page.locator('.exam-select-card[data-arg="lossadj"]');
        await expect(card).toHaveClass(/coming-soon/);
        // aria-disabled 카드라 Playwright 클릭은 거부 — 이벤트 위임 경로를 직접 디스패치
        await card.dispatchEvent('click');
        await expect(page.getByText('시험은 현재 준비 중입니다', { exact: false })).toBeVisible();
        const stored = await page.evaluate(() => localStorage.getItem('current_exam'));
        expect(stored).not.toBe('lossadj'); // 전환 미발생
    });

    test('selectExam(\'lossadj\') 호출 → current_exam 저장 + 리로드 후 손해평가사 부팅', async ({ page }) => {
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // 실제 전환 계약: selectExam이 저장 후 location.reload() — 시드가 아닌 호출 경로 검증
        // reload가 evaluate 해결보다 먼저 컨텍스트를 파괴하면 'Execution context was destroyed'로
        // 거부되는데, 그 경우 전환 호출 자체는 이미 완료된 것이므로 해당 오류만 흡수한다
        const swallowNavTeardown = (p) => p.catch((err) => {
            if (!/Execution context was destroyed/.test(String(err))) throw err;
        });
        await Promise.all([
            page.waitForEvent('load', { timeout: 15_000 }),
            swallowNavTeardown(page.evaluate(async () => {
                const m = await import('./src/exam-context.js');
                m.selectExam('lossadj');
            })),
        ]);
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        await expect(page).toHaveTitle('PassOK — 농어업재해보험 손해평가사 (Passess)');
        await expect(page.locator('.logo-text span')).toHaveText('손해평가사 · Passess');
        const stored = await page.evaluate(() => localStorage.getItem('current_exam'));
        expect(stored).toBe('lossadj');
        // 복귀 — cosmetic으로 되돌려 후속 테스트 격리 유지
        await Promise.all([
            page.waitForEvent('load', { timeout: 15_000 }),
            swallowNavTeardown(page.evaluate(async () => {
                const m = await import('./src/exam-context.js');
                m.selectExam('cosmetic');
            })),
        ]);
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        await expect(page.locator('.logo-text span')).toHaveText('조제관리사 · Passmula');
    });
});

test.describe('도메인 경로 규약 — 활성 시험 id로 뷰 모듈·마크업 해석', () => {
    test('cosmetic 부팅 — formula-view 마크업이 html/exams/cosmetic/ 규약 경로에서 주입된다', async ({ page }) => {
        // warmPracticeFeatures가 유휴 시점 예열하므로 부팅 전부터 네트워크를 감청한다
        const requests = [];
        page.on('request', r => { if (r.url().includes('/html/exams/')) requests.push(r.url()); });
        // 온보딩 오버레이 스킵 — cosmetic 기본 시험의 온보딩 완료를 시드
        // 시험 스코프 기능은 명시 선택 상태가 필요 (미선택 진입 차단 계약)
        await page.addInitScript(() => {
            localStorage.setItem('onboarding_seen_v1', '1');
            localStorage.setItem('telemetry_notice_shown', '1');
            localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
            localStorage.setItem('current_exam', 'cosmetic');
        });
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        // 예열이 안 탔을 수 있으니 뷰 진입으로 주입을 확정한다
        await page.locator('[data-target="formula-view"]:visible').first().click();
        await page.waitForFunction(() => {
            const v = document.getElementById('formula-view');
            return v && !v.hasAttribute('data-lazy-view');
        }, null, { timeout: 15_000 });
        // 규약 해석: 마크업은 활성 시험 id 디렉터리에서 fetch됐다
        expect(requests.some(u => u.endsWith('/html/exams/cosmetic/formula.html'))).toBe(true);
        // 주입된 파셜의 도메인 마크업이 실제 렌더됨
        await expect(page.locator('#formula-view [data-click]').first()).toBeAttached();
    });
});
