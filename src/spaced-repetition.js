// spaced-repetition.js — FSRS-6 기반 간격 반복 학습 시스템 (구 SM-2)
// @spec F-07~09,D-20,PS-06
//
// 각 카드의 복습 스케줄을 관리 — 스케줄 수학은 src/fsrs.js 순수 함수에 위임:
// - v2 레코드: { v:2, d(난이도 1~10), s(안정도 일), due, lastReview, reps, lapses, lastInterval }
// - 구 SM-2 레코드({repetition, easiness, nextReview})는 접근 시 지연 변환 (LEARNING_ALGORITHM_DESIGN §3.2)
// - 공용 API 시그니처(updateCardSchedule·getDueCards·getDueCount)는 무수정 유지

import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { todayKey } from './utils.js';
import { Rating, fsrsReview, migrateSm2Record, nextInterval, retrievability } from './fsrs.js';

const SR_KEY = STORAGE_KEYS.FC_SPACED_REPETITION;
const LOG_KEY = STORAGE_KEYS.FC_REVIEW_LOG;

// @spec D-18
// 리뷰 로그 링버퍼 상한 — 피팅 실질 하한 ~1,000리뷰의 2배 (LEARNING_ALGORITHM_DESIGN §2)
const REVIEW_LOG_CAP = 2000;

// @spec D-19,D-20
// 시험일 목표 기억률 상수 (LEARNING_ALGORITHM_DESIGN §3·정정, LEARNING_ALGORITHM_DESIGN)
// due>exam 인 카드의 R_exam은 (0.9,1] 대역 — 0.85 임계는 공집합이므로 목표 0.95 미만을 위험대로 둔다
const EXAM_TARGET_R = 0.95;         // 시험일 목표 기억률 미달 판정
export const EXAM_R_WINDOW_DAYS = 14;   // 최종 인출 큐 표시 D-day 윈도
export const EXAM_R_SESSION_CAP = 60;   // 1회 세션 상한 — 크램 벽 방지

/** 구 SM-2 레코드를 FSRS v2로 지연 변환 (이미 v2면 그대로) */
function _ensureV2(rec, todayStr) {
    if (!rec) return null;
    return rec.v === 2 ? rec : migrateSm2Record(rec, todayStr);
}

/** 날짜 문자열 차이 (일) — a - b */
function _daysBetween(a, b) {
    return Math.round((Date.parse(a + 'T00:00:00') - Date.parse(b + 'T00:00:00')) / 86400000);
}

/** 'YYYY-MM-DD'를 offset일 이동 */
function _shiftDateStr(dateStr, offset) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    return todayKey(d);
}

/** 시험일 'YYYY-MM-DD' — 미설정·비정형이면 null (시험 스코프 키, LEARNING_ALGORITHM_DESIGN §2.1) */
function _examDateStr() {
    const v = safeGetItem(STORAGE_KEYS.EXAM_DATE);
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
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
    let due = todayKey(nextDate);

    // @spec D-20 — 시험일 클램프: due>exam ∧ 시험일 R<0.95인 카드는 exam−1로 당김 (LEARNING_ALGORITHM_DESIGN §2)
    const examStr = _examDateStr();
    if (examStr && examStr > todayStr && due > examStr) {
        const rExam = retrievability(_daysBetween(examStr, todayStr), next.s);
        if (rExam < EXAM_TARGET_R) due = _shiftDateStr(examStr, -1);
    }

    schedules[cardId] = {
        ...next,
        due,
        lastReview: todayStr
    };

    saveSchedules(schedules);
    // @spec D-18 — 레이팅 이력 append (카드·진술 공용 단일 통로, 설계 §2.2)
    // @spec PS-06 — s: 복습 전 안정도를 함께 기록해 개인 w20 피팅 입력으로 사용
    appendReviewLog({ c: cardId, r: rating, e: elapsed, s: (current && current.s) || 0, t: today.getTime() });
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

// @spec D-18
/**
 * 리뷰 로그에 레코드 1건 append — 2,000건 FIFO 링버퍼.
 * {c: 카드·진술 id, r: FSRS 레이팅(1|3), e: 경과일, s: 복습 전 안정도, t: unix ms}
 * 또는 퀴즈 판정 {c: 문항 id, k:'q', ok: 1|0, t: unix ms} (D-22)
 * @param {{c:string, r?:number, e?:number, s?:number, k?:string, ok?:number, t:number}} entry
 */
function appendReviewLog(entry) {
    const log = getReviewLog();
    log.push(entry);
    if (log.length > REVIEW_LOG_CAP) log.splice(0, log.length - REVIEW_LOG_CAP);
    safeSetItem(LOG_KEY, JSON.stringify(log));
}

// @spec D-22
/**
 * 퀴즈 문항 정오 판정을 리뷰 로그에 기록 — BKT 관측 시퀀스 입력 (D-22 선행).
 * 스키마: {c: 문항 id, k:'q', ok: 1|0, t: unix ms, chg?: 1|0, conf?: 1|0} — k 필드로 스케줄 이벤트
 * ({c,r,e,t}, k 없음)와 구분한다. 소비자는 k==='q'로 필터한다.
 * chg: 제출 전 선택지 변경 신호 (PS-08 망설임), conf: 확신 응답 신호 (PS-08 확신 오답)
 * @param {string} quizId 문항 ID
 * @param {boolean} correct 정답 여부
 * @param {Object} [meta] { chg?:1|0, conf?:1|0 } 행동 신호 메타 (PS-08)
 */
export function recordQuizJudgment(quizId, correct, meta) {
    appendReviewLog({ c: quizId, k: 'q', ok: correct ? 1 : 0, t: Date.now(), ...(meta || {}) });
}

/**
 * 리뷰 로그 전체 읽기 — 후속 피팅·효능 실측·BKT 시퀀스 입력 (D-18·D-22·PS-06)
 * @returns {Array<{c:string, r?:number, e?:number, s?:number, k?:string, ok?:number, chg?:number, conf?:number, t:number}>}
 */
export function getReviewLog() {
    try {
        const raw = safeGetItem(LOG_KEY);
        const log = raw ? JSON.parse(raw) : [];
        return Array.isArray(log) ? log : [];
    } catch (e) {
        return [];
    }
}

// @spec D-19
/**
 * 시험일 기억률 미달 카드 선별 — 다음 예정 복습이 시험일 이후(due > examDate)이고
 * 시험일 시점 R이 임계값 미만인 카드. R_exam 오름차순 정렬 (가장 잊을 카드 우선).
 * @param {number|null} dday 시험일까지 잔여 일수 (미설정 null)
 * @returns {Array<{id:string, rExam:number}>}
 */
export function getExamRiskCards(dday) {
    if (dday === null || dday === undefined || !Number.isFinite(dday) || dday < 0) return [];
    const schedules = loadSchedules();
    const todayStr = todayKey();
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + dday);
    const examStr = todayKey(examDate);
    const risk = [];
    Object.keys(schedules).forEach(id => {
        const rec = _ensureV2(schedules[id], todayStr);
        if (!rec || !rec.due || !rec.lastReview) return;
        // due ≤ 시험일은 시험 전 예정 복습이 있거나(사각지대 아님) due 큐 소유 — 제외
        if (rec.due <= examStr) return;
        const elapsedAtExam = dday + Math.max(0, _daysBetween(todayStr, rec.lastReview));
        const rExam = retrievability(elapsedAtExam, rec.s);
        if (rExam < EXAM_TARGET_R) risk.push({ id, rExam });
    });
    return risk.sort((a, b) => a.rExam - b.rExam);
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
