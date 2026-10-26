// src/study-tracker-adherence.js — 계획 준수율·마일스톤 (study-tracker.js 분리)
// @spec SC-06,SC-07,SC-09
import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { localDateKey } from './utils.js';
import { getStudyCalendar } from './study-tracker-activity.js';
import { computeStudyPlan, getDDay } from './study-tracker-plan.js';

/* =======================================================
   📈 계획 준수·마일스톤 (SC-06, SC-07)
   ======================================================= */

/**
 * 로컬 날짜 문자열 반환 (YYYY-MM-DD)
 */
function _localDateStr(d) {
    return localDateKey(d);
}

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
