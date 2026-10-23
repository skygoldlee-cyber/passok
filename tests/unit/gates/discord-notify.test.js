// tests/unit/gates/discord-notify.test.js — tools/lib/discord.js 회귀 (AD-10·AD-12)
// @spec AD-10,AD-12
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import discord from '../../../tools/lib/discord.js';

const { postDiscord, eventEmbed, postAnnounce, releaseAnnounceEmbed, announceRelease } = discord;

// announce env 키를 저장→테스트 후 복원 (.env에 설정돼 있어도 격리)
// delete 대신 빈 값: loadEnv()가 .env에서 삭제된 키를 다시 채우므로
// DISCORD_ANNOUNCE* 전부를 ''로 초기화한 뒤 map을 입힌다.
function withAnnounceEnv(map, fn) {
    const keys = Object.keys(process.env).filter(k => k.startsWith('DISCORD_ANNOUNCE'));
    ['DISCORD_ANNOUNCE', 'DISCORD_ANNOUNCE_COSMETIC', 'DISCORD_ANNOUNCE_UNKNOWN'].forEach(k => { if (!keys.includes(k)) keys.push(k); });
    const saved = {};
    keys.forEach(k => { saved[k] = process.env[k]; process.env[k] = ''; });
    Object.assign(process.env, map);
    return Promise.resolve().then(fn).finally(() => {
        keys.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
    });
}

// fetch 목 — 호출 인자를 기록하고 제어 응답을 반환
function stubFetch(fn) {
    const orig = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (...a) => { calls.push(a); return fn(...a); };
    return { calls, restore: () => { globalThis.fetch = orig; } };
}

test('webhook 미설정 시 조용히 skip — 발신 없이 false 반환', async () => {
    const saved = process.env.DISCORD_WEBHOOK_URL;
    // delete 대신 빈 값: loadEnv()가 .env에서 undefined 키를 다시 채우므로
    // 실제 .env에 webhook이 설정돼 있어도 미설정 경로를 격리 검증한다.
    process.env.DISCORD_WEBHOOK_URL = '';
    const { calls, restore } = stubFetch(async () => new Response(''));
    try {
        const r = await postDiscord({ title: 't' });
        assert.equal(r.sent, false);
        assert.match(r.reason, /미설정/);
        assert.equal(calls.length, 0);       // 발신 자체를 하지 않음
    } finally {
        restore();
        if (saved === undefined) delete process.env.DISCORD_WEBHOOK_URL;
        else process.env.DISCORD_WEBHOOK_URL = saved;
    }
});

test('성공 경로 — embeds·allowed_mentions 차단 계약을 지켜 POST', async () => {
    const { calls, restore } = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        const r = await postDiscord(eventEmbed('배포 완료', true), { webhookUrl: 'https://discord.test/wh' });
        assert.equal(r.sent, true);
        assert.equal(calls.length, 1);
        const [url, init] = calls[0];
        assert.equal(url, 'https://discord.test/wh');
        const body = JSON.parse(init.body);
        assert.deepEqual(body.allowed_mentions, { parse: [] });   // 멘션 해석 비활성화
        assert.equal(body.embeds.length, 1);
        assert.equal(body.embeds[0].title, '배포 완료');
    } finally { restore(); }
});

test('eventEmbed — ok 플래그로 색상을 전환하고 timestamp를 붙인다', () => {
    const ok = eventEmbed('t', true);
    const fail = eventEmbed('t', false);
    assert.equal(ok.color, 0x22c55e);
    assert.equal(fail.color, 0xef4444);
    assert.ok(ok.timestamp);
});

test('Discord 오류 응답·네트워크 예외 — sent:false + reason 보고', async () => {
    let s = stubFetch(async () => new Response('rate limited', { status: 429 }));
    try {
        const r = await postDiscord({ title: 't' }, { webhookUrl: 'https://discord.test/wh' });
        assert.equal(r.sent, false);
        assert.equal(r.status, 429);
    } finally { s.restore(); }

    s = stubFetch(async () => { throw new Error('ECONNREFUSED'); });
    try {
        const r = await postDiscord({ title: 't' }, { webhookUrl: 'https://discord.test/wh' });
        assert.equal(r.sent, false);
        assert.match(r.reason, /ECONNREFUSED/);
    } finally { s.restore(); }
});

test('postAnnounce — 공지 env 미설정 시 발신 없이 sent 0 (AD-12)', async () => {
    const { calls, restore } = stubFetch(async () => new Response(''));
    try {
        await withAnnounceEnv({}, async () => {
            const r = await postAnnounce({ title: 't' });
            assert.equal(r.sent, 0);
            assert.equal(calls.length, 0);       // 발신 자체를 하지 않음
        });
    } finally { restore(); }
});

test('postAnnounce — 전체-공지 + 등록 시험 채널 fan-out, 미등록 suffix는 스킵+보고 (AD-12)', async () => {
    const { calls, restore } = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        await withAnnounceEnv({
            DISCORD_ANNOUNCE: 'https://discord.test/all',
            DISCORD_ANNOUNCE_COSMETIC: 'https://discord.test/cos',
            DISCORD_ANNOUNCE_UNKNOWN: 'https://discord.test/unknown',
        }, async () => {
            const r = await postAnnounce({ title: 't' });
            assert.equal(r.sent, 2);
            assert.deepEqual(r.skippedUnknown, ['DISCORD_ANNOUNCE_UNKNOWN']);
            assert.deepEqual(calls.map(c => c[0]).sort(), ['https://discord.test/all', 'https://discord.test/cos']);
            const body = JSON.parse(calls[0][1].body);
            assert.deepEqual(body.allowed_mentions, { parse: [] });
        });
    } finally { restore(); }
});

test('releaseAnnounceEmbed — 분류 접두·내부 릴리스 메타 행 제외 (AD-12)', () => {
    const e = releaseAnnounceEmbed('v20261024-abc1234', [
        '[기능·community] Discord 커뮤니티 공지 발송',
        '[정리·release] v20261024-abc1234 스탬프 확정 [no-docs]',
    ], 'https://app.test');
    assert.match(e.title, /v20261024-abc1234/);
    assert.match(e.description, /Discord 커뮤니티 공지 발송/);
    assert.doesNotMatch(e.description, /스탬프 확정|기능·community/);
    assert.equal(e.fields[0].value, 'https://app.test');
});

test('announceRelease — release-notes.json에서 버전 일치 항목을 읽어 발송 (AD-12)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'announce-'));
    try {
        const file = join(dir, 'notes.json');
        writeFileSync(file, JSON.stringify([
            { version: 'v20261024-abc1234', date: '2026-10-24', notes: ['[기능·x] 테스트 노트'] },
            { version: 'v20261023-zzz9999', date: '2026-10-23', notes: ['[기능·y] 구버전 노트'] },
        ]));
        const { calls, restore } = stubFetch(async () => new Response('ok', { status: 200 }));
        try {
            await withAnnounceEnv({ DISCORD_ANNOUNCE: 'https://discord.test/all' }, async () => {
                const r = await announceRelease('v20261024-abc1234', { notesPath: file });
                assert.equal(r.sent, 1);
                const body = JSON.parse(calls[0][1].body);
                assert.match(body.embeds[0].description, /테스트 노트/);
                assert.doesNotMatch(body.embeds[0].description, /구버전 노트/);
            });
        } finally { restore(); }
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
