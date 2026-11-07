// src/exams/carework/form-template-store.js — 기관 자체 양식 템플릿·기입 문서 스토어
// @spec CO-17 — 시험 전용 도메인 스토어 (DA-13)
// 양식 본문은 MD+{{키}} 플레이스홀더. 시스템 키는 자동 기입, 기타 키는 기입 필드 자동 생성.
// 로컬 우선 — 기관 양식은 서버 캐시 병합(facility_form_templates, manager 등록),
// 기입 문서는 facility_records doc_type 'custom_form' 이벤트형 write-through (CO-15 패턴).
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime, todayKey } from '../../core/utils.js';
import { escapeHTML } from '../../core/sanitize.js';
import { showStoreError, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { getOrgName, getDocSign, myMembership, submitRecord, listFacilityFormTemplates } from './facility.js';
import { mdToHtml } from './doc-md.js';

const TPL_KEY = STORAGE_KEYS.CARE_FORM_TEMPLATES;
const DOC_KEY = STORAGE_KEYS.CARE_FORM_DOCS;
export const FREE_TPL_LIMIT = 10;
export const FREE_DOC_LIMIT = 10;

/** 시스템 자동 기입 키 — 기입 필드 생성에서 제외 */
export const SYSTEM_KEYS = new Set(['date', 'org', 'author', 'confirmer', 'receiver', 'client', 'signImage']);
const FIELD_RE = /\{\{\s*([가-힣a-zA-Z0-9_]{1,40})\s*\}\}/g;
/** 서명 이미지 자리표시 — mdToHtml이 텍스트를 esc하므로 통과 후 HTML에서 img로 치환 */
const SIGN_MARK = 'CARE_SIGN_IMAGE_SLOT';

// — 양식 본문 파싱·치환 (순수 로직 — DOM 무의존) —

/** 양식 본문에서 커스텀 기입 키 추출 — 등장 순서·중복 제거, 시스템 키 제외
 * @param {string} body @returns {Array<{key:string,label:string}>} */
export function parseFields(body) {
    const out = [];
    const seen = new Set();
    for (const m of String(body || '').matchAll(FIELD_RE)) {
        const k = m[1].trim();
        if (!k || SYSTEM_KEYS.has(k) || seen.has(k)) continue;
        seen.add(k);
        out.push({ key: k, label: k });
    }
    return out;
}

/** 기입값 정제 — MD 표 셀 파이프·개행 파괴 방지 */
const _safe = v => String(v ?? '').replace(/\|/g, '｜').replace(/[\r\n]+/g, ' ').trim();

/** 시스템 키 자동값 — 출력일·기관명·홈 서명 설정·선택 수급자 */
const _sysValues = (client) => {
    const s = getDocSign();
    return {
        date: todayKey(), org: getOrgName(), author: s.author,
        confirmer: s.confirmer, receiver: s.receiver, client: client || '',
    };
};

/**
 * 양식 본문 → 기입 MD — 시스템 키 자동 기입, 커스텀 키는 values, 미기입은 공란(＿).
 * signImage는 mode 'html'이고 등록 이미지가 있으면 SIGN_MARK 자리표시 (fillTemplateHtml이 img로 치환),
 * md 경로(docx·복사)는 작성자 성명으로 기입 — docMdSign 정책과 동일.
 * @param {string} body @param {Object<string,string>} values @param {'md'|'html'} [mode]
 * @param {Set<string>|null} [rawKeys] 정제 없이 통과시킬 블록 키 (CO-18 도구 조립 표·문단)
 */
export function fillTemplate(body, values = {}, mode = 'md', rawKeys = null) {
    const sign = getDocSign();
    const sys = _sysValues(values.client);
    return String(body || '').replace(FIELD_RE, (m, k0) => {
        const k = k0.trim();
        if (k === 'signImage') {
            if (mode === 'html' && sign.signImage) return SIGN_MARK;
            return sign.author || '＿＿＿＿＿＿';
        }
        if (k in sys) return _safe(sys[k]) || '＿＿＿＿＿＿';
        // rawKeys — 도구 조립 블록(표·문단)은 MD 구조 보존을 위해 정제 없이 통과 (CO-18)
        if (rawKeys && rawKeys.has(k)) return String(values[k] ?? '');
        return _safe(values[k]) || '＿＿＿＿＿＿';
    });
}

/** 기입 MD → 미리보기 HTML — 서명 이미지 자리표시를 등록 이미지로 치환 */
export function fillTemplateHtml(body, values = {}) {
    const sign = getDocSign();
    const html = mdToHtml(fillTemplate(body, values, 'html'));
    if (!sign.signImage) return html;
    const img = `<img class="care-doc-signimg" alt="${escapeHTML(sign.author || '서명')}" src="${sign.signImage}">`;
    return html.split(SIGN_MARK).join(img);
}

// — 로컬 양식 스토어 —

export function listFormTemplates() {
    const v = getJSON(TPL_KEY);
    return Array.isArray(v) ? v : [];
}

/** 로컬 양식 저장 — id 있으면 갱신, 없으면 신규. fields는 저장 시점 재추출.
 * toolKey 지정 시 해당 도구 본문 오버라이드로 연동 (CO-18)
 * @param {{title:string, body:string, toolKey?:string|null}} o */
export function addFormTemplate({ title, body, toolKey = null }) {
    const items = listFormTemplates();
    if (items.length >= FREE_TPL_LIMIT)
        return { ok: false, error: `무료 양식 등록 한도(${FREE_TPL_LIMIT}건) 도달 — 삭제 후 재시도하세요.` };
    const it = { id: `ftpl_${Date.now().toString(36)}`, title: String(title || '').trim(), body: String(body || ''), scope: 'local', createdAt: localDateTime() };
    if (toolKey) it.toolKey = toolKey;
    items.unshift(it);
    setJSON(TPL_KEY, items);
    return { ok: true, id: it.id };
}

export function updateFormTemplate(id, { title, body }) {
    const items = listFormTemplates();
    const it = items.find(x => x.id === id);
    if (!it) return { ok: false, error: '양식을 찾을 수 없습니다.' };
    it.title = String(title || '').trim() || it.title;
    it.body = String(body || '');
    it.updatedAt = localDateTime();
    setJSON(TPL_KEY, items);
    return { ok: true };
}

export function removeFormTemplate(id) {
    setJSON(TPL_KEY, listFormTemplates().filter(x => x.id !== id));
    return { ok: true };
}

// — 뷰 간 편집 이관 — 목록 '편집' → 홈 등록 편집기로 전달 (양식 등록 입력은 홈 수용)
let _pendingEdit = null;
export function setPendingTplEdit(tpl) {
    _pendingEdit = tpl ? { id: tpl.id, title: tpl.title, body: tpl.body, scope: tpl.scope } : null;
}
export function consumePendingTplEdit() {
    const t = _pendingEdit; _pendingEdit = null; return t;
}

// — 기관 양식 캐시 (정본은 서버 — 뷰 init 시 syncFormTemplates로 갱신) —

let _facTpls = [];

/** 화면용 전체 양식 — 로컬(scope:'local') + 기관(scope:'fac') 병합 */
export function allFormTemplates() {
    return [..._facTpls, ...listFormTemplates()];
}

/** 기관 양식 서버 목록 → 로컬 캐시 갱신 — 미가입·오프라인은 로컬만 유지 */
export async function syncFormTemplates() {
    const m = await myMembership().catch(() => null);
    _facTpls = [];
    if (!m) return _facTpls;
    const rows = await listFacilityFormTemplates(m.facility_id).catch(() => []);
    _facTpls = rows.map(r => ({ id: `fac_${r.id}`, title: r.title, body: r.body, scope: 'fac', updatedAt: r.updated_at }));
    return _facTpls;
}

// — 기입 문서 로컬 스토어 + custom_form write-through —

export function listFormDocs() {
    const v = getJSON(DOC_KEY);
    return Array.isArray(v) ? v : [];
}

/** 기입 문서 저장 — 로컬 즉시 확정 후 서버 비동기 반영 (CO-15 오프라인 우선) */
export function addFormDoc({ tplId, title, client, clientId, date, values, md }) {
    const items = listFormDocs();
    if (items.length >= FREE_DOC_LIMIT)
        return { ok: false, error: `Free 플랜 저장 한도(${FREE_DOC_LIMIT}건) 도달 — 삭제 후 재시도하거나 Pro로 확장하세요.` };
    const it = { id: `fdoc_${Date.now().toString(36)}`, createdAt: localDateTime(), tplId, title, client, clientId, date, values, md };
    items.unshift(it);
    setJSON(DOC_KEY, items);
    void _pushFormDoc(it).catch(() => {});
    return { ok: true, id: it.id };
}

/** 서버 페이로드 — 양식 id·필드값 구조화 맵만 (출력 본문 md는 L0 유지, CO-06 계승) */
async function _pushFormDoc(it) {
    const m = await myMembership().catch(() => null);
    if (!m) return;
    const r = await submitRecord({
        facilityId: m.facility_id, docType: 'custom_form',
        client: it.client || '', recordDate: it.date || todayKey(),
        payload: { templateId: it.tplId, title: it.title, fields: it.values || {} }, localId: it.id,
    });
    if ('error' in r) return;
    const items = listFormDocs();
    const x = items.find(y => y.id === it.id);
    if (x && x._sync !== 'done') { x._sync = 'done'; setJSON(DOC_KEY, items); }
}

/** 미동기 문서 재전송 — 뷰 init 시 fire-and-forget */
export async function syncPendingFormDocs() {
    for (const it of listFormDocs()) {
        if (it._sync === 'done') continue;
        try { await _pushFormDoc(it); } catch { /* 오프라인·미설정 — 로컬 동작 불변 */ }
    }
}

export function removeFormDoc(id) {
    setJSON(DOC_KEY, listFormDocs().filter(x => x.id !== id));
    return { ok: true };
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export function saveFormDoc(entry) {
    proFeatureNotice('care_form_save', '양식 문서 저장');
    const r = addFormDoc(entry);
    if (!r.ok) showStoreError(r, '양식 문서', showToast);
    return r;
}
