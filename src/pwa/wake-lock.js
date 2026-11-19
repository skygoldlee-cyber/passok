// src/pwa/wake-lock.js — 화면 꺼짐 방지 (Screen Wake Lock API)
// @spec P-16
// 설정 토글 ON 시 wakeLock sentinel을 획득해 학습 중 절전 진입을 차단한다.
// API 규약: 탭이 숨겨지면 sentinel이 자동 해제되므로 visibilitychange 복귀마다
// 재획득해야 한다. 미지원 환경은 토글을 비활성 안내한다. 기본 OFF(배터리 보호).

import { STORAGE_KEYS } from '../core/storage-keys.js';
import { safeGetItem, safeSetItem } from '../core/state.js';
import { showToast } from '../ui-utils.js';
import { setTextById } from '../core/dom.js';

/** @type {{ released?: boolean, release?: () => Promise<*>, addEventListener?: Function } | null} WakeLockSentinel */
let _sentinel = null;
let _watching = false;

/**
 * Wake Lock 지원 여부 — nav 주입형 (테스트 가능).
 * @param {{ wakeLock?: { request?: Function } } | null} [nav]
 * @returns {boolean}
 */
export function wakeLockSupported(nav = globalThis.navigator) {
    return !!(nav && nav.wakeLock && typeof nav.wakeLock.request === 'function');
}

/** 설정 저장값 */
export function isWakeLockOn() {
    return safeGetItem(STORAGE_KEYS.WAKE_LOCK) === 'on';
}

function syncLabel() {
    setTextById('wake-lock-label', isWakeLockOn() ? '켜짐' : '꺼짐');
}

/**
 * sentinel 획득 시도 — nav 주입형. 실패(권한·배터리 정책)는 무해 false.
 * @param {{ wakeLock?: { request?: Function } } | null} [nav]
 * @returns {Promise<boolean>}
 */
export async function acquireWakeLock(nav = globalThis.navigator) {
    const wl = nav?.wakeLock;
    if (!wl || typeof wl.request !== 'function') return false;
    try {
        const s = /** @type {{ release?: () => Promise<*>, addEventListener?: Function } | null} */ (await wl.request('screen'));
        _sentinel = s;
        s?.addEventListener?.('release', () => { _sentinel = null; });
        return true;
    } catch (e) {
        _sentinel = null;
        return false;
    }
}

/** sentinel 해제 — 없으면 무해 */
export async function releaseWakeLock() {
    const s = _sentinel;
    _sentinel = null;
    if (s && typeof s.release === 'function') {
        try { await s.release(); } catch (e) { /* 이미 해제됨 */ }
    }
}

/** 토글 핸들러 — 설정 패널 data-click */
export async function toggleWakeLock() {
    if (!wakeLockSupported()) {
        showToast('이 브라우저는 화면 꺼짐 방지를 지원하지 않습니다', 'info');
        return;
    }
    const next = !isWakeLockOn();
    safeSetItem(STORAGE_KEYS.WAKE_LOCK, next ? 'on' : '');
    if (next) {
        const ok = await acquireWakeLock();
        showToast(ok
            ? '화면 꺼짐 방지를 켰습니다 — 학습 중 화면이 꺼지지 않습니다'
            : '화면 꺼짐 방지를 켰지만 지금은 적용되지 않습니다 — 탭이 다시 보이면 적용됩니다', 'info');
    } else {
        await releaseWakeLock();
        showToast('화면 꺼짐 방지를 껐습니다', 'info');
    }
    syncLabel();
}

/** 부팅 반영 — 저장값이 on이면 획득 + 탭 복귀마다 재획득 리스너 등록 */
export function initWakeLock() {
    syncLabel();
    if (!isWakeLockOn() || !wakeLockSupported()) return;
    acquireWakeLock();
    if (_watching || typeof document === 'undefined') return;
    _watching = true;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isWakeLockOn() && !_sentinel) {
            acquireWakeLock();
        }
    });
}
