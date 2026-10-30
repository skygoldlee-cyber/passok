// src/exams/cosmetic/views/formula-io.js — 조제 기록지 인쇄·JSON 보내기/가져오기 (formula.js에서 분리)
// @spec FO-29

import { esc } from '../../../sanitize.js';
import { showToast } from '../../../ui-utils.js';
import { showStoreError } from '../../../pro/pro-upgrade.js';
import { todayKey } from '../../../utils.js';
import {
  CHECK, checkFormulaItems,
} from '../formula-check.js';
import { STAB, evaluateStability } from '../formula-stability.js';
import {
  getFormula, calcAmounts, serializeFormula, importFormula,
} from '../formula-store.js';
import { buildWorkOrderHtml, printHtml } from './formula-print.js';
import { downloadJson } from './formula-recommend.js';
import { getEl, getIndex, calc, readCalcInputs, CHECK_BADGE } from './formula-core.js';
import { currentDraft } from './formula-calc.js';
import { openFormulaList } from './formula-list.js';

/** 작업지시서 인쇄 (FO-29) — 계량 체크란·LOT 기입란·단계 그룹 A4 */
export function formulaPrintWorkOrder() {
  const named = calc.rows.filter(r => r.name);
  if (!named.length) { showToast('원료명이 입력된 행이 없습니다.', 'info'); return; }
  const { targetVolume, unit } = readCalcInputs();
  const nameEl = getEl('formula-name-input');
  printHtml(buildWorkOrderHtml({
    name: nameEl ? nameEl.value.trim() : '',
    targetVolume, unit,
    ingredients: named.map(r => ({ name: r.name, concentration: r.concentration, phase: r.phase || '기타' })),
    steps: calc.steps,
  }));
}

/** 인쇄용 조제 기록지 HTML 생성 */
function buildPrintHtml(f) {
  const vol = f.targetVolume != null ? `${f.targetVolume}${f.unit || 'g'}` : '—';
  const cust = f.customer || {};
  const custParts = [cust.name, cust.age != null ? `${cust.age}세` : '', cust.gender,
    cust.skinType, cust.formulation ? `제형: ${cust.formulation}` : '',
    cust.concerns && cust.concerns.length ? `고민: ${cust.concerns.join(', ')}` : '',
    cust.pregnancy,
    cust.allergies && cust.allergies.length ? `알레르기: ${cust.allergies.join(', ')}` : '',
    cust.products ? `사용 중: ${cust.products}` : '']
    .filter(Boolean).join(' · ');

  const amounts = calcAmounts(f);
  const checks = checkFormulaItems(
    f.ingredients.map(i => ({ name: i.name, concentration: i.concentration })),
    getIndex()
  );
  let sumConc = 0;
  const rowsHtml = f.ingredients.map((item, i) => {
    const conc = item.concentration;
    if (conc != null) sumConc += conc;
    const amount = amounts[i] && amounts[i].amount != null ? `${amounts[i].amount.toFixed(2)}${f.unit || 'g'}` : '—';
    const badge = CHECK_BADGE[checks.results[i] ? checks.results[i].check : CHECK.UNKNOWN] || CHECK_BADGE[CHECK.UNKNOWN];
    const limit = item.snapshot && item.snapshot.limit ? ` (한도 ${item.snapshot.limit})` : '';
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(item.phase || '—')}</td>
      <td>${esc(item.name)}${item.engName ? `<br><span class="fp-eng">${esc(item.engName)}</span>` : ''}</td>
      <td class="fp-num">${conc != null ? `${conc}%` : '—'}</td>
      <td class="fp-num">${amount}</td>
      <td>${badge.label}${esc(limit)}</td>
    </tr>`;
  }).join('');
  const rounded = Math.round(sumConc * 100) / 100;

  const stepsHtml = (f.steps && f.steps.length)
    ? `<h3>제조 절차</h3><ol class="fp-steps">${f.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
    : '';
  const stab = evaluateStability(f.ingredients, getIndex(), {
    formulation: cust.formulation, phTarget: f.phTarget, phActual: f.phActual, steps: f.steps,
  });
  const stabConfirm = f.stability
    ? `<p class="fp-meta-line">안정성 실험 확인: ${esc([f.stability.method, f.stability.result, f.stability.recordedAt && `기록 ${f.stability.recordedAt.replace('T', ' ')}`, f.stability.note].filter(Boolean).join(' · '))}</p>`
    : '';
  const inciHtml = (f.fullIngredients && f.fullIngredients.length)
    ? `<p class="fp-meta-line fp-inci">전성분 표시: ${esc(f.fullIngredients.join(', '))}</p>`
    : '';
  const stabHtml = (stab.warnings.length || f.stability || inciHtml)
    ? `<h3>제형 안정성</h3>${stabConfirm}${inciHtml}${stab.warnings.length ? `<ul class="fp-stab">${stab.warnings.map(w => `<li>${w.level === STAB.WARN ? '[주의] ' : '[참고] '}${esc(w.msg)}</li>`).join('')}</ul>` : ''}`
    : '';
  const notesHtml = f.notes ? `<h3>메모</h3><p class="fp-notes">${esc(f.notes)}</p>` : '';
  const phLine = (f.phTarget != null || f.phActual != null)
    ? `<p class="fp-meta-line">목표 pH: ${f.phTarget != null ? f.phTarget : '—'} · 실측 pH: ${f.phActual != null ? f.phActual : '—'}</p>`
    : '';

  return `
    <div class="fp-doc">
      <h1>조제 기록지 — ${esc(f.name || '(이름 없음)')}</h1>
      <p class="fp-meta-line">총 제조량: ${vol} · 작성일: ${new Date().toLocaleDateString('ko-KR')}</p>
      ${custParts ? `<p class="fp-meta-line">고객: ${esc(custParts)}</p>` : ''}
      ${phLine}
      <table class="fp-table">
        <thead><tr><th>#</th><th>단계</th><th>원료명</th><th>배합률</th><th>투입량</th><th>규정 검증</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr><td colspan="3">합계</td><td class="fp-num">${rounded}%</td><td></td><td></td></tr></tfoot>
      </table>
      ${stepsHtml}
      ${stabHtml}
      ${notesHtml}
      <p class="fp-disclaimer">검증 결과는 법정 배합 한도 기준일 뿐 제품의 안전성·안정성·품질을 보장하지 않습니다.</p>
    </div>`;
}

/** 조제 기록지 인쇄 — 인쇄 전용 영역에 렌더 후 window.print() */
export function formulaPrint() {
  const area = getEl('formula-print-area');
  if (!area) return;
  const draft = currentDraft();
  if (!draft.ingredients.length) {
    showToast('인쇄할 원료가 없습니다.', 'info');
    return;
  }
  area.innerHTML = buildPrintHtml(draft);
  document.body.classList.add('formula-printing');
  const cleanup = () => {
    document.body.classList.remove('formula-printing');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

/** 현재 드래프트를 JSON 파일로 보내기 */
export function formulaExportJson() {
  const draft = currentDraft();
  if (!draft.ingredients.length) {
    showToast('보낼 원료가 없습니다.', 'info');
    return;
  }
  const safeName = (draft.name || 'formula').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  downloadJson(serializeFormula(draft), `formula_${safeName}_${todayKey()}.json`);
  showToast('포뮬러 JSON 파일을 다운로드했습니다.', 'success');
}

/** 목록 카드에서 저장된 포뮬러를 JSON으로 보내기 */
export function formulaCardExport(id) {
  const f = getFormula(id);
  if (!f) { showToast('포뮬러를 찾을 수 없습니다.', 'error'); return; }
  const safeName = (f.name || 'formula').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  downloadJson(serializeFormula(f), `formula_${safeName}_${todayKey()}.json`);
  showToast(`"${f.name}" 포뮬러를 다운로드했습니다.`, 'success');
}

/** 포뮬러 JSON 가져오기 트리거 — 숨겨진 파일 입력 클릭 */
export function formulaImportJson() {
  const input = getEl('formula-file-input');
  if (!input) return;
  if (!input.dataset.bound) {
    input.dataset.bound = '1';
    input.addEventListener('change', formulaImportFile);
  }
  input.click();
}

function formulaImportFile(event) {
  const input = event.target;
  const file = input && input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const r = importFormula(e.target && e.target.result);
    if (!r.ok) {
      showStoreError(r, 'My 포뮬러', showToast, '가져오기에 실패했습니다.');
    } else {
      showToast(`"${r.formula.name}" 포뮬러를 가져왔습니다.`, 'success');
      openFormulaList();
    }
    input.value = '';
  };
  reader.onerror = () => { showToast('파일을 읽지 못했습니다.', 'error'); input.value = ''; };
  reader.readAsText(file);
}
