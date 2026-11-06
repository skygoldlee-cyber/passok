// src/exams/carework/roster-store.js — 교대 근무표 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_roster` — 근무 배정 {id,date,shift,worker,note}
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime, todayKey } from '../../core/utils.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { pushState } from './facility.js';

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
    void _pushRoster(it).catch(() => {}); // CO-15 write-through
    return { ok: true, id: it.id };
}

// — CO-14/15: 기관 서버 write-through (상태형 — local_id upsert로 최신 배정 공유) —

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

export function removeRoster(id) {
    setJSON(KEY, listRoster().filter(x => x.id !== id));
    return { ok: true };
}

/** CSV 병합 — 날짜+근무조+근무자 일치 시 메모 갱신, 없으면 신규 등록. 한도 초과분 제외
 * @returns {{ok:boolean, added:number, updated:number, skipped:number}} */
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

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export function saveRoster(entry) {
    proFeatureNotice('care_roster_save', '근무 배정 저장');
    const r = addRoster(entry);
    if (!r.ok) showStoreError(r, '근무표', showToast);
    return r;
}
