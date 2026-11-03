// src/exams/carework/facility.js — 기관 워크스페이스 도메인 (DOC-DSN-43 Phase 6a)
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 기관 시설·멤버십 API — getSupabase 래퍼 경유 RPC 호출 (SECURITY DEFINER)
import { getSupabase, getAuthSession } from '../../auth-sync/supabase-client.js';

export const ROLES = { worker: '요양보호사', manager: '관리책임자' };

/** @returns {Promise<any|null>} */
async function _session() {
    const { session } = await getAuthSession().catch(() => ({ session: null }));
    return session;
}

/** @returns {Promise<object|null>} 로그인 사용자의 멤버십+시설 (미가입 null) */
export async function myMembership() {
    const session = await _session();
    if (!session) return null;
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_members')
        .select('facility_id,role,facilities(id,name,biz_no,invite_code)')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(`membership: ${error.message}`);
    return data;
}

/** 시설 생성 — 생성자가 manager가 됨 @returns {Promise<{id:string}|{error:string}>} */
export async function createFacility(name, bizNo = '') {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('create_facility', { p_name: name, p_biz_no: bizNo });
    if (error) return { error: error.message };
    return { id: data };
}

/** 초대 코드로 가입 @returns {Promise<{id:string}|{error:string}>} */
export async function joinFacility(code) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('join_facility', { p_code: code });
    if (error) return { error: error.message };
    if (!data) return { error: '유효하지 않은 초대 코드입니다' };
    return { id: data };
}

/** 같은 시설 멤버 목록 (manager 열람용) @returns {Promise<Array>} */
export async function listMembers(facilityId) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_members')
        .select('user_id,role,joined_at')
        .eq('facility_id', facilityId);
    if (error) return [];
    return data || [];
}

/** 기관관리 nav 표시 — manager만 (보안 기본값 숨김, 멤버십 확인 후 해제 — DA-18)
 * @param {object|null} m myMembership() 결과
 */
export function syncFacilityNav(m) {
    const show = !!m && m.role === 'manager';
    for (const el of document.querySelectorAll('[data-target="facility-admin-view"]'))
        el.classList.toggle('is-hidden', !show);
}

// — DSN-43 6b: 교대 인수 확인 —

/** 교대 인수인계 등록 — 이력 요약(payload)+전망 메모 @returns {Promise<{id:string}|{error:string}>} */
export async function submitHandover({ facilityId, client, shiftDate, memo, payload = null }) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('shift_handovers')
        .insert({ facility_id: facilityId, client, shift_date: shiftDate, memo, payload })
        .select('id')
        .single();
    if (error) return { error: error.message };
    return { id: data.id };
}

/** 시설 인수인계 목록 + 서명 수 — @returns {Promise<Array>} */
export async function listHandovers(facilityId, { limit = 20 } = {}) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('shift_handovers')
        .select('id,client,shift_date,memo,created_at,author_id,handover_acks(user_id,acked_at)')
        .eq('facility_id', facilityId)
        .order('shift_date', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`handovers: ${error.message}`);
    return data || [];
}

/** 인수 확인 서명 — 작성자는 자기 인수인계 서명 불가 (RLS 차단) @returns {Promise<{ok?:boolean,error?:string}>} */
export async function ackHandover(handoverId) {
    const sb = await getSupabase();
    const { error } = await sb.from('handover_acks').insert({ handover_id: handoverId });
    if (error) return { error: error.message };
    return { ok: true };
}

// — DSN-43 6c: 면회·방문 기록 —

/** 면회 방문예약 등록 — 기관 면회 대장에 예약(scheduled) 상태로 공유 @returns {Promise<{id:string}|{error:string}>} */
export async function submitVisit({ facilityId, client, visitor, relation, visitDate, visitTime, purpose }) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('family_visits')
        .insert({ facility_id: facilityId, client, visitor_name: visitor, relation, visit_date: visitDate, visit_time: visitTime || null, purpose })
        .select('id')
        .single();
    if (error) return { error: error.message };
    return { id: data.id };
}

/** 시설 면회 대장 목록 @returns {Promise<Array>} */
export async function listVisits(facilityId, { limit = 20 } = {}) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('family_visits')
        .select('id,client,visitor_name,relation,visit_date,visit_time,purpose,status,result,created_at,author_id')
        .eq('facility_id', facilityId)
        .order('visit_date', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`family_visits: ${error.message}`);
    return data || [];
}

/** 방문 결과·상태 갱신 — 같은 시설 멤버면 기록 가능 (응대 근무자 ≠ 예약 등록자) @returns {Promise<{ok?:boolean,error?:string}>} */
export async function updateVisitResult(visitId, patch) {
    const sb = await getSupabase();
    const { error } = await sb.from('family_visits').update(patch).eq('id', visitId);
    if (error) return { error: error.message };
    return { ok: true };
}
