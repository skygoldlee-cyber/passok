// src/exams/cosmetic/views/formula.js — Formula OS 뷰 컨트롤러 (Phase 5-A)
// @spec FO-01~11,FO-15,FO-27,FO-28,FO-29,FO-30,FO-31,FO-32,FO-62,DI-06,DI-08,DI-09
//
// 허브(메뉴) + My 포뮬러 목록 + 배합 계산기 서브뷰.
// 트레이너와 동일한 패턴: 하나의 view-section 안에서 패널을 is-hidden으로 전환.
//
// 안전 원칙: 배합량을 "제안"하지 않고 사용자가 입력한 값을 고시 데이터로
// "검증"만 한다. 검증 결과는 법정 한도 기준이며 제품 안전성·안정성·품질 보장이 아니다.
//
// 구현은 역할별 모듈로 분리되어 있고 이 파일은 공용 진입점 파사드다 —
// app.js data-click 디스패치·서브모듈·테스트의 named import 호환을 위해 재수출한다.
//   formula-core.js      공용 상태(calc)·패널 전환·서브내비·성분 인덱스
//   formula-hub.js       허브 초기화·사업 유형 프로파일·점검/백업 리마인더·고대비
//   formula-list.js      My 포뮬러 목록·열기/복제/삭제
//   formula-calc.js      배합 계산기 행 렌더·검증·드래프트 자동 저장·저장
//   formula-weigh.js     계량 모드 오버레이
//   formula-ing-modal.js 자가 등록 성분 모달·CRUD
//   formula-io.js        조제 기록지·작업지시서 인쇄·JSON 보내기/가져오기

// 추천·맞춤 규칙 액션은 formula-recommend.js 구현 — app.js 디스패치 호환을 위해 재수출
export {
  formulaRecAdd, formulaRecAddBase, formulaLoadBase,
  formulaRuleAdd, formulaRuleRemove, formulaRuleReset,
  formulaRuleExport, formulaRuleImport,
} from './formula-recommend.js';
// 고객·안정성 필드 블록은 formula-fields.js 구현 — app.js 디스패치·formula-recommend.js 호환을 위해 재수출
export {
  formulaCustLoad, formulaCustSaveAs, readCustomerInputs,
  formulaAllergyAdd, formulaAllergyRemove, updateFoldSummaries,
} from './formula-fields.js';

// 공용 상태·헬퍼 — 서브모듈 전부가 여기서 가져간다
export {
  calc, getEl, getIndex, invalidateIngredientIndex,
  showPanel, formulaSubNav, readCalcInputs,
} from './formula-core.js';

export {
  initFormulaView, exitFormulaSubView, openIngredientDict,
  formulaSetBizType, formulaToggleContrast,
} from './formula-hub.js';

export {
  openFormulaList, formulaNew, formulaOpen, formulaDuplicate, formulaDelete,
} from './formula-list.js';

export {
  renderStability, renderCalcRows, formulaSortPhase, openFormulaCalc,
  formulaCalcAddRow, formulaCalcRemoveRow, formulaAddIngredient,
  formulaStepAdd, formulaStepRemove, formulaCalcSave,
} from './formula-calc.js';

export {
  formulaWeighOpen, formulaWeighNext, formulaWeighPrev, formulaWeighClose,
} from './formula-weigh.js';

export {
  customIngAdd, customIngEdit, customIngSave, customIngDelete, customIngClose,
} from './formula-ing-modal.js';

export {
  formulaPrint, formulaPrintWorkOrder,
  formulaExportJson, formulaCardExport, formulaImportJson,
} from './formula-io.js';
