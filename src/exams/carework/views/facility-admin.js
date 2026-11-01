// src/exams/carework/views/facility-admin.js — 기관 어드민 뷰 (DOC-DSN-43 6a, DA-13)
// @spec none — 시험 전용 실무 뷰
import { myMembership, createFacility, listMembers, ROLES } from '../facility.js';
import { getAuthSession } from '../../../auth-sync/supabase-client.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function render() {
    const host = $('facility-admin-body');
    if (!host) return;
    const { session } = await getAuthSession().catch(() => ({ session: null }));
    if (!session) {
        host.innerHTML = '<p class="care-calc-err">기관 관리는 로그인이 필요합니다 — 사이드바 로그인 후 이용하세요.</p>';
        return;
    }
    const m = await myMembership();
    if (!m) {
        host.innerHTML = `
            <div class="care-calc-form">
                <label>새 기관 등록 <input id="fa-name" type="text" placeholder="예: ○○재가요양센터"></label>
                <label>사업자번호 (선택) <input id="fa-biz" type="text" placeholder="사업자등록번호"></label>
                <div class="care-calc-actions"><button data-click="facilityAdminCreate">기관 등록</button></div>
            </div>`;
        return;
    }
    if (m.role !== 'manager') {
        host.innerHTML = '<p class="care-calc-err">관리책임자 전용입니다 — 멤버는 "기관가입" 뷰를 이용하세요.</p>';
        return;
    }
    const f = m.facilities || {};
    const members = await listMembers(m.facility_id).catch(() => []);
    host.innerHTML = `
        <div class="care-calc-form">
            <h3>${esc(f.name || '기관')}</h3>
            ${f.biz_no ? `<p>사업자 ${esc(f.biz_no)}</p>` : ''}
            ${f.invite_code ? `<p>초대 코드: <strong class="care-card-cat">${esc(f.invite_code)}</strong> — 요양보호사에게 전달</p>` : ''}
        </div>
        <div class="care-audit-item"><h3>멤버 ${members.length}명</h3>
            ${members.map(x => `<p>${esc(x.user_id.slice(0,8))}… · ${esc(ROLES[x.role] || x.role)}</p>`).join('')}
        </div>`;
}

export async function facilityAdminCreate() {
    const el = /** @type {HTMLInputElement|null} */ ($('fa-name'));
    const name = el?.value?.trim();
    if (!name) { showToast('기관명을 입력하세요.', 'error'); return; }
    proFeatureNotice('facility_workspace', '기관 워크스페이스');
    const r = await createFacility(name, /** @type {HTMLInputElement|null} */($('fa-biz'))?.value || '');
    if ('error' in r) { showToast(r.error, 'error'); return; }
    showToast('기관을 등록했습니다 — 초대 코드로 멤버를 초대하세요.');
    render();
}

export function initFacilityAdminView() {
    render().catch(e => {
        console.error('[facility-admin]', e);
        const host = $('facility-admin-body');
        if (host) host.innerHTML = `<p class="care-calc-err">기관 정보를 불러오지 못했습니다 — ${esc(e instanceof Error ? e.message : String(e))}</p>`;
    });
}
