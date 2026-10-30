// src/exams/cosmetic/views/formula-batch-form.js — 조제 기록(배치) 폼 뷰 (FO-16·61)
// @spec FO-16,FO-61
//
// 신규·보정 폼(formula-batch-form-panel) — 처방/고객 바인딩, QC·위생 필드,
// LOT 선택·재고 경고, 사용기한 제안, 스냅샷 계산. 저장 경로(batchSave)는
// 상세 패널(batchOpen) 호출이 필요해 formula-batch.js에 남는다 — 이 모듈은
// 배치 목록·상세를 참조하지 않아 의존 방향은 batch → form 단방향.

import { esc } from '../../../sanitize.js';
import { showToast } from '../../../ui-utils.js';
import { showUpgradeNotice } from '../../../pro/pro-upgrade.js';
import { showPanel, getEl } from './formula.js';
import { listFormulas, getFormula } from '../formula-store.js';
import { listCustomers, getCustomer } from '../customer-store.js';
import { buildIngredientIndex, checkFormulaItems } from '../formula-check.js';
import { evaluateStability, STAB } from '../formula-stability.js';
import {
  getBatch, getBatchUsage,
  QC_FIELDS, QC_VALUES, HYGIENE_FIELDS,
} from '../batch-store.js';
import { localDateTimeNow } from '../store-utils.js';
import { DataLoader } from '../../../content/data-loader.js';
import { daysUntilExpiry, findMaterialsByName, stockStatus } from '../material-ledger.js';
import { isPreservative } from '../formula-stability.js';
import { localDateKey } from '../../../utils.js';

// 폼 상태 — editingId가 있으면 보정 모드(identity 필드 읽기 전용)
export const draft = { editingId: null };

let ingredientIndex = null;
function getIndex() {
  if (!ingredientIndex) {
    ingredientIndex = buildIngredientIndex(DataLoader.getKnowledgeItems());
  }
  return ingredientIndex;
}

/* =======================================================
   배치 폼 (신규 · 보정)
   ======================================================= */

function fillFormulaSelect(selectedId) {
  const sel = getEl('batch-formula');
  if (!sel) return;
  const formulas = listFormulas();
  sel.innerHTML = '<option value="">처방 선택…</option>'
    + formulas.map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');
  if (selectedId) sel.value = selectedId;
}

/** 고객 카드 셀렉트 — 등록 고객이 변하므로 매번 다시 채운다 */
function fillCustomerSelect(selectedId) {
  const sel = getEl('batch-customer-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">고객 카드에서 선택…</option>'
    + listCustomers().map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  sel.value = selectedId || '';
}

function writeBatchForm(b) {
  const set = (id, v) => {
    const el = getEl(id);
    if (el) el.value = v == null ? '' : v;
  };
  set('batch-made-at', b ? b.madeAt : localDateTimeNow());
  set('batch-target-volume', b && b.targetVolume != null ? b.targetVolume : '');
  set('batch-unit', (b && b.unit) || 'g');
  set('batch-customer-id', (b && b.customerId) || '');
  set('batch-customer-name', (b && b.customerName) || '');
  set('batch-expiry', (b && b.expiryAt) || '');
  set('batch-delivered', (b && b.deliveredAt) || '');
  set('batch-disposition', (b && b.disposition) || '');
  set('batch-ph', b && b.phMeasured != null ? b.phMeasured : '');
  set('batch-notes', (b && b.notes) || '');
  QC_FIELDS.forEach(f => {
    const v = (b && b.qc && b.qc[f.key]) || '';
    const radio = /** @type {HTMLInputElement|null} */ (document.querySelector(`input[name="batch-qc-${f.key}"][value="${v || '미확인'}"]`));
    if (radio) radio.checked = true;
  });
  HYGIENE_FIELDS.forEach(f => {
    const el = getEl(`batch-hyg-${f.key}`);
    if (el) el.checked = !!(b && b.hygiene && b.hygiene[f.key]);
  });
}

/** 신규 배치 폼 — data-arg로 formulaId를 받으면 해당 처방으로 바인딩 */
export function batchNew(formulaId) {
  const usage = getBatchUsage();
  if (!usage.canCreate) {
    showUpgradeNotice('조제 기록', `Free 플랜은 최대 ${usage.limit}건까지 기록할 수 있습니다.`);
    return;
  }
  draft.editingId = null;
  showPanel('formula-batch-form-panel');
  fillFormulaSelect(typeof formulaId === 'string' ? formulaId : '');
  fillCustomerSelect('');
  bindFormOnce(); // QC 라디오 렌더 선행 — writeBatchForm이 라디오를 체크하려면 DOM이 있어야 함
  writeBatchForm(null);
  const title = getEl('batch-form-title');
  if (title) title.textContent = '조제 기록 — 신규';
  const f = typeof formulaId === 'string' ? getFormula(formulaId) : null;
  if (f) applyFormulaDefaults(f);
  updateBatchFormMode();
  renderLotFields(f, null);
  updateAllergyWarn();
  updateStockWarn();
}

/** 보정 모드 — identity 필드(처방·조제일시·배치번호)는 읽기 전용 표시 */
export function batchEdit(id) {
  const b = getBatch(id);
  if (!b) { showToast('조제 기록을 찾을 수 없습니다.', 'error'); return; }
  draft.editingId = b.id;
  showPanel('formula-batch-form-panel');
  fillFormulaSelect(b.formulaId);
  fillCustomerSelect(b.customerId);
  bindFormOnce(); // QC 라디오 렌더 선행 — 기존 QC 값 복원이 라디오 DOM에 의존
  writeBatchForm(b);
  const title = getEl('batch-form-title');
  if (title) title.textContent = `조제 기록 보정 — ${b.batchNo}`;
  updateBatchFormMode();
  const f = b.formulaId ? getFormula(b.formulaId) : null;
  renderLotFields(f, b);
  updateAllergyWarn();
  updateStockWarn();
}

/** 보정 모드에서는 처방·조제일시 변경 불가 (기록 무결성 — 틀린 회차는 삭제 후 재기록) */
function updateBatchFormMode() {
  const editing = !!draft.editingId;
  ['batch-formula', 'batch-made-at'].forEach(id => {
    const el = getEl(id);
    if (el) el.disabled = editing;
  });
}

/**
 * 권장 사용기한 자동 제안 — 보존제 유무·수상 여부 기반 일수.
 * 법적 유효기간이 아닌 참고 제안이며, 필드는 사용자가 수정할 수 있다.
 * - 보존제 포함 → 180일
 * - 보존제 없음 + 수상부 원료 있음 → 14일 (미생물 리스크, 냉장·단기 사용 권장)
 * - 보존제 없음 + 무수 제형 → 90일
 * @returns {number|null} 제안 일수 (원료 없으면 null)
 */
export function suggestExpiryDays(formula) {
  const items = (formula && formula.ingredients) || [];
  if (!items.length) return null;
  const index = getIndex();
  const hasPreservative = items.some(
    i => i && i.name && isPreservative(index.get(i.name), i.name)
  );
  if (hasPreservative) return 180;
  const hasWater = items.some(
    i => i && (i.phase === '수상부' || (i.name || '').includes('정제수'))
  );
  return hasWater ? 14 : 90;
}

/** 처방 선택 시 사용기한이 비어 있으면 제안값으로 채우고 근거 힌트를 표시한다 */
function updateExpiryHint(formula) {
  const expEl = getEl('batch-expiry');
  const hintEl = getEl('batch-expiry-hint');
  if (!expEl) return;
  const days = suggestExpiryDays(formula);
  if (hintEl) hintEl.textContent = days != null ? `자동 제안 ${days}일 — 필요 시 수정` : '';
  if (days == null || expEl.value) return;
  const madeEl = getEl('batch-made-at');
  const base = madeEl && madeEl.value ? new Date(madeEl.value) : new Date();
  if (Number.isNaN(base.getTime())) return;
  const d = new Date(base.getTime() + days * 86400000);
  expEl.value = localDateKey(d);
}

/** 처방 선택 시 총량·단위·고객 기본값 채우기 (입력된 값은 덮어쓰지 않음) */
function applyFormulaDefaults(f) {
  const volEl = getEl('batch-target-volume');
  const unitEl = getEl('batch-unit');
  const custEl = getEl('batch-customer-name');
  const custIdEl = getEl('batch-customer-id');
  const custSel = getEl('batch-customer-select');
  if (volEl && !volEl.value && f.targetVolume != null) volEl.value = f.targetVolume;
  if (unitEl && f.unit) unitEl.value = f.unit;
  // 처방에 연결된 고객 카드가 있으면 참조 우선, 아니면 인라인 이름만 채움
  if (f.customerId && getCustomer(f.customerId)) {
    if (custIdEl) custIdEl.value = f.customerId;
    if (custSel) custSel.value = f.customerId;
    if (custEl) custEl.value = getCustomer(f.customerId).name;
  } else if (custEl && !custEl.value && f.customer && f.customer.name) {
    custEl.value = f.customer.name;
  }
  updateExpiryHint(f);
}

/** 고객 카드 선택 → 이름 필드 + customerId 참조 저장 */
export function batchCustChanged() {
  const sel = getEl('batch-customer-select');
  const id = sel ? sel.value : '';
  const idEl = getEl('batch-customer-id');
  const nameEl = getEl('batch-customer-name');
  if (idEl) idEl.value = id;
  const c = id ? getCustomer(id) : null;
  if (nameEl) nameEl.value = c ? c.name : '';
  updateAllergyWarn();
}

export function batchFormulaChanged() {
  const sel = getEl('batch-formula');
  const f = sel && sel.value ? getFormula(sel.value) : null;
  if (f) applyFormulaDefaults(f);
  renderLotFields(f, null);
  updateAllergyWarn();
  updateStockWarn();
}

/* =======================================================
   사용 원료 LOT 선택 + 재고 부족 경고
   ======================================================= */

/**
 * 처방 원료 ↔ 원료 장부 이름 매칭으로 LOT 선택 UI를 렌더한다.
 * 복수 LOT이면 select, 단일이면 고정 표기. 기존 배치(b)의 materialLots를 복원.
 */
function renderLotFields(formula, b) {
  const box = getEl('batch-lots');
  if (!box) return;
  const saved = new Map(
    (b && Array.isArray(b.materialLots) ? b.materialLots : []).map(l => [l.name, l.materialId])
  );
  const rows = (formula && Array.isArray(formula.ingredients) ? formula.ingredients : [])
    .map(i => {
      const name = (i && i.name || '').trim();
      if (!name) return '';
      const mats = findMaterialsByName(name);
      if (!mats.length) return '';
      const opts = mats.map(m => {
        const days = daysUntilExpiry(m);
        const exp = m.expiryAt ? ` · 기한 ${m.expiryAt}${days != null && days < 0 ? ' (경과)' : days != null && days <= 30 ? ` (D-${days})` : ''}` : '';
        // 소진 LOT는 신규 선택 불가 — 다만 기존 배치가 이미 선택한 LOT면 복원을 위해 유지 (FO-61)
        const out = stockStatus(m) === 'out' && saved.get(name) !== m.id;
        return `<option value="${esc(m.id)}"${out ? ' disabled' : ''}>${esc(m.lot || m.name)}${esc(exp)}${m.qty != null ? ` · 잔량 ${m.qty}${esc(m.unit || '')}` : ''}${out ? ' · 소진' : ''}</option>`;
      }).join('');
      return `<div class="batch-qc-row">
        <span class="batch-qc-label">${esc(name)}</span>
        <select class="form-select batch-lot-select" data-name="${esc(name)}" aria-label="${esc(name)} 사용 LOT">${opts}</select>
      </div>`;
    }).filter(Boolean);
  box.innerHTML = rows.length
    ? rows.join('')
    : '<div class="formula-rec-note">장부에 매칭되는 원료가 없습니다 — 원료 장부에 등록하면 LOT 추적이 가능합니다.</div>';
  // 기존 선택 복원 (보정 모드)
  box.querySelectorAll('.batch-lot-select').forEach(node => {
    const sel = /** @type {HTMLSelectElement} */ (node);
    const prev = saved.get(sel.dataset.name);
    if (prev) sel.value = prev;
  });
}

/** 폼에서 선택된 LOT 목록 → {name, materialId, lot}[] */
function readLotSelections() {
  return Array.from(document.querySelectorAll('#batch-lots .batch-lot-select'))
    .map(node => {
      const sel = /** @type {HTMLSelectElement} */ (node);
      const m = findMaterialsByName(sel.dataset.name || '').find(x => x.id === sel.value);
      return m ? { name: sel.dataset.name, materialId: m.id, lot: m.lot || '' } : null;
    })
    .filter(Boolean);
}

/**
 * 소요량 vs 장부 잔량 — 같은 이름 원료의 잔량 합계가 필요량보다 적으면 경고.
 * 단위가 배치 단위와 같은 항목만 합산 (g↔ml 혼합 방지). LOT 선택 변경에도 반응.
 */
function updateStockWarn() {
  const warnEl = getEl('batch-stock-warn');
  if (!warnEl) return;
  const fsel = getEl('batch-formula');
  const formula = fsel && fsel.value ? getFormula(fsel.value) : null;
  const volEl = getEl('batch-target-volume');
  const unitEl = getEl('batch-unit');
  const vol = volEl && volEl.value !== '' ? parseFloat(volEl.value) : null;
  const unit = unitEl ? unitEl.value : 'g';
  const shortages = [];
  if (formula && vol != null && !Number.isNaN(vol)) {
    (formula.ingredients || []).forEach(i => {
      const name = (i && i.name || '').trim();
      if (!name || i.concentration == null) return;
      const need = vol * i.concentration / 100;
      const stock = findMaterialsByName(name)
        .filter(m => m.qty != null && (!m.unit || m.unit === unit))
        .reduce((s, m) => s + m.qty, 0);
      const mats = findMaterialsByName(name);
      if (mats.length && stock < need) {
        shortages.push(`${name} — 필요 ${Math.round(need * 100) / 100}${unit}, 잔량 ${stock}${unit}`);
      }
    });
  }
  if (!shortages.length) {
    warnEl.classList.add('is-hidden');
    warnEl.innerHTML = '';
    return;
  }
  warnEl.classList.remove('is-hidden');
  warnEl.innerHTML = `<div class="f-check f-check-warn batch-stock-warn-box">`
    + `<i class="fa-solid fa-box-open" aria-hidden="true"></i> 재고 부족: ${esc(shortages.join(' · '))}</div>`;
}

/** 선택된 고객 카드의 알레르기 이력 ↔ 처방 원료 충돌을 폼에 실시간 표시 */
function updateAllergyWarn() {
  const warnEl = getEl('batch-allergy-warn');
  if (!warnEl) return;
  const conflicts = currentAllergyConflicts();
  if (!conflicts.length) {
    warnEl.classList.add('is-hidden');
    warnEl.innerHTML = '';
    return;
  }
  warnEl.classList.remove('is-hidden');
  warnEl.innerHTML = `<div class="f-check f-check-banned batch-allergy-warn-box">`
    + `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> `
    + `고객 알레르기 이력 원료가 처방에 포함되어 있습니다: ${esc(conflicts.join(', '))} — 저장 전 반드시 확인하세요.</div>`;
}

/** 현재 폼 상태 기준 알레르기 충돌 원료 목록 */
export function currentAllergyConflicts() {
  const fsel = getEl('batch-formula');
  const csel = getEl('batch-customer-id');
  const formula = fsel && fsel.value ? getFormula(fsel.value) : null;
  const customer = csel && csel.value ? getCustomer(csel.value) : null;
  return findAllergyConflicts(customer, formula);
}

/** QC 라디오 그룹 렌더 — QC_FIELDS/QC_VALUES에서 생성, 1회만 */
function renderQcFields() {
  const box = getEl('batch-qc-fields');
  if (!box || box.dataset.bound) return;
  box.dataset.bound = '1';
  box.innerHTML = QC_FIELDS.map(f => `
    <div class="batch-qc-row">
      <span class="batch-qc-label">${esc(f.label)}</span>
      <span class="batch-qc-opts">${QC_VALUES.map(v => `
        <label class="formula-chip batch-qc-chip">
          <input type="radio" name="batch-qc-${f.key}" value="${esc(v)}">
          <span>${esc(v)}</span>
        </label>`).join('')}
      </span>
    </div>`).join('');
}

function bindFormOnce() {
  renderQcFields();
  const sel = getEl('batch-formula');
  if (sel && !sel.dataset.bound) {
    sel.dataset.bound = '1';
    sel.addEventListener('change', batchFormulaChanged);
  }
  const custSel = getEl('batch-customer-select');
  if (custSel && !custSel.dataset.bound) {
    custSel.dataset.bound = '1';
    custSel.addEventListener('change', batchCustChanged);
  }
  // 총량·단위 변경 → 재고 부족 경고 갱신
  ['batch-target-volume', 'batch-unit'].forEach(id => {
    const el = getEl(id);
    if (el && !el.dataset.stockBound) {
      el.dataset.stockBound = '1';
      el.addEventListener('input', updateStockWarn);
      el.addEventListener('change', updateStockWarn);
    }
  });
}

export function readBatchForm() {
  const val = id => {
    const el = getEl(id);
    return el ? el.value : '';
  };
  const qc = {};
  QC_FIELDS.forEach(f => {
    const r = /** @type {HTMLInputElement|null} */ (document.querySelector(`input[name="batch-qc-${f.key}"]:checked`));
    qc[f.key] = r ? r.value : '';
  });
  const hygiene = {};
  HYGIENE_FIELDS.forEach(f => {
    const el = getEl(`batch-hyg-${f.key}`);
    hygiene[f.key] = !!(el && el.checked);
  });
  const sel = getEl('batch-formula');
  return {
    formulaId: sel ? sel.value : '',
    madeAt: val('batch-made-at'),
    targetVolume: val('batch-target-volume') === '' ? null : parseFloat(val('batch-target-volume')),
    unit: val('batch-unit'),
    customerId: val('batch-customer-id'),
    customerName: val('batch-customer-name'),
    expiryAt: val('batch-expiry'),
    deliveredAt: val('batch-delivered'),
    disposition: val('batch-disposition'),
    phMeasured: val('batch-ph') === '' ? null : parseFloat(val('batch-ph')),
    materialLots: readLotSelections(),
    notes: val('batch-notes'),
    qc, hygiene,
  };
}

/**
 * 처방의 검증 결과를 스냅샷 요약으로 계산 — 배치 생성 시점의 근거 보존.
 * 원본 결과 대신 건수 요약만 저장한다 (용량·의미 모두 요약이 충분).
 */
export function buildCheckSnapshot(formula) {
  if (!formula || !Array.isArray(formula.ingredients) || !formula.ingredients.length) return null;
  const index = getIndex();
  const { summary } = checkFormulaItems(
    formula.ingredients.map(i => ({ name: i.name, concentration: i.concentration })),
    index
  );
  const stab = evaluateStability(formula.ingredients, index, {
    formulation: formula.customer && formula.customer.formulation,
    phTarget: formula.phTarget, phActual: formula.phActual, steps: formula.steps,
  });
  const stabWarn = stab.warnings.filter(w => w.level === STAB.WARN).length;
  const meta = (DataLoader.registry && DataLoader.registry.ingredients) || null;
  return {
    ok: summary.ok || 0, warn: summary.warn || 0, banned: summary.banned || 0,
    unknown: summary.unknown || 0, stabWarn, stabInfo: stab.warnings.length - stabWarn,
    dbVersion: meta && meta.version ? String(meta.version) : '',
  };
}

/**
 * 고객 알레르기·임신 조건과 처방 원료의 충돌을 검사한다.
 * 알레르기 이력은 자유 텍스트라 양방향 부분 일치로 판정한다
 * ("파라벤" 이력 ↔ "메칠파라벤" 원료처럼 상위/하위 표기 차이를 커버).
 * @returns {string[]} 충돌 원료명 배열
 */
function findAllergyConflicts(customer, formula) {
  if (!customer || !formula || !Array.isArray(formula.ingredients)) return [];
  const allergies = (Array.isArray(customer.allergies) ? customer.allergies : [])
    .map(a => (typeof a === 'string' ? a.trim() : '')).filter(Boolean);
  if (!allergies.length) return [];
  return formula.ingredients
    .map(i => i.name)
    .filter(n => typeof n === 'string' && allergies.some(a => n.includes(a) || a.includes(n)));
}
