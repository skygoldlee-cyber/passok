#!/usr/bin/env node
/**
 * check_reflayout.js — 참조자료 4계층 정합성 검증 (전 시험 순회)
 *
 *   ① 물리 PDF 폴더    {contentRoot}/참조자료/{법령고시,공통,과목N,_archive}/*.pdf
 *   ② ref_md 변환본    {contentRoot}/참조자료/ref_md/과목N/{문서}/{문서}.md
 *   ③ references.json  {contentRoot}/references.json (refDirs·referenceFiles·subjectDirMap 선언)
 *   ④ 생성 규칙        references.json docSubjectRules → ref_statements.js docSubject()
 *
 * 검증 규칙 (시험별 독립 적용):
 *   - refDirs에 등록된 PDF → ref_md/과목N/{base}/{base}.md 존재 + N == docSubject(base)
 *   - 물리 PDF → refDirs에 등장 (미등록 PDF 차단, _archive 제외)
 *   - ref_md/과목N/{doc} → 출처 PDF 존재(고아 감지, references.json selfAuthoredDocs 선언 문서는 면제) + 폴더 과목 == docSubject(doc)
 *   - _archive PDF → ref_md 요구 없음 / _구 ref_md는 허용(교재 참조용, 생성 제외)
 *   - referenceFiles·Common·Law의 file → 참조자료/{dir}/{file} 실존
 *   - {contentRoot}/** 의 ref_md/ 링크 → 실제 파일 해석
 *
 * PDF 계층 조건부: 물리 PDF를 하나도 수록하지 않은 시험(원본 미수록 모델)은
 *   PDF 출처 정합(③-1~3)을 적용할 수 없어 ref_md 구조·과목 귀속·링크 정합만
 *   검사한다. refDirs 선언 PDF는 경고로 보고해 검증 공백을 가시화한다.
 *
 * 사용: node tools/check/check_reflayout.js
 *       npm run check:reflayout
 *
 * 의존성 없음 (Node 내장 모듈만 사용).
 */

// @spec CS-03,CS-09
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { getExamTargets } = require('../build/exam_targets.js');
const { docSubject } = require('../build/ref_statements.js');

const errors = [];
const warnings = [];
const notes = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);
const info = m => notes.push(m);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}
const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };

const summaries = [];

function checkExam(t) {
  const tag = `[${t.id}]`;
  const CONTENT = path.join(ROOT, t.contentRoot);
  const REF_BASE = path.join(CONTENT, '참조자료');
  const REF_MD = path.join(REF_BASE, 'ref_md');

  if (!fs.existsSync(REF_BASE)) { info(`${tag} 참조자료 없음 — 검사 대상 아님`); return; }
  const refsPath = path.join(CONTENT, 'references.json');
  if (!fs.existsSync(refsPath)) {
    err(`${tag} 참조자료 존재하나 references.json 없음 — refDirs·귀속 규칙 검증 불가`);
    return;
  }
  const refs = JSON.parse(fs.readFileSync(refsPath, 'utf8'));
  const subjectDirMap = refs.subjectDirMap || {};

  // ---------- ① 물리 PDF 수집 ----------
  const physicalPdfs = {}; // basename → dir
  const allPdfDirs = fs.readdirSync(REF_BASE, { withFileTypes: true })
    .filter(e => e.isDirectory() && !/^ref_md/.test(e.name))
    .map(e => e.name);
  for (const d of allPdfDirs) {
    for (const f of fs.readdirSync(path.join(REF_BASE, d))) {
      if (!f.endsWith('.pdf')) continue;
      const base = f.replace(/\.pdf$/, '');
      if (physicalPdfs[base]) err(`${tag} 중복 PDF: ${base} (${physicalPdfs[base]}/ 와 ${d}/)`);
      physicalPdfs[base] = d;
    }
  }
  const hasPdfs = Object.keys(physicalPdfs).length > 0;
  const listed = new Set();

  // ---------- ② ref_md 문서 수집 ----------
  const refMdDocs = {}; // doc → {subject, mdPath}
  if (fs.existsSync(REF_MD)) {
    for (const e of fs.readdirSync(REF_MD, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const sm = e.name.match(/^과목(\d)$/);
      if (!sm) continue; // index.html 등 비과목 항목 무시
      const subj = +sm[1];
      for (const d of fs.readdirSync(path.join(REF_MD, e.name), { withFileTypes: true })) {
        if (!d.isDirectory()) continue;
        const mdPath = path.join(REF_MD, e.name, d.name, d.name + '.md');
        refMdDocs[d.name] = { subject: subj, mdPath };
        if (!fs.existsSync(mdPath)) err(`${tag} ref_md/${e.name}/${d.name}/ 에 ${d.name}.md 없음`);
      }
    }
  }

  // ---------- ③ PDF 출처 정합 (물리 PDF 수록 시험에만 적용) ----------
  if (hasPdfs) {
    // ③-1 refDirs: 목록↔물리 양방향
    for (const [dir, files] of Object.entries(refs.refDirs || {})) {
      if (!allPdfDirs.includes(dir)) { err(`${tag} refDirs 폴더 '${dir}'가 참조자료/에 없음`); continue; }
      for (const f of files) {
        listed.add(f);
        if (!fs.existsSync(path.join(REF_BASE, dir, f))) err(`${tag} refDirs[${dir}] 미존재 파일: ${f}`);
      }
    }
    for (const [base, dir] of Object.entries(physicalPdfs)) {
      if (dir === '_archive') continue;
      if (!listed.has(base + '.pdf')) err(`${tag} 물리 PDF가 refDirs 미등록: ${dir}/${base}.pdf`);
    }

    // ③-2 PDF → ref_md (귀속 정합)
    for (const [dir, files] of Object.entries(refs.refDirs || {})) {
      if (dir === '_archive') continue;
      for (const f of files) {
        const base = f.replace(/\.pdf$/, '');
        const doc = refMdDocs[base];
        if (!doc) { err(`${tag} ref_md 변환본 없음: ${dir}/${f}`); continue; }
        const ruleSubj = docSubject(base, CONTENT);
        if (ruleSubj && doc.subject !== ruleSubj)
          err(`${tag} 과목 불일치: ${base} — ref_md/과목${doc.subject} vs 규칙=과목${ruleSubj}`);
      }
    }

    // ③-3 ref_md → 출처 PDF (고아 감지) + 폴더 과목 정합
    const selfAuthored = new Set(refs.selfAuthoredDocs || []); // 출처 PDF 없는 자체 작성 문서
    for (const [doc, info2] of Object.entries(refMdDocs)) {
      const src = physicalPdfs[doc];
      if (!src) {
        if (!selfAuthored.has(doc)) err(`${tag} 출처 PDF 없는 ref_md: 과목${info2.subject}/${doc}`);
        else { const rs2 = docSubject(doc, CONTENT); if (rs2 && info2.subject !== rs2) err(`${tag} ref_md 폴더 과목 불일치: ${doc} — 폴더=과목${info2.subject}, 규칙=과목${rs2}`); }
        continue;
      }
      if (/_구$/.test(doc)) {
        if (src !== '_archive') warn(`${tag} _구 문서 PDF가 _archive 밖에 있음: ${src}/${doc}.pdf`);
        continue;
      }
      if (src === '_archive') { err(`${tag} 서비스 ref_md의 출처가 _archive: ${doc}`); continue; }
      const ruleSubj = docSubject(doc, CONTENT);
      if (ruleSubj && info2.subject !== ruleSubj)
        err(`${tag} ref_md 폴더 과목 불일치: ${doc} — 폴더=과목${info2.subject}, 규칙=과목${ruleSubj}`);
    }
  } else {
    const declared = Object.values(refs.refDirs || {}).flat().length;
    if (declared) warn(`${tag} PDF 원본 미수록 — refDirs 선언 ${declared}건의 출처 정합 검증 불가`);
    if (Object.keys(refMdDocs).length)
      info(`${tag} PDF 부재 — ref_md ${Object.keys(refMdDocs).length}건은 구조·귀속·링크만 검사`);
  }

  // ---------- ③-4 UI 항목 실존 ----------
  function checkEntry(e, where) {
    if (!e.file) return;
    if (!hasPdfs && e.type === 'pdf') return; // 원본 미수록 시험 — PDF 실존 검증 대상 아님
    const dir = e.dir || (where && subjectDirMap[where]) || null;
    if (!dir) { warn(`${tag} dir 없음 — 위치 검증 불가: ${where} '${e.name}'`); return; }
    const p = path.join(REF_BASE, dir, e.file);
    if (!fs.existsSync(p)) err(`${tag} UI 항목 파일 없음: ${where} '${e.name}' → ${dir}/${e.file}`);
  }
  for (const [subj, arr] of Object.entries(refs.referenceFiles || {}))
    for (const e of arr) checkEntry(e, subj);
  for (const e of refs.referenceCommon || []) checkEntry(e, '공통');
  for (const e of refs.referenceLaw || []) checkEntry(e, '법령고시');

  // ---------- ④ ref_md 링크 해석 ----------
  let linkOk = 0, linkBad = 0;
  for (const f of walk(CONTENT)) {
    if (!/\.(md|html)$/i.test(f)) continue;
    if (f.includes(`${path.sep}ref_md${path.sep}`)) continue; // ref_md 내부 문서는 제외
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/ref_md\/([^<>\n]*?\.md)/g)) {
      const rel = dec(m[1]);
      if (fs.existsSync(path.join(REF_MD, rel))) linkOk++;
      else { linkBad++; if (linkBad <= 8) err(`${tag} 깨진 링크: ${path.relative(CONTENT, f)} → ref_md/${rel.slice(0, 80)}`); }
    }
  }

  summaries.push({
    id: t.id,
    pdfs: Object.keys(physicalPdfs).length,
    listed: listed.size,
    docs: Object.keys(refMdDocs).length,
    linkOk, linkBad,
  });
}

for (const t of getExamTargets(ROOT)) checkExam(t);

// ---------- 리포트 ----------
console.log('='.repeat(70));
console.log('참조자료 레이아웃 정합성 검증 (전 시험)');
console.log('='.repeat(70));
for (const s of summaries)
  console.log(`[${s.id}] PDF: 물리 ${s.pdfs}개 / refDirs 등록 ${s.listed}개 · ref_md 문서 ${s.docs}개 / 링크: 정상 ${s.linkOk}, 깨짐 ${s.linkBad}`);
if (notes.length) {
  console.log('\n■ 정보');
  notes.forEach(n => console.log('  ' + n));
}
if (warnings.length) {
  console.log('\n■ 경고');
  warnings.forEach(w => console.log('  ' + w));
}
if (errors.length) {
  console.log(`\n■ 오류 ${errors.length}건`);
  errors.forEach(e => console.log('  ' + e));
  process.exit(1);
}
console.log('\n✅ 정합성 검증 통과');
