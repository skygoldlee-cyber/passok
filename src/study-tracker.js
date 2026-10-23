// src/study-tracker.js — 학습 캘린더/목표 추적 헬퍼
// @spec SC-03,SC-05,SC-06,SC-07,SC-08,SC-09,SC-15,D-17,D-23,Q-12
// 학습 활동을 날짜별로 기록하고, 목표 달성률을 계산합니다.
import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { localDateKey } from './utils.js';
import { subjectKeyFromItemId } from './weak-items.js';
import { getMinExamLeadDays, getReadThroughDays, getReadDayShare, getActiveSubjectCount } from './exam-context.js';

/* =======================================================
   📅 학습 캘린더 (날짜별 학습 기록)
   ======================================================= */

/**
 * 로컬 날짜 문자열 반환 (YYYY-MM-DD)
 */
function _localDateStr(d) {
    return localDateKey(d);
}

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD, 로컬 기준)
 */
export function getTodayStr() {
    return _localDateStr(new Date());
}

/**
 * 학습 캘린더 전체 데이터 조회
 * @returns {Object} { "2026-09-12": { cards: 5, quizzes: 3, correct: 2, h: {"21": 2} }, ... }
 *   `h`는 시간대 버킷(시 → 활동 횟수) — 학습 패턴 분석용, 레거시 엔트리는 없을 수 있음
 */
export function getStudyCalendar() {
    try {
        return JSON.parse(safeGetItem(STORAGE_KEYS.STUDY_CALENDAR) || '{}');
    } catch (e) {
        return {};
    }
}

/**
 * 오늘 학습 활동 기록 (누적)
 * @param {Object} activity - { cards: 증가할 카드 수, quizzes: 증가할 퀴즈 수, correct: 정답 수,
 *   readMin: 교재 읽기 분 — SC-15 일독일 학습일 인정용,
 *   bySubj: 과목별 카드 증분 {subjKey: n} — SC-09 주간 배분 과목별 주간 실적용,
 *   quizBySubj: 과목별 퀴즈 증분 {subjKey: n} — SC-13 주간 배분 퀴즈 주간 실적용 }
 */
export function recordStudyActivity(activity = {}) {
    const today = getTodayStr();
    const cal = getStudyCalendar();
    const entry = cal[today] || { cards: 0, quizzes: 0, correct: 0 };
    if (activity.readMin) entry.readMin = (entry.readMin || 0) + activity.readMin;
    if (activity.cards) entry.cards += activity.cards;
    if (activity.quizzes) entry.quizzes += activity.quizzes;
    if (activity.correct) entry.correct += activity.correct;
    if (activity.bySubj && typeof activity.bySubj === 'object') {
        entry.bySubj = entry.bySubj || {};
        Object.entries(activity.bySubj).forEach(([k, n]) => {
            if (n > 0) entry.bySubj[k] = (entry.bySubj[k] || 0) + n;
        });
    }
    if (activity.quizBySubj && typeof activity.quizBySubj === 'object') {
        entry.quizBySubj = entry.quizBySubj || {};
        Object.entries(activity.quizBySubj).forEach(([k, n]) => {
            if (n > 0) entry.quizBySubj[k] = (entry.quizBySubj[k] || 0) + n;
        });
    }
    if (activity.cards || activity.quizzes || activity.readMin) {
        // 시간대 버킷 — 학습 패턴 분석(computeStudyPattern)용, 활동 호출당 1회
        const hr = new Date().getHours();
        entry.h = entry.h || {};
        entry.h[hr] = (entry.h[hr] || 0) + 1;
    }
    cal[today] = entry;
    safeSetItem(STORAGE_KEYS.STUDY_CALENDAR, JSON.stringify(cal));
}

/**
 * 이번 달 학습 일수
 */
export function getMonthlyStudyDays(year, month) {
    const cal = getStudyCalendar();
    let count = 0;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    Object.keys(cal).forEach(date => {
        if (date.startsWith(prefix)) {
            const e = cal[date];
            if (e.cards > 0 || e.quizzes > 0 || (e.readMin || 0) > 0) count++;
        }
    });
    return count;
}

/* =======================================================
   🎯 학습 목표 (일일/주간)
   ======================================================= */

const DEFAULT_GOALS = {
    dailyCards: 50,
    dailyQuizzes: 10,
    weeklyStudyDays: 5
};

/**
 * 학습 목표 조회
 */
export function getStudyGoals() {
    try {
        const stored = JSON.parse(safeGetItem(STORAGE_KEYS.STUDY_GOALS) || '{}');
        return { ...DEFAULT_GOALS, ...stored };
    } catch (e) {
        return { ...DEFAULT_GOALS };
    }
}

/**
 * 학습 목표 저장
 */
export function setStudyGoals(goals) {
    const current = getStudyGoals();
    const merged = { ...current, ...goals };
    safeSetItem(STORAGE_KEYS.STUDY_GOALS, JSON.stringify(merged));
    return merged;
}

/**
 * 오늘 목표 달성률 계산
 * @returns {Object} { cardsDone, cardsGoal, quizzesDone, quizzesGoal, overallPercent }
 */
export function getTodayGoalProgress() {
    const goals = getStudyGoals();
    const today = getTodayStr();
    const cal = getStudyCalendar();
    const entry = cal[today] || { cards: 0, quizzes: 0, correct: 0 };
    const cardsDone = entry.cards || 0;
    const quizzesDone = entry.quizzes || 0;
    const cardsPercent = goals.dailyCards > 0 ? Math.min(100, Math.round((cardsDone / goals.dailyCards) * 100)) : 0;
    const quizzesPercent = goals.dailyQuizzes > 0 ? Math.min(100, Math.round((quizzesDone / goals.dailyQuizzes) * 100)) : 0;
    const overallPercent = Math.round((cardsPercent + quizzesPercent) / 2);
    return {
        cardsDone,
        cardsGoal: goals.dailyCards,
        quizzesDone,
        quizzesGoal: goals.dailyQuizzes,
        cardsPercent,
        quizzesPercent,
        overallPercent
    };
}

/**
 * 이번 주 목표 달성률 계산 (학습 일수)
 */
export function getWeeklyGoalProgress() {
    const goals = getStudyGoals();
    const cal = getStudyCalendar();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일, 1=월, ...
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    let studyDays = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (d > today) break;
        const entry = cal[_localDateStr(d)];
        if (entry && (entry.cards > 0 || entry.quizzes > 0 || (entry.readMin || 0) > 0)) studyDays++;
    }
    const percent = goals.weeklyStudyDays > 0 ? Math.min(100, Math.round((studyDays / goals.weeklyStudyDays) * 100)) : 0;
    return {
        studyDays,
        goalDays: goals.weeklyStudyDays,
        percent
    };
}

/* =======================================================
   🗓️ 시험일 / D-day (역산 학습 계획)
   ======================================================= */

function _isValidDateStr(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * 시험일 조회 (YYYY-MM-DD 또는 null)
 */
export function getExamDate() {
    const v = safeGetItem(STORAGE_KEYS.EXAM_DATE);
    return _isValidDateStr(v) ? v : null;
}

/**
 * 시험일 저장 (null/빈 문자열/유효하지 않은 날짜면 제거)
 */
export function setExamDate(dateStr) {
    safeSetItem(STORAGE_KEYS.EXAM_DATE, _isValidDateStr(dateStr) ? dateStr : '');
}

/**
 * 시험까지 남은 일수 (오늘=0 기준). 미설정이면 null.
 * 시험일이 지났으면 음수.
 */
export function getDDay() {
    const examStr = getExamDate();
    if (!examStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examStr + 'T00:00:00');
    return Math.round((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// 최소 권장 준비 기간·일독 예상 기간은 시험별 값 — manifest study 블록 또는
// 콘텐츠 규모 유도로 결정 (exam-context.js의 getMinExamLeadDays/getReadThroughDays, D-17/SC-15)

/**
 * 교재 일독 진척률 — 리더가 저장하는 과목별 최대 스크롤 진척(reader_progress)을 집계 (SC-15).
 * 표준형·이야기형은 동일 커버리지로 과목당 최대값만 인정한다.
 * @returns {{bySubject:Object, overall:number, started:boolean}}
 *   overall은 0~1. 진척 기록이 하나도 없으면 started=false (미독 사용자는 계획 차감 안 함)
 */
export function getTextbookReadProgress() {
    let map = {};
    try { map = JSON.parse(safeGetItem(STORAGE_KEYS.READER_PROGRESS) || '{}'); } catch (e) { map = {}; }
    const bySubject = {};
    Object.entries(map).forEach(([k, v]) => {
        const frac = (v && typeof v === 'object') ? v.frac : null;
        if (typeof frac === 'number' && frac > 0) bySubject[k] = Math.min(1, frac);
    });
    const seen = Object.keys(bySubject);
    // 분모 = 활성 시험 과목 수 (registry.subjects — exam-context 단일 진입점).
    // 레지스트리 미로딩 시 관측 과목 수로 완화 (진척 맵에 있는 과목만큼은 존재한다는 최소 추정).
    const total = getActiveSubjectCount() || Math.max(1, seen.length);
    const overall = seen.length ? seen.reduce((s, k) => s + bySubject[k], 0) / total : 0;
    return { bySubject, overall, started: seen.length > 0 };
}

/**
 * 시험일 리드타임 평가 — 목표 설정 모달의 인라인 권고용.
 * @param {string|null} dateStr YYYY-MM-DD
 * @param {Date} [today] 기준일 (테스트 주입용)
 * @returns {{dday:number, leadShort:boolean, past:boolean}|null} 유효하지 않은 날짜면 null
 */
export function getExamLeadStatus(dateStr, today = new Date()) {
    if (typeof dateStr !== 'string' || !_isValidDateStr(dateStr)) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dday = Math.round((new Date(y, m - 1, d).getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    return { dday, leadShort: dday >= 0 && dday < getMinExamLeadDays(), past: dday < 0 };
}

/**
 * D-day 계획 등급 — 학습일당 필요량 ÷ 일일 카드 목표 비율로 판정.
 * 권장량은 computeStudyPlan.perStudyDay(주간 학습일·통독 차감 반영)와 동일 기준 —
 * 대시보드 카드와 캘린더 계획 패널이 하나의 역산 공식을 공유한다.
 *   'normal' ≤1.0 여유 — 페이스 안내
 *   'tight'  ≤2.0 압축 — 카드·퀴즈 병행 권장
 *   'triage' >2.0 긴급 — 전량 커버 어려움, 과목 우선순위 필요
 * @param {number} remainingItems 남은 학습 항목 수 (예: 미암기 카드)
 * @param {number} [dailyGoal] 일일 카드 목표 (생략 시 저장된 목표)
 * @returns {{dday:number, suggested:number|null, ratio:number|null, tier:string}|null}
 *   시험일 미설정이면 null, 경과면 tier='past', 남은 항목이 없으면 suggested=null
 */
export function getExamPlanStatus(remainingItems, dailyGoal) {
    const dday = getDDay();
    if (dday === null) return null;
    if (dday <= 0) return { dday, suggested: null, ratio: null, tier: 'past' };
    const plan = computeStudyPlan(remainingItems);
    const suggested = plan && plan.remaining > 0 ? plan.perStudyDay : null;
    if (suggested === null) return { dday, suggested: null, ratio: null, tier: 'normal' };
    const goal = (typeof dailyGoal === 'number' && dailyGoal > 0) ? dailyGoal : getStudyGoals().dailyCards;
    const ratio = goal > 0 ? suggested / goal : Infinity;
    const tier = ratio <= 1 ? 'normal' : ratio <= 2 ? 'tight' : 'triage';
    return { dday, suggested, ratio, tier };
}

/**
 * 계획 등급 → 기간 대응 학습법 프리셋 라벨 (SC-16) — 순수 함수.
 * 플랫폼은 프리셋 라벨만 공급한다; 기간별 학습법 상세(통독 생략·선별 우선순위 등)는
 * 시험 콘텐츠 소유 (DA-15 — `content/exams/<id>/docs/` 학습안내서).
 *   'normal' → '순환형'  (통독 → 카드·퀴즈 순환)
 *   'tight'  → '압축형'  (통독 가속 + 카드·퀴즈 병행)
 *   'triage' → '선별형'  (통독 생략, 비중 큰 과목·복습·드릴 우선)
 * @param {string} tier getExamPlanStatus/computeStudyPlan의 tier
 * @returns {string} 프리셋 라벨 (알 수 없는 tier는 '')
 */
export function tierStudyHint(tier) {
    return { normal: '순환형', tight: '압축형', triage: '선별형' }[tier] || '';
}

/**
 * 시험일 역산 학습 계획 — 설정된 목표(주간 학습일 반영)와 잔여 학습량으로
 * 학습 가능 일수·학습일당 필요량·주차별 마일스톤을 생성한다 (SC-05 계획 패널).
 * 학습 가능 일수 = ⌊dday × 주간 학습일 ÷ 7⌋ — 단순 달력 역산보다 실제 약속 기준.
 * @param {number} remainingItems 남은 학습 항목 수 (예: 미암기 카드)
 * @returns {Object|null} 시험일 미설정·경과면 null.
 *   { dday, studyDays, perStudyDay, weeklyCards, remaining, weeks, goals, tier,
 *     readDaysLeft, readProgress }
 *   weeks[] = { week, range, studyDays, reading, cards, cumulative, percent }
 *   tier: 'done'(잔여 0) | 'normal' | 'tight' | 'triage' — perStudyDay÷일일 목표 비율
 *   SC-15: 일독 시작 후 남은 통독 학습일(⌈(1−진척)×getReadThroughDays()⌉)을
 *   앞쪽 주차 학습일에서 순차 차감 — 통독 기간의 카드 배정이 부풀지 않게 한다
 */
/**
 * D-day 기간의 주차별 학습일 스켈레톤 — 주간 학습일 상한 + 통독 차감 적용.
 * @param {number} dday 시험까지 남은 달력 일수 (>0)
 * @returns {{weeks:Array, studyDays:number, goals:Object, read:Object, readDaysLeft:number}}
 */
function _planSkeleton(dday) {
    const goals = getStudyGoals();
    const read = getTextbookReadProgress();
    // 남은 통독일 × readDayShare — 읽기·카드 병행을 인정하는 팩은 0~1 비율로 부분 차감 (기본 1=전일 대치)
    const readDayCost = () => Math.ceil((1 - read.overall) * getReadThroughDays() * getReadDayShare());
    const readDaysLeft = read.started ? readDayCost() : 0;
    let readRemaining = readDaysLeft;
    const weekCount = Math.ceil(dday / 7);
    const weeks = [];
    let studyDays = 0;
    for (let w = 0; w < weekCount; w++) {
        const daysInWeek = Math.min(7, dday - w * 7);
        const base = Math.min(goals.weeklyStudyDays, daysInWeek);
        const reading = Math.min(base, readRemaining);
        readRemaining -= reading;
        const studyDaysInWeek = base - reading;
        studyDays += studyDaysInWeek;
        weeks.push({
            week: w + 1,
            range: `D-${dday - w * 7} ~ D-${Math.max(0, dday - (w + 1) * 7)}`,
            studyDays: studyDaysInWeek,
            reading,
            cards: 0,
            cumulative: 0,
            percent: 0
        });
    }
    return { weeks, studyDays: Math.max(1, studyDays), goals, read, readDaysLeft };
}

/**
 * 잔여 학습일 수 — 주간 학습일 상한·통독 차감을 반영한 단일 기준.
 * 역산 권장량·페이스 투사 등 "남은 기간 대비 필요량"을 계산하는 모든 로직은
 * 달력 일수가 아닌 이 값을 분모로 사용한다.
 * @param {number} dday 시험까지 남은 달력 일수
 * @returns {number} 잔여 학습일 (dday ≤ 0이면 0, 아니면 최소 1)
 */
export function getRemainingStudyDays(dday) {
    if (typeof dday !== 'number' || dday <= 0) return 0;
    return _planSkeleton(dday).studyDays;
}

export function computeStudyPlan(remainingItems) {
    const dday = getDDay();
    if (dday === null || dday <= 0) return null;
    const { weeks, studyDays, goals, read, readDaysLeft } = _planSkeleton(dday);
    const remaining = Math.max(0, Math.round(remainingItems));
    const perStudyDay = remaining > 0 ? Math.ceil(remaining / studyDays) : 0;
    let covered = 0;
    weeks.forEach(w => {
        const cards = Math.min(remaining - covered, perStudyDay * w.studyDays);
        w.cards = cards;
        covered += cards;
        w.cumulative = covered;
        w.percent = remaining > 0 ? Math.min(100, Math.round(covered / remaining * 100)) : 100;
    });
    const ratio = goals.dailyCards > 0 ? perStudyDay / goals.dailyCards : Infinity;
    const tier = remaining === 0 ? 'done' : (ratio <= 1 ? 'normal' : ratio <= 2 ? 'tight' : 'triage');
    return {
        dday,
        studyDays,
        perStudyDay,
        weeklyCards: perStudyDay * goals.weeklyStudyDays,
        remaining,
        weeks,
        goals: { dailyCards: goals.dailyCards, dailyQuizzes: goals.dailyQuizzes, weeklyStudyDays: goals.weeklyStudyDays },
        tier,
        readDaysLeft,
        readProgress: Math.round(read.overall * 100)
    };
}

/* =======================================================
   📈 계획 준수·마일스톤 (SC-06, SC-07)
   ======================================================= */

/**
 * 최근 N일 카드 실적 합계 (오늘 포함)
 * @param {Object} calendar getStudyCalendar() 결과
 * @param {number} [days] 집계 일수
 * @param {Date} [today] 기준일 (테스트 주입용)
 */
export function sumRecentCards(calendar, days = 7, today = new Date()) {
    let total = 0;
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const entry = calendar[_localDateStr(d)];
        if (entry && entry.cards > 0) total += entry.cards;
    }
    return total;
}

/**
 * 최근 N일 과목별 실적 합산 공용 — 캘린더의 과목별 맵 필드를 합산한다.
 * @param {Object} calendar getStudyCalendar() 결과
 * @param {string} field 엔트리의 과목별 맵 필드명 ('bySubj' | 'quizBySubj')
 * @param {number} days 집계 일수
 * @param {Date} today 기준일
 * @returns {Object} {subjKey: 수}
 */
function _sumRecentBySubject(calendar, field, days, today) {
    const out = {};
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const entry = calendar[_localDateStr(d)];
        if (entry && entry[field]) {
            Object.entries(entry[field]).forEach(([k, n]) => {
                if (n > 0) out[k] = (out[k] || 0) + n;
            });
        }
    }
    return out;
}

/**
 * 최근 N일 과목별 카드 실적 (SC-09) — 캘린더 `bySubj` 항목을 과목 키별로 합산.
 * bySubj가 없는 레거시 엔트리는 과목을 알 수 없어 제외된다.
 * @param {Object} calendar getStudyCalendar() 결과
 * @param {number} [days] 집계 일수
 * @param {Date} [today] 기준일 (테스트 주입용)
 * @returns {Object} {subjKey: 카드 수}
 */
export function sumRecentCardsBySubject(calendar, days = 7, today = new Date()) {
    return _sumRecentBySubject(calendar, 'bySubj', days, today);
}

/**
 * 최근 N일 과목별 퀴즈 실적 (SC-13) — 캘린더 `quizBySubj` 항목을 과목 키별로 합산.
 * quizBySubj가 없는 레거시 엔트리는 과목을 알 수 없어 제외된다.
 * @param {Object} calendar getStudyCalendar() 결과
 * @param {number} [days] 집계 일수
 * @param {Date} [today] 기준일 (테스트 주입용)
 * @returns {Object} {subjKey: 퀴즈 수}
 */
export function sumRecentQuizzesBySubject(calendar, days = 7, today = new Date()) {
    return _sumRecentBySubject(calendar, 'quizBySubj', days, today);
}

/**
 * 계획 대비 주간 진행률 (SC-06) — 이번 주 배정량(weeks[0]) 대비
 * 최근 7일 카드 실적 비율. 마지막 부분 주차는 배정량이 자동 축소된다.
 * @param {Object|null} plan computeStudyPlan() 결과
 * @param {Object} [calendar] getStudyCalendar() 결과
 * @param {Date} [today] 기준일 (테스트 주입용)
 * @returns {{weekTarget:number, weekActual:number, percent:number, status:string}|null}
 *   status: 'met' ≥100% · 'ontrack' ≥50% · 'behind' <50% · 'done' 잔여 0
 */
export function computePlanAdherence(plan, calendar, today = new Date()) {
    if (!plan) return null;
    if (plan.remaining === 0) return { weekTarget: 0, weekActual: 0, percent: 100, status: 'done' };
    const weekTarget = plan.weeks.length ? plan.weeks[0].cards : plan.weeklyCards;
    const weekActual = sumRecentCards(calendar || getStudyCalendar(), 7, today);
    const percent = weekTarget > 0 ? Math.round(weekActual / weekTarget * 100) : 100;
    const status = percent >= 100 ? 'met' : percent >= 50 ? 'ontrack' : 'behind';
    return { weekTarget, weekActual, percent, status };
}

/** 이번 주 월요일 날짜 문자열 — 주간 마일스톤 id용 (주 단위 재발화 허용) */
function _weekStartStr(today = new Date()) {
    const d = new Date(today);
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return _localDateStr(d);
}

/**
 * 학습 마일스톤 평가 (SC-07) — 아직 안내하지 않은 마일스톤 목록 반환.
 * D-day 임계는 긴급한 것부터, 진도 경유는 높은 것부터 정렬된다.
 * @param {Object} p
 * @param {number|null} p.dday getDDay() 결과
 * @param {Object|null} p.adherence computePlanAdherence() 결과
 * @param {number} [p.progressPercent] 전체 카드 암기율 (0~100)
 * @param {string} [p.weekId] 이번 주 식별자 (기본: 이번 주 월요일)
 * @param {Array<string>} [seen] 이미 안내한 마일스톤 id
 * @returns {Array<{id:string, msg:string, tone:string}>}
 */
export function evalStudyMilestones(p, seen = []) {
    const out = [];
    const has = (id) => seen.includes(id);
    const d = p.dday;
    if (typeof d === 'number' && d >= 0) {
        if (d === 0 && !has('d0')) out.push({ id: 'd0', msg: '시험 당일입니다 — 그동안의 학습을 믿고 임하세요.', tone: 'success' });
        if (d <= 1 && !has('d1')) out.push({ id: 'd1', msg: '시험이 내일입니다 — 가볍게 복습하고 컨디션을 챙기세요.', tone: 'info' });
        if (d <= 7 && !has('d7')) out.push({ id: 'd7', msg: '시험까지 1주 — 신규 학습보다 복습·모의고사 비중을 높이세요.', tone: 'warning' });
        if (d <= 14 && !has('d14')) out.push({ id: 'd14', msg: '시험까지 2주 — 카드·퀴즈 병행과 약점 집중이 필요한 시점입니다.', tone: 'warning' });
        if (d <= 30 && !has('d30')) out.push({ id: 'd30', msg: '시험까지 한 달 — 학습 계획표를 확인하고 페이스를 점검하세요.', tone: 'info' });
    }
    const a = p.adherence;
    if (a && a.status === 'met' && p.weekId && !has(`wk-${p.weekId}`)) {
        out.push({ id: `wk-${p.weekId}`, msg: `이번 주 계획 달성 — 주간 카드 ${a.weekActual}장. 이 페이스를 유지하세요.`, tone: 'success' });
    }
    const pg = p.progressPercent;
    if (typeof pg === 'number') {
        if (pg >= 75 && !has('p75')) out.push({ id: 'p75', msg: '전체 카드 75% 돌파 — 마무리 구간입니다.', tone: 'success' });
        else if (pg >= 50 && !has('p50')) out.push({ id: 'p50', msg: '전체 카드 절반 돌파 — 후반부도 같은 페이스로 진행하세요.', tone: 'success' });
    }
    return out;
}

function _getSeenMilestones() {
    try {
        const list = JSON.parse(safeGetItem(STORAGE_KEYS.STUDY_MILESTONES_SEEN) || '[]');
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

/**
 * 학습 마일스톤 안내 (SC-07) — 새로 도달한 마일스톤을 최대 limit개 반환하고
 * 반환한 것만 안내 이력에 기록한다 (미표시분은 다음 호출에 재평가).
 * @param {Object} [opts]
 * @param {number} [opts.remaining] 남은 카드 수 (계획 준수 계산용)
 * @param {number} [opts.total] 전체 카드 수 (진도 경유 계산용)
 * @param {number} [opts.limit] 최대 반환 수
 * @returns {Array<{id:string, msg:string, tone:string}>}
 */
export function checkStudyMilestones({ remaining = 0, total = 0, limit = 2 } = {}) {
    const seen = _getSeenMilestones();
    const plan = computeStudyPlan(remaining);
    const progressPercent = total > 0 ? Math.round(Math.max(0, total - remaining) / total * 100) : 0;
    const fresh = evalStudyMilestones({
        dday: getDDay(),
        adherence: computePlanAdherence(plan),
        progressPercent,
        weekId: _weekStartStr()
    }, seen);
    const shown = fresh.slice(0, limit);
    if (shown.length) {
        safeSetItem(STORAGE_KEYS.STUDY_MILESTONES_SEEN,
            JSON.stringify(seen.concat(shown.map(m => m.id)).slice(-100)));
    }
    return shown;
}

/* =======================================================
   📚 과목별 가중 배분 (SC-08 — study_plan_pro)
   ======================================================= */

/** 약점 가중 최소 퀴즈 표본 — 미만이면 중립 가중 1.0 (가짜 정밀도 방지) */
export const MIN_ALLOC_SAMPLE = 20;

/** 약점 가중 상한 — 퀴즈 정답률 + 취약 카드 가산의 합계 상한 (SC-09) */
export const MAX_WEAK_WEIGHT = 2.5;

/** 최근 퀴즈 표본 윈도우 — 과목당 최근 N문만 약점 가중에 반영 (SC-09) */
const RECENT_QUIZ_WINDOW = 60;

/** 진단 신호 윈도우 — 오답 원인 태그는 최근 30일만 가산 (SC-12) */
const DIAG_CAUSE_WINDOW_DAYS = 30;

/** 진단 신호 가산 상한 — 오답 원인·취약 단원 가산 합계 상한 (SC-12) */
export const MAX_DIAG_BOOST = 0.5;

// @spec SC-08,D-23,Q-12
/**
 * 출제 비중 맵 — registry.exams의 과목별 문제은행 문항 수를 집계한다.
 * 주간 배분(SC-08)·최종 인출 층화(D-23)·진단 평가 층화(Q-12)의 단일 출처.
 * @param {Array} [exams] registry.exams — [{subject, stats:{questions}}]
 * @returns {Object} {subjKey: 출제 문항 수}
 */
export function examWeightBySubject(exams) {
    /** @type {{ [x: string]: number }} */
    const w = {};
    (exams || []).forEach(ex => {
        if (ex && ex.subject) w[ex.subject] = (w[ex.subject] || 0) + ((ex.stats && ex.stats.questions) || 0);
    });
    return w;
}

// @spec D-23,Q-12
/**
 * 출제 비중 비례 정수 쿼터 배분 (최대잔여법) — 각 키에 최소 min을 먼저 보장하고
 * 잔여를 비중 비례로 배분한다. 비중 합계가 0(미선언 시험)이면 균등 배분.
 * 총합은 항상 total과 일치하고, min×N > total이면 min을 floor(total/N)으로 축소한다.
 * @param {string[]} keys 대상 과목 키 (수요가 있는 과목만 전달할 것)
 * @param {Object} weightBySubject examWeightBySubject 결과 {subjKey: 문항 수}
 * @param {number} total 배분 총량 (정수)
 * @param {number} [minPerKey] 키당 최소 보장량 (기본 0)
 * @returns {Object} {key: 배정 수}
 */
export function apportionByWeight(keys, weightBySubject, total, minPerKey = 0) {
    const list = (keys || []).filter(Boolean);
    /** @type {{ [x: string]: number }} */
    const out = {};
    if (!list.length) return out;
    const cap = Math.max(0, Math.floor(total) || 0);
    const wMap = weightBySubject || {};
    const effMin = Math.max(0, Math.min(minPerKey, Math.floor(cap / list.length)));
    list.forEach(k => { out[k] = effMin; });
    let pool = cap - effMin * list.length;
    const wsum = list.reduce((s, k) => s + Math.max(0, wMap[k] || 0), 0);
    const rows = list.map(k => ({
        key: k,
        share: wsum > 0 ? pool * Math.max(0, wMap[k] || 0) / wsum : pool / list.length
    }));
    rows.forEach(r => {
        const g = Math.floor(r.share);
        out[r.key] += g;
        pool -= g;
    });
    // 최대잔여법 — 소수부 큰 순으로 잔여 1씩 (동점은 keys 선언 순서)
    rows.sort((a, b) => (b.share - Math.floor(b.share)) - (a.share - Math.floor(a.share)));
    for (const r of rows) {
        if (pool <= 0) break;
        out[r.key] += 1;
        pool -= 1;
    }
    return out;
}

// @spec D-23
/**
 * 최종 인출 세션 과목 층화 — D-19 위험 카드(R_exam 오름차순)가 세션 상한을 넘을 때
 * 과목별 출제 비중 비례 쿼터 + 과목당 최소 1장으로 자르고, 수요 소진 잔여는
 * 전역 R_exam 순으로 재충전한다. 소수 비중 과목이 세션에서 탈락하는 것을 차단.
 * 비중 미선언(합계 0)이면 기존 전역 R 절단. 결과는 R_exam 오름차순 유지.
 * @param {Array<{id:string, rExam:number}>} risk getExamRiskCards 결과 (R 오름차순)
 * @param {number} cap 세션 상한
 * @param {Object} [weightBySubject] examWeightBySubject 결과
 * @returns {Array<{id:string, rExam:number}>}
 */
export function selectExamRiskSession(risk, cap, weightBySubject) {
    const list = Array.isArray(risk) ? risk : [];
    const limit = Math.max(0, Math.floor(cap) || 0);
    if (list.length <= limit) return list.slice();
    const wsum = Object.values(weightBySubject || {}).reduce((s, n) => s + (n || 0), 0);
    if (wsum <= 0 || !list.length) return list.slice(0, limit);

    // 과목 그룹화 — subjectKeyFromItemId 해석 불가 id는 '' 버킷 (비중 0, 최소 1 보장)
    const groups = new Map();
    for (const r of list) {
        const k = subjectKeyFromItemId(r.id) || '';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
    }
    const quota = apportionByWeight([...groups.keys()], weightBySubject, limit, 1);
    const wanted = new Set();
    for (const [k, items] of groups) {
        items.slice(0, quota[k] || 0).forEach(r => wanted.add(r));
    }
    // 수요 소진 잔여 — 전역 R_exam 오름차순으로 재충전
    let need = limit - wanted.size;
    if (need > 0) {
        for (const r of list) {
            if (!wanted.has(r)) {
                wanted.add(r);
                if (--need <= 0) break;
            }
        }
    }
    return list.filter(r => wanted.has(r));
}

/**
 * 주간 배분 입력 집계 (SC-11·SC-12) — 캘린더 칩·학습 진단 카드·주간 리포트가
 * 동일 입력을 공유하도록 raw state/레지스트리 → computeSubjectAllocation opts 변환을
 * 한 곳에 둔다. 과목 키 해석은 subjectKeyFromItemId (숫자·밑줄 키 안전).
 * @param {Object} p
 * @param {Set|Array} [p.memorizedCards] 암기 카드 id 집합
 * @param {Object} [p.quizResults] {quizId: {correct}}
 * @param {Set|Array} [p.weakCards] 헷갈림 카드 id 집합
 * @param {Array} [p.exams] registry.exams — 출제 비중 (미전달 시 균등 배분)
 * @param {Object} [p.wrongCauses] {itemId: {cause, ts, subjectId}} — 최근 30일 태그만 집계 (SC-12)
 * @param {Array} [p.weakChapterGroups] computeSubjectWeakChapters 결과 — 과목별 취약 단원 수 (SC-12)
 * @param {Array} [p.dueCardIds] getDueCards() 결과 — FSRS 기한 도래 카드 id 배열 (SC-13)
 * @param {Date|number} [p.now] 기준 시각 (테스트 주입용)
 * @returns {{memBySubject:Object, quizBySubject:Object, recentQuizBySubject:Object,
 *   weakBySubject:Object, weightBySubject:Object, diagBySubject:Object, dueBySubject:Object}}
 */
export function computeSubjectAllocInputs(p = {}) {
    /** @type {{ [x: string]: number }} */
    const mem = {};
    /** @type {{ [x: string]: { solved: number, correct: number } }} */
    const quiz = {};
    /** @type {{ [x: string]: number }} */
    const weak = {};
    /** @type {{ [x: string]: number }} */
    const weights = examWeightBySubject(p.exams);
    /** @type {{ [x: string]: number }} */
    const due = {};
    /** @type {{ [x: string]: { causes: number, weakChapters: number } }} */
    const diag = {};
    const _diag = (k) => (diag[k] = diag[k] || { causes: 0, weakChapters: 0 });
    (p.memorizedCards || []).forEach(id => {
        const k = subjectKeyFromItemId(id);
        if (k) mem[k] = (mem[k] || 0) + 1;
    });
    Object.keys(p.quizResults || {}).forEach(id => {
        const k = subjectKeyFromItemId(id);
        if (k) {
            quiz[k] = quiz[k] || { solved: 0, correct: 0 };
            quiz[k].solved++;
            const r = p.quizResults[id];
            if (r && r.correct) quiz[k].correct++;
        }
    });
    (p.weakCards || []).forEach(id => {
        const clean = id.replace(/^weak_(quiz|sim)_/, '');
        if (!clean.includes('_card_')) return; // 카드 외 항목은 카드 잔여 대비 비율 왜곡 방지
        const k = subjectKeyFromItemId(id);
        if (k) weak[k] = (weak[k] || 0) + 1;
    });
    // SC-13 FSRS 복습 대기 — 기한 도래 카드 id를 과목별로 집계
    (p.dueCardIds || []).forEach(id => {
        const k = subjectKeyFromItemId(id);
        if (k) due[k] = (due[k] || 0) + 1;
    });
    // SC-12 진단 신호 — 오답 원인 태그(최근 30일) + 과목별 취약 단원 수
    const cutoff = (p.now !== undefined ? new Date(p.now).getTime() : Date.now()) - DIAG_CAUSE_WINDOW_DAYS * 86400000;
    Object.values(p.wrongCauses || {}).forEach(c => {
        if (!c || !c.subjectId || (c.ts || 0) < cutoff) return;
        _diag(c.subjectId).causes++;
    });
    (p.weakChapterGroups || []).forEach(g => {
        if (g && g.subjectKey) _diag(g.subjectKey).weakChapters += (g.chapters || []).length;
    });
    return {
        memBySubject: mem,
        quizBySubject: quiz,
        recentQuizBySubject: recentQuizBySubject(p.quizResults || {}),
        weakBySubject: weak,
        weightBySubject: weights,
        diagBySubject: diag,
        dueBySubject: due
    };
}

/**
 * 과목별 최근 퀴즈 표본 (SC-09) — quizResults를 뒤(최신)에서 읽어
 * 과목당 최근 RECENT_QUIZ_WINDOW문까지만 집계한다. 전 기간 누적 정답률 대신
 * 현재 약점에 가까운 최근 성적을 약점 가중에 반영하기 위한 윈도우.
 * @param {Object} quizResults state.quizResults — {quizId: {solved, correct}}
 * @param {number} [limit] 과목당 표본 상한
 * @returns {Object} {subjKey: {solved, correct}}
 */
export function recentQuizBySubject(quizResults, limit = RECENT_QUIZ_WINDOW) {
    const out = {};
    const entries = Object.entries(quizResults || {});
    for (let i = entries.length - 1; i >= 0; i--) {
        const k = subjectKeyFromItemId(entries[i][0]);
        if (!k) continue;
        const o = out[k] = out[k] || { solved: 0, correct: 0 };
        if (o.solved >= limit) continue;
        o.solved++;
        if (entries[i][1] && entries[i][1].correct) o.correct++;
    }
    return out;
}

/**
 * 한 주 총량을 과목별 수요 비례로 배분 — 워터필링(잔여 상한 + 초과 재배분).
 * @param {Array} rows {remaining, weakW, weight} 과목 행
 * @param {Array<number>} remNow 주차 누적 기준 현재 잔여 (in-place 감소)
 * @param {number} total 이번 주 배정 총량
 */
function _allocWeek(rows, remNow, total) {
    const alloc = rows.map(() => 0);
    let pool = Math.max(0, total);
    for (let iter = 0; iter < rows.length && pool > 0; iter++) {
        const cand = rows.map((r, i) => {
            const cap = remNow[i] - alloc[i];
            return { i, cap, demand: cap > 0 ? cap * r.weight * r.weakW : 0 };
        }).filter(c => c.cap > 0);
        if (!cand.length) break;
        let dsum = cand.reduce((s, c) => s + c.demand, 0);
        // 수요가 전부 0(비중 미선언·잔여만 존재)이면 잔여 비례로 폴백
        if (dsum === 0) { cand.forEach(c => { c.demand = c.cap; }); dsum = cand.reduce((s, c) => s + c.demand, 0); }
        let consumed = 0;
        cand.forEach(c => {
            const give = Math.min(c.cap, Math.floor(pool * c.demand / dsum));
            alloc[c.i] += give;
            consumed += give;
        });
        pool -= consumed;
        if (consumed === 0) {
            // 모든 몫이 0이면 pool < 후보 수 — 잔량을 순환 배분해 교착 해소
            for (const c of cand) {
                if (pool <= 0) break;
                alloc[c.i] += 1;
                pool -= 1;
            }
        }
    }
    return alloc;
}

/**
 * 과목별 가중 배분 계획 (SC-08·SC-09) — 주차 총량을
 *   수요_i = 잔여_i × 출제비중_i × 약점가중_i   비례로 배분한다.
 * 약점가중 = 퀴즈 표본 ≥ MIN_ALLOC_SAMPLE 이면 (2 − 정답률) [1.0~2.0], 미만이면 1.0.
 *   최근 표본(`recentQuizBySubject`)이 임계 이상이면 누적 대신 우선 적용하고,
 *   취약 카드 비율(헷갈림 표시 ÷ 잔여)을 최대 +0.5 가산한다 — 상한 MAX_WEAK_WEIGHT.
 *   SC-13: FSRS 기한초과 복습 비율(기한 도래 ÷ 암기 수)도 최대 +0.5 가산하고,
 *   과목별 퀴즈 잔여를 카드와 동일 수요 공식으로 주차 배분한다(주차 총량 = 학습일×일일 퀴즈 목표).
 * 주차를 순차 배정해 과목 조기 완료가 다음 주 배분에 자동 반영된다.
 * @param {Object|null} plan computeStudyPlan() 결과
 * @param {Array} subjects 과목 메타 — [{key, name, stats:{cards, targetCards?, quizzes?, targetQuizzes?}}]
 * @param {Object} [opts]
 * @param {Object} [opts.memBySubject] {key: 암기 카드 수}
 * @param {Object} [opts.quizBySubject] {key: {solved, correct}} — 전 기간 누적
 * @param {Object} [opts.recentQuizBySubject] {key: {solved, correct}} — 최근 윈도우 (SC-09)
 * @param {Object} [opts.weakBySubject] {key: 취약 카드 수} — 약점 가산 (SC-09)
 * @param {Object} [opts.weightBySubject] {key: 출제 문항 수} — 미선언 시 균등
 * @param {Object} [opts.diagBySubject] {key: {causes, weakChapters}} — 진단 신호 가산 (SC-12)
 * @param {Object} [opts.dueBySubject] {key: FSRS 기한 도래 카드 수} — 복습 대기 가산 (SC-13)
 * @returns {Object|null}
 *   { weeks:[{week, range, total, quizTotal, alloc:[{key, name, cards, quizzes, remaining, quizRemaining,
 *     weakW, diagBoost, dueBoost, weightPct, weakBadge}]}],
 *     thisWeek, hasWeights }
 */
export function computeSubjectAllocation(plan, subjects, opts = {}) {
    if (!plan || !plan.weeks || !plan.weeks.length) return null;
    const list = (subjects || []).filter(s => s && s.key);
    if (!list.length) return null;
    const mem = opts.memBySubject || {};
    const quiz = opts.quizBySubject || {};
    const recent = opts.recentQuizBySubject || {};
    const weak = opts.weakBySubject || {};
    const diag = opts.diagBySubject || {};
    const due = opts.dueBySubject || {};
    const wBySubj = opts.weightBySubject || {};
    const hasWeights = Object.keys(wBySubj).length > 0;
    const weightSum = Object.values(wBySubj).reduce((s, n) => s + (n || 0), 0);
    const dailyQuizzes = (plan.goals && plan.goals.dailyQuizzes) || 0;
    const rows = list.map(s => {
        const stats = (s && s.stats) || {};
        const total = stats.targetCards > 0 ? Math.min(stats.cards || 0, stats.targetCards) : (stats.cards || 0);
        const remaining = Math.max(0, total - (mem[s.key] || 0));
        // SC-13 퀴즈 잔여 — 은행 문항(targetQuizzes 상한) 대비 미풀이 수
        const qTotal = stats.targetQuizzes > 0 ? Math.min(stats.quizzes || 0, stats.targetQuizzes) : (stats.quizzes || 0);
        const quizRemaining = Math.max(0, qTotal - ((quiz[s.key] && quiz[s.key].solved) || 0));
        // 최근 표본이 임계 이상이면 우선, 아니면 누적 표본 폴백
        const rq = recent[s.key] || { solved: 0, correct: 0 };
        const q = (rq.solved >= MIN_ALLOC_SAMPLE) ? rq : (quiz[s.key] || { solved: 0, correct: 0 });
        const quizW = (q.solved >= MIN_ALLOC_SAMPLE && q.solved > 0)
            ? Math.max(0.1, 2 - q.correct / q.solved) : 1.0;
        // 취약 카드 비율 가산 — 헷갈림 표시 카드가 잔여에서 차지하는 비중, 최대 +0.5
        const weakBoost = remaining > 0 ? Math.min(0.5, (weak[s.key] || 0) / remaining) : 0;
        // SC-12 진단 신호 가산 — 최근 오답 원인 태그·취약 단원 수 (콜드스타트 과목 반영)
        const dg = diag[s.key] || { causes: 0, weakChapters: 0 };
        const diagBoost = Math.min(MAX_DIAG_BOOST, dg.causes * 0.1 + dg.weakChapters * 0.15);
        // SC-13 복습 대기 가산 — 암기 카드 중 FSRS 기한초과 비율, 최대 +0.5
        const dueBoost = Math.min(0.5, (due[s.key] || 0) / Math.max(1, mem[s.key] || 0));
        const weight = hasWeights ? (wBySubj[s.key] || 0) : 1;
        return {
            key: s.key,
            name: s.name || s.key,
            remaining,
            quizRemaining,
            weight,
            weightPct: (hasWeights && weightSum > 0) ? Math.round(weight / weightSum * 100) : 0,
            weakW: Math.min(MAX_WEAK_WEIGHT, quizW + weakBoost + diagBoost + dueBoost),
            diagBoost,
            dueBoost,
            weakBadge: quizW > 1.15 || weakBoost >= 0.25 || diagBoost >= 0.15 || dueBoost >= 0.25
        };
    });
    const remNow = rows.map(r => r.remaining);
    const quizRemNow = rows.map(r => r.quizRemaining);
    const weeks = plan.weeks.map(w => {
        const counts = _allocWeek(rows, remNow, w.cards);
        counts.forEach((c, i) => { remNow[i] -= c; });
        // SC-13 퀴즈 배분 — 주차 총량 = 학습일 × 일일 퀴즈 목표, 카드와 동일 수요 가중
        const quizTotal = (w.studyDays || 0) * dailyQuizzes;
        const quizCounts = _allocWeek(rows, quizRemNow, quizTotal);
        quizCounts.forEach((c, i) => { quizRemNow[i] -= c; });
        return {
            week: w.week,
            range: w.range,
            total: w.cards,
            quizTotal,
            alloc: rows.map((r, i) => ({
                key: r.key, name: r.name, cards: counts[i], quizzes: quizCounts[i],
                remaining: r.remaining, quizRemaining: r.quizRemaining,
                weakW: r.weakW, diagBoost: r.diagBoost, dueBoost: r.dueBoost,
                weightPct: r.weightPct, weakBadge: r.weakBadge
            }))
        };
    });
    return { weeks, thisWeek: weeks[0], hasWeights };
}
