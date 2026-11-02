import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => { localStorage.setItem('current_exam', 'carework'); localStorage.setItem('ui_mode', 'practice'); });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('onboarding-overlay')?.remove());
const go = async (v) => { await page.locator(`.nav-item[data-target="${v}"]`).waitFor({ state: 'visible', timeout: 5000 }); await page.locator(`.nav-item[data-target="${v}"]`).click(); await page.waitForTimeout(1300); };
// 로그
await go('care-log-view');
await page.fill('#log-client', '김○○').catch(() => {});
await page.locator('[data-click="careLogGenerate"]').click().catch(() => {});
await page.waitForTimeout(400);
// 점검
await go('care-audit-view');
await page.emulateMedia({ media: 'print' });
const r = await page.evaluate(() => {
  const el = (s) => document.querySelector(s);
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); const c = getComputedStyle(el); return { vis: c.visibility, pos: c.position, top: Math.round(b.top), h: Math.round(b.height) }; };
  const out = document.getElementById('audit-list');
  return {
    logPre: box(document.getElementById('log-preview')),
    logPreText: (document.querySelector('#log-preview .care-log-text')?.innerText || '').slice(0, 40),
    auditList: box(el('#audit-list')),
    auditProgress: box(el('#audit-progress')),
    auditListItems: document.querySelectorAll('#audit-list .care-audit-item').length,
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
