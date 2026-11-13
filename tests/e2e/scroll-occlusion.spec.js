// tests/e2e/scroll-occlusion.spec.js — 고정 크롬 오클루전 공용 검증 (실브라우저)
// @spec UX-NAV-11,TR-23
// mobile-overflow.spec의 스윕이 버튼·입력 등 상호작용 요소의 가림을 본다면,
// 이 스펙은 비상호작용 콘텐츠(헤딩·본문·카드)가 고정 크롬 아래로 밀려 잘리는
// 회귀를 검증한다 — 헤더가 뷰 상단을 덮는 잘림(manual-07 류), TOC·앵커 점프
// 대상이 sticky 크롬 아래로 들어가는 사례(scroll-margin-top 계약)가 대상이다.
// 계측은 tests/e2e/support/geometry.js 의 elementFromPoint 실측 헬퍼를 쓴다.
import { test, expect } from '@playwright/test';
import { examSeed } from './support/exam-matrix.js';
import { waitForViewSettled, findOcclusion, viewTopOcclusion } from './support/geometry.js';

// 슬러그 → 뷰 섹션 id (a11y.spec SLUG_VIEW와 동일 매핑 — router.js VIEW_HASH_SLUGS 정합)
const SLUG_VIEW = {
    dashboard: 'dashboard-view', analysis: 'analysis-view', cards: 'flashcard-view',
    quiz: 'quiz-view', review: 'review-view', trainer: 'trainer-view', exam: 'exam-view',
    textbook: 'textbook-view', reader: 'textbook-reader-view', ingredients: 'dictionary-view',
    calendar: 'calendar-view', exams: 'exam-select-view',
};
const viewId = (slug) => SLUG_VIEW[slug] || `${slug}-view`;

const PLATFORM_VIEWS = [
    'dashboard', 'analysis', 'cards', 'quiz', 'review', 'trainer', 'exam',
    'textbook', 'reader', 'ingredients', 'calendar', 'exams', 'formula',
];
const CARE_VIEWS = [
    'dashboard', 'care-home', 'care-calc', 'care-card', 'care-log', 'care-flow',
    'care-audit', 'care-handover', 'care-visit', 'care-client', 'care-incident',
    'care-roster', 'care-finder', 'care-forms', 'care-custom-form',
];

// 뷰 진입·전환 시 뜨는 안내 오버레이는 정상 모달 계약 — 오클루전 대상이 아니므로 제거
async function dismissOverlays(page) {
    await page.evaluate(() => {
        document.querySelectorAll(
            '#pro-upgrade-overlay, #app-confirm-overlay, #whats-new-overlay,'
            + ' #feedback-overlay, #usage-stats-overlay, #onboarding-overlay, #cing-overlay')
            .forEach(el => el.remove());
    });
}

test.describe('고정 크롬 오클루전', () => {
    for (const grp of [
        { exam: 'cosmetic', views: PLATFORM_VIEWS },
        { exam: 'carework', views: CARE_VIEWS },
    ]) {
        test(`${grp.exam} — 뷰 최상단 콘텐츠가 크롬에 가려지지 않는다`, async ({ page }) => {
            test.setTimeout(180_000);
            await page.addInitScript(examSeed(grp.exam));
            await page.goto('/index.html#/dashboard');
            await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
            await dismissOverlays(page);
            const failures = [];
            for (const slug of grp.views) {
                await page.evaluate((s) => { location.hash = '/' + s; }, slug);
                const id = viewId(slug);
                if (!(await waitForViewSettled(page, id))) continue; // 진입 불가 뷰 스킵
                await dismissOverlays(page);
                const occ = await viewTopOcclusion(page);
                if (occ) failures.push(`${slug}: ${occ}`);
            }
            expect(failures, `뷰 상단 가림:\n${failures.join('\n')}`).toEqual([]);
        });
    }

    test('리더 TOC 점프 헤딩이 sticky 크롬 아래로 가려지지 않는다 (TR-23)', async ({ page }) => {
        test.setTimeout(90_000);
        await page.addInitScript(examSeed('cosmetic'));
        await page.goto('/index.html#/reader');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        await dismissOverlays(page);
        const sel = page.locator('#reader-subject-select');
        await expect(sel).toBeVisible({ timeout: 15_000 });
        await sel.selectOption({ index: 1 });
        await expect(page.locator('#reader-toc-list .reader-toc-item').first())
            .toBeVisible({ timeout: 30_000 });

        // ≤900px에서는 TOC가 오프캔버스 드로어 — 점프 계약은 사이드바 레이아웃에서 검증
        const isDrawer = await page.evaluate(() =>
            getComputedStyle(document.getElementById('reader-toc')).position === 'fixed');
        test.skip(isDrawer, '드로어 TOC 레이아웃 — 사이드바 대역에서만 검증');

        // 본문을 끝까지 내려 크롬 자동 숨김 상태를 만든 뒤, 상위 섹션으로 점프 —
        // 상향 스크롤은 크롬을 다시 표시하므로 scroll-margin-top 계약 위반이 드러난다
        const pick = await page.evaluate(() => {
            const c = document.getElementById('textbook-reader-container');
            if (c) c.scrollTop = c.scrollHeight;
            const items = Array.from(document.querySelectorAll('#reader-toc-list .reader-toc-item'));
            const idx = items.findIndex(el =>
                document.getElementById('reader-section-' + el.dataset.sectionIdx));
            if (idx < 0) return null;
            items[idx].setAttribute('data-occ-pick', '1');
            return 'reader-section-' + items[idx].dataset.sectionIdx;
        });
        test.skip(!pick, '점프 가능한 TOC 항목 없음');
        await page.locator('#reader-toc-list .reader-toc-item[data-occ-pick]').click();
        // smooth 스크롤 진행 중엔 일시 가림이 정상 — 정착 후 판정해야 하므로 폴링
        await expect.poll(() => findOcclusion(page, '#' + pick), { timeout: 8_000 })
            .toEqual([]);
    });

    test('문서 오버레이 목차 점프 헤딩이 상단 바 아래로 가려지지 않는다', async ({ page }) => {
        test.setTimeout(90_000);
        await page.addInitScript(examSeed('cosmetic'));
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
        await page.evaluate(() => window.ManualViewer.openManual());
        await page.waitForFunction(() =>
            document.querySelectorAll('#manual-article h2, #manual-article h3').length > 1,
            null, { timeout: 30_000 });

        // 오픈 직후 첫 헤딩이 .manual-ov-bar 아래에서 시작하는지
        // (헤딩 id는 파서 부여값 우선이라 manual-h-N이 항상 존재하진 않음 — 위치 셀렉터 사용)
        const first = await findOcclusion(page, '#manual-article h2, #manual-article h3');
        expect(first, '오버레이 첫 헤딩 가림').toEqual([]);

        // 목차(details)를 열어 마지막 항목으로 점프 — 착지 헤딩이 바에 가려지지 않아야 함
        const toc = page.locator('.manual-ov-toc');
        if (!(await toc.count())) { test.skip(true, '문서 목차 없음'); return; }
        await toc.locator('summary').click();
        const links = toc.locator('a[data-manual-jump]');
        const last = links.last();
        const jumpId = await last.getAttribute('data-manual-jump');
        await last.click();
        await expect.poll(() => findOcclusion(page, '#' + jumpId), { timeout: 8_000 })
            .toEqual([]);
    });
});
