#!/usr/bin/env node
/**
 * check_doc_registry.js — 문서 ID 레지스트리·인덱스 카운트 ↔ 실물 양방향 정합
 *
 * docs/README.md "문서 ID 레지스트리" 표와 "📂 문서 구조" 트리의 카운트 주석이
 * 실제 문서와 어긋나지 않는지 검증한다. check_doc_ids.js가 파일 헤더 자체를
 * 검증하는 것과 달리, 본 검사는 **레지스트리 완전성**(선언 ID ↔ 레지스트리 행 ↔
 * 경로)과 **인덱스 신선도**(버킷별 `NN개` 주석 ↔ 실제 .md 수)를 본다 — 인덱스는
 * 수동 문서라 신규 문서 추가 시 드리프트가 발생하기 쉽다.
 *
 * 검증 항목:
 *   1. 모든 문서의 선언 ID가 레지스트리에 행으로 존재할 것
 *   2. 레지스트리 행의 첫 백틱 경로(있으면)가 존재하고, 그 파일이 같은 ID를
 *      선언할 것 — 이동 후 경로 미갱신 탐지 (`— (통합 → …)` 회수 행은 제외,
 *      `gitignore` 표기 행은 파일 부재 허용)
 *   3. 선언 ID의 레지스트리 경로가 파일 실제 위치와 다르면 불일치로 신고
 *   4. 문서 구조 트리의 버킷별 `(NN개)` 주석이 실제 .md 수와 일치할 것
 *
 * 사용법: node tools/check/check_doc_registry.js
 */

// @spec none (문서 인덱스 정합)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'docs', 'README.md');

const DOC_DIRS = ['docs', 'ref-pipeline'];
const DOC_FILES = ['AGENTS.md', 'README.md'];
const ID_RE = /^\s*>\s*\*\*문서 ID\*\*:\s*(DOC-[A-Z]+-\d+)\s*$/m;
const REGISTRY_ROW_RE = /^\|\s*(DOC-[A-Z]+-\d+)\s*\|\s*(.+?)\s*\|?\s*$/gm;
const BACKTICK_PATH_RE = /`([^`]+)`/;
const BARE_PATH_RE = /^(docs\/|content\/|ref-pipeline\/|(?:README|AGENTS|combo_review_queue)\.md)/;

// 레지스트리 셀에서 자체 경로 추출 — 백틱 인용 우선, 공백 포함 파일명은
// 무인용 경로 관례(ARC-01 선례)로 셀 전체를 경로로 취급
function cellPath(cell) {
  const t = cell.trim();
  const bm = t.match(BACKTICK_PATH_RE);
  if (bm) return bm[1];
  if (BARE_PATH_RE.test(t)) return t;
  return null;
}

// 트리 카운트 주석 ↔ 실물 대조 — 문서 순서상 첫 매칭 행을 사용 (dev/ 버킷이
// exams/<id>/ 하위 버킷보다 먼저 나온다는 트리 순서에 의존)
// exams/<id>/는 docs/exams/ 하위 디렉터리에서 동적 수집 (DA-15 — 시험 식별자 하드코딩 금지)
const COUNT_MARKERS = [
  { marker: 'dev/', dir: 'docs/dev', recursive: true },
  { marker: '수위 문서', dir: 'docs/dev', recursive: false },
  { marker: 'adr/', dir: 'docs/dev/adr', recursive: true },
  { marker: 'runbooks/', dir: 'docs/dev/runbooks', recursive: true },
  { marker: 'design/', dir: 'docs/dev/design', recursive: true },
  { marker: 'reference/', dir: 'docs/dev/reference', recursive: true },
  { marker: 'evals/', dir: 'docs/dev/evals', recursive: true },
  { marker: 'user/', dir: 'docs/user', recursive: true },
  ...fs.readdirSync(path.join(ROOT, 'docs/exams'), { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => ({ marker: `docs/exams/${e.name}/`, dir: `docs/exams/${e.name}`, recursive: true })),
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      yield* walk(p);
    } else if (e.name.endsWith('.md')) yield p;
  }
}

function countMd(relDir, recursive) {
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return 0;
  if (recursive) return [...walk(abs)].length;
  return fs.readdirSync(abs).filter(n => n.endsWith('.md')).length;
}

function docFiles() {
  const files = DOC_FILES
    .filter(f => fs.existsSync(path.join(ROOT, f)))
    .map(f => path.join(ROOT, f));
  for (const d of DOC_DIRS) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs)) files.push(...walk(abs));
  }
  const examsDir = path.join(ROOT, 'content', 'exams');
  if (fs.existsSync(examsDir)) {
    for (const e of fs.readdirSync(examsDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const docsSub = path.join(examsDir, e.name, 'docs');
      if (fs.existsSync(docsSub)) files.push(...walk(docsSub));
    }
  }
  return files;
}

function declaredId(file) {
  const m = fs.readFileSync(file, 'utf8').match(ID_RE);
  return m ? m[1] : null;
}

const issues = [];

// ── 1~3. 선언 ID ↔ 레지스트리 양방향 ────────────────────────────────
const indexText = fs.readFileSync(INDEX, 'utf8');
const registry = new Map(); // id → cell
for (const m of indexText.matchAll(REGISTRY_ROW_RE)) {
  if (!registry.has(m[1])) registry.set(m[1], m[2]);
}
if (!registry.size) issues.push({ file: 'docs/README.md', msg: '레지스트리 표를 파싱하지 못함 — `| DOC-XX-NN | 경로 |` 형식 확인' });

const declared = new Map(); // id → rel
for (const file of docFiles()) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const id = declaredId(file);
  if (!id) continue; // 헤더 누락은 check_doc_ids.js가 신고
  declared.set(id, rel);
  if (!registry.has(id)) {
    issues.push({ file: rel, msg: `선언 ID ${id}가 레지스트리에 미등록 — docs/README.md 레지스트리 행 추가 필요` });
  }
}

for (const [id, cell] of registry) {
  if (cell.trimStart().startsWith('—')) continue; // 회수·통합 행 (자체 경로 없음)
  const p = cellPath(cell);
  if (!p) continue; // 경로 표기 없는 행
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) {
    if (/gitignore|자동 생성/.test(cell)) continue; // 미커밋 생성물 경로
    issues.push({ file: 'docs/README.md', msg: `레지스트리 ${id}의 경로 부재: ${p}` });
    continue;
  }
  const actual = declaredId(abs);
  if (actual !== id) {
    issues.push({ file: 'docs/README.md', msg: `레지스트리 ${id} → ${p} 인데 그 파일의 선언 ID는 ${actual || '없음'} (이동 후 경로 미갱신?)` });
  }
}

for (const [id, rel] of declared) {
  const cell = registry.get(id);
  if (!cell || cell.trimStart().startsWith('—')) continue;
  const p = cellPath(cell);
  if (p && p !== rel) {
    issues.push({ file: rel, msg: `선언 ID ${id}의 레지스트리 경로(${p})가 실제 위치와 불일치` });
  }
}

// ── 4. 트리 카운트 주석 ↔ 실물 ─────────────────────────────────────
const structSec = indexText.split(/##\s*📂\s*문서 구조/)[1] || '';
const treeLines = structSec.split('\n').filter(l => /[├└]─/.test(l));
for (const { marker, dir, recursive } of COUNT_MARKERS) {
  const line = treeLines.find(l => l.includes(marker) && /\(\d+개/.test(l));
  if (!line) {
    issues.push({ file: 'docs/README.md', msg: `문서 구조 트리에 ${marker} 버킷의 (NN개) 카운트 주석 없음` });
    continue;
  }
  const after = line.slice(line.indexOf(marker) + marker.length);
  const cm = after.match(/\((\d+)개/);
  const actual = countMd(dir, recursive);
  if (!cm || Number(cm[1]) !== actual) {
    issues.push({ file: 'docs/README.md', msg: `트리 카운트 불일치 — ${dir} 실제 ${actual}개, 주석 ${cm ? cm[1] + '개' : '없음'}` });
  }
}

if (!issues.length) {
  console.log(`✅ 문서 레지스트리 정합 통과 — 레지스트리 ${registry.size}행·선언 ID ${declared.size}건·카운트 ${COUNT_MARKERS.length}버킷`);
  process.exit(0);
}

console.log(`⚠ 문서 레지스트리 정합 문제 ${issues.length}건 발견:\n`);
for (const i of issues) console.log(` ${i.file}\n   ✗ ${i.msg}`);
console.log('\n복구: docs/README.md 레지스트리·문서 구조 트리를 실물에 맞게 갱신 — 규약은 docs/DOC_CONVENTIONS.md §7·§9');
process.exit(1);
