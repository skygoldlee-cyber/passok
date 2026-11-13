// src/core/entity-store.js — localStorage 엔티티 스토어 팩토리 (공용 계약)
// @spec none — 플랫폼 코어 (시험 도메인 스토어는 이 팩토리로 선언한다, DA-13)
//
// 시험별 *-store.js 모듈이 공유하는 CRUD 계약을 선언으로 유도한다:
//   list  — getJSON → 배열 정제 → onList 훅(백필 등) → 반환
//   add   — 한도 검사 → id·타임스탬프 부여 → unshift → 저장 → afterAdd (write-through)
//   update — id 일치 항목에 patch 병합
//   remove — id 필터 제거
//   save  — beforeSave 알림 → add → 실패 시 onError 표시 (Pro 업셀 래퍼)
// 저장 부수효과(Pro 알림·토스트·서버 반영·백필)는 전부 콜백 주입 —
// 코어 계층은 pro/ui를 모른다 (의존성 리프 유지).
import { getJSON, setJSON } from './storage.js';
import { localDateTime } from './utils.js';

/**
 * @param {object} cfg
 * @param {string} cfg.key — STORAGE_KEYS 상수 (스코프 네임스페이스 자동 적용)
 * @param {string} [cfg.idPrefix] 항목 id 접두사 (`<prefix>_<base36시각>`)
 * @param {number} [cfg.freeLimit] 무료 저장 한도 (0=무제한, 기본 0)
 * @param {string} [cfg.limitText] 한도 초과 오류 문구 (미지정 시 표준 문구)
 * @param {string} [cfg.stampField] 생성 시각 필드명 (기본 'createdAt')
 * @param {Object<string,*>} [cfg.defaults] add 시 entry보다 먼저 깔리는 기본 필드
 * @param {function(): string} [cfg.newId] 커스텀 id 생성기 (미지정 시 `<prefix>_<ts36>`)
 * @param {function(*[]): *} [cfg.onList] list() 후처리 훅
 *   (백필 등 — truthy 반환 시 변경분을 1회 기록)
 * @param {function(*): (void|Promise<void>)} [cfg.afterAdd] add 직후
 *   비동기 부수효과 (write-through — 실패는 삼킨다)
 * @param {function(): void} [cfg.beforeSave] save() 선행 알림 훅 (proFeatureNotice 등)
 * @param {function(*): void} [cfg.onError] save() 실패 표시 훅 (showStoreError 등)
 */
export function createEntityStore(cfg) {
    const limitText = cfg.limitText
        || `무료 플랜 저장 한도(${cfg.freeLimit}건) 도달 — 삭제 후 재시도하거나 유료로 확장하세요.`;

    /** @returns {*[]} */
    function list() {
        const parsed = getJSON(cfg.key);
        const items = Array.isArray(parsed) ? parsed : [];
        if (cfg.onList && cfg.onList(items)) setJSON(cfg.key, items);
        return items;
    }

    /** @param {*} it — 저장 직후 부수효과 (동기 throw·reject 모두 삼킴) */
    function _afterAdd(it) {
        if (!cfg.afterAdd) return;
        try { void Promise.resolve(cfg.afterAdd(it)).catch(() => {}); } catch { /* write-through 실패는 로컬 저장을 깨지 않는다 */ }
    }

    /**
     * @param {*} entry @param {string} [id] id 지정 시 해당 항목 병합 갱신 (수정 플로우)
     * @returns {{ok:boolean, error?:string, id?:string, item?:*}}
     */
    function add(entry, id) {
        const items = list();
        if (id) {
            const next = items.map((/** @type {*} */ x) => (x.id === id ? { ...x, ...entry } : x));
            setJSON(cfg.key, next);
            const it = next.find((/** @type {*} */ x) => x.id === id);
            if (it) _afterAdd(it);
            return { ok: true, id, item: it };
        }
        if (cfg.freeLimit && items.length >= cfg.freeLimit)
            return { ok: false, error: limitText };
        const it = {
            id: (cfg.newId ? cfg.newId() : `${cfg.idPrefix}_${Date.now().toString(36)}`),
            [cfg.stampField || 'createdAt']: localDateTime(),
            ...(cfg.defaults || {}),
            ...entry,
        };
        items.unshift(it);
        setJSON(cfg.key, items);
        _afterAdd(it);
        return { ok: true, id: it.id, item: it };
    }

    /** @param {string} id @param {*} patch */
    function update(id, patch) {
        setJSON(cfg.key, list().map((/** @type {*} */ x) => (x.id === id ? { ...x, ...patch } : x)));
        return { ok: true };
    }

    /** @param {string} id */
    function remove(id) {
        setJSON(cfg.key, list().filter((/** @type {*} */ x) => x.id !== id));
        return { ok: true };
    }

    /** @param {*} entry @param {string} [id] */
    function save(entry, id) {
        if (cfg.beforeSave) cfg.beforeSave();
        const r = add(entry, id);
        if (!r.ok && cfg.onError) cfg.onError(r);
        return r;
    }

    return { list, add, update, remove, save, key: cfg.key };
}
