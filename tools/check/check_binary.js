#!/usr/bin/env node
/**
 * check_binary.js — 대형·외부화 대상 바이너리 신규 유입 게이트
 *
 * 배경: 참조자료 PDF·교재 이미지 등 대형 바이너리가 git 이력에 누적돼
 * 저장소가 비대해지는 사고를 겪었다 (filter-repo 이력 재작성으로 정리,
 * 2026-10-22). 외부화·포맷 정책이 정착되려면 "신규 유입"을 커밋 전에
 * 차단하는 게이트가 필요하다.
 *
 * 규칙:
 *   R1 참조자료 PDF — content/**\/참조자료/**\/*.pdf 신규 추가 금지
 *        (외부 호스팅 자산, DOC-RBK-12 — 릴리스 에셋으로 올리고 매니페스트 스탬프)
 *   R2 대형 바이너리 — 이미지·폰트·미디어·압축 신규 파일이 SIZE_LIMIT 초과 금지
 *        (교재 이미지는 webp 변환, 폰트·미디어는 vendor/외부 호스팅 검토)
 *   면제: binary_allowlist.json 명단 · tests/e2e 스냅샷 · icons/
 *   ※ 기존 추적 파일의 수정·삭제는 대상 아님 — 신규 추가(diff-filter=A)만 검사
 *
 * 스코프:
 *   (기본)     미추적 신규 파일 (git status ??)
 *   --staged   스테이징 추가분 (pre-commit)
 *   --ref <r>  r..HEAD 추가분 (pre-push·CI diffScoped)
 *
 * 사용법:
 *   node tools/check/check_binary.js [--staged|--ref <ref>]
 *   npm.cmd run check:binary
 */

// @spec none (저장소 위생 게이트)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ALLOWLIST_PATH = path.join(ROOT, 'tools', 'state', 'binary_allowlist.json');

const SIZE_LIMIT = 500 * 1024; // 500KB
const PDF_RE = /^content\/[^/]+\/[^/]+\/참조자료\/.+\.pdf$/i;
const BINARY_RE = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|eot|mp3|wav|ogg|mp4|webm|pdf|zip|7z|tar|gz)$/i;
// 명명 규약으로 대형 파일이 불가피한 경로
const EXEMPT_RE = /^tests\/e2e\/[^\n]*-snapshots\/|^icons\//;

const argv = process.argv.slice(2);
const ri = argv.indexOf('--ref');
const REF = ri >= 0 ? argv[ri + 1] : null;
const STAGED = argv.includes('--staged');

let allowlist = new Set();
try {
  allowlist = new Set(JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8')).files || []);
} catch { /* 명단 없으면 공집합 */ }

function gitOut(args) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

/** 검사 대상 신규 파일 목록 */
function addedFiles() {
  if (STAGED) {
    return gitOut(['diff', '--cached', '--name-only', '--diff-filter=A'])
      .split('\n').filter(Boolean);
  }
  if (REF) {
    return gitOut(['diff', '--name-only', '--diff-filter=A', `${REF}..HEAD`])
      .split('\n').filter(Boolean);
  }
  // 미추적 신규 파일 (untracked)
  return gitOut(['status', '--porcelain', '--untracked-files=all'])
    .split('\n').map((l) => l.startsWith('?? ') ? l.slice(3).trim().replace(/^"|"$/g, '') : '')
    .filter(Boolean);
}

const files = addedFiles();
const issues = [];

// R1 보강: 참조자료 PDF는 gitignore 처리돼 untracked 목록에 나타나지 않으므로
// 기본 모드에서는 "이미 추적된" 참조자료 PDF도 함께 검사한다 (git add -f 강행 탐지)
if (!STAGED && !REF) {
  for (const f of gitOut(['ls-files', 'content/**/참조자료/**/*.pdf']).split('\n').filter(Boolean)) {
    if (!allowlist.has(f)) issues.push(`${f} — 참조자료 PDF가 추적 상태 (DOC-RBK-12 위반). git rm --cached로 추적 해제 후 릴리스 에셋으로 이전`);
  }
}

for (const f of files) {
  if (EXEMPT_RE.test(f) || allowlist.has(f)) continue;

  if (PDF_RE.test(f)) {
    issues.push(`${f} — 참조자료 PDF는 외부 호스팅 대상 (DOC-RBK-12). 릴리스 에셋 업로드 + pdf_hashes.json 스탬프로 진행`);
    continue;
  }

  if (!BINARY_RE.test(f)) continue;
  const abs = path.join(ROOT, f);
  let size = 0;
  try { size = fs.statSync(abs).size; } catch { continue; } // 스테이징 삭제 등
  if (size > SIZE_LIMIT) {
    issues.push(`${f} — ${(size / 1048576).toFixed(1)}MB 대형 바이너리 신규 유입 (>500KB). 포맷 전환(webp)·외부 호스팅·binary_allowlist.json 사유 등록 중 선택`);
  }
}

const scope = STAGED ? '--staged' : REF ? `--ref ${REF}` : '미추적 파일';
if (!issues.length) {
  console.log(`✅ 바이너리 유입 게이트 — 신규 파일 ${files.length}개 검사 (${scope}), 위반 없음`);
  process.exit(0);
}

console.log(`⚠ 바이너리 유입 위반 ${issues.length}건 (${scope}):\n`);
for (const i of issues) console.log(`  ✗ ${i}`);
console.log('\n정책: docs/dev/runbooks/REF_PDF_EXTERNALIZATION.md · 이미지는 webp 우선');
process.exit(1);
