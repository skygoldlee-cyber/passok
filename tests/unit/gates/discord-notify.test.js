// tests/unit/gates/discord-notify.test.js — tools/lib/discord.js 회귀 (AD-10)
// @spec AD-10
import test from 'node:test';
import assert from 'node:assert/strict';
import discord from '../../../tools/lib/discord.js';

const { postDiscord, eventEmbed } = discord;

// fetch 목 — 호출 인자를 기록하고 제어 응답을 반환
function stubFetch(fn) {
    const orig = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (...a) => { calls.push(a); return fn(...a); };
    return { calls, restore: () => { globalThis.fetch = orig; } };
}

test('webhook 미설정 시 조용히 skip — 발신 없이 false 반환', async () => {
    const saved = process.env.DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
    const { calls, restore } = stubFetch(async () => new Response(''));
    try {
        const r = await postDiscord({ title: 't' });
        assert.equal(r.sent, false);
        assert.match(r.reason, /미설정/);
        assert.equal(calls.length, 0);       // 발신 자체를 하지 않음
    } finally {
        restore();
        if (saved !== undefined) process.env.DISCORD_WEBHOOK_URL = saved;
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
