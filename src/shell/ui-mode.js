// src/ui-mode.js — 학습/실무 UI 모드 전환
// @spec UM-01~05, DA-20
// 합격 후 실무 중심 사용자를 위해 학습 전용 네비게이션을 접고 실무 작업실을 랜딩으로 둔다.
// 모드는 시험과 무관한 기기 설정(GLOBAL_KEYS) — 'ui_mode': 'study' | 'practice'.
import { state, safeGetItem, safeSetItem } from '../core/state.js';
import { STORAGE_KEYS } from '../core/storage-keys.js';
import { isPracticeCapable, getPracticeLanding, getEnabledPracticeFeatures } from '../practice-registry.js';
import { getCurrentExamId, getActiveExam } from '../core/exam-context.js';
import { switchView } from '../views/navigation.js';
import { showToast } from '../ui-utils.js';

// 실무 모드에서 기본으로 숨기는 학습 전용 뷰 — 전환 시 현재 뷰가 여기 속하면 랜딩으로 이동
const STUDY_ONLY_VIEWS = new Set([
    'dashboard-view',
    'flashcard-view',
    'quiz-view',
    'trainer-view',
    'review-view',
    'exam-view',
    'textbook-reader-view',
    'textbook-view',
    'calendar-view',
]);

export function getUiMode() {
    return safeGetItem(STORAGE_KEYS.UI_MODE) === 'practice' ? 'practice' : 'study';
}

export function isPracticeMode() {
    // 실무 피처 미보유 시험에서는 실무 모드를 study로 강제 간주 — ui_mode는 전역 키라
    // 시험 간 잔존하며, 게이트 없이 적용하면 학습 nav만 숨겨지는 반쪽 상태가 된다.
    return getUiMode() === 'practice' && isPracticeCapable();
}

/** body 클래스·토글 라벨·aria 상태를 저장된 모드와 동기화한다. */
export function applyUiMode() {
    const practice = isPracticeMode();
    document.body.classList.toggle('ui-mode-practice', practice);
    // 토글이 두 곳(사이드바 푸터/태블릿 상단 바·모바일 탭바 — UX-NAV-15)에 있으므로 라벨/aria를 일괄 동기화
    document.querySelectorAll('.ui-mode-label').forEach(el => {
        el.textContent = practice ? '실무 모드' : '학습 모드';
    });
    document.querySelectorAll('[data-click="toggleUiMode"]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(practice));
    });
    // 실무 브랜드 라벨 — 모바일 탭바 실무 그룹에 practiceName(exams.json 선언) 노출.
    // 모바일은 #view-subtitle가 숨겨져 있어 서브타이틀 병기가 닿지 않는 표면이다.
    const practiceName = getActiveExam()?.practiceName || '';
    document.querySelectorAll('.practice-brand-label').forEach(el => {
        el.textContent = practice ? practiceName : '';
    });
}

/** 글자 크기 스케일 — 시니어 대응. html 클래스 font-lg/font-xl로 토큰 기반 배율 적용 */
export function applyFontScale() {
    const scale = safeGetItem(STORAGE_KEYS.UI_FONT_SCALE) || '';
    document.documentElement.classList.toggle('font-lg', scale === 'lg');
    document.documentElement.classList.toggle('font-xl', scale === 'xl');
    document.querySelectorAll('[data-click="toggleFontSize"]').forEach(el => {
        const btn = /** @type {HTMLButtonElement} */ (el);
        const label = btn.querySelector('.font-scale-label') || btn;
        label.textContent = scale === 'lg' ? '가 글자 크게' : scale === 'xl' ? '가 글자 더 크게' : '가 글자 크게';
        btn.setAttribute('aria-pressed', String(!!scale));
        btn.title = scale === 'xl' ? '글자 크기: 최대 — 눌러 원래 크기로' : scale === 'lg' ? '글자 크기: 크게 — 더 크게 누르기' : '글자 크기 키우기 — 시니어 읽기 편의';
    });
}

/** 글자 크기 순환: 보통 → 크게 → 더 크게 → 보통 */
export function toggleFontSize() {
    const cur = safeGetItem(STORAGE_KEYS.UI_FONT_SCALE) || '';
    const next = cur === '' ? 'lg' : cur === 'lg' ? 'xl' : '';
    safeSetItem(STORAGE_KEYS.UI_FONT_SCALE, next);
    applyFontScale();
    showToast(next === '' ? '글자 크기를 원래대로 돌렸습니다.' : next === 'lg' ? '글자를 크게 표시합니다.' : '글자를 더 크게 표시합니다.');
}

/** 앱 초기화 시 호출 — 모드 반영 후 실무 모드면 실무 작업실로 랜딩한다. */
export function initUiMode() {
    applyUiMode();
    applyFontScale();
    if (isPracticeMode()) {
        switchView(getPracticeLanding(), { scrollTop: true });
    }
}

export function toggleUiMode() {
    if (!getCurrentExamId()) { showToast('먼저 학습할 시험을 선택하세요', 'info'); return; } // 미선택 차단
    if (!isPracticeCapable()) return; // 토글 버튼은 data-feature="practiceMode"로 숨김 — 직접 호출 방어
    const next = isPracticeMode() ? 'study' : 'practice';
    safeSetItem(STORAGE_KEYS.UI_MODE, next);
    applyUiMode();
    if (next === 'practice' && STUDY_ONLY_VIEWS.has(state.currentView)) {
        switchView(getPracticeLanding(), { scrollTop: true });
    } else if (next === 'study' && getEnabledPracticeFeatures().some(f => f.viewId === state.currentView)) {
        switchView('dashboard-view', { scrollTop: true }); // 실무→학습은 대시보드 랜딩 (@spec DA-22 모드 전환 랜딩)
    }
    showToast(next === 'practice'
        ? '실무 모드로 전환했습니다. 학습 기능으로 돌아가려면 모드 탭을 다시 누르세요.'
        : '학습 모드로 전환했습니다.');
}
