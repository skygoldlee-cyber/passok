#!/usr/bin/env node
/**
 * check_diff_coverage.js — 변경 라인 차등 커버리지 게이트 (diff coverage)
 * @spec none (품질 게이트)
 *
 * "만진 부분은 검증돼야 한다" — 전체 평균 임계(coverage_merge --check)와 별개로,
 * git diff 헝크(추가·수정 라인)에 걸린 브랜치의 커버리지를 요구한다.
 * 파일 단위 임계가 아니라 라인 단위라, 저커버 대형 파일의 소규모 편집이
 * 억울하게 차단되지 않는다 — 평균은 래칫으로, 증분은 이 게이트로 올린다.
 *
 * 임계:
 *   변경 라인의 브랜치  ≥ 80%  (--min)
 *   신규 파일(--diff-filter=A, 전 라인이 변경)  ≥ 85% (--min-new)
 *   변경 라인에 브랜치 0개 → 해당 파일 자동 통과
 *   커버리지 맵 미계측 파일 → 정보 출력, 실패 아님
 *
 * 커버리지 리포트 부재 시 스킵 (CI는 merged 게이트 직후 배치되어 리포트 존재).
 *
 * 사용:
 *   node tools/check/check_diff_coverage.js                  # origin/main 대비
 *   node tools/check/check_diff_coverage.js --ref HEAD~1     # 기준 ref 지정
 *   node tools/check/check_diff_coverage.js --min 75 --min-new 80
 */

// @spec none (품질 게이트)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const argVal = (flag, dflt) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? Number(argv[i + 1]) : dflt;
};
const REF = argv.includes('--ref') ? argv[argv.indexOf('--ref') + 1] : 'origin/main';
const MIN = argVal('--min', 80);
const MIN_NEW = argVal('--min-new', 85);

const SOURCES = [
    'coverage/coverage-final.json',
    'coverage-unit/coverage-final.json',
];

// ── 커버리지 리포트 부재 → 스킵 ────────────────────────────────────
const present = SOURCES.filter((f) => fs.existsSync(path.join(ROOT, f)));
if (!present.length) {
    console.log('ℹ 커버리지 리포트 없음 — 차등 커버리지 스킵 (npm run coverage:all 선실행 시 활성)');
    process.exit(0);
}

// ── git diff 헝크 → 파일별 추가 라인 범위 ──────────────────────────
function git(args) {
    return execSync(`git -c core.quotepath=false ${args}`, { encoding: 'utf8', cwd: ROOT }).trim();
}

/** @returns {Map<string, {ranges: [number,number][], isNew: boolean}> | null} */
function changedLineMap() {
    let diff;
    let added;
    try {
        diff = git(`diff --unified=0 ${REF} HEAD -- src/`);
        added = new Set(git(`diff --name-only --diff-filter=A ${REF} HEAD -- src/`)
            .split('\n').filter(Boolean));
    } catch { return null; }
    const map = new Map();
    let cur = null;
    for (const line of diff.split('\n')) {
        const hdr = line.match(/^\+\+\+ b\/(.+)$/);
        if (hdr) {
            cur = hdr[1];
            if (/^src\/.+\.js$/.test(cur) && !map.has(cur)) {
                map.set(cur, { ranges: [], isNew: added.has(cur) });
            } else cur = null;
            continue;
        }
        const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
        if (hunk && cur) {
            const start = Number(hunk[1]);
            const len = Number(hunk[2] || '1');
            // +a,0 은 순수 삭제 헝크 — 추가 라인 없음
            if (len > 0) map.get(cur).ranges.push([start, start + len - 1]);
        }
    }
    return map;
}

const changed = changedLineMap();
if (changed === null) {
    console.warn(`⚠ git diff ${REF}..HEAD 실패 — 스킵 (ref 미존재?)`);
    process.exit(0);
}
const targets = [...changed.entries()].filter(([f, d]) =>
    d.ranges.length && fs.existsSync(path.join(ROOT, f)));
if (!targets.length) {
    console.log(`✅ 변경 src/*.js 라인 없음 (${REF}..HEAD) — 차등 커버리지 통과`);
    process.exit(0);
}

// ── 병합 커버리지 맵 ───────────────────────────────────────────────
const libCoverage = require('istanbul-lib-coverage');
const map = libCoverage.createCoverageMap();
for (const f of present) map.merge(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')));
const byRel = new Map();
for (const f of map.files()) byRel.set(path.relative(ROOT, f).split(path.sep).join('/'), f);

const inRanges = (ranges, loc) =>
    ranges.some(([a, b]) => loc.start.line <= b && loc.end.line >= a);

// ── 변경 라인 브랜치 커버 판정 ─────────────────────────────────────
const failures = [];
const unmeasured = [];
let checked = 0;
for (const [rel, { ranges, isNew }] of targets) {
    const key = byRel.get(rel);
    if (!key) { unmeasured.push(rel); continue; }
    const fc = map.fileCoverageFor(key);
    const branchMap = fc.data.branchMap || {};
    const hits = fc.data.b || {};
    let total = 0;
    let covered = 0;
    for (const [sid, meta] of Object.entries(branchMap)) {
        if (!inRanges(ranges, meta.loc)) continue;
        const counts = hits[sid] || [];
        for (const c of counts) { total++; if (c > 0) covered++; }
    }
    if (!total) continue; // 변경 라인에 분기 없음
    checked++;
    const pct = Math.round((covered / total) * 1000) / 10;
    const min = isNew ? MIN_NEW : MIN;
    if (pct < min) {
        failures.push(`${rel} — 변경 라인 브랜치 ${covered}/${total} (${pct}%) < ${min}%${isNew ? ' (신규)' : ''}`);
    }
}

if (unmeasured.length) {
    console.log(`ℹ 커버리지 미계측 (부트스트랩·제외 영역 — 정보): ${unmeasured.join(', ')}`);
}
if (failures.length) {
    console.error(`\n❌ 변경 라인 커버리지 미달 ${failures.length}건:`);
    for (const f of failures) console.error(`   ${f}`);
    console.error(`\n기준: 변경 라인 브랜치 ≥${MIN}% · 신규 파일 ≥${MIN_NEW}%. 표적 확인: npm run coverage:gaps`);
    process.exit(1);
}
console.log(`✅ 차등 커버리지 통과 — 변경 src/*.js ${targets.length}개 중 분기 포함 ${checked}개, 변경 라인 브랜치 ≥${MIN}% (신규 ≥${MIN_NEW}%)`);
