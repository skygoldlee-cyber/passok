// tests/dom/exam-switching.dom.test.js — 멀티시험 전환 통합 시나리오
// @spec ES-01~05,ES-09,ES-10
// 목적: 비기본 시험(insadj) 활성 시 기능 플래그 게이팅·브랜딩·스토리지
//       네임스페이스가 시험 컨텍스트를 정확히 따르는지 회귀 검증.
//       (cosmetic 전용 UI가 insadj에 새어 나오지 않아야 한다)

import { describe, it, beforeEach, expect, vi } from 'vitest';

import { loadIndexHtml } from '../helpers.js';
import {
    getActiveExam, getActiveExamId, hasFeature, getExamAppName, scopedKey, unscopedKey,
} from '../../../src/exam-context.js';
import { applyFeatureFlags, applyExamBranding } from '../../../src/shell/app-shell.js';

const EXAMS = {
    exams: [
        {
            id: 'cosmetic', name: '맞춤형화장품 조제관리사', appName: 'Passmula',
            title: 'Passmula — 맞춤형화장품 조제관리사',
            logoMain: 'Pass', logoSub: 'mula', icon: 'fa-solid fa-wand-magic-sparkles',
            year: '2027', default: true,
            features: { formula: true, dictionary: true, calcPractice: true },
        },
        {
            id: 'insadj', name: '손해사정사', appName: 'PassOK 손해사정사', appNameEn: 'Passure',
            title: 'PassOK — 손해사정사 (Passure)',
            logoMain: 'PassOK', logoSub: '손해사정사 · Passure', icon: 'fa-solid fa-scale-balanced',
            year: '2027',
            features: { pomodoro: true, dictionary: true },
        },
    ],
};

describe('멀티시험 전환 — 비기본 시험 활성화', () => {
    beforeEach(() => {
        localStorage.clear();
        loadIndexHtml();
        // loadIndexHtml은 <body>만 주입 — iOS 설치명 메타는 실제 index.html <head>에
        // 존재하므로 동등한 노드를 픽스처에 준비한다.
        if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
            const m = document.createElement('meta');
            m.setAttribute('name', 'apple-mobile-web-app-title');
            document.head.appendChild(m);
        }
        window.EXAMS_LIST = EXAMS;
        vi.clearAllMocks();
    });

    it('insadj 선택 시 활성 시험 해석·기능 플래그가 insadj를 따른다', () => {
        localStorage.setItem('current_exam', 'insadj');

        expect(getActiveExamId()).toBe('insadj');
        expect(getActiveExam().name).toBe('손해사정사');
        // cosmetic 전용 기능 비활성
        expect(hasFeature('formula')).toBe(false);
        expect(hasFeature('calcPractice')).toBe(false);
        // insadj 보유 기능 활성
        expect(hasFeature('pomodoro')).toBe(true);
        expect(hasFeature('dictionary')).toBe(true);
        expect(getExamAppName()).toBe('PassOK 손해사정사');
    });

    it('applyExamBranding — iOS 설치명은 시험 무관 ' + 'PassOK' + ' 단일 정체성', () => {
        localStorage.setItem('current_exam', 'insadj');
        applyExamBranding();

        const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        expect(appleTitle).not.toBeNull();
        // 단일 앱 정책 — webmanifest name과 동일하게 'PassOK' 고정 (어느 시험에서 추가해도 같은 라벨)
        expect(appleTitle.getAttribute('content')).toBe('PassOK');

        localStorage.setItem('current_exam', 'cosmetic');
        applyExamBranding();
        expect(appleTitle.getAttribute('content')).toBe('PassOK');
    });

    it('applyFeatureFlags — insadj에서 formula 게이트 요소 숨김, dictionary·공용 매뉴얼 유지', () => {
        localStorage.setItem('current_exam', 'insadj');
        applyFeatureFlags();

        const hidden = (sel) => {
            const nodes = document.querySelectorAll(`[data-feature="${sel}"]`);
            expect(nodes.length).toBeGreaterThan(0);
            return [...nodes].every((n) => n.classList.contains('is-hidden'));
        };
        expect(hidden('formula')).toBe(true);   // 실무 매뉴얼 링크 등
        expect(hidden('dictionary')).toBe(false); // insadj 보유 기능은 유지
        // 사용자 매뉴얼은 앱 공용 — 어떤 시험에서도 게이트 없이 노출
        const manualLinks = document.querySelectorAll('[data-click="ManualViewer.openManual"]');
        expect(manualLinks.length).toBeGreaterThan(0);
        for (const n of manualLinks) {
            expect(n.hasAttribute('data-feature')).toBe(false);
            expect(n.classList.contains('is-hidden')).toBe(false);
        }
        // 시험 전환 버튼은 시험 수(2개) 기반으로 노출
        expect(hidden('examSwitch')).toBe(false);
    });

    it('applyExamBranding — 미선택이면 시험 브랜드 대신 플랫폼 브랜드', () => {
        localStorage.removeItem('current_exam');
        applyExamBranding();

        expect(document.title).toBe('PassOK');
        const logoMain = document.querySelector('.logo-text h1');
        const logoSub = document.querySelector('.logo-text span');
        if (logoMain) expect(logoMain.textContent).toBe('PassOK');
        if (logoSub) expect(logoSub.textContent).toBe('');
    });

    it('applyExamBranding — 타이틀·로고가 insadj 값으로 갱신', () => {
        localStorage.setItem('current_exam', 'insadj');
        applyExamBranding();

        expect(document.title).toBe('PassOK — 손해사정사 (Passure)');
        const logoMain = document.querySelector('.logo-text h1');
        const logoSub = document.querySelector('.logo-text span');
        if (logoMain) expect(logoMain.textContent).toBe('PassOK');
        if (logoSub) expect(logoSub.textContent).toBe('손해사정사 · Passure');
    });

    it('scopedKey — 진도 키는 시험 접두사, 전역 키는 무시됨', () => {
        localStorage.setItem('current_exam', 'insadj');
        expect(scopedKey('fc_memorized')).toBe('insadj:fc_memorized');
        expect(unscopedKey('insadj:fc_memorized')).toBe('fc_memorized');
        // 다른 시험 소속 키는 unscope 불가
        expect(unscopedKey('cosmetic:fc_memorized')).toBe(null);
        // 전역 키는 접두 없음
        expect(scopedKey('appTheme')).toBe('appTheme');
    });

    it('선택 없으면 기본 시험(cosmetic)으로 해석', () => {
        expect(getActiveExamId()).toBe('cosmetic');
        expect(hasFeature('formula')).toBe(true);
        expect(scopedKey('fc_memorized')).toBe('cosmetic:fc_memorized');
    });
});
