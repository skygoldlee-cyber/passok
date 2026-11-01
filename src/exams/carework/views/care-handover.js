// src/exams/carework/views/care-handover.js — 인수인계서 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { buildHandover, SHIFTS } from '../care-handover.js';
import { listCareLogs, FREE_LIMIT } from '../care-log-store.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|HTMLTextAreaElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};

function todayLogs() {
    const today = new Date().toISOString().slice(0, 10);
    return listCareLogs().filter(x => x.date === today).map(x => `${x.client} — ${x.service}`);
}

export function careHandoverGenerate() {
    const t = buildHandover({
        date: _val('ho-date', ''),
        from: _val('ho-from', ''),
        to: _val('ho-to', ''),
        shift: _val('ho-shift', 'day'),
        clients: _val('ho-clients', ''),
        status: _val('ho-status', ''),
        tasks: _val('ho-tasks', ''),
        caution: _val('ho-caution', ''),
        logs: /** @type {HTMLInputElement|null} */ ($('ho-merge'))?.checked ? todayLogs() : [],
    });
    const out = $('ho-preview');
    if (!out) return;
    if (!t) { out.innerHTML = '<p class="care-calc-err">일시·인계자·인수자를 입력하세요.</p>'; return; }
    out.innerHTML = `<pre class="care-log-text">${esc(t)}</pre>`;
}

export function careHandoverCopy() {
    careHandoverGenerate();
    const pre = document.querySelector('#ho-preview pre');
    if (!pre) { showToast('먼저 인수인계서를 생성하세요.', 'error'); return; }
    navigator.clipboard?.writeText(pre.textContent || '').then(
        () => showToast('인수인계서를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careHandoverShare() {
    careHandoverGenerate();
    const pre = document.querySelector('#ho-preview pre');
    if (!pre) { showToast('먼저 인수인계서를 생성하세요.', 'error'); return; }
    proFeatureNotice('care_handover_share', '인수인계 공유');
    const text = pre.textContent || '';
    if (navigator.share) {
        navigator.share({ title: '요양보호 인수인계서', text }).catch(() => {});
    } else {
        navigator.clipboard?.writeText(text).then(() => showToast('공유 미지원 — 복사했습니다.'));
    }
}

export function careHandoverPrint() {
    careHandoverGenerate();
    if (!document.querySelector('#ho-preview pre')) { showToast('먼저 생성하세요.', 'error'); return; }
    proFeatureNotice('care_handover_share', '인수인계 인쇄');
    window.print();
}

export function initCareHandoverView() {
    const d = /** @type {HTMLInputElement|null} */ ($('ho-date'));
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
    const s = $('ho-shift');
    if (s && !s.children.length)
        s.innerHTML = SHIFTS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const n = $('ho-logcount');
    if (n) n.textContent = `오늘 저장된 일지 ${todayLogs().length}건 · 무료 저장 ${FREE_LIMIT}건 한도`;
}
