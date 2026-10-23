/**
 * discord.js — 운영 알림 Discord webhook 전송 공용 헬퍼
 * @spec AD-10 (Discord 운영 알림 — docs/dev/runbooks/DISCORD_ADMIN.md)
 *
 * 로컬 도구(deploy 등)가 운영 이벤트를 Discord 채널로 푸시한다.
 * webhook URL은 DISCORD_WEBHOOK_URL env·.env로만 전달 — 커밋 금지.
 * 미설정 시 조용히 skip(알림은 선택 계층 — 도구 동작을 막지 않는다).
 */
'use strict';
const { loadEnv } = require('./env');

/**
 * Discord webhook POST. allowed_mentions를 비워 임베드의 @everyone·유저
 * 멘션 해석을 차단한다 (알림 채널이어도 멘션 폭발 방지 — 방어적 기본값).
 * @param {object} embed Discord embed 객체 (title·description·color·fields…)
 * @param {{webhookUrl?: string, timeoutMs?: number}} [opts]
 * @returns {Promise<{sent: boolean, reason?: string, status?: number}>}
 */
async function postDiscord(embed, opts = {}) {
    loadEnv();
    const url = opts.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL;
    if (!url) return { sent: false, reason: 'DISCORD_WEBHOOK_URL 미설정' };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                allowed_mentions: { parse: [] },
                embeds: [embed],
            }),
            signal: AbortSignal.timeout(opts.timeoutMs ?? 10000),
        });
        return res.ok ? { sent: true } : { sent: false, reason: `HTTP ${res.status}`, status: res.status };
    } catch (e) {
        return { sent: false, reason: String(e && e.message || e) };
    }
}

/** 운영 이벤트 임베드의 공통 필드 조립 — title·성패·부가 필드 */
function eventEmbed(title, ok, fields = []) {
    return {
        title,
        color: ok ? 0x22c55e : 0xef4444,
        fields,
        timestamp: new Date().toISOString(),
    };
}

module.exports = { postDiscord, eventEmbed };
