// src/exams/carework/incident-store.js — 사고 보고 로컬 저장소
// @spec none — 시험 전용 도메인 스토어 (DA-13)
// localStorage `carework_incidents` — 사고 기록은 법적 증적이라 삭제 외 수정 없음
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { createEntityStore } from '../../core/entity-store.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { listClients } from './care-client-store.js';
import { backfillClientIds } from './care-client-resolve.js';

export const FREE_LIMIT = 10;

const _store = createEntityStore({
    key: STORAGE_KEYS.INCIDENT_ITEMS,
    idPrefix: 'inc',
    freeLimit: FREE_LIMIT,
    onList: (items) => backfillClientIds(items, listClients()), // CO-01 지연 백필 — 배치 1회 쓰기
    beforeSave: () => proFeatureNotice('care_incident_save', '사고보고 저장'),
    onError: (r) => showStoreError(r, '사고보고', showToast),
});

export const listIncidents = _store.list;
export const addIncident = _store.add;
export const removeIncident = _store.remove;
export const saveIncident = _store.save;
