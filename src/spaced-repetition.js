// spaced-repetition.js — FSRS-4.5 기반 간격 반복 학습 시스템 (구 SM-2)
// @spec F-07~09
//
// 각 카드의 복습 스케줄을 관리 — 스케줄 수학은 src/fsrs.js 순수 함수에 위임:
// - v2 레코드: { v:2, d(난이도 1~10), s(안정도 일), due, lastReview, reps, lapses, lastInterval }
// - 구 SM-2 레코드({repetition, easiness, nextReview})는 접근 시 지연 변환 (FSRS_DESIGN §3.2)
// - 공용 API 시그니처(updateCardSchedule·getDueCards·getDueCount)는 무수정 유지

import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { todayKey } from './utils.js';
import { Rating, fsrsReview, migrateSm2Record, nextInterval } from './fsrs.js';

const SR_KEY = STORAGE_KEYS.FC_SPACED_REPETITION;

/** 구 SM-2 레코드를 FSRS v2로 지연 변환 (이미 v2면 그대로) */
function _ensureV2(rec, todayStr) {
    if (!rec) return null;
    return rec.v === 2 ? rec : migrateSm2Record(rec, todayStr);
}

/** 날짜 문자열 차이 (일) — a - b */
function _daysBetween(a, b) {
    return Math.round((Date.parse(a + 'T00:00:00') - Date.parse(b + 'T00:00:00')) / 86400000);
}

// @spec F-07~09
// FSRS 스케줄 갱신 — d/s/due 상태 전이 (레이팅: 외움=Good, 헷갈림=Again)
/**
 * 카드의 복습 스케줄 업데이트
 * @param {string} cardId - 카드 ID
 * @param {boolean} knew - 외웠는지 여부 (true=외움→Good, false=헷갈림→Again)
 */
export function updateCardSchedule(cardId, knew) {
    const schedules = loadSchedules();
    const today = new Date();
    const todayStr = todayKey(today);

    const current = _ensureV2(schedules[cardId], todayStr);
    const rating = knew ? Rating.GOOD : Rating.AGAIN;
    const elapsed = current && current.lastReview ? Math.max(0, _daysBetween(todayStr, current.lastReview)) : 0;
    const next = fsrsReview(current, rating, elapsed);
    const interval = nextInterval(next.s);

    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + interval);

    schedules[cardId] = {
        ...next,
        due: todayKey(nextDate),
        lastReview: todayStr
    };

    saveSchedules(schedules);
    return schedules[cardId];
}

/**
 * 오늘 복습해야 할 카드 ID 목록 반환 (FSRS v2 due 필드)
 * @returns {string[]} 오늘 복습할 카드 ID 목록
 */
export function getDueCards() {
    const schedules = loadSchedules();
    const todayStr = todayKey();
    return Object.keys(schedules).filter(id => {
        const rec = _ensureV2(schedules[id], todayStr);
        return rec && rec.due <= todayStr;
    });
}

/**
 * 오늘 복습 대기 카드 수
 * @returns {number}
 */
export function getDueCount() {
    return getDueCards().length;
}

/**
 * 복습 스케줄 전체 로드 — 구 SM-2 레코드 포함 (raw 읽기)
 * @returns {Object} { cardId: { ... } }
 */
function loadSchedules() {
    try {
        const raw = safeGetItem(SR_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

/**
 * 복습 스케줄 전체 저장
 * @param {Object} schedules
 */
function saveSchedules(schedules) {
    safeSetItem(SR_KEY, JSON.stringify(schedules));
}
