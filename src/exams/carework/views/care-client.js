// src/exams/carework/views/care-client.js — 수급자 관리 뷰 (서류현황·CSV 왕복)
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { listClients, addClient, removeClient, upsertClients } from '../care-client-store.js';
import { markFunnel } from '../care-funnel.js';
import { clientsToCsv, ADMIT_ITEMS } from '../care-client-csv.js';
import { csvToClientsAny } from '../care-csv-presets.js';
import { readTableFile, downloadSheet } from '../../../content/xlsx-utils.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { docHeadHtml, getDocSign, refreshOrgName } from '../facility.js';
import { showToast } from '../../../ui-utils.js';
import { clientTimeline, timelineSummary } from '../care-timeline.js';
import { clientTrends } from '../care-trend.js';
import { weeklyReport } from '../care-report.js';
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listHandovers } from '../handover-store.js';
import { listIncidents } from '../incident-store.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _val = (id, fb) => {
    const el = /** @type {HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};
let _editId = null;

function readForm() {
    return {
        name: _val('cli-name', ''),
        room: _val('cli-room', ''),
        birth: _val('cli-birth', ''),
        allergy: _val('cli-allergy', ''),
        caution: _val('cli-caution', ''),
        phone: _val('cli-phone', ''),
        memo: _val('cli-memo', ''),
        status: _val('cli-status', '입소대기'),
        docs: _docValues(),
    };
}

function clearForm() {
    _editId = null;
    for (const id of ['cli-name', 'cli-room', 'cli-birth', 'cli-allergy', 'cli-caution', 'cli-phone', 'cli-memo']) {
        const el = /** @type {HTMLInputElement|null} */ ($(id));
        if (el) el.value = '';
    }
    const st = /** @type {HTMLSelectElement|null} */ ($('cli-status'));
    if (st) st.value = '입소대기';
    document.querySelectorAll('#cli-docs input[type=checkbox]').forEach(c => { /** @type {HTMLInputElement} */ (c).checked = false; });
    renderDocCount();
}

export function careClientSave() {
    const f = readForm();
    if (!f.name) { showToast('수급자 성명을 입력하세요.', 'error'); return; }
    const r = addClient(f, _editId || undefined);
    if (r.ok) { showToast(_editId ? '수급자 정보를 수정했습니다.' : '수급자를 등록했습니다.'); clearForm(); renderList(); }
}

export function careClientNew() { clearForm(); }

export function careClientLoad(id) {
    const c = listClients().find(x => x.id === id);
    if (!c) return;
    _editId = id;
    const set = (elId, v) => { const el = /** @type {HTMLInputElement|null} */ ($(elId)); if (el) el.value = v || ''; };
    set('cli-name', c.name); set('cli-room', c.room); set('cli-birth', c.birth);
    set('cli-allergy', c.allergy); set('cli-caution', c.caution); set('cli-phone', c.phone); set('cli-memo', c.memo);
    const st = /** @type {HTMLSelectElement|null} */ ($('cli-status'));
    if (st) st.value = c.status || '입소대기';
    document.querySelectorAll('#cli-docs input[type=checkbox]').forEach(cb => {
        const el = /** @type {HTMLInputElement} */ (cb);
        el.checked = !!(c.docs && el.dataset.doc && c.docs[el.dataset.doc]);
    });
    renderDocCount();
    showToast('수정 모드 — 저장하면 덮어씁니다.');
}

export function careClientDelete(id) {
    if (id) { removeClient(id); if (_editId === id) clearForm(); renderList(); }
}

function buildListText() {
    const items = listClients();
    if (!items.length) return '';
    return '대상자 명부\n\n' + items.map(c => [
        `성명: ${c.name}`,
        c.room ? `호실·병상: ${c.room}` : '',
        c.birth ? `생년월일: ${c.birth}` : '',
        c.allergy ? `알레르기: ${c.allergy}` : '',
        c.caution ? `주의사항: ${c.caution}` : '',
        c.phone ? `비상연락처: ${c.phone}` : '',
        c.memo ? `메모: ${c.memo}` : '',
    ].filter(Boolean).join('\n')).join('\n\n────────\n\n');
}

function renderPreview(t) {
    const out = $('cli-preview');
    if (out) out.innerHTML = docHeadHtml('수급자 명부') + `<pre class="care-log-text">${esc(t)}</pre>`;
}

export function careClientExport() {
    const t = buildListText();
    if (!t) { showToast('등록된 대상자가 없습니다.', 'error'); return; }
    proFeatureNotice('care_client_share', '명부 복사·내보내기');
    renderPreview(t);
    navigator.clipboard?.writeText(t).then(
        () => showToast('명부를 복사했습니다.'),
        () => showToast('복사에 실패했습니다.', 'error'));
}

export function careClientPrint() {
    const t = buildListText();
    if (!t) { showToast('등록된 대상자가 없습니다.', 'error'); return; }
    renderPreview(t);
    proFeatureNotice('care_client_share', '명부 인쇄·PDF');
    window.print();
}

function renderList() {
    const host = $('cli-list');
    if (!host) return;
    const items = listClients();
    const stores = { logs: listCareLogs(), visits: listVisits(), handovers: listHandovers(), incidents: listIncidents() };
    host.innerHTML = items.length
        ? items.map(c => `<div class="care-log-saved-item">
            <span><strong>${esc(c.name)}</strong>${c.status ? esc(' [' + c.status + ']') : ''}${c.room ? esc(' · ' + c.room) : ''}${_docSummary(c)}${c.caution ? esc(' · ⚠ ' + c.caution) : ''}${c.allergy ? esc(' · 알레르기 ' + c.allergy) : ''}${_timelineHtml(c, stores)}</span>
            <button data-click="careClientReport" data-arg="${esc(c.id)}" class="btn btn-secondary">주간리포트</button>
            <button data-click="careClientLoad" data-arg="${esc(c.id)}" class="btn btn-secondary">수정</button>
            <button data-click="careClientDelete" data-arg="${esc(c.id)}" class="btn btn-secondary">삭제</button>
          </div>`).join('')
        : '<p class="care-log-empty">등록된 대상자가 없습니다.</p>';
}

/** CO-02 대상자 360° 카드 — 통합 이력 배지 + 펼침 타임라인 */
function _timelineHtml(c, stores) {
    const tl = clientTimeline(c.id, c.name, stores);
    if (!tl.length) return '';
    const s = timelineSummary(tl);
    const kinds = Object.entries(s.kinds).map(([k, n]) => `${k} ${n}`).join('·');
    const warn = clientTrends(stores.logs, { clientId: c.id, name: c.name })
        .map(t => `<span class="care-trend-warn">⚠ ${esc(t.message)}</span>`).join('');
    return warn + `<details class="care-client-timeline"><summary>이력 ${s.count}건 (${esc(kinds)}) · 최근 ${esc(s.lastDate)}</summary><ul>` +
        tl.map(t => `<li><small>${esc(t.date)}</small> <strong>${esc(t.kind)}</strong> ${esc(t.label)}</li>`).join('') +
        '</ul></details>';
}

function _docValues() {
    const docs = {};
    document.querySelectorAll('#cli-docs input[type=checkbox]').forEach(cb => {
        const el = /** @type {HTMLInputElement} */ (cb);
        if (el.checked && el.dataset.doc) docs[el.dataset.doc] = true;
    });
    return docs;
}
function _docSummary(c) {
    const n = ADMIT_ITEMS.length;
    const done = ADMIT_ITEMS.filter(d => c.docs && c.docs[/** @type {string} */ (d.id)]).length;
    return done ? esc(` · 서류 ${done}/${n}`) : '';
}
function renderDocs() {
    const host = $('cli-docs');
    if (!host) return;
    host.innerHTML = ADMIT_ITEMS.map(d =>
        `<label class="care-audit-item"><input type="checkbox" data-doc="${esc(d.id)}"><span title="${esc(d.label)}">${esc(d.short)}</span></label>`).join('');
    host.addEventListener('change', renderDocCount);
    renderDocCount();
}
function renderDocCount() {
    const el = $('cli-docs-count');
    if (el) el.textContent = `${ADMIT_ITEMS.filter(d => _docValues()[d.id]).length}/${ADMIT_ITEMS.length}`;
}

export function careClientCsvExport() {
    const items = listClients();
    if (!items.length) { showToast('등록된 수급자가 없습니다.', 'error'); return; }
    proFeatureNotice('care_client_share', 'Excel 내보내기');
    const csv = clientsToCsv(items);
    void downloadSheet(csv, '수급자명부.xlsx');
    showToast('Excel 파일을 저장했습니다.');
    return csv;
}

export function careClientCsvImport() {
    proFeatureNotice('care_client_share', 'Excel 가져오기');
    const f = /** @type {HTMLInputElement|null} */ ($('cli-csv-file'));
    if (f) f.click();
}

function onCsvFile(e) {
    const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
    if (!file) return;
    readTableFile(file).then(t => {
        const recs = csvToClientsAny(t);
        if (!recs.length) { showToast('불러올 수급자 행이 없습니다 (헤더: 성명,상태,호실,…).', 'error'); return; }
        const r = upsertClients(recs);
        renderList();
        showToast(`가져오기 완료 — 신규 ${r.added}·갱신 ${r.updated}${r.skipped ? ` · 한도 초과 ${r.skipped}건 제외` : ''}`);
    });
    e.target.value = '';
}

/** CO-09 보호자 주간 리포트 — 대상자 최근 7일 기록 요약을 결과창에 생성 */
export function careClientReport(btn) {
    const id = /** @type {HTMLElement|null} */ (btn)?.dataset?.arg;
    const c = listClients().find(x => String(x.id) === String(id));
    if (!c) { showToast('대상자를 찾지 못했습니다.', 'error'); return; }
    const r = weeklyReport(c.name, { logs: listCareLogs(), visits: listVisits(), incidents: listIncidents() });
    if (!r.count) { showToast('최근 7일 기록이 없습니다.', 'error'); return; }
    const out = $('cli-preview');
    if (out) out.innerHTML = docHeadHtml('보호자 주간 리포트') + `<pre class="care-log-text">${esc(r.text)}</pre><p class="care-log-hint">기관 검토: ${esc(getDocSign().confirmer) || '____________'} &nbsp; 발행일: ${esc(new Date().toISOString().slice(0, 10))} — 수급자 정보 포함, 기관 정책 확인 후 전달</p>`;
}

export function initCareClientView() {
    markFunnel('tool:care-client');
    renderDocs();
    const f = $('cli-csv-file');
    if (f && !f.dataset.wired) { f.dataset.wired = '1'; f.addEventListener('change', onCsvFile); }
    renderList(); void refreshOrgName();
}
