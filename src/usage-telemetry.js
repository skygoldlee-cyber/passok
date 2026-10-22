// src/usage-telemetry.js — 과업 퍼널 이벤트 텔레메트리
// @spec none (관측성 인프라 — Supabase 미설정 환경에서는 완전 무동작)
// ------------------------------------------------------------
// 핵심 과업의 시작·완주 이벤트를 익명 insert가 허용된 usage_events
// 테이블로 보낸다 (error-telemetry.js와 같은 전송 패턴).
// - session_id: 페이지 로드당 생성되는 랜덤 UUID(telemetry-session.js 공유 —
//   client_errors·bug 피드백과 같은 키로 묶임) — quiz_start↔quiz_complete
//   같은 쌍을 묶는 용도. 기기·사용자를 식별하지 않는다 (영속 식별자 아님)
// - Supabase 미설정: 아무 일도 하지 않음 (조용히 no-op)
// - 세션당 이벤트 상한으로 폭주 방지
// - 개인정보 최소화: 이벤트명·문항 수·점수 등 집계용 수치만, 학습 내용 미포함
// ------------------------------------------------------------
import { getSupabase } from './auth-sync/supabase-client.js';
import { getActiveExamId } from './exam-context.js';
import { getTelemetrySessionId } from './telemetry-session.js';
import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { todayKey } from './utils.js';

const MAX_EVENTS_PER_SESSION = 60;   // 세션당 전송 상한
const EVENT_MAX = 60;                // 이벤트명 길이 상한 (스키마 check와 일치)
let _sent = 0;

/**
 * 이벤트 → DB 행 페이로드 (순수 함수 — 테스트 용이)
 * @param {string} event 이벤트명 (예: 'quiz_start')
 * @param {Object} [meta] 집계용 부가 수치 (count·correct·total 등 — 내용 데이터 금지)
 * @param {string} [sessionId] 테스트 주입용 세션 ID
 */
export function buildEventPayload(event, meta = {}, sessionId = getTelemetrySessionId()) {
    return {
        session_id: sessionId,
        event: String(event || 'unknown').slice(0, EVENT_MAX),
        exam_id: (() => { try { return getActiveExamId(); } catch { return null; } })(),
        app_version: (typeof window !== 'undefined' && window.APP_VERSION) || null,
        url: (typeof window !== 'undefined' && window.location?.pathname) || null,
        user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || null,
        meta: meta && typeof meta === 'object' ? meta : {},
    };
}

/** 기본 전송 — Supabase usage_events 테이블 (익명 insert 정책, schema.sql §6) */
async function defaultInsert(rows) {
    const sb = await getSupabase();
    if (!sb) return { disabled: true };
    const { error } = await sb.from('usage_events').insert(rows);
    return { error };
}

/**
 * 퍼널 이벤트 전송 — 상한·미설정 환경을 내부에서 처리. 절대 throw하지 않는다.
 * @param {string} event 이벤트명
 * @param {Object} [meta] 집계용 부가 수치
 * @param {Object} [deps] 테스트 주입용 { insert }
 * @returns {Promise<'sent'|'capped'|'disabled'|'failed'>}
 */
export async function reportEvent(event, meta = {}, deps = {}) {
    try {
        if (_sent >= MAX_EVENTS_PER_SESSION) return 'capped';
        const insert = deps.insert || defaultInsert;
        const res = await insert([buildEventPayload(event, meta)]);
        if (res.disabled) return 'disabled';
        if (res.error) return 'failed';
        _sent++;
        return 'sent';
    } catch {
        return 'failed';
    }
}

/**
 * 사용 카운터 스냅샷 전송 (UX-MET-05) — UX-GATE-01~03 판정 표본 회수 경로.
 * usage_stats 로컬 카운터(뷰 분포·액션 횟수)를 하루 1회 usage_events에
 * 'usage_snapshot' 이벤트로 싣는다. 카운터·활동 일수만 포함, 학습 내용·
 * 영속 식별자 없음 (owner device_id는 보내지 않고 session_id만 사용).
 * Supabase 미설정 환경은 조용히 no-op. 절대 throw하지 않는다.
 * @param {Object} [deps] 테스트 주입용 { insert, load, today }
 * @returns {Promise<'sent'|'skipped'|'capped'|'disabled'|'failed'>}
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
