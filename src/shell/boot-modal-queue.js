// src/shell/boot-modal-queue.js — 부팅 모달 우선순위 큐 (UX-FB-09)
// @spec UX-FB-09
// 부팅 직후 경쟁하는 자동 표시 모달을 한 번에 1개만 순차 표시한다.
// 우선순위(낮을수록 먼저): 법적·텔레메트리 고지(10) > 온보딩 OB-01(20) > 갱신 공지(30) > 프로모션·안내(40+).
// 각 항목의 show()는 표시 조건을 내부에서 판정 — 모달이 생성되지 않으면 즉시 다음으로 진행.
// 닫힘 감지는 MutationObserver(DOM 제거·비표시 전환) 기반 — 각 모달의 close 경로와 무관하게 동작.

/** @type {{priority:number, modalId:string, show:()=>void}[]} */
const _queue = [];
let _activeModal = null;
let _observer = null;
let _drainScheduled = false;

export const BOOT_MODAL_PRIORITY = {
    LEGAL: 10,
    ONBOARDING: 20,
    RELEASE_NOTES: 30,
    PROMO: 40,
};

function _drain() {
    if (_activeModal) return; // 진행 중 모달이 닫힐 때까지 대기
    _queue.sort((a, b) => a.priority - b.priority);
    const next = _queue.shift();
    if (!next) return;
    next.show();
    const el = document.getElementById(next.modalId);
    if (!el) { setTimeout(_drain, 0); return; } // 표시 조건 미충족 — 다음으로
    _activeModal = el;
    if (_observer) _observer.disconnect();
    if (typeof MutationObserver === 'undefined' || !document.body) { _activeModal = null; return; }
    _observer = new MutationObserver(() => {
        const gone = !el.isConnected
            || (typeof el.checkVisibility === 'function'
                && !el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true }));
        if (!gone) return;
        _observer.disconnect();
        _observer = null;
        _activeModal = null;
        setTimeout(_drain, 50);
    });
    _observer.observe(document.body, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ['class', 'style', 'hidden'],
    });
}

/**
 * 부팅 모달을 우선순위 큐에 등록한다.
 * @param {number} priority - BOOT_MODAL_PRIORITY 상수 (낮을수록 먼저)
 * @param {string} modalId - show()가 생성하는 최상위 오버레이 요소 id
 * @param {() => void} show - 모달 표시 함수 (조건 미충족 시 아무것도 생성 안 함)
 */
export function enqueueBootModal(priority, modalId, show) {
    _queue.push({ priority, modalId, show });
    // 같은 틱의 연속 등록을 모아 우선순위 정렬 후 드레인 (등록 순서 무관하게 우선순위 보장)
    if (!_drainScheduled) {
        _drainScheduled = true;
        setTimeout(() => { _drainScheduled = false; _drain(); }, 0);
    }
}

/** 테스트용 리셋 */
export function _resetBootModalQueue() {
    _queue.length = 0;
    _activeModal = null;
    _drainScheduled = false;
    if (_observer) { _observer.disconnect(); _observer = null; }
}
