// tests/dom/app-shell.dom.test.js — 앱 셸 뷰포트 높이 동기화 + 가상 키보드 가드
// @spec UX-PWA-05,UX-FORM-04
// 목적: initViewportHeight()가 핀치 줌(visualViewport.scale !== 1) 중
//       --app-height를 축소 보고값으로 덮어쓰지 않는지 회귀 검증.
//       줌 중 height는 배율만큼 축소 보고되므로 그대로 쓰면 .app-container가
//       위쪽으로 찌그러져 앱 셸 하단(교재리더 본문 하단 포함)이 잘려 보인다.
//       initKeyboardGuard()는 키보드성 뷰포트 급감 시 body.kb-open을 토글해
//       하단 고정 크롬(탭 바·sticky 행)이 포커스 입력을 가리지 않게 한다.

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import { initViewportHeight, initKeyboardGuard } from '../../../src/shell/app-shell.js';

const appHeight = () => document.documentElement.style.getPropertyValue('--app-height');

describe('initViewportHeight — 핀치 줌 가드', () => {
    let vv;

    beforeEach(() => {
        document.documentElement.style.removeProperty('--app-height');
        // jsdom에는 visualViewport가 없으므로 EventTarget 스텁으로 주입
        vv = new EventTarget();
        vv.height = 800;
        vv.scale = 1;
        Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true, writable: true });
    });

    it('scale=1이면 visualViewport.height로 --app-height를 동기화한다', () => {
        initViewportHeight();
        expect(appHeight()).toBe('800px');

        vv.height = 600; // 키보드 개폐 등 실측 높이 변동
        vv.dispatchEvent(new Event('resize'));
        expect(appHeight()).toBe('600px');
    });

    it('핀치 줌(scale>1) 중 resize는 --app-height를 갱신하지 않는다', () => {
        initViewportHeight();
        expect(appHeight()).toBe('800px');

        vv.scale = 2;
        vv.height = 400; // 줌으로 축소 보고된 시각 뷰포트
        vv.dispatchEvent(new Event('resize'));
        expect(appHeight()).toBe('800px');

        // 줌 아웃으로 복귀하면 정상 동기화 재개
        vv.scale = 1;
        vv.height = 800;
        vv.dispatchEvent(new Event('resize'));
        expect(appHeight()).toBe('800px');
    });
});

// ==================== initKeyboardGuard — 가상 키보드 크롬 재배치 (UX-FORM-04) ====================

describe('initKeyboardGuard — body.kb-open 토글', () => {
    let vv, input;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.classList.remove('kb-open');
        document.body.innerHTML = '<input id="kb-test-input">';
        input = document.getElementById('kb-test-input');
        input.scrollIntoView = vi.fn();
        vv = new EventTarget();
        vv.height = 800;
        vv.scale = 1;
        vv.offsetTop = 0;
        Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
        initKeyboardGuard();
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('kb-open');
    });

    it('텍스트 포커스 + 뷰포트 급감(키보드 점유) 시 kb-open을 부여한다', () => {
        input.focus();
        vv.height = 500; // 키보드가 하단 300px 점유 (resizes-visual)
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(true);

        // 레이아웃 점프 보정 — 포커스 필드 재정렬 예약
        vi.advanceTimersByTime(400);
        expect(input.scrollIntoView).toHaveBeenCalled();
    });

    it('기준 높이 대비 급감(resizes-content 경로)으로도 kb-open을 감지한다', () => {
        input.focus();
        vv.height = 500;
        Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true, writable: true });
        // occupied = 0 이어도 baseline(800) 대비 축소로 판정
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(true);
    });

    it('소규모 높이 변동(주소창 토글 등)은 kb-open으로 오판하지 않는다', () => {
        input.focus();
        vv.height = 720; // 80px 변동 — 임계 150px 미만
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(false);
    });

    it('텍스트 입력이 아닌 요소 포커스는 kb-open을 부여하지 않는다', () => {
        const btn = document.createElement('button');
        document.body.appendChild(btn);
        btn.focus();
        vv.height = 500;
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(false);
    });

    it('기준 높이가 초기 과대 보고로 오염돼도 innerHeight 상한으로 복구한다', () => {
        // 레이아웃 전 측정 등으로 baselineH가 innerHeight보다 커진 경우
        // (e2e: addInitScript 시점 innerHeight 과대값) — kb-open이 고착되면 안 됨
        vv.height = 2000;
        vv.dispatchEvent(new Event('resize')); // 비집중 상태의 과대 관측 → innerHeight(800)로 클램프
        input.focus();
        vv.height = 500;
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(true);
        vv.height = 800;
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(false);
    });

    it('포커스 해제 또는 높이 복원 시 kb-open을 해제한다', () => {
        input.focus();
        vv.height = 500;
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(true);

        // 키보드가 닫혀 높이 복원
        vv.height = 800;
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(false);

        // 다시 열고 포커스 해제
        vv.height = 500;
        vv.dispatchEvent(new Event('resize'));
        expect(document.body.classList.contains('kb-open')).toBe(true);
        input.blur();
        vi.advanceTimersByTime(1); // focusout 지연 판정
        expect(document.body.classList.contains('kb-open')).toBe(false);
    });
});

// ==================== applyUiTextLabels — 플랫폼 공통 라벨 해석 ====================

import { DataLoader } from '../../../src/content/data-loader.js';
import { applyUiTextLabels } from '../../../src/shell/app-shell.js';

describe('applyUiTextLabels — 공통 기본값 + 시험 오버라이드', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        DataLoader.registry = null;
    });

    it('uiText 미선언 시험도 공통 표준 라벨로 해석한다', () => {
        document.body.innerHTML = `
            <span data-uitext="quiz">기출 퀴즈</span>
            <span data-uitext="review">오답/중요 복습</span>
            <span data-uitext="calendar">학습 캘린더</span>
            <span data-uitext="practice-manual">실무 매뉴얼</span>`;
        DataLoader.registry = { uiText: {} };
        applyUiTextLabels();
        const labels = [...document.querySelectorAll('[data-uitext]')].map(e => e.textContent);
        expect(labels).toEqual(['퀴즈', '오답 및 중요 복습', '캘린더', '실무 매뉴얼']);
    });

    it('시험 manifest.uiText가 공통값보다 우선한다', () => {
        document.body.innerHTML = `
            <span data-uitext="flashcard:nav">플래시카드</span>
            <span data-uitext="dictionary:nav">사전</span>`;
        DataLoader.registry = { uiText: {
            flashcard: { nav: '단어카드' },
            dictionary: { title: '성분사전', nav: '성분사전' },
        } };
        applyUiTextLabels();
        const labels = [...document.querySelectorAll('[data-uitext]')].map(e => e.textContent);
        expect(labels).toEqual(['단어카드', '성분사전']);
    });

    it('선언·공통 어느 쪽에도 없는 키는 템플릿 문구를 유지한다', () => {
        document.body.innerHTML = '<span data-uitext="future-key">미래 라벨</span>';
        DataLoader.registry = { uiText: {} };
        applyUiTextLabels();
        expect(document.querySelector('[data-uitext]').textContent).toBe('미래 라벨');
    });
});
