// tests/e2e/journeys/j-102-auth-sync.spec.js — J-102 인증·동기화 (클라우드 복원 계약)
// @spec none
// 로그인 → 학습 쓰기 → 디바운스 push → sync_snapshots 행 검증 → 로그아웃 → 재로그인 →
// 클라우드 진도 복원 + 충돌 시 last-write 검증.
// 시드 계약: tools/supabase/seed_test_accounts.js SEED_ACCOUNTS (DSN-46 §3-2)
//   e2e-new    — snapshot 없음 → 첫 push 검증
//   e2e-active — snapshot(marker 'active', sim score 52) → 클라우드 복원 검증
//   e2e-sync   — snapshot(marker 'cloud-side', 어제 시각) → 충돌 해결 검증
// 선행: TEST_SUPABASE_* 4키 (.env 로컬·GitHub Secrets CI) — 미설정 시 전체 스킵
import { test, expect } from '@playwright/test';
import { installSupabaseOverride, requireSupabaseOverride } from '../support/supabase-override.js';

const TEST_URL = (process.env.TEST_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';
const PASSWORD = process.env.TEST_E2E_PASSWORD || '';
const REF = TEST_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || '';

// cloud_sync는 feature-plan.json상 pro 기능 — canCloudSync()가 entitlement를 요구하므로
// 로컬 pro_entitled를 시드한다 (서버 검증 전 임시 시임 — pro-upgrade.js hasProEntitlement).
const seedScript = (extra = '') => `(() => {
    const L = localStorage;
    L.setItem('current_exam', 'carework');
    L.setItem('onboarding_seen_v1', '1');
    L.setItem('carework:onboarding_seen_v1', '1');
    L.setItem('telemetry_notice_shown', '1');
    L.setItem('ui_mode', 'study');
    L.setItem('pro_entitled', '1');
    L.setItem('pro_expires_at', new Date(Date.now() + 30 * 86400000).toISOString());
    const d = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    L.setItem('exam_date', d);
    ${extra}
})()`;
const SEED = seedScript();

/** 설정 패널 → 계정 모달 — DOM click으로 data-click 위임 발동.
 *  (패널 자동닫힘·가시성 경합을 우회 — document 위임 핸들러는 숨은 요소에도 동작) */
async function openAuthModal(page) {
    await page.evaluate(() =>
        document.querySelector('#settings-panel [data-click="openAuthModal"]')?.click());
    await expect(page.locator('#auth-modal')).not.toHaveClass(/is-hidden/, { timeout: 10_000 });
}

async function signIn(page, email) {
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-password').fill(PASSWORD);
    await page.locator('#auth-modal [data-click="authSignIn"]').click();
    // 성공 시에만 모달이 닫힌다 (실패는 #auth-modal-msg에 오류 표시)
    await expect(page.locator('#auth-modal')).toHaveClass(/is-hidden/, { timeout: 20_000 });
}

/** service role로 sync_snapshots 행 조회 — 스펙의 DB측 단언 (가이드 §7-4) */
async function fetchSnapshot(userId) {
    const res = await fetch(
        `${TEST_URL}/rest/v1/sync_snapshots?user_id=eq.${userId}&exam_id=eq.carework&select=payload,updated_at,device_id`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) throw new Error(`sync_snapshots 조회 실패: HTTP ${res.status} ${await res.text()}`);
    return (await res.json())[0] || null;
}

/** supabase-js가 localStorage에 보관한 세션에서 user id 추출 */
function sessionUserId(page) {
    return page.evaluate((key) => {
        try { return JSON.parse(localStorage.getItem(key) || 'null')?.user?.id || null; }
        catch { return null; }
    }, `sb-${REF}-auth-token`);
}

test.describe('J-102 인증·동기화 (Supabase 테스트 프로젝트)', () => {
    // SW가 supabase-config.js를 precache해 page.route 오버라이드를 우회하는 경합 차단
    // (오프라인 동작은 j-*-pwa 계열 spec이 별도 커버)
    test.use({ serviceWorkers: 'block' });
    test.beforeEach(async ({ page }) => {
        requireSupabaseOverride(test);
        test.skip(!SERVICE_KEY || !PASSWORD,
            'TEST_SUPABASE_SERVICE_ROLE_KEY·TEST_E2E_PASSWORD 미설정 — DB 단언 불가로 스킵');
        test.setTimeout(120_000);
        await installSupabaseOverride(page);
    });

    test('e2e-new: 첫 로그인 → 학습 쓰기 → 첫 push → 로그아웃 → 재로그인 @p1', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        // 로그인 — 테스트 프로젝트로 오버라이드됐는지 세션 키로도 확인
        await openAuthModal(page);
        await signIn(page, 'e2e-new@passok.test');
        const uid = await sessionUserId(page);
        expect(uid).toBeTruthy();

        // 재실행 시 이전 push의 원격 행과 충돌할 수 있다 — 원격 적용으로 진행
        // (같은 계정의 자기 데이터라 무해, 적용 시 자동 리로드)
        const overlay = page.locator('#app-confirm-overlay');
        if (await overlay.waitFor({ state: 'visible', timeout: 6_000 }).then(() => true).catch(() => false)) {
            await overlay.locator('.app-confirm-ok').click();
            await page.waitForTimeout(1_500);
            await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        }

        // 계정 화면 — 로그인 계정 표시 + 클라우드 행 없음 안내
        await openAuthModal(page);
        await expect(page.locator('#auth-account-email')).toHaveText('e2e-new@passok.test', { timeout: 15_000 });

        // 학습 쓰기 — 플래시카드 평가 1회로 SYNC_STATIC 키 기록 → dirty → 디바운스 push
        const closeBtn = page.locator('#auth-modal .auth-modal-close');
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
        // 해시 직행 — data-needs 내비 게이트는 표시 문제일 뿐 뷰 자체는 접근 가능
        await page.goto('/index.html#/cards');
        await expect(page.locator('#fc-subject-select')).toBeVisible({ timeout: 15_000 });
        await page.locator('#fc-subject-select').selectOption('caretheory');
        await expect(page.locator('#card-front-term')).not.toHaveText('개념 용어', { timeout: 15_000 });
        await page.locator('#fc-good-btn').click();

        // 첫 push — fc 쓰기가 payload에 실릴 때까지 폴링
        // (로그인 직후 부트스트랩 dirty로 먼저 push된 행이 있을 수 있어 행 존재만으론 부족)
        const deadline = Date.now() + 20_000;
        let row = null;
        while (Date.now() < deadline) {
            row = await fetchSnapshot(uid).catch(() => null);
            if (row && Object.keys(row.payload || {}).some((k) => k.startsWith('fc_'))) break;
            await new Promise((r) => setTimeout(r, 1_000));
        }
        expect(row).toBeTruthy();
        expect(Object.keys(row.payload).some((k) => k.startsWith('fc_'))).toBe(true);
        // payload 키는 비스코프 논리 키 — 'carework:' 접두사가 없어야 pull 시 적용된다
        expect(Object.keys(row.payload).some((k) => k.startsWith('carework:'))).toBe(false);

        // 로그아웃 — 로컬 데이터는 유지
        await openAuthModal(page);
        await page.locator('#auth-modal [data-click="authSignOut"]').click();
        await expect(page.locator('#auth-modal')).toHaveClass(/is-hidden/, { timeout: 10_000 });

        // 재로그인 — 자기 행이 로컬과 동일 시각이라 uptodate 분기 (충돌 모달 없음)
        await openAuthModal(page);
        await signIn(page, 'e2e-new@passok.test');
        await openAuthModal(page);
        await expect(page.locator('#auth-account-email')).toHaveText('e2e-new@passok.test', { timeout: 15_000 });
        await expect(page.locator('#auth-sync-status')).toContainText('동기화', { timeout: 15_000 });

        expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
    });

    test('e2e-active: 재로그인 → 클라우드 진도 복원 (pull → apply → reload) @p1', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        await page.addInitScript(SEED);
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        await openAuthModal(page);
        await signIn(page, 'e2e-active@passok.test');
        const uid = await sessionUserId(page);
        expect(uid).toBeTruthy();

        // 부트스트랩 쓰기로 dirty가 섰으면 충돌 모달이 뜬다 — 원격 적용(확인)을 선택
        const overlay = page.locator('#app-confirm-overlay');
        if (await overlay.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) {
            await overlay.locator('.app-confirm-ok').click();
        }

        // 클라우드 복원 — 시드 payload(sim score 52·seeded 마커)가 로컬 스코프 키로 적용된다
        await page.waitForFunction(
            () => (localStorage.getItem('carework:sim_results_history') || '').includes('"seeded":true'),
            null, { timeout: 15_000 },
        );

        // 적용 후 자동 새로고침 — 복원 데이터가 재부팅에도 유지된다
        await page.waitForTimeout(1_500);
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        const restored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('carework:sim_results_history') || '[]'));
        expect(restored.some((r) => r.score === 52 && r.seeded === true)).toBe(true);

        // 클라우드 행 식별 — 'active' 마커 시드가 그대로인지 (덮어쓰기 오염 없음)
        const row = await fetchSnapshot(uid);
        expect(row?.payload?.e2e_seed_marker).toBe('active');

        expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
    });

    test('e2e-sync: 로컬 최신 충돌 — 로컬 유지 선택 시 push가 이기고 원격은 백업 보존 @p1', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));

        // 로컬 미동기화 변경 시드 — 원격(어제)보다 최신이라고 주장할 로컬 진도 + dirty 플래그
        await page.addInitScript(seedScript(`
            localStorage.setItem('carework:sim_results_history', JSON.stringify([
                { examId: 'integrated', score: 77, total: 80, rate: 96, side: 'local-side' },
            ]));
            localStorage.setItem('carework:sync_dirty', '1');
        `));
        await page.goto('/index.html#/dashboard');
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });

        await openAuthModal(page);
        await signIn(page, 'e2e-sync@passok.test');
        const uid = await sessionUserId(page);
        expect(uid).toBeTruthy();

        // 원격이 더 최신으로 보이나 로컬 dirty — 충돌 모달 노출
        const overlay = page.locator('#app-confirm-overlay');
        await expect(overlay).toBeVisible({ timeout: 15_000 });
        await expect(overlay).toContainText('동기화 충돌');

        // 로컬 유지(취소) — 원격 스냅샷은 백업으로 보존되고 로컬이 push된다
        await overlay.locator('.app-confirm-cancel').click();

        const deadline = Date.now() + 20_000;
        let row = null;
        while (Date.now() < deadline) {
            row = await fetchSnapshot(uid).catch(() => null);
            if (row?.payload?.sim_results_history?.includes('local-side')) break;
            await new Promise((r) => setTimeout(r, 1_000));
        }
        expect(row?.payload?.sim_results_history).toContain('local-side');

        // 미선택 쪽(원격) 보존 — 충돌 백업에 원격 페이로드가 남는다.
        // (내용은 프로젝트 실행 순서에 따라 달라진다 — 앞 프로젝트의 push가 행을 덮어쓰므로
        //  첫 프로젝트는 cloud-side, 이후는 local-side — 식별자가 아닌 '보존' 자체를 단언)
        const backup = await page.evaluate(() => localStorage.getItem('carework:sync_conflict_backup') || '');
        expect(backup).toContain('"source":"remote"');
        expect(backup).toContain('sim_results_history');

        expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
    });
});
