// src/exams/cosmetic/views/formula-ing-modal.js — 자가 등록 성분 모달·CRUD (formula.js에서 분리)
// @spec DI-06,DI-07,DI-08,DI-09,FO-32
//
// 사전 뷰('성분 추가')·배합 계산 'DB 미등록' 배지('사전 등록') 양쪽에서 진입.
// 모달은 런타임 DOM 생성 — 플랫폼 마크업을 건드리지 않고 어느 뷰에서도 띄울 수 있다.

import { showToast, showConfirm } from '../../../ui-utils.js';
import { DataLoader } from '../../../content/data-loader.js';
import { getActiveExamId } from '../../../exam-context.js';
import { renderDictionary } from '../../../views/dictionary.js';
import { buildIngredientIndex } from '../formula-check.js';
import {
  getCustomIngredient,
  createCustomIngredient, updateCustomIngredient, deleteCustomIngredient,
} from '../custom-ingredient-store.js';
import { getEl, invalidateIngredientIndex } from './formula-core.js';
import { renderCalcRows } from './formula-calc.js';

let _cingEditingId = null;

/** 도메인 CSS 미주입 환경(사전 뷰에서 바로 등록) 대비 — 모달 표시 전 스타일 보장 */
function ensureFormulaStyles() {
  const href = `./css/exams/${getActiveExamId()}/formula.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function cingOverlay() {
  let ov = document.getElementById('cing-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'cing-overlay';
  ov.className = 'f-weigh-overlay cing-overlay is-hidden';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', '자가 성분 등록');
  ov.innerHTML = `
    <div class="f-weigh-card cing-card dialog-card">
      <div class="f-weigh-head">
        <span id="cing-title" class="f-weigh-pos">자가 성분 등록</span>
        <button type="button" class="f-weigh-close" data-click="customIngClose" aria-label="닫기"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="cing-body">
        <label class="formula-field"><span class="formula-field-label">원료명 *</span>
          <input type="text" id="cing-name" class="form-input" maxlength="120" autocomplete="off"></label>
        <label class="formula-field"><span class="formula-field-label">영문명 (INCI)</span>
          <input type="text" id="cing-eng" class="form-input" maxlength="160" autocomplete="off"></label>
        <label class="formula-field"><span class="formula-field-label">카테고리</span>
          <input type="text" id="cing-category" class="form-input" maxlength="60" autocomplete="off" placeholder="예: 보습제"></label>
        <label class="formula-field"><span class="formula-field-label">자가 한도 (선택)</span>
          <input type="text" id="cing-limit" class="form-input" maxlength="120" autocomplete="off" placeholder="예: 2.0% — 공급사 스펙 기준">
          <span class="cing-hint">입력 시 배합률 초과를 경고합니다. 법정 한도가 아닌 자가 선언값입니다.</span></label>
        <label class="formula-field"><span class="formula-field-label">설명·메모</span>
          <textarea id="cing-desc" class="form-input" rows="2" maxlength="500"></textarea></label>
        <p class="cing-note">자가 등록 성분은 '사용자 등록 원료' 배지로 표시되며 법정 판정과 구분됩니다. 공식 DB 동명은 등록할 수 없습니다.</p>
      </div>
      <div class="f-weigh-foot cing-foot">
        <button type="button" class="btn btn-secondary is-hidden" id="cing-delete" data-click="customIngDelete"><i class="fa-solid fa-trash" aria-hidden="true"></i> 삭제</button>
        <button type="button" class="btn btn-secondary" data-click="customIngClose">취소</button>
        <button type="button" class="btn btn-primary" data-click="customIngSave"><i class="fa-solid fa-check" aria-hidden="true"></i> 등록</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  return ov;
}

function cingFill(item) {
  getEl('cing-name').value = item.name || '';
  getEl('cing-eng').value = item.engName || '';
  getEl('cing-category').value = item.category || '';
  getEl('cing-limit').value = item.limit || '';
  getEl('cing-desc').value = item.description || '';
}

/** 신규 등록 모달 — name이 있으면 원료명 프리필 (계산기 'DB 미등록' 경로) */
export function customIngAdd(name) {
  ensureFormulaStyles();
  const ov = cingOverlay();
  _cingEditingId = null;
  getEl('cing-title').textContent = '자가 성분 등록';
  getEl('cing-delete').classList.add('is-hidden');
  cingFill({ name: typeof name === 'string' ? name : '' });
  ov.classList.remove('is-hidden');
  ov.scrollTop = 0; // 오버레이 재사용 시 이전 스크롤 잔류로 상단이 잘리는 것 방지
  const addCard = ov.querySelector('.f-weigh-card');
  if (addCard) addCard.scrollTop = 0;
  getEl('cing-name').focus();
}

/** 수정 모달 — 사전 카드의 '수정' 액션 */
export function customIngEdit(id) {
  const item = getCustomIngredient(id);
  if (!item) { showToast('등록 항목을 찾을 수 없습니다.', 'error'); return; }
  ensureFormulaStyles();
  const ov = cingOverlay();
  _cingEditingId = item.id;
  getEl('cing-title').textContent = '자가 성분 수정';
  getEl('cing-delete').classList.remove('is-hidden');
  cingFill(item);
  ov.classList.remove('is-hidden');
  ov.scrollTop = 0;
  const editCard = ov.querySelector('.f-weigh-card');
  if (editCard) editCard.scrollTop = 0;
  getEl('cing-name').focus();
}

/** 저장 — 공식 인덱스는 병합 전 순수 공식본으로 충돌 비교 (DI-08) */
export function customIngSave() {
  const data = {
    name: getEl('cing-name').value,
    engName: getEl('cing-eng').value,
    category: getEl('cing-category').value,
    limit: getEl('cing-limit').value,
    description: getEl('cing-desc').value,
  };
  const officialIndex = buildIngredientIndex(DataLoader.getKnowledgeItems());
  const r = _cingEditingId
    ? updateCustomIngredient(_cingEditingId, data, { officialIndex })
    : createCustomIngredient(data, { officialIndex });
  if (!r.ok) { showToast(r.error || '등록에 실패했습니다.', 'error'); return; }
  const wasEdit = !!_cingEditingId;
  invalidateIngredientIndex();
  refreshAfterCustomChange();
  customIngClose();
  showToast(`"${r.item.name}"을(를) ${wasEdit ? '수정' : '등록'}했습니다.`, 'success');
}

export async function customIngDelete() {
  if (!_cingEditingId) return;
  if (!(await showConfirm('이 자가 등록 성분을 삭제할까요? 사용 중인 처방의 배지가 다시 "DB 미등록"으로 바뀝니다.'))) return;
  const r = deleteCustomIngredient(_cingEditingId);
  if (!r.ok) { showToast(r.error || '삭제에 실패했습니다.', 'error'); return; }
  invalidateIngredientIndex();
  refreshAfterCustomChange();
  customIngClose();
  showToast('자가 등록 성분을 삭제했습니다.', 'success');
}

export function customIngClose() {
  const ov = document.getElementById('cing-overlay');
  if (ov) ov.classList.add('is-hidden');
  _cingEditingId = null;
}

/** 등록·수정·삭제 후 화면 갱신 — 보이는 뷰만 (DI-09 인덱스 무효화의 화면 측) */
function refreshAfterCustomChange() {
  const dictView = document.getElementById('dictionary-view');
  if (dictView && dictView.classList.contains('active')) renderDictionary();
  const calcPanel = document.getElementById('formula-calc-panel');
  if (calcPanel && !calcPanel.classList.contains('is-hidden')) renderCalcRows();
}
