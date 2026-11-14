// src/content/doc-wm.js — 문서 워터마크 공용 (문구 규약 + DOM 오버레이 + docx용 PNG)
// @spec CO-13,DA-24 — "기관명 · 출력일" 문구를 모든 출력 경로에 동일하게 적용한다:
//   docx: docxFile/docxFileMd의 wmImg 인자 (docWmPng — 알파 구운 PNG를 회전 앵커로 배치.
//         w14:alpha·behindDoc 무시 뷰어에서도 PNG 자체 알파라 미리보기와 동일하게 표시.
//         캔버스 불가 환경은 wm 텍스트 상자 폴백)
//   미리보기·인쇄: 문서 루트에 docWmHtml(wm) 삽입 (css/doc-export.css — 루트는 position:relative 필요)
//   PDF: pdfFileFromEl의 wm 인자 (페이지 캔버스 대각선 스탬프 — DOM 워터마크는 클론에서 제거해 중복 방지)
import { todayKey } from '../core/utils.js';
import { esc } from '../core/sanitize.js';

/**
 * 워터마크 문구 — "기관명 · 출력일(로컬)". 기관명 없으면 빈 문자열(미출력)
 * @param {string} org - 기관·조직명
 * @returns {string}
 */
export const docWmText = org => {
    const o = String(org || '').trim();
    return o ? `${o} · ${todayKey()}` : '';
};

/**
 * DOM 워터마크 오버레이 — 문서 루트(position:relative) 안에 절대배치, 페이지 중앙 대각선 1회.
 * @param {string} text - docWmText() 결과 (빈 문자열이면 미출력)
 * @returns {string} doc-wm 컨테이너 HTML 또는 빈 문자열
 */
export const docWmHtml = text =>
    text ? `<div class="doc-wm" aria-hidden="true"><span>${esc(text)}</span></div>` : '';

/**
 * docx 워터마크 PNG — 텍스트를 rgba(0,0,0,.12)(미리보기·PDF와 동일)로 캔버스에 그린
 * 알파 PNG 바이트. w14:alpha·behindDoc를 무시하는 뷰어에서도 이미지 알파는 항상 적용되므로
 * 유일하게 렌더러 무관 동일 농도를 보장한다. 크기는 docx 상자(640×90pt)의 2배 해상도.
 * @param {string} text - docWmText() 결과
 * @returns {?{data:Uint8Array,w:number,h:number}} 캔버스 불가(비브라우저)면 null
 */
export const docWmPng = text => {
    if (!text || typeof document === 'undefined') return null;
    const W = 1280, H = 180;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;
    let px = 92;
    const font = () => { c.font = `bold italic ${px}px "Malgun Gothic","맑은 고딕",sans-serif`; };
    font();
    while (px > 20 && c.measureText(String(text)).width > W * 0.92) { px -= 4; font(); }
    c.fillStyle = 'rgba(0,0,0,.12)';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(text), W / 2, H / 2);
    const bin = atob(cv.toDataURL('image/png').split(',')[1] || '');
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    return { data, w: W, h: H };
};
