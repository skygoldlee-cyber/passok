// src/exams/carework/views/care-handover.js — 인수인계서 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { buildHandover, SHIFTS } from '../care-handover.js';
import { markFunnel } from '../care-funnel.js';
import { listCareLogs, FREE_LIMIT } from '../care-log-store.js';
import { saveHandover, listHandovers, deleteHandover } from '../handover-store.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { buildDigest } from '../handover-digest.js';
import { listVisits } from '../care-visit-store.js';
import { listIncidents } from '../incident-store.js';
import { myMembership, submitHandover, listHandovers as listFacilityHandovers, ackHandover, docHeadHtml, docSignHtml, getDocSign, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _lastText = null;
let _lastSaved = false;
let _facility = null;
let _fhList = [];
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|HTMLTextAreaElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};

function todayLogs() {
    const today = new Date().toISOString().slice(0, 10);
    return listCareLogs().filter(x => x.date === today).map(x => `${x.client} — ${x.service}`);
}

/** CO-05 오늘 기록으로 채우기 — 근무 일자의 일지·사고·방문을 대상자별로 집계해 폼 초안 반영 (작성자 검토 후 저장) */
export function careHandoverDigest() {
    const date = _val('ho-date', new Date().toISOString().slice(0, 10));
    const d = buildDigest(date, { logs: listCareLogs(), visits: listVisits(), incidents: listIncidents() });
    if (!d.count) { showToast(`${date} 집계할 기록이 없습니다.`, 'error'); return; }
    const set = (id, v) => { const el = /** @type {HTMLInputElement|null} */ ($(id)); if (el && v) el.value = v; };
    set('ho-clients', d.clients);
    set('ho-status', d.status);
    set('ho-caution', d.caution);
    showToast(`${d.count}명의 기록을 반영했습니다 — 검토 후 생성하세요.`);
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
    _lastText = t; _lastSaved = false;
    out.innerHTML = docHeadHtml('인수인계서') + `<pre class="care-log-text">${esc(t)}</pre>` + docSignHtml([['인계자(서명)', 'author'], ['인수자(서명)', 'receiver'], ['확인일', '']]);
    renderSaved();
}

function renderSaved() {
    const host = $('ho-saved');
    if (!host) return;
    const items = listHandovers();
    host.innerHTML = items.length
        ? items.map(x => `<div class="care-log-saved-item"><span>${esc(x.savedAt)} · ${esc(x.from || '')} → ${esc(x.to || '')}</span><button data-click="careHandoverDelete" data-arg="${esc(x.id)}" class="btn btn-secondary">삭제</button></div>`).join('')
        : '<p class="care-log-empty">저장된 인수인계 없음 — 공유 전 저장이 필요합니다.</p>';
}

export function careHandoverSave() {
    careHandoverGenerate();
    if (!_lastText) { showToast('먼저 인수인계서를 생성하세요.', 'error'); return; }
    const r = saveHandover(_lastText, {
        from: _val('ho-from', ''), to: _val('ho-to', ''), date: _val('ho-date', ''),
    });
    if (r.error) { showToast(r.error, 'error'); proFeatureNotice('care_handover_save', '인수인계 저장'); return; }
    _lastSaved = true;
    showToast('기록에 저장했습니다 — 공유가 활성화됩니다.');
    renderSaved();
}

export function careHandoverDelete(id) {
    if (!id) return;
    deleteHandover(id);
    renderSaved();
}

function canShare() {
    if (_lastText && _lastSaved) return true;
    showToast('공유 전에 기록으로 먼저 저장하세요.', 'error');
    return false;
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
    if (!canShare()) return;
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
    if (!canShare()) return;
    proFeatureNotice('care_handover_share', '인수인계 인쇄');
    window.print();
}

async function renderFacility() {
    const host = $('ho-facility');
    if (!host) return;
    _facility = _facility === undefined ? null : _facility;
    if (!_facility) {
        try { _facility = (await myMembership())?.facilities || null; } catch (e) { _facility = null; }
    }
    if (!_facility) return;
    try { _fhList = await listFacilityHandovers(_facility.id, { limit: 10 }); } catch (e) { _fhList = []; }
    host.innerHTML = `
        <div class="care-audit-sec">
            <h3>기관 인계 — ${esc(_facility.name)}</h3>
            <button data-click="careFacilityHandoverSubmit">기관에 인계</button>
            ${_fhList.map(h => `
                <div class="care-log-saved-item">
                    <span>${esc(h.shift_date)} · ${esc(h.client)} — ${esc(h.memo || '')}</span>
                    <em>${esc(h.handover_acks?.length || 0)}명 인수</em>
                    <button data-click="careHandoverAck" data-arg="${esc(h.id)}" class="btn btn-secondary">인수 확인</button>
                </div>`).join('')}
        </div>`;
}

export async function careFacilityHandoverSubmit() {
    if (!_facility) return;
    proFeatureNotice('care_handover_save', '기관 인계');
    const r = await submitHandover({
        facilityId: _facility.id,
        ...clientField('ho-clients'),
        shiftDate: _val('ho-date', new Date().toISOString().slice(0, 10)),
        memo: `${_val('ho-status', '')} ${_val('ho-tasks', '')} ${_val('ho-caution', '')}`.trim(),
    });
    'error' in r ? showToast('인계 실패: ' + r.error, 'error') : showToast('기관에 인계했습니다.');
    renderFacility();
}

export async function careHandoverAck(handoverId) {
    const r = await ackHandover(handoverId);
    r.error ? showToast('인수 확인 실패: ' + r.error, 'error') : showToast('인수 확인했습니다.');
    renderFacility();
}

export function initCareHandoverView() {
    markFunnel('tool:care-handover');
    attachClientPicker(/** @type {HTMLInputElement|null} */ ($('ho-clients')));
    const d = /** @type {HTMLInputElement|null} */ ($('ho-date'));
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
    const s = $('ho-shift');
    if (s && !s.children.length)
        s.innerHTML = SHIFTS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const n = $('ho-logcount');
    if (n) n.textContent = `오늘 저장된 일지 ${todayLogs().length}건 · 무료 저장 ${FREE_LIMIT}건 한도`;
    // 홈 서명 설정의 작성자·인수자를 폼 기본값으로 — 문서 서명란과 폼 값 일치
    const sign = getDocSign();
    const fromEl = /** @type {HTMLInputElement|null} */ ($('ho-from'));
    if (fromEl && !fromEl.value) fromEl.value = sign.author;
    const toEl = /** @type {HTMLInputElement|null} */ ($('ho-to'));
    if (toEl && !toEl.value) toEl.value = sign.receiver;
    renderSaved();
    void renderFacility();
    void refreshOrgName();
}
