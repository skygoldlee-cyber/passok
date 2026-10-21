// tests/dom/glossary-search.dom.test.js — 용어 정의 검색 그룹 + 용어집 어휘 주입
// @spec TS-15,TS-16
// 검증: 쿼리(동의어 변형 포함)가 용어집 키워드와 경계 매치되면 '용어 정의' 카드가
//       본문 결과(교재→참조자료→문제은행)보다 앞에 렌더링되고, 참조문서 출처는
//       data-ref-html 링크로 연결된다. 과목 필터는 카드의 과목 귀속에도 적용된다.
//       또한 용어집 키워드가 TS-13 경계 어휘에 주입돼 저빈도 도메인 복합어의
//       경계를 인정한다 (주입 없으면 '기초화장품'의 '화장품'은 부분 일치로 강등).

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));

import {
    loadIndexHtml, el, stubRegistry, resetStudyState,
} from '../helpers.js';
import {
    renderTextbookSearch, setTextbookFilter,
} from '../../../src/views/textbook-search.js';

// '과목1' 용어집 항목(시행령 등)은 SUBJECT_DIR_MAP 역매핑으로 subj key 'law'에 귀속
const SUBJ_LAW = {
    key: 'law',
    name: '화장품법',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: '1장 총칙',
        filePath: 'content/exams/cosmetic/교재/law.md',
        sections: [
            { title: '용어의 정의', content: '이 법에서 사용하는 용어의 뜻은 시행령으로 정한다. 시행령 위임 사항을 다룬다.' },
        ],
    }],
};
const SUBJ_B = {
    key: 'subjb',
    name: '과목B',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: '1장 품질관리',
        filePath: 'content/exams/cosmetic/교재/subjb.md',
        sections: [
            // '기초화장품'의 '화장품' — 용어집 '기초' 주입으로 [기초|화장품] 경계 인정
            { title: '기초 제형', content: '기초화장품은 피부에 직접 닿는 제형이다.' },
            // '수제화장품'의 '화장품' — '수제'는 용어집·코퍼스 마이닝 모두에 없어
            // 경계 불인정 → 부분 일치 티어 대조군 (용어집 주입의 선택성 증명)
            // ('기능성'은 '기능성화장품' 키워드 주입으로 접두 어휘가 돼 대조군 부적합)
            { title: '원료 관리', content: '수제화장품의 심사 기준을 다룬다.' },
        ],
    }],
};

function search(query) {
    el('textbook-search-input').value = query;
    el('textbook-search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

function glossCards() {
    return el('textbook-results-container').querySelectorAll('.search-gloss-card');
}

describe('용어 정의 검색 그룹 — 정의 카드·순서·필터 (TS-15)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_LAW, SUBJ_B]);
        renderTextbookSearch();
        setTextbookFilter('all');
        vi.clearAllMocks();
    });

    it('용어 매치 — 정의 카드가 본문 결과보다 앞에 배치', () => {
        search('시행령');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card');
        expect(cards.length).toBeGreaterThanOrEqual(2);
        // 첫 카드 = 용어 정의 카드, 뒤 = 교재 본문 카드 (교재→… 본문 순서 불변)
        const gloss = cards[0];
        expect(gloss.classList.contains('search-gloss-card')).toBe(true);
        expect(gloss.textContent).toContain('시행령');
        expect(gloss.textContent).toContain('용어');
        // 큐레이션 용어집 항목의 정의문
        expect(gloss.textContent).toContain('대통령령');
        // 참조문서 출처 — data-ref-html 뷰어 링크 (reader-ref-links 문서 위임)
        const refLink = gloss.querySelector('a[data-ref-html]');
        expect(refLink).toBeTruthy();
        expect(refLink.getAttribute('data-ref-html')).toContain('화장품법');
        expect(refLink.textContent).toContain('화장품법');
        // 두 번째 카드는 교재 본문 결과 — '용어' 배지 없음
        expect(cards[1].classList.contains('search-gloss-card')).toBe(false);
        expect(cards[1].textContent).toContain('용어의 정의');
    });

    it('부분 매치 키워드도 정의 카드로 수렴 — 시행 → 시행령·시행규칙', () => {
        search('시행');
        const kws = [...glossCards()].map(c => c.textContent);
        expect(kws.some(t => t.includes('시행령'))).toBe(true);
        expect(kws.some(t => t.includes('시행규칙'))).toBe(true);
    });

    it('과목 필터 — 다른 과목 선택 시 용어 정의 카드도 숨김', () => {
        search('시행령');
        expect(glossCards().length).toBe(1);

        // '시행령' 용어집 귀속은 과목1 → subj key 'law' — 다른 과목 필터면 숨김
        setTextbookFilter('subjb');
        expect(glossCards().length).toBe(0);

        setTextbookFilter('law');
        expect(glossCards().length).toBe(1);
    });

    it('본문 미매치 용어 — 정의 카드만 단독 표시 (빈 상태로 덮지 않음)', () => {
        // 'HLB'는 용어집 키워드지만 픽스처 본문에는 등장하지 않는다
        search('HLB');
        expect(glossCards().length).toBe(1);
        expect(glossCards()[0].textContent).toContain('HLB');
        expect(el('textbook-results-container').textContent)
            .not.toContain('일치하는 내용이 없습니다');
    });
});

describe('용어집 어휘 주입 — 저빈도 도메인 복합어 경계 인정 (TS-16)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_LAW, SUBJ_B]);
        renderTextbookSearch();
        setTextbookFilter('all');
        vi.clearAllMocks();
    });

    it('기초|화장품 — 용어집 주입 경계는 본매치, 미등록 접두(수제)는 부분 일치', () => {
        search('화장품');

        const container = el('textbook-results-container');
        // '부분 일치' 구분선 — 용어 정의 구분선(search-gloss-divider)도
        // search-weak-divider 스타일을 재사용하므로 텍스트로 구분한다
        const dividerIdx = [...container.children].findIndex(
            c => c.classList.contains('search-weak-divider')
                && c.textContent.includes('부분 일치'));
        const cards = [...container.querySelectorAll('.textbook-result-card')];

        const strongIdx = cards.findIndex(c => c.textContent.includes('기초 제형'));
        const weakIdx = cards.findIndex(c => c.textContent.includes('원료 관리'));
        expect(strongIdx).toBeGreaterThanOrEqual(0);
        expect(weakIdx).toBeGreaterThanOrEqual(0);
        // 본매치 카드는 부분 일치 구분선 '앞'에, 부분 카드는 '뒤'에 배치
        // ('기타 화장품' 같은 공백 포함 키워드는 '화장품'에 경계 매치되어
        //  용어 정의 카드로 정상 노출될 수 있다 — 순서에는 영향 없음)
        expect(dividerIdx).toBeGreaterThanOrEqual(0);
        const strongEl = cards[strongIdx];
        const weakEl = cards[weakIdx];
        const children = [...container.children];
        expect(children.indexOf(strongEl)).toBeLessThan(dividerIdx);
        expect(children.indexOf(weakEl)).toBeGreaterThan(dividerIdx);
    });
});
