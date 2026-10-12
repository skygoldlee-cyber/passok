#!/usr/bin/env node
/**
 * push_gate.js — pre-push 적응형 게이트 (변경 유형별 필요 단계만 실행)
 *
 * `<ref>..HEAD` diff를 분류해 문서·콘텐츠 전용 푸시는 가벼운 단계만 실행하고,
 * 로직(src/·tools/·tests/·설정 등)이 1건이라도 섞이면 기존 9단계 전체를 돌린다.
 * 분류되지 않는 파일은 보수적으로 로직으로 간주한다 (생략이 아닌 전체 폴백).
 *
 * 계층:
 *   logic   — 위 두 패턴 외 전부 (src/ tools/ tests/ css/ html/ .github/ 루트 *.js·*.json·sw.js …)
 *   docs    — docs/** · *.md
 *   content — content/** · data/**
 *
 * 사용법:
 *   node tools/check/push_gate.js [--ref origin/main] [--all]
 * 환경변수: PUSH_GATE_ALL=1 → 분류 무시하고 전체 실행
 */
// @spec none (검증 실행기)
const { spawnSync } = require('child_process');
const path = require('path');
const { findStep } = require('./steps.js');
const { runSteps } = require('./step_runner.js');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const _ri = argv.indexOf('--ref');
const REF = _ri >= 0 ? argv[_ri + 1] : 'origin/main';
const FORCE_ALL = argv.includes('--all') || process.env.PUSH_GATE_ALL === '1';

const DOCS_RE = /(^docs\/)|\.md$/i;
const CONTENT_RE = /^(content|data)\//;

/** 파일 경로 → 'logic' | 'docs' | 'content' */
function classifyFile(f) {
  if (CONTENT_RE.test(f)) return 'content';
  if (DOCS_RE.test(f)) return 'docs';
  return 'logic';
}

/**
 * 변경 파일 목록 → 실행 단계 id 집합.
 *   logic 포함·분류 불가·diff 실패 → 전체(FULL)
 *   docs만  → TRACE·SPECREFS·DOCS·DOCSYNC·TESTFIRST
 *   content(+docs 혼합) → TRACE·SPECREFS·(DOCS)·DOCSYNC·TESTFIRST
 * @param {string[]|null} files null = diff 실패 (보수적 전체)
 */
function planSteps(files) {
  if (!files || FORCE_ALL) return { tier: 'logic', ids: FULL_IDS };
  const kinds = new Set(files.map(classifyFile));
  if (kinds.has('logic')) return { tier: 'logic', ids: FULL_IDS };
  const ids = ['trace', 'specrefs'];
  if (kinds.has('docs')) ids.push('docs');
  ids.push('docsync', 'testfirst');
  return { tier: kinds.has('content') ? 'content' : 'docs', ids };
}

// ── 단계 정의 (steps.js 레지스트리 재사용 + --ref 필요 단계는 직접 선언) ──
function npmGate(id, query, desc) {
  const s = findStep(query);
  if (!s) throw new Error(`단계 레지스트리에 없음: ${query}`);
  return { id, bin: s.bin, args: s.args, shell: s.shell, desc };
}
const nodeGate = (id, script, desc) =>
  ({ id, bin: 'node', args: [script, '--ref', REF], shell: false, desc });

const STEP_DEFS = () => ({
  types:    npmGate('types', 'types', 'tsc 타입 진단'),
  trace:    npmGate('trace', 'trace', 'TRACE_MATRIX 신선도'),
  specrefs: npmGate('specrefs', 'specrefs', 'SPEC 참조·테스트 갭'),
  docs:     { id: 'docs', bin: 'node', args: ['tools/check/run.js', '--preset', 'docs', '--ref', REF], shell: false, desc: '문서 정합 (diff 스코프 단계는 변경 파일 대상)' },
  html:     npmGate('html', 'html', 'index.html 조립 신선도'),
  lint:     npmGate('lint', 'lint', 'ESLint'),
  posind:   { id: 'posind', bin: 'node', args: ['tools/check/check_position_independence.js', '--ref', REF], shell: false, desc: '교재 좌표 비의존 (ID-05)' },
  impact:   { id: 'impact', bin: 'node', args: ['tools/check/impact_tests.js', '--ref', REF, '--run'], shell: false, desc: '영향 테스트 (@spec 역산)' },
  docsync:  nodeGate('docsync', 'tools/check/check_doc_sync.js', '문서 동기화'),
  testfirst: nodeGate('testfirst', 'tools/check/check_test_first.js', '테스트 선행'),
});
const FULL_IDS = ['types', 'trace', 'specrefs', 'docs', 'html', 'lint', 'posind', 'impact', 'docsync', 'testfirst'];

function changedFiles(ref) {
  // core.quotepath=false — 비ASCII(한글) 경로가 octal 이스케이프되면 classify가 logic으로 오분류
  const r = spawnSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', `${ref}..HEAD`], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null; // ref 부재 등 — 보수적으로 전체 실행
  return r.stdout.trim().split('\n').filter(Boolean);
}

function main() {
  const files = changedFiles(REF);
  const plan = planSteps(files);
  const defs = STEP_DEFS();
  const steps = plan.ids.map((id) => defs[id]);

  console.log('═'.repeat(60));
  console.log(` pre-push 게이트 — tier:${plan.tier}${FORCE_ALL ? ' (강제 전체)' : ''} · ${steps.length}단계 병렬(4)`);
  if (files && files.length) {
    console.log(` 변경 ${files.length}개 파일 — ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' …' : ''}`);
  }
  console.log('═'.repeat(60));

  const secs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
  let blocked = null;
  runSteps(steps, {
    jobs: 4,
    cwd: ROOT,
    failFast: true,
    onResult: (r) => {
      const s = r.step;
      if (r.ok) {
        console.log(`\n▶ ${s.desc}  ✅ 통과 (${secs(r.ms)})`);
      } else {
        blocked = s;
        const tail = (r.output || '').trim().split('\n').slice(-15).join('\n');
        console.log(`\n▶ ${s.desc}  ❌ 실패 (exit ${r.status}, ${secs(r.ms)})\n${tail}`);
      }
    },
  }).then(() => {
    if (blocked) {
      console.log(`\n✗ pre-push 차단: ${blocked.id} 실패 — 우회: SKIP_PREPUSH=1 git push · 전체 강제: PUSH_GATE_ALL=1`);
      process.exit(1);
    }
    console.log(`\n✓ pre-push 통과 (tier:${plan.tier})`);
  }).catch((err) => { console.error(err); process.exit(2); });
}

if (require.main === module) main();
module.exports = { classifyFile, planSteps };
