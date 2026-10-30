// src/exams/cosmetic/views/formula-list.js — My 포뮬러 목록·CRUD (formula.js에서 분리)
// @spec FO-01

import { esc } from '../../../sanitize.js';
import { showToast, showConfirm } from '../../../ui-utils.js';
import { showStoreError } from '../../../pro/pro-upgrade.js';
import { checkFormulaItems, countChangedStandards } from '../formula-check.js';
import { STAB, evaluateStability } from '../formula-stability.js';
import {
  listFormulas, getFormula, deleteFormula, duplicateFormula, getFormulaUsage,
} from '../formula-store.js';
import {
  getEl, getIndex, calc, showPanel, formulaSubNav,
} from './formula-core.js';
import { openFormulaCalc } from './formula-calc.js';

function checkSummaryHtml(formula) {
  const index = getIndex();
  const { summary } = checkFormulaItems(
    (formula.ingredients || []).map(i => ({ name: i.name, concentration: i.concentration })),
    index
  );
  const parts = [];
  const changed = countChangedStandards(formula, index);
  if (changed) {
    parts.push(`<span class="f-check f-check-warn" title="저장 후 고시 기준이 변경된 원료 ${changed}종 — 재검증 권장">기준 변경 ${changed}</span>`);
  }
  if (summary.banned) parts.push(`<span class="f-check f-check-banned">금지 ${summary.banned}</span>`);
  if (summary.warn) parts.push(`<span class="f-check f-check-warn">초과 ${summary.warn}</span>`);
  if (summary.unknown) parts.push(`<span class="f-check f-check-unknown">확인 ${summary.unknown}</span>`);
  if (summary.ok) parts.push(`<span class="f-check f-check-ok">정상 ${summary.ok}</span>`);
  const stab = evaluateStability(formula.ingredients || [], getIndex(), {
    formulation: formula.customer && formula.customer.formulation,
    phTarget: formula.phTarget,
    phActual: formula.phActual,
    steps: formula.steps,
  });
  const warns = stab.warnings.filter(w => w.level === STAB.WARN).length;
  const infos = stab.warnings.length - warns;
  if (warns) parts.push(`<span class="f-check f-check-warn" title="제형 안정성 경고">안정성 ${warns}</span>`);
  if (infos) parts.push(`<span class="f-check f-check-unknown" title="제형 안정성 참고">참고 ${infos}</span>`);
  // 실험 확인 결과 — 규칙 경고보다 사용자 실험이 확정 근거
  if (formula.stability && formula.stability.result === '양호') {
    parts.push(`<span class="f-check f-check-ok" title="안정성 실험 확인${formula.stability.method ? `: ${esc(formula.stability.method)}` : ''}">안정성 확인</span>`);
  } else if (formula.stability && formula.stability.result === '이상 발견') {
    parts.push(`<span class="f-check f-check-banned" title="안정성 실험에서 이상 확인">안정성 이상</span>`);
  }
  return parts.join('');
}

export function openFormulaList() {
  showPanel('formula-list-panel');
  const subnav = getEl('formula-list-subnav');
  if (subnav) subnav.innerHTML = formulaSubNav('list');
  const list = getEl('formula-list');
  if (!list) return;

  const usage = getFormulaUsage();
  const usageEl = getEl('formula-list-usage');
  if (usageEl) usageEl.textContent = `${usage.count}/${usage.limit} 저장됨`;

  const formulas = listFormulas();
  if (!formulas.length) {
    list.innerHTML = `
      <div class="formula-empty">
        <i class="fa-solid fa-flask-vial" aria-hidden="true"></i>
        <h4>저장된 포뮬러가 없습니다</h4>
        <p>배합 계산기에서 원료와 농도를 입력하고 포뮬러로 저장해 보세요.</p>
        <button class="btn btn-primary" data-click="formulaNew"><i class="fa-solid fa-plus" aria-hidden="true"></i> 첫 포뮬러 만들기</button>
      </div>`;
    return;
  }

  list.innerHTML = formulas.map(f => {
    const ingCount = (f.ingredients || []).length;
    const date = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString('ko-KR') : '';
    const vol = f.targetVolume != null ? `${f.targetVolume}${f.unit || 'g'}` : '총량 미지정';
    const custParts = [];
    if (f.customer) {
      if (f.customer.name) custParts.push(f.customer.name);
      if (f.customer.age != null) custParts.push(`${f.customer.age}세`);
      if (f.customer.gender) custParts.push(f.customer.gender);
      if (f.customer.skinType) custParts.push(f.customer.skinType);
      if (f.customer.formulation) custParts.push(`제형: ${f.customer.formulation}`);
      if (f.customer.concerns && f.customer.concerns.length) custParts.push(`고민: ${f.customer.concerns.join(', ')}`);
      if (f.customer.pregnancy) custParts.push(f.customer.pregnancy);
      if (f.customer.allergies && f.customer.allergies.length) custParts.push(`알레르기 ${f.customer.allergies.length}종`);
    }
    return `
      <div class="formula-card">
        <div class="formula-card-head">
          <h4 class="formula-card-name">${esc(f.name)}</h4>
          <span class="formula-card-meta">${esc(vol)} · 원료 ${ingCount}종 · ${date}</span>
        </div>
        ${custParts.length ? `<div class="formula-card-customer"><i class="fa-solid fa-user" aria-hidden="true"></i> ${esc(custParts.join(' · '))}</div>` : ''}
        <div class="formula-card-checks">${checkSummaryHtml(f)}</div>
        ${f.fullIngredients && f.fullIngredients.length ? `<div class="formula-card-inci" title="전성분 표시 순서 — 안정성 확인된 배합에 저장 시 자동 생성"><i class="fa-solid fa-list-ol" aria-hidden="true"></i> ${esc(f.fullIngredients.join(', '))}</div>` : ''}
        <div class="formula-card-actions">
          <button class="btn btn-primary btn-sm" data-click="formulaOpen" data-arg="${esc(f.id)}" title="배합 계산기에서 이 처방 열기"><i class="fa-solid fa-calculator" aria-hidden="true"></i> 열기</button>
          <button class="btn btn-secondary btn-sm" data-click="batchNew" data-arg="${esc(f.id)}" title="이 처방으로 조제한 회차 기록"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i> 조제 기록</button>
          <button class="btn btn-secondary btn-sm" data-click="formulaDuplicate" data-arg="${esc(f.id)}" title="이 처방을 복제해 새 포뮬러로 저장"><i class="fa-solid fa-copy" aria-hidden="true"></i> 복제</button>
          <button class="btn btn-secondary btn-sm" data-click="formulaCardExport" data-arg="${esc(f.id)}" title="JSON 파일로 보내기"><i class="fa-solid fa-file-export" aria-hidden="true"></i> 보내기</button>
          <button class="btn btn-secondary btn-sm f-danger" data-click="formulaDelete" data-arg="${esc(f.id)}" title="포뮬러 삭제 (복구 불가)"><i class="fa-solid fa-trash" aria-hidden="true"></i> 삭제</button>
        </div>
      </div>`;
  }).join('');
}

export function formulaNew() {
  calc.rows = [{ name: '', concentration: null, phase: '' }];
  calc.steps = [];
  calc.editingId = null;
  calc.stabRecordedAt = null;
  openFormulaCalc();
}

export function formulaOpen(id) {
  const f = getFormula(id);
  if (!f) { showToast('포뮬러를 찾을 수 없습니다.', 'error'); return; }
  calc.rows = (f.ingredients || []).map(i => ({ name: i.name, concentration: i.concentration, phase: i.phase || '' }));
  if (!calc.rows.length) calc.rows = [{ name: '', concentration: null, phase: '' }];
  calc.steps = Array.isArray(f.steps) ? f.steps.slice() : [];
  calc.editingId = f.id;
  calc.stabRecordedAt = f.stability && f.stability.recordedAt ? f.stability.recordedAt : null;
  openFormulaCalc(f);
}

export function formulaDuplicate(id) {
  const r = duplicateFormula(id);
  if (!r.ok) { showStoreError(r, 'My 포뮬러', showToast, '복제에 실패했습니다.'); return; }
  showToast(`"${r.formula.name}"이 생성되었습니다.`, 'success');
  openFormulaList();
}

export async function formulaDelete(id) {
  const f = getFormula(id);
  if (!f) return;
  const ok = await showConfirm(`"${f.name}" 포뮬러를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`, '포뮬러 삭제');
  if (!ok) return;
  const r = deleteFormula(id);
  if (!r.ok) { showToast(r.error || '삭제에 실패했습니다.', 'error'); return; }
  showToast('포뮬러가 삭제되었습니다.', 'success');
  openFormulaList();
}
