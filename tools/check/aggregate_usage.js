#!/usr/bin/env node
/**
 * aggregate_usage.js — 회수된 사용 통계 내보내기 JSON 병합·판정 요약
 * @spec UX-MET-03
 *
 * 앱 '내 사용 통계 → 통계 복사'로 회수된 JSON 파일들을 병합해
 * Phase 2 유보 결정(UX-GATE-01~03)의 판정 입력을 출력한다.
 *
 * 사용법:
 *   node tools/check/aggregate_usage.js <파일.json... | 디렉터리>
 *   디렉터리 지정 시 그 안의 *.json을 전수 읽는다.
 *
 * 출력: 표본(owner) 수·기간, 액션 합계, 뷰 분포, UX-GATE 판정 요약.
 * 같은 owner의 파일이 여러 개면 최신(파일 내 lastUse 최대) 것만 반영한다.
 */

// @spec UX-MET-03
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (!args.length) {
    console.error('사용법: node tools/check/aggregate_usage.js <파일.json... | 디렉터리>');
    process.exit(2);
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

function isStatsExport(d) {
    return d && typeof d === 'object'
        && typeof d.views === 'object' && typeof d.actions === 'object' && typeof d.days === 'object';
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

console.log('사용 통계 병합 (UX-MET-03 회수물)');
console.log(`  입력 파일: ${files.length}개 · 유효: ${byOwner.size}명(owner) · 스킵: ${skipped}개`);
if (!byOwner.size) {
    console.error('\n유효한 통계 내보내기가 없습니다.');
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
