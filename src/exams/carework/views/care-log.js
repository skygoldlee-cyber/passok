// src/exams/carework/views/care-log.js — 요양일지 생성기 뷰
// @spec UX-FORM-03 — 시험 전용 실무 뷰 (DA-13)
import { buildCareLog, buildCareLogMd, buildRecordText, SERVICE_TYPES, ACTIVITY_GROUPS, careLogsToCsv } from '../care-log.js';
import { markFunnel } from '../care-funnel.js';
import { saveCareLog, listCareLogs, removeCareLog, syncPendingCareLogs } from '../care-log-store.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { downloadSheet } from '../../../content/xlsx-utils.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { refreshOrgName } from '../facility.js';
import { showToast, showConfirm, flashSavedBadge, requireFields } from '../../../ui-utils.js';
import { shareAudit } from '../care-share.js';
import { docMdHead, docMdSign, mdToHtml } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
import { todayKey } from '../../../core/utils.js';

const $ = (/** @type {string} */ id) => document.getElementById(id);
const esc = (/** @type {*} */ s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);
const _radio = (/** @type {string} */ name) => /** @type {HTMLInputElement|null} */ (document.querySelector(`input[name="${name}"]:checked`))?.value || '';
const _val = (/** @type {string} */ id, /** @type {string} */ fb) => {
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
        ...clientField('log-client'),
        service: _val('log-service', 'visit-care'),
        start: _val('log-start', ''),
        end: _val('log-end', ''),
        activities,
        note: _val('log-note', ''),
        obs: { meal: _radio('obs-meal'), sleep: _radio('obs-sleep'), voided: _radio('obs-void') },
    };
}

// UX-FORM-03 — 공통 필수 검증: 인라인 오류 + 첫 오류 필드 포커스 (일지·제공기록지 공유)
function _requireLogFields() {
    return requireFields([
        [/** @type {HTMLInputElement|null} */ ($('log-date')), '서비스 일자를 입력하세요.'],
        [/** @type {HTMLInputElement|null} */ ($('log-client')), '대상자를 입력하세요.'],
        [/** @type {HTMLSelectElement|null} */ ($('log-service')), '급여 종류를 선택하세요.'],
    ]);
}

export function careLogGenerate() {
    const t = buildCareLog(readForm());
    const out = $('log-preview');
    if (!out) return;
    if (!t) {
        _requireLogFields(); // 미리보기 요약과 함께 누락 필드에 인라인 오류 표시
        out.innerHTML = '<p class="care-calc-err">일시·대상자·급여 종류를 입력하세요.</p>';
        return;
    }
    out.innerHTML = mdToHtml(careLogDocMd());
}

/** 일지 MD 초안 — 헤더 + 격식표 생성문 (docx 파생 원본 — 평문이 아닌 표로 출력) */
export function careLogDocMd() {
    const f = readForm();
    const t = buildCareLogMd(f);
    return t ? docMdHead('요양일지') + '\n' + renderToolBody('careLog', {
        기록내용: t, client: f.client,
        일시: `${f.date}${f.start ? ` ${f.start}~${f.end || ''}` : ''}`,
        급여종류: SERVICE_TYPES.find(s => s.key === f.service)?.label || f.service,
        특이사항: f.note, 비고: f.note,
    }) + docMdSign([['작성자(요양보호사)', 'author'], ['확인자', 'confirmer']]) : '';
}

/** CO-07 공단 급여제공기록지 양식 복사 — ERP·공단 앱에 붙여넣기 (이중 입력 해소) */
export function careLogRecordCopy() {
    const t = buildRecordText(readForm());
    if (!t) { _requireLogFields(); return; }
    proFeatureNotice('care_log_export', '제공기록지 복사');
    navigator.clipboard?.writeText(t).then(
        () => { shareAudit('급여제공기록지', '', ['클립보드']); showToast('제공기록지 양식을 복사했습니다.'); },
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careLogSave() {
    careLogGenerate();
    const f = readForm();
    const text = buildCareLog(f) || '';
    if (!text) { showToast('먼저 일지를 생성하세요.', 'error'); return; }
    const r = saveCareLog({ ...f, text });
    if (r.ok) { showToast('일지를 저장했습니다.'); renderSaved(); flashSavedBadge($('log-saved')); }
}

export function careLogPrint() {
    careLogGenerate();
    if (!document.querySelector('#log-preview .doc-md')) { showToast('먼저 일지를 생성하세요.', 'error'); return; }
    proFeatureNotice('care_log_export', '일지 인쇄·PDF');
    window.print();
}

export function careLogCsvExport() {
    const items = listCareLogs();
    if (!items.length) { showToast('내보낼 저장된 일지가 없습니다.', 'error'); return; }
    proFeatureNotice('care_log_export', '일지 Excel 내보내기');
    const csv = careLogsToCsv(items);
    void downloadSheet(csv, '요양일지.xlsx');
    showToast('Excel 파일을 저장했습니다.');
    return csv;
}

/** @param {string} id */
export async function careLogDelete(id) {
    if (!id || !await showConfirm('저장된 일지를 삭제할까요?', '삭제 확인')) return;
    removeCareLog(id); renderSaved();
}

function renderSaved() {
    const host = $('log-saved');
    if (!host) return;
    const items = listCareLogs();
    host.innerHTML = items.length
        ? items.map(x => `<div class="care-log-saved-item">
            <span>${esc(x.date)} · ${esc(x.client)} · ${esc(x.service)}</span>
            ${x._sync === 'done' ? '<em>☁ 기관</em>' : ''}
            <button data-click="careLogDelete" data-arg="${esc(x.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">저장된 일지가 없습니다.</p>';
}

export function initCareLogView() {
    markFunnel('tool:care-log');
    const _logClientEl = $('log-client');
    if (_logClientEl) attachClientPicker(/** @type {HTMLInputElement} */ (_logClientEl));
    const d = /** @type {HTMLInputElement|null} */ ($('log-date'));
    if (d && !d.value) d.value = todayKey();
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
    void refreshOrgName();
    void syncPendingCareLogs();
}

export { careShare } from '../care-share.js';
export { careAiDraft } from '../care-ai.js';
