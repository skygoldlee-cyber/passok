// src/exams/carework/form-template-store.js — 기관 자체 양식 템플릿·기입 문서 스토어
// @spec CO-17 — 시험 전용 도메인 스토어 (DA-13)
// 양식 본문은 MD+{{키}} 플레이스홀더. 시스템 키는 자동 기입, 기타 키는 기입 필드 자동 생성.
// 로컬 우선 — 기관 양식은 서버 캐시 병합(facility_form_templates, manager 등록),
// 기입 문서는 facility_records doc_type 'custom_form' 이벤트형 write-through (CO-15 패턴).
import { setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { localDateTime, todayKey } from '../../core/utils.js';
import { escapeHTML } from '../../core/sanitize.js';
import { createEntityStore } from '../../core/entity-store.js';
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
export const FIELD_RE = /\{\{\s*([가-힣a-zA-Z0-9_]{1,40})\s*\}\}/g;
/** 서명 이미지 자리표시 — mdToHtml이 텍스트를 esc하므로 통과 후 HTML에서 img로 치환 */
const SIGN_MARK = 'CARE_SIGN_IMAGE_SLOT';

// — 양식 본문 파싱·치환 (순수 로직 — DOM 무의존) —

/** 양식 본문에서 커스텀 기입 키 추출 — 등장 순서·중복 제거, 시스템 키 제외
 * @param {string} body @returns {Array<{key:string,label:string}>} */
export function parseFields(body) {
    const out = [];
    const seen = new Set();
    for (const m of String(body || '').matchAll(FIELD_RE)) {
        const k = (m[1] || '').trim();
        if (!k || SYSTEM_KEYS.has(k) || seen.has(k)) continue;
        seen.add(k);
        out.push({ key: k, label: k });
    }
    return out;
}

/** 기입값 정제 — MD 표 셀 파이프·개행 파괴 방지 */
const _safe = (/** @type {*} */ v) => String(v ?? '').replace(/\|/g, '｜').replace(/[\r\n]+/g, ' ').trim();

/** 시스템 키 자동값 — 출력일·기관명·홈 서명 설정·선택 수급자 */
const _sysValues = (/** @type {string} */ client) => {
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
/** @param {string} body @param {Object.<string,*>} [values] @param {string} [mode] @param {Set<string>|null} [rawKeys] */
export function fillTemplate(body, values = {}, mode = 'md', rawKeys = null) {
    const sign = getDocSign();
    const sys = _sysValues(values.client);
    return String(body || '').replace(FIELD_RE, (/** @type {string} */ m, /** @type {string} */ k0) => {
        const k = k0.trim();
        if (k === 'signImage') {
            if (mode === 'html' && sign.signImage) return SIGN_MARK;
            return sign.author || '＿＿＿＿＿＿';
        }
        if (k in sys) return _safe((/** @type {Object.<string,*>} */ (sys))[k]) || '＿＿＿＿＿＿';
        // rawKeys — 도구 조립 블록(표·문단)은 MD 구조 보존을 위해 정제 없이 통과 (CO-18)
        if (rawKeys && rawKeys.has(k)) return String(values[k] ?? '');
        return _safe(values[k]) || '＿＿＿＿＿＿';
    });
}

/** 기입 MD → 미리보기 HTML — 서명 이미지 자리표시를 등록 이미지로 치환 */
/** @param {string} body @param {Object.<string,*>} [values] */
export function fillTemplateHtml(body, values = {}) {
    const sign = getDocSign();
    const html = mdToHtml(fillTemplate(body, values, 'html'));
    if (!sign.signImage) return html;
    const img = `<img class="care-doc-signimg" alt="${escapeHTML(sign.author || '서명')}" src="${sign.signImage}">`;
    return html.split(SIGN_MARK).join(img);
}

// — 로컬 양식 스토어 —

const _tpl = createEntityStore({
    key: TPL_KEY,
    idPrefix: 'ftpl',
    freeLimit: FREE_TPL_LIMIT,
    limitText: `무료 양식 등록 한도(${FREE_TPL_LIMIT}건) 도달 — 삭제 후 재시도하세요.`,
});

export const listFormTemplates = _tpl.list;

/** 로컬 양식 저장 — id 있으면 갱신, 없으면 신규. fields는 저장 시점 재추출.
 * toolKey 지정 시 해당 도구 본문 오버라이드로 연동 (CO-18)
 * @param {{title:string, body:string, toolKey?:string|null|undefined}} o */
export function addFormTemplate({ title, body, toolKey = null }) {
    const entry = {
        title: String(title || '').trim(), body: String(body || ''),
        scope: 'local', ...(toolKey ? { toolKey } : {}),
    };
    return _tpl.add(entry);
}

/** @param {string} id @param {{title:string, body:string}} o */
export function updateFormTemplate(id, { title, body }) {
    const items = listFormTemplates();
    const it = items.find((/** @type {*} */ x) => x.id === id);
    if (!it) return { ok: false, error: '양식을 찾을 수 없습니다.' };
    it.title = String(title || '').trim() || it.title;
    it.body = String(body || '');
    it.updatedAt = localDateTime();
    setJSON(TPL_KEY, items);
    return { ok: true };
}

export const removeFormTemplate = _tpl.remove;

// — 기관 양식 캐시 (정본은 서버 — 뷰 init 시 syncFormTemplates로 갱신) —

/** @type {*[]} */
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
    _facTpls = rows.map((/** @type {*} */ r) => ({ id: `fac_${r.id}`, title: r.title, body: r.body, scope: 'fac', updatedAt: r.updated_at }));
    return _facTpls;
}

// — 기입 문서 로컬 스토어 + custom_form write-through —

const _doc = createEntityStore({
    key: DOC_KEY,
    idPrefix: 'fdoc',
    freeLimit: FREE_DOC_LIMIT,
    afterAdd: _pushFormDoc, // CO-15 write-through — 로컬 저장은 즉시 확정, 서버는 비동기
    beforeSave: () => proFeatureNotice('care_form_save', '양식 문서 저장'),
    onError: (r) => showStoreError(r, '양식 문서', showToast),
});

export const listFormDocs = _doc.list;

/** 기입 문서 저장 — 로컬 즉시 확정 후 서버 비동기 반영 (CO-15 오프라인 우선) */
/** @param {{tplId:string, title:string, client:string, clientId:string, date:string, values:*, md:string}} o */
export function addFormDoc({ tplId, title, client, clientId, date, values, md }) {
    return _doc.add({ tplId, title, client, clientId, date, values, md });
}

export const removeFormDoc = _doc.remove;

/** 서버 페이로드 — 양식 id·필드값 구조화 맵만 (출력 본문 md는 L0 유지, CO-06 계승) */
/** @param {*} it */
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
    const x = items.find((/** @type {*} */ y) => y.id === it.id);
    if (x && x._sync !== 'done') { x._sync = 'done'; setJSON(DOC_KEY, items); }
}

/** 미동기 문서 재전송 — 뷰 init 시 fire-and-forget */
export async function syncPendingFormDocs() {
    for (const it of listFormDocs()) {
        if (it._sync === 'done') continue;
        try { await _pushFormDoc(it); } catch { /* 오프라인·미설정 — 로컬 동작 불변 */ }
    }
}

/** 저장 + 오류 표시 — 무료 한도 초과 시 업그레이드 안내 */
export const saveFormDoc = _doc.save;
