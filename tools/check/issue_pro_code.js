#!/usr/bin/env node
/**
 * issue_pro_code.js — 라이선스 코드 발급 CLI (PAYMENT_PILOT_DESIGN §3, P-OPS-1)
 * @spec PAY-05
 *
 * 수동 결제 확인 후 구매자에게 발급할 1회용 Pro 활성화 코드를 pro_codes에 삽입한다.
 * 코드 형식: `<CHANNEL>-<4>-<4>` (채널 프리픽스로 유입 채널별 전환 추적 — DOC-DSN-35 §3).
 *
 * 사전 조건: SUPABASE_SECRET_KEY env (Secret = 구 service_role — RLS 우회 관리자 키)
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; npm.cmd run admin:issue-code -- --channel cafe --count 5
 *   npm.cmd run admin:issue-code -- --channel cafe --count 3 --dry-run   # 삽입 없이 미리보기
 *
 * 발급 대장은 콘솔 출력을 캡처해 보관 — 입금자명↔코드 매칭은 운영자 수동 기록.
 */
'use strict';
const crypto = require('crypto');
const { loadEnv } = require('../lib/env');
const { requireSecret, restPost } = require('../lib/supabase_ops.js');

const CODE_BODY = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 혼동 문자 제외 (0/O·1/I/L)

/** 채널 프리픽스 정규화 — 소문자·영숫자만 허용, 없으면 MISC */
function normalizeChannel(raw) {
    const c = String(raw || 'misc').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return (c || 'misc').toUpperCase();
}

/** 단일 코드 생성 — `<CH>-<4자>-<4자>` */
function genCode(channel) {
    const seg = () => Array.from({ length: 4 }, () => CODE_BODY[crypto.randomInt(CODE_BODY.length)]).join('');
    return `${channel}-${seg()}-${seg()}`;
}

async function main() {
    loadEnv();
    const args = process.argv.slice(2);
    const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
    const channel = normalizeChannel(get('--channel'));
    const count = Math.min(Math.max(parseInt(get('--count') || '1', 10) || 1, 1), 100);
    const dryRun = args.includes('--dry-run');

    if (!args.length || args.includes('--help')) {
        console.log('사용법: npm.cmd run admin:issue-code -- --channel <채널> [--count N] [--dry-run]');
        console.log('  채널: 유입 출처 프리픽스 (cafe·open·direct 등 — pro_codes 추적용)');
        process.exit(0);
    }

    const codes = Array.from({ length: count }, () => genCode(channel));
    console.log(`▶ 발급 예정: 채널 ${channel} × ${count}건`);
    for (const c of codes) console.log(`  ${c}`);

    if (dryRun) {
        console.log('⊘ --dry-run — 삽입하지 않았습니다.');
        return;
    }

    const secret = requireSecret('tools/check/issue_pro_code.js');
    const rows = codes.map((code) => ({ code }));
    await restPost(secret, 'pro_codes', rows);
    console.log(`\n✓ ${rows.length}건 발급 완료 — pro_codes에 등록됨 (미사용 상태)`);
    console.log('  발급 대장: 위 코드 목록을 입금자 식별과 함께 기록하세요.');
    console.log('  발송 안내: 구매자에게 "로그인 → 설정 → 라이선스 코드 입력" 경로를 안내합니다.');
}

if (require.main === module) {
    main().catch((e) => { console.error(`발급 실패: ${e.message}`); process.exit(1); });
}

module.exports = { normalizeChannel, genCode, CODE_BODY };
