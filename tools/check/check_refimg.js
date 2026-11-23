#!/usr/bin/env node
/**
 * check_refimg.js — ref_md 이미지 ↔ refimg_hashes 매니페스트 정합 게이트 (DOC-RBK-25)
 *
 * ref_md 이미지 외부화는 pdf_hosting.json의 imageManifests 선언 시험 단위로
 * 진행한다. 이 게이트는 이전 과정의 드리프트를 차단한다:
 *
 *   - 선언 시험의 작업트리 ref_md 이미지 ↔ 매니페스트 키 집합 정합
 *     · 파일 있고 항목 없음 → build:refimg 누락 (신규 이미지 미등록)
 *     · 항목 있고 파일 없음 → 매니페스트 스테일 (삭제 후 미재생성)
 *       단, 외부화 완료(선언+ignore+추적 없음) 팩은 로컬 파일 부재가 정상 —
 *       매니페스트가 원격 에셋 정본이라 스테일 검사를 적용하지 않는다
 *       (CI는 fetch 없이 클린 클론이라 항목 잔존이 필수 조건이다)
 *     ※ 집합 정합만 검사 — 내용 해시는 fetch 시 sha256으로 검증 (게이트 속도)
 *   - .gitignore에 ref_md 이미지 제외 라인이 있는데 호스팅 미선언 → 차단
 *     (무선언 ignore는 추적 유실 → 다른 머신에서 파일 소실)
 *   - 선언+ignore+추적 없음 = "외부화 완료" · 선언+추적 = "전환 준비" (보고만)
 *
 * 사용법:
 *   node tools/check/check_refimg.js            # 검증
 *   node tools/check/check_refimg.js --update   # build_refimg_manifest 호출로 매니페스트 재생성
 */

// @spec none (참조자료 이미지 정합 게이트)
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');
const { collectImages } = require('../sync/build_refimg_manifest.js');

const ROOT = path.resolve(__dirname, '..', '..');
const UPDATE = process.argv.includes('--update');

function gitignoredSpec(rootAbs) {
  const rel = path.relative(ROOT, rootAbs).split(path.sep).join('/');
  return `${rel}/**/images/`;
}

/** .vercelignore는 중첩 ** 미지원 가능성으로 깊이별 라인 — 어느 하나라도 있으면 배포 제외로 간주 */
function vercelIgnoredSpec(rootAbs) {
  const rel = path.relative(ROOT, rootAbs).split(path.sep).join('/');
  return `${rel}/ref_md/*/images/`;
}

function trackedUnder(dirRel) {
  const lf = path.join(os.tmpdir(), 'refimg-lsfiles-' + process.pid + '.txt');
  try {
    execSync(`git -c core.quotepath=false ls-files "${dirRel}" > "${lf}"`, { cwd: ROOT, shell: true });
    return fs.readFileSync(lf, 'utf8').split('\n').filter(Boolean);
  } finally {
    try { fs.unlinkSync(lf); } catch {}
  }
}

function main() {
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  const vercelignorePath = path.join(ROOT, '.vercelignore');
  const vercelignore = fs.existsSync(vercelignorePath) ? fs.readFileSync(vercelignorePath, 'utf8') : '';
  const errors = [];
  const infos = [];

  for (const t of getExamTargets(ROOT)) {
    const refBase = path.join(ROOT, t.contentRoot, '참조자료');
    const hostingPath = path.join(refBase, 'pdf_hosting.json');
    const declared = fs.existsSync(hostingPath)
      && (JSON.parse(fs.readFileSync(hostingPath, 'utf8')).imageManifests || []).length > 0;
    const ignored = gitignore.includes(gitignoredSpec(refBase));
    const vIgnored = vercelignore.includes(vercelIgnoredSpec(refBase));

    if (ignored && !declared) {
      errors.push(`[${t.id}] .gitignore에 ref_md 이미지 제외가 있는데 pdf_hosting.json imageManifests 미선언 — 추적 유실 위험`);
      continue;
    }
    if (vIgnored && !declared) {
      errors.push(`[${t.id}] .vercelignore에 ref_md 이미지 제외가 있는데 imageManifests 미선언 — 배포본 이미지 404 위험`);
      continue;
    }
    if (!declared) continue;

    const hosting = JSON.parse(fs.readFileSync(hostingPath, 'utf8'));
    const files = collectImages(refBase);
    for (const m of hosting.imageManifests) {
      const mp = path.join(refBase, m);
      if (!fs.existsSync(mp)) {
        errors.push(`[${t.id}] ${m} 없음 — npm run build:refimg 으로 생성하세요`);
        continue;
      }
      const manifest = JSON.parse(fs.readFileSync(mp, 'utf8'));
      const mKeys = new Set(Object.keys(manifest.files || manifest));
      const missing = Object.keys(files).filter((k) => !mKeys.has(k));
      // 외부화 완료(선언+ignore+추적 없음) 팩은 로컬 파일 부재가 정상 — 매니페스트는
      // 원격 에셋 정본이며 배포 SW가 그대로 사용한다. 파일이 추적되는 전환 준비
      // 상태에서만 스테일(엔트리 O·파일 X)을 드리프트로 본다.
      const tracked = trackedUnder(path.join(t.contentRoot, '참조자료', 'ref_md'))
        .filter((f) => f.includes('/images/'));
      const externalized = ignored && !tracked.length;
      const stale = externalized ? [] : [...mKeys].filter((k) => !(k in files));
      if (missing.length) errors.push(`[${t.id}] ${m}: 미등록 이미지 ${missing.length}건 — npm run build:refimg (예: ${missing[0]})`);
      if (stale.length) errors.push(`[${t.id}] ${m}: 스테일 항목 ${stale.length}건 — 파일 삭제 후 미재생성 (예: ${stale[0]})`);
      if (!missing.length && !stale.length) {
        if (externalized && !vIgnored) {
          errors.push(`[${t.id}] git 추적 해제됐는데 .vercelignore 미제외 — 배포본만 이미지 서빙 불가`);
          continue;
        }
        const state = externalized ? '외부화 완료' : `전환 준비 (추적 ${tracked.length}파일)`;
        infos.push(`[${t.id}] ${m} — ${mKeys.size}개 정합 · ${state}`);
      }
    }
  }

  for (const i of infos) console.log(i);
  if (errors.length) {
    for (const e of errors) console.error('❌ ' + e);
    console.error('\n  조치: node tools/check/check_refimg.js --update (또는 npm run build:refimg)');
    process.exit(1);
  }
  console.log('✅ refimg 매니페스트 정합 — 선언 시험 모두 일치' + (Object.keys(infos).length ? '' : ' (선언 시험 없음)'));
}

if (UPDATE) {
  execSync('node tools/sync/build_refimg_manifest.js', { cwd: ROOT, stdio: 'inherit', shell: true });
}
main();
