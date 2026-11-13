// src/exams/carework/views/care-visit.js — 면회·방문 기록 뷰
// @spec UX-FORM-03,UX-FORM-05 — 시험 전용 실무 뷰 (DA-13)
import { RELATIONS, VISIT_STATUS, relationLabel, buildVisitText, visitsToCsv } from '../care-visit.js';
import { markFunnel } from '../care-funnel.js';
import { listVisits, saveVisit, updateVisit, removeVisit } from '../care-visit-store.js';
import { attachClientPicker, clientField } from '../care-client-field.js';
import { downloadSheet } from '../../../content/xlsx-utils.js';
import { myMembership, submitVisit, listVisits as listFacilityVisits, updateVisitResult, refreshOrgName, signFileToDataUri } from '../facility.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast, showConfirm, flashSavedBadge, requireFields } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
import { docMdHead, docMdSign, csvToMdTable, mdToHtml } from '../doc-md.js';
import { renderToolBody } from '../form-seeds.js';
export { careShare } from '../care-share.js';
export { careVisitVoiceToggle } from '../care-voice.js';
import { voiceButtonsInit } from '../care-voice.js';

/** @param {string} id */
const $ = (id) => document.getElementById(id);
/** @param {*} s */
const esc = (s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);
/** @param {string} id @param {string} fb */
const _val = (id, fb) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fb;
};
/** @type {*|null} */
let _facility = null;
/** @type {*[]} */
let _fvList = [];
/** @type {{scope:string, id:string}|null} */
let _resultTarget = null; // {scope:'local'|'facility', id}
const PHOTO_MAX = 3; // 첨부 사진 한도 — localStorage 쿼터 보호
/** @type {string[]} */ const _vPhotos = [];

function readForm() {
    return {
        date: _val('vis-date', ''),
        time: _val('vis-time', ''),
        ...clientField('vis-client'),
        visitor: _val('vis-visitor', ''),
        phone: _val('vis-phone', ''),
        relation: _val('vis-relation', ''),
        purpose: _val('vis-purpose', ''),
    };
}

// UX-FORM-03 — 공통 필수 검증 (방문예약·기관 등록 공유): 인라인 오류 + 첫 오류 필드 포커스
function _requireVisitFields() {
    return requireFields([
        [/** @type {HTMLInputElement|null} */ ($('vis-date')), '방문일을 입력하세요.'],
        [/** @type {HTMLInputElement|null} */ ($('vis-client')), '대상자를 입력하세요.'],
        [/** @type {HTMLInputElement|null} */ ($('vis-visitor')), '방문객을 입력하세요.'],
    ]);
}

export function careVisitAdd() {
    const f = readForm();
    if (!_requireVisitFields()) return;
    const r = saveVisit(f);
    if (r.ok) { showToast('방문예약을 등록했습니다.'); renderLists(); flashSavedBadge($('vis-scheduled')); }
}

/** @param {string} arg */
export function careVisitResultOpen(arg) {
    const [scope, id] = String(arg || '').split(':');
    if (!id) return;
    _resultTarget = { scope: scope || '', id };
    const panel = $('vis-result-panel');
    if (!panel) return;
    const head = $('vis-result-for');
    const src = scope === 'fac'
        ? _fvList.find((/** @type {*} */ v) => v.id === id)
        : listVisits().find((/** @type {*} */ v) => v.id === id);
    if (head && src) head.textContent = `${src.client} ← ${src.visitor_name || src.visitor}`;
    const d = /** @type {HTMLInputElement|null} */ ($('vis-result-date'));
    if (d && !d.value) d.value = todayKey();
    _vPhotos.length = 0;
    if (src?.result?.photos) _vPhotos.push(...src.result.photos); // 기존 첨부 사진 복원
    _renderVPhotos();
    panel.classList.remove('is-hidden');
    panel.scrollIntoView?.({ block: 'nearest' });
}

function _closeResultPanel() {
    _resultTarget = null;
    _vPhotos.length = 0;
    const sum = /** @type {HTMLTextAreaElement|null} */ ($('vis-result-summary'));
    if (sum) sum.value = '';
    $('vis-result-panel')?.classList.add('is-hidden');
}

export async function careVisitResultClose() {
    // UX-FORM-05 — 작성 중인 요약·첨부 사진이 있으면 닫기 전 확인 (날짜는 자동기입이라 제외)
    const dirty = _vPhotos.length > 0 || _val('vis-result-summary', '').trim() || _val('vis-result-time', '').trim();
    if (dirty && !await showConfirm('작성 중인 방문결과가 있습니다. 저장하지 않은 내용은 지워집니다. 닫을까요?', '결과 기록 닫기')) return;
    _closeResultPanel();
}

/** 사진 추가 버튼 — 숨긴 file input 트리거 (최대 PHOTO_MAX장) */
export function careVisitPhotoPick() {
    if (_vPhotos.length >= PHOTO_MAX) { showToast(`사진은 최대 ${PHOTO_MAX}장까지 첨부됩니다.`, 'error'); return; }
    /** @type {HTMLInputElement|null} */ ($('vis-photo-file'))?.click();
}

/** @param {string|number} idx */
export async function careVisitPhotoRemove(idx) {
    const i = Number(idx);
    if (!(i >= 0 && i < _vPhotos.length)) return;
    if (!await showConfirm('이 사진을 삭제할까요?', '사진 삭제')) return;
    _vPhotos.splice(i, 1);
    _renderVPhotos();
}

function _renderVPhotos() {
    const host = $('vis-photo-list');
    if (!host) return;
    host.innerHTML = _vPhotos.map((/** @type {string} */ p, /** @type {number} */ i) =>
        `<span class="care-photo-thumb"><img src="${p}" alt="첨부 사진 ${i + 1}"><button type="button" class="care-photo-del" data-click="careVisitPhotoRemove" data-arg="${i}" title="사진 삭제">✕</button></span>`
    ).join('') || '<span class="care-log-hint">전달 물품·대상자 상태 등 사진을 첨부하면 문서에 함께 표시됩니다 (최대 3장)</span>';
}

export async function careVisitResultSave() {
    if (!_resultTarget) { showToast('결과를 기록할 예약을 먼저 선택하세요.', 'error'); return; }
    const result = {
        date: _val('vis-result-date', ''),
        time: _val('vis-result-time', ''),
        summary: _val('vis-result-summary', ''),
        photos: _vPhotos.slice(), // 첨부 사진은 결과에 병합 저장
    };
    if (!requireFields([[/** @type {HTMLInputElement|null} */ ($('vis-result-date')), '방문일을 입력하세요.']])) return;
    const t = _resultTarget;
    if (t.scope === 'fac') {
        const r = await updateVisitResult(t.id, { status: 'done', result });
        if (r.error) { showToast('기록 실패: ' + r.error, 'error'); return; }
        showToast('기관 면회 대장에 결과를 등록했습니다.');
        void renderFacility();
    } else {
        updateVisit(t.id, { status: 'done', result });
        showToast('방문결과를 기록했습니다.');
        flashSavedBadge($('vis-done'));
        renderLists();
    }
    _closeResultPanel(); // 저장 성공 경로 — 확인 없이 바로 닫기
}

/** @param {string} arg */
export async function careVisitCancel(arg) {
    const [scope, id] = String(arg || '').split(':');
    if (!id) return;
    if (scope === 'fac') {
        const r = await updateVisitResult(id, { status: 'canceled' });
        r.error ? showToast('취소 실패: ' + r.error, 'error') : showToast('예약을 취소했습니다.');
        void renderFacility();
    } else {
        updateVisit(id, { status: 'canceled' });
        renderLists();
    }
}

/** @param {string} id */
export async function careVisitDelete(id) {
    if (!id || !await showConfirm('방문 기록을 삭제할까요?', '삭제 확인')) return;
    removeVisit(id); renderLists();
}

function buildAllText() {
    const items = listVisits();
    if (!items.length) return '';
    return '면회·방문 기록\n\n' + items.map(buildVisitText).filter(Boolean).join('\n\n────────\n\n');
}

function renderPreview() {
    const out = $('vis-preview');
    if (!out) return;
    out.innerHTML = mdToHtml(careVisitDocMd());
    // 첨부 사진 섹션 — 표 구조 문서라 레코드별 그리드를 문서 말미에 병기
    const withPhotos = listVisits().filter((/** @type {*} */ v) => v.result?.photos?.length);
    if (withPhotos.length) out.innerHTML += '<h3>📷 첨부 사진</h3>' + withPhotos.map((/** @type {*} */ v) =>
        `<div class="care-photo-sub">${esc(v.client)} · ${esc(v.date)}</div><div class="care-photo-grid">${v.result.photos.map((/** @type {string} */ p) => `<img src="${p}" alt="첨부 사진">`).join('')}</div>`).join('');
}

/** 방문 기록 문서 미리보기 — 저장 기록 전체를 문서로 렌더 (내보내기 메뉴 자동 생성기, 복사·인쇄·PDF 공통 원본) */
export function careVisitPreview() {
    const t = buildAllText();
    if (!t) { showToast('내보낼 방문 기록이 없습니다.', 'error'); return; }
    renderPreview();
}

export function careVisitPrint() {
    const t = buildAllText();
    if (!t) { showToast('인쇄할 방문 기록이 없습니다.', 'error'); return; }
    renderPreview();
    proFeatureNotice('care_visit_share', '방문기록 인쇄·PDF');
    window.print();
}

/** 방문 기록 MD 초안 — 저장 기록 전체를 표 구조로 (docx·xlsx 파생 원본) */
export function careVisitDocMd() {
    const items = listVisits();
    if (!items.length) return '';
    return docMdHead('면회·방문 기록') + '\n' + renderToolBody('careVisit', { 기록표: csvToMdTable(visitsToCsv(items)) }) + docMdSign([['작성자', 'author']]);
}

export function careVisitCsvExport() {
    const items = listVisits();
    if (!items.length) { showToast('내보낼 방문 기록이 없습니다.', 'error'); return; }
    proFeatureNotice('care_visit_share', '방문기록 Excel 내보내기');
    const csv = visitsToCsv(items);
    void downloadSheet(csv, '면회기록.xlsx');
    showToast('Excel 파일을 저장했습니다.');
    return csv;
}

function renderLists() {
    const items = listVisits();
    const sched = $('vis-scheduled');
    if (sched) {
        const rows = items.filter(v => v.status === 'scheduled');
        sched.innerHTML = rows.length
            ? rows.map((/** @type {*} */ v) => `<div class="care-log-saved-item">
                <span>${esc(v.date)}${v.time ? ' ' + esc(v.time) : ''} · ${esc(v.client)} ← ${esc(v.visitor)}(${esc(relationLabel(v.relation))})${v.phone ? esc(' ' + v.phone) : ''}${v.purpose ? ' — ' + esc(v.purpose) : ''}</span>
                <button data-click="careVisitResultOpen" data-arg="loc:${esc(v.id)}" class="btn btn-secondary">결과 기록</button>
                <button data-click="careVisitCancel" data-arg="loc:${esc(v.id)}" class="btn btn-secondary">취소</button>
                <button data-click="careVisitDelete" data-arg="${esc(v.id)}" class="btn btn-secondary">삭제</button>
              </div>`).join('')
            : '<p class="care-log-empty">등록된 방문예약이 없습니다.</p>';
    }
    const done = $('vis-done');
    if (done) {
        const rows = items.filter((/** @type {*} */ v) => v.status !== 'scheduled');
        done.innerHTML = rows.length
            ? rows.map(v => `<div class="care-log-saved-item">
                <span>${esc(v.date)} · ${esc(v.client)} ← ${esc(v.visitor)} — ${esc((/** @type {Object.<string,string>} */ (VISIT_STATUS))[v.status] || '')}${v.result && v.result.summary ? esc(' · ' + v.result.summary) : ''}</span>
                <button data-click="careVisitDelete" data-arg="${esc(v.id)}" class="btn btn-secondary">삭제</button>
              </div>`).join('')
            : '<p class="care-log-empty">완료·취소된 방문이 없습니다.</p>';
    }
}

async function renderFacility() {
    const host = $('vis-facility');
    if (!host) return;
    if (!_facility) {
        try { _facility = (await myMembership())?.facilities || null; } catch (e) { _facility = null; }
    }
    if (!_facility) return;
    try { _fvList = await listFacilityVisits(_facility.id, { limit: 20 }); } catch (e) { _fvList = []; }
    host.innerHTML = `
        <div class="care-audit-sec">
            <h3>기관 면회 대장 — ${esc(_facility.name)}</h3>
            ${_fvList.map((/** @type {*} */ v) => `
                <div class="care-log-saved-item">
                    <span>${esc(v.visit_date)}${v.visit_time ? ' ' + esc(v.visit_time) : ''} · ${esc(v.client)} ← ${esc(v.visitor_name)}${v.visitor_phone ? esc(' ' + v.visitor_phone) : ''} — ${esc((/** @type {Object.<string,string>} */ (VISIT_STATUS))[v.status] || v.status)}${v.result && v.result.summary ? esc(' · ' + v.result.summary) : ''}</span>
                    ${v.status === 'scheduled' ? `<button data-click="careVisitResultOpen" data-arg="fac:${esc(v.id)}" class="btn btn-secondary">결과 기록</button>
                    <button data-click="careVisitCancel" data-arg="fac:${esc(v.id)}" class="btn btn-secondary">취소</button>` : ''}
                </div>`).join('')}
        </div>`;
}

export async function careVisitFacilitySubmit() {
    // 버튼은 정적 마크업이라 renderFacility()의 멤버십 해석보다 먼저 클릭될 수 있다 — 재해석 후 판정
    if (!_facility) {
        try { _facility = (await myMembership())?.facilities || null; } catch (e) { _facility = null; }
    }
    if (!_facility) { showToast('소속 기관이 없습니다 — 기관 가입 후 이용하세요.', 'error'); return; }
    const f = readForm();
    if (!_requireVisitFields()) return;
    proFeatureNotice('care_visit_share', '기관 방문예약 공유');
    const r = await submitVisit({
        facilityId: _facility.id,
        client: f.client,
        visitor: f.visitor,
        phone: f.phone,
        relation: relationLabel(f.relation),
        visitDate: f.date,
        visitTime: f.time,
        purpose: f.purpose,
    });
    'error' in r ? showToast('공유 실패: ' + r.error, 'error') : showToast('기관 면회 대장에 등록했습니다.');
    void renderFacility();
}

export function initCareVisitView() {
    markFunnel('tool:care-visit');
    voiceButtonsInit(); // 음성 입력 미지원 브라우저는 🎤 숨김
    const _picker = /** @type {HTMLInputElement|null} */ ($('vis-client'));
    if (_picker) attachClientPicker(_picker);
    const d = /** @type {HTMLInputElement|null} */ ($('vis-date'));
    if (d && !d.value) d.value = todayKey();
    const s = $('vis-relation');
    if (s && !s.children.length)
        s.innerHTML = RELATIONS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    // 사진 첨부 — 결과 패널 파일 선택 시 리사이즈 dataURI로 변환 (재진입 시 onchange 재할당 → 중복 바인딩 없음)
    const pf = /** @type {HTMLInputElement|null} */ ($('vis-photo-file'));
    if (pf) pf.onchange = async () => {
        for (const file of [...(pf.files || [])].slice(0, PHOTO_MAX - _vPhotos.length)) {
            try { _vPhotos.push(await signFileToDataUri(file)); }
            catch { showToast('사진을 읽지 못했습니다.', 'error'); }
        }
        pf.value = '';
        _renderVPhotos();
    };
    renderLists();
    void renderFacility();
    void refreshOrgName();
}
