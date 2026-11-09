// tests/e2e/pdf-pagination.spec.js — 생성 PDF 페이지네이션 회귀 (CO-21)
// 캔버스 슬라이스가 삽화·표를 경계에서 자르지 않는지 실브라우저 레이아웃으로 검증.
// jsdom은 getBoundingClientRect 측정 불가라 e2e 전용. 벤더는 스텁해 슬라이스 좌표만 채취.
import { test, expect } from '@playwright/test';

/**
 * 벤더 스텁 — ensurePdf는 window.jspdf/html2canvas가 있으면 로드를 건너뛴다.
 * html2canvas 스텁은 캔버스 크기만 흉내내고, drawImage 후크가 절단 원본 y를 기록한다.
 * evaluate 직렬화로 주입 — eval은 CSP(script-src)에 걸릴 수 있어 함수 본문으로 전달한다.
 */
async function _stubVendors(page) {
    await page.evaluate(() => {
        const w = /** @type {any} */ (window);
        w.__slices = [];
        w.__bigCanvas = null;
        const origDraw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (img, sx, sy, sw, sh, ...rest) {
            if (img === w.__bigCanvas) w.__slices.push({ sy, sh });
            return origDraw.call(this, img, sx, sy, sw, sh, ...rest);
        };
        w.html2canvas = async (el) => {
            const c = document.createElement('canvas');
            c.width = el.offsetWidth * 2; c.height = el.offsetHeight * 2;
            const ctx = c.getContext('2d');
            if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 5, 5); } // 빈 캔버스 감지 통과용 잉크
            w.__bigCanvas = c;
            w.__wrapEl = el;
            return c;
        };
        w.jspdf = { jsPDF: class {
            addImage() {} addPage() {} setPage() {} setFontSize() {} setTextColor() {} text() {}
            getNumberOfPages() { return 1; }
            output() { return new Blob(['x']); }
        } };
    });
}

test.describe('PDF 페이지네이션 (CO-21)', () => {
    test('큰 삽화가 페이지 경계에서 잘리지 않는다', async ({ page }) => {
        test.setTimeout(90_000);
        await page.addInitScript(() => { try { localStorage.setItem('current_exam', 'carework'); } catch (e) {} });
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED, null, { timeout: 30_000 });
        await _stubVendors(page);
        await page.evaluate(() => window.ExamViewer.openExam('content/exams/carework/docs/학습안내서.md'));
        const img = page.locator('#exam-overlay.open #exam-article img.reader-img');
        if (!(await img.count())) { test.skip(true, '학습안내서에 삽화 없음'); return; }
        await img.waitFor({ timeout: 20_000 });
        const res = await page.evaluate(async () => {
            const w = /** @type {any} */ (window);
            const { pdfFileFromElStyled } = await import('/src/content/pdf-utils.js');
            await pdfFileFromElStyled(document.querySelector('#exam-article'), 't');
            const el = w.__wrapEl;
            const im = el.querySelector('img.reader-img');
            const et = el.getBoundingClientRect().top, ir = im.getBoundingClientRect();
            const span = { top: (ir.top - et) * 2, bot: (ir.bottom - et) * 2 };
            const bounds = new Set();
            for (const s of w.__slices) { bounds.add(Math.round(s.sy)); bounds.add(Math.round(s.sy + s.sh)); }
            const inside = [...bounds].filter(b => b > span.top + 4 && b < span.bot - 4);
            return { inside, slices: w.__slices.length };
        });
        expect(res.slices).toBeGreaterThan(0);
        expect(res.inside, '절단선이 삽화 내부를 관통').toEqual([]);
    });

    test('페이지를 넘는 표는 thead 복제로 분할된다', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED, null, { timeout: 30_000 });
        await _stubVendors(page);
        const res = await page.evaluate(async () => {
            const w = /** @type {any} */ (window);
            const host = document.createElement('div');
            host.innerHTML = '<table><thead><tr><th>헤더</th></tr></thead><tbody>' +
                Array.from({ length: 80 }, (_, i) => `<tr><td style="height:34px">행 ${i}</td></tr>`).join('') +
                '</tbody></table>';
            document.body.appendChild(host);
            try {
                const { pdfFileFromElStyled } = await import('/src/content/pdf-utils.js');
                await pdfFileFromElStyled(host, 't');
                const tables = [...w.__wrapEl.querySelectorAll('table')];
                return { count: tables.length, allThead: tables.every(t => t.tHead && t.tHead.rows.length > 0) };
            } finally { host.remove(); }
        });
        expect(res.count, '경계를 넘는 표는 분할돼야 함').toBeGreaterThan(1);
        expect(res.allThead, '분할된 표는 모두 thead 보유').toBe(true);
    });

    test('접힌 details 내용이 생성 PDF에 포함된다', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED, null, { timeout: 30_000 });
        await _stubVendors(page);
        const res = await page.evaluate(async () => {
            const w = /** @type {any} */ (window);
            const host = document.createElement('div');
            host.innerHTML = '<p>앞</p><details><summary>더보기</summary><p>숨은 내용</p></details>';
            document.body.appendChild(host);
            try {
                const { pdfFileFromElStyled } = await import('/src/content/pdf-utils.js');
                await pdfFileFromElStyled(host, 't');
                const d = w.__wrapEl.querySelector('details');
                return { openInWrap: !!(d && d.open) };
            } finally { host.remove(); }
        });
        expect(res.openInWrap, '클론 details는 펼쳐져야 함').toBe(true);
    });
});
