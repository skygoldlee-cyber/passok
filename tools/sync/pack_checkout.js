#!/usr/bin/env node
/**
 * pack_checkout.js — 시험 팩 선택 체크아웃 (sparse-checkout + LFS 부분 실체화)
 *
 * 배경: 시험 팩이 23개·수백 MB/팩으로 늘면서 전체 체크아웃·pull이 수십 분
 * 소요된다 (참조자료 이미지 LFS smudge). 작업 중인 팩만 작업트리에 두면
 * 클론·pull·검색 모두 가벼워진다. git 객체·LFS 캐시는 로컬에 남으므로
 * 되돌리기(--all)는 네트워크 없이 즉시 복원된다.
 *
 * 동작:
 *   - .git/info/sparse-checkout에 "전체 포함 + 미선택 팩 루트 제외" 패턴 기록
 *   - git sparse-checkout reapply로 작업트리 재적용 (미선택 팩 추적 파일 제거)
 *   - git lfs pull --include=<선택 팩> — SKIP_SMUDGE 클론이면 선택 팩의
 *     LFS 객체만 다운로드해 실체화 (이미 있으면 로컬 복사라 빠름)
 *   - 선택 해제(--all)는 sparse-checkout disable + git lfs pull 전체 실체화
 *
 * 주의:
 *   - 미선택 팩의 미추적 파일(참조자료 PDF 등)은 작업트리에 남는다 — 추적
 *     파일만 정리된다 (git 동작)
 *   - 미선택 팩은 manifest 부재로 build:data 등에서 "건너뜀" 처리된다
 *   - 미커밋 변경이 제거 대상에 있으면 git이 reapply를 거부한다 — 먼저 커밋/정리
 *
 * 사용법:
 *   node tools/sync/pack_checkout.js                    # 현재 상태
 *   node tools/sync/pack_checkout.js cosmetic insadj    # 해당 팩만 체크아웃
 *   node tools/sync/pack_checkout.js --all              # 전체 복원
 *   node tools/sync/pack_checkout.js cosmetic --no-lfs  # LFS 실체화 생략
 *   npm run pack:use -- cosmetic                        # npm 래퍼
 */

// @spec none (개발환경 체크아웃 도구)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SPARSE_FILE = path.join(ROOT, '.git', 'info', 'sparse-checkout');

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: opts.inherit ? 'inherit' : 'pipe', ...opts });
}

function examIds() {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8'));
  return (doc.exams || []).map((e) => ({ id: e.id, contentRoot: e.contentRoot || `content/exams/${e.id}` }));
}

/** 현재 sparse 상태 — 비활성이면 null, 활성이면 선택된 팩 id 배열 */
function currentSelection(exams) {
  let enabled = false;
  try { enabled = git(['config', '--get', 'core.sparseCheckout']).trim() === 'true'; } catch {}
  if (!enabled || !fs.existsSync(SPARSE_FILE)) return null;
  const pats = fs.readFileSync(SPARSE_FILE, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const excluded = new Set(pats.filter((p) => p.startsWith('!')).map((p) => p.slice(1)));
  return exams.map((e) => e.id).filter((id) => {
    const root = exams.find((e) => e.id === id).contentRoot;
    return !excluded.has(`/${root}/`) && !excluded.has(`/${root}`);
  });
}

function applySelection(exams, selected, { lfs = true } = {}) {
  const sel = new Set(selected);
  const lines = ['/*'];
  for (const e of exams) {
    if (!sel.has(e.id)) lines.push(`!/${e.contentRoot}/`);
  }
  git(['sparse-checkout', 'init', '--no-cone']);
  fs.writeFileSync(SPARSE_FILE, lines.join('\n') + '\n');
  try {
    git(['sparse-checkout', 'reapply'], { inherit: true, stdio: 'inherit' });
  } catch {
    console.error('❌ sparse-checkout 적용 실패 — 제거 대상 팩에 미커밋 변경이 있으면 먼저 커밋/정리하세요');
    process.exit(1);
  }
  if (lfs) {
    const include = selected.map((id) => `${exams.find((e) => e.id === id).contentRoot}/**`).join(',');
    try {
      git(['lfs', 'pull', `--include=${include}`], { inherit: true, stdio: 'inherit' });
    } catch {
      console.warn('⚠ git lfs pull 실패 — LFS 파일은 포인터 상태입니다 (나중에 다시 실행)');
    }
  }
}

function status(exams) {
  const sel = currentSelection(exams);
  console.log(sel === null ? '모드: 전체 체크아웃 (sparse 비활성)' : sel.length === 0 ? '모드: sparse — 선택 팩 없음' : `모드: sparse — 선택 ${sel.length}개 팩`);
  const selSet = sel === null ? null : new Set(sel);
  for (const e of exams) {
    const present = fs.existsSync(path.join(ROOT, e.contentRoot));
    const mark = selSet === null ? (present ? '✓' : '·') : selSet.has(e.id) ? '✓' : '—';
    console.log(`  ${mark} ${e.id.padEnd(12)} ${selSet !== null && !selSet.has(e.id) ? '제외됨' : present ? '체크아웃' : '미체크아웃'}`);
  }
  if (sel !== null) console.log('\n복원: npm run pack:use -- --all');
}

function main() {
  const argv = process.argv.slice(2);
  const exams = examIds();
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('사용: pack_checkout.js [<시험id>...] [--all] [--no-lfs] [--status]');
    return;
  }
  const noLfs = argv.includes('--no-lfs');
  const ids = argv.filter((a) => !a.startsWith('-'));

  if (argv.includes('--all')) {
    git(['sparse-checkout', 'disable'], { inherit: true, stdio: 'inherit' });
    if (!noLfs) {
      try { git(['lfs', 'pull'], { inherit: true, stdio: 'inherit' }); } catch { console.warn('⚠ git lfs pull 실패 — 나중에 다시 실행'); }
    }
    console.log('✅ 전체 체크아웃 복원 완료');
    return;
  }
  const FLAGS = new Set(['--all', '--no-lfs', '--status', '--help', '-h']);
  const badFlags = argv.filter((a) => a.startsWith('-') && !FLAGS.has(a));
  if (badFlags.length) {
    console.error(`알 수 없는 플래그: ${badFlags.join(', ')} (--all|--no-lfs|--status)`);
    process.exit(2);
  }
  if (!ids.length || argv.includes('--status')) {
    status(exams);
    return;
  }

  const known = new Set(exams.map((e) => e.id));
  const bad = ids.filter((id) => !known.has(id));
  if (bad.length) {
    console.error(`알 수 없는 시험 id: ${bad.join(', ')}\n사용 가능: ${[...known].join(', ')}`);
    process.exit(2);
  }
  applySelection(exams, ids, { lfs: !noLfs });
  console.log(`\n✅ 선택 체크아웃 완료 — ${ids.join(', ')} (${exams.length - ids.length}개 팩 제외)`);
  console.log('   미선택 팩은 build:data에서 자동 건너뜀 · 복원: npm run pack:use -- --all');
}

main();
