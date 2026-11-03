// src/exams/carework/views/care-visit.js — 면회·방문 기록 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { RELATIONS, VISIT_STATUS, relationLabel, buildVisitText } from '../care-visit.js';
import { listVisits, saveVisit, updateVisit, removeVisit } from '../care-visit-store.js';
import { myMembership, submitVisit, listVisits as listFacilityVisits, updateVisitResult, docHeadHtml, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};
let _facility = null;
let _fvList = [];
let _resultTarget = null; // {scope:'local'|'facility', id}

function readForm() {
    return {
        date: _val('vis-date', ''),
        time: _val('vis-time', ''),
        client: _val('vis-client', ''),
        visitor: _val('vis-visitor', ''),
        phone: _val('vis-phone', ''),
        relation: _val('vis-relation', ''),
        purpose: _val('vis-purpose', ''),
    };
}

export function careVisitAdd() {
    const f = readForm();
    if (!f.date || !f.client || !f.visitor) { showToast('방문일·대상자·방문객을 입력하세요.', 'error'); return; }
    const r = saveVisit(f);
    if (r.ok) { showToast('방문예약을 등록했습니다.'); renderLists(); }
}

export function careVisitResultOpen(arg) {
    const [scope, id] = String(arg || '').split(':');
    if (!id) return;
    _resultTarget = { scope, id };
    const panel = $('vis-result-panel');
    if (!panel) return;
    const head = $('vis-result-for');
    const src = scope === 'fac'
        ? _fvList.find(v => v.id === id)
        : listVisits().find(v => v.id === id);
    if (head && src) head.textContent = `${src.client} ← ${src.visitor_name || src.visitor}`;
    const d = /** @type {HTMLInputElement|null} */ ($('vis-result-date'));
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
    panel.classList.remove('is-hidden');
    panel.scrollIntoView?.({ block: 'nearest' });
}

export function careVisitResultClose() {
    _resultTarget = null;
    $('vis-result-panel')?.classList.add('is-hidden');
}

export async function careVisitResultSave() {
    if (!_resultTarget) { showToast('결과를 기록할 예약을 먼저 선택하세요.', 'error'); return; }
    const result = {
        date: _val('vis-result-date', ''),
        time: _val('vis-result-time', ''),
        summary: _val('vis-result-summary', ''),
    };
    if (!result.date) { showToast('방문일을 입력하세요.', 'error'); return; }
    const t = _resultTarget;
    if (t.scope === 'fac') {
        const r = await updateVisitResult(t.id, { status: 'done', result });
        if (r.error) { showToast('기록 실패: ' + r.error, 'error'); return; }
        showToast('기관 면회 대장에 결과를 등록했습니다.');
        void renderFacility();
    } else {
        updateVisit(t.id, { status: 'done', result });
        showToast('방문결과를 기록했습니다.');
        renderLists();
    }
    careVisitResultClose();
}

export async function careVisitCancel(arg) {
    const [scope, id] = String(arg || '').split(':');
    if (!id) return;
    if (scope === 'fac') {
        const r = await updateVisitResult(id, { status: 'canceled' });
        r.error ? showToast('취소 실패: ' + r.error, 'error') : showToast('예약을 취소했습니다.');
        void renderFacility();
    } else {
        updateVisit(id, { status: 'canceled' });
        renderLists();
    }
}

export function careVisitDelete(id) {
    if (id) { removeVisit(id); renderLists(); }
}

function buildAllText() {
    const items = listVisits();
    if (!items.length) return '';
    return '면회·방문 기록\n\n' + items.map(buildVisitText).filter(Boolean).join('\n\n────────\n\n');
}

function renderPreview(t) {
    const out = $('vis-preview');
    if (out) out.innerHTML = docHeadHtml('면회·방문 기록') + `<pre class="care-log-text">${esc(t)}</pre>`;
}

export function careVisitExport() {
    const t = buildAllText();
    if (!t) { showToast('내보낼 방문 기록이 없습니다.', 'error'); return; }
    proFeatureNotice('care_visit_share', '방문기록 복사·내보내기');
    renderPreview(t);
    navigator.clipboard?.writeText(t).then(
        () => showToast('기록을 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careVisitPrint() {
    const t = buildAllText();
    if (!t) { showToast('인쇄할 방문 기록이 없습니다.', 'error'); return; }
    renderPreview(t);
    proFeatureNotice('care_visit_share', '방문기록 인쇄·PDF');
    window.print();
}

function renderLists() {
    const items = listVisits();
    const sched = $('vis-scheduled');
    if (sched) {
        const rows = items.filter(v => v.status === 'scheduled');
        sched.innerHTML = rows.length
            ? rows.map(v => `<div class="care-log-saved-item">
                <span>${esc(v.date)}${v.time ? ' ' + esc(v.time) : ''} · ${esc(v.client)} ← ${esc(v.visitor)}(${esc(relationLabel(v.relation))})${v.phone ? esc(' ' + v.phone) : ''}${v.purpose ? ' — ' + esc(v.purpose) : ''}</span>
                <button data-click="careVisitResultOpen" data-arg="loc:${esc(v.id)}" class="btn btn-secondary">결과 기록</button>
                <button data-click="careVisitCancel" data-arg="loc:${esc(v.id)}" class="btn btn-secondary">취소</button>
                <button data-click="careVisitDelete" data-arg="${esc(v.id)}" class="btn btn-secondary">삭제</button>
              </div>`).join('')
            : '<p class="care-log-empty">등록된 방문예약이 없습니다.</p>';
    }
    const done = $('vis-done');
    if (done) {
        const rows = items.filter(v => v.status !== 'scheduled');
        done.innerHTML = rows.length
            ? rows.map(v => `<div class="care-log-saved-item">
                <span>${esc(v.date)} · ${esc(v.client)} ← ${esc(v.visitor)} — ${esc(VISIT_STATUS[v.status] || '')}${v.result && v.result.summary ? esc(' · ' + v.result.summary) : ''}</span>
                <button data-click="careVisitDelete" data-arg="${esc(v.id)}" class="btn btn-secondary">삭제</button>
              </div>`).join('')
            : '<p class="care-log-empty">완료·취소된 방문이 없습니다.</p>';
    }
}

async function renderFacility() {
    const host = $('vis-facility');
    if (!host) return;
    if (!_facility) {
        try { _facility = (await myMembership())?.facilities || null; } catch (e) { _facility = null; }
    }
    if (!_facility) return;
    try { _fvList = await listFacilityVisits(_facility.id, { limit: 20 }); } catch (e) { _fvList = []; }
    host.innerHTML = `
        <div class="care-audit-sec">
            <h3>기관 면회 대장 — ${esc(_facility.name)}</h3>
            ${_fvList.map(v => `
                <div class="care-log-saved-item">
                    <span>${esc(v.visit_date)}${v.visit_time ? ' ' + esc(v.visit_time) : ''} · ${esc(v.client)} ← ${esc(v.visitor_name)}${v.visitor_phone ? esc(' ' + v.visitor_phone) : ''} — ${esc(VISIT_STATUS[v.status] || v.status)}${v.result && v.result.summary ? esc(' · ' + v.result.summary) : ''}</span>
                    ${v.status === 'scheduled' ? `<button data-click="careVisitResultOpen" data-arg="fac:${esc(v.id)}" class="btn btn-secondary">결과 기록</button>
                    <button data-click="careVisitCancel" data-arg="fac:${esc(v.id)}" class="btn btn-secondary">취소</button>` : ''}
                </div>`).join('')}
        </div>`;
}

export async function careVisitFacilitySubmit() {
    if (!_facility) { showToast('소속 기관이 없습니다 — 기관 가입 후 이용하세요.', 'error'); return; }
    const f = readForm();
    if (!f.date || !f.client || !f.visitor) { showToast('방문일·대상자·방문객을 입력하세요.', 'error'); return; }
    proFeatureNotice('care_visit_share', '기관 방문예약 공유');
    const r = await submitVisit({
        facilityId: _facility.id,
        client: f.client,
        visitor: f.visitor,
        phone: f.phone,
        relation: relationLabel(f.relation),
        visitDate: f.date,
        visitTime: f.time,
        purpose: f.purpose,
    });
    'error' in r ? showToast('공유 실패: ' + r.error, 'error') : showToast('기관 면회 대장에 등록했습니다.');
    void renderFacility();
}

export function initCareVisitView() {
    const d = /** @type {HTMLInputElement|null} */ ($('vis-date'));
    if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
    const s = $('vis-relation');
    if (s && !s.children.length)
        s.innerHTML = RELATIONS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    renderLists();
    void renderFacility();
    void refreshOrgName();
}
