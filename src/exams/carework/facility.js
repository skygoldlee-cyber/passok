// src/exams/carework/facility.js — 기관 워크스페이스 도메인 (DOC-DSN-43 Phase 6a)
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 기관 시설·멤버십 API — getSupabase 래퍼 경유 RPC 호출 (SECURITY DEFINER)
import { getSupabase, getAuthSession } from '../../auth-sync/supabase-client.js';
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { todayKey } from '../../core/utils.js';

export const ROLES = { worker: '요양보호사', manager: '관리책임자' };

/** @returns {Promise<any|null>} */
async function _session() {
    return getAuthSession().catch(() => null);
}

/**
 * @typedef {Object} FacilityMembership
 * @property {string} facility_id
 * @property {string} role
 * @property {{id:string,name:string,biz_no:string,invite_code:string,doc_webhook_url:string}|null} [facilities]
 */
/** @returns {Promise<FacilityMembership|null>} 로그인 사용자의 멤버십+시설 (미가입 null) */
export async function myMembership() {
    const session = await _session();
    if (!session) return null;
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_members')
        .select('facility_id,role,facilities(id,name,biz_no,invite_code,doc_webhook_url)')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(`membership: ${error.message}`);
    return data;
}

/** 시설 생성 — 생성자가 manager가 됨 @returns {Promise<{id:string}|{error:string}>} */
/** @param {string} name @param {string} [bizNo] */
export async function createFacility(name, bizNo = '') {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('create_facility', { p_name: name, p_biz_no: bizNo });
    if (error) return { error: error.message };
    return { id: data };
}

/** 초대 코드로 가입 @returns {Promise<{id:string}|{error:string}>} */
/** @param {string} code */
export async function joinFacility(code) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('join_facility', { p_code: code });
    if (error) return { error: error.message };
    if (!data) return { error: '유효하지 않은 초대 코드입니다' };
    return { id: data };
}

/** 같은 시설 멤버 목록 (manager 열람용) @returns {Promise<Array<*>>} */
/** @param {string} facilityId */
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
 * @param {FacilityMembership|null} m myMembership() 결과
 */
export function syncFacilityNav(m) {
    const show = !!m && m.role === 'manager';
    for (const el of document.querySelectorAll('[data-target="facility-admin-view"]'))
        el.classList.toggle('is-hidden', !show);
}

// — 출력물 기관명 표기 (DSN-43 6e) —

/** @type {string|undefined} */
let _orgCache;
const _esc = (/** @type {*} */ s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);

/** 출력물 기관명 — 멤버십 기관명 우선, 미가입·미조회 시 로컬 설정값 */
export function getOrgName() {
    return _orgCache ?? (getJSON(STORAGE_KEYS.CARE_ORG_NAME) || '');
}
/** 멤버십에서 기관명을 갱신해 캐시 — 뷰 init 시 fire-and-forget */
export async function refreshOrgName() {
    try { _orgCache = (await myMembership())?.facilities?.name || undefined; } catch { _orgCache = undefined; }
    return getOrgName();
}
/** 미가입 사용자용 로컬 기관명 설정 (출력물 표기용) */
/** @param {string} name */
export function setLocalOrgName(name) {
    setJSON(STORAGE_KEYS.CARE_ORG_NAME, String(name || '').trim());
    _orgCache = undefined;
}
/** 출력 문서 헤더 — 제목 + 기관명(있으면 병기) + 출력일 */
/** @param {string} title */
export function docHeadHtml(title) {
    const org = getOrgName();
    return `<div class="care-doc-head"><strong>${_esc(title)}</strong><span>${org ? _esc(org) + ' · ' : ''}${todayKey()} 출력</span></div>`;
}

// — 출력물 서명란 기입 (홈 설정 — 전 문서 공통) —

/** 성명 표기 — 성·이름 사이 한 칸 (2글자 김 수 / 3글자 김 철수 / 4글자 남궁 민수). 한글 성명만 변환, 외국어·기타는 원형 */
/** @param {string} n */
export const fmtDocName = n => {
    const s = String(n || '').trim();
    if (/^[가-힣]{2,3}$/.test(s)) return `${s[0]} ${s.slice(1)}`;
    if (/^[가-힣]{4}$/.test(s)) return `${s.slice(0, 2)} ${s.slice(2)}`;
    return s;
};

/** 홈에서 설정한 서명자 — {author: 작성자(요양보호사), confirmer: 확인자(시설장·기관장), receiver: 인수자, signImage: 서명 이미지 data URI} */
export function getDocSign() {
    const s = /** @type {any} */ (getJSON(STORAGE_KEYS.CARE_DOC_SIGN)) || {};
    return { author: fmtDocName(s.author), confirmer: fmtDocName(s.confirmer), receiver: fmtDocName(s.receiver), signImage: String(s.signImage || ''), wm: !!s.wm };
}
/** 서명자 저장 — 홈 설정 카드에서 호출 */
/** @param {string} author @param {string} confirmer @param {string} [receiver] */
export function setDocSign(author, confirmer, receiver = '') {
    const prev = getDocSign();
    setJSON(STORAGE_KEYS.CARE_DOC_SIGN, { author: String(author || '').trim(), confirmer: String(confirmer || '').trim(), receiver: String(receiver || '').trim(), signImage: prev.signImage, wm: prev.wm });
}
/** 기관명 워터마크 표시 토글 — 홈 설정에서 호출 (인쇄·PDF·Word 출력물 공통) */
/** @param {boolean} on */
export function setDocSignWm(on) {
    const s = getDocSign();
    setJSON(STORAGE_KEYS.CARE_DOC_SIGN, { author: s.author, confirmer: s.confirmer, receiver: s.receiver, signImage: s.signImage, wm: !!on });
}
/** 서명 이미지 저장/삭제 — 홈 업로드에서 호출 (기존 성명은 보존) */
/** @param {string} dataUri */
export function setDocSignImage(dataUri) {
    const s = getDocSign();
    setJSON(STORAGE_KEYS.CARE_DOC_SIGN, { author: s.author, confirmer: s.confirmer, receiver: s.receiver, signImage: String(dataUri || ''), wm: s.wm });
}

// — 서명 이미지 정규화 —

/** 서명란 박스 (.care-doc-signimg height 42px)의 2배 — 레티나·인쇄 선명도 확보용 저장 해상도 상한 */
const SIGN_IMG_MAX_W = 480, SIGN_IMG_MAX_H = 84;

/** File → 디코딩 가능한 이미지 소스 — createImageBitmap 우선, HTMLImageElement 폴백 */
/** @param {File|Blob} file */
function _signImgSource(file) {
    const fromBitmap = typeof createImageBitmap === 'function'
        ? createImageBitmap(file, { imageOrientation: 'from-image' }).then((/** @type {ImageBitmap} */ b) => (b.width && b.height)
            ? { src: b, w: b.width, h: b.height, done: () => b.close() }
            : (b.close(), Promise.reject(new Error('no-size'))))
        : Promise.reject(new Error('no-bitmap'));
    return fromBitmap.catch(() => new Promise((res, rej) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => (img.naturalWidth && img.naturalHeight)
            ? res({ src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) })
            : (URL.revokeObjectURL(url), rej(new Error('no-size')));
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
        img.src = url;
    }));
}

/** File → 원본 data URI (변환 불가 시 폴백 경로) */
/** @param {File|Blob} file */
function _fileDataUri(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result || ''));
        r.onerror = () => rej(r.error || new Error('read'));
        r.readAsDataURL(file);
    });
}

/**
 * 서명 이미지 File → 서명란 규격 data URI — 입력 형식(PNG·JPEG·GIF·HEIC 등) 무관하게
 * 디코딩 가능하면 서명란 박스에 맞게 축소 후 WebP로 변환 (미지원 브라우저는 PNG로 자동 폴백).
 * 디코딩 실패(SVG 무치수·손상 파일 등) 시 원본 data URI 반환 — 등록 자체는 항상 성공시킨다.
 * @param {File|Blob} file @returns {Promise<string>}
 */
export async function signFileToDataUri(file) {
    try {
        const { src, w, h, done } = await _signImgSource(file);
        let uri = '';
        try {
            const k = Math.min(1, SIGN_IMG_MAX_W / w, SIGN_IMG_MAX_H / h);
            const cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(w * k));
            cv.height = Math.max(1, Math.round(h * k));
            const ctx = cv.getContext('2d');
            if (ctx) {
                ctx.drawImage(src, 0, 0, cv.width, cv.height);
                uri = cv.toDataURL('image/webp', 0.9);
            }
        } finally { done(); }
        if (uri.length > 32) return uri;
    } catch { /* 디코딩·캔버스 불가 → 원본 폴백 */ }
    return _fileDataUri(file);
}
/**
 * 등록 서명 이미지 → docx `{{img:author}}`·결재란 삽입용 PNG 맵 — 없거나 합성 실패 시 null.
 * author: 74×38 표시 (인) 우하단 + 서명 겹침 합성 (서명이 (인) 위를 덮는 실물 형태),
 * approve: 결재란 담당 칸용 서명-only. 2배 렌더로 인쇄 선명도 확보, 표시 크기만 docx에 전달.
 * @returns {Promise<{author: {data:Uint8Array,w:number,h:number}, approve: {data:Uint8Array,w:number,h:number}}|null>}
 */
export async function docSignImages() {
    const uri = getDocSign().signImage;
    if (!uri) return null;
    try {
        const img = await new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => rej(new Error('decode'));
            im.src = uri;
        });
        const S = 2;
        const toBytes = (/** @type {HTMLCanvasElement} */ el) => {
            const b64 = el.toDataURL('image/png').split(',')[1] || '';
            const bin = atob(b64); const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            return u8;
        };
        const fit = (/** @type {number} */ maxW, /** @type {number} */ maxH) => {
            const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
            return { w: Math.max(1, img.naturalWidth * k), h: Math.max(1, img.naturalHeight * k) };
        };
        const cv = document.createElement('canvas'); // 서명란 합성 — (인) 위에 서명 겹침
        cv.width = 74 * S; cv.height = 38 * S;
        const c = cv.getContext('2d');
        if (!c) return null;
        c.font = `${11.5 * S}px 'Malgun Gothic', sans-serif`; c.fillStyle = '#000';
        c.fillText('(인)', cv.width - 5 * S - c.measureText('(인)').width, cv.height - 4 * S);
        const iw = Math.min(56 * S, cv.width), ih = Math.min(cv.height, iw * img.naturalHeight / img.naturalWidth);
        c.drawImage(img, cv.width - iw, cv.height - ih, iw, ih);
        const av = document.createElement('canvas'); // 결재란 — 서명-only (비율 유지, 52×40 표시 상한)
        const af = fit(52 * S, 40 * S);
        av.width = Math.round(af.w); av.height = Math.round(af.h);
        const ac = av.getContext('2d');
        if (!ac) return null;
        ac.drawImage(img, 0, 0, af.w, af.h);
        return {
            author: { data: toBytes(cv), w: 74, h: 38 },
            approve: { data: toBytes(av), w: Math.round(af.w / S), h: Math.round(af.h / S) },
        };
    } catch { return null; }
}

/**
 * 문서 서명란 — items: [[라벨, 'author'|'confirmer'|'receiver'|'']].
 * 설정된 성명은 인쇄·공유 산출물에 그대로 기입되고, 미설정·빈키 슬롯(날짜)은 수기 서명용 공란 유지.
 */
/** @param {Array<[string,string]>} items */
export function docSignHtml(items) {
    const s = getDocSign();
    const name = (/** @type {string} */ k) => (k === 'author' ? s.author : k === 'confirmer' ? s.confirmer : k === 'receiver' ? s.receiver : '');
    return `<div class="care-doc-sign">${items.map(([label, k]) => {
        // 서명 이미지 등록 시 author 슬롯에 이미지 기입 (성명 텍스트 대체)
        if (k === 'author' && s.signImage) return `<span>${_esc(label)}: <img class="care-doc-signimg" alt="${_esc(s.author || '서명')}" src="${s.signImage}"></span>`;
        return `<span>${_esc(label)}: ${name(k) ? _esc(name(k)) : '______________'}</span>`;
    }).join('')}</div>`;
}

// — DSN-43 6b: 교대 인수 확인 —

/** 교대 인수인계 등록 — 이력 요약(payload)+전망 메모 @returns {Promise<{id:string}|{error:string}>} */
/** @param {{facilityId:string, client:string, shiftDate:string, memo:string, payload?:*}} o */
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

/** 시설 인수인계 목록 + 서명 수 — @returns {Promise<Array<*>>} */
/** @param {string} facilityId @param {{limit?:number}} [opt] */
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
/** @param {string} handoverId */
export async function ackHandover(handoverId) {
    const sb = await getSupabase();
    const { error } = await sb.from('handover_acks').insert({ handover_id: handoverId });
    if (error) return { error: error.message };
    return { ok: true };
}

// — DSN-43 6c: 면회·방문 기록 —

/** 면회 방문예약 등록 — 기관 면회 대장에 예약(scheduled) 상태로 공유 @returns {Promise<{id:string}|{error:string}>} */
/** @param {{facilityId:string, client:string, visitor:string, phone:string, relation:string, visitDate:string, visitTime:string, purpose:string}} o */
export async function submitVisit({ facilityId, client, visitor, phone, relation, visitDate, visitTime, purpose }) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('family_visits')
        .insert({ facility_id: facilityId, client, visitor_name: visitor, visitor_phone: phone || null, relation, visit_date: visitDate, visit_time: visitTime || null, purpose })
        .select('id')
        .single();
    if (error) return { error: error.message };
    return { id: data.id };
}

/** 시설 면회 대장 목록 @returns {Promise<Array<*>>} */
/** @param {string} facilityId @param {{limit?:number}} [opt] */
export async function listVisits(facilityId, { limit = 20 } = {}) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('family_visits')
        .select('id,client,visitor_name,visitor_phone,relation,visit_date,visit_time,purpose,status,result,created_at,author_id')
        .eq('facility_id', facilityId)
        .order('visit_date', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`family_visits: ${error.message}`);
    return data || [];
}

/** 방문 결과·상태 갱신 — 같은 시설 멤버면 기록 가능 (응대 근무자 ≠ 예약 등록자) @returns {Promise<{ok?:boolean,error?:string}>} */
/** @param {string} visitId @param {*} patch */
export async function updateVisitResult(visitId, patch) {
    const sb = await getSupabase();
    const { error } = await sb.from('family_visits').update(patch).eq('id', visitId);
    if (error) return { error: error.message };
    return { ok: true };
}

// — DSN-43 6d: 사고 보고서 —

/** 사고 보고서 등록 — 기관 사고 대장에 증적 기록 @returns {Promise<{id:string}|{error:string}>} */
/** @param {{facilityId:string, client:string, occurredAt:string, place:string, type:string, severity:string, description:string, action:string, familyNotified:boolean}} o */
export async function submitIncident({ facilityId, client, occurredAt, place, type, severity, description, action, familyNotified }) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('incident_reports')
        .insert({ facility_id: facilityId, client, occurred_at: occurredAt, place, type, severity, description, action, family_notified: familyNotified })
        .select('id')
        .single();
    if (error) return { error: error.message };
    return { id: data.id };
}

/** 시설 사고 대장 목록 @returns {Promise<Array<*>>} */
/** @param {string} facilityId @param {{limit?:number}} [opt] */
export async function listIncidents(facilityId, { limit = 20 } = {}) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('incident_reports')
        .select('id,client,occurred_at,place,type,severity,description,action,family_notified,created_at,author_id')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`incident_reports: ${error.message}`);
    return data || [];
}

// — CO-14: 실무 기록 통합 서버 저장 —

/** 실무 기록 서버 저장 — doc_type 유형 + 구조화 payload만 (자유서술 원문은 L0 유지)
 * local_id 상관키로 재전송 멱등 — 유니크 충돌(23505)은 기동기로 간주해 {id:null} 반환
 * @returns {Promise<{id:string|null}|{error:string}>} */
/** @param {{facilityId:string, docType:string, client?:string, recordDate:string, payload?:*, localId?:string|null}} o */
export async function submitRecord({ facilityId, docType, client = '', recordDate, payload = {}, localId = null }) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_records')
        .insert({ facility_id: facilityId, doc_type: docType, client, record_date: recordDate, payload, local_id: localId })
        .select('id')
        .single();
    if (error) return error.code === '23505' ? { id: null } : { error: error.message };
    return { id: data.id };
}

/** 시설 기록 목록 — doc_type 필터 (시설 타임라인·manager 열람용)
 * @param {string} facilityId @param {{docType?:string|null,limit?:number}} [opt] @returns {Promise<Array<*>>} */
export async function listRecords(facilityId, { docType = null, limit = 50 } = {}) {
    const sb = await getSupabase();
    let q = sb.from('facility_records')
        .select('id,doc_type,client,record_date,payload,local_id,created_at,author_id')
        .eq('facility_id', facilityId)
        .order('record_date', { ascending: false })
        .limit(limit);
    if (docType) q = q.eq('doc_type', docType);
    const { data, error } = await q;
    if (error) throw new Error(`facility_records: ${error.message}`);
    return data || [];
}

/** 상태형 기록 upsert — (facility, author, local_id) 충돌 시 payload 갱신.
 * 이벤트형은 submitRecord(insert·append-only), 최신 상태 공유 문서는 이 경로.
 * @returns {Promise<{id:string}|{error:string}>} */
/** @param {{facilityId:string, docType:string, client?:string, recordDate:string, payload?:*, localId:string}} o */
export async function upsertRecord({ facilityId, docType, client = '', recordDate, payload = {}, localId }) {
    const session = await _session();
    if (!session) return { error: 'no-session' };
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_records')
        .upsert({ facility_id: facilityId, author_id: session.user.id, doc_type: docType, client, record_date: recordDate, payload, local_id: localId },
                { onConflict: 'facility_id,author_id,local_id' })
        .select('id')
        .single();
    if (error) return { error: error.message };
    return { id: data.id };
}

/** write-through 공통 — 멤버십 해석 후 upsertRecord. 미가입·미설정은 조용히 스킵 ({skipped:true})
 * @param {{docType:string, client?:string, recordDate:string, payload?:*, localId:string}} o
 * @returns {Promise<{id?:string,skipped?:boolean,error?:string}>} */
export async function pushState({ docType, client = '', recordDate, payload = {}, localId }) {
    const m = await myMembership().catch(() => null);
    if (!m) return { skipped: true };
    return upsertRecord({ facilityId: m.facility_id, docType, client, recordDate, payload, localId });
}

/** 시설 문서 webhook URL 설정 — manager 전용 (RLS 검증, CO-16) @param {string} facilityId @param {string} url @returns {Promise<{ok?:boolean,error?:string}>} */
export async function setDocWebhook(facilityId, url) {
    const sb = await getSupabase();
    const { error } = await sb
        .from('facilities')
        .update({ doc_webhook_url: String(url || '').trim() || null })
        .eq('id', facilityId);
    if (error) return { error: error.message };
    return { ok: true };
}

// — CO-17: 기관 자체 양식 템플릿 (facility_form_templates — member read·manager write) —

/** 시설 양식 목록 — 멤버 열람 @returns {Promise<Array<*>>} */
/** @param {string} facilityId */
export async function listFacilityFormTemplates(facilityId) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_form_templates')
        .select('id,title,body,author_id,updated_at')
        .eq('facility_id', facilityId)
        .order('updated_at', { ascending: false })
        .limit(100);
    if (error) throw new Error(`form_templates: ${error.message}`);
    return data || [];
}

/** 기관 양식 등록 — manager 전용 (RLS) @returns {Promise<{id:string}|{error:string}>} */
/** @param {{facilityId:string, title:string, body:string}} o */
export async function submitFormTemplate({ facilityId, title, body }) {
    const session = await _session();
    if (!session) return { error: 'no-session' };
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('facility_form_templates')
        .insert({ facility_id: facilityId, title: String(title || '').trim(), body: String(body || ''), author_id: session.user.id })
        .select('id')
        .single();
    if (error) return { error: error.message };
    return { id: data.id };
}

/** 기관 양식 수정 — manager 전용 (RLS) @returns {Promise<{ok?:boolean,error?:string}>} */
/** @param {string} id @param {{title:string, body:string}} o */
export async function updateFacilityFormTemplate(id, { title, body }) {
    const sb = await getSupabase();
    const { error } = await sb
        .from('facility_form_templates')
        .update({ title: String(title || '').trim(), body: String(body || ''), updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) return { error: error.message };
    return { ok: true };
}

/** 기관 양식 삭제 — manager 전용 (RLS) @returns {Promise<{ok?:boolean,error?:string}>} */
/** @param {string} id */
export async function deleteFacilityFormTemplate(id) {
    const sb = await getSupabase();
    const { error } = await sb.from('facility_form_templates').delete().eq('id', id);
    if (error) return { error: error.message };
    return { ok: true };
}
