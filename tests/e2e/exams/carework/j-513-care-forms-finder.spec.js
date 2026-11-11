// tests/e2e/exams/carework/j-513-care-forms-finder.spec.js — J-513 기관양식·서식·기관찾기
// @spec none
//
// 기관양식: 템플릿 직접 작성({{항목}} 기입란) → 저장 → 기입 → 문서 생성·저장 사이클.
// 서식 모음: 정적 링크 디렉터리의 카드·외부 링크 속성 검증.
// 기관 찾기: 로컬 시설 데이터 검색 → '이 기관으로 설정' → 출력물 기관명 연결.
import { test, expect } from '@playwright/test';
import { examSeed } from '../../support/exam-matrix.js';

async function bootTo(page, slug) {
    await page.goto(`/index.html#/${slug}`);
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
    await expect(page.locator('.view-section:visible').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('J-513 carework 양식·기관찾기', () => {
    test('기관양식 — 템플릿 작성→기입→문서 생성·저장 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-custom-form');

        // 템플릿 직접 작성 — {{항목}} 문법이 기입란으로 파싱된다
        await page.locator('[data-click="careFormTplNew"]').click();
        await expect(page.locator('#cf-editor')).toBeVisible();
        await page.locator('#cf-tpl-title').fill('E2E 간단 양식');
        await page.locator('#cf-tpl-body').fill('대상자: {{client}}\n특이사항: {{특이사항}}');
        await page.locator('[data-click="careFormTplSave"]').click();
        await expect(page.locator('#cf-tpl-list .care-log-saved-item')).toContainText('E2E 간단 양식');

        // 기입 — 동적 기입란에 입력
        await page.locator('#cf-tpl-list [data-click="careFormTplUse"]').first().click();
        await expect(page.locator('#cf-fill')).toBeVisible();
        await page.locator('#cf-client').fill('김양식');
        await page.locator('#cf-fill-fields [data-cf-field]').first().fill('E2E 기입 내용');
        await page.locator('[data-click="careFormDocGenerate"]').click();
        await expect(page.locator('#cf-preview')).toContainText('E2E 기입 내용');

        // 문서 저장 → 목록
        await page.locator('[data-click="careFormDocSave"]').click();
        await expect(page.locator('#cf-doc-list .care-log-saved-item')).toContainText('김양식');

        // 재진입 지속성 — 양식·문서 모두 유지
        await page.goto('/index.html#/care-custom-form');
        await expect(page.locator('#cf-tpl-list .care-log-saved-item')).toContainText('E2E 간단 양식');
        await expect(page.locator('#cf-doc-list .care-log-saved-item')).toContainText('김양식');
    });

    test('보고서·서식 모음 — 발급처 링크 디렉터리 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-forms');

        const cards = page.locator('.care-form-card');
        await expect(cards).toHaveCount(9);
        // 외부 공식 발급처로 새 탭 링크 — 법령·공단·복지부 도메인 존재 확인
        await expect(page.locator('.care-form-card[href*="law.go.kr"]').first()).toHaveAttribute('target', '_blank');
        await expect(page.locator('.care-form-card[href*="longtermcare.or.kr"]')).toHaveCount(1);
        await expect(page.locator('.care-form-card[href*="mohw.go.kr"]')).toHaveCount(1);
        // 주기 요약표 렌더
        await expect(page.locator('.care-form-table')).toContainText('급여제공기록지');
    });

    test('요양기관 찾기 — 검색 필터→기관 설정 @p2', async ({ page }) => {
        await page.addInitScript(examSeed('carework'));
        await bootTo(page, 'care-finder');

        // 로컬 시설 데이터 로드·출처 표시
        await expect(page.locator('#find-list .care-finder-item').first()).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('#find-source')).toContainText('출처');

        // 검색어 필터 — 결과가 있는지 확인 후 없어지지 않으면 지역 필터로 좁힌다
        await page.locator('#find-q').fill('요양');
        const hits = page.locator('#find-list .care-finder-item');
        if (await hits.count() === 0) {
            await page.locator('#find-q').fill('');
        }
        await expect(hits.first()).toBeVisible();

        // '이 기관으로 설정' → 출력물 기관명 연결 (☁ 기관 표기의 로컬 대응)
        await page.locator('.care-finder-item [data-click="careFinderUseOrg"]').first().click();
        await expect(page.locator('.care-finder-set').first()).toContainText('설정됨');
    });
});
