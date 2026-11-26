// learner-profile-store.js — PassLoop 학습자 취약 개념 프로필 영속화 어댑터 (AI-41)
// @spec AI-41
//
// 순수 맵 연산은 src/passloop/core/learner-profile.js — 본 모듈은
// scopedKey 시험 스코프 + safeGetItem/safeSetItem으로 저장만 담당한다.
// 기록: ① wrong_feedback의 confused_concept (src:'feedback')
//       ② statement-tracker 오판 판정 진술 (src:'stmt')
// 소비: getWeakConcepts() → weekly_diagnosis·plan_adjust·quiz_gen의
//       weakConcepts 구조화 인자 (라벨 문자열만 — AI-30 정합)

import { safeGetItem, safeSetItem } from '../core/state.js';
import { STORAGE_KEYS } from '../core/storage-keys.js';
import { recordConcept, topWeakConcepts } from '../passloop/index.js';

const PROFILE_KEY = STORAGE_KEYS.AI_LEARNER_PROFILE;

/** @returns {Object.<string, {n:number, lastTs:number, cid?:string, src:string}>} */
export function loadLearnerProfile() {
    try {
        const raw = safeGetItem(PROFILE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
        return {};
    }
}

/**
 * 취약 개념 1건 누적 — 호출부는 라벨 확보 즉시 기록 (사용자 액션 없음).
 * @param {{label?: string, cid?: string|null, src: 'feedback'|'stmt'}} entry
 * @returns {boolean} 기록 여부 (빈 라벨은 스킵)
 */
export function recordWeakConcept(entry) {
    if (!entry || !String(entry.label ?? '').trim()) return false;
    const next = recordConcept(loadLearnerProfile(), entry);
    safeSetItem(PROFILE_KEY, JSON.stringify(next));
    return true;
}

/**
 * AI 구조화 인자용 상위 취약 라벨 — 빈도·최근성 순, 만료 항목 제외.
 * @param {number} [limit]
 * @returns {string[]}
 */
export function getWeakConcepts(limit) {
    return topWeakConcepts(loadLearnerProfile(), limit ? { limit } : {});
}
