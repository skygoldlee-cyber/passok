// tests/e2e/support/facility-setup.js — 기관 워크스페이스 E2E 공용 (DSN-46 §3-2, J-520~522)
// @spec none
// 멱등 설계 — 계정이 멤버십을 보유하면 facility 뷰가 폼 대신 소속 카드를 렌더하므로,
// 스펙은 매 실행 service role REST로 시드 계정 소유 기관을 삭제(FK cascade)해 초기화한다.
// J-521/522는 멤버십이 전제 조건이므로 facility+멤버 2행을 REST로 시드하고 UI는 도메인
// 동작만 검증한다. 멀티 사용자는 browser.newContext(contextOptions)로 세션을 분리.
import { expect } from '@playwright/test';
import { installSupabaseOverride } from './supabase-override.js';
import { examSeed } from './exam-matrix.js';

const TEST_URL = (process.env.TEST_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';
const PASSWORD = process.env.TEST_E2E_PASSWORD || '';

export const FACILITY_ADMIN_EMAIL = 'e2e-facility-admin@passok.test';
export const FACILITY_MEMBER_EMAIL = 'e2e-facility-member@passok.test';

/** 시드 계정 부재·키 미설정 시 스펙 전체 스킵 — seed_test_accounts.js 선행 필요 */
export function requireFacilitySeed(t) {
    t.skip(!SERVICE_KEY || !PASSWORD,
        'TEST_SUPABASE_SERVICE_ROLE_KEY·TEST_E2E_PASSWORD 미설정 — 기관 스펙 스킵');
}

const hdrs = () => ({
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
});

let _uidCache;
/** email → auth user id 해석 (프로세스 내 캐시) @returns {Promise<{admin:string,member:string}>} */
export async function facilityUserIds() {
    if (_uidCache) return _uidCache;
    const res = await fetch(`${TEST_URL}/auth/v1/admin/users?page=1&per_page=200`, { headers: hdrs() });
    if (!res.ok) throw new Error(`admin users 조회 실패: HTTP ${res.status}`);
    const users = (await res.json()).users || [];
    const map = new Map(users.map((u) => [u.email, u.id]));
    _uidCache = { admin: map.get(FACILITY_ADMIN_EMAIL), member: map.get(FACILITY_MEMBER_EMAIL) };
    if (!_uidCache.admin || !_uidCache.member)
        throw new Error('기관 E2E 계정 미시드 — node tools/supabase/seed_test_accounts.js 실행 필요');
    return _uidCache;
}

/** service role REST 조회 — 스펙의 DB측 단언 @returns {Promise<Array>} */
export async function restSelect(pathname) {
    const res = await fetch(`${TEST_URL}/rest/v1/${pathname}`, { headers: hdrs() });
    if (!res.ok) throw new Error(`REST ${pathname} → HTTP ${res.status}: ${await res.text()}`);
    return res.json();
}

/** 시드 계정 소유 기관 전체 삭제 — facility_id FK on delete cascade로 멤버·인계·면회·사고·기록 정리 */
export async function resetFacilityState() {
    const { admin, member } = await facilityUserIds();
    const res = await fetch(
        `${TEST_URL}/rest/v1/facilities?created_by=in.(${admin},${member})`,
        { method: 'DELETE', headers: { ...hdrs(), Prefer: 'return=minimal' } },
    );
    if (!res.ok) throw new Error(`기관 정리 → HTTP ${res.status}: ${await res.text()}`);
}

/** 기관 + admin(manager)·member(worker) 멤버십 시드 — J-521/522 전제. @returns {Promise<{id:string,name:string}>} */
export async function seedFacilityMembership() {
    const { admin, member } = await facilityUserIds();
    const stamp = Date.now().toString(36).toUpperCase().slice(-6);
    const res = await fetch(`${TEST_URL}/rest/v1/facilities`, {
        method: 'POST',
        headers: { ...hdrs(), Prefer: 'return=representation' },
        body: JSON.stringify({ name: `E2E기관 ${stamp}`, invite_code: `E2${stamp}`, created_by: admin }),
    });
    if (!res.ok) throw new Error(`기관 시드 → HTTP ${res.status}: ${await res.text()}`);
    const [fac] = await res.json();
    const mRes = await fetch(`${TEST_URL}/rest/v1/facility_members`, {
        method: 'POST',
        headers: { ...hdrs(), Prefer: 'return=minimal' },
        body: JSON.stringify([
            { facility_id: fac.id, user_id: admin, role: 'manager' },
            { facility_id: fac.id, user_id: member, role: 'worker' },
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
