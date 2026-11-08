// src/content/pdf-utils.js — PDF 생성 지연 로더 (jsPDF + html2canvas — 한글은 이미지 렌더링)
// @spec CO-13 — 출력 문서 PDF 파일 공유/다운로드
import { PATHS } from '../core/paths.js';

let _load = null;
const _script = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('PDF 라이브러리 로드 실패'));
    document.head.appendChild(s);
});

export function ensurePdf() {
    const w = /** @type {any} */ (window); if (w.jspdf && w.html2canvas) return Promise.resolve();
    if (_load) return _load;
    _load = Promise.all([_script(PATHS.VENDOR_JSPDF), _script(PATHS.VENDOR_HTML2CANVAS)])
        .then(() => { const w2 = /** @type {any} */ (window); if (!w2.jspdf || !w2.html2canvas) throw new Error('PDF 라이브러리 미정의'); });
    return _load;
}

/** 뷰 미리보기 요소 → PDF File (한글은 캔버스 이미지로 렌더) */
export async function pdfFileFromEl(el, title) {
    await ensurePdf();
    const canvas = await (/** @type {any} */ (window)).html2canvas(el, { scale: 2, logging: false });
    const { jsPDF } = (/** @type {any} */ (window)).jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const W = 210, H = 297;
    // 페이지 여백 — 통짜 이미지를 전면 출력하면 상하 여백 없이 글자가 잘리므로 페이지별 캔버스에 여백을 입혀 조각냄 (@spec CO-20)
    const MX = 8, MY = 10;
    const pxPerMm = canvas.width / W;
    const pagePx = Math.round(H * pxPerMm);
    const innerPx = Math.round((W - 2 * MX) * pxPerMm);
    const mYPx = Math.round(MY * pxPerMm);
    const mXPx = Math.round(MX * pxPerMm);
    const sliceH = Math.round((H - 2 * MY) * pxPerMm);
    for (let off = 0; off < canvas.height; off += sliceH) {
        const h = Math.min(sliceH, canvas.height - off);
        const pg = document.createElement('canvas');
        pg.width = canvas.width; pg.height = pagePx;
        const ctx = pg.getContext('2d');
        if (!ctx) break;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pg.width, pg.height);
        ctx.drawImage(canvas, 0, off, canvas.width, h, mXPx, mYPx, innerPx, h);
        pdf.addImage(pg.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
        if (off + sliceH < canvas.height) pdf.addPage();
    }
    const blob = pdf.output('blob');
    return new File([blob], `${title}.pdf`, { type: 'application/pdf' });
}

// rgb 파싱 → 밝기(0~1) — 흰 배경에서 안 보이는 밝은 글자 판정용
export const _lum = c => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || '');
    return m ? (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255 : null;
};

/** 인쇄 가독성 래퍼로 PDF — 흰 배경·여백 확보, 밝은 글자만 검정 보정 (컬러 출력 유지).
 *  @spec CO-20 — 문서 PDF 인쇄 가독성 정본 래퍼
 *  오버레이 문서(매뉴얼·시험 문서)처럼 다크 테마 요소를 그대로 넘기면 밝은 글자가 백지처럼 보이므로
 *  클론을 흰 래퍼에 담고 밝은 색만 검정으로 바꾼다 — 나머지 색상은 그대로 유지. */
export async function pdfFileFromElStyled(el, title) {
    const wrap = document.createElement('div');
    // article 스코프 CSS가 '#manual-overlay #manual-article h2' 형태라 오버레이 조상 id가
    // 없으면 타이포그래피 자체가 미적용 — 원본 오버레이 id를 부여해 선택자 컨텍스트 재현.
    // 오버레이의 화면 규칙(display:none·position:fixed·inset)은 인라인으로 전부 덮어씀
    const ovId = el.closest('[id$="-overlay"]')?.id || '';
    if (ovId) wrap.id = ovId;
    // html2canvas는 문서 좌표로 렌더 — 화면 밖에 배치해 캡처만 수행
    // 폭 960px — article max-width(900px)가 자연 적용돼 화면·인쇄 기준본과 동일한 본문 폭 재현
    wrap.style.cssText = 'position:absolute;left:0;top:100vh;right:auto;bottom:auto;width:960px;display:block;height:auto;max-height:none;overflow:visible;z-index:auto;padding:24px;background:#fff;color:#000';
    wrap.appendChild(el.cloneNode(true));
    document.body.appendChild(wrap); // computed style을 위해 먼저 부착
    wrap.querySelectorAll('*').forEach(e2 => {
        const el2 = /** @type {HTMLElement} */ (e2);
        const cs = getComputedStyle(el2);
        const cl = _lum(cs.color);
        const fl = _lum(cs.webkitTextFillColor);
        if (cl !== null && (cl > 0.82 || (fl !== null && fl > 0.82))) { // 밝은 글자만 검정 보정 — 컬러 유지
            el2.style.color = '#000';
            el2.style.webkitTextFillColor = '#000';
        }
        const bg = _lum(cs.backgroundColor);
        if (bg !== null && bg < 0.25) el2.style.background = 'transparent'; // 어두운 배경은 제거 — 흰 종이와 대비
        el2.style.boxShadow = 'none';
        el2.style.textShadow = 'none';
    });
    // 요소 경계 페이지네이션 — 고정 높이 슬라이스는 표·그림·제목을 중간에 잘라서
    // 브라우저 인쇄(break-inside 회피)와 다르게 보인다. article의 최상위 요소를 실측
    // 높이로 페이지에 채워 넣어 요소가 통째로 들어가는 페이지 단위로 나눈다. (@spec CO-20)
    const clone = /** @type {HTMLElement} */ (wrap.firstElementChild); // article 복제본
    const W = 210, H = 297, MX = 8, MY = 10;
    const wrapCssPx = 960; // 래퍼 너비 — 전체가 PDF 내용 영역(W-2*MX)에 매핑
    const mmPerCssPx = (W - 2 * MX) / wrapCssPx;
    const availPx = (H - 2 * MY) / mmPerCssPx; // 한 페이지에 들어가는 본문 css px
    const groups = /** @type {HTMLElement[][]} */ ([]);
    let cur = /** @type {HTMLElement[]} */ ([]), curH = 0;
    for (const child of /** @type {HTMLElement[]} */ (Array.from(clone.children))) {
        const cs = getComputedStyle(child);
        const h = child.offsetHeight + parseFloat(cs.marginTop || '0') + parseFloat(cs.marginBottom || '0');
        if (curH + h > availPx && cur.length) { groups.push(cur); cur = []; curH = 0; }
        cur.push(child); curH += h;
    }
    if (cur.length) groups.push(cur);
    try {
        const { jsPDF } = (/** @type {any} */ (window)).jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        let first = true;
        for (const group of groups) {
            const pg = document.createElement('div');
            if (ovId) pg.id = ovId; // wrap과 동일한 오버레이 컨텍스트 — article 스코프 CSS 적용
            pg.style.cssText = wrap.style.cssText;
            const art = /** @type {HTMLElement} */ (clone.cloneNode(false)); // id·클래스 유지 — article 스코프 CSS 적용
            for (const c of group) art.appendChild(c);
            pg.appendChild(art);
            document.body.appendChild(pg);
            const canvas = await (/** @type {any} */ (window)).html2canvas(pg, { scale: 2, logging: false });
            pg.remove(); // 자식은 detach만 — 원본 참조 유지
            const imgH = (canvas.height / 2) * mmPerCssPx;
            if (!first) pdf.addPage(); first = false;
            if (imgH <= H - 2 * MY) {
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MX, MY, W - 2 * MX, imgH);
            } else { // 단일 요소가 한 페이지보다 큰 경우(거대 표·이미지) — 해당 요소만 여백 슬라이스로 분할
                const pxPerMm = canvas.width / (W - 2 * MX);
                const pagePx = Math.round(H * pxPerMm), mXPx = Math.round(MX * pxPerMm), mYPx = Math.round(MY * pxPerMm);
                const sliceH = Math.round((H - 2 * MY) * pxPerMm);
                for (let off = 0; off < canvas.height; off += sliceH) {
                    const hh = Math.min(sliceH, canvas.height - off);
                    const pgc = document.createElement('canvas');
                    pgc.width = canvas.width; pgc.height = pagePx;
                    const ctx = pgc.getContext('2d'); if (!ctx) break;
                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pgc.width, pgc.height);
                    ctx.drawImage(canvas, 0, off, canvas.width, hh, mXPx, mYPx, canvas.width - 2 * mXPx, hh);
                    pdf.addImage(pgc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
                    if (off + sliceH < canvas.height) pdf.addPage();
                }
            }
        }
        return new File([pdf.output('blob')], `${title}.pdf`, { type: 'application/pdf' });
    } finally { wrap.remove(); }
}

