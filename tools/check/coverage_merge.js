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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
// 2026-10-13 래칫 4차 — 부트스트랩 분모 정정(app.js·exam-data-boot.js 제외,
//   측정 불가 영역이라 커버리지 상승이 아닌 분모 정정): 실측 70.41/66.38/72.14/81.71.
//   커버리지 개선 커밋 시 실측이 오르면 같은 방식(실측−0.5~0.8)으로 계속 조인다.
// 2026-10-22 정책 조정 — 기능 추가 시 분모만 커져 임계값에 피벗하는 반복 실패를 해소하기 위해
//   여유분을 ~0.8%p → ~1.2%p로 확대 (하향 사유는 CHANGES.md 기록). 래칫 상향 규약은 유지.
// 임계값은 기준선 대비 여유분으로 설정 — 상향은 언제든 가능, 하향 시 CHANGES.md에 사유 기록
const MERGED_THRESHOLDS = { statements: 68.5, branches: 65.5, functions: 70.0, lines: 80.5 };

// 래칫 규약을 코드화 — 임계값은 실측 대비 RATCHET_MARGIN%p 여유로 유지하고 상향만 허용.
// (주석 관례 "실측−0.5~0.8"의 상한 채택 — 상향은 자유, 하향은 스크립트가 거부)
const RATCHET_MARGIN = 0.8;
const needsCoverage = ['--check', '--ratchet'].some((f) => process.argv.includes(f));
const actual = needsCoverage ? map.getCoverageSummary().toJSON() : null;

if (process.argv.includes('--ratchet')) {
    const next = {};
    const bumps = [];
    for (const [metric, min] of Object.entries(MERGED_THRESHOLDS)) {
        const pct = actual[metric].pct;
        const cand = Math.floor((pct - RATCHET_MARGIN) * 10) / 10;
        next[metric] = Math.max(min, cand); // 단조 증가 — 하향 시도는 현재값 유지
        if (next[metric] > min) bumps.push(`${metric} ${min} → ${next[metric]} (실측 ${pct}%)`);
    }
    if (!bumps.length) {
        console.log(`래칫 상향 없음 — 모든 지표가 임계값+${RATCHET_MARGIN}%p 여유 이내`);
        process.exit(0);
    }
    const f = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
    const line = `const MERGED_THRESHOLDS = { statements: ${f(next.statements)}, branches: ${f(next.branches)}, functions: ${f(next.functions)}, lines: ${f(next.lines)} };`;
    for (const b of bumps) console.log(`⬆ ${b}`);
    if (process.argv.includes('--dry-run')) {
        // 주간 워크플로(coverage-ratchet.yml) 미리보기 모드 — 파일 미변경
        console.log(`\n[dry-run] 제안 임계값: ${line}`);
        process.exit(3); // 3 = 상향 가능 신호 (워크플로가 이슈 생성 트리거로 사용)
    }
    const selfPath = fileURLToPath(import.meta.url);
    writeFileSync(selfPath, readFileSync(selfPath, 'utf8').replace(/const MERGED_THRESHOLDS = \{[^}]*\};/, line));
    console.log('\nMERGED_THRESHOLDS 갱신 완료 — 변경분 커밋 권장 (하향은 불가, 상향만 자동).');
    process.exit(0);
}

if (process.argv.includes('--check')) {
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
    // 래칫 상향 힌트 — 실측이 임계+마진 이상 여유면 상향 가능을 알림 (차단 없는 정보 출력)
    const headroom = Object.entries(MERGED_THRESHOLDS)
        .filter(([m, min]) => Math.floor((actual[m].pct - RATCHET_MARGIN) * 10) / 10 > min)
        .map(([m]) => m);
    if (headroom.length) {
        console.log(`💡 래칫 상향 가능: ${headroom.join(', ')} — node tools/check/coverage_merge.js --ratchet`);
    }
}
