// src/exams/carework/views/care-home.js — Care OS 홈 뷰 (오늘 요약·확인 권장·빠른 기록)
// @spec CO-12 — 시험 전용 실무 뷰 (DA-13)
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listIncidents } from '../incident-store.js';
import { listClients } from '../care-client-store.js';
import { clientTrends } from '../care-trend.js';
import { markFunnel, funnelStats } from '../care-funnel.js';
import { escapeHTML as esc } from '../../../core/sanitize.js';
import { refreshOrgName, getDocSign, setDocSign, setDocSignImage, signFileToDataUri, myMembership, submitFormTemplate } from '../facility.js';
import { showToast } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';
import { initTplEditor, fillTplEditor, readTplEditor } from '../form-template-editor.js';
import { addFormTemplate, updateFormTemplate, consumePendingTplEdit, syncFormTemplates } from '../form-template-store.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';

const $ = (id) => document.getElementById(id);
const dayOf = (r) => r.date || r.shift_date || '';

export function initCareHomeView() {
    markFunnel('tool:care-home');
    void refreshOrgName();
    const d = todayKey();
    const logs = listCareLogs(), visits = listVisits(), incidents = listIncidents();
    const cnt = (arr) => arr.filter(r => dayOf(r) === d).length;
    const dateEl = $('home-date');
    if (dateEl) dateEl.textContent = `${d} (${'일월화수목금토'[new Date().getDay()]})`;
    const sumEl = $('home-summary');
    if (sumEl) sumEl.textContent = `일지 ${cnt(logs)}건 · 방문 ${cnt(visits)} · 사고 ${cnt(incidents)}`;
    const warns = listClients().flatMap(c =>
        clientTrends(logs, { clientId: c.id, name: c.name }).map(t => `${c.name} — ${t.message}`));
    const wEl = $('home-warn');
    if (wEl) wEl.innerHTML = warns.map(w => `<div class="care-trend-warn">⚠ ${esc(w)}</div>`).join('');
    // 미사용 도구 "처음" 마크 — 퍼널 사용 횟수 0인 도구
    const used = funnelStats()?.tools || {};
    document.querySelectorAll('.care-home-nav a[href^="#/"]').forEach(a => {
        if (a.querySelector('.care-new')) return;
        const slug = /** @type {HTMLAnchorElement} */ (a).href.split('#/')[1];
        if (slug && !(used[`tool:${slug}`] > 0)) a.insertAdjacentHTML('beforeend', '<span class="care-new">처음</span>');
    });
    // 출력물 서명 설정 — 홈 입력값을 저장값으로 채움
    const sign = getDocSign();
    const aEl = /** @type {HTMLInputElement|null} */ ($('home-sign-author'));
    const cEl = /** @type {HTMLInputElement|null} */ ($('home-sign-confirmer'));
    const rEl = /** @type {HTMLInputElement|null} */ ($('home-sign-receiver'));
    if (aEl) aEl.value = sign.author;
    if (cEl) cEl.value = sign.confirmer;
    if (rEl) rEl.value = sign.receiver;
    // 서명 이미지 — 선택 즉시 data URI로 저장, 미리보기·삭제 버튼 갱신
    const imgEl = /** @type {HTMLInputElement|null} */ ($('home-sign-image'));
    const pvEl = $('home-sign-image-preview');
    const renderImg = () => {
        if (!pvEl) return;
        const cur = getDocSign().signImage;
        pvEl.innerHTML = cur
            ? `<img class="care-sign-preview" src="${cur}" alt="등록된 서명"> <button type="button" class="btn btn-secondary" id="home-sign-image-clear">이미지 삭제</button>`
            : '<span class="care-log-hint">서명 이미지 미등록 — 등록하면 문서 서명란에 이미지가 기입됩니다.</span>';
        pvEl.querySelector('#home-sign-image-clear')?.addEventListener('click', () => { setDocSignImage(''); renderImg(); showToast('서명 이미지를 삭제했습니다.'); });
    };
    if (imgEl && !imgEl.dataset.bound) {
        imgEl.dataset.bound = '1';
        imgEl.addEventListener('change', () => {
            const f = imgEl.files?.[0];
            if (!f) return;
            // 어떤 형식이든 서명란 규격 WebP로 정규화 후 저장 — 실패 시 원본 data URI 폴백
            void signFileToDataUri(f)
                .then(uri => { setDocSignImage(uri); renderImg(); showToast('서명 이미지를 저장했습니다 — 서명란에 이미지가 기입됩니다.'); })
                .catch(() => showToast('서명 이미지를 읽지 못했습니다.'));
        });
    }
    renderImg();
    // 기관 양식 등록 편집기 — 커스텀폼 뷰 '편집' 이관분 채움 + manager 기관등록 버튼 표시
    initTplEditor('home-tpl');
    const pending = consumePendingTplEdit();
    if (pending) {
        fillTplEditor('home-tpl', pending.title, pending.body);
        _tplEditId = pending.scope === 'fac' ? null : pending.id; // 기관 양식은 사본으로 저장
        if (pending.scope === 'fac') showToast('기관 양식을 불러왔습니다 — 저장하면 이 기기의 사본이 됩니다.');
    }
    void myMembership().then(m => {
        const btn = $('home-tpl-facsave');
        if (btn) btn.classList.toggle('is-hidden', !(m && m.role === 'manager'));
    }).catch(() => {});
}

let _tplEditId = null;

/** 양식 파일 선택 — 숨긴 file input 트리거 (CO-17) */
export function careHomeTplPdfPick() {
    /** @type {HTMLInputElement|null} */ ($('home-tpl-file'))?.click();
}

/** 양식 저장 — 로컬 템플릿 등록·편집 (기입은 「기관 양식」 뷰에서) */
export function careHomeTplSave() {
    const { title, body } = readTplEditor('home-tpl');
    if (!title || !body.trim()) { showToast('양식명과 본문을 입력하세요.', 'error'); return; }
    if (_tplEditId) {
        const r = updateFormTemplate(_tplEditId, { title, body });
        r.ok ? showToast('양식을 수정했습니다.') : showToast(r.error, 'error');
        _tplEditId = null;
    } else {
        const r = addFormTemplate({ title, body });
        if (!r.ok) { showToast(r.error, 'error'); return; }
        showToast('양식을 저장했습니다 — 「기관 양식」 뷰에서 기입·출력하세요.');
    }
    fillTplEditor('home-tpl', '', '');
}

/** 기관 양식으로 등록 — manager 전용, facility_form_templates에 저장 (CO-17) */
export async function careHomeTplFacSave() {
    const m = await myMembership().catch(() => null);
    if (!m || m.role !== 'manager') { showToast('기관 등록은 관리책임자만 가능합니다.', 'error'); return; }
    const { title, body } = readTplEditor('home-tpl');
    if (!title || !body.trim()) { showToast('양식명과 본문을 입력하세요.', 'error'); return; }
    proFeatureNotice('facility_workspace', '기관 양식 등록');
    const r = await submitFormTemplate({ facilityId: m.facility_id, title, body });
    if ('error' in r) { showToast('등록 실패: ' + r.error, 'error'); return; }
    showToast('기관 양식으로 등록했습니다 — 멤버 전체가 사용할 수 있습니다.');
    fillTplEditor('home-tpl', '', '');
    void syncFormTemplates();
}

/** 서명 이미지 선택 — 숨긴 file input 트리거 (버튼 스타일 피커) */
export function careSignImagePick() {
    const imgEl = /** @type {HTMLInputElement|null} */ ($('home-sign-image'));
    if (imgEl) imgEl.click();
}

/** 출력물 서명 저장 — 작성자·확인자·인수자 성명이 모든 문서 서명란에 기입된다 */
export function careDocSignSave() {
    setDocSign(
        /** @type {HTMLInputElement|null} */ ($('home-sign-author'))?.value,
        /** @type {HTMLInputElement|null} */ ($('home-sign-confirmer'))?.value,
        /** @type {HTMLInputElement|null} */ ($('home-sign-receiver'))?.value);
    showToast('서명을 저장했습니다 — 모든 출력물 서명란에 기입됩니다.');
}
