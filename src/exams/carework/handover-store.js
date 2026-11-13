// src/exams/carework/handover-store.js — 인수인계 로컬 기록 저장
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 공유 이전 기록 저장 의무 플로우 — STORAGE_KEYS.HANDOVER_ITEMS 동기화 대상
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { createEntityStore } from '../../core/entity-store.js';
import { toCsv } from '../../content/csv-utils.js';
import { listClients } from './care-client-store.js';
import { backfillClientIds } from './care-client-resolve.js';

export const FREE_LIMIT = 10;

const _store = createEntityStore({
    key: STORAGE_KEYS.HANDOVER_ITEMS,
    idPrefix: 'ho',
    freeLimit: FREE_LIMIT,
    stampField: 'savedAt',
    newId: () => `ho-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    limitText: `무료 플랜 저장 한도 ${FREE_LIMIT}건 — 기존 기록을 삭제하세요`,
    onList: (items) => backfillClientIds(items, listClients()), // CO-01 지연 백필 — 배치 1회 쓰기
});

export const listHandovers = _store.list;
/**
 * @param {string} text @param {*} [meta]
 * @returns {{ok:boolean, error?:string, id?:string, item?:*}} — 호출부는 r.error·r.item 사용
 */
export function saveHandover(text, meta = {}) {
    return _store.add({ text, ...meta });
}
export const deleteHandover = _store.remove;

/** 인수인계 기록 → CSV (Excel 내보내기 공용 — 본문 개행·쉼표는 toCsv 인용) */
/** @param {*[]} items */
export function handoversToCsv(items) {
    return toCsv(['저장일시', '근무일자', '인계자', '인수자', '본문'], items, (/** @type {*} */ h) => [
        h.savedAt || '', h.date || '', h.from || '', h.to || '', h.text || '',
    ]);
}
