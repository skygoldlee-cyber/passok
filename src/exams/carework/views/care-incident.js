// src/exams/carework/views/care-incident.js — 사고·낙상 보고서 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { INCIDENT_TYPES, SEVERITIES, incidentTypeLabel, severityLabel, buildIncidentText, incidentsToCsv } from '../care-incident.js';
import { markFunnel } from '../care-funnel.js';
import { listIncidents, saveIncident, removeIncident } from '../incident-store.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { downloadSheet } from '../../../content/xlsx-utils.js';
import { myMembership, submitIncident, listIncidents as listFacilityIncidents, docHeadHtml, docSignHtml, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { docMdHead, docMdSign } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
import { getJSON, removeItem } from '../../../core/storage.js';
import { STORAGE_KEYS } from '../../../core/storage-keys.js';
import { showToast } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};
let _facility = null;
let _fiList = [];
let _lastText = null;

function readForm() {
    return {
        date: _val('inc-date', ''),
        time: _val('inc-time', ''),
        ...clientField('inc-client'),
        place: _val('inc-place', ''),
        type: _val('inc-type', ''),
        severity: _val('inc-severity', ''),
        desc: _val('inc-desc', ''),
        action: _val('inc-action', ''),
        witness: _val('inc-witness', ''),
        familyNotified: /** @type {HTMLInputElement|null} */ ($('inc-family'))?.checked || false,
    };
}

export function careIncidentGenerate() {
    const t = buildIncidentText(readForm());
    const out = $('inc-preview');
    if (!out) return;
    if (!t) { out.innerHTML = '<p class="care-calc-err">일시·대상자·사고 유형을 입력하세요.</p>'; return; }
    _lastText = t;
    out.innerHTML = docHeadHtml('사고·낙상 보고서') + `<pre class="care-log-text">${esc(t)}</pre>` + docSignHtml([['보고자', 'author'], ['확인(시설장)', 'confirmer']]);
}

/** 보고서 MD 초안 — 헤더 + 폼 생성문 (docx 파생 원본) */
export function careIncidentDocMd() {
    const f = readForm();
    const t = buildIncidentText(f);
    return t ? docMdHead('사고·낙상 보고서') + '\n' + renderToolBody('careIncident', {
        보고내용: t, client: f.client,
        발생일시: `${f.date}${f.time ? ' ' + f.time : ''}`,
        발생장소: f.place, 사고유형: incidentTypeLabel(f.type),
        중증도: severityLabel(f.severity), 발생경위: f.desc,
        조치내용: f.action, 목격자: f.witness,
        가족통지: f.familyNotified ? '완료' : '미완료',
    }) + docMdSign([['보고자', 'author'], ['확인(시설장)', 'confirmer']]) : '';
}

export function careIncidentSave() {
    careIncidentGenerate();
    if (!_lastText) { showToast('먼저 보고서를 생성하세요.', 'error'); return; }
    const r = saveIncident({ ...readForm(), text: _lastText });
    if (r.ok) { showToast('보고서를 기록했습니다.'); renderSaved(); }
}

export function careIncidentPrint() {
    careIncidentGenerate();
    if (!document.querySelector('#inc-preview pre')) { showToast('먼저 보고서를 생성하세요.', 'error'); return; }
    proFeatureNotice('care_incident_share', '보고서 인쇄·PDF');
    window.print();
}

export function careIncidentCsvExport() {
    const items = listIncidents();
    if (!items.length) { showToast('내보낼 저장된 보고서가 없습니다.', 'error'); return; }
    proFeatureNotice('care_incident_share', '사고보고 Excel 내보내기');
    const csv = incidentsToCsv(items);
    void downloadSheet(csv, '사고보고.xlsx');
    showToast('Excel 파일을 저장했습니다.');
    return csv;
}

export function careIncidentDelete(id) {
    if (id) { removeIncident(id); renderSaved(); }
}

function renderSaved() {
    const host = $('inc-saved');
    if (!host) return;
    const items = listIncidents();
    host.innerHTML = items.length
        ? items.map(x => `<div class="care-log-saved-item">
            <span>${esc(x.date)} · ${esc(x.client)} — ${esc(incidentTypeLabel(x.type))}</span>
            <button data-click="careIncidentDelete" data-arg="${esc(x.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">저장된 보고서가 없습니다.</p>';
}

async function renderFacility() {
    const host = $('inc-facility');
    if (!host) return;
    if (!_facility) {
        try { _facility = (await myMembership())?.facilities || null; } catch (e) { _facility = null; }
    }
    if (!_facility) return;
    try { _fiList = await listFacilityIncidents(_facility.id, { limit: 20 }); } catch (e) { _fiList = []; }
    host.innerHTML = `
        <div class="care-audit-sec">
            <h3>기관 사고 대장 — ${esc(_facility.name)}</h3>
            ${_fiList.map(v => `
                <div class="care-log-saved-item">
                    <span>${esc(v.occurred_at)} · ${esc(v.client)} — ${esc(v.type)}${v.severity ? esc(' · ' + v.severity) : ''}${v.family_notified ? ' · 가족통지' : ''}</span>
                </div>`).join('')}
        </div>`;
}

export async function careIncidentFacilitySubmit() {
    if (!_facility) { showToast('소속 기관이 없습니다 — 기관 가입 후 이용하세요.', 'error'); return; }
    const f = readForm();
    if (!f.date || !f.client || !f.type) { showToast('일시·대상자·사고 유형을 입력하세요.', 'error'); return; }
    proFeatureNotice('care_incident_share', '기관 사고 대장 등록');
    const r = await submitIncident({
        facilityId: _facility.id,
        client: f.client,
        occurredAt: `${f.date}${f.time ? ' ' + f.time : ''}`,
        place: f.place,
        type: incidentTypeLabel(f.type),
        severity: f.severity,
        description: f.desc,
        action: f.action,
        familyNotified: f.familyNotified,
    });
    'error' in r ? showToast('등록 실패: ' + r.error, 'error') : showToast('기관 사고 대장에 등록했습니다.');
    void renderFacility();
}

export function initCareIncidentView() {
    markFunnel('tool:care-incident');
    attachClientPicker(/** @type {HTMLInputElement|null} */ ($('inc-client')));
    const d = /** @type {HTMLInputElement|null} */ ($('inc-date'));
    if (d && !d.value) d.value = todayKey();
    const t = $('inc-type');
    if (t && !t.children.length)
        t.innerHTML = INCIDENT_TYPES.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const s = $('inc-severity');
    if (s && !s.children.length)
        s.innerHTML = SEVERITIES.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    // 대처카드 초안 소비 — 카드에서 "사고보고서 작성"으로 진입 시 유형·경위 선기입 (일회성)
    const draft = getJSON(STORAGE_KEYS.CARE_INCIDENT_DRAFT);
    if (draft && typeof draft === 'object') {
        removeItem(STORAGE_KEYS.CARE_INCIDENT_DRAFT);
        if (draft.type && t) /** @type {HTMLSelectElement} */ (t).value = draft.type;
        if (draft.desc) { const de = /** @type {HTMLInputElement|null} */ ($('inc-desc')); if (de) de.value = draft.desc; }
    }
    renderSaved();
    void renderFacility();
    void refreshOrgName();
}
