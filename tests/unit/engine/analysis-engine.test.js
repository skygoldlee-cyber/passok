// tests/unit/analysis-engine.test.js — 학습 진단 분석 엔진 순수 로직
// @spec AN-01,AN-02,D-16,D-21,D-22
// 과목 무관 데이터 주입형 — 임의 과목 키로 검증 (모듈화 요구: 과목 변경 시 코드 수정 불필요)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const ENGINE = '../../../src/study/analysis-engine.js';

test('subjectFromSid: sid에서 과목 키 추출', async () => {
    const { subjectFromSid } = await import(ENGINE);
    assert.equal(subjectFromSid('law_st_5fd43a'), 'law');
    assert.equal(subjectFromSid('chem_st_ab12cd'), 'chem');
    assert.equal(subjectFromSid('invalid'), null);
    assert.equal(subjectFromSid(''), null);
});

test('chapterFromCid: L#### → chapterRanges로 단원명 해석', async () => {
    const { chapterFromCid } = await import(ENGINE);
    const ranges = { subjA: [[100, 'Chapter 01. 개요'], [200, '1. 정의'], [300, '2. 분류']] };
    assert.equal(chapterFromCid('L150', 'subjA', ranges), 'Chapter 01. 개요');
    assert.equal(chapterFromCid('L250', 'subjA', ranges), '1. 정의');
    assert.equal(chapterFromCid('L999', 'subjA', ranges), '2. 분류');
    assert.equal(chapterFromCid('q:x1', 'subjA', ranges), null);   // 폴백 cid는 해석 불가
    assert.equal(chapterFromCid('L100', '없는과목', ranges), null);
    assert.equal(chapterFromCid(null, 'subjA', ranges), null);
});

test('computeChapterWeakness: 퀴즈 오답 + 진술 오판을 단원별로 집계', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const quizResults = {
        'subjA_quiz_01': { solved: true, correct: false },
        'subjA_quiz_02': { solved: true, correct: true },
        'subjA_quiz_03': { solved: true, correct: false },
    };
    const resolveQuiz = (id) => ({
        'subjA_quiz_01': { quiz: { category: '2. 분류' }, subjectId: 'subjA' },
        'subjA_quiz_03': { quiz: { category: '2. 분류' }, subjectId: 'subjA' },
    })[id] || null;
    const statementStats = {
        'subjA_st_aaa111': { j: 5, w: 3, cid: 'L210', t: '텍스트', truth: true, streak: 0 },
        'subjB_st_bbb222': { j: 2, w: 1, cid: 'L050', t: '다른 텍스트', truth: false, streak: 0 },
    };
    const ranges = {
        subjA: [[200, '2. 분류']],
        subjB: [[1, '1. 개요']],
    };
    const out = computeChapterWeakness({
        quizResults, weakCards: new Set(), statementStats,
        questionChapters: {}, chapterRanges: ranges,
        resolveQuiz, limit: 10
    });
    // '2. 분류': 퀴즈 오답 2 + 진술 오판 w=3 = 5건 / '1. 개요': 진술 오판 1건 (w 실횟수 반영 — D-21)
    assert.equal(out[0].chapter, '2. 분류');
    assert.equal(out[0].wrongs, 5);
    assert.equal(out[1].chapter, '1. 개요');
    assert.equal(out[1].wrongs, 1);
});

test('computeSubjectWeakChapters: 과목별 그룹화 — 과락 평가 단위와 일치', async () => {
    const { computeSubjectWeakChapters } = await import(ENGINE);
    const quizResults = {
        'subjA_quiz_01': { solved: true, correct: false },
        'subjB_quiz_01': { solved: true, correct: false },
        'subjB_quiz_02': { solved: true, correct: false },
    };
    const resolveQuiz = (id) => ({
        'subjA_quiz_01': { quiz: { category: '2. 분류' }, subjectId: 'subjA' },
        'subjB_quiz_01': { quiz: { category: '1. 개요' }, subjectId: 'subjB' },
        'subjB_quiz_02': { quiz: { category: '3. 절차' }, subjectId: 'subjB' },
    })[id] || null;
    const statementStats = {
        'subjB_st_bbb222': { j: 3, w: 2, cid: 'L050', t: '텍스트', truth: false, streak: 0 },
    };
    const ranges = { subjB: [[1, '1. 개요']] };
    const out = computeSubjectWeakChapters({
        quizResults, weakCards: new Set(), statementStats,
        questionChapters: {}, chapterRanges: ranges,
        resolveQuiz, subjectName: (k) => ({ subjA: '과목A', subjB: '과목B' })[k] || k,
        chaptersPerSubject: 2
    });
    // subjB: 퀴즈 2건 + 진술 오판 2건(L050→1.개요, w=2 실횟수 반영 — D-21) → '1. 개요' 3건 + '3. 절차' 1건 = 총 4건
    assert.equal(out.length, 2);
    assert.equal(out[0].subjectKey, 'subjB');
    assert.equal(out[0].subject, '과목B');
    assert.equal(out[0].totalWrongs, 4);
    assert.equal(out[0].chapters[0].chapter, '1. 개요');
    assert.equal(out[0].chapters[0].wrongs, 3);
    assert.equal(out[0].chapters[1].chapter, '3. 절차');
    assert.equal(out[1].subjectKey, 'subjA');
    assert.equal(out[1].totalWrongs, 1);
});

test('computeChapterWeakness: 졸업 진술(streak>=3)은 집계 제외', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const statementStats = {
        'subjA_st_aaa111': { j: 5, w: 4, cid: 'L210', streak: 3 }, // 졸업
    };
    const out = computeChapterWeakness({
        quizResults: {}, weakCards: new Set(), statementStats,
        questionChapters: {}, chapterRanges: { subjA: [[200, '2. 분류']] },
        resolveQuiz: () => null, limit: 10
    });
    assert.equal(out.length, 0);
});

test('computeWeeklyGrowth: 최근 7일 vs 이전 7일 정답률 델타', async () => {
    const { computeWeeklyGrowth } = await import(ENGINE);
    const d = (offset) => {
        const dt = new Date(); dt.setDate(dt.getDate() - offset);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
    const calendar = {
        [d(1)]: { cards: 10, quizzes: 10, correct: 8 },   // 이번 주 80%
        [d(3)]: { cards: 5, quizzes: 0, correct: 0 },
        [d(8)]: { cards: 8, quizzes: 10, correct: 5 },    // 지난주 50%
    };
    const g = computeWeeklyGrowth(calendar);
    assert.equal(g.thisWeek.rate, 80);
    assert.equal(g.lastWeek.rate, 50);
    assert.equal(g.rateDelta, 30);
    assert.equal(g.cardDelta, 7); // (10+5) - 8
});

test('computeWeeklyGrowth: 데이터 없으면 rate null', async () => {
    const { computeWeeklyGrowth } = await import(ENGINE);
    const g = computeWeeklyGrowth({});
    assert.equal(g.thisWeek.rate, null);
    assert.equal(g.rateDelta, null);
});

test('computePassGap: 예상 점수 → 합격선 갭 + 최저 과목', async () => {
    const { computePassGap } = await import(ENGINE);
    const out = computePassGap({
        estimate: { expected: 52 },
        simHistory: [{ rate: 52, subjectRates: { law: 45, chem: 60 } }],
        subjects: [{ key: 'law', name: '법령' }, { key: 'chem', name: '화학' }],
        counts: {},
        rules: { passAverage: 60, subjectFailBelow: 40 }
    });
    assert.equal(out.gap, 8);
    assert.equal(out.weakest.key, 'law');
    assert.equal(out.weakest.rate, 45);
    assert.deepEqual(out.ranking.map(s => s.key), ['law', 'chem']);
});

test('computePassGap: 모의고사 없으면 퀴즈 정답률 폴백', async () => {
    const { computePassGap } = await import(ENGINE);
    const out = computePassGap({
        estimate: null, simHistory: [],
        subjects: [{ key: 'law', name: '법령' }, { key: 'chem', name: '화학' }, { key: 'bio', name: '생물' }],
        counts: {
            law: { quizSolved: 10, quizCorrect: 5 },
            chem: { quizSolved: 10, quizCorrect: 8 },
            bio: { quizSolved: 2, quizCorrect: 0 },
        },
        rules: { passAverage: 60, subjectFailBelow: 40 }
    });
    assert.equal(out.gap, null);
    assert.equal(out.weakest.key, 'law');
    assert.equal(out.weakest.rate, 50);
    // 3문 미만 과목(bio)은 순위에서 제외
    assert.deepEqual(out.ranking.map(s => s.key), ['law', 'chem']);
});

test('computeWeakConceptClusters: 같은 cid 반복 오판 묶음', async () => {
    const { computeWeakConceptClusters } = await import(ENGINE);
    const stats = {
        'subjA_st_1': { j: 3, w: 2, cid: 'L100', t: '진술A', streak: 0 },
        'subjA_st_2': { j: 3, w: 1, cid: 'L100', t: '진술B', streak: 0 },
        'subjA_st_3': { j: 2, w: 1, cid: 'L100', t: '진술C', streak: 0 },
        'subjA_st_4': { j: 2, w: 1, cid: 'L200', t: '다른 구간', streak: 0 }, // 단독 → 클러스터 아님
    };
    const ranges = { subjA: [[100, '1. 정의'], [200, '2. 분류']] };
    const out = computeWeakConceptClusters(stats, ranges);
    assert.equal(out.length, 1);
    assert.equal(out[0].cid, 'L100');
    assert.equal(out[0].count, 3);
    assert.equal(out[0].wrongs, 4);
    assert.equal(out[0].chapter, '1. 정의');
});

test('normalizeCidAnchor: 신형 §·레거시 L####·q: 폴백 정규화 (AN-10)', async () => {
    const { normalizeCidAnchor } = await import(ENGINE);
    const cidSection = { subjA: { '150': '1.2', '250': '2.1' } };
    assert.equal(normalizeCidAnchor('§1.2', 'subjA', cidSection), '§1.2');       // 신형 그대로
    assert.equal(normalizeCidAnchor('L150', 'subjA', cidSection), '§1.2');        // 레거시 → 환산
    assert.equal(normalizeCidAnchor('L999', 'subjA', cidSection), 'L999');        // 미등록 라인 → 원형 유지
    assert.equal(normalizeCidAnchor('L150', 'subjA', null), 'L150');              // 맵 부재 → 원형 유지
    assert.equal(normalizeCidAnchor('L150', 'subjB', cidSection), 'L150');        // 다른 과목 맵 → 원형
    assert.equal(normalizeCidAnchor('q:subjA_q5', 'subjA', cidSection), null);    // 폴백 제외
    assert.equal(normalizeCidAnchor(null, 'subjA', cidSection), null);
    assert.equal(normalizeCidAnchor('법령:제3조', 'subjA', cidSection), '법령:제3조'); // 비-라인 키 유지
});

test('chapterFromCid: §앵커·레거시 환산 경로 (AN-10)', async () => {
    const { chapterFromCid } = await import(ENGINE);
    const ranges = { subjA: [[100, 'Chapter 01. 개요'], [200, '1. 정의']] };
    const maps = {
        chapterTitles: { subjA: { '1': 'Chapter 01. 개요', '2': 'Chapter 02. 분류' } },
        cidSection: { subjA: { '150': '1.2', '999': '2.3' } },
    };
    assert.equal(chapterFromCid('§1.2', 'subjA', ranges, maps), 'Chapter 01. 개요');
    assert.equal(chapterFromCid('§2.3', 'subjA', ranges, maps), 'Chapter 02. 분류');
    // 레거시 L#### — 라인이 이동해도 환산 앵커로 같은 챕터 (150→§1.2)
    assert.equal(chapterFromCid('L150', 'subjA', ranges, maps), 'Chapter 01. 개요');
    // 환산 없는 라인 → 기존 ranges 폴백
    assert.equal(chapterFromCid('L210', 'subjA', ranges, maps), '1. 정의');
    // maps 없으면 §앵커 표시명 해석 불가
    assert.equal(chapterFromCid('§1.2', 'subjA', ranges), null);
});

test('computeWeakConceptClusters: 레거시 L####·신형 §가 같은 절이면 병합 (AN-10)', async () => {
    const { computeWeakConceptClusters } = await import(ENGINE);
    const stats = {
        'subjA_st_1': { j: 3, w: 2, cid: 'L150', t: '진술A', streak: 0 },  // 과거 저장분
        'subjA_st_2': { j: 3, w: 1, cid: '§1.2', t: '진술B', streak: 0 },  // 신형 번들
        'subjA_st_3': { j: 2, w: 1, cid: '§2.1', t: '다른 절', streak: 0 }, // 단독
    };
    const ranges = { subjA: [[100, 'Chapter 01. 개요']] };
    const maps = {
        chapterTitles: { subjA: { '1': 'Chapter 01. 개요', '2': 'Chapter 02. 분류' } },
        cidSection: { subjA: { '150': '1.2' } },
    };
    const out = computeWeakConceptClusters(stats, ranges, 2, maps);
    assert.equal(out.length, 1);
    assert.equal(out[0].cid, '§1.2');           // 클러스터 키는 정규화 앵커
    assert.equal(out[0].count, 2);              // L150 + §1.2 병합
    assert.equal(out[0].wrongs, 3);
    assert.equal(out[0].chapter, 'Chapter 01. 개요');
});

test('computeWeakConceptClusters: 과목이 다른 같은 앵커는 분리 (AN-10)', async () => {
    const { computeWeakConceptClusters } = await import(ENGINE);
    const stats = {
        'subjA_st_1': { j: 3, w: 2, cid: '§1.2', t: 'A', streak: 0 },
        'subjB_st_2': { j: 3, w: 1, cid: '§1.2', t: 'B', streak: 0 },
    };
    const out = computeWeakConceptClusters(stats, {}, 2, {});
    assert.equal(out.length, 0); // 각 과목 1개씩 — 클러스터 임계 미달, 교차 병합 없음
});

test('computePaceProjection: 페이스 부족 → behind + 필요량', async () => {
    const { computePaceProjection } = await import(ENGINE);
    const calendar = {}; // 최근 14일 학습 없음 → pace 0
    const out = computePaceProjection({ calendar, totalCards: 1000, memorized: 100, dday: 30 });
    assert.equal(out.verdict, 'behind');
    // 학습일 기준 — D-30 달력일 = 학습일 22일 (주 5일 기준, 통독 미시작)
    assert.equal(out.neededPerDay, 41); // ⌈900/22⌉
    assert.ok(out.projectedCoverage < 100);
});

test('computePaceProjection: 충분한 페이스 → ahead/ontrack', async () => {
    const { computePaceProjection } = await import(ENGINE);
    const d = (offset) => {
        const dt = new Date(); dt.setDate(dt.getDate() - offset);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
    // 매일 50장씩 14일 → pace 50/일, 남은 500장, D-30 → 1500 커버
    const calendar = {};
    for (let i = 0; i < 14; i++) calendar[d(i)] = { cards: 50, quizzes: 0, correct: 0 };
    const out = computePaceProjection({ calendar, totalCards: 1000, memorized: 500, dday: 30 });
    assert.equal(out.verdict, 'ahead');
    assert.equal(out.projectedCoverage, 100);
});

test('estimateUntaggedCauses: 숫자 정답→calc, 부정형 문항→concept, 나머지→memorize', async () => {
    const { estimateUntaggedCauses } = await import(ENGINE);
    const quizResults = {
        'q1': { solved: true, correct: false },
        'q2': { solved: true, correct: false },
        'q3': { solved: true, correct: false },
        'q4': { solved: true, correct: true },  // 정답은 제외
    };
    const resolveQuiz = (id) => ({
        q1: { quiz: { answer: '30일', question: '변경 신고 기한은?' }, subjectId: 's' },
        q2: { quiz: { answer: '가', question: '옳지 않은 것은?' }, subjectId: 's' },
        q3: { quiz: { answer: '영업', question: '제조업의 구분은?' }, subjectId: 's' },
    })[id] || null;
    const out = estimateUntaggedCauses({ quizResults, wrongCauses: {}, resolveQuiz });
    assert.equal(out.estimated, 3);
    assert.equal(out.counts.calc, 1);
    assert.equal(out.counts.concept, 1);
    assert.equal(out.counts.memorize, 1);
});

test('estimateUntaggedCauses: 태깅된 항목은 추정에서 제외', async () => {
    const { estimateUntaggedCauses } = await import(ENGINE);
    const quizResults = { q1: { solved: true, correct: false } };
    const wrongCauses = { 'weak_quiz_q1': { cause: 'concept', ts: Date.now() } };
    const out = estimateUntaggedCauses({ quizResults, wrongCauses, resolveQuiz: () => null });
    assert.equal(out.estimated, 0);
});

test('D-16 computeMasteryLevels: 과목별 졸업 비율 → Lv 환산', async () => {
    const { computeMasteryLevels } = await import(ENGINE);
    const stats = {
        'law_st_aaa111': { j: 4, w: 0, streak: 5 },   // 졸업 (streak>=3)
        'law_st_bbb222': { j: 3, w: 1, streak: 3 },   // 졸업
        'law_st_ccc333': { j: 2, w: 1, streak: 0 },   // 미졸업
        'law_st_ddd444': { j: 0, w: 0, streak: 0 },   // j=0 → 집계 제외
        'chem_st_eee555': { j: 2, w: 0, streak: 4 },  // 졸업
        'chem_st_fff666': { j: 5, w: 2, streak: 0 },
        'chem_st_ccc777': { j: 1, w: 0, streak: 0 },
        'chem_st_ddd888': { j: 2, w: 1, streak: 0 },
        'chem_st_eaa999': { j: 3, w: 0, streak: 1 },
        'broken_sid': { j: 9, w: 0, streak: 9 },      // 과목 해석 불가 → 제외
    };
    const out = computeMasteryLevels(stats);
    // law: 3개 중 2개 졸업 = 67% → Lv.4
    assert.equal(out.law.total, 3);
    assert.equal(out.law.graduated, 2);
    assert.equal(out.law.percent, 67);
    assert.equal(out.law.level, 4);
    // chem: 5개 중 1개 졸업 = 20% → Lv.2
    assert.equal(out.chem.total, 5);
    assert.equal(out.chem.graduated, 1);
    assert.equal(out.chem.percent, 20);
    assert.equal(out.chem.level, 2);
    // 데이터 없음 → 빈 맵
    assert.deepEqual(computeMasteryLevels({}), {});
    assert.deepEqual(computeMasteryLevels(null), {});
});

test('computeChapterWeakness: weak_sim 오답은 examIdToSubjectId로 과목 귀속', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const prev = globalThis.window;
    globalThis.window = { DATA_REGISTRY: { exams: [{ key: 'subject1', subject: 'subjA' }] } };
    try {
        const out = computeChapterWeakness({
            quizResults: {}, weakCards: new Set(['weak_sim_subject1_q5']),
            statementStats: {},
            questionChapters: { 'subject1_q5': '2. 분류' },
            chapterRanges: {}, resolveQuiz: () => null
        });
        // subjectKeyFromItemId로는 'subject1_q5'가 해석 불가 — exams 매핑으로 'subjA' 귀속돼야 함
        assert.equal(out.length, 1);
        assert.equal(out[0].subject, 'subjA');
        assert.equal(out[0].chapter, '2. 분류');
        assert.equal(out[0].wrongs, 1);
    } finally { globalThis.window = prev; }
});

test('computePassGap: 최근 모의고사 subjectRates가 비어 있으면 퀴즈 폴백', async () => {
    const { computePassGap } = await import(ENGINE);
    const out = computePassGap({
        estimate: null,
        simHistory: [{ score: 70, subjectRates: {} }],
        subjects: [{ key: 'law', name: '법령' }, { key: 'chem', name: '화학' }],
        counts: {
            law: { quizSolved: 10, quizCorrect: 5 },
            chem: { quizSolved: 10, quizCorrect: 8 },
        },
        rules: { passAverage: 60, subjectFailBelow: 40 }
    });
    assert.equal(out.weakest.key, 'law');
    assert.equal(out.weakest.reason, '퀴즈 정답률 최저 과목');
});

test('computeStudyPattern: 읽기 전용일도 세션 이벤트로 집계 (SC-15)', async () => {
    const { computeStudyPattern } = await import(ENGINE);
    const calendar = {};
    for (let i = 1; i <= 8; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        calendar[key] = { cards: 0, quizzes: 0, readMin: 20 }; // 읽기만 한 날
    }
    const out = computeStudyPattern(calendar);
    // readMin 일수가 세션으로 집계돼 actEvents=8 → 표본 게이트 통과
    assert.ok(out);
    assert.equal(out.activeDays, 8);
    assert.equal(out.events, 8);
});

// ---------- D-21: 단원 숙달 베이지안 추정 ----------

test('betaPosteriorMean: 사전 수축 — 무증거 ~0.57, 소표본 극단 완화', async () => {
    const { betaPosteriorMean } = await import(ENGINE);
    assert.ok(Math.abs(betaPosteriorMean(0, 0) - 4 / 7) < 1e-9, '사전 α4β3 → 0.571');
    assert.ok(betaPosteriorMean(0, 1) > 0.4, '1오답이어도 0%로 붕괴하지 않음');
    assert.ok(betaPosteriorMean(25, 5) > 0.75, '대표본은 실측 수렴');
    assert.ok(betaPosteriorMean(0, 1) < betaPosteriorMean(25, 5), '소표본 오답이 대표본 성공보다 취약');
});

test('computeChapterWeakness: 숙달률 정렬 — 1오답 단원이 30시도 5오답 단원보다 위', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    // 단원A: 오답 1건만 (기존 오답빈도 정렬이면 하위) / 단원B: 30시도 5오답 (기존이면 최상위 취약)
    const statementStats = { 'subjA_st_a1': { j: 1, w: 1, cid: 'L210', streak: 0 } };
    for (let i = 0; i < 5; i++) {
        statementStats[`subjA_st_b${i}`] = { j: 6, w: 1, cid: 'L250', streak: 0 }; // 합계 j30 w5
    }
    const out = computeChapterWeakness({
        quizResults: {}, weakCards: new Set(), statementStats,
        questionChapters: {},
        chapterRanges: { subjA: [[200, 'A단원'], [240, 'B단원']] },
        resolveQuiz: () => null, limit: 10
    });
    assert.equal(out.length, 2);
    assert.equal(out[0].chapter, 'A단원', '숙달률 낮은 소표본 단원이 최약');
    assert.ok(out[0].mastery < out[1].mastery);
    assert.ok(out[0].mastery > 0 && out[0].mastery < 1);
});

test('computeChapterWeakness: 퀴즈 정답도 숙달 증거 — 정답 포함 시 숙달률 상승', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const resolveQuiz = () => ({ quiz: { category: '1. 개요' }, subjectId: 'subjA' });
    const quizResults = { q1: { correct: false } };
    for (let i = 0; i < 9; i++) quizResults[`ok${i}`] = { correct: true };
    const out = computeChapterWeakness({
        quizResults, weakCards: new Set(), statementStats: {},
        questionChapters: {}, chapterRanges: { subjA: [[1, '1. 개요']] },
        resolveQuiz, limit: 10
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].wrongs, 1);
    assert.ok(out[0].mastery > 0.6, `정답 9건 반영 mastery=${out[0].mastery}`);
});

test('computeSubjectWeakChapters: 과목 정렬은 최약 단원 숙달률 기준 + mastery 필드', async () => {
    const { computeSubjectWeakChapters } = await import(ENGINE);
    const resolveQuiz = (id) => ({ quiz: { category: '공통단원' }, subjectId: id.startsWith('a') ? 'subjA' : 'subjB' });
    const quizResults = {
        a1: { correct: false }, a2: { correct: true }, a3: { correct: true },  // subjA: 1오답+2정답
        b1: { correct: false }                                                 // subjB: 1오답만
    };
    const out = computeSubjectWeakChapters({
        quizResults, weakCards: new Set(), statementStats: {},
        questionChapters: {}, chapterRanges: {}, resolveQuiz, chaptersPerSubject: 2
    });
    assert.equal(out.length, 2);
    assert.equal(out[0].subjectKey, 'subjB', '정답 증거 없는 과목이 최약');
    assert.equal(out[0].minMastery, out[0].chapters[0].mastery);
    assert.ok(out[0].minMastery < out[1].minMastery);
});

// ---------- D-22: BKT 시퀀스 소비자 경로 ----------

test('D-22: reviewLog 시퀀스가 있으면 Beta 대신 BKT P(L)로 숙달 추정', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const resolveQuiz = () => ({ quiz: { category: '2. 분류' }, subjectId: 'subjA' });
    const quizResults = { 'subjA_quiz_01': { solved: true, correct: false } }; // 카운트 증거(오답) — 랭킹 진입 + BKT 사전
    const reviewLog = [ // 동일 문항 정답 3연속 시퀀스 — 카운트가 못 보는 최근 숙달
        { c: 'subjA_quiz_01', k: 'q', ok: 1, t: 1 },
        { c: 'subjA_quiz_01', k: 'q', ok: 1, t: 2 },
        { c: 'subjA_quiz_01', k: 'q', ok: 1, t: 3 },
    ];
    const p = {
        quizResults, weakCards: new Set(), statementStats: {},
        questionChapters: {}, chapterRanges: {}, resolveQuiz, limit: 10
    };
    const bkt = computeChapterWeakness({ ...p, reviewLog });
    const beta = computeChapterWeakness(p); // 시퀀스 없음 → Beta 폴백
    assert.equal(beta[0].mastery, 0.5, 'Beta(4,3)+오답1 → 0.5');
    assert.ok(bkt[0].mastery > 0.95, `BKT 정답 시퀀스 반영 mastery=${bkt[0].mastery}`);
});

test('D-22: 카드 자기평가·미귀속 id는 BKT 관측에서 제외', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const resolveQuiz = () => null;
    const quizResults = { 'subjA_quiz_01': { solved: true, correct: false } };
    const reviewLog = [
        { c: 'subjA_card_9', r: 3, e: 0, t: 1 },  // 카드 자기평가 — 채점 증거 아님 (설계 §2.1)
        { c: 'subjA_quiz_xx', k: 'q', ok: 1, t: 2 }, // 단원 귀속 실패 — 버림
    ];
    const out = computeChapterWeakness({
        quizResults, weakCards: new Set(), statementStats: {},
        questionChapters: { 'subjA_quiz_01': '2. 분류' }, chapterRanges: {},
        resolveQuiz, limit: 10, reviewLog
    });
    assert.equal(out[0].mastery, 0.5, '제외 관측이 숙달률을 오염시키면 안 됨 (Beta 폴백과 동일)');
});

test('D-22: 진술 스케줄 이벤트(r)는 OX 관측으로 시퀀스에 포함', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const statementStats = { 'subjA_st_aaa111': { j: 1, w: 1, cid: 'L210', streak: 0 } };
    const ranges = { subjA: [[200, '2. 분류']] };
    const reviewLog = [
        { c: 'subjA_st_aaa111', r: 3, e: 0, t: 1 }, // 정판
        { c: 'subjA_st_aaa111', r: 3, e: 0, t: 2 },
        { c: 'subjA_st_aaa111', r: 3, e: 0, t: 3 },
    ];
    const out = computeChapterWeakness({
        quizResults: {}, weakCards: new Set(), statementStats,
        questionChapters: {}, chapterRanges: ranges,
        resolveQuiz: () => null, limit: 10, reviewLog
    });
    assert.equal(out[0].chapter, '2. 분류');
    assert.ok(out[0].mastery > 0.85, `진술 정판 시퀀스가 P(L)에 반영돼야 함 mastery=${out[0].mastery}`);
});

test('D-22: weak_*·시뮬 문항 id도 원문항으로 귀속 — 복습 세션 재판정이 관측에 포함', async () => {
    const { computeChapterWeakness } = await import(ENGINE);
    const prev = globalThis.window;
    globalThis.window = { DATA_REGISTRY: { exams: [{ key: 'subject1', subject: 'subjA' }] } };
    try {
        const resolveQuiz = id => id === 'suba_quiz_1' ? { quiz: { category: '제1장' }, subjectId: 'subjA' } : null;
        const quizResults = { suba_quiz_1: { correct: false } }; // 제1장 랭킹 진입용 오답 1건
        const reviewLog = [
            { c: 'weak_quiz_suba_quiz_1', k: 'q', ok: 1, t: 1 },   // 약점 퀴즈 재판정 → 정답
            { c: 'weak_quiz_suba_quiz_1', k: 'q', ok: 1, t: 2 },
            { c: 'subject1_q5', k: 'q', ok: 1, t: 3 },             // 시뮬 문항 원시 id → questionChapters 귀속
            { c: 'weak_exam_subject1_q5', k: 'q', ok: 1, t: 4 },   // weak_exam 접두사 → 원문항 정규화
        ];
        const out = computeChapterWeakness({
            quizResults, weakCards: new Set(), statementStats: {},
            questionChapters: { 'subject1_q5': '제1장' }, chapterRanges: {},
            resolveQuiz, limit: 10, reviewLog
        });
        // 제1장: Beta 사전(정답0·오답1 → 0.5)에서 mcq 관측 4연속 정답 → P(L) 상승
        assert.equal(out[0].chapter, '제1장');
        assert.ok(out[0].mastery > 0.9, `weak/시뮬 판정 미귀속이면 0.5 정체 — mastery=${out[0].mastery}`);
    } finally { globalThis.window = prev; }
});
