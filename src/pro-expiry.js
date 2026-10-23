// src/pro-expiry.js — Pro 기간권 만료 안내 (PAY-07)
// @spec PAY-07
// ------------------------------------------------------------
// 기간권 만료 임박(D-7 이내)·만료 후 상태를 대시보드 상단 인라인 배너로 안내한다.
// - entitlement 판정은 hasProEntitlement(pro-upgrade.js)와 같은 로컬 키를 쓴다
// - syncPlanFromProfile은 'pro지만 만료 경과'일 때 pro_expires_at을 tombstone으로
//   남겨 '만료자'(연장 유도 대상)와 '미구매자'(안내 없음)를 분기한다.
//   회수(plan='free') 시에는 tombstone도 제거 — 환불자를 쫓지 않는다
// - 만료일 < 활성 시험일이면 '시험 전 만료' 경고를 병기한다
//   (기간별 학습법 안내 SC-16과 별개 — entitlement 신호)
// - 계측: pro_expire_notice — 세션당 1회, 만료→연장 전환 퍼널 관측
// ------------------------------------------------------------
import { safeGetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { getExamDate, getDDay } from './study-tracker.js';
import { reportEvent } from './usage-telemetry.js';
import { showUpgradeNotice } from './pro-upgrade.js';
import { esc } from './sanitize.js';

/** 임박 안내 시작 기준 — 만료 N일 전부터 배너 표시 */
const EXPIRY_NOTICE_DAYS = 7;

/**
 * 기간권 만료 상태 판정 (저장 키 읽기만 — DOM 비의존, 테스트 용이).
 * @param {number} [now] 기준 시각(epoch ms)
 * @returns {null|{state:'expiring'|'expired', daysLeft:number, expiresAt:string, beforeExam:boolean, dday:number|null}}
 *   null = 만료일 없음(무기한·미구매)·유효 기간 임박 아님 — 배너 무표시
 */
export function proExpiryStatus(now = Date.now()) {
    const exp = safeGetItem(STORAGE_KEYS.PRO_EXPIRES_AT);
    if (!exp) return null;
    const expMs = Date.parse(exp);
    if (!Number.isFinite(expMs)) return null;
    const daysLeft = Math.ceil((expMs - now) / 86400000);
    const entitled = safeGetItem(STORAGE_KEYS.PRO_ENTITLED) === '1';
    if (!entitled && daysLeft > 0) return null;     // 회수 등 — 만료 tombstone 아님
    if (entitled && daysLeft > EXPIRY_NOTICE_DAYS) return null;
    const examDate = getExamDate();
    const expDay = String(exp).slice(0, 10);
    return {
        state: daysLeft <= 0 ? 'expired' : 'expiring',
        daysLeft,
        expiresAt: expDay,
        beforeExam: !!examDate && expDay < examDate,
        dday: getDDay(),
    };
}

let _noticeEmitted = false;   // 계측은 세션당 1회 — 배너 재렌더마다 중복 전송 방지

/** 대시보드 만료 배너 갱신 — #pro-expiry-banner 컨테이너에 인라인 렌더 */
export function refreshProExpiryBanner() {
    const el = document.getElementById('pro-expiry-banner');
    if (!el) return;
    const st = proExpiryStatus();
    if (!st) {
        el.classList.add('is-hidden');
        el.innerHTML = '';
        return;
    }
    const examWarn = st.beforeExam && st.dday !== null && st.dday >= 0
        ? ` 시험일(D-${st.dday})보다 먼저 만료됩니다.` : '';
    const title = st.state === 'expired'
        ? 'Pro 기간권이 만료되었습니다'
        : `Pro 기간권 만료까지 D-${st.daysLeft} (만료일 ${st.expiresAt})`;
    const desc = st.state === 'expired'
        ? `학습 데이터는 그대로 보존됩니다 — 연장하면 학습 진단·주간 배분·클라우드 동기화를 이어서 사용할 수 있습니다.${examWarn}`
        : `만료 후에도 학습 데이터는 보존되지만 Pro 기능이 잠깁니다 — 미리 연장하면 중단 없이 이어집니다.${examWarn}`;
    el.innerHTML = `
        <div class="flex-center gap-3">
            <i class="fa-solid fa-hourglass-end draft-banner-icon" aria-hidden="true"></i>
            <div class="text-left">
                <h3 class="draft-banner-title">${esc(title)}</h3>
                <p class="draft-banner-desc">${esc(desc)}</p>
            </div>
        </div>
        <div class="flex-row flex-wrap gap-2">
            <button class="btn btn-primary badge-pill" data-click="openProExtend"><i class="fa-solid fa-gem" aria-hidden="true"></i> Pro 연장하기</button>
        </div>`;
    el.classList.remove('is-hidden');
    if (!_noticeEmitted) {
        _noticeEmitted = true;
        void reportEvent('pro_expire_notice', { state: st.state, days_left: st.daysLeft }).catch(() => {});
    }
}

/** 배너 CTA (data-click 위임) — 연장 결제 안내 모달 (PAY-02 결제 안내 재사용) */
export function openProExtend() {
    const st = proExpiryStatus();
    const msg = st && st.state === 'expired'
        ? 'Pro 기간권이 만료되었습니다 — 연장하면 학습 진단·주간 배분·클라우드 동기화를 이어서 사용할 수 있습니다.'
        : 'Pro 기간권을 연장하면 학습 진단·주간 배분·클라우드 동기화가 중단 없이 이어집니다.';
    showUpgradeNotice('클라우드 동기화', msg);
}
