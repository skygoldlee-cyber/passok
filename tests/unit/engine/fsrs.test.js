// tests/unit/fsrs.test.js — FSRS-6 순수 함수 + 어댑터 검증
// @spec F-07,F-08,F-09,F-11,D-18,D-19,D-20,D-22,ROAD-L7
// DSR 상태 전이·망각 곡선·SM-2 지연 마이그레이션을 결정론적으로 검증한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    Rating, initDifficulty, initStability, retrievability, nextInterval,
    nextDifficulty, recallStability, forgetStability, sameDayStability, fsrsReview, migrateSm2Record
} from '../../../src/study/fsrs.js';
import { updateCardSchedule, getDueCards, getDueCount, getReviewLog, getExamRiskCards, previewCardReview } from '../../../src/study/spaced-repetition.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { todayKey } from '../../../src/utils.js';

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

// ---------- F-11: FSRS-6 엔진 ----------

test('F-11: 정본 골든 벡터 — nextDifficulty(5.0, G=1..4) (ts-fsrs algorithm.test)', () => {
    const want = [8.34176237, 6.66599536, 4.99022837, 3.31446137];
    [1, 2, 3, 4].forEach((g, i) => {
        const v = nextDifficulty(5.0, g);
        assert.ok(Math.abs(v - want[i]) < 1e-6, `G=${g}: ${v} vs ${want[i]}`);
    });
});

test('F-11: 학습 가능 곡선 — R(s,s)≈0.9 불변식 + 목표 간격 = round(s)', () => {
    assert.ok(Math.abs(retrievability(8, 8) - 0.9) < 0.02);
    assert.ok(Math.abs(retrievability(50, 50) - 0.9) < 0.02);
    assert.equal(nextInterval(12.3), 12);
});

test('F-11: 지수 초기 난이도 — Again 6.41 → Easy는 1로 클램프', () => {
    assert.ok(Math.abs(initDifficulty(Rating.AGAIN) - 6.4133) < 1e-4);
    assert.equal(initDifficulty(Rating.EASY), 1);
});

test('F-11: 당일 재복습 — 저안정도 카드는 성장, 성숙 카드는 비감소, Again은 감소', () => {
    // s=1 카드: sinc = e^{w17·w18}·1^{−w19} ≈ 1.05 → 성장 (4.5는 어떤 당일 성공도 증분 0)
    const fresh = { v: 2, d: 5, s: 1, reps: 1, lapses: 0, lastInterval: 0 };
    const up = fsrsReview(fresh, Rating.GOOD, 0);
    assert.ok(up.s > fresh.s, `당일 Good 저안정도: ${fresh.s} → ${up.s}`);
    // s=5 성숙 카드: maskedSinc 하한 1 → 감소하지 않음
    const mature = { v: 2, d: 5, s: 5, reps: 2, lapses: 0, lastInterval: 3 };
    assert.ok(fsrsReview(mature, Rating.GOOD, 0).s >= mature.s);
    // 단기 공식 직접 — G≥Hard는 비감소, Again은 전용 단기 감소
    assert.ok(sameDayStability(5, Rating.HARD) >= 5);
    assert.ok(sameDayStability(5, Rating.GOOD) >= 5);
    assert.ok(sameDayStability(5, Rating.AGAIN) < 5);
});

test('F-11: 랩스 상한 — 장기 수식이 s·e^{−w17·w18}를 넘으면 상한으로 절단', () => {
    // d=1·s=0.5·r=0.3: 장기 수식 ≈0.53 > 상한 0.5·e^{−0.0495}≈0.476 → 0.48(round2)로 절단
    assert.equal(forgetStability(1, 0.5, 0.3), 0.48);
    // 상한 미발동 시 장기 수식 결과 그대로 — d=5·s=5·r=0.9
    assert.ok(forgetStability(5, 5, 0.9) < 5 * Math.exp(-0.5425 * 0.0912) - 0.01);
});

// ---------- 어댑터 (저장소 결선) ----------

test('F-07/F-09: updateCardSchedule이 v2 레코드를 저장하고 due가 전진한다', () => {
    const rec = updateCardSchedule('suba_card_1', true);
    assert.equal(rec.v, 2);
    assert.ok(rec.due > rec.lastReview, `due=${rec.due} last=${rec.lastReview}`);
    const stored = JSON.parse(mockStorage._store['simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION] || '{}');
    assert.ok(stored.suba_card_1 && stored.suba_card_1.v === 2);
});

test('ROAD-L7: updateCardSchedule은 4버튼 등급(1~4)을 직접 수용하고 r을 기록한다', () => {
    // 등급별 안정도 단조 — Again < Hard < Good < Easy (신규 카드)
    const s = r => updateCardSchedule(`m${r}`, r).s;
    assert.ok(s(Rating.AGAIN) < s(Rating.HARD) && s(Rating.HARD) < s(Rating.GOOD) && s(Rating.GOOD) < s(Rating.EASY));
    // 숫자 등급이 로그·레코드에 그대로 반영
    const rec = updateCardSchedule('rated', Rating.HARD);
    assert.equal(rec.r, Rating.HARD);
    assert.equal(getReviewLog().at(-1).r, Rating.HARD);
    // boolean 경로는 하위호환 (true→GOOD, false→AGAIN)
    assert.equal(updateCardSchedule('b1', true).r, Rating.GOOD);
    assert.equal(updateCardSchedule('b2', false).r, Rating.AGAIN);
});

test('ROAD-L7: previewCardReview가 4등급 예상 간격과 마지막 등급을 반환한다', () => {
    updateCardSchedule('prev', Rating.HARD);
    const { intervals, lastRating } = previewCardReview('prev');
    assert.equal(intervals.length, 4);
    assert.ok(intervals[0] <= intervals[1] && intervals[1] <= intervals[2] && intervals[2] <= intervals[3],
        `간격 비단조: ${intervals}`);
    intervals.forEach(d => assert.ok(d >= 1));
    assert.equal(lastRating, Rating.HARD);
    // 신규 카드 — lastRating 없음
    assert.equal(previewCardReview('never_seen').lastRating, null);
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
    assert.deepEqual(getExamRiskCards(undefined), []);
});

test('D-19: dday=0은 유효 — 시험이 오늘인 경우도 위험 카드를 선별한다', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        risky: { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 10, due: dstr(3), lastReview: dstr(-10) }
    });
    // 변이 가드: `dday < 0` → `dday <= 0`이면 이 경로가 빈 배열을 반환
    assert.equal(getExamRiskCards(0).length, 1);
});

test('D-19: 데이터가 심어둔 상태에서 음수 dday는 여전히 빈 배열이다', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        risky: { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 10, due: dstr(3), lastReview: dstr(-10) }
    });
    // 빈 스케줄이면 `dday < 0` 가드 제거 변이가 구별 불가 — 데이터 필요
    assert.deepEqual(getExamRiskCards(-3), []);
});

test('D-19: due·lastReview 필드가 없는 레코드는 건너뛴다', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        nodue:  { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 10, lastReview: dstr(-10) },
        nolast: { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 10, due: dstr(20) }
    });
    assert.deepEqual(getExamRiskCards(10), []);
});

test('D-19: 미래 lastReview는 경과일 0으로 클램프된다 (음수 경과 방지)', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        fut: { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 5, due: dstr(20), lastReview: dstr(2) }
    });
    const risk = getExamRiskCards(10);
    assert.equal(risk.length, 1);
    // elapsedAtExam = 10 + max(0, 음수) = 10 — Math.min 변이면 더 작은 R
    const expected = retrievability(10, 2);
    assert.ok(Math.abs(risk[0].rExam - expected) < 1e-9, `rExam=${risk[0].rExam} vs ${expected}`);
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
    assert.ok(risk[0].rExam < 0.95);
});

test('D-19: FSRS 정합 레코드(due=lastReview+round(s))도 목표 0.95 밴드에서 선별된다', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    // s=16·interval 16 — due>exam 이고 시험일 R≈0.90 (<0.95 목표 밴드, 0.85 임계로는 절대 도달 불가)
    mockStorage._store[srKey] = JSON.stringify({
        near: { v: 2, d: 5, s: 16, reps: 4, lapses: 0, lastInterval: 16, due: dstr(11), lastReview: dstr(-5) },
        far:  { v: 2, d: 5, s: 60, reps: 8, lapses: 0, lastInterval: 60, due: dstr(55), lastReview: dstr(-5) } // R_exam≥0.95 — 제외
    });
    const risk = getExamRiskCards(10);
    assert.deepEqual(risk.map(r => r.id), ['near']);
    assert.ok(risk[0].rExam >= 0.9 && risk[0].rExam < 0.95);
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

// ---------- D-20: 시험일 due 클램프 ----------

function setExam(offset) {
    mockStorage._store['simexam:' + STORAGE_KEYS.EXAM_DATE] = dstr(offset);
}

function seedCard(id, rec) {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    const cur = JSON.parse(mockStorage._store[srKey] || '{}');
    cur[id] = rec;
    mockStorage._store[srKey] = JSON.stringify(cur);
}

function storedDue(id) {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    return JSON.parse(mockStorage._store[srKey])[id].due;
}

test('D-20: due>exam ∧ R_exam<0.95 → due를 exam−1로 당긴다', () => {
    setExam(10);
    // elapsed=1이라 s≈15 유지 → 간격 ~16 > dday 10, R(10,~16)≈0.93 <0.95
    seedCard('clampme', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(14), lastReview: dstr(-1) });
    updateCardSchedule('clampme', true);
    assert.equal(storedDue('clampme'), dstr(9), 'due가 exam-1로 당겨져야 함');
});

test('D-20: 성숙 카드(R_exam≥0.95)는 클램프하지 않는다', () => {
    setExam(10);
    seedCard('mature', { v: 2, d: 3, s: 100, reps: 9, lapses: 0, lastInterval: 100, due: dstr(99), lastReview: dstr(-1) });
    const rec = updateCardSchedule('mature', true);
    assert.ok(rec.due > dstr(10), `due=${rec.due} — 시험 너머 그대로 유지`);
    assert.notEqual(rec.due, dstr(9));
});

test('D-20: 시험 전 due인 카드·시험일 미설정·과거 시험일은 클램프 없음', () => {
    setExam(10);
    seedCard('soon', { v: 2, d: 5, s: 5, reps: 3, lapses: 0, lastInterval: 5, due: dstr(4), lastReview: dstr(-1) });
    const soon = updateCardSchedule('soon', true);
    assert.ok(soon.due <= dstr(10), '산출 due가 시험 전이면 그대로');

    // 시험일 미설정 — 당길 대상이 없다
    delete mockStorage._store['simexam:' + STORAGE_KEYS.EXAM_DATE];
    seedCard('noexam', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(14), lastReview: dstr(-1) });
    const noexam = updateCardSchedule('noexam', true);
    assert.ok(noexam.due > dstr(10), '미설정 시 산출 due 유지');

    // 과거 시험일 — 비활성
    setExam(-2);
    seedCard('pastexam', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(14), lastReview: dstr(-1) });
    const past = updateCardSchedule('pastexam', true);
    assert.ok(past.due > dstr(10), '지난 시험일에는 비활성');
});

test('D-20: 비정형 시험일 문자열은 미설정과 동일하게 무시된다', () => {
    const exKey = 'simexam:' + STORAGE_KEYS.EXAM_DATE;
    const validDue = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    for (const bad of ['2026/03/01', '2026-3-1', 'not-a-date', '1invalid', '']) {
        mockStorage._store[exKey] = bad;
        // '1invalid'처럼 lexically due보다 작은 문자열이 시험일로 오인되면
        // due>examStr 조건이 발화해 잘못된 NaN 날짜로 클램프된다 — 정규식 게이트 검증.
        seedCard('b', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(60), lastReview: dstr(-1) });
        const rec = updateCardSchedule('b', true);
        assert.ok(validDue(rec.due), `비정형 "${bad}"인데 클램프 적용됨: due=${rec.due}`);
        assert.ok(rec.due >= dstr(1), `due가 미래로 정상 산출되어야 함: ${rec.due}`);
    }
    // 비문자열 저장값도 무시
    mockStorage._store[exKey] = 20260301;
    seedCard('b', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(60), lastReview: dstr(-1) });
    assert.ok(validDue(updateCardSchedule('b', true).due), '비문자열 exam_date에도 클램프 없어야 함');
});

test('F-09: 스케줄 저장소 JSON 손상 시 빈 상태로 복구된다', () => {
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = '{broken json';
    assert.deepEqual(getDueCards(), []);
    assert.equal(getDueCount(), 0);
    // 손상 상태에서도 갱신은 정상 기록된다
    const rec = updateCardSchedule('c1', true);
    assert.equal(rec.v, 2);
});

test('F-09: getDueCount는 getDueCards 길이와 일치한다', () => {
    seedCard('due1', { v: 2, d: 5, s: 2, reps: 1, lapses: 0, lastInterval: 1, due: dstr(0), lastReview: dstr(-1) });
    seedCard('due2', { v: 2, d: 5, s: 2, reps: 1, lapses: 0, lastInterval: 1, due: dstr(-1), lastReview: dstr(-2) });
    seedCard('future', { v: 2, d: 5, s: 2, reps: 1, lapses: 0, lastInterval: 1, due: dstr(5), lastReview: dstr(-1) });
    assert.equal(getDueCount(), 2);
});

test('D-20: 시험일이 오늘이면 클램프 비활성 (examStr > todayStr 경계)', () => {
    setExam(0); // 시험 당일 — examStr == todayStr → 클램프 조건 부발화
    seedCard('edge', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(14), lastReview: dstr(-1) });
    const rec = updateCardSchedule('edge', true);
    assert.ok(rec.due >= dstr(1), `당일 시험에 과거로 클램프되면 안 됨: due=${rec.due}`);
});

test('D-20: due==exam 경계는 사각지대가 아니므로 클램프하지 않는다', () => {
    setExam(10);
    // 성숙 카드 — 간격이 커서 산출 due가 exam보다 뒤. due==exam 정확 경계는
    // updateCardSchedule 경로로 만들기 어려우므로 getExamRiskCards 경계로 검증:
    const srKey = 'simexam:' + STORAGE_KEYS.FC_SPACED_REPETITION;
    mockStorage._store[srKey] = JSON.stringify({
        onexam: { v: 2, d: 5, s: 2, reps: 3, lapses: 0, lastInterval: 5, due: dstr(10), lastReview: dstr(-10) }
    });
    assert.deepEqual(getExamRiskCards(10), [], 'due==시험일이면 위험 아님 (변이 due>=exam 가드)');
});

test('D-20: 클램프된 카드는 D-19 위험 집합에서 제외된다 (due≤exam)', () => {
    setExam(10);
    seedCard('pulled', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(14), lastReview: dstr(-1) });
    updateCardSchedule('pulled', true);
    const risk = getExamRiskCards(10);
    assert.ok(!risk.some(r => r.id === 'pulled'), 'exam−1 due는 시험 전 예정 복습 — 사각지대 해소');
});

// ---------- D-22 선행: 퀴즈 판정 시퀀스 로그 ----------

test('D-22: recordQuizJudgment가 {c,k:q,ok,t} 레코드를 로그에 append한다', async () => {
    const { recordQuizJudgment } = await import('../../../src/study/spaced-repetition.js');
    recordQuizJudgment('subject1_q21', true);
    recordQuizJudgment('subject2_q5', false);
    updateCardSchedule('card_x', true);  // 스케줄 이벤트와 혼합
    const log = getReviewLog();
    assert.equal(log.length, 3);
    assert.deepEqual({ c: log[0].c, k: log[0].k, ok: log[0].ok }, { c: 'subject1_q21', k: 'q', ok: 1 });
    assert.equal(log[1].ok, 0);
    assert.ok(log[0].t > 0 && !('r' in log[0]), '퀴즈 레코드는 레이팅 필드 없음');
    assert.equal(log[2].r, Rating.GOOD, '스케줄 이벤트는 k 없이 기존 스키마 유지');
});

test('D-22: 퀴즈·스케줄 레코드가 단일 시계열 링버퍼를 공유한다', async () => {
    const { recordQuizJudgment } = await import('../../../src/study/spaced-repetition.js');
    const logKey = 'simexam:' + STORAGE_KEYS.FC_REVIEW_LOG;
    const seed = Array.from({ length: 2000 }, (_, i) => ({ c: `old_${i}`, r: 3, e: 0, t: i }));
    mockStorage._store[logKey] = JSON.stringify(seed);
    recordQuizJudgment('q_new', true);
    const log = getReviewLog();
    assert.equal(log.length, 2000);
    assert.equal(log[1999].k, 'q', 'FIFO 상한 공유 — 퀴즈 레코드도 같은 버퍼');
});
