// src/usage-stats.js — 로컬 기능 사용 카운터 (유료가치 판정 데이터)
// @spec ROAD-L5,UX-MET-01,UX-MET-02,UX-MET-03,UX-MET-04
//
// 외부 전송 없이 이 기기의 localStorage에만 누적한다. 뷰 전환과 유료가치
// 후보 기능(오답→교재 근거·진단 평가·이야기형·학습 진단 등)의 사용 횟수를
// 측정해 설정의 '내 사용 통계'에서 확인 — Pro 전환 의향 판단의 정량 근거.
// GLOBAL 키(기기 단위)로 저장 — 로그인 없는 프로모션 기간에는 owner의
// 익명 device_id가 "유저" 단위이며, 시험 전환해도 누적이 유지된다.

import { STORAGE_KEYS } from './storage-keys.js';
import { safeGetItem, safeSetItem } from './state.js';
import { getActiveRegistry } from './exam-context.js';
import { html, raw } from './sanitize.js';
import { trapFocus, showToast } from './ui-utils.js';
import { todayKey, localDateTime } from './utils.js';

const DAYS_KEEP = 90; // days 맵 상한 — 저장량 제한

/** 유료가치 판정 기준 — 기능 액션 합계가 이 횟수에 도달하면 유료가치 인정 (ROAD-P1 착수 근거) */
export const PRO_VALUE_THRESHOLD = 20;

/** 액션 키 → 표시 라벨 (유료가치 후보 기능과 SUBSCRIPTION_ROADMAP 표 대응) */
const ACTION_LABELS = {
    weak_to_textbook: '오답 → 교재 근거 보기',
    weak_to_card: '오답 → 복습 노트',
    weak_to_similar: '오답 → 유사 문제',
    diagnostic_quiz: '진단 평가',
    story_textbook: '이야기형 교재 읽기',
    personal_analysis: '학습 진단 보기',
    analysis_report: '주간 리포트 공유',
    actual_exam_report: '실제 시험 결과 보고',
    command_palette: '통합 검색 (Ctrl+K)',
    plan_compare: 'Free/Pro 플랜 비교',
    // ── Phase 2 표면 진입 계측 (UX-MET-01~02, DOC-DSN-24) — `:` 접미 키는 접두사로 라벨 해석
    tq_run: '오늘 할 일 큐 실행',
    oxdrill_start: 'O/X 드릴 시작',
    combo_start: 'ㄱㄴㄷ 드릴 시작',
    drill_from_review: '복습 → 드릴 직행',
    review_weak_open: '취약 진술 리뷰 개방',
    trainer_menu: '훈련소 메뉴 진입',
    pro_badge_click: 'PRO 배지 → 플랜 비교',
};

/** 액션 키 → 표시 라벨 — `:` 접미 키는 접두사(버킷) 라벨로 해석 (UX-MET-04) */
export function actionLabel(key) {
    return ACTION_LABELS[key] || ACTION_LABELS[key.split(':')[0]] || key;
}

/**
 * 유료가치 판정 대상 (Pro 후보 기능) — PRO_VALUE_THRESHOLD 합산에만 포함.
 * command_palette·plan_compare 같은 편의/UI 액션은 통계 표시용으로만 남긴다.
 */
const VALUE_ACTIONS = new Set([
    'weak_to_textbook', 'weak_to_card', 'weak_to_similar',
    'diagnostic_quiz', 'story_textbook', 'personal_analysis', 'analysis_report', 'actual_exam_report',
]);

function _todayStr() { return todayKey(); }

function _load() {
    try {
        const d = JSON.parse(safeGetItem(STORAGE_KEYS.USAGE_STATS) || 'null');
        if (d && typeof d === 'object' && d.v === 1
            && typeof d.views === 'object' && typeof d.actions === 'object' && typeof d.days === 'object') return d;
    } catch (e) { /* 손상 데이터는 초기값으로 복구 */ }
    return { v: 1, owner: null, firstUse: null, lastUse: null, days: {}, views: {}, actions: {} };
}

/** 익명 유저 식별 — 로그인 없는 기간의 "유저" 단위. sync.js getDeviceId와 같은 키 공유 */
function _ownerId() {
    let id = safeGetItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        safeSetItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
}

function _bump(bucket, key) {
    if (!key) return;
    const d = _load();
    const now = localDateTime();
    if (!d.owner) d.owner = _ownerId();
    if (!d.firstUse) d.firstUse = now;
    d.lastUse = now;
    const day = _todayStr();
    d.days[day] = (d.days[day] || 0) + 1;
    const dayKeys = Object.keys(d.days).sort();
    while (dayKeys.length > DAYS_KEEP) {
        const oldest = dayKeys.shift();
        if (oldest) delete d.days[oldest];
    }
    d[bucket][key] = (d[bucket][key] || 0) + 1;
    safeSetItem(STORAGE_KEYS.USAGE_STATS, JSON.stringify(d));
}

/** 뷰 진입 카운트 — navigation.js의 switchView에서 호출 */
export function trackView(viewId) { _bump('views', viewId); }

/** 기능 액션 카운트 — 유료가치 후보 기능의 호출부에서 호출 */
export function trackAction(key) { _bump('actions', key); }

export function getUsageStats() { return _load(); }

/** 내보내기 페이로드 — 카운터·기간만 포함, 학습 내용 없음 (UX-MET-03). 로컬 전용 계측의 회수 경로 */
export function buildUsageExport() {
    const d = _load();
    return JSON.stringify({
        v: 1, owner: d.owner, firstUse: d.firstUse, lastUse: d.lastUse,
        days: d.days, views: d.views, actions: d.actions,
    }, null, 2);
}

/**
 * 표면 진입 계측 위임 바인딩 — 1회 설치 (UX-MET-01~02).
 * data-click 디스패치(listeners-delegation.js)와 별개 리스너 — 계측만 수행하고
 * stopPropagation 없이 동작 경로를 건드리지 않는다.
 * `toggle` 이벤트는 버블링하지 않으므로 캡처 단계에서 구독한다.
 */
let _metricsBound = false;
export function initUsageMetrics(doc = document) {
    if (_metricsBound || !doc) return;
    _metricsBound = true;
    doc.addEventListener('click', (e) => {
        const el = e.target instanceof Element ? e.target : /** @type {Node|null} */ (e.target)?.parentElement;
        if (!el) return;
        if (el.closest('[data-pro-feature]')) trackAction('pro_badge_click');
        const tqBtn = el.closest('#weak-subject-recommendation [data-click]');
        if (tqBtn) trackAction(`tq_run:${tqBtn.getAttribute('data-click')}`);
        const menuCard = el.closest('#trainer-view .trainer-menu-card'); // formula 뷰의 동명 카드는 제외
        if (menuCard) {
            const click = menuCard.getAttribute('data-click');
            if (click) trackAction(`trainer_menu:${click}`);
        }
    });
    doc.addEventListener('toggle', (e) => {
        const t = /** @type {HTMLDetailsElement|null} */ (e.target instanceof Element ? e.target : null);
        if (t && t.id === 'review-weak-panel' && t.open) trackAction('review_weak_open');
    }, true);
}

/** Pro 후보 기능 사용 합계가 유료가치 판정 기준(PRO_VALUE_THRESHOLD)에 도달했는지 */
export function isValueThresholdMet() {
    return getValueActionTotal() >= PRO_VALUE_THRESHOLD;
}

export function resetUsageStats() {
    safeSetItem(STORAGE_KEYS.USAGE_STATS,
        JSON.stringify({ v: 1, owner: null, firstUse: null, lastUse: null, days: {}, views: {}, actions: {} }));
}

/** 유료가치 판정 대상 액션 합계 — Pro 후보 기능(VALUE_ACTIONS) 사용 횟수만 집계 */
function getValueActionTotal() {
    const d = _load();
    return Object.entries(d.actions)
        .filter(([k]) => VALUE_ACTIONS.has(k))
        .reduce((s, [, n]) => s + n, 0);
}

function _fmtDate(iso) {
    // 저장값은 ISO(UTC) 타임스탬프 — slice(0,10)은 UTC 날짜라 KST 00~09시에
    // 하루 전으로 표시되므로 로컬 날짜로 변환한다
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? todayKey(d) : '—';
}

/**
 * 내 사용 통계 모달 — 설정 메뉴에서 연다.
 * 뷰 라벨은 router.getViewTitles를 동적 import로 해석 (navigation→usage-stats
 * 정적 import 경로와의 순환 참조 회피 — state.js의 study-tracker 패턴과 동일).
 */
export async function showUsageStats() {
    const d = _load();
    let titles = {};
    try {
        const { getViewTitles } = await import('./router.js');
        titles = getViewTitles(getActiveRegistry()) || {};
    } catch (e) { titles = {}; }

    const viewRows = Object.entries(d.views).sort((a, b) => b[1] - a[1])
        .map(([id, n]) => html`<tr><td>${(titles[id] && titles[id].title) || id}</td><td class="usage-num">${n}회</td></tr>`);
    const actionRows = Object.entries(d.actions).sort((a, b) => b[1] - a[1])
        .map(([k, n]) => html`<tr><td>${actionLabel(k)}</td><td class="usage-num">${n}회</td></tr>`);
    const totalActions = Object.values(d.actions).reduce((s, n) => s + n, 0);
    const valueTotal = Object.entries(d.actions)
        .filter(([k]) => VALUE_ACTIONS.has(k)).reduce((s, [, n]) => s + n, 0);
    const activeDays = Object.keys(d.days).length;

    const existing = document.getElementById('usage-stats-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'usage-stats-overlay';
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = html`
        <div class="app-confirm-dialog dialog-card pro-upgrade-dialog" role="alertdialog" aria-modal="true" aria-labelledby="usage-stats-title">
            <h3 id="usage-stats-title">📊 내 사용 통계</h3>
            <div class="pro-upgrade-benefits">
                <ul>
                    <li>첫 사용: <strong>${_fmtDate(d.firstUse)}</strong> · 최근 사용: <strong>${_fmtDate(d.lastUse)}</strong></li>
                    <li>학습 활동 일수: <strong>${activeDays}일</strong> · 기능 사용 합계: <strong>${totalActions}회</strong></li>
                    <li>Pro 후보 기능 사용: <strong>${valueTotal}/${PRO_VALUE_THRESHOLD}회</strong>${valueTotal >= PRO_VALUE_THRESHOLD ? raw(' — 유료가치 판정 <strong>충족</strong>') : ''}</li>
                </ul>
            </div>
            ${viewRows.length ? html`<h4 class="usage-stats-sub">화면별 사용</h4><table class="usage-stats-table">${viewRows}</table>` : ''}
            ${actionRows.length ? html`<h4 class="usage-stats-sub">기능별 사용</h4><table class="usage-stats-table">${actionRows}</table>` : ''}
            ${!viewRows.length && !actionRows.length ? html`<p>아직 기록된 사용 데이터가 없습니다.</p>` : ''}
            <p class="usage-stats-note">이 데이터는 이 기기에만 저장되며 외부로 전송되지 않습니다.</p>
            <div class="app-confirm-btns">
                <button type="button" class="btn btn-secondary app-confirm-cancel" data-reset-usage>초기화</button>
                <button type="button" class="btn btn-secondary" data-copy-usage>통계 복사</button>
                <button type="button" class="btn btn-primary app-confirm-ok">확인</button>
            </div>
        </div>`;
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
    overlay.querySelector('[data-reset-usage]')?.addEventListener('click', () => { resetUsageStats(); close(); showUsageStats(); });
    overlay.querySelector('[data-copy-usage]')?.addEventListener('click', async () => {
        // UX-MET-03 — 로컬 전용 계측의 회수 경로: JSON 클립보드 복사, 불가 시 수동 복사 폴백
        const text = buildUsageExport();
        try {
            await navigator.clipboard.writeText(text);
            showToast('사용 통계를 클립보드에 복사했습니다.', 'success');
        } catch (e) {
            if (!dialog.querySelector('.usage-export-fallback')) {
                const ta = document.createElement('textarea');
                ta.className = 'usage-export-fallback';
                ta.readOnly = true;
                ta.value = text;
                ta.style.cssText = 'width:100%;height:8rem;margin-top:0.5rem;font-family:monospace;font-size:0.75rem;';
                dialog.querySelector('.app-confirm-btns')?.before(ta);
            }
            const ta = /** @type {HTMLTextAreaElement|null} */ (dialog.querySelector('.usage-export-fallback'));
            ta?.focus();
            ta?.select();
            showToast('자동 복사가 차단됐습니다 — 표시된 내용을 직접 복사하세요.', 'warning');
        }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const onKey = (e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(); }
    };
    document.addEventListener('keydown', onKey);
}
