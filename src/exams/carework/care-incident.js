// src/exams/carework/care-incident.js — 사고 보고서 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 발생경위·조치·가족 통지를 표준 사고보고 문서로 조립 — 기관 평가 증적 서식 기반
import { toCsv } from '../../content/csv-utils.js';

export const INCIDENT_TYPES = [
    { key: 'fall', label: '낙상' },
    { key: 'pressure', label: '욕창' },
    { key: 'medication', label: '약물 관련' },
    { key: 'injury', label: '외상·부상' },
    { key: 'missing', label: '배회·실종' },
    { key: 'other', label: '기타' },
];

export const SEVERITIES = [
    { key: 'minor', label: '경미 (관찰 필요)' },
    { key: 'moderate', label: '중간 (의료 조치)' },
    { key: 'severe', label: '중증 (응급 이송)' },
];

/** @param {string} key */
/** @param {string} key */
export function incidentTypeLabel(key) {
    return INCIDENT_TYPES.find(t => t.key === key)?.label || key || '';
}
/** @param {string} key */
export function severityLabel(key) {
    return SEVERITIES.find(s => s.key === key)?.label || key || '';
}

/**
 * 사고 기록 1건 → 사고보고서 텍스트
 * @param {{date:string,time?:string,client:string,place?:string,type:string,severity?:string,desc?:string,action?:string,witness?:string,familyNotified?:boolean}} v
 */
/** @param {*} v */
export function buildIncidentText(v) {
    if (!v || !v.client || !v.date || !v.type) return '';
    const lines = [
        `발생 일시: ${v.date}${v.time ? ' ' + v.time : ''}`,
        `대상자: ${v.client}`,
        v.place ? `발생 장소: ${v.place}` : '',
        `사고 유형: ${incidentTypeLabel(v.type)}`,
        v.severity ? `중증도: ${severityLabel(v.severity)}` : '',
        v.desc ? `발생 경위: ${v.desc}` : '',
        v.action ? `조치 내용: ${v.action}` : '',
        v.witness ? `목격자: ${v.witness}` : '',
        `가족 통지: ${v.familyNotified ? '완료' : '미완료'}`,
    ];
    return lines.filter(Boolean).join('\n');
}

/**
 * 사고보고서 격식표 MD — 전 항목 스칼라라 2열 표로 구성 (내보내기 표준 초안).
 * buildIncidentText(평문)와 쌍 — docx·기관 양식 블록({{보고내용}})에 삽입된다.
 * @param {*} v
 */
export function buildIncidentMd(v) {
    if (!v || !v.client || !v.date || !v.type) return '';
    const rows = /** @type {string[][]} */ ([
        ['발생 일시', `${v.date}${v.time ? ' ' + v.time : ''}`],
        ['대상자', v.client],
        ...(v.place ? [['발생 장소', v.place]] : []),
        ['사고 유형', incidentTypeLabel(v.type)],
        ...(v.severity ? [['중증도', severityLabel(v.severity)]] : []),
        ...(v.desc ? [['발생 경위', v.desc]] : []),
        ...(v.action ? [['조치 내용', v.action]] : []),
        ...(v.witness ? [['목격자', v.witness]] : []),
        ['가족 통지', v.familyNotified ? '완료' : '미완료'],
    ]);
    return ['| 항목 | 내용 |', '|---|---|', ...rows.map(r => `| ${r[0]} | ${r[1]} |`)].join('\n');
}

/** 사고 기록 목록 → CSV 텍스트 (UTF-8 BOM — Excel 한글 호환) */
/** @param {*[]} items */
/** @param {*[]} items */
export function incidentsToCsv(items) {
    return toCsv(['발생일', '시각', '장소', '대상자', '유형', '중증도', '경위', '조치', '목격자', '가족통지'], items, (/** @type {*} */ v) => [
        v.date || '', v.time || '', v.place || '', v.client || '',
        incidentTypeLabel(v.type), v.severity ? severityLabel(v.severity) : '',
        v.desc || '', v.action || '', v.witness || '', v.familyNotified ? '완료' : '미완료',
    ]);
}
