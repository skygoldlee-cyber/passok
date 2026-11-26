// tests/dom/reader/quickcheck.dom.test.js — 리더 "이해도 점검" 퀵체크 (AI-43)
// @spec AI-43
// 검증: 오버레이 정본(quickcheck.json)의 `<subj>:§N.M` 키가 있는 번호 절만
//       토글 렌더 · OX 즉시 채점(정오 표시 + 오답 시 §앵커 드릴 링크) ·
//       단답형 정답 공개 + 자가 채점(몰랐어요 → 드릴 링크) · 토글 접힘/펼침

import { describe, it, expect, beforeEach } from 'vitest';
import { buildSectionsHtml } from '../../../src/views/reader/reader-render.js';
import { buildSectionDisplayTitles } from '../../../src/reader/reader-toc.js';
import {
    toggleQuickCheck, answerQuickCheck, revealQuickCheck, selfGradeQuickCheck,
} from '../../../src/reader/quickcheck.js';

const QC = {
    'subj:§1.1': [
        { type: 'ox', q: '화장품법은 보건위생상 위해 방지가 목적이다.', a: 'O' },
        { type: 'sa', q: '화장품법의 목적 조항은?', a: '제1조' },
    ],
};

/** @param {{ title: string, content?: string }[]} sections */
function render(sections) {
    const chapter = { chapterKey: 'ch-test', sections };
    const html = buildSectionsHtml(chapter, {
        subjId: 'subj', chapterIdx: 0,
        displayTitles: buildSectionDisplayTitles(sections),
        bookmarks: [], chapterRefPath: '', subjRefFiles: [], subjDirName: '',
        glossaryItems: [], notes: {}, quickchecks: QC,
    });
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
}

const CH1 = { title: '📚 Chapter 01. 첫 장', content: '장 서두' };
const SEC1 = { title: '1. 첫 번째 절', content: '본문' };
const SEC2 = { title: '2. 두 번째 절', content: '본문' };

beforeEach(() => { document.body.innerHTML = ''; });

describe('quickcheck — 이해도 점검 (AI-43)', () => {
    it('정본 키가 있는 절만 퀵체크 렌더 + 토글 펼침', () => {
        const host = render([CH1, SEC1, SEC2]);
        const cards = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.reader-section-card')]);
        const qc = cards[1].querySelector('.quickcheck');
        expect(qc).toBeTruthy();
        expect(qc.getAttribute('data-qc')).toBe('subj:§1.1');
        expect(cards[2].querySelector('.quickcheck')).toBeNull();   // 정본 없는 절
        expect(cards[0].querySelector('.quickcheck')).toBeNull();   // Chapter 헤더

        const body = /** @type {HTMLElement} */ (qc.querySelector('.qc-body'));
        expect(body.hidden).toBe(true);
        toggleQuickCheck('subj:§1.1');
        expect(body.hidden).toBe(false);
        toggleQuickCheck('subj:§1.1');
        expect(body.hidden).toBe(true);
    });

    it('OX 즉시 채점 — 정답 표시, 오답 시 드릴 링크 노출', () => {
        render([CH1, SEC1]);
        answerQuickCheck('subj:§1.1', 0, 'O');
        const item = /** @type {HTMLElement} */ (document.querySelector('[data-qc-item="0"]'));
        const res = /** @type {HTMLElement} */ (item.querySelector('.qc-result'));
        expect(res.hidden).toBe(false);
        expect(res.textContent).toContain('정답');
        expect(/** @type {HTMLElement} */ (item.querySelector('.qc-drill')).hidden).toBe(true);

        answerQuickCheck('subj:§1.1', 0, 'X');  // 이미 채점됐어도 핸들러 재호출 — 오답 경로 검증
        expect(res.textContent).toContain('오답');
        const drill = /** @type {HTMLElement} */ (item.querySelector('.qc-drill'));
        expect(drill.hidden).toBe(false);
        expect(drill.querySelector('a').getAttribute('href')).toBe('#/trainer/concept/1.1');
    });

    it('단답형 — 정답 공개 후 자가 채점, 몰랐어요 시 드릴 링크', () => {
        render([CH1, SEC1]);
        const item = /** @type {HTMLElement} */ (document.querySelector('[data-qc-item="1"]'));
        const ans = /** @type {HTMLElement} */ (item.querySelector('.qc-answer'));
        expect(ans.hidden).toBe(true);
        revealQuickCheck('subj:§1.1', 1);
        expect(ans.hidden).toBe(false);
        expect(ans.textContent).toContain('제1조');

        selfGradeQuickCheck('subj:§1.1', 1, false);
        const drill = /** @type {HTMLElement} */ (ans.querySelector('.qc-drill'));
        expect(drill.hidden).toBe(false);
        expect(drill.querySelector('a').getAttribute('href')).toBe('#/trainer/concept/1.1');
    });
});
