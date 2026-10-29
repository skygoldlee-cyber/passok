#!/usr/bin/env node
/**
 * check_replacement_char.js — U+FFFD 치환 문자 잔존 게이트
 *
 * 배경: 에디터·도구가 UTF-8을 다루지 못해 이모지 등이 U+FFFD로 바뀐 채
 * 저장·커밋되는 사고가 반복됐다 (사용자 매뉴얼 헤딩, food 서사 마커 등).
 * FFFD는 "한때 글자였던 정보의 소실"이라 자동 복구가 불가하고, 링크/타입/
 * 린트 게이트 어디에도 걸리지 않아 커밋까지 무사 통과한다 — 유입 자체를
 * 차단하는 전용 게이트.
 *
 * 규약:
 *   - git 추적 텍스트 파일 전수 스캔 (core.quotepath=false — 한글 경로 포함)
 *   - vendor/·node_modules/ 제외 (서드파티 원문 보존)
 *   - replacement_char_baseline.json = 기존 잔재의 승계 상한
 *     · 기준선에 없는 파일에서 FFFD 발견 → 실패 (신규 유입)
 *     · 기준선 개수 초과 → 실패
 *     · 기준선 미달 감소 → 통과 + 하향 안내 (단조 감소 — check:escape 관례)
 *
 * 사용법:
 *   node tools/check/check_replacement_char.js            # 검증 (전수)
 *   node tools/check/check_replacement_char.js --ref <ref>  # 변경 파일만 스캔 (CI diff-scope)
 *   node tools/check/check_replacement_char.js --update   # 잔재 정리 후 기준선 재작성
 */

// @spec none (저장소 무결성 게이트)
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(__dirname, '..', 'state', 'replacement_char_baseline.json');

const FFFD = String.fromCodePoint(0xFFFD); // 리터럴 금지 — 이 파일 자신이 게이트에 걸리지 않도록 코드포인트 표기

// 서드파티 원문 보존 — vendor는 수정 대상이 아니므로 스캔 제외
const EXCLUDE_RE = /^(?:vendor|node_modules)\//;

function trackedTextFiles() {
  const out = (() => { const lf = require('path').join(os.tmpdir(), 'gate-lsfiles-' + process.pid + '.txt'); try { execSync('git -c core.quotepath=false ls-files > "' + lf + '"', {  cwd: ROOT, encoding: 'utf8' , shell: true }); return fs.readFileSync(lf, 'utf8'); } finally { try { fs.unlinkSync(lf); } catch {} } })();
  return out.split('\n').map((s) => s.trim()).filter((f) => f && !EXCLUDE_RE.test(f));
}

// 변경분만 스캔 — 파일이 안 바뀌면 FFFD가 새로 생길 수 없으므로 diff 대상으로 충분하다
function changedFiles(ref) {
  const lf = path.join(os.tmpdir(), 'gate-diff-' + process.pid + '.txt');
  const ls = path.join(os.tmpdir(), 'gate-status-' + process.pid + '.txt');
  try {
    execSync(`git -c core.quotepath=false diff --name-only ${ref}...HEAD > "${lf}"`, { cwd: ROOT, shell: true });
    execSync(`git -c core.quotepath=false status --porcelain > "${ls}"`, { cwd: ROOT, shell: true });
    const diff = fs.readFileSync(lf, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const unstaged = fs.readFileSync(ls, 'utf8').split('\n').map(s => s.slice(3).trim()).filter(Boolean);
    return [...new Set([...diff, ...unstaged])].filter(f => !EXCLUDE_RE.test(f));
  } finally {
    try { fs.unlinkSync(lf); } catch {}
    try { fs.unlinkSync(ls); } catch {}
  }
}

const POOL = 48; // 대형 트리 직렬 readFileSync 회피 — 동시 I/O 풀

async function scanFiles(files) {
  const counts = {};
  let i = 0;
  async function worker() {
    while (i < files.length) {
      const f = files[i++];
      let buf;
      try {
        buf = await fs.promises.readFile(path.join(ROOT, f));
      } catch {
        continue;
      }
      if (buf.includes(0x00)) continue;
      const n = (buf.toString('utf8').match(new RegExp(FFFD, 'g')) || []).length;
      if (n > 0) counts[f] = n;
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));
  return counts;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue; // _comment 등 메타 키
    out[k] = v;
  }
  return out;
}

function writeBaseline(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  const doc = {
    _comment: 'U+FFFD 잔존 승계 상한 — 여기 없는 파일의 FFFD·기준선 초과 증가는 check:enc 실패. 잔재 복구 시 --update로 함께 하향한다.',
    ...sorted,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

/** 실측 잔재 ↔ 기준선 비교 — 순수 로직 (테스트용 export).
 * scoped=true(diff 모드)면 counts에 없는 기준선 파일은 "무변경"으로 간주 — decreased 평가 생략 */
function compareCounts(counts, baseline, scoped = false) {
  const violations = [];
  const decreased = [];
  for (const [f, n] of Object.entries(counts)) {
    const limit = baseline[f];
    if (limit === undefined) violations.push(`신규 유입: ${f} (+${n}건)`);
    else if (n > limit) violations.push(`기준선 초과: ${f} (${n} > ${limit})`);
    else if (n < limit) decreased.push(`${f}: ${limit} → ${n}`);
  }
  if (!scoped) {
    for (const f of Object.keys(baseline)) {
      if (!(f in counts)) decreased.push(`${f}: ${baseline[f]} → 0 (깨끗해짐)`);
    }
  }
  return { violations, decreased };
}

async function main() {
  const update = process.argv.includes('--update');
  const refIdx = process.argv.indexOf('--ref');
  const ref = refIdx >= 0 ? process.argv[refIdx + 1] : null;
  const files = ref ? changedFiles(ref) : trackedTextFiles();
  if (ref) console.log(`  --ref ${ref} — 변경 ${files.length}개 파일만 스캔`);
  const counts = await scanFiles(files);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (update) {
    writeBaseline(counts);
    console.log(`✅ 기준선 재작성 — 파일 ${Object.keys(counts).length}개 · FFFD ${total}건`);
    return;
  }

  const baseline = loadBaseline();
  const { violations, decreased } = compareCounts(counts, baseline, !!ref);

  if (violations.length) {
    console.error(`✗ U+FFFD 치환 문자 탐지 — 인코딩 깨짐 유입 ${violations.length}건`);
    for (const v of violations) console.error(`  - ${v}`);
    console.error('  원인: 에디터·도구가 이모지 등을 U+FFFD로 변조 저장. 해당 파일을 되돌리거나 원문을 복구하세요.');
    console.error('  잔재 정리 후: node tools/check/check_replacement_char.js --update 로 기준선 하향');
    process.exit(1);
  }

  const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
  console.log(`✅ U+FFFD 게이트 통과 — 잔재 ${total}건 (기준선 ${baseTotal}건 이내, 신규 유입 0)`);
  if (decreased.length) {
    console.log('💡 기준선 하향 가능:');
    for (const d of decreased) console.log(`  - ${d}`);
    console.log('  → node tools/check/check_replacement_char.js --update');
  }
}

module.exports = { FFFD, EXCLUDE_RE, compareCounts, loadBaseline, writeBaseline };
if (require.main === module) main();
