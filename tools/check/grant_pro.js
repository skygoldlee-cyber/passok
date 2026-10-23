#!/usr/bin/env node
/**
 * grant_pro.js — Pro 플랜 부여·회수 (ADMIN_DESIGN.md §5 Phase 1)
 * @spec AD-06 (관리자 운영 CLI)
 *
 * 이메일 → auth.users 해석 → profiles.plan을 갱신한다.
 * Phase 1은 스키마 변경 없이 동작 — admin_set_plan RPC·admin_audit는 AD-04에서
 * 도입될 때까지 이 스크립트의 출력이 감사 기록을 대신한다 (CI 로그·터미널 출력을
 * 운영자가 보존하는 운영 절차로 보완).
 *
 * 기본은 dry-run 미리보기 — 실제 갱신은 --apply 플래그로만 수행한다.
 *
 * 사전 조건: SUPABASE_SECRET_KEY env (Secret = 구 service_role — RLS 우회 관리자 키)
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; npm.cmd run admin:grant-pro -- user@example.com
 *   npm.cmd run admin:grant-pro -- user@example.com --apply      # 실제 부여
 *   npm.cmd run admin:grant-pro -- user@example.com --revoke --apply  # 회수(free)
 */
'use strict';
const { requireSecret, restGet, restPatch, findUserByEmail } = require('../lib/supabase_ops.js');

// ── 순수 로직 (테스트 대상) ──────────────────────────────────

/**
 * 플랜 변경 PATCH body (순수 함수)
 * @param {boolean} revoke true면 free로 회수, false면 pro 부여
 * @param {number|null} [days] 기간권 일수 — 지정 시 pro_expires_at=now+days, 미지정 시 null(무기한 부여)
 * @returns {{plan:string, pro_since:string|null, pro_expires_at:string|null}}
 */
function buildPlanChange(revoke, days) {
    if (revoke) return { plan: 'free', pro_since: null, pro_expires_at: null };
    const n = parseInt(days, 10);
    const expires = Number.isFinite(n) && n > 0
        ? new Date(Date.now() + n * 86400000).toISOString()
        : null;
    return { plan: 'pro', pro_since: new Date().toISOString(), pro_expires_at: expires };
}

/**
 * 이미 목표 상태인지 판정 — 동일 상태 재적용은 쓰기·감사 기록을 생략한다
 * @param {string} currentPlan 현재 profiles.plan
 * @param {boolean} revoke 회수 여부
 * @returns {boolean} 변경 불필요 여부
 */
function isNoop(currentPlan, revoke) {
    return currentPlan === (revoke ? 'free' : 'pro');
}

// ── CLI ─────────────────────────────────────────────────────

async function main(argv) {
    const args = argv || process.argv.slice(2);
    const email = args.find((a) => !a.startsWith('--'));
    const revoke = args.includes('--revoke');
    const apply = args.includes('--apply');
    const daysIdx = args.indexOf('--days');
    const days = daysIdx >= 0 ? parseInt(args[daysIdx + 1], 10) : null;
    if (!email) {
        console.error('사용법: npm run admin:grant-pro -- <email> [--revoke] [--days N] [--apply]');
        console.error('  --days N: 기간권 부여(만료일 설정) — 미지정 시 무기한 부여');
        console.error('  --apply 없이는 dry-run 미리보기만 출력합니다.');
        process.exit(2);
    }

    const secret = requireSecret('tools/check/grant_pro.js');
    if (!secret) process.exit(2);

    const user = await findUserByEmail(secret, email);
    if (!user) {
        console.error(`사용자 없음: ${email}`);
        process.exit(1);
    }
    const profiles = await restGet(secret, 'profiles', `select=id,plan,pro_since&id=eq.${user.id}`);
    const profile = profiles[0] || null;
    const current = (profile && profile.plan) || 'free';
    const target = revoke ? 'free' : 'pro';

    console.log(`대상: ${email} (${user.id})`);
    console.log(`  현재 플랜: ${current}` + (profile && profile.pro_since ? ` · pro_since ${profile.pro_since}` : ''));
    console.log(`  변경 후:   ${target}` + (!revoke && days > 0 ? ` · 만료일 ${new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)} (${days}일권)` : ''));

    if (isNoop(current, revoke)) {
        console.log('\n이미 목표 상태입니다 — 변경 없음.');
        return;
    }
    if (!apply) {
        console.log('\n(dry-run) 실제 갱신하려면 --apply를 추가하세요.');
        return;
    }

    const updated = await restPatch(secret, 'profiles', `id=eq.${user.id}`, buildPlanChange(revoke, days));
    const row = updated[0];
    console.log(`\n✓ 갱신 완료: plan=${row.plan}` + (row.pro_since ? ` · pro_since=${row.pro_since}` : '') + (row.pro_expires_at ? ` · pro_expires_at=${row.pro_expires_at}` : ''));
    console.log('  ※ admin_audit 테이블은 AD-04에서 도입 — 이 출력을 운영 기록으로 보존하세요.');
}

if (require.main === module) {
    main().catch((e) => { console.error(`갱신 실패: ${e.message}`); process.exit(1); });
}

module.exports = { buildPlanChange, isNoop };
