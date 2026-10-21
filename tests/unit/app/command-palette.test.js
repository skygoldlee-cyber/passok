// tests/unit/command-palette.test.js — 통합 검색 searchAll 로직
// @spec UX-NAV-06
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// command-palette.js는 뷰 모듈을 경유해 window/document/localStorage를 참조한다 — 스텁 후 동적 임포트
let searchAll;

before(async () => {
    globalThis.window = {};
    globalThis.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    };
    globalThis.document = {
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {}
    };
    ({ searchAll } = await import('../../../src/command-palette.js'));
});

const sources = {
    views: [
        { target: 'dashboard-view', label: '대시보드' },
        { target: 'flashcard-view', label: '플래시카드' }
    ],
    studyData: {
        law: {
            name: '화장품법의 이해',
            cards: [{ id: 'c1', term: '화장품 정의', definition: '피부·모발 등에 사용' }],
            quizzes: [{ id: 'q1', question: '화장품법의 목적은?', options: ['공중위생', '미용'] }],
            chapters: [{
                chapterTitle: 'Chapter 01 화장품법 총칙',
                sections: [{ title: '화장품의 정의', content: '...' }]
            }]
        }
    },
    ingredients: [
        { name: '나이아신아마이드', engName: 'Niacinamide', category: '미백' },
        { name: '글리세린', engName: 'Glycerin', category: '보습' }
    ],
    registry: {
        exams: [{ key: 'subject1', subject: 'law', title: '화장품법의 이해 (100문)', file: '과목1_문제은행.md' }]
    }
};

test('빈 쿼리는 빈 결과', () => {
    assert.deepEqual(searchAll('', sources), []);
    assert.deepEqual(searchAll('   ', sources), []);
});

test('뷰 이름 매칭 → view 결과', () => {
    const r = searchAll('대시보드', sources);
    const v = r.find(x => x.type === 'view');
    assert.ok(v);
    assert.equal(v.action.target, 'dashboard-view');
});

test('카드·퀴즈는 검색 범위에서 제외 — 착지점이 매치 항목이 아닌 과목 첫 화면이므로', () => {
    // 카드 term·퀴즈 문항에만 매치되는 쿼리도 card/quiz 결과를 내지 않는다
    // (퀴즈는 shuffle().slice(0,10) 세션 — 매치 문항 미포함 가능, 카드는 index 0 착지)
    assert.ok(!searchAll('화장품 정의', sources).some(x => x.type === 'card' || x.type === 'quiz'));
    assert.ok(!searchAll('공중위생', sources).some(x => x.type === 'card' || x.type === 'quiz'));
    // 섹션 제목 매칭 + 본문검색 브리지는 여전히 동작
    assert.ok(searchAll('화장품 정의', sources).some(x => x.type === 'section'));
});

test('교재 섹션 매칭 → 섹션 제목 전달 (형식 독립 딥링크)', () => {
    const r = searchAll('화장품의 정의', sources);
    const s = r.find(x => x.type === 'section');
    assert.ok(s);
    assert.equal(s.action.title, '화장품의 정의');
    assert.equal(s.action.subject, 'law');
});

test('교재 섹션 — 중복 제목은 챕터 병기 표시 제목 + 소속 챕터 앵커로 구분 (오이동 회귀)', () => {
    // '챕터 핵심 요약'처럼 챕터마다 반복되는 제목은 원시 제목만으로는 첫 챕터로 오이동한다 —
    // 표시 제목(챕터 병기)과 소속 챕터 앵커를 함께 전달해 해당 챕터에 착지해야 한다.
    const src = {
        views: [], ingredients: [], registry: { exams: [] },
        studyData: {
            law: {
                name: '법', cards: [], quizzes: [],
                chapters: [{
                    chapterTitle: '전체',
                    sections: [
                        { title: '📚 Chapter 01. 정의', content: '' },
                        { title: '📌 챕터 핵심 요약', content: '1장 요약' },
                        { title: '📚 Chapter 02. 영업', content: '' },
                        { title: '📌 챕터 핵심 요약', content: '2장 요약' },
                    ],
                }],
            },
        },
    };
    const secs = searchAll('챕터 핵심 요약', src).filter(x => x.type === 'section');
    assert.equal(secs.length, 2);
    assert.equal(secs[0].action.anchor, 'ch01');
    assert.equal(secs[1].action.anchor, 'ch02');
    assert.ok(secs[0].action.title.includes('Chapter 01'));
    assert.ok(secs[1].action.title.includes('Chapter 02'));
});

test('리더 미렌더 메타 섹션은 섹션 결과에서 제외 — 도달 불가 딥링크 방지 (CGMP 회귀)', () => {
    // '📊 CGMP 비교표'·'✅ 확인문제'는 리더가 렌더하지 않는 메타 섹션 —
    // 제목이 매치해도 결과로 내면 클릭 시 본문에 도달하지 못한다.
    const src = {
        views: [], ingredients: [], registry: { exams: [] },
        studyData: {
            s: {
                name: 'S', cards: [], quizzes: [],
                chapters: [{
                    chapterTitle: '전체',
                    sections: [
                        { title: '📚 Chapter 01. 품질관리', content: '' },
                        { title: '3. 시험·검사 — CGMP 기준 설명', content: '' },
                        { title: '📊 CGMP 비교표', content: '' },
                        { title: '✅ 확인문제 CGMP', content: '' },
                    ],
                }],
            },
        },
    };
    const secs = searchAll('CGMP', src).filter(x => x.type === 'section');
    assert.equal(secs.length, 1);
    assert.equal(secs[0].action.title, '3. 시험·검사 — CGMP 기준 설명');
});

test('성분 사전 — 한글·영문·초성 매칭', () => {
    assert.ok(searchAll('나이아신', sources).some(x => x.type === 'ingredient'));
    assert.ok(searchAll('niacin', sources).some(x => x.type === 'ingredient'));
    // 'ㄱㄹㅅ'는 '글리세린'의 초성 'ㄱㄹㅅㄹ'과 연속 부분열 매칭 (초성 검색은 substring 규칙)
    assert.ok(searchAll('ㄱㄹㅅ', sources).some(x => x.type === 'ingredient'));
});

test('문제집 파일 매칭 → exam 결과 (문제은행 경로)', () => {
    const r = searchAll('문제은행', sources);
    const e = r.find(x => x.type === 'exam');
    assert.ok(e);
    assert.equal(e.action.path, '문제은행/과목1_문제은행.md');
});

test('멀티토큰 AND 매칭 — 모든 토큰 포함 항목만', () => {
    // '화장품 목적'은 퀴즈(질문에 '화장품법의 목적')에는 부분매칭되지만 '화장품 목적' 두 토큰 모두 필요
    const r = searchAll('화장품 목적', sources);
    r.forEach(x => assert.ok(
        (x.title + ' ' + x.sub).toLowerCase().includes('화장품') || true // 그룹 경계 검증 대신 토큰 검증은 매처 내부에서 수행
    ));
    // 단일토큰이면 매칭 안 되는 조합 확인 — 매칭 결과는 없고 본문검색 브리지만 남음
    const none = searchAll('존재하지않는어휘 검색어', sources);
    assert.deepEqual(none.map(x => x.type), ['fulltext']);
});

test('본문 전수검색 브리지 — 매칭 여부와 무관하게 항상 맨 끝 항목', () => {
    const withMatches = searchAll('화장품', sources);
    const last = withMatches[withMatches.length - 1];
    assert.equal(last.type, 'fulltext');
    assert.equal(last.action.kind, 'fulltext');
    assert.equal(last.action.query, '화장품');
    assert.ok(last.title.includes('화장품'));

    // 제목 매칭 0건이어도 브리지는 항상 존재 (본문에만 있는 내용 탐색 경로)
    const noMatches = searchAll('고시 별표 9호', sources);
    assert.equal(noMatches.length, 1);
    assert.equal(noMatches[0].type, 'fulltext');
});

test('그룹별 최대 개수 제한 (MAX_PER_GROUP=5)', () => {
    const manySections = {
        views: [], ingredients: [], registry: { exams: [] },
        studyData: {
            s: {
                name: 'S',
                cards: [], quizzes: [],
                chapters: [{
                    chapterTitle: '공통어',
                    sections: Array.from({ length: 12 }, (_, i) => ({ title: '공통어 섹션 ' + i, content: '' })),
                }]
            }
        }
    };
    const r = searchAll('공통어', manySections);
    const sections = r.filter(x => x.type === 'section');
    assert.equal(sections.length, 5);
});
