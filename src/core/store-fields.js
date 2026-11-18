// src/core/store-fields.js — localStorage 엔티티 스토어 공통 부품 (시험 무관)
// @spec FO-16~18 — cosmetic store-utils.js 범용부를 승격 (시험 팩 간 중복 차단)
//
// 시험별 *-store.js 모듈이 공유하는 저장·식별·정제 부품. 모든 키는
// safeGetItem/safeSetItem 경유로 시험별 네임스페이스(scopedKey)가 자동 적용된다.
// 도메인 필드 정제(예: sanitizeCustomerFields)는 각 시험 모듈에 둔다.

import { getJSON, setJSON, getJSONAsync, setJSONAsync } from './storage.js';

/** 키의 배열 항목 전체 로드 — 파싱 실패·비배열은 빈 배열 */
/** @param {string} key @returns {*[]} */
export function loadItems(key) {
    const parsed = getJSON(key);
    return Array.isArray(parsed) ? parsed : [];
}

/** 배열 항목 전체 저장 — 실패 시 false */
/** @param {string} key @param {*[]} items */
export function saveItems(key, items) {
    return setJSON(key, items);
}

/** loadItems의 비동기 판 — 백엔드 교체(IndexedDB 등) 후에도 동작. 신규 코드 권장. keep-export: 비동기 저장소 이행용 공개 API */
/** @param {string} key @returns {Promise<*[]>} */
export async function loadItemsAsync(key) {
    const parsed = await getJSONAsync(key);
    return Array.isArray(parsed) ? parsed : [];
}

/** saveItems의 비동기 판 — 백엔드 교체(IndexedDB 등) 후에도 동작. 신규 코드 권장. keep-export: 비동기 저장소 이행용 공개 API */
/** @param {string} key @param {*[]} items */
export async function saveItemsAsync(key, items) {
    return setJSONAsync(key, items);
}

/** 고유 ID 생성: <prefix>_<base36시간><난수> */
/** @param {string} prefix */
export function newId(prefix) {
    const rand = Math.random().toString(36).slice(2, 6);
    return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** 문자열을 최대 길이로 절단 (비문자열 → '') */
/** @param {*} s @param {number} max */
export function clampStr(s, max) {
    return typeof s === 'string' ? s.slice(0, max) : '';
}

/** 숫자 변환 — 변환 불가 시 null */
/** @param {*} v */
export function numOrNull(v) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && !Number.isNaN(n) ? n : null;
}

/** 열거형 선택 — 허용 목록에 없으면 '' */
/** @param {*} value @param {readonly string[]} allowed */
export function pickEnum(value, allowed) {
    return typeof value === 'string' && allowed.includes(value) ? value : '';
}

/** 문자열 배열 정제 — 비문자열 제거·trim·개수/길이 상한 */
/** @param {*} list @param {number} maxItems @param {number} maxLen */
export function sanitizeStringList(list, maxItems, maxLen) {
    if (!Array.isArray(list)) return [];
    return list
        .map((/** @type {*} */ v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .slice(0, maxItems)
        .map((/** @type {string} */ v) => v.slice(0, maxLen));
}

/** 'YYYY-MM-DD' 형식만 통과 (아니면 '') */
/** @param {*} s */
export function clampDate(s) {
    const v = clampStr(s, 10).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

/** 'YYYY-MM-DDTHH:MM' 형식만 통과 (아니면 '') */
/** @param {*} s */
export function clampDateTime(s) {
    const v = clampStr(s, 19).trim();
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v) ? v : '';
}
