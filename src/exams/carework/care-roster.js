// src/exams/carework/care-roster.js — 교대 근무표 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
import { parseCsv, toCsv } from '../../content/csv-utils.js';
import { fmtDocNames } from './name-fmt.js';

export const ROSTER_SHIFTS = [
    { key: 'day', label: '주간(데이)' },
    { key: 'evening', label: '저녁(이브닝)' },
    { key: 'night', label: '야간(나이트)' },
];

/** @param {string} key */
export function shiftLabel(key) {
    return ROSTER_SHIFTS.find((/** @type {*} */ s) => s.key === key)?.label || key || '';
}

/** 날짜 목록 → 최소~최대 연속 날짜 (로컬 날짜 기준, 62일 초과 구간은 등록일만 반환) */
const _fillDates = (/** @type {string[]} */ ds) => {
    if (ds.length < 2) return ds;
    const out = [];
    const end = new Date(`${ds[ds.length - 1]}T12:00:00`);
    for (const d = new Date(`${ds[0]}T12:00:00`); d <= end && out.length <= 62; d.setDate(d.getDate() + 1))
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    return out.length > 62 ? ds : out;
};

/**
 * 배정 목록 → 날짜×근무조 격자 MD 표 — 미배정 셀은 '미배정'으로 명시
 * (목록형은 공백 근무조가 눈에 띄지 않아 격자로 전환 — 렌더 리뷰)
 * @param {Array<{date:string,shift:string,worker:string,note?:string}>} items
 */
export function buildRosterGridMd(items) {
    if (!items.length) return '';
    const cell = new Map();
    for (const r of items) {
        const k = `${r.date}|${r.shift}`;
        const w = fmtDocNames(r.worker) + (r.note ? ` · ${r.note}` : '');
        cell.set(k, cell.has(k) ? `${cell.get(k)}, ${w}` : w);
    }
    const dates = _fillDates([...new Set(items.map(x => x.date).filter(Boolean))].sort());
    const rows = dates.map(d => `| ${d} | ${ROSTER_SHIFTS.map(s => cell.get(`${d}|${s.key}`) || '미배정').join(' | ')} |`);
    return [`| 날짜 | ${ROSTER_SHIFTS.map(s => s.label).join(' | ')} |`, `|${'---|'.repeat(ROSTER_SHIFTS.length + 1)}`, ...rows].join('\n');
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
        lines.push(`  ${shiftLabel(r.shift)} — ${fmtDocNames(r.worker)}${r.note ? ' · ' + r.note : ''}`);
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
    const header = (rows[0] || []).map((/** @type {string} */ h) => h.trim());
    const idx = Object.fromEntries(ROSTER_CSV_COLS.map((/** @type {string} */ c) => [c, header.indexOf(c)]));
    if ((idx['날짜'] ?? -1) < 0 || (idx['근무자'] ?? -1) < 0) return [];
    return rows.slice(1).map(r => {
        const shiftRaw = (idx['근무조'] ?? -1) >= 0 ? r[idx['근무조'] ?? 0] : '';
        const shift = ROSTER_SHIFTS.find(s => s.key === shiftRaw || s.label === shiftRaw)?.key || 'day';
        return {
            date: r[idx['날짜'] ?? 0] || '',
            shift,
            worker: r[idx['근무자'] ?? 0] || '',
            note: (idx['메모'] ?? -1) >= 0 ? (r[idx['메모'] ?? 0] || '') : '',
        };
    }).filter(x => x.date && x.worker);
}
