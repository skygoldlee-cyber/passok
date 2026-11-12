// src/exams/carework/care-roster.js — 교대 근무표 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
import { parseCsv, toCsv } from '../../content/csv-utils.js';

export const ROSTER_SHIFTS = [
    { key: 'day', label: '주간(데이)' },
    { key: 'evening', label: '저녁(이브닝)' },
    { key: 'night', label: '야간(나이트)' },
];

/** @param {string} key */
export function shiftLabel(key) {
    return ROSTER_SHIFTS.find((/** @type {*} */ s) => s.key === key)?.label || key || '';
}

/**
 * 근무 배정 목록 → 교대 근무표 텍스트 (날짜 오름차순)
 * @param {Array<{date:string,shift:string,worker:string,note?:string}>} items
 */
export function buildRosterText(items) {
    if (!items.length) return '';
    const sorted = [...items].sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));
    const lines = ['교대 근무표', ''];
    let cur = '';
    for (const r of sorted) {
        if (r.date !== cur) { cur = r.date; lines.push(`■ ${cur}`); }
        lines.push(`  ${shiftLabel(r.shift)} — ${r.worker}${r.note ? ' · ' + r.note : ''}`);
    }
    return lines.join('\n');
}

/* ---- CSV 왕복 — 헤더: 날짜,근무조,근무자,메모 ---- */

const ROSTER_CSV_COLS = ['날짜', '근무조', '근무자', '메모'];

/** 근무 배정 목록 → CSV 텍스트 (UTF-8 BOM — Excel 한글 호환) */
/** @param {*[]} items */
export function rosterToCsv(items) {
    return toCsv(ROSTER_CSV_COLS, items, (/** @type {*} */ x) => [
        x.date || '', shiftLabel(x.shift), x.worker || '', x.note || '',
    ]);
}

/**
 * CSV 텍스트 → 근무 배정 레코드 배열 (헤더 필수, 날짜·근무자 열 없으면 빈 배열).
 * 근무조는 키(day) 또는 라벨(주간(데이)) 모두 허용 — 알 수 없는 값은 'day'.
 */
/** @param {string} text */
export function csvToRoster(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];
    const header = rows[0].map((/** @type {string} */ h) => h.trim());
    const idx = Object.fromEntries(ROSTER_CSV_COLS.map((/** @type {string} */ c) => [c, header.indexOf(c)]));
    if (idx['날짜'] < 0 || idx['근무자'] < 0) return [];
    return rows.slice(1).map(r => {
        const shiftRaw = idx['근무조'] >= 0 ? r[idx['근무조']] : '';
        const shift = ROSTER_SHIFTS.find(s => s.key === shiftRaw || s.label === shiftRaw)?.key || 'day';
        return {
            date: r[idx['날짜']] || '',
            shift,
            worker: r[idx['근무자']] || '',
            note: idx['메모'] >= 0 ? (r[idx['메모']] || '') : '',
        };
    }).filter(x => x.date && x.worker);
}
