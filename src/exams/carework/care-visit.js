// src/exams/carework/care-visit.js — 면회·방문 기록 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 방문예약(scheduled) → 방문결과(done)/취소(canceled) 상태 전이와 면회 기록 문서 생성
import { toCsv } from '../../content/csv-utils.js';

export const RELATIONS = [
    { key: 'spouse', label: '배우자' },
    { key: 'child', label: '자녀' },
    { key: 'sibling', label: '형제자매' },
    { key: 'relative', label: '기타 친지' },
    { key: 'other', label: '기타' },
];

export const VISIT_STATUS = { scheduled: '방문 예정', done: '방문 완료', canceled: '취소' };

/** @param {string} key */
export function relationLabel(key) {
    return RELATIONS.find((/** @type {*} */ r) => r.key === key)?.label || key || '';
}

/**
 * 방문 기록 1건 → 면회 기록 문서 텍스트
 * @param {{date:string,time?:string,client:string,visitor:string,phone?:string,relation?:string,purpose?:string,status:string,result?:{date?:string,time?:string,summary?:string}|null}} v
 */
/** @param {*} v */
export function buildVisitText(v) {
    if (!v || !v.client || !v.visitor || !v.date) return '';
    const rel = relationLabel(v.relation);
    const lines = [
        `대상자: ${v.client}`,
        `방문객: ${v.visitor}${rel ? ` (${rel})` : ''}`,
        v.phone ? `연락처: ${v.phone}` : '',
        `방문 예정: ${v.date}${v.time ? ' ' + v.time : ''}`,
        v.purpose ? `목적·요청사항: ${v.purpose}` : '',
        `상태: ${(/** @type {Object.<string,string>} */ (VISIT_STATUS))[v.status] || v.status}`,
    ];
    if (v.status === 'done' && v.result) {
        lines.push(`방문 일시: ${v.result.date || v.date}${v.result.time ? ' ' + v.result.time : ''}`);
        if (v.result.summary) lines.push(`결과·특이사항: ${v.result.summary}`);
    }
    return lines.filter(Boolean).join('\n');
}

/** 방문 기록 목록 → CSV 텍스트 (UTF-8 BOM — Excel 한글 호환) */
/** @param {*[]} items */
export function visitsToCsv(items) {
    return toCsv(['방문일', '시간', '대상자', '방문객', '연락처', '관계', '목적', '상태', '결과'], items, (/** @type {*} */ v) => [
        v.date || '', v.time || '', v.client || '', v.visitor || '', v.phone || '',
        relationLabel(v.relation), v.purpose || '', (/** @type {Object.<string,string>} */ (VISIT_STATUS))[v.status] || v.status || '',
        (v.result && v.result.summary) || '',
    ]);
}
