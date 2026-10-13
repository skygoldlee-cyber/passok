// tests/unit/fsrs.test.js — FSRS-4.5 순수 함수 + 어댑터 검증
// @spec F-07,F-08,F-09,D-18,D-19
// DSR 상태 전이·망각 곡선·SM-2 지연 마이그레이션을 결정론적으로 검증한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    Rating, initDifficulty, initStability, retrievability, nextInterval,
    nextDifficulty, recallStability, fsrsReview, migrateSm2Record
} from '../../src/fsrs.js';
import { updateCardSchedule, getDueCards, getReviewLog, getExamRiskCards } from '../../src/spaced-repetition.js';
import { STORAGE_KEYS } from '../../src/storage-keys.js';
import { todayKey } from '../../src/utils.js';

/** 오늘 기준 offset일 뒤/전의 'YYYY-MM-DD' */
function dstr(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return todayKey(d);
}

function createMockStorage() {
    const store = {};
    return {
        getItem(key) { return key in store ? store[key] : null; },
        setItem(key, value) { store[key] = String(value); },
        removeItem(key) { delete store[key]; },
        clear() { for (const k of Object.keys(store)) delete store[k]; },
        _store: store
    };
}

let mockStorage, originalLocalStorage, originalWindow;
beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true, configurable: true });
    originalWindow = global.window;
    Object.defineProperty(global, 'window', { value: { EXAMS_LIST: { exams: [{ id: 'simexam', default: true }] } }, writable: true, configurable: true });
    mockStorage.setItem('current_exam', 'simexam');
});
afterEach(() => {
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true });
    if (originalWindow !== undefined) Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    else delete global.window;
});

// ---------- 망각 곡선·간격 ----------

test('F-07: retrievability — t=0이면 1, 경과일↑이면 단조 감소, t=s이면 ≈0.9', () => {
    assert.equal(retrievability(0, 5), 1);
    const r = retrievability(10, 10);
    assert.ok(Math.abs(r - 0.9) < 0.02, `R(s)=${r}`);
    assert.ok(retrievability(30, 10) < retrievability(5, 10));
});

test('F-07: nextInterval — 양의 정수·상한 클램프', () => {
    assert.equal(nextInterval(0.4), 1);
    assert.ok(nextInterval(10) > 1);
    assert.ok(nextInterval(1e9) <= 36500);
});

// ---------- 상태 전이 ----------

test('F-07: 최초 학습 — 레이팅별 초기 s·d, Again은 lapses=1', () => {
    const good = fsrsReview(null, Rating.GOOD, 0);
    assert.equal(good.s, initStability(Rating.GOOD));
    assert.equal(good.d, initDifficulty(Rating.GOOD));
    assert.equal(good.reps, 1);
    assert.equal(good.lapses, 0);
    const again = fsrsReview(null, Rating.AGAIN, 0);
    assert.equal(again.lapses, 1);
    // 쉬운 카드는 초기 안정도가 더 크다
    assert.ok(initStability(Rating.EASY) > initStability(Rating.AGAIN));
});

test('F-07: 성공 복습은 안정도를 키우고 Again은 낮춘다', () => {
    const s0 = { v: 2, d: 5, s: 5, reps: 3, lapses: 0, lastInterval: 5 };
    const r = retrievability(5, 5);
    const up = fsrsReview(s0, Rating.GOOD, 5);
    assert.ok(up.s > s0.s, `s ${s0.s} → ${up.s}`);
    assert.equal(up.reps, 4);
    const down = fsrsReview(s0, Rating.AGAIN, 5);
    assert.ok(down.s <= s0.s, `s ${s0.s} → ${down.s}`);
    assert.equal(down.lapses, 1);
    assert.ok(r > 0 && r < 1);
});

test('F-07: 난이도는 Again 시 상승·Easy 시 하락하고 1~10 범위 유지', () => {
    const d0 = 5;
    const up = nextDifficulty(d0, Rating.AGAIN);
    const down = nextDifficulty(d0, Rating.EASY);
    assert.ok(up > d0 && down < d0, `up=${up} down=${down}`);
    assert.ok(nextDifficulty(10, Rating.AGAIN) <= 10);
    assert.ok(nextDifficulty(1, Rating.EASY) >= 1);
});

test('F-07: 어려운 카드(d↑)는 같은 간격에서 안정도 증분이 작다', () => {
    const r = 0.9;
    const easyGain = recallStability(2, 5, r, Rating.GOOD) - 5;
    const hardGain = recallStability(9, 5, r, Rating.GOOD) - 5;
    assert.ok(easyGain > hardGain, `easy +${easyGain} vs hard +${hardGain}`);
});

// ---------- SM-2 → FSRS 지연 변환 ----------

test('F-08: migrateSm2Record — EF→d 역산·간격→s 근사·nextReview→due 계승', () => {
    const m = migrateSm2Record({
        repetition: 4, easiness: 2.5,
        lastReview: '2026-10-01', nextReview: '2026-10-15'
    });
    assert.equal(m.v, 2);
    assert.equal(m.d, 1);            // EF 2.5 → 쉬움
    assert.equal(m.s, 14);           // 10-01 → 10-15 간격
    assert.equal(m.due, '2026-10-15');
    assert.equal(m.reps, 4);
    assert.equal(m.lapses, 0);
    const hard = migrateSm2Record({ repetition: 2, easiness: 1.3, lastReview: '2026-10-10', nextReview: '2026-10-12' });
    assert.equal(hard.d, 10);        // EF 1.3 → 어려움
    assert.equal(hard.s, 2);
    // rep 0 + lastReview 있음 → 실패 이력으로 lapses=1 추정
    const lapsed = migrateSm2Record({ repetition: 0, easiness: 2.5, lastReview: '2026-10-01', nextReview: '2026-10-02' });
    assert.equal(lapsed.lapses, 1);
    assert.equal(migrateSm2Record(null), null);
});

// ---------- 어댑터 (저장소 결선) ----------

test('F-07/F-09: updateCardSchedule이 v2 레코드를 저장하고 due가 전진한다', () => {
    const rec = updateCardSchedule('suba_card_1', true);
    assert.equal(rec.v, 2);
    assert.ok(rec.due > rec.lastReview, `due=${rec.due} last=${rec.lastReview}`);
    const stored = JSON.parse(mockStorage._store['simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION] || '{}');
    assert.ok(stored.suba_card_1 && stored.suba_card_1.v === 2);
});

test('F-07: 구 SM-2 레코드도 읽기·갱신 호환 (지연 변환)', () => {
    const key = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[key] = JSON.stringify({
        old_card: { repetition: 2, easiness: 2.5, nextReview: '2000-01-01', lastReview: '1999-12-28' }
    });
    const due = getDueCards();
    assert.ok(due.includes('old_card'), '구 레코드 due 조회 호환');
    const rec = updateCardSchedule('old_card', true);
    assert.equal(rec.v, 2);
    assert.equal(rec.reps, 3); // rep 계승 +1
});

// ---------- D-18: 리뷰 로그 링버퍼 ----------

test('D-18: updateCardSchedule이 {c,r,e,t} 레코드를 로그에 append한다', () => {
    const logKey = 'simexam:' + STORAGE_KEYS.FC_REVIEW_LOG;
    updateCardSchedule('suba_card_1', true);
    updateCardSchedule('suba_card_2', false);
    const log = getReviewLog();
    assert.equal(log.length, 2);
    assert.equal(log[0].c, 'suba_card_1');
    assert.equal(log[0].r, Rating.GOOD);   // 외움 → 3
    assert.equal(log[0].e, 0);             // 최초 학습 — 경과일 0
    assert.equal(log[1].r, Rating.AGAIN);  // 헷갈림 → 1
    assert.ok(Number.isFinite(log[0].t) && log[0].t > 0);
    assert.ok(JSON.parse(mockStorage._store[logKey]).length === 2);
});

test('D-18: 경과일은 직전 복습 기준 — lastReview 5일 전 레코드는 e=5', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        card_a: { v: 2, d: 5, s: 5, reps: 2, lapses: 0, lastInterval: 5, due: dstr(-1), lastReview: dstr(-5) }
    });
    updateCardSchedule('card_a', true);
    const log = getReviewLog();
    assert.equal(log[0].e, 5);
});

test('D-18: 링버퍼 상한 — 2,000건 초과 시 최오래 항목부터 탈락', () => {
    const logKey = 'simexam:' + STORAGE_KEYS.FC_REVIEW_LOG;
    const seed = Array.from({ length: 2000 }, (_, i) => ({ c: `old_${i}`, r: 3, e: 0, t: i }));
    mockStorage._store[logKey] = JSON.stringify(seed);
    updateCardSchedule('new_card', true);
    const log = getReviewLog();
    assert.equal(log.length, 2000);
    assert.equal(log[0].c, 'old_1');           // old_0 탈락
    assert.equal(log[1999].c, 'new_card');
});

test('D-18: 손상된 로그는 빈 배열로 복구된다', () => {
    mockStorage._store['simexam:' + STORAGE_KEYS.FC_REVIEW_LOG] = '{broken';
    assert.deepEqual(getReviewLog(), []);
    mockStorage._store['simexam:' + STORAGE_KEYS.FC_REVIEW_LOG] = '{"not":"array"}';
    assert.deepEqual(getReviewLog(), []);
});

// ---------- D-19: 시험일 목표 R 위험 카드 ----------

test('D-19: dday 미설정·음수·비수치면 빈 배열', () => {
    assert.deepEqual(getExamRiskCards(null), []);
    assert.deepEqual(getExamRiskCards(-3), []);
    assert.deepEqual(getExamRiskCards(NaN), []);
});

test('D-19: due>examDate ∧ R_exam<0.85 인 카드만 선별 — due 큐·예정 복습 제외', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        risky:     { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 10, due: dstr(11), lastReview: dstr(-10) },
        scheduled: { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 5,  due: dstr(5),  lastReview: dstr(-10) }, // 시험 전 복습 예정
        duenow:    { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 5,  due: dstr(0),  lastReview: dstr(-10) }, // due 큐 소유
        onexam:    { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 5,  due: dstr(10), lastReview: dstr(-10) }, // 시험일 당일 due
        safe:      { v: 2, d: 5, s: 200, reps: 9, lapses: 0, lastInterval: 60, due: dstr(15), lastReview: dstr(-10) }
    });
    const risk = getExamRiskCards(10);
    assert.deepEqual(risk.map(r => r.id), ['risky']);
    assert.ok(risk[0].rExam < 0.85);
});

test('D-19: R_exam 오름차순 정렬 — 가장 잊을 카드가 먼저', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        less: { v: 2, d: 5, s: 8, reps: 3, lapses: 0, lastInterval: 10, due: dstr(20), lastReview: dstr(-5) },
        most: { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 10, due: dstr(20), lastReview: dstr(-5) }
    });
    const risk = getExamRiskCards(14);
    assert.equal(risk.length, 2);
    assert.equal(risk[0].id, 'most');
    assert.ok(risk[0].rExam < risk[1].rExam);
});
