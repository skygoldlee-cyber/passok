#!/usr/bin/env node
/**
 * dashboard_report.js — 로컬 HTML 운영 대시보드 (ADMIN_DESIGN.md §5 Phase 1.5)
 * @spec AD-07 (관리자 로컬 HTML 대시보드)
 *
 * client_errors + usage_events + feedback을 service role로 조회해
 * 단일 자급적 HTML 파일로 덤프한다. 로컬 파일이므로 인증·RLS·라우트 없이
 * 조감 뷰를 제공 — Phase 2(#/admin)의 인증·권한 계층 투자 없이 "매일 보는
 * 대시보드" 수요를 흡수한다.
 *
 * 사용자 제출 텍스트(피드백 본문·오류 메시지)는 esc()로 전면 이스케이프 —
 * 로컬 파일이라도 렌더링되는 XSS 경로를 차단한다.
 *
 * 사전 조건: SUPABASE_SECRET_KEY env (Secret = 구 service_role — RLS 우회 관리자 키)
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; npm.cmd run report:dashboard
 *   npm.cmd run report:dashboard -- --days 7
 *   npm.cmd run report:dashboard -- --out tools/state/dashboard_report.html
 *
 * 산출물: tools/state/dashboard_report.html (기본, gitignore 대상 — 커밋 금지)
 * Secret 키가 없으면 대시보드 SQL 에디터용 동등 쿼리를 출력한다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { requireSecret, restGet } = require('../lib/supabase_ops.js');
const { summarize: summarizeErrors } = require('./error_report.js');
const { summarize: summarizeFunnel } = require('./funnel_report.js');
const { summarize: summarizeFeedback, KINDS } = require('./feedback_report.js');

const DEFAULT_OUT = path.join(__dirname, '..', 'state', 'dashboard_report.html');

// ── 순수 렌더 (테스트 대상) ──────────────────────────────────

/** HTML 이스케이프 — 사용자 제출 텍스트 전면 적용 */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtPct(x) { return x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(1)}%`; }
function fmtMs(ms) {
    if (ms === null || ms === undefined) return 'n/a';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}분`;
}

/**
 * 집계 결과 묶음 → 단일 HTML 문서 (순수 함수)
 * @param {{generatedAt:string, days:number,
 *   errors:object, funnel:object, feedback:object}} in_
 * @returns {string} HTML 문서
 */
function renderHtml({ generatedAt, days, errors, funnel, feedback }) {
    const topMessages = (errors.topMessages || [])
        .map(([m, n]) => `<tr><td class="num">${n}</td><td>${esc(m)}</td></tr>`).join('');
    const dayRows = Object.keys(errors.byDay || {}).sort()
        .map((d) => {
            const v = errors.byDay[d];
            const r = v.sessions ? `${((v.errors / v.sessions) * 100).toFixed(1)}%` : 'n/a';
            return `<tr><td>${esc(d)}</td><td class="num">${v.sessions}</td>`
                + `<td class="num">${v.errors}</td><td class="num">${r}</td></tr>`;
        }).join('');
    const funnelRows = Object.entries(funnel.funnels || {})
        .map(([name, f]) => `<tr><td>${esc(name)}</td>`
            + `<td class="num">${f.sessionStarts}</td><td class="num">${f.sessionDone}</td>`
            + `<td class="num">${fmtPct(f.sessionRate)}</td>`
            + `<td class="num">${f.avgScore === null ? 'n/a' : fmtPct(f.avgScore)}</td>`
            + `<td class="num">${fmtMs(f.avgDurationMs)}</td></tr>`).join('');
    const kindCells = KINDS.map((k) =>
        `<td class="num">${(feedback.byKind || {})[k] || 0}</td>`).join('');
    const fbRows = (feedback.items || []).slice(0, 30)
        .map((it) => `<tr><td class="nowrap">${esc(String(it.created_at || '').slice(0, 16).replace('T', ' '))}</td>`
            + `<td><span class="tag tag-${esc(it.kind)}">${esc(it.kind)}</span>`
            + (it.rating ? ` <span class="star">★${it.rating}</span>` : '') + '</td>'
            + `<td>${esc(it.body)}</td>`
            + `<td class="dim">${esc([it.view, it.app_version].filter(Boolean).join(' · '))}</td>`
            + `<td class="dim nowrap">${it.session_id
                ? `<code>${esc(String(it.session_id).slice(0, 13))}…</code>` : ''}</td></tr>`)
        .join('');

    return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Passmula 운영 대시보드</title>
<style>
body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;background:#f5f6f8;color:#222}
main{max-width:960px;margin:0 auto;padding:24px 16px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 8px}
.dim{color:#666;font-size:12px}.nowrap{white-space:nowrap}.num{text-align:right;font-variant-numeric:tabular-nums}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0}
.card{background:#fff;border:1px solid #e2e4e8;border-radius:10px;padding:14px}
.card .k{font-size:12px;color:#666}.card .v{font-size:22px;font-weight:600;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e4e8;border-radius:10px;overflow:hidden;font-size:13px}
th{background:#f0f1f4;text-align:left;padding:8px 10px;font-size:12px;color:#555}
td{padding:7px 10px;border-top:1px solid #eef0f3;vertical-align:top}
.tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;background:#e8eaee}
.tag-bug{background:#fde2e1}.tag-praise{background:#e0f2e9}.tag-improve{background:#e3ecfd}.tag-idea{background:#f4ecd8}
.star{color:#c9931a;font-size:11px}
footer{margin:28px 0 8px;font-size:11px;color:#999}
</style></head><body><main>
<h1>Passmula 운영 대시보드</h1>
<div class="dim">생성 ${esc(generatedAt)} · 최근 ${days}일 · 로컬 전용 (service role 조회 — 배포·공유 금지)</div>

<div class="cards">
  <div class="card"><div class="k">오류율 (오류/세션)</div><div class="v">${esc(errors.rate)}</div></div>
  <div class="card"><div class="k">세션 / 오류</div><div class="v">${errors.sessions} / ${errors.errors}</div></div>
  <div class="card"><div class="k">피드백</div><div class="v">${feedback.total}</div></div>
  <div class="card"><div class="k">평점 평균</div><div class="v">${esc(feedback.ratingAvg)}</div></div>
</div>

<h2>오류 — 일별</h2>
<table><tr><th>날짜</th><th class="num">세션</th><th class="num">오류</th><th class="num">오류율</th></tr>
${dayRows || '<tr><td colspan="4" class="dim">데이터 없음</td></tr>'}</table>

<h2>오류 — 상위 메시지</h2>
<table><tr><th class="num">건수</th><th>메시지</th></tr>
${topMessages || '<tr><td colspan="2" class="dim">데이터 없음</td></tr>'}</table>

<h2>과업 퍼널 — 세션 쌍 완주율</h2>
<table><tr><th>과업</th><th class="num">시작</th><th class="num">완료</th><th class="num">완주율</th><th class="num">평균 점수</th><th class="num">평균 소요</th></tr>
${funnelRows || '<tr><td colspan="6" class="dim">데이터 없음</td></tr>'}</table>

<h2>피드백 — kind별</h2>
<table><tr>${KINDS.map((k) => `<th>${esc(k)}</th>`).join('')}</tr><tr>${kindCells}</tr></table>

<h2>피드백 — 최근 30건</h2>
<table><tr><th>시각</th><th>종류</th><th>본문</th><th>컨텍스트</th><th>세션</th></tr>
${fbRows || '<tr><td colspan="5" class="dim">데이터 없음</td></tr>'}</table>

<footer>Passmula 운영 대시보드 — tools/check/dashboard_report.js 생성 · bug 항목의 세션 열은
<code>report:errors -- --session &lt;uuid&gt;</code> 연결 조회용 단축 표시입니다.</footer>
</main></body></html>`;
}

// ── CLI ─────────────────────────────────────────────────────

const FALLBACK_SQL = `\
-- Supabase 대시보드 → SQL Editor (기간 N일에 맞게 interval 조정)
select created_at::date d,
       count(*) filter (where kind='session') sessions,
       count(*) filter (where kind<>'session') errors
from client_errors group by 1 order by 1;

select event, count(*) n from usage_events
where created_at > now() - interval '30 days' group by event order by n desc;

select kind, count(*) n, round(avg(rating),2) rating_avg
from feedback where created_at > now() - interval '30 days' group by kind;`;

async function main(argv) {
    const args = argv || process.argv.slice(2);
    const di = args.indexOf('--days');
    const days = di >= 0 ? parseInt(args[di + 1], 10) : 30;
    const oi = args.indexOf('--out');
    const out = oi >= 0 ? args[oi + 1] : DEFAULT_OUT;
    if (!Number.isFinite(days) || days < 1 || !out) {
        console.error('사용법: npm run report:dashboard -- [--days N] [--out <path>]');
        process.exit(2);
    }

    const secret = requireSecret('tools/check/dashboard_report.js');
    if (!secret) {
        console.error('\n또는 대시보드에서 동등 쿼리 실행:\n');
        console.log(FALLBACK_SQL);
        process.exit(2);
    }

    const since = new Date(Date.now() - days * 864e5).toISOString();
    const gte = `created_at=gte.${encodeURIComponent(since)}`;
    const [errRows, evRows, fbRows] = await Promise.all([
        restGet(secret, 'client_errors',
            `select=created_at,kind,message,app_version,view&${gte}&order=created_at.desc&limit=50000`),
        restGet(secret, 'usage_events',
            `select=created_at,session_id,event,meta&${gte}&order=created_at.desc&limit=50000`),
        restGet(secret, 'feedback',
            `select=created_at,kind,rating,body,view,app_version,entry_src,exam_id,user_id,meta`
            + `&${gte}&order=created_at.desc&limit=200`),
    ]);

    const html = renderHtml({
        generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        days,
        errors: summarizeErrors(errRows),
        funnel: summarizeFunnel(evRows),
        feedback: summarizeFeedback(fbRows),
    });
    fs.writeFileSync(out, html, 'utf8');
    console.log(`✓ 대시보드 생성 — ${path.relative(process.cwd(), out)}`
        + ` (오류 ${errRows.length} · 이벤트 ${evRows.length} · 피드백 ${fbRows.length}행)`);
    console.log('  브라우저로 열기: start ' + path.basename(out));
}

if (require.main === module) {
    main().catch((e) => { console.error(`생성 실패: ${e.message}`); process.exit(1); });
}

module.exports = { renderHtml, esc };
