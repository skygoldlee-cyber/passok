// src/exams/carework/views/facility-setup.js — 기관 연결·관리 뷰 (Phase 6a)
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { myMembership, createFacility, joinFacility, listMembers, ROLES } from '../facility.js';
import { getAuthSession } from '../../../auth-sync/supabase-client.js';
import { proFeatureNotice } from '../../../pro/pro-upgrade.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function render() {
    const host = $('facility-body');
    if (!host) return;
    const { session } = await getAuthSession().catch(() => ({ session: null }));
    if (!session) {
        host.innerHTML = '<p class="care-calc-err">기관 워크스페이스는 로그인이 필요합니다 — 사이드바 로그인 후 이용하세요.</p>';
        return;
    }
    let m;
    try { m = await myMembership(); } catch (e) {
        host.innerHTML = `<p class="care-calc-err">기관 정보를 불러오지 못했습니다 — ${esc(e instanceof Error ? e.message : String(e))}</p>`;
        return;
    }
    if (!m) {
        host.innerHTML = `
            <div class="care-calc-form">
                <label>새 기관 등록 (관리책임자) <input id="fa-name" type="text" placeholder="예: ○○재가요양센터"></label>
                <div class="care-calc-actions"><button data-click="facilityCreate">기관 등록</button></div>
            </div>
            <div class="care-calc-form">
                <label>기관 코드로 가입 (요양보호사) <input id="fa-code" type="text" placeholder="초대 코드 8자리"></label>
                <div class="care-calc-actions"><button data-click="facilityJoin" class="secondary">기관 가입</button></div>
            </div>`;
        return;
    }
    const f = m.facilities || {};
    const members = await listMembers(m.facility_id).catch(() => []);
    host.innerHTML = `
        <div class="care-calc-form">
            <h3>${esc(f.name || '기관')}</h3>
            <p>역할: <strong>${esc(ROLES[m.role] || m.role)}</strong>${f.biz_no ? ` · 사업자 ${esc(f.biz_no)}` : ''}</p>
            ${f.invite_code ? `<p>초대 코드: <strong class="care-card-cat">${esc(f.invite_code)}</strong> — 요양보호사에게 전달</p>` : ''}
            <p>멤버 ${members.length}명 ${members.map(x => `· ${esc(ROLES[x.role] || x.role)}`).join(' ')}</p>
        </div>`;
}

export async function facilityCreate() {
    const el = /** @type {HTMLInputElement|null} */ ($('fa-name'));
    const name = el?.value?.trim();
    if (!name) { showToast('기관명을 입력하세요.', 'error'); return; }
    proFeatureNotice('facility_workspace', '기관 워크스페이스');
    const r = await createFacility(name, /** @type {HTMLInputElement|null} */($('fa-biz'))?.value || '');
    if ('error' in r) { showToast(r.error, 'error'); return; }
    showToast('기관을 등록했습니다 — 초대 코드로 멤버를 초대하세요.');
    render();
}

export async function facilityJoin() {
    const el = /** @type {HTMLInputElement|null} */ ($('fa-code'));
    const code = el?.value?.trim();
    if (!code) { showToast('초대 코드를 입력하세요.', 'error'); return; }
    proFeatureNotice('facility_workspace', '기관 워크스페이스');
    const r = await joinFacility(code);
    if ('error' in r) { showToast(r.error, 'error'); return; }
    showToast('기관에 가입했습니다.');
    render();
}

export function initFacilityView() { render(); }
