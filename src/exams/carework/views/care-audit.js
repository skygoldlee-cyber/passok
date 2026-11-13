// src/exams/carework/views/care-audit.js — 평가 체크리스트 뷰
// @spec CO-19 — 시험 전용 실무 뷰 (DA-13)
import { loadAuditSections, loadCustomSections, saveCustomSections, clearCustomSections, loadChecks, toggleCheck, clearChecks, auditProgress, pushAuditState } from '../care-audit.js';
import { auditRowsToSections } from '../audit-import.js';
import { docHeadHtml, docSignHtml, refreshOrgName, myMembership, listRecords } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast, showConfirm } from '../../../ui-utils.js';
import { auditCoverage } from '../care-coverage.js';
import { listClients } from '../care-client-store.js';
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listHandovers } from '../handover-store.js';
import { listIncidents } from '../incident-store.js';
import { docMdHead, mdTable, mdToHtml, docMdSign } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
export { careShare } from '../care-share.js';

/** @param {string} id */
const $ = (id) => document.getElementById(id);
/** @param {*} s */
const esc = (s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);
/** @type {*[]} */
let _sections = [];

function render() {
    const host = $('audit-list');
    if (!host) return;
    const custom = !!loadCustomSections(); // 기관 업로드 점검표 사용 표시
    $('audit-custom-note')?.classList.toggle('is-hidden', !custom);
    $('audit-custom-reset')?.classList.toggle('is-hidden', !custom);
    const c = loadChecks();
    const cov = auditCoverage({ clients: listClients(), logs: listCareLogs(), visits: listVisits(), handovers: listHandovers(), incidents: listIncidents() });
    host.innerHTML = `<p class="care-trend-warn">📋 ${esc(cov.text)}</p>` + docHeadHtml('평가 체크리스트') + _sections.map((/** @type {*} */ s) => `
        <div class="care-audit-sec">
            <h3>${esc(s.title)}</h3>
            ${s.items.map((/** @type {*} */ i) => `
                <label class="care-audit-item">
                    <input type="checkbox" data-audit="${esc(i.id)}" ${c[i.id] ? 'checked' : ''}>
                    <span>${esc(i.text)}</span>
                    <em>${esc(i.ref)}</em>
                </label>`).join('')}
        </div>`).join('')
        + docSignHtml([['점검자', 'author'], ['기관장(확인)', 'confirmer'], ['점검일', '']]);
    const p = auditProgress(_sections);
    const bar = $('audit-progress');
    if (bar) bar.innerHTML = `<strong>점검 진행 ${esc(p.done)}/${esc(p.total)}</strong><div class="care-audit-bar"><span style="width:${esc(p.total ? Math.round(p.done / p.total * 100) : 0)}%"></span></div>`;
    // 문서 미리보기 — 본문 복사·PDF의 원본 (체크박스 DOM은 ✔/□ 상태를 텍스트로 담지 못해 요약을 렌더)
    const pv = $('audit-preview');
    if (pv) pv.innerHTML = mdToHtml(careAuditDocMd());
}

/** 점검표 MD 초안 — 섹션별 항목을 표 구조로 (docx 파생·미리보기·본문 복사 공통 원본) */
export function careAuditDocMd() {
    if (!_sections.length) return '';
    const c = loadChecks();
    const rows = _sections.flatMap((/** @type {*} */ s) => s.items.map((/** @type {*} */ i) => [s.title, c[i.id] ? '✔' : '□', i.text, i.ref]));
    return docMdHead('평가 체크리스트') + '\n' + renderToolBody('careAudit', { 점검표: mdTable(['영역', '점검', '항목', '근거'], rows) }) + docMdSign([['점검자', 'author'], ['기관장(확인)', 'confirmer']]);
}

export function careAuditPrint() {
    if (!_sections.length) { showToast('인쇄할 점검 항목이 없습니다 — 점검표를 먼저 불러오세요.', 'error'); return; }
    proFeatureNotice('care_audit_export', '점검표 인쇄·PDF');
    window.print();
}

export async function careAuditReset() {
    if (!await showConfirm('입력한 점검 결과를 모두 초기화할까요?', '초기화 확인')) return;
    clearChecks();
    render();
}

/** 기관 점검표 파일 선택 — 숨긴 file input 트리거 */
export function careAuditFilePick() {
    /** @type {HTMLInputElement|null} */ ($('audit-file'))?.click();
}

/** 기관 점검표 파일(.docx·.xlsx·.csv) → 추출 → 커스텀 점검표로 저장·적용 */
export async function careAuditFileLoad() {
    const input = /** @type {HTMLInputElement|null} */ ($('audit-file'));
    const f = input?.files?.[0];
    if (input) input.value = '';
    if (!f) return;
    /** @type {string[][]} */ const rows = [];
    /** @type {string[]} */ const lines = [];
    try {
        if (/\.(xlsx|xls|csv)$/i.test(f.name || '')) {
            const { extractFormXlsx } = await import('../care-form-pdf.js');
            const { parseCsv } = await import('../../../content/csv-utils.js');
            rows.push(...parseCsv((await extractFormXlsx(f)).text));
        } else {
            const { extractFormDocx } = await import('../care-form-pdf.js');
            const { text } = await extractFormDocx(f);
            for (const l of String(text).split('\n')) {
                const t = l.trim();
                if (/^\|.*\|$/.test(t)) rows.push(t.slice(1, -1).split('|').map(c => c.trim()));
                else if (t) lines.push(t);
            }
        }
    } catch (e) {
        showToast(e instanceof Error && e.message ? e.message : '파일을 읽지 못했습니다 — 텍스트 기반 Word·Excel 파일인지 확인하세요.', 'error');
        return;
    }
    const sections = auditRowsToSections(rows, lines);
    const n = sections.reduce((/** @type {number} */ a, /** @type {*} */ s) => a + s.items.length, 0);
    if (!n) { showToast('점검 항목을 찾지 못했습니다 — 표 또는 줄 단위 항목이 필요합니다.', 'error'); return; }
    // 적용 전 파싱 결과 확인 — 영역/항목 분할이 어긋나면 여기서 취소
    _showImportPreview(sections, async () => {
        saveCustomSections(sections);
        _sections = (await loadAuditSections()) || [];
        _removeImportPreview();
        render();
        showToast(`기관 점검표 ${sections.length}개 영역 ${n}개 항목을 적용했습니다 — 같은 파일 재업로드 시 체크 상태가 유지됩니다.`);
    });
}

function _removeImportPreview() {
    $('audit-import-preview')?.remove();
}

/** 업로드 점검표 파싱 결과 검토 블록 — 적용/취소 버튼 (data-click 불가, 직접 바인딩) */
/** @param {*[]} sections @param {() => void} onApply */
function _showImportPreview(sections, onApply) {
    _removeImportPreview();
    const host = $('audit-list');
    const box = document.createElement('div');
    box.id = 'audit-import-preview';
    const n = sections.reduce((a, s) => a + s.items.length, 0);
    box.innerHTML = `<h4 class="care-log-hint">불러온 점검표 확인 — ${sections.length}개 영역 ${n}개 항목</h4>` +
        sections.map((/** @type {*} */ s) => `<div class="care-audit-sec"><h5>${esc(s.title)}</h5><ul>` +
            s.items.map((/** @type {*} */ i) => `<li>${esc(i.text)}${i.ref ? ` <small>${esc(i.ref)}</small>` : ''}</li>`).join('') +
            '</ul></div>').join('') +
        '<div class="care-calc-actions"><button type="button" class="btn" id="audit-import-apply">적용</button>' +
        '<button type="button" class="btn btn-secondary" id="audit-import-cancel">취소</button></div>';
    host?.parentNode?.insertBefore(box, host);
    box.querySelector('#audit-import-apply')?.addEventListener('click', () => void onApply());
    box.querySelector('#audit-import-cancel')?.addEventListener('click', _removeImportPreview);
    box.scrollIntoView?.({ block: 'nearest' });
}

/** 기본 고시 점검표로 복원 */
export async function careAuditFileReset() {
    if (!await showConfirm('사용자 점검표를 삭제하고 기본 고시 점검표로 되돌릴까요?', '복원 확인')) return;
    clearCustomSections();
    _sections = (await loadAuditSections().catch(() => _sections)) || []; // 기본 로드 실패 시 현행 유지
    render();
    showToast('기본 고시 점검표로 복원했습니다.');
}

export async function initCareAuditView() {
    void pushAuditState();
    void refreshOrgName();
    // 기관 점검표 파일 input — change는 직접 바인딩 (기본 점검표 로드 실패 시에도 업로드 가능하게)
    const fileEl = /** @type {HTMLInputElement|null} */ ($('audit-file'));
    if (fileEl && !fileEl.dataset.bound) {
        fileEl.dataset.bound = '1';
        fileEl.addEventListener('change', () => void careAuditFileLoad());
    }
    // 기관 공유 점검표 흡수 — 다른 멤버가 올린 커스텀 섹션을 audit_state 스냅샷에서 동기화
    try {
        const m = await myMembership();
        if (m) {
            const recs = await listRecords(m.facility_id, { docType: 'audit', limit: 20 });
            const remote = recs.find(r => r.local_id === 'audit_state' && r.payload && 'sections' in r.payload);
            if (remote) {
                const rs = remote.payload.sections;
                if (Array.isArray(rs) && rs.length) saveCustomSections(rs);
                else if (rs === null && loadCustomSections()) clearCustomSections(); // 원격 복원 동기화
            }
        }
    } catch { /* 미가입·오프라인 — 로컬 유지 */ }
    try {
        _sections = (await loadAuditSections()) || [];
    } catch (e) {
        const host = $('audit-list');
        if (host) host.innerHTML = '<p class="care-calc-err">체크리스트를 불러오지 못했습니다.</p>';
        return;
    }
    // 체크박스는 change 이벤트 — 컨테이너 위임
    const host = $('audit-list');
    host?.addEventListener('change', (e) => {
        const t = /** @type {HTMLInputElement|null} */ (e.target);
        if (t && t.dataset && t.dataset.audit) { toggleCheck(t.dataset.audit); render(); }
    });
    render();
}
