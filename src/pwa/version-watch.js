// src/pwa/version-watch.js — 배포 버전 감시 + 새 버전 프롬프트
// @spec P-07
// data/version.js를 주기적으로 무캐시 폴링해 window.APP_VERSION과 다르면
// "새 버전이 있습니다" 배너를 띄운다 — 사용자가 새로고침을 누를 때까지 유지.
// 기존 SW controllerchange 자동 리로드와 보완 관계: 장시간 열린 탭에서
// 브라우저가 SW 업데이트를 확인하기 전에도 배포를 감지할 수 있다.

import { appVersion } from '../app-version.js';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5분
let _timer = null;
let _promptShown = false;

/** data/version.js 응답 텍스트에서 APP_VERSION 추출 — 순수 함수 (테스트용 export) */
export function parseDeployedVersion(text) {
    const m = /window\.APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(text || '');
    return m ? m[1] : null;
}

/** 배포본 버전 조회 — 캐시 우회 (오프라인·실패 시 null) */
export async function fetchDeployedVersion() {
    try {
        const res = await fetch(`data/version.js?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return parseDeployedVersion(await res.text());
    } catch (e) {
        return null;
    }
}

/** SW 캐시 + 등록 해제 후 리로드 — exam-select.js의 hardReloadApp와 동일 동작 */
export async function hardReload() {
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        if (navigator.serviceWorker) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
    } catch (e) { /* noop — 캐시 삭제 실패해도 리로드는 수행 */ }
    location.reload();
}

/** 새 버전 프롬프트 배너 표시 — "새로고침" 버튼으로 사용자 확인 후 적용 */
export function showNewVersionPrompt(deployed) {
    if (_promptShown || typeof document === 'undefined' || !document.body) return;
    _promptShown = true;
    const banner = document.createElement('div');
    banner.id = 'new-version-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
        'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
        'background:rgba(11,15,25,0.95)', 'color:#fff', 'padding:12px 20px',
        'border-radius:12px', 'font-size:14px', 'font-weight:500',
        'z-index:2147483647', 'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
        'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)',
        'display:flex', 'align-items:center', 'gap:14px',
        'max-width:92vw', 'border:1px solid rgba(74,222,128,0.4)',
        'font-family:system-ui,-apple-system,sans-serif'
    ].join(';');
    const label = document.createElement('span');
    label.innerHTML = `<i class="fa-solid fa-circle-arrow-up" style="color:#4ade80;margin-right:6px;" aria-hidden="true"></i>새 버전이 있습니다${deployed ? ` <span style="opacity:0.65;font-size:12px;">(${deployed})</span>` : ''}`;
    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.textContent = '새로고침';
    reloadBtn.style.cssText = 'background:#4ade80;color:#0b0f19;border:none;border-radius:8px;padding:6px 14px;font-weight:600;font-size:13px;cursor:pointer;flex:none;';
    reloadBtn.addEventListener('click', () => { hardReload(); });
    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.setAttribute('aria-label', '닫기');
    dismissBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    dismissBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:14px;padding:4px;flex:none;';
    dismissBtn.addEventListener('click', () => { banner.remove(); });
    banner.appendChild(label);
    banner.appendChild(reloadBtn);
    banner.appendChild(dismissBtn);
    document.body.appendChild(banner);
}

/** 1회 검사 — 현재 APP_VERSION과 배포본 비교 */
export async function checkForNewVersion() {
    const current = appVersion();
    const deployed = await fetchDeployedVersion();
    if (current && deployed && deployed !== current) {
        showNewVersionPrompt(deployed);
        return true;
    }
    return false;
}

/** 감시 시작 — 주기 폴링 + 탭 복귀(visibilitychange) 시 즉시 검사 */
export function startVersionWatch() {
    if (typeof window === 'undefined' || _timer) return;
    _timer = setInterval(() => { checkForNewVersion(); }, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForNewVersion();
    });
}

/** 테스트용 리셋 */
export function _resetVersionWatch() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    _promptShown = false;
    if (typeof document !== 'undefined') document.getElementById('new-version-banner')?.remove();
}
