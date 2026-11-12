// src/exams/carework/views/care-custom-form.js — 기관 자체 양식 뷰
// @spec CO-17,CO-18,UX-FORM-03,UX-FORM-05 — 시험 전용 실무 뷰 (DA-13)
// 양식 등록·편집·목록·기입·미리보기·저장·내보내기 — 양식 관리는 이 뷰에서 완결 (홈은 링크 허브)
import { markFunnel } from '../care-funnel.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { escapeHTML as esc } from '../../../core/sanitize.js';
import { showToast, showConfirm, flashSavedBadge, requireFields } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
import { docMdHead } from '../doc-md.js';
import { docHeadHtml, refreshOrgName, myMembership, submitFormTemplate, deleteFacilityFormTemplate } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import {
    parseFields, fillTemplate, fillTemplateHtml,
    allFormTemplates, syncFormTemplates,
    listFormDocs, saveFormDoc, removeFormDoc, syncPendingFormDocs,
    addFormTemplate, updateFormTemplate,
} from '../form-template-store.js';
import { TOOL_FORM_SEEDS, toolBlockPreview } from '../form-seeds.js';
import { initTplEditor, fillTplEditor, readTplEditor, setTplBlockState } from '../form-template-editor.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
let _membership = null;
let _activeTpl = null;   // 기입 대상 양식 {id,title,body,scope}
let _editTplId = null;   // 편집 중인 로컬 양식 id (null = 신규/기관사본)
let _lastMd = '';        // 마지막 생성 문서 MD (내보내기 원본)
let _previewToolKey = null; // 편집기에 연동된 도구 키 (블록 실데이터 미리보기·비동기 응답 가드)

// — 인라인 편집기 (기본 양식 사본·목록 양식 편집이 이 뷰에서 완결 — CO-18) —

let _editLoaded = null; // UX-FORM-05 — 편집기 로드 원본 (미저장 변경 감지 기준)

/** 편집기에 저장되지 않은 변경이 있는가 — 로드 원본 대비 비교 */
function _editorDirty() {
    const ed = $('cf-editor');
    if (!ed || ed.classList.contains('is-hidden') || !_editLoaded) return false;
    const cur = readTplEditor('cf-tpl');
    return cur.title !== _editLoaded.title || cur.body !== _editLoaded.body;
}

/** UX-FORM-05 — 미저장 편집분이 있으면 덮어쓰기·닫기 전 확인 (false 반환 = 취소) */
async function _confirmDiscardEdit() {
    if (!_editorDirty()) return true;
    return showConfirm('저장하지 않은 양식 편집 내용이 있습니다. 내용을 버리고 계속할까요?', '편집 내용 버리기');
}

async function _openEditor(tpl) {
    if (!(await _confirmDiscardEdit())) return; // 다른 양식 편집 전환이 미저장분을 덮지 않게
    _editTplId = tpl.scope === 'fac' ? null : tpl.id; // 기관 양식은 저장 시 로컬 사본이 됨
    const ed = $('cf-editor');
    if (ed) ed.classList.remove('is-hidden');
    const lb = $('cf-tpl-label');
    if (lb) lb.textContent = tpl.title + (tpl.toolKey ? ` (연동: ${TOOL_FORM_SEEDS[tpl.toolKey]?.title})` : '');
    _previewToolKey = tpl.toolKey || null;
    const blk = _previewToolKey ? TOOL_FORM_SEEDS[_previewToolKey] : null;
    setTplBlockState('cf-tpl', { auto: blk ? new Set([blk.block]) : null }); // 이전 양식 블록 데이터 제거
    fillTplEditor('cf-tpl', tpl.title, tpl.body);
    _editLoaded = { title: tpl.title || '', body: tpl.body || '' };
    if (blk) void toolBlockPreview(tpl.toolKey).then(values => { // 블록 키를 실제 출력 내용으로 미리보기
        if (_previewToolKey === tpl.toolKey) setTplBlockState('cf-tpl', { auto: new Set([blk.block]), values });
    });
    ed?.scrollIntoView?.({ block: 'nearest' });
}

/** 새 양식 — 빈 편집기 오픈 (신규 등록 진입점) */
export function careFormTplNew() {
    return _openEditor({ id: null, title: '새 양식', body: '', scope: 'local' });
}

/** 목록 편집 → 인라인 편집기 (홈 이관 대신 이 뷰에서 완결) */
export function careFormTplEdit(id) {
    const t = _tplById(id);
    if (!t) return Promise.resolve();
    return _openEditor(t);
}

export async function careFormTplEditClose() {
    if (!(await _confirmDiscardEdit())) return;
    _editTplId = null;
    _previewToolKey = null;
    _editLoaded = null;
    setTplBlockState('cf-tpl'); // 도구 블록 미리보기 상태 초기화
    $('cf-editor')?.classList.add('is-hidden');
}

/** 양식 파일 선택 — 편집기의 숨긴 file input 트리거 */
export function careFormTplPdfPick() {
    /** @type {HTMLInputElement|null} */ ($('cf-tpl-file'))?.click();
}

/** 양식 저장 — 편집 중이면 갱신, 기관 양식 편집분은 로컬 사본으로 신규 */
// UX-FORM-03 — 양식 편집기 필수 검증: 인라인 오류 + 첫 오류 필드 포커스
function _requireTplFields() {
    return requireFields([
        [/** @type {HTMLInputElement|null} */ ($('cf-tpl-title')), '양식명을 입력하세요.'],
        [/** @type {HTMLTextAreaElement|null} */ ($('cf-tpl-body')), '본문을 입력하세요.'],
    ]);
}

export function careFormTplSave() {
    const { title, body } = readTplEditor('cf-tpl');
    if (!title || !body.trim()) { _requireTplFields(); return; }
    if (_editTplId) {
        const r = updateFormTemplate(_editTplId, { title, body });
        r.ok ? showToast('양식을 저장했습니다 — 연동 도구 출력에도 반영됩니다.') : showToast(r.error || '저장 실패', 'error');
    } else {
        const label = $('cf-tpl-label')?.textContent || '';
        const tk = Object.keys(TOOL_FORM_SEEDS).find(k => label.includes(TOOL_FORM_SEEDS[k].title));
        const r = addFormTemplate({ title, body, toolKey: tk || undefined });
        if (!r.ok) { showToast(r.error || '저장 실패', 'error'); return; }
        _editTplId = r.id;
        showToast('양식을 저장했습니다 — 연동 도구 출력에도 반영됩니다.');
        flashSavedBadge($('cf-tpl-list'));
    }
    _editLoaded = readTplEditor('cf-tpl'); // 저장 성공 — 현재 내용이 새 '저장됨' 기준선 (dirty 리셋)
    renderTplList();
    renderSeedList();
}

/** 기관 양식으로 등록 — manager 전용, facility_form_templates에 저장 (CO-17) */
export async function careFormTplFacSave() {
    const m = _membership || await myMembership().catch(() => null);
    if (!m || m.role !== 'manager') { showToast('기관 등록은 관리책임자만 가능합니다.', 'error'); return; }
    const { title, body } = readTplEditor('cf-tpl');
    if (!title || !body.trim()) { _requireTplFields(); return; }
    proFeatureNotice('facility_workspace', '기관 양식 등록');
    const r = await submitFormTemplate({ facilityId: m.facility_id, title, body });
    if ('error' in r) { showToast('등록 실패: ' + r.error, 'error'); return; }
    showToast('기관 양식으로 등록했습니다 — 멤버 전체가 사용할 수 있습니다.');
    await syncFormTemplates();
    renderTplList();
}

const _isManager = () => _membership?.role === 'manager';
const _tplById = (id) => allFormTemplates().find(t => t.id === id) || null;

// — 양식 목록·선택 —

export async function careFormTplUse(id) {
    const t = _tplById(id);
    if (!t) return;
    // UX-FORM-05 — 기입 중인 값이 있으면 다른 양식 전환 전 확인 (필드 재렌더로 값이 지워짐)
    if (_activeTpl && _activeTpl.id !== id && _fillDirty()
        && !await showConfirm('기입 중인 내용이 있습니다. 다른 양식으로 전환하면 기입 값이 지워집니다. 계속할까요?', '양식 전환')) return;
    _activeTpl = t;
    _lastMd = '';
    renderFillForm();
}

/** 기입 폼에 입력된 값이 있는가 — 대상자·항목 필드 중 하나라도 채워지면 true */
function _fillDirty() {
    const client = /** @type {HTMLInputElement|null} */ ($('cf-client'))?.value?.trim();
    if (client) return true;
    return [...document.querySelectorAll('[data-cf-field]')].some(el => /** @type {HTMLInputElement} */ (el).value.trim());
}

// — 기본 양식을 기관 파일로 생성 — 업로드 파일이 도구 출력 서식(연동 사본)이 됨 —

let _seedFileTool = null; // 파일 대상 도구 키 (change 핸들러 전달용)

/** 기본 양식 "파일로 만들기" — 숨긴 file input 트리거 */
export function careFormSeedFile(toolKey) {
    _seedFileTool = toolKey;
    /** @type {HTMLInputElement|null} */ ($('cf-seed-file'))?.click();
}

/** 기관 양식 파일(.docx·.xlsx·.csv·.pdf) → 본문 추출 → 연동 사본 편집기에 로드 */
async function _onSeedFile(input) {
    const f = input.files?.[0];
    input.value = '';
    const toolKey = _seedFileTool;
    _seedFileTool = null;
    const def = toolKey && TOOL_FORM_SEEDS[toolKey];
    if (!f || !def) return;
    proFeatureNotice('care_form_extract', '기관 양식 파일 추출');
    showToast('양식 파일을 분석하는 중입니다…');
    let body = '';
    try {
        const n = (f.name || '').toLowerCase();
        if (/\.(xlsx|xls|csv)$/.test(n)) {
            const { extractFormXlsx } = await import('../care-form-pdf.js');
            const { parseCsv } = await import('../../../content/csv-utils.js');
            body = parseCsv((await extractFormXlsx(f)).text) // 표 구조 보존 — MD 표 행으로
                .filter(r => r.some(c => String(c || '').trim()))
                .map(r => '| ' + r.map(c => String(c || '').trim()).join(' | ') + ' |').join('\n');
        } else {
            const { extractFormDocx, extractFormPdf } = await import('../care-form-pdf.js');
            body = (await (n.endsWith('.docx') ? extractFormDocx(f) : extractFormPdf(f))).text;
        }
    } catch (e) {
        showToast(e instanceof Error && e.message ? e.message : '파일을 읽지 못했습니다 — 텍스트 기반 파일인지 확인하세요.', 'error');
        return;
    }
    if (!body.trim()) { showToast('파일에서 양식 내용을 찾지 못했습니다.', 'error'); return; }
    // 연동 사본이 이미 있으면 갱신 편집으로, 없으면 신규 연동 사본 (저장 시 toolKey 추론)
    const linked = allFormTemplates().find(t => t.toolKey === toolKey);
    await _openEditor(linked || { id: null, title: def.title, body, scope: 'local', toolKey });
    if (_editLoaded === null) return; // 미저장 편집분 보호 확인에서 취소 — 추출 결과는 폐기하지 않고 중단
    if (linked) fillTplEditor('cf-tpl', linked.title, body); // 추출 본문으로 교체
    // 도구 키 어시스트 — 추출 양식의 라벨이 도구 주입 키와 일치하면 {{키}} 표기를 안내
    const found = [...new Set(Array.from(def.seed.matchAll(/\{\{([가-힣a-zA-Z0-9_]{1,40})\}\}/g), m => m[1]))]
        .filter(k => k !== def.block && new RegExp(`${k}\\s*[:：]|\\|\\s*${k}\\s*\\|`).test(body));
    const kh = $('cf-tpl-keyhint');
    if (kh) kh.textContent = found.length
        ? `양식에서 도구 키 발견: ${found.map(k => `{{${k}}}`).join(' ')} — {{키}}로 표기하면 출력 시 자동 기입됩니다.`
        : '';
    showToast(body.includes(`{{${def.block}}}`)
        ? '기관 양식을 불러왔습니다 — 검토 후 저장하세요.'
        : `기관 양식을 불러왔습니다 — 출력 데이터가 들어갈 위치에 {{${def.block}}}를 넣어 저장하세요.`);
}

/** 기본 양식 사본 생성·편집 (CO-18) — 사본 생성 후 인라인 편집기를 바로 연다 */
export async function careFormSeedCopy(toolKey) {
    const def = TOOL_FORM_SEEDS[toolKey];
    if (!def) return;
    let tpl = allFormTemplates().find(t => t.toolKey === toolKey);
    if (!tpl) {
        const r = addFormTemplate({ title: def.title, body: def.seed, toolKey });
        if (!r.ok) { showToast(r.error || '저장 실패', 'error'); return; }
        tpl = allFormTemplates().find(t => t.id === r.id);
        showToast(`'${def.title}' 사본을 만들었습니다 — 수정 후 저장하세요.`);
    }
    if (tpl) await _openEditor(tpl); // 생성·기존 사본 모두 편집기로 진입
    renderTplList();
    renderSeedList();
}

export async function careFormTplDelete(id) {
    const t = _tplById(id);
    if (!t || !await showConfirm(`양식「${t.title || ''}」을 삭제할까요?`, '삭제 확인')) return;
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
    renderSeedList(); // toolKey 사본 삭제 시 기본 양식 버튼이 '사본 만들기'로 복귀
}

function renderTplList() {
    const host = $('cf-tpl-list');
    if (!host) return;
    const items = allFormTemplates();
    host.innerHTML = items.length
        ? items.map(t => `<div class="care-log-saved-item">
            <span>${t.scope === 'fac' ? '<em class="care-card-cat">기관</em> ' : ''}${t.toolKey ? `<em class="care-card-cat">${esc(TOOL_FORM_SEEDS[t.toolKey]?.title || '연동')}</em> ` : ''}${esc(t.title)} <small>${parseFields(t.body).length}개 항목</small></span>
            <button data-click="careFormTplUse" data-arg="${esc(t.id)}" class="btn">기입</button>
            <button data-click="careFormTplEdit" data-arg="${esc(t.id)}" class="btn btn-secondary">편집</button>
            <button data-click="careFormTplDelete" data-arg="${esc(t.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">등록된 양식이 없습니다 — 홈에서 양식 파일을 올리거나 직접 작성해 등록하세요.</p>';
}

/** 기본 양식(내장 도구 표준 서식) 목록 — 사본 생성 진입점 */
function renderSeedList() {
    const host = $('cf-seed-list');
    if (!host) return;
    host.innerHTML = Object.entries(TOOL_FORM_SEEDS).map(([key, def]) => {
        const linked = allFormTemplates().find(t => t.toolKey === key);
        return `<div class="care-log-saved-item">
            <span>${esc(def.title)} ${linked ? '<em class="care-card-cat">사본 있음</em>' : '<small>표준 양식</small>'}</span>
            <div class="care-log-saved-actions">
              <button data-click="careFormSeedCopy" data-arg="${esc(key)}" class="btn">${linked ? '사본 편집' : '사본 만들기'}</button>
              <button data-click="careFormSeedFile" data-arg="${esc(key)}" class="btn btn-secondary">📄 파일로 만들기</button>
            </div>
          </div>`;
    }).join('');
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
    if (r.ok) { showToast('기입 문서를 저장했습니다.'); renderDocList(); flashSavedBadge($('cf-doc-list')); }
}

export async function careFormDocDelete(id) {
    if (!id || !await showConfirm('기입한 문서를 삭제할까요?', '삭제 확인')) return;
    removeFormDoc(id); renderDocList();
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
    initTplEditor('cf-tpl'); // 인라인 편집기 — 파일 추출·필드 미리보기 바인딩
    // 기본 양식 파일 input — change는 직접 바인딩 (data-click은 클릭만)
    const seedFile = /** @type {HTMLInputElement|null} */ ($('cf-seed-file'));
    if (seedFile && !seedFile.dataset.bound) {
        seedFile.dataset.bound = '1';
        seedFile.addEventListener('change', () => void _onSeedFile(seedFile));
    }
    renderTplList();
    renderSeedList();
    renderFillForm();
    renderDocList();
    void refreshOrgName();
    void syncPendingFormDocs();
    void myMembership().then(m => {
        _membership = m;
        $('cf-tpl-facsave')?.classList.toggle('is-hidden', !(m && m.role === 'manager'));
    }).catch(() => {});
    void syncFormTemplates().then(renderTplList);
}
