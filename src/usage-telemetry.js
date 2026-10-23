// src/usage-telemetry.js — 과업 퍼널 이벤트 텔레메트리
// @spec UX-MET-05, UX-MET-06, UX-MET-07, UX-MET-08
// ------------------------------------------------------------
// 핵심 과업의 시작·완주 이벤트를 익명 insert가 허용된 usage_events
// 테이블로 보낸다 (error-telemetry.js와 같은 전송 패턴).
// - session_id: 페이지 로드당 생성되는 랜덤 UUID(telemetry-session.js 공유 —
//   client_errors·bug 피드백과 같은 키로 묶임) — quiz_start↔quiz_complete
//   같은 쌍을 묶는 용도. 기기·사용자를 식별하지 않는다 (영속 식별자 아님)
// - install_id: 기존 DEVICE_ID 익명 기기 식별자를 meta.install_id로 전송
//   (UX-MET-07 — 고유 사용자 추정 단위. 기기 단위 한계는 ADR-0019에 명시)
// - 동의: opt-out 모델 (UX-MET-06, ADR-0019) — telemetry_opt_out 시 전송 차단
// - 화이트리스트: ALLOWED_EVENTS 외 이벤트는 'skipped' (학습 내용 유입 차단)
// - 오프라인 큐: 전송 실패·오프라인 시 telemetry_queue에 보관, online 시 재시도
// - Supabase 미설정: 아무 일도 하지 않음 (조용히 no-op)
// - 세션당 이벤트 상한으로 폭주 방지
// - 개인정보 최소화: 이벤트명·문항 수·점수 등 집계용 수치만, 학습 내용 미포함
// ------------------------------------------------------------
import { getSupabase } from './auth-sync/supabase-client.js';
import { getActiveExamId } from './exam-context.js';
import { getTelemetrySessionId } from './telemetry-session.js';
import { isTelemetryAllowed, getInstallId } from './telemetry-consent.js';
import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { todayKey } from './utils.js';

const MAX_EVENTS_PER_SESSION = 60;   // 세션당 전송 상한
const EVENT_MAX = 60;                // 이벤트명 길이 상한 (스키마 check와 일치)
const QUEUE_MAX = 200;               // 오프라인 큐 상한 (UX-MET-08)
let _sent = 0;

/**
 * 전송 허용 이벤트 화이트리스트 (ADR-0019) — 퍼널 측정에 필요한 이벤트만.
 * 화이트리스트 외 이벤트는 'skipped' — 학습 내용이 이벤트명으로 새는 것을 차단.
 * session_start=방문 분모, core_learning_action=핵심 학습 행동 (DOC-DSN-34 KPI).
 */
export const ALLOWED_EVENTS = new Set([
    'session_start', 'core_learning_action',
    'quiz_start', 'quiz_complete',
    'daily_start', 'daily_complete',
    'usage_snapshot',
    // 전환 퍼널 (PAY-04) — 플랜 비교 → 결제 안내 → 코드 활성화 단계 계측
    'plan_compare_view', 'payment_notice_view', 'payment_link_click',
    'code_redeem_attempt', 'code_redeem_success',
    // 만료→연장 퍼널 (PAY-07) — 기간권 임박·만료 배너 노출
    'pro_expire_notice',
]);

/**
 * 이벤트 → DB 행 페이로드 (순수 함수 — 테스트 용이)
 * @param {string} event 이벤트명 (예: 'quiz_start')
 * @param {Object} [meta] 집계용 부가 수치 (count·correct·total 등 — 내용 데이터 금지)
 * @param {string} [sessionId] 테스트 주입용 세션 ID
 */
export function buildEventPayload(event, meta = {}, sessionId = getTelemetrySessionId(), installId = getInstallId()) {
    return {
        session_id: sessionId,
        event: String(event || 'unknown').slice(0, EVENT_MAX),
        exam_id: (() => { try { return getActiveExamId(); } catch { return null; } })(),
        app_version: (typeof window !== 'undefined' && window.APP_VERSION) || null,
        url: (typeof window !== 'undefined' && window.location?.pathname) || null,
        user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || null,
        meta: { install_id: installId, ...(meta && typeof meta === 'object' ? meta : {}) },
    };
}

/** 기본 전송 — Supabase usage_events 테이블 (익명 insert 정책, schema.sql §6) */
async function defaultInsert(rows) {
    const sb = await getSupabase();
    if (!sb) return { disabled: true };
    const { error } = await sb.from('usage_events').insert(rows);
    return { error };
}

/** 오프라인 큐 읽기 — 손상 데이터는 빈 큐로 복구 (UX-MET-08) */
function _loadQueue() {
    try {
        const q = JSON.parse(safeGetItem(STORAGE_KEYS.TELEMETRY_QUEUE) || '[]');
        return Array.isArray(q) ? q : [];
    } catch { return []; }
}

function _saveQueue(q) {
    try { safeSetItem(STORAGE_KEYS.TELEMETRY_QUEUE, JSON.stringify(q)); }
    catch { /* 저장 실패 시 유실 — 전송 실패 자체가 이미 처리된 상태 */ }
}

/** 전송 실패·오프라인 이벤트를 로컬 큐에 보관 — 상한 200, 초과 시 최신 유지 */
function _enqueue(row) {
    try {
        const q = _loadQueue();
        q.push(row);
        _saveQueue(q.slice(-QUEUE_MAX));
    } catch { /* 큐 실패도 조용히 무시 */ }
}

/**
 * 큐잉된 이벤트 재전송 — online 이벤트·다음 reportEvent 시 호출.
 * 전부 재시도하고 실패분은 다시 큐잉한다 (부분 성공 허용).
 */
export async function flushTelemetryQueue(deps = {}) {
    const q = _loadQueue();
    if (!q.length) return 'empty';
    const insert = deps.insert || defaultInsert;
    const remain = [];
    let sent = 0;
    for (const row of q) {
        try {
            const res = await insert([row]);
            if (res.disabled || res.error) { remain.push(row); continue; }
            sent++;
        } catch { remain.push(row); }
    }
    _saveQueue(remain.slice(-QUEUE_MAX));
    return sent > 0 ? 'sent' : (remain.length ? 'failed' : 'empty');
}

/**
 * 퍼널 이벤트 전송 — 동의·화이트리스트·상한·미설정 환경을 내부에서 처리.
 * 절대 throw하지 않는다. 오프라인이면 큐에 보관하고 'queued' 반환.
 * @param {string} event 이벤트명
 * @param {Object} [meta] 집계용 부가 수치
 * @param {Object} [deps] 테스트 주입용 { insert, online }
 * @returns {Promise<'sent'|'skipped'|'consent_denied'|'queued'|'capped'|'disabled'|'failed'>}
 */
export async function reportEvent(event, meta = {}, deps = {}) {
    try {
        if (!isTelemetryAllowed()) return 'consent_denied';
        if (!ALLOWED_EVENTS.has(event)) return 'skipped';
        if (_sent >= MAX_EVENTS_PER_SESSION) return 'capped';
        const insert = deps.insert || defaultInsert;
        const online = deps.online !== undefined ? deps.online
            : (typeof navigator !== 'undefined' ? navigator.onLine !== false : true);
        const payload = buildEventPayload(event, meta);
        if (!online) { _enqueue(payload); return 'queued'; }
        const res = await insert([payload]);
        if (res.disabled) return 'disabled';
        if (res.error) { _enqueue(payload); return 'failed'; }
        _sent++;
        return 'sent';
    } catch {
        return 'failed';
    }
}

/**
 * 방문 분모 이벤트 (UX-MET-06/07) — 페이지 로드당 1회 'session_start' 전송.
 * 세션당 상한·동의·화이트리스트는 reportEvent가 처리한다. 절대 throw하지 않음.
 */
export function reportSessionStart(deps = {}) {
    // entry_src: 유입 채널 추적 (PAY-04 전환 퍼널) — ?src= 캡처값, 미설정 시 생략
    let entry_src = null;
    try { entry_src = safeGetItem('entry_source') || null; } catch { /* 무시 */ }
    void reportEvent('session_start', entry_src ? { entry_src } : {}, deps).catch(() => {});
}

/** 'online' 복귀 시 큐 플러시 리스너 설치 (UX-MET-08) — 1회 등록 */
export function initTelemetryQueueFlush() {
    try {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => { void flushTelemetryQueue(); });
        }
    } catch { /* 리스너 등록 실패도 조용히 무시 */ }
}

/**
 * 사용 카운터 스냅샷 전송 (UX-MET-05) — UX-GATE-01~03 판정 표본 회수 경로.
 * usage_stats 로컬 카운터(뷰 분포·액션 횟수)를 하루 1회 usage_events에
 * 'usage_snapshot' 이벤트로 싣는다. 카운터·활동 일수만 포함, 학습 내용 없음.
 * install_id는 buildEventPayload가 자동 첨부한다 (UX-MET-07 — owner와 동일
 * DEVICE_ID 값을 install_id 키로 싣는다).
 * Supabase 미설정 환경은 조용히 no-op. 절대 throw하지 않는다.
 * @param {Object} [deps] 테스트 주입용 { insert, load, today }
 * @returns {Promise<'sent'|'skipped'|'consent_denied'|'queued'|'capped'|'disabled'|'failed'>}
 */
export async function maybeReportUsageSnapshot(deps = {}) {
    try {
        const today = deps.today || todayKey();
        if (!deps.today && safeGetItem(STORAGE_KEYS.USAGE_SNAPSHOT_SENT) === today) return 'skipped';
        const load = deps.load || (async () => (await import('./usage-stats.js')).buildUsageExport());
        const rawJson = await load();
        let d = null;
        try { d = JSON.parse(rawJson); } catch { d = null; }
        if (!d || !d.v) return 'skipped';
        const meta = {
            active_days: Object.keys(d.days || {}).length,
            day_counts: d.days || {},
            views: d.views || {},
            actions: d.actions || {},
            first_use: d.firstUse || null,
        };
        const res = await reportEvent('usage_snapshot', meta, deps);
        if (res === 'sent') safeSetItem(STORAGE_KEYS.USAGE_SNAPSHOT_SENT, today);
        return res;
    } catch {
        return 'failed';
    }
}

/** 테스트용 — 내부 카운터 리셋 (session_id는 프로세스 수명 내내 고정) */
export function _resetUsageTelemetryForTest() {
    _sent = 0;
}
