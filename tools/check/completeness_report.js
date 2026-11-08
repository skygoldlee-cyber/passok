#!/usr/bin/env node
/**
 * completeness_report.js — 프로젝트 완성도 조감 리포트 (읽기 전용, 비차단)
 *
 * @spec none (측정 집계 — 게이트 아님)
 *
 * 분산된 정량 신호를 한 화면으로 합성한다 — 새 게이트가 아니라 조감 계층:
 *   ① SPEC 상태 분포 (구현 완료/부분/미구현/보류/폐기 — 비활성 제외 활성 완성도 %)
 *   ② TRACE_MATRIX 커버리지 (문서·소스·테스트·보고서 연결율 + 테스트 갭)
 *   ③ 시험 성숙도 티어 (exams.json tier 분포)
 *   ④ 테스트 규모 (test_stats.json 실측 SSOT)
 *   ⑤ 게이트 우회 텔레메트리 (gate_bypasses.jsonl 기제별 카운트 — 게이트 자체의 측정)
 *
 * 실행마다 tools/state/completeness.jsonl에 스냅샷 append (gate_bypasses 패턴 —
 * 로컬 전용·gitignore) — 직전 스냅샷과의 증감을 함께 표시해 추세를 본다.
 *
 * 사용법: npm run report:completeness  (또는 node tools/check/completeness_report.js)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; } };

const REQ_ID = /^\|\s*([A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d+[a-z]?)\s*\|/; // CO-19·UX-NAV-17·FB-01 형태

/** SPEC.md → 상태 버킷 집계 (순수 함수 — 테스트 대상) */
function specStatusDist(specText) {
    const b = { done: 0, partial: 0, notimpl: 0, conditional: 0, deferred: 0, retired: 0, other: 0, ids: 0 };
    for (const line of String(specText || '').split('\n')) {
        if (!REQ_ID.test(line)) continue;
        const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
        const status = cells[cells.length - 1] || '';
        b.ids++;
        if (/폐기|통합/.test(status)) b.retired++;
        else if (/보류/.test(status)) b.deferred++;
        else if (/조건부/.test(status)) b.conditional++;
        else if (/미구현/.test(status)) b.notimpl++;
        else if (/^✅|^구현(\s|\(|$)|구현 완료|완료/.test(status)) b.done++; // '✅'·'구현'·'구현 (날짜)' — '미구현'은 위에서 선처리·'부분 구현'은 '부'로 시작해 미해당
        else if (/부분|진행/.test(status)) b.partial++;
        else b.other++;
    }
    return b;
}

/** TRACE_MATRIX 커버리지 요약행 → 수치 (순수 함수) */
function traceSummary(traceText) {
    const m = /요구사항 (\d+)개 — 문서 연결 (\d+) · 소스 연결 (\d+) · 테스트 연결 (\d+) · 보고서 연결 (\d+)/
        .exec(String(traceText || ''));
    if (!m) return null;
    const [req, doc, src, test, rep] = m.slice(1).map(Number);
    const gapM = /참조가 없는 요구사항 (\d+)개/.exec(String(traceText));
    return { req, doc, src, test, rep, testGap: gapM ? Number(gapM[1]) : null };
}

/** exams.json → 티어 분포 */
function examTiers(examsJson) {
    const tiers = { draft: 0, pilot: 0, active: 0 };
    for (const e of examsJson?.exams || []) {
        const t = e.tier || (e.comingSoon ? 'pilot' : 'active');
        tiers[t] = (tiers[t] || 0) + 1;
    }
    return tiers;
}

/** gate_bypasses.jsonl → {gate|mechanism} 카운트 */
function bypassStats(text) {
    const out = {};
    for (const l of String(text || '').split('\n')) {
        if (!l.trim()) continue;
        try {
            const r = JSON.parse(l);
            const k = `${r.gate || '?'}:${r.mechanism || '?'}`;
            out[k] = (out[k] || 0) + 1;
        } catch { /* 무결성 손상 행 무시 */ }
    }
    return out;
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const diff = (cur, prev) => (prev === undefined || prev === null || cur === prev ? '' : ` (${cur > prev ? '+' : ''}${cur - prev})`);

function collect() {
    const spec = specStatusDist(read('docs/dev/SPEC.md') || '');
    const trace = traceSummary(read('docs/dev/TRACE_MATRIX.md') || '');
    let tiers = { draft: 0, pilot: 0, active: 0 };
    try { tiers = examTiers(JSON.parse(read('content/exams.json') || '{}')); } catch { /* 무시 */ }
    let testStats = null;
    try { const s = JSON.parse(read('tools/state/test_stats.json') || '{}'); testStats = s.counts || s; } catch { /* 무시 */ }
    const bypass = bypassStats(read('tools/state/gate_bypasses.jsonl') || '');
    const active = spec.ids - spec.retired;
    const implemented = spec.done + spec.partial * 0.5; // 부분 구현은 0.5 가중
    return {
        spec: { ...spec, active, donePct: active ? Math.round((spec.done / active) * 100) : 0, weightedPct: active ? Math.round((implemented / active) * 100) : 0 },
        trace, tiers, testStats, bypass,
    };
}

const SNAP_FILE = path.join(ROOT, 'tools/state/completeness.jsonl');

function snapshot(cur) {
    const rec = { ts: new Date().toISOString(), specDonePct: cur.spec.donePct, specWeightedPct: cur.spec.weightedPct, traceSrc: cur.trace?.src, traceTest: cur.trace?.test, testGap: cur.trace?.testGap };
    let prev = null;
    try {
        const lines = fs.readFileSync(SNAP_FILE, 'utf8').split('\n').filter(Boolean);
        prev = lines.length ? JSON.parse(lines[lines.length - 1]) : null;
    } catch { /* 첫 실행 */ }
    try { fs.mkdirSync(path.dirname(SNAP_FILE), { recursive: true }); fs.appendFileSync(SNAP_FILE, JSON.stringify(rec) + '\n'); } catch { /* 로컬 텔레메트리 실패 무시 */ }
    return prev;
}

function main() {
    const c = collect();
    const prev = snapshot(c);
    const p = (k) => (prev ? prev[k] : undefined);
    console.log('\n=== 프로젝트 완성도 조감 ===\n');
    console.log(`[SPEC] 활성 요구사항 ${c.spec.active}개 — 완료 ${c.spec.done} · 부분 ${c.spec.partial} · 미구현 ${c.spec.notimpl} · 조건부 ${c.spec.conditional} · 보류 ${c.spec.deferred} (폐기·통합 ${c.spec.retired} 제외)`);
    console.log(`       완성도: 완료율 ${c.spec.donePct}%${diff(c.spec.donePct, p('specDonePct'))} · 가중(부분=0.5) ${c.spec.weightedPct}%${diff(c.spec.weightedPct, p('specWeightedPct'))}`);
    if (c.trace) {
        console.log(`[추적] 소스 ${pct(c.trace.src, c.trace.req)}${diff(c.trace.src, p('traceSrc'))} · 테스트 ${pct(c.trace.test, c.trace.req)}${diff(c.trace.test, p('traceTest'))} · 문서 ${pct(c.trace.doc, c.trace.req)} · 보고서 ${pct(c.trace.rep, c.trace.req)} — 테스트 갭 ${c.trace.testGap ?? '?'}개${diff(c.trace.testGap, p('testGap'))}`);
    }
    console.log(`[시험] draft ${c.tiers.draft} · pilot ${c.tiers.pilot} · active ${c.tiers.active}`);
    if (c.testStats) {
        const kv = Object.entries(c.testStats).map(([k, v]) => `${k} ${v}`).join(' · ');
        console.log(`[테스트] ${kv}`);
    }
    const bp = Object.entries(c.bypass);
    console.log(`[우회] ${bp.length ? bp.map(([k, v]) => `${k}×${v}`).join(' · ') : '기록 없음'}`);
    console.log(`\n스냅샷: tools/state/completeness.jsonl (추세 비교 기준)\n`);
    return 0;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('completeness_report.js')) process.exit(main());
module.exports = { specStatusDist, traceSummary, examTiers, bypassStats, collect };
