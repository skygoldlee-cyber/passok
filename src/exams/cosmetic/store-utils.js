// src/exams/cosmetic/store-utils.js — localStorage 엔티티 스토어 공통 헬퍼 (Formula OS)
// @spec FO-16~18
//
// 범용 부품(loadItems/saveItems/newId/clamp*·pickEnum·numOrNull·sanitizeStringList)은
// core/store-fields.js로 승격 — 여기서는 re-export로 기존 임포트 호환만 유지한다.
// 모든 키는 safeGetItem/safeSetItem 경유로 시험별 네임스페이스(scopedKey)가 자동 적용된다.

// 범용 부품 re-export (정본: src/core/store-fields.js)
export {
  loadItems, saveItems, loadItemsAsync, saveItemsAsync,
  newId, clampStr, numOrNull, pickEnum, sanitizeStringList,
  clampDate, clampDateTime,
} from '../../core/store-fields.js';
import { sanitizeStringList, clampStr, numOrNull, pickEnum } from '../../core/store-fields.js';

// 시각 표준은 범용 utils.js에 위임 — 도메인 호출처는 이 re-export로 유지
export { localDateTime, localDateTimeNow, fmtLocalDateTime } from '../../core/utils.js';

// 고객 공통 필드 상한 — customer 정본·포뮬러 인라인 스냅샷 공유
const MAX_CUSTOMER_NAME_LEN = 30;
const MAX_ALLERGIES = 15;
const MAX_ALLERGY_LEN = 60;
const MAX_PRODUCTS_LEN = 300;

/**
 * 고객 공통 필드 정제 — name·age·gender·skinType·concerns·allergies·pregnancy·products.
 * customer-store(정본 카드)와 formula-store(인라인 스냅샷)가 공유한다.
 * options는 CUSTOMER_OPTIONS(formula-store 정본) — 순환 import 회피를 위해 인자로 받는다.
 * 스토어 전용 필드(scalpType·purpose·consultLog·formulation)는 호출처가 추가한다.
 */
/** @param {*} data @param {{gender:string[], skinType:string[], concerns:string[], pregnancy:string[]}} options */
export function sanitizeCustomerFields(data, options) {
  return {
    name: clampStr(data.name || '', MAX_CUSTOMER_NAME_LEN).trim(),
    age: numOrNull(data.age),
    gender: pickEnum(data.gender, options.gender),
    skinType: pickEnum(data.skinType, options.skinType),
    concerns: sanitizeStringList(data.concerns, options.concerns.length, 30)
      .filter((/** @type {string} */ v) => options.concerns.includes(v)),
    allergies: sanitizeStringList(data.allergies, MAX_ALLERGIES, MAX_ALLERGY_LEN),
    pregnancy: pickEnum(data.pregnancy, options.pregnancy),
    products: clampStr(data.products || '', MAX_PRODUCTS_LEN).trim(),
  };
}

// (localDateTime·localDateTimeNow·fmtLocalDateTime는 상단의 utils.js re-export 참조)
