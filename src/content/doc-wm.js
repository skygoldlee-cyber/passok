// src/content/doc-wm.js — 문서 워터마크 공용 (문구 규약 + DOM 오버레이)
// @spec CO-13,DA-24 — "기관명 · 출력일" 문구를 모든 출력 경로에 동일하게 적용한다:
//   docx: docxFile/docxFileMd의 wm 인자 (본문 앵커 회전 텍스트 상자, 중앙 1회)
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
    text ? `<div class="doc-wm" aria-hidden="true"><span style="font-size:2.6em">${esc(text)}</span></div>` : '';
