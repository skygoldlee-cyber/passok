#!/usr/bin/env node
/**
 * check_vendor.js — vendor/ 자산 매니페스트 ↔ 실물 정합 검증 (BP-13)
 *
 * vendor/vendor-manifest.json이 패키지별 npm 출처·버전·파일 sha256을 선언한다.
 * check:reffresh와 동일 계약 — 무단 교체·부분 갱신·미선언 파일을 구조적으로 차단한다.
 *
 * 검사:
 *   - 소실       매니페스트 선언 파일이 디스크에 없음 → 오류
 *   - 해시 불일치 sha256 불일치 → 오류 (수동 변경이면 --update로 재스탬프)
 *   - 미등록     vendor/ 아래 실존 파일이 선언 없음 → 오류 (manifest 추가 필요)
 *   - 버전 정합  versionProbe 정규식 추출값 ≠ manifest.version → 오류
 *
 * 해시 규약: 텍스트 확장자(css/js/html/md/json/txt/svg/map)는 \r\n→LF 정규화 후
 * sha256 — .gitattributes(eol=lf)+Windows autocrlf 조합에서 작업트리 개행이
 * 플랫폼 의존이므로, git blob과 동일한 정규화를 적용해 플랫폼 비의존으로 만든다.
 * 바이너리(woff2/ttf/png…)는 원본 바이트 해시.
 *
 * 사용:
 *   node tools/check/check_vendor.js            # 무결성 검증 (불일치 시 exit 1)
 *   node tools/check/check_vendor.js --update   # 현재 파일 해시로 매니페스트 재스탬프
 *   node tools/check/check_vendor.js --latest   # npm registry 최신 버전 비교 (뒤처짐 exit 2)
 *
 * 갱신 워크플로:
 *   ① npm.cmd run sync:vendor -- <key>[@버전]   # npm pack → 복사 → 스탬프 일괄
 *   ② npm.cmd run check:vendor                  # 검증
 *   ※ 수동 파일 교체 시에만 ③ npm.cmd run check:vendor -- --update
 */

// @spec BP-13
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const VENDOR_DIR = path.join(ROOT, 'vendor');
const MANIFEST_PATH = path.join(VENDOR_DIR, 'vendor-manifest.json');

const UPDATE = process.argv.includes('--update');
const LATEST = process.argv.includes('--latest');

const TEXT_EXT = /\.(?:css|js|html?|md|json|txt|svg|map)$/i;
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** 텍스트는 LF 정규화 후 sha256, 바이너리는 원본 sha256 (git blob 동등 규약) */
function fileHash(absPath, relPath) {
  const buf = fs.readFileSync(absPath);
  if (!TEXT_EXT.test(relPath)) return crypto.createHash('sha256').update(buf).digest('hex');
  return crypto.createHash('sha256')
    .update(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary').digest('hex');
}

/** vendor/ 아래 실존 파일 → 'pkgDir/relPath' 집합 (매니페스트 자신 제외) */
function collectVendorFiles(vendorDir) {
  const out = new Map(); // 'pkg/file' → absPath
  for (const pkgDir of fs.readdirSync(vendorDir, { withFileTypes: true })) {
    if (!pkgDir.isDirectory()) continue;
    const base = path.join(vendorDir, pkgDir.name);
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name))
        : e.isFile() ? [path.join(d, e.name)] : []));
    for (const f of walk(base)) {
      const rel = `${pkgDir.name}/${path.relative(base, f).split(path.sep).join('/')}`;
      out.set(rel, f);
    }
  }
  return out;
}

/** 매니페스트 선언 파일 목록 → 'pkgDir/relPath' 집합 */
function manifestFiles(manifest) {
  const out = new Set();
  for (const [key, pkg] of Object.entries(manifest.packages)) {
    for (const rel of Object.keys(pkg.files || {})) out.add(`${key}/${rel}`);
  }
  return out;
}

/** versionProbe 정규식으로 파일 내 버전 문자열 추출 */
function probeVersion(pkgDirAbs, probe) {
  const file = path.join(pkgDirAbs, probe.file);
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(new RegExp(probe.pattern));
  return m ? m[1] : null;
}

/** 무결성 검증 본체 → { errors, warnings } (테스트 가능 순수 비교) */
function verify(manifest, vendorDir) {
  const errors = [];
  const warnings = [];
  const declared = manifestFiles(manifest);
  const actual = collectVendorFiles(vendorDir);

  for (const rel of [...declared].sort()) {
    const abs = actual.get(rel);
    if (!abs) { errors.push(`소실 — 매니페스트 선언 파일 없음: vendor/${rel}`); continue; }
    const [pkg, ...rest] = rel.split('/');
    const expected = manifest.packages[pkg].files[rest.join('/')];
    const got = fileHash(abs, rel);
    if (got !== expected) {
      errors.push(`해시 불일치 — vendor/${rel} (수동 변경이면 --update로 재스탬프, 의도된 갱신이면 sync:vendor)`);
    }
  }
  for (const rel of [...actual.keys()].sort()) {
    if (!declared.has(rel)) errors.push(`미등록 — vendor/${rel} (vendor-manifest.json files에 선언 필요)`);
  }

  for (const [key, pkg] of Object.entries(manifest.packages)) {
    if (!pkg.versionProbe) continue;
    const got = probeVersion(path.join(vendorDir, key), pkg.versionProbe);
    if (got === null) {
      warnings.push(`[${key}] versionProbe 실패 — ${pkg.versionProbe.file}에서 버전 문자열 추출 불가 (pattern: ${pkg.versionProbe.pattern})`);
    } else if (got !== pkg.version) {
      errors.push(`[${key}] 버전 불일치 — 파일 내 ${got} ≠ 매니페스트 ${pkg.version}`);
    }
  }
  return { errors, warnings };
}

/** 매니페스트 files 해시를 현재 디스크 상태로 재스탬프 (version·syncMap은 보존) */
function restamp(manifest, vendorDir) {
  const actual = collectVendorFiles(vendorDir);
  for (const [key, pkg] of Object.entries(manifest.packages)) {
    const next = {};
    const prefix = `${key}/`;
    for (const rel of Object.keys(pkg.files || {})) {
      const full = `${prefix}${rel}`;
      const abs = actual.get(full);
      if (!abs) {
        console.log(`  ⚠ [${key}] 선언 파일 소실 — 스탬프에서 제외: ${rel}`);
        continue;
      }
      next[rel] = fileHash(abs, rel);
      actual.delete(full);
    }
    pkg.files = next;
  }
  return [...actual.keys()].sort(); // 잔여 미등록 파일
}

/** npm registry 최신 버전 조회 (npm.cmd는 shell 경유 필요 — win32 spawn 제약) */
function latestVersion(npmName) {
  try {
    return execFileSync(NPM_BIN, ['view', npmName, 'version'],
      { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function main() {
  console.log('='.repeat(70));
  console.log(`vendor 자산 매니페스트 정합 검증${UPDATE ? ' (--update)' : ''}${LATEST ? ' (--latest)' : ''}`);
  console.log('='.repeat(70));

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log(`매니페스트 없음: ${path.relative(ROOT, MANIFEST_PATH)} — 생성 필요`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  if (UPDATE) {
    const leftover = restamp(manifest, VENDOR_DIR);
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(`매니페스트 재스탬프 완료 → ${path.relative(ROOT, MANIFEST_PATH)}`);
    if (leftover.length) {
      console.log('⚠ 선언되지 않은 파일이 남아 있습니다 (files에 추가 후 --update 재실행):');
      for (const rel of leftover) console.log(`  - vendor/${rel}`);
      process.exit(1);
    }
    return;
  }

  const { errors, warnings } = verify(manifest, VENDOR_DIR);
  for (const w of warnings) console.log(`⚠ ${w}`);
  for (const e of errors) console.log(`✗ ${e}`);

  if (errors.length) {
    console.log(`\n실패 — ${errors.length}건 불일치. 수동 변경은 \`npm.cmd run check:vendor -- --update\`, 버전 갱신은 \`npm.cmd run sync:vendor -- <key>[@버전]\`.`);
    process.exit(1);
  }
  console.log(`✅ ${Object.keys(manifest.packages).length}개 패키지, ${manifestFiles(manifest).size}개 파일 정합`);

  if (LATEST) {
    console.log('\nnpm registry 최신 버전 비교:');
    const outdated = [];
    for (const [key, pkg] of Object.entries(manifest.packages)) {
      if (pkg.versionFree || !pkg.npm) continue;
      const latest = latestVersion(pkg.npm);
      if (latest === null) {
        console.log(`  ⚠ [${key}] registry 조회 실패 — 건너뜀`);
        continue;
      }
      const stale = latest !== pkg.version;
      console.log(`  ${stale ? '⚠' : '✅'} [${key}] ${pkg.npm} — vendored ${pkg.version} / latest ${latest}`);
      if (stale) outdated.push(`${pkg.npm} ${pkg.version} → ${latest}`);
    }
    if (outdated.length) {
      console.log(`\n뒤처진 패키지 ${outdated.length}건:\n${outdated.map((s) => `  - ${s}`).join('\n')}`);
      console.log('갱신: npm.cmd run sync:vendor -- <key> (vendor-check.yml 주간 이슈의 절차 참조)');
      process.exit(2);
    }
    console.log('✅ 모든 npm 추적 패키지가 최신입니다.');
  }
}

if (require.main === module) main();

module.exports = { fileHash, collectVendorFiles, manifestFiles, probeVersion, verify, restamp, TEXT_EXT };
