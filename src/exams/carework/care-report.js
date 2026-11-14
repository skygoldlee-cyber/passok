// src/exams/carework/care-report.js
// @spec CO-09 — 보호자 주간 리포트 (대상자 주간 기록 요약 텍스트)
import { localDateKey } from '../../core/utils.js';
import { fmtDocName } from './name-fmt.js';
/** 최근 7일 기록을 대상자별 요약 텍스트로 — clientId 우선·스냅샷 근사
 * @param {string} name
 * @param {{logs?: any[], visits?: any[], incidents?: any[]}} stores
 * @param {number} [sinceDays]
 */
/** @param {string} name @param {{logs?:*[], visits?:*[], incidents?:*[]}} [o] @param {number} [sinceDays] */
export function weeklyReport(name, { logs = [], visits = [], incidents = [] } = {}, sinceDays = 7) {
    const since = localDateKey(new Date(Date.now() - sinceDays * 864e5));
    const match = (/** @type {*} */ r) => (r.date || '') >= since && (r.clientId === name || r.client === name);
    const L = logs.filter(match), V = visits.filter(match), I = incidents.filter(match);
    const meals = L.map((/** @type {*} */ l) => l.obs?.meal).filter(Boolean);
    const trend = meals.length >= 2 ? `식사량 ${meals.join(' → ')}` : '';
    const notes = [...L.map((/** @type {*} */ l) => l.note), ...V.map((/** @type {*} */ v) => v.summary || v.result)].filter(Boolean).slice(-5);
    const lines = [
        `[보호자 주간 리포트] ${fmtDocName(name)} · ${since} ~ 오늘`,
        `일지 ${L.length}건 · 방문 ${V.length}건 · 사고 ${I.length}건`,
        trend && `관찰: ${trend}`,
        I.length ? `⚠ 사고 ${I.length}건 발생 — 상세는 기록 참조` : '',
        notes.length ? `주요 기록:\n${notes.map(n => `· ${n}`).join('\n')}` : '',
    ].filter(Boolean);
    return { count: L.length + V.length + I.length, text: lines.join('\n\n') };
}
