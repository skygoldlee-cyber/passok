// src/exams/cosmetic/store-utils.js — localStorage 엔티티 스토어 공통 헬퍼 (Formula OS)
// @spec FO-16~18
//
// formula-store·batch-store·customer-store·material-ledger가 공유하는
// 저장·식별·정제 부품. 모든 키는 safeGetItem/safeSetItem 경유로
// 시험별 네임스페이스(scopedKey)가 자동 적용된다.

import { getJSON, setJSON, getJSONAsync, setJSONAsync } from '../../storage.js';

// 시각 표준은 범용 utils.js에 위임 — 도메인 호출처는 이 re-export로 유지
export { localDateTime, localDateTimeNow, fmtLocalDateTime } from '../../utils.js';

/** 키의 배열 항목 전체 로드 — 파싱 실패·비배열은 빈 배열 */
export function loadItems(key) {
  const parsed = getJSON(key);
  return Array.isArray(parsed) ? parsed : [];
}

/** 배열 항목 전체 저장 — 실패 시 false */
export function saveItems(key, items) {
  return setJSON(key, items);
}

/** loadItems의 비동기 판 — 백엔드 교체(IndexedDB 등) 후에도 동작. 신규 코드 권장. keep-export: 비동기 저장소 이행용 공개 API */
export async function loadItemsAsync(key) {
  const parsed = await getJSONAsync(key);
  return Array.isArray(parsed) ? parsed : [];
}

/** saveItems의 비동기 판 — 백엔드 교체(IndexedDB 등) 후에도 동작. 신규 코드 권장. keep-export: 비동기 저장소 이행용 공개 API */
export async function saveItemsAsync(key, items) {
  return setJSONAsync(key, items);
}

/** 고유 ID 생성: <prefix>_<base36시간><난수> */
export function newId(prefix) {
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** 문자열을 최대 길이로 절단 (비문자열 → '') */
export function clampStr(s, max) {
  return typeof s === 'string' ? s.slice(0, max) : '';
}

/** 숫자 변환 — 변환 불가 시 null */
export function numOrNull(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && !Number.isNaN(n) ? n : null;
}

/** 열거형 선택 — 허용 목록에 없으면 '' */
export function pickEnum(value, allowed) {
  return typeof value === 'string' && allowed.includes(value) ? value : '';
}

/** 문자열 배열 정제 — 비문자열 제거·trim·개수/길이 상한 (내부 헬퍼) */
function sanitizeStringList(list, maxItems, maxLen) {
  if (!Array.isArray(list)) return [];
  return list
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, maxItems)
    .map(v => v.slice(0, maxLen));
}

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
export function sanitizeCustomerFields(data, options) {
  return {
    name: clampStr(data.name || '', MAX_CUSTOMER_NAME_LEN).trim(),
    age: numOrNull(data.age),
    gender: pickEnum(data.gender, options.gender),
    skinType: pickEnum(data.skinType, options.skinType),
    concerns: sanitizeStringList(data.concerns, options.concerns.length, 30)
      .filter(v => options.concerns.includes(v)),
    allergies: sanitizeStringList(data.allergies, MAX_ALLERGIES, MAX_ALLERGY_LEN),
    pregnancy: pickEnum(data.pregnancy, options.pregnancy),
    products: clampStr(data.products || '', MAX_PRODUCTS_LEN).trim(),
  };
}

/** 'YYYY-MM-DD' 형식만 통과 (아니면 '') */
export function clampDate(s) {
  const v = clampStr(s, 10).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

/** 'YYYY-MM-DDTHH:MM' 형식만 통과 (아니면 '') */
export function clampDateTime(s) {
  const v = clampStr(s, 19).trim();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v) ? v : '';
}

// (localDateTime·localDateTimeNow·fmtLocalDateTime는 상단의 utils.js re-export 참조)
