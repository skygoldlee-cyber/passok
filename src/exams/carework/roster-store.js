// src/exams/carework/roster-store.js — 교대 근무표 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_roster` — 근무 배정 {id,date,shift,worker,note}
import { setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime, todayKey } from '../../core/utils.js';
import { createEntityStore } from '../../core/entity-store.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { pushState } from './facility.js';

const KEY = STORAGE_KEYS.ROSTER_ITEMS;
export const FREE_LIMIT = 30;

const _store = createEntityStore({
    key: KEY,
    idPrefix: 'ros',
    freeLimit: FREE_LIMIT,
    afterAdd: _pushRoster, // CO-15 write-through
    beforeSave: () => proFeatureNotice('care_roster_save', '근무 배정 저장'),
    onError: (r) => showStoreError(r, '근무표', showToast),
});

export const listRoster = _store.list;
export const addRoster = _store.add;
export const removeRoster = _store.remove;
export const saveRoster = _store.save;

// — CO-14/15: 기관 서버 write-through (상태형 — local_id upsert로 최신 배정 공유) —

/** @param {*} item */
async function _pushRoster(item) {
    const r = await pushState({
        docType: 'roster', client: '', recordDate: item.date || todayKey(),
        payload: { date: item.date, shift: item.shift, worker: item.worker, note: item.note || '' },
        localId: item.id,
    });
    if (r.skipped || 'error' in r) return;
    const items = listRoster();
    const it = items.find(x => x.id === item.id);
    if (it && it._sync !== 'done') { it._sync = 'done'; setJSON(KEY, items); }
}

/** 미동기 배정 재전송 — 뷰 init 시 fire-and-forget 호출 */
export async function syncPendingRoster() {
    for (const it of listRoster()) {
        if (it._sync === 'done') continue;
        try { await _pushRoster(it); } catch { /* 다음 기회에 */ }
    }
}

/** CSV 병합 — 날짜+근무조+근무자 일치 시 메모 갱신, 없으면 신규 등록. 한도 초과분 제외
 * @returns {{ok:boolean, added:number, updated:number, skipped:number}} */
/** @param {*[]} records */
export function upsertRoster(records) {
    const items = listRoster();
    let added = 0, updated = 0, skipped = 0;
    for (const rec of records) {
        const hit = items.find(x => x.date === rec.date && x.shift === rec.shift && x.worker === rec.worker);
        if (hit) {
            const idx = items.indexOf(hit);
            items[idx] = { ...hit, ...rec };
            updated++;
        } else if (items.length >= FREE_LIMIT) {
            skipped++;
        } else {
            items.push({ id: `ros_${Date.now().toString(36)}_${added}`, createdAt: localDateTime(), ...rec });
            added++;
        }
    }
    setJSON(KEY, items);
    return { ok: true, added, updated, skipped };
}
