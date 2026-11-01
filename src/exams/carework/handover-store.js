// src/exams/carework/handover-store.js — 인수인계 로컬 기록 저장
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 공유 이전 기록 저장 의무 플로우 — STORAGE_KEYS.HANDOVER_ITEMS 동기화 대상
import { getJSON, setJSON } from '../../storage.js';
import { STORAGE_KEYS } from '../../storage-keys.js';
import { localDateTime } from '../../utils.js';

const KEY = STORAGE_KEYS.HANDOVER_ITEMS;
export const FREE_LIMIT = 10;

export function listHandovers() {
    const v = getJSON(KEY);
    return Array.isArray(v) ? v : [];
}
export function saveHandover(text, meta = {}) {
    const items = listHandovers();
    if (items.length >= FREE_LIMIT)
        return { error: `Free 플랜 저장 한도 ${FREE_LIMIT}건 — 기존 기록을 삭제하세요` };
    const item = { id: `ho-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, savedAt: localDateTime(), text, ...meta };
    items.unshift(item);
    setJSON(KEY, items);
    return { item };
}
export function deleteHandover(id) {
    setJSON(KEY, listHandovers().filter(x => x.id !== id));
}
