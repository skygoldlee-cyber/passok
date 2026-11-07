// src/exams/carework/form-template-editor.js — 기관 양식 등록 편집기 공용
// @spec CO-17 — 시험 전용 도메인 로직 (DA-13)
// 홈·커스텀폼 뷰가 같은 편집기를 id 접두사로 공유 — 파일 추출 파이프라인 단일화.
import { parseFields } from './form-template-store.js';
import { extractFormPdf, extractFormDocx, extractFormXlsx, textToTemplate, fieldsToTemplate } from './care-form-pdf.js';
import { requestFormExtract } from '../../ai/ai-client.js';
import { escapeHTML as esc } from '../../core/sanitize.js';
import { showToast } from '../../ui-utils.js';
import { proFeatureNotice } from '../../pro/pro-upgrade.js';

const $ = (id) => document.getElementById(id);

/** 편집기 요소 접근 — prefix는 'home-tpl'·'cf-tpl' 등 뷰별 접두사 */
export function readTplEditor(prefix) {
    return {
        title: /** @type {HTMLInputElement|null} */ ($(`${prefix}-title`))?.value?.trim() || '',
        body: /** @type {HTMLTextAreaElement|null} */ ($(`${prefix}-body`))?.value || '',
    };
}

export function fillTplEditor(prefix, title, body) {
    const t = /** @type {HTMLInputElement|null} */ ($(`${prefix}-title`));
    const b = /** @type {HTMLTextAreaElement|null} */ ($(`${prefix}-body`));
    if (t) t.value = title;
    if (b) b.value = body;
    renderTplFields(prefix);
}

/** 본문 {{키}} 미리보기 — 저장 전 기입 필드 확인 */
export function renderTplFields(prefix) {
    const el = $(`${prefix}-fields`);
    if (!el) return;
    const fields = parseFields(readTplEditor(prefix).body);
    el.innerHTML = fields.length
        ? `<span class="care-log-hint">기입 필드 ${fields.length}개: ${fields.map(f => esc(f.label)).join(', ')}</span>`
        : '<span class="care-log-hint">기입 필드 없음 — 본문에 {{항목}} 플레이스홀더를 넣으면 기입 필드가 됩니다.</span>';
}

/** 확장자별 추출기 — AcroForm 필드는 PDF만 존재 */
const _extract = f => {
    const n = (f.name || '').toLowerCase();
    if (n.endsWith('.docx')) return extractFormDocx(f);
    if (/\.(xlsx|xls|csv)$/.test(n)) return extractFormXlsx(f);
    return extractFormPdf(f);
};

/** 양식 파일(PDF·DOCX·Excel) → 추출 → 자체 AI 템플릿 초안 → 편집기 채움 (실패 시 휴리스틱 폴백) */
async function _onTplFile(input, prefix) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    proFeatureNotice('care_form_extract', '양식 파일 AI 추출');
    showToast('양식 파일을 분석하는 중입니다…');
    let ex;
    try { ex = await _extract(f); }
    catch (e) { showToast(e instanceof Error && e.message ? e.message : '파일을 읽지 못했습니다 — 텍스트 기반 파일인지 확인하세요.', 'error'); return; }
    const hint = f.name.replace(/\.(pdf|docx|xlsx|xls|csv)$/i, '');
    if (ex.fields.length) { // AcroForm — 대화형 필드가 있으면 그대로 템플릿화
        const t = fieldsToTemplate(ex.fields, hint);
        fillTplEditor(prefix, t.title, t.body);
        showToast(`대화형 필드 ${ex.fields.length}개를 추출했습니다 — 검토 후 저장하세요.`);
        return;
    }
    if (!ex.text.trim()) { showToast('텍스트가 없는 스캔 파일입니다 — 직접 입력하거나 텍스트 기반 파일을 사용하세요.', 'error'); return; }
    const r = await requestFormExtract({ text: ex.text, hint });
    if (r.ok) {
        fillTplEditor(prefix, r.title, r.body);
        showToast('AI가 양식 초안을 만들었습니다 — 검토·수정 후 저장하세요.');
        return;
    }
    const t = textToTemplate(ex.text, hint);
    fillTplEditor(prefix, t.title, t.body);
    showToast(r.code === 'unauthorized'
        ? 'AI 추출은 로그인 후 이용 가능 — 텍스트를 그대로 넣었으니 {{항목}}을 표시해 저장하세요.'
        : `${r.error || 'AI 추출 불가'} — 텍스트를 그대로 넣었으니 편집 후 저장하세요.`);
}

/** 편집기 바인딩 — file input change + 본문 input → 필드 미리보기 (뷰 init에서 호출) */
export function initTplEditor(prefix) {
    const fileEl = /** @type {HTMLInputElement|null} */ ($(`${prefix}-file`));
    if (fileEl && !fileEl.dataset.bound) {
        fileEl.dataset.bound = '1';
        fileEl.addEventListener('change', () => void _onTplFile(fileEl, prefix));
    }
    const bodyEl = /** @type {HTMLTextAreaElement|null} */ ($(`${prefix}-body`));
    if (bodyEl && !bodyEl.dataset.bound) {
        bodyEl.dataset.bound = '1';
        bodyEl.addEventListener('input', () => renderTplFields(prefix));
    }
    renderTplFields(prefix);
}
