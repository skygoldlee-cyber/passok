// tests/e2e/exam-risk.spec.js — 시험일 목표 기억률 최종 인출 큐 E2E (D-19·D-20)
// @spec D-19,D-20
//
// 시드된 FSRS 스케줄 + 시험일 → 대시보드 "오늘 할 일" 큐의 시험 전 최종 인출
// 항목이 실브라우저에서 표시되는지 검증한다. 위험 판정은 getExamRiskCards가
// 계산하므로 레코드 불변식(due = lastReview + round(s), R_exam < 0.95)을
// 만족하는 v2 시드를 사용한다.

import { test, expect } from '@playwright/test';
import { analysisBootKeys } from '../fixtures/analysis-seed.js';

const seedStorage = (page, entries) => page.addInitScript((kv) => {
    Object.entries(kv).forEach(([k, v]) => localStorage.setItem(k, v));
}, entries);

/** 로컬 YYYY-MM-DD — analysis-seed.js _day와 동일 규칙. offset은 미래 방향(양수=미래) */
function dayKey(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

test.describe('시험 전 최종 인출 큐 (D-19)', () => {
    test('시험일 기억률 미달 카드만 오늘 할 일 큐에 표시된다', async ({ page }) => {
        seedStorage(page, {
            ...analysisBootKeys(),
            'cosmetic:exam_date': dayKey(10), // D-10 — EXAM_R_WINDOW_DAYS(14) 이내
            'cosmetic:fc_spaced_repetition': JSON.stringify({
                // s=15·lastReview=오늘·due=+15일 → due>시험 ∧ R_exam≈0.925 <0.95 → 위험
                'law_card_risk1': { v: 2, d: 5, s: 15, due: dayKey(15), lastReview: dayKey(0), reps: 1, lapses: 0 },
                // s=60 성숙 카드 → R_exam≈0.977 ≥0.95 → 제외
                'law_card_mature1': { v: 2, d: 5, s: 60, due: dayKey(60), lastReview: dayKey(0), reps: 1, lapses: 0 }
            })
        });
        page._errors = [];
        page.on('pageerror', e => page._errors.push(String(e)));

        await page.goto('/#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        const queue = page.locator('#weak-subject-recommendation');
        await expect(queue).toContainText('시험 전 최종 인출 1장', { timeout: 15_000 });
        await expect(queue).toContainText('95% 미만');
        await expect(queue.locator('[data-click="startExamRiskReview"]')).toBeVisible();
        expect(page._errors.filter(e => !/favicon|manifest/i.test(e))).toEqual([]);
    });

    test('시험일 미설정이면 인출 항목이 표시되지 않는다', async ({ page }) => {
        seedStorage(page, {
            ...analysisBootKeys(),
            'cosmetic:fc_spaced_repetition': JSON.stringify({
                'law_card_risk1': { v: 2, d: 5, s: 15, due: dayKey(15), lastReview: dayKey(0), reps: 1, lapses: 0 }
            })
        });
        page._errors = [];
        page.on('pageerror', e => page._errors.push(String(e)));

        await page.goto('/#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        await expect(page.locator('#weak-subject-recommendation')).not.toContainText('시험 전 최종 인출', { timeout: 15_000 });
        expect(page._errors.filter(e => !/favicon|manifest/i.test(e))).toEqual([]);
    });
});
