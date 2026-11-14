// src/exams/carework/care-timeline.js — 대상자 이력 통합 조회 (순수 로직, DOM·저장 비의존)
// @spec CO-02 — 시험 전용 도메인 로직 (DA-13)
// clientId 우선, 미해석 레코드는 client 스냅샷 이름으로 근사 매칭
import { fmtDocName } from './name-fmt.js';
const _norm = (/** @type {*} */ s) => String(s || '').trim();
const _dateOf = (/** @type {*} */ r) => r.date || r.shift_date || r.visit_date || r.occurred_at?.slice(0, 10) || r.createdAt?.slice(0, 10) || '';
const _match = (/** @type {*} */ r, /** @type {string} */ clientId, /** @type {string} */ name) => (r.clientId ? r.clientId === clientId : _norm(r.client) === _norm(name));

/**
 * clientId 이력을 시간순 병합
 * @param {string} clientId 명부 id
 * @param {string} name 표시 스냅샷 (미해석 레코드 근사 매칭용)
 * @param {{logs?:Array<*>,visits?:Array<*>,handovers?:Array<*>,incidents?:Array<*>}} stores
 * @returns {Array<{date:string,kind:string,label:string,ref:object}>} 최신순
 */
export function clientTimeline(clientId, name, stores = {}) {
    /** @type {Array<{date:string,kind:string,label:string,ref:object}>} */
    const out = [];
    const push = (/** @type {string} */ kind, /** @type {Function} */ label) => (/** @type {*} */ r) => { if (_match(r, clientId, name)) out.push({ date: _dateOf(r), kind, label: label(r), ref: r }); };
    (stores.logs || []).forEach(push('일지', (/** @type {*} */ r) => `${r.service || '기록'}${r.note ? ' — ' + r.note : ''}`));
    (stores.visits || []).forEach(push('방문', (/** @type {*} */ r) => `${fmtDocName(r.visitor || r.visitor_name)}${r.purpose ? ' — ' + r.purpose : ''}`));
    (stores.handovers || []).forEach(push('인수인계', (/** @type {*} */ r) => (r.memo || r.text || '').slice(0, 80)));
    (stores.incidents || []).forEach(push('사고', (/** @type {*} */ r) => `${r.type || '사고'}${r.severity ? ' (' + r.severity + ')' : ''}`));
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/**
 * @param {Array<*>} timeline clientTimeline 결과
 * @returns {{count:number,lastDate:string,kinds:Object<string,number>}}
 */
export function timelineSummary(timeline) {
    const kinds = /** @type {Object<string,number>} */ ({});
    for (const t of timeline) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
    return { count: timeline.length, lastDate: timeline[0]?.date || '', kinds };
}
