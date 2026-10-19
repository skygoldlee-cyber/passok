#!/usr/bin/env node
/* ============================================================
 * tools/build/build_ref_mapping.js
 * ------------------------------------------------------------
 * TEXTBOOK_REFERENCE_MAPPING.md §2 표를 교재 `📌출처`·`출처` 라인의
 * ref_md 링크 실측으로 재생성한다.
 *
 * 입력 : docs/exams/*\/reference/TEXTBOOK_REFERENCE_MAPPING.md 전수 스캔
 *        (시험 ID는 문서 경로에서 도출 — 교재는 content/exams/<id>/교재/ 의 *_표준형.md)
 * 출력 : 각 문서의 `<!-- refmap:auto:start -->` ~ `<!-- refmap:auto:end -->` 구간만 치환
 *        — 마커 밖(원칙·관찰·잔여 과제)은 수동 영역으로 보존
 *
 * 사용 : node tools/build/build_ref_mapping.js          # §2 표 재생성
 *        node tools/build/build_ref_mapping.js --check  # 신선도 검증 — 교재 출처와
 *                                                       # 표가 다르면 exit 1 (check:fresh에 포함)
 *
 * 규약:
 *  - 챕터 경계는 `## 📚 Chapter NN.` 헤딩. 백매터(`## 📚 참조 자료`)는 제외.
 *  - 문서명 표기는 꼬리 `(기관)(제N호)(시행일)`를 뺀 정식 명칭 + `(과N)` 귀속 과목.
 *  - 귀속 과목은 링크 경로의 `ref_md/과목N/`에서 취한다 — 교재 과목과 다르면 교차 인용.
 * ============================================================ */

// @spec RR-01
'use strict';

const fs = require('fs');
const path = require('path');
const glob = (dir, pat) => {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && pat.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
};

const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_GLOB = path.join(ROOT, 'docs/exams');
const MARK_START = '<!-- refmap:auto:start -->';
const MARK_END = '<!-- refmap:auto:end -->';

// ref_md/과목N/<doc>/ 링크에서 귀속 과목 + 문서명(꼬리 제거) 추출
// 디렉터리명은 디코딩하면 괄호를 포함하므로 인코딩 상태로 추출 후 이름만 디코딩
function refName(raw) {
  const m = raw.match(/ref_md\/(과목\d)\/([^/]+)\//);
  if (!m) return null;
  const short = decodeURIComponent(m[2]).replace(/\([^)]*\)/g, '').trim();
  return { subj: m[1].replace('과목', '과'), short };
}

function scanTextbook(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const chapters = [];
  let cur = null, back = false;
  for (const l of lines) {
    if (/^## 📚 참조 자료/.test(l)) { back = true; continue; }
    const h = l.match(/^## 📚 Chapter (\d+)\.?\s*(.*)/);
    if (h) {
      cur = { num: 'Ch' + h[1].padStart(2, '0'), title: h[2].trim(), docs: new Map() };
      chapters.push(cur); back = false;
    }
    if (back || !cur) continue;
    if (!l.includes('ref_md/')) continue;
    for (const m of l.matchAll(/\(([^)]*ref_md[^)]*)\)|ref_md\/(과목\d)\/([^/)\s]+)\//g)) {
      const raw = m[1] || ('ref_md/' + m[2] + '/' + m[3] + '/');
      const r = refName(raw);
      if (r) cur.docs.set(r.short + ` (${r.subj})`, true);
    }
  }
  return chapters;
}

function subjectTitle(file) {
  // 1과목_화장품법의이해_표준형.md → "1과목 — 화장품법의이해"
  const base = path.basename(file).replace(/_표준형\.md$/, '');
  const m = base.match(/^(\d+과목)_(.+)$/);
  return m ? `${m[1]} — ${m[2]}` : base;
}

function buildSection(textbookDir) {
  const out = ['## 2. 전 과목 매핑 표 (교재 `📌출처` 실측)', ''];
  const files = glob(textbookDir, /_표준형\.md$/);
  files.forEach((f, i) => {
    out.push(`### 2.${i + 1} ${subjectTitle(f)}`, '');
    out.push('| 교재 챕터 | 근거 ref 문서 |', '|-----------|--------------|');
    for (const ch of scanTextbook(f)) {
      const docs = [...ch.docs.keys()];
      out.push(`| ${ch.num}. ${ch.title} | ${docs.length ? docs.join(' · ') : '— (본문 ref_md 링크 없음)'} |`);
    }
    out.push('');
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function main() {
  const check = process.argv.includes('--check');
  // docs/exams/<id>/reference/TEXTBOOK_REFERENCE_MAPPING.md 전수 — 시험 ID는 경로에서 도출
  const docs = [];
  for (const exam of fs.readdirSync(DOCS_GLOB, { withFileTypes: true })) {
    if (!exam.isDirectory()) continue;
    const p = path.join(DOCS_GLOB, exam.name, 'reference', 'TEXTBOOK_REFERENCE_MAPPING.md');
    if (fs.existsSync(p)) docs.push({ exam: exam.name, doc: p });
  }
  if (!docs.length) { console.error('❌ 매핑 문서 없음'); process.exit(1); }
  let stale = 0;
  for (const { exam, doc: docPath } of docs) {
    const textbookDir = path.join(ROOT, 'content/exams', exam, '교재');
    const doc = fs.readFileSync(docPath, 'utf8');
    const si = doc.indexOf(MARK_START), ei = doc.indexOf(MARK_END);
    if (si < 0 || ei < 0) { console.error(`⚠️ [${exam}] 마커 없음 — 스킵`); continue; }
    const next = doc.slice(0, si + MARK_START.length) + '\n\n' + buildSection(textbookDir) + '\n' + doc.slice(ei);
    if (next === doc) { console.log(`✅ [${exam}] 매핑 표 최신`); continue; }
    if (check) { stale++; console.error(`❌ [${exam}] 매핑 표 불일치 — build:refmap 필요`); continue; }
    fs.writeFileSync(docPath, next);
    console.log(`✅ [${exam}] §2 표 재생성`);
  }
  if (check && stale) { console.error(`불일치 ${stale}건 — node tools/build/build_ref_mapping.js 실행 필요`); process.exit(1); }
}

main();
