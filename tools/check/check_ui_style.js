#!/usr/bin/env node
/**
 * check_ui_style.js — UI 스타일 규약 정적 검사 (CODE_CONVENTIONS §4)
 *
 * 코드 규약 정본(docs/CODE_CONVENTIONS.md §4 금지 패턴) 중 런타임이 아닌
 * 정적 스캔으로 판정 가능한 4개 규칙을 커밋 전에 차단한다:
 *
 *   ① 인라인 style 속성 — html/·index.template.html 마크업의 `style="…"` 전면
 *      금지 (표시 상태·레이아웃 모두 클래스로 표현; 유틸리티 .is-hidden 등).
 *   ② JS display 조작 — src/ 의 `.style.display =`·`.style.setProperty('display',…)`
 *      금지 (선언적 게이팅 — is-hidden 클래스 토글로 대체).
 *   ③ 인라인 이벤트 핸들러 — 마크업과 JS 템플릿 리터럴의 `onclick=` 등
 *      `on*` 속성 금지 (data-click 위임 사용).
 *   ④ 네이티브 다이얼로그 — bare `alert(`/`confirm(`/`prompt(` 호출 및
 *      `window.*` 경유 호출 금지. `.prompt()` 등 메서드 호출(PWA deferredPrompt 등)은 면제.
 *   ⑤ JS 템플릿 인라인 style 속성 — src/ 의 `style="…"` 중
 *      - `display:none` 포함은 즉시 위반 (표시 상태는 클래스로)
 *      - 정적 선언(보간 ${} 없음)은 기준선 래칫 — JS_STYLE_BASELINE 이하,
 *        단조 감소. diff 스코프(--ref)에서는 변경 파일 내 정적 style= 전부
 *        신규로 간주해 0건 요구 (check:escape와 동형)
 *      - 보간 포함(style="--w:${x}" 등 동적 값)은 허용 — 리뷰 등급
 *
 * 면제: 위반 라인에 `style-ok` 토큰이 있으면 허용 (esc-ok와 같은 명시 면제 장치).
 *
 * 사용법:
 *   npm.cmd run check:uistyle   # 단독 실행
 */

// @spec UX-VFY-08,UX-FB-02 (마크업 선언 규약 정적 강제 + 네이티브 다이얼로그 금지)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const issues = [];

// ⑤ 기준선 — src/ JS 템플릿 내 정적 style="…"(보간 없는) 승계 상한.
// 클래스화가 진행될수록 이 수치를 함께 낮춘다 (단조 감소 — 신규 유입 차단).
const JS_STYLE_BASELINE = 145; // 2026-10-13 daily-challenge 이관 후 실측
const staticStyleFindings = [];

/* --ref: ref..HEAD+미커밋 변경 파일만 스캔 (pre-push·CI diff 스코프 경로) */
const { refFromArgs, changedFiles } = require('./changed_files.js');
const ref = refFromArgs(process.argv.slice(2));
const scoped = ref ? new Set(changedFiles(ref).map((f) => f.replace(/\\/g, '/'))) : null;

function* walk(dir, exts) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, exts);
    else if (exts.includes(path.extname(e.name))) yield p;
  }
}

function scanFile(relPath, rules) {
  relPath = relPath.replace(/\\/g, '/');
  if (scoped && !scoped.has(relPath)) return;
  if (!fs.existsSync(path.join(ROOT, relPath))) return;
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('style-ok')) return; // 명시 면제
    for (const { label, re } of rules) {
      if (re.test(line)) issues.push(`${relPath}:${i + 1} — ${label} 위반: ${line.trim().slice(0, 100)}`);
    }
  });
}

/* ① 마크업 인라인 style 속성 (전면 금지) */
const markupRules = [
  { label: '인라인 style 속성', re: /\sstyle\s*=\s*["']/ },
  /* ③ 인라인 이벤트 핸들러 속성 */
  { label: '인라인 이벤트 핸들러', re: /\son[a-z]+\s*=\s*["']/i },
];
for (const f of walk(path.join(ROOT, 'html'), ['.html'])) {
  scanFile(path.relative(ROOT, f), markupRules);
}
scanFile('index.template.html', markupRules);

/* ② JS display 조작 + ③ 템플릿 내 핸들러 + ④ 네이티브 다이얼로그 + ⑤ 템플릿 인라인 스타일 */
const jsRules = [
  { label: 'JS display 인라인 조작', re: /\.style\.display\s*=/ },
  { label: 'JS display 인라인 조작', re: /\.style\.setProperty\(\s*['"]display['"]/ },
  { label: '인라인 이벤트 핸들러', re: /\son[a-z]+\s*=\s*["']/i },
  { label: '네이티브 다이얼로그', re: /(?<![\w$.])(?:window\s*\.\s*)?(alert|confirm|prompt)\s*\(/ },
  /* ⑤-a 표시 상태를 마크업 속성으로 — is-hidden 등 클래스 필수 */
  { label: 'JS 템플릿 display:none 속성', re: /\sstyle\s*=\s*"[^"]*display\s*:\s*none/ },
];
for (const f of walk(path.join(ROOT, 'src'), ['.js'])) {
  const rel = path.relative(ROOT, f);
  scanFile(rel, jsRules);

  /* ⑤-b 정적 style="…" 속성 계수 (보간 없는 선언 — 클래스화 대상 기준선) */
  const relNorm = rel.replace(/\\/g, '/');
  if (scoped && !scoped.has(relNorm)) continue;
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('style-ok')) return;
    for (const m of line.matchAll(/\sstyle\s*=\s*"([^"]*)"/g)) {
      if (!m[1].includes('${')) {
        staticStyleFindings.push(`${relNorm}:${i + 1} — 정적 style 속성: ${m[1].slice(0, 80)}`);
      }
    }
  });
}
// diff 스코프 — 변경 파일 내 정적 style= 은 전부 신규로 간주해 위반 처리
if (scoped) {
  staticStyleFindings.forEach((m) => issues.push(`${m} (⑤ JS 템플릿 인라인 스타일)`));
}

if (!scoped) {
  console.log(`   ⑤ JS 템플릿 정적 style= 속성: ${staticStyleFindings.length}건 (기준선 ${JS_STYLE_BASELINE}건)`);
  if (staticStyleFindings.length > JS_STYLE_BASELINE) {
    console.error(`❌ check:uistyle — JS 템플릿 인라인 스타일 기준선 초과 (${staticStyleFindings.length} > ${JS_STYLE_BASELINE})`);
    staticStyleFindings.slice(0, 40).forEach((m) => console.error(`   ${m}`));
    console.error('   신규 정적 스타일은 CSS 클래스로 추가하세요 · 동적 값만 style="--var:${x}" 허용 · 면제: style-ok 토큰');
    process.exit(1);
  }
}
if (issues.length) {
  console.error(`❌ check:uistyle — UI 스타일 규약 위반 ${issues.length}건 (정본: docs/CODE_CONVENTIONS.md §4)`);
  issues.forEach((m) => console.error(`   ${m}`));
  console.error('   대체 수단: 클래스 토글(.is-hidden 등)·data-click 위임·showToast/커스텀 다이얼로그 · 면제: 라인에 style-ok 토큰');
  process.exit(1);
}
console.log('✅ check:uistyle — 인라인 스타일·display 조작·인라인 핸들러·네이티브 다이얼로그 위반 없음');
