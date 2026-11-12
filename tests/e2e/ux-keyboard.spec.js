// tests/e2e/ux-keyboard.spec.js — UX-FORM-04 가상 키보드 크롬 재배치
// @spec UX-FORM-04
// 실제 소프트 키보드는 브라우저 자동화로 열 수 없으므로 visualViewport를
// addInitScript로 사전 치환해 '키보드 점유' 상태를 시뮬레이션한다.
// (앱 부팅 전에 주입해야 initViewportHeight·initKeyboardGuard가 스텁에 바인딩됨)
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

const FAKE_VV = `(() => {
    const vv = new EventTarget();
    // addInitScript는 레이아웃 전에 실행돼 innerHeight가 과대 보고될 수 있으므로
    // 명시 set 전까지는 현재 innerHeight를 따라가는 lazy getter로 둔다
    let _h = 0;
    Object.defineProperty(vv, 'height', {
        get: () => _h || window.innerHeight,
        set: (v) => { _h = v; },
    });
    vv.width = window.innerWidth;
    vv.scale = 1;
    vv.offsetTop = vv.offsetLeft = vv.pageTop = vv.pageLeft = 0;
    window.__fakeVV = vv;
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
})()`;

async function boot(page) {
    await page.addInitScript(SEED);
    await page.addInitScript(FAKE_VV);
    await page.goto('/index.html#/dashboard');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
}

// 키보드 점유 상태로 전환 — vv.height를 줄이고 resize 발행
const openKeyboard = `(() => {
    const vv = window.__fakeVV;
    vv.height = window.innerHeight - 320;
    vv.dispatchEvent(new Event('resize'));
})()`;
const closeKeyboard = `(() => {
    const vv = window.__fakeVV;
    vv.height = window.innerHeight;
    vv.dispatchEvent(new Event('resize'));
})()`;

test.describe('UX-FORM-04 가상 키보드 대응', () => {
    test('키보드 오픈 시 탭 바 숨김 + 포커스 입력이 가시 영역에 유지된다', async ({ page }) => {
        test.skip((page.viewportSize()?.width ?? 9999) > 768, '모바일 대역 전용 — 탭 바 존재 구간');
        await boot(page);

        const tabBar = page.locator('.mobile-tab-bar');
        await expect(tabBar).toBeVisible();
        const fullH = await page.evaluate(() => window.innerHeight);

        // 스크롤 끝에 텍스트 입력을 두고 포커스 — 키보드 점유 시뮬레이션
        await page.evaluate(() => {
            const input = document.createElement('input');
            input.id = 'e2e-kb-input';
            input.type = 'text';
            input.style.cssText = 'margin-top:40px';
            (document.querySelector('.main-content') || document.body).appendChild(input);
            input.focus();
        });
        await page.evaluate(openKeyboard);

        await expect(page.locator('body')).toHaveClass(/kb-open/);
        await expect(tabBar).toBeHidden(); // display:none — 탭 바 해제

        // --app-height가 시각 뷰포트로 축소 → 앱 셸이 키보드 위 영역으로 재배치
        const geom = await page.evaluate(() => ({
            appH: parseInt(document.documentElement.style.getPropertyValue('--app-height')),
            containerH: document.querySelector('.app-container').getBoundingClientRect().height,
        }));
        expect(geom.appH).toBeLessThanOrEqual(fullH - 200);
        expect(geom.containerH).toBeLessThanOrEqual(fullH - 200);

        // 레이아웃 점프 보정 후 포커스 입력이 키보드 위 가시 영역 안에 있다
        await page.waitForTimeout(450); // align 타이머(350ms) + 여유
        const box = await page.evaluate(() => {
            const r = document.getElementById('e2e-kb-input').getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, vvH: window.__fakeVV.height };
        });
        expect(box.bottom).toBeLessThanOrEqual(box.vvH + 1);
        expect(box.top).toBeGreaterThanOrEqual(0);

        // 키보드 닫힘 → 크롬 복원
        await page.evaluate(closeKeyboard);
        await expect(page.locator('body')).not.toHaveClass(/kb-open/);
        await expect(tabBar).toBeVisible();
    });

    test('비텍스트 포커스(버튼)는 kb-open으로 오판하지 않는다', async ({ page }) => {
        test.skip((page.viewportSize()?.width ?? 9999) > 768, '모바일 대역 전용');
        await boot(page);
        await page.evaluate(() => {
            const btn = document.createElement('button');
            btn.id = 'e2e-kb-btn';
            document.body.appendChild(btn);
            btn.focus();
        });
        await page.evaluate(openKeyboard);
        await expect(page.locator('body')).not.toHaveClass(/kb-open/);
    });
});
