// tests/dom/app-shell.dom.test.js — 앱 셸 뷰포트 높이 동기화
// @spec UX-PWA-05
// 목적: initViewportHeight()가 핀치 줌(visualViewport.scale !== 1) 중
//       --app-height를 축소 보고값으로 덮어쓰지 않는지 회귀 검증.
//       줌 중 height는 배율만큼 축소 보고되므로 그대로 쓰면 .app-container가
//       위쪽으로 찌그러져 앱 셸 하단(교재리더 본문 하단 포함)이 잘려 보인다.

import { describe, it, beforeEach, expect } from 'vitest';

import { initViewportHeight } from '../../../src/shell/app-shell.js';

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
