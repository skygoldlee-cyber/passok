// tests/e2e/ux-feedback.spec.js — UX-FB-09~11 알림 큐·파괴 확인·비동기 상태 + UX-PWA-08 오프라인 표시
// @spec UX-FB-09,UX-FB-10,UX-FB-11,UX-PWA-08
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

async function boot(page) {
    await page.addInitScript(SEED);
    await page.goto('/index.html#/dashboard');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
}

test.describe('UX-FB-09 부팅 모달 우선순위 큐', () => {
    test('큐 등록 모달은 우선순위 순으로 1개씩 표시', async ({ page }) => {
        await boot(page);
        // 페이지 컨텍스트에서 실제 큐 모듈 사용 — 낮은 우선순위를 먼저 등록해도 정렬 보장
        await page.evaluate(async () => {
            const mk = (id) => () => {
                const d = document.createElement('div');
                d.id = id;
                d.textContent = id;
                d.style.cssText = 'position:fixed;top:10px;left:10px;width:100px;height:40px;background:#000;color:#fff;z-index:99999';
                document.body.appendChild(d);
            };
            const q = await import('/src/shell/boot-modal-queue.js');
            q.enqueueBootModal(30, 'e2e-queue-b', mk('e2e-queue-b'));
            q.enqueueBootModal(10, 'e2e-queue-a', mk('e2e-queue-a'));
        });
        await expect(page.locator('#e2e-queue-a')).toBeVisible();
        expect(await page.locator('#e2e-queue-b').count()).toBe(0);

        // 앞 모달 닫힘 → 다음 우선순위 모달 표시
        await page.evaluate(() => document.getElementById('e2e-queue-a').remove());
        await expect(page.locator('#e2e-queue-b')).toBeVisible();
    });
});

test.describe('UX-FB-10 파괴 확인·되돌리기', () => {
    test('백업 가져오기 — 변경 요약 → 병합/덮어쓰기 선택 → 적용', async ({ page }) => {
        await boot(page);

        const payload = JSON.stringify({ fc_memorized: JSON.stringify(['e2e_card']) });
        await page.setInputFiles('#import-file-input', {
            name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(payload),
        });

        // 변경 요약 모달 — 항목 수 고지 + 병합/덮어쓰기 선택지
        const overlay = page.locator('#app-confirm-overlay');
        await expect(overlay).toBeVisible();
        await expect(overlay).toContainText('1개 항목');
        await expect(overlay.locator('[data-choice="merge"]')).toBeVisible();
        await expect(overlay.locator('[data-choice="overwrite"]')).toBeVisible();
        // 덮어쓰기는 파괴적 — danger 스타일
        await expect(overlay.locator('[data-choice="overwrite"]')).toHaveClass(/danger/);

        // 취소 → 스토리지 미변경
        await overlay.locator('.app-confirm-cancel').click();
        await expect(overlay).not.toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('carework:fc_memorized'))).toBeNull();

        // 덮어쓰기 → 적용 후 리로드
        await page.setInputFiles('#import-file-input', {
            name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(payload),
        });
        await expect(overlay).toBeVisible();
        await Promise.all([
            page.waitForNavigation({ timeout: 15_000 }).catch(() => null),
            overlay.locator('[data-choice="overwrite"]').click(),
        ]);
        expect(await page.evaluate(() => localStorage.getItem('carework:fc_memorized')))
            .toBe(JSON.stringify(['e2e_card']));
    });

    test('삭제 확인 모달은 danger 스타일', async ({ page }) => {
        await boot(page);
        await page.evaluate(async () => {
            const u = await import('/src/ui-utils.js');
            window.__e2eConfirm = u.showConfirm('기록을 삭제할까요?', '삭제 확인');
        });
        await expect(page.locator('.app-confirm-ok.danger')).toBeVisible();
        await page.locator('.app-confirm-cancel').click();
    });
});

test.describe('UX-FB-11 장시간 작업 상태', () => {
    test('300ms 지연 임계 — 단시 작업은 스피너 미표시, 장시간은 표시+취소', async ({ page }) => {
        await boot(page);

        // ① 지연 임계 — 50ms 내 완료는 오버레이 미표시 (플리커 방지)
        const shortShown = await page.evaluate(async () => {
            const u = await import('/src/ui-utils.js');
            u.showGlobalLoading('짧은 작업');
            await new Promise(r => setTimeout(r, 50));
            u.hideGlobalLoading();
            await new Promise(r => setTimeout(r, 400));
            return document.getElementById('global-loading-overlay')?.classList.contains('is-visible');
        });
        expect(shortShown).toBe(false);

        // ② 장시간 작업 — 지연 후 표시 + 취소 버튼
        const cancelSeen = await page.evaluate(async () => {
            const u = await import('/src/ui-utils.js');
            const p = u.runWithLoading((signal) => new Promise((_, rej) => {
                signal.addEventListener('abort', () => { const e = new Error('x'); e.name = 'AbortError'; rej(e); });
            }), { message: 'AI 호출 중', cancellable: true, timeoutMs: 10_000 });
            await new Promise(r => setTimeout(r, 500));
            const overlay = document.getElementById('global-loading-overlay');
            const visible = overlay?.classList.contains('is-visible') === true;
            const btn = overlay?.querySelector('.global-loading-cancel');
            btn?.click();
            const aborted = await p.then(() => false).catch(e => e.name === 'AbortError');
            return visible && !!btn && aborted;
        });
        expect(cancelSeen).toBe(true);
    });
});

test.describe('UX-PWA-08 오프라인 기능 표시', () => {
    test('오프라인 — 네트워크 기능 숨기지 않고 비활성+사유 안내, 복귀 시 복원', async ({ page }) => {
        test.setTimeout(90_000);
        await boot(page);

        // 오프라인 상태 진입 (offline-detection 프로브 확정 신호를 그대로 사용)
        await page.evaluate(() =>
            window.dispatchEvent(new CustomEvent('app:offline-change', { detail: { offline: true } })));

        // 계정 메뉴는 유지(모달 자체는 로컬) — 내부 네트워크 버튼이 비활성
        const redeem = page.locator('[data-click="showRedeemCode"]');
        await expect(redeem).toHaveAttribute('aria-disabled', 'true');
        await expect(redeem).toHaveClass(/offline-blocked/);
        await expect(redeem).toHaveAttribute('title', /오프라인/);

        // 비활성 클릭 → 사유 토스트
        await page.evaluate(() => document.querySelector('[data-click="showRedeemCode"]').click());
        await expect(page.locator('#app-toast')).toContainText('오프라인에서는 사용할 수 없습니다');

        // 온라인 복귀 → 비활성 해제
        await page.evaluate(() =>
            window.dispatchEvent(new CustomEvent('app:offline-change', { detail: { offline: false } })));
        await expect(redeem).not.toHaveAttribute('aria-disabled', 'true');
        await expect(redeem).not.toHaveClass(/offline-blocked/);
    });
});
