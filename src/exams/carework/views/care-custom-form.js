// src/exams/carework/views/care-custom-form.js — 기관 자체 양식 뷰
// @spec CO-17 — 시험 전용 실무 뷰 (DA-13)
// 양식 목록·기입·미리보기·저장·내보내기 — 양식 등록·편집 입력은 Care OS 홈에서 수용
import { markFunnel } from '../care-funnel.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { escapeHTML as esc } from '../../../core/sanitize.js';
import { showToast } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
import { docMdHead } from '../doc-md.js';
import { docHeadHtml, refreshOrgName, myMembership, deleteFacilityFormTemplate } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import {
    parseFields, fillTemplate, fillTemplateHtml,
    allFormTemplates, syncFormTemplates, setPendingTplEdit,
    listFormDocs, saveFormDoc, removeFormDoc, syncPendingFormDocs,
} from '../form-template-store.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
let _membership = null;
let _activeTpl = null;   // 기입 대상 양식 {id,title,body,scope}
let _lastMd = '';        // 마지막 생성 문서 MD (내보내기 원본)

const _isManager = () => _membership?.role === 'manager';
const _tplById = (id) => allFormTemplates().find(t => t.id === id) || null;

// — 양식 목록·선택 —

export function careFormTplUse(id) {
    const t = _tplById(id);
    if (!t) return;
    _activeTpl = t;
    _lastMd = '';
    renderFillForm();
}

/** 편집 — 등록 편집기는 홈에 있으므로 이관 마킹 후 홈으로 이동 */
export function careFormTplEdit(id) {
    const t = _tplById(id);
    if (!t) return;
    setPendingTplEdit(t);
    location.hash = '#/care-home';
}

export async function careFormTplDelete(id) {
    const t = _tplById(id);
    if (!t) return;
    if (t.scope === 'fac') {
        if (!_isManager()) { showToast('기관 양식 삭제는 관리책임자만 가능합니다.', 'error'); return; }
        const r = await deleteFacilityFormTemplate(t.id.slice(4));
        if (r.error) { showToast('삭제 실패: ' + r.error, 'error'); return; }
        await syncFormTemplates();
    } else {
        const { removeFormTemplate } = await import('../form-template-store.js');
        removeFormTemplate(id);
    }
    if (_activeTpl?.id === id) { _activeTpl = null; renderFillForm(); }
    showToast('양식을 삭제했습니다.');
    renderTplList();
}

function renderTplList() {
    const host = $('cf-tpl-list');
    if (!host) return;
    const items = allFormTemplates();
    host.innerHTML = items.length
        ? items.map(t => `<div class="care-log-saved-item">
            <span>${t.scope === 'fac' ? '<em class="care-card-cat">기관</em> ' : ''}${esc(t.title)} <small>${parseFields(t.body).length}개 항목</small></span>
            <button data-click="careFormTplUse" data-arg="${esc(t.id)}" class="btn">기입</button>
            <button data-click="careFormTplEdit" data-arg="${esc(t.id)}" class="btn btn-secondary">편집</button>
            <button data-click="careFormTplDelete" data-arg="${esc(t.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">등록된 양식이 없습니다 — 홈에서 양식 파일을 올리거나 직접 작성해 등록하세요.</p>';
}

function renderFillForm() {
    const host = $('cf-fill');
    const fieldsHost = $('cf-fill-fields');
    if (!host || !fieldsHost) return;
    if (!_activeTpl) { host.classList.add('is-hidden'); return; }
    host.classList.remove('is-hidden');
    const titleEl = $('cf-fill-title');
    if (titleEl) titleEl.textContent = _activeTpl.title;
    const fields = parseFields(_activeTpl.body);
    fieldsHost.innerHTML = fields.length
        ? fields.map(f => `<label>${esc(f.label)} <input type="text" data-cf-field="${esc(f.key)}" autocomplete="off"></label>`).join('')
        : '<p class="care-log-hint">기입 항목 없음 — 바로 생성하면 됩니다.</p>';
}

function _readFillValues() {
    const values = { client: /** @type {HTMLInputElement|null} */ ($('cf-client'))?.value?.trim() || '' };
    document.querySelectorAll('[data-cf-field]').forEach(el => {
        values[/** @type {HTMLElement} */ (el).dataset.cfField] = /** @type {HTMLInputElement} */ (el).value;
    });
    return values;
}

// — 문서 생성·저장 —

export function careFormDocGenerate() {
    if (!_activeTpl) { showToast('기입할 양식을 먼저 선택하세요.', 'error'); return; }
    const values = _readFillValues();
    _lastMd = fillTemplate(_activeTpl.body, values, 'md');
    const out = $('cf-preview');
    if (out) {
        out.innerHTML = docHeadHtml(_activeTpl.title) + `<div class="care-doc">${fillTemplateHtml(_activeTpl.body, values)}</div>`;
    }
}

/** 내보내기 MD 초안 — 마지막 생성분 (없으면 생성 시도) */
export function careFormDocMd() {
    if (!_lastMd && _activeTpl) careFormDocGenerate();
    return _lastMd ? docMdHead(_activeTpl?.title || '양식 문서') + '\n' + _lastMd : '';
}

export function careFormDocPrint() {
    if (!_activeTpl) { showToast('인쇄할 양식을 먼저 선택하세요.', 'error'); return; }
    careFormDocGenerate();
    proFeatureNotice('care_form_share', '양식 문서 인쇄·PDF');
    window.print();
}

export function careFormDocSave() {
    if (!_activeTpl) { showToast('저장할 양식을 먼저 선택하세요.', 'error'); return; }
    careFormDocGenerate();
    const { client, clientId } = clientField('cf-client');
    const r = saveFormDoc({
        tplId: _activeTpl.id, title: _activeTpl.title,
        client, clientId, date: todayKey(),
        values: _readFillValues(), md: _lastMd,
    });
    if (r.ok) { showToast('기입 문서를 저장했습니다.'); renderDocList(); }
}

export function careFormDocDelete(id) {
    if (id) { removeFormDoc(id); renderDocList(); }
}

function renderDocList() {
    const host = $('cf-doc-list');
    if (!host) return;
    const items = listFormDocs();
    host.innerHTML = items.length
        ? items.map(d => `<div class="care-log-saved-item">
            <span>${esc(d.date || '')} · ${esc(d.title)}${d.client ? ' — ' + esc(d.client) : ''}</span>
            <button data-click="careFormDocDelete" data-arg="${esc(d.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">저장된 기입 문서가 없습니다.</p>';
}

export function initCareCustomFormView() {
    markFunnel('tool:care-custom-form');
    attachClientPicker(/** @type {HTMLInputElement|null} */ ($('cf-client')));
    renderTplList();
    renderFillForm();
    renderDocList();
    void refreshOrgName();
    void syncPendingFormDocs();
    void myMembership().then(m => { _membership = m; }).catch(() => {});
    void syncFormTemplates().then(renderTplList);
}
