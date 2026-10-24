// src/onboarding.js — 첫 방문 셋업 위저드 + 시작 안내
// @spec UX-FB-05, OB-01, SC-16
// ------------------------------------------------------------
// 학습 데이터가 전혀 없는 진짜 최초 방문에서만 1회 표시한다.
// 기존 사용자(학습 키가 이미 있는 경우)는 플래그만 기록하고 방해하지 않는다.
// 도움말 메뉴 "시작 안내" 버튼으로 언제든 재열람 가능 — 재열람 시에도 동일 위저드.
//
// v2 (OB-01): 설명형 모달 → 실행형 3단계 위저드.
//   ① 시험일 입력 → 즉시 저장 (D-day·역산 계획의 시작점)
//   ② 일일·주간 목표 입력 → 즉시 저장
//   ③ 요약 + 첫 카드 학습 버튼 (data-click 위임 — startSubjectStudy)
// ------------------------------------------------------------
import { safeGetItem, safeSetItem } from './state.js';
import { trapFocus, showToast } from './ui-utils.js';
import { getExamAppName, getMinExamLeadDays } from './exam-context.js';
import { esc } from './sanitize.js';
import { getStudyGoals, setStudyGoals, getExamDate, setExamDate, getExamLeadStatus } from './study-tracker.js';
import { todayKey } from './utils.js';

const SEEN_KEY = 'onboarding_seen_v1';
// whats-new.js와 동일 기준 — 이 중 하나라도 있으면 신규 사용자가 아님
const RETURNING_USER_HINTS = ['quiz_results', 'fc_memorized', 'study_streak', 'sim_results_history'];

let _wizStep = 0;

/** 위저드 단계별 본문 HTML (순수 — DOM 미접근 부분만 추출해 테스트 용이) */
function _stepBody(step) {
    const goals = getStudyGoals();
    const examDate = getExamDate() || '';
    const minDays = getMinExamLeadDays();
    if (step === 0) {
        return `
            <p class="onboarding-step-body">몇 가지만 설정하면 ${esc(getExamAppName())}에서 시험일까지의 계획을 자동으로 만들어 드립니다.</p>
            <label class="onboarding-field">
                <span class="onboarding-field-label"><i class="fa-solid fa-calendar-day" aria-hidden="true"></i> 시험일 (선택)</span>
                <input type="date" id="onboarding-exam-date" class="form-input" value="${esc(examDate)}" min="${todayKey()}">
            </label>
            <p class="onboarding-hint" id="onboarding-date-hint">시험일을 입력하면 D-day·주간 배분이 활성화됩니다. 권장 준비 기간: ${minDays}일 이상.</p>`;
    }
    if (step === 1) {
        return `
            <p class="onboarding-step-body">매일의 학습량을 정하면 '오늘 할 일' 큐가 배분을 관리합니다.</p>
            <label class="onboarding-field">
                <span class="onboarding-field-label"><i class="fa-solid fa-clone" aria-hidden="true"></i> 일일 카드 목표 (장)</span>
                <input type="number" id="onboarding-daily-cards" class="form-input" value="${goals.dailyCards}" min="1" max="500">
            </label>
            <label class="onboarding-field">
                <span class="onboarding-field-label"><i class="fa-solid fa-calendar-week" aria-hidden="true"></i> 주간 학습 일수 (일)</span>
                <input type="number" id="onboarding-weekly-days" class="form-input" value="${goals.weeklyStudyDays}" min="1" max="7">
            </label>`;
    }
    const st = getExamLeadStatus(getExamDate() || '');
    const ddayTxt = (() => {
        if (!st) return '시험일 미설정 — 대시보드에서 언제든 설정할 수 있습니다';
        if (st.past) return '설정된 시험일이 지났습니다 — 설정에서 수정하세요';
        return st.dday === 0 ? '오늘이 시험일입니다' : `시험까지 D-${st.dday}`;
    })();
    // SC-16 — 권장 준비 기간 미만이면 통독 경로 대신 선별 학습법을 안내
    const shortLead = st && !st.past && st.dday > 0 && st.dday < minDays;
    return `
        <ul class="onboarding-summary">
            <li><i class="fa-solid fa-calendar-day" aria-hidden="true"></i> ${ddayTxt}</li>
            <li><i class="fa-solid fa-clone" aria-hidden="true"></i> 하루 카드 ${goals.dailyCards}장 · 주 ${goals.weeklyStudyDays}일</li>
            <li><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> 틀린 문항은 복습노트·간격 반복에 자동 등록됩니다</li>
            ${shortLead ? '<li><i class="fa-solid fa-bolt" aria-hidden="true"></i> 권장 준비 기간보다 짧습니다 — 통독 대신 핵심 카드·퀴즈·훈련 중심으로 시작하세요</li>' : ''}
        </ul>`;
}

const _WIZ_TITLES = ['시작하기', '학습 목표', '준비 완료'];

function _renderStep(overlay) {
    const dialog = overlay.querySelector('.onboarding-dialog');
    if (!dialog) return;
    const last = _wizStep === 2;
    dialog.innerHTML = `
        <h3><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i> ${esc(getExamAppName())} ${esc(_WIZ_TITLES[_wizStep])}</h3>
        <div class="onboarding-progress" role="progressbar" aria-valuenow="${_wizStep + 1}" aria-valuemin="1" aria-valuemax="3" aria-label="설정 진행">
            ${_WIZ_TITLES.map((_, i) => `<span class="onboarding-dot${i <= _wizStep ? ' on' : ''}"></span>`).join('')}
        </div>
        <div class="onboarding-step-body-wrap">${_stepBody(_wizStep) /*esc-ok — 내부 헬퍼가 esc() 처리된 마크업 조립*/}</div>
        <div class="app-confirm-actions btn-row">
            ${_wizStep > 0 ? '<button class="btn btn-secondary" data-onboarding="prev">이전</button>' : ''}
            ${last ? `
                <button class="btn btn-secondary" data-onboarding="close">나중에</button>
                <button class="app-confirm-ok" data-click="startSubjectStudy" data-onboarding="close">첫 카드 학습 시작</button>`
            : `<button class="btn btn-secondary" data-onboarding="skip">건너뛰기</button>
               <button class="app-confirm-ok" data-onboarding="next">다음</button>`}
        </div>`;
}

/** 현재 단계의 입력값을 저장 — 검증 실패 시 false 반환해 진행 중단 */
function _commitStep(overlay) {
    if (_wizStep === 0) {
        const input = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#onboarding-exam-date'));
        const v = input ? input.value : '';
        if (v) setExamDate(v);
        return true;
    }
    if (_wizStep === 1) {
        const cards = parseInt(/** @type {HTMLInputElement|null} */ (overlay.querySelector('#onboarding-daily-cards'))?.value || '', 10);
        const days = parseInt(/** @type {HTMLInputElement|null} */ (overlay.querySelector('#onboarding-weekly-days'))?.value || '', 10);
        if (!Number.isFinite(cards) || cards < 1 || !Number.isFinite(days) || days < 1 || days > 7) {
            showToast('목표를 확인해 주세요 — 카드 1장 이상, 주 1~7일', 'error');
            return false;
        }
        const g = getStudyGoals();
        setStudyGoals({ ...g, dailyCards: cards, weeklyStudyDays: days });
        return true;
    }
    return true;
}

/** 시작 안내 위저드 — 최초 방문 자동 표시와 도움말 메뉴 재열람 공용 */
export function showOnboardingModal() {
    const existing = document.getElementById('onboarding-overlay');
    if (existing) existing.remove();
    _wizStep = 0;

    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = '<div class="app-confirm-dialog dialog-card onboarding-dialog" role="dialog" aria-modal="true" aria-label="시작 안내"></div>';
    document.body.appendChild(overlay);
    _renderStep(overlay);
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
        safeSetItem(SEEN_KEY, '1');
    };
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { close(); return; }
        const btn = /** @type {Element|null} */ (e.target)?.closest('[data-onboarding]');
        if (!btn) return;
        const act = btn.getAttribute('data-onboarding');
        if (act === 'close' || act === 'skip') { close(); return; }
        if (act === 'prev') { _wizStep = Math.max(0, _wizStep - 1); _renderStep(overlay); return; }
        if (act === 'next') {
            if (!_commitStep(overlay)) return;
            _wizStep = Math.min(2, _wizStep + 1);
            _renderStep(overlay);
        }
    });
    const onKey = (e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(); }
    };
    document.addEventListener('keydown', onKey);
}

/** 앱 초기화 시 호출 — 학습 데이터가 없는 최초 방문에서만 자동 표시 */
export function maybeShowOnboarding() {
    if (safeGetItem(SEEN_KEY)) return;
    safeSetItem(SEEN_KEY, '1'); // 재표시 방지는 모달 표시 여부와 무관하게 먼저 기록
    const isReturning = RETURNING_USER_HINTS.some(k => safeGetItem(k) !== null);
    if (isReturning) return; // 이 기능 도입 전부터 쓰던 사용자 — 조용히 통과
    showOnboardingModal();
}
