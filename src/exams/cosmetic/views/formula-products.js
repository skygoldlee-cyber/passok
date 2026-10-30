// src/exams/cosmetic/views/formula-products.js — 기성품 DB 뷰 컨트롤러 (FO-37~40)
// @spec FO-37,FO-38,FO-39,FO-40
//
// 기성품 전성분 DB — 목록(formula-product-panel) · 등록/수정 폼
// (formula-product-form-panel) · 상세+교차 분석(formula-product-detail-panel).
// formula.js의 showPanel/subNav 재사용 — 고객 관리(formula-customer.js)와
// 동일한 3패널 패턴. 설계: docs/exams/cosmetic/design/PRODUCT_DB_DESIGN.md
//
// 핵심 원칙: 전성분은 사용자 기록, 판정은 공식+자가 병합 인덱스의
// 조회 시점 라이브 매칭 — 원료 DB 갱신이 등록 제품 전체에 자동 반영된다.
//
// 모듈 분리: 공유 폼 상태→formula-prod-state.js, 사진 인식→formula-prod-vision.js,
// 상세·교차→formula-prod-detail.js. 이 파일은 목록+폼 액션+JSON IO이며
// 분리 모듈의 핸들러를 재수출한다 (registry·테스트는 이 경로로 조회 — formula.js와 동일 패턴).

import { esc } from '../../../sanitize.js';
import { showToast, showConfirm } from '../../../ui-utils.js';
import { showStoreError } from '../../../pro/pro-upgrade.js';
import { switchView } from '../../../views/navigation.js';
import { todayKey, normalizeEntityName } from '../../../utils.js';
import {
  showPanel, formulaSubNav, getEl, getIndex, customIngAdd,
  invalidateIngredientIndex,
} from './formula.js';
import {
  listProducts, getProduct, getProductUsage,
  createProduct, updateProduct, deleteProduct,
  parseFullIngredientsDetailed, classifyProductIngredients,
  ingredientMatchKeys, ingredientKeyHit,
  serializeProduct, serializeProductAnalysis, importProduct,
} from '../product-store.js';
import { findIngredient } from '../formula-check.js';
import { createCustomIngredient } from '../custom-ingredient-store.js';
import { downloadJson } from './formula-recommend.js';
import { CUSTOMER_OPTIONS } from '../formula-store.js';
import { prodForm, renderInciChips } from './formula-prod-state.js';
import { resetVisionState } from './formula-prod-vision.js';
import { productOpen } from './formula-prod-detail.js';

// 분리 모듈 재수출 — data-click 핸들러 조회 경로 유지 (practice-registry)
export {
  productVisionToggle, productPhotoPick, productPhotoRemove,
  productVisionRead, productVisionCancel,
  productVisionKeySave, productVisionKeyClear,
  productVisionKeyTest, productVisionModelSave, productVisionHiRes,
} from './formula-prod-vision.js';
export { productOpen, productRankPick } from './formula-prod-detail.js';

/* =======================================================
   목록 패널
   ======================================================= */

// 목록 필터 — ingredient는 사전 '함유 기성품' 진입 시 성분 필터
const prodFilter = { query: '', ingredient: '' };

export function openProductPanel() {
  showPanel('formula-product-panel');
  const subnav = getEl('formula-product-subnav');
  if (subnav) subnav.innerHTML = formulaSubNav('products');
  const search = getEl('product-search');
  if (search) {
    search.value = prodFilter.query;
    if (!search.dataset.bound) {
      search.dataset.bound = '1';
      search.addEventListener('input', () => {
        prodFilter.query = search.value.trim();
        renderProductList();
      });
    }
  }
  renderProductList();
}

function renderProductList() {
  const list = getEl('product-list');
  if (!list) return;
  const usage = getProductUsage();
  const usageEl = getEl('product-list-usage');
  if (usageEl) usageEl.textContent = `${usage.count}/${usage.limit} 등록`;

  // 활성 성분 필터 칩 — 사전 '함유 기성품'에서 진입한 맥락 표시
  const filterChip = getEl('product-filter-chip');
  if (filterChip) {
    filterChip.innerHTML = prodFilter.ingredient
      ? `<span class="prod-filter-active">성분 필터: <strong>${esc(prodFilter.ingredient)}</strong>
          <button type="button" class="prod-filter-clear" data-click="productClearFilter" aria-label="성분 필터 해제"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span>`
      : '';
  }

  const index = getIndex();
  const q = prodFilter.query.toLowerCase();
  // 성분 필터 — matchKey+동의어+부분일치 확장 (FO-51) — '파라벤류' 필터가
  // '메칠파라벤' 함유 제품까지 포착
  const ingKeys = prodFilter.ingredient ? ingredientMatchKeys(prodFilter.ingredient) : null;
  const products = listProducts().filter(p => {
    if (ingKeys && ingKeys.size && !(p.ingredients || [])
      .some(n => ingredientKeyHit(n, ingKeys))) return false;
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q)
      || (p.brand || '').toLowerCase().includes(q)
      || (p.ingredients || []).some(n => n.toLowerCase().includes(q));
  });

  if (!listProducts().length) {
    list.innerHTML = `
      <div class="formula-empty">
        <i class="fa-solid fa-store" aria-hidden="true"></i>
        <h4>등록된 기성품이 없습니다</h4>
        <p>시판 제품의 전성분을 붙여넣어 등록하면 성분별 규제 배지·고객 알레르기 교차·내 포뮬러 비교가 활성화됩니다.</p>
        <button class="btn btn-primary" data-click="productNew"><i class="fa-solid fa-plus" aria-hidden="true"></i> 첫 제품 등록</button>
      </div>`;
    return;
  }
  if (!products.length) {
    list.innerHTML = `<div class="formula-empty"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><h4>조건에 맞는 제품이 없습니다</h4><p>검색어 또는 성분 필터를 바꿔 보세요.</p></div>`;
    return;
  }

  // 동명(리뉴얼) 제품 표시 — 브랜드+제품명 정규화가 같은 항목 수 (FO-52)
  const nameCount = new Map();
  for (const p of products) {
    const k = normalizeEntityName(`${p.brand}|${p.name}`);
    nameCount.set(k, (nameCount.get(k) || 0) + 1);
  }
  list.innerHTML = products.map(p => {
    const { summary } = classifyProductIngredients(p, index);
    const date = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('ko-KR') : '';
    const dupN = nameCount.get(normalizeEntityName(`${p.brand}|${p.name}`)) || 0;
    const dupMark = dupN > 1 ? ` · 동명 ${dupN}종` : '';
    const parts = [];
    if (summary.banned) parts.push(`<span class="f-check f-check-banned" title="금지 성분명과 일치하는 성분 — 원문 확인 권장">금지매칭 ${summary.banned}</span>`);
    if (summary.restricted) parts.push(`<span class="f-check f-check-warn">제한 ${summary.restricted}</span>`);
    if (summary.unknown) parts.push(`<span class="f-check f-check-unknown">미등록 ${summary.unknown}</span>`);
    if (summary.custom) parts.push(`<span class="f-check f-check-custom">자가 ${summary.custom}</span>`);
    if (!parts.length) parts.push(`<span class="f-check f-check-ok">전성분 공식 매칭</span>`);
    const title = p.brand ? `${p.brand} ${p.name}` : p.name;
    return `
      <div class="formula-card">
        <div class="formula-card-head">
          <h4 class="formula-card-name">${esc(title)}</h4>
          <span class="formula-card-meta">${esc(p.category || '제형 미지정')} · 성분 ${(p.ingredients || []).length}종 · ${date}${dupMark}</span>
        </div>
        <div class="formula-card-checks">${parts.join('')}</div>
        <div class="formula-card-actions">
          <button class="btn btn-primary btn-sm" data-click="productOpen" data-arg="${esc(p.id)}" title="전성분 분석·교차 비교"><i class="fa-solid fa-microscope" aria-hidden="true"></i> 분석</button>
          <button class="btn btn-secondary btn-sm" data-click="productEdit" data-arg="${esc(p.id)}" title="제품 정보·전성분 수정"><i class="fa-solid fa-pen" aria-hidden="true"></i> 수정</button>
          <button class="btn btn-secondary btn-sm" data-click="productCardExport" data-arg="${esc(p.id)}" title="JSON 파일로 보내기"><i class="fa-solid fa-file-export" aria-hidden="true"></i> 보내기</button>
          <button class="btn btn-secondary btn-sm f-danger" data-click="productDelete" data-arg="${esc(p.id)}" title="제품 삭제 (복구 불가)"><i class="fa-solid fa-trash" aria-hidden="true"></i> 삭제</button>
        </div>
      </div>`;
  }).join('');
}

/** 사전 '함유 기성품' 진입 — 해당 성분을 함유한 제품만 필터링해 목록 표시 */
export function productOpenByIngredient(name) {
  if (typeof name !== 'string' || !name.trim()) return;
  prodFilter.ingredient = name.trim();
  prodFilter.query = '';
  // 사전 등 다른 뷰에서 호출될 수 있으므로 formula-view로 전환 후 패널 표시
  switchView('formula-view', { scrollTop: true });
  openProductPanel();
}

export function productClearFilter() {
  prodFilter.ingredient = '';
  renderProductList();
}

/* =======================================================
   등록·수정 폼 — 전성분 붙여넣기 + 칩 미리보기 (FO-38)
   ======================================================= */

export function productNew() {
  prodForm.editingId = null;
  prodForm.ingredients = [];
  prodForm.dropped = 0;
  openProductForm('기성품 등록');
}

export function productEdit(id) {
  const p = getProduct(id);
  if (!p) { showToast('등록된 제품을 찾을 수 없습니다.', 'error'); return; }
  prodForm.editingId = id;
  prodForm.ingredients = (p.ingredients || []).slice();
  prodForm.dropped = 0;
  openProductForm('기성품 수정');
  getEl('prod-name').value = p.name || '';
  getEl('prod-brand').value = p.brand || '';
  const catEl = getEl('prod-category');
  if (catEl) catEl.querySelectorAll('input[name="prod-cat"]').forEach(r => {
    const inp = /** @type {HTMLInputElement} */ (r);
    inp.checked = inp.value === (p.category || '');
  });
  getEl('prod-note').value = p.note || '';
  getEl('prod-inci-input').value = (p.ingredients || []).join(', ');
  renderInciChips();
}

function openProductForm(title) {
  resetVisionState();
  showPanel('formula-product-form-panel');
  const titleEl = getEl('product-form-title');
  if (titleEl) titleEl.textContent = title;
  // 제형 선택지 — CUSTOMER_OPTIONS.formulation 공유 (스토어 계약과 동일 enum)
  // 네이티브 select 팝업이 모바일 탭 바 영역을 침범하는 결함 → 라디오 칩 그룹
  const catEl = getEl('prod-category');
  if (catEl && !catEl.children.length) {
    catEl.innerHTML = [''].concat(CUSTOMER_OPTIONS.formulation).map((f, i) =>
      `<label class="formula-chip"><input type="radio" name="prod-cat" value="${esc(f)}"${i === 0 ? ' checked' : ''}><span>${esc(f || '미선택')}</span></label>`
    ).join('');
  }
  const ta = getEl('prod-inci-input');
  if (ta && !ta.dataset.bound) {
    ta.dataset.bound = '1';
    ta.addEventListener('input', () => {
      const parsed = parseFullIngredientsDetailed(ta.value);
      prodForm.ingredients = parsed.ingredients;
      prodForm.dropped = parsed.dropped; // 상한 절단 경고 (FO-49)
      renderInciChips();
    });
  }
  if (!prodForm.editingId) {
    getEl('prod-name').value = '';
    getEl('prod-brand').value = '';
    // 라디오 칩 그룹 — 수정 건의 체크가 남지 않도록 '미선택'으로 리셋
    if (catEl) catEl.querySelectorAll('input[name="prod-cat"]').forEach(r => {
      /** @type {HTMLInputElement} */ (r).checked = /** @type {HTMLInputElement} */ (r).value === '';
    });
    getEl('prod-note').value = '';
    ta.value = '';
  }
  renderInciChips();
}

export function productChipRemove(arg) {
  const i = parseInt(arg, 10);
  if (Number.isNaN(i) || i < 0 || i >= prodForm.ingredients.length) return;
  prodForm.ingredients.splice(i, 1);
  getEl('prod-inci-input').value = prodForm.ingredients.join(', ');
  prodForm.dropped = 0; // textarea 재작성 — 잘린 성분은 더 이상 입력에 없음
  renderInciChips();
}

/** 미등록 성분 칩 → 자가 사전 등록 단축 경로 (FO-32 재사용) */
export function productIngRegister(name) {
  customIngAdd(typeof name === 'string' ? name : '');
}

/**
 * 미등록 성분 일괄 자가 사전 등록 (FO-47) — 이름-only 스텁으로 대량 등록.
 * 개별 칩의 '사전 등록' 모달 반복을 대신한다 — 한도·중복은 건너뛰고 보고.
 */
export function productIngRegisterAll() {
  const index = getIndex();
  const names = prodForm.ingredients.filter(n => !findIngredient(index, n));
  if (!names.length) { showToast('미등록 성분이 없습니다.', 'info'); return; }
  let ok = 0;
  let skipped = 0;
  for (const name of names) {
    const r = createCustomIngredient({ name }, { officialIndex: index });
    if (r.ok) ok++;
    else skipped++;
  }
  if (ok) invalidateIngredientIndex(); // 인덱스 재구축 → 칩·분석 즉시 갱신 (DI-09)
  showToast(
    `자가 사전에 ${ok}종을 등록했습니다.${skipped ? ` ${skipped}종은 건너뛰었습니다(중복·등록 한도).` : ''}`,
    ok ? 'success' : 'warning'
  );
}

export async function productSave() {
  const catGroup = getEl('prod-category');
  const catChecked = /** @type {HTMLInputElement|null} */ (catGroup && catGroup.querySelector('input[name="prod-cat"]:checked'));
  const data = {
    name: getEl('prod-name').value,
    brand: getEl('prod-brand').value,
    category: catChecked ? catChecked.value : '',
    ingredients: prodForm.ingredients,
    note: getEl('prod-note').value,
  };
  let r = prodForm.editingId
    ? updateProduct(prodForm.editingId, data)
    : createProduct(data);
  if (!r.ok && r.code === 'duplicate' && !prodForm.editingId) {
    // 동명 리뉴얼·개정 — 전성분이 바뀐 같은 이름의 제품은 별도 항목으로 등록 (FO-52)
    const yes = await showConfirm(
      '동명 제품이 이미 등록되어 있습니다. 전성분이 바뀐 리뉴얼·개정 제품이면 별도 항목으로 등록할 수 있습니다. 리뉴얼 제품으로 등록할까요?',
      '동명 제품');
    if (!yes) { showStoreError(r, '기성품 DB', showToast, '등록에 실패했습니다.'); return; }
    r = createProduct(data, { allowVariant: true });
  }
  if (!r.ok) { showStoreError(r, '기성품 DB', showToast, '등록에 실패했습니다.'); return; }
  const wasEdit = !!prodForm.editingId;
  showToast(`"${r.item.name}"을(를) ${wasEdit ? '수정' : '등록'}했습니다.`, 'success');
  productOpen(r.item.id);
}

export async function productDelete(id) {
  const p = getProduct(id);
  if (!p) return;
  const ok = await showConfirm(`"${p.brand ? `${p.brand} ${p.name}` : p.name}" 제품을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`, '기성품 삭제');
  if (!ok) return;
  const r = deleteProduct(id);
  if (!r.ok) { showToast(r.error || '삭제에 실패했습니다.', 'error'); return; }
  showToast('제품이 삭제되었습니다.', 'success');
  openProductPanel();
}

/* =======================================================
   JSON보내기·가져오기 (FO-40)
   ======================================================= */

export function productCardExport(id) {
  const p = getProduct(id);
  if (!p) { showToast('등록된 제품을 찾을 수 없습니다.', 'error'); return; }
  const safeName = ((p.brand ? `${p.brand} ${p.name}` : p.name) || 'product').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  downloadJson(serializeProduct(p), `product_${safeName}_${todayKey()}.json`);
  showToast(`"${p.name}" 제품을 다운로드했습니다.`, 'success');
}

/** 분석 결과 JSON 내보내기 (FO-45) — 조회 시점 라이브 판정의 스냅샷 */
export function productAnalysisExport(id) {
  const p = getProduct(id);
  if (!p) { showToast('등록된 제품을 찾을 수 없습니다.', 'error'); return; }
  const safeName = ((p.brand ? `${p.brand} ${p.name}` : p.name) || 'product').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  downloadJson(serializeProductAnalysis(p, getIndex()), `product-analysis_${safeName}_${todayKey()}.json`);
  showToast(`"${p.name}" 분석 결과를 다운로드했습니다.`, 'success');
}

export function productImportJson() {
  const input = getEl('product-file-input');
  if (!input) return;
  if (!input.dataset.bound) {
    input.dataset.bound = '1';
    input.addEventListener('change', productImportFile);
  }
  input.click();
}

function productImportFile(event) {
  const input = event.target;
  const file = input && input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const r = importProduct(e.target && e.target.result);
    if (!r.ok) {
      showStoreError(r, '기성품 DB', showToast, '가져오기에 실패했습니다.');
    } else {
      showToast(`"${r.item.name}" 제품을 가져왔습니다.`, 'success');
      openProductPanel();
    }
    input.value = '';
  };
  reader.onerror = () => { showToast('파일을 읽지 못했습니다.', 'error'); input.value = ''; };
  reader.readAsText(file);
}

/* =======================================================
   자가 사전 변경 반영 — 미등록 칩 배지 즉시 갱신
   formula.js가 성분 변경 시 'formula:ingredients-changed'를 발화한다.
   ======================================================= */

if (typeof document !== 'undefined') {
  document.addEventListener('formula:ingredients-changed', () => {
    const formPanel = document.getElementById('formula-product-form-panel');
    if (formPanel && !formPanel.classList.contains('is-hidden')) renderInciChips();
    const detailPanel = document.getElementById('formula-product-detail-panel');
    if (detailPanel && !detailPanel.classList.contains('is-hidden')) {
      // 상세는 스토어 id 재조회로 재렌더 — 칩 분류가 인덱스 기준이라 갱신 필요
      const id = detailPanel.dataset.currentProductId;
      if (id) productOpen(id);
    }
  });
}
