// tests/dom/reader/reader-concept-link.dom.test.js — 리더 절 문항 풀기 CTA (DR-11)
// @spec DR-08,DR-11
// 검증: 📚 Chapter NN. 이후 "M." 번호 절 카드 말미에 #/trainer/concept/N.M 링크(H) ·
//       Chapter 헤더·비번호 절(요약·확인문제)·첫 Chapter 이전 서두는 링크 없음(H) ·
//       N.M 2단계 소제목은 버튼 없음(H) · 장 경계 이후 번호는 새 장 번호로 리셋(H)

import { describe, it, expect } from 'vitest';
import { buildSectionsHtml } from '../../../src/views/reader/reader-render.js';
import { buildSectionDisplayTitles } from '../../../src/reader/reader-toc.js';

/**
 * @param {{ title: string, content?: string }[]} sections
 * @returns {HTMLElement[]} 섹션 카드 요소 목록
 */
function renderCards(sections) {
    const chapter = { chapterKey: 'ch-test', sections };
    const html = buildSectionsHtml(chapter, {
        subjId: 'subj', chapterIdx: 0,
        displayTitles: buildSectionDisplayTitles(sections),
        bookmarks: [], chapterRefPath: '', subjRefFiles: [], subjDirName: '',
        glossaryItems: [], notes: {},
    });
    const host = document.createElement('div');
    host.innerHTML = html;
    return /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.reader-section-card')]);
}

const CH1 = { title: '📚 Chapter 01. 첫 장', content: '장 서두' };
const SEC1 = { title: '1. 첫 번째 절', content: '본문' };
const SEC2 = { title: '2. 두 번째 절', content: '본문' };

describe('reader-concept-link — 절 문항 풀기 CTA', () => {
    it('Chapter 이후 번호 절에 §N.M 딥링크 렌더', () => {
        const cards = renderCards([CH1, SEC1, SEC2]);
        expect(cards).toHaveLength(3);
        const link = cards[1].querySelector('.reader-concept-link');
        expect(link).toBeTruthy();
        expect(link.getAttribute('href')).toBe('#/trainer/concept/1.1');
        expect(link.textContent).toContain('이 절 문항 풀기');
        expect(link.textContent).toContain('§1.1');
        expect(cards[2].querySelector('.reader-concept-link').getAttribute('href'))
            .toBe('#/trainer/concept/1.2');
    });

    it('Chapter 헤더·비번호 절·Chapter 이전 서두는 링크 없음', () => {
        const cards = renderCards([
            { title: '출제기준 챕터 구성', content: '서두' },
            CH1,
            { title: '📌 챕터 핵심 요약', content: '요약' },
            SEC1,
            { title: '✅ 확인문제', content: '문제' },
        ]);
        expect(cards[0].querySelector('.reader-concept-link')).toBeNull(); // 서두
        expect(cards[1].querySelector('.reader-concept-link')).toBeNull(); // Chapter 헤더
        expect(cards[2].querySelector('.reader-concept-link')).toBeNull(); // 비번호 절
        expect(cards[3].querySelector('.reader-concept-link').getAttribute('href'))
            .toBe('#/trainer/concept/1.1');
        expect(cards[4].querySelector('.reader-concept-link')).toBeNull(); // 비번호 절
    });

    it('2단계 소제목(1.1)은 버튼 없음, 새 Chapter에서 번호 리셋', () => {
        const cards = renderCards([
            CH1,
            SEC1,
            { title: '1.1 세부 항목', content: '본문' },
            { title: '📚 Chapter 02. 둘째 장', content: '장 서두' },
            { title: '3. 세 번째 절', content: '본문' },
        ]);
        expect(cards[2].querySelector('.reader-concept-link')).toBeNull(); // 1.1 소제목
        expect(cards[4].querySelector('.reader-concept-link').getAttribute('href'))
            .toBe('#/trainer/concept/2.3'); // 장 번호는 새 챕터 기준
    });
});
