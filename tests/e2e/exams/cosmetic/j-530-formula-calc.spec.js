// tests/e2e/exams/cosmetic/j-530-formula-calc.spec.js — J-530 배합 계산기·My 포뮬러 CRUD
// @spec none
//
// Formula OS 허브 → 배합 계산기의 "원료 입력 → 고시 검증 배지 → 저장 → 보관함
// 카드 → 재열기(editingId 갱신) → 삭제" 사이클을 실제 UI 조작으로 검증한다.
// 스토어는 cosmetic: 스코프 localStorage — Supabase 불필요.
// formula-tablet.spec.js가 뷰포트·터치 규약(FO-26~31)을 본다면 이 스펙은
// 데스크톱 경로의 데이터 CRUD 계약을 본다.
import { test, expect } from '@playwright/test';
import { examSeed } from '../../support/exam-matrix.js';

async function bootToFormula(page) {
    await page.goto('/index.html#/formula');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('#formula-menu-panel')).toBeVisible({ timeout: 20_000 });
}

test.describe('J-530 배합 계산기·My 포뮬러', () => {
    test('원료 입력 → 고시 검증 배지 → 저장 → 보관함 → 재열기 → 삭제 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('cosmetic'));
        await bootToFormula(page);

        // 허브 — 사업 유형 기본값 '맞춤형화장품 판매업' 활성
        await expect(page.locator('#formula-biz-bar .formula-biz-chip.is-active')).toContainText('판매업');

        // 배합 계산기 진입
        await page.locator('#formula-menu-panel [data-click="formulaNew"]').click();
        await expect(page.locator('#formula-calc-panel')).toBeVisible();
        await page.locator('#formula-name-input').fill('E2E 수분 세럼');
        await page.locator('#formula-target-volume').fill('100');

        // 행 1: 등록 성분(한도 없음) → '정상' 배지
        const rows = page.locator('#formula-calc-rows .f-row');
        await rows.nth(0).locator('.f-name').fill('글리세린');
        await rows.nth(0).locator('.f-conc').fill('5');
        await expect(rows.nth(0).locator('.f-check-cell .f-check-ok')).toBeVisible();
        await expect(page.locator('#formula-sum-conc')).toContainText('5%');

        // 행 2: 한도 성분 초과 → '초과' 배지 (레티놀 한도 1.0%)
        await page.locator('#formula-calc-panel [data-click="formulaCalcAddRow"]').click();
        await rows.nth(1).locator('.f-name').fill('레티놀');
        await rows.nth(1).locator('.f-conc').fill('5');
        await expect(rows.nth(1).locator('.f-check-cell .f-check-warn')).toBeVisible();
        await expect(page.locator('#formula-check-summary')).toContainText('초과');

        // 행 3: 미등록 성분 → '확인' 배지 + '사전 등록' 버튼 (자가 사전 진입점)
        await page.locator('#formula-calc-panel [data-click="formulaCalcAddRow"]').click();
        await rows.nth(2).locator('.f-name').fill('E2E자가성분');
        await rows.nth(2).locator('.f-conc').fill('1');
        await expect(rows.nth(2).locator('.f-check-cell .f-check-unknown')).toBeVisible();
        await expect(rows.nth(2).locator('.f-check-cell [data-click="customIngAdd"]')).toContainText('사전 등록');

        // 경고 행 2개를 삭제해 저장본은 정상 배합만 남긴다 — 행 삭제 계약 검증
        await rows.nth(2).locator('.f-del').click();
        await rows.nth(1).locator('.f-del').click();
        await expect(rows).toHaveCount(1);

        // 저장 → 보관함 카드
        await page.locator('#formula-calc-panel [data-click="formulaCalcSave"]').click();
        await expect(page.locator('#formula-menu-panel')).toBeVisible({ timeout: 15_000 });
        await page.locator('#formula-menu-panel [data-click="openFormulaList"]').click();
        await expect(page.locator('#formula-list .formula-card')).toContainText('E2E 수분 세럼');
        await expect(page.locator('#formula-list .formula-card')).toContainText('원료 1종');
        await expect(page.locator('#formula-list-usage')).toContainText('1/5');

        // 열기 — editingId로 계산기에 복원 (이름·행 재현)
        await page.locator('#formula-list [data-click="formulaOpen"]').click();
        await expect(page.locator('#formula-calc-panel')).toBeVisible();
        await expect(page.locator('#formula-name-input')).toHaveValue('E2E 수분 세럼');
        await expect(rows.nth(0).locator('.f-name')).toHaveValue('글리세린');
        await expect(rows.nth(0).locator('.f-conc')).toHaveValue('5');

        // 라우팅 재진입 지속성 — 다른 뷰 경유 후 복귀해도 목록에 그대로
        await page.goto('/index.html#/dashboard');
        await page.goto('/index.html#/formula');
        await expect(page.locator('#formula-menu-panel')).toBeVisible({ timeout: 15_000 });
        await page.locator('#formula-menu-panel [data-click="openFormulaList"]').click();
        await expect(page.locator('#formula-list .formula-card')).toContainText('E2E 수분 세럼', { timeout: 15_000 });

        // 삭제 — 확인 모달 승인 후 빈 상태
        await page.locator('#formula-list [data-click="formulaDelete"]').click();
        await expect(page.locator('#app-confirm-overlay')).toBeVisible();
        await page.locator('#app-confirm-overlay .app-confirm-ok').click();
        await expect(page.locator('#formula-list')).toContainText('저장된 포뮬러가 없습니다');
    });

    test('계산기 조작 — 스테퍼 증감·원료 추가 포커스·제조 절차 기록 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('cosmetic'));
        await bootToFormula(page);

        await page.locator('#formula-menu-panel [data-click="formulaNew"]').click();
        await expect(page.locator('#formula-calc-panel')).toBeVisible();

        const rows = page.locator('#formula-calc-rows .f-row');
        await rows.nth(0).locator('.f-name').fill('글리세린');

        // 스테퍼 — ±0.1 증감 (FO-27 계약의 데스크톱 경로)
        await rows.nth(0).locator('.f-conc').fill('5.0');
        await rows.nth(0).locator('.f-step-btn[data-dir="1"]').click();
        await expect(rows.nth(0).locator('.f-conc')).toHaveValue('5.1');
        await rows.nth(0).locator('.f-step-btn[data-dir="-1"]').click();
        await rows.nth(0).locator('.f-step-btn[data-dir="-1"]').click();
        await expect(rows.nth(0).locator('.f-conc')).toHaveValue('4.9');
        await expect(page.locator('#formula-sum-conc')).toContainText('4.9%');

        // 원료 추가 — 새 행이 생기고 이름 입력란으로 포커스
        await page.locator('#formula-calc-panel [data-click="formulaCalcAddRow"]').click();
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(1).locator('.f-name')).toBeFocused();

        // 제조 절차 — 단계 추가·기록이 fold 요약에 반영
        await page.locator('#formula-fold-process > summary').click();
        await page.locator('#formula-calc-panel [data-click="formulaStepAdd"]').click();
        await page.locator('#formula-steps-list .f-step').fill('수상부 80℃ 가열 후 교반');
        await expect(page.locator('#fold-sum-process')).not.toHaveText('');

        // 저장 → usage 배지 증가
        await page.locator('#formula-name-input').fill('E2E 절차 검증');
        await page.locator('#formula-calc-panel [data-click="formulaCalcSave"]').click();
        await expect(page.locator('#formula-menu-panel')).toBeVisible({ timeout: 15_000 });
        await page.locator('#formula-menu-panel [data-click="openFormulaList"]').click();
        await expect(page.locator('#formula-list .formula-card')).toContainText('E2E 절차 검증');
    });
});
