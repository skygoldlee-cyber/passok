// tests/dom/misc/nonexam-pack.dom.test.js — 비시험 팩(과정·교육) 표면 소거·uiText 오버라이드 검증
// @spec none
import { describe, it, expect, beforeEach } from 'vitest';
import { loadIndexHtml, stubRegistry, resetStudyState, el } from '../helpers.js';
import { DataLoader } from '../../../src/content/data-loader.js';
import { populateExamCards } from '../../../src/shell/app-dashboard.js';

const SUBJ = { key: 'mod1', name: '모듈1', order: 1 };
const EXAM = { key: 'ex1', subject: 'mod1', file: 'q.md', stats: { questions: 10 } };

describe('비시험 팩 — 통합 모의고사 카드 소거·uiText 오버라이드', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ]);
    });

    it('integratedExam 미선언 — 통합 카드 is-hidden (과정 팩 표면 소거)', () => {
        DataLoader.registry.exams = [];
        populateExamCards();
        expect(el('integrated-exam-card').classList.contains('is-hidden')).toBe(true);
    });

    it('integratedExam 선언 — 카드 표시 + 총 문항수·시간 타이틀', () => {
        DataLoader.registry.exams = [EXAM];
        DataLoader.registry.integratedExam = { questionsPerSubject: { mod1: 20 }, examTimeMin: 30 };
        populateExamCards();
        expect(el('integrated-exam-card').classList.contains('is-hidden')).toBe(false);
        expect(el('integrated-exam-title').textContent).toContain('20제');
        expect(el('integrated-exam-btn').textContent).toContain('30분');
    });

    it('uiText.exam.purpose + uiText.integrated — 과정 어휘 오버라이드', () => {
        DataLoader.registry.exams = [EXAM];
        DataLoader.registry.integratedExam = { questionsPerSubject: { mod1: 10 }, examTimeMin: 10 };
        DataLoader.registry.uiText = {
            exam: { purpose: '과정 평가 — 모듈별 문제를 풀어봅니다.' },
            integrated: { title: '종합 평가', desc: '모듈 전체를 한 번에 평가합니다', btn: '평가 시작' },
        };
        populateExamCards();
        expect(el('exam-view-subtitle').textContent).toBe('과정 평가 — 모듈별 문제를 풀어봅니다.');
        expect(el('integrated-exam-title').textContent).toContain('종합 평가');
        expect(el('integrated-exam-card').querySelector('.highlight-card-desc').textContent).toBe('모듈 전체를 한 번에 평가합니다');
        expect(el('integrated-exam-btn').textContent).toContain('평가 시작');
    });
});
