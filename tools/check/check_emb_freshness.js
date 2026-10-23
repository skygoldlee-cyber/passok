#!/usr/bin/env node
/**
 * check_emb_freshness.js — 임베딩 번들 ↔ 소비 원본 번들 신선도 검증 (SEM-05)
 *
 * `{dataRoot}/embeddings/manifest.js`의 `inputs`(빌드 시 소비한 번들의
 * sha1 목록)를 현재 파일과 비교한다. 원본이 바뀌었거나 입력 파일 집합이
 * 달라지면 `npm run build:embeddings` 재실행이 필요하다.
 *
 * 입력 집합 재현 규칙은 tools/build/build_embeddings.js 의
 * collectItems()와 동일해야 한다:
 *   - {dataRoot}/drills/ox_*.js
 *   - {dataRoot}/drills/combo_*.js  (index 제외)
 *   - {dataRoot}/exams/*.js
 *
 * 사용: node tools/check/check_emb_freshness.js   (불일치 시 exit 1)
 */

// @spec SEM-05
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const VAR_RE = /var\s+EMB_MANIFEST\s*=\s*/;

const errors = [];

function sha1(p) {
  // 개행 정규화 — 작업트리 CRLF/LF 차이로 해시가 갈리면 Windows↔CI 간 오탐 발생
  return crypto.createHash('sha1').update(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
}

function loadManifest(p) {
  const src = fs.readFileSync(p, 'utf8');
  const m = src.match(VAR_RE);
  if (!m) return null;
  const body = src.slice(m.index + m[0].length).trim().replace(/;\s*$/, '');
  return JSON.parse(body);
}

/** collect_items()의 glob 규칙과 동일한 입력 파일 집합 재현 */
function expectedInputs(dataRoot) {
  const rel = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');
  const out = [];
  const drills = path.join(ROOT, dataRoot, 'drills');
  if (fs.existsSync(drills)) {
    for (const f of fs.readdirSync(drills).sort()) {
      if (/^ox_.*\.js$/.test(f)) out.push(rel(path.join(drills, f)));
      else if (/^combo_.*\.js$/.test(f) && !f.includes('index')) out.push(rel(path.join(drills, f)));
    }
  }
  const exams = path.join(ROOT, dataRoot, 'exams');
  if (fs.existsSync(exams)) {
    for (const f of fs.readdirSync(exams).sort()) {
      if (f.endsWith('.js')) out.push(rel(path.join(exams, f)));
    }
  }
  return out;
}

console.log('='.repeat(70));
console.log('임베딩 번들 ↔ 원본 번들 신선도 검증 (SEM-05)');
console.log('='.repeat(70));

let scanned = 0;
for (const t of getExamTargets(ROOT)) {
  if (!t.features || !t.features.semantic) continue;
  const embDir = path.join(ROOT, t.dataRoot, 'embeddings');
  const manifestPath = path.join(embDir, 'manifest.js');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`[${t.id}] features.semantic=true이나 manifest 없음 → npm run build:embeddings 실행 필요`);
    continue;
  }
  scanned++;
  const mf = loadManifest(manifestPath);
  if (!mf || !mf.inputs) {
    errors.push(`[${t.id}] manifest.js 파싱 실패 또는 inputs 누락`);
    continue;
  }

  // 1) 입력 파일 해시 일치
  let mismatched = 0;
  for (const [rel, want] of Object.entries(mf.inputs)) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) {
      errors.push(`[${t.id}] 입력 파일 소실: ${rel} — npm run build:embeddings 재실행 필요`);
      mismatched++;
    } else if (sha1(p) !== want) {
      errors.push(`[${t.id}] 입력 변경: ${rel} — npm run build:embeddings 재실행 필요`);
      mismatched++;
    }
  }

  // 2) 입력 파일 집합 일치 (신규 번들 추가/삭제 감지)
  const expected = expectedInputs(t.dataRoot);
  const recorded = Object.keys(mf.inputs).sort();
  const missing = expected.filter(f => !recorded.includes(f));
  const extra = recorded.filter(f => !expected.includes(f));
  for (const f of missing) errors.push(`[${t.id}] 신규 입력 미반영: ${f} — npm run build:embeddings 재실행 필요`);
  for (const f of extra) errors.push(`[${t.id}] manifest에만 존재하는 입력: ${f} — npm run build:embeddings 재실행 필요`);

  // 3) manifest.files 산출물 존재
  for (const f of mf.files || []) {
    if (!fs.existsSync(path.join(embDir, f.file))) {
      errors.push(`[${t.id}] 선언 산출물 없음: embeddings/${f.file}`);
    }
  }

  console.log(`[${t.id}] 입력 ${recorded.length}개 · 항목 ${mf.items} · sourceHash ${mf.sourceHash}` +
    (mismatched ? ` (불일치 ${mismatched})` : ''));
}

if (!scanned) console.log('features.semantic 시험이 없습니다 — 건너뜁니다.');
if (errors.length) {
  console.log(`\n■ 오류 ${errors.length}건`);
  errors.forEach(e => console.log('  ' + e));
  process.exit(1);
}
if (scanned) console.log('\n✅ 임베딩 번들이 최신 원본과 일치합니다.');
