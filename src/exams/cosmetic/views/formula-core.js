// src/exams/cosmetic/views/formula-core.js — Formula OS 공용 상태·패널·서브내비 (formula.js에서 분리)
// @spec FO-01,FO-33,DI-08,DI-09
//
// 패널 전환·계산기 드래프트 상태·성분 인덱스·서브내비를 한곳에 둔다.
// 모든 서브모듈(hub·list·calc·weigh·ing-modal·io)이 여기서 가져가므로
// 상위 모듈 간 직접 import는 core → (hub|calc) → (list|io) 단방향을 유지한다.

import { esc } from '../../../sanitize.js';
import { DataLoader } from '../../../content/data-loader.js';
import { resetMainScroll } from '../../../views/navigation.js';
import { CHECK, buildIngredientIndex } from '../formula-check.js';
import { annotateCustomItems } from '../custom-ingredient-store.js';
import { getBizType, bizVisible } from '../biz-profile.js';

// 검증 상태 배지 메타 — 목록 카드·행 배지·인쇄 산출물이 공유
export const CHECK_BADGE = {
  [CHECK.OK]: { cls: 'f-check-ok', label: '한도 이내' },
  [CHECK.WARN]: { cls: 'f-check-warn', label: '한도 초과' },
  [CHECK.BANNED]: { cls: 'f-check-banned', label: '금지 원료' },
  [CHECK.UNKNOWN]: { cls: 'f-check-unknown', label: '확인 필요' },
};

const PANELS = [
  'formula-menu-panel', 'formula-list-panel', 'formula-calc-panel',
  'formula-batch-panel', 'formula-batch-form-panel', 'formula-batch-detail-panel',
  'formula-customer-panel', 'formula-customer-form-panel', 'formula-customer-detail-panel',
  'formula-material-panel', 'formula-material-form-panel',
  'formula-compliance-panel', 'formula-adverse-panel',
  'formula-label-panel', 'formula-adlint-panel',
  'formula-product-panel', 'formula-product-form-panel', 'formula-product-detail-panel',
];

// 계산기 드래프트 상태 (저장 전 작업 데이터)
/** @type {{rows: {name:string, concentration:number|null, phase?:string}[], steps: string[], editingId: string|null, stabRecordedAt: string|null}} */
export const calc = {
  rows: [{ name: '', concentration: null, phase: '' }],
  steps: [],
  editingId: null,   // null이면 신규, id면 기존 포뮬러 수정
  stabRecordedAt: null, // 안정성 확인 기록의 저장 시각(자동 부여)
};

/** id로 폼 요소 조회 — formula 뷰의 입력류(input/select/textarea) 전용 */
export const getEl = id => /** @type {HTMLInputElement} */ (document.getElementById(id));

let ingredientIndex = null;

export function getIndex() {
  if (!ingredientIndex) {
    ingredientIndex = buildIngredientIndex(DataLoader.getKnowledgeItems());
    // 자가 등록 성분 병합 (DI-08) — 공식 동명(정규화) 커스텀은 _superseded로 건너뜀
    for (const c of annotateCustomItems(ingredientIndex)) {
      if (c.name && !c._superseded) ingredientIndex.set(c.name, c);
    }
  }
  return ingredientIndex;
}

/** 자가 등록 성분 변경 시 인덱스 재구축 (DI-09) — 배지·검증 즉시 반영 */
export function invalidateIngredientIndex() {
  ingredientIndex = null;
  // 기성품 DB 등 인덱스 소비자가 갱신하도록 알림 — 직접 import 없이 DOM 이벤트로 결합도 제거
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('formula:ingredients-changed'));
  }
}

export function showPanel(id) {
  PANELS.forEach(p => {
    const el = getEl(p);
    if (el) el.classList.toggle('is-hidden', p !== id);
  });
  // 서브패널은 별개 화면 — 이전 패널의 스크롤이 유지되면 모바일에서
  // 폼 상단(헤더·사진 인입 버튼 등)이 뷰포트 위로 잘려 보이지 않는다
  resetMainScroll();
}

const SUBNAV_ITEMS = [
  { id: 'customer', label: '고객 관리', click: 'openCustomerPanel' },
  { id: 'calc', label: '배합 계산기', click: 'formulaNew' },
  { id: 'list', label: 'My 포뮬러', click: 'openFormulaList' },
  { id: 'batch', label: '조제 기록', labels: { mfg: '제조 기록' }, click: 'openBatchPanel' },
  { id: 'material', label: '원료 장부', click: 'openMaterialPanel' },
  { id: 'label', label: '표시사항', click: 'openLabelPanel' },
  { id: 'adlint', label: '광고 점검', click: 'openAdLintPanel' },
  { id: 'products', label: '기성품 분석', click: 'openProductPanel' },
  { id: 'adverse', label: '이상사례', click: 'openAdversePanel' },
  { id: 'compliance', label: '법규 준수', click: 'openCompliancePanel' },
];

/**
 * 서브내비 칩 HTML — 서브패널 헤더에 삽입.
 * 사업 유형 프로파일로 항목을 게이트한다 (FO-33) — BIZ_PANELS 미선언 id는 모든 유형 공용.
 * @param {string} active - 현재 패널의 SUBNAV_ITEMS.id (활성 칩 표시)
 */
export function formulaSubNav(active) {
  const biz = getBizType();
  const items = SUBNAV_ITEMS.filter(item => bizVisible(item.id, biz));
  return `<div class="formula-subnav" role="navigation" aria-label="Formula OS 섹션 이동">${items.map(item => {
    const cls = item.id === active ? 'formula-subnav-chip is-active' : 'formula-subnav-chip';
    return `<button type="button" class="${cls}" data-click="${item.click}">${esc((item.labels && item.labels[biz]) || item.label)}</button>`;
  }).join('')}</div>`;
}

export function readCalcInputs() {
  const volEl = getEl('formula-target-volume');
  const unitEl = getEl('formula-unit');
  const phTEl = getEl('formula-ph-target');
  const phAEl = getEl('formula-ph-actual');
  const num = el => (el && el.value !== '' ? parseFloat(el.value) : null);
  return {
    targetVolume: num(volEl),
    unit: unitEl ? unitEl.value : 'g',
    phTarget: num(phTEl),
    phActual: num(phAEl),
  };
}
