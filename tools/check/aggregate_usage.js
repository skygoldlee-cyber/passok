#!/usr/bin/env node
/**
 * aggregate_usage.js — 회수된 사용 통계 병합·판정 요약
 * @spec UX-MET-03
 *
 * 두 입력 경로:
 *   1. 파일 모드 — 앱 '내 사용 통계 → 통계 복사'로 회수된 JSON 병합:
 *        node tools/check/aggregate_usage.js <파일.json... | 디렉터리>
 *   2. 스냅샷 모드 — Supabase usage_events의 usage_snapshot 행에서
 *      기기별 누적 카운터 차분을 집계 (UX-MET-05 서버 회수 경로):
 *        node tools/check/aggregate_usage.js --snapshot [--days N]  (기본 28일)
 *
 * 출력: 표본(owner) 수·기간, 액션 합계, 뷰 분포, UX-GATE 판정 요약.
 * 같은 owner의 파일이 여러 개면 최신(파일 내 lastUse 최대) 것만 반영한다.
 * 스냅샷 모드는 기기별 최초↔최신 스냅샷의 카운터 차분으로 창 내 증분을 산출 —
 * 스냅샷이 1건뿐인 기기는 누적 전체를 포함하므로 별도 표기한다.
 */

// @spec UX-MET-03
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const SNAPSHOT = args.includes('--snapshot');
const di = args.indexOf('--days');
const DAYS = di >= 0 ? parseInt(args[di + 1], 10) : 28;
const BOT_UA_RE = /playwright|headlesschrome|headless|phantomjs|puppeteer|selenium/i;

function isStatsExport(d) {
    return d && typeof d === 'object'
        && typeof d.views === 'object' && typeof d.actions === 'object' && typeof d.days === 'object';
}

function collectFiles(inputs) {
    const files = [];
    for (const a of inputs) {
        const abs = path.resolve(a);
        if (!fs.existsSync(abs)) { console.error(`  ✗ 없는 경로: ${a}`); continue; }
        if (fs.statSync(abs).isDirectory()) {
            for (const f of fs.readdirSync(abs)) {
                if (f.endsWith('.json')) files.push(path.join(abs, f));
            }
        } else files.push(abs);
    }
    return files;
}

/** owner → {views,actions,firstUse,lastUse} 맵 → 판정 요약 출력 */
function report(byOwner, label) {
    console.log(`사용 통계 병합 (${label})`);
    console.log(`  표본: ${byOwner.size}기기(owner)`);
    if (!byOwner.size) {
        console.error('\n유효한 표본이 없습니다.');
        process.exit(1);
    }
    if (byOwner.size < 3) {
        console.log(`  ⚠ 표본 하한(3기기) 미달 — UX-GATE 판정은 연기 대상입니다 (DOC-DSN-24 §5)`);
    }

    const sum = (key) => {
        const acc = {};
        for (const d of byOwner.values()) {
            for (const [k, n] of Object.entries(d[key] || {})) acc[k] = (acc[k] || 0) + n;
        }
        return acc;
    };
    const actions = sum('actions');
    const views = sum('views');

    const firsts = [...byOwner.values()].map(d => d.firstUse).filter(Boolean).sort();
    const lasts = [...byOwner.values()].map(d => d.lastUse).filter(Boolean).sort();
    if (firsts.length) console.log(`  기간: ${firsts[0].slice(0, 10)} ~ ${lasts[lasts.length - 1].slice(0, 10)}`);

    const table = (title, obj, total) => {
        const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]);
        if (!rows.length) return;
        console.log(`\n${title}`);
        for (const [k, n] of rows) {
            const pct = total ? ` (${((n / total) * 100).toFixed(1)}%)` : '';
            console.log(`  ${k}: ${n}${pct}`);
        }
    };

    table('── 액션 합계 ──', actions);
    const viewTotal = Object.values(views).reduce((s, n) => s + n, 0);
    table('── 뷰 진입 분포 (전체 대비 %) ──', views, viewTotal);

    // UX-GATE 판정 요약 — DOC-DSN-24 §4 트리거 입력
    const g = (k) => actions[k] || 0;
    const weakStarts = Object.entries(actions)
        .filter(([k]) => /^(oxdrill|combo)_start:weak$/.test(k))
        .reduce((s, [, n]) => s + n, 0);
    const drillFromReview = g('drill_from_review');
    console.log('\n── UX-GATE 판정 입력 ──');
    console.log(`  UX-GATE-01 복습 발 weak 드릴 비율: ${weakStarts ? `${drillFromReview}/${weakStarts} = ${((drillFromReview / weakStarts) * 100).toFixed(1)}%` : 'weak 모드 시작 0건'} (이관 기준 ≥60%)`);
    if (viewTotal) {
        const low = Object.entries(views).filter(([, n]) => n / viewTotal < 0.05);
        console.log(`  UX-GATE-02 저사용 표면(<5%): ${low.length ? low.map(([k, n]) => `${k} ${((n / viewTotal) * 100).toFixed(1)}%`).join(', ') : '없음'}`);
    }
    console.log(`  UX-GATE-03 PRO 배지 전환: pro_badge_click ${g('pro_badge_click')}회 · plan_compare ${g('plan_compare')}회`);
}

/** 누적 카운터 맵 차분 — 창 내 증분 (끝값 - 시작값, 음수는 0으로 클램프) */
function diffCounters(after = {}, before = {}) {
    const out = {};
    for (const k of Object.keys(after)) {
        const d = (after[k] || 0) - (before[k] || 0);
        if (d > 0) out[k] = d;
    }
    return out;
}

async function snapshotOwners() {
    const { loadEnv } = require('../lib/env.js');
    const { restGetAll } = require('../lib/supabase_ops.js');
    loadEnv();
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) {
        console.error('SUPABASE_SECRET_KEY 미설정 — 루트 .env 또는 env로 전달하세요.');
        process.exit(2);
    }
    const since = new Date(Date.now() - DAYS * 864e5).toISOString();
    const raw = await restGetAll(secret, 'usage_events',
        `select=created_at,meta,user_agent&event=eq.usage_snapshot`
        + `&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`);
    const rows = raw.filter(r => !BOT_UA_RE.test(String(r.user_agent || '')));
    if (raw.length !== rows.length) {
        console.error(`  (자동화 UA ${raw.length - rows.length}행 제외)`);
    }
    // 기기별 최초↔최신 스냅샷 차분 — 누적 카운터의 창 내 증분
    const byDevice = new Map();
    for (const r of rows) {
        const id = r.meta && r.meta.install_id;
        if (!id) continue;
        const d = byDevice.get(id) || (d_ => byDevice.set(id, d_).get(id))({ first: r, last: r });
        if (r.created_at < d.first.created_at) d.first = r;
        if (r.created_at > d.last.created_at) d.last = r;
    }
    const byOwner = new Map();
    let single = 0;
    for (const [id, d] of byDevice) {
        const isSingle = d.first.created_at === d.last.created_at;
        if (isSingle) single++;
        byOwner.set(id, {
            views: isSingle ? (d.last.meta.views || {}) : diffCounters(d.last.meta.views, d.first.meta.views),
            actions: isSingle ? (d.last.meta.actions || {}) : diffCounters(d.last.meta.actions, d.first.meta.actions),
            firstUse: (d.first.meta.first_use || d.first.created_at || '').slice(0, 10),
            lastUse: (d.last.created_at || '').slice(0, 10),
        });
    }
    if (single) {
        console.error(`  ⚠ 스냅샷 1건 기기 ${single}개 — 창 이전 누적 카운터가 포함될 수 있음`);
    }
    return byOwner;
}

async function main() {
    if (SNAPSHOT) {
        const byOwner = await snapshotOwners();
        report(byOwner, `UX-MET-05 usage_snapshot 서버 스냅샷 · 최근 ${DAYS}일 차분`);
        return;
    }
    if (!args.length) {
        console.error('사용법: node tools/check/aggregate_usage.js <파일.json... | 디렉터리> | --snapshot [--days N]');
        process.exit(2);
    }
    const files = collectFiles(args);
    const byOwner = new Map(); // owner → 최신 export
    let skipped = 0;
    for (const f of files) {
        let d;
        try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { d = null; }
        if (!isStatsExport(d)) { skipped++; console.error(`  ✗ 통계 JSON 아님: ${path.basename(f)}`); continue; }
        const owner = d.owner || `anon:${path.basename(f)}`;
        const prev = byOwner.get(owner);
        if (!prev || String(d.lastUse || '') > String(prev.lastUse || '')) byOwner.set(owner, d);
    }
    console.log(`  입력 파일: ${files.length}개 · 유효: ${byOwner.size}명(owner) · 스킵: ${skipped}개`);
    report(byOwner, 'UX-MET-03 회수물');
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
