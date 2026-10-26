#!/usr/bin/env node
/**
 * audit_gate_utility.js — P2(감시·감사) 단계 효용 감사 (advisory 전용, 종료 0)
 * @spec none (감사)
 *
 * "게이트도 코드 — 발화하지 않는 감시는 유지비만 발생" 원칙으로, P2 단계별
 * 실측 신호를 모아 사장() 후보와 노이즈 후보를 구분해 보고한다.
 *
 * 신호:
 *   1) tools/state/step_runs.jsonl — 단계별 실행·실패 횟수 (run.js 텔레메트리,
 *      로컬 전용 — CI 실행은 기록되지 않아 로컬 관측치로만 해석)
 *   2) 단계 스크립트가 참조하는 tools/state/*.json 기준선 파일의 git 이력 —
 *      마지막 갱신일·윈도우 내 갱신 커밋 수 (발화→기준선 재스탬프의 흔적)
 *
 * 판정 (verdict — 참고용 휴리스틱, 차단 없음):
 *   dormant   — 윈도우 내 실행 0회 (로그 부재 시 전원 해당 가능 — 해석 주의)
 *   silent    — 실행은 되나 실패 0회 + 기준선 갱신 0회 → 발화 관측 없음, 검토 후보
 *   noisy     — 실패율 높음 또는 기준선 갱신 빈번 → 신호 대비 비용 검토 후보
 *   ok        — 그 외
 *
 * 사용: node tools/check/audit_gate_utility.js [--days N]   (npm run audit:gates)
 */

// @spec none (감사)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG = path.join(ROOT, 'tools', 'state', 'step_runs.jsonl');
const DAYS = (() => {
    const i = process.argv.indexOf('--days');
    const n = i >= 0 ? parseInt(process.argv[i + 1], 10) : 90;
    return Number.isFinite(n) && n > 0 ? n : 90;
})();

const STATE_REF_RE = /tools\/state\/([\w.-]+\.(?:json|jsonl|md))/g;

/** p2 단계별 관측치 수집 — 순수 함수(테스트용) */
function collectStepStats({ steps, runLines, now = Date.now(), days = DAYS,
    stateFilesByStep = {}, baselineInfo = {} }) {
    const cutoff = now - days * 86400e3;
    const runs = new Map();
    for (const l of runLines) {
        if (!l.trim()) continue;
        let r;
        try { r = JSON.parse(l); } catch { continue; }
        const t = new Date(r.ts).getTime();
        if (!Number.isFinite(t) || t < cutoff) continue;
        const s = runs.get(r.id) || { runs: 0, fails: 0, lastTs: 0, msSum: 0 };
        s.runs++;
        if (!r.ok) s.fails++;
        s.msSum += r.ms || 0;
        if (t > s.lastTs) s.lastTs = t;
        runs.set(r.id, s);
    }
    return steps.map((step) => {
        const st = runs.get(step.id) || { runs: 0, fails: 0, lastTs: 0, msSum: 0 };
        const files = stateFilesByStep[step.id] || [];
        let lastBaseline = 0, baselineUpdates = 0;
        for (const f of files) {
            const bi = baselineInfo[f];
            if (bi) {
                if (bi.lastTs > lastBaseline) lastBaseline = bi.lastTs;
                baselineUpdates += bi.updates || 0;
            }
        }
        const failRate = st.runs ? st.fails / st.runs : 0;
        let verdict = 'ok';
        if (st.runs === 0) verdict = 'dormant';
        else if (failRate >= 0.3 || baselineUpdates >= 6) verdict = 'noisy';
        else if (st.fails === 0 && baselineUpdates === 0) verdict = 'silent';
        return {
            id: step.id, desc: step.desc, runs: st.runs, fails: st.fails,
            failRate, lastRunTs: st.lastTs, avgMs: st.runs ? Math.round(st.msSum / st.runs) : 0,
            stateFiles: files, lastBaselineTs: lastBaseline, baselineUpdates, verdict,
        };
    });
}

function fmtDate(ts) {
    return ts ? new Date(ts).toISOString().slice(0, 10) : '—';
}

function cliMain() {
    let stepsMod;
    try { stepsMod = require('./steps.js'); } catch (e) {
        console.log(`⚠ steps.js 로드 실패 — ${e.message}`);
        process.exit(0);
    }
    const p2 = stepsMod.allSteps().filter((s) => s.prio === 'p2');
    const now = Date.now();

    const runLines = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n') : [];
    const cutoff = now - DAYS * 86400e3;

    // 단계 스크립트 → tools/state 참조 파일 매핑 (기준선 갱신 이력 추적용)
    const stateFilesByStep = {};
    for (const s of p2) {
        const script = (s.args || []).find((a) => /^tools\/.+\.js$/.test(a));
        if (!script) continue;
        try {
            const src = fs.readFileSync(path.join(ROOT, script), 'utf8');
            const files = new Set();
            for (const m of src.matchAll(STATE_REF_RE)) files.add(`tools/state/${m[1]}`);
            if (files.size) stateFilesByStep[s.id] = [...files];
        } catch { /* 읽기 실패 시 매핑 없음 */ }
    }

    // 기준선 파일 git 이력 — 추적 파일만 (step_runs.jsonl 등 미추적 로컬 산출물 제외)
    const baselineInfo = {};
    const allFiles = [...new Set(Object.values(stateFilesByStep).flat())];
    for (const rel of allFiles) {
        try {
            const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel],
                { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            if (!iso) continue;
            const cnt = execFileSync('git', ['log', `--since=${new Date(cutoff).toISOString()}`,
                '--format=%H', '--', rel],
                { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
                .split('\n').filter(Boolean).length;
            baselineInfo[rel] = { lastTs: new Date(iso).getTime(), updates: cnt };
        } catch { /* git 없는 환경 — 이력 신호 생략 */ }
    }

    const rows = collectStepStats({ steps: p2, runLines, now, days: DAYS, stateFilesByStep, baselineInfo });

    console.log(`P2 단계 효용 감사 — 최근 ${DAYS}일 윈도우 · 단계 ${rows.length}개`);
    if (!fs.existsSync(LOG)) {
        console.log('ℹ️  step_runs.jsonl 없음 — 실행 텔레메트리는 run.js 경유 실행부터 누적됨\n');
    } else {
        console.log(`ℹ️  텔레메트리는 로컬 실행 기록 — CI 실행은 미포함\n`);
    }

    const order = { dormant: 0, silent: 1, noisy: 2, ok: 3 };
    const groups = { dormant: [], silent: [], noisy: [], ok: [] };
    for (const r of rows) groups[r.verdict].push(r);

    const printRow = (r) => {
        const base = r.stateFiles.length
            ? `기준선 ${r.baselineUpdates}회 갱신·최종 ${fmtDate(r.lastBaselineTs)}` : '기준선 없음';
        console.log(`   ${r.id.padEnd(26)} 실행 ${String(r.runs).padStart(3)}회 · 실패 ${String(r.fails).padStart(2)}회`
            + ` · 최종실행 ${fmtDate(r.lastRunTs)} · ${base}`);
        console.log(`      ${' '.repeat(0)}↳ ${r.desc}`);
    };

    const LABEL = {
        dormant: '■ 미실행 (dormant) — 윈도우 내 1회도 안 돈 단계, 프리셋 편입·문서 경로 확인 후보',
        silent: '■ 미발화 (silent) — 실행됐으나 실패·기준선 갱신 0회, 신호 가치 검토 후보',
        noisy: '■ 고빈도 (noisy) — 실패율≥30% 또는 기준선 잦은 갱신, 신호 대비 비용 검토 후보',
        ok: '■ 정상 (ok)',
    };
    for (const k of ['dormant', 'silent', 'noisy', 'ok']) {
        console.log(`\n${LABEL[k]} — ${groups[k].length}개`);
        for (const r of groups[k].sort((a, b) => (order[a.verdict] - order[b.verdict]) || a.id.localeCompare(b.id))) printRow(r);
    }
    console.log('\nℹ️ advisory 리포트 — 차단 없음 (종료 0). 판정 휴리스틱은 참고용.');
    process.exit(0);
}

module.exports = { collectStepStats };

if (require.main === module) cliMain();
