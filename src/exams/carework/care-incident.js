// src/exams/carework/care-incident.js — 사고 보고서 도메인 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 발생경위·조치·가족 통지를 표준 사고보고 문서로 조립 — 기관 평가 증적 서식 기반
import { toCsv } from '../../content/csv-utils.js';
import { fmtDocName, fmtDocNames } from './name-fmt.js';

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

export const HOSPITAL_ACTIONS = [
    { key: 'transfer', label: '이송 (응급실 등)' },
    { key: 'visit', label: '외래 진료' },
    { key: 'declined', label: '이송·진료 거부' },
];

/** @param {string} key */
export function incidentTypeLabel(key) {
    return INCIDENT_TYPES.find(t => t.key === key)?.label || key || '';
}
/** @param {string} key */
export function severityLabel(key) {
    return SEVERITIES.find(s => s.key === key)?.label || key || '';
}
/** @param {string} key */
export function hospitalLabel(key) {
    return HOSPITAL_ACTIONS.find(h => h.key === key)?.label || key || '';
}

/** '2026-11-15T14:30' → '2026-11-15 14:30' (datetime-local 값 표기) */
const _dt = (/** @type {string} */ s) => String(s || '').replace('T', ' ');

/** 가족 통지 표기 — '미실시' 또는 '실시 — 일시 · 대상 · 방법' (구성요소 없으면 '완료') */
/** @param {*} v */
export function familyText(v) {
    if (!v || !v.familyNotified) return '미실시';
    const det = [_dt(v.familyAt), v.familyTo ? fmtDocNames(v.familyTo) : '', v.familyHow].filter(Boolean).join(' · ');
    return det ? `실시 — ${det}` : '완료';
}

/** 사고보고서 항목 스펙 — [라벨, 값 함수]. 텍스트·표·CSV가 같은 필드 정의를 공유한다 */
/** @type {[string, (v:*)=>string][]} */
const _FIELDS = [
    ['발생 일시', (/** @type {*} */ v) => `${v.date}${v.time ? ' ' + v.time : ''}`],
    ['대상자', (/** @type {*} */ v) => fmtDocName(v.client)],
    ['호실', (/** @type {*} */ v) => v.room],
    ['발생 장소', (/** @type {*} */ v) => v.place],
    ['사고 유형', (/** @type {*} */ v) => incidentTypeLabel(v.type)],
    ['중증도', (/** @type {*} */ v) => (v.severity ? severityLabel(v.severity) : '')],
    ['발생 경위', (/** @type {*} */ v) => v.desc],
    ['조치 내용', (/** @type {*} */ v) => v.action],
    ['병원 이송·진료', (/** @type {*} */ v) => (v.hospital ? hospitalLabel(v.hospital) : '해당 없음')],
    ['목격자', (/** @type {*} */ v) => (v.witness ? fmtDocNames(v.witness, true) : '')],
    ['가족 통지', familyText],
    ['보고 일시', (/** @type {*} */ v) => (v.reportAt ? _dt(v.reportAt) : '')],
    ['시설장 보고 시각', (/** @type {*} */ v) => (v.mgrTime ? _dt(v.mgrTime) : '')],
    ['재발 방지 대책', (/** @type {*} */ v) => v.prevent],
    ['경과 기록', (/** @type {*} */ v) => v.followup],
];

/** 값 있는 항목만 [라벨, 값] 쌍으로 */
/** @param {*} v */
const _incPairs = v => /** @type {string[][]} */ (
    _FIELDS.map(([label, f]) => [label, String(f(v) || '')]).filter(([, val]) => val));

/** @param {*} v */
const _incOk = v => Boolean(v && v.client && v.date && v.type);

/**
 * 사고 기록 1건 → 사고보고서 텍스트
 * @param {{date:string,time?:string,client:string,place?:string,type:string,severity?:string,desc?:string,action?:string,witness?:string,familyNotified?:boolean}} v
 */
export function buildIncidentText(v) {
    if (!_incOk(v)) return '';
    return _incPairs(v).map(([k, val]) => `${k}: ${val}`).join('\n');
}

/**
 * 사고보고서 격식표 MD — 전 항목 스칼라라 2열 표로 구성 (내보내기 표준 초안).
 * buildIncidentText(평문)와 쌍 — docx·기관 양식 블록({{보고내용}})에 삽입된다.
 * @param {*} v
 */
export function buildIncidentMd(v) {
    if (!_incOk(v)) return '';
    return ['| 항목 | 내용 |', '|---|---|', ..._incPairs(v).map(r => `| ${r[0]} | ${r[1]} |`)].join('\n');
}

/** @param {*} x */
const _e = x => x || '';

/** @param {*} v */
const _incidentCsvRow = v => [
    _e(v.date), _e(v.time), _e(v.room), _e(v.place), _e(v.client),
    incidentTypeLabel(v.type), severityLabel(_e(v.severity)),
    _e(v.desc), _e(v.action), _e(v.hospital ? hospitalLabel(v.hospital) : ''),
    _e(v.witness), familyText(v), _dt(v.reportAt), _e(v.prevent), _e(v.followup),
];

/** 사고 기록 목록 → CSV 텍스트 (UTF-8 BOM — Excel 한글 호환) */
/** @param {*[]} items */
export function incidentsToCsv(items) {
    return toCsv(['발생일', '시각', '호실', '장소', '대상자', '유형', '중증도', '경위', '조치', '이송·진료', '목격자', '가족통지', '보고일시', '재발방지', '경과'], items, _incidentCsvRow);
}
