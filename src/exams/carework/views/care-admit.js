// src/exams/carework/views/care-admit.js — 입소 서류 체크리스트 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { ADMIT_SECTIONS, loadChecks, toggleCheck, clearChecks, admitProgress } from '../care-admit.js';
import { docHeadHtml, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function render() {
    const host = $('adm-list');
    if (!host) return;
    const p = admitProgress();
    host.innerHTML = _sections() + `
        <div class="care-audit-progress">수납 ${p.done}/${p.total}건</div>`;
    const prog = $('adm-progress');
    if (prog) prog.textContent = `입소 서류 수납 현황: ${p.done}/${p.total}건`;
}
function _sections() {
    const c = loadChecks();
    return ADMIT_SECTIONS.map(s => `
        <div class="care-audit-sec">
            <h3>${esc(s.title)}</h3>
            ${s.items.map(i => `
                <label class="care-audit-item">
                    <input type="checkbox" data-admit="${esc(i.id)}" ${c[i.id] ? 'checked' : ''}>
                    <span>${esc(i.label)}</span>
                </label>`).join('')}
        </div>`).join('');
}

export function careAdmitReset() {
    clearChecks();
    render();
    showToast('체크를 초기화했습니다.');
}

function buildText() {
    const c = loadChecks();
    const p = admitProgress();
    const lines = ['입소 서류 체크리스트', `수납 ${p.done}/${p.total}건`, ''];
    for (const s of ADMIT_SECTIONS) {
        lines.push(`■ ${s.title}`);
        for (const i of s.items) lines.push(`  ${c[i.id] ? '[x]' : '[ ]'} ${i.label}`);
    }
    return lines.join('\n');
}

function renderPreview(t) {
    const out = $('adm-preview');
    if (out) out.innerHTML = docHeadHtml('입소 서류 체크리스트') + `<pre class="care-log-text">${esc(t)}</pre>`;
}

export function careAdmitCopy() {
    const t = buildText();
    proFeatureNotice('care_admit_export', '체크리스트 복사·내보내기');
    renderPreview(t);
    navigator.clipboard?.writeText(t).then(
        () => showToast('체크리스트를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careAdmitPrint() {
    renderPreview(buildText());
    proFeatureNotice('care_admit_export', '체크리스트 인쇄·PDF');
    window.print();
}

export function initCareAdmitView() {
    const host = $('adm-list');
    if (host && !host.dataset.wired) {
        host.dataset.wired = '1';
        host.addEventListener('change', e => {
            const id = /** @type {HTMLElement} */ (e.target).dataset?.admit;
            if (id) { toggleCheck(id); render(); }
        });
    }
    render();
    void refreshOrgName();
}
