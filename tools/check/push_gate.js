#!/usr/bin/env node
/**
 * push_gate.js — pre-push 적응형 게이트 (변경 유형별 필요 단계만 실행)
 *
 * `<ref>..HEAD` diff를 분류해 문서·콘텐츠 전용 푸시는 가벼운 단계만 실행하고,
 * 로직(src/·tools/·tests/·설정 등)이 1건이라도 섞이면 기존 9단계 전체를 돌린다.
 * 콘텐츠 태그는 신선도 3종(drillfresh·embfresh·docbundles — 해시 비교 경량)을
 * 추가 실행한다 — 파생물 재생성 누락을 CI 이전에 차단. datafresh는 빌드 체인을
 * 실행하는 중량 단계라 pre-push에는 넣지 않는다 (build:derived로 로컬 해결).
 * 분류되지 않는 파일은 보수적으로 로직으로 간주한다 (생략이 아닌 전체 폴백).
 *
 * 계층 (태그 모델 — 파일 경로 유형별 필요 단계만 실행):
 *   content — content/** · data/**      docs — docs/** · *.md
 *   html — html/** · index.template     src — src/** · sw.js · serve.js
 *   tools — tools/**                    tests — tests/**
 *   ci — .github/workflows/**           config — package/jsconfig/eslint/vercel/…
 *   unknown — 위 어느 규칙에도 안 맞는 파일 → 전 단계 (보수적 폴백)
 *
 * 결과 캐시: 같은 HEAD+작업트리+ref+도구 버전에서 통과한 단계는 재실행을
 * 건너뛴다 (node_modules/.cache/push-gate.json). 우회: --no-cache · PUSH_GATE_NOCACHE=1
 *
 * 사용법:
 *   node tools/check/push_gate.js [--ref origin/main] [--all] [--no-cache]
 * 환경변수: PUSH_GATE_ALL=1 → 분류 무시하고 전체 실행
 */
// @spec none (검증 실행기)
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { findStep } = require('./steps.js');
const { runSteps } = require('./step_runner.js');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const _ri = argv.indexOf('--ref');
const REF = _ri >= 0 ? argv[_ri + 1] : 'origin/main';
const FORCE_ALL = argv.includes('--all') || process.env.PUSH_GATE_ALL === '1';
const NOCACHE = argv.includes('--no-cache') || process.env.PUSH_GATE_NOCACHE === '1';

const DOCS_RE = /(^docs\/)|\.md$/i;
const CONTENT_RE = /^(content|data)\//;

/** 파일 경로 → 'logic' | 'docs' | 'content' (리포트용 tier 표기 — 실제 선택은 태그 모델) */
function classifyFile(f) {
  if (CONTENT_RE.test(f)) return 'content';
  if (DOCS_RE.test(f)) return 'docs';
  return 'logic';
}

// ── 파일 태그 — 어떤 검증이 필요한지를 경로 유형으로 판정한다 ──
// 어떤 규칙에도 안 맞는 파일은 'unknown' → 전 단계 실행 (보수적 폴백)
const TAG_RULES = [
  ['content', /^(content|data)\//],
  ['html',    /^(html\/|index\.template\.html$)/],
  ['docs',    /(^docs\/)|\.md$/i],
  ['src',     /^(src\/|sw\.js|serve\.js)/],
  ['tools',   /^tools\//],
  ['tests',   /^tests\//],
  ['ci',      /^\.github\/workflows\//],
  ['config',  /(^|\/)(package\.json|eslint\.config\.[^.]+|jsconfig\.json|tsconfig\.json|vercel\.json|feature-plan\.json|manifest\.webmanifest)$|^\.githooks\//],
];

function fileTags(f) {
  const tags = TAG_RULES.filter(([, re]) => re.test(f)).map(([t]) => t);
  return tags.length ? tags : ['unknown'];
}

// ── 단계별 필요 태그 — 이 태그의 파일이 1개라도 바뀌면 그 단계를 실행한다 ──
// STEP_NEEDS에 없는 단계(impact)는 항상 실행 (자체가 변경 분석이라 경량)
// 신선도 3종은 해시 비교라 경량 — 콘텐츠 push에서 파생물 재생성 누락을
// CI 이전에 차단한다 (datafresh는 빌드 체인 실행이라 중량 → pre-push 제외)
const STEP_NEEDS = {
  types:      new Set(['src', 'tools', 'tests', 'config', 'unknown']),
  trace:      new Set(['docs', 'content', 'src', 'tools', 'tests', 'config', 'unknown']),
  specrefs:   new Set(['docs', 'content', 'src', 'tools', 'tests', 'unknown']),
  docs:       new Set(['docs', 'content', 'html', 'src', 'tools', 'config', 'ci', 'unknown']),
  html:       new Set(['html', 'unknown']),
  lint:       new Set(['src', 'tools', 'tests', 'config', 'unknown']),
  posind:     new Set(['src', 'tools', 'unknown']),
  docsync:    new Set(['docs', 'src', 'tools', 'tests', 'config', 'unknown']),
  testfirst:  new Set(['src', 'tools', 'unknown']),
  drillfresh: new Set(['content', 'unknown']),
  embfresh:   new Set(['content', 'unknown']),
  docbundles: new Set(['content', 'unknown']),
};

/**
 * 변경 파일 목록 → 실행 단계 id 집합 (태그 기반 필요 단계 선택).
 *   분류 불가(unknown)·diff 실패 → 전체(FULL)
 *   tier 표기는 리포트용 — 실제 선택은 태그→단계 필요 표.
 * @param {string[]|null} files null = diff 실패 (보수적 전체)
 */
function planSteps(files) {
  if (!files || FORCE_ALL) return { tier: 'logic', ids: FULL_IDS };
  const tagSet = new Set(files.flatMap(fileTags));
  const ids = FULL_IDS.filter((id) => {
    const needs = STEP_NEEDS[id];
    if (!needs) return true;
    for (const t of needs) if (tagSet.has(t)) return true;
    return false;
  });
  const kinds = new Set(files.map(classifyFile));
  const tier = tagSet.has('unknown') || kinds.has('logic') ? 'logic'
    : tagSet.has('content') ? 'content' : 'docs';
  return { tier, ids };
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
  posind:   { id: 'posind', bin: 'node', args: ['tools/check/check_position_independence.js', '--ref', REF], shell: false, inProcess: 'tools/check/check_position_independence.js', desc: '교재 좌표 비의존 (ID-05)' },
  impact:   { id: 'impact', bin: 'node', args: ['tools/check/impact_tests.js', '--ref', REF, '--run'], shell: false, desc: '영향 테스트 (@spec 역산)' },
  docsync:  nodeGate('docsync', 'tools/check/check_doc_sync.js', '문서 동기화'),
  testfirst: nodeGate('testfirst', 'tools/check/check_test_first.js', '테스트 선행'),
  drillfresh: npmGate('drillfresh', 'content:drillfresh', '드릴 번들 신선도'),
  embfresh:   npmGate('embfresh', 'content:embfresh', '임베딩 신선도'),
  docbundles: npmGate('docbundles', 'content:docbundles', '문서 번들 신선도'),
});
const FULL_IDS = ['types', 'trace', 'specrefs', 'docs', 'html', 'lint', 'posind', 'impact', 'docsync', 'testfirst', 'drillfresh', 'embfresh', 'docbundles'];

function changedFiles(ref) {
  // core.quotepath=false — 비ASCII(한글) 경로가 octal 이스케이프되면 classify가 logic으로 오분류
  const r = spawnSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', `${ref}..HEAD`], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null; // ref 부재 등 — 보수적으로 전체 실행
  return r.stdout.trim().split('\n').filter(Boolean);
}

// ── 결과 캐시 — 같은 입력 상태에서 통과한 단계는 재실행 생략 ──
// 서명 = HEAD + ref + 작업트리/스테이징 diff + untracked 목록 + 도구 버전.
// 커밋·애멘드·파일 편집·도구 변경 중 하나라도 다르면 서명이 갈려 재실행.
const CACHE_PATH = path.join(ROOT, 'node_modules', '.cache', 'push-gate.json');

function gitOut(args) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

function toolsStamp() {
  // 게이트 도구·설정의 최신 mtime — 도구 자체가 바뀌면 이전 통과 결과는 무의미
  let stamp = 0;
  const files = ['eslint.config.mjs', 'jsconfig.json', 'package.json'];
  const checkDir = path.join(ROOT, 'tools', 'check');
  try {
    for (const f of fs.readdirSync(checkDir)) files.push(path.join('tools', 'check', f));
  } catch { return 0; }
  for (const f of files) {
    try { stamp = Math.max(stamp, fs.statSync(path.join(ROOT, f)).mtimeMs); } catch {}
  }
  return stamp;
}

function gateSignature() {
  const h = crypto.createHash('sha256');
  h.update(gitOut(['rev-parse', 'HEAD']));
  h.update(gitOut(['rev-parse', REF]));
  h.update(gitOut(['diff', 'HEAD']));
  h.update(gitOut(['diff', '--cached']));
  h.update(gitOut(['status', '--porcelain']));
  h.update(String(toolsStamp()));
  return h.digest('hex');
}

function loadCache() {
  if (NOCACHE) return null;
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch { return null; }
}

function saveCache(sig, passedIds) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ sig, passed: passedIds, ts: Date.now() }));
  } catch { /* 캐시 기록 실패는 게이트와 무관 */ }
}

function main() {
  const files = changedFiles(REF);
  const plan = planSteps(files);
  const defs = STEP_DEFS();

  // 결과 캐시 — 같은 입력 상태에서 통과한 단계는 건너뛴다
  const sig = gateSignature();
  const cache = loadCache();
  const cachedIds = cache && cache.sig === sig ? new Set(cache.passed) : new Set();
  const skipped = plan.ids.filter((id) => cachedIds.has(id));
  const steps = plan.ids.filter((id) => !cachedIds.has(id)).map((id) => defs[id]);

  console.log('═'.repeat(60));
  console.log(` pre-push 게이트 — tier:${plan.tier}${FORCE_ALL ? ' (강제 전체)' : ''} · ${steps.length}단계 병렬(4)${skipped.length ? ` · 캐시 통과 ${skipped.length}건` : ''}`);
  if (files && files.length) {
    console.log(` 변경 ${files.length}개 파일 — ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' …' : ''}`);
  }
  for (const id of skipped) console.log(`▶ ${defs[id].desc}  ⏭ 캐시 통과 (동일 입력)`);
  console.log('═'.repeat(60));

  const secs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
  let blocked = null;
  const passedIds = [...skipped];
  runSteps(steps, {
    jobs: 4,
    cwd: ROOT,
    failFast: true,
    onResult: (r) => {
      const s = r.step;
      if (r.ok) {
        passedIds.push(s.id);
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
    saveCache(sig, passedIds);
    console.log(`\n✓ pre-push 통과 (tier:${plan.tier})`);
  }).catch((err) => { console.error(err); process.exit(2); });
}

if (require.main === module) main();
module.exports = { classifyFile, fileTags, planSteps };
