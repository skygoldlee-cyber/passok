#!/usr/bin/env node
/**
 * run.js — 통합 검증 실행기 (모든 check 프리셋의 단일 진입점)
 *
 * 단계 테이블은 tools/check/steps.js 한 곳에 선언된다. 전 단계를 실행한 뒤
 * 결과를 모아 한 장짜리 리포트를 출력하므로, 한 번 실행으로 전체 실패 지점을
 * 파악할 수 있다.
 *
 * 사용법:
 *   node tools/check/run.js --preset content [--build] [--quick] [--content-only]
 *   node tools/check/run.js --preset docs         # check:docs 묶음
 *   node tools/check/run.js --preset all [--quick] # check:all — lint·types·html + docs + content
 *   node tools/check/run.js --preset ci           # check:ci — CI 게이트 로컬 재현
 *   node tools/check/run.js --step <id|스크립트명>  # 단일 단계만 실행
 *   node tools/check/run.js --list [preset]       # 단계 목록 출력
 *
 * npm 스크립트: check(본 명령 passthrough) · check:all · check:ci · check:content · check:docs
 * 종료코드: 실패 단계가 있으면 1
 */

// @spec none (검증 실행기)
const fs = require('fs');
const path = require('path');
const { PRESETS, resolveSteps, findStep, DERIVED_IDS, REMEDIES } = require('./steps.js');
const { runSteps } = require('./step_runner.js');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);

function argValue(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
}

const PRESET = argValue('--preset');
const STEP = argValue('--step');
const LIST = argv.includes('--list');
const JOBS = Math.max(1, Number(argValue('--jobs')) || 3);
const REF = argValue('--ref');
const AFFECTED = argv.includes('--affected');
const OPTS = {
  quick: argv.includes('--quick'),
  contentOnly: argv.includes('--content-only'),
  withBuild: argv.includes('--build'),
};

const USAGE = `사용법:
  node tools/check/run.js --preset <${Object.keys(PRESETS).join('|')}> [옵션]
  node tools/check/run.js --step <id|npm 스크립트명|check_파일명>
  node tools/check/run.js --list [preset]
옵션: --quick(느린 단계 생략) · --content-only(콘텐츠 추적 단계만) · --build(build:data 선실행)
      --jobs N(병렬도, 기본 3 — 1이면 순차) · --ref <ref>(diff 스코프 단계만 변경 파일 대상)
      --affected(유닛 테스트를 영향 분석 권장 세트로 교체 — 로컬 빠른 재현)`;

if (LIST) {
  const names = [PRESET || argv[argv.indexOf('--list') + 1]].filter(Boolean);
  const presets = names.length ? names : Object.keys(PRESETS);
  for (const name of presets) {
    let steps;
    try { steps = resolveSteps(name, OPTS); } catch (e) { console.log(`✗ ${e.message}`); process.exit(1); }
    console.log(`\n[${name}] 프리셋 — ${steps.length}단계`);
    for (const s of steps) console.log(`  ${s.id.padEnd(22)} [${(s.prio || 'p1').toUpperCase()}] [${s.layer}] ${s.desc}`);
  }
  process.exit(0);
}

let steps;
let heading;
if (STEP) {
  const s = findStep(STEP);
  if (s) {
    steps = [s];
  } else {
    // 레지스트리 미등록 명령은 npm 스크립트 존재 시 그대로 위임
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const name = pkg.scripts?.[STEP] ? STEP : pkg.scripts?.[`check:${STEP}`] ? `check:${STEP}` : null;
    if (!name) {
      console.log(`✗ 알 수 없는 단계: ${STEP}\n\n${USAGE}`);
      process.exit(1);
    }
    const { npmStep } = require('./steps.js');
    steps = [npmStep(`step:${name}`, name, '단일', `npm 스크립트 직접 실행 — ${name}`)];
  }
  heading = `단일 단계 실행 — ${steps[0].id}`;
} else if (PRESET) {
  try { steps = resolveSteps(PRESET, OPTS); } catch (e) { console.log(`✗ ${e.message}\n\n${USAGE}`); process.exit(1); }
  heading = `검증 실행 — preset:${PRESET}`
    + (OPTS.withBuild ? ' (build:data 선실행)' : '')
    + (OPTS.quick ? ' [quick]' : '')
    + (OPTS.contentOnly ? ' [content-only]' : '')
    + (AFFECTED ? ' [affected]' : '');
} else {
  console.log(USAGE);
  process.exit(1);
}

// --ref 지정 시 diff 스코프 단계만 변경 파일 대상으로 축소 (npm 단계는 `--` 경유 인자)
const execSteps = steps.map((s) => {
  if (!s.diffScoped || !REF) return s;
  return { ...s, args: s.shell ? [...s.args, '--', '--ref', REF] : [...s.args, '--ref', REF] };
}).map((s) => {
  // --affected: 유닛 테스트 단계를 영향 분석 권장 테스트로 교체 (로컬 빠른 재현, CI는 전수 유지)
  if (!AFFECTED || !/(^|:)unit$/.test(s.id)) return s;
  return { ...s, bin: 'node', shell: false,
    args: ['tools/check/impact_tests.js', '--ref', REF || 'origin/main', '--run'],
    desc: `${s.desc} (영향 테스트만)` };
});

console.log('═'.repeat(60));
console.log(` ${heading}`);
console.log('═'.repeat(60));

const secs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
const finished = runSteps(execSteps, {
  jobs: JOBS,
  cwd: ROOT,
  onResult: (r) => {
    const label = `[${r.step.layer}] ${r.step.desc}`;
    console.log(`\n▶ ${label}\n${r.ok ? `  ✅ 통과 (${secs(r.ms)})` : `  ❌ 실패 (exit ${r.status}, ${secs(r.ms)})`}`);
  },
});

finished.then((ran) => {
const results = ran.map((r) => ({ step: r.step, label: `[${r.step.layer}] ${r.step.desc}`, ok: r.ok, output: r.output, ms: r.ms }));

console.log('\n' + '═'.repeat(60));
console.log(' 검증 리포트');
console.log('═'.repeat(60));

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(` ${r.ok ? '✅' : '❌'} ${r.label}`);
  // 귀속 단계는 정보 보고: 불일치 건수를 별도 표시 (교재 교체 후 증가하면 재검토)
  if (r.label.startsWith('[귀속]')) {
    const m = r.output.match(/불일치 (\d+)건/);
    if (m) console.log(`    ℹ 규칙↔인용 불일치 ${m[1]}건 — 상세: node tools/check/check_ref_subjects.js`);
  }
}

// 소요시간 요약 — 단계 합계(병렬이므로 벽시계 아님) + 최다 소요 TOP 5.
// 새 단계 추가·스크립트 변경 후 실행시간 회귀를 여기서 잡는다
const totalMs = results.reduce((a, r) => a + (r.ms || 0), 0);
const slowest = [...results].sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 5);
console.log(`\n ⏱ 단계 합계 ${secs(totalMs)} — 최다 소요:`);
for (const r of slowest) console.log(`    ${secs(r.ms || 0).padStart(7)}  ${r.label}`);

if (!failed.length) {
  console.log(`\n🎉 전 단계 통과 (${results.length}단계)`);
  process.exit(0);
}

// audit 프리셋은 감시·감사 전용 — 실패를 리포트하되 종료코드는 0 (비차단)
if (PRESET === 'audit') {
  console.log(`\nℹ️ 감시 리포트 — 지표 이상 ${failed.length}건 (차단 없음)`);
  for (const r of failed) {
    const tail = r.output.trim().split('\n').slice(-8).join('\n');
    console.log(`─ ${r.label} ${'─'.repeat(40)}\n${tail}\n`);
  }
  process.exit(0);
}

// 근본원인 그룹핑 — 파생물 미재생성은 여러 신선도 단계의 공통 원인 (중복 실패 묶음)
const derivedFail = failed.filter((r) => DERIVED_IDS.has(r.step.id));
if (derivedFail.length) {
  console.log(`\n💡 신선도 계열 실패 ${derivedFail.length}건 — 파생물 미재생성이 공통 원인일 수 있습니다:`);
  console.log('   npm.cmd run build:derived   # html·data·drills·docs_md·trace·stats 일괄 재생성 → 커밋 → 재실행');
}
for (const r of failed) {
  const tip = REMEDIES[r.step.id];
  if (tip) console.log(`💡 ${r.label} → ${tip}`);
}

console.log(`\n⚠ 실패 ${failed.length}건 — 실패 단계의 출력 끝부분:\n`);
for (const r of failed) {
  const tail = r.output.trim().split('\n').slice(-15).join('\n');
  console.log(`─ ${r.label} ${'─'.repeat(40)}\n${tail}\n`);
}
process.exit(1);
}).catch((err) => { console.error(err); process.exit(2); });
