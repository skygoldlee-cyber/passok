// tests/unit/personalization-view.test.js — 개인 맞춤 뷰 어댑터 + FSRS 개인 피팅 훅
// @spec PS-01,PS-05,PS-06,PS-07,PS-08,PS-11
// personalization-view.js의 저장소 부재(node) 환경 저하 동작과
// fsrs.js setPersonalDecay 유효 범위를 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    getPersonalFit, applyPersonalFit, refitPersonalModels, subjectJudgmentSeqs,
    personalKtParams, weakClusters, resolveCidChapter, suggestWrongCauseKey,
    recordDiagnosticP0
} from '../../src/views/personalization-view.js';
import { setPersonalDecay, currentDecayW20 } from '../../src/fsrs.js';

// ── PS-08 원인 자동 추정 → 분류표 키 매핑 ────────────────────────
test('PS-08: 즉답 오답은 실수(calc), 장고·망설임은 개념(concept)으로 제안', () => {
    assert.equal(suggestWrongCauseKey({ wasCorrect: false, ms: 2000 }), 'calc');
    assert.equal(suggestWrongCauseKey({ wasCorrect: false, ms: 70000 }), 'concept');
    assert.equal(suggestWrongCauseKey({ wasCorrect: false, ms: 10000, changed: true }), 'concept');
    assert.equal(suggestWrongCauseKey({ wasCorrect: false, confidence: 'high' }), 'concept');
});

test('PS-08: 정답·판정 불가 관측은 제안 없음', () => {
    assert.equal(suggestWrongCauseKey({ wasCorrect: true }), null);
    assert.equal(suggestWrongCauseKey({ wasCorrect: false, ms: 10000 }), null); // unknown
    assert.equal(suggestWrongCauseKey(null), null);
});

// ── PS-07/PS-11 BKT 파라미터 병합 ───────────────────────────────
test('PS-07/PS-11: 피팅 없으면 기본 파라미터 + 빈 bySubject', () => {
    const p = personalKtParams();
    assert.ok(typeof p.P0 === 'number' && typeof p.T === 'number');
    assert.ok(typeof p.G.mcq === 'number' && typeof p.G.ox === 'number');
    assert.deepEqual(p.bySubject, {});
});

// ── 어댑터 저하 동작 (저장소·자산 부재 환경) ───────────────────
test('저장소 부재 시 어댑터는 조용히 저하된다', () => {
    assert.deepEqual(getPersonalFit(), {});
    assert.equal(subjectJudgmentSeqs().size, 0);
    assert.deepEqual(weakClusters(), []);
    // cid 해석: 단원 맵 부재 시 앵커 문자열 폴백, 귀속 불가(q: 프리픽스)는 null
    assert.equal(resolveCidChapter('L0042', 'subj1'), 'L0042');
    assert.equal(resolveCidChapter('q:subj1_quiz_1', 'subj1'), null);
    // 호출 자체가 예외 없이 동작 (내부 저장 실패는 비차단)
    assert.doesNotThrow(() => applyPersonalFit());
    assert.doesNotThrow(() => recordDiagnosticP0({ subj1: 0.6 }));
    const fit = refitPersonalModels(true);
    assert.ok(typeof fit.fittedAt === 'number');
});

// ── PS-06 FSRS 개인 w20 적용 훅 ────────────────────────────────
test('PS-06: 유효 w20만 적용 — 범위 밖·비수치는 기본값 유지', () => {
    const base = currentDecayW20();
    assert.equal(setPersonalDecay(0.20), true);
    assert.equal(currentDecayW20(), 0.20);
    assert.equal(setPersonalDecay(0.01), false);  // 격자 하한 미만
    assert.equal(setPersonalDecay(0.99), false);  // 격자 상한 초과
    assert.equal(setPersonalDecay('x'), false);
    assert.equal(currentDecayW20(), 0.20);        // 거부 시 직전 유효값 유지
    setPersonalDecay(base);                        // 원복 — 이후 테스트 오염 방지
});
