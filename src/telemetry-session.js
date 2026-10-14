// src/telemetry-session.js — 텔레메트리 공유 세션 ID
// @spec none (관측성 인프라 — 식별자가 아닌 상관 키)
// ------------------------------------------------------------
// 페이지 로드당 1개의 랜덤 UUID. client_errors·usage_events·feedback(bug 신고의
// meta)이 같은 값을 써서 "한 페이지 로드 안에서 일어난 일"을 서버에서 join할 수
// 있다. 영속 저장되지 않으므로 기기·사용자를 식별하지 않는다 — 신고 기반 연결
// (kind='bug' 피드백 ↔ 그 세션의 오류)이 유일한 소비자다.
// ------------------------------------------------------------

const _sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** 현재 페이지 로드의 텔레메트리 세션 ID — 프로세스 수명 내내 고정 */
export function getTelemetrySessionId() {
    return _sessionId;
}
