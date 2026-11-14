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

/** 문구 대략 폭(em) — CJK 1em, 라틴·숫자 0.55em, 공백 0.35em (실측 대신 보수 추정) */
const _wmEm = (/** @type {string} */ t) => [...String(t)].reduce((n, c) => n + (c === ' ' ? 0.35 : (c.codePointAt(0) || 0) < 128 ? 0.55 : 1), 0);

/** 미리보기 한 페이지 높이 관례(px) — pinDocSignBottom(doc-md.js)의 minHeight와 동일 */
const _WM_PAGE_PX = 986;
/** 화면 미리보기 스탬프 최대 수 — docx의 쪽당 1개 스탬프에 대응, 넘치는 것은 overflow:hidden이 클립 */
const _WM_MAX_STAMPS = 12;

/**
 * DOM 워터마크 오버레이 — 문서 루트(position:relative) 안에 절대배치.
 * 화면에서는 ~986px(1쪽) 간격으로 스탬프를 반복 — absolute+inset:0이라 쪽 개념이 없는
 * 연속 문서에서도 각 "쪽" 중앙에 대각선이 놓인다 (인쇄 시 position:fixed가 매 장 반복하므로
 * 첫 스탬프만 표시 — css/doc-export.css).
 * 문구가 길어지면 font-size를 줄여 회전 투영 폭이 페이지 폭을 넘지 않게 한다.
 * @param {string} text - docWmText() 결과 (빈 문자열이면 미출력)
 * @returns {string} doc-wm 컨테이너 HTML 또는 빈 문자열
 */
export const docWmHtml = text => {
    if (!text) return '';
    // 회전 -45° → 수평 투영 ≈ (문구폭 + 높이)·font /√2 ≤ 페이지폭(~44em 여유 추정)
    const em = Math.min(2.6, 60 / (_wmEm(text) + 2));
    const spans = Array.from({ length: _WM_MAX_STAMPS }, (_, i) =>
        `<span style="font-size:${em.toFixed(2)}em;top:${_WM_PAGE_PX * i + _WM_PAGE_PX / 2}px">${esc(text)}</span>`).join('');
    return `<div class="doc-wm" aria-hidden="true">${spans}</div>`;
};

/**
 * docx 워터마크 PNG — 텍스트를 rgba(0,0,0,.22)(미리보기·PDF와 동일)로 캔버스에 그린
 * 알파 PNG 바이트. w14:alpha·behindDoc를 무시하는 뷰어에서도 이미지 알파는 항상 적용되므로
 * 유일하게 렌더러 무관 동일 농도를 보장한다. 크기는 docx 상자(960×100pt — 페이지 대각선을
 * 거의 관통하는 길이)의 2배 해상도. 문구는 상자 폭의 92%까지 키워 잉크가 대각선 끝까지
 * 닿도록 한다 — 페이지 중심 고정·내부 요소와 무관하게 항상 같은 영역을 덮는다.
 * @param {string} text - docWmText() 결과
 * @returns {?{data:Uint8Array,w:number,h:number}} 캔버스 불가(비브라우저)면 null
 */
export const docWmPng = text => {
    if (!text || typeof document === 'undefined') return null;
    const W = 1920, H = 200;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;
    let px = 110;
    const font = () => { c.font = `bold italic ${px}px "Malgun Gothic","맑은 고딕",sans-serif`; };
    font();
    // 회전 -45° 수평 투영 = (잉크폭 + 띠높이)/√2 ≤ 페이지 폭(595pt) → 잉크 상한 ≈ W×0.77
    while (px > 20 && c.measureText(String(text)).width > W * 0.77) { px -= 4; font(); }
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(text), W / 2, H / 2);
    const bin = atob(cv.toDataURL('image/png').split(',')[1] || '');
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    return { data, w: W, h: H };
};
