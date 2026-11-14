// src/exams/carework/care-handover.js — 인수인계서 생성 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 교대근무 인수인계 표준 포맷 자동 조립 (DOC-DSN-42 Phase 5)
import { fmtDocName, fmtDocNames } from './name-fmt.js';

export const SHIFTS = [
    { key: 'day', label: '주간' },
    { key: 'eve', label: '저녁' },
    { key: 'night', label: '야간' },
];

/**
 * @param {{date:string, from:string, to:string, shift:string, clients:string, status:string, tasks:string, caution:string, logs?:string[]}} in_
 * @returns {string|null} 인수인계 텍스트 또는 null(필수 입력 누락)
 */
export function buildHandover(in_) {
    if (!in_ || !in_.date || !in_.from || !in_.to) return null;
    const shift = SHIFTS.find(s => s.key === in_.shift)?.label || in_.shift || '';
    const lines = ['■ 요양보호 인수인계서'];
    lines.push(`일시: ${in_.date} ${shift ? `(${shift} 근무조)` : ''}`);
    lines.push(`인계자: ${fmtDocName(in_.from)} → 인수자: ${fmtDocName(in_.to)}`);
    if (in_.clients) lines.push(`대상자: ${fmtDocNames(in_.clients, true)}`);
    lines.push('', '■ 대상자 상태');
    lines.push(`- ${(in_.status || '').trim() || '특이 변화 없음'}`);
    if (in_.logs && in_.logs.length) {
        lines.push('', '■ 당일 수행 서비스 기록');
        for (const l of in_.logs) lines.push(`- ${fmtDocNames(l, true)}`);
    }
    lines.push('', '■ 미완료·인계 작업');
    lines.push(`- ${(in_.tasks || '').trim() || '없음'}`);
    lines.push('', '■ 특이 주의사항');
    lines.push(`- ${(in_.caution || '').trim() || '없음'}`);
    lines.push('', `인계 확인: 인계자 ${fmtDocName(in_.from || '____')} / 인수자 ${fmtDocName(in_.to || '____')}`);
    return lines.join('\n');
}

/**
 * 인수인계서 격식표 MD — 기본정보·인계 내용을 2열 표로 구성 (내보내기 표준 초안).
 * buildHandover(평문)와 쌍 — docx·기관 양식 블록({{인계내용}})에 삽입된다.
 * @param {*} in_
 */
export function buildHandoverMd(in_) {
    if (!in_ || !in_.date || !in_.from || !in_.to) return null;
    const shift = SHIFTS.find(s => s.key === in_.shift)?.label || in_.shift || '';
    const tbl = (/** @type {string[]} */ head, /** @type {string[][]} */ rows) =>
        ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
            ...rows.map(r => `| ${r[0]} | ${r[1]} |`)].join('\n');
    const info = /** @type {string[][]} */ ([
        ['일시', `${in_.date}${shift ? ` (${shift} 근무조)` : ''}`],
        ['인계자', fmtDocName(in_.from)],
        ['인수자', fmtDocName(in_.to)],
        ...(in_.clients ? [['대상자', fmtDocNames(in_.clients, true)]] : []),
    ]);
    const body = /** @type {string[][]} */ ([
        ['대상자 상태', (in_.status || '').trim() || '특이 변화 없음'],
        ...(in_.logs && in_.logs.length ? [['당일 수행 서비스', in_.logs.map((/** @type {string} */ l) => fmtDocNames(l, true)).join(' · ')]] : []),
        ['미완료·인계 작업', (in_.tasks || '').trim() || '없음'],
        ['특이 주의사항', (in_.caution || '').trim() || '없음'],
    ]);
    return `${tbl(['항목', '내용'], info)}\n\n${tbl(['구분', '인계 내용'], body)}`;
}
