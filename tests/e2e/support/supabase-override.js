// tests/e2e/support/supabase-override.js — Supabase 오버라이드 (DSN-46 §3-1-1)
// @spec none
// src/auth-sync/supabase-config.js는 운영 프로젝트 상수를 하드코딩한다 — 인증·동기화
// 스펙이 오버라이드 없이 실행되면 운영 DB에 쓴다. TEST_* env가 있을 때만 모듈 응답을 치환.

export const SUPABASE_OVERRIDE_AVAILABLE =
    !!process.env.TEST_SUPABASE_URL && !!process.env.TEST_SUPABASE_ANON_KEY;

/** page.route로 supabase-config.js 모듈 응답을 테스트 프로젝트 상수로 치환. @returns {Promise<boolean>} 적용 여부 */
export async function installSupabaseOverride(page) {
    if (!SUPABASE_OVERRIDE_AVAILABLE) return false;
    const url = process.env.TEST_SUPABASE_URL;
    const key = process.env.TEST_SUPABASE_ANON_KEY;
    await page.route('**/supabase-config.js', (route) => route.fulfill({
        contentType: 'application/javascript',
        body: [
            `export const SUPABASE_URL = ${JSON.stringify(url)};`,
            `export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(key)};`,
            'export function isSupabaseConfigured() { return true; }',
            '',
        ].join('\n'),
    }));
    return true;
}

/** 인증 시나리오 가드 — 오버라이드 불가 환경이면 스킵 (운영 DB 오염 차단) */
export function requireSupabaseOverride(test) {
    test.skip(
        !SUPABASE_OVERRIDE_AVAILABLE,
        'TEST_SUPABASE_URL/ANON_KEY 미설정 — 운영 Supabase 오염 방지로 스킵 (DSN-46 §3-1-1)',
    );
}
