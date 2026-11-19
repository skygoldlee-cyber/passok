// src/pwa/app-badge.js — 설치된 PWA 아이콘 "미적용 업데이트" 숫자 배지 (Badging API)
// @spec P-15
// navigator.setAppBadge(1)/clearAppBadge()로 설치형 아이콘에 배지를 부착·해제한다.
// 지원: 데스크톱 Chrome·Edge(작업표시줄/독), iOS 16.4+ 홈화면 웹앱(알림 권한 전제).
// Android는 API 미지원으로 조용히 무시 — 알림 기반 점(dot) 표시는 별도 SPEC 검토.
// 배지는 OS 소유 지속 상태라 앱 종료 후에도 남는다 — 배너를 닫고 종료한 사용자에게
// "미적용 업데이트 있음"을 알리는 유일한 잔존 표시이므로, 적용 완료·버전 일치
// 확인 시 반드시 해제해 스테일 배지 잔존을 막는다.

import { isStandalonePwa } from '../core/utils.js';
import { STORAGE_KEYS } from '../core/storage-keys.js';
import { safeGetItem, safeSetItem } from '../core/state.js';

const UPDATE_BADGE_COUNT = 1;

/** standalone 안전 판정 — window/navigator 부재·접근 예외 환경에서도 false로 실패 */
function defaultStandalone() {
    try {
        return typeof window !== 'undefined' && isStandalonePwa();
    } catch (e) {
        return false;
    }
}

/**
 * 배지 적용 핵심 — nav·standalone 주입형 (테스트 가능).
 * standalone 게이트는 UX-PWA-02 규약 — 미설치(브라우저 탭)에서 의미 없는 호출 차단.
 * @param {boolean} pending - true=배지 부착(1), false=해제
 * @param {{ setAppBadge?: (n: number) => void, clearAppBadge?: () => void } | null} [nav] - navigator 호환 객체
 * @param {boolean} [standalone] - 설치형 PWA 여부
 * @returns {'set'|'clear'|'skip'}
 */
export function applyAppBadge(pending, nav = globalThis.navigator, standalone = defaultStandalone()) {
    if (!nav || typeof nav.setAppBadge !== 'function' || typeof nav.clearAppBadge !== 'function' || standalone !== true) return 'skip';
    try {
        if (pending) {
            nav.setAppBadge(UPDATE_BADGE_COUNT);
            return 'set';
        }
        nav.clearAppBadge();
        return 'clear';
    } catch (e) {
        return 'skip';
    }
}

/** 미적용 업데이트 감지 — 아이콘에 숫자 배지 부착 */
export function setUpdateBadge() {
    return applyAppBadge(true);
}

/** 업데이트 적용 완료·버전 일치 확인 — 배지 해제 (부팅 안전장치) */
export function clearUpdateBadge() {
    return applyAppBadge(false);
}

/* ── P-17: Android 대체 표면 — 배지 미지원 시 로컬 알림 ────────────────────
 * setAppBadge가 없는 Android는 런처가 "읽지 않은 알림"에 아이콘 점을 자동 표시한다.
 * 알림 권한은 P-19 학습 알림 토글 등 사용자 동의 경로에서만 획득 — 여기서는
 * 이미 부여된 경우에만 발송하며 무단 권한 요청을 하지 않는다. */

const UPDATE_NOTIFY_TAG = 'passok-update';

/**
 * 업데이트 알림 발송 여부 판정 — 순수 함수 (테스트용).
 * @param {{standalone:boolean, badgeOk:boolean, permission:string, notifiedVer:string|null, version:string}} s
 * @returns {boolean}
 */
export function shouldNotifyUpdate(s) {
    return s.standalone === true
        && s.badgeOk !== true              // 배지가 붙은 환경은 알림 불필요
        && s.permission === 'granted'      // 부여된 권한만 사용 — 무단 요청 금지
        && !!s.version && s.notifiedVer !== s.version; // 버전당 1회
}

/**
 * 업데이트 알림 발송 — showNotification 주입형 (테스트 가능).
 * @param {string} version
 * @param {{showNotification?:Function}|null|undefined} reg
 */
export async function notifyUpdateAvailable(version, reg) {
    if (!reg || typeof reg.showNotification !== 'function') return false;
    try {
        await reg.showNotification('PassOK 업데이트', {
            body: '새 버전이 있습니다 — 열어서 적용하세요',
            tag: UPDATE_NOTIFY_TAG,
            icon: './icons/passok-icon-192.png',
        });
        safeSetItem(STORAGE_KEYS.UPDATE_NOTIFIED, version);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 미적용 업데이트 표면 통합 진입 — 배지 가능이면 배지, 아니면 권한 부여된 알림.
 * version-watch의 버전 불일치 감지 시 호출한다.
 * @param {string} deployed - 감지된 배포 버전
 * @returns {Promise<'badge'|'notify'|'skip'>}
 */
export async function surfaceUpdateAvailable(deployed) {
    if (applyAppBadge(true) === 'set') return 'badge';
    const standalone = defaultStandalone();
    const permission = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
    let notifiedVer = null;
    try { notifiedVer = safeGetItem(STORAGE_KEYS.UPDATE_NOTIFIED); } catch (e) { /* 무시 */ }
    if (!shouldNotifyUpdate({ standalone, badgeOk: false, permission, notifiedVer, version: deployed })) return 'skip';
    try {
        const reg = await globalThis.navigator?.serviceWorker?.getRegistration?.();
        return (await notifyUpdateAvailable(deployed, reg)) ? 'notify' : 'skip';
    } catch (e) {
        return 'skip';
    }
}
