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
    // html2canvas는 문서 좌표로 렌더 — 화면 밖에 배치해 캡처만 수행
    wrap.style.cssText = 'position:absolute;left:0;top:100vh;width:700px;padding:24px;background:#fff;color:#000';
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
    try { return await pdfFileFromEl(wrap, title); }
    finally { wrap.remove(); }
}

