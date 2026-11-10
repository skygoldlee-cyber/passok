// src/exams/carework/handover-store.js — 인수인계 로컬 기록 저장
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 공유 이전 기록 저장 의무 플로우 — STORAGE_KEYS.HANDOVER_ITEMS 동기화 대상
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime } from '../../core/utils.js';
import { toCsv } from '../../content/csv-utils.js';
import { listClients } from './care-client-store.js';
import { backfillClientIds } from './care-client-resolve.js';

const KEY = STORAGE_KEYS.HANDOVER_ITEMS;
export const FREE_LIMIT = 10;

export function listHandovers() {
    const v = getJSON(KEY);
    const items = Array.isArray(v) ? v : [];
    if (backfillClientIds(items, listClients())) setJSON(KEY, items); // CO-01 지연 백필 — 배치 1회 쓰기
    return items;
}
export function saveHandover(text, meta = {}) {
    const items = listHandovers();
    if (items.length >= FREE_LIMIT)
        return { error: `무료 플랜 저장 한도 ${FREE_LIMIT}건 — 기존 기록을 삭제하세요` };
    const item = { id: `ho-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, savedAt: localDateTime(), text, ...meta };
    items.unshift(item);
    setJSON(KEY, items);
    return { item };
}
export function deleteHandover(id) {
    setJSON(KEY, listHandovers().filter(x => x.id !== id));
}
/** 인수인계 기록 → CSV (Excel 내보내기 공용 — 본문 개행·쉼표는 toCsv 인용) */
export function handoversToCsv(items) {
    return toCsv(['저장일시', '근무일자', '인계자', '인수자', '본문'], items, h => [
        h.savedAt || '', h.date || '', h.from || '', h.to || '', h.text || '',
    ]);
}
