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
    const img = canvas.toDataURL('image/png');
    const { jsPDF } = (/** @type {any} */ (window)).jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const W = 210, H = 297;
    const ih = canvas.height * (W / canvas.width);
    if (ih <= H) pdf.addImage(img, 'PNG', 0, 0, W, ih);
    else { // 긴 문서는 페이지 분할
        let off = 0;
        while (off < ih) { pdf.addImage(img, 'PNG', 0, -off, W, ih); off += H; if (off < ih) pdf.addPage(); }
    }
    const blob = pdf.output('blob');
    return new File([blob], `${title}.pdf`, { type: 'application/pdf' });
}

/** 인쇄 가독성 래퍼로 PDF — 흰 배경·여백·검정 텍스트 강제 (평가점검 출력과 동일 스타일).
 *  오버레이 문서(매뉴얼·시험 문서)처럼 다크 테마 요소를 그대로 넘기면 컬러·무여백 PDF가 되므로
 *  클론을 흰 래퍼에 담아 렌더한다. */
export async function pdfFileFromElStyled(el, title) {
    const wrap = document.createElement('div');
    // html2canvas는 문서 좌표로 렌더 — 화면 밖에 배치해 캡처만 수행
    wrap.style.cssText = 'position:absolute;left:0;top:100vh;width:700px;padding:24px;background:#fff;color:#000';
    wrap.appendChild(el.cloneNode(true));
    wrap.querySelectorAll('*').forEach(e2 => {
        const el2 = /** @type {HTMLElement} */ (e2);
        el2.style.color = '#000';
        el2.style.background = 'transparent';
        el2.style.borderColor = '#000';
        el2.style.boxShadow = 'none';
        el2.style.textShadow = 'none';
        el2.style.webkitTextFillColor = '#000'; // 그라디언트 텍스트(-webkit-text-fill-color) 대응
    });
    document.body.appendChild(wrap);
    try { return await pdfFileFromEl(wrap, title); }
    finally { wrap.remove(); }
}

