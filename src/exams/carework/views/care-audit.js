// src/exams/carework/views/care-audit.js — 평가 체크리스트 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadAuditSections, loadCustomSections, saveCustomSections, clearCustomSections, loadChecks, toggleCheck, clearChecks, auditProgress, pushAuditState } from '../care-audit.js';
import { auditRowsToSections } from '../audit-import.js';
import { docHeadHtml, docSignHtml, refreshOrgName } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';
import { auditCoverage } from '../care-coverage.js';
import { listClients } from '../care-client-store.js';
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listHandovers } from '../handover-store.js';
import { listIncidents } from '../incident-store.js';
import { docMdHead, mdTable, mdToHtml, docMdSign } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _sections = [];

function render() {
    const host = $('audit-list');
    if (!host) return;
    const custom = !!loadCustomSections(); // 기관 업로드 점검표 사용 표시
    $('audit-custom-note')?.classList.toggle('is-hidden', !custom);
    $('audit-custom-reset')?.classList.toggle('is-hidden', !custom);
    const c = loadChecks();
    const cov = auditCoverage({ clients: listClients(), logs: listCareLogs(), visits: listVisits(), handovers: listHandovers(), incidents: listIncidents() });
    host.innerHTML = `<p class="care-trend-warn">📋 ${esc(cov.text)}</p>` + docHeadHtml('평가 체크리스트') + _sections.map(s => `
        <div class="care-audit-sec">
            <h3>${esc(s.title)}</h3>
            ${s.items.map(i => `
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
    const rows = _sections.flatMap(s => s.items.map(i => [s.title, c[i.id] ? '✔' : '□', i.text, i.ref]));
    return docMdHead('평가 체크리스트') + '\n' + renderToolBody('careAudit', { 점검표: mdTable(['영역', '점검', '항목', '근거'], rows) }) + docMdSign([['점검자', 'author'], ['기관장(확인)', 'confirmer']]);
}

export function careAuditPrint() {
    proFeatureNotice('care_audit_export', '점검표 인쇄·PDF');
    window.print();
}

export function careAuditReset() {
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
    const n = sections.reduce((a, s) => a + s.items.length, 0);
    if (!n) { showToast('점검 항목을 찾지 못했습니다 — 표 또는 줄 단위 항목이 필요합니다.', 'error'); return; }
    saveCustomSections(sections);
    _sections = await loadAuditSections();
    render();
    showToast(`기관 점검표 ${sections.length}개 영역 ${n}개 항목을 적용했습니다 — 같은 파일 재업로드 시 체크 상태가 유지됩니다.`);
}

/** 기본 고시 점검표로 복원 */
export async function careAuditFileReset() {
    clearCustomSections();
    _sections = await loadAuditSections().catch(() => _sections); // 기본 로드 실패 시 현행 유지
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
    try {
        _sections = await loadAuditSections();
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
