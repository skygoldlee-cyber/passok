#!/usr/bin/env node
/**
 * fetch_ref_pdfs.js — 외부 호스팅 참조자료 PDF 복원 (DOC-RBK-12)
 *
 * {contentRoot}/참조자료/pdf_hosting.json을 선언한 시험만 대상:
 *   { "assetBase": "<릴리스 에셋 베이스 URL>", "mirrors": ["<폴백 베이스 URL>", ...],
 *     "manifests": ["pdf_hashes.json", ...],
 *     "masterManifests": ["img_masters.json", ...] }
 *
 * manifests — 참조자료/ 상대 '<dir>/<file>.pdf' → sha256 항목.
 * masterManifests — contentRoot 상대 경로 → sha256 항목 (교재 images 아래 .png
 *   원본 마스터 — webp 재인코딩용 원본, 런타임은 .webp만 참조).
 * 로컬에 없거나 해시가 다른 파일만 `<assetBase>/<sha256>.<원본 확장자>`에서 받아
 * sha256 검증 후 기록한다 (에셋 파일명 = 내용 해시라 이름 충돌·유니코드 문제 없음).
 *
 * 사용:
 *   node tools/sync/fetch_ref_pdfs.js          # 부재·불일치 PDF 복원
 *   node tools/sync/fetch_ref_pdfs.js --check  # 상태 보고만 (다운로드 없음)
 *   npm run fetch:refpdfs
 */

// @spec none (참조자료 자산 복원)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');

const sha256File = f =>
  crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** assetBase 우선, 실패 시 mirrors 순서로 폴백 — 단일 릴리스 삭제·장애 대비 */
async function downloadWithMirrors(bases, assetName) {
  let lastErr;
  for (const base of bases) {
    try {
      return { buf: await download(`${base}/${assetName}`), base };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function main() {
  console.log('참조자료 PDF 외부 호스팅 복원' + (CHECK ? ' (--check)' : ''));

  let examined = 0, okCount = 0, fetched = 0, failed = 0;

  for (const t of getExamTargets(ROOT)) {
    const refBase = path.join(ROOT, t.contentRoot, '참조자료');
    const hostingPath = path.join(refBase, 'pdf_hosting.json');
    if (!fs.existsSync(hostingPath)) continue;

    const hosting = JSON.parse(fs.readFileSync(hostingPath, 'utf8'));
    if (!hosting.assetBase) {
      console.log(`[${t.id}] ✗ pdf_hosting.json에 assetBase 없음`);
      failed++;
      continue;
    }

    const wanted = [];
    const collect = (m, base) => {
      const mp = path.join(refBase, m);
      if (!fs.existsSync(mp)) return;
      const hashes = JSON.parse(fs.readFileSync(mp, 'utf8'));
      for (const [rel, sha] of Object.entries(hashes)) wanted.push([path.join(base, rel), rel, sha]);
    };
    // manifests: 참조자료/ 상대 경로 → PDF 에셋 (<sha>.pdf)
    for (const m of hosting.manifests || ['pdf_hashes.json']) collect(m, refBase);
    // masterManifests: contentRoot 상대 경로 → 교재 원본 마스터 에셋 (<sha>.<원본 확장자>)
    const examBase = path.join(ROOT, t.contentRoot);
    for (const m of hosting.masterManifests || []) collect(m, examBase);

    const missing = [], mismatch = [];
    for (const [fp, rel, sha] of wanted) {
      examined++;
      if (!fs.existsSync(fp)) missing.push([fp, rel, sha]);
      else if (sha256File(fp) !== sha) mismatch.push([fp, rel, sha]);
      else okCount++;
    }

    if (!missing.length && !mismatch.length) {
      console.log(`[${t.id}] ✅ PDF ${okCount}개 모두 로컬 일치`);
      continue;
    }

    console.log(`[${t.id}] 복원 대상 — 부재 ${missing.length}개·해시 불일치 ${mismatch.length}개`);
    for (const [, rel] of [...missing, ...mismatch]) console.log(`    ${rel}`);
    if (CHECK) { failed += missing.length + mismatch.length; continue; }

    const bases = [hosting.assetBase, ...(hosting.mirrors || [])];
    for (const [fp, rel, sha] of [...missing, ...mismatch]) {
      try {
        const { buf, base } = await downloadWithMirrors(bases, `${sha}${path.extname(rel)}`);
        if (base !== hosting.assetBase) console.log(`      (미러 사용: ${base.split('/').pop()})`);
        const got = crypto.createHash('sha256').update(buf).digest('hex');
        if (got !== sha) throw new Error(`sha256 불일치 (${got.slice(0, 12)}…)`);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, buf);
        fetched++;
        console.log(`    ✓ ${rel} (${(buf.length / 1048576).toFixed(1)}MB)`);
      } catch (e) {
        failed++;
        console.log(`    ✗ ${rel} — ${e.message}`);
      }
    }
  }

  if (!examined) console.log('pdf_hosting.json을 선언한 시험이 없습니다 (또는 매니페스트가 비어 있음).');

  if (failed) {
    console.log(`\n⚠ 복원 실패·미복원 ${failed}건 — 네트워크·릴리스 에셋을 확인하세요.`);
    process.exit(1);
  }
  console.log(fetched ? `\n✅ ${fetched}개 복원 완료` : '');
}

main().catch((e) => { console.error(e); process.exit(2); });
