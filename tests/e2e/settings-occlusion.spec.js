// tests/e2e/settings-occlusion.spec.js — 설정 패널 오클루전 회귀 (실브라우저)
// @spec UX-SET-06
// .app-header 자손인 설정 패널이 뷰 내부 오버레이 아래로 가려지는 버그 회귀:
// 리더 .reader-chrome(불투명 카드)이 헤더와 같은 z-index라 DOM 후순 규칙으로
// 패널 상단을 가렸던 실사례(2026-10-24). 정적 CSS 검사는 display 조건·JS 동적
// 요소를 못 잡으므로 뷰별로 패널을 연 뒤 elementFromPoint 실측으로 검증한다.
import { test, expect } from '@playwright/test';

// 뷰 순회 대상 — 슬러그 → 뷰 id (router.js VIEW_HASH_SLUGS와 정합)
const VIEWS = [
    { slug: 'dashboard', id: 'dashboard-view' },
    { slug: 'reader', id: 'textbook-reader-view' },
    { slug: 'cards', id: 'flashcard-view' },
    { slug: 'quiz', id: 'quiz-view' },
    { slug: 'review', id: 'review-view' },
    { slug: 'trainer', id: 'trainer-view' },
    { slug: 'textbook', id: 'textbook-view' },
    { slug: 'ingredients', id: 'dictionary-view' },
    { slug: 'calendar', id: 'calendar-view' },
    { slug: 'analysis', id: 'analysis-view' },
    { slug: 'exams', id: 'exam-select-view' },
];

async function boot(page) {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
    await page.evaluate(() => {
        document.querySelectorAll('#app-confirm-overlay, #onboarding-overlay').forEach(el => el.remove());
    });
}

test.beforeEach(({ page }) => {
    page.addInitScript(() => {
        localStorage.setItem('current_exam', 'cosmetic');
        localStorage.setItem('onboarding_seen_v1', '1');
        localStorage.setItem('telemetry_notice_shown', '1');
        localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
    });
    page._errors = [];
    page.on('pageerror', err => page._errors.push(String(err)));
});

test.describe('설정 패널 오클루전 (UX-SET-06)', () => {
    for (const { slug, id } of VIEWS) {
        test(`${slug} 뷰에서 패널이 뷰 오버레이 위에 그려진다`, async ({ page }) => {
            test.setTimeout(60_000);
            await boot(page);

            await page.evaluate((s) => { location.hash = '/' + s; }, slug);
            const view = page.locator('#' + id);
            try {
                await expect(view).toHaveClass(/active/, { timeout: 5_000 });
            } catch {
                test.skip(true, `${id} 미활성화 — 이 환경에서 진입 불가한 뷰`);
            }

            // 리더는 과목 로드까지 진행 — 크롬 카드가 실제 렌더된 상태를 재현
            if (id === 'textbook-reader-view') {
                const sel = page.locator('#reader-subject-select');
                if (await sel.isVisible()) {
                    await sel.selectOption({ index: 1 });
                    await page.waitForFunction(() =>
                        document.querySelectorAll('#textbook-reader-container .reader-section-card, #reader-toc-list .reader-toc-item').length > 0,
                        null, { timeout: 30_000 }).catch(() => {});
                }
            }

            // 뷰 진입 시 뜨는 모달(Pro 안내 등) 제거 — 토글 클릭 가로막힘 방지.
            // 모달이 뷰를 덮는 것은 정상 계약이라 오클루전 검사 대상이 아니다.
            await page.evaluate(() => {
                document.querySelectorAll('.app-confirm-overlay.is-visible, #pro-upgrade-overlay')
                    .forEach(el => el.remove());
            });

            const panel = page.locator('#settings-panel');
            await page.locator('#settings-toggle-btn').click();
            await expect(panel).not.toHaveClass(/is-hidden/);

            // 패널 박스 내 5개 높이 샘플 — 각 지점의 최상단 요소가 패널 자손이어야 함.
            // 뷰포트 밖 지점은 elementFromPoint(null)이라 자동 제외.
            const occluded = await page.evaluate(() => {
                const p = document.getElementById('settings-panel');
                const r = p.getBoundingClientRect();
                const bad = [];
                for (const fy of [0.05, 0.25, 0.5, 0.75, 0.95]) {
                    const x = r.left + r.width / 2;
                    const y = r.top + r.height * fy;
                    if (y < 0 || y >= innerHeight || x < 0 || x >= innerWidth) continue;
                    const el = document.elementFromPoint(x, y);
                    if (el && !p.contains(el)) {
                        bad.push({ fy, hit: el.id ? `#${el.id}` : (el.className || el.tagName) });
                    }
                }
                return bad;
            });
            expect(occluded, `${slug} 뷰 — 패널 위를 덮는 요소: ${JSON.stringify(occluded)}`).toEqual([]);
        });
    }
});
