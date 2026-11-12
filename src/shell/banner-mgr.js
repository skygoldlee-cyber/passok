// src/shell/banner-mgr.js — 배너 동시 표시 상한 관리 (UX-FB-09)
// @spec UX-FB-09
// 정책: 동시 표시 배너는 최대 2개. 초과분은 낮은 우선순위부터 숨기고,
// 우선순위 배너가 닫히면 숨겼던 배너를 다시 표시한다 (회전 큐).
// 우선순위(낮을수록 높음): 오프라인/저장공간(10) > 법적·교재 개정 고지(20) > 기타·만료 알림(30+).
// 배너 표시 여부는 각 배너의 기존 토글(classList·style.display)을 존중 — 본 모듈은
// "표시하려는 배너" 중 상한 초과분만 지연시키는 얇은 감독자다.

const PRIORITY = {
    'offline-banner': 10,
    'storage-warning-banner': 10,
    'formula-notice-banner': 20,
    'textbook-edition-banner': 20,
    'pro-expiry-banner': 30,
    'new-version-banner': 30,
};

let _observer = null;
/** @type {Set<HTMLElement>} — 초과분으로 강제 숨긴 배너 (우선순위 복귀 대기) */
const _deferred = new Set();

function _isShown(el) {
    if (!el.isConnected) return false;
    if (el.classList.contains('show') || el.classList.contains('is-visible')) return true;
    // 인라인 display 스타일로 표시되는 배너 — 미설정('')이면 기본 숨김으로 간주
    return el.style.display !== '' && el.style.display !== 'none';
}

function _defer(el) {
    // 기존 표시 방식을 무효화 — 회복 시 같은 방식으로 복원
    el.dataset.bannerDeferred = el.classList.contains('show') || el.classList.contains('is-visible') ? 'class' : 'style';
    el.classList.remove('show', 'is-visible');
    if (el.dataset.bannerDeferred === 'style') el.style.display = 'none';
    _deferred.add(el);
}

function _restore(el) {
    _deferred.delete(el);
    delete el.dataset.bannerDeferred;
    el.classList.add('show');
}

function _enforce() {
    /** @type {HTMLElement[]} */
    const visible = [];
    for (const id of Object.keys(PRIORITY)) {
        const el = document.getElementById(id);
        if (el && _isShown(el) && !_deferred.has(el)) visible.push(el);
    }
    // 회전 복귀: 자리가 나면 숨겨진 배너를 우선순위 순으로 복원
    if (visible.length < 2 && _deferred.size) {
        const waiting = [..._deferred].sort((a, b) => (PRIORITY[a.id] || 40) - (PRIORITY[b.id] || 40));
        while (visible.length < 2 && waiting.length) {
            const el = waiting.shift();
            if (!el) break;
            _restore(el);
            visible.push(el);
        }
    }
    if (visible.length <= 2) return;
    // 초과분은 우선순위 낮은 것(큰 수)부터 지연
    visible.sort((a, b) => (PRIORITY[b.id] || 40) - (PRIORITY[a.id] || 40));
    while (visible.length > 2) {
        const el = visible.shift();
        if (el) _defer(el);
    }
}

/** 배너 상한 감독 시작 — 앱 부팅 시 1회 호출 (idempotent) */
export function initBannerCap() {
    if (_observer || typeof MutationObserver === 'undefined' || !document.body) return;
    _observer = new MutationObserver((muts) => {
        // 감독이 직접 바꾼 속성 변경이 무한 재귀하지 않도록 관련 배너 변경만 필터
        const relevant = muts.some(m => {
            const t = m.target;
            return t instanceof Element && PRIORITY[t.id] !== undefined;
        });
        if (relevant) _enforce();
    });
    _observer.observe(document.body, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ['class', 'style'],
    });
    _enforce();
}

/** 테스트용 정지 */
export function _stopBannerCap() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    _deferred.clear();
}
