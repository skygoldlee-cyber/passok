// tests/dom/study-search.dom.test.js — 교재 검색 시나리오
// @spec TS-01~09,TS-18
// 설계: docs/dev/design/DOM_TEST_DESIGN.md §5.2 (Phase 4)
// 검증: 검색어 입력→역색인 검색→결과 카드(H) · 과목 필터(H) · 결과 없음(B)
//       · 초기화→빈 상태(E) · 하이라이트·더보기 토글(H)

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
    renderTextbookSearch, setTextbookFilter, clearTextbookSearch, toggleTextbookCard,
    setTextbookSearchQuery,
} from '../../../src/views/textbook-search.js';

const SUBJ_A = {
    key: 'subja',
    name: '과목A',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: '1장 화장품법',
        filePath: 'content/exams/cosmetic/교재/subja.md',
        sections: [
            { title: '화장품 정의', content: '화장품은 인체를 청결 미화하는 물품이다.' },
            { title: '조제관리사', content: '맞춤형 화장품 조제관리사는 혼합 소분 업무를 한다.' },
        ],
    }],
};
const SUBJ_B = {
    key: 'subjb',
    name: '과목B',
    chapters: [{
        chapterKey: 'ch1',
        chapterTitle: '1장 제조',
        filePath: 'content/exams/cosmetic/교재/subjb.md',
        sections: [
            { title: '화장품 제조', content: '제조업 등록과 품질관리 기준을 따른다.' },
        ],
    }],
};

function search(query) {
    el('textbook-search-input').value = query;
    el('textbook-search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

describe('교재 검색 — 역색인·필터·결과 카드', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_A, SUBJ_B]);
        // 지연 인덱스(참조자료)의 manifest fetch를 즉시 완료 — 미스텁 시 jsdom에서
        // _loadScript 폴백이 settle되지 않아 로딩 상태가 풀리지 않는다
        vi.stubGlobal('fetch', vi.fn((url) => {
            const u = String(url);
            if (u.includes('manifest.json')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ subjects: [] }) });
            }
            return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
        }));
        renderTextbookSearch();
        setTextbookFilter('all'); // 모듈 상태 리셋
        vi.clearAllMocks();
    });

    it('빈 검색어 → 초기 안내 상태 (E)', () => {
        expect(el('textbook-results-container').textContent).toContain('검색어를 입력하세요');
        expect(el('textbook-search-summary').textContent).toContain('키워드를 입력하면');
    });

    it('검색어 입력(Enter) → 매칭 섹션 카드·하이라이트·건수 요약 (H)', () => {
        search('화장품');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(3); // 과목A 2건 + 과목B 1건
        expect(el('textbook-search-summary').innerHTML).toContain('3</strong>건');
        expect(cards[0].querySelector('.textbook-card-title').innerHTML).toContain('<mark');
        expect(cards[0].textContent).toContain('과목A');
        expect(cards[0].textContent).toContain('1장 화장품법');
    });

    it('복수 키워드 → AND 검색 (교집합)', () => {
        search('화장품 조제관리사');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(1);
        expect(cards[0].querySelector('.textbook-card-title').textContent).toContain('조제관리사');
    });

    it('과목 필터 → 해당 과목 결과만 표시 + 필터 버튼 활성화', () => {
        search('화장품');
        setTextbookFilter('subja');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(2);
        cards.forEach(c => expect(c.textContent).toContain('과목A'));
        // 과목 버튼은 동적 생성 — '전체' 버튼의 active 해제로 필터 적용 확인
        const allBtn = document.querySelector('.textbook-filter-buttons [data-filter="all"]');
        expect(allBtn.classList.contains('active-filter')).toBe(false);
    });

    it('일치 없음 → 없음 안내 (B)', async () => {
        search('존재하지않는키워드');

        // 지연 인덱스(참조자료) 로딩이 끝나야 확정된 '결과 없음'이 표시된다
        await vi.waitFor(() => {
            expect(el('textbook-results-container').textContent).toContain('일치하는 내용이 없습니다');
        }, { timeout: 2000 });
        expect(el('textbook-search-summary').innerHTML).toContain('0</strong>건');
    });

    it('지연 인덱스 로딩 중 — 요약에 로딩 안내가 붙는다', () => {
        // 참조자료 인덱스는 첫 검색 시 지연 fetch — 완료 전 동기 렌더에는 로딩 표기
        search('화장품');
        // 로딩 완료 여부와 무관하게 결과 카드는 즉시 렌더된다
        expect(el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length)
            .toBeGreaterThan(0);
    });

    it('마크다운 구문 노이즈는 검색 대상에서 제외 — 이미지 경로·코드블록만의 매치는 무결과', () => {
        window.STUDY_DATA = {};
        const subj = {
            key: 'subje', name: '과목E',
            chapters: [{
                chapterKey: 'ch1', chapterTitle: 'c', filePath: 'e.md',
                sections: [
                    // '특수노이즈'는 이미지 경로와 코드블록에만 존재 — 본문 텍스트가 아니므로 매치되면 안 됨
                    { title: '그림 있는 섹션', content: '![설명](images/특수노이즈_그림.png)\n\n```\n특수노이즈 코드\n```\n\n본문.' },
                    // 링크 텍스트는 유지되므로 '링크텍스트'로는 매치돼야 한다
                    { title: '링크 섹션', content: '[링크텍스트 설명](https://example.com/특수노이즈)' },
                ],
            }],
        };
        stubRegistry([subj]);
        search('특수노이즈');
        // 이미지 경로·코드·URL만의 매치는 결과에서 제외
        expect(el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length).toBe(0);

        search('링크텍스트');
        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).toContain('링크 섹션');
    });

    it('결과 랭킹 — 제목 매칭 섹션이 본문 매칭보다 먼저 온다', () => {
        window.STUDY_DATA = {};
        const subj = {
            key: 'subjf', name: '과목F',
            chapters: [{
                chapterKey: 'ch1', chapterTitle: 'c', filePath: 'f.md',
                sections: [
                    { title: '서론', content: '여기서는 책임판매업을 간단히 언급한다.' },
                    { title: '책임판매업의 정의', content: '책임판매업은 …' },
                ],
            }],
        };
        stubRegistry([subj]);
        search('책임판매업');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(2);
        expect(cards[0].querySelector('.textbook-card-title').textContent).toContain('책임판매업의 정의');
    });

    it('결과 카드 전체가 이동 링크 — 카드 div에 data-search-goto·role=link 부여', () => {
        search('화장품');
        const card = el('textbook-results-container').querySelector('.textbook-result-card[data-search-goto]');
        expect(card).toBeTruthy();
        expect(card.getAttribute('role')).toBe('link');
        const payload = JSON.parse(card.getAttribute('data-search-goto'));
        expect(payload[0]).toBe('subja');
    });

    it('전체 단원 보기 → 섹션 표시 제목 + 소속 챕터 앵커로 이동 (오이동 회귀)', () => {
        // 섹션 제목에 "Chapter N"이 없어도 소속 챕터 앵커를 타야 한다 —
        // 종전에는 섹션 제목에서 챕터 번호를 추출해 비헤더 섹션이 과목 맨 위로 튀었다.
        window.STUDY_DATA = {};
        const subj = {
            key: 'subjd', name: '과목D',
            chapters: [{
                chapterKey: 'full', chapterTitle: '전체', filePath: 'd.md',
                sections: [
                    { title: '📚 Chapter 01. 정의', content: '개관.' },
                    { title: '1. 화장품의 정의', content: '조제관리사 대상 본문.' },
                    { title: '📚 Chapter 02. 영업', content: '개관.' },
                    { title: '📌 챕터 핵심 요약', content: '1장 요약.' },
                    { title: '📌 챕터 핵심 요약', content: '조제관리사 2장 요약.' },
                ],
            }],
        };
        stubRegistry([subj]);
        search('조제관리사');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(2);

        // 본문 섹션: 소속 Chapter 01 앵커 + 원본 제목 (+ 표준형 모드 표기)
        const p0 = JSON.parse(cards[0].querySelector('a[data-search-goto]').getAttribute('data-search-goto'));
        expect(p0).toEqual(['subjd', '1. 화장품의 정의', 'ch01', '']);

        // 중복 제목 섹션: 리더 표시 제목(챕터 병기) + 소속 Chapter 02 앵커
        const p1 = JSON.parse(cards[1].querySelector('a[data-search-goto]').getAttribute('data-search-goto'));
        expect(p1[0]).toBe('subjd');
        expect(p1[1]).toContain('📌 챕터 핵심 요약');
        expect(p1[1]).toContain('Chapter 02');
        expect(p1[2]).toBe('ch02');
    });

    it('리더 미렌더 메타 섹션은 검색 결과에서 제외 — 도달 불가 목적지 방지 (CGMP 회귀)', () => {
        // 'CGMP' 검색 시 📊 비교표·✅ 확인문제가 제목 가산으로 상위에 오지만
        // 리더는 이들을 렌더하지 않아 이동해도 본문에 도달할 수 없다.
        window.STUDY_DATA = {};
        const subj = {
            key: 'subjh', name: '과목H',
            chapters: [{
                chapterKey: 'ch1', chapterTitle: 'c', filePath: 'h.md',
                sections: [
                    { title: '📚 Chapter 01. 품질관리', content: '개관.' },
                    { title: '3. 시험·검사', content: '여기에 CGMP 4대 기준서 설명이 있다.' },
                    { title: '📊 CGMP 4대 기준서 비교표', content: 'CGMP 비교 표.' },
                    { title: '✅ 확인문제', content: 'CGMP 관련 확인문제.' },
                ],
            }],
        };
        stubRegistry([subj]);
        search('CGMP');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(1);
        expect(cards[0].textContent).toContain('3. 시험·검사');
        const payload = JSON.parse(cards[0].querySelector('a[data-search-goto]').getAttribute('data-search-goto'));
        expect(payload).toEqual(['subjh', '3. 시험·검사', 'ch01', '']);
    });

    it('카드 내 참조 링크에 검색어 전달 — data-ref-search 주입 (해시 없는 링크 상단 착지 회귀)', () => {
        window.STUDY_DATA = {};
        const subj = {
            key: 'subjg', name: '과목G',
            chapters: [{
                chapterKey: 'ch1', chapterTitle: 'c', filePath: 'g.md',
                sections: [{
                    title: 'CGMP 섹션',
                    content: 'CGMP 기준을 따른다.\n\n[우수화장품 기준](../참조자료/ref_md/과목2/우수화장품/우수화장품.md)',
                }],
            }],
        };
        stubRegistry([subj]);
        search('cgmp');

        const link = el('textbook-results-container').querySelector('a[data-ref-html]');
        expect(link).not.toBeNull();
        expect(link.getAttribute('data-ref-search')).toBe('cgmp');
    });

    it('1글자 쿼리 — 지연 인덱스(서사·참조·문제은행) fetch를 기동하지 않는다', () => {
        search('가');
        // 한 글자 입력에 전 문서 fetch가 걸리지 않아야 한다
        expect(fetch).not.toHaveBeenCalled();
        expect(el('textbook-search-summary').textContent).not.toContain('불러오는 중');
    });

    it('AND 불성립 — 미발견 용어 안내 + 제외 재검색 버튼', async () => {
        search('화장품 없는용어zzz');
        await vi.waitFor(() => {
            expect(el('textbook-results-container').textContent).toContain('찾지 못했습니다');
        }, { timeout: 2000 });
        expect(el('textbook-results-container').textContent).toContain('없는용어zzz');
        const btn = el('textbook-results-container').querySelector('[data-click="setTextbookSearchQuery"]');
        expect(btn).toBeTruthy();
        expect(JSON.parse(btn.getAttribute('data-args'))).toEqual(['화장품']);
        // 재검색 핸들러 — 실패 용어를 뺀 쿼리가 주입되고 결과가 복구된다
        setTextbookSearchQuery('화장품');
        expect(el('textbook-search-input').value).toBe('화장품');
        expect(el('textbook-results-container')
            .querySelectorAll('.textbook-result-card:not(.search-gloss-card)').length).toBe(3);
    });

    it('검색 초기화 → 빈 상태 복귀', () => {
        search('화장품');
        clearTextbookSearch();

        expect(el('textbook-search-input').value).toBe('');
        expect(el('textbook-results-container').textContent).toContain('검색어를 입력하세요');
    });

    it('긴 결과 → 더보기 버튼·접기 토글 (H)', () => {
        window.STUDY_DATA = {}; // 기본 픽스처 제외하고 장문 과목만 색인
        const longSubj = {
            key: 'subjc', name: '과목C',
            chapters: [{
                chapterKey: 'ch1', chapterTitle: '긴장', filePath: 'x.md',
                sections: [{ title: '화장품 장문', content: '화장품 '.repeat(100) }],
            }],
        };
        stubRegistry([longSubj]);
        search('화장품');

        const body = el('textbook-card-0-body');
        expect(body.classList.contains('collapsed')).toBe(true);
        toggleTextbookCard('textbook-card-0');
        expect(body.classList.contains('collapsed')).toBe(false);
        expect(el('textbook-card-0-toggle-btn').textContent).toContain('접기');
    });
});

// TS-18 — 미선언 kind 소스의 폴백 티어 표시 (파일 끝 배치 — 등록 소스는 모듈 수명 동안 유지)
describe('검색 소스 확장 — 미매핑 kind 폴백 티어 (TS-18)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubRegistry([SUBJ_A]);
        vi.stubGlobal('fetch', vi.fn((url) => {
            const u = String(url);
            if (u.includes('manifest.json')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ subjects: [] }) });
            }
            return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
        }));
        renderTextbookSearch();
        setTextbookFilter('all');
        vi.clearAllMocks();
    });

    it('RESULT_TIERS에 없는 kind도 기타 티어 카드로 렌더된다', async () => {
        const { registerSearchSource } = await import('../../../src/search-index.js');
        registerSearchSource({
            id: 'test-xdoc', kind: 'xdoc',
            load: () => [{
                kind: 'xdoc', title: '외부 문서 카드', crumb: '', subjId: '', subjName: '',
                text: '외부문서용어xyz 본문', nav: { mdPath: 'docs/xdoc.md' },
                _searchText: '외부 문서 카드 외부문서용어xyz 본문',
            }],
        });
        search('외부문서용어XYZ');

        const cards = el('textbook-results-container').querySelectorAll('.textbook-result-card:not(.search-gloss-card)');
        expect(cards.length).toBe(1);
        expect(cards[0].getAttribute('data-click')).toBe('ExamViewer.openExam');
        expect(cards[0].textContent).toContain('외부 문서 카드');
        expect(cards[0].textContent).toContain('xdoc'); // 미등록 kind는 키 그대로 배지
        expect(el('textbook-search-summary').innerHTML).toContain('1</strong>건');
    });
});
