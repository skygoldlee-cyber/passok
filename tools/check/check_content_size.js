#!/usr/bin/env node
/**
 * check_content_size.js — 시험 팩 콘텐츠 크기 예산 게이트
 *
 * 배경: 시험 팩이 늘수록 content/exams/<id> 용량(주로 참조자료 이미지 LFS)이
 * 무제한 성장한다 — lossadj 단일 팩이 39종 길잡이 이미지로 수백 MB. 팩 증가는
 * 정상이지만 "어느 팩이 얼마나 커졌는지"를 커밋 시점에 드러내야 실수성 대용량
 * 유입(원본 PNG·미압축 자산)을 조기 차단하고 외부화 시점을 판단할 수 있다.
 *
 * 규약:
 *   - git 추적 파일만 계측 (ls-files — 미추적 PDF·생성물 제외)
 *   - LFS 파일은 포인터의 `size` 필드로 실제 객체 크기 계측 — smudge 여부·
 *     CI(sparse/포인터 체크아웃)와 무관하게 동일 수치
 *   - content_size_baseline.json 의 exams.<id>.budget_mb 초과 → 실패
 *     · 예산은 의도적 상한 — 상향이 필요하면 사유와 함께 수동 편집
 *   - 신규 시험(기준선 미등록) → 실패 + --update 안내 (예산 자동 책정)
 *   - 기준선에만 있는 시험 → 통과 + 정리 안내
 *
 * 사용법:
 *   node tools/check/check_content_size.js            # 검증
 *   node tools/check/check_content_size.js --update   # stamped_bytes 갱신·신규 시험 예산 책정
 */

// @spec none (저장소 크기 게이트)
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(__dirname, '..', 'state', 'content_size_baseline.json');
const MB = 1024 * 1024;

const LFS_PTR_RE = /^version https:\/\/git-lfs\.github\.com\/spec\/v1\n/;

/**
 * 추적 파일 {경로→실제크기} 맵 — git 객체만 사용해 작업트리 상태(sparse·미smudge)와
 * 무관하게 결정적. ls-files -s의 인덱스 sha를 cat-file --batch로 스트리밍해
 * LFS 포인터면 `size` 필드(실제 객체 크기), 아니면 blob 크기를 쓴다.
 */
function trackedSizes() {
  const lf = path.join(os.tmpdir(), 'gate-lsfiles-' + process.pid + '.txt');
  let raw;
  try {
    execSync('git -c core.quotepath=false ls-files -z -s > "' + lf + '"', { cwd: ROOT, shell: true });
    raw = fs.readFileSync(lf, 'utf8');
  } finally {
    try { fs.unlinkSync(lf); } catch {}
  }
  const entries = [];
  for (const rec of raw.split('\0')) {
    const m = rec.match(/^\d+ ([0-9a-f]{40}) \d+\t(.*)$/s);
    if (m) entries.push({ sha: m[1], path: m[2] });
  }

  // 1차: batch-check로 blob 크기만 수집 (본문 없이 헤더만 — 대량 파일에 가벼움)
  const shas = entries.map((e) => e.sha).join('\n') + '\n';
  const chk = spawnSync('git', ['cat-file', '--batch-check'], { cwd: ROOT, input: shas, maxBuffer: 256 * MB });
  if (chk.status !== 0) throw new Error('git cat-file --batch-check 실패: ' + chk.stderr);
  const cl = chk.stdout.toString('utf8').split('\n');
  const sizes = {};
  const pointerCandidates = [];
  entries.forEach((e, i) => {
    const m = (cl[i] || '').match(/^[0-9a-f]{40} blob (\d+)$/);
    if (!m) { sizes[e.path] = 0; return; } // missing 등
    const size = Number(m[1]);
    if (size <= 1024) pointerCandidates.push({ ...e, blobSize: size });
    else sizes[e.path] = size;
  });

  // 2차: 소형 blob만 본문 조회 — LFS 포인터면 `size` 필드로 실제 객체 크기 대체
  if (pointerCandidates.length) {
    const res = spawnSync('git', ['cat-file', '--batch'], {
      cwd: ROOT,
      input: pointerCandidates.map((e) => e.sha).join('\n') + '\n',
      maxBuffer: 256 * MB,
    });
    if (res.status !== 0) throw new Error('git cat-file --batch 실패: ' + res.stderr);
    const buf = res.stdout;
    let pos = 0;
    for (const e of pointerCandidates) {
      const nl = buf.indexOf(0x0a, pos);
      const hm = buf.subarray(pos, nl).toString('utf8').match(/^[0-9a-f]{40} blob (\d+)$/);
      pos = nl + 1;
      if (!hm) { sizes[e.path] = 0; continue; }
      const size = Number(hm[1]);
      const text = buf.subarray(pos, pos + size).toString('utf8');
      pos += size + 1; // 본문 + 구분 LF
      const pm = LFS_PTR_RE.test(text) ? text.match(/^size (\d+)$/m) : null;
      sizes[e.path] = pm ? Number(pm[1]) : size;
    }
  }
  return sizes;
}

/**
 * 시험별 추적 콘텐츠 크기 수집 (게이트·감사 공용).
 * @returns {Object<string,{total:number,files:number,present:boolean,byDir:Object<string,number>}>}
 */
function collectExamSizes() {
  const { getExamTargets } = require('../build/exam_targets.js');
  const targets = getExamTargets(ROOT);
  const sizes = trackedSizes();
  const out = {};
  for (const t of targets) {
    out[t.id] = { total: 0, files: 0, present: fs.existsSync(path.join(ROOT, t.contentRoot)), byDir: {} };
  }
  const rootOf = {};
  for (const t of targets) rootOf[t.contentRoot + '/'] = t.id;
  const roots = Object.keys(rootOf);
  for (const [rel, size] of Object.entries(sizes)) {
    const root = roots.find((r) => rel.startsWith(r));
    if (!root) continue;
    const owner = rootOf[root];
    if (!out[owner]) continue;
    out[owner].total += size;
    out[owner].files += 1;
    const rest = rel.slice(root.length);
    const sub = rest.includes('/') ? rest.split('/')[0] : '_root';
    out[owner].byDir[sub] = (out[owner].byDir[sub] || 0) + size;
  }
  return out;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return { exams: {} };
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function saveBaseline(base, sizes) {
  const exams = {};
  for (const [id, s] of Object.entries(sizes)) {
    const prev = base.exams && base.exams[id];
    exams[id] = {
      // 신규 시험: 현재 크기 + 25% 헤드룸을 10MB 단위로 올림 책정. 기존: 예산 유지.
      budget_mb: prev ? prev.budget_mb : Math.ceil((s.total / MB) * 1.25 / 10) * 10,
      stamped_bytes: s.total,
    };
  }
  const next = { ...base, exams };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
  return next;
}

function main() {
  const update = process.argv.includes('--update');
  const sizes = collectExamSizes();
  const base = loadBaseline();
  const declared = base.exams || {};

  if (update) {
    const next = saveBaseline(base, sizes);
    for (const [id, e] of Object.entries(next.exams)) {
      const was = declared[id];
      console.log(`  ${id}: ${(sizes[id].total / MB).toFixed(1)}MB 스탬프 · 예산 ${e.budget_mb}MB${was ? '' : ' (신규 책정)'}`);
    }
    console.log(`\n✅ content_size_baseline.json 갱신 — ${Object.keys(next.exams).length}개 시험`);
    return;
  }

  const over = [];
  const missing = [];
  const stale = [];
  for (const [id, s] of Object.entries(sizes)) {
    const e = declared[id];
    if (!e) { missing.push(id); continue; }
    if (s.total > e.budget_mb * MB) over.push({ id, actual: s.total, budget: e.budget_mb * MB });
  }
  for (const id of Object.keys(declared)) {
    if (!sizes[id]) stale.push(id);
  }

  console.log('시험 팩 콘텐츠 크기 예산 검증\n');
  const rows = Object.entries(sizes).sort((a, b) => b[1].total - a[1].total);
  for (const [id, s] of rows) {
    const e = declared[id];
    const mb = (s.total / MB).toFixed(1).padStart(8);
    if (!e) { console.log(`  ${id.padEnd(12)} ${mb}MB  ⚠ 기준선 미등록`); continue; }
    const pct = Math.round((s.total / (e.budget_mb * MB)) * 100);
    const mark = s.total > e.budget_mb * MB ? '❌' : pct >= 85 ? '⚠' : ' ';
    console.log(`  ${id.padEnd(12)} ${mb}MB / 예산 ${String(e.budget_mb).padStart(4)}MB (${pct}%) ${mark}${s.present ? '' : ' · 작업트리 부재(sparse)'}`);
  }

  for (const o of over) {
    console.error(`\n❌ ${o.id}: ${(o.actual / MB).toFixed(1)}MB > 예산 ${(o.budget / MB).toFixed(0)}MB`);
  }
  if (missing.length) console.error(`\n⚠ 기준선 미등록 시험: ${missing.join(', ')}`);
  if (stale.length) console.log(`\nℹ 기준선에만 있는 시험 (exams.json에서 제거됨 — --update로 정리): ${stale.join(', ')}`);

  if (over.length || missing.length) {
    console.error('\n  조치: 의도적 성장이면 content_size_baseline.json의 budget_mb를 사유와 함께 상향,');
    console.error('        신규 시험이면 node tools/check/check_content_size.js --update 로 예산 책정');
    process.exit(1);
  }
  console.log(`\n✅ 콘텐츠 크기 게이트 통과 — ${rows.length}개 시험 모두 예산 이내`);
}

if (require.main === module) main();
module.exports = { collectExamSizes };
