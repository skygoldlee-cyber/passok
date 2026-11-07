// src/exams/carework/views/care-audit.js — 기관 평가 체크리스트 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadAuditSections, loadChecks, toggleCheck, clearChecks, auditProgress, pushAuditState } from '../care-audit.js';
import { docHeadHtml, docSignHtml, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { auditCoverage } from '../care-coverage.js';
import { listClients } from '../care-client-store.js';
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listHandovers } from '../handover-store.js';
import { listIncidents } from '../incident-store.js';
import { docMdHead, mdTable, mdToHtml, docMdSign } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
export { careShare } from '../care-share.js';

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
        + docSignHtml([['점검자', 'author'], ['기관장(확인)', 'confirmer'], ['점검일', '']]);
    const p = auditProgress(_sections);
    const bar = $('audit-progress');
    if (bar) bar.innerHTML = `<strong>점검 진행 ${esc(p.done)}/${esc(p.total)}</strong><div class="care-audit-bar"><span style="width:${esc(p.total ? Math.round(p.done / p.total * 100) : 0)}%"></span></div>`;
    // 문서 미리보기 — 본문 복사·PDF의 원본 (체크박스 DOM은 ✔/□ 상태를 텍스트로 담지 못해 요약을 렌더)
    const pv = $('audit-preview');
    if (pv) pv.innerHTML = mdToHtml(careAuditDocMd());
}

/** 점검표 MD 초안 — 섹션별 항목을 표 구조로 (docx 파생·미리보기·본문 복사 공통 원본) */
export function careAuditDocMd() {
    if (!_sections.length) return '';
    const c = loadChecks();
    const rows = _sections.flatMap(s => s.items.map(i => [s.title, c[i.id] ? '✔' : '□', i.text, i.ref]));
    return docMdHead('기관 평가 점검표') + '\n' + renderToolBody('careAudit', { 점검표: mdTable(['영역', '점검', '항목', '근거'], rows) }) + docMdSign([['점검자', 'author'], ['기관장(확인)', 'confirmer']]);
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
    void pushAuditState();
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
