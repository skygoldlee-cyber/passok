#!/usr/bin/env node
/**
 * sync_vendor.js — vendor/ npm 패키지 갱신 (BP-13)
 *
 * `npm pack`으로 registry tarball을 받아 manifest `syncMap` 규칙대로 vendor/에
 * 복사하고, 버전·해시·updatedAt을 매니페스트에 스탬프한다. 갱신 절차의
 * "다운로드→복사→스탬프" 수동 단계를 한 명령으로 묶는다.
 *
 * 사용:
 *   node tools/sync/sync_vendor.js <key>           # 매니페스트 패키지 → 최신 버전
 *   node tools/sync/sync_vendor.js <key>@<ver>     # 특정 버전 고정
 *   node tools/sync/sync_vendor.js --list          # 갱신 가능 패키지 나열
 *
 * syncMap 규약 (매니페스트 패키지별 선언):
 *   "<tarball 내 경로>": "<vendor/<key>/ 아래 경로>"
 *   값이 디렉터리명이면 디렉터리 통째 복사 (예: "webfonts": "webfonts")
 *
 * 절차: ① pack ② 추출 ③ syncMap 복사 ④ 해시·버전 스탬프
 * 이후 `npm.cmd run check:vendor` + `check:all`로 회귀 검증 후 커밋.
 * fonts 등 수동 자산(syncMap 미선언·versionFree)은 명시적으로 거부한다.
 */

// @spec BP-13
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { fileHash, collectVendorFiles } = require('../check/check_vendor.js');

const ROOT = path.resolve(__dirname, '..', '..');
const VENDOR_DIR = path.join(ROOT, 'vendor');
const MANIFEST_PATH = path.join(VENDOR_DIR, 'vendor-manifest.json');
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const TAR_BIN = process.platform === 'win32' ? 'tar.exe' : 'tar';

const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const LIST = process.argv.includes('--list');

function fail(msg) {
  console.log(`✗ ${msg}`);
  process.exit(1);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) fail(`매니페스트 없음: ${path.relative(ROOT, MANIFEST_PATH)}`);
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function run(bin, args, opts = {}) {
  // npm.cmd 같은 배치 래퍼만 shell 경유 필요 — tar.exe 등 네이티브 바이너리는
  // shell을 거치면 Windows 경로 백슬래시가 재이스케이프되어 망가진다.
  return execFileSync(bin, args, { encoding: 'utf8', shell: bin === NPM_BIN, ...opts });
}

/** npm view → 최신 버전 */
function resolveVersion(npmName, pinned) {
  if (pinned) return pinned;
  return run(NPM_BIN, ['view', npmName, 'version']).trim();
}

/** npm pack → 추출된 package/ 디렉터리 절대경로 반환 */
function packAndExtract(npmName, version, tmp) {
  const out = run(NPM_BIN, ['pack', `${npmName}@${version}`, '--silent'], { cwd: tmp }).trim().split('\n').pop();
  const tgz = path.join(tmp, out.trim());
  if (!fs.existsSync(tgz)) fail(`npm pack 산출물 없음: ${out}`);
  fs.mkdirSync(path.join(tmp, 'x'), { recursive: true });
  // bsdtar는 C:\ 절대 경로의 ':'를 원격 호스트로 해석 — cwd + 상대 경로로 우회
  // (--force-local은 -f 아카이브명에만 적용되고 -C 경로엔 미달)
  run(TAR_BIN, ['-xzf', path.basename(tgz), '-C', 'x'], { cwd: tmp, shell: false });
  const pkgDir = path.join(tmp, 'x', 'package');
  if (!fs.existsSync(pkgDir)) fail('tarball 내 package/ 디렉터리 없음 — npm pack 규약 변경?');
  return pkgDir;
}

/** syncMap 규칙으로 tarball → vendor/<key>/ 복사. 반환: 복사된 vendor 상대경로 목록 */
function applySyncMap(pkgDir, syncMap, destDir) {
  const copied = [];
  for (const [src, dest] of Object.entries(syncMap)) {
    const s = path.join(pkgDir, src);
    if (!fs.existsSync(s)) fail(`tarball에 선언 경로 없음: ${src} — 패키지 레이아웃 변경? syncMap 갱신 필요`);
    const d = path.join(destDir, dest);
    const st = fs.statSync(s);
    if (st.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      for (const name of fs.readdirSync(s)) {
        fs.copyFileSync(path.join(s, name), path.join(d, name));
        copied.push(`${dest}/${name}`);
      }
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      copied.push(dest);
    }
  }
  return copied;
}

/** manifest 패키지 갱신 — 버전·해시·updatedAt 스탬프, syncMap 밖 잔여 파일 보고 */
function restampPackage(manifest, key, version) {
  const pkg = manifest.packages[key];
  const actual = collectVendorFiles(VENDOR_DIR);
  const prefix = `${key}/`;
  const files = {};
  for (const rel of [...actual.keys()].sort()) {
    if (!rel.startsWith(prefix)) continue;
    files[rel.slice(prefix.length)] = fileHash(actual.get(rel), rel);
  }
  pkg.files = files;
  pkg.version = version;
  pkg.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return files;
}

function main() {
  const manifest = loadManifest();

  if (LIST || !arg) {
    console.log('갱신 가능 패키지 (syncMap 선언됨):');
    for (const [key, pkg] of Object.entries(manifest.packages)) {
      const ok = pkg.npm && pkg.syncMap;
      console.log(`  ${ok ? '•' : '✗'} ${key}${pkg.version ? ` — ${pkg.npm}@${pkg.version}` : pkg.versionFree ? ' — 수동 자산(versionFree)' : ''}${ok ? '' : '  ← sync:vendor 불가'}`);
    }
    if (!arg && !LIST) console.log('\n사용: node tools/sync/sync_vendor.js <key>[@버전]');
    return;
  }

  const m = arg.match(/^([^@]+)(?:@(.+))?$/);
  const key = m[1];
  const pinned = m[2];
  const pkg = manifest.packages[key];
  if (!pkg) fail(`매니페스트에 없는 패키지: ${key} (등록 가능 키: ${Object.keys(manifest.packages).join(', ')})`);
  if (pkg.versionFree || !pkg.npm || !pkg.syncMap) {
    fail(`[${key}] syncMap/npm 미선언 또는 versionFree — 수동 절차 대상 (매니페스트 note 참조)`);
  }

  const version = resolveVersion(pkg.npm, pinned);
  console.log(`[${key}] ${pkg.npm} ${pkg.version} → ${version}`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendorsync-'));
  try {
    const pkgDir = packAndExtract(pkg.npm, version, tmp);
    const destDir = path.join(VENDOR_DIR, key);
    const copied = applySyncMap(pkgDir, pkg.syncMap, destDir);
    console.log(`  복사 ${copied.length}개 파일 → vendor/${key}/`);
    const files = restampPackage(manifest, key, version);
    console.log(`  매니페스트 스탬프: version=${version}, files=${Object.keys(files).length}`);
    console.log('\n다음:');
    console.log('  ① node tools/check/check_vendor.js        # 정합 확인');
    console.log('  ② npm.cmd run check:all                    # 회귀 검증 후 커밋');
    console.log('  ※ 메이저 버전 점프는 UI 회귀 가능 — 앱 수동 확인 권장');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (require.main === module) main();

module.exports = { resolveVersion, applySyncMap, restampPackage };
