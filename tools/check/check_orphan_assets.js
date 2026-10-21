#!/usr/bin/env node
/**
 * check_orphan_assets.js — 고아 자산(미참조 파일) 게이트
 *
 * 배경: 교체·개정 과정에서 참조가 사라진 자산이 저장소에 남는 사고가
 * 반복됐다 (콘티 교체 후 잔존한 구 스토리보드 PNG ~1MB, webp 이관 후
 * 잔존한 삽화 PNG 3건). 파일이 존재해도 아무 데서도 참조되지 않으면
 * 저장소 용량과 인지 부하만 늘어난다 — 유입 자체를 차단하는 전용 게이트.
 *
 * 규약:
 *   - git 추적 자산 파일(이미지·폰트·미디어·PDF) 전수 스캔
 *     (core.quotepath=false — 한글 경로 포함)
 *   - 참조 판정: 다른 추적 파일의 텍스트에 베이스명이 등장하면 참조된 것.
 *     SVG 등 텍스트 자산 내부의 참조(<image href>)도 인정한다.
 *   - EXEMPT_RE: 명명 규약으로 참조가 결정되는 경로는 기계 검사 대상 아님
 *     · tests/e2e/*-snapshots/ — Playwright 스냅샷 규약
 *     · **\/_archive/** — 의도적 보존 아카이브
 *   - orphan_assets_baseline.json = 사유가 있는 개별 예외 승계 명단
 *     · 명단에 없는 미참조 자산 발견 → 실패 (신규 고아 유입)
 *     · 명단 파일이 삭제·참조 회복 → 통과 + 명단 정리 안내
 *
 * 사용법:
 *   node tools/check/check_orphan_assets.js            # 검증
 *   node tools/check/check_orphan_assets.js --update   # 예외 명단 재작성
 */

// @spec none (저장소 무결성 게이트)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(__dirname, '..', 'state', 'orphan_assets_baseline.json');

const ASSET_RE = /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|mp3|wav|ogg|mp4|webm|pdf)$/i;

// 명명 규약으로 참조가 결정되는 경로 — 파일명 검색으로는 찾을 수 없어 검사 제외
const EXEMPT_RE = /(?:^|\/)_archive\/|tests\/e2e\/[^\n]*-snapshots\//;

function trackedFiles() {
  const out = execSync('git -c core.quotepath=false ls-files', { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function isText(file) {
  try {
    return !fs.readFileSync(path.join(ROOT, file)).includes(0x00);
  } catch {
    return false; // 읽기 실패(삭제 예정 등)는 텍스트 취급하지 않음
  }
}

/** 코퍼스에서 미참조 자산을 분류 — 순수 로직 (테스트용 export) */
function collectOrphans(assets, corpus) {
  const orphans = [];
  for (const a of assets) {
    const base = a.split('/').pop();
    let refd = false;
    for (const [f, t] of corpus) {
      if (f !== a && t.includes(base)) { refd = true; break; }
    }
    if (!refd) orphans.push(a);
  }
  return orphans;
}

function findOrphans() {
  const files = trackedFiles();
  const assets = files.filter((f) => ASSET_RE.test(f) && !EXEMPT_RE.test(f));
  // 코퍼스 = 텍스트로 읽히는 추적 파일 전체 (svg 같은 텍스트 자산도 참조 주체가 될 수 있다)
  const corpus = new Map();
  for (const f of files) {
    if (isText(f)) corpus.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));
  }
  return { orphans: collectOrphans(assets, corpus), assetCount: assets.length };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    out[k] = v;
  }
  return out;
}

function writeBaseline(orphans) {
  const doc = { _comment: '미참조 자산 예외 승계 명단 — 여기 없는 고아 자산은 check:orphans 실패. 값은 보존 사유.' };
  for (const f of orphans.sort()) doc[f] = '사유를 기입하세요';
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

/** 미참조 자산 ↔ 예외 명단 비교 — 순수 로직 (테스트용 export) */
function compareOrphans(orphans, baseline) {
  const violations = [];
  const resolved = [];
  for (const f of orphans) {
    if (f in baseline) continue;
    violations.push(`미참조 자산: ${f}`);
  }
  for (const f of Object.keys(baseline)) {
    if (!orphans.includes(f)) resolved.push(`${f} — 참조 회복 또는 파일 삭제됨`);
  }
  return { violations, resolved };
}

function main() {
  const update = process.argv.includes('--update');
  const { orphans, assetCount } = findOrphans();

  if (update) {
    writeBaseline(orphans);
    console.log(`✅ 예외 명단 재작성 — 자산 ${assetCount}개 · 미참조 ${orphans.length}건 (사유 기입 필요)`);
    return;
  }

  const baseline = loadBaseline();
  const { violations, resolved } = compareOrphans(orphans, baseline);

  if (violations.length) {
    console.error(`✗ 고아 자산 탐지 — 미참조 자산 ${violations.length}건`);
    for (const v of violations) console.error(`  - ${v}`);
    console.error('  조치: 불필요하면 파일을 삭제하고, 의도적 보존이면 사유를 orphan_assets_baseline.json에 등록하세요');
    console.error('  (node tools/check/check_orphan_assets.js --update 후 사유 기입)');
    process.exit(1);
  }

  console.log(`✅ 고아 자산 게이트 통과 — 자산 ${assetCount}개 · 미참조 0건 (예외 ${Object.keys(baseline).length}건)`);
  if (resolved.length) {
    console.log('💡 예외 명단 정리 가능:');
    for (const r of resolved) console.log(`  - ${r}`);
    console.log('  → node tools/check/check_orphan_assets.js --update');
  }
}

module.exports = { ASSET_RE, EXEMPT_RE, collectOrphans, compareOrphans };
if (require.main === module) main();
