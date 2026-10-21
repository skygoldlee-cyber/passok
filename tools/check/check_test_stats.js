#!/usr/bin/env node
/**
 * check_test_stats.js — 문서의 테스트 수치 인용 ↔ 실측 정합 게이트
 *
 * 배경: README·TESTING.md의 "N unit tests" 같은 고정 수치는 테스트 추가로
 * 스테일이 되지만, 경로·명령 정합 체크로는 잡히지 않았다.
 *
 * 구조:
 *   test_stats.json — 실측 SSOT (`npm run stats:stamp`이 갱신)
 *   기본 실행        — ① 정적 카운트(test(·it( 호출 부지) vs SSOT ±12% 드리프트 게이트
 *                      ② 문서 인용 수치 vs SSOT 밴드 [0.80×, 1.05×] 검증
 *   --stamp          — 실측(러너 실행/목록) → SSOT·문서 수치 일괄 재스탬프
 *
 * 밴드가 잡는 것은 "총체적 스테일"(687 인용 vs 실측 1256)이고 소폭 드리프트는
 * 의도적으로 허용 — 수치 표기는 `N+` 바닥 표기로 유지해 성장에 강하게 만든다.
 *
 * 사용법:
 *   npm run check:teststats     # 검증만 (check:docs 단계)
 *   npm run stats:stamp         # 실측 재측정 → test_stats.json + 문서 수치 갱신
 */

// @spec none (문서 수치 정합)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATS_FILE = path.join(ROOT, 'tools', 'state', 'test_stats.json');

// 인용 수치 스캔 대상 — "현재 상태"를 서술하는 문서만 지정.
// CHANGES·설계·이력 문서의 과거 시점 수치는 스테일이 아니라 기록이므로 제외.
const CLAIM_DOCS = ['README.md', 'docs/dev/reference/TESTING.md'];

// 정적 카운트 밴드 — |static − recorded| / recorded ≤ 이 값이면 신선
const STATIC_DRIFT = 0.12;
// 문서 인용 밴드 — 인용값이 [recorded×LO, recorded×HI] 밖이면 스테일
const CLAIM_LO = 0.80;
const CLAIM_HI = 1.05;

// 수치 인용 패턴 — 캡처 그룹 num = 인용된 수치. metric = 비교 대상 SSOT 키.
// 새 인용 형식이 생기면 여기에 추가 — 미등록 형식의 고정 수치는 탐지 밖이다.
const CLAIM_PATTERNS = [
  { metric: 'unit',         re: /(?<num>\d[\d,]*)\s*\+?\s*unit tests\b/gi },
  { metric: 'dom',          re: /(?<num>\d[\d,]*)\s*\+?\s*DOM tests\b/g },
  { metric: 'e2eScenarios', re: /(?<num>\d[\d,]*)\s*\+?\s*E2E tests\b/g },
  // TESTING.md 피라미드 표 — `| **Unit** | ... | glob | N |` (첫 숫자 셀 = 카운트)
  { metric: 'unit',         re: /\*\*Unit\*\*\s*\|(?:[^|\n]*\|){3}\s*(?<num>\d[\d,]*)\s*\+?\s*\|/g },
  { metric: 'dom',          re: /\*\*DOM\*\*\s*\|(?:[^|\n]*\|){3}\s*(?<num>\d[\d,]*)\s*\+?\s*\|/g },
  { metric: 'e2eScenarios', re: /\*\*E2E\*\*\s*\|(?:[^|\n]*\|){3}\s*(?<num>\d[\d,]*)\s*\+?\s*\|/g },
  { metric: 'e2eScenarios', re: /(?<num>\d[\d,]*)\s*시나리오/g },
  { metric: 'e2eFiles',     re: /(?<num>\d[\d,]*)\s*개\s*spec\s*파일/g },
  // 피라미드 표 합계 행 — `| **합계** | | | | **N** |` (total은 unit+dom+e2e 파생)
  { metric: 'total',        re: /\*\*합계\*\*\s*\|(?:[^|\n]*\|){3}\s*\*\*(?<num>\d[\d,]*)\+?\*\*\s*\|/g },
];

// 테스트 호출 부지 — `test(`/`it(`를 세되 `.` 수신자(test.skip·정규식.test())는 제외
const CALLSITE_RE = /(?:^|[^\w$.])(?:test|it)\s*\(/gm;

function* walk(dir, re) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { yield* walk(p, re); continue; }
    if (re.test(e.name)) yield p;
  }
}

/** 정적 카운트 — 러너 실행 없는 저비용 측정 (unit은 루프 생성 케이스를 과소 계상) */
function staticCounts() {
  const countSites = (dir, fileRe) => {
    let n = 0;
    for (const f of walk(dir, fileRe)) {
      const src = fs.readFileSync(f, 'utf8');
      n += (src.match(CALLSITE_RE) || []).length;
    }
    return n;
  };
  const e2eFiles = [...walk(path.join(ROOT, 'tests', 'e2e'), /\.spec\.js$/)].length;
  return {
    unit: countSites(path.join(ROOT, 'tests', 'unit'), /\.test\.js$/),
    dom: countSites(path.join(ROOT, 'tests', 'dom'), /\.test\.js$/),
    e2eScenarios: countSites(path.join(ROOT, 'tests', 'e2e'), /\.spec\.js$/),
    e2eFiles,
    e2eRuns: null, // 정적으로는 시나리오×프로젝트 수 산출 불가 — 실측 전용
  };
}

/** 실측 — 스탬프 전용 (유닛 ~6s·vitest list ·playwright --list) */
function measure() {
  const run = (args) => execFileSync(process.execPath, args,
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });

  const unitOut = run(['--test', 'tests/unit/**/*.test.js']);
  const unit = Number(unitOut.match(/ℹ tests (\d+)/)?.[1]);

  const domOut = run(['node_modules/vitest/vitest.mjs', 'list']);
  const dom = domOut.split('\n').filter((l) => l.startsWith('tests/')).length;

  const e2eOut = run(['node_modules/playwright/cli.js', 'test', '--list']);
  const em = e2eOut.match(/Total:\s*(\d+)\s*tests\s*in\s*(\d+)\s*files/);

  const st = staticCounts();
  const stats = {
    unit, dom,
    e2eScenarios: st.e2eScenarios, // 시나리오 = test( 선언 부지 수 (실행 수는 프로젝트 배수)
    e2eRuns: em ? Number(em[1]) : null,
    e2eFiles: em ? Number(em[2]) : st.e2eFiles,
    measuredAt: new Date().toISOString().slice(0, 10),
  };
  for (const k of ['unit', 'dom', 'e2eScenarios', 'e2eFiles']) {
    if (!Number.isFinite(stats[k])) throw new Error(`실측 실패: ${k} — 러너 출력 파싱 불가`);
  }
  return stats;
}

/** 스탬프 바닥값 — 성장 여유를 남긴 하한 표기(≥1000→50 단위, ≥100→10, <100→그대로) */
function claimFloor(v) {
  if (v >= 1000) return Math.floor(v / 50) * 50;
  if (v >= 100) return Math.floor(v / 10) * 10;
  return v;
}
const fmt = (v) => v.toLocaleString('en-US');
const parseNum = (s) => Number(s.replace(/,/g, ''));

function* corpus() {
  for (const f of CLAIM_DOCS) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) yield abs;
  }
}

/** 문서 코퍼스의 수치 인용 수집 → [{file, line, metric, claim, text}] */
function collectClaims() {
  const claims = [];
  for (const file of corpus()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      for (const { metric, re } of CLAIM_PATTERNS) {
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) {
          if (m.groups?.num) claims.push({ file, rel, line: i + 1, metric, claim: parseNum(m.groups.num), text: text.trim() });
        }
      }
    });
  }
  return claims;
}

// ── 기본 모드: 검증 ─────────────────────────────────────────────────
if (!process.argv.includes('--stamp')) {
  if (!fs.existsSync(STATS_FILE)) {
    console.error('test_stats.json 없음 — npm run stats:stamp으로 최초 측정하세요.');
    process.exit(1);
  }
  const rec = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  rec.total = rec.unit + rec.dom + rec.e2eScenarios; // 합계 인용 비교용 파생값
  const st = staticCounts();
  const issues = [];

  console.log(`테스트 수치 정합 (SSOT 측정일 ${rec.measuredAt})`);
  for (const k of ['unit', 'dom', 'e2eScenarios', 'e2eFiles']) {
    const drift = Math.abs(st[k] - rec[k]) / rec[k];
    const ok = drift <= STATIC_DRIFT;
    console.log(`  ${ok ? '✅' : '❌'} ${k}: 정적 ${st[k]} vs 기록 ${rec[k]} (드리프트 ${(drift * 100).toFixed(1)}%)`);
    if (!ok) issues.push(`${k}: 정적 카운트가 기록 대비 ${(drift * 100).toFixed(0)}% 편차 — npm run stats:stamp으로 재측정`);
  }

  const claims = collectClaims();
  let stale = 0;
  for (const c of claims) {
    const r = c.claim / rec[c.metric];
    if (r < CLAIM_LO || r > CLAIM_HI) {
      stale++;
      issues.push(`${c.rel}:${c.line} — "${c.claim}" 인용이 ${c.metric} 기록(${rec[c.metric]})의 ${(r * 100).toFixed(0)}% — 수치 갱신 필요`);
    }
  }
  console.log(`  문서 인용 검사: ${claims.length}건 중 스테일 ${stale}건`);

  if (issues.length) {
    console.error('\n실패 — 수치 스테일:');
    for (const i of issues) console.error(`  ✗ ${i}`);
    process.exit(1);
  }
  console.log('\n통과 — SSOT 신선 + 문서 인용 밴드 이내.');
  process.exit(0);
}

// ── --stamp: 실측 → SSOT + 문서 수치 재기록 ─────────────────────────
console.log('테스트 수치 실측 중 (unit 실행 + vitest list + playwright --list)…');
const m = measure();
// 스탬프 대상 수치 — `N+` 바닥 표기 (metric별 바닥값)
const total = m.unit + m.dom + m.e2eScenarios;
const floors = { unit: `${fmt(claimFloor(m.unit))}+`, dom: `${fmt(claimFloor(m.dom))}+`,
  e2eScenarios: `${fmt(claimFloor(m.e2eScenarios))}+`, e2eFiles: `${fmt(claimFloor(m.e2eFiles))}+`,
  total: `${fmt(claimFloor(total))}+` };
console.log(`  실측 unit ${m.unit} / dom ${m.dom} / e2e ${m.e2eScenarios} 시나리오 (${m.e2eFiles} spec, ${m.e2eRuns} runs)`);

fs.writeFileSync(STATS_FILE, JSON.stringify(m, null, 2) + '\n');
console.log(`  SSOT 갱신: ${path.relative(ROOT, STATS_FILE)}`);

// 문서 인용 재기록 — 인용 수치를 `바닥값+` 표기로 통일 교체
let touched = 0;
for (const file of corpus()) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;
  for (const { metric, re } of CLAIM_PATTERNS) {
    if (floors[metric] === undefined) continue;
    re.lastIndex = 0;
    src = src.replace(re, (whole, ...rest) => {
      const g = rest.find((r) => typeof r === 'object' && r && 'num' in r);
      if (!g?.num) return whole;
      // 숫자(+직후의 기존 '+')만 교체 — 뒤따르는 공백·글자는 보존
      return whole.replace(new RegExp(`${g.num}\\+?`), floors[metric]);
    });
  }
  if (src !== orig) { fs.writeFileSync(file, src); touched++; }
}
console.log(`  문서 수치 스탬프 완료 — 파일 ${touched}개 갱신 (인용은 'N+' 바닥 표기로 통일)`);
console.log('완료 — npm run check:teststats으로 결과 확인.');
