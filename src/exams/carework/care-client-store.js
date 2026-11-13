// src/exams/carework/care-client-store.js — 수급자 명부 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_clients` — 방문기록·인수인계·일지의 대상자 입력 소스
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
// ※ 명칭 계약: saveClient=원시 저장, addClient=Pro 안내 래퍼 (공개 계약 유지 — 호출부 그대로)
import { setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime, todayKey } from '../../core/utils.js';
import { createEntityStore } from '../../core/entity-store.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { myMembership, pushState, listRecords } from './facility.js';

const KEY = STORAGE_KEYS.CARE_CLIENT_ITEMS;
export const FREE_LIMIT = 10;

const _store = createEntityStore({
    key: KEY,
    idPrefix: 'cli',
    freeLimit: FREE_LIMIT,
    afterAdd: _pushClient, // CO-15 write-through — 로컬 저장은 즉시 확정, 서버는 비동기
    beforeSave: () => proFeatureNotice('care_client_save', '대상자 등록'),
    onError: (r) => showStoreError(r, '대상자', showToast),
});

export const listClients = _store.list;
/**
 * 원시 저장 — id 있으면 해당 항목 갱신 (수정 플로우)
 * @param {{name:string,room?:string,birth?:string,allergy?:string,caution?:string,phone?:string,memo?:string}} entry
 * @param {string} [id]
 */
export const saveClient = _store.add;
/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export const addClient = _store.save;
export const removeClient = _store.remove;

// — CO-11/14/15: 기관 명부 공유 — 서버에는 name+room만 (나머지 필드는 멤버 로컬) —

/** @param {*} item */
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

/** CSV 병합 — 성명 일치 시 갱신(서류·필드 병합), 없으면 신규 등록.
 * @returns {{ok:boolean, added:number, updated:number, skipped:number}} */
/** @param {*[]} records */
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
