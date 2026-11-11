// tests/e2e/journeys/j-201-mock-exam.spec.js — J-201 모의고사 응시 (로컬 퍼스트 계약)
// @spec none
// 통합 실전 모의고사(과목별 배정 합산) → OMR·타이머·응답 → 제출 → 점수·과락/합격
// 판정 표시 → sim_results_history 기록·드래프트 정리 검증 — carework 팩 기준 (DSN-46 §4).
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

test.describe('J-201 모의고사 응시 (로컬 퍼스트)', () => {
    test('통합 모의고사 응시 → 제출 → 점수·과락 판정·이력 기록 @p1', async ({ page }) => {
        test.setTimeout(120_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        // 모바일 탭바에는 시험 항목이 없어 #/exam 딥링크로 직접 진입
        await page.goto('/index.html#/exam');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 통합 모의고사 시작 — manifest questionsPerSubject 합산 문항 수
        await expect(page.locator('#integrated-exam-btn')).toBeVisible({ timeout: 15_000 });
        await page.locator('#integrated-exam-btn').click();

        // 아레나 진입 — 총 문항 수는 manifest 배정(35+45)에서 동적 취득
        await expect(page.locator('#sim-arena-panel')).toBeVisible({ timeout: 15_000 });
        const total = Number(await page.locator('#omr-total-count').textContent());
        expect(total).toBeGreaterThanOrEqual(70);
        await expect(page.locator('#sim-q-num')).toHaveText(`Q 1 / ${total}`);
        const timeText = await page.locator('#sim-time-left').textContent();
        expect(timeText).toMatch(/\d{1,3}:\d{2}/);

        // 전 문항 ①번 응답 — OMR 진행률·드래프트 기록 확인
        for (let i = 1; i <= total; i++) {
            await expect(page.locator('#sim-q-num')).toHaveText(`Q ${i} / ${total}`);
            await page.locator('.sim-option-item').first().click();
            if (i === 1) {
                await expect(page.locator('#omr-solved-count')).toHaveText('1');
            }
            if (i < total) {
                await page.locator('#sim-next-btn').click();
            }
        }
        await expect(page.locator('#omr-solved-count')).toHaveText(String(total));
        const draft = await page.evaluate(() => localStorage.getItem('carework:sim_draft_session'));
        expect(draft).not.toBeNull();

        // 제출 — 확인 모달 후 결과 패널 점수·판정 표시
        await page.locator('#sim-submit-exam-btn').click();
        await expect(page.locator('#app-confirm-overlay')).toBeVisible();
        await page.locator('#app-confirm-overlay .app-confirm-ok').click();
        await expect(page.locator('#sim-result-panel')).toBeVisible({ timeout: 15_000 });
        const scoreText = await page.locator('#sim-result-score').textContent();
        const m = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
        expect(m).not.toBeNull();
        const score = Number(m[1]);
        expect(Number(m[2])).toBe(total);
        const rate = Math.round((score / total) * 100);
        await expect(page.locator('#sim-result-rate')).toHaveText(`${rate}%`);

        // 과목별 분석 + 과락/합격 판정 피드백 — 양 과목 행과 세 분기 중 하나가 렌더
        const breakdown = page.locator('#sim-result-breakdown');
        await expect(breakdown).toBeVisible();
        const bText = await breakdown.textContent();
        expect(bText).toContain('1과목');
        expect(bText).toContain('2과목');
        expect(bText).toMatch(/과락 주의|합격 예측/);
        await expect(page.locator('[data-click="showSimAnswerReview"]')).toBeVisible();

        // 로컬 이력 기록 + 드래프트 정리 (제출 시 세션 제거)
        const history = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('carework:sim_results_history') || '[]'));
        expect(history.length).toBe(1);
        expect(history[0].examId).toBe('integrated');
        expect(history[0].rate).toBe(rate);
        const clearedDraft = await page.evaluate(() => localStorage.getItem('carework:sim_draft_session'));
        expect(clearedDraft).toBeNull();

        expect(errors).toEqual([]);
    });
});
