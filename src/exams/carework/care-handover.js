// src/exams/carework/care-handover.js — 인수인계서 생성 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 교대근무 인수인계 표준 포맷 자동 조립 (DOC-DSN-42 Phase 5)
import { fmtDocName, fmtDocNames } from './name-fmt.js';
import { SERVICE_TYPES } from './care-log.js';

export const SHIFTS = [
    { key: 'day', label: '주간' },
    { key: 'eve', label: '저녁' },
    { key: 'night', label: '야간' },
];

/** 급여 유형 키·라벨 해석 — 저장 일지의 service는 키('visit-care')라 표기는 라벨로 */
/** @param {string} key */
export const serviceLabel = key => SERVICE_TYPES.find((/** @type {*} */ s) => s.key === key)?.label || key || '';

/** @param {string} k */
const _shiftLabel = k => SHIFTS.find((/** @type {*} */ s) => s.key === k)?.label || k || '';

/** 일시 표기 — 'YYYY-MM-DD (주간 근무조 07:00~15:00) · 방문요양' */
/** @param {*} in_ */
const _shiftText = in_ => {
    const shift = _shiftLabel(in_.shift || '');
    const svc = serviceLabel(in_.service || '');
    const st = shift ? `(${shift} 근무조${in_.shiftTime ? ` ${in_.shiftTime}` : ''})` : '';
    return `${in_.date} ${st}${svc ? ` · ${svc}` : ''}`;
};

/** @param {*} in_ */
const _reqOk = in_ => Boolean(in_ && in_.date && in_.from && in_.to);

/** 빈 입력 대체 — '  ' → 기본 문구 */
/** @param {string} s @param {string} d */
const _or = (s, d) => (s || '').trim() || d;

/**
 * @param {{date:string, from:string, to:string, shift:string, shiftTime?:string, service?:string, clients:string, status:string, tasks:string, caution:string, logs?:string[]}} in_
 * @returns {string|null} 인수인계 텍스트 또는 null(필수 입력 누락)
 */
export function buildHandover(in_) {
    if (!_reqOk(in_)) return null;
    const lines = ['■ 요양보호 인수인계서'];
    lines.push(`일시: ${_shiftText(in_)}`);
    lines.push(`인계자: ${fmtDocName(in_.from)} → 인수자: ${fmtDocName(in_.to)}`);
    if (in_.clients) lines.push(`대상자: ${fmtDocNames(in_.clients, true)}`);
    lines.push('', '■ 대상자 상태');
    lines.push(`- ${_or(in_.status, '특이 변화 없음')}`);
    if (in_.logs && in_.logs.length) {
        lines.push('', '■ 당일 수행 서비스 기록');
        for (const l of in_.logs) lines.push(`- ${fmtDocNames(l, true)}`);
    }
    lines.push('', '■ 미완료·인계 작업');
    lines.push(`- ${_or(in_.tasks, '없음')}`);
    lines.push('', '■ 특이 주의사항');
    lines.push(`- ${_or(in_.caution, '없음')}`);
    lines.push('', `인계 확인: 인계자 ${fmtDocName(in_.from || '____')} / 인수자 ${fmtDocName(in_.to || '____')}`);
    return lines.join('\n');
}

/** 기본정보 표 행 — 일시·급여 유형·인계/인수자·대상자 */
/** @param {*} in_ */
const _hoInfoRows = in_ => /** @type {string[][]} */ ([
    ['일시', _shiftText(in_)],
    ...(serviceLabel(in_.service || '') ? [['급여 유형', serviceLabel(in_.service || '')]] : []),
    ['인계자', fmtDocName(in_.from)],
    ['인수자', fmtDocName(in_.to)],
    ...(in_.clients ? [['대상자', fmtDocNames(in_.clients, true)]] : []),
]);

/** 인계 내용 표 행 — 상태·당일 서비스·미완료 작업·주의사항 */
/** @param {*} in_ */
const _hoBodyRows = in_ => /** @type {string[][]} */ ([
    ['대상자 상태', _or(in_.status, '특이 변화 없음')],
    ...(in_.logs && in_.logs.length ? [['당일 수행 서비스', in_.logs.map((/** @type {string} */ l) => fmtDocNames(l, true)).join(' · ')]] : []),
    ['미완료·인계 작업', _or(in_.tasks, '없음')],
    ['특이 주의사항', _or(in_.caution, '없음')],
]);

/** @param {string[]} head @param {string[][]} rows */
const _kvTbl = (head, rows) =>
    ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
        ...rows.map(r => `| ${r[0]} | ${r[1]} |`)].join('\n');

/**
 * 인수인계서 격식표 MD — 기본정보·인계 내용을 2열 표로 구성 (내보내기 표준 초안).
 * buildHandover(평문)와 쌍 — docx·기관 양식 블록({{인계내용}})에 삽입된다.
 * @param {*} in_
 */
export function buildHandoverMd(in_) {
    if (!_reqOk(in_)) return null;
    return `${_kvTbl(['항목', '내용'], _hoInfoRows(in_))}\n\n${_kvTbl(['구분', '인계 내용'], _hoBodyRows(in_))}`;
}
