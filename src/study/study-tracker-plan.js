// src/study-tracker-plan.js — 시험일/D-day·역산 학습 계획 (study-tracker.js 분리)
// @spec SC-05,SC-15,SC-16,D-17
import { safeGetItem, safeSetItem } from '../state.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { getMinExamLeadDays, getReadThroughDays, getReadDayShare, getActiveSubjectCount } from '../exam-context.js';
import { getStudyGoals } from './study-tracker-activity.js';

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
