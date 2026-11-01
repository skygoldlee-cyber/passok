// src/exams/carework/views/care-log.js — 요양일지 생성기 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { buildCareLog, SERVICE_TYPES, ACTIVITY_GROUPS } from '../care-log.js';
import { saveCareLog, listCareLogs, removeCareLog } from '../care-log-store.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};

function readForm() {
    /** @type {Object<string, string[]>} */
    const activities = {};
    for (const g of ACTIVITY_GROUPS) {
        activities[g.key] = [...document.querySelectorAll(`input[name="act-${g.key}"]:checked`)]
            .map(e => /** @type {HTMLInputElement} */ (e).value);
    }
    return {
        date: _val('log-date', ''),
        client: _val('log-client', ''),
        service: _val('log-service', 'visit-care'),
        start: _val('log-start', ''),
        end: _val('log-end', ''),
        activities,
        note: _val('log-note', ''),
    };
}

export function careLogGenerate() {
    const t = buildCareLog(readForm());
    const out = $('log-preview');
    if (!out) return;
    if (!t) { out.innerHTML = '<p class="care-calc-err">일시·대상자·급여 종류를 입력하세요.</p>'; return; }
    out.innerHTML = `<pre class="care-log-text">${esc(t)}</pre>`;
}

export function careLogCopy() {
    careLogGenerate();
    const pre = document.querySelector('#log-preview pre');
    if (!pre) { showToast('먼저 일지를 생성하세요.', 'error'); return; }
    proFeatureNotice('care_log_export', '일지 복사·내보내기');
    navigator.clipboard?.writeText(pre.textContent || '').then(
        () => showToast('일지를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careLogSave() {
    careLogGenerate();
    const f = readForm();
    const text = document.querySelector('#log-preview pre')?.textContent || '';
    if (!text) { showToast('먼저 일지를 생성하세요.', 'error'); return; }
    const r = saveCareLog({ ...f, text });
    if (r.ok) { showToast('일지를 저장했습니다.'); renderSaved(); }
}

export function careLogPrint() {
    careLogGenerate();
    if (!document.querySelector('#log-preview pre')) { showToast('먼저 일지를 생성하세요.', 'error'); return; }
    proFeatureNotice('care_log_export', '일지 인쇄·PDF');
    window.print();
}

export function careLogDelete(id) {
    if (id) { removeCareLog(id); renderSaved(); }
}

function renderSaved() {
    const host = $('log-saved');
    if (!host) return;
    const items = listCareLogs();
    host.innerHTML = items.length
        ? items.map(x => `<div class="care-log-saved-item">
            <span>${esc(x.date)} · ${esc(x.client)} · ${esc(x.service)}</span>
            <button data-click="careLogDelete" data-arg="${esc(x.id)}" class="secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">저장된 일지가 없습니다.</p>';
}

export function initCareLogView() {
    const d = /** @type {HTMLInputElement|null} */ ($('log-date'));
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
    const s = $('log-service');
    if (s && !s.children.length)
        s.innerHTML = SERVICE_TYPES.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const host = $('log-activities');
    if (host && !host.children.length)
        host.innerHTML = ACTIVITY_GROUPS.map(g => `
            <div class="care-log-group"><strong>${esc(g.label)}</strong>
            ${g.items.map(it => `<label><input type="checkbox" name="act-${g.key}" value="${esc(it)}"> ${esc(it)}</label>`).join('')}
            </div>`).join('');
    renderSaved();
}
