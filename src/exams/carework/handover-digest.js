// src/exams/carework/handover-digest.js — 인수인계 이력 자동 집계 (순수 로직, DOM·저장 비의존)
// @spec CO-05 — 시험 전용 도메인 로직 (DA-13)
// 근무 일자 기준 대상자별 일지·사고·방문 수집 → 상태 요약 + 전망 인계 초안
// memo 초안은 사고·특이 이벤트만 (DOC-DSN-43 "미완료·주의만" 원칙) — 제출 전 작성자 검토 필수

/**
 * @param {string} shiftDate YYYY-MM-DD
 * @param {{logs?:Array,visits?:Array,incidents?:Array}} stores
 * @returns {{clients:string, status:string, caution:string, count:number}} 폼 채움값
 */
export function buildDigest(shiftDate, stores = {}) {
    const on = (r) => (r.date || r.shift_date || r.visit_date || r.occurred_at?.slice(0, 10)) === shiftDate;
    const logs = (stores.logs || []).filter(on);
    const incidents = (stores.incidents || []).filter(on);
    const visits = (stores.visits || []).filter(on);
    const names = [...new Set([...logs, ...incidents, ...visits].map(r => r.client).filter(Boolean))];
    if (!names.length) return { clients: '', status: '', caution: '', count: 0 };

    const status = names.map(name => {
        const acts = logs.filter(l => l.client === name)
            .flatMap(l => [l.service, l.note].filter(Boolean));
        const inc = incidents.filter(i => i.client === name);
        const parts = [...new Set(acts)];
        if (inc.length) parts.push(`사고 ${inc.length}건`);
        return `${name}: ${parts.join('·') || '기록 없음'}`;
    }).join(' / ');

    const caution = incidents.map(i => `${i.client}: ${i.type || '사고'}${i.severity ? '(' + i.severity + ')' : ''} — 경과 관찰 필요`).join('\n');

    return { clients: names.join(', '), status, caution, count: names.length };
}
