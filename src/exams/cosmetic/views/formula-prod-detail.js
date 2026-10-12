// src/exams/cosmetic/views/formula-prod-detail.js — 기성품 상세·교차·비교 뷰 (FO-39·40·44·45)
// @spec FO-39,FO-40,FO-44,FO-45
//
// 상세 패널(formula-product-detail-panel) — 전성분 라이브 분석, 고객 알레르기 교차,
// 표시 순서 힌트, 내 포뮬러·다른 기성품 비교. formula-products.js의 폼·목록과
// 무관하게 스토어에서 직접 조회한다.

import { esc } from '../../../sanitize.js';
import { showToast } from '../../../ui-utils.js';
import { showPanel, formulaSubNav, getEl, getIndex } from './formula.js';
import {
  listProducts, getProduct, classifyProductIngredients, PRODUCT_ING_CLASS,
  findAllergyHits, compareWithFormula, compareWithProduct,
  rankFormulasByOverlap, detectOrderHint,
} from '../product-store.js';
import { listCustomers } from '../customer-store.js';
import { listFormulas } from '../formula-store.js';

/* =======================================================
   배지 — 성분 유형 분류 → 시각 계약
   ======================================================= */

const CLASS_BADGE = {
  [PRODUCT_ING_CLASS.OFFICIAL]: { cls: 'f-check-ok', label: '공식 등록' },
  [PRODUCT_ING_CLASS.RESTRICTED]: { cls: 'f-check-warn', label: '사용 제한' },
  [PRODUCT_ING_CLASS.BANNED]: { cls: 'f-check-banned', label: '금지 성분명 매칭' },
  [PRODUCT_ING_CLASS.CUSTOM]: { cls: 'f-check-custom', label: '자가 등록' },
  [PRODUCT_ING_CLASS.UNKNOWN]: { cls: 'f-check-unknown', label: 'DB 미등록' },
};

function classBadgeHtml(cls, note) {
  const b = CLASS_BADGE[cls] || CLASS_BADGE[PRODUCT_ING_CLASS.UNKNOWN];
  return `<span class="f-check ${b.cls}" title="${esc(note || '')}">${b.label}</span>`;
}

/* =======================================================
   상세 — 전성분 분석 + 교차 (FO-39·FO-40)
   ======================================================= */

export function productOpen(id) {
  const p = getProduct(id);
  if (!p) { showToast('등록된 제품을 찾을 수 없습니다.', 'error'); return; }
  showPanel('formula-product-detail-panel');
  const panel = getEl('formula-product-detail-panel');
  if (panel) panel.dataset.currentProductId = p.id;
  const subnav = getEl('product-detail-subnav');
  if (subnav) subnav.innerHTML = formulaSubNav('products');
  const box = getEl('product-detail');
  if (!box) return;

  const index = getIndex();
  const { results, summary } = classifyProductIngredients(p, index);
  const title = p.brand ? `${p.brand} ${p.name}` : p.name;

  const summaryHtml = [
    summary.banned ? `<span class="f-check f-check-banned">금지 성분명 매칭 ${summary.banned}</span>` : '',
    summary.restricted ? `<span class="f-check f-check-warn">사용 제한 ${summary.restricted}</span>` : '',
    summary.custom ? `<span class="f-check f-check-custom">자가 등록 ${summary.custom}</span>` : '',
    summary.unknown ? `<span class="f-check f-check-unknown">DB 미등록 ${summary.unknown}</span>` : '',
    summary.official ? `<span class="f-check f-check-ok">공식 등록 ${summary.official}</span>` : '',
  ].filter(Boolean).join('');

  // 비공식 배지는 판정 근거(note)를 인라인 표시 — 툴팁은 모바일에서 접근 불가
  const rowsHtml = results.map((r, i) => `
    <div class="prod-ing-row">
      <span class="prod-ing-no">${i + 1}</span>
      <span class="prod-ing-name">${esc(r.name)}</span>
      ${r.cls === PRODUCT_ING_CLASS.OFFICIAL ? '' : `<button type="button" class="prod-ing-dict" data-click="dictOpenByName" data-arg="${esc(r.name)}" title="사전에서 이 성분 보기"><i class="fa-solid fa-book-open" aria-hidden="true"></i></button>`}
      ${classBadgeHtml(r.cls, r.note)}
      ${r.cls === PRODUCT_ING_CLASS.OFFICIAL ? '' : `<span class="prod-ing-note">${esc(r.note)}</span>`}
    </div>`).join('');

  // 고객 알레르기 교차 — 알레르기 보유 고객이 있을 때만 섹션 표시
  const customers = listCustomers().filter(c => c.allergies && c.allergies.length);
  const allergyHits = customers
    .map(c => ({ customer: c, hits: findAllergyHits(p, c.allergies) }))
    .filter(x => x.hits.length);
  const allergyHtml = allergyHits.length
    ? allergyHits.map(x =>
        `<div class="prod-allergy-hit"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <strong>${esc(x.customer.name)}</strong> — 알레르기 성분 매칭: ${esc(x.hits.join(', '))}
          <button class="formula-rec-chip" data-click="custOpen" data-arg="${esc(x.customer.id)}" title="고객 카드 보기">고객 카드</button></div>`).join('')
    : (customers.length
        ? '<div class="formula-rec-note">알레르기 매칭 없음 — 등록 고객의 알레르기 성분과 겹치지 않습니다.</div>'
        : '<div class="formula-rec-note">알레르기 이력이 등록된 고객이 없습니다 — 고객 카드에 알레르기를 기록하면 교차 확인됩니다.</div>');

  // 전성분 순서 힌트 (FO-44) — 색소 뒤에 비색소가 오면 법정 표시 규칙과 어긋남
  const orderHint = detectOrderHint(p);
  const hintHtml = orderHint
    ? `<div class="prod-order-hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <strong>표시 순서 검토</strong> — 색소 계열(${esc(orderHint.misplaced.join(', '))}) 뒤에 다른 성분이 표기되어
        법정 표시 규칙(색소는 함량 무관 최하단)과 다를 수 있습니다. 라벨 원문 또는 입력 순서를 확인하세요.</div>`
    : '';

  // 포뮬러 비교 셀렉트 — 전성분 보유(안정성 양호) 포뮬러만
  const formulas = listFormulas().filter(f => f.fullIngredients && f.fullIngredients.length);
  // 유사 포뮬러 자동 랭킹 (FO-45) — 중첩도 상위 3건, 클릭 시 셀렉트에 즉시 적용
  const ranked = rankFormulasByOverlap(p, formulas);
  const rankHtml = ranked.length
    ? `<div class="prod-rank-chips"><span class="prod-compare-label">유사 포뮬러</span>${ranked.map(r =>
        `<button type="button" class="formula-rec-chip" data-click="productRankPick" data-arg="${esc(r.formula.id)}" title="공통 성분 ${r.common}종 · 유사도 ${Math.round(r.ratio * 100)}%">${esc(r.formula.name)} <span class="fold-hint">${Math.round(r.ratio * 100)}%</span></button>`).join('')}</div>`
    : '';
  const compareHtml = formulas.length
    ? `${rankHtml}<select id="prod-compare-select" class="form-select" aria-label="비교할 내 포뮬러">
        <option value="">비교할 포뮬러 선택</option>
        ${formulas.map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}
      </select>
      <div id="prod-compare-result"></div>`
    : '<div class="formula-rec-note">전성분이 생성된 포뮬러가 없습니다 — 안정성 "양호" 확인된 배합을 저장하면 비교할 수 있습니다.</div>';

  // 기성품 ↔ 기성품 비교 (FO-45) — 자기 자신 제외
  const others = listProducts().filter(x => x.id !== p.id);
  const p2pHtml = others.length
    ? `<select id="prod-p2p-select" class="form-select" aria-label="비교할 다른 기성품">
        <option value="">비교할 제품 선택</option>
        ${others.map(x => `<option value="${esc(x.id)}">${esc(x.brand ? `${x.brand} ${x.name}` : x.name)}</option>`).join('')}
      </select>
      <div id="prod-p2p-result"></div>`
    : '<div class="formula-rec-note">비교할 다른 기성품이 없습니다 — 2종 이상 등록하면 성분을 대조할 수 있습니다.</div>';

  box.innerHTML = `
    <div class="formula-card">
      <div class="formula-card-head">
        <h4 class="formula-card-name">${esc(title)}</h4>
        <span class="formula-card-meta">${esc(p.category || '제형 미지정')} · 성분 ${results.length}종 · ${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('ko-KR') : ''}</span>
      </div>
      ${p.note ? `<div class="formula-card-meta">메모: ${esc(p.note)}</div>` : ''}
      <div class="formula-card-checks">${summaryHtml}</div>

      <div class="cust-section">
        <div class="cust-section-head">전성분 분석 <span class="fold-hint">표시 순서 — 조회 시점 원료 DB 기준 라이브 매칭</span></div>
        <div class="prod-ing-list">${rowsHtml}</div>
        ${hintHtml}
        <p class="cing-note">판정은 등록 시점이 아닌 <strong>현재 원료 DB 기준</strong>으로 표시됩니다 — 고시 개정으로 DB가 갱신되면 분석도 자동으로 최신화됩니다. 함량 정보가 없으므로 '사용 제한'은 한도 초과 여부가 아닌 존재 표시입니다.</p>
      </div>

      <div class="cust-section">
        <div class="cust-section-head">고객 알레르기 교차</div>
        ${allergyHtml}
      </div>

      <div class="cust-section">
        <div class="cust-section-head">내 포뮬러와 비교</div>
        ${compareHtml}
      </div>

      <div class="cust-section">
        <div class="cust-section-head">다른 기성품과 비교</div>
        ${p2pHtml}
      </div>

      <div class="formula-card-actions">
        <button class="btn btn-secondary btn-sm" data-click="productEdit" data-arg="${esc(p.id)}"><i class="fa-solid fa-pen" aria-hidden="true"></i> 수정</button>
        <button class="btn btn-secondary btn-sm" data-click="productCardExport" data-arg="${esc(p.id)}" title="JSON 파일로 보내기"><i class="fa-solid fa-file-export" aria-hidden="true"></i> 보내기</button>
        <button class="btn btn-secondary btn-sm" data-click="productAnalysisExport" data-arg="${esc(p.id)}" title="분석 결과를 JSON으로 내보내기"><i class="fa-solid fa-microscope" aria-hidden="true"></i> 분석 내보내기</button>
        <button class="btn btn-secondary btn-sm f-danger" data-click="productDelete" data-arg="${esc(p.id)}" title="제품 삭제 (복구 불가)"><i class="fa-solid fa-trash" aria-hidden="true"></i> 삭제</button>
      </div>
    </div>`;

  const sel = getEl('prod-compare-select');
  if (sel) {
    sel.addEventListener('change', () => renderCompareResult(p, sel.value));
  }
  const p2pSel = getEl('prod-p2p-select');
  if (p2pSel) {
    p2pSel.addEventListener('change', () => renderProductCompare(p, p2pSel.value));
  }
}

/** 유사 포뮬러 랭킹 칩 선택 — 셀렉트에 즉시 적용 (FO-45) */
export function productRankPick(formulaId) {
  const panel = getEl('formula-product-detail-panel');
  const pid = panel && panel.dataset.currentProductId;
  const p = pid && getProduct(pid);
  const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('prod-compare-select'));
  if (!p || !sel) return;
  sel.value = formulaId;
  renderCompareResult(p, formulaId);
}

/** 기성품 ↔ 기성품 비교 결과 렌더 (FO-45) */
function renderProductCompare(product, otherId) {
  const box = getEl('prod-p2p-result');
  if (!box) return;
  if (!otherId) { box.innerHTML = ''; return; }
  const other = getProduct(otherId);
  const cmp = other && compareWithProduct(product, other);
  if (!cmp) { box.innerHTML = '<div class="formula-rec-note">비교할 수 없습니다.</div>'; return; }
  const otherTitle = other.brand ? `${other.brand} ${other.name}` : other.name;
  const col = (label, items, cls) => `
    <div class="prod-compare-col">
      <div class="prod-compare-label">${label} <span class="fold-hint">${items.length}종</span></div>
      ${items.length ? items.map(n => `<span class="prod-ing-chip ${cls}">${esc(n)}</span>`).join('') : '<span class="formula-rec-note">없음</span>'}
    </div>`;
  box.innerHTML = `<div class="prod-compare-grid">
    ${col('공통 성분', cmp.common, '')}
    ${col('이 제품에만', cmp.aOnly, 'is-unknown')}
    ${col(`${esc(otherTitle)}에만`, cmp.bOnly, 'is-formula')}
  </div>`;
}

/** 포뮬러 비교 결과 렌더 — 공통/제품에만/내 포뮬러에만 3분할 */
function renderCompareResult(product, formulaId) {
  const box = getEl('prod-compare-result');
  if (!box) return;
  if (!formulaId) { box.innerHTML = ''; return; }
  const f = getFormulaForCompare(formulaId);
  const cmp = f && compareWithFormula(product, f);
  if (!cmp) { box.innerHTML = '<div class="formula-rec-note">비교할 수 없습니다.</div>'; return; }
  const col = (label, items, cls) => `
    <div class="prod-compare-col">
      <div class="prod-compare-label">${label} <span class="fold-hint">${items.length}종</span></div>
      ${items.length ? items.map(n => `<span class="prod-ing-chip ${cls}">${esc(n)}</span>`).join('') : '<span class="formula-rec-note">없음</span>'}
    </div>`;
  box.innerHTML = `<div class="prod-compare-grid">
    ${col('공통 성분', cmp.common, '')}
    ${col('이 제품에만', cmp.productOnly, 'is-unknown')}
    ${col('내 포뮬러에만', cmp.formulaOnly, 'is-formula')}
  </div>`;
}

function getFormulaForCompare(id) {
  return listFormulas().find(f => f.id === id) || null;
}
