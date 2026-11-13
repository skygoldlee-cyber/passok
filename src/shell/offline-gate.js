// src/shell/offline-gate.js — 오프라인 기능 표시 정책 (UX-PWA-08)
// @spec UX-PWA-08
// 네트워크 의존 기능은 오프라인에서도 숨기지 않고 비활성 상태로 유지하며,
// 시도 시 사유('오프라인에서는 사용할 수 없습니다.')를 안내한다.
// 오프라인 완전 무의미 기능만 숨김 허용 — 본 모듈 대상은 모두 "온라인 복귀 시 유효" 기능이다.
//
// 오프라인 판정은 offline-detection.js의 프로브 기반 상태(window 'app:offline-change'
// 커스텀 이벤트 + body.is-offline-mode)를 따른다 — navigator.onLine 오탐 영향 최소화.

import { showToast } from '../ui-utils.js';

const REASON = '오프라인에서는 사용할 수 없습니다.';

// 네트워크 왕복이 필요한 동작 셀렉터 레지스트리
const OFFLINE_SELECTORS = [
    '[data-click="authSignIn"]', '[data-click="authSignUp"]', '[data-click="authEmailLogin"]',
    '[data-click="authForgotPassword"]', '[data-click="authVerifyOtp"]', '[data-click="authOAuth"]',
    '[data-click="authLinkIdentity"]', '[data-click="authUnlinkIdentity"]',
    '[data-click="syncNow"]', '[data-click="showRedeemCode"]',
    '[data-click="careAiDraft"]',
    '.ai-coach-btn', '.ai-plan-btn', '.ai-qa-btn',
].join(',');

let _offline = false;
let _observer = null;
let _installed = false;

/** @param {*} root - Element 또는 document */
function _mark(root) {
    const scope = root instanceof Element ? root : document;
    const markOne = (/** @type {Element} */ el) => {
        if (_offline) {
            el.setAttribute('aria-disabled', 'true');
            el.classList.add('offline-blocked');
            el.setAttribute('data-offline-blocked', '1');
            // 기존 title이 있으면 사유를 병기하고 원래 값을 보존
            const orig = el.getAttribute('title');
            if (orig && !orig.includes(REASON)) {
                el.setAttribute('data-offline-orig-title', orig);
                el.setAttribute('title', `${orig} — ${REASON}`);
            } else if (!orig) {
                el.setAttribute('title', REASON);
            }
        } else if (el.getAttribute('data-offline-blocked')) {
            el.removeAttribute('aria-disabled');
            el.classList.remove('offline-blocked');
            el.removeAttribute('data-offline-blocked');
            const orig = el.getAttribute('data-offline-orig-title');
            if (orig !== null) {
                el.setAttribute('title', orig);
                el.removeAttribute('data-offline-orig-title');
            } else if (el.getAttribute('title') === REASON) {
                el.removeAttribute('title');
            }
        }
    };
    // 동적 추가 노드는 자기 자신이 대상일 수 있다
    if (root instanceof Element && root.matches(OFFLINE_SELECTORS)) markOne(root);
    scope.querySelectorAll(OFFLINE_SELECTORS).forEach(markOne);
}

/** @param {boolean} offline */
export function setOfflineFeatureMode(offline) {
    _offline = !!offline;
    document.body?.classList.toggle('is-offline-mode', _offline);
    _mark(document);
}

/** 현재 오프라인 기능 차단 상태 (다른 모듈에서 조회용) */
export function isOfflineMode() { return _offline; }

/**
 * 오프라인 게이트 초기화 — 앱 부팅 시 1회.
 *  - 클릭 캡처: 차단 대상 클릭을 막고 사유 토스트
 *  - MutationObserver: 동적 렌더(분석 뷰 AI 버튼 등)에도 비활성 표시 유지
 */
export function initOfflineGate() {
    if (_installed || typeof document === 'undefined') return;
    _installed = true;

    // 캡처 단계에서 차단 — data-click 디스패처보다 먼저 실행
    document.addEventListener('click', (e) => {
        if (!_offline) return;
        const t = e.target instanceof Element ? e.target.closest(OFFLINE_SELECTORS) : null;
        if (!t) return;
        e.preventDefault();
        e.stopPropagation();
        showToast(REASON, 'warning');
    }, true);

    // 오프라인 전환 이벤트 (offline-detection이 프로브 확정 후 발행)
    window.addEventListener('app:offline-change', (e) => {
        const d = /** @type {CustomEvent} */ (e).detail;
        setOfflineFeatureMode(!!(d && d.offline));
    });

    // 동적 렌더 대응 — 새로 추가된 노드에 오프라인 표시 적용
    if (typeof MutationObserver !== 'undefined' && document.body) {
        _observer = new MutationObserver((muts) => {
            if (!_offline) return;
            for (const m of muts) {
                m.addedNodes.forEach(n => {
                    if (n instanceof Element) _mark(n);
                });
            }
        });
        _observer.observe(document.body, { childList: true, subtree: true });
    }

    // 초기 상태 — 부팅 직후 navigator.onLine=false면 보수적으로만 적용
    if (navigator.onLine === false) setOfflineFeatureMode(true);
}
