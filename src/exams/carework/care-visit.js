// src/exams/carework/care-visit.js — 면회·방문 기록 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 방문예약(scheduled) → 방문결과(done)/취소(canceled) 상태 전이와 면회 기록 문서 생성
import { toCsv } from '../../content/csv-utils.js';
import { mdTable } from './doc-md.js';

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
        v.status === 'canceled' ? '상태: 취소' : '', // 완료는 방문 일시·결과로 표현 — 상태 줄은 취소만
    ];
    if (v.status === 'done' && v.result) {
        lines.push(`방문 일시: ${v.result.date || v.date}${v.result.time ? ' ' + v.result.time : ''}`);
        if (v.result.summary) lines.push(`결과·특이사항: ${v.result.summary}`);
    }
    return lines.filter(Boolean).join('\n');
}

/** 방문 기록 1건 → 항목별 행 표 — 일별 제출 문서 형식 (항목|내용 2열 kv). 다열 표는 목록용 Excel에 한정 */
/** @param {*} v */
export const visitKvMd = (v) => {
    const rel = relationLabel(v.relation);
    const r = v.status === 'done' ? v.result : null; // 완료 시 실제 방문 일시·결과 사용
    const rows = [
        ['방문일', `${r?.date || v.date || ''}${(r?.time || v.time) ? ' ' + (r?.time || v.time) : ''}`], ['대상자', v.client || ''],
        ['방문객', `${v.visitor || ''}${rel ? ` (${rel})` : ''}`], ['연락처', v.phone || ''],
        ['목적', v.purpose || ''],
    ];
    if (r?.summary) rows.push(['결과·특이사항', r.summary]);
    else if (v.status === 'canceled') rows.push(['결과', '취소']); // 상태는 결과로 표현
    return mdTable(['항목', '내용'], rows);
};

/** 방문 기록 목록 → CSV 텍스트 (UTF-8 BOM — Excel 한글 호환) */
/** @param {*[]} items */
export function visitsToCsv(items) {
    return toCsv(['방문일', '시간', '대상자', '방문객', '연락처', '관계', '목적', '결과'], items, (/** @type {*} */ v) => [
        v.date || '', v.time || '', v.client || '', v.visitor || '', v.phone || '',
        relationLabel(v.relation), v.purpose || '',
        (v.result && v.result.summary) || (v.status === 'canceled' ? '취소' : ''), // 상태 열 제거 — 취소는 결과 칸에 표기
    ]);
}
