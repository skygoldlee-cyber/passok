#!/usr/bin/env node
/**
 * coverage_gaps.js — 분기 커버리지 하위 파일 리포트 (표적 보강용)
 * @spec none (개발 보조 리포트)
 *
 * 유닛(c8)+DOM(vitest) 두 coverage-final.json을 병합해 파일별 분기 커버리지를
 * 오름차순으로 나열한다. coverage_merge.js --check가 평균 임계만 보는 반면
 * 이 리포트는 "어디를 보강해야 래칫이 오르는가"를 보여준다.
 *
 * 사용:
 *   node tools/check/coverage_gaps.js            # 하위 10개
 *   node tools/check/coverage_gaps.js --top 20   # 상위 N개로 확장
 *   node tools/check/coverage_gaps.js --dir src/views   # 경로 접두 필터
 *   node tools/check/coverage_gaps.js --json     # 머신 판독 출력
 *
 * 선행 조건: npm run coverage && npm run coverage:unit (coverage:all로 일괄)
 */

// @spec none (개발 보조 리포트)
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const libCoverage = require('istanbul-lib-coverage');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCES = [
    { name: 'DOM (vitest)', file: 'coverage/coverage-final.json' },
    { name: '유닛 (c8)', file: 'coverage-unit/coverage-final.json' },
];

const argv = process.argv.slice(2);
const argVal = (flag, dflt) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? Number(argv[i + 1]) : dflt;
};
const TOP = argVal('--top', 10);
const DIR = argv.includes('--dir') ? argv[argv.indexOf('--dir') + 1] : null;
const AS_JSON = argv.includes('--json');

const map = libCoverage.createCoverageMap();
let merged = 0;
for (const { name, file } of SOURCES) {
    const abs = path.join(ROOT, file);
    if (!existsSync(abs)) {
        console.warn(`⚠ ${name} 리포트 없음: ${file}`);
        continue;
    }
    map.merge(JSON.parse(readFileSync(abs, 'utf8')));
    merged++;
}
if (!merged) {
    console.error('병합할 커버리지가 없습니다. npm run coverage:all을 먼저 실행하세요.');
    process.exit(1);
}

const toRel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const rows = [];
for (const f of map.files()) {
    const rel = toRel(f);
    if (DIR && !rel.startsWith(DIR)) continue;
    const s = map.fileCoverageFor(f).toSummary();
    const b = s.branches;
    if (!b.total) continue; // 분기 없는 파일은 순위 의미 없음 — 제외
    rows.push({
        file: rel,
        branchPct: b.pct,
        branches: `${b.covered}/${b.total}`,
        stmtPct: s.statements.pct,
        funcPct: s.functions.pct,
    });
}
rows.sort((a, b) => a.branchPct - b.branchPct || a.file.localeCompare(b.file));

if (AS_JSON) {
    console.log(JSON.stringify(rows.slice(0, TOP), null, 2));
    process.exit(0);
}

console.log(`분기 커버리지 하위 ${Math.min(TOP, rows.length)}개 파일 (대상 ${rows.length}개, 분기 보유 파일만)\n`);
for (const r of rows.slice(0, TOP)) {
    console.log(`  ${String(r.branchPct).padStart(6)}%  ${r.branches.padStart(9)}  stmts ${String(r.stmtPct).padStart(6)}%  ${r.file}`);
}
console.log('\n💡 상향 전략 — 목록 상위 파일부터 테스트 보강 후:');
console.log('   npm run coverage:all && node tools/check/coverage_merge.js --ratchet');
