#!/usr/bin/env node
/**
 * upload_ref_images.js — ref_md 이미지 → GitHub Releases 에셋 업로드 (DOC-RBK-25)
 *
 * pdf_hosting.json의 imageManifests를 선언한 시험의 refimg_hashes.json을 읽어
 * 각 이미지를 `<sha256><원본 확장자>` 에셋으로 assetBase 릴리스에 업로드한다.
 * 기존 에셋은 skip하므로 중단 후 재실행으로 이어 붙기 가능. mirrors 선언 시
 * 미러 릴리스에도 부재분을 동기화한다.
 *
 * 릴리스당 에셋 상한은 1,000개 (GitHub 하드 리밋). assetBase/mirrors의 {hh}는
 * sha256 앞 2자리로 치환하는 샤드 템플릿 — ref-assets-{hh} 256샤드에 분산.
 * {hh} 없는 flat 베이스는 읽기 전용 폴백으로만 쓴다 (업로드 대상 아님).
 *
 * GitHub REST rate limit(5,000/h)을 소비하므로 대량 업로드는 --auto로
 * 한도 리셋을 기다렸다 이어 붙이는 것을 권장.
 *
 * 선행: npm run build:refimg (매니페스트 생성) + `gh auth login` (repo scope)
 *
 * 사용:
 *   node tools/sync/upload_ref_images.js                  # 선언 시험 전체 업로드
 *   node tools/sync/upload_ref_images.js --exam <id>      # 한 시험만
 *   node tools/sync/upload_ref_images.js --dry-run        # 업로드 없이 대상 보고
 *   node tools/sync/upload_ref_images.js --jobs 6         # 병렬 수 (기본 4)
 *   node tools/sync/upload_ref_images.js --auto           # rate limit 리셋까지 대기 후 자동 재개
 *   node tools/sync/upload_ref_images.js --no-mirror      # 미러 동기화 생략 (쿼터 절약)
 */

// @spec none (참조자료 이미지 에셋 업로드)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const AUTO = argv.includes('--auto');
const NO_MIRROR = argv.includes('--no-mirror');
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

class RateLimitError extends Error {}
let RATE_LIMITED = false;
const isRateLimit = (e) => /rate limit/i.test(e.message || '');

/** 릴리스 목록 프리페치 — 태그→id 맵 (목록 1~3회 요청으로 샤드별 태그 조회 생략) */
let RELEASE_TAGS = null;
function knownReleases(repo) {
  if (!RELEASE_TAGS) {
    RELEASE_TAGS = new Map();
    try {
      const rels = gh(['api', `repos/${repo}/releases?per_page=100`, '--paginate', '--jq', '.[] | "\(.tag_name)\t\(.id)"'], false);
      for (const line of rels.split('\n').filter(Boolean)) {
        const [tag, id] = line.split('\t');
        RELEASE_TAGS.set(tag, Number(id));
      }
    } catch (e) {
      if (isRateLimit(e)) { RATE_LIMITED = true; throw new RateLimitError(e.message); }
      throw e;
    }
  }
  return RELEASE_TAGS;
}

/** 릴리스 id·기존 에셋명 목록 해석 — 없으면 생성 (릴리스당 에셋 1,000 상한 → 샤드별 릴리스) */
const REL_INFO = new Map();
function releaseInfo(repo, tag) {
  if (!REL_INFO.has(tag)) {
    let id = knownReleases(repo).get(tag);
    if (!id) {
      try {
        gh(['release', 'create', tag, '--repo', repo, '--title', tag,
          '--notes', 'ref_md 이미지 sha256 에셋 샤드 (DOC-RBK-25). 에셋명=<sha256>.<ext> — 릴리스당 에셋 1,000개 상한으로 sha256 앞 2자리 샤딩'], false);
        const rel = gh(['api', `repos/${repo}/releases/tags/${tag}`]);
        id = rel.id;
        RELEASE_TAGS.set(tag, id);
      } catch (e) {
        if (isRateLimit(e)) { RATE_LIMITED = true; throw new RateLimitError(e.message); }
        throw e;
      }
      REL_INFO.set(tag, { id, names: new Set() });
      return REL_INFO.get(tag);
    }
    try {
      const out = execFileSync('gh', ['api', `repos/${repo}/releases/${id}/assets?per_page=100`, '--paginate', '--jq', '.[].name'],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
      REL_INFO.set(tag, { id, names: new Set(out.split('\n').map((s) => s.trim()).filter(Boolean)) });
    } catch (e) {
      if (isRateLimit(e)) { RATE_LIMITED = true; throw new RateLimitError(e.message); }
      throw e;
    }
  }
  return REL_INFO.get(tag);
}

/** assetBase 템플릿 → 릴리스 태그. {hh}는 sha256 앞 2자리로 치환 (릴리스당 1,000 에셋 상한 샤딩) */
function tagOf(assetBase, sha) {
  const m = assetBase.match(/\/download\/([^/]+)\/?$/);
  if (!m) throw new Error('assetBase에서 릴리스 태그 해석 실패: ' + assetBase);
  return m[1].replace('{hh}', sha ? sha.slice(0, 2) : '{hh}');
}

/** 작업 큐 병렬 소비 — rate limit 감지 시 잔여 작업을 조기 중단 (재실행으로 이어 붙기) */
async function pool(items, n, fn) {
  let i = 0, done = 0, failed = 0, rateLimited = false;
  async function worker() {
    while (!rateLimited && !RATE_LIMITED && i < items.length) {
      const item = items[i++];
      try { await fn(item); done++; }
      catch (e) {
        failed++;
        if (isRateLimit(e) || e instanceof RateLimitError) {
          rateLimited = true; RATE_LIMITED = true;
          console.error(`    ⛔ GitHub API rate limit — ${items.length - i}개 잔여. 한도 리셋 후 재실행하세요 (기존 에셋은 skip).`);
          break;
        }
        console.error(`    ✗ ${item[1] || item[0]}: ${e.message}`);
      }
      if ((done + failed) % 200 === 0) console.log(`    … ${done + failed}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  if (rateLimited) failed += items.length - i;
  return { done, failed, rateLimited };
}

/** 단건 업로드 — 422(이름 중복=이미 존재, sha 에셋은 동일 내용)는 성공 간주, 전송 오류 1회 재시도.
 *  secondary rate limit(분당 콘텐츠 생성 한도) 완화를 위해 워커당 ~1.5req/s 페이스로 제한 */
async function uploadOne(repo, releaseId, fp, assetName) {
  const args = ['api', '-X', 'POST',
    `https://uploads.github.com/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(assetName)}`,
    '-H', 'Content-Type: application/octet-stream', '--input', fp];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      gh(args, false);
      return 'ok';
    } catch (e) {
      const m = e.message || '';
      if (/rate limit/i.test(m)) { RATE_LIMITED = true; throw new RateLimitError(m); }
      if (/file_count limited|Validation Failed|422/.test(m)) return 'exists';
      if (attempt === 0) { await sleep(1000); continue; }   // 전송 오류 — 1회 재시도
      throw e;
    }
  }
  return 'ok';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** rate limit 리셋까지 폴링 대기 — core 한도 외에 secondary(동시성) 제한도 있어 최소 3분 쿨다운 */
async function waitForReset() {
  console.log('    ⏳ rate limit 쿨다운 — secondary 제한 대비 최소 3분 대기');
  await sleep(180000);
  for (;;) {
    try {
      const rl = gh(['api', 'rate_limit']);
      const core = rl.resources && rl.resources.core;
      if (core && core.remaining > 50) return;
      const wait = core ? Math.max(60, core.reset * 1000 - Date.now() + 10000) : 300000;
      console.log(`    ⏳ 한도 리셋 대기 — ${(wait / 60000).toFixed(0)}분 후 재시도`);
      await sleep(wait);
    } catch { await sleep(60000); }
  }
}

async function runOnce(repo) {
  let totalMissing = 0;
  for (const t of getExamTargets(ROOT)) {
    if (RATE_LIMITED) break;
    if (EXAM && t.id !== EXAM) continue;
    const refBase = path.join(ROOT, t.contentRoot, '참조자료');
    const hostingPath = path.join(refBase, 'pdf_hosting.json');
    if (!fs.existsSync(hostingPath)) continue;
    const hosting = JSON.parse(fs.readFileSync(hostingPath, 'utf8'));
    const imgManifests = hosting.imageManifests || [];
    if (!imgManifests.length) continue;

    const sharded = hosting.assetBase.includes('{hh}');
    const readOnlyBases = (hosting.mirrors || []).filter((b) => !b.includes('{hh}') && b !== hosting.assetBase);

    for (const m of imgManifests) {
      const mp = path.join(refBase, m);
      if (!fs.existsSync(mp)) { console.warn(`[${t.id}] 매니페스트 없음: ${m} — npm run build:refimg 먼저`); continue; }
      const hashes = JSON.parse(fs.readFileSync(mp, 'utf8'));
      const entries = hashes.files || hashes;
      // sha+확장자가 같으면 같은 에셋 — 동일 내용 중복 파일은 한 번만 업로드
      const byAsset = new Map();
      for (const [rel, sha] of Object.entries(entries)) {
        const assetName = `${sha}${path.extname(rel)}`;
        if (!byAsset.has(assetName)) byAsset.set(assetName, [rel, sha]);
      }
      // 읽기 전용 flat 폴백 릴리스의 기존 에셋은 이미 서빙 가능 — 업로드 불필요
      const served = new Set();
      for (const b of readOnlyBases) {
        try {
          releaseInfo(repo, tagOf(b)).names.forEach((n) => served.add(n));
        } catch (e) { /* 릴리스 부재·rate limit — 무시 */ }
      }

      // 샤드별 그룹화 — 에셋의 sha 앞 2자리가 릴리스를 결정
      const shardTasks = new Map();
      for (const [assetName, [rel, sha]] of byAsset) {
        const fp = path.join(refBase, rel);
        if (!fs.existsSync(fp)) { console.error(`    ✗ 로컬 파일 없음: ${rel}`); continue; }
        if (served.has(assetName)) continue;
        const tag = sharded ? tagOf(hosting.assetBase, sha) : tagOf(hosting.assetBase);
        if (!shardTasks.has(tag)) shardTasks.set(tag, []);
        shardTasks.get(tag).push([fp, rel, assetName]);
      }
      const totalTasks = [...shardTasks.values()].reduce((n, a) => n + a.length, 0);
      console.log(`[${t.id}] ${m} — 에셋 ${byAsset.size}개(파일 ${Object.keys(entries).length}개)·샤드 ${shardTasks.size}개·업로드 대상 ${totalTasks}개${served.size ? ` (flat 폴백 서빙 ${served.size}개 제외)` : ''}`);
      if (DRY) { totalMissing += totalTasks; continue; }

      for (const [tag, tasks] of shardTasks) {
        if (RATE_LIMITED) break;
        let info;
        try { info = releaseInfo(repo, tag); }
        catch (e) { if (e instanceof RateLimitError) break; throw e; }
        const todo = tasks.filter(([, , a]) => !info.names.has(a));
        if (!todo.length) continue;
        const { done, failed } = await pool(todo, JOBS, async ([fp, , assetName]) =>
          uploadOne(repo, info.id, fp, assetName));
        console.log(`    [${tag}] 업로드 ${done}개${failed ? ` · 실패 ${failed}` : ''}`);
        totalMissing += failed;
        if (RATE_LIMITED) { console.log('    ⏸ rate limit — 잔여는 다음 실행으로'); break; }
      }

      // 미러 동기화 — {hh} 샤드 미러만 업로드 대상 (flat 미러는 읽기 전용)
      if (!NO_MIRROR) for (const mb of (hosting.mirrors || []).filter((b) => b.includes('{hh}'))) {
        if (RATE_LIMITED) break;
        const byShard = new Map();
        for (const [assetName, [rel, sha]] of byAsset) {
          if (served.has(assetName)) continue;
          const fp = path.join(refBase, rel);
          if (!fs.existsSync(fp)) continue;
          const tag = tagOf(mb, sha);
          if (!byShard.has(tag)) byShard.set(tag, []);
          byShard.get(tag).push([fp, rel, assetName]);
        }
        for (const [tag, tasks] of byShard) {
          if (RATE_LIMITED) break;
          try {
            const mi = releaseInfo(repo, tag);
            const todo = tasks.filter(([, , a]) => !mi.names.has(a));
            if (!todo.length) continue;
            const r = await pool(todo, JOBS, async ([fp, , a]) => uploadOne(repo, mi.id, fp, a));
            console.log(`    미러(${tag}) +${r.done}개${r.failed ? ` · 실패 ${r.failed}` : ''}`);
          } catch (e) {
            if (e instanceof RateLimitError) break;
            console.error(`    ✗ 미러 ${tag} 동기화 실패: ${e.message}`);
          }
        }
      }
    }
  }
  return totalMissing;
}

async function main() {
  const repo = ownerRepo();
  for (;;) {
    RATE_LIMITED = false;
    const missing = await runOnce(repo);
    if (!missing && !RATE_LIMITED) { console.log('\n✅ 업로드 완료'); return; }
    if (RATE_LIMITED && AUTO) { await waitForReset(); continue; }
    console.error(`\n⚠ 미완료 ${missing}건 — 재실행으로 이어 붙기 가능${AUTO ? '' : ' (--auto면 한도 리셋 후 자동 재개)'}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
