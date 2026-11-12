// src/core/storage.js — 저장소 추상화 계층
// @spec DA-05,DA-07,DA-09
//
// 앱의 모든 영속 데이터는 이 모듈을 경유한다. 호출부는 논리 키(비접두사)를
// 넘기고, 시험별 네임스페이스(scopedKey) 적용과 실제 읽기·쓰기는 교체 가능한
// 백엔드가 담당한다.
//
// 백엔드 인터페이스:
//   {
//     name: string,
//     sync: boolean,                       // 동기 API 지원 여부
//     getItem(scopedKey) => string|null,   // 동기 계열 (sync=true 필수)
//     setItem(scopedKey, value),           //
//     removeItem(scopedKey),               //
//     keys() => string[],                  // 실제(스코프된) 키 전체 열거
//     getItemAsync?(scopedKey) => Promise<string|null>,   // 비동기 계열 (선택)
//     setItemAsync?(scopedKey, value) => Promise<void>,   //   미구현 시 동기 구현을
//     removeItemAsync?(scopedKey) => Promise<void>,       //   Promise로 래핑
//     keysAsync?() => Promise<string[]>,                  //
//   }
//
// IndexedDB/SQLite 등 비동기 백엔드는 Async 메서드와 sync:false만 구현하면 된다.
// 이 경우 동기 API는 null/false를 반환하고 경고를 남기므로, 백엔드 교체 전에
// 호출부가 *Async 계열로 이행되어 있어야 한다.

import { scopedKey, unscopedKey } from './exam-context.js';

/**
 * 저장소 백엔드 계약 — 파일 헤더의 인터페이스 주석과 1:1 대응.
 * Async 메서드는 선택 — 미구현 시 동기 구현을 Promise로 래핑한다.
 * @typedef {Object} StorageBackend
 * @property {string} name
 * @property {boolean} sync - 동기 API 지원 여부
 * @property {(k: string) => string|null} getItem
 * @property {(k: string, v: *) => void} setItem - 값은 저장 시 문자열화된다 (숫자 등 비문자열도 허용)
 * @property {(k: string) => void} removeItem
 * @property {() => string[]} keys - 실제(스코프된) 키 전체 열거
 * @property {(k: string) => Promise<string|null>} [getItemAsync]
 * @property {(k: string, v: *) => Promise<void>} [setItemAsync]
 * @property {(k: string) => Promise<void>} [removeItemAsync]
 * @property {() => Promise<string[]>} [keysAsync]
 */

/** 기본 백엔드: 동기 localStorage
 * @returns {StorageBackend} */
export function createLocalStorageBackend() {
    return {
        name: 'localStorage',
        sync: true,
        getItem(k) { return localStorage.getItem(k); },
        setItem(k, v) { localStorage.setItem(k, v); },
        removeItem(k) { localStorage.removeItem(k); },
        keys() {
            const out = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k !== null) out.push(k);
            }
            return out;
        },
    };
}

/** @type {StorageBackend} */
let _backend = createLocalStorageBackend();

/** 백엔드 교체 (테스트·향후 IndexedDB/SQLite 이행용). 현재 백엔드를 반환
 * @param {StorageBackend} backend @returns {StorageBackend} */
export function setStorageBackend(backend) {
    _backend = backend;
    return _backend;
}
/** @returns {StorageBackend} */
export function getStorageBackend() { return _backend; }

// 동기화용 쓰기 훅 — sync.js가 등록 (순환 import 방지용 콜백 패턴)
/** @type {((logicalKey: string) => void)|null} */
let _dataWriteHook = null;
/** @param {((logicalKey: string) => void)|null} fn */
export function setDataWriteHook(fn) { _dataWriteHook = fn; }
/** @param {string} logicalKey */
function _notifyWrite(logicalKey) {
    if (_dataWriteHook) { try { _dataWriteHook(logicalKey); } catch (_) { /* noop */ } }
}

// 저장소 오류 훅 — state.js가 state._storageUnavailable 플래그 동기화용으로 등록
/** @type {(() => void)|null} */
let _errorHook = null;
/** @param {(() => void)|null} fn */
export function setStorageErrorHook(fn) { _errorHook = fn; }

// 저장 실패 경고를 1회만 출력하기 위한 모듈 스코프 플래그 (반복 스팸 방지)
let _warnEmitted = false;
let _unavailable = false;
export function isStorageUnavailable() { return _unavailable; }

/** @param {*} errName — 예외 name 또는 false (호출부가 `e instanceof Error && e.name` 형태로 전달) */
function _markUnavailable(errName) {
    _unavailable = true;
    if (!_warnEmitted) {
        _warnEmitted = true;
        console.warn('[Storage] 로컬 저장 실패 — 진행상황이 저장되지 않을 수 있습니다 ' +
            '(용량 초과/프라이빗 모드/스토리지 비활성).', errName);
    }
    if (_errorHook) { try { _errorHook(); } catch (_) { /* noop */ } }
}

/** @param {string} op */
function _syncUnsupported(op) {
    console.warn(`[Storage] 백엔드(${_backend.name})는 동기 ${op}를 지원하지 않습니다 — ${op}Async를 사용하세요.`);
    return null;
}

// ---------------------------------------------------------------------------
// 동기 API (scoped 논리 키 → 백엔드 실제 키)
// ---------------------------------------------------------------------------

/** @param {string} key @returns {string|null} */
export function getItem(key) {
    if (!_backend.sync) return _syncUnsupported('getItem');
    try {
        return _backend.getItem(scopedKey(key));
    } catch (e) {
        return null;
    }
}

/** @param {string} key @param {*} value - 저장 시 문자열화 (숫자 등 비문자열 허용) @returns {boolean} */
export function setItem(key, value) {
    if (!_backend.sync) { _syncUnsupported('setItem'); return false; }
    try {
        _backend.setItem(scopedKey(key), value);
        _notifyWrite(key);
        return true;
    } catch (e) {
        _markUnavailable(e instanceof Error && e.name);
        return false;
    }
}

/** @param {string} key */
export function removeItem(key) {
    if (!_backend.sync) { _syncUnsupported('removeItem'); return; }
    try {
        _backend.removeItem(scopedKey(key));
    } catch (e) { /* noop */ }
}

/** listKeys()가 반환한 실제(스코프 포함) 키를 삭제 — 재스코프 없이 그대로 백엔드에 전달
 * @param {string} actualKey */
export function removeItemRaw(actualKey) {
    if (!_backend.sync) { _syncUnsupported('removeItemRaw'); return; }
    try {
        _backend.removeItem(actualKey);
    } catch (e) { /* noop */ }
}

/**
 * 현재 시험 네임스페이스에 속한 실제 저장 키 열거 (접두사 필터에 사용).
 * @param {(key: string) => boolean} matchUnscoped - 비접두사 키명을 받는 매처
 * @returns {string[]} 매칭된 실제(접두사 포함) 키 배열
 */
export function listKeys(matchUnscoped) {
    if (!_backend.sync) return _syncUnsupported('listKeys') || [];
    const out = [];
    try {
        for (const raw of _backend.keys()) {
            if (typeof raw !== 'string') continue;
            const unscoped = unscopedKey(raw);
            if (unscoped !== null && matchUnscoped(unscoped)) out.push(raw);
        }
    } catch (e) { /* noop */ }
    return out;
}

/**
 * localStorage JSON 파싱 헬퍼 — 파싱 실패·키 없음 시 fallback 반환.
 * @param {string} key
 * @param {*} [fallback]
 * @returns {any}
 */
export function getJSON(key, fallback = null) {
    const raw = getItem(key);
    if (raw === null || raw === undefined) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

/** @param {string} key @param {*} value @returns {boolean} */
export function setJSON(key, value) {
    try {
        return setItem(key, JSON.stringify(value));
    } catch (e) {
        _markUnavailable(e instanceof Error && e.name);
        return false;
    }
}

/**
 * 다중 논리 키 일괄 쓰기 — 중간 실패 시 이미 기록된 키를 이전 값으로 복원한다.
 * localStorage에는 진짜 트랜잭션이 없으므로 "최선 노력 롤백"이다
 * (복원 자체가 실패하는 극단적 상황까지는 방어하지 못함).
 * 다중 엔티티 갱신(예: 고객 삭제 + 포뮬러 연결 해제)의 중간 상태 방지에 사용.
 * @param {Object.<string, string>} entries - {논리 키: 저장할 문자열}
 * @returns {boolean} 전체 성공 시 true
 */
export function setMany(entries) {
    if (!_backend.sync) { _syncUnsupported('setMany'); return false; }
    const keys = Object.keys(entries);
    /** @type {Object.<string, string|null>} */
    const prev = {};
    for (const k of keys) prev[k] = getItem(k);

    const written = [];
    for (const k of keys) {
        if (setItem(k, entries[k])) { written.push(k); continue; }
        // 롤백 — 이미 기록된 키를 이전 값(없었으면 삭제)으로 되돌린다
        for (const w of written) {
            try {
                if (prev[w] === null) _backend.removeItem(scopedKey(w));
                else _backend.setItem(scopedKey(w), prev[w]);
            } catch (e) { /* 복원 실패는 삼키되 상위 false로 표면화 */ }
        }
        return false;
    }
    return true;
}

/** setMany의 JSON 판 — 값은 직렬화 가능한 객체
 * @param {Object.<string, *>} entries @returns {boolean} */
export function setJSONMany(entries) {
    /** @type {Object.<string, string>} */
    const serialized = {};
    try {
        for (const k of Object.keys(entries)) serialized[k] = JSON.stringify(entries[k]);
    } catch (e) {
        _markUnavailable(e instanceof Error && e.name);
        return false;
    }
    return setMany(serialized);
}

// ---------------------------------------------------------------------------
// 비동기 API — 백엔드 교체(IndexedDB/SQLite) 후에도 호출부 변경 없이 동작.
// 신규 코드는 이 계열 사용 권장.
// ---------------------------------------------------------------------------

/** @param {string} key @returns {Promise<string|null>} */
export async function getItemAsync(key) {
    try {
        if (_backend.getItemAsync) return await _backend.getItemAsync(scopedKey(key));
        if (!_backend.sync) return _syncUnsupported('getItem');
        return _backend.getItem(scopedKey(key));
    } catch (e) {
        return null;
    }
}

/** @param {string} key @param {*} value @returns {Promise<boolean>} */
export async function setItemAsync(key, value) {
    try {
        if (_backend.setItemAsync) {
            await _backend.setItemAsync(scopedKey(key), value);
        } else {
            if (!_backend.sync) { _syncUnsupported('setItem'); return false; }
            _backend.setItem(scopedKey(key), value);
        }
        _notifyWrite(key);
        return true;
    } catch (e) {
        _markUnavailable(e instanceof Error && e.name);
        return false;
    }
}

/** @param {string} key @returns {Promise<void>} */
export async function removeItemAsync(key) {
    try {
        if (_backend.removeItemAsync) return await _backend.removeItemAsync(scopedKey(key));
        if (!_backend.sync) { _syncUnsupported('removeItem'); return; }
        _backend.removeItem(scopedKey(key));
    } catch (e) { /* noop */ }
}

/**
 * listKeys의 비동기 저장소 버전 — keysAsync 미구현 백엔드는 동기 keys()로 폴백.
 * @param {(key: string) => boolean} matchUnscoped - 비접두사 키명을 받는 매처
 * @returns {Promise<string[]>}
 */
export async function listKeysAsync(matchUnscoped) {
    const out = [];
    try {
        const rawKeys = _backend.keysAsync ? await _backend.keysAsync() : (_backend.sync ? _backend.keys() : []);
        for (const raw of rawKeys) {
            const unscoped = unscopedKey(raw);
            if (unscoped !== null && matchUnscoped(unscoped)) out.push(raw);
        }
    } catch (e) { /* noop */ }
    return out;
}

/**
 * getJSON의 비동기 저장소 버전.
 * @param {string} key
 * @param {*} [fallback]
 * @returns {Promise<any>}
 */
export async function getJSONAsync(key, fallback = null) {
    const raw = await getItemAsync(key);
    if (raw === null || raw === undefined) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

/** @param {string} key @param {*} value @returns {Promise<boolean>} */
export async function setJSONAsync(key, value) {
    try {
        return await setItemAsync(key, JSON.stringify(value));
    } catch (e) {
        _markUnavailable(e instanceof Error && e.name);
        return false;
    }
}
