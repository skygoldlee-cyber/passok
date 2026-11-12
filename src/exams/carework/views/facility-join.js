// src/exams/carework/views/facility-join.js — 기관 가입 클라이언트 뷰 (DOC-DSN-43 6a, DA-13)
// @spec DA-18 — 권한 뷰 분리 (어드민·클라이언트 별도 뷰)
import { myMembership, syncFacilityNav, joinFacility, ROLES, getOrgName, setLocalOrgName, refreshOrgName } from '../facility.js';
import { getAuthSession } from '../../../auth-sync/supabase-client.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast, setFieldError, clearFieldError } from '../../../ui-utils.js';

const $ = (/** @type {string} */ id) => document.getElementById(id);
const esc = (/** @type {*} */ s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);

async function render() {
    const host = $('facility-join-body');
    if (!host) return;
    const session = await getAuthSession().catch(() => null);
    if (!session) {
        syncFacilityNav(null);
        host.innerHTML = '<p class="care-calc-err">기관 가입은 로그인이 필요합니다 — 사이드바 로그인 후 이용하세요.</p>';
        return;
    }
    const m = await myMembership();
    syncFacilityNav(m);
    if (!m) {
        host.innerHTML = `
            <div class="care-calc-form">
                <label>기관 초대 코드 <input id="fj-code" type="text" placeholder="초대 코드 8자리"></label>
                <p class="care-log-hint">관리책임자에게 받은 초대 코드를 입력하세요.</p>
                <div class="care-calc-actions"><button class="btn" data-click="facilityJoin">기관 가입</button></div>
            </div>
            <div class="care-calc-form">
                <h3>미가입 — 출력물 기관명</h3>
                <label>근무 기관명 <input id="fj-orgname" type="text" value="${esc(getOrgName())}" placeholder="예: 행복요양원"></label>
                <p class="care-log-hint">모든 출력물 헤더에 기관명이 표기됩니다. 기관 가입 후에는 기관 등록명이 자동 표기됩니다.</p>
                <div class="care-calc-actions"><button data-click="facilityOrgNameSave" class="btn btn-secondary">기관명 저장</button></div>
            </div>`;
        // UX-FORM-03 — 수정 시 인라인 오류 해제
        $('fj-code')?.addEventListener('input', (e) => {
            const t = /** @type {HTMLElement} */ (e.target);
            if (t.getAttribute('aria-invalid') === 'true') clearFieldError(t);
        });
        return;
    }
    const f = /** @type {*} */ (m.facilities) || {};
    host.innerHTML = `
        <div class="care-calc-form">
            <h3>${esc(f.name || '기관')}</h3>
            <p>소속: <strong>${esc((/** @type {Object.<string,string>} */ (ROLES))[m.role] || m.role)}</strong></p>
        </div>`;
}

export async function facilityJoin() {
    const el = /** @type {HTMLInputElement|null} */ ($('fj-code'));
    const code = el?.value?.trim();
    if (!code) {
        // UX-FORM-03 — 필수 필드 미입력은 인라인 오류 + 포커스
        if (el) { setFieldError(el, '초대 코드를 입력하세요.'); el.focus(); }
        return;
    }
    if (el) clearFieldError(el);
    proFeatureNotice('facility_workspace', '기관 워크스페이스');
    const r = await joinFacility(code);
    if ('error' in r) {
        // UX-FORM-03 — 필드 오류가 위치·내용을 전달하고 토스트는 보조 알림
        if (el) { setFieldError(el, r.error); el.focus(); }
        showToast(r.error, 'error');
        return;
    }
    showToast('기관에 가입했습니다.');
    await refreshOrgName();
    render();
}

export function facilityOrgNameSave() {
    const el = /** @type {HTMLInputElement|null} */ ($('fj-orgname'));
    setLocalOrgName(el?.value || '');
    showToast('기관명을 저장했습니다 — 출력물에 표기됩니다.');
}

export function initFacilityJoinView() {
    render().catch(e => {
        console.error('[facility-join]', e);
        const host = $('facility-join-body');
        if (host) host.innerHTML = `<p class="care-calc-err">기관 정보를 불러오지 못했습니다 — ${esc(e instanceof Error ? e.message : String(e))}</p>`;
    });
}
