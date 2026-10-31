// src/exams/cosmetic/views/formula-calc.js — 배합 계산기 패널 (formula.js에서 분리)
// @spec FO-27,FO-30,FO-32,DI-06,DI-07
//
// 행 렌더·실시간 검증 배지·드래프트 자동 저장·안정성 패널·저장.
// 안전 원칙: 배합량을 "제안"하지 않고 사용자가 입력한 값을 고시 데이터로
// "검증"만 한다. 검증 결과는 법정 한도 기준이며 제품 안전성·안정성·품질 보장이 아니다.

import { esc, raw } from '../../../sanitize.js';
import { showToast } from '../../../ui-utils.js';
import { showStoreError } from '../../../pro/pro-upgrade.js';
import { switchView } from '../../../views/navigation.js';
import { getJSON, setJSON } from '../../../storage.js';
import { STORAGE_KEYS } from '../../../storage-keys.js';
import {
  CHECK, checkFormulaItems, countChangedStandards,
} from '../formula-check.js';
import { STAB, evaluateStability } from '../formula-stability.js';
import {
  getFormula, createFormula, updateFormula, PHASE_OPTIONS,
} from '../formula-store.js';
import { renderRecommend, renderCustomRules, populateDatalist } from './formula-recommend.js';
import { findMaterialByName, materialStatus, daysUntilExpiry } from '../material-ledger.js';
import { localDateTimeNow, fmtLocalDateTime } from '../store-utils.js';
import {
  populateCustomerFields, populateStabilityFields, updateFoldSummaries,
  writeCustomerInputs, writeStabilityInputs, readCustomerInputs, readStabilityInputs,
} from './formula-fields.js';
import {
  getEl, getIndex, calc, readCalcInputs, showPanel, formulaSubNav, CHECK_BADGE,
} from './formula-core.js';
import { initFormulaView } from './formula-hub.js';

/* =======================================================
   배합 계산기
   ======================================================= */

function rowCheckInfo(item) {
  const index = getIndex();
  const ing = item.name ? index.get(item.name) : null;
  const r = checkFormulaItems([{ name: item.name, concentration: item.concentration }], index).results[0];
  const info = CHECK_BADGE[r.check] || CHECK_BADGE[CHECK.UNKNOWN];
  // 자가 등록 원료 (DI-07) — 법정 판정 라벨 대신 '자가' 표기로 책임 경계를 드러낸다
  const isCustom = !!(ing && (ing.custom || ing.type === 'custom'));
  let label = !item.name ? '원료명 입력' : (ing ? info.label : 'DB 미등록');
  if (isCustom) {
    label = r.check === CHECK.WARN ? '자가 한도 초과'
      : (ing.limit ? '자가 한도 이내' : '자가 등록');
  }
  let html = `<span class="f-check ${info.cls}" title="${esc(r.note)}">${label}</span>`;
  // 미등록 원료 → 자가 등록 단축 경로 (FO-32)
  if (item.name && !ing) {
    html += ` <button type="button" class="f-reg-btn" data-click="customIngAdd" data-arg="${esc(item.name)}" title="성분 사전에 자가 등록 — 등록 즉시 검증에 반영">사전 등록</button>`;
  }
  // 원료 장부 연동 — 이름 정확 매칭 시 기한 임박·경과 경고 병기
  const mat = item.name ? findMaterialByName(item.name) : null;
  if (mat) {
    const s = materialStatus(mat);
    const days = daysUntilExpiry(mat);
    if (s === 'expired') {
      html += ` <span class="f-check f-check-banned" title="원료 장부 기한 경과 — 사용 금지">재고 기한 경과</span>`;
    } else if (s === 'soon') {
      html += ` <span class="f-check f-check-warn" title="원료 장부 기한 임박">재고 D-${days != null ? days : '?'}</span>`;
    }
  }
  return { check: r.check, html };
}

// 행을 다시 그리지 않고 계산 결과(투입량·배지·합계·단계 소계·검증 요약)만 갱신 — 입력 중 포커스 유지
function updateCalcComputed() {
  const { targetVolume, unit } = readCalcInputs();
  const container = getEl('formula-calc-rows');
  if (!container) return;

  // 빈 상태 안내 배너 — 이름 있는 행이 없을 때만 표시 (입력 시점에도 갱신)
  const emptyEl = getEl('formula-empty-state');
  if (emptyEl) emptyEl.classList.toggle('is-hidden', calc.rows.some(r => r.name));

  let sumConc = 0;
  let sumAmount = 0;
  const phaseSums = {}; // 단계별 배합률 소계
  const checkCounts = { ok: 0, warn: 0, banned: 0, unknown: 0 }; // 검증 요약 카운트
  container.querySelectorAll('.f-row').forEach((rowEl, i) => {
    const item = calc.rows[i];
    if (!item) return;
    const amountEl = rowEl.querySelector('.f-amount');
    const checkEl = rowEl.querySelector('.f-check-cell');
    const conc = item.concentration;
    const amount = targetVolume != null && conc != null ? Math.round(targetVolume * conc) / 100 : null;
    if (amountEl) amountEl.textContent = amount != null ? `= ${amount.toFixed(2)}${unit}` : '';
    if (checkEl) {
      if (item.name) {
        const info = rowCheckInfo(item);
        checkEl.innerHTML = info.html;
        checkCounts[info.check] = (checkCounts[info.check] || 0) + 1;
      } else {
        checkEl.innerHTML = '';
      }
    }
    if (conc != null) {
      sumConc += conc;
      const ph = item.phase || '기타';
      phaseSums[ph] = (phaseSums[ph] || 0) + conc;
    }
    if (amount != null) sumAmount += amount;
  });

  // 검증 요약 — 상단바 (문제 건수만, 전부 정상이면 정상 배지)
  const checkSumEl = getEl('formula-check-summary');
  if (checkSumEl) {
    const named = calc.rows.filter(r => r.name).length;
    const parts = [];
    if (checkCounts.banned) parts.push(`<span class="f-check f-check-banned">금지 ${checkCounts.banned}</span>`);
    if (checkCounts.warn) parts.push(`<span class="f-check f-check-warn">초과 ${checkCounts.warn}</span>`);
    if (checkCounts.unknown) parts.push(`<span class="f-check f-check-unknown">확인 ${checkCounts.unknown}</span>`);
    if (!parts.length && named) parts.push(`<span class="f-check f-check-ok">정상 ${checkCounts.ok}</span>`);
    checkSumEl.innerHTML = parts.join('');
  }

  const sumConcEl = getEl('formula-sum-conc');
  const sumAmountEl = getEl('formula-sum-amount');
  const statusEl = getEl('formula-sum-status');
  const rounded = Math.round(sumConc * 100) / 100;
  if (sumConcEl) sumConcEl.textContent = `${rounded}%`;
  if (sumAmountEl) sumAmountEl.textContent = targetVolume != null ? `${sumAmount.toFixed(2)}${unit}` : '—';
  // 합계 100% 판정 — 조제 기록으로서 전성분 합계 검증
  if (statusEl) {
    if (sumConc <= 0) {
      statusEl.textContent = '';
      statusEl.className = 'formula-sum-badge';
    } else if (Math.abs(rounded - 100) < 0.01) {
      statusEl.textContent = '100% 정상';
      statusEl.className = 'formula-sum-badge f-check f-check-ok';
    } else if (rounded > 100) {
      statusEl.textContent = `${(rounded - 100).toFixed(2)}% 초과`;
      statusEl.className = 'formula-sum-badge f-check f-check-banned';
    } else {
      statusEl.textContent = `${(100 - rounded).toFixed(2)}% 부족`;
      statusEl.className = 'formula-sum-badge f-check f-check-warn';
    }
  }
  // 단계별 소계 (입력된 단계만, PHASE_OPTIONS 순서)
  const phaseEl = getEl('formula-phase-sums');
  if (phaseEl) {
    const parts = PHASE_OPTIONS
      .filter(p => phaseSums[p] != null)
      .map(p => `${p} ${Math.round(phaseSums[p] * 100) / 100}%`);
    phaseEl.textContent = parts.length ? `단계별: ${parts.join(' · ')}` : '';
  }
  // 진행 단계 표시 (FO-27) — 원료 입력 → 한도 검증 → 저장
  renderCalcProgress(checkCounts);
  scheduleDraftSave();
  renderStability();
}

/** 진행 단계 스트립 — 서서 작업하는 현장에서 현재 위치를 상시 표시 */
function renderCalcProgress(checkCounts) {
  const el = getEl('formula-progress');
  if (!el) return;
  const named = calc.rows.filter(r => r.name).length;
  const verified = named > 0 && !checkCounts.banned && !checkCounts.warn && !checkCounts.unknown;
  const steps = [
    { label: '원료 입력', done: named > 0 },
    { label: '한도 검증', done: verified },
    { label: '저장', done: !!calc.editingId },
  ];
  el.innerHTML = steps.map((s, i) => `
    <span class="f-prog-step ${s.done ? 'is-done' : ''}">
      ${s.done ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : `${i + 1}`} ${s.label}
    </span>`).join('');
}

/* =======================================================
   작업 드래프트 자동 저장·복원 (FO-30) — 현장 중단 대응
   신규 작성(editingId 없음)만 대상 — 저장본 편집은 드래프트를 쓰지 않는다.
   ======================================================= */
let _draftTimer = null;

function readCalcDraft() {
  const nameEl = getEl('formula-name-input');
  const notesEl = getEl('formula-notes-input');
  const { targetVolume, unit, phTarget, phActual } = readCalcInputs();
  return {
    rows: calc.rows.map(r => ({ name: r.name, concentration: r.concentration, phase: r.phase || '' })),
    steps: calc.steps.slice(),
    targetVolume, unit, phTarget, phActual,
    name: nameEl ? nameEl.value.trim() : '',
    notes: notesEl ? notesEl.value.trim() : '',
    savedAt: localDateTimeNow(),
  };
}

function scheduleDraftSave() {
  if (calc.editingId) return;
  clearTimeout(_draftTimer);
  _draftTimer = setTimeout(() => {
    const d = readCalcDraft();
    if (!d.rows.some(r => r.name) && !d.name && !d.steps.length) return; // 빈 작업은 저장 안 함
    if (setJSON(STORAGE_KEYS.FORMULA_CALC_DRAFT, d)) showDraftStatus(d.savedAt);
  }, 600);
}

function clearCalcDraft() {
  clearTimeout(_draftTimer);
  setJSON(STORAGE_KEYS.FORMULA_CALC_DRAFT, null);
}

function showDraftStatus(savedAt, prefix = '자동 저장') {
  const el = getEl('formula-draft-status');
  if (!el) return;
  const t = typeof savedAt === 'string' && savedAt.length >= 16 ? fmtLocalDateTime(savedAt).slice(11, 16) : '';
  el.textContent = `— ${prefix} ${t}`.trimEnd();
  el.classList.add('is-saved');
}

/** 제형 안정성 패널 — 배합비·투입 단계·절차·pH 규칙 기반 경고 (법규 검증과 별개 축) */
export function renderStability() {
  const panel = getEl('formula-stability');
  if (!panel) return;
  const named = calc.rows.filter(r => r.name);
  if (!named.length) {
    panel.classList.add('is-hidden');
    panel.innerHTML = '';
    return;
  }
  const { phTarget, phActual } = readCalcInputs();
  const { warnings } = evaluateStability(named, getIndex(), {
    formulation: readCustomerInputs().formulation,
    phTarget, phActual,
    steps: calc.steps,
  });
  const stab = readStabilityInputs();
  const stabRecorded = stab.method || stab.result || stab.note;
  if (!warnings.length && !stabRecorded) {
    panel.classList.add('is-hidden');
    panel.innerHTML = '';
    return;
  }
  // 실험 확인 상태 — 규칙 경고보다 사용자 실험이 확정 근거
  let confirmHtml = '';
  if (stabRecorded) {
    const recorded = calc.stabRecordedAt ? `기록 ${calc.stabRecordedAt.replace('T', ' ')}` : '';
    const parts = [stab.method, stab.result, recorded, stab.note].filter(Boolean);
    const cls = stab.result === '양호' ? 'f-stab-good' : (stab.result === '이상 발견' ? 'f-stab-bad' : 'f-stab-info');
    const ic = stab.result === '양호' ? 'fa-circle-check' : (stab.result === '이상 발견' ? 'fa-triangle-exclamation' : 'fa-flask');
    confirmHtml = `<div class="formula-stab-confirm ${cls}"><i class="fa-solid ${ic}" aria-hidden="true"></i> 실험 확인 기록: ${esc(parts.join(' · '))}</div>`;
  }
  const icon = l => l === STAB.WARN
    ? '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>'
    : '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';
  panel.innerHTML = `
    <div class="formula-stab-head"><i class="fa-solid fa-flask" aria-hidden="true"></i> 제형 안정성
      <span class="formula-rec-note">규칙 기반 참고 — 실제 안정성은 제조 정보의 실험 확인으로 확정</span></div>
    ${confirmHtml}
    ${warnings.length ? `<ul class="formula-stab-list">
      ${warnings.map(w => `<li class="f-stab-${esc(w.level)}">${raw(icon(w.level))} ${esc(w.msg)}</li>`).join('')}
    </ul>` : ''}`;
  panel.classList.remove('is-hidden');
}

export function renderCalcRows() {
  const container = getEl('formula-calc-rows');
  if (!container) return;

  container.innerHTML = '';
  calc.rows.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'f-row';
    row.innerHTML = `
      <div class="f-row-top">
        <input type="text" class="f-name" list="formula-ing-datalist" value="${esc(item.name)}"
               placeholder="원료명 (예: 글리세린)" aria-label="원료 ${i + 1} 이름">
        <span class="f-check-cell"></span>
        <button type="button" class="f-del" data-click="formulaCalcRemoveRow" data-arg="${i}"
                aria-label="원료 ${i + 1} 삭제"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="f-row-bottom">
        <span class="f-stepper">
          <button type="button" class="f-step-btn" data-dir="-1" aria-label="원료 ${i + 1} 배합률 0.1 감소">−</button>
          <input type="number" class="f-conc" inputmode="decimal" min="0" step="0.01" value="${esc(item.concentration != null ? item.concentration : '')}"
                 placeholder="%" aria-label="원료 ${i + 1} 배합률(%)">
          <button type="button" class="f-step-btn" data-dir="1" aria-label="원료 ${i + 1} 배합률 0.1 증가">+</button>
        </span>
        <span class="f-amount"></span>
        <select class="f-phase" aria-label="원료 ${i + 1} 제조 단계">
          <option value="">단계</option>
          ${PHASE_OPTIONS.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
        </select>
      </div>`;

    const nameEl = /** @type {HTMLInputElement} */ (row.querySelector('.f-name'));
    const concEl = /** @type {HTMLInputElement} */ (row.querySelector('.f-conc'));
    const phaseEl = /** @type {HTMLSelectElement} */ (row.querySelector('.f-phase'));
    phaseEl.value = item.phase || '';
    nameEl.addEventListener('input', () => {
      calc.rows[i].name = nameEl.value.trim();
      updateCalcComputed();
    });
    concEl.addEventListener('input', () => {
      const v = concEl.value === '' ? null : parseFloat(concEl.value);
      calc.rows[i].concentration = (v != null && !Number.isNaN(v)) ? v : null;
      updateCalcComputed();
    });
    phaseEl.addEventListener('change', () => {
      calc.rows[i].phase = phaseEl.value;
      updateCalcComputed();
    });
    // 배합률 스테퍼 (FO-27) — 태블릿·장갑 환경에서 ±0.1 터치 증감
    row.querySelectorAll('.f-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = parseFloat(/** @type {HTMLElement} */ (btn).dataset.dir || '0');
        const cur = calc.rows[i].concentration;
        const next = Math.max(0, Math.round(((cur != null ? cur : 0) + dir * 0.1) * 100) / 100);
        calc.rows[i].concentration = next;
        concEl.value = String(next);
        updateCalcComputed();
      });
    });
    container.appendChild(row);
  });
  updateCalcComputed();
}

/** 행을 제조 단계(PHASE_OPTIONS) 순서로 정렬 — 지정 안 한 행은 맨 뒤 */
export function formulaSortPhase() {
  const order = p => {
    const i = PHASE_OPTIONS.indexOf(p);
    return i < 0 ? PHASE_OPTIONS.length : i;
  };
  calc.rows.sort((a, b) => order(a.phase) - order(b.phase));
  renderCalcRows();
}

/** 계산기 스칼라 필드 id ↔ 소스 속성 매핑 (필드 초기화·드래프트 복원 공용) */
const CALC_FIELD_MAP = [
  ['formula-target-volume', 'targetVolume'],
  ['formula-unit', 'unit'],
  ['formula-ph-target', 'phTarget'],
  ['formula-ph-actual', 'phActual'],
  ['formula-name-input', 'name'],
  ['formula-notes-input', 'notes'],
];

function _calcFieldEls() {
  const els = {};
  for (const [id, prop] of CALC_FIELD_MAP) els[prop] = getEl(id);
  return els;
}

/** 기존 포뮬러 수정 진입 — 소스 객체 값으로 필드 채우기 */
function _writeCalcSourceFields(els, f) {
  for (const [, prop] of CALC_FIELD_MAP) {
    const el = els[prop];
    if (el) el.value = f[prop] != null ? f[prop] : '';
  }
  if (els.unit && !f.unit) els.unit.value = 'g';
}

/** 신규 진입 — 기본값 리셋 후 자동 저장 드래프트 복원 (FO-30) */
function _initCalcFields(els) {
  if (els.targetVolume && !els.targetVolume.value) els.targetVolume.value = '100';
  if (els.unit) els.unit.value = 'g';
  for (const prop of ['phTarget', 'phActual', 'name', 'notes']) {
    if (els[prop]) els[prop].value = '';
  }
  _restoreCalcDraft(els);
}

function _draftRows(draft) {
  const rows = draft.rows.map(r => ({
    name: (r && r.name) || '',
    concentration: r && r.concentration != null ? r.concentration : null,
    phase: (r && r.phase) || '',
  }));
  return rows.length ? rows : [{ name: '', concentration: null, phase: '' }];
}

function _hasDraftContent(draft) {
  return draft.rows.some(r => r && r.name)
    || draft.name || (draft.steps || []).length;
}

/** 작업 드래프트 복원 — 현장 중단 후 재진입 시 자동 저장분 이어쓰기 */
function _restoreCalcDraft(els) {
  const draft = getJSON(STORAGE_KEYS.FORMULA_CALC_DRAFT);
  if (!draft || !Array.isArray(draft.rows) || !_hasDraftContent(draft)) return;
  calc.rows = _draftRows(draft);
  calc.steps = Array.isArray(draft.steps) ? draft.steps.slice() : [];
  for (const [, prop] of CALC_FIELD_MAP) {
    const el = els[prop];
    if (el && draft[prop] != null && draft[prop] !== '') el.value = String(draft[prop]);
  }
  showDraftStatus(draft.savedAt, '임시 저장 복원');
}

/** 총량/단위·pH·메모·안정성 필드 변경 리스너 1회 바인딩 */
function _bindCalcFieldListeners(els) {
  const bindOnce = (el, flag, ev, fn) => {
    if (el && !el.dataset[flag]) {
      el.dataset[flag] = '1';
      el.addEventListener(ev, fn);
    }
  };
  // 총량/단위 변경 시 재계산
  bindOnce(els.targetVolume, 'bound', 'input', updateCalcComputed);
  bindOnce(els.unit, 'bound', 'change', updateCalcComputed);
  // pH·메모·안정성 확인 필드 변경 → 제조 정보 접이식 요약 + 안정성 평가 갱신
  ['formula-ph-target', 'formula-ph-actual', 'formula-notes-input', 'formula-name-input',
    'formula-stab-method', 'formula-stab-result', 'formula-stab-note'].forEach(id => {
    bindOnce(getEl(id), 'foldBound', 'input',
      () => { updateFoldSummaries(); renderStability(); scheduleDraftSave(); });
  });
}

/** 고시 개정 감지 — 저장된 스냅샷 기준과 현재 DB가 다른 원료가 있으면 배너 표시 */
function _updateStdWarnBanner(sourceFormula) {
  const stdWarnEl = getEl('formula-std-warn');
  if (!stdWarnEl) return;
  const changed = sourceFormula ? countChangedStandards(sourceFormula, getIndex()) : 0;
  if (!changed) {
    stdWarnEl.classList.add('is-hidden');
    stdWarnEl.innerHTML = '';
    return;
  }
  stdWarnEl.classList.remove('is-hidden');
  stdWarnEl.innerHTML = `<div class="f-check f-check-warn batch-allergy-warn-box">`
    + `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> `
    + `저장 후 고시 기준이 변경된 원료가 ${changed}종 있습니다 — 한도를 재검증하고 다시 저장하면 스냅샷이 갱신됩니다.</div>`;
}

function _hasCustomerInfo(f) {
  const c = f.customer || {};
  return c.name || c.skinType || c.formulation || c.products || c.age != null
    || _hasCustomerConcerns(c);
}

function _hasCustomerConcerns(c) {
  return (c.concerns && c.concerns.length) || c.pregnancy
    || (c.allergies && c.allergies.length);
}

function _hasProcessInfo(f) {
  return f.phTarget != null || f.phActual != null
    || (f.steps && f.steps.length) || f.notes || f.stability;
}

/** 내용이 있는 접이식 섹션은 자동 펼침 (기존 포뮬러 수정 진입 시) */
function _autoOpenFolds(sourceFormula) {
  const custFold = /** @type {HTMLDetailsElement} */ (document.getElementById('formula-fold-customer'));
  const procFold = /** @type {HTMLDetailsElement} */ (document.getElementById('formula-fold-process'));
  const hasCust = sourceFormula ? _hasCustomerInfo(sourceFormula) : false;
  const hasProc = sourceFormula ? _hasProcessInfo(sourceFormula) : false;
  if (custFold) custFold.open = !!hasCust;
  if (procFold) procFold.open = !!hasProc;
}

export function openFormulaCalc(sourceFormula) {
  showPanel('formula-calc-panel');
  const subnav = getEl('formula-calc-subnav');
  if (subnav) subnav.innerHTML = formulaSubNav('calc');
  populateDatalist();
  populateCustomerFields();
  populateStabilityFields();

  const title = getEl('formula-calc-title');
  if (title) title.textContent = calc.editingId ? '포뮬러 수정' : '배합 계산기';

  const els = _calcFieldEls();
  if (sourceFormula) _writeCalcSourceFields(els, sourceFormula);
  else _initCalcFields(els);

  renderSteps();
  writeCustomerInputs(sourceFormula ? sourceFormula.customer : null,
    sourceFormula ? sourceFormula.customerId : '');
  writeStabilityInputs(sourceFormula ? sourceFormula.stability : null);
  renderRecommend();
  renderCustomRules();
  _bindCalcFieldListeners(els);
  _updateStdWarnBanner(sourceFormula);
  _autoOpenFolds(sourceFormula);
  updateFoldSummaries();
  renderCalcRows();
}

export function formulaCalcAddRow() {
  calc.rows.push({ name: '', concentration: null });
  renderCalcRows();
  const container = getEl('formula-calc-rows');
  const last = container && container.querySelector('.f-row:last-child .f-name');
  if (last) /** @type {HTMLElement} */ (last).focus();
}

export function formulaCalcRemoveRow(idx) {
  const i = parseInt(idx, 10);
  if (Number.isNaN(i) || i < 0 || i >= calc.rows.length) return;
  calc.rows.splice(i, 1);
  if (!calc.rows.length) calc.rows.push({ name: '', concentration: null });
  renderCalcRows();
}

/**
 * 성분 사전/원료 상세에서 "포뮬러에 추가" — 현재 계산기 드래프트에 행을 추가하고
 * 배합 계산기로 이동한다. 농도는 비워 두어 사용자가 직접 입력(검증 대상)하게 한다.
 * @param {string} name - INGREDIENTS_DATA의 원료명
 */
export function formulaAddIngredient(name) {
  if (typeof name !== 'string' || !name.trim()) return;
  const trimmed = name.trim();
  // 마지막 빈 행 재사용, 아니면 새 행 추가
  const last = calc.rows[calc.rows.length - 1];
  if (last && !last.name) {
    last.name = trimmed;
  } else {
    calc.rows.push({ name: trimmed, concentration: null, phase: '' });
  }
  // 사전 등 다른 뷰에서 호출될 수 있으므로 formula-view로 전환 후 계산기 표시
  switchView('formula-view', { scrollTop: true });
  openFormulaCalc();
  showToast(`"${trimmed}"을(를) 추가했습니다 — 배합률(%)을 입력하세요.`, 'success');
}

/* =======================================================
   제조 절차 (steps) — 조제 순서 기록
   ======================================================= */

function renderSteps() {
  const list = getEl('formula-steps-list');
  if (!list) return;
  if (!calc.steps.length) {
    list.innerHTML = '<div class="formula-rec-note">단계를 추가해 조제 순서를 기록하세요. (예: 수상부 가열 → 유상부 용해 → 유화 → 후첨가)</div>';
    return;
  }
  list.innerHTML = '';
  calc.steps.forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'formula-step-row';
    row.innerHTML = `
      <span class="formula-step-no" aria-hidden="true">${i + 1}</span>
      <input type="text" class="f-step form-input" maxlength="200" value="${esc(text)}"
             placeholder="예: 수상부 80℃ 가열 후 교반" aria-label="제조 절차 ${i + 1}단계">
      <button type="button" class="f-del" data-click="formulaStepRemove" data-arg="${i}"
              aria-label="절차 ${i + 1} 삭제"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
    const input = /** @type {HTMLInputElement} */ (row.querySelector('.f-step'));
    input.addEventListener('input', () => { calc.steps[i] = input.value; updateFoldSummaries(); renderStability(); });
    list.appendChild(row);
  });
  updateFoldSummaries();
}

export function formulaStepAdd() {
  calc.steps.push('');
  renderSteps();
  const list = getEl('formula-steps-list');
  const last = list && list.querySelector('.formula-step-row:last-child .f-step');
  if (last) /** @type {HTMLElement} */ (last).focus();
}

export function formulaStepRemove(idx) {
  const i = parseInt(idx, 10);
  if (Number.isNaN(i) || i < 0 || i >= calc.steps.length) return;
  calc.steps.splice(i, 1);
  renderSteps();
}

/* =======================================================
   저장
   ======================================================= */

/** 현재 화면 입력을 포뮬러 데이터로 수집 (저장·인쇄·보내기 공용) */
export function currentDraft() {
  const nameEl = getEl('formula-name-input');
  const notesEl = getEl('formula-notes-input');
  const { targetVolume, unit, phTarget, phActual } = readCalcInputs();
  const index = getIndex();
  // 보정 중인 저장본의 기록 메타 — 인쇄·직렬화에서 전성분·기록일시 보존
  const existing = calc.editingId ? getFormula(calc.editingId) : null;
  return {
    name: nameEl ? nameEl.value.trim() : '',
    targetVolume, unit, phTarget, phActual,
    notes: notesEl ? notesEl.value.trim() : '',
    steps: calc.steps.slice(),
    customer: readCustomerInputs(),
    customerId: (() => {
      const el = getEl('formula-cust-id');
      return el ? el.value : '';
    })(),
    stability: {
      ...readStabilityInputs(),
      recordedAt: existing && existing.stability ? (existing.stability.recordedAt || '') : '',
    },
    fullIngredients: existing && existing.fullIngredients ? existing.fullIngredients : [],
    ingredients: calc.rows
      .filter(r => r.name)
      .map(r => {
        const ing = index.get(r.name);
        return {
          name: r.name,
          engName: ing && ing.engName ? ing.engName : '',
          concentration: r.concentration,
          phase: r.phase || '',
          snapshot: ing ? { type: ing.type || '', limit: ing.limit || '' } : null,
        };
      }),
  };
}

/** 계산 결과를 포뮬러로 저장 (신규 또는 editingId 갱신) */
export function formulaCalcSave() {
  const data = currentDraft();
  // 안정성 확인 기록이 있으면 저장 시각 자동 부여 — 내용이 바뀐 경우만 갱신
  if (data.stability && (data.stability.method || data.stability.result || data.stability.note)) {
    const prev = calc.editingId ? (getFormula(calc.editingId) || {}).stability : null;
    const same = prev && prev.method === data.stability.method
      && prev.result === data.stability.result && prev.note === data.stability.note;
    data.stability.recordedAt = same ? (prev.recordedAt || '')
      : localDateTimeNow();
  }
  const r = calc.editingId ? updateFormula(calc.editingId, data) : createFormula(data);

  if (!r.ok) { showStoreError(r, 'My 포뮬러', showToast); return; }
  clearCalcDraft();
  calc.editingId = r.formula.id;
  calc.stabRecordedAt = r.formula.stability ? r.formula.stability.recordedAt : null;
  showToast(`"${r.formula.name}" 포뮬러가 저장되었습니다.`, 'success');
  initFormulaView();
}
