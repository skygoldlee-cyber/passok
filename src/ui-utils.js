// ui-utils.js - 로딩 오버레이 및 스피너 UI 유틸리티 (공통 모듈)
// @spec A-07,UX-FB-01~04,UX-FORM-03

import { escapeHTML, safeTextWithBreaks } from './core/sanitize.js';

// @spec UX-FB-11 — 스피너 지연 임계(300ms): 짧은 작업은 오버레이를 띄우지 않아 플리커 방지
const GLOBAL_LOADING_DELAY_MS = 300;
let _loadingTimer = /** @type {ReturnType<typeof setTimeout>|null} */ (null);
let _loadingVisible = false;

export function showGlobalLoading(message = '로딩 중...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <p id="global-loading-message"></p>
        `;
        document.body.appendChild(overlay);
    }
    const msgEl = document.getElementById('global-loading-message');
    if (msgEl) msgEl.textContent = message;
    overlay.classList.remove('is-hidden');
    if (_loadingVisible) return; // 이미 표시 중 — 메시지만 갱신
    if (_loadingTimer) return;   // 표시 예약 중 — 메시지만 갱신
    _loadingTimer = setTimeout(() => {
        _loadingTimer = null;
        _loadingVisible = true;
        overlay.classList.add('is-visible');
    }, GLOBAL_LOADING_DELAY_MS);
}

export function hideGlobalLoading() {
    if (_loadingTimer) {
        clearTimeout(_loadingTimer); // 300ms 내 완료 — 오버레이 미표시
        _loadingTimer = null;
    }
    _loadingVisible = false;
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
        overlay.classList.remove('is-visible');
        setTimeout(() => {
            overlay.classList.add('is-hidden');
        }, 200);
    }
}

/**
 * UX-FB-11 — 장시간 작업 실행 래퍼.
 *  - 짧은 작업(< delayMs, 기본 300ms)은 스피너 미표시 (플리커 방지)
 *  - triggerEl 지정 시 실행 중 disabled+aria-busy로 연타 방지
 *  - opts.cancellable=true이면 오버레이에 취소 버튼 → AbortController.abort()
 *  - opts.timeoutMs 초과 시 자동 abort + 'timeout' AbortError reject
 *  - task는 signal을 첫 인자로 받음 — signal.onabort/throwIfAborted 활용
 * @param {(signal: AbortSignal) => Promise<any>} task
 * @param {{message?:string, timeoutMs?:number, triggerEl?:HTMLElement|null, cancellable?:boolean, timeoutMessage?:string}} [opts]
 */
export async function runWithLoading(task, opts = {}) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = ctrl ? ctrl.signal : /** @type {AbortSignal} */ ({ aborted: false });
    const trigger = opts.triggerEl || null;
    let cancelled = false;
    let cancelBtn = null;

    if (trigger) {
        trigger.setAttribute('aria-busy', 'true');
        if ('disabled' in trigger) /** @type {any} */ (trigger).disabled = true;
    }

    // 스피너는 showGlobalLoading의 내장 지연(300ms)이 담당 — 300ms 내 완료 시 미표시
    showGlobalLoading(opts.message || '처리 중입니다...');
    if (opts.cancellable) {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay && !overlay.querySelector('.global-loading-cancel')) {
            cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'global-loading-cancel';
            cancelBtn.textContent = '취소';
            cancelBtn.addEventListener('click', () => { cancelled = true; ctrl?.abort(); });
            overlay.appendChild(cancelBtn);
        }
    }

    try {
        const timeoutErr = new Error(opts.timeoutMessage || '작업 시간이 초과되었습니다.');
        timeoutErr.name = 'AbortError';
        const result = await (opts.timeoutMs
            ? Promise.race([
                task(signal),
                new Promise((_, rej) => setTimeout(() => { ctrl?.abort(); rej(timeoutErr); }, opts.timeoutMs)),
            ])
            : task(signal));
        return result;
    } catch (e) {
        if (cancelled || signal.aborted) {
            const err = e instanceof Error ? e : new Error('cancelled');
            if (!err.name || err.name === 'Error') err.name = 'AbortError';
            throw err;
        }
        throw e;
    } finally {
        if (cancelBtn) cancelBtn.remove();
        hideGlobalLoading();
        if (trigger) {
            trigger.removeAttribute('aria-busy');
            if ('disabled' in trigger) /** @type {any} */ (trigger).disabled = false;
        }
    }
}

// 스피너 애니메이션(@keyframes spin)은 css/ui-overlay.css에 정의됨

/* =========================================================
   햅틱 피드백 (모바일 정답/오답 진동)
   ========================================================= */
/** @param {number|number[]} pattern */
export function vibrate(pattern) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(pattern); } catch (_) { /* no-op */ }
    }
}
export const HAPTIC = { correct: 30, wrong: [40, 30, 40], tap: 10 };

/**
 * A-14 — 채점 상태 표시 공용 (SC 1.4.1): 색 클래스 외에 ✓/✗ 아이콘과
 * sr-only 텍스트를 병용해 정오답이 색 단독 전달에 의존하지 않게 한다.
 * @param {HTMLButtonElement|null} btn - 표시 대상 버튼
 * @param {'correct'|'incorrect'} status - 정답 여부
 */
export function markChoiceState(btn, status) {
    if (!btn) return;
    const correct = status === 'correct';
    btn.classList.add(correct ? 'correct' : 'incorrect');
    if (btn.querySelector('.choice-status-icon')) return;
    btn.insertAdjacentHTML('beforeend',
        `<i class="fa-solid ${correct ? 'fa-check' : 'fa-xmark'} choice-status-icon" aria-hidden="true"></i>` +
        `<span class="sr-only choice-status-sr"> (${correct ? '정답' : '오답'})</span>`);
}

/** 채점 표시 해제 — 재사용 버튼(OX 토글 등)의 다음 문항 준비 */
/** @param {HTMLElement|null} btn */
export function clearChoiceState(btn) {
    if (!btn) return;
    btn.classList.remove('correct', 'incorrect');
    btn.querySelectorAll('.choice-status-icon, .choice-status-sr').forEach((/** @type {Element} */ n) => n.remove());
}

/**
 * 객관식(.limits-opt-btn) 채점 표시 — 전 버튼 비활성 + 정답 버튼 강조 + 오답 선택 표시.
 * 버튼은 dataset.value에 비교값을 보유해야 한다 — 표시 텍스트 부분일치는
 * '5'가 '50'에도 걸리는 오매칭 버그가 있어 값 비교로 통일한다.
 * @param {ParentNode|null} container - 선택지 버튼 컨테이너
 * @param {HTMLButtonElement} selectedBtn - 사용자가 선택한 버튼
 * @param {string} correctValue - 정답 값
 */
export function markChoiceButtons(container, selectedBtn, correctValue) {
    if (!container) return;
    container.querySelectorAll('.limits-opt-btn').forEach(node => {
        const btn = /** @type {HTMLButtonElement} */ (node);
        btn.disabled = true;
        if (btn.dataset.value === correctValue) markChoiceState(btn, 'correct');
    });
    if (selectedBtn && selectedBtn.dataset.value !== correctValue) {
        markChoiceState(selectedBtn, 'incorrect');
    }
}

/**
 * 오답 리뷰 목록 HTML — 전부 정답이면 완료 문구, 아니면 문항별 카드 목록.
 * 항목은 {question, selected, correctAnswer} 형태 (훈련소·퀴즈 결과 공용).
 * @param {Array<{question:string, selected:string, correctAnswer:string}>} wrongAnswers
 * @param {(item:object, idx:number)=>string} [renderItem] 문항별 카드 HTML 커스텀 렌더러
 * @returns {string}
 */
/** @param {Array<*>} wrongAnswers @param {Function} [renderItem] */
export function wrongReviewHtml(wrongAnswers, renderItem) {
    if (!wrongAnswers.length) {
        return '<p style="text-align:center; color:var(--color-success); font-weight:600;"><i class="fa-solid fa-circle-check"></i> 모든 문제를 맞혔습니다!</p>';
    }
    const item = renderItem || ((/** @type {*} */ s, /** @type {number} */ idx) => `
        <div style="padding:0.75rem; margin-bottom:0.5rem; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card);">
            <div style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:0.3rem;">Q${idx + 1}</div>
            <p style="font-size:0.9rem; margin-bottom:0.4rem;">${safeTextWithBreaks(s.question)}</p>
            <p style="font-size:0.85rem; color:var(--color-danger);">내 답: ${escapeHTML(s.selected)}</p>
            <p style="font-size:0.85rem; color:var(--color-success);">정답: <strong>${escapeHTML(s.correctAnswer)}</strong></p>
        </div>`);
    return `<h3 style="margin-bottom:0.75rem; font-size:1.1rem;"><i class="fa-solid fa-triangle-exclamation"></i> 오답 리뷰 (${wrongAnswers.length}문제)</h3>`
        + wrongAnswers.map((s, idx) => item(s, idx)).join('');
}

/**
 * 훈련소 세션 결과 패널 HTML — 헤더(제목+배지) + 트로피 + 점수 요약 + 오답 리뷰 + 액션.
 * @param {object} o
 * @param {string} [o.headerTitle] 헤더 제목 (header 생략 시 필수)
 * @param {string} [o.badge] 헤더 배지 라벨 (header 생략 시 필수)
 * @param {string} o.doneTitle 완료 제목 (예: "훈련 완료!")
 * @param {number} o.correct 정답 수
 * @param {number} o.total 총 문항 수
 * @param {string} o.reviewHTML 오답 리뷰 HTML (wrongReviewHtml 결과)
 * @param {string} o.retryClick 다시 풀기 data-click 핸들러명
 * @param {string} [o.retryArg] 다시 풀기 버튼 data-arg 값
 * @param {string} [o.retryLabel] 다시 풀기 버튼 라벨 (기본 "다시 풀기")
 * @param {string} [o.extraActions] 추가 액션 버튼 HTML (메뉴 버튼 앞)
 * @param {string} [o.statLine] 점수 아래 보조 통계 문구
 * @param {string} [o.header] 헤더 블록 HTML (생략 시 sim-arena-header + 제목/배지)
 * @returns {string}
 */
export function trainerResultHtml({ headerTitle, badge, doneTitle, correct, total, reviewHTML, retryClick, retryArg = '', retryLabel = '다시 풀기', extraActions = '', statLine = '', header }) {
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const headerBlock = header !== undefined ? header : `
        <div class="sim-arena-header" style="margin-bottom: 2rem;">
            <button class="btn btn-secondary" data-click="exitTrainerSubView" title="훈련소 메뉴로 돌아가기"><i class="fa-solid fa-arrow-left"></i> 나가기</button>
            <div class="sim-title-group">
                <h4>${headerTitle}</h4>
                <span class="badge badge-quiz-cat">${badge}</span>
            </div>
        </div>`;
    return `${headerBlock}
        <div class="trainer-arena" style="text-align:center;">
            <i class="fa-solid fa-trophy trophy-icon"></i>
            <h2>${doneTitle}</h2>
            <p class="result-score-summary">정답수: <strong>${correct}</strong> / ${total} (${rate}%)</p>
            ${statLine ? `<p style="color:var(--color-text-muted); font-size:0.85rem;">${statLine}</p>` : ''}
            <div style="text-align:left; margin:1.5rem 0; max-width:600px; margin-left:auto; margin-right:auto;">${reviewHTML}</div>
            <div class="result-actions" style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-primary" data-click="${retryClick}"${retryArg ? ` data-arg="${retryArg}"` : ''}><i class="fa-solid fa-rotate-left"></i> ${retryLabel}</button>
                ${extraActions}
                <button class="btn btn-secondary" data-click="exitTrainerSubView"><i class="fa-solid fa-house"></i> 메뉴로</button>
            </div>
        </div>`;
}

/**
 * 채점 피드백 패널 표시 — 패널 노출 + incorrect 클래스 + 제목/설명 + 다음 버튼.
 * (훈련소·데일리 챌린지 공용; titleHtml/descHtml은 호출부에서 esc 처리된 HTML)
 * @param {object} o
 * @param {string} o.panelId 피드백 패널 요소 id
 * @param {string} o.titleId 피드백 제목 요소 id
 * @param {string} [o.descId] 피드백 설명 요소 id
 * @param {string} [o.nextBtnId] 다음 버튼 요소 id (표시 대상)
 * @param {boolean} o.isCorrect 정답 여부
 * @param {string} o.titleHtml 제목 HTML
 * @param {string} [o.descHtml] 설명 HTML
 */
export function showAnswerFeedback({ panelId, titleId, descId, nextBtnId, isCorrect, titleHtml, descHtml = '' }) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.remove('is-hidden');
    panel.classList.toggle('incorrect', !isCorrect);
    const title = document.getElementById(titleId);
    if (title) title.innerHTML = titleHtml;
    const desc = descId ? document.getElementById(descId) : null;
    if (desc) desc.innerHTML = descHtml;
    const nextBtn = nextBtnId ? document.getElementById(nextBtnId) : null;
    if (nextBtn) nextBtn.classList.remove('is-hidden');
}

/* =========================================================
   B1: 커스텀 토스트 및 컨펌 모달 — alert/confirm 대체
   ========================================================= */

// 토스트 알림 (alert 대체) — #app-toast 스택에 최대 3개까지 쌓아 연속 알림 유실 방지
const MAX_TOASTS = 3;
// @spec A-10 — 비본질 자동 소멸(2–3s)은 확인용 정보만, aria-live 보고 + 중요 알림은 배너·모달 사용 (WCAG 2.2.1)
/** @param {string} message @param {string} [type] @param {number} [duration] @param {string} [iconClass] */
export function showToast(message, type = 'info', duration, iconClass = '') {
    // 성공 토스트는 화면 변화와 확인이 중복되므로 기본 노출을 짧게 — 알림 피로 완화
    if (duration === undefined) duration = type === 'success' ? 2000 : (type === 'error' || type === 'warning' ? 4000 : 3000);
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    // 스택 상한 — 초과 시 가장 오래된 항목부터 제거
    while (toast.children.length >= MAX_TOASTS) {
        toast.firstElementChild?.remove();
    }
    // 타입별 아이콘/색상 (CSS 변수에서 읽기)
    const icons = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };
    const cssVars = { info: '--color-primary', success: '--color-success', warning: '--color-warning', error: '--color-danger' };
    const icon = iconClass || icons[/** @type {keyof icons} */ (type)] || icons.info;
    const colorVar = cssVars[/** @type {keyof cssVars} */ (type)] || cssVars.info;
    const style = getComputedStyle(document.documentElement);
    const color = style.getPropertyValue(colorVar).trim();
    const item = document.createElement('div');
    item.className = 'app-toast-item is-visible';
    item.innerHTML = `<i class="fa-solid ${escapeHTML(icon)}" style="color:${escapeHTML(color)}; margin-right:0.5rem;"></i>${escapeHTML(message)}`;
    toast.appendChild(item);
    toast.classList.add('is-visible');
    setTimeout(() => {
        item.classList.remove('is-visible');
        setTimeout(() => {
            item.remove();
            if (!toast.children.length) toast.classList.remove('is-visible');
        }, 250);
    }, duration);
}

/**
 * UX-FB-10 — 액션 버튼 토스트 ('되돌리기' 등). 지정 시간 내 버튼 클릭 시 onAction 호출.
 * @param {string} message
 * @param {{label:string, onAction:()=>void, duration?:number, type?:string}} action
 */
export function showActionToast(message, action) {
    const duration = action.duration ?? 5000;
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    while (toast.children.length >= MAX_TOASTS) {
        toast.firstElementChild?.remove();
    }
    const item = document.createElement('div');
    item.className = 'app-toast-item is-visible';
    const msg = document.createElement('span');
    msg.textContent = message;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-toast-action';
    btn.textContent = action.label;
    item.append(msg, btn);
    toast.appendChild(item);
    toast.classList.add('is-visible');
    let done = false;
    const dismiss = () => {
        if (done) return;
        done = true;
        item.classList.remove('is-visible');
        setTimeout(() => {
            item.remove();
            if (!toast.children.length) toast.classList.remove('is-visible');
        }, 250);
    };
    btn.addEventListener('click', () => { dismiss(); action.onAction(); });
    setTimeout(dismiss, duration);
}

// 컨펌 모달 (confirm 대체) — Promise 반환
/** 저장 확인 배지 — 토스트는 순간이라 "저장됐는지" 불안함. 저장 목록 영역 상단에
 *  "✓ 기기에 저장됨 · 방금"을 남겨 눈에 보이는 확인을 준다 (다음 렌더에서 자연 교체). */
/** @param {Element|null} host */
export function flashSavedBadge(host) {
    if (!host) return;
    host.querySelector('.saved-flash')?.remove();
    const b = document.createElement('div');
    b.className = 'saved-flash';
    b.textContent = '✓ 기기에 저장됨 · 방금';
    host.prepend(b);
}

/** @param {string} message @param {string} [title] @param {*} [opts] */
export function showConfirm(message, title = '확인', opts = {}) {
    return new Promise((resolve) => {
        // 기존 모달 제거
        const existing = document.getElementById('app-confirm-overlay');
        if (existing) existing.remove();

        const okLabel = opts.okLabel || '확인';
        // UX-FB-10 — 파괴적 동작(삭제·초기화·덮어쓰기·폐기) 확인은 danger 스타일.
        // 명시 opts.danger 우선, 미지정 시 제목·본문의 파괴 키워드로 자동 판정한다.
        const danger = opts.danger ?? /삭제|초기화|덮어쓰|되돌릴 수 없|버리기|리셋/.test(`${title} ${message}`);
        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-overlay';
        overlay.innerHTML = `
            <div class="app-confirm-dialog dialog-card">
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(message)}</p>
                <div class="app-confirm-actions">
                    <button class="app-confirm-cancel">취소</button>
                    <button class="app-confirm-ok${danger ? ' danger' : ''}">${escapeHTML(okLabel)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        // 애니메이션
        const dialog = /** @type {HTMLElement} */ (overlay.querySelector('.app-confirm-dialog'));
        requestAnimationFrame(() => {
            overlay.classList.add('is-visible');
            dialog.classList.add('is-visible');
        });

        const close = (/** @type {*} */ result) => {
            overlay.classList.remove('is-visible');
            dialog.classList.remove('is-visible');
            setTimeout(() => {
                untrapFocus();
                overlay.remove();
            }, 200);
            resolve(result);
        };

        overlay.querySelector('.app-confirm-ok')?.addEventListener('click', () => close(true));
        overlay.querySelector('.app-confirm-cancel')?.addEventListener('click', () => close(false));
        overlay.addEventListener('click', (/** @type {MouseEvent} */ e) => { if (e.target === overlay) close(false); });
        // Escape 키로 취소
        const onKey = (/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
        };
        document.addEventListener('keydown', onKey);
        // 포커스 트랩 적용
        const untrapFocus = trapFocus(dialog);
    });
}

/**
 * UX-FB-10 — 다지선다 확인 모달 (예: 병합/덮어쓰기/취소).
 * showConfirm과 동일한 오버레이·트랩 계약이나 선택지를 2개 이상 제공한다.
 * @param {string} message
 * @param {string} title
 * @param {{label:string, value:string, danger?:boolean}[]} buttons
 * @returns {Promise<string|null>} 선택 value, 취소·닫기 시 null
 */
export function showChoiceModal(message, title, buttons) {
    return new Promise((resolve) => {
        const existing = document.getElementById('app-confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-overlay';
        const btnsHtml = buttons.map(b =>
            `<button class="app-confirm-ok${b.danger ? ' danger' : ''}" data-choice="${escapeHTML(b.value)}">${escapeHTML(b.label)}</button>`
        ).join('');
        overlay.innerHTML = `
            <div class="app-confirm-dialog dialog-card">
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(message)}</p>
                <div class="app-confirm-actions">
                    <button class="app-confirm-cancel">취소</button>
                    ${btnsHtml}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const dialog = /** @type {HTMLElement} */ (overlay.querySelector('.app-confirm-dialog'));
        requestAnimationFrame(() => {
            overlay.classList.add('is-visible');
            dialog.classList.add('is-visible');
        });

        const close = (/** @type {*} */ value) => {
            overlay.classList.remove('is-visible');
            dialog.classList.remove('is-visible');
            setTimeout(() => { untrapFocus(); overlay.remove(); }, 200);
            resolve(value);
        };

        overlay.querySelectorAll('[data-choice]').forEach((/** @type {Element} */ b) => {
            b.addEventListener('click', () => close(b.getAttribute('data-choice')));
        });
        overlay.querySelector('.app-confirm-cancel')?.addEventListener('click', () => close(null));
        overlay.addEventListener('click', (/** @type {MouseEvent} */ e) => { if (e.target === overlay) close(null); });
        const onKey = (/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(null); }
        };
        document.addEventListener('keydown', onKey);
        const untrapFocus = trapFocus(dialog);
    });
}

// 알림 모달 (alert 대체) — 확인 버튼만 있는 단일 공지용, Promise 반환
/** @param {string} message @param {string} [title] */
export function showAlert(message, title = '알림') {
    return new Promise((resolve) => {
        const existing = document.getElementById('app-confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-overlay';
        overlay.innerHTML = `
            <div class="app-confirm-dialog dialog-card">
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(message)}</p>
                <div class="app-confirm-actions">
                    <button class="app-confirm-ok">확인</button>
                </div>
            </div>
        `;
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
            setTimeout(() => {
                untrapFocus();
                overlay.remove();
            }, 200);
            resolve(true);
        };

        overlay.querySelector('.app-confirm-ok')?.addEventListener('click', close);
        overlay.addEventListener('click', (/** @type {MouseEvent} */ e) => { if (e.target === overlay) close(); });
        const onKey = (/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(); }
        };
        document.addEventListener('keydown', onKey);
    });
}

/* =========================================================
   B2: 모달 포커스 트랩 유틸리티 (접근성)
   ========================================================= */

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const _inertModals = new Set();
/** @type {MutationObserver|null} */
let _inertObserver = null;

/** 모달이 사라졌는지 판정 — DOM 제거 + 표시 소실(display:none·visibility·조상 숨김) 커버 */
/** @param {HTMLElement} m */
function _modalGone(m) {
    if (!m.isConnected) return true;
    if (typeof m.checkVisibility === 'function') {
        return !m.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true });
    }
    return false;
}

/** DOM에서 사라진 모달을 감지해 inert를 자동 해제 — untrap 미호출 경로(el.remove() 등) 커버 */
function _ensureInertObserver() {
    if (_inertObserver || typeof MutationObserver === 'undefined' || !document.body) return;
    _inertObserver = new MutationObserver(() => {
        if (_inertModals.size === 0) return;
        let changed = false;
        for (const m of _inertModals) {
            if (_modalGone(m)) { _inertModals.delete(m); changed = true; }
        }
        if (changed && _inertModals.size === 0) {
            document.querySelector('.app-container')?.removeAttribute('inert');
        }
    });
    // attributes — untrap 없이 is-visible 제거·display:none으로 숨기는 비정상 닫힘 경로 감지
    _inertObserver.observe(document.body, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'],
    });
}

/**
 * UX-FORM-03 — 필드 인라인 오류 표시. `<p class="field-error" role="alert">`를
 * 입력 바로 뒤에 삽입하고 aria-invalid + aria-describedby를 연결한다.
 * @param {HTMLElement|null} input
 * @param {string} message - 표시할 오류 메시지
 */
export function setFieldError(input, message) {
    if (!input || !input.parentNode) return;
    const errId = `${input.id || 'field'}-error`;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errId);
    let err = document.getElementById(errId);
    if (!err) {
        err = document.createElement('p');
        err.className = 'field-error';
        err.id = errId;
        err.setAttribute('role', 'alert');
        input.insertAdjacentElement('afterend', err);
    }
    err.innerHTML = `<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> `;
    err.appendChild(document.createTextNode(message));
}

/**
 * 필드 인라인 오류 해제 — aria 속성 제거 + 오류 요소 삭제.
 * @param {HTMLElement|null} input
 */
export function clearFieldError(input) {
    if (!input) return;
    input.removeAttribute('aria-invalid');
    const errId = input.getAttribute('aria-describedby');
    input.removeAttribute('aria-describedby');
    if (errId) document.getElementById(errId)?.remove();
}

/**
 * UX-FORM-03 — 필수 필드 일괄 검증. 비어 있는 필드에 인라인 오류를 표시하고
 * 채워진 필드의 기존 오류는 해제한다. 실패 시 첫 오류 필드에 포커스를 옮긴다.
 * @param {Array<[HTMLElement|null, string]>} pairs - [입력 요소, 오류 메시지] 쌍
 * @returns {boolean} 모든 필드가 채워졌으면 true
 */
export function requireFields(pairs) {
    let first = null;
    for (const [input, message] of pairs) {
        const empty = !input || !String(/** @type {HTMLInputElement} */ (input).value ?? '').trim();
        if (empty) {
            if (input) { setFieldError(input, message); if (!first) first = input; }
        } else clearFieldError(input);
    }
    first?.focus();
    return !first;
}

// UX-FORM-03 — 오류 필드 수정 시 인라인 오류 자동 해제 (폼 무관 공통 동작).
// 위임 리스너라 런타임 주입 필드(lazy view·모달)에도 적용된다.
// document 가드 — Node 단위 테스트 등 DOM 없는 환경에서 모듈 import가 실패하지 않게
if (typeof document !== 'undefined') {
    document.addEventListener('input', (e) => {
        const t = /** @type {HTMLElement|null} */ (e.target);
        if (t && t.getAttribute('aria-invalid') === 'true') clearFieldError(t);
    });
}

/**
 * A-17 — 오버레이 하의 배경을 inert 처리 (키보드·스크린리더 가상 커서 격리).
 * 모달이 .app-container 내부에 있으면 스킵 — 자신을 포함한 컨테이너를 inert하면 모달도 무력화된다.
 * 추적 대상은 DOM에서 제거된 모달을 자동 정리 — untrap 미호출 경로(요소 제거·뷰 전환)에서도
 * inert가 영구 누수되지 않는다.
 * @param {HTMLElement} modalEl - 표시되는 모달
 * @returns {() => void} inert 해제 함수
 */
function applyBackgroundInert(modalEl) {
    const app = document.querySelector('.app-container');
    if (!app || app.contains(modalEl)) return () => {};
    const prune = () => {
        for (const m of _inertModals) if (_modalGone(m)) _inertModals.delete(m);
    };
    prune();
    _inertModals.add(modalEl);
    _ensureInertObserver();
    app.setAttribute('inert', '');
    return () => {
        _inertModals.delete(modalEl);
        prune();
        if (_inertModals.size === 0) app.removeAttribute('inert');
    };
}

/**
 * 모달 내 포커스를 트랩하고, 닫힐 때 초점을 반환.
 * @param {HTMLElement} modalEl - 포커스를 트랩할 모달 컨테이너
 * @param {HTMLElement} [triggerEl] - 모달을 열은 트리거 요소 (닫힐 때 초점 반환)
 * @returns {() => void} trap 해제 함수 (모달 닫힐 때 호출)
 */
export function trapFocus(modalEl, triggerEl) {
    if (!modalEl) return () => {};

    /** @type {HTMLElement|null} */
    const previouslyFocused = triggerEl || /** @type {HTMLElement|null} */ (document.activeElement);

    // A-17 — 오버레이 하의 배경은 inert (해제는 포커스 복귀보다 먼저 — inert 요소는 focus 불가)
    const releaseInert = applyBackgroundInert(modalEl);

    // 첫 포커스 가능 요소로 초점 이동
    const focusables = modalEl.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
        /** @type {HTMLElement} */ (focusables[0]).focus();
    } else {
        modalEl.setAttribute('tabindex', '-1');
        modalEl.focus();
    }

    const onKeydown = (/** @type {KeyboardEvent} */ e) => {
        if (e.key !== 'Tab') return;
        const currentFocusables = modalEl.querySelectorAll(FOCUSABLE_SELECTOR);
        if (currentFocusables.length === 0) {
            e.preventDefault();
            return;
        }
        const first = /** @type {HTMLElement} */ (currentFocusables[0]);
        const last = /** @type {HTMLElement} */ (currentFocusables[currentFocusables.length - 1]);

        if (e.shiftKey) {
            if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    modalEl.addEventListener('keydown', onKeydown);

    // 해제 함수: 이벤트 리스너 제거 + 초점 반환
    return () => {
        modalEl.removeEventListener('keydown', onKeydown);
        releaseInert();
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
    };
}
