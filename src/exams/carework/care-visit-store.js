// src/exams/carework/care-visit-store.js — 면회·방문 기록 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_visits` (safeGetItem/safeSetItem → 시험 네임스페이스)
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
import { getJSON, setJSON } from '../../storage.js';
import { STORAGE_KEYS } from '../../storage-keys.js';
import { localDateTime } from '../../utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';

const KEY = STORAGE_KEYS.CARE_VISIT_ITEMS;
export const FREE_LIMIT = 10;

export function listVisits() {
    const parsed = getJSON(KEY);
    return Array.isArray(parsed) ? parsed : [];
}

/**
 * @param {{date:string,time?:string,client:string,visitor:string,phone?:string,relation?:string,purpose?:string}} entry
 * @returns {{ok:boolean, error?:string, id?:string}}
 */
export function addVisit(entry) {
    const items = listVisits();
    if (items.length >= FREE_LIMIT)
        return { ok: false, error: `Free 플랜 저장 한도(${FREE_LIMIT}건) 도달 — 삭제 후 재시도하거나 Pro로 확장하세요.` };
    const it = { id: `vis_${Date.now().toString(36)}`, createdAt: localDateTime(), status: 'scheduled', result: null, ...entry };
    items.unshift(it);
    setJSON(KEY, items);
    return { ok: true, id: it.id };
}

/** 상태 전이·결과 기록 — {status:'done'|'canceled', result} 패치 */
export function updateVisit(id, patch) {
    setJSON(KEY, listVisits().map(x => (x.id === id ? { ...x, ...patch } : x)));
    return { ok: true };
}

export function removeVisit(id) {
    setJSON(KEY, listVisits().filter(x => x.id !== id));
    return { ok: true };
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 (ROAD-P5) */
export function saveVisit(entry) {
    proFeatureNotice('care_visit_save', '방문예약 저장');
    const r = addVisit(entry);
    if (!r.ok) showStoreError(r, '방문기록', showToast);
    return r;
}
