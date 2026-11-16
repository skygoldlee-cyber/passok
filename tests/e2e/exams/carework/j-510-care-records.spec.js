// tests/e2e/exams/carework/j-510-care-records.spec.js — J-510 carework 실무 기록 CRUD
// @spec none
//
// 요양일지·면회기록·사고보고서의 "폼 입력 → 문서 생성 → 저장 → 재진입 목록 복원 →
// 삭제 확인" 사이클을 실제 UI 조작으로 검증한다. 스토어는 carework: 스코프
// localStorage — 기관(Supabase) 경로는 J-52x 소관이라 여기서는 다루지 않는다.
import { test, expect } from '@playwright/test';
import { examSeed } from '../../support/exam-matrix.js';

async function bootTo(page, slug) {
    await page.goto(`/index.html#/${slug}`);
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('.view-section:visible').first()).toBeVisible({ timeout: 20_000 });
}

/** 해당 뷰의 더보기 details를 연다 — 지연 주입된 다른 뷰의 summary와 구분하려고 뷰 스코프 필수 */
async function openMoreActions(page, viewId) {
    await page.locator(`#${viewId} details.care-more-actions > summary`).click();
}

test.describe('J-510 carework 실무 기록 CRUD', () => {
    test('요양일지 — 수행내용 입력→생성→저장→재진입 복원→삭제 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-log');

        await page.locator('#log-client').fill('김일지');
        await page.locator('#log-service').selectOption({ index: 0 });
        await page.locator('#log-start').fill('09:00');
        await page.locator('#log-end').fill('10:00');
        await page.locator('#log-activities input[type="checkbox"]').first().check();
        await page.locator('#log-note').fill('E2E 특이사항');
        // obs 칩은 시각 숨김 radio + 라벨 칩 패턴 — 실사용자는 라벨을 누른다
        await page.locator('label.obs-chip:has(input[name="obs-meal"][value="전"])').click();
        await page.locator('label.obs-chip:has(input[name="obs-sleep"][value="양호"])').click();

        await page.locator('[data-click="careLogGenerate"]').click();
        await expect(page.locator('#log-preview .doc-md')).toContainText('김 일지');

        await openMoreActions(page, 'care-log-view');
        await page.locator('#care-log-view [data-click="careLogSave"]').click();
        await expect(page.locator('#log-saved .care-log-saved-item')).toContainText('김 일지');

        // 재진입 지속성 — 라우팅 재방문
        await page.goto('/index.html#/care-log');
        await expect(page.locator('#log-saved .care-log-saved-item')).toContainText('김 일지');

        // 삭제 — 확인 모달 승인
        await page.locator('#log-saved [data-click="careLogDelete"]').click();
        await expect(page.locator('#app-confirm-overlay')).toBeVisible();
        await page.locator('#app-confirm-overlay .app-confirm-ok').click();
        await expect(page.locator('#log-saved')).toContainText('저장된 일지가 없습니다');
    });

    test('면회기록 — 예약 등록→결과 기록→완료 목록 이동 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-visit');

        await page.locator('#vis-client').fill('김면회');
        await page.locator('#vis-visitor').fill('홍가족');
        await page.locator('#vis-relation').selectOption({ index: 0 });
        await page.locator('#vis-purpose').fill('면회·물품 전달');
        await page.locator('[data-click="careVisitAdd"]').click();
        await expect(page.locator('#vis-scheduled .care-log-saved-item')).toContainText('김 면회');

        // 예약 → 결과 기록 패널
        await page.locator('#vis-scheduled [data-click="careVisitResultOpen"]').click();
        await expect(page.locator('#vis-result-panel')).toBeVisible();
        await expect(page.locator('#vis-result-for')).toContainText('김면회');
        await page.locator('#vis-result-time').fill('14:30');
        await page.locator('#vis-result-summary').fill('면회 완료 — 상태 양호');
        await page.locator('[data-click="careVisitResultSave"]').click();

        // 완료 목록으로 이동
        await expect(page.locator('#vis-result-panel')).toBeHidden();
        await expect(page.locator('#vis-done .care-log-saved-item')).toContainText('김 면회');
        await expect(page.locator('#vis-done .care-log-saved-item')).toContainText('면회 완료');
    });

    test('사고보고서 — 경위 입력→생성→저장→목록 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-incident');

        await page.locator('#inc-client').fill('이낙상');
        await page.locator('#inc-place').fill('302호 침실');
        await page.locator('#inc-type').selectOption({ index: 0 });
        await page.locator('#inc-severity').selectOption({ index: 0 });
        await page.locator('#inc-desc').fill('야간 순회 중 침대 옆 낙상 발견');
        await page.locator('#inc-action').fill('활력징후 확인·간호사 연락');
        await page.locator('#inc-family').check();

        await page.locator('[data-click="careIncidentGenerate"]').click();
        await expect(page.locator('#inc-preview .doc-md')).toContainText('이 낙상');

        await openMoreActions(page, 'care-incident-view');
        await page.locator('#care-incident-view [data-click="careIncidentSave"]').click();
        await expect(page.locator('#inc-saved .care-log-saved-item')).toContainText('이 낙상');

        // 재진입 지속성
        await page.goto('/index.html#/care-incident');
        await expect(page.locator('#inc-saved .care-log-saved-item')).toContainText('이 낙상');
    });
});
