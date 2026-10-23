#!/usr/bin/env node
/**
 * error_report.js — client_errors 오류율 리포트 (PROJECT_METRICS §2.6 측정 경로)
 * @spec none (관측성 인프라)
 *
 * src/error-telemetry.js가 수집한 client_errors 행을 Supabase PostgREST로 조회해
 * 오류율(오류/세션)·일별 추이·상위 메시지·버전/뷰 분포를 출력한다.
 *
 * 세션 핑(kind='session')이 분모 — 세션 핑 도입 이전 기간은 오류만 나오고
 * 세션 수가 없으므로 오류율은 'n/a'로 표시된다 (측정 공백을 0%로 위장하지 않음).
 *
 * 사전 조건:
 *   - SUPABASE_SECRET_KEY 환경변수 (Secret key = 구 service_role — RLS 우회 관리자
 *     키이므로 env로만 전달, 절대 파일·인자·커밋 금지)
 *   - SUPABASE_URL 미설정 시 src/auth-sync/supabase-config.js의 값을 사용
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; node tools/check/error_report.js
 *   node tools/check/error_report.js --days 7
 *   node tools/check/error_report.js --session <uuid>   # bug 신고의 meta.session_id로
 *                                                       # 해당 페이지 로드의 오류·퍼널 이력 조회
 *
 * Secret 키가 없으면 Supabase 대시보드 SQL 에디터용 동등 쿼리를 출력한다.
 */
'use strict';
const { loadEnv } = require('../lib/env');
const { restGetAll } = require('../lib/supabase_ops.js');

// ── 순수 집계 (테스트 대상) ──────────────────────────────────

/** 상위 N개 키-카운트 정렬 */
function topEntries(obj, n) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

/**
 * client_errors 행 배열 → 리포트 구조 (순수 함수 — 네트워크 무관)
 * @param {Array} rows PostgREST select 결과
 * @returns {{sessions:number, errors:number, rate:string,
 *   byDay:Object, topMessages:Array, byVersion:Object, byView:Object, byKind:Object}}
 */
function summarize(rows) {
    const sessions = rows.filter((r) => r.kind === 'session').length;
    const errRows = rows.filter((r) => r.kind === 'error' || r.kind === 'unhandledrejection');
    const byDay = {};   // date → {sessions, errors}
    const byKind = {}, byVersion = {}, byView = {}, msgCount = {};
    for (const r of rows) {
        const day = String(r.created_at || '').slice(0, 10) || 'unknown';
        const d = byDay[day] || (byDay[day] = { sessions: 0, errors: 0 });
        if (r.kind === 'session') { d.sessions++; continue; }
        d.errors++;
        byKind[r.kind] = (byKind[r.kind] || 0) + 1;
        const v = r.app_version || '(없음)';
        byVersion[v] = (byVersion[v] || 0) + 1;
        const vw = r.view || '(없음)';
        byView[vw] = (byView[vw] || 0) + 1;
        const m = String(r.message || '').slice(0, 120);
        msgCount[m] = (msgCount[m] || 0) + 1;
    }
    return {
        sessions,
        errors: errRows.length,
        rate: sessions ? `${((errRows.length / sessions) * 100).toFixed(2)}%` : 'n/a (세션 핑 없음)',
        byDay, topMessages: topEntries(msgCount, 10), byVersion, byView, byKind,
    };
}

// ── CLI ─────────────────────────────────────────────────────

const FALLBACK_SQL = `\
-- Supabase 대시보드 → SQL Editor (기간 N일에 맞게 interval 조정)
select
  count(*) filter (where kind = 'session') as sessions,
  count(*) filter (where kind <> 'session') as errors,
  round(100.0 * count(*) filter (where kind <> 'session')
        / nullif(count(*) filter (where kind = 'session'), 0), 2) as error_rate_pct
from client_errors
where created_at > now() - interval '30 days';

select message, count(*) n from client_errors
where created_at > now() - interval '30 days' and kind <> 'session'
group by message order by n desc limit 10;`;

const SESSION_SQL = `\
-- 신고 기반 조회: feedback(kind='bug') 행의 meta->>'session_id' 값을 <uuid>에 대입
select created_at, kind, message, view, app_version, url
from client_errors where session_id = '<uuid>' order by created_at;

select created_at, event, meta
from usage_events where session_id = '<uuid>' order by created_at;`;

async function fetchRows(secret, table, query) {
    return restGetAll(secret, table, query);  // 서버 max-rows(1000) 상한 — 페이지네이션으로 전량 회수
}

async function main() {
    loadEnv();
    const args = process.argv.slice(2);
    const di = args.indexOf('--days');
    const days = di >= 0 ? parseInt(args[di + 1], 10) : 30;
    const si = args.indexOf('--session');
    const session = si >= 0 ? args[si + 1] : null;
    if (!Number.isFinite(days) || days < 1 || (si >= 0 && !session)) {
        console.error('사용법: node tools/check/error_report.js [--days N] [--session <uuid>]');
        process.exit(2);
    }

    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) {
        console.error('SUPABASE_SECRET_KEY 미설정 — Secret(구 service_role) 키를 루트 .env 또는 env로 전달하세요.');
        console.error('  .env: SUPABASE_SECRET_KEY=sb_secret_...  (한 줄 추가)');
        console.error('  PowerShell: $env:SUPABASE_SECRET_KEY="sb_secret_..."');
        console.error('\n또는 대시보드에서 동등 쿼리 실행:\n');
        console.log(session ? SESSION_SQL : FALLBACK_SQL);
        process.exit(2);
    }

    // --session: 신고 기반 연결 조회 — bug 피드백의 meta.session_id로
    // 해당 페이지 로드의 오류 + 퍼널 이벤트를 함께 출력한다.
    if (session) {
        const sel = 'created_at,kind,message,view,app_version,url';
        const errors = await fetchRows(secret, 'client_errors',
            `select=${sel}&session_id=eq.${encodeURIComponent(session)}&order=created_at`);
        const events = await fetchRows(secret, 'usage_events',
            `select=created_at,event,exam_id,app_version,meta&session_id=eq.${encodeURIComponent(session)}&order=created_at`);
        console.log(`세션 ${session} — 오류 ${errors.length}건 · 이벤트 ${events.length}건`);
        for (const r of errors) {
            console.log(`  ${r.created_at} [${r.kind}] ${r.message}`
                + ` (${[r.view, r.app_version, r.url].filter(Boolean).join(' · ')})`);
        }
        if (events.length) {
            console.log('── 퍼널 이벤트 ──');
            for (const r of events) {
                console.log(`  ${r.created_at} ${r.event} ${JSON.stringify(r.meta || {})}`);
            }
        }
        if (!errors.length && !events.length) {
            console.log('⚠ 행이 없습니다 — session_id가 다른 페이지 로드의 것이거나,'
                + ' schema.sql §5(session_id 컬럼)·§6이 프로덕션에 미적용일 수 있습니다.');
        }
        return;
    }

    const since = new Date(Date.now() - days * 864e5).toISOString();
    const rows = await fetchRows(secret, 'client_errors',
        `select=created_at,kind,message,app_version,view`
        + `&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc`);
    const s = summarize(rows);

    console.log(`client_errors 오류율 리포트 — 최근 ${days}일 (조회 ${rows.length}행)`);
    console.log(`  세션: ${s.sessions} · 오류: ${s.errors} · 오류율: ${s.rate}`);
    const kinds = Object.entries(s.byKind).map(([k, n]) => `${k} ${n}`).join(' · ');
    if (kinds) console.log(`  종류: ${kinds}`);

    const days_ = Object.keys(s.byDay).sort();
    if (days_.length) {
        console.log('\n── 일별 ──');
        for (const d of days_) {
            const v = s.byDay[d];
            const r = v.sessions ? `${((v.errors / v.sessions) * 100).toFixed(1)}%` : 'n/a';
            console.log(`  ${d}: 세션 ${v.sessions} · 오류 ${v.errors} · ${r}`);
        }
    }
    const printTop = (title, obj) => {
        const es = topEntries(obj, 10);
        if (!es.length) return;
        console.log(`\n${title}`);
        for (const [k, n] of es) console.log(`  ${n} × ${k}`);
    };
    printTop('── 상위 메시지 ──', Object.fromEntries(s.topMessages));
    printTop('── 버전별 오류 ──', s.byVersion);
    printTop('── 뷰별 오류 ──', s.byView);
    if (!s.sessions) {
        console.log('\n⚠ 세션 행이 없습니다 — 오류율 분모 부재. error-telemetry.js 세션 핑이'
            + ' 배포된 버전부터 집계됩니다 (스키마 kind check에 session 포함 필요).');
    }
}

if (require.main === module) {
    main().catch((e) => { console.error(`조회 실패: ${e.message}`); process.exit(1); });
}

module.exports = { summarize };
