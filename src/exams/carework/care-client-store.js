// src/exams/carework/care-client-store.js — 수급자 명부 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_clients` — 방문기록·인수인계·일지의 대상자 입력 소스
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime, todayKey } from '../../core/utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { myMembership, pushState, listRecords } from './facility.js';

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
        const next = items.map(x => (x.id === id ? { ...x, ...entry } : x));
        setJSON(KEY, next);
        const it = next.find(x => x.id === id);
        if (it) void _pushClient(it).catch(() => {});
        return { ok: true, id };
    }
    if (items.length >= FREE_LIMIT)
        return { ok: false, error: `무료 플랜 저장 한도(${FREE_LIMIT}건) 도달 — 삭제 후 재시도하거나 유료로 확장하세요.` };
    const it = { id: `cli_${Date.now().toString(36)}`, createdAt: localDateTime(), ...entry };
    items.unshift(it);
    setJSON(KEY, items);
    void _pushClient(it).catch(() => {}); // CO-15 write-through
    return { ok: true, id: it.id };
}

// — CO-11/14/15: 기관 명부 공유 — 서버에는 name+room만 (나머지 필드는 멤버 로컬) —

async function _pushClient(item) {
    const r = await pushState({
        docType: 'client', client: item.name || '', recordDate: todayKey(),
        payload: { name: item.name, room: item.room || '' },   // CO-11 최소 필드 — 생년월일·병력·연락처는 L0 유지
        localId: item.id,
    });
    if (r.skipped || 'error' in r) return;
    const items = listClients();
    const it = items.find(x => x.id === item.id);
    if (it && it._sync !== 'done') { it._sync = 'done'; setJSON(KEY, items); }
}

/** 시설 명부 양방향 머지 — 로컬 미동기분 upsert + 서버 명단 중 로컬에 없는 성명만 추가 (CO-11 멤버 로컬 머지)
 * 서버에서 가져온 항목은 _sync='done'으로 표기해 재업로드 에코를 차단. 뷰 init 시 fire-and-forget 호출. */
export async function syncFacilityClients() {
    for (const it of listClients()) {
        if (it._sync === 'done') continue;
        try { await _pushClient(it); } catch { /* 다음 기회에 */ }
    }
    const m = await myMembership().catch(() => null);
    if (!m) return;
    const recs = await listRecords(m.facility_id, { docType: 'client', limit: 200 }).catch(() => []);
    if (!recs.length) return;
    const have = new Set(listClients().map(x => x.name));
    for (const r of recs) {
        const name = r.payload?.name || r.client;
        if (!name || have.has(name)) continue;
        const it = { id: `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, createdAt: localDateTime(), name, room: r.payload?.room || '', _sync: 'done' };
        const items = listClients();
        if (items.length >= FREE_LIMIT) break;
        items.unshift(it);
        setJSON(KEY, items);
        have.add(name);
    }
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
