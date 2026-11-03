// src/exams/carework/roster-store.js — 교대 근무표 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_roster` — 근무 배정 {id,date,shift,worker,note}
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime } from '../../core/utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';

const KEY = STORAGE_KEYS.ROSTER_ITEMS;
export const FREE_LIMIT = 30;

export function listRoster() {
    const parsed = getJSON(KEY);
    return Array.isArray(parsed) ? parsed : [];
}

/**
 * @param {{date:string,shift:string,worker:string,note?:string}} entry
 * @returns {{ok:boolean, error?:string, id?:string}}
 */
export function addRoster(entry) {
    const items = listRoster();
    if (items.length >= FREE_LIMIT)
        return { ok: false, error: `Free 플랜 저장 한도(${FREE_LIMIT}건) 도달 — 삭제 후 재시도하거나 Pro로 확장하세요.` };
    const it = { id: `ros_${Date.now().toString(36)}`, createdAt: localDateTime(), ...entry };
    items.unshift(it);
    setJSON(KEY, items);
    return { ok: true, id: it.id };
}

export function removeRoster(id) {
    setJSON(KEY, listRoster().filter(x => x.id !== id));
    return { ok: true };
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export function saveRoster(entry) {
    proFeatureNotice('care_roster_save', '근무 배정 저장');
    const r = addRoster(entry);
    if (!r.ok) showStoreError(r, '근무표', showToast);
    return r;
}
