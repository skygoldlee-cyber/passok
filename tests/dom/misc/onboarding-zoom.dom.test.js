// tests/dom/onboarding-zoom.dom.test.js — 첫 방문 시작 안내 + 이미지 라이트박스
// @spec UX-FB-05, TR-20, OB-01
// UX-FB-05: 학습 데이터 없는 최초 방문 1회만 표시 — 재방문 사용자는 방해 금지
// TR-20: .reader-img 클릭 → 전체화면 확대 모달, 닫기 시 상태 정리 (데스크탑 전용)

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    trapFocus: vi.fn(() => () => {}),
    showToast: vi.fn(),
}));

vi.mock('../../../src/exam-context.js', () => ({
    getExamAppName: () => 'Passmula',
    getMinExamLeadDays: () => 90,
    getReadThroughDays: () => 30,
    getReadDayShare: () => 0.2,
    getActiveSubjectCount: () => 4,
}));

// state.js의 safeGetItem/safeSetItem을 localStorage 위임으로 대체
vi.mock('../../../src/state.js', () => ({
    safeGetItem: (k) => localStorage.getItem(k),
    safeSetItem: (k, v) => localStorage.setItem(k, v),
}));

import { showOnboardingModal, maybeShowOnboarding } from '../../../src/shell/onboarding.js';
import { openImageZoom, closeImageZoom, attachImageZoomIn } from '../../../src/reader/image-zoom.js';

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
});

describe('UX-FB-05 첫 방문 시작 안내', () => {
    it('학습 데이터가 없으면 위저드를 1회 표시하고 seen 플래그를 기록한다', () => {
        maybeShowOnboarding();
        expect(document.getElementById('onboarding-overlay')).toBeTruthy();
        expect(localStorage.getItem('onboarding_seen_v1')).toBe('1');
        // 1단계: 시험일 입력 필드
        expect(document.getElementById('onboarding-exam-date')).toBeTruthy();
        expect(document.querySelectorAll('.onboarding-dot')).toHaveLength(3);
    });

    it('위저드 진행: 시험일 → 목표 → 완료 요약 (OB-01)', () => {
        showOnboardingModal();
        const overlay = document.getElementById('onboarding-overlay');

        // ① 시험일 입력 → 다음 → 저장
        const dateInput = document.getElementById('onboarding-exam-date');
        dateInput.value = '2027-03-15';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        overlay.querySelector('[data-onboarding="next"]').click();
        expect(localStorage.getItem('exam_date')).toBe('2027-03-15');
        expect(document.getElementById('onboarding-daily-cards')).toBeTruthy();

        // ② 목표 입력 → 다음 → 저장
        document.getElementById('onboarding-daily-cards').value = '30';
        document.getElementById('onboarding-weekly-days').value = '6';
        overlay.querySelector('[data-onboarding="next"]').click();
        const goals = JSON.parse(localStorage.getItem('study_goals'));
        expect(goals.dailyCards).toBe(30);
        expect(goals.weeklyStudyDays).toBe(6);

        // ③ 완료 단계 — 첫 학습 CTA와 요약
        expect(overlay.textContent).toContain('D-');
        expect(overlay.querySelector('[data-click="startSubjectStudy"]')).toBeTruthy();
        expect(overlay.querySelector('[data-onboarding="prev"]')).toBeTruthy();
    });

    it('안내문은 appName 뒤 조사 변화가 필요 없는 표현을 쓴다 (모음 종결 이름도 깨지지 않음)', () => {
        showOnboardingModal();
        const body = document.querySelector('.onboarding-step-body');
        // getExamAppName()='Passmula' 목 — 구 코드의 "Passmula이" 형태는 금지
        expect(body.textContent).toContain('Passmula에서');
        expect(body.textContent).not.toContain('Passmula이');
    });

    it('위저드: 잘못된 목표 입력은 진행을 막고 이전 버튼으로 되돌아간다', () => {
        showOnboardingModal();
        const overlay = document.getElementById('onboarding-overlay');
        overlay.querySelector('[data-onboarding="next"]').click(); // 시험일 미입력 → 그대로 2단계
        document.getElementById('onboarding-weekly-days').value = '9'; // 범위 초과
        overlay.querySelector('[data-onboarding="next"]').click();
        expect(document.getElementById('onboarding-weekly-days')).toBeTruthy(); // 진행 안 됨
        overlay.querySelector('[data-onboarding="prev"]').click();
        expect(document.getElementById('onboarding-exam-date')).toBeTruthy();
    });

    it('기존 사용자(학습 키 존재)는 플래그만 기록하고 모달을 띄우지 않는다', () => {
        localStorage.setItem('quiz_results', '{}');
        maybeShowOnboarding();
        expect(document.getElementById('onboarding-overlay')).toBeNull();
        expect(localStorage.getItem('onboarding_seen_v1')).toBe('1');
    });

    it('seen 플래그가 있으면 재표시하지 않는다', () => {
        localStorage.setItem('onboarding_seen_v1', '1');
        maybeShowOnboarding();
        expect(document.getElementById('onboarding-overlay')).toBeNull();
    });

    it('설정 메뉴 재열람 경로 — showOnboardingModal은 항상 표시한다', () => {
        localStorage.setItem('quiz_results', '{}');
        showOnboardingModal();
        const dialog = document.querySelector('#onboarding-overlay [role="dialog"]');
        expect(dialog).toBeTruthy();
        expect(dialog.getAttribute('aria-label')).toBe('시작 안내');
    });

    it('Escape 키로 위저드가 닫히고 seen 플래그가 기록된다', async () => {
        vi.useFakeTimers();
        try {
            showOnboardingModal();
            const overlay = document.getElementById('onboarding-overlay');
            expect(overlay).toBeTruthy();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(overlay.classList.contains('is-visible')).toBe(false);
            expect(localStorage.getItem('onboarding_seen_v1')).toBe('1');
            // 닫기 전이 타이머: 포커스 해제 + 오버레이 제거
            vi.advanceTimersByTime(300);
            expect(document.getElementById('onboarding-overlay')).toBeNull();
            // 배경 클릭 닫기 경로
            showOnboardingModal();
            const overlay2 = document.getElementById('onboarding-overlay');
            overlay2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(overlay2.classList.contains('is-visible')).toBe(false);
            vi.advanceTimersByTime(300);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('TR-20 이미지 라이트박스', () => {
    it('openImageZoom이 전체화면 모달에 이미지를 복제해 표시한다', () => {
        const img = document.createElement('img');
        img.src = 'data/exams/cosmetic/img.png';
        img.className = 'reader-img';
        document.body.appendChild(img);

        openImageZoom(img);

        const modal = document.getElementById('reader-img-zoom-modal');
        expect(modal).toBeTruthy();
        expect(modal.classList.contains('is-hidden')).toBe(false);
        expect(modal.querySelector('.img-zoom-target')).toBeTruthy();

        closeImageZoom();
        expect(modal.classList.contains('is-hidden')).toBe(true);
    });

    it('attachImageZoomIn은 컨테이너 위임으로 .reader-img 클릭을 연결한다', () => {
        const root = document.createElement('div');
        const img = document.createElement('img');
        img.src = 'x.png';
        img.className = 'reader-img';
        root.appendChild(img);
        document.body.appendChild(root);

        attachImageZoomIn(root);
        img.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
        img.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 }));

        expect(document.getElementById('reader-img-zoom-modal')).toBeTruthy();
        // 드래그(10px 이상)는 클릭으로 취급하지 않는다
        closeImageZoom();
        document.getElementById('reader-img-zoom-modal')?.remove();
        img.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
        img.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 0 }));
        expect(document.getElementById('reader-img-zoom-modal')?.classList.contains('is-hidden') ?? true).toBe(true);
    });
});
