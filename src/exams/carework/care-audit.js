// src/exams/carework/care-audit.js — 기관 평가 체크리스트 데이터
// @spec none — 시험 전용 도메인 데이터 (DA-13)
import { getJSON, setJSON } from '../../storage.js';

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
    return c;
}
export function clearChecks() {
    setJSON(KEY, {});
}
export function auditProgress(sections) {
    const c = loadChecks();
    const ids = (sections || []).flatMap(s => s.items.map(i => i.id));
    const done = ids.filter(id => c[id]).length;
    return { done, total: ids.length };
}
