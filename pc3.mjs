import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => { localStorage.setItem('current_exam', 'carework'); localStorage.setItem('ui_mode', 'practice'); });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('onboarding-overlay')?.remove());
const nav = page.locator('.nav-item[data-target="care-calc-view"]');
await nav.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
  await page.evaluate(() => document.querySelector('[data-click="show-practice"]')?.click());
  await nav.waitFor({ state: 'visible', timeout: 5000 });
});
await nav.click();
await page.waitForTimeout(1200);
await page.fill('#care-use', '1000000').catch(() => {});
await page.locator('[data-click="careCalcRun"]').click();
await page.waitForTimeout(400);
await page.emulateMedia({ media: 'print' });
const r = await page.evaluate(() => {
  const vis = (sel) => { const el = document.querySelector(sel); if (!el) return 'missing'; const c = getComputedStyle(el); return c.visibility + '|' + c.display + '|' + Math.round(el.getBoundingClientRect().height); };
  return {
    head: vis('#care-result .care-doc-head'),
    sec: vis('#care-result .care-doc-sec'),
    table: vis('#care-result .care-doc'),
    td: vis('#care-result .care-doc td'),
    result: vis('#care-result'),
  };
});
console.log(JSON.stringify(r));
await page.pdf({ path: 'calcout.pdf' });
await browser.close();
