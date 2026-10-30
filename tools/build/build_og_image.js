#!/usr/bin/env node
// @spec LP-12
/**
 * build_og_image.js — 1200×630 OG 공유 미리보기 이미지 생성
 *
 * landing.template.html의 og:image가 가리키는 icons/og-image.png를
 * Playwright 헤드리스로 렌더링해 생성한다. 브랜드 카드는 인라인 HTML로
 * 선언되며 소셜 크롤러 호환을 위해 PNG로 굽는다 (SVG는 og 미지원).
 *
 * 사용: node tools/build/build_og_image.js · npm run build:ogimage
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'icons', 'og-image.png');
// about:blank 페이지는 file:// 서브리소스 로드를 차단 — 아이콘은 data: URL로 인라인
const ICON_DATA_URL = 'data:image/png;base64,' +
    fs.readFileSync(path.join(ROOT, 'icons', 'passok-icon-192.png')).toString('base64');

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box }
body { width:1200px; height:630px; background:#0b0f19; color:#e8ecf4;
  font-family:'Segoe UI','Malgun Gothic',sans-serif; display:flex; overflow:hidden }
.card { flex:1; display:flex; flex-direction:column; justify-content:center;
  padding:70px 80px; background:linear-gradient(135deg,#0b0f19 0%,#12203a 55%,#1a2f52 100%);
  position:relative }
.card::after { content:''; position:absolute; right:-140px; top:-140px; width:460px; height:460px;
  border-radius:50%; background:radial-gradient(circle,rgba(74,144,226,.35),transparent 70%) }
.brand { display:flex; align-items:center; gap:18px; margin-bottom:34px }
.brand img { width:64px; height:64px; border-radius:14px }
.brand span { font-size:40px; font-weight:700; letter-spacing:.5px }
h1 { font-size:52px; font-weight:800; line-height:1.25; margin-bottom:22px }
h1 em { font-style:normal; color:#6fb1ff }
.sub { font-size:26px; color:#aab6cc; margin-bottom:40px }
.chips { display:flex; gap:14px }
.chip { font-size:21px; color:#d5e4ff; background:rgba(111,177,255,.14);
  border:1px solid rgba(111,177,255,.35); border-radius:999px; padding:10px 22px }
</style></head><body><div class="card">
  <div class="brand"><img src="${ICON_DATA_URL}"><span>PassOK</span></div>
  <h1>자격시험 합격을 위한<br><em>스마트 학습 플랫폼</em></h1>
  <p class="sub">계정 없이 바로 시작 · 설치하면 완전 오프라인 · AI 코치는 로그인으로</p>
  <div class="chips"><span class="chip">교재 + 퀴즈 + 모의고사</span><span class="chip">FSRS 스마트 복습</span><span class="chip">AI 학습 코치</span><span class="chip">무료로 시작</span></div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(HTML, { waitUntil: 'load' });
    await page.screenshot({ path: OUT, type: 'png' });
    console.log(`✅ icons/og-image.png 생성 — 1200×630 (LP-12)`);
  } finally {
    await browser.close();
  }
})();
