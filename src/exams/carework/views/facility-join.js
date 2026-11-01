// src/exams/carework/views/facility-join.js — 기관 가입 클라이언트 뷰 (DOC-DSN-43 6a, DA-13)
// @spec DA-18 — 권한 뷰 분리 (어드민·클라이언트 별도 뷰)
import { myMembership, syncFacilityNav, joinFacility, ROLES } from '../facility.js';
import { getAuthSession } from '../../../auth-sync/supabase-client.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function render() {
    const host = $('facility-join-body');
    if (!host) return;
    const { session } = await getAuthSession().catch(() => ({ session: null }));
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
                <div class="care-calc-actions"><button data-click="facilityJoin">기관 가입</button></div>
            </div>`;
        return;
    }
    const f = m.facilities || {};
    host.innerHTML = `
        <div class="care-calc-form">
            <h3>${esc(f.name || '기관')}</h3>
            <p>소속: <strong>${esc(ROLES[m.role] || m.role)}</strong></p>
        </div>`;
}

export async function facilityJoin() {
    const el = /** @type {HTMLInputElement|null} */ ($('fj-code'));
    const code = el?.value?.trim();
    if (!code) { showToast('초대 코드를 입력하세요.', 'error'); return; }
    proFeatureNotice('facility_workspace', '기관 워크스페이스');
    const r = await joinFacility(code);
    if ('error' in r) { showToast(r.error, 'error'); return; }
    showToast('기관에 가입했습니다.');
    render();
}

export function initFacilityJoinView() {
    render().catch(e => {
        console.error('[facility-join]', e);
        const host = $('facility-join-body');
        if (host) host.innerHTML = `<p class="care-calc-err">기관 정보를 불러오지 못했습니다 — ${esc(e instanceof Error ? e.message : String(e))}</p>`;
    });
}
