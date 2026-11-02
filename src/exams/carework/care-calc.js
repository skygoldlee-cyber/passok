// src/exams/carework/care-calc.js — 장기요양 비용 계산 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
import { GRADE_LIMITS, SELF_PAY_RATE, REDUCTIONS } from './care-calc-data.js';

/** 월 한도 초과분을 전액 자부담으로 처리하는 재가급여 계산 */
function calcHome(gradeKey, monthlyUse, reductionRate) {
    const g = GRADE_LIMITS.find(x => x.key === gradeKey);
    if (!g || monthlyUse < 0) return null;
    const covered = Math.min(monthlyUse, g.home);
    const overLimit = Math.max(0, monthlyUse - g.home);
    const selfCovered = Math.round(covered * SELF_PAY_RATE.home * (1 - reductionRate));
    const selfPay = selfCovered + overLimit;
    return { covered, overLimit, selfCovered, selfPay, publicPay: covered - selfCovered, limit: g.home, type: 'home' };
}

/** 시설급여 — 한도 없이 급여비용의 20% 본인부담 + 비급여(식재료비·상급침실료 등) 전액 자부담 */
function calcFacility(monthlyUse, reductionRate, nonCovered) {
    if (monthlyUse < 0 || nonCovered < 0) return null;
    const selfCovered = Math.round(monthlyUse * SELF_PAY_RATE.facility * (1 - reductionRate));
    const selfPay = selfCovered + nonCovered;
    return { covered: monthlyUse, overLimit: 0, selfCovered, nonCovered, selfPay, publicPay: monthlyUse - selfCovered, limit: null, type: 'facility' };
}

/**
 * @param {{type:string, grade:string, monthlyUse:number, reduction:string, nonCovered?:number}} in_
 * @returns 계산 결과 또는 null(입력 오류)
 */
export function computeCareCost({ type, grade, monthlyUse, reduction, nonCovered = 0 }) {
    const r = REDUCTIONS.find(x => x.key === reduction);
    if (!r || typeof monthlyUse !== 'number' || !isFinite(monthlyUse)) return null;
    if (type === 'home') return calcHome(grade, monthlyUse, r.rate);
    if (type === 'facility') return calcFacility(monthlyUse, r.rate, nonCovered);
    return null;
}

export function formatWon(n) {
    return n == null ? '' : n.toLocaleString('ko-KR') + '원';
}
