// core/dom.js — DOM 접근 널 가드 헬퍼 (뷰 계층 순환복잡도 절감용)
// @spec none
// if (el) el.<조작> 가드를 호출부에서 제거해 함수 복잡도를 내린다.
// 순수 DOM 유틸 — 의존성 리프 유지를 위해 다른 모듈을 import 하지 않는다.

/** @param {string} id @returns {HTMLElement|null} */
export function byId(id) {
    return document.getElementById(id);
}

/** @param {HTMLElement|null} el @param {string} text */
export function setText(el, text) {
    if (el) el.textContent = text;
}

/** @param {string} id @param {string} text */
export function setTextById(id, text) {
    setText(byId(id), text);
}

/** @param {HTMLElement|null} el @param {string} html — innerHTML 직접 주입용 (sanitize 통과본만) */
export function setHtml(el, html) {
    if (el) el.innerHTML = html;
}

/** @param {HTMLElement|null} el @param {string} cls @param {boolean} on */
export function toggleCls(el, cls, on) {
    if (el) el.classList.toggle(cls, on);
}

/** @param {HTMLElement|null} el @param {boolean} visible — hidden 속성 토글 */
export function showEl(el, visible) {
    if (el) el.hidden = !visible;
}

/** @param {HTMLElement|null} el @param {string} name @param {string} value */
export function setAttr(el, name, value) {
    if (el) el.setAttribute(name, value);
}
