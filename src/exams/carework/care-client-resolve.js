// src/exams/carework/care-client-resolve.js — 대상자 참조 ID 해석 (순수 로직, DOM·저장 비의존)
// @spec CO-01 — 시험 전용 도메인 로직 (DA-13)
// 기록 스토어의 자유텍스트 client 문자열 → 명부(carework_clients) clientId 해석
// 단일 매칭만 자동 해석 — 동명이인(다중)은 미해결로 남겨 수동 지정 유도
const _norm = (s) => String(s || '').trim();

/**
 * 이름 → clientId 해석
 * @param {string} name
 * @param {Array<{id:string,name:string}>} clients 명부 레코드
 * @returns {{id:string|null, candidates:number}} candidates>1이면 동명이인 — 자동 해석 금지
 */
export function resolveClientId(name, clients) {
    const n = _norm(name);
    if (!n) return { id: null, candidates: 0 };
    const hits = (Array.isArray(clients) ? clients : []).filter(c => _norm(c.name) === n);
    return { id: hits.length === 1 ? hits[0].id : null, candidates: hits.length };
}

/**
 * 스토어 레코드 배열에 clientId 일괄 해석 (제자리 갱신)
 * — clientId 이미 있거나 client가 없으면 건너뜀. 단일 매칭만 해석
 * @param {Array} records
 * @param {Array} clients
 * @returns {number} 새로 해석된 레코드 수 (호출부는 >0이면 1회 영속화)
 */
export function backfillClientIds(records, clients) {
    if (!Array.isArray(records) || !records.length) return 0;
    const list = Array.isArray(clients) ? clients : [];
    if (!list.length) return 0;
    let updated = 0;
    for (const r of records) {
        if (!r || r.clientId || !r.client) continue;
        const { id } = resolveClientId(r.client, list);
        if (id) { r.clientId = id; updated++; }
    }
    return updated;
}
