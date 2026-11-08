// src/exams/carework/care-audit.js — 평가 체크리스트 데이터
// @spec none — 시험 전용 도메인 데이터 (DA-13)
import { getJSON, setJSON } from '../../core/storage.js';
import { todayKey } from '../../core/utils.js';
import { pushState } from './facility.js';

const KEY = 'carework_audit_checks';
let _sections = null;

export async function loadAuditSections() {
    if (_sections) return _sections;
    const res = await fetch('./content/exams/carework/실무/audit_checklist.json');
    if (!res.ok) throw new Error(`audit_checklist ${res.status}`);
    _sections = (await res.json()).sections;
    return _sections;
}

export function loadChecks() {
    const p = getJSON(KEY);
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}
export function toggleCheck(id) {
    const c = loadChecks();
    c[id] = !c[id];
    if (!c[id]) delete c[id];
    setJSON(KEY, c);
    _pushAuditDebounced(); // CO-15 write-through — 상태형은 최신 스냅샷 upsert
    return c;
}
export function clearChecks() {
    setJSON(KEY, {});
    _pushAuditDebounced();
}

// — CO-14/15: 점검 상태 서버 공유 (상태형 — 'audit_state' 단일 슬롯 upsert, 디바운스) —

let _auditTimer = null;
function _pushAuditDebounced() {
    if (_auditTimer) clearTimeout(_auditTimer);
    _auditTimer = setTimeout(() => { _auditTimer = null; void pushAuditState().catch(() => {}); }, 5000);
}

/** 현재 점검 상태를 기관 스냅샷으로 반영 — 멤버십 없으면 조용히 스킵 */
export async function pushAuditState() {
    await pushState({
        docType: 'audit', client: '', recordDate: todayKey(),
        payload: { checks: loadChecks() }, localId: 'audit_state',
    });
}
export function auditProgress(sections) {
    const c = loadChecks();
    const ids = (sections || []).flatMap(s => s.items.map(i => i.id));
    const done = ids.filter(id => c[id]).length;
    return { done, total: ids.length };
}
