// src/exams/cosmetic/views/formula-prod-state.js — 기성품 DB 뷰 공유 폼 상태 (FO-38)
// @spec FO-38
//
// prodForm(편집 상태) + renderInciChips(칩 미리보기) — 폼 액션(formula-products.js)과
// 사진 인식(formula-prod-vision.js)이 함께 쓰는 상태·렌더를 한 곳에 둬
// 양쪽 모듈 간 직접 참조(순환)를 피한다.

import { esc } from '../../../sanitize.js';
import { getEl, getIndex } from './formula.js';
import { findIngredient } from '../formula-check.js';

/** @type {{editingId: string|null, ingredients: string[], dropped: number}} */
export const prodForm = { editingId: null, ingredients: [], dropped: 0 };

/** 칩 미리보기 — 순서 보존 + 미등록 칩 강조 + 개별 삭제·사전 등록 단축 */
export function renderInciChips() {
  const box = getEl('prod-inci-chips');
  if (!box) return;
  const index = getIndex();
  const unknownCount = prodForm.ingredients.filter(n => !findIngredient(index, n)).length;
  const countEl = getEl('prod-inci-count');
  if (countEl) {
    countEl.textContent = prodForm.ingredients.length
      ? `성분 ${prodForm.ingredients.length}종${unknownCount ? ` · 미등록 ${unknownCount}종` : ''}${prodForm.dropped ? ` · ⚠ 상한 초과 ${prodForm.dropped}종 잘림` : ''}`
      : '';
  }
  if (!prodForm.ingredients.length) {
    box.innerHTML = '<span class="formula-rec-note">전성분을 붙여넣으면 성분 칩이 순서대로 표시됩니다.</span>';
    return;
  }
  box.innerHTML = prodForm.ingredients.map((n, i) => {
    const known = !!findIngredient(index, n);
    const badge = known ? '' : ' <span class="prod-chip-miss">미등록</span>';
    const reg = known ? '' : `<button type="button" class="prod-chip-reg" data-click="productIngRegister" data-arg="${esc(n)}" title="자가 성분 사전에 등록 — 등록 즉시 분석에 반영">사전 등록</button>`;
    return `<span class="prod-ing-chip${known ? '' : ' is-unknown'}"><span class="prod-chip-no">${i + 1}</span>${esc(n)}${badge}
      ${reg}<button type="button" class="prod-chip-x" data-click="productChipRemove" data-arg="${i}" aria-label="${esc(n)} 제거"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span>`;
  }).join('')
    // FO-47 — 미등록 다수(사진 인식 초안 등) 시 일괄 자가 사전 등록 단축
    + (unknownCount > 1
      ? `<button type="button" class="btn btn-secondary btn-sm prod-bulk-reg" data-click="productIngRegisterAll" title="미등록 성분 전부를 자가 사전에 이름만으로 등록 — 등록 후 칩에서 항목별 정보 보완 가능"><i class="fa-solid fa-book-medical" aria-hidden="true"></i> 미등록 ${unknownCount}종 사전 일괄 등록</button>`
      : '');
}
