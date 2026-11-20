#!/usr/bin/env node
/**
 * audit_exam_size.js — 시험 팩 콘텐츠 규모 리포트 (advisory)
 *
 * check_content_size.js 게이트의 수집기를 재사용해 팩별 규모·구성을 표로
 * 보여준다 — 어떤 팩이 왜 커졌는지, 외부화·퇴역(retired) 우선순위 판단용.
 *
 *   열: tier / 총량(추적 MB) / 예산 사용률 / 파일 수 / 상위 디렉터리 구성
 *
 * 사용법:
 *   node tools/audit/audit_exam_size.js           # 리포트
 *   node tools/audit/audit_exam_size.js --json    # JSON 출력
 *   npm run audit:size
 */

// @spec none (콘텐츠 규모 감사)
const fs = require('fs');
const path = require('path');
const { collectExamSizes } = require('../check/check_content_size.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MB = 1024 * 1024;

function tierOf(entry) {
  return entry.tier || (entry.comingSoon ? 'pilot' : 'active');
}

function topDirs(byDir, n = 3) {
  return Object.entries(byDir)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([d, b]) => `${d} ${(b / MB).toFixed(0)}MB`)
    .join(' · ');
}

function main() {
  const asJson = process.argv.includes('--json');
  const examsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8'));
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'state', 'content_size_baseline.json'), 'utf8'));
  const budgets = base.exams || {};
  const sizes = collectExamSizes();
  const meta = Object.fromEntries((examsJson.exams || []).map((e) => [e.id, e]));

  const rows = Object.entries(sizes)
    .map(([id, s]) => ({
      id,
      tier: tierOf(meta[id] || {}),
      mb: s.total / MB,
      budget: budgets[id] ? budgets[id].budget_mb : null,
      files: s.files,
      present: s.present,
      top: topDirs(s.byDir),
    }))
    .sort((a, b) => b.mb - a.mb);

  if (asJson) { console.log(JSON.stringify(rows, null, 2)); return; }

  const totalMb = rows.reduce((n, r) => n + r.mb, 0);
  console.log('시험 팩 콘텐츠 규모 감사 (git 추적 파일 기준)\n');
  const W = Math.max(10, Math.max(...rows.map((r) => r.id.length)) + 1);
  console.log('  ' + 'id'.padEnd(W) + 'tier'.padEnd(8) + '총량'.padStart(9) + '예산'.padStart(12) + '파일'.padStart(7) + '  주요 구성');
  for (const r of rows) {
    const pct = r.budget ? ` /${r.budget}MB(${Math.round((r.mb / r.budget) * 100)}%)` : '  미등록';
    const ghost = r.present ? '' : ' [sparse 제외]';
    console.log('  ' + r.id.padEnd(W) + r.tier.padEnd(8) + (r.mb.toFixed(1) + 'MB').padStart(9) + pct.padStart(12) + String(r.files).padStart(7) + '  ' + r.top + ghost);
  }
  console.log(`\n합계 ${(totalMb / 1024).toFixed(2)}GB · ${rows.length}개 팩 · 예산/스탬프: tools/state/content_size_baseline.json`);
  console.log('  → 예산 초과 방지 게이트: npm run check:size · 팩 선택 체크아웃: npm run pack:use');
}

main();
