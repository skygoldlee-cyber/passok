#!/usr/bin/env node
/**
 * check_mobile_safe.js — 모바일 잘림 안전 규약 정적 검사 (UX-VFY-06)
 *
 * E2E 오버플로 스윕(mobile-overflow.spec.js)이 런타임 실측을 담당한다면,
 * 이 검사는 커밋 전 정적 패턴으로 신규 위반을 조기 차단한다:
 *
 *   ① .dialog-card 계약 — css/base.css에 규약 클래스가 max-height+overflow와
 *      함께 정의돼 있는지. role="dialog"/"alertdialog" 카드 마크업(html·JS
 *      템플릿)이 .dialog-card(또는 자체 스크롤 계약이 있는 예외 목록)를 갖는지.
 *   ② 버튼 행 줄바꿈 — 컨테이너 div가 flex-row/flex-center로 버튼 2개 이상을
 *      나열하면서 flex-wrap/btn-row 계열이 없으면 위반. 의도된 nowrap은
 *      data-msafe-ok 속성으로 명시적 면제한다.
 *   ②b 액션 행 CSS 래핑 — -actions로 끝나는 flex 컨트롤 행 셀렉터가
 *      flex-wrap 없이 선언되면 위반 (마크업 클래스 명명과 무관하게 탐지).
 *   ③ 컨트롤 높이 — 인터랙티브 셀렉터의 height/min-height 44px 미만
 *      px 리터럴 탐지. --control-h-* 토큰 사용이 정답 (UX-CTL-01/06).
 *
 * 허용 목록 — 자체 뷰포트 상한+스크롤 계약이 이미 있는 대화상자 구조:
 *   - .more-sheet-panel        (72vh 상한 + .more-sheet-scroll 본문)
 *   - .reader-table-modal-content (85vh + overflow:auto — .dialog-card 병기됨)
 *   - #exam-overlay / doc-overlay 셸 (flex column + 전용 스크롤 영역)
 *   - #html-ref-overlay        (hr-ov-scroll 전용 스크롤 영역)
 *   - #app-fallback-overlay    (인라인 스타일 부트 스트랩, 단문 내용)
 *
 * 사용법:
 *   npm.cmd run check:mobilesafe   # 단독 실행
 */

// @spec UX-VFY-06,UX-CTL-06
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/* role="dialog" 요소 자체·카드에 붙지 않아도 되는 예외 — 자체 스크롤 계약 보유 */
const DIALOG_EXEMPT_CLASSES = new Set([
  'more-sheet', 'more-sheet-panel', 'reader-table-modal',
  'exam-overlay', 'doc-overlay', 'html-ref-overlay', 'app-fallback-overlay',
  'f-weigh-overlay', // 오버레이(배경) 측 — 카드 .f-weigh-card가 dialog-card 보유
]);

/* ②에서 버튼 2+ 나열을 허용하는 행 클래스 — 자체 줄바꿈/분할 규칙 보유 */
const ROW_EXEMPT_CLASSES = [
  'flex-wrap', 'btn-row', 'dict-search-row', 'flex-btns', 'grid-btns',
  'more-sheet-grid', 'flex-col', 'flex-between', 'formula-biz-bar',
  'auth-pw-row', 'f-weigh-foot', 'cing-foot', 'app-confirm-actions',
  'calc-scratchpad-header', 'review-item-header',
];

const issues = [];

/* ── ① .dialog-card 규약 클래스 존재 ─────────────────────────── */
const baseCss = fs.readFileSync(path.join(ROOT, 'css/base.css'), 'utf8');
const cardRule = baseCss.match(/\.dialog-card\s*\{([^}]*)\}/);
if (!cardRule) {
  issues.push('css/base.css — .dialog-card 규약 클래스가 없습니다');
} else if (!/max-height/.test(cardRule[1]) || !/overflow/.test(cardRule[1])) {
  issues.push('css/base.css — .dialog-card에 max-height + overflow가 필요합니다 (UX-FB-06)');
}

/* ── role="dialog" 카드의 .dialog-card 클래스 ─────────────────── */
function* walk(dir, exts) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, exts);
    else if (exts.includes(path.extname(e.name))) yield p;
  }
}

// 실제 열린 태그 안의 role="dialog"만 매칭 — 셀렉터 문자열('[role="dialog"]')·
// 주석 텍스트는 <tag 형태가 아니라 자동 배제된다
const DIALOG_RE = /<[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]*)?role="(?:alert)?dialog"[^<>]*>/g;
let dialogScanned = 0;

function scanDialogs(file, rel) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(DIALOG_RE)) {
    dialogScanned++;
    const tag = m[0];
    const cls = tag.match(/class="([^"]*)"/)?.[1] || '';
    const lookahead = src.slice(m.index, m.index + 600);
    if (cls.split(/\s+/).some(c => DIALOG_EXEMPT_CLASSES.has(c))) continue;
    if (cls.includes('dialog-card') || lookahead.includes('dialog-card')) continue;
    issues.push(`${rel} — role="dialog" 카드에 .dialog-card 클래스가 없습니다 (line ~${src.slice(0, m.index).split('\n').length})`);
  }
}

for (const entry of [path.join(ROOT, 'src'), path.join(ROOT, 'html')]) {
  for (const file of walk(entry, ['.js', '.html'])) {
    scanDialogs(file, path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}
// index.template.html은 html/ 밖에 있으므로 별도 스캔
if (fs.existsSync(path.join(ROOT, 'index.template.html'))) {
  scanDialogs(path.join(ROOT, 'index.template.html'), 'index.template.html');
}

/* ── ② 버튼 2+ nowrap 행 ─────────────────────────────────────── */
// <div|nav|section|header|footer|span ... class="...flex-row|flex-center...">
// 태그부터 같은 깊이의 첫 </div> 계열 닫힘까지(최대 20줄) <button 개수 집계
const ROW_RE = /<(div|nav|section|header|footer|span)[^>]*class="([^"]*)"/g;
let rowScanned = 0;

for (const file of walk(path.join(ROOT, 'html'), ['.html'])) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(ROW_RE)) {
      const cls = m[2];
      if (!/\b(flex-row|flex-center)\b/.test(cls)) continue;
      if (ROW_EXEMPT_CLASSES.some(c => cls.includes(c))) continue;
      if (/data-msafe-ok/.test(line)) continue;
      // 태그 안에 data-msafe-ok가 다음 속성으로 올 수 있으니 태그 끝까지 확인
      const tagRest = line.slice(m.index);
      if (/data-msafe-ok/.test(tagRest.split('>')[0] || '')) continue;
      // 태그 위치부터 같은 깊이의 닫힘까지(최대 20줄) <button 개수 집계
      let buttons = 0, depth = 0, j = i;
      for (; j < Math.min(i + 20, lines.length); j++) {
        const seg = j === i ? lines[j].slice(m.index) : lines[j];
        const opens = (seg.match(/<div\b/g) || []).length;
        const closes = (seg.match(/<\/div>/g) || []).length;
        buttons += (seg.match(/<button\b/g) || []).length;
        depth += opens - closes;
        if (j > i && depth <= 0) break;
        if (j === i && depth <= 0 && opens === 0) break;
      }
      rowScanned++;
      if (buttons >= 2) {
        issues.push(`${rel}:${i + 1} — 버튼 ${buttons}개를 나열한 nowrap 행 (.${cls.split(' ')[0]}) — flex-wrap·btn-row 또는 data-msafe-ok 필요`);
      }
    }
  }
}

/* ── ②b 액션 행 CSS 래핑 계약 — `*-actions` 명명의 컨트롤 행은 flex-wrap 필수 ──
   ②는 마크업의 flex-row/flex-center 클래스만 스캔하므로, CSS에서 display:flex로
   선언되는 -actions 명명 행(.result-actions 사례)은 탐지 밖이었다. 셀렉터가
   -actions로 끝나는 행 컨테이너가 nowrap이면 모바일에서 버튼이 눌려 넘친다.
   column 스택은 자동 통과. 의도된 nowrap은 예외 목록에 사유와 함께 선언한다. */
const ACTION_ROW_EXEMPT = [
  ['.header-actions', '헤더 우측 밀집 행 — 모바일 미디어쿼리에서 버튼 축소 보정 (app-responsive)'],
  ['.app-confirm-actions', '모바일 세로 스택 미디어쿼리 보유 (.btn-row 동형 — app-responsive)'],
  ['.flashcard-actions', '모바일 전용 규칙 — 평가 버튼 flex:1 등분 (study.css @media)'],
  ['.textbook-card-actions', 'space-between 단일 토글 버튼 — 래핑 불필요'],
];
let actionRowScanned = 0;
for (const file of walk(path.join(ROOT, 'css'), ['.css'])) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (sel.startsWith('@')) continue;
    const selBase = sel.replace(/::?[\w-]+(\([^)]*\))?$/, '').trim();
    if (!/\.[\w-]*-actions$/.test(selBase)) continue;
    if (!/display\s*:\s*flex/.test(body)) continue;
    if (/flex-direction\s*:\s*column/.test(body)) continue;
    actionRowScanned++;
    if (/flex-wrap\s*:\s*wrap/.test(body)) continue;
    if (ACTION_ROW_EXEMPT.some(([ex]) => selBase.includes(ex))) continue;
    issues.push(`${rel} — ${sel.slice(0, 60)}: 컨트롤 액션 행에 flex-wrap 없음 — 모바일에서 버튼이 눌려 넘침. flex-wrap: wrap 추가 또는 ACTION_ROW_EXEMPT에 사유 선언`);
  }
}

/* ── ③ 컨트롤 높이 규약 (UX-CTL-06) — 인터랙티브 셀렉터의 44px 미만 px 리터럴 ──
   CSS 규칙 블록을 스캔해 인터랙티브 패턴 셀렉터의 height/min-height가
   44px 미만 px 리터럴이면 위반. var(--control-h-*) 토큰 사용은 합격
   (sm=36px 계층도 토큰으로 표현되므로 리터럴 검사만으로 통과).
   예외 셀렉터는 부분 문자열 매칭 — 사유를 함께 선언한다. */
const INTERACTIVE_SEL = ['button', 'select', '.btn', 'chip', '.tab-item', '.nav-item', '.settings-item', 'input', 'app-confirm'];
const HEIGHT_LITERAL_RE = /(?:min-)?height:\s*(\d+(?:\.\d+)?)px/;
const GAP_LITERAL_RE = /(?:^|;)\s*gap:\s*(\d+(?:\.\d+)?)px/;

/* ── ④ data-click 버튼 스타일 계약 (UX-CTL-02/06) — 클릭 액션 <button>은 스타일된 클래스 필수 ──
   class 부재·사멸 클래스(CSS 미정의, 예: .secondary)는 브라우저 기본 버튼으로 렌더돼
   높이·시각 규약을 우회한다 (care-home "이미지 파일 선택" 사례). 클래스 토큰 전부가
   CSS 선택자에 없으면 위반. 동적 클래스(${})는 정적 판정 불가로 스킵. */
const STYLED_CLASSES = new Set();
for (const file of walk(path.join(ROOT, 'css'), ['.css'])) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/\.([a-zA-Z_][\w-]*)/g)) STYLED_CLASSES.add(m[1]);
}

let clickScanned = 0;
for (const file of [...walk(path.join(ROOT, 'html'), ['.html']), ...walk(path.join(ROOT, 'src'), ['.js'])]) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<button\b[^>]*>/g)) {
    const tag = m[0];
    if (!tag.includes('data-click')) continue;
    if (/data-msafe-ok/.test(tag)) continue;
    const cls = tag.match(/class="([^"]*)"/)?.[1] || '';
    if (cls.includes('${')) continue;
    clickScanned++;
    if (!cls.split(/\s+/).some(c => c && STYLED_CLASSES.has(c))) {
      const line = src.slice(0, m.index).split('\n').length;
      issues.push(`${rel}:${line} — data-click 버튼에 스타일된 클래스 없음(사멸 추정): ${tag.slice(0, 70)} — class="btn..." 부여 (UX-CTL-02)`);
    }
  }
}

const CTL_HEIGHT_EXEMPT = [
  ['input[type="checkbox"]', '네이티브 체크박스 — 라벨·행이 터치 타겟 (UX-SET-03 면제 유지)'],
  ['input[type="radio"]', '네이티브 라디오 — 라벨이 터치 타겟'],
  ['.obs-chip input', '시각 숨김 입력 — span이 실제 칩 타겟'],
  ['.formula-rule-chip-x', '칩 내부 제거 ✕ — 칩 자체가 타겟'],
];
let ctlScanned = 0;

for (const file of walk(path.join(ROOT, 'css'), ['.css'])) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (sel.startsWith('@')) continue;
    if (!INTERACTIVE_SEL.some(p => sel.includes(p))) continue;
    ctlScanned++;
    const hm = body.match(HEIGHT_LITERAL_RE);
    const line = src.slice(0, m.index).split('\n').length;
    if (hm && parseFloat(hm[1]) < 44 && !CTL_HEIGHT_EXEMPT.some(([ex]) => sel.includes(ex))) {
      issues.push(`${rel}:${line} — 인터랙티브 요소의 높이 ${hm[1]}px (<44px): ${sel.slice(0, 60)} — --control-h-* 토큰 사용 (UX-CTL-01)`);
    }
    /* gap px 리터럴 ≥4px는 토큰 스케일 커버 범위라 전면 금지 — 0~3px 미세 간격만 예외.
       베어 요소로 끝나는 셀렉터는 요소 내부(아이콘↔텍스트) 간격이라 비대상 (UX-CTL-03) */
    const gm = body.match(GAP_LITERAL_RE);
    if (gm && parseFloat(gm[1]) >= 4
        && !/(button|a|input|select|textarea|label|span)\s*$/.test(sel)) {
      issues.push(`${rel}:${line} — 컨트롤 관련 셀렉터의 gap ${gm[1]}px 리터럴: ${sel.slice(0, 60)} — --gap-ctl/group/sec 토큰 사용 (UX-CTL-03)`);
    }
  }
}

if (issues.length) {
  console.error('✗ 모바일 안전 규약 위반:');
  for (const s of issues) console.error('  - ' + s);
  process.exit(1);
}
console.log(`✅ 모바일 안전 규약 통과 — 다이얼로그 ${dialogScanned}곳·버튼 행 ${rowScanned}곳·액션 행 nowrap ${actionRowScanned}건·컨트롤 높이 ${ctlScanned}건·클릭 버튼 ${clickScanned}건 검사, 위반 0건`);
