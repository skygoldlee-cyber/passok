// src/exams/carework/incident-store.js — 사고 보고 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_incidents` — 사고 기록은 법적 증적이라 삭제 외 수정 없음
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime } from '../../core/utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { listClients } from './care-client-store.js';
import { backfillClientIds } from './care-client-resolve.js';

const KEY = STORAGE_KEYS.INCIDENT_ITEMS;
export const FREE_LIMIT = 10;

export function listIncidents() {
    const parsed = getJSON(KEY);
    const items = Array.isArray(parsed) ? parsed : [];
    if (backfillClientIds(items, listClients())) setJSON(KEY, items); // CO-01 지연 백필 — 배치 1회 쓰기
    return items;
}

/**
 * @param {{date:string,time?:string,client:string,place?:string,type:string,severity?:string,desc?:string,action?:string,witness?:string,familyNotified?:boolean,text:string}} entry
 * @returns {{ok:boolean, error?:string, id?:string}}
 */
export function addIncident(entry) {
    const items = listIncidents();
    if (items.length >= FREE_LIMIT)
        return { ok: false, error: `Free 플랜 저장 한도(${FREE_LIMIT}건) 도달 — 삭제 후 재시도하거나 Pro로 확장하세요.` };
    const it = { id: `inc_${Date.now().toString(36)}`, createdAt: localDateTime(), ...entry };
    items.unshift(it);
    setJSON(KEY, items);
    return { ok: true, id: it.id };
}

export function removeIncident(id) {
    setJSON(KEY, listIncidents().filter(x => x.id !== id));
    return { ok: true };
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export function saveIncident(entry) {
    proFeatureNotice('care_incident_save', '사고보고 저장');
    const r = addIncident(entry);
    if (!r.ok) showStoreError(r, '사고보고', showToast);
    return r;
}
