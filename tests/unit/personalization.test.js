// tests/unit/personalization.test.js
// @spec PS-01,PS-02,PS-03,PS-04,PS-05,PS-06,PS-07,PS-08,PS-09,PS-10,PS-11
// personalization.js 개인 맞춤형 학습 고도화 순수 로직 검증 (합성 데이터).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    clusterWeakConcepts, buildWeakMock, buildTodayQueue, estimatePassProb,
    weakRefLink, fitFsrsParams, inferP0, inferCause, weeklyReport,
    generateClinic, fitKT,
} from '../../src/personalization.js';

const stats = {
    s1: { w: 5, j: 1, t: '별표5 원료A', truth: 'X', cid: 'c1' },
    s2: { w: 3, j: 0, t: '별표5 원료B', truth: 'X', cid: 'c1' },
    s3: { w: 4, j: 2, t: '혼합 금지', truth: 'O', cid: 'c2' },
    ok: { w: 0, j: 9, t: '숙달', truth: 'O', cid: 'c3' },
};

test('PS-01: cid 폴백 — 이웃 없으면 cid로 클러스터', () => {
    const cls = clusterWeakConcepts(stats, null);
    assert.equal(cls.length, 2);
    assert.equal(cls[0].id, 'c1');
    assert.equal(cls[0].size, 2);
    assert.equal(cls[0].totalWrong, 8);
});

test('PS-01: 이웃 그래프 결합 — cos≥0.72 엣지로 병합', () => {
    const adj = { 'stmt:s1': [['stmt:s3', 0.8]], 'stmt:s3': [['stmt:s1', 0.8]] };
    const cls = clusterWeakConcepts(stats, adj);
    assert.equal(cls.length, 1);
    assert.equal(cls[0].size, 3);
});

test('PS-02: 취약 자동편성 — 오답 가중 정렬·상한·과목 커버', () => {
    const r = buildWeakMock({ statementStats: stats, weakCards: new Set(['q9']), questionSubjects: { s1: 'subj1' } }, 3);
    assert.equal(r.items.length, 3);
    assert.equal(r.items[0], 's1');
    assert.equal(r.bySubject.subj1, 1);
});

test('PS-03: 통합 큐 — 밀림 과목이 최우선', () => {
    const q = buildTodayQueue({ dueCount: 5, weakCount: 3, behindSubjects: [{ key: 'law', name: '법규', daysBehind: 4 }], unlearnedCount: 10 });
    assert.equal(q[0].type, 'behind');
    assert.ok(q.some(i => i.type === 'srs' && i.payload.count === 5));
    assert.equal(q.at(-1).type, 'new');
});

test('PS-04: 합격 확률 — 숙달 높으면 확률 상승, 취약 과목 식별', () => {
    const hi = estimatePassProb({ subjectMastery: { a: 0.9, b: 0.85 }, mockRates: [0.8] });
    const lo = estimatePassProb({ subjectMastery: { a: 0.9, b: 0.2 }, mockRates: [0.3] });
    assert.ok(hi.probability > lo.probability);
    assert.equal(lo.weakest, 'b');
    assert.ok(lo.needHours.b > 0);
});

test('PS-05: 딥링크 해석 — cid→URL 위임', () => {
    const r = weakRefLink({ cid: 'c1', t: 'x' }, c => `#${c}`);
    assert.equal(r.url, '#c1');
});

test('PS-06: FSRS 피팅 — 표본 부족 시 미피팅, 충분 시 w20 반환', () => {
    assert.equal(fitFsrsParams([{ days: 1, correct: true, stability: 2 }]).fitted, false);
    const log = Array.from({ length: 400 }, (_, i) => ({ days: (i % 20) + 1, correct: i % 20 < 14, stability: 5 }));
    assert.ok(fitFsrsParams(log).w20 != null);
});

test('PS-07: 입문 진단 P0 — 정답률 클램프', () => {
    assert.deepEqual(inferP0({ a: 1, b: 0 }), { a: 0.85, b: 0.15 });
});

test('PS-08: 원인 추론 — 확신 오답=개념, 즉답=실수, 변경=망설임', () => {
    assert.equal(inferCause({ wasCorrect: false, confidence: 'high' }), 'concept');
    assert.equal(inferCause({ wasCorrect: false, ms: 1000 }), 'careless');
    assert.equal(inferCause({ wasCorrect: false, changed: true }), 'doubt');
    assert.equal(inferCause({ wasCorrect: true }), null);
});

test('PS-09: 주간 리포트 — 순응도·제안 생성', () => {
    const r = weeklyReport({ solvedWeek: 30, planWeek: 40, wrongWeek: 8, topCluster: '별표5' });
    assert.equal(r.adherence, 0.75);
    assert.ok(r.suggestion.includes('별표5'));
});

test('PS-10: 클리닉 처방 — 클러스터→복습 스텝 생성', () => {
    const r = generateClinic(clusterWeakConcepts(stats, null)[0], { neighborCount: 3, refUrl: '#c1' });
    assert.ok(r.headline.includes('오개념 클리닉'));
    assert.ok(r.steps.length >= 3);
});

test('PS-11: BKT 전이율 피팅 — 유효 범위 반환', () => {
    const r = fitKT([false, false, true, true, true, true]);
    assert.ok(r.T >= 0.02 && r.T <= 0.30);
});
