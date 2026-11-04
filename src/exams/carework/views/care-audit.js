// src/exams/carework/views/care-audit.js — 기관 평가 체크리스트 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadAuditSections, loadChecks, toggleCheck, clearChecks, auditProgress } from '../care-audit.js';
import { docHeadHtml, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';
import { auditCoverage } from '../care-coverage.js';
import { listClients } from '../care-client-store.js';
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listHandovers } from '../handover-store.js';
import { listIncidents } from '../incident-store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _sections = [];

function render() {
    const host = $('audit-list');
    if (!host) return;
    const c = loadChecks();
    const cov = auditCoverage({ clients: listClients(), logs: listCareLogs(), visits: listVisits(), handovers: listHandovers(), incidents: listIncidents() });
    host.innerHTML = `<p class="care-trend-warn">📋 ${esc(cov.text)}</p>` + docHeadHtml('기관 평가 체크리스트') + _sections.map(s => `
        <div class="care-audit-sec">
            <h3>${esc(s.title)}</h3>
            ${s.items.map(i => `
                <label class="care-audit-item">
                    <input type="checkbox" data-audit="${esc(i.id)}" ${c[i.id] ? 'checked' : ''}>
                    <span>${esc(i.text)}</span>
                    <em>${esc(i.ref)}</em>
                </label>`).join('')}
        </div>`).join('')
        + `<div class="care-doc-sign"><span>점검자: ______________</span><span>기관장(확인): ______________</span><span>점검일: ________</span></div>`;
    const p = auditProgress(_sections);
    const bar = $('audit-progress');
    if (bar) bar.innerHTML = `<strong>점검 진행 ${esc(p.done)}/${esc(p.total)}</strong><div class="care-audit-bar"><span style="width:${esc(p.total ? Math.round(p.done / p.total * 100) : 0)}%"></span></div>`;
}

function buildSummary() {
    const c = loadChecks();
    const lines = ['[기관 평가 체크리스트 점검표]'];
    for (const s of _sections) {
        lines.push('', '■ ' + s.title);
        for (const i of s.items) lines.push(`  ${c[i.id] ? '✔' : '□'} ${i.text} (${i.ref})`);
    }
    const p = auditProgress(_sections);
    lines.push('', `점검 진행: ${p.done}/${p.total} 항목`);
    return lines.join('\n');

}

export function careAuditCopy() {
    if (!_sections.length) { showToast('체크리스트를 불러오는 중입니다.', 'error'); return; }
    proFeatureNotice('care_audit_export', '점검표 복사·내보내기');
    navigator.clipboard?.writeText(buildSummary()).then(
        () => showToast('점검표를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careAuditPrint() {
    proFeatureNotice('care_audit_export', '점검표 인쇄·PDF');
    window.print();
}

export function careAuditReset() {
    clearChecks();
    render();
}

export async function initCareAuditView() {
    void refreshOrgName();
    try {
        _sections = await loadAuditSections();
    } catch (e) {
        const host = $('audit-list');
        if (host) host.innerHTML = '<p class="care-calc-err">체크리스트를 불러오지 못했습니다.</p>';
        return;
    }
    // 체크박스는 change 이벤트 — 컨테이너 위임
    const host = $('audit-list');
    host?.addEventListener('change', (e) => {
        const t = /** @type {HTMLInputElement|null} */ (e.target);
        if (t && t.dataset && t.dataset.audit) { toggleCheck(t.dataset.audit); render(); }
    });
    render();
}
