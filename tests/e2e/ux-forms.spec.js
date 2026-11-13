// tests/e2e/ux-forms.spec.js — UX-FORM-03 필드 인라인 오류 + UX-FORM-05 작성 중 이탈 유실 방지
// @spec UX-FORM-03,UX-FORM-05
//
// 실브라우저 검증 대상:
//  - UX-FORM-03: 필수 검증 시 필드 옆 .field-error + aria-invalid + 첫 오류 포커스,
//    입력 시 오류 자동 해제 (토스트 단독 금지 규약의 실DOM 확인)
//  - UX-FORM-05: 작성 중 이탈 경로의 ① 확인 모달(양식 편집기·방문결과 패널)
//    ② 드래프트 자동 보존(리더 메모 — 닫기 후 재진입 복원)

import { test, expect } from '@playwright/test';
import { examSeed } from './support/exam-matrix.js';

async function bootTo(page, slug) {
    await page.goto(`/index.html#/${slug}`);
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('.view-section:visible').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('UX-FORM-03 — 필드 인라인 오류', () => {
    test('필수값 누락 → 인라인 오류·aria-invalid·첫 오류 포커스·입력 시 자동 해제', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-log');

        // 일자는 자동기입(today) — 대상자만 비워 두고 생성
        await page.locator('[data-click="careLogGenerate"]').click();
        const client = page.locator('#log-client');
        await expect(client).toHaveAttribute('aria-invalid', 'true');
        const errId = await client.getAttribute('aria-describedby');
        await expect(page.locator(`#${errId}`)).toBeVisible();
        await expect(page.locator(`#${errId}`)).toContainText('대상자');
        await expect(client).toBeFocused(); // 첫 오류 필드 포커스 이동
        // 요약 채널 — 미리보기 영역의 비자동소멸 오류 문구도 병기
        await expect(page.locator('#log-preview .care-calc-err')).toBeVisible();

        // 입력하면 인라인 오류 자동 해제 (위임 리스너)
        await client.fill('김인라인');
        await expect(client).not.toHaveAttribute('aria-invalid', 'true');
        await expect(page.locator(`#${errId}`)).toHaveCount(0);
        // 정상 생성 — 오류 없이 문서 렌더
        await page.locator('[data-click="careLogGenerate"]').click();
        await expect(page.locator('#log-preview .doc-md')).toContainText('김인라인');
    });
});

test.describe('UX-FORM-05 — 작성 중 이탈 유실 방지', () => {
    test('기관 양식 편집기 — 미저장 닫기는 확인 모달, 취소 시 편집 유지', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-custom-form');

        await page.locator('[data-click="careFormTplNew"]').click();
        await expect(page.locator('#cf-editor')).toBeVisible();
        await page.locator('#cf-tpl-body').fill('미저장 본문 {{항목}}');

        // dirty 닫기 → 확인 모달 → 취소하면 편집 내용 유지
        await page.locator('[data-click="careFormTplEditClose"]').click();
        await expect(page.locator('#app-confirm-overlay')).toBeVisible();
        await page.locator('#app-confirm-overlay .app-confirm-cancel').click();
        await expect(page.locator('#cf-editor')).toBeVisible();
        await expect(page.locator('#cf-tpl-body')).toHaveValue('미저장 본문 {{항목}}');

        // 확인하면 편집기 닫힘
        await page.locator('[data-click="careFormTplEditClose"]').click();
        await page.locator('#app-confirm-overlay .app-confirm-ok').click();
        await expect(page.locator('#cf-editor')).toBeHidden();
    });

    test('방문결과 패널 — 작성 중 닫기는 확인 모달 (날짜 자동기입은 dirty 아님)', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-visit');

        await page.locator('#vis-date').fill('2026-11-20');
        await page.locator('#vis-client').fill('김면회');
        await page.locator('#vis-visitor').fill('홍방문');
        await page.locator('[data-click="careVisitAdd"]').click();
        await page.locator('#vis-scheduled [data-click="careVisitResultOpen"]').first().click();
        await expect(page.locator('#vis-result-panel')).toBeVisible();

        await page.locator('#vis-result-summary').fill('작성 중인 요약');
        await page.locator('[data-click="careVisitResultClose"]').click();
        await expect(page.locator('#app-confirm-overlay')).toBeVisible();
        await page.locator('#app-confirm-overlay .app-confirm-cancel').click();
        await expect(page.locator('#vis-result-panel')).toBeVisible(); // 취소 시 유지
        await page.locator('[data-click="careVisitResultClose"]').click();
        await page.locator('#app-confirm-overlay .app-confirm-ok').click();
        await expect(page.locator('#vis-result-panel')).toBeHidden();
    });

    test('리더 메모 — 입력 자동저장으로 닫기·재진입 시 복원 (드래프트 보존)', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('current_exam', 'cosmetic');
            localStorage.setItem('onboarding_seen_v1', '1');
            localStorage.setItem('telemetry_notice_shown', '1');
            localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
        });
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        await page.evaluate(() => {
            document.querySelectorAll('#app-confirm-overlay, #onboarding-overlay').forEach(el => el.remove());
            location.hash = '/reader';
        });
        await expect(page.locator('#reader-subject-select')).toBeVisible({ timeout: 15_000 });
        await page.locator('#reader-subject-select').selectOption({ index: 1 });
        await page.waitForFunction(() =>
            document.querySelectorAll('#textbook-reader-container .reader-section-card').length > 0,
            null, { timeout: 30_000 });

        const noteBtn = page.locator('.reader-note-btn').first();
        await noteBtn.click();
        const input = page.locator('.reader-note-input');
        await input.fill('이탈 보존 메모 — 실브라우저');
        await page.waitForTimeout(700); // 디바운스 자동저장 대기
        await page.locator('[data-note-close]').click();
        await expect(page.locator('.reader-note-editor')).toHaveCount(0);
        await expect(page.locator('.reader-note-view')).toContainText('이탈 보존 메모');

        // 재오픈 — 자동저장분이 복원된다 (닫기 시 유실 없음)
        await noteBtn.click();
        await expect(page.locator('.reader-note-input')).toHaveValue('이탈 보존 메모 — 실브라우저');
    });
});
