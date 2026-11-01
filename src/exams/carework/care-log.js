// src/exams/carework/care-log.js — 요양일지·서비스기록지 생성 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 제공기준 고시 기록 항목 기반 표준 일지 텍스트 자동 조립 (DOC-DSN-42 Phase 3)

export const SERVICE_TYPES = [
    { key: 'visit-care', label: '방문요양' },
    { key: 'visit-bath', label: '방문목욕' },
    { key: 'visit-nurse', label: '방문간호 보조' },
    { key: 'daycare', label: '주야간보호' },
    { key: 'shortstay', label: '단기보호' },
];

export const ACTIVITY_GROUPS = [
    { key: 'physical', label: '신체활동 지원', items: ['세면·목욕', '식사 보조', '배설·의복', '체위 변경', '이동·보행'] },
    { key: 'household', label: '가사·일상생활 지원', items: ['청소·정리', '세탁', '식사 준비', '외출·물품구매 동행'] },
    { key: 'cognitive', label: '정서·인지 지원', items: ['말벗·정서 지원', '인지활동·여가', '상태 관찰'] },
];

/** @param {{date:string, client:string, service:string, start:string, end:string, activities:Object<string,string[]>, note:string}} in_ */
export function buildCareLog(in_) {
    if (!in_ || !in_.date || !in_.client || !in_.service) return null;
    const svc = SERVICE_TYPES.find(s => s.key === in_.service)?.label || in_.service;
    const lines = ['■ 요양보호 서비스 기록'];
    lines.push(`일시: ${in_.date}${in_.start ? ` ${in_.start}~${in_.end || ''}` : ''}`);
    lines.push(`대상자: ${in_.client} 님`);
    lines.push(`급여 종류: ${svc}`);
    lines.push('', '■ 제공 서비스 내용');
    const acts = in_.activities || {};
    for (const g of ACTIVITY_GROUPS) {
        const sel = (acts[g.key] || []).filter(Boolean);
        if (sel.length) lines.push(`[${g.label}] ${sel.join(' · ')}`);
    }
    lines.push('', '■ 특이사항');
    lines.push(`- ${(in_.note || '').trim() || '특이사항 없음'}`);
    lines.push('', '제공자: 요양보호사 ____________');
    return lines.join('\n');
}
