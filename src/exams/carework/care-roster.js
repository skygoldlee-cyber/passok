// src/exams/carework/care-roster.js — 교대 근무표 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)

export const ROSTER_SHIFTS = [
    { key: 'day', label: '주간(데이)' },
    { key: 'evening', label: '저녁(이브닝)' },
    { key: 'night', label: '야간(나이트)' },
];

export function shiftLabel(key) {
    return ROSTER_SHIFTS.find(s => s.key === key)?.label || key || '';
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
