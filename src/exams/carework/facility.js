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
