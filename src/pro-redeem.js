// src/pro-redeem.js — 라이선스 코드 입력 → Pro 활성화 (PAY-01)
// @spec PAY-01, PAY-03, PAY-06, PAY-07, PAY-08
// ------------------------------------------------------------
// P2 선실험(PAYMENT_PILOT_DESIGN §3)의 구매자 활성화 경로:
//   수동 결제 확인 → 운영자가 admin:issue-code로 발급한 코드를 구매자가 입력
//   → redeem_code RPC(security definer)가 profiles.plan='pro' 갱신
//   → 로컬 pro_entitled를 표시용 플래그로 갱신 (실제 권한 정본은 서버 — DOC-DSN-34 §5.2)
// - 로그인 필수: RPC가 auth.uid() 필요 (Pro=계정 동기화 포함 정책)
// - 실패 구분 최소화: 무효/사용됨/미로그인 모두 동일 안내 (코드 오라클 축소)
// - 전환 계측: code_redeem_attempt / code_redeem_success (PAY-01)
// - Supabase 미설정 환경: 조용히 no-op 안내
// ------------------------------------------------------------
import { getSupabase, getAuthSession, onAuthChange } from './auth-sync/supabase-client.js';
import { openAuthModal } from './auth-sync/auth-view.js';
import { safeSetItem, safeRemoveItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { reportEvent } from './usage-telemetry.js';
import { trapFocus, showToast } from './ui-utils.js';
import { getExamDate } from './study-tracker.js';

/**
 * Pro entitlement 판정 (PAY-06) — plan='pro'이고 만료일이 없거나 미래면 유효.
 * pro_expires_at=null은 관리자 무기한 부여(grant-pro --days 미지정)로 간주한다.
 * @param {string} plan profiles.plan
 * @param {string|null} expiresAt profiles.pro_expires_at (ISO)
 * @param {number} [now] 기준 시각 (테스트용)
 */
export function isEntitledToPro(plan, expiresAt, now = Date.now()) {
    if (plan !== 'pro') return false;
    if (!expiresAt) return true;
    return Date.parse(expiresAt) > now;
}

/**
 * profiles 행 조회 — plan + pro_expires_at.
 * 스키마 미배포 환경(pro_expires_at 컬럼 부재)에서는 plan만 재조회하는 폴백을 둔다
 * (PAY-06 배포 순서 차익 — 컬럼 추가 전까지 기간권 만료 없이 기존 동작 유지).
 */
async function _fetchProfile(sb, uid) {
    let res = await sb.from('profiles').select('plan,pro_expires_at').eq('id', uid).single();
    if (res.error) {
        res = await sb.from('profiles').select('plan').eq('id', uid).single();
    }
    return res.error ? null : res.data;
}

/**
 * 서버 plan 결과를 로컬 키에 반영 (저장 쓰기만 — Supabase 비의존, 테스트 용이).
 * PAY-07: plan은 'pro'지만 만료 경과한 경우 만료일을 tombstone으로 유지해
 * 만료자(연장 유도 대상)와 미구매자·회수자를 분기한다.
 * 회수(plan='free')·만료일 없음이면 잔재를 제거한다.
 * @param {string} plan profiles.plan
 * @param {string|null|undefined} expiresAt profiles.pro_expires_at (ISO)
 * @returns {'pro'|'free'} 적용된 결과 상태
 */
export function applyPlanToLocal(plan, expiresAt) {
    const exp = expiresAt ?? null;
    if (isEntitledToPro(plan, exp)) {
        safeSetItem(STORAGE_KEYS.PRO_ENTITLED, '1');
        if (expiresAt) safeSetItem(STORAGE_KEYS.PRO_EXPIRES_AT, expiresAt);
        else safeRemoveItem(STORAGE_KEYS.PRO_EXPIRES_AT);
        return 'pro';
    }
    safeRemoveItem(STORAGE_KEYS.PRO_ENTITLED);
    if (plan === 'pro' && exp) {
        safeSetItem(STORAGE_KEYS.PRO_EXPIRES_AT, exp);
    } else {
        safeRemoveItem(STORAGE_KEYS.PRO_EXPIRES_AT);
    }
    return 'free';
}

/**
 * 서버 plan → 로컬 pro_entitled 동기화 (PAY-03) — 로그인 세션이 있을 때만 실행.
 * profiles.plan이 서버 정본이므로 유효한 pro면 플래그를 세우고, 아니면 로컬 잔재를 정리한다
 * (환불 회수 grant-pro --revoke 또는 기간권 만료 경과 시 다음 로그인에 이 기기도 해제).
 * 비로그인 사용자는 건드리지 않는다 — 로컬 전용 플래그를 유지.
 * @returns {Promise<'pro'|'free'|'skip'>} 적용된 결과 상태
 */
export async function syncPlanFromProfile() {
    const sb = await getSupabase();
    if (!sb) return 'skip';
    const session = await getAuthSession();
    if (!session?.user?.id) return 'skip';
    const data = await _fetchProfile(sb, session.user.id);
    if (!data) return 'skip';
    return applyPlanToLocal(data.plan, data.pro_expires_at);
}

/**
 * plan 동기화 초기화 (PAY-03) — 부팅 시 1회 동기화 + 로그인 이벤트마다 재동기화.
 * 로그아웃(SIGNED_OUT)은 로컬 플래그를 건드리지 않는다 — 다음 로그인 시 서버 값으로 재확정.
 */
export async function initPlanSync() {
    try { await syncPlanFromProfile(); } catch (_) {}
    try {
        await onAuthChange((session, event) => {
            if (event === 'SIGNED_IN' && session?.user?.id) {
                void syncPlanFromProfile().catch(() => {});
            }
        });
    } catch (_) {}
}

/** 코드 입력값 정규화 — 공백 제거·대문자 변환 (형식: CHANNEL-XXXX-XXXX) */
export function normalizeCode(raw) {
    return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * redeem_code RPC 호출 (PAY-08) — 활성 시험의 exam_date를 넘겨 만료일이
 * 시험일+3일 아래로 내려가지 않도록 한다 (시험 직전 entitlement 절벽 방지).
 * 시험일 미설정이면 null — 서버는 기존 규칙(기준일+valid_days)만 적용.
 * 구 서명 스키마(p_code만 받는 버전) 미배포 환경에서는 인자 없이 재시도하는 폴백을 둔다
 * (배포 순서 차익 — PAY-06의 _fetchProfile 폴백과 같은 패턴).
 */
export async function callRedeemRpc(sb, code) {
    const examDate = getExamDate();
    let res = await sb.rpc('redeem_code', { p_code: code, p_exam_date: examDate });
    if (res.error) {
        res = await sb.rpc('redeem_code', { p_code: code });
    }
    return res;
}

let _onClose = null;
function _closeDialog(overlay) {
    if (!overlay) return;
    const dialog = overlay.querySelector('.app-confirm-dialog');
    overlay.classList.remove('is-visible');
    dialog?.classList.remove('is-visible');
    const cb = _onClose; _onClose = null;
    setTimeout(() => { if (cb) cb(); overlay.remove(); }, 200);
}

/** 라이선스 코드 입력 다이얼로그 — 설정 메뉴 '플랜 안내 · 라이선스 코드'의 플랜 비교 모달에서 호출 */
export async function showRedeemDialog() {
    const sb = await getSupabase();
    if (!sb) {
        showToast('이 환경에서는 계정 기능을 사용할 수 없습니다', 'info');
        return;
    }
    const session = await getAuthSession();
    if (!session) {
        showToast('Pro 활성화는 로그인 후 이용할 수 있습니다 — 로그인 후 코드를 입력해주세요', 'info');
        openAuthModal();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'redeem-overlay';
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = `
        <div class="app-confirm-dialog dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="redeem-title">
            <h3 id="redeem-title">🔑 라이선스 코드 입력</h3>
            <p>구매 후 발급받은 Pro 활성화 코드를 입력하세요 (예: <code>CAFE-XXXX-XXXX</code>)</p>
            <input type="text" id="redeem-code-input" class="redeem-input" maxlength="32"
                   autocomplete="off" autocapitalize="characters" spellcheck="false"
                   placeholder="코드 입력" aria-label="라이선스 코드" />
            <p id="redeem-msg" class="redeem-msg" aria-live="polite"></p>
            <div class="app-confirm-actions">
                <button class="app-confirm-cancel">취소</button>
                <button class="app-confirm-ok" id="redeem-submit">활성화</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    const dialog = overlay.querySelector('.app-confirm-dialog');
    requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        dialog?.classList.add('is-visible');
    });

    const input = /** @type {HTMLInputElement} */ (overlay.querySelector('#redeem-code-input'));
    const msg = /** @type {HTMLElement} */ (overlay.querySelector('#redeem-msg'));
    const submit = /** @type {HTMLButtonElement} */ (overlay.querySelector('#redeem-submit'));
    const untrapFocus = trapFocus(/** @type {HTMLElement} */ (dialog));
    _onClose = () => untrapFocus();
    input.focus();
    overlay.querySelector('.app-confirm-cancel')?.addEventListener('click', () => _closeDialog(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeDialog(overlay); });
    const onKey = (/** @type {KeyboardEvent} */ e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); _closeDialog(overlay); }
    };
    document.addEventListener('keydown', onKey);

    const redeem = async () => {
        const code = normalizeCode(input.value);
        if (!code) { msg.textContent = '코드를 입력해주세요.'; return; }
        submit.disabled = true;
        msg.textContent = '확인 중…';
        void reportEvent('code_redeem_attempt').catch(() => {});
        try {
            const { data, error } = await callRedeemRpc(sb, code);
            if (!error && data === true) {
                safeSetItem(STORAGE_KEYS.PRO_ENTITLED, '1');
                void reportEvent('code_redeem_success').catch(() => {});
                _closeDialog(overlay);
                // 만료일 안내 — profile 재조회로 티어 기간을 표시 (PAY-06).
                // 조회 실패해도 RPC가 활성화를 확정했으므로 토스트만 단순화된다.
                let until = '';
                const prof = await _fetchProfile(sb, session.user.id).catch(() => null);
                if (prof && isEntitledToPro(prof.plan, prof.pro_expires_at)) {
                    if (prof.pro_expires_at) {
                        safeSetItem(STORAGE_KEYS.PRO_EXPIRES_AT, prof.pro_expires_at);
                        until = ` (${String(prof.pro_expires_at).slice(0, 10)}까지)`;
                    }
                }
                showToast(`🎉 Pro가 활성화되었습니다${until} — 클라우드 동기화로 다른 기기에서도 이어서 학습할 수 있습니다`, 'success');
                return;
            }
            msg.textContent = '코드를 확인해주세요 — 입력값이 맞지 않거나 이미 사용된 코드입니다.';
        } catch {
            msg.textContent = '네트워크 오류 — 잠시 후 다시 시도해주세요.';
        } finally {
            submit.disabled = false;
        }
    };
    submit.addEventListener('click', redeem);
    input.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter') { e.preventDefault(); void redeem(); } });
}
