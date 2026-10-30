// @spec LP-04,LP-05,LP-09
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseDemoData, daysUntil, computePlanPreview, subjectShares } from '../../../src/shell/landing.js';

const DEMO = {
    exams: [{
        id: 't', appName: 'PassOK 테스트',
        quiz: { items: [
            { question: 'Q1?', choices: ['a', 'b'], answer: 0, explanation: 'ex', citation: 'cit' },
            { question: 'Q2?', choices: ['a', 'b'], answer: 1 },
        ] },
        plan: { subjects: [{ name: '과목A', count: 300 }, { name: '과목B', count: 100 }], minLeadDays: 90 },
    }],
};

function setupDom() {
    document.body.innerHTML = `
      <main id="landing-main"></main>
      <section id="landing-demo-section" class="is-hidden">
        <div id="landing-quiz-slot"></div><div id="landing-plan-slot"></div>
      </section>
      <script type="application/json" id="landing-demo-data">${JSON.stringify(DEMO)}<\/script>
      <button id="landing-install-btn"></button>
      <span id="landing-version"></span>`;
}

describe('landing.js — 순수 함수', () => {
    it('parseDemoData — 내장 JSON 파싱·부재 시 null', () => {
        document.body.innerHTML = '';
        expect(parseDemoData()).toBeNull();
        document.body.innerHTML = `<script type="application/json" id="landing-demo-data">${JSON.stringify(DEMO)}<\/script>`;
        expect(parseDemoData().exams).toHaveLength(1);
        document.body.innerHTML = `<script type="application/json" id="landing-demo-data">{bad<\/script>`;
        expect(parseDemoData()).toBeNull();
    });
    it('daysUntil·computePlanPreview·subjectShares 스모크', () => {
        expect(daysUntil('2026-11-01', new Date(2026, 9, 25))).toBe(7);
        expect(computePlanPreview(90, 90).phases.length).toBeGreaterThan(0);
        expect(subjectShares([{ name: 'a', count: 1 }])).toEqual([{ name: 'a', count: 1, pct: 100 }]);
    });
});

describe('landing.js — DOM 위젯', () => {
    beforeEach(setupDom);
    afterEach(() => vi.restoreAllMocks());

    it('import 시 init이 데모 렌더 + 섹션 표시 + 버전 표기', async () => {
        vi.resetModules();
        window.APP_VERSION = 'v-test';
        await import('../../../src/shell/landing.js');
        expect(document.getElementById('landing-demo-section').classList.contains('is-hidden')).toBe(false);
        expect(document.querySelectorAll('.demo-choice').length).toBe(2);
        expect(document.getElementById('landing-version').textContent).toBe('v-test');
    });

    it('퀴즈 — 오답 선택 → 정답 표시·해설·인용, 완료 시 결과 CTA', async () => {
        vi.resetModules();
        await import('../../../src/shell/landing.js');
        // Q1: 오답(선지 b) 선택
        const wrong = document.querySelectorAll('.demo-choice')[1];
        wrong.click();
        expect(wrong.classList.contains('incorrect')).toBe(true);
        expect(document.querySelector('.demo-choice.correct')).toBeTruthy();
        expect(document.querySelector('.demo-cite').textContent).toContain('cit');
        // 다음 → Q2 정답 선택 → 결과
        document.querySelector('.demo-actions .btn').click();
        document.querySelectorAll('.demo-choice')[1].click();
        document.querySelector('.demo-actions .btn').click();
        expect(document.querySelector('.demo-result-score').textContent).toBe('1 / 2');
        expect(document.querySelector('.demo-result a').getAttribute('href')).toBe('./index.html?app=1');
    });

    it('계획 — 시험일 입력 → D-day·단계·과목 비중·CTA', async () => {
        vi.resetModules();
        await import('../../../src/shell/landing.js');
        const input = document.querySelector('.demo-plan-form input[type=date]');
        const future = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10);
        input.value = future;
        document.querySelector('.demo-plan-form .btn').click();
        expect(document.querySelector('.demo-dday').textContent).toMatch(/^D-\d+ · 잔여 \d+주$/);
        expect(document.querySelectorAll('.demo-phase').length).toBe(3);
        expect(document.querySelectorAll('.demo-subject').length).toBe(2);
        expect(document.querySelector('.demo-plan-result a').textContent).toContain('이 계획으로 시작하기');
        // 권장 리드타임 미만 → 압축 안내
        input.value = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
        document.querySelector('.demo-plan-form .btn').click();
        expect(document.querySelector('.demo-plan-note').textContent).toContain('압축 플랜');
        // 과거 날짜 → 입력 오류
        input.value = '2020-01-01';
        document.querySelector('.demo-plan-form .btn').click();
        expect(document.querySelector('.demo-plan-note').textContent).toContain('이후');
    });

    it('설치 CTA — deferred prompt 없으면 앱으로 이동 / 있으면 prompt()', async () => {
        vi.resetModules();
        await import('../../../src/shell/landing.js');
        const btn = document.getElementById('landing-install-btn');
        window.__deferredPrompt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
        btn.click();
        expect(window.__deferredPrompt === null || window.__deferredPrompt.prompt.mock.calls.length === 1).toBe(true);
    });
});
