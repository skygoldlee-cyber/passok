// src/exams/carework/views/care-roster.js — 교대 근무표 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { ROSTER_SHIFTS, shiftLabel, buildRosterText, rosterToCsv, csvToRoster } from '../care-roster.js';
import { markFunnel } from '../care-funnel.js';
import { listRoster, saveRoster, removeRoster, upsertRoster, syncPendingRoster } from '../roster-store.js';
import { readTableFile, downloadSheet } from '../../../content/xlsx-utils.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { docMdHead, csvToMdTable, mdToHtml, docMdSign } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
import { refreshOrgName } from '../facility.js';
import { showToast } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};

function readForm() {
    return {
        date: _val('ros-date', ''),
        shift: _val('ros-shift', 'day'),
        worker: _val('ros-worker', ''),
        note: _val('ros-note', ''),
    };
}

export function careRosterAdd() {
    const f = readForm();
    if (!f.date || !f.worker) { showToast('근무일·근무자를 입력하세요.', 'error'); return; }
    const r = saveRoster(f);
    if (r.ok) { showToast('근무 배정을 등록했습니다.'); renderList(); }
}

export function careRosterDelete(id) {
    if (id) { removeRoster(id); renderList(); }
}

function renderPreview() {
    const out = $('ros-preview');
    if (out) out.innerHTML = mdToHtml(careRosterDocMd());
}

/** 근무표 MD 초안 — 배정 표 구조 (docx·xlsx 파생 원본) */
export function careRosterDocMd() {
    const items = listRoster();
    if (!items.length) return '';
    return docMdHead('교대 근무표') + '\n' + renderToolBody('careRoster', { 근무표: csvToMdTable(rosterToCsv(items)) }) + docMdSign([['작성자', 'author']]);
}

/** 근무표 문서 미리보기 — 배정 목록을 문서로 렌더 (내보내기 메뉴 자동 생성기, 복사·인쇄·PDF 공통 원본) */
export function careRosterPreview() {
    const t = buildRosterText(listRoster());
    if (!t) { showToast('등록된 근무 배정이 없습니다.', 'error'); return; }
    renderPreview();
}

export function careRosterPrint() {
    const t = buildRosterText(listRoster());
    if (!t) { showToast('인쇄할 근무 배정이 없습니다.', 'error'); return; }
    renderPreview();
    proFeatureNotice('care_roster_share', '근무표 인쇄·PDF');
    window.print();
}

export function careRosterCsvExport() {
    const items = listRoster();
    if (!items.length) { showToast('등록된 근무 배정이 없습니다.', 'error'); return; }
    proFeatureNotice('care_roster_share', '근무표 Excel 내보내기');
    const csv = rosterToCsv(items);
    void downloadSheet(csv, '근무표.xlsx');
    showToast('CSV를 저장했습니다.');
    return csv;
}

export function careRosterCsvImport() {
    proFeatureNotice('care_roster_share', '근무표 Excel 가져오기');
    const f = /** @type {HTMLInputElement|null} */ ($('ros-csv-file'));
    if (f) f.click();
}

function onCsvFile(e) {
    const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
    if (!file) return;
    readTableFile(file).then(t => {
        const recs = csvToRoster(t);
        if (!recs.length) { showToast('불러올 근무 배정 행이 없습니다 (헤더: 날짜,근무조,근무자,메모).', 'error'); return; }
        const r = upsertRoster(recs);
        renderList();
        showToast(`가져오기 완료 — 신규 ${r.added}·갱신 ${r.updated}${r.skipped ? ` · 한도 초과 ${r.skipped}건 제외` : ''}`);
    });
    e.target.value = '';
}

function renderList() {
    const host = $('ros-list');
    if (!host) return;
    const items = [...listRoster()].sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));
    host.innerHTML = items.length
        ? items.map(x => `<div class="care-log-saved-item">
            <span>${esc(x.date)} · ${esc(shiftLabel(x.shift))} — ${esc(x.worker)}${x.note ? esc(' · ' + x.note) : ''}</span>
            <button data-click="careRosterDelete" data-arg="${esc(x.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">등록된 근무 배정이 없습니다.</p>';
}

export function initCareRosterView() {
    markFunnel('tool:care-roster');
    const d = /** @type {HTMLInputElement|null} */ ($('ros-date'));
    if (d && !d.value) d.value = todayKey();
    const s = $('ros-shift');
    if (s && !s.children.length)
        s.innerHTML = ROSTER_SHIFTS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const f = $('ros-csv-file');
    if (f && !f.dataset.wired) { f.dataset.wired = '1'; f.addEventListener('change', onCsvFile); }
    renderList();
    void refreshOrgName();
    void syncPendingRoster();
}
