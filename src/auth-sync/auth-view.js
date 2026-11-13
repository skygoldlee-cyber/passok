// src/auth-view.js — 계정/로그인 모달 (Phase 1: 인증만, 동기화는 Phase 2)
// @spec AU-01~04,AU-08,AU-09,AU-10,UX-FORM-03
// 이메일+비밀번호 로그인·회원가입·매직링크·소셜 로그인(Google·Kakao). 세션은 supabase-js가 localStorage에 자동 보관.
import { getSupabase, onAuthChange } from './supabase-client.js';
import { showToast, showConfirm, trapFocus, setFieldError, requireFields } from '../ui-utils.js';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../core/state.js';
import { hasProEntitlement } from '../pro/pro-upgrade.js';
import { reportEvent } from '../telemetry/usage-telemetry.js';
import { STORAGE_KEYS } from '../core/storage-keys.js';
import { isStandalonePwa } from '../core/utils.js';

/** @param {string} id */
const el = id => /** @type {HTMLInputElement|null} */ (document.getElementById(id));
/** @param {Element|null} n */
const show = n => n && n.classList.remove('is-hidden');
/** @param {Element|null} n */
const hide = n => n && n.classList.add('is-hidden');

// AU-10 — 로그인 수단 표시명 (identities provider → 한글 라벨)
const PROVIDER_LABEL = /** @type {Record<string, string>} */ ({ google: 'Google', kakao: '카카오', email: '이메일' });

/** 연결된 로그인 수단 목록 — user.identities의 provider 추출 (이메일 비밀번호 계정은 'email' 포함) */
/** @param {{identities?: {provider?: string}[]}|null|undefined} user */
export function linkedProviders(user) {
    const ids = user?.identities;
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.map(i => i?.provider).filter(Boolean))];
}

/** 해제 가능 여부 — 검증된 로그인 수단이 2개 이상일 때만 (마지막 수단 해제로 계정 잠김 방지) */
/** @param {{identities?: {provider?: string}[]}|null|undefined} user */
export function canUnlink(user) {
    return linkedProviders(user).length >= 2;
}

/** @param {string} provider */
function _providerName(provider) { return PROVIDER_LABEL[provider] || provider; }

// Supabase 영문 오류 → 한글 안내
/** @type {Array<[RegExp, string]>} */
const ERR_MAP = [
    [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않습니다.'],
    [/user already registered|already been registered/i, '이미 가입된 이메일입니다. 로그인을 이용하세요.'],
    [/password should be at least/i, '비밀번호는 6자 이상이어야 합니다.'],
    [/unable to validate email|invalid email/i, '이메일 형식이 올바르지 않습니다.'],
    [/email not confirmed/i, '이메일 인증이 완료되지 않았습니다. 받은 메일의 링크를 눌러주세요.'],
    [/rate limit|too many requests/i, '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'],
    [/token has expired|invalid.*token|otp.*expired|otp.*invalid/i, '인증 코드가 만료되었거나 올바르지 않습니다.'],
];
/** @param {*} err @returns {string} */
function friendlyError(err) {
    const msg = err?.message || String(err);
    for (const [re, ko] of ERR_MAP) if (re.test(msg)) return ko;
    return msg;
}

/** @param {string} [text] @param {boolean} [isError] */
function setMsg(text, isError = false) {
    const box = el('auth-modal-msg');
    if (!box) return;
    if (!text) { hide(box); box.textContent = ''; return; }
    box.textContent = text;
    box.classList.toggle('auth-modal-msg-error', isError);
    show(box);
}

/** 세션 상태에 따라 모달의 폼/계정 영역과 설정 메뉴 라벨을 갱신 */
export async function refreshAuthUI() {
    const sb = await getSupabase();
    const menuLabel = el('auth-menu-label');
    const form = el('auth-form-area');
    const account = el('auth-account-area');
    if (!sb) {
        if (menuLabel) menuLabel.textContent = '계정 (미설정)';
        return null;
    }
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user ?? null;
    if (menuLabel) menuLabel.textContent = user ? (user.email || '계정') : '계정 / 로그인';
    if (user) {
        hide(form); show(account);
        const emailEl = el('auth-account-email');
        if (emailEl) emailEl.textContent = user.email || '';
        const planEl = el('auth-account-plan');
        if (planEl) {
            const exp = safeGetItem(STORAGE_KEYS.PRO_EXPIRES_AT);
            planEl.textContent = hasProEntitlement()
                ? (exp ? `유료 (~${String(exp).slice(0, 10)})` : '유료')
                : '무료';
        }
        _renderIdentityArea(user);
        _resolvePendingLink(user);
    } else {
        show(form); hide(account);
        _renderLastMethodHint();
    }
    // AU-09 — 설치형 PWA는 소셜 로그인 버튼을 숨긴다: 외부 OAuth 리다이렉트 세션이
    // PWA 저장소로 돌아오지 못한다 (이메일 코드 경로가 대체 수단).
    const oauthArea = el('auth-oauth-area');
    if (oauthArea) oauthArea.classList.toggle('is-hidden', isStandalonePwa());
    return user;
}

/** 로그인 수단 섹션 렌더 — 연결된 수단 목록 + 미연결 수단 연결 버튼 (AU-10) */
/** @param {{identities?: {id?: string, provider?: string}[]}} user */
function _renderIdentityArea(user) {
    const list = el('auth-identity-list');
    const actions = el('auth-link-actions');
    const area = el('auth-link-area');
    if (!list || !actions || !area) return;
    const linked = linkedProviders(user);
    // 설치형 PWA는 OAuth 리다이렉트 복귀 불가(AU-09) — 연결 UI도 숨기고 이메일 경로를 안내
    if (isStandalonePwa()) { hide(area); return; }
    show(area);
    list.innerHTML = '';
    for (const id of (user.identities || [])) list.appendChild(_identityRow(user, id));
    actions.innerHTML = '';
    for (const p of OAUTH_PROVIDERS) {
        if (!linked.includes(p)) actions.appendChild(_linkButton(p));
    }
}

/** 연결된 수단 1행 — 수단명 + 해제 가능 시 해제 버튼 (AU-10) */
/** @param {{identities?: {id?: string, provider?: string}[]}} user @param {{id?: string, provider?: string}} id */
function _identityRow(user, id) {
    const row = document.createElement('div');
    row.className = 'auth-identity-item';
    const name = document.createElement('span');
    name.className = 'auth-identity-name';
    name.textContent = _providerName(id.provider || '');
    row.appendChild(name);
    if (canUnlink(user)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary btn-sm';
        btn.dataset.click = 'authUnlinkIdentity';
        btn.dataset.arg = id.id;
        btn.textContent = '해제';
        row.appendChild(btn);
    }
    return row;
}

/** 미연결 수단 연결 버튼 (AU-10) */
/** @param {string} provider */
function _linkButton(provider) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm';
    btn.dataset.click = 'authLinkIdentity';
    btn.dataset.arg = provider;
    btn.textContent = `${_providerName(provider)} 연결`;
    return btn;
}

/** 지난 로그인 수단 힌트 — 수단 분리(별도 계정 생성) 사전 방지 (AU-10) */
function _renderLastMethodHint() {
    const hint = el('auth-last-method');
    if (!hint) return;
    const last = safeGetItem(STORAGE_KEYS.LAST_LOGIN_METHOD);
    if (!last) { hide(hint); return; }
    hint.textContent = `지난번에는 ${_providerName(last)}으로 로그인하셨습니다 — 같은 방법을 쓰시면 계정이 유지됩니다.`;
    show(hint);
}

/** @param {string} method — email|google|kakao */
function _recordLoginMethod(method) {
    safeSetItem(STORAGE_KEYS.LAST_LOGIN_METHOD, method);
}

export async function openAuthModal() {
    const modal = el('auth-modal');
    if (!modal) return;
    setMsg('');
    hide(el('auth-otp-area'));
    show(modal);
    const m = /** @type {any} */ (modal);
    if (m._untrapFocus) m._untrapFocus();
    m._untrapFocus = trapFocus(modal);
    try { await refreshAuthUI(); }
    catch (e) { setMsg(friendlyError(e), true); }
}

export function closeAuthModal() {
    const modal = el('auth-modal');
    const m = /** @type {any} */ (modal);
    if (m && m._untrapFocus) { m._untrapFocus(); m._untrapFocus = null; }
    hide(modal);
    setMsg('');
}

function readCredentials() {
    return {
        email: (el('auth-email')?.value || '').trim(),
        password: el('auth-password')?.value || '',
    };
}

// UX-FORM-03 — 로그인 폼 필수 검증: 인라인 오류 + 첫 오류 필드 포커스 (setMsg는 요약 보조)
function _requireCredentials(needPassword = true) {
    const pairs = /** @type {Array<[HTMLElement|null, string]>} */ ([
        [el('auth-email'), '이메일을 입력하세요.'],
    ]);
    if (needPassword) pairs.push([el('auth-password'), '비밀번호를 입력하세요.']);
    return requireFields(pairs);
}

export async function authSignIn() {
    const sb = await getSupabase();
    if (!sb) return;
    const { email, password } = readCredentials();
    if (!email || !password) { _requireCredentials(); setMsg('이메일과 비밀번호를 입력하세요.', true); return; }
    setMsg('로그인 중...');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setMsg(friendlyError(error), true); return; }
    setMsg('');
    closeAuthModal();
    showToast('로그인했습니다.', 'success');
    _recordLoginMethod('email');
    await refreshAuthUI();
}

export async function authSignUp() {
    const sb = await getSupabase();
    if (!sb) return;
    const { email, password } = readCredentials();
    if (!email || !password) { _requireCredentials(); setMsg('이메일과 비밀번호를 입력하세요.', true); return; }
    setMsg('가입 처리 중...');
    const { error } = await sb.auth.signUp({ email, password });
    if (error) { setMsg(friendlyError(error), true); return; }
    setMsg('가입 확인 메일을 보냈습니다. 메일의 링크를 누르면 로그인됩니다.');
    await refreshAuthUI();
}

// 이메일 재발송 쿨다운 — Supabase는 같은 주소 재요청을 짧은 간격으로 제한하고,
// Custom SMTP 적용 후 시간당 발송 한도도 별도로 생긴다.
// 만료 시각을 localStorage에 보관해 새로고침해도 쿨다운이 유지되게 한다.
const COOLDOWN_KEY = 'passmula_auth_mail_cooldown_until';
const COOLDOWN_SEC = 60;
let _emailLoginCooldown = 0;

function _loadCooldownUntil() {
    const v = parseInt(safeGetItem(COOLDOWN_KEY) || '0', 10);
    return Number.isNaN(v) ? 0 : v;
}
/** @param {number} ts */
function _saveCooldownUntil(ts) {
    if (ts > 0) safeSetItem(COOLDOWN_KEY, String(ts));
    else safeRemoveItem(COOLDOWN_KEY);
}

/** @param {HTMLButtonElement|null} btn @param {number} [remainingSec] */
function startEmailLoginCooldown(btn, remainingSec = COOLDOWN_SEC) {
    _emailLoginCooldown = remainingSec;
    _saveCooldownUntil(Date.now() + remainingSec * 1000);
    if (!btn) return;
    const label = btn.dataset.cooldownLabel || btn.textContent;
    btn.dataset.cooldownLabel = label;
    const tick = () => {
        if (_emailLoginCooldown <= 0) {
            btn.disabled = false;
            btn.textContent = label;
            _saveCooldownUntil(0);
            return;
        }
        btn.disabled = true;
        btn.textContent = `다시 보내기 (${_emailLoginCooldown}초)`;
        _emailLoginCooldown--;
        setTimeout(tick, 1000);
    };
    tick();
}

/**
 * 이메일 로그인 통합 — signInWithOtp 메일 하나에 링크+인증 코드가 동봉되므로
 * 버튼을 나누지 않는다. 발송 후 코드 입력 칸을 항상 표시해
 * 브라우저(링크 클릭)·PWA(코드 입력) 어느 환경이든 같은 절차로 완료한다.
 */
export async function authEmailLogin() {
    const sb = await getSupabase();
    if (!sb) return;
    const { email } = readCredentials();
    if (!email) { _requireCredentials(false); setMsg('이메일을 입력하세요.', true); return; }
    if (_emailLoginCooldown > 0) { setMsg(`재발송은 ${_emailLoginCooldown}초 후에 가능합니다.`, true); return; }
    setMsg('로그인 메일 발송 중...');
    const { error } = await sb.auth.signInWithOtp({
        email,
        // Redirect URLs 허용 목록과 일치해야 함 — 로컬/프로덕션이 각자 자기 도메인으로 복귀
        options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setMsg(friendlyError(error), true); return; }
    show(el('auth-otp-area'));
    setMsg('로그인 링크와 인증 코드를 이메일로 보냈습니다. 메일의 링크를 누르거나, 메일의 인증 코드를 아래에 입력하세요.');
    startEmailLoginCooldown(/** @type {HTMLButtonElement|null} */ (document.querySelector('[data-click="authEmailLogin"]')));
}

// 소셜 로그인 허용 프로바이더 — data-arg 위임이라 임의 문자열이 들어올 수 있어 화이트리스트 검증
const OAUTH_PROVIDERS = new Set(['google', 'kakao']);

/**
 * 소셜 로그인 (AU-09) — Supabase가 provider 페이지로 리다이렉트하고,
 * 복귀는 redirectTo(origin) + #access_token 해시로 돌아와 기존 매직링크 랜딩 경로가 처리한다.
 * 성공 시 페이지가 떠나므로 이후 코드는 오류 경로에만 도달한다.
 * 주의: 수단마다 별도 auth.users 계정 — 유료는 활성화한 계정에만 귀속된다.
 */
export async function authOAuth(/** @type {string} */ provider) {
    const sb = await getSupabase();
    if (!sb || !OAUTH_PROVIDERS.has(provider)) return;
    setMsg('로그인 페이지로 이동 중…');
    void reportEvent('oauth_login_start', { provider }).catch(() => {});
    _recordLoginMethod(provider); // 성공 시 그대로 유지 — 힌트는 권고성이라 실패해도 큰 해 없음
    const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
    });
    if (error) setMsg(friendlyError(error), true);
}

/**
 * 로그인 수단 연결 (AU-10) — linkIdentity로 현재 계정에 OAuth 수단을 묶는다.
 * 연결된 identities는 같은 auth.users에 귀속돼 profiles.plan이 자동 공유된다.
 * 충돌(상대 수단이 다른 계정에 귀속) 시 자동 병합은 금지 — 이전 계정 로그인을 유도한다.
 */
export async function authLinkIdentity(/** @type {string} */ provider) {
    const sb = await getSupabase();
    if (!sb || !OAUTH_PROVIDERS.has(provider)) return;
    setMsg(`${_providerName(provider)} 연결 페이지로 이동 중…`);
    safeSetItem(STORAGE_KEYS.PENDING_LINK_PROVIDER, provider);
    void reportEvent('account_link_start', { provider }).catch(() => {});
    const { error } = await sb.auth.linkIdentity({
        provider,
        options: { redirectTo: window.location.origin },
    });
    if (error) {
        safeRemoveItem(STORAGE_KEYS.PENDING_LINK_PROVIDER);
        if (/manual linking|not enabled/i.test(error.message || '')) {
            setMsg('로그인 수단 연결이 아직 활성화되지 않았습니다 — 관리자에게 문의하세요.', true);
        } else {
            setMsg(friendlyError(error), true);
        }
    }
}

/** 연결 해제 (AU-10) — 검증된 로그인 수단이 2개 이상일 때만 허용 */
export async function authUnlinkIdentity(/** @type {string} */ identityId) {
    const sb = await getSupabase();
    if (!sb || !identityId) return;
    const { data } = await sb.auth.getUser();
    const user = data?.user;
    if (!user) return;
    const identity = (/** @type {{id?: string, provider?: string}[]} */ (user.identities || [])).find(i => i.id === identityId);
    if (!identity) { setMsg('연결 정보를 찾지 못했습니다.', true); return; }
    if (!canUnlink(user)) {
        setMsg('마지막 로그인 수단은 해제할 수 없습니다 — 먼저 다른 수단을 연결하거나 비밀번호를 설정하세요.', true);
        return;
    }
    await _confirmAndUnlink(sb, identity);
}

/** 해제 확인 → unlinkIdentity 실행 (AU-10) — authUnlinkIdentity의 사전 검증 통과 후 호출 */
/** @param {*} sb @param {{id?: string, provider?: string}} identity */
async function _confirmAndUnlink(sb, identity) {
    const provider = _providerName(identity.provider || '');
    const ok = await showConfirm(
        `${provider} 연결을 해제하면 이 방법으로는 더 이상 이 계정에 로그인할 수 없고, 이 방법으로 로그인하면 새 계정이 만들어집니다. 해제할까요?`,
        '로그인 수단 해제'
    );
    if (!ok) return;
    const { error } = await sb.auth.unlinkIdentity(identity);
    if (error) { setMsg(friendlyError(error), true); return; }
    showToast(`${provider} 연결을 해제했습니다.`, 'info');
    await refreshAuthUI();
}

/** 비밀번호 분실 — 로그인 메일(OTP)로 로그인한 뒤 계정 화면에서 새 비밀번호 설정 */
export async function authForgotPassword() {
    const sb = await getSupabase();
    if (!sb) return;
    const { email } = readCredentials();
    if (!email) { _requireCredentials(false); setMsg('비밀번호를 재설정할 이메일을 입력하세요.', true); return; }
    if (_emailLoginCooldown > 0) { setMsg(`재발송은 ${_emailLoginCooldown}초 후에 가능합니다.`, true); return; }
    setMsg('로그인 메일 발송 중...');
    const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setMsg(friendlyError(error), true); return; }
    show(el('auth-otp-area'));
    setMsg('로그인 메일을 보냈습니다. 메일의 코드로 로그인한 뒤 계정 화면의 "비밀번호 설정"에서 새 비밀번호를 지정하세요. (메일 로그인만 사용하는 경우 그대로 로그인하면 됩니다)');
    startEmailLoginCooldown(/** @type {HTMLButtonElement|null} */ (document.querySelector('[data-click="authEmailLogin"]')));
}

/** @deprecated authEmailLogin으로 통합 — 기존 핸들러 호환용 별칭 */
export const authMagicLink = authEmailLogin;
export const authSendOtp = authEmailLogin;

/** 재발송 쿨다운 초기화 — 테스트 간 모듈 상태 리셋용 */
export function resetEmailLoginCooldown() { _emailLoginCooldown = 0; _saveCooldownUntil(0); }

export async function authVerifyOtp() {
    const sb = await getSupabase();
    if (!sb) return;
    const { email } = readCredentials();
    const token = (el('auth-otp-code')?.value || '').replace(/\s/g, '');
    if (!email) { _requireCredentials(false); setMsg('이메일을 입력하세요.', true); return; }
    // 자릿수 고정 금지 — Email OTP Length 설정(6~10)에 따라 달라진다
    if (!/^\d{6,10}$/.test(token)) {
        const otp = el('auth-otp-code');
        if (otp) { setFieldError(otp, '메일에 표시된 숫자 인증 코드를 입력하세요.'); otp.focus(); }
        setMsg('메일에 표시된 숫자 인증 코드를 입력하세요.', true);
        return;
    }
    setMsg('코드 확인 중...');
    const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (error) { setMsg(friendlyError(error), true); return; }
    setMsg('');
    closeAuthModal();
    showToast('로그인했습니다.', 'success');
    _recordLoginMethod('email');
    await refreshAuthUI();
}

/** 로그인 상태에서 비밀번호 설정/변경 — 매직링크 가입 계정이 PWA 등에서 비밀번호 로그인할 수 있게 한다 */
export async function authSetPassword() {
    const sb = await getSupabase();
    if (!sb) return;
    const input = el('auth-new-password');
    const password = input?.value || '';
    if (password.length < 6) {
        if (input) { setFieldError(input, '비밀번호는 6자 이상이어야 합니다.'); input.focus(); }
        setMsg('비밀번호는 6자 이상이어야 합니다.', true);
        return;
    }
    setMsg('비밀번호 설정 중...');
    const { error } = await sb.auth.updateUser({ password });
    if (error) { setMsg(friendlyError(error), true); return; }
    if (input) input.value = '';
    setMsg('');
    showToast('비밀번호가 설정되었습니다. 다음부터 이메일+비밀번호로 로그인할 수 있습니다.', 'success');
}

export async function authSignOut() {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    closeAuthModal();
    showToast('로그아웃했습니다. 이 기기의 데이터는 유지됩니다.', 'info');
    await refreshAuthUI();
}

// 매직링크 랜딩 플래그 — 해시에 access_token이 있던 시작에서만
// SIGNED_IN 토스트를 띄운다 (수동 로그인 경로는 자체 토스트 보유)
let _magicLinkLanding = false;

/**
 * 로그인 링크 랜딩 처리 (두 형태):
 *  ① ?token_hash= — 권장 템플릿. 앱 도메인으로 직행하며, 확인 클릭 시에만
 *     verifyOtp로 토큰을 소비한다 (메일 스캐너·미리보기의 사전 소진 방지,
 *     iOS 사용자에게 코드 경로 안내 기회 확보, flowType 무관).
 *  ② #access_token/#error — 기본 ConfirmationURL 해시 (하위 호환).
 * supabase 초기화(해시 소비) 전에 호출해야 파라미터를 읽을 수 있다.
 */
async function handleAuthLanding() {
    const query = new URLSearchParams(window.location?.search || '');
    const tokenHash = query.get('token_hash');
    if (tokenHash) { await _handleTokenHashLanding(query, tokenHash); return; }

    const hash = (typeof window !== 'undefined' && window.location?.hash) || '';
    if (hash.length < 2) return;
    _handleHashLanding(new URLSearchParams(hash.slice(1)));
}

/** ① ?token_hash= 랜딩 — 확인 클릭 시에만 verifyOtp로 토큰 소비 */
/** @param {URLSearchParams} query @param {string} tokenHash */
async function _handleTokenHashLanding(query, tokenHash) {
    try { history.replaceState(null, '', location.pathname); } catch (_) {}
    const ok = await showConfirm(
        '이 브라우저에서 로그인할까요? 설치된 앱(PWA)에서 로그인 중이라면 취소하고 메일의 인증 코드를 앱에 입력하세요.',
        '로그인 링크'
    );
    if (!ok) {
        showToast('링크 로그인을 취소했습니다. 토큰은 유지됩니다 — 같은 메일의 인증 코드로 계속 로그인할 수 있습니다.', 'info');
        return;
    }
    const sb = await getSupabase();
    if (!sb) return;
    // 템플릿이 지정한 토큰 종류를 그대로 전달 — Confirm signup 메일은 type=signup
    const type = query.get('type') || 'email';
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) showToast(friendlyError(error), 'error');
    else { showToast('로그인했습니다.', 'success'); _recordLoginMethod('email'); }
}

/** ② #access_token/#error 해시 랜딩 — 기본 ConfirmationURL 경로 (하위 호환) */
/** @param {URLSearchParams} params */
function _handleHashLanding(params) {
    const errDesc = params.get('error_description') || '';
    const errCode = params.get('error_code') || params.get('error') || '';
    if (errDesc || errCode) { _handleHashError(errCode, errDesc); return; }
    if (params.has('access_token')) _magicLinkLanding = true;
}

/** 해시 오류 처리 — 수단 연결 복귀 실패는 회복 유도, 그 외는 만료/일반 오류 토스트 */
/** @param {string} errCode @param {string} errDesc */
function _handleHashError(errCode, errDesc) {
    const pending = safeGetItem(STORAGE_KEYS.PENDING_LINK_PROVIDER);
    safeRemoveItem(STORAGE_KEYS.PENDING_LINK_PROVIDER);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    if (pending) {
        // 수단 연결 리다이렉트 복귀 실패 — 충돌(다른 계정 귀속)이면 회복 유도, 그 외는 일반 오류
        _handleLinkFailure(errCode + errDesc, pending).catch(() => {});
        return;
    }
    const msg = /expired/i.test(errCode + errDesc)
        ? '로그인 링크가 만료되었습니다. 계정 메뉴에서 다시 요청하세요.'
        : '로그인 링크를 처리하지 못했습니다. 다시 시도하세요.';
    showToast(msg, 'error');
}

/**
 * 연결 리다이렉트 실패 처리 (AU-10) — 상대 수단이 다른 계정에 귀속된 충돌이면
 * 자동 병합 없이 이전 계정 로그인을 유도한다. 어떤 수단이 실존하는지
 * 노출하지 않는 비열거 문구를 유지한다.
 */
/** @param {string} errText @param {string} provider */
async function _handleLinkFailure(errText, provider) {
    const conflict = /already|exist|linked|associated|conflict/i.test(errText || '');
    void reportEvent('account_link_conflict', { provider, conflict }).catch(() => {});
    if (conflict) {
        const ok = await showConfirm(
            `${_providerName(provider)}은(는) 다른 계정에 연결되어 있습니다. 연결하던 계정 대신 그 계정으로 로그인하시겠습니까? (로그아웃 후 ${provider === 'kakao' ? '카카오' : 'Google'}로 로그인)`,
            '다른 계정에서 사용 중'
        );
        if (ok) await authSignOut();
        return;
    }
    showToast('로그인 수단 연결에 실패했습니다. 잠시 후 다시 시도하세요.', 'error');
}

/**
 * 연결 리다이렉트 복귀 감지 (AU-10) — 대기 수단이 user.identities에
 * 나타나면 성공으로 확정한다. refreshAuthUI에서 세션 확정 후 호출.
 */
/** @param {{identities?: {provider?: string}[]}|null|undefined} user */
function _resolvePendingLink(user) {
    const pending = safeGetItem(STORAGE_KEYS.PENDING_LINK_PROVIDER);
    if (!pending || !user) return;
    if (!linkedProviders(user).includes(pending)) return;
    safeRemoveItem(STORAGE_KEYS.PENDING_LINK_PROVIDER);
    showToast(`${_providerName(pending)} 연결 완료 — 이제 어느 방법으로 로그인해도 같은 계정입니다.`, 'success');
    void reportEvent('account_link_success', { provider: pending }).catch(() => {});
}

/** 앱 초기화 시 1회 — 매직링크 랜딩 처리 + 세션 복원 반영 + 상태 변화 구독 */
export async function initAuthView() {
    if (!el('auth-modal')) return;
    // Enter 키 제출 — 버튼 클릭 없이 폼 완료
    /** @param {string} id @param {() => void} fn */
    const enter = (id, fn) => {
        const node = el(id);
        if (node) node.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } });
    };
    enter('auth-email', authSignIn);
    enter('auth-password', authSignIn);
    enter('auth-otp-code', authVerifyOtp);
    enter('auth-new-password', authSetPassword);
    // 새로고침 전 발송의 남은 쿨다운 복원
    const remaining = Math.ceil((_loadCooldownUntil() - Date.now()) / 1000);
    if (remaining > 0) startEmailLoginCooldown(/** @type {HTMLButtonElement|null} */ (document.querySelector('[data-click="authEmailLogin"]')), remaining);
    try { handleAuthLanding().catch(() => {}); } catch (_) {}
    try { await refreshAuthUI(); } catch (_) { /* 오프라인 등 — 로그인 UI는 비로그인 상태로 둠 */ }
    try {
        await onAuthChange((_session, event) => {
            if (event === 'SIGNED_IN' && _magicLinkLanding) {
                _magicLinkLanding = false;
                showToast('로그인했습니다.', 'success');
                _recordLoginMethod('email');
            }
            refreshAuthUI().catch(() => {});
        });
    } catch (_) {}
}
