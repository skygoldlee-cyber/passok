// src/exams/carework/care-handover.js — 인수인계서 생성 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 교대근무 인수인계 표준 포맷 자동 조립 (DOC-DSN-42 Phase 5)

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
    lines.push(`인계자: ${in_.from} → 인수자: ${in_.to}`);
    if (in_.clients) lines.push(`대상자: ${in_.clients}`);
    lines.push('', '■ 대상자 상태');
    lines.push(`- ${(in_.status || '').trim() || '특이 변화 없음'}`);
    if (in_.logs && in_.logs.length) {
        lines.push('', '■ 당일 수행 서비스 기록');
        for (const l of in_.logs) lines.push(`- ${l}`);
    }
    lines.push('', '■ 미완료·인계 작업');
    lines.push(`- ${(in_.tasks || '').trim() || '없음'}`);
    lines.push('', '■ 특이 주의사항');
    lines.push(`- ${(in_.caution || '').trim() || '없음'}`);
    lines.push('', `인계 확인: 인계자 ${in_.from || '____'} / 인수자 ${in_.to || '____'}`);
    return lines.join('\n');
}
