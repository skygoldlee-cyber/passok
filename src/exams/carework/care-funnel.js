// src/exams/carework/care-funnel.js — 수험생→종사자 전환 퍼널 계측 (CO-12-lite)
// @spec CO-12 — 시험 전용 도메인 로직 (DA-13)
// 실무도구 첫 사용 시점·도구별 사용 횟수를 로컬에 기록 — KPI①(합격→첫 도구 사용 전환율)의 데이터 원천
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime } from '../../core/utils.js';

const KEY = STORAGE_KEYS.CARE_FUNNEL;

/** 도구 사용 계측 — 최초 사용 시점(first_use)과 도구별 횟수를 누적 */
export function markFunnel(step) {
    const f = (getJSON(KEY) && typeof getJSON(KEY) === 'object') ? getJSON(KEY) : { first_use: null, tools: {} };
    if (!f.first_use) f.first_use = localDateTime();
    f.tools[step] = (f.tools[step] || 0) + 1;
    f.last_use = localDateTime();
    setJSON(KEY, f);
    return f;
}

/** @returns {{first_use:string|null,last_use?:string,tools:Object<string,number>}|null} */
export function funnelStats() {
    const f = getJSON(KEY);
    return (f && typeof f === 'object') ? f : null;
}
