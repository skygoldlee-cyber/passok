// src/exams/carework/care-log-store.js — 요양일지 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_care_logs` (safeGetItem/safeSetItem → 시험 네임스페이스)
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
import { getJSON, setJSON } from '../../storage.js';
import { localDateTime } from '../../utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';

const KEY = 'carework_care_logs';
export const FREE_LIMIT = 10;

export function listCareLogs() {
    const parsed = getJSON(KEY);
    return Array.isArray(parsed) ? parsed : [];
}

/**
 * @param {{client:string, service:string, date:string, start:string, end:string, activities:Object, note:string, text:string}} entry
 * @returns {{ok:boolean, error?:string, id?:string}}
 */
export function addCareLog(entry) {
    const items = listCareLogs();
    if (items.length >= FREE_LIMIT)
        return { ok: false, error: `Free 플랜 저장 한도(${FREE_LIMIT}건) 도달 — 삭제 후 재시도하거나 Pro로 확장하세요.` };
    const it = { id: `log_${Date.now().toString(36)}`, createdAt: localDateTime(), ...entry };
    items.unshift(it);
    setJSON(KEY, items);
    return { ok: true, id: it.id };
}

export function removeCareLog(id) {
    setJSON(KEY, listCareLogs().filter(x => x.id !== id));
    return { ok: true };
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 (ROAD-P5) */
export function saveCareLog(entry) {
    proFeatureNotice('care_log_save', '요양일지 저장');
    const r = addCareLog(entry);
    if (!r.ok) showStoreError(r, '요양일지', showToast);
    return r;
}
