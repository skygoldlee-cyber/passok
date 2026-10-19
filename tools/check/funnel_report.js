#!/usr/bin/env node
/**
 * funnel_report.js — usage_events 과업 완주율 리포트 (PROJECT_METRICS §2.6 측정 경로)
 * @spec none (관측성 인프라)
 *
 * src/usage-telemetry.js가 수집한 usage_events 행을 Supabase PostgREST로 조회해
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
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../lib/env');

// ── 순수 집계 (테스트 대상) ──────────────────────────────────

/**
 * usage_events 행 배열 → 퍼널 리포트 구조 (순수 함수 — 네트워크 무관)
 * `_start`/`_complete` 접미 쌍을 자동 인식한다.
 * @param {Array} rows PostgREST select 결과 (created_at, session_id, event, meta)
 */
function summarize(rows) {
    const eventCounts = {};
    const sessions = {};   // session_id → { event → [iso timestamps] }
    for (const r of rows) {
        const ev = String(r.event || 'unknown');
        eventCounts[ev] = (eventCounts[ev] || 0) + 1;
        if (!r.session_id) continue;
        const s = sessions[r.session_id] || (sessions[r.session_id] = {});
        (s[ev] || (s[ev] = [])).push(String(r.created_at || ''));
    }

    const funnels = {};
    for (const ev of Object.keys(eventCounts)) {
        if (!ev.endsWith('_start')) continue;
        const prefix = ev.slice(0, -'_start'.length);
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
    return { total: rows.length, eventCounts, funnels };
}

// ── CLI ─────────────────────────────────────────────────────

function supabaseUrl() {
    if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, '');
    const cfg = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'supabase-config.js'), 'utf8');
    const m = cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
    if (!m) throw new Error('src/supabase-config.js에서 SUPABASE_URL을 읽지 못했습니다');
    return m[1];
}

const FALLBACK_SQL = `\
-- Supabase 대시보드 → SQL Editor (기간에 맞게 interval 조정)
select event, count(*) n from usage_events
where created_at > now() - interval '30 days'
group by event order by n desc;

-- 세션 쌍 완주율 (quiz 예시 — daily는 event명 치환)
with s as (
  select session_id,
         bool_or(event='quiz_start') started,
         bool_or(event='quiz_complete') done
  from usage_events
  where created_at > now() - interval '30 days'
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
    const days = di >= 0 ? parseInt(args[di + 1], 10) : 30;
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
    const url = `${supabaseUrl()}/rest/v1/usage_events`
        + `?select=created_at,session_id,event,meta`
        + `&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=50000`;
    const res = await fetch(url, {
        headers: { apikey: secret, authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
        console.error(`조회 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        console.error('(usage_events 테이블·정책이 프로덕션에 적용됐는지 확인 — schema.sql §6)');
        process.exit(1);
    }
    const rows = await res.json();
    const s = summarize(rows);

    console.log(`usage_events 완주율 리포트 — 최근 ${days}일 (조회 ${rows.length}행)`);
    const evs = Object.entries(s.eventCounts).sort((a, b) => b[1] - a[1]);
    if (evs.length) {
        console.log('\n── 이벤트 건수 ──');
        for (const [k, n] of evs) console.log(`  ${n} × ${k}`);
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
