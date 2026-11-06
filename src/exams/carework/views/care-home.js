// src/exams/carework/views/care-home.js — Care OS 홈 뷰 (오늘 요약·확인 권장·빠른 기록)
// @spec CO-12 — 시험 전용 실무 뷰 (DA-13)
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listIncidents } from '../incident-store.js';
import { listClients } from '../care-client-store.js';
import { clientTrends } from '../care-trend.js';
import { markFunnel, funnelStats } from '../care-funnel.js';
import { escapeHTML as esc } from '../../../core/sanitize.js';
import { refreshOrgName, getDocSign, setDocSign, setDocSignImage } from '../facility.js';
import { showToast } from '../../../ui-utils.js';
import { todayKey } from '../../../core/utils.js';

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
            const reader = new FileReader();
            reader.onload = () => { setDocSignImage(String(reader.result || '')); renderImg(); showToast('서명 이미지를 저장했습니다 — 서명란에 이미지가 기입됩니다.'); };
            reader.readAsDataURL(f);
        });
    }
    renderImg();
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
