#!/usr/bin/env node
/**
 * fetch_ref_pdfs.js — 외부 호스팅 참조자료 PDF 복원 (DOC-RBK-12)
 *
 * {contentRoot}/참조자료/pdf_hosting.json을 선언한 시험만 대상:
 *   { "assetBase": "<릴리스 에셋 베이스 URL>", "manifests": ["pdf_hashes.json", ...] }
 *
 * 각 매니페스트의 '<dir>/<file>.pdf' → sha256 항목을 순회하며, 로컬에 없거나
 * 해시가 다른 파일만 `<assetBase>/<sha256>.pdf`에서 받아 sha256 검증 후 기록한다
 * (릴리스 에셋 파일명 = 내용 해시라 이름 충돌·유니코드 인코딩 문제가 없다).
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

    const wanted = {};
    for (const m of hosting.manifests || ['pdf_hashes.json']) {
      const mp = path.join(refBase, m);
      if (fs.existsSync(mp))
        Object.assign(wanted, JSON.parse(fs.readFileSync(mp, 'utf8')));
    }

    const missing = [], mismatch = [];
    for (const [rel, sha] of Object.entries(wanted)) {
      const fp = path.join(refBase, rel);
      examined++;
      if (!fs.existsSync(fp)) missing.push([rel, sha]);
      else if (sha256File(fp) !== sha) mismatch.push([rel, sha]);
      else okCount++;
    }

    if (!missing.length && !mismatch.length) {
      console.log(`[${t.id}] ✅ PDF ${okCount}개 모두 로컬 일치`);
      continue;
    }

    console.log(`[${t.id}] 복원 대상 — 부재 ${missing.length}개·해시 불일치 ${mismatch.length}개`);
    for (const [rel] of [...missing, ...mismatch]) console.log(`    ${rel}`);
    if (CHECK) { failed += missing.length + mismatch.length; continue; }

    for (const [rel, sha] of [...missing, ...mismatch]) {
      const fp = path.join(refBase, rel);
      try {
        const buf = await download(`${hosting.assetBase}/${sha}.pdf`);
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

  if (!examined) console.log('pdf_hosting.json을 선언한 시험이 없습니다.');

  if (failed) {
    console.log(`\n⚠ 복원 실패·미복원 ${failed}건 — 네트워크·릴리스 에셋을 확인하세요.`);
    process.exit(1);
  }
  console.log(fetched ? `\n✅ ${fetched}개 복원 완료` : '');
}

main().catch((e) => { console.error(e); process.exit(2); });
