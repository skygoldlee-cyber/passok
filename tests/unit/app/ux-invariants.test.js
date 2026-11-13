// tests/unit/ux-invariants.test.js — UI/UX 설계 요구사항 (정적 검증)
// @spec UX-FB-01~04,UX-FORM-01~05,UX-PWA-01~05,UX-SCR-01~03,UX-SET-01~05,UX-CTL-01~06,UX-TXT-01,LP-06,LP-10,LP-11,LP-12,LP-13,LP-14
// CSS 규칙·마크업 구조·JS 구현 패턴이 설계 요구사항을 유지하는지 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = p => readFileSync(join(ROOT, p), 'utf-8');
const indexHtml = read('index.html');
const baseCss = read('css/base.css');
const overlayCss = read('css/ui-overlay.css');
const allCss = readdirSync(join(ROOT, 'css'))
  .filter(f => f.endsWith('.css'))
  .map(f => read(`css/${f}`)).join('\n');
const appJs = ['src/shell/app.js', 'src/shell/app-shell.js', 'src/shell/app-dashboard.js'].map(read).join('\n');
const uiUtils = read('src/ui-utils.js');
const pwaInstall = read('src/pwa/pwa-install.js');
const capture = read('src/pwa/pwa-install-capture.js');
const readerJs = ['src/views/textbook-reader.js', 'src/views/reader/reader-toolbar.js', 'src/views/reader/reader-ref-links.js'].map(read).join('\n');
const listeners = ['src/views/event-listeners.js',
  ...readdirSync(join(ROOT, 'src/views/listeners'))
    .filter(f => f.startsWith('listeners-') && f.endsWith('.js'))
    .map(f => `src/views/listeners/${f}`)].map(read).join('\n');

// ---------- UX-SCR: 스크롤바 전략 ----------

test('UX-SCR-01: 터치/모바일 환경에서 스크롤바를 완전히 숨긴다 (pointer+폭 병기)', () => {
  assert.ok(/@media\s*\(pointer:\s*coarse\)\s*,\s*\(max-width:\s*900px\)/.test(baseCss),
    'pointer:coarse와 max-width:900px 병기 필수 (단독 pointer 감지 실패 대응)');
  const block = baseCss.match(/@media\s*\(pointer:\s*coarse\)[\s\S]{0,400}/);
  assert.ok(block[0].includes('scrollbar-width: none'), 'Firefox 스크롤바 숨김');
  assert.ok(block[0].includes('::-webkit-scrollbar'), 'WebKit 스크롤바 숨김');
});

test('UX-SCR-02: scrollbar-width가 html이 아닌 전체/컨테이너 선택자에 적용된다', () => {
  // 모바일 숨김 블록이 * 선택자에 적용돼야 내부 스크롤 컨테이너까지 커버
  const block = baseCss.match(/@media\s*\(pointer:\s*coarse\)[\s\S]{0,300}/);
  assert.ok(/\*\s*\{[^}]*scrollbar-width/.test(block[0]), '* 선택자에 scrollbar-width 지정');
});

test('UX-SCR-03: 커스텀 스크롤바 색상이 CSS 변수를 사용한다', () => {
  assert.ok(/::-webkit-scrollbar-thumb\s*\{[^}]*var\(--scrollbar-thumb\)/.test(baseCss),
    'thumb에 var(--scrollbar-thumb) 사용');
  assert.ok(baseCss.includes('--scrollbar-thumb:'), '테마 변수 정의');
  assert.ok(baseCss.includes('--bg-subtle'), '트랙 변수 정의');
});

// ---------- UX-SET: 설정 메뉴 패턴 ----------

test('UX-SET-01: 설정 패널이 그룹 라벨(계정/데이터/보기·도구/앱)로 조직된다', () => {
  for (const label of ['계정', '데이터', '보기', '앱']) {
    assert.ok(indexHtml.includes(`settings-group-label">${label}`) ||
      new RegExp(`settings-group-label[^>]*>${label}`).test(indexHtml),
      `그룹 라벨 '${label}' 없음`);
  }
  assert.ok(indexHtml.includes('id="settings-panel"'), '설정 패널 존재');
  assert.ok(indexHtml.includes('settings-divider') || indexHtml.includes('settings-group-label'),
    '구분선/그룹 구조');
});

test('UX-SET-02: 설정 패널이 max-height + 내부 스크롤을 갖는다', () => {
  const panel = baseCss.match(/\.settings-panel\s*\{[\s\S]*?\}/);
  assert.ok(panel, '.settings-panel 규칙');
  assert.ok(/max-height:\s*calc\(100dvh\s*-\s*5rem\)/.test(panel[0]), 'max-height 뷰포트 제한');
  assert.ok(/overflow-y:\s*auto/.test(panel[0]), '내부 스크롤');
});

test('UX-SET-03: 설정 항목의 최소 터치 타겟이 44px이다', () => {
  const item = baseCss.match(/\.settings-item\s*\{[\s\S]*?\}/);
  assert.ok(item, '.settings-item 규칙');
  assert.ok(/min-height:\s*var\(--control-h-md\)/.test(item[0]), 'min-height --control-h-md (44px) 토큰');
});

test('UX-SET-04: 버전 표기가 설정 패널 하단에 있다', () => {
  assert.ok(indexHtml.includes('id="settings-version"'), '버전 스팬 존재');
  const helpIdx = indexHtml.indexOf('id="help-panel"');
  const verIdx = indexHtml.indexOf('id="settings-version"');
  assert.ok(helpIdx > -1 && verIdx > helpIdx, '버전 표기는 도움말 패널 소속');
  assert.ok(appJs.includes('settings-version'), '버전 값 주입 코드');
});

test('UX-SET-05: 항목 선택·외부 클릭·Escape로 드롭다운 메뉴가 닫힌다', () => {
  assert.ok(/settings-item[\s\S]*closeAllMenus/.test(listeners), '항목 클릭 시 닫힘');
  assert.ok(/Escape/.test(listeners), 'Escape 닫힘');
  assert.ok(/settings-menu/.test(listeners) && /closeAllMenus/.test(listeners), '외부 클릭 닫힘');
});

test('UX-SET-07: 도움말 메뉴가 설정과 분리된 드롭다운으로 존재한다', () => {
  assert.ok(indexHtml.includes('id="help-toggle-btn"'), '도움말 토글 버튼');
  assert.ok(/bindDropMenu\('help-toggle-btn',\s*'help-panel'/.test(listeners), '도움말 패널 바인딩');
  const settingsIdx = indexHtml.indexOf('id="settings-panel"');
  const settingsEnd = indexHtml.indexOf('id="import-file-input"');
  const helpIdx = indexHtml.indexOf('id="help-panel"');
  assert.ok(settingsIdx > -1 && helpIdx > settingsEnd, '설정 패널 뒤에 도움말 패널');
  // 도움말성 항목은 도움말 패널 소속이며 설정 패널 구간에는 남지 않는다
  for (const id of ['onboarding-btn', 'service-intro-btn', 'shortcut-help-btn', 'whats-new-btn', 'feedback-btn', 'community-btn']) {
    const idx = indexHtml.indexOf(`id="${id}"`);
    assert.ok(idx > helpIdx, `${id}는 도움말 패널 소속`);
    assert.ok(!(idx > settingsIdx && idx < settingsEnd), `${id}는 설정 패널 밖`);
  }
  const statsIdx = indexHtml.indexOf('data-click="showUsageStats"');
  assert.ok(statsIdx > helpIdx, '내 사용 통계는 도움말 패널 소속');
});

test('LP-06: 랜딩 페이지 진입점이 도움말 패널과 시험 선택 뷰에 존재한다', () => {
  assert.ok(indexHtml.includes('id="service-intro-btn"'), '도움말 패널 서비스 소개 버튼');
  assert.ok(/service-intro-btn[\s\S]*window\.open\(['"]landing\.html/.test(listeners), '새 탭 오픈 바인딩');
  const examSelect = read('html/views/exam-select.html');
  assert.ok(examSelect.includes('href="landing.html"'), '시험 선택 뷰 서비스 소개 링크');
});

test('진도 데이터 스키마 버전 마커가 saveProgress에서 기록된다 (DOC-DSN-39)', () => {
  const keys = read('src/core/storage-keys.js');
  assert.ok(/SCHEMA_VERSION:\s*'progress_schema_version'/.test(keys), '키 등록');
  assert.ok(read('src/core/state.js').includes("STORAGE_KEYS.SCHEMA_VERSION"), 'saveProgress 기록');
});

test('LP-11: 체험 섹션이 제공 경험을 구체 명기한다', () => {
  const tpl = read('landing.template.html');
  assert.ok(tpl.includes('실제 시험 문항 퀴즈'), '섹션 부제에 퀴즈 체험 명시');
  assert.ok(tpl.includes('주차별 학습계획'), '섹션 부제에 계획 미리보기 명시');
  const landingJs = read('src/shell/landing.js');
  assert.ok(landingJs.includes('실제 문항 퀴즈 체험'), '퀴즈 카드 레이블 명시');
  assert.ok(landingJs.includes('시험일 기준 주차별 계획 미리보기'), '계획 카드 레이블 명시');
});

test('LP-13: 히어로 차별점 스트립이 기존 수단 대비 우위를 첫 화면에 노출한다', () => {
  const tpl = read('landing.template.html');
  const stripIdx = tpl.indexOf('landing-diff-strip');
  assert.ok(stripIdx > -1 && stripIdx < tpl.indexOf('<main'), 'CTA 직하·본문 이전 배치');
  for (const kw of ['인용 링크','FSRS','약점','고시']) assert.ok(tpl.includes(kw), '차별점 키워드: '+kw);
  const css = read('css/landing.css');
  assert.ok(css.includes('.landing-diff-strip'), '스트립 스타일 존재');
});

test('LP-14: 지원 시험 카드가 group 필드로 그룹 섹션 렌더된다', () => {
  const html = read('landing.html');
  assert.ok(html.includes('landing-exam-group'), '그룹 래퍼 존재');
  for (const g of ['미용·화장품', '산업안전', '정보처리']) {
    assert.ok(html.includes(`landing-exam-group-name">${g}`), `그룹 헤더: ${g}`);
  }
  assert.ok(html.includes('landing-exam-group-count'), '그룹 개수 표기');
});

test('LP-12: OG 공유 미리보기 이미지가 브랜드 카드로 연결된다', () => {
  const tpl = read('landing.template.html');
  assert.ok(tpl.includes('og:image" content="https://passok.vercel.app/icons/og-image.png"'), 'og:image 브랜드 카드');
  assert.ok(tpl.includes('og:image:width" content="1200"') && tpl.includes('og:image:height" content="630"'), 'OG 규격 1200x630');
  assert.ok(tpl.includes('twitter:card" content="summary_large_image"'), 'summary_large_image');
  assert.ok(existsSync(join(ROOT, 'icons', 'og-image.png')), 'og-image.png 자산 존재');
});

test('LP-10: 신규 방문자 리다이렉트 스크립트가 index.html에 로드되고 조건을 갖는다', () => {
  const redirect = read('src/shell/landing-redirect.js');
  assert.ok(indexHtml.includes('src="src/shell/landing-redirect.js"'), '템플릿 로드');
  for (const cond of ['localStorage.length', 'standalone', 'navigator.webdriver', 'location.hash', 'location.replace']) {
    assert.ok(redirect.includes(cond), `리다이렉트 조건: ${cond}`);
  }
});

// ---------- UX-FB: 피드백·알림 ----------

test('UX-FB-01: 토스트가 모바일에서 하단(탭 바 위)에 배치된다', () => {
  const block = overlayCss.match(/@media\s*\(max-width:\s*768px\)[\s\S]{0,500}#app-toast\s*\{[^}]+\}/);
  assert.ok(block, '모바일 토스트 규칙');
  assert.ok(/top:\s*auto/.test(block[0]), '중앙 해제');
  assert.ok(/bottom:\s*calc\(80px/.test(block[0]), '하단 탭 바 위 배치');
});

test('UX-FB-02: 네이티브 alert/confirm 대신 커스텀 모달 API가 존재한다', () => {
  assert.ok(/export function showConfirm/.test(uiUtils), 'showConfirm');
  assert.ok(/export function showAlert/.test(uiUtils), 'showAlert');
  assert.ok(/export function showToast/.test(uiUtils), 'showToast');
});

test('UX-FB-02: 소스에 네이티브 alert()/confirm() 호출이 없다', () => {
  const srcDir = join(ROOT, 'src');
  const files = [srcDir, join(srcDir, 'views'), join(srcDir, 'config')]
    .flatMap(d => readdirSync(d).filter(f => f.endsWith('.js')).map(f => join(d, f)));
  for (const f of files) {
    const src = readFileSync(f, 'utf-8');
    const bad = src.match(/(?<![\w.])alert\s*\(|(?<![\w.])confirm\s*\(/g) || [];
    assert.deepEqual(bad, [], `${f}: 네이티브 alert/confirm 호출`);
  }
});

test('UX-FB-03: 숨겨진 기능의 최초 펄스가 1회 플래그 + animationend 해제를 사용한다', () => {
  assert.ok(/is-attention/.test(readerJs), '펄스 클래스');
  assert.ok(/animationend/.test(readerJs), 'animationend 해제');
  assert.ok(/ui_toc_hint_seen|_seen/.test(readerJs), 'localStorage 1회 플래그');
});

test('UX-FB-04: 전역 로딩 오버레이가 있다', () => {
  assert.ok(/export function showGlobalLoading/.test(uiUtils), 'showGlobalLoading');
  assert.ok(/export function hideGlobalLoading/.test(uiUtils), 'hideGlobalLoading');
});

// ---------- UX-PWA: PWA 고유 UX ----------

test('UX-PWA-01: 앱 종료가 close() → back() → 안내 화면 2단 구조다', () => {
  assert.ok(/window\.close\(\)/.test(appJs), 'window.close() 시도');
  assert.ok(/history\.back\(\)/.test(appJs), 'history.back() 폴백');
  assert.ok(/app-exit-screen/.test(appJs), '종료 안내 화면');
  assert.ok(/pointer:\s*coarse|maxTouchPoints/.test(appJs), '터치 환경에서만 모바일 안내');
});

test('UX-PWA-02: standalone 감지가 matchMedia + navigator.standalone 병용이다', () => {
  assert.ok(/display-mode:\s*standalone/.test(pwaInstall), 'matchMedia standalone');
  assert.ok(/navigator\.standalone/.test(pwaInstall), 'iOS navigator.standalone');
});

test('UX-PWA-03: SW 업데이트 사용자 안내(토스트)가 존재한다', () => {
  assert.ok(/sw-update-toast/.test(capture), '업데이트 토스트');
  assert.ok(/업데이트|새 버전/.test(capture), '안내 문구');
});

test('UX-PWA-04: 설치 버튼 표시가 beforeinstallprompt 캡처 여부로 게이트된다', () => {
  assert.ok(capture.includes('beforeinstallprompt'), '프롬프트 캡처');
  // deferredPrompt 존재 시에만 표시(remove is-hidden), standalone/미캡처는 숨김
  assert.ok(/deferredPrompt\s*&&\s*installBtn[\s\S]{0,80}remove\('is-hidden'\)/.test(pwaInstall),
    '캡처 후에만 표시');
  assert.ok(/installBtn\.classList\.add\('is-hidden'\)/.test(pwaInstall), '비대상 상태 숨김');
  // 설치 완료(appinstalled) 후 자동 숨김
  assert.ok(/appinstalled|is-hidden/.test(capture) || /appinstalled/.test(pwaInstall), '설치 후 숨김 처리');
});

test('UX-PWA-06: SW 업데이트 리로드가 랜딩·모달 상황에서도 정체하지 않는다', () => {
  const reloadBlock = capture.match(/function tryReload[\s\S]{0,900}/);
  assert.ok(reloadBlock, 'tryReload 존재');
  assert.ok(reloadBlock[0].includes('landing-main'), '랜딩은 __APP_INITIALIZED 없이 리로드');
  const overlayWait = reloadBlock[0].match(/attempts < (\d+)/);
  assert.ok(overlayWait && Number(overlayWait[1]) <= 10, '모달 대기 상한 ~5초 이내 (whats-new는 리로드 후 재표시)');
});

test('UX-PWA-05: 앱 셸 높이가 JS 실측 --app-height를 사용한다', () => {
  assert.ok(/--app-height/.test(appJs), 'JS 측정 변수 설정');
  assert.ok(/innerHeight|visualViewport/.test(appJs), '실측 소스');
  assert.ok(/var\(--app-height,\s*100dvh\)/.test(allCss), 'CSS 폴백 var(--app-height, 100dvh)');
});

// ---------- UX-FORM: 폼·입력 ----------

test('UX-FORM-01: 표준 입력 클래스(.form-input)의 font-size가 16px 이상이다 (iOS 줌 방지)', () => {
  const rules = allCss.match(/\.form-input\s*\{[^}]+\}/g) || [];
  assert.ok(rules.length > 0, '.form-input 규칙 존재');
  const withFs = rules.filter(r => /font-size:/.test(r));
  assert.ok(withFs.length > 0, '.form-input font-size 명시 (상속이 16px 미만일 수 있음)');
  for (const rule of withFs) {
    const val = rule.match(/font-size:\s*([^;]+)/)[1].trim();
    assert.ok(
      /16px|1rem|--text-1rem|--text-md\b/.test(val),
      `.form-input font-size 16px 미만: ${val}`
    );
  }
  const selRules = allCss.match(/\.form-select\s*\{[^}]+\}/g) || [];
  assert.ok(selRules.length > 0, '.form-select 규칙 존재');
  for (const rule of selRules.filter(r => /font-size:/.test(r))) {
    const val = rule.match(/font-size:\s*([^;]+)/)[1].trim();
    assert.ok(/16px|1rem|--text-1rem|--text-md/.test(val), `.form-select font-size 16px 미만: ${val}`);
  }
});

test('UX-FORM-02: 터치 피드백(:active scale)이 인터랙티브 요소에 적용된다', () => {
  const scales = allCss.match(/:active[^}]*transform:\s*scale\(0\.9[2-8]/g) || [];
  assert.ok(scales.length >= 2, `:active scale 규칙 부족 (${scales.length})`);
});

test('UX-FORM-03: 필수 검증이 requireFields/setFieldError 공용 패턴을 쓴다', () => {
  assert.ok(/export function requireFields/.test(uiUtils), 'requireFields 헬퍼 export');
  // 오류 필드 수정 시 인라인 오류 자동 해제 — 위임 input 리스너
  assert.ok(/addEventListener\('input'/.test(uiUtils) && /aria-invalid/.test(uiUtils),
    'aria-invalid 자동 해제 리스너');
  // 대상 폼 — 토스트 전용 검증이 아니라 필드 인라인 오류로 승격됐는지
  const targets = [
    ['src/auth-sync/auth-view.js', /requireFields|setFieldError/],
    ['src/exams/carework/views/care-log.js', /requireFields/],
    ['src/exams/carework/views/care-visit.js', /requireFields/],
    ['src/exams/carework/views/care-incident.js', /requireFields/],
    ['src/exams/carework/views/care-handover.js', /requireFields/],
    ['src/exams/carework/views/care-roster.js', /requireFields/],
    ['src/exams/carework/views/care-client.js', /requireFields/],
    ['src/exams/carework/views/care-custom-form.js', /requireFields/],
    ['src/exams/carework/views/facility-admin.js', /setFieldError/],
    ['src/exams/cosmetic/views/formula-ing-modal.js', /setFieldError/],
  ];
  for (const [f, re] of targets) assert.ok(re.test(read(f)), `${f}: 필드 인라인 오류 패턴`);
});

test('UX-FORM-05: 작성 중 이탈 보호가 대상 폼에 적용된다', () => {
  // 리더 메모 — 입력 자동 임시저장(디바운스) + 닫기 전 미반영분 즉시 저장
  const render = read('src/views/reader/reader-render.js');
  assert.ok(/addEventListener\('input'/.test(render) && /setReaderNote/.test(render),
    '리더 메모 입력 자동저장');
  // 주관식 — 입력마다 저장 (기존 패턴 회귀 방지)
  assert.ok(/addEventListener\('input'[\s\S]{0,200}_save/.test(read('src/written/written-practice.js')),
    '주관식 입력 자동저장');
  // Care OS 닫기 경로 — 양식 편집기·결과 패널·명부 불러오기의 dirty 확인
  assert.ok(/_confirmDiscardEdit/.test(read('src/exams/carework/views/care-custom-form.js')),
    '양식 편집기 미저장 확인');
  assert.ok(/showConfirm[\s\S]{0,300}_closeResultPanel|_closeResultPanel/.test(read('src/exams/carework/views/care-visit.js')),
    '방문결과 패널 미저장 확인');
  assert.ok(/_formDirty[\s\S]{0,400}showConfirm/.test(read('src/exams/carework/views/care-client.js')),
    '수급자 명부 미저장 확인');
  // 라우터 이탈 가드 공용 패턴 유지 (모의고사가 사용 중)
  assert.ok(/registerViewLeaveGuard/.test(read('src/shell/router.js')), '이탈 가드 등록 API');
});

test('UX-FORM-04: 가상 키보드 오픈 시 하단 고정 크롬이 재배치된다', () => {
  const resp = read('css/app-responsive.css');
  // 탭 바 숨김 + sticky 행 오프셋 해제 + 본문 하단 여백 회수
  assert.ok(/body\.kb-open\s+\.mobile-tab-bar\s*\{[^}]*display:\s*none/.test(resp),
    'kb-open 시 탭 바 숨김 규칙');
  assert.ok(/body\.kb-open\s+\.btn-row-sticky\s*\{[^}]*bottom:/.test(resp),
    'kb-open 시 btn-row-sticky 오프셋 재지정');
  assert.ok(/body\.kb-open\s+\.main-content\s*\{[^}]*scroll-padding-bottom/.test(resp),
    'kb-open 시 스크롤 패딩 조정');
  // FO-10 액션바(.fcb-bottom)도 동일 규약 — 시험 CSS는 별도 파일이라 직접 읽음
  const formula = read('css/exams/cosmetic/formula.css');
  assert.ok(/body\.kb-open\s+\.fcb-bottom\s*\{[^}]*bottom:/.test(formula),
    'kb-open 시 fcb-bottom 오프셋 재지정');
  // JS: 키보드 감지 가드 — focusin/visualViewport/scrollIntoView 보정
  assert.ok(/initKeyboardGuard/.test(appJs), 'initKeyboardGuard 배선');
  assert.ok(/kb-open/.test(appJs), 'kb-open 클래스 토글');
  assert.ok(/focusin/.test(appJs) && /visualViewport/.test(appJs), '포커스+뷰포트 감지');
  assert.ok(/scrollIntoView/.test(appJs), '포커스 필드 재정렬 보정');
});

// ---------- UX-CTL: 컨트롤 배치·간격 규약 ----------

test('UX-CTL-01: 컨트롤 높이 3단계 토큰이 :root에 정의된다', () => {
  for (const t of ['--control-h-sm', '--control-h-md', '--control-h-lg']) {
    assert.ok(baseCss.includes(`${t}:`), `${t} 토큰 정의 필요`);
  }
  assert.match(baseCss, /--control-h-md:\s*2\.75rem/, 'md = 44px(2.75rem) — A-04 계승');
});

test('UX-CTL-02: .btn·.form-input·.form-select는 --control-h-md 높이를 공유한다', () => {
  // 기본 규칙이 위치한 파일 기준 — 미디어쿼리 오버라이드 규칙과 혼동 방지
  const targets = [
    ['btn', baseCss],
    ['form-input', read('css/study.css')],
    ['form-select', read('css/dashboard.css')],
  ];
  for (const [cls, css] of targets) {
    const rule = css.match(new RegExp('\\.' + cls + '\\s*\\{[^}]+\\}'));
    assert.ok(rule, `.${cls} 규칙 존재`);
    assert.ok(
      /min-height:\s*var\(--control-h-md\)/.test(rule[0]),
      `.${cls} min-height --control-h-md 아님: ${rule[0].match(/min-height:[^;]+/)?.[0] || '없음'}`
    );
  }
});

test('UX-CTL-03: 수평 간격 3단계 토큰이 --space 별칭으로 정의된다', () => {
  for (const [tok, alias] of [['--gap-ctl', '--space-2'], ['--gap-group', '--space-3'], ['--gap-sec', '--space-4']]) {
    const def = baseCss.match(new RegExp(tok + ':\\s*var\\(' + alias + '\\)'));
    assert.ok(def, `${tok} = var(${alias}) 정의 필요`);
  }
});

test('UX-CTL-04: .ctl-field는 라벨 위·컨트롤 아래 수직 스택 규약이다', () => {
  const f = baseCss.match(/\.ctl-field\s*\{[^}]+\}/);
  assert.ok(f, '.ctl-field 규칙 존재');
  assert.ok(/flex-direction:\s*column/.test(f[0]), '세로 스택');
  assert.ok(/gap:\s*var\(--space-1\)/.test(f[0]), '라벨→컨트롤 space-1(4px)');
});

test('UX-CTL-05: .btn-row는 우측 정렬, 모바일에서 세로 스택+주요 우선이다', () => {
  const row = baseCss.match(/\.btn-row\s*\{[^}]+\}/);
  assert.ok(row, '.btn-row 규칙 존재');
  assert.ok(/justify-content:\s*flex-end/.test(row[0]), 'PC 우측 정렬 (보조→주요)');
  const resp = read('css/app-responsive.css');
  assert.ok(
    /(\.btn-row|\.app-confirm-actions)[^}]*flex-direction:\s*column/.test(resp),
    '모바일 세로 스택 규칙'
  );
  assert.ok(/order:\s*-1/.test(resp), '주요 버튼 order:-1 (모바일 첫째)');
});

test('UX-CTL-06: 컨트롤 높이 정적 체커가 44px 미만 px 리터럴을 검출한다', () => {
  const checker = read('tools/check/check_mobile_safe.js');
  assert.ok(checker.includes('HEIGHT_LITERAL_RE'), '높이 리터럴 정규식 존재');
  assert.ok(checker.includes('CTL_HEIGHT_EXEMPT'), '면제 셀렉터 목록 존재');
  assert.ok(checker.includes('UX-CTL-06'), '@spec 태그');
});

// ---------- UX-TXT: 텍스트·줄바꿈 규약 ----------

test('UX-TXT-01: body에 keep-all 상속 + 전 요소 overflow-wrap 최후 수단이 선언된다', () => {
  const bodyRules = baseCss.match(/\bbody\s*\{[^}]+\}/g) || [];
  assert.ok(bodyRules.some(r => /word-break:\s*keep-all/.test(r)),
    'body에 word-break: keep-all 필요 — 음절 중간 분절 금지 상속');
  assert.ok(/body\s*\*\s*\{[^}]*overflow-wrap:\s*break-word/.test(baseCss),
    'body *의 overflow-wrap: break-word 필요 — 깨지지 않는 긴 런 최후 수단');
});

test('UX-TXT-01: word-break: break-all은 monospace·URL 등 의도적 케이스로 한정된다', () => {
  // 의도적 break-all은 font-family: monospace 선언과 같은 규칙 블록에 있어야 함
  for (const m of allCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (!/word-break:\s*break-all/.test(body)) continue;
    assert.ok(/monospace/.test(body) || /code|pre|samp|url|link|source/i.test(sel),
      `${sel.slice(0, 60)} — break-all은 monospace/URL 표기 의도 케이스만 허용`);
  }
});
