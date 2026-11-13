// src/exams/carework/views/care-incident.js — 사고 보고서 뷰
// @spec UX-FORM-03 — 시험 전용 실무 뷰 (DA-13)
import { INCIDENT_TYPES, SEVERITIES, incidentTypeLabel, severityLabel, buildIncidentText, buildIncidentMd, incidentsToCsv } from '../care-incident.js';
import { markFunnel } from '../care-funnel.js';
import { listIncidents, saveIncident, removeIncident } from '../incident-store.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { downloadSheet } from '../../../content/xlsx-utils.js';
import { myMembership, submitIncident, listIncidents as listFacilityIncidents, refreshOrgName, signFileToDataUri } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { docMdHead, docMdSign, mdToHtml } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
import { getJSON, setJSON, removeItem } from '../../../core/storage.js';
import { STORAGE_KEYS } from '../../../core/storage-keys.js';
import { showToast, showConfirm, flashSavedBadge, requireFields } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
export { careShare } from '../care-share.js';
export { careIncidentVoiceToggle } from '../care-voice.js';
import { voiceButtonsInit } from '../care-voice.js';

const $ = (/** @type {string} */ id) => document.getElementById(id);
const esc = (/** @type {*} */ s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);
const _val = (/** @type {string} */ id, /** @type {string} */ fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};
/** @type {*} */
let _facility = null;
let _fiList = [];
/** @type {string|null} */
let _lastText = null;
const PHOTO_MAX = 3; // 첨부 사진 한도 — localStorage 쿼터 보호
/** @type {string[]} */ const _photos = [];

function readForm() {
    return {
        photos: _photos.slice(),
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
    if (!t) {
        // UX-FORM-03 — 미리보기 요약과 함께 누락 필드에 인라인 오류 표시
        requireFields([
            [/** @type {HTMLInputElement|null} */ ($('inc-date')), '발생 일자를 입력하세요.'],
            [/** @type {HTMLInputElement|null} */ ($('inc-client')), '대상자를 입력하세요.'],
            [/** @type {HTMLSelectElement|null} */ ($('inc-type')), '사고 유형을 선택하세요.'],
        ]);
        out.innerHTML = '<p class="care-calc-err">일시·대상자·사고 유형을 입력하세요.</p>';
        return;
    }
    _lastText = t;
    out.innerHTML = mdToHtml(careIncidentDocMd())
        + (_photos.length ? `<div class="care-photo-grid">${_photos.map(p => `<img src="${p}" alt="첨부 사진">`).join('')}</div>` : '');
}

/** 보고서 MD 초안 — 헤더 + 격식표 생성문 (docx 파생 원본 — 평문이 아닌 표로 출력) */
export function careIncidentDocMd() {
    const f = readForm();
    const t = buildIncidentMd(f);
    return t ? docMdHead('사고 보고서') + '\n' + renderToolBody('careIncident', {
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
    if (r.ok) {
        // 반복 입력 자동 기입 — 장소·성명·시간대·목격자는 다음 보고서에 기본값으로 (시니어 입력 부담 감소)
        setJSON(STORAGE_KEYS.CARE_LAST_INCIDENT, { place: _val('inc-place', ''), client: _val('inc-client', ''), time: _val('inc-time', ''), witness: _val('inc-witness', '') });
        showToast('보고서를 기록했습니다.'); renderSaved(); flashSavedBadge($('inc-saved'));
    }
}

export function careIncidentPrint() {
    careIncidentGenerate();
    if (!document.querySelector('#inc-preview .doc-md')) { showToast('먼저 보고서를 생성하세요.', 'error'); return; }
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

/** @param {string} id */
export async function careIncidentDelete(id) {
    if (!id || !await showConfirm('저장된 보고서를 삭제할까요?', '삭제 확인')) return;
    removeIncident(id); renderSaved();
}

function renderSaved() {
    const host = $('inc-saved');
    if (!host) return;
    const items = listIncidents();
    host.innerHTML = items.length
        ? items.map((/** @type {*} */ x) => `<div class="care-log-saved-item">
            <span>${esc(x.date)} · ${esc(x.client)} — ${esc(incidentTypeLabel(x.type))}${x.photos?.length ? ` 📷${x.photos.length}` : ''}</span>
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
            ${_fiList.map((/** @type {*} */ v) => `
                <div class="care-log-saved-item">
                    <span>${esc(v.occurred_at)} · ${esc(v.client)} — ${esc(v.type)}${v.severity ? esc(' · ' + v.severity) : ''}${v.family_notified ? ' · 가족통지' : ''}</span>
                </div>`).join('')}
        </div>`;
}

export async function careIncidentFacilitySubmit() {
    // 버튼은 정적 마크업이라 renderFacility()의 멤버십 해석보다 먼저 클릭될 수 있다 — 재해석 후 판정
    if (!_facility) {
        try { _facility = (await myMembership())?.facilities || null; } catch (e) { _facility = null; }
    }
    if (!_facility) { showToast('소속 기관이 없습니다 — 기관 가입 후 이용하세요.', 'error'); return; }
    const f = readForm();
    if (!requireFields([
        [/** @type {HTMLInputElement|null} */ ($('inc-date')), '발생 일자를 입력하세요.'],
        [/** @type {HTMLInputElement|null} */ ($('inc-client')), '대상자를 입력하세요.'],
        [/** @type {HTMLSelectElement|null} */ ($('inc-type')), '사고 유형을 선택하세요.'],
    ])) return;
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

/** 사진 추가 버튼 — 숨긴 file input 트리거 (최대 PHOTO_MAX장) */
export function careIncidentPhotoPick() {
    if (_photos.length >= PHOTO_MAX) { showToast(`사진은 최대 ${PHOTO_MAX}장까지 첨부됩니다.`, 'error'); return; }
    /** @type {HTMLInputElement|null} */ ($('inc-photo-file'))?.click();
}

/** @param {number} idx */
export async function careIncidentPhotoRemove(idx) {
    const i = Number(idx);
    if (!(i >= 0 && i < _photos.length)) return;
    if (!await showConfirm('이 사진을 삭제할까요?', '사진 삭제')) return;
    _photos.splice(i, 1);
    _renderPhotos();
    careIncidentGenerate(); // 미리보기 갱신
}

function _renderPhotos() {
    const host = $('inc-photo-list');
    if (!host) return;
    host.innerHTML = _photos.map((/** @type {string} */ p, /** @type {number} */ i) =>
        `<span class="care-photo-thumb"><img src="${p}" alt="첨부 사진 ${i + 1}"><button type="button" class="care-photo-del" data-click="careIncidentPhotoRemove" data-arg="${i}" title="사진 삭제">✕</button></span>`
    ).join('') || '<span class="care-log-hint">현장·상해 부위 등 사진을 첨부하면 출력물에 함께 표시됩니다 (최대 3장)</span>';
}

export function initCareIncidentView() {
    markFunnel('tool:care-incident');
    voiceButtonsInit(); // 음성 입력 미지원 브라우저는 🎤 숨김
    const _incClientEl = $('inc-client');
    if (_incClientEl) attachClientPicker(/** @type {HTMLInputElement} */ (_incClientEl));
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
    // 마지막 저장값 자동 기입 — 반복 입력(장소·성명·시간대·목격자) 기본값 복원 (빈 필드만)
    const last = getJSON(STORAGE_KEYS.CARE_LAST_INCIDENT);
    if (last && typeof last === 'object') {
        for (const [k, v] of Object.entries(last)) {
            const el = /** @type {HTMLInputElement|null} */ ($(`inc-${k}`));
            if (el && !el.value && typeof v === 'string' && v) el.value = v;
        }
    }
    // 사진 첨부 — 파일 선택 시 리사이즈 dataURI로 변환해 썸네일에 추가 (재진입 시 onchange 재할당 → 중복 바인딩 없음)
    const pf = /** @type {HTMLInputElement|null} */ ($('inc-photo-file'));
    if (pf) pf.onchange = async () => {
        for (const file of [...(pf.files || [])].slice(0, PHOTO_MAX - _photos.length)) {
            try { _photos.push(await signFileToDataUri(file)); }
            catch { showToast('사진을 읽지 못했습니다.', 'error'); }
        }
        pf.value = '';
        _renderPhotos();
    };
    _renderPhotos();
    renderSaved();
    void renderFacility();
    void refreshOrgName();
}
