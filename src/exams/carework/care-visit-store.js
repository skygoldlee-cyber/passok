// src/exams/carework/care-visit-store.js — 면회·방문 기록 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_visits` (safeGetItem/safeSetItem → 시험 네임스페이스)
// 무료 한도: FREE_LIMIT건 — 초과 시 free-limit 오류 → 상위에서 업그레이드 안내
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { createEntityStore } from '../../core/entity-store.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { listClients } from './care-client-store.js';
import { backfillClientIds } from './care-client-resolve.js';

export const FREE_LIMIT = 10;

const _store = createEntityStore({
    key: STORAGE_KEYS.CARE_VISIT_ITEMS,
    idPrefix: 'vis',
    freeLimit: FREE_LIMIT,
    defaults: { status: 'scheduled', result: null },
    onList: (items) => backfillClientIds(items, listClients()), // CO-01 지연 백필 — 배치 1회 쓰기
    beforeSave: () => proFeatureNotice('care_visit_save', '방문예약 저장'),
    onError: (r) => showStoreError(r, '방문기록', showToast),
});

export const listVisits = _store.list;
export const addVisit = _store.add;
/** 상태 전이·결과 기록 — {status:'done'|'canceled', result} 패치 */
export const updateVisit = _store.update;
export const removeVisit = _store.remove;
export const saveVisit = _store.save;
