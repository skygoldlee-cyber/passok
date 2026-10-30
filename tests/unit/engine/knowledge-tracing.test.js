// tests/unit/knowledge-tracing.test.js — BKT 단원 숙달 추정 순수 로직
// @spec D-22
// LEARNING_ALGORITHM_DESIGN §3.2 수식의 골든 수열 검증 — 손계산 기대값으로
// 사후확률 갱신·학습 전이·파라미터 오버라이드를 결정론적으로 확인한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    KT_DEFAULTS, KT_GRADUATE_PL, bktUpdate, computeUnitMastery, resolveKtParams
} from '../../../src/study/knowledge-tracing.js';

const MCQ = { T: KT_DEFAULTS.T, G: KT_DEFAULTS.G.mcq, S: KT_DEFAULTS.S };
const OX = { T: KT_DEFAULTS.T, G: KT_DEFAULTS.G.ox, S: KT_DEFAULTS.S };

// ---------- bktUpdate 골든 벡터 (손계산) ----------
// 정답: post = P·(1−S)/[P·(1−S)+(1−P)·G] → P' = post+(1−post)·T
// 오답: post = P·S/[P·S+(1−P)·(1−G)]     → 동일 전이

test('D-22: bktUpdate 정답 갱신 — P(0.3)→0.7424 (골든)', () => {
    // post = 0.27/0.375 = 0.72 → 0.72 + 0.28·0.08 = 0.7424
    assert.ok(Math.abs(bktUpdate(0.3, true, MCQ) - 0.7424) < 1e-9);
});

test('D-22: bktUpdate 오답 갱신 — P(0.3)→0.12416 (골든)', () => {
    // post = 0.03/0.625 = 0.048 → 0.048 + 0.952·0.08 = 0.12416
    assert.ok(Math.abs(bktUpdate(0.3, false, MCQ) - 0.12416) < 1e-9);
});

test('D-22: bktUpdate OX 추측률 — 같은 정답이 mcq보다 덜 오른다', () => {
    // G=0.30: post = 0.27/0.48 = 0.5625 → 0.5625 + 0.4375·0.08 = 0.5975
    assert.ok(Math.abs(bktUpdate(0.3, true, OX) - 0.5975) < 1e-9);
    assert.ok(bktUpdate(0.3, true, OX) < bktUpdate(0.3, true, MCQ), 'OX 정답은 추측 가능성이 커 숙달 증거가 약함');
});

test('D-22: bktUpdate 고숙달 오답 — 슬립으로 완화돼도 크게 하락', () => {
    // post = 0.09/0.175 ≈ 0.514286 → +0.485714·0.08 ≈ 0.553143
    const p = bktUpdate(0.9, false, MCQ);
    assert.ok(Math.abs(p - 0.553143) < 1e-5);
});

// ---------- computeUnitMastery 시퀀스 ----------

test('D-22: 정답 3연속 → 졸업 기준(P(L)≥0.9) 도달 (골든 수열)', () => {
    const seq = [{ correct: true }, { correct: true }, { correct: true }];
    const p = computeUnitMastery(seq); // 0.3 → 0.7424 → 0.9497 → ≈0.99195
    assert.ok(Math.abs(p - 0.991950) < 1e-5, `P(L)=${p}`);
    assert.ok(p >= KT_GRADUATE_PL);
});

test('D-22: 오답 후 정답 — T 전이로 점진 회복, 단조 아님', () => {
    const down = computeUnitMastery([{ correct: false }]);            // 0.12416
    const rec = computeUnitMastery([{ correct: false }, { correct: true }]);
    assert.ok(rec > down && rec < 0.9, `회복 P(L)=${rec}`);
});

test('D-22: 관측 순서가 결과를 바꾼다 — 마지막 관측이 지배적', () => {
    const endWrong = computeUnitMastery([{ correct: true }, { correct: false }]);
    const endRight = computeUnitMastery([{ correct: false }, { correct: true }]);
    assert.ok(endRight > endWrong, 'BKT는 최종 판정이 아니라 순서를 반영해야 한다');
});

test('D-22: kind 미지정은 mcq 추측률, ox 명시는 OX 추측률 적용', () => {
    const mcq = computeUnitMastery([{ correct: true }]);
    const ox = computeUnitMastery([{ correct: true, kind: 'ox' }]);
    assert.ok(ox < mcq);
    assert.equal(mcq, bktUpdate(KT_DEFAULTS.P0, true, MCQ));
});

test('D-22: p0 사전 승계 — v1 Beta 증거를 초기 P(L)로 반영', () => {
    // p0=0.9 + 오답 1회 → bktUpdate(0.9,false,MCQ) ≈ 0.553143
    const p = computeUnitMastery([{ correct: false }], KT_DEFAULTS, 0.9);
    assert.ok(Math.abs(p - 0.553143) < 1e-5);
    assert.ok(computeUnitMastery([], KT_DEFAULTS, 0.7) === 0.7, '시퀀스 없으면 사전 그대로');
});

// ---------- resolveKtParams ----------

test('D-22: resolveKtParams — 미선언·부분·범위 외 값은 기본값 유지', () => {
    assert.deepEqual(resolveKtParams(undefined), KT_DEFAULTS);
    const ov = resolveKtParams({ T: 0.2, G: { ox: 0.5 }, P0: 9, S: -1 });
    assert.equal(ov.T, 0.2);
    assert.equal(ov.G.ox, 0.5);
    assert.equal(ov.G.mcq, KT_DEFAULTS.G.mcq, '부분 오버라이드는 나머지 기본값 유지');
    assert.equal(ov.P0, KT_DEFAULTS.P0, '범위 외(>1)는 기본값');
    assert.equal(ov.S, KT_DEFAULTS.S, '음수는 기본값');
});
