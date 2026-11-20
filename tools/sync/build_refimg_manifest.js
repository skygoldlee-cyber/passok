#!/usr/bin/env node
/**
 * build_refimg_manifest.js — ref_md 이미지 → sha256 매니페스트 생성 (DOC-RBK-25)
 *
 * pdf_hosting.json의 imageManifests를 선언한 시험의
 * {contentRoot}/참조자료/ref_md/**\/images/*.{webp,png,jpg,jpeg}를 스캔해
 * 참조자료 상대경로 → sha256 매니페스트(refimg_hashes.json 등 선언명)를 쓴다.
 * 런타임(SW)·복원(fetch_ref_pdfs.js)·업로드(upload_ref_images.js)이 공유하는 계약.
 *
 * 사용:
 *   node tools/sync/build_refimg_manifest.js           # 생성 (선언 시험 전체)
 *   node tools/sync/build_refimg_manifest.js --check   # 신선도 비교만
 *   node tools/sync/build_refimg_manifest.js --exam <id>
 *   npm run build:refimg
 */

// @spec none (참조자료 이미지 매니페스트 생성)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');
const IMG_RE = /\.(?:webp|png|jpe?g|gif|svg)$/i;

const sha256File = (f) =>
  crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_archive' || e.name === 'ref_md_v2') continue; // 보존·작업본 제외
      yield* walk(p);
    } else if (IMG_RE.test(e.name)) yield p;
  }
}

/** 시험 한 개의 ref_md 이미지 맵 — 참조자료 상대경로 → sha256 */
function collectImages(refBase) {
  const files = {};
  const refMd = path.join(refBase, 'ref_md');
  if (!fs.existsSync(refMd)) return files;
  for (const abs of walk(refMd)) {
    const rel = path.relative(refBase, abs).split(path.sep).join('/');
    files[rel] = sha256File(abs);
  }
  return files;
}

function manifestsFor(refBase, hosting) {
  const names = hosting.imageManifests || [];
  return names.map((m) => path.join(refBase, m));
}

function main() {
  const ei = process.argv.indexOf('--exam');
  const onlyExam = ei >= 0 ? process.argv[ei + 1] : null;
  let stale = 0, written = 0, declared = 0;

  for (const t of getExamTargets(ROOT)) {
    if (onlyExam && t.id !== onlyExam) continue;
    const refBase = path.join(ROOT, t.contentRoot, '참조자료');
    const hostingPath = path.join(refBase, 'pdf_hosting.json');
    if (!fs.existsSync(hostingPath)) continue;
    const hosting = JSON.parse(fs.readFileSync(hostingPath, 'utf8'));
    if (!(hosting.imageManifests || []).length) continue;
    declared++;

    const images = collectImages(refBase);
    const doc = {
      _comment: 'ref_md 이미지 → sha256 매니페스트 (DOC-RBK-25). build_refimg_manifest.js 생성물 — 직접 편집 금지. SW가 assetBase/mirrors로 sha 에셋을 해석.',
      assetBase: hosting.assetBase,
      mirrors: hosting.mirrors || [],
      files: images,
    };
    for (const mp of manifestsFor(refBase, hosting)) {
      const prev = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : null;
      if (prev && JSON.stringify(prev) === JSON.stringify(doc)) continue;
      stale++;
      if (!CHECK) {
        fs.writeFileSync(mp, JSON.stringify(doc) + '\n');
        console.log(`  ✓ ${t.id}: ${path.basename(mp)} — ${Object.keys(images).length}개 이미지`);
      }
      written++;
    }
    console.log(`${CHECK ? '  ·' : '  '} [${t.id}] ref_md 이미지 ${Object.keys(images).length}개`);
  }

  if (!declared) {
    console.log('imageManifests 선언 시험 없음 — pdf_hosting.json에 "imageManifests": ["refimg_hashes.json"] 추가로 옵트인');
    return;
  }
  if (CHECK) {
    if (stale) {
      console.error(`❌ 매니페스트 드리프트 ${stale}건 — npm run build:refimg 으로 재생성하세요`);
      process.exit(1);
    }
    console.log('✅ refimg 매니페스트 신선');
    return;
  }
  console.log(written ? `✅ refimg_hashes 매니페스트 갱신 ${written}건` : '✅ 매니페스트 신선 — 변경 없음');
}

if (require.main === module) main();
module.exports = { collectImages };
