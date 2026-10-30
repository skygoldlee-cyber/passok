/**
 * discord.js — 운영 알림 Discord webhook 전송 공용 헬퍼
 * @spec AD-10,AD-12 (Discord 운영 알림·커뮤니티 공지 — docs/dev/runbooks/DISCORD_ADMIN.md · DISCORD_COMMUNITY_SETUP.md)
 *
 * 로컬 도구(deploy 등)가 운영 이벤트를 Discord 채널로 푸시한다.
 * webhook URL은 DISCORD_WEBHOOK_URL env·.env로만 전달 — 커밋 금지.
 * 커뮤니티 공지는 DISCORD_ANNOUNCE(전체-공지)·DISCORD_ANNOUNCE_<EXAM>(시험별) env로 수신 — 미설정 시 조용히 skip(알림은 선택 계층 — 도구 동작을 막지 않는다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./env.js');

const ROOT = path.resolve(__dirname, '..', '..');

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

/* =======================================================
   커뮤니티 공지 (AD-12 — DISCORD_COMMUNITY_DESIGN §4)
   ======================================================= */

const ANNOUNCE_ENV_RE = /^DISCORD_ANNOUNCE(?:_([A-Z0-9]+))?$/;

/** 등록 시험 id 집합 — announce env suffix 검증용 (레지스트리 읽기 실패 시 빈 Set = 검증 생략) */
function registeredExamIds() {
    try {
        const exams = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8'));
        return new Set((exams.exams || []).map(e => e.id).filter(Boolean));
    } catch {
        return new Set();
    }
}

/**
 * 커뮤니티 공지 webhook 수집.
 *   DISCORD_ANNOUNCE            → 전체-공지 채널 (모든 공지 수신)
 *   DISCORD_ANNOUNCE_<EXAM_ID>  → 시험별 공지 채널 (exams.json 등록 id만 — 오타 env는 스킵+보고)
 * 같은 webhook URL의 중복 선언은 한 번만 발송한다.
 * @returns {{targets: Array<{key:string, label:string, url:string}>, unknown: string[]}}
 */
function announceTargets() {
    loadEnv();
    const ids = registeredExamIds();
    const targets = [];
    const unknown = [];
    const seen = new Set();
    for (const [key, url] of Object.entries(process.env)) {
        const m = ANNOUNCE_ENV_RE.exec(key);
        if (!m || !url || !url.trim()) continue;
        const suffix = m[1];
        let label = '전체-공지';
        if (suffix) {
            const examId = suffix.toLowerCase();
            if (ids.size && !ids.has(examId)) { unknown.push(key); continue; }
            label = examId;
        }
        if (seen.has(url)) continue;
        seen.add(url);
        targets.push({ key, label, url });
    }
    return { targets, unknown };
}

/**
 * 커뮤니티 공지 fan-out — 구성된 announce 채널 전체에 동일 임베드 발송.
 * @param {object} embed Discord embed 객체
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<{sent:number, failed:object[], skippedUnknown:string[], results:object[]}>}
 */
async function postAnnounce(embed, opts = {}) {
    const { targets, unknown } = announceTargets();
    const results = [];
    for (const t of targets) {
        const r = await postDiscord(embed, { webhookUrl: t.url, timeoutMs: opts.timeoutMs });
        results.push({ key: t.key, label: t.label, ...r });
    }
    return {
        sent: results.filter(r => r.sent).length,
        failed: results.filter(r => !r.sent),
        skippedUnknown: unknown,
        results,
    };
}

// 내부 릴리스 메타 행 — 커뮤니티 공지 본문에서 제외
const INTERNAL_NOTE_RE = /스탬프 확정|\[no-docs\]|\[no-test\]/;

/**
 * 릴리스 공지 임베드 조립 — 노트의 `[분류·scope]` 접두와 내부 메타 행을 제거해
 * 사용자용 본문을 만든다 (순수 함수 — 단위 테스트용 export).
 */
function releaseAnnounceEmbed(version, notes, url) {
    const publicNotes = (Array.isArray(notes) ? notes : [])
        .map(n => String(n).replace(/^\[[^\]]*\]\s*/, '').trim())
        .filter(n => n && !INTERNAL_NOTE_RE.test(n));
    const fields = [];
    if (url) fields.push({ name: '앱', value: url, inline: true });
    return {
        title: `📣 PassOK 업데이트 — ${version}`,
        description: publicNotes.length
            ? publicNotes.map(n => `• ${n}`).join('\n').slice(0, 1900)
            : '변경 사항은 앱의 변경 이력을 확인하세요.',
        color: 0x06b6d4,
        fields,
        timestamp: new Date().toISOString(),
    };
}

/**
 * 릴리스 공지 발송 — data/release-notes.json에서 version 일치 항목의 노트를 읽어
 * announce 채널로 push. 채널 미설정·파일 부재여도 도구 동작을 막지 않는다.
 * @param {string} version 배포 버전 (예: v20261024-abc1234)
 * @param {{url?: string, notesPath?: string, notes?: string[], timeoutMs?: number}} [opts]
 */
async function announceRelease(version, opts = {}) {
    let notes = opts.notes;
    if (!notes) {
        try {
            const notesPath = opts.notesPath || path.join(ROOT, 'data', 'release-notes.json');
            const entries = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
            const entry = (Array.isArray(entries) ? entries : []).find(e => e && e.version === version);
            notes = entry && entry.notes;
        } catch { /* 노트 파일 부재·파싱 실패는 폴백 본문으로 진행 */ }
    }
    return postAnnounce(releaseAnnounceEmbed(version, notes, opts.url), opts);
}

module.exports = { postDiscord, eventEmbed, postAnnounce, announceTargets, releaseAnnounceEmbed, announceRelease };
