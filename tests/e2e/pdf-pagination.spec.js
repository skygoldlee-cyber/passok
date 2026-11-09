// tests/e2e/pdf-pagination.spec.js — 생성 PDF 페이지네이션 회귀
// @spec CO-21
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
            // wrap은 이 호출 시점에만 문서에 붙어 있다(finally에서 제거) — 레이아웃은 여기서 캡처
            const et = el.getBoundingClientRect().top;
            const im = el.querySelector('img.reader-img');
            w.__layout = {
                total: el.offsetHeight,
                img: im ? { top: im.getBoundingClientRect().top - et, bot: im.getBoundingClientRect().bottom - et } : null,
                tables: [...el.querySelectorAll('table')].map(t => {
                    const tb = t.getBoundingClientRect();
                    return { top: tb.top - et, bot: tb.bottom - et, rows: t.rows.length,
                             theadH: t.tHead ? t.tHead.getBoundingClientRect().height : 0 };
                }),
                // mermaid 인쇄 대비 보정 검증용 — 색 보정은 html2canvas 이전에 완료되므로 여기서 확정값 채취
                svgFills: [...el.querySelectorAll('pre.mermaid svg *')].map(e =>
                    ({ tag: e.tagName.toLowerCase(), fill: getComputedStyle(e).fill, stroke: getComputedStyle(e).stroke })),
                foColor: (() => { const s = el.querySelector('pre.mermaid svg foreignObject .nodeLabel');
                    return s ? getComputedStyle(s).color : null; })(),
                svgBg: (() => { const s = el.querySelector('pre.mermaid svg');
                    return s ? getComputedStyle(s).backgroundColor : null; })(),
                pca: (() => { const s = el.querySelector('pre.mermaid svg .node rect');
                    return s ? getComputedStyle(s).printColorAdjust : null; })(),
                rawCodeColor: (() => { const s = el.querySelector('pre.mermaid code');
                    return s ? getComputedStyle(s).color : null; })(),
                tblBorder: (() => { const s = el.querySelector('.reader-table-wrapper');
                    return s ? getComputedStyle(s).borderTopColor : null; })(),
                thShadow: (() => { const s = el.querySelector('.reader-table th');
                    return s ? getComputedStyle(s).boxShadow : null; })(),
            };
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
            // html2canvas 스텁이 attach 상태에서 캡처한 레이아웃 사용 (wrap은 finally에서 제거)
            const im = w.__layout.img;
            const span = { top: im.top * 2, bot: im.bot * 2 };
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

    test('분할된 표의 thead는 페이지 시작에만 놓인다 — 같은 페이지 중복 헤더 금지', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED, null, { timeout: 30_000 });
        await _stubVendors(page);
        const res = await page.evaluate(async () => {
            const w = /** @type {any} */ (window);
            const host = document.createElement('div');
            // 비균일 행 높이 3페이지+ 표 — 분할 시 thead 복제 높이만큼 뒤쪽 경계가 밀려
            // 낡은 경계로 연속 분할하면 복제 헤더가 페이지 중간·끝에 찍히던 회귀
            const hs = [30, 45, 60, 25, 80, 35];
            host.innerHTML = '<table><thead><tr><th style="height:30px">헤더</th></tr></thead><tbody>' +
                Array.from({ length: 200 }, (_, i) => `<tr><td style="height:${hs[i % hs.length]}px">행 ${i}</td></tr>`).join('') +
                '</tbody></table>';
            document.body.appendChild(host);
            try {
                const { pdfFileFromElStyled } = await import('/src/content/pdf-utils.js');
                await pdfFileFromElStyled(host, 't');
                return { tables: w.__layout.tables, starts: w.__slices.map(s => Math.round(s.sy)) };
            } finally { host.remove(); }
        });
        // 분할로 생긴 표(원본 제외)의 상단 = 복제 thead 위치 — 페이지 시작 절단선과 일치해야
        // 스텁 캔버스는 css px의 2배 — 표 상단을 캔버스 좌표로 환산해 비교
        const stray = res.tables.slice(1)
            .map(t => Math.round(t.top * 2))
            .filter(y => !res.starts.some(s => Math.abs(s - y) < 8));
        expect(stray, `페이지 중간에 찍힌 헤더(캔버스 y) ${JSON.stringify(stray)}`).toEqual([]);
    });

    test('다크 테마 mermaid는 화면 색상 그대로 출력된다 — WYSIWYG 하이브리드 (CO-20)', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED, null, { timeout: 30_000 });
        await _stubVendors(page);
        const res = await page.evaluate(async () => {
            const w = /** @type {any} */ (window);
            const host = document.createElement('div');
            // 다크 테마 렌더분 흉내 — reader-mermaid.css처럼 !important 규칙을 둬 실제 경로를 재현
            host.innerHTML = '<style>pre.mermaid .node rect{fill:#3a3a5c !important;stroke:#b0b0cc !important;}' +
                'pre.mermaid .nodeLabel{color:#fff !important;fill:#fff !important;}</style>' +
                '<pre class="mermaid"><svg viewBox="0 0 100 40">' +
                '<g class="node"><rect width="100" height="40"/></g>' +
                '<foreignObject x="0" y="0" width="100" height="20"><div xmlns="http://www.w3.org/1999/xhtml">' +
                '<span class="nodeLabel" style="color:#ffffff">노드명</span></div></foreignObject></svg></pre>' +
                // 미렌더 블록 흉내 — svg 없이 원문만 → 밝은 글자는 백지 보정 대상
                '<pre class="mermaid"><code style="color:#f3f4f6">flowchart TD</code></pre>' +
                // 반투명 백색 테두리 + box-shadow 구분선 흉내 — 백지 소실 방지 검증
                '<div class="reader-table-wrapper" style="border:1px solid rgba(255,255,255,0.12)">' +
                '<table class="reader-table"><thead><tr><th style="box-shadow:0 2px 0 rgb(21,101,192)">항목</th></tr></thead>' +
                '<tbody><tr><td>값</td></tr></tbody></table></div>';
            document.body.appendChild(host);
            try {
                const { pdfFileFromElStyled } = await import('/src/content/pdf-utils.js');
                await pdfFileFromElStyled(host, 't');
                return { fills: w.__layout.svgFills, foColor: w.__layout.foColor,
                         pca: w.__layout.pca, rawCodeColor: w.__layout.rawCodeColor,
                         tblBorder: w.__layout.tblBorder, thShadow: w.__layout.thShadow };
            } finally { host.remove(); }
        });
        const rect = res.fills.find(e => e.tag === 'rect');
        expect(rect.fill, `노드 채우기는 화면 색상 그대로: ${rect.fill}`).toBe('rgb(58, 58, 92)');
        expect(rect.stroke, `선도 화면 색상 그대로: ${rect.stroke}`).toBe('rgb(176, 176, 204)');
        expect(res.foColor, `라벨도 화면 색상 그대로: ${res.foColor}`).toBe('rgb(255, 255, 255)');
        expect(res.pca, `브라우저 인쇄 배경 유지: ${res.pca}`).toBe('exact');
        expect(res.rawCodeColor, `미렌더 원문만 검정 보정: ${res.rawCodeColor}`).toBe('rgb(0, 0, 0)');
        expect(res.tblBorder, `반투명 테두리는 인쇄 회색으로: ${res.tblBorder}`).toBe('rgb(229, 231, 235)');
        expect(res.thShadow, `무확산 구분선 box-shadow는 유지: ${res.thShadow}`).not.toBe('none');
    });

    test('window.print 경로 — beforeprint 색상 보존·afterprint 원복 (initPrintPrep)', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/index.html');
        await page.waitForFunction(() => window.__APP_INITIALIZED, null, { timeout: 30_000 });
        const res = await page.evaluate(() => {
            const host = document.createElement('div');
            host.innerHTML = '<pre class="mermaid"><svg viewBox="0 0 100 40">' +
                '<rect width="100" height="40" style="fill:#3a3a5c"/>' +
                '<foreignObject x="0" y="0" width="100" height="20"><div xmlns="http://www.w3.org/1999/xhtml">' +
                '<span class="nodeLabel" style="color:#ffffff">노드명</span></div></foreignObject></svg></pre>';
            document.body.appendChild(host);
            const rect = host.querySelector('rect');
            const span = host.querySelector('.nodeLabel');
            window.dispatchEvent(new Event('beforeprint'));
            const during = { fill: getComputedStyle(rect).fill, color: getComputedStyle(span).color,
                             pca: getComputedStyle(rect).printColorAdjust };
            window.dispatchEvent(new Event('afterprint'));
            const after = { fill: getComputedStyle(rect).fill, color: getComputedStyle(span).color,
                            pca: getComputedStyle(rect).printColorAdjust };
            host.remove();
            return { during, after };
        });
        expect(res.during.fill, `인쇄 중에도 채우기는 화면 색상 그대로: ${res.during.fill}`).toBe('rgb(58, 58, 92)');
        expect(res.during.color, `인쇄 중에도 라벨은 화면 색상 그대로: ${res.during.color}`).toBe('rgb(255, 255, 255)');
        expect(res.during.pca, `인쇄 중 print-color-adjust: ${res.during.pca}`).toBe('exact');
        expect(res.after.fill, `인쇄 후 상태 원복: ${res.after.fill}`).toBe('rgb(58, 58, 92)');
        expect(res.after.color, `인쇄 후 라벨 원복: ${res.after.color}`).toBe('rgb(255, 255, 255)');
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
