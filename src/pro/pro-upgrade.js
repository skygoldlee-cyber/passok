// @spec ROAD-P6
/**
 * Pro 업그레이드 안내 — 무료 플랜 한도 도달 시 표시하는 정보성 모달.
 *
 * 결제 인프라 도입 전이므로 "준비 중" 안내에 그친다 (SUBSCRIPTION_ROADMAP 지연 원칙).
 * 스토어가 `{ ok:false, error:'Free 플랜은 ...' }`를 반환하는 모든 지점에서
 * isFreeLimitError()로 판별 후 showUpgradeNotice()를 호출한다.
 */

// @spec ROAD-P0, PAY-02, PAY-04, PAY-06, PAY-07

import { esc } from '../sanitize.js';
import { trapFocus } from '../ui-utils.js';
import { safeGetItem, safeSetItem } from '../state.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { trackAction } from '../telemetry/usage-stats.js';
import { reportEvent } from '../telemetry/usage-telemetry.js';
import { hasFeature, getActiveExamId } from '../exam-context.js';
import { localDateTime } from '../utils.js';

/** 스토어 오류가 무료 한도 초과인지 판별 */
function isFreeLimitError(error) {
    return typeof error === 'string' && error.startsWith('Free 플랜');
}

/**
 * 결제 안내 설정 (PAY-02) — 수동 결제 안내 모달의 내용·활성 플래그.
 * enabled=false면 showUpgradeNotice가 기존 '준비 중' 표시를 유지한다.
 * 결제 수단(D-1)·가격(D-2)·문의 채널(D-5) 확정 후 값을 채우고 enabled=true로 전환.
 * 문구 변경은 이 객체 하나로 관리 — 코드 분기를 건드리지 않는다.
 */
const PAYMENT_NOTICE = {
    enabled: true,
    // 기간권 3티어 (PAY-06 — PAYMENT_PILOT_DESIGN §5 안 A): 긴 기간일수록 월환산 할인.
    // 가격·티어 문구 변경은 이 배열만 수정한다.
    plans: [
        { name: '스프린트', period: '30일', price: '9,900원' },
        { name: '스탠다드', period: '60일', price: '14,900원' },
        { name: '풀코스', period: '90일', price: '19,900원', note: '월환산 ~6,600원 · 불합격 시 다음 회차 혜택(발급일로부터 1년 유효)' },
    ],
    methods: [
        "'결제 문의'를 눌러 오픈채팅으로 연락주시면 결제 방법(계좌이체·카카오페이)을 안내드립니다",
        '결제 확인 후 24~48시간 내 라이선스 코드를 발송해 드립니다',
        '받은 코드는 로그인 후 ⚙️ 설정 → 플랜 안내 · 라이선스 코드에서 입력하면 즉시 Pro가 활성화됩니다',
    ],
    refundNotice: '환불: 코드 미사용 시 결제일로부터 7일 이내 전액 환불 (전자상거래법 청약철회) · 코드 사용 후에는 환불이 제한될 수 있습니다',
    contactLabel: '오픈채팅에서 결제 문의',
    contactUrl: 'https://open.kakao.com/o/sWLzJCTi',
};

// --- 기능 플랜 (feature-plan.json — 기능별 무료/Pro 전환) ---
let _featurePlan = null;

/**
 * feature-plan.json을 로드해 메모리에 보관하고 PRO 배지를 갱신한다.
 * fetch 실패·오프라인 시 기본값(pro 표기)을 유지한다.
 */
export async function loadFeaturePlan() {
    try {
        const res = await fetch('feature-plan.json', { cache: 'no-cache' });
        if (res.ok) _featurePlan = await res.json();
    } catch (e) { /* 오프라인·로드 실패 시 기본값 유지 */ }
    if (!_featurePlan) _featurePlan = {};
    refreshProBadges();
}

/** 기능이 Pro 표기 대상인지 판별 (플랜 미로드·키 누락 시 pro로 간주) */
function isProFeature(featureKey) {
    const v = _featurePlan && _featurePlan.features && _featurePlan.features[featureKey];
    return v !== 'free';
}

/**
 * Pro 이용 권한 여부 — 로컬 플래그(pro_entitled) + 로컬 만료일(pro_expires_at) 시각 비교 (PAY-07).
 * 앱 열람 중 만료가 경과하면 다음 판정부터 해제 — 서버 재확인은 syncPlanFromProfile이 담당한다.
 * 만료일 없음은 무기한(관리자 부여·비로그인 로컬 부여)으로 유효하다.
 * ROAD-P1에서 Supabase entitlement 서버 검증으로 교체 예정.
 */
export function hasProEntitlement() {
    if (safeGetItem(STORAGE_KEYS.PRO_ENTITLED) !== '1') return false;
    const exp = safeGetItem(STORAGE_KEYS.PRO_EXPIRES_AT);
    return !exp || Date.parse(exp) > Date.now();
}

/**
 * 클라우드 동기화 사용 가능 여부 — 플랜이 free면 전원 허용, pro면 entitlement 필요.
 * feature-plan.json의 cloud_sync를 free로 내리면 entitlement 없이 재활성화 가능 (무료 체험 프로모션용 레버).
 */
export function canCloudSync() {
    return !isProFeature('cloud_sync') || hasProEntitlement();
}

/** data-pro-feature 속성을 가진 PRO 배지를 플랜에 맞춰 표시/숨긴다.
 * ROAD-P5: 배지는 클릭/Enter 시 플랜 비교(showPlanCompare)로 연결되는 단일 진입점.
 * data-click 위임은 closest()로 배지 자신을 먼저 잡으므로 부모 카드의 data-click과 충돌하지 않는다.
 * @param {Document|HTMLElement} [root]
 */
export function refreshProBadges(root = document) {
    if (!_featurePlan) return;
    root.querySelectorAll('[data-pro-feature]').forEach(el => {
        el.classList.toggle('is-hidden', !isProFeature(/** @type {HTMLElement} */ (el).dataset.proFeature));
        // 네이티브 인터랙티브 조상(button·a·role=button/link) 안의 배지는 장식으로 둔다 —
        // role/tabindex 승격은 nested-interactive 위반 + 44px 미만 포커스 대상을 만든다.
        // 클릭은 조상으로 버블링되고, Pro 안내는 기능 진입 시 proFeatureNotice가 담당한다.
        // (div[data-click] 등 비인터랙티브 카드 안의 배지는 기존대로 별도 진입점 유지)
        if (!el.getAttribute('data-click') && !el.closest('button, a, label, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"]')) {
            el.setAttribute('data-click', 'showPlanCompare');
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('title', 'Pro 제공 예정 기능 — 눌러서 플랜 비교 보기 (현재 무료로 이용 가능)');
        }
    });
}

/**
 * 스토어 저장 결과의 오류를 표시한다.
 * 무료 한도 초과 → Pro 업그레이드 안내 모달, 그 외 → 일반 오류 토스트.
 * @param {{ok:boolean, error?:string}} result - 스토어 반환값
 * @param {string} featureLabel - 한도에 걸린 기능명 (예: 'My 포뮬러')
 * @param {function} showToast - 토스트 함수 (호출측 임포트 전달)
 * @param {string} [fallback] - error가 없을 때 표시할 기본 메시지
 */
export function showStoreError(result, featureLabel, showToast, fallback = '저장에 실패했습니다.') {
    if (isFreeLimitError(result.error)) { showUpgradeNotice(featureLabel, result.error); return; }
    showToast(result.error || fallback, 'error');
}

/**
 * Pro 기능 안내 — 최초 Pro 기능 진입 시 전역 1회만 표시 (ROAD-P5).
 * 기능별 seen 플래그는 `_global` 단일 키로 수렴 — 이미 기능별 안내를 본
 * 기존 사용자(seen 맵에 임의 키 보유)는 재노출하지 않는다.
 * 무료 회수 없이 "Pro 제공 예정" 사실만 알린다.
 * feature-plan.json에서 'free'로 표시된 기능은 안내하지 않는다.
 * @param {string} featureKey - 플랜 판정 키 (예: 'mock_exam', 'combo_drill')
 * @param {string} featureName - 표시용 기능명 (첫 진입 기능명으로 문구에 포함)
 */
export function proFeatureNotice(featureKey, featureName) {
    if (!isProFeature(featureKey)) return;
    /** @type {Record<string, string>} */
    let seen = {};
    try { seen = JSON.parse(safeGetItem(STORAGE_KEYS.PRO_NOTICE_SEEN) || '{}') || {}; } catch (e) { seen = {}; }
    if (seen._global || Object.keys(seen).length > 0) {
        if (!seen._global) {
            seen._global = localDateTime();
            safeSetItem(STORAGE_KEYS.PRO_NOTICE_SEEN, JSON.stringify(seen));
        }
        return;
    }
    seen._global = localDateTime();
    safeSetItem(STORAGE_KEYS.PRO_NOTICE_SEEN, JSON.stringify(seen));

    const { overlay, close } = _showDialog(`
        <div class="app-confirm-dialog dialog-card pro-upgrade-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pro-notice-title">
            <h3 id="pro-notice-title">💎 Pro 기능 안내</h3>
            <p><strong>${esc(featureName)}</strong>을(를) 포함해 <strong>PRO 배지</strong>가 붙은 기능은 Pro 버전에서 제공될 예정입니다.<br>현재는 무료 체험 기간으로 누구나 이용할 수 있습니다.</p>
            <div class="pro-upgrade-benefits">
                <p class="pro-upgrade-sub">Pro 가입 시 로그인 계정의 클라우드 동기화로 <strong>여러 디바이스 간 학습 상태가 공유</strong>됩니다.</p>
            </div>
            <div class="app-confirm-actions">
                <button class="app-confirm-cancel app-confirm-compare">Free / Pro 비교</button>
                <button class="app-confirm-ok">확인</button>
            </div>
        </div>
    `);
    overlay.querySelector('.app-confirm-compare')?.addEventListener('click', () => { close(); showPlanCompare(); });
}

/** 모달 표시 공통부 — 오버레이 생성·표시 애니메이션·trapFocus·닫기 핸들러.
 * @param {string} innerHtml 다이얼로그 내부 HTML (.app-confirm-dialog 루트 포함)
 * @returns {{overlay: HTMLElement, close: function}} */
function _showDialog(innerHtml) {
    const existing = document.getElementById('pro-upgrade-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pro-upgrade-overlay';
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = innerHtml;
    document.body.appendChild(overlay);
    const dialog = /** @type {HTMLElement} */ (overlay.querySelector('.app-confirm-dialog'));
    requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        dialog.classList.add('is-visible');
    });

    const untrapFocus = trapFocus(dialog);
    const close = () => {
        overlay.classList.remove('is-visible');
        dialog.classList.remove('is-visible');
        setTimeout(() => { untrapFocus(); overlay.remove(); }, 200);
    };
    overlay.querySelector('.app-confirm-ok')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const onKey = (e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(); }
    };
    document.addEventListener('keydown', onKey);
    return { overlay, close };
}

/** 플랜 비교에 노출하는 기능 목록 — feature-plan.json 키와 매핑 */
const PLAN_FEATURES = [
    { key: 'personal_analysis', label: '학습 진단 (예상 점수·취약 분석·주간 리포트)' },
    { key: 'story_textbook', label: '이야기형 교재 (서사 본문·이야기 회상)' },
    { key: 'mock_exam', label: '실전 모의고사' },
    { key: 'combo_mock', label: 'ㄱㄴㄷ 조합 모의고사' },
    { key: 'combo_set', label: 'ㄱㄴㄷ 조합 문제집' },
    { key: 'combo_drill', label: 'ㄱㄴㄷ 조합 훈련' },
    { key: 'cloud_sync', label: '클라우드 동기화 (여러 디바이스 상태 공유)' },
    { key: 'study_plan_pro', label: '주간 배분 (과목별 가중 배분 계획)' },
];

/** 플래그·플랜에서 유도한 Pro 전용 혜택 항목 — 두 모달(showPlanCompare/showUpgradeNotice)이 공유 */
function _proBenefitItems(extraRow = '') {
    const items = [];
    if (isProFeature('personal_analysis')) {
        items.push('<li>학습 진단 리포트 — 복합 예상 점수·실제 결과 보정·취약 단원 추적·주간 리포트 공유</li>');
    }
    if (isProFeature('story_textbook')) {
        items.push('<li>이야기형 교재 — 서사 삽입 본문·서사 검색·이야기 회상</li>');
    }
    if (hasFeature('audiobook') && isProFeature('audiobook')) {
        items.push('<li>오디오북 — 과목별 챕터 MP3 청취</li>');
    }
    if (isProFeature('cloud_sync')) {
        items.push('<li>클라우드 동기화 — 로그인 계정 기준 여러 디바이스 간 학습 상태 공유</li>');
    }
    if (extraRow) items.push(extraRow);
    items.push('<li>신규 Pro 기능 우선 제공</li>');
    return items;
}

/** Free/Pro 기능 비교 안내 모달 — 설정의 '플랜 안내'·계정 모달에서 연다.
 * feature-plan.json의 현재 값을 반영하므로 플랜 전환 시 문구가 어긋나지 않는다. */
export async function showPlanCompare() {
    trackAction('plan_compare');
    void reportEvent('plan_compare_view').catch(() => {});   // 전환 퍼널 (PAY-04)
    // 저장 한도 혜택은 Formula OS 기능 보유 시험에서만 노출 — 한도 수치는
    // 각 스토어의 상수에서 유도 (도메인 모듈은 지연 로딩으로 초기 번들 미포함)
    let limitsRow = '';
    if (hasFeature('formula')) {
        try {
            const eid = getActiveExamId();
            const [{ DataLoader }, fs, cs, ml, bs] = await Promise.all([
                import('../content/data-loader.js'),
                import(`../exams/${eid}/formula-store.js`),
                import(`../exams/${eid}/customer-store.js`),
                import(`../exams/${eid}/material-ledger.js`),
                import(`../exams/${eid}/batch-store.js`),
            ]);
            // 엔티티 라벨은 시험 소유 — manifest uiText.planLimits가 4개 스토어
            // 라벨을 선언하지 않은 시험에서는 한도 행 자체를 생략한다.
            const t = (DataLoader.registry && DataLoader.registry.uiText && DataLoader.registry.uiText.planLimits) || null;
            if (t && t.formula && t.customer && t.material && t.batch) {
                limitsRow = `<li>${esc(t.title || '저장 한도 무제한 — 무료 플랜:')} ${esc(t.formula)} ${fs.FORMULA_LIMIT_FREE} · ${esc(t.customer)} ${cs.CUSTOMER_LIMIT_FREE} · ${esc(t.material)} ${ml.MATERIAL_LIMIT_FREE} · ${esc(t.batch)} ${bs.BATCH_LIMIT_FREE}</li>`;
            }
        } catch (e) { /* 한도 표기 생략 — 모달 자체는 표시 */ }
    }
    const featureRows = PLAN_FEATURES.map(f => {
        const tag = isProFeature(f.key)
            ? '<span class="pro-badge">PRO</span>'
            : '<span class="plan-free-tag">무료 제공</span>';
        return `<li>${esc(f.label)} ${tag}</li>`;
    }).join('');

    // Pro 전용 혜택 — 실제 플래그/플랜에서 유도한 구체 기능 목록 (플레이스홀더 아님)
    const proBenefits = _proBenefitItems(limitsRow);
    const benefitsBlock = `
                <p class="pro-upgrade-sub"><strong>Pro 전용 혜택</strong> — 결제 도입 시 적용</p>
                <ul>${proBenefits.join('')}</ul>`;

    const { overlay, close } = _showDialog(`
        <div class="app-confirm-dialog dialog-card pro-upgrade-dialog" role="alertdialog" aria-modal="true" aria-labelledby="plan-compare-title">
            <h3 id="plan-compare-title">💎 Free / Pro 안내</h3>
            <p>현재는 <strong>무료 체험 기간</strong>으로 Pro 표시 기능도 무료로 이용할 수 있습니다.</p>
            <div class="pro-upgrade-benefits">
                <p class="pro-upgrade-sub"><strong>기능별 제공 범위</strong> — 현재 플랜 설정 반영</p>
                <ul>${featureRows}</ul>
                ${benefitsBlock}
                <p class="pro-upgrade-sub"><strong>로그인</strong></p>
                <ul>
                    <li>무료 플랜 — <strong>로그인 불필요</strong>, 모든 데이터는 이 기기에 저장</li>
                    <li>Pro 플랜 — <strong>로그인 필요</strong> (클라우드 동기화·구독 관리 계정)</li>
                </ul>
                <p class="pro-upgrade-sub">그 외 학습 도구(퀴즈·플래시카드·교재 표준형·검색·사전·캘린더·훈련소·백업)는 <strong>항상 무료</strong>입니다.</p>
            </div>
            <div class="app-confirm-actions">
                <button class="app-confirm-cancel plan-redeem-link" data-click="showRedeemCode">라이선스 코드 입력</button>
                <button class="app-confirm-ok">확인</button>
            </div>
        </div>
    `);
    // 비교 모달을 닫고 코드 입력 다이얼로그로 연결 — 실제 호출은 data-click 위임
    overlay.querySelector('.plan-redeem-link')?.addEventListener('click', () => close());
}

// --- Pro 전환 모멘트 넛지 (ROAD-P6) ---
// 고가치 순간(모의고사 분석 완료 등)에 결과 패널 상단의 인라인 카드로
// 플랜 비교를 제안한다. 모달 대신 비차단 카드 — 학습 흐름을 끊지 않는다.

/** 모멘트 → 플랜 키·표시 문구 매핑 */
const PRO_MOMENTS = {
    sim_result: { feature: 'mock_exam', label: '실전 모의고사' },
    analysis_report: { feature: 'personal_analysis', label: '학습 진단 리포트' },
};

/** 모멘트별 재노출 쿨다운 — 같은 모멘트는 14일에 1회 */
const PRO_MOMENT_COOLDOWN_MS = 14 * 86400000;

/**
 * 모멘트 넛지 표시 여부 판정 (순수 함수 — 테스트 용이).
 * @param {string} momentKey PRO_MOMENTS 키
 * @param {{isPro?:function(string):boolean, entitled?:boolean, seenMap?:Object<string,string>, now?:number}} [o]
 * @returns {boolean}
 */
export function shouldShowProMoment(momentKey, o = {}) {
    const def = PRO_MOMENTS[momentKey];
    if (!def) return false;
    const isPro = o.isPro || isProFeature;
    if (!isPro(def.feature)) return false;
    const entitled = o.entitled !== undefined ? o.entitled : hasProEntitlement();
    if (entitled) return false;
    const seen = o.seenMap || {};
    const last = Date.parse(seen[momentKey] || '');
    const now = o.now !== undefined ? o.now : Date.now();
    return !last || (now - last) > PRO_MOMENT_COOLDOWN_MS;
}

/**
 * 고가치 모멘트 넛지 카드 삽입 — 컨테이너 최상단에 비차단 카드로 부착.
 * 쿨다운·entitlement·플랜 게이트 통과 시에만 렌더, 표시 즉시 seen 기록 + 계측.
 * @param {HTMLElement|null} container 넛지를 붙일 결과 패널
 * @param {string} momentKey PRO_MOMENTS 키
 */
export function mountProMoment(container, momentKey) {
    if (!container || typeof document === 'undefined') return;
    const def = PRO_MOMENTS[momentKey];
    if (!def) return;
    /** @type {Object.<string, string>} */
    let seen = {};
    try { seen = JSON.parse(safeGetItem(STORAGE_KEYS.PRO_MOMENT_SEEN) || '{}') || {}; } catch (e) { seen = {}; }
    if (!shouldShowProMoment(momentKey, { seenMap: seen })) return;
    seen[momentKey] = localDateTime();
    safeSetItem(STORAGE_KEYS.PRO_MOMENT_SEEN, JSON.stringify(seen));
    trackAction(`pro_moment:${momentKey}`); // UX-MET-04 — ':' 접두 키는 버킷 라벨로 해석

    container.querySelector('.pro-moment-card')?.remove();
    const card = document.createElement('div');
    card.className = 'pro-moment-card';
    card.innerHTML = `
        <i class="fa-solid fa-gem" aria-hidden="true"></i>
        <span class="pro-moment-text"><strong>${esc(def.label)}</strong>은(는) Pro 제공 예정 기능입니다 — 지금은 무료로 이용 중입니다.</span>
        <div class="pro-moment-actions btn-row">
            <button type="button" class="btn btn-sm btn-primary" data-click="showPlanCompare">플랜 비교</button>
            <button type="button" class="btn btn-sm btn-secondary" data-pro-moment-dismiss aria-label="닫기">닫기</button>
        </div>`;
    card.querySelector('[data-pro-moment-dismiss]')?.addEventListener('click', () => card.remove());
    container.prepend(card);
}

/** Pro 업그레이드 안내 모달 — PAYMENT_NOTICE.enabled 시 실결제 안내, 아니면 '준비 중' 표시 (PAY-02) */
export function showUpgradeNotice(featureLabel, limitMessage) {
    const benefitItems = [`<li>${esc(featureLabel)} 저장 한도 무제한</li>`, ..._proBenefitItems()];
    const planRows = PAYMENT_NOTICE.plans.map((p) =>
        `<li><strong>${esc(p.name)}</strong> ${esc(p.period)} — <strong>${esc(p.price)}</strong>${p.note ? `<br><span class="pro-plan-note">${esc(p.note)}</span>` : ''}</li>`).join('');
    const pay = PAYMENT_NOTICE.enabled ? `
            <div class="pro-payment-notice">
                <p class="pro-upgrade-sub"><strong>💳 Pro 결제 안내</strong> — 시험 기간권 (일찍 살수록 월 단가 할인)</p>
                <ul class="pro-plan-list">${planRows}</ul>
                <ul>${PAYMENT_NOTICE.methods.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
                <p class="pro-payment-refund">${esc(PAYMENT_NOTICE.refundNotice)}</p>
            </div>` : '';
    const contactBtn = PAYMENT_NOTICE.enabled && PAYMENT_NOTICE.contactUrl
        ? `<button class="app-confirm-cancel pro-payment-contact">${esc(PAYMENT_NOTICE.contactLabel)}</button>` : '';
    const { overlay, close } = _showDialog(`
        <div class="app-confirm-dialog dialog-card pro-upgrade-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pro-upgrade-title">
            <h3 id="pro-upgrade-title">💎 ${PAYMENT_NOTICE.enabled ? 'Pro로 업그레이드' : '무료 한도 도달'}</h3>
            <p>${esc(limitMessage || `${featureLabel}의 무료 플랜 한도에 도달했습니다.`)}</p>
            <div class="pro-upgrade-benefits">
                <p class="pro-upgrade-sub"><strong>Pro${PAYMENT_NOTICE.enabled ? '' : ' 플랜(준비 중)'}에서는:</strong></p>
                <ul>${benefitItems.join('')}</ul>
            </div>${pay}
            <div class="app-confirm-actions">
                ${contactBtn}
                <button class="app-confirm-cancel app-confirm-compare">Free / Pro 비교</button>
                <button class="app-confirm-ok">확인</button>
            </div>
        </div>
    `);
    overlay.querySelector('.app-confirm-compare')?.addEventListener('click', () => { close(); showPlanCompare(); });
    const contactEl = overlay.querySelector('.pro-payment-contact');
    if (contactEl) {
        void reportEvent('payment_notice_view').catch(() => {});
        contactEl.addEventListener('click', () => {
            void reportEvent('payment_link_click').catch(() => {});
            close();
            window.open(PAYMENT_NOTICE.contactUrl, '_blank', 'noopener');
        });
    } else if (PAYMENT_NOTICE.enabled) {
        void reportEvent('payment_notice_view').catch(() => {});
    }
}
