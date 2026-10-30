#!/usr/bin/env node
/**
 * feedback_report.js — 피드백 인박스 조회 리포트 (ADMIN_DESIGN.md §5 Phase 1)
 * @spec AD-06 (관리자 운영 CLI)
 *
 * feedback 테이블(익명 insert 전용 — RLS로 클라이언트 조회 차단)을 service role로
 * 조회해 kind별 건수·평균 평점·일별 추이·최근 항목 본문을 출력한다.
 * bug 항목에는 meta.session_id가 동봉되므로 report:errors --session과 이어서 쓴다.
 *
 * 사전 조건: SUPABASE_SECRET_KEY env (Secret = 구 service_role — RLS 우회 관리자 키)
 *
 * 사용법:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..." ; npm.cmd run report:feedback
 *   npm.cmd run report:feedback -- --days 7
 *   npm.cmd run report:feedback -- --kind bug          # praise|improve|bug|idea
 *
 * Secret 키가 없으면 Supabase 대시보드 SQL 에디터용 동등 쿼리를 출력한다.
 */
'use strict';
const { requireSecret, restGet } = require('../lib/supabase_ops.js');

const KINDS = ['praise', 'improve', 'bug', 'idea'];

// ── 순수 집계 (테스트 대상) ──────────────────────────────────

/**
 * feedback 행 배열 → 인박스 리포트 구조 (순수 함수 — 네트워크 무관)
 * @param {Array} rows PostgREST select 결과
 * @returns {{total:number, byKind:Object, ratingAvg:string, ratingCount:number,
 *   byDay:Object, items:Array}}
 */
function summarize(rows) {
    const byKind = {}, byDay = {};
    let ratingSum = 0, ratingCount = 0;
    const items = [];
    for (const r of rows) {
        byKind[r.kind] = (byKind[r.kind] || 0) + 1;
        const day = String(r.created_at || '').slice(0, 10) || 'unknown';
        byDay[day] = (byDay[day] || 0) + 1;
        if (Number.isFinite(r.rating)) { ratingSum += r.rating; ratingCount++; }
        items.push({
            created_at: r.created_at, kind: r.kind, rating: r.rating,
            body: String(r.body || '').slice(0, 120),
            view: r.view || null, app_version: r.app_version || null,
            exam_id: r.exam_id || null, entry_src: r.entry_src || null,
            user: r.user_id ? String(r.user_id).slice(0, 8) + '…' : '(익명)',
            session_id: r.meta && r.meta.session_id ? String(r.meta.session_id) : null,
        });
    }
    return {
        total: rows.length, byKind, byDay, items,
        ratingAvg: ratingCount ? (ratingSum / ratingCount).toFixed(2) : 'n/a',
        ratingCount,
    };
}

// ── CLI ─────────────────────────────────────────────────────

const FALLBACK_SQL = `\
-- Supabase 대시보드 → SQL Editor
select kind, count(*) n, round(avg(rating), 2) rating_avg
from feedback
where created_at > now() - interval '7 days'
group by kind order by n desc;

select created_at, kind, rating, left(body, 120) body, view, app_version,
       meta->>'session_id' session_id
from feedback order by created_at desc limit 50;`;

function main(argv) {
    const args = argv || process.argv.slice(2);
    const di = args.indexOf('--days');
    const days = di >= 0 ? parseInt(args[di + 1], 10) : 7;
    const ki = args.indexOf('--kind');
    const kind = ki >= 0 ? args[ki + 1] : null;
    const li = args.indexOf('--limit');
    const limit = li >= 0 ? parseInt(args[li + 1], 10) : 50;
    if (!Number.isFinite(days) || days < 1 || !Number.isFinite(limit) || limit < 1
        || (kind && !KINDS.includes(kind))) {
        console.error('사용법: npm run report:feedback -- [--days N] [--kind praise|improve|bug|idea] [--limit N]');
        process.exit(2);
    }

    const secret = requireSecret('tools/check/feedback_report.js');
    if (!secret) {
        console.error('\n또는 대시보드에서 동등 쿼리 실행:\n');
        console.log(FALLBACK_SQL);
        process.exit(2);
    }

    return (async () => {
        const since = new Date(Date.now() - days * 864e5).toISOString();
        let q = 'select=created_at,kind,rating,body,view,app_version,entry_src,exam_id,user_id,meta'
            + `&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${limit}`;
        if (kind) q += `&kind=eq.${kind}`;
        const rows = await restGet(secret, 'feedback', q);
        const s = summarize(rows);

        console.log(`feedback 인박스 — 최근 ${days}일` + (kind ? ` · kind=${kind}` : '')
            + ` (조회 ${s.total}행)`);
        const kinds = KINDS.map((k) => `${k} ${s.byKind[k] || 0}`).join(' · ');
        console.log(`  종류: ${kinds}`);
        console.log(`  평점: 평균 ${s.ratingAvg} (${s.ratingCount}건 응답)`);

        const days_ = Object.keys(s.byDay).sort();
        if (days_.length) {
            console.log('\n── 일별 ──');
            for (const d of days_) console.log(`  ${d}: ${s.byDay[d]}건`);
        }
        if (s.items.length) {
            console.log('\n── 최근 항목 ──');
            for (const it of s.items) {
                const tag = `[${it.kind}${it.rating ? ` ★${it.rating}` : ''}]`;
                const ctx = [it.view, it.app_version, it.exam_id, it.user]
                    .filter(Boolean).join(' · ');
                console.log(`  ${it.created_at} ${tag} ${it.body}${ctx ? ` (${ctx})` : ''}`);
                if (it.session_id) {
                    console.log(`    → session_id ${it.session_id}`
                        + '  (report:errors -- --session <uuid>로 오류·퍼널 연결 조회)');
                }
            }
        }
        if (!s.total) {
            console.log('\n(행 없음 — 기간을 늘리거나 feedback insert 경로를 확인하세요)');
        }
    })();
}

if (require.main === module) {
    Promise.resolve(main()).catch((e) => { console.error(`조회 실패: ${e.message}`); process.exit(1); });
}

module.exports = { summarize, KINDS };
