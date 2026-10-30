#!/usr/bin/env node
/**
 * funnel_report.js — usage_events 과업 완주율 리포트 (PROJECT_METRICS §2.6 측정 경로)
 * @spec none (관측성 인프라)
 *
 * src/telemetry/usage-telemetry.js가 수집한 usage_events 행을 Supabase PostgREST로 조회해
 * `<prefix>_start ↔ <prefix>_complete` 쌍의 완주율·이탈·평균 점수를 출력한다.
 *
 * 완주율은 두 가지로 표시:
 *   - 이벤트 비율: complete 건수 / start 건수
 *   - 세션 쌍 비율: start가 있는 session_id 중 complete까지 도달한 비율
 *     (페이지 로드당 UUID라 한 세션의 이탈을 정확히 식별 — 더 엄밀한 쪽)
 *
 * 사전 조건·사용법은 error_report.js와 동일:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; node tools/check/funnel_report.js
 *   node tools/check/funnel_report.js --days 7
 */
'use strict';
const { loadEnv } = require('../lib/env.js');
const { restGetAll } = require('../lib/supabase_ops.js');

// ── 순수 집계 (테스트 대상) ──────────────────────────────────

/**
 * usage_events 행 배열 → 퍼널 리포트 구조 (순수 함수 — 네트워크 무관)
 * `_start`/`_complete` 접미 쌍을 자동 인식한다.
 * @param {Array} rows PostgREST select 결과 (created_at, session_id, event, meta)
 */
function summarize(rows) {
    const eventCounts = {};
    const sessions = {};   // session_id → { event → [iso timestamps] }
    const startSessions = new Set();   // session_start 세션 (방문 분모)
    const coreSessions = new Set();    // core_learning_action 발생 세션
    const installs = new Set();        // meta.install_id — 고유 설치 추정
    const coreInstalls = new Set();    // 핵심 행동 도달 설치
    for (const r of rows) {
        const ev = String(r.event || 'unknown');
        eventCounts[ev] = (eventCounts[ev] || 0) + 1;
        const installId = r.meta && r.meta.install_id;
        if (installId) installs.add(installId);
        if (ev === 'session_start') {
            if (r.session_id) startSessions.add(r.session_id);
        }
        if (ev === 'core_learning_action') {
            if (r.session_id) coreSessions.add(r.session_id);
            if (installId) coreInstalls.add(installId);
        }
        if (!r.session_id) continue;
        const s = sessions[r.session_id] || (sessions[r.session_id] = {});
        (s[ev] || (s[ev] = [])).push(String(r.created_at || ''));
    }

    // 활성화 퍼널 — DOC-DSN-34 §4 "방문→핵심 학습 행동" (UX-MET-06/07)
    const activation = {
        sessions: startSessions.size,
        coreSessions: coreSessions.size,
        sessionRate: startSessions.size ? coreSessions.size / startSessions.size : null,
        installs: installs.size,
        coreInstalls: coreInstalls.size,
        installRate: installs.size ? coreInstalls.size / installs.size : null,
    };

    const funnels = {};
    for (const ev of Object.keys(eventCounts)) {
        if (!ev.endsWith('_start')) continue;
        const prefix = ev.slice(0, -'_start'.length);
        if (prefix === 'session') continue;  // session_start는 방문 분모 — 과업 쌍 아님 (activation으로 표시)
        const completeEv = `${prefix}_complete`;
        const starts = eventCounts[ev];
        const completes = eventCounts[completeEv] || 0;

        // 세션 쌍 집계 — start가 있는 세션 중 complete 도달 비율 + 소요 시간·점수
        let sStarts = 0, sDone = 0;
        const durations = [], scores = [];
        for (const evs of Object.values(sessions)) {
            const st = evs[ev];
            if (!st) continue;
            sStarts++;
            const cp = evs[completeEv];
            if (cp && cp.length) {
                sDone++;
                const ms = Date.parse(cp[cp.length - 1]) - Date.parse(st[0]);
                if (Number.isFinite(ms) && ms >= 0) durations.push(ms);
            }
        }
        // 평균 점수 — complete 이벤트의 meta.correct/total
        for (const r of rows) {
            if (r.event === completeEv && r.meta && r.meta.total > 0) {
                scores.push(r.meta.correct / r.meta.total);
            }
        }
        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        funnels[prefix] = {
            starts, completes,
            eventRate: starts ? completes / starts : null,
            sessionStarts: sStarts, sessionDone: sDone,
            sessionRate: sStarts ? sDone / sStarts : null,
            avgScore: avg(scores),
            avgDurationMs: avg(durations),
        };
    }
    return { total: rows.length, eventCounts, funnels, activation };
}

// ── CLI ─────────────────────────────────────────────────────

const FALLBACK_SQL = `\
-- Supabase 대시보드 → SQL Editor (기간에 맞게 interval 조정)
select event, count(*) n from usage_events
where created_at > now() - interval '7 days'
group by event order by n desc;

-- 세션 쌍 완주율 (quiz 예시 — daily는 event명 치환)
with s as (
  select session_id,
         bool_or(event='quiz_start') started,
         bool_or(event='quiz_complete') done
  from usage_events
  where created_at > now() - interval '7 days'
  group by session_id
)
select count(*) filter (where started) started,
       count(*) filter (where started and done) done,
       round(100.0 * count(*) filter (where started and done)
             / nullif(count(*) filter (where started), 0), 1) as completion_pct
from s;`;

function fmtPct(x) { return x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`; }

async function main() {
    loadEnv();
    const args = process.argv.slice(2);
    const di = args.indexOf('--days');
    const days = di >= 0 ? parseInt(args[di + 1], 10) : 7;
    if (!Number.isFinite(days) || days < 1) {
        console.error('사용법: node tools/check/funnel_report.js [--days N]');
        process.exit(2);
    }

    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) {
        console.error('SUPABASE_SECRET_KEY 미설정 — Secret(구 service_role) 키를 루트 .env 또는 env로 전달하세요.');
        console.error('  .env: SUPABASE_SECRET_KEY=sb_secret_...  (한 줄 추가)');
        console.error('  PowerShell: $env:SUPABASE_SECRET_KEY="sb_secret_..."');
        console.error('\n또는 대시보드에서 동등 쿼리 실행:\n');
        console.log(FALLBACK_SQL);
        process.exit(2);
    }

    const since = new Date(Date.now() - days * 864e5).toISOString();
    const rows = await restGetAll(secret, 'usage_events',
        `select=created_at,session_id,event,meta`
        + `&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc`);
    const s = summarize(rows);

    console.log(`usage_events 완주율 리포트 — 최근 ${days}일 (조회 ${rows.length}행)`);
    const evs = Object.entries(s.eventCounts).sort((a, b) => b[1] - a[1]);
    if (evs.length) {
        console.log('\n── 이벤트 건수 ──');
        for (const [k, n] of evs) console.log(`  ${n} × ${k}`);
    }
    const a = s.activation;
    if (a.sessions || a.installs) {
        console.log('\n── 활성화 (방문→핵심 학습 행동 · DOC-DSN-34 §4) ──');
        console.log(`  세션: ${a.coreSessions}/${a.sessions} = ${fmtPct(a.sessionRate)}`
            + ` · 설치: ${a.coreInstalls}/${a.installs} = ${fmtPct(a.installRate)}`);
        console.log('  · 세션율=session_start 세션 중 핵심 행동 도달 · 설치율=고유 install_id 기준 추정');
    }
    const fs_ = Object.entries(s.funnels);
    if (fs_.length) {
        console.log('\n── 퍼널 (start → complete) ──');
        for (const [prefix, f] of fs_) {
            const dur = f.avgDurationMs === null ? 'n/a' : `${Math.round(f.avgDurationMs / 1000)}s`;
            const score = f.avgScore === null ? 'n/a' : `${(f.avgScore * 100).toFixed(1)}%`;
            console.log(`  ${prefix}: 완주율(세션 쌍) ${f.sessionDone}/${f.sessionStarts} = ${fmtPct(f.sessionRate)}`
                + ` · 이벤트 비 ${f.completes}/${f.starts} = ${fmtPct(f.eventRate)}`
                + ` · 평균 점수 ${score} · 평균 소요 ${dur}`);
        }
    }
    if (!fs_.length) {
        console.log('\n⚠ _start 이벤트가 없습니다 — usage-telemetry.js 계측이 배포된 버전부터 집계됩니다'
            + ' (schema.sql §6 적용 필요).');
    }
}

if (require.main === module) {
    main().catch((e) => { console.error(`조회 실패: ${e.message}`); process.exit(1); });
}

module.exports = { summarize };
