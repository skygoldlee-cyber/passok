#!/usr/bin/env node
/**
 * register_admin_bot.js — Discord 슬래시 명령 일괄 등록 (AD-11)
 * @spec AD-11
 *
 * admin-bot Edge Function이 처리하는 명령을 Discord 글로벌 커맨드로 등록한다.
 * 명령 정의는 이 파일과 index.ts의 switch 분기가 1:1 대응해야 한다.
 *
 * 필요 env (.env 또는 쉘):
 *   DISCORD_APP_ID    — Discord Developer Portal → Application ID
 *   DISCORD_BOT_TOKEN — 같은 앱의 Bot 토큰
 *
 * 사용: node tools/deploy/register_admin_bot.js [--list]
 *   기본: 아래 COMMANDS를 글로벌 명령으로 일괄 덮어쓰기 (PUT bulk)
 *   --list: 현재 등록된 명령만 조회
 *
 * 셋업 전체 절차: docs/dev/runbooks/DISCORD_ADMIN.md
 */
'use strict';
const { loadEnv } = require('../lib/env.js');

// index.ts의 switch 분기와 1:1 대응 — 명령 추가·변경 시 양쪽을 함께 수정
const COMMANDS = [
    { name: 'status', description: '서비스 현황 — 사용자·Pro·피드백·오류 요약' },
    {
        name: 'user', description: '사용자 조회 — plan·만료·사용 코드·동기화 메타',
        options: [{ name: 'email', description: '사용자 이메일', type: 3, required: true }],
    },
    { name: 'pro', description: 'Pro 현황 — 코드 재고·만료 버킷' },
    {
        name: 'errors', description: '오류 집계 — 최근 N일 상위 메시지',
        options: [{ name: 'days', description: '조회 일수 (기본 7, 최대 90)', type: 4, required: false }],
    },
    {
        name: 'feedback', description: '피드백 인박스 — 최근 N일 최신 10건',
        options: [{ name: 'days', description: '조회 일수 (기본 7, 최대 90)', type: 4, required: false }],
    },
];

async function discordApi(appId, token, method, path, body) {
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}${path}`, {
        method,
        headers: { authorization: `Bot ${token}`, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Discord API ${method} ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.status === 204 ? null : res.json();
}

async function main() {
    loadEnv();
    const appId = process.env.DISCORD_APP_ID;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!appId || !token) {
        console.error('DISCORD_APP_ID·DISCORD_BOT_TOKEN 미설정 — .env에 추가하세요 (runbook: docs/dev/runbooks/DISCORD_ADMIN.md)');
        process.exit(1);
    }

    if (process.argv.includes('--list')) {
        const cur = await discordApi(appId, token, 'GET', '/commands');
        for (const c of cur) console.log(`${c.id}  /${c.name} — ${c.description}`);
        if (!cur.length) console.log('(등록된 명령 없음)');
        return;
    }

    const res = await discordApi(appId, token, 'PUT', '/commands', COMMANDS);
    console.log(`✅ 글로벌 명령 ${res.length}개 등록:`);
    for (const c of res) console.log(`  /${c.name} — ${c.description}`);
    console.log('\n전파까지 최대 1시간 소요될 수 있습니다 — 서버 길드 명령은 즉시 반영되려면 guilds/<id>/commands 경로 사용.');
}

if (require.main === module) {
    main().catch((e) => { console.error(`❌ ${e.message}`); process.exit(1); });
}

module.exports = { COMMANDS };
