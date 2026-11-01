// src/exams/carework/views/care-audit.js — 기관 평가 체크리스트 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadAuditSections, loadChecks, toggleCheck, clearChecks, auditProgress } from '../care-audit.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _sections = [];

function render() {
    const host = $('audit-list');
    if (!host) return;
    const c = loadChecks();
    host.innerHTML = _sections.map(s => `
        <div class="care-audit-sec">
            <h3>${esc(s.title)}</h3>
            ${s.items.map(i => `
                <label class="care-audit-item">
                    <input type="checkbox" data-audit="${esc(i.id)}" ${c[i.id] ? 'checked' : ''}>
                    <span>${esc(i.text)}</span>
                    <em>${esc(i.ref)}</em>
                </label>`).join('')}
        </div>`).join('');
    const p = auditProgress(_sections);
    const bar = $('audit-progress');
    if (bar) bar.innerHTML = `<strong>점검 진행 ${esc(p.done)}/${esc(p.total)}</strong><div class="care-audit-bar"><span style="width:${esc(p.total ? Math.round(p.done / p.total * 100) : 0)}%"></span></div>`;
}

export function careAuditReset() {
    clearChecks();
    render();
}

export async function initCareAuditView() {
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
