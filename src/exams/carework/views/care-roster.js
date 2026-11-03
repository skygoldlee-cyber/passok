// src/exams/carework/views/care-roster.js — 교대 근무표 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { ROSTER_SHIFTS, shiftLabel, buildRosterText } from '../care-roster.js';
import { listRoster, saveRoster, removeRoster } from '../roster-store.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { docHeadHtml, refreshOrgName } from '../facility.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};

function readForm() {
    return {
        date: _val('ros-date', ''),
        shift: _val('ros-shift', 'day'),
        worker: _val('ros-worker', ''),
        note: _val('ros-note', ''),
    };
}

export function careRosterAdd() {
    const f = readForm();
    if (!f.date || !f.worker) { showToast('근무일·근무자를 입력하세요.', 'error'); return; }
    const r = saveRoster(f);
    if (r.ok) { showToast('근무 배정을 등록했습니다.'); renderList(); }
}

export function careRosterDelete(id) {
    if (id) { removeRoster(id); renderList(); }
}

function renderPreview(t) {
    const out = $('ros-preview');
    if (out) out.innerHTML = docHeadHtml('교대 근무표') + `<pre class="care-log-text">${esc(t)}</pre>`;
}

export function careRosterExport() {
    const t = buildRosterText(listRoster());
    if (!t) { showToast('등록된 근무 배정이 없습니다.', 'error'); return; }
    proFeatureNotice('care_roster_share', '근무표 복사·내보내기');
    renderPreview(t);
    navigator.clipboard?.writeText(t).then(
        () => showToast('근무표를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careRosterPrint() {
    const t = buildRosterText(listRoster());
    if (!t) { showToast('인쇄할 근무 배정이 없습니다.', 'error'); return; }
    renderPreview(t);
    proFeatureNotice('care_roster_share', '근무표 인쇄·PDF');
    window.print();
}

function renderList() {
    const host = $('ros-list');
    if (!host) return;
    const items = [...listRoster()].sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));
    host.innerHTML = items.length
        ? items.map(x => `<div class="care-log-saved-item">
            <span>${esc(x.date)} · ${esc(shiftLabel(x.shift))} — ${esc(x.worker)}${x.note ? esc(' · ' + x.note) : ''}</span>
            <button data-click="careRosterDelete" data-arg="${esc(x.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">등록된 근무 배정이 없습니다.</p>';
}

export function initCareRosterView() {
    const d = /** @type {HTMLInputElement|null} */ ($('ros-date'));
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
    const s = $('ros-shift');
    if (s && !s.children.length)
        s.innerHTML = ROSTER_SHIFTS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    renderList();
    void refreshOrgName();
}
