#!/usr/bin/env node
/**
 * user_report.js — 사용자 조회 리포트 (ADMIN_DESIGN.md §5 Phase 1)
 * @spec AD-06, AD-08 (관리자 운영 CLI — 사용자 Pro 만료·코드 이력 조회)
 *
 * 이메일 → auth.users(GoTrue Admin API) 해석 후 profiles·sync_snapshots 메타·
 * 본인 feedback 이력을 조회한다. sync_snapshots.payload(사용자 진도 JSON)는
 * 의도적으로 select하지 않는다 — 운영 조회는 메타데이터까지만 (ADMIN_DESIGN §6).
 *
 * 사전 조건: SUPABASE_SECRET_KEY env (Secret = 구 service_role — RLS 우회 관리자 키)
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; npm.cmd run report:user -- user@example.com
 */
'use strict';
const { requireSecret, restGet, findUserByEmail } = require('../lib/supabase_ops.js');

// ── 순수 집계 (테스트 대상) ──────────────────────────────────

/**
 * 조회 결과 → 사용자 요약 구조 (순수 함수 — 네트워크 무관)
 * @param {{user:object, profile:object|null, snapshots:Array, feedback:Array, codes?:Array, now?:Date}} in_
 * @returns {object} 출력용 정규화 데이터
 */
function buildUserSummary({ user, profile, snapshots, feedback, codes, now }) {
    const expiresAt = (profile && profile.pro_expires_at) || null;
    // 기간권 잔여일 — 만료 시각 - 기준 시각. 무기한(null)·free는 null 유지 (AD-08)
    let proDaysLeft = null;
    if (expiresAt) {
        proDaysLeft = Math.ceil((new Date(expiresAt) - (now || new Date())) / 86_400_000);
    }
    return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        providers: (user.app_metadata && user.app_metadata.providers) || [],
        plan: (profile && profile.plan) || 'free',
        pro_since: (profile && profile.pro_since) || null,
        pro_expires_at: expiresAt,
        pro_days_left: proDaysLeft,
        profile_created_at: (profile && profile.created_at) || null,
        codes: (codes || []).map((c) => ({
            code: c.code, valid_days: c.valid_days, redeemed_at: c.redeemed_at,
        })),
        snapshots: (snapshots || []).map((s) => ({
            exam_id: s.exam_id, device_id: s.device_id, updated_at: s.updated_at,
        })),
        feedback: (feedback || []).map((f) => ({
            created_at: f.created_at, kind: f.kind, rating: f.rating,
            body: String(f.body || '').slice(0, 120),
        })),
    };
}

// ── CLI ─────────────────────────────────────────────────────

const FALLBACK_SQL = `\
-- 이메일 → 사용자 조회는 auth.users가 필요하므로 SQL 에디터 폴백은 없습니다.
-- 대시보드 → Authentication → Users에서 이메일 검색 후 아래 쿼리:
--   select * from profiles where id = '<uuid>';
--   select exam_id, device_id, updated_at from sync_snapshots where user_id = '<uuid>';
--   select created_at, kind, rating, left(body,120) from feedback where user_id = '<uuid>';`;

async function main(argv) {
    const args = argv || process.argv.slice(2);
    const email = args.find((a) => !a.startsWith('--'));
    if (!email) {
        console.error('사용법: npm run report:user -- <email>');
        process.exit(2);
    }

    const secret = requireSecret('tools/check/user_report.js');
    if (!secret) {
        console.error('\n' + FALLBACK_SQL);
        process.exit(2);
    }

    const user = await findUserByEmail(secret, email);
    if (!user) {
        console.error(`사용자 없음: ${email}`);
        process.exit(1);
    }

    const [profiles, snapshots, feedback, codes] = await Promise.all([
        restGet(secret, 'profiles', `select=*&id=eq.${user.id}`),
        // payload는 조회하지 않음 — 메타데이터만 (ADMIN_DESIGN §6 데이터 최소화)
        restGet(secret, 'sync_snapshots',
            `select=exam_id,device_id,updated_at&user_id=eq.${user.id}&order=updated_at.desc`),
        restGet(secret, 'feedback',
            `select=created_at,kind,rating,body&user_id=eq.${user.id}&order=created_at.desc&limit=20`),
        restGet(secret, 'pro_codes',
            `select=code,valid_days,redeemed_at&redeemed_by=eq.${user.id}&order=redeemed_at.desc`),
    ]);
    const u = buildUserSummary({
        user, profile: profiles[0] || null, snapshots, feedback, codes,
    });

    console.log(`사용자: ${u.email}`);
    console.log(`  id: ${u.id}`);
    console.log(`  가입: ${u.created_at}` + (u.last_sign_in_at ? ` · 최근 로그인: ${u.last_sign_in_at}` : ''));
    if (u.providers.length) console.log(`  로그인 경로: ${u.providers.join(', ')}`);
    console.log(`  플랜: ${u.plan}` + (u.pro_since ? ` (pro_since ${u.pro_since})` : ''));
    if (u.plan === 'pro') {
        if (u.pro_expires_at === null) {
            console.log('  만료: 무기한 (관리자 수동 부여)');
        } else {
            const d = u.pro_days_left;
            console.log(`  만료: ${u.pro_expires_at}` + (d < 0 ? ` (D${d} — 만료됨)` : ` (D-${d} 잔여)`));
        }
    }
    if (u.codes.length) {
        console.log(`\n── 사용 코드 (${u.codes.length}건) ──`);
        for (const c of u.codes) {
            console.log(`  ${c.code} · ${c.valid_days}일권 · 사용 ${c.redeemed_at}`);
        }
    }

    if (u.snapshots.length) {
        console.log('\n── 동기화 스냅샷 (payload 미열람) ──');
        for (const s of u.snapshots) {
            console.log(`  ${s.exam_id} · ${s.device_id} · ${s.updated_at}`);
        }
    } else {
        console.log('\n── 동기화 스냅샷 없음 (클라우드 동기화 미사용) ──');
    }

    if (u.feedback.length) {
        console.log(`\n── 피드백 이력 (${u.feedback.length}건) ──`);
        for (const f of u.feedback) {
            console.log(`  ${f.created_at} [${f.kind}${f.rating ? ` ★${f.rating}` : ''}] ${f.body}`);
        }
    }
}

if (require.main === module) {
    main().catch((e) => { console.error(`조회 실패: ${e.message}`); process.exit(1); });
}

module.exports = { buildUserSummary };
