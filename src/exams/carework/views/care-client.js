// src/exams/carework/views/care-client.js — 대상자 명부 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { listClients, addClient, removeClient } from '../care-client-store.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};
let _editId = null;

function readForm() {
    return {
        name: _val('cli-name', ''),
        room: _val('cli-room', ''),
        birth: _val('cli-birth', ''),
        allergy: _val('cli-allergy', ''),
        caution: _val('cli-caution', ''),
        phone: _val('cli-phone', ''),
        memo: _val('cli-memo', ''),
    };
}

function clearForm() {
    _editId = null;
    for (const id of ['cli-name', 'cli-room', 'cli-birth', 'cli-allergy', 'cli-caution', 'cli-phone', 'cli-memo']) {
        const el = /** @type {HTMLInputElement|null} */ ($(id));
        if (el) el.value = '';
    }
}

export function careClientSave() {
    const f = readForm();
    if (!f.name) { showToast('대상자 성명을 입력하세요.', 'error'); return; }
    const r = addClient(f, _editId || undefined);
    if (r.ok) { showToast(_editId ? '대상자 정보를 수정했습니다.' : '대상자를 등록했습니다.'); clearForm(); renderList(); }
}

export function careClientNew() { clearForm(); }

export function careClientLoad(id) {
    const c = listClients().find(x => x.id === id);
    if (!c) return;
    _editId = id;
    const set = (elId, v) => { const el = /** @type {HTMLInputElement|null} */ ($(elId)); if (el) el.value = v || ''; };
    set('cli-name', c.name); set('cli-room', c.room); set('cli-birth', c.birth);
    set('cli-allergy', c.allergy); set('cli-caution', c.caution); set('cli-phone', c.phone); set('cli-memo', c.memo);
    showToast('수정 모드 — 저장하면 덮어씁니다.');
}

export function careClientDelete(id) {
    if (id) { removeClient(id); if (_editId === id) clearForm(); renderList(); }
}

function buildListText() {
    const items = listClients();
    if (!items.length) return '';
    return '대상자 명부\n\n' + items.map(c => [
        `성명: ${c.name}`,
        c.room ? `호실·병상: ${c.room}` : '',
        c.birth ? `생년월일: ${c.birth}` : '',
        c.allergy ? `알레르기: ${c.allergy}` : '',
        c.caution ? `주의사항: ${c.caution}` : '',
        c.phone ? `비상연락처: ${c.phone}` : '',
        c.memo ? `메모: ${c.memo}` : '',
    ].filter(Boolean).join('\n')).join('\n\n────────\n\n');
}

function renderPreview(t) {
    const out = $('cli-preview');
    if (out) out.innerHTML = `<div class="care-doc-head"><strong>대상자 명부</strong><span>${esc(new Date().toISOString().slice(0, 10))} 출력</span></div><pre class="care-log-text">${esc(t)}</pre>`;
}

export function careClientExport() {
    const t = buildListText();
    if (!t) { showToast('등록된 대상자가 없습니다.', 'error'); return; }
    proFeatureNotice('care_client_share', '명부 복사·내보내기');
    renderPreview(t);
    navigator.clipboard?.writeText(t).then(
        () => showToast('명부를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careClientPrint() {
    const t = buildListText();
    if (!t) { showToast('등록된 대상자가 없습니다.', 'error'); return; }
    renderPreview(t);
    proFeatureNotice('care_client_share', '명부 인쇄·PDF');
    window.print();
}

function renderList() {
    const host = $('cli-list');
    if (!host) return;
    const items = listClients();
    host.innerHTML = items.length
        ? items.map(c => `<div class="care-log-saved-item">
            <span><strong>${esc(c.name)}</strong>${c.room ? esc(' · ' + c.room) : ''}${c.caution ? esc(' · ⚠ ' + c.caution) : ''}${c.allergy ? esc(' · 알레르기 ' + c.allergy) : ''}</span>
            <button data-click="careClientLoad" data-arg="${esc(c.id)}" class="btn btn-secondary">수정</button>
            <button data-click="careClientDelete" data-arg="${esc(c.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">등록된 대상자가 없습니다.</p>';
}

export function initCareClientView() { renderList(); }
