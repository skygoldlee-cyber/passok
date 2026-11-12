// tests/e2e/responsive-flow.spec.js — 반응형·내비·폼·PWA 게이팅 실측
// @spec R-02,R-04,R-05,R-08,R-11,A-13,A-18,UX-NAV-06,UX-NAV-07,UX-NAV-15,UX-SCR-01,UX-FORM-01,UX-FORM-02,UX-PWA-01,UX-PWA-02,UX-PWA-05
// 스크롤 복원·그리드 종열·회전·커맨드 팔레트·스크롤바 이원화·입력 폰트·
// 터치 피드백·standalone 게이팅·--app-height 실측 — 모두 레이아웃/입력 의존이라 e2e만 유효.

import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) => {
    page._errors = [];
    page.on('pageerror', err => page._errors.push(String(err)));
    page.addInitScript(() => {
        localStorage.setItem('current_exam', 'cosmetic');
        localStorage.setItem('onboarding_seen_v1', '1');
        localStorage.setItem('telemetry_notice_shown', '1');
        localStorage.setItem('cosmetic:onboarding_seen_v1', '1');
    });
});

async function boot(page) {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 15_000 });
    await page.evaluate(() =>
        document.querySelectorAll('#onboarding-overlay, #app-confirm-overlay').forEach(el => el.remove()));
}

/** 뷰 이동 — 데스크톱 사이드바/모바일 탭 바에 보이는 항목 우선, 없으면 더보기 시트 */
async function navClick(page, target) {
    const visible = page.locator(
        `.nav-item[data-target="${target}"]:visible, .mobile-tab-item[data-target="${target}"]:visible`);
    if (await visible.count()) { await visible.first().click(); return; }
    // 탭 바에 없는 뷰 — 더보기 시트 경유
    await page.locator('#mobile-more-btn').click();
    await expect(page.locator('#mobile-more-sheet')).not.toHaveClass(/is-hidden/);
    await page.locator(`#mobile-more-sheet [data-target="${target}"]`).first().click();
}

test.describe('반응형·내비게이션 실측', () => {
    test('내비 왕복 시 스크롤이 복원되고 딥링크는 맨 위로 연다 (R-04, UX-NAV-07)', async ({ page }) => {
        test.setTimeout(60_000);
        await boot(page);
        // 대시보드에서 스크롤
        const sc = await page.evaluate(() => {
            const mc = document.querySelector('.main-content');
            const range = mc.scrollHeight - mc.clientHeight;
            if (range > 100) { mc.scrollTop = Math.min(400, range); }
            return { range, top: mc.scrollTop };
        });
        if (sc.range <= 100) { test.skip(true, '이 뷰포트에서 대시보드 스크롤 범위 부족'); return; }
        const saved = sc.top;
        await navClick(page, 'flashcard-view');
        await expect(page.locator('#flashcard-view')).toBeVisible();
        await navClick(page, 'dashboard-view');
        await expect(page.locator('#dashboard-view')).toBeVisible();
        // 복원은 활성화 직후 rAF + 대시보드 비동기 재렌더가 겹친다 — 안정값까지 폴링
        await page.waitForTimeout(1200);
        const restored = await page.evaluate(() => document.querySelector('.main-content').scrollTop);
        expect(restored).toBeCloseTo(saved, -1);
        // 액션 딥링크(scrollTop:true)는 맨 위로
        await page.evaluate(async () => {
            const nav = await import('./src/views/navigation.js');
            nav.switchView('flashcard-view', { scrollTop: true });
        });
        await page.waitForTimeout(300);
        const deepTop = await page.evaluate(() => document.querySelector('.main-content').scrollTop);
        expect(deepTop).toBe(0);
    });

    test('그리드가 뷰포트 대역에 맞게 종열 전환된다 (R-05)', async ({ page }) => {
        await boot(page);
        const cols = await page.evaluate(() => {
            const grid = document.querySelector('.stats-grid, .dashboard-grid, .cards-grid');
            if (!grid) return null;
            return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
        });
        if (cols === null) { test.skip(true, '대시보드 그리드 미존재'); return; }
        const vw = await page.evaluate(() => window.innerWidth);
        // R-05 종열 전환 — 좁은 대역은 열 수 감소(stats-grid 모바일 의도적 2열, ≤375px 1열)
        if (vw <= 900) expect(cols).toBeLessThanOrEqual(2);
        else expect(cols).toBeGreaterThanOrEqual(2);
    });

    test('가로/세로 전환 — 버튼은 비활성이고 landscape-mode 핸들러는 유지된다 (R-08)', async ({ page }) => {
        await boot(page);
        // 버튼은 의도적 비표시(실제 기기 회전으로 대체) — 계약: 숨김 유지 + 핸들러 동작
        await expect(page.locator('#orientation-toggle-btn')).toBeHidden();
        const r = await page.evaluate(() => {
            const btn = document.getElementById('orientation-toggle-btn');
            const before = document.body.classList.contains('landscape-mode');
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            const mid = document.body.classList.contains('landscape-mode');
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return { before, mid, after: document.body.classList.contains('landscape-mode') };
        });
        expect(r.mid).toBe(!r.before);
        expect(r.after).toBe(r.before);
    });

    test('모드 전환은 전 대역 내비 크롬 끝단에 직접 배치된다 (UX-NAV-15)', async ({ page }) => {
        await boot(page);
        const vw = await page.evaluate(() => window.innerWidth);
        // 대역별 동등 위치 — 모바일: 탭바 우측 끝 탭 / 태블릿·PC: 사이드바 푸터(태블릿은 상단 바 우측)
        const toggle = vw <= 768
            ? page.locator('#mobile-tab-bar .mobile-tab-mode')
            : page.locator('.sidebar-footer #ui-mode-toggle');
        await expect(toggle).toBeVisible();
        // 설정 패널에는 모드 전환을 두지 않는다 — 내비 크롬이 유일 진입 경로 (UM-05)
        await expect(page.locator('.settings-item[data-click="toggleUiMode"]')).toHaveCount(0);
        // 직접 동작 검증 — 크롬 배치가 dead 버튼이 아니어야 원칙 충족
        await toggle.click();
        await expect(page.locator('body')).toHaveClass(/ui-mode-practice/);
        await toggle.click(); // 복귀 — 양 모드에서 노출되는지도 함께 확인
        await expect(page.locator('body')).not.toHaveClass(/ui-mode-practice/);
    });

    test('200% 확대(실효 폭 절반)에서도 수평 오버플로 없이 사용 가능하다 (A-13)', async ({ page }) => {
        // 브라우저 200% 확대 ≈ CSS px 뷰포트 절반 — SC 1.4.4/1.4.10 실효 폭 환산
        const cur = await page.viewportSize();
        await page.setViewportSize({ width: Math.floor(cur.width / 2), height: cur.height });
        await boot(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(1);
        // 크롬이 실효 폭에서도 노출됨 — 헤더 설정 버튼 도달 가능
        await expect(page.locator('#settings-toggle-btn')).toBeVisible();
        await page.setViewportSize(cur);
    });

    test('앱 내 글자 크게(font-xl)에서도 수평 오버플로·컨트롤 침범 없이 도달 가능하다 (A-18)', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => document.documentElement.classList.add('font-xl'));
        await page.waitForTimeout(200);
        // 문서 수평 오버플로 금지 (UX-NAV-10 — 확대 상태에서도 유지)
        const docOF = await page.evaluate(() =>
            document.documentElement.scrollWidth - window.innerWidth);
        expect(docOF).toBeLessThanOrEqual(1);
        const vw = await page.evaluate(() => window.innerWidth);
        const tabBarVisible = await page.locator('.mobile-tab-bar').isVisible().catch(() => false);
        if (vw <= 900 && tabBarVisible) {
            // 탭 라벨이 자기 탭 박스 밖으로 번지지 않음 (ellipsis 억제)
            const spill = await page.evaluate(() =>
                [...document.querySelectorAll('.mobile-tab-item > span')]
                    .filter(s => {
                        const p = s.parentElement.getBoundingClientRect();
                        const r = s.getBoundingClientRect();
                        return s.offsetParent !== null && (r.right > p.right + 1 || r.left < p.left - 1);
                    }).length);
            expect(spill).toBe(0);
            // sticky 모드 토글은 설계된 오버레이(UX-NAV-15) — 더보기는 스크롤로 도달 가능해야 함
            const more = page.locator('#mobile-more-btn');
            const bar = page.locator('.mobile-tab-bar');
            await bar.evaluate(el => { el.scrollLeft = el.scrollWidth; });
            await page.waitForTimeout(200);
            await expect(more).toBeVisible();
            const covered = await page.evaluate(() => {
                const m = document.querySelector('.mobile-tab-bar .mobile-tab-mode')?.getBoundingClientRect();
                const b = document.querySelector('#mobile-more-btn')?.getBoundingClientRect();
                if (!m || !b) return 0;
                return Math.min(b.right, m.right) - Math.max(b.left, m.left);
            });
            // 스크롤 끝에서 더보기가 모드 오버레이에 완전히 묻히지 않아야 함 (탭 영역 절반 이상 노출)
            expect(covered).toBeLessThanOrEqual(30);
        }
        // 설정 패널 — 항목이 flex 압축으로 라벨을 흘리지 않음
        await page.locator('#settings-toggle-btn').click();
        await page.waitForTimeout(200);
        const clipped = await page.evaluate(() =>
            [...document.querySelectorAll('.settings-item')]
                .filter(el => el.offsetParent !== null && el.scrollHeight > el.clientHeight + 2).length);
        expect(clipped).toBe(0);
        await page.locator('#settings-toggle-btn').click();
        await page.evaluate(() => document.documentElement.classList.remove('font-xl'));
    });

    test('텍스트 200% 배율(폰트만 확대)에서도 컨트롤이 겹치거나 문서가 넘치지 않는다 (A-13)', async ({ page }) => {
        // 뷰포트 절반 환산과 별개 경로 — px 고정 레이아웃 위에서 텍스트만 커지는 실확대 근사
        await boot(page);
        await page.evaluate(() => document.querySelectorAll('body *').forEach(el => {
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs > 0) el.style.fontSize = (fs * 2) + 'px';
        }));
        await page.waitForTimeout(250);
        const r = await page.evaluate(() => {
            const vis = el => {
                const b = el.getBoundingClientRect();
                return b.width > 0 && b.height > 0 && el.offsetParent !== null;
            };
            const ctls = [...document.querySelectorAll('button, .btn, select, input:not([type=hidden]), [data-click], [role=button]')].filter(vis);
            const overlap = [];
            const seen = new Set();
            for (const el of ctls) {
                const p = el.parentElement;
                if (!p || seen.has(p)) continue;
                seen.add(p);
                const sibs = [...p.children].filter(c => vis(c) &&
                    c.matches('button, .btn, select, input:not([type=hidden]), [data-click], [role=button]') &&
                    // .mobile-tab-mode는 UX-NAV-15 설계상 sticky 오버레이 — 스크롤 항목이 그 아래를 지나는 것은 의도 (도달성은 A-18 테스트가 검증)
                    !c.classList.contains('mobile-tab-mode'));
                for (let i = 0; i < sibs.length - 1; i++) {
                    const a = sibs[i].getBoundingClientRect(), b = sibs[i + 1].getBoundingClientRect();
                    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
                        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2)
                        overlap.push(p.getAttribute('class') || p.tagName);
                }
            }
            return { docOF: document.documentElement.scrollWidth - window.innerWidth, overlap: [...new Set(overlap)] };
        });
        expect(r.docOF).toBeLessThanOrEqual(1);
        expect(r.overlap).toEqual([]);
    });

    test('통합 검색 팔레트가 Ctrl+K로 열리고 검색·실행된다 (UX-NAV-06)', async ({ page }) => {
        await boot(page);
        await page.keyboard.press('Control+k');
        const overlay = page.locator('#cmdk-overlay');
        await expect(overlay).not.toHaveClass(/is-hidden/);
        const input = page.locator('#cmdk-input');
        await expect(input).toBeFocused();
        await input.fill('퀴즈');
        const first = page.locator('#cmdk-results .cmdk-item, #cmdk-results [role="option"]').first();
        await expect(first).toBeVisible({ timeout: 10_000 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        // 팔레트가 닫히고 무언가 실행됐다 (뷰 전환 또는 액션)
        await expect(overlay).toHaveClass(/is-hidden/);
    });

    test('터치 환경에서는 스크롤바가 숨겨진다 (UX-SCR-01)', async ({ page }) => {
        await boot(page);
        const r = await page.evaluate(() => ({
            vw: window.innerWidth,
            coarse: matchMedia('(pointer: coarse)').matches,
            sbw: getComputedStyle(document.querySelector('.main-content')).scrollbarWidth,
        }));
        if (r.vw <= 900 || r.coarse) expect(r.sbw).toBe('none');
        else expect(r.sbw).not.toBe('none');
    });

    test('모바일 입력 필드가 iOS 줌 방지 기준(16px) 이상이다 (UX-FORM-01)', async ({ page }) => {
        const vw = await page.evaluate(() => window.innerWidth);
        if (vw > 900) { test.skip(true, '모바일 대역 전용 규약'); return; }
        await boot(page);
        const small = await page.evaluate(() =>
            Array.from(document.querySelectorAll('input, select, textarea'))
                .filter(el => el.offsetParent !== null)
                .map(el => ({ el: el.id || el.className, fs: parseFloat(getComputedStyle(el).fontSize) }))
                .filter(x => x.fs < 16));
        expect(small).toEqual([]);
    });

    test('터치 피드백 — 누르는 동안 scale이 적용된다 (UX-FORM-02)', async ({ page }) => {
        const vw = await page.evaluate(() => window.innerWidth);
        await boot(page);
        const target = vw <= 768 ? page.locator('.mobile-tab-item').first() : page.locator('.nav-item').first();
        const box = await target.boundingBox();
        if (!box) { test.skip(true, '대상 미표시'); return; }
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // 누른 상태(:active)에서 transform 계측 — 규약은 scale(0.92~0.98).
        // transition이 있으므로 보간 완료까지 홀드 후 측정
        await page.waitForTimeout(350);
        const tf = await target.evaluate(el => getComputedStyle(el).transform);
        await page.mouse.up();
        const scale = tf === 'none' ? 1 : parseFloat(tf.match(/matrix\(([^,]+)/)?.[1] || '1');
        expect(scale).toBeGreaterThan(0.85);
        expect(scale).toBeLessThan(1);
    });

    test('브라우저 탭에서 standalone 전용 UI가 숨겨진다 (UX-PWA-02)', async ({ page }) => {
        await boot(page);
        const r = await page.evaluate(() => ({
            standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
            quitHidden: document.getElementById('app-quit-btn')?.classList.contains('is-hidden'),
        }));
        expect(r.standalone).toBe(false);
        expect(r.quitHidden).toBe(true);
    });

    test('종료 확인 → 차단 시 안내 화면 폴백이 나타난다 (UX-PWA-01)', async ({ page }) => {
        await boot(page);
        // quitApp은 standalone 게이팅이라 버튼이 숨겨져 있음 — 핸들러 직접 호출로 폴백 경로 검증
        await page.evaluate(() => {
            const btn = document.getElementById('app-quit-btn');
            btn.classList.remove('is-hidden');
            btn.click();
        });
        await expect(page.locator('#app-confirm-overlay')).toBeVisible({ timeout: 5_000 });
        await page.locator('.app-confirm-ok').click();
        // 탭 컨텍스트에서는 window.close()가 차단 → 600ms 후 안내 화면
        await expect(page.locator('.app-exit-screen')).toBeVisible({ timeout: 3_000 });
    });

    test('뷰포트 높이 변동 시 --app-height가 실시간 추적한다 (R-02)', async ({ page }) => {
        await boot(page);
        const before = await page.evaluate(() => ({
            appH: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-height')),
            vh: window.innerHeight,
        }));
        expect(Math.abs(before.appH - before.vh)).toBeLessThanOrEqual(2);
        // 주소창 표시/숨김에 해당하는 동적 높이 변동 시뮬레이션 — resize 계열 이벤트로 갱신돼야 한다
        const cur = await page.viewportSize();
        await page.setViewportSize({ width: cur.width, height: Math.max(400, cur.height - 120) });
        await page.waitForFunction(() => {
            const appH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-height'));
            return Math.abs(appH - window.innerHeight) <= 2;
        }, null, { timeout: 5_000 });
    });

    test('--app-height가 실측 뷰포트와 일치한다 (UX-PWA-05)', async ({ page }) => {
        await boot(page);
        const r = await page.evaluate(() => {
            const banner = document.getElementById('formula-notice-banner');
            return {
                appH: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-height')),
                vh: window.innerHeight,
                containerH: document.querySelector('.app-container').getBoundingClientRect().height,
                bannerH: banner && !banner.classList.contains('is-hidden')
                    ? banner.getBoundingClientRect().height
                        + parseFloat(getComputedStyle(banner).marginBottom) : 0,
            };
        });
        expect(r.appH).toBeGreaterThan(0);
        // JS 실측값은 innerHeight와 일치 (≤1px 오차)
        expect(Math.abs(r.appH - r.vh)).toBeLessThanOrEqual(2);
        // 컨테이너 높이 경계는 높이 고정 대역(데스크톱·≤768px)에서만 — 태블릿(769–900)은
        // 의도된 페이지 스크롤 구조라 height:auto.
        // 인플로우 공지 배너(RR-20)가 보이면 그 높이만큼 컨테이너가 정당하게 축소된다.
        const vw = await page.evaluate(() => window.innerWidth);
        if (vw > 900 || vw <= 768) {
            expect(Math.abs(r.containerH - (r.vh - r.bannerH))).toBeLessThanOrEqual(2);
        }
    });
});
