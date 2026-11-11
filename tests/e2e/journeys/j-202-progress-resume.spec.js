// tests/e2e/journeys/j-202-progress-resume.spec.js — J-202 학습 진도 복원 (로컬 퍼스트 계약)
// @spec none
// 학습 중단 → 다른 화면·새로고침 경유 → 같은 개념 재선택 시 저장된 단계부터 이어하기
// + 완주 후 개념 목록 완료 마커(✓/!/↻)·flow_progress 단계 기록 검증 — carework careFlow 경로.
// subject 2 개념은 미리풀기·시나리오 문항을 모두 보유해 응답 시점마다 단계가 기록된다.
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

const FLOW_NAV = '.nav-item[data-target="care-flow-view"]:visible, .mobile-tab-item[data-target="care-flow-view"]:visible';
const DASH_NAV = '.nav-item[data-target="dashboard-view"]:visible, .mobile-tab-item[data-target="dashboard-view"]:visible';

test.describe('J-202 학습 진도 복원 (로컬 퍼스트)', () => {
    test('중간 단계 중단 → 복귀 시 이어하기 → 완주 후 완료 마커 @p1', async ({ page }) => {
        test.setTimeout(90_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 개념 학습 진입 — 2과목(pre·시나리오 문항 보유) 첫 개념 선택
        await page.locator(FLOW_NAV).first().click();
        const conceptSel = page.locator('#flow-concept');
        await expect(conceptSel.locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
        await page.locator('#flow-subject').selectOption('2');
        const conceptId = await conceptSel.locator('option').nth(1).getAttribute('value');
        const conceptLabel = await conceptSel.locator('option').nth(1).textContent();
        await conceptSel.selectOption(conceptId);

        const stage = page.locator('#flow-stage');
        const next = page.locator('#flow-next');
        const prog = (id) => page.evaluate((cid) =>
            (JSON.parse(localStorage.getItem('carework:flow_progress') || '{}'))[cid] || {}, id);

        // 홈 카드 → 미리풀기 → 응답 후 story/summary 도달 — 중단 시점 단계 기록
        await expect(stage).toHaveAttribute('data-step', 'home', { timeout: 15_000 });
        await next.click();
        await expect(stage).toHaveAttribute('data-step', 'pre', { timeout: 15_000 });
        await stage.locator('.flow-opt[data-arg]').first().click();
        await next.click();
        const leftAt = await stage.getAttribute('data-step');
        expect(['story', 'summary']).toContain(leftAt);
        expect((await prog(conceptId)).stage).toBe(leftAt);

        // 중단 — 대시보드로 이동 후 새로고침 (다른 날 재접속 상황)
        await page.locator(DASH_NAV).first().click();
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 복귀 — 같은 개념을 다시 고르면 홈이 아니라 중단 단계로 복귀
        await page.locator(FLOW_NAV).first().click();
        const sel2 = page.locator('#flow-concept');
        await expect(sel2.locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
        await page.locator('#flow-subject').selectOption('2');
        await sel2.selectOption(conceptId);
        await expect(stage).toHaveAttribute('data-step', leftAt, { timeout: 15_000 });

        // 완주 — 시나리오까지 응답하며 진행 (오답 시 재도전 문항 포함)
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
        await expect(stage).toHaveAttribute('data-step', 'complete', { timeout: 10_000 });
        expect((await prog(conceptId)).stage).toBe('complete');

        // 완료 마커 — 재접속 후 개념 목록 옵션에 상태 접두(✓ 완료·! 취약·↻ 복습)가 붙는다
        await page.reload();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        await page.locator(FLOW_NAV).first().click();
        const sel3 = page.locator('#flow-concept');
        await expect(sel3.locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
        await page.locator('#flow-subject').selectOption('2');
        const label2 = await page.locator(`#flow-concept option[value="${conceptId}"]`).textContent();
        expect(label2).not.toBe(conceptLabel);
        expect(label2).toMatch(/^[✓!↻] /);

        expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
    });
});
