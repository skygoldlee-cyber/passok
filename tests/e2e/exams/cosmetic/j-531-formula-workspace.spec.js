// tests/e2e/exams/cosmetic/j-531-formula-workspace.spec.js — J-531 Formula OS 워크스페이스
// @spec none
//
// 고객 카드·조제 기록·원료 장부·기성품 DB 4개 스토어의 CRUD와 스토어 간 연동을
// 실제 UI 조작으로 검증한다 — 고객 등록 → 처방 저장 → 조제 기록(처방 프리셀렉트)
// → 고객 상세의 연동 칩 역조회가 핵심 계약. 사업 유형 칩의 허브 카드 가시
// 게이트(biz-profile)도 검증한다.
import { test, expect } from '@playwright/test';
import { examSeed } from '../../support/exam-matrix.js';

async function bootToFormula(page) {
    await page.goto('/index.html#/formula');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('#formula-menu-panel')).toBeVisible({ timeout: 20_000 });
}

/** 허브 카드 클릭 → 서브 패널 표시 */
async function openPanel(page, cardClick, panelId) {
    await page.locator(`#formula-menu-panel [data-click="${cardClick}"]`).click();
    await expect(page.locator(`#${panelId}`)).toBeVisible({ timeout: 15_000 });
}

test.describe('J-531 Formula OS 워크스페이스', () => {
    test('고객 등록 → 처방 저장 → 조제 기록 → 고객 상세 연동 칩 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('cosmetic'));
        await bootToFormula(page);

        // 1) 고객 등록 — 칩은 시각 숨김 input + 라벨 패턴이라 라벨 클릭
        await openPanel(page, 'openCustomerPanel', 'formula-customer-panel');
        // 툴바 '고객 등록'과 빈상태 '첫 고객 등록'이 같은 data-click — 정적 툴바가 첫 매치
        await page.locator('#formula-customer-panel [data-click="custNew"]').first().click();
        await expect(page.locator('#formula-customer-form-panel')).toBeVisible();
        await page.locator('#cust-name').fill('김연동');
        await page.locator('#cust-skintype').selectOption({ index: 1 });
        await page.locator('#cust-concerns .formula-chip').first().click();
        await page.locator('#cust-purpose').fill('E2E 수분 케어');
        await page.locator('#formula-customer-form-panel [data-click="custSave"]').click();
        await expect(page.locator('#formula-customer-detail-panel')).toBeVisible();
        await expect(page.locator('#customer-detail')).toContainText('김연동');

        // 2) 처방 저장 — 허브로 돌아 계산기 ('목록으로' 버튼과 서브내비 칩이 동명 — 첫 매치)
        await page.locator('#formula-customer-detail-panel [data-click="openCustomerPanel"]').first().click();
        await page.locator('#formula-customer-panel [data-click="exitFormulaSubView"]').click();
        await expect(page.locator('#formula-menu-panel')).toBeVisible();
        await page.locator('#formula-menu-panel [data-click="formulaNew"]').click();
        await page.locator('#formula-name-input').fill('김연동 수분 처방');
        const rows = page.locator('#formula-calc-rows .f-row');
        await rows.nth(0).locator('.f-name').fill('글리세린');
        await rows.nth(0).locator('.f-conc').fill('5');
        // 처방↔고객 연동 — 계산기 고객 접힘의 카드 선택이 customerId를 심는다
        await page.locator('#formula-fold-customer > summary').click();
        await page.locator('#formula-cust-ref').selectOption({ label: '김연동' });
        await page.locator('[data-click="formulaCalcSave"]').click();
        await expect(page.locator('#formula-menu-panel')).toBeVisible({ timeout: 15_000 });

        // 3) 조제 기록 — 포뮬러 카드의 '조제 기록' 버튼이 처방을 프리셀렉트
        await page.locator('#formula-menu-panel [data-click="openFormulaList"]').click();
        await page.locator('#formula-list [data-click="batchNew"]').click();
        await expect(page.locator('#formula-batch-form-panel')).toBeVisible();
        await expect(page.locator('#batch-formula')).toHaveValue(/.+/); // 프리셀렉트됨
        await expect(page.locator('#batch-made-at')).toHaveValue(/.+/); // 조제 일시 자동
        // 고객 카드 연결 + 위생 체크(칩 패턴 — 라벨 클릭)
        await page.locator('#batch-customer-select').selectOption({ label: '김연동' });
        await page.locator('label.formula-chip:has(#batch-hyg-glovesWorn)').click();
        await page.locator('#batch-notes').fill('E2E 첫 조제');
        await page.locator('#formula-batch-form-panel [data-click="batchSave"]').click();
        await expect(page.locator('#formula-batch-detail-panel')).toBeVisible();
        await expect(page.locator('#batch-detail')).toContainText('김연동 수분 처방');

        // 4) 고객 상세 역조회 — 처방·조제 칩이 연동된다
        await page.locator('#formula-batch-detail-panel [data-click="openBatchPanel"]').first().click();
        await expect(page.locator('#batch-list .formula-card')).toContainText('김연동');
        await page.locator('#formula-batch-panel [data-click="exitFormulaSubView"]').click();
        await openPanel(page, 'openCustomerPanel', 'formula-customer-panel');
        await page.locator('#customer-list .formula-card [data-click="custOpen"]').click();
        await expect(page.locator('#customer-detail')).toContainText('김연동 수분 처방');
        await expect(page.locator('#customer-detail [data-click="batchOpen"]')).toBeVisible();
    });

    test('원료 장부 — 등록→목록·기한 상태 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('cosmetic'));
        await bootToFormula(page);

        await openPanel(page, 'openMaterialPanel', 'formula-material-panel');
        await page.locator('#formula-material-panel [data-click="matNew"]').first().click();
        await expect(page.locator('#formula-material-form-panel')).toBeVisible();
        await page.locator('#mat-name').fill('글리세린');
        await page.locator('#mat-lot').fill('E2E-LOT-01');
        await page.locator('#mat-received').fill('2026-11-01');
        await page.locator('#mat-expiry').fill('2027-11-01');
        await page.locator('#mat-qty').fill('500');
        await page.locator('#formula-material-form-panel [data-click="matSave"]').click();

        await expect(page.locator('#formula-material-panel')).toBeVisible();
        const card = page.locator('#material-list .formula-card');
        await expect(card).toContainText('글리세린');
        await expect(card).toContainText('E2E-LOT-01');
    });

    test('기성품 전성분 — 등록→분석 칩→상세 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('cosmetic'));
        await bootToFormula(page);

        await openPanel(page, 'openProductPanel', 'formula-product-panel');
        await page.locator('#formula-product-panel [data-click="productNew"]').first().click();
        await expect(page.locator('#formula-product-form-panel')).toBeVisible();
        await page.locator('#prod-name').fill('E2E 수분 크림');
        await page.locator('#prod-brand').fill('E2E랩');
        // 전성분 textarea — 입력 시 파싱되어 칩·건수로 반영
        await page.locator('#prod-inci-input').fill('정제수, 글리세린, 부틸렌글라이콜, 나이아신아마이드');
        await expect(page.locator('#prod-inci-count')).toContainText('성분 4종');
        await page.locator('#formula-product-form-panel [data-click="productSave"]').click();

        // 저장 → 상세 → 목록 카드 (성분 수·분석 배지)
        await expect(page.locator('#formula-product-detail-panel')).toBeVisible();
        await page.locator('#formula-product-detail-panel [data-click="openProductPanel"]').first().click();
        const card = page.locator('#product-list .formula-card');
        await expect(card).toContainText('E2E 수분 크림');
        await expect(card).toContainText('성분 4종');
    });

    test('사업 유형 전환 — 허브 카드 가시 게이트 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('cosmetic'));
        await bootToFormula(page);

        const custCard = page.locator('#formula-menu-panel [data-click="openCustomerPanel"]');
        const labelCard = page.locator('#formula-menu-panel [data-click="openLabelPanel"]');

        // 기본 'custom' — 고객 카드 노출·표시사항 검토 숨김 (label은 mfg|sales 전용)
        await expect(custCard).toBeVisible();
        await expect(labelCard).toBeHidden();

        // '화장품제조업' 전환 — 고객 카드 숨김·표시사항 카드 노출
        await page.locator('#formula-biz-bar [data-arg="mfg"]').click();
        await expect(custCard).toBeHidden();
        await expect(labelCard).toBeVisible();

        // '책임판매업' 전환 — 배합 계산기 숨김(제조 없음)·광고 점검 노출
        await page.locator('#formula-biz-bar [data-arg="sales"]').click();
        await expect(page.locator('#formula-menu-panel [data-click="formulaNew"]')).toBeHidden();
        await expect(page.locator('#formula-menu-panel [data-click="openAdLintPanel"]')).toBeVisible();
    });
});
