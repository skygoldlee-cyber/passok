// src/exams/carework/care-log-store.js — 요양일지 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_care_logs` (safeGetItem/safeSetItem → 시험 네임스페이스)
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
import { setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { todayKey } from '../../core/utils.js';
import { createEntityStore } from '../../core/entity-store.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { listClients } from './care-client-store.js';
import { backfillClientIds } from './care-client-resolve.js';
import { myMembership, submitRecord } from './facility.js';

const KEY = STORAGE_KEYS.CARE_LOG_ITEMS;
export const FREE_LIMIT = 10;

const _store = createEntityStore({
    key: KEY,
    idPrefix: 'log',
    freeLimit: FREE_LIMIT,
    onList: (items) => backfillClientIds(items, listClients()), // CO-01 지연 백필 — 배치 1회 쓰기
    afterAdd: _pushCareLog, // CO-15 write-through — 로컬 저장은 즉시 확정, 서버는 비동기
    beforeSave: () => proFeatureNotice('care_log_save', '요양일지 저장'),
    onError: (r) => showStoreError(r, '요양일지', showToast),
});

export const listCareLogs = _store.list;
export const addCareLog = _store.add;
export const removeCareLog = _store.remove;
export const saveCareLog = _store.save;

// — CO-14/15: 기관 서버 write-through (오프라인 우선 — 멤버십 없으면 로컬 전용 유지) —

/** 서버 페이로드 — 코드화·구조화 필드만 (자유서술 note·text는 L0 유지, CO-06 원칙) */
/** @param {*} it */
function _recordPayload(it) {
    return { service: it.service, start: it.start, end: it.end, activities: it.activities, obs: it.obs, clientId: it.clientId || '' };
}

/** 단건 서버 반영 — 멤버십 없으면 조용히 스킵. 성공 시 항목에 _sync='done' 표기 */
/** @param {*} item */
async function _pushCareLog(item) {
    const m = await myMembership().catch(() => null);
    if (!m) return;
    const r = await submitRecord({
        facilityId: m.facility_id, docType: 'care_log',
        client: item.client || '', recordDate: item.date || todayKey(),
        payload: _recordPayload(item), localId: item.id,
    });
    if ('error' in r) return;
    const items = listCareLogs();
    const it = items.find(x => x.id === item.id);
    if (it && it._sync !== 'done') { it._sync = 'done'; setJSON(KEY, items); }
}

/** 미동기 일지 재전송 — 뷰 init 시 fire-and-forget 호출 (실패 건은 다음 기회에 재시도) */
export async function syncPendingCareLogs() {
    for (const it of listCareLogs()) {
        if (it._sync === 'done') continue;
        try { await _pushCareLog(it); } catch { /* 오프라인·미설정 — 로컬 동작 불변 */ }
    }
}
