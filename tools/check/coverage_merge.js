// tools/coverage-merge.js — 유닛(node:test + c8)과 DOM(vitest) 커버리지 병합
// @spec none (커버리지 병합)
//
// 배경: 유닛 테스트는 node:test, DOM 테스트는 vitest로 따로 실행돼
// 커버리지가 두 리포트로 갈린다. 각각 coverage-final.json(istanbul 형식)을
// 생성하고 이 스크립트가 하나로 합쳐 실질 커버리지를 출력한다.
//
// 사용:
//   npm run coverage        → coverage/coverage-final.json (vitest)
//   npm run coverage:unit   → coverage-unit/coverage-final.json (c8)
//   node tools/coverage-merge.js  → 병합 요약 + coverage-merged/ 리포트
// (npm run coverage:all 로 일괄 실행 가능)

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const SummarizerFactory = require('istanbul-lib-report/lib/summarizer-factory');
const reports = require('istanbul-reports');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCES = [
    { name: 'DOM (vitest)', file: 'coverage/coverage-final.json' },
    { name: '유닛 (c8)', file: 'coverage-unit/coverage-final.json' },
];

const map = libCoverage.createCoverageMap();
let merged = 0;
for (const { name, file } of SOURCES) {
    const abs = join(ROOT, file);
    if (!existsSync(abs)) {
        console.warn(`⚠ ${name} 리포트 없음: ${file}`);
        continue;
    }
    map.merge(JSON.parse(readFileSync(abs, 'utf8')));
    merged++;
    console.log(`✓ ${name} 병합 완료`);
}
if (merged === 0) {
    console.error('병합할 커버리지가 없습니다. npm run coverage / npm run coverage:unit을 먼저 실행하세요.');
    process.exit(1);
}

const context = libReport.createContext({
    dir: join(ROOT, 'coverage-merged'),
    coverageMap: map,
});
const tree = new SummarizerFactory(map).pkg;
tree.visit(reports.create('text'), context);
tree.visit(reports.create('html'), context);
console.log('\n📊 병합 HTML 리포트: coverage-merged/index.html');

// --check: 병합 커버리지 임계값 게이트 (vitest 단독 임계값과 별개 — 유닛+DOM 실질 커버리지)
// 기준선(2026-10-12 재설정): stmts 66.21 / branches 52.73 / funcs 65.75 / lines 71.74
//   — 2026-08-31 이후 CI 중단(npm audit 차단) 동안 임계 미달이 누적됐고, Node 24 전환으로
//     V8 브랜치 계측 방식이 달라져 기존 기준선과 비교 불가. 실측 대비 소폭 여유로 재설정.
// 2026-10-13 래칫 2차 상향 — CI glob 버그(유닛 55/1192 실행) 수정으로 실측 복원:
//   실측 stmts 69.34 / branches 65.42 / funcs 70.05 / lines 80.34, 대비 ~0.8%p 여유.
// 2026-10-13 래칫 3차 — exam-sim-review·reader-ref-links·combo-doc·textbook-edition
//   테스트 보강으로 실측 69.93/65.94/70.90/81.06, 대비 ~0.8%p로 재조임.
//   커버리지 개선 커밋 시 실측이 오르면 같은 방식(실측−0.5~0.8)으로 계속 조인다.
// 임계값은 기준선 대비 여유분으로 설정 — 상향은 언제든 가능, 하향 시 CHANGES.md에 사유 기록
const MERGED_THRESHOLDS = { statements: 69, branches: 65, functions: 70, lines: 80.3 };
if (process.argv.includes('--check')) {
    const summary = map.getCoverageSummary();
    const actual = summary.toJSON();
    const failed = [];
    for (const [metric, min] of Object.entries(MERGED_THRESHOLDS)) {
        const pct = actual[metric].pct;
        if (pct < min) failed.push(`${metric} ${pct}% < ${min}%`);
        console.log(`${pct >= min ? '✅' : '❌'} ${metric}: ${pct}% (임계값 ${min}%)`);
    }
    if (failed.length) {
        console.error(`\n병합 커버리지 임계값 미달: ${failed.join(', ')}`);
        process.exit(1);
    }
    console.log('\n✅ 병합 커버리지 임계값 통과');
}
