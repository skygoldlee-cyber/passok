#!/usr/bin/env node
// @spec AD-09 (Pro 현황 리포트)
/**
 * pro_report.js — Pro 현황 리포트 (AD-09)
 *
 * 기간권 사업의 핵심 지표를 service role로 집계한다:
 *   ① pro_codes — 채널(코드 프리픽스)·티어(valid_days)별 발급/사용률·미사용 재고
 *      (발급 대장은 외부 Sheets — 코드 테이블 쪽 뷰가 대사 근거)
 *   ② profiles.pro_expires_at 만료 버킷 — D-7 임박(연장 제안 대상)·
 *      만료 미갱신(이탈)·활성·무기한(관리자 부여) — PAY-06/PAY-07 운영 지표
 *   ③ auth.users app_metadata.providers — 가입 수단별 계정 분포
 *      (수단별 별도 계정 문의 빈도 가늠 — AU-09 경고 문구 실효성 확인용)
 *
 * 사전 조건: SUPABASE_SECRET_KEY env (Secret = 구 service_role — RLS 우회 관리자 키)
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; npm.cmd run report:pro
 */
'use strict';
const { requireSecret, restGetAll, listAllUsers } = require('../lib/supabase_ops.js');

const DAY_MS = 86_400_000;

/** 코드 프리픽스 → 채널 (`TEST-7P6Z-RX5F` → `TEST`, 하이픈 없으면 기타) */
function channelOf(code) {
    const m = String(code || '').match(/^([A-Za-z0-9]+)-/);
    return m ? m[1].toUpperCase() : '(기타)';
}

/**
 * 조회 결과 → Pro 현황 구조 (순수 함수 — 네트워크 무관)
 * @param {{codes:Array, profiles:Array, users:Array, now?:Date}} in_
 */
function summarize({ codes, profiles, users, now }) {
    const t = now || new Date();
    const byChannel = {};
    const byDays = {};
    let used = 0;
    for (const c of codes || []) {
        const ch = channelOf(c.code);
        const d = String(c.valid_days ?? '?');
        for (const bucket of [byChannel, byDays]) {
            const key = bucket === byChannel ? ch : d;
            bucket[key] = bucket[key] || { issued: 0, used: 0 };
            bucket[key].issued++;
            if (c.redeemed_by) bucket[key].used++;
        }
        if (c.redeemed_by) used++;
    }

    const expiry = { lifetime: 0, expiring7: 0, active: 0, expired: 0, free: 0 };
    for (const p of profiles || []) {
        if (p.plan === 'pro' && !p.pro_expires_at) { expiry.lifetime++; continue; }
        // pro_expires_at 툼스톤이 있으면 plan과 무관하게 기간권 이력 보유 —
        // 만료 후 free 복귀(PAY-07)도 '만료 미갱신' 이탈 코호트로 집계
        if (!p.pro_expires_at) { expiry.free++; continue; }
        const daysLeft = (new Date(p.pro_expires_at) - t) / DAY_MS;
        if (daysLeft < 0) expiry.expired++;
        else if (daysLeft <= 7) expiry.expiring7++;
        else expiry.active++;
    }

    const providers = {};
    for (const u of users || []) {
        const ps = (u.app_metadata && u.app_metadata.providers) || ['(unknown)'];
        for (const p of ps) providers[p] = (providers[p] || 0) + 1;
    }

    return {
        codes: { total: (codes || []).length, used, unused: (codes || []).length - used, byChannel, byDays },
        expiry,
        providers,
        totalUsers: (users || []).length,
    };
}

// ── CLI ─────────────────────────────────────────────────────

function fmtRate(used, issued) {
    return issued ? `${used}/${issued} (${(used / issued * 100).toFixed(0)}%)` : '0/0';
}

async function main() {
    const secret = requireSecret('tools/check/pro_report.js');
    if (!secret) process.exit(2);

    const [codes, profiles, users] = await Promise.all([
        restGetAll(secret, 'pro_codes',
            'select=code,valid_days,redeemed_by,redeemed_at,created_at&order=created_at.desc'),
        restGetAll(secret, 'profiles', 'select=plan,pro_expires_at'),
        listAllUsers(secret),
    ]);
    const s = summarize({ codes, profiles, users });

    console.log('── 라이선스 코드 ──');
    console.log(`  발급 ${s.codes.total} · 사용 ${s.codes.used} · 미사용 ${s.codes.unused}`);
    if (Object.keys(s.codes.byChannel).length) {
        console.log('  채널별 (사용/발급):');
        for (const [ch, b] of Object.entries(s.codes.byChannel).sort()) {
            console.log(`    ${ch.padEnd(10)} ${fmtRate(b.used, b.issued)}`);
        }
    }
    if (Object.keys(s.codes.byDays).length) {
        console.log('  티어별 (사용/발급):');
        for (const [d, b] of Object.entries(s.codes.byDays).sort()) {
            console.log(`    ${(d + '일').padEnd(10)} ${fmtRate(b.used, b.issued)}`);
        }
    }

    console.log('\n── Pro 만료 버킷 (profiles) ──');
    console.log(`  활성(D-8 이상): ${s.expiry.active}`);
    console.log(`  임박(D-7 이내): ${s.expiry.expiring7}   ← 연장 제안 대상`);
    console.log(`  만료 미갱신:     ${s.expiry.expired}   ← 이탈 추적`);
    console.log(`  무기한(수동):    ${s.expiry.lifetime}`);
    console.log(`  free:           ${s.expiry.free}`);

    console.log('\n── 가입 수단 분포 (auth.users) ──');
    for (const [p, n] of Object.entries(s.providers).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${p.padEnd(12)} ${n}`);
    }
    console.log(`  합계           ${s.totalUsers}`);
}

if (require.main === module) {
    main().catch((e) => { console.error(`조회 실패: ${e.message}`); process.exit(1); });
}

module.exports = { summarize, channelOf };
