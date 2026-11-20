#!/usr/bin/env node
/**
 * upload_ref_images.js — ref_md 이미지 → GitHub Releases 에셋 업로드 (DOC-RBK-25)
 *
 * pdf_hosting.json의 imageManifests를 선언한 시험의 refimg_hashes.json을 읽어
 * 각 이미지를 `<sha256><원본 확장자>` 에셋으로 assetBase 릴리스에 업로드한다.
 * 기존 에셋은 skip하므로 중단 후 재실행으로 이어 붙기 가능. mirrors 선언 시
 * 미러 릴리스에도 부재분을 동기화한다.
 *
 * 선행: npm run build:refimg (매니페스트 생성) + `gh auth login` (repo scope)
 *
 * 사용:
 *   node tools/sync/upload_ref_images.js                  # 선언 시험 전체 업로드
 *   node tools/sync/upload_ref_images.js --exam <id>      # 한 시험만
 *   node tools/sync/upload_ref_images.js --dry-run        # 업로드 없이 대상 보고
 *   node tools/sync/upload_ref_images.js --jobs 6         # 병렬 수 (기본 4)
 */

// @spec none (참조자료 이미지 에셋 업로드)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const EXAM = argv.includes('--exam') ? argv[argv.indexOf('--exam') + 1] : null;
const JOBS = argv.includes('--jobs') ? Number(argv[argv.indexOf('--jobs') + 1]) : 4;

function gh(args, json = true) {
  const out = execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  return json ? JSON.parse(out) : out;
}

function ownerRepo() {
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const m = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) throw new Error('origin에서 owner/repo 해석 실패: ' + url);
  return `${m[1]}/${m[2]}`;
}

/** 릴리스 id·기존 에셋명 목록 해석 */
function releaseInfo(repo, tag) {
  const rel = gh(['api', `repos/${repo}/releases/tags/${tag}`]);
  const out = execFileSync('gh', ['api', `repos/${repo}/releases/${rel.id}/assets?per_page=100`, '--paginate', '--jq', '.[].name'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  return { id: rel.id, names: new Set(out.split('\n').map((s) => s.trim()).filter(Boolean)) };
}

function tagOf(assetBase) {
  const m = assetBase.match(/\/download\/([^/]+)\/?$/);
  if (!m) throw new Error('assetBase에서 릴리스 태그 해석 실패: ' + assetBase);
  return m[1];
}

/** 작업 큐 병렬 소비 */
async function pool(items, n, fn) {
  let i = 0, done = 0, failed = 0;
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      try { await fn(item); done++; }
      catch (e) { failed++; console.error(`    ✗ ${item[1] || item[0]}: ${e.message}`); }
      if ((done + failed) % 200 === 0) console.log(`    … ${done + failed}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return { done, failed };
}

function uploadOne(repo, releaseId, fp, assetName) {
  gh(['api', '-X', 'POST', `https://uploads.github.com/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(assetName)}`,
      '-H', 'Content-Type: application/octet-stream', '--input', fp], false);
}

function main() {
  const repo = ownerRepo();
  let totalMissing = 0;

  (async () => {
    for (const t of getExamTargets(ROOT)) {
      if (EXAM && t.id !== EXAM) continue;
      const refBase = path.join(ROOT, t.contentRoot, '참조자료');
      const hostingPath = path.join(refBase, 'pdf_hosting.json');
      if (!fs.existsSync(hostingPath)) continue;
      const hosting = JSON.parse(fs.readFileSync(hostingPath, 'utf8'));
      const imgManifests = hosting.imageManifests || [];
      if (!imgManifests.length) continue;

      const relTag = tagOf(hosting.assetBase);
      const mirrorTags = (hosting.mirrors || []).map(tagOf).filter((x) => x !== relTag);
      const { id: relId, names: existing } = releaseInfo(repo, relTag);

      for (const m of imgManifests) {
        const mp = path.join(refBase, m);
        if (!fs.existsSync(mp)) { console.warn(`[${t.id}] 매니페스트 없음: ${m} — npm run build:refimg 먼저`); continue; }
        const hashes = JSON.parse(fs.readFileSync(mp, 'utf8'));
        const entries = hashes.files || hashes;
        // sha+확장자가 같으면 같은 에셋 — 동일 내용 중복 파일은 한 번만 업로드
        const byAsset = new Map();
        for (const [rel, sha] of Object.entries(entries)) {
          const assetName = `${sha}${path.extname(rel)}`;
          if (!byAsset.has(assetName)) byAsset.set(assetName, rel);
        }
        const tasks = [];
        for (const [assetName, rel] of byAsset) {
          if (existing.has(assetName)) continue;
          const fp = path.join(refBase, rel);
          if (!fs.existsSync(fp)) { console.error(`    ✗ 로컬 파일 없음: ${rel}`); continue; }
          tasks.push([fp, rel, assetName]);
        }
        console.log(`[${t.id}] ${m} — 에셋 ${byAsset.size}개(파일 ${Object.keys(entries).length}개) 중 신규 ${tasks.length}개 업로드 대상 (릴리스 ${relTag})`);
        if (!DRY && tasks.length) {
          const { done, failed } = await pool(tasks, JOBS, async ([fp, , assetName]) =>
            uploadOne(repo, relId, fp, assetName));
          console.log(`    업로드 ${done}개${failed ? ` · 실패 ${failed}` : ''}`);
          totalMissing += failed;
        }
        if (DRY) { totalMissing += tasks.length; continue; }

        // 미러 동기화 — 기본 에셋 기준으로 미러 릴리스 부재분 채움
        for (const mt of mirrorTags) {
          try {
            const mi = releaseInfo(repo, mt);
            const mirrorTasks = [];
            for (const [a, rel] of byAsset) {
              if (mi.names.has(a)) continue;
              const fp = path.join(refBase, rel);
              if (fs.existsSync(fp)) mirrorTasks.push([fp, rel, a]);
            }
            if (!mirrorTasks.length) continue;
            const r = await pool(mirrorTasks, JOBS, async ([fp, , a]) => uploadOne(repo, mi.id, fp, a));
            console.log(`    미러(${mt}) +${r.done}개${r.failed ? ` · 실패 ${r.failed}` : ''}`);
          } catch (e) {
            console.error(`    ✗ 미러 ${mt} 동기화 실패: ${e.message}`);
          }
        }
      }
    }
    if (totalMissing) { console.error(`\n⚠ 미완료 ${totalMissing}건 — 재실행으로 이어 붙기 가능`); process.exit(1); }
    console.log('\n✅ 업로드 완료');
  })();
}

main();
