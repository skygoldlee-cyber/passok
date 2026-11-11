// tests/e2e/support/facility-setup.js — 기관 워크스페이스 E2E 공용 (DSN-46 §3-2, J-520~522)
// @spec none
// 격리 설계 — 멤버십은 계정당 유일 의미를 가지므로 공유 계정은 CI 병렬 잡(chromium·mobile·
// tablet 샤드) 간 경합한다: 한 잡의 기관 삭제가 다른 잡의 멤버십을 cascade 정리하고,
// 멤버십 시드가 J-520의 '미가입' 전제를 깬다. 각 테스트는 service role admin API로
// 고유 admin·member 사용자를 생성( beforeEach )·폐기( afterEach )해 완전 격리한다.
// J-521/522는 멤버십이 전제 조건이므로 facility+멤버 2행을 REST로 시드하고 UI는 도메인
// 동작만 검증한다. 멀티 사용자는 browser.newContext(contextOptions)로 세션을 분리.
import { expect } from '@playwright/test';
import { installSupabaseOverride } from './supabase-override.js';
import { examSeed } from './exam-matrix.js';

const TEST_URL = (process.env.TEST_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';
const PASSWORD = process.env.TEST_E2E_PASSWORD || '';

/** 키 미설정 시 스펙 전체 스킵 */
export function requireFacilityEnv(t) {
    t.skip(!SERVICE_KEY || !PASSWORD,
        'TEST_SUPABASE_SERVICE_ROLE_KEY·TEST_E2E_PASSWORD 미설정 — 기관 스펙 스킵');
}

const hdrs = () => ({
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
});

/** 테스트 전용 고유 admin·member 사용자 생성 — 병렬 잡 간 멤버십 경합 차단 */
export async function createFacilityUsers() {
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const mk = async (role) => {
        const email = `e2e-fac-${role}-${stamp}@passok.test`;
        const res = await fetch(`${TEST_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: hdrs(),
            body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
        });
        if (!res.ok) throw new Error(`사용자 생성(${role}) → HTTP ${res.status}: ${await res.text()}`);
        return { id: (await res.json()).id, email };
    };
    return { admin: await mk('admin'), member: await mk('member') };
}

/** 테스트 사용자 폐기 — 소유 기관 먼저 삭제(FK cascade로 행 정리) 후 auth 사용자 삭제 (best-effort) */
export async function deleteFacilityUsers(users) {
    for (const u of [users?.admin, users?.member]) {
        if (!u?.id) continue;
        await fetch(`${TEST_URL}/rest/v1/facilities?created_by=eq.${u.id}`,
            { method: 'DELETE', headers: hdrs() }).catch(() => {});
        await fetch(`${TEST_URL}/auth/v1/admin/users/${u.id}`,
            { method: 'DELETE', headers: hdrs() }).catch(() => {});
    }
}

/** service role REST 조회 — 스펙의 DB측 단언 @returns {Promise<Array>} */
export async function restSelect(pathname) {
    const res = await fetch(`${TEST_URL}/rest/v1/${pathname}`, { headers: hdrs() });
    if (!res.ok) throw new Error(`REST ${pathname} → HTTP ${res.status}: ${await res.text()}`);
    return res.json();
}

/** 기관 + admin(manager)·member(worker) 멤버십 시드 — J-521/522 전제. @returns {Promise<{id:string,name:string}>} */
export async function seedFacilityMembership(users) {
    const stamp = Date.now().toString(36).toUpperCase().slice(-6);
    const res = await fetch(`${TEST_URL}/rest/v1/facilities`, {
        method: 'POST',
        headers: { ...hdrs(), Prefer: 'return=representation' },
        body: JSON.stringify({ name: `E2E기관 ${stamp}`, invite_code: `E2${stamp}`, created_by: users.admin.id }),
    });
    if (!res.ok) throw new Error(`기관 시드 → HTTP ${res.status}: ${await res.text()}`);
    const [fac] = await res.json();
    const mRes = await fetch(`${TEST_URL}/rest/v1/facility_members`, {
        method: 'POST',
        headers: { ...hdrs(), Prefer: 'return=minimal' },
        body: JSON.stringify([
            { facility_id: fac.id, user_id: users.admin.id, role: 'manager' },
            { facility_id: fac.id, user_id: users.member.id, role: 'worker' },
        ]),
    });
    if (!mRes.ok) throw new Error(`멤버십 시드 → HTTP ${mRes.status}: ${await mRes.text()}`);
    return fac;
}

/** Pro entitlement 시드 — cloud_sync·pro 게이트 분기 차단 (J-102와 동일 계약) */
const PRO_SEED = `(() => {
    const L = localStorage;
    L.setItem('pro_entitled', '1');
    L.setItem('pro_expires_at', new Date(Date.now() + 30 * 86400000).toISOString());
})()`;

/** 충돌 오버레이가 뜨면 '원격 적용'으로 해소 — 재실행 시 pullSync의 원격 스냅샷과 경합 가능 (J-102 패턴) */
export async function resolveConflictOverlay(page, timeoutMs = 5_000) {
    const overlay = page.locator('#app-confirm-overlay');
    if (await overlay.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false)) {
        await overlay.locator('.app-confirm-ok').click();
        await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
        return true;
    }
    return false;
}

/** 부팅 + 로그인 공통 — 오버라이드·시드·초기화·인증까지 (뷰 진입 전에 호출) */
export async function bootAndLogin(page, email) {
    await installSupabaseOverride(page);
    await page.addInitScript(examSeed('carework'));
    await page.addInitScript(PRO_SEED);
    await page.goto('/index.html#/dashboard');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 20_000 });
    // 설정 패널 → 계정 모달 — DOM click으로 data-click 위임 발동 (J-102 패턴)
    await page.evaluate(() =>
        document.querySelector('#settings-panel [data-click="openAuthModal"]')?.click());
    await expect(page.locator('#auth-modal')).not.toHaveClass(/is-hidden/, { timeout: 10_000 });
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-password').fill(PASSWORD);
    await page.locator('#auth-modal [data-click="authSignIn"]').click();
    // 성공 시에만 모달이 닫힌다 (실패는 #auth-modal-msg에 오류 표시)
    await expect(page.locator('#auth-modal')).toHaveClass(/is-hidden/, { timeout: 20_000 });
    await resolveConflictOverlay(page);
}

/** 지연 주입 뷰 진입 — pullSync 지연으로 충돌 오버레이가 뷰 렌더 뒤에 올 수 있어 재진입 루프 */
export async function enterView(page, hash, locator, { timeout = 15_000 } = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto(`/index.html#/${hash}`);
        try {
            await expect(locator).toBeVisible({ timeout });
            return;
        } catch (e) {
            if (!(await resolveConflictOverlay(page))) throw e;
        }
    }
}
