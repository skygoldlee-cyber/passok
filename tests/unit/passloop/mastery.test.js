// tests/unit/passloop/mastery.test.js
// @spec AI-40
// PassLoop 개념 숙련도 맵 — collectConceptStats·computeMastery·nextActions
// 순수 로직 검증 (합성 신호 + 가짜 ContentIndex 포트).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MASTERY_GRADES,
    collectConceptStats,
    computeConceptTotals,
    computeMastery,
    nextActions,
} from '../../../src/passloop/index.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000; // 고정 기준 시각

/** 테스트용 ContentIndex — ctxId 과목 접두 해석 + `subj:§N.M` 한정 키 */
const idx = {
    normalizeCid: (c, ctxId) => {
        const s = String(c || '').trim();
        if (!s || s === '?') return null;
        if (/^.+:§/.test(s)) return s;                 // 이미 과목한정 — 통과
        const subj = String(ctxId || '').split('_')[0] || 'subj';
        if (s === 'L100') return `${subj}:§2.3`;       // 레거시 라인 → 환산
        return `${subj}:${s.startsWith('§') ? s : `§${s}`}`;
    },
    questionCids: (q) => {
        const s = new Set();
        if (q.conceptId) s.add(q.conceptId);
        for (const st of q.statements || []) if (st.conceptId) s.add(st.conceptId);
        return [...s];
    },
    itemCid: (item) => item && item.anchor ? `card_subj:§${item.anchor}` : null,
    conceptTitle: (cid) => `단원 ${cid}`,
};

test('AI-40: 진술 통계 집계 — cid 정규화·j/w·최근 오판일·항목 수집', () => {
    const stats = collectConceptStats({
        statementStats: {
            law_s1: { j: 5, w: 2, lw: '2026-11-20', cid: '2.3' },
            law_s2: { j: 3, w: 0, lw: '2026-11-25', cid: 'L100' }, // 레거시 → law:§2.3
            law_s3: { j: 4, w: 4, lw: '2026-11-01', cid: '?' },    // 해석 불가 → 제외
            mfg_s1: { j: 2, w: 1, lw: '2026-11-24', cid: '2.3' },  // 같은 앵커 다른 과목 → 분리
        },
    }, idx);
    assert.deepEqual(Object.keys(stats).sort(), ['law:§2.3', 'mfg:§2.3']);
    const c = stats['law:§2.3'];
    assert.equal(c.n, 8);            // 5 + 3
    assert.equal(c.ok, 6);           // (5-2) + (3-0)
    assert.equal(c.lastTs, Date.parse('2026-11-25'));
    assert.deepEqual([...c.items].sort(), ['law_s1', 'law_s2']);
    assert.equal(stats['mfg:§2.3'].n, 2);  // 과목 충돌 없이 별도 개념
});

test('AI-40: 퀴즈 결과 — 문항 conceptId 귀속·미풀이 제외', () => {
    const stats = collectConceptStats({
        quizResults: {
            law_q1: { solved: true, correct: false, ts: NOW - DAY },
            law_q2: { solved: true, correct: true, ts: NOW },
            law_q3: { solved: false },                                 // 미풀이 제외
            law_q4: { correct: true },                                 // solved 부재도 허용
        },
        quizById: {
            law_q1: { id: 'law_q1', conceptId: '2.3' },
            law_q2: { id: 'law_q2', conceptId: '2.3', statements: [{ conceptId: '3.1' }] },
            law_q4: { id: 'law_q4', conceptId: '3.1' },
        },
    }, idx);
    assert.equal(stats['law:§2.3'].n, 2);
    assert.equal(stats['law:§2.3'].ok, 1);
    assert.equal(stats['law:§3.1'].n, 2);   // q2 진술 + q4 문항
    assert.equal(stats['law:§3.1'].ok, 2);
    assert.equal(stats['law:§2.3'].lastTs, NOW);
});

test('AI-40: 리뷰 로그 — k:q는 quizResults와 중복 제거, sid는 진술 통계 정본', () => {
    const stats = collectConceptStats({
        statementStats: { law_s1: { j: 2, w: 0, cid: '2.3' } },
        quizResults: { law_q1: { correct: true, ts: NOW } },
        quizById: {
            law_q1: { id: 'law_q1', conceptId: '2.3' },
            law_q9: { id: 'law_q9', conceptId: '5.1' },
        },
        itemsById: { law_cardA: { anchor: '7.1' } },
        reviewLog: [
            { c: 'law_q1', k: 'q', ok: 1, t: NOW },            // quizResults와 동일 id·ts → 제외
            { c: 'law_q9', k: 'q', ok: 0, t: NOW - DAY },      // 로그에만 있는 판정 → 반영
            { c: 'law_s1', r: 3, t: NOW },                     // sid → 진술 통계 정본, 건너뜀
            { c: 'law_cardA', r: 1, t: NOW - 2 * DAY },        // 카드 Again → 오답 반영
            { c: 'law_cardX', r: 4, t: NOW },                  // itemsById 없음 → 해석 불가 제외
        ],
    }, idx);
    assert.equal(stats['law:§2.3'].n, 3);   // 진술 2 + q1 1 (로그 중복 미반영)
    assert.equal(stats['law:§5.1'].n, 1);
    assert.equal(stats['law:§5.1'].ok, 0);
    assert.equal(stats['card_subj:§7.1'].n, 1);
    assert.equal(stats['card_subj:§7.1'].ok, 0);  // r=1 → 실패
});

test('AI-40: 콘텐츠 총량 — 문항 1·진술 각 1·카드 1 단위 정합', () => {
    const totals = computeConceptTotals({
        quizzes: [
            { id: 'law_q1', conceptId: '2.3', statements: [{ conceptId: '2.3' }, { conceptId: '2.3' }] },
            { id: 'law_q2', conceptId: '2.4' },
        ],
        cards: [{ id: 'card_a', anchor: '2.3' }],
    }, idx);
    assert.equal(totals['law:§2.3'], 3);        // 문항1 + 진술2
    assert.equal(totals['law:§2.4'], 1);
    assert.equal(totals['card_subj:§2.3'], 1);  // 카드 1
});

test('AI-40: 숙련도 산출 — 정답률·최근성·등급 경계·미학습 열거', () => {
    const mk = (n, ok, lastTs) => ({ n, ok, lastTs, items: new Set(['a']) });
    const m = computeMastery({
        'law:§1.1': mk(10, 9, NOW),              // acc≈0.79·r=1 → ~88 숙련
        'law:§1.2': mk(10, 2, NOW),              // acc≈0.29 → ~32 도입
        'law:§1.3': mk(10, 9, NOW - 60 * DAY),   // 오래됨 — r≈0.05 → ~43 진행
        'law:§1.4': mk(4, 4, NOW),               // 소표본 — 사전 보정으로 점수 낮춤
    }, {
        conceptTotals: { 'law:§1.1': 2, 'law:§1.2': 1, 'law:§1.3': 1, 'law:§1.4': 1, 'mfg:§9.9': 3 },
        idx,
        config: { nowMs: NOW },
    });
    assert.equal(m['law:§1.1'].grade, MASTERY_GRADES.MASTER);
    assert.equal(m['law:§1.2'].grade, MASTERY_GRADES.INTRO);
    assert.equal(m['law:§1.3'].grade, MASTERY_GRADES.PROGRESS);
    assert.equal(m['mfg:§9.9'].grade, MASTERY_GRADES.NONE);
    assert.equal(m['mfg:§9.9'].score, 0);
    assert.ok(m['law:§1.1'].score > m['law:§1.3'].score);          // 최근성 감쇠 반영
    assert.ok(m['law:§1.4'].score < 90);                         // 소표본 보정 — 4/4여도 유지 아님
    assert.equal(m['law:§1.1'].cov, 0.5);                        // items 1 / totals 2
    assert.equal(m['law:§1.1'].title, '단원 law:§1.1');          // conceptTitle 라벨
});

test('AI-40: 추천 — 도입~진행만, 커버리지 하한, 점수 오름차순·상한', () => {
    const mk = (n, ok, itemCount) => ({
        n, ok, lastTs: NOW, items: new Set(Array.from({ length: itemCount }, (_, i) => `i${i}`)),
    });
    const m = computeMastery({
        'law:§1': mk(10, 0, 10),   // 도입 (score ~21), cov 10/10=1.0
        'law:§2': mk(10, 4, 10),   // 진행 (score ~46), cov 1.0
        'law:§3': mk(2, 0, 1),     // 도입 후보이나 cov 1/10=0.1 < 0.3 → 제외
        'law:§4': mk(10, 10, 10),  // 유지 → 제외
    }, {
        conceptTotals: { 'law:§1': 10, 'law:§2': 10, 'law:§3': 10, 'law:§4': 10, 'law:§5': 5 },
        idx,
        config: { nowMs: NOW, limit: 3 },
    });
    const acts = nextActions(m, { nowMs: NOW });
    assert.deepEqual(acts.map(a => a.cid), ['law:§1', 'law:§2']);  // 점수 오름차순, §3·§4·§5 제외
    assert.equal(acts[0].title, '단원 law:§1');
});

test('AI-40: 빈 입력 — 빈 맵 반환', () => {
    assert.deepEqual(collectConceptStats({}, idx), {});
    assert.deepEqual(computeMastery({}, { config: { nowMs: NOW } }), {});
    assert.deepEqual(nextActions({}, {}), []);
});
