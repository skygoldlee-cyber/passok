// src/pwa/app-badge.js — 설치된 PWA 아이콘 "미적용 업데이트" 숫자 배지 (Badging API)
// @spec P-15
// navigator.setAppBadge(1)/clearAppBadge()로 설치형 아이콘에 배지를 부착·해제한다.
// 지원: 데스크톱 Chrome·Edge(작업표시줄/독), iOS 16.4+ 홈화면 웹앱(알림 권한 전제).
// Android는 API 미지원으로 조용히 무시 — 알림 기반 점(dot) 표시는 별도 SPEC 검토.
// 배지는 OS 소유 지속 상태라 앱 종료 후에도 남는다 — 배너를 닫고 종료한 사용자에게
// "미적용 업데이트 있음"을 알리는 유일한 잔존 표시이므로, 적용 완료·버전 일치
// 확인 시 반드시 해제해 스테일 배지 잔존을 막는다.

import { isStandalonePwa } from '../core/utils.js';

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
