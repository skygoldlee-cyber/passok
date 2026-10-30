// src/telemetry-consent.js — 텔레메트리 동의·익명 설치 ID
// @spec UX-MET-06, UX-MET-07
// ------------------------------------------------------------
// ADR-0019: opt-out 동의 모델 — 기본 활성, 설정에서 언제든 거부 가능.
// 거부 시 기능 제한 없이 전송만 차단된다.
// 익명 설치 ID는 기존 DEVICE_ID를 재사용한다 (별도 설치 ID 신설 금지 —
// 중복 식별자는 혼란만 키운다). 고유 사용자는 install_id(기기) 단위로
// 추정한다 — 브라우저 데이터 삭제 시 신규 카운트되는 한계는 알려진 오차.
// ------------------------------------------------------------
import { safeGetItem, safeSetItem } from '../state.js';
import { STORAGE_KEYS } from '../storage-keys.js';

/** 텔레메트리 전송 허용 여부 — opt-out 플래그가 없으면 허용 (기본 활성) */
export function isTelemetryAllowed() {
    try { return safeGetItem(STORAGE_KEYS.TELEMETRY_OPT_OUT) !== '1'; }
    catch { return true; } // 스토리지 실패 시 수집은 시도 — 전송 실패는 usage-telemetry가 처리
}

/**
 * 자동화·로컬 런타임 여부 — CI E2E(navigator.webdriver)·file:·localhost 계열
 * 호스트에서는 텔레메트리를 보내지 않는다. 프로덕션 지표가 테스트·개발 트래픽으로
 * 오염되는 것을 차단한다 (EVAL_2026-10-30: quiz_complete 전량이 Playwright UA로 확인).
 * 테스트에서 전송 경로를 검증하려면 호출부 deps.automated=false로 우회한다.
 */
export function isAutomatedRuntime() {
    try {
        if (typeof navigator !== 'undefined' && navigator.webdriver) return true;
        if (typeof location !== 'undefined') {
            if (location.protocol === 'file:') return true;
            const h = location.hostname;
            if (h === '' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true;
        }
    } catch { /* 판정 실패 시 자동화로 보지 않음 — 수집 유지 */ }
    return false;
}

/** 텔레메트리 동의 토글 — 거부 시 '1' 저장, 허용 시 제거 */
export function setTelemetryAllowed(allowed) {
    try {
        if (allowed) safeSetItem(STORAGE_KEYS.TELEMETRY_OPT_OUT, '0');
        else safeSetItem(STORAGE_KEYS.TELEMETRY_OPT_OUT, '1');
    } catch { /* 저장 실패 시 다음 페이지 로드에서 재시도 가능 */ }
}

/** 최초 실행 고지 표시 여부 */
export function isTelemetryNoticeShown() {
    try { return safeGetItem(STORAGE_KEYS.TELEMETRY_NOTICE_SHOWN) === '1'; }
    catch { return false; }
}

export function markTelemetryNoticeShown() {
    try { safeSetItem(STORAGE_KEYS.TELEMETRY_NOTICE_SHOWN, '1'); }
    catch { /* 표시 실패 시 다음 로드에서 재시도 */ }
}

/**
 * 익명 설치 ID — usage-stats._ownerId·sync.getDeviceId와 같은 DEVICE_ID 키 공유.
 * 값이 없으면 생성해 저장한다 (익명 기기 식별 — 로그인 없는 기간의 "유저" 단위).
 */
export function getInstallId() {
    try {
        let id = safeGetItem(STORAGE_KEYS.DEVICE_ID);
        if (!id) {
            id = (crypto.randomUUID && crypto.randomUUID())
                || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            safeSetItem(STORAGE_KEYS.DEVICE_ID, id);
        }
        return id;
    } catch { return null; }
}
