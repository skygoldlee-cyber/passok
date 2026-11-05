// src/exams/carework/care-client-store.js — 수급자 명부 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_clients` — 방문기록·인수인계·일지의 대상자 입력 소스
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime } from '../../core/utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';

const KEY = STORAGE_KEYS.CARE_CLIENT_ITEMS;
export const FREE_LIMIT = 10;

export function listClients() {
    const parsed = getJSON(KEY);
    return Array.isArray(parsed) ? parsed : [];
}

/**
 * @param {{name:string,room?:string,birth?:string,allergy?:string,caution?:string,phone?:string,memo?:string}} entry
 * @param {string} [id] - 있으면 해당 항목 갱신 (수정 플로우)
 * @returns {{ok:boolean, error?:string, id?:string}}
 */
export function saveClient(entry, id) {
    const items = listClients();
    if (id) {
        setJSON(KEY, items.map(x => (x.id === id ? { ...x, ...entry } : x)));
        return { ok: true, id };
    }
    if (items.length >= FREE_LIMIT)
        return { ok: false, error: `Free 플랜 저장 한도(${FREE_LIMIT}건) 도달 — 삭제 후 재시도하거나 Pro로 확장하세요.` };
    const it = { id: `cli_${Date.now().toString(36)}`, createdAt: localDateTime(), ...entry };
    items.unshift(it);
    setJSON(KEY, items);
    return { ok: true, id: it.id };
}

export function removeClient(id) {
    setJSON(KEY, listClients().filter(x => x.id !== id));
    return { ok: true };
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export function addClient(entry, id) {
    proFeatureNotice('care_client_save', '대상자 등록');
    const r = saveClient(entry, id);
    if (!r.ok) showStoreError(r, '대상자', showToast);
    return r;
}

/** CSV 병합 — 성명 일치 시 갱신(서류·필드 병합), 없으면 신규 등록.
 * @returns {{ok:boolean, added:number, updated:number, skipped:number}} */
export function upsertClients(records) {
    const items = listClients();
    let added = 0, updated = 0, skipped = 0;
    for (const rec of records) {
        const hit = items.find(x => x.name === rec.name);
        if (hit) {
            const idx = items.indexOf(hit);
            items[idx] = { ...hit, ...rec, docs: { ...(hit.docs || {}), ...(rec.docs || {}) } };
            updated++;
        } else if (items.length >= FREE_LIMIT) {
            skipped++;
        } else {
            items.push({ id: `cli_${Date.now().toString(36)}_${added}`, createdAt: localDateTime(), ...rec });
            added++;
        }
    }
    setJSON(KEY, items);
    return { ok: true, added, updated, skipped };
}
