// tests/dom/study/study-spacedrep.dom.test.js — FSRS 간격반복 어댑터 분기 커버리지
// @spec F-07~09,D-18~20,ROAD-L7,AI-32
// 유닛(node:test·c8)과 별도 좌표로 계측되는 vitest 커버리지 보강 — 저장소
// 어댑터의 시드·시험일 클램프·링버퍼·위험 카드 경로를 jsdom 환경에서 실행한다.
// (DOM 검증이 아닌 모듈 분기 실행 — coverage_merge 병합 지표 대상)

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import {
    updateCardSchedule, getDueCards, getReviewLog,
    getExamRiskCards, previewCardReview, recordQuizJudgment,
} from '../../../src/study/spaced-repetition.js';
import {
    Rating, initDifficulty, setPersonalDecay, currentDecayW20,
    retrievability, fsrsReview, migrateSm2Record,
} from '../../../src/study/fsrs.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { scopedKey } from '../../../src/exam-context.js';
import { todayKey } from '../../../src/utils.js';

function dstr(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return todayKey(d);
}
const SR_KEY = () => scopedKey(STORAGE_KEYS.FC_SPACED_REPETITION);
const LOG_KEY = () => scopedKey(STORAGE_KEYS.FC_REVIEW_LOG);
const EXAM_KEY = () => scopedKey(STORAGE_KEYS.EXAM_DATE);

function seedCard(id, rec) {
    const cur = JSON.parse(localStorage.getItem(SR_KEY()) || '{}');
    cur[id] = rec;
    localStorage.setItem(SR_KEY(), JSON.stringify(cur));
}

const BASE_W20 = currentDecayW20();
beforeEach(() => {
    localStorage.clear();
    delete window.DIFFICULTY_SEED;
});
afterEach(() => {
    setPersonalDecay(BASE_W20);   // 모듈 상태 복원 — 후속 테스트의 DECAY/FACTOR 오염 방지
    delete window.DIFFICULTY_SEED;
});

describe('FSRS 순수 함수 — vitest 측 분기', () => {
    it('PS-06: setPersonalDecay — 범위 밖·비수치 거부, 유효값은 w20 교체', () => {
        expect(setPersonalDecay('0.2')).toBe(false);   // 비수치
        expect(setPersonalDecay(NaN)).toBe(false);
        expect(setPersonalDecay(0.04)).toBe(false);    // 하한 미만
        expect(setPersonalDecay(0.41)).toBe(false);    // 상한 초과
        expect(setPersonalDecay(0.3)).toBe(true);
        expect(currentDecayW20()).toBeCloseTo(0.3, 10);
        // 불변식 — 어떤 w20에서도 R(s,s)≈목표 기억률 0.9
        expect(Math.abs(retrievability(10, 10) - 0.9)).toBeLessThan(0.02);
    });

    it('F-07: retrievability — s≤0이면 0 (분모 보호)', () => {
        expect(retrievability(10, 0)).toBe(0);
        expect(retrievability(5, -1)).toBe(0);
    });

    it('F-11: 성공 복습 안정도 — Hard<Good<Easy, reps 부재는 0 기본값', () => {
        const s0 = { v: 2, d: 5, s: 5, reps: 3, lapses: 0, lastInterval: 5 };
        expect(fsrsReview(s0, Rating.HARD, 5).s).toBeLessThan(fsrsReview(s0, Rating.GOOD, 5).s);
        expect(fsrsReview(s0, Rating.GOOD, 5).s).toBeLessThan(fsrsReview(s0, Rating.EASY, 5).s);
        const bare = fsrsReview({ v: 2, d: 5, s: 5 }, Rating.GOOD, 3);
        expect(bare.reps).toBe(1);
        expect(bare.lapses).toBe(0);
    });

    it('F-11: 당일 재복습·실패 경로 — sameDay·forget 안정도 분기', () => {
        const s0 = { v: 2, d: 5, s: 5, reps: 2, lapses: 0, lastInterval: 3 };
        expect(fsrsReview(s0, Rating.GOOD, 0).s).toBeGreaterThanOrEqual(s0.s);   // sameDay
        const again = fsrsReview(s0, Rating.AGAIN, 5);                            // forget
        expect(again.lapses).toBe(1);
        expect(again.s).toBeLessThanOrEqual(s0.s);
    });

    it('F-08: migrateSm2Record — 비객체·필드 부재·today 근사 경로', () => {
        expect(migrateSm2Record(null)).toBeNull();
        expect(migrateSm2Record(42)).toBeNull();                        // typeof !== 'object'
        const bare = migrateSm2Record({ repetition: 1, easiness: 2.5 });
        expect(bare.due).toBeNull();
        expect(bare.s).toBe(0.4);                                       // 간격 근사 0 → 하한
        // lastReview 없이 nextReview만 → today 기준 근사
        const t = migrateSm2Record({ repetition: 0, easiness: 2.5, nextReview: dstr(5) }, todayKey());
        expect(t.s).toBeGreaterThanOrEqual(4);
        expect(t.lapses).toBe(0);                                       // lastReview 부재 → 0
        // repetition 0 + lastReview 있음 → 실패 이력 lapses=1 추정
        const lapsed = migrateSm2Record({ repetition: 0, easiness: 2.5, lastReview: dstr(-2), nextReview: dstr(1) });
        expect(lapsed.lapses).toBe(1);
    });
});

describe('간격반복 어댑터 — 시드·시험일 클램프', () => {
    it('AI-32: 비수치 시드는 D0 대체를 건너뛰고 유효 시드만 적용한다', () => {
        window.DIFFICULTY_SEED = { bad: 'x', nan: NaN, good: 8.5 };
        expect(updateCardSchedule('bad', Rating.GOOD).d).toBe(initDifficulty(Rating.GOOD));
        expect(updateCardSchedule('nan', Rating.GOOD).d).toBe(initDifficulty(Rating.GOOD));
        expect(updateCardSchedule('good', Rating.GOOD).d).toBe(8.5);
    });

    it('AI-32: window 부재(Node 컨텍스트)는 시드 없음과 동일하게 동작한다', () => {
        vi.stubGlobal('window', undefined);                 // _seedD0의 window 가드 경로
        try {
            expect(updateCardSchedule('nowin', Rating.GOOD).d).toBe(initDifficulty(Rating.GOOD));
        } finally { vi.unstubAllGlobals(); }
    });

    it('D-20: due>exam ∧ R_exam<0.95 → due를 exam−1로 당긴다', () => {
        localStorage.setItem(EXAM_KEY(), dstr(10));
        seedCard('cl', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(14), lastReview: dstr(-1) });
        expect(updateCardSchedule('cl', Rating.GOOD).due).toBe(dstr(9));
    });

    it('D-20: 성숙 카드·시험 미설정·과거 시험일은 클램프 없음', () => {
        localStorage.setItem(EXAM_KEY(), dstr(10));
        seedCard('m', { v: 2, d: 3, s: 100, reps: 9, lapses: 0, lastInterval: 100, due: dstr(99), lastReview: dstr(-1) });
        expect(updateCardSchedule('m', Rating.GOOD).due > dstr(10)).toBe(true);

        localStorage.removeItem(EXAM_KEY());                            // 미설정 — _examDateStr null
        seedCard('n', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(60), lastReview: dstr(-1) });
        expect(updateCardSchedule('n', Rating.GOOD).due > dstr(10)).toBe(true);

        localStorage.setItem(EXAM_KEY(), dstr(-2));                     // 과거 시험일
        seedCard('p', { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: dstr(60), lastReview: dstr(-1) });
        expect(updateCardSchedule('p', Rating.GOOD).due > dstr(10)).toBe(true);
    });
});

describe('간격반복 어댑터 — 프리뷰·로그·위험 카드', () => {
    it('ROAD-L7: previewCardReview — 기존 카드는 경과일·lastRating 반영', () => {
        seedCard('pv', { v: 2, d: 5, s: 5, reps: 2, lapses: 0, lastInterval: 3, due: dstr(2), lastReview: dstr(-3), r: Rating.HARD });
        const { intervals, lastRating } = previewCardReview('pv');
        expect(lastRating).toBe(Rating.HARD);
        expect(intervals).toHaveLength(4);
        expect(intervals.every(d => d >= 1)).toBe(true);
    });

    it('D-18: 리뷰 로그 링버퍼 — 2,000건 상한에서 최오래 항목 탈락', () => {
        localStorage.setItem(LOG_KEY(), JSON.stringify(
            Array.from({ length: 2000 }, (_, i) => ({ c: `o${i}`, r: 3, e: 0, t: i }))));
        recordQuizJudgment('qx', true);
        const log = getReviewLog();
        expect(log).toHaveLength(2000);
        expect(log[0].c).toBe('o1');
        expect(log[1999].k).toBe('q');
    });

    it('D-18: 비배열·손상 로그는 빈 배열로 복구', () => {
        localStorage.setItem(LOG_KEY(), '{"a":1}');
        expect(getReviewLog()).toEqual([]);
        localStorage.setItem(LOG_KEY(), '{broken');
        expect(getReviewLog()).toEqual([]);
    });

    it('D-19: getExamRiskCards — 필드 부재·due≤시험일·성숙 제외, 위험만 선별', () => {
        const recs = {
            nodue:     { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 10, lastReview: dstr(-10) },
            nolast:    { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 10, due: dstr(20) },
            scheduled: { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 5,  due: dstr(5),  lastReview: dstr(-10) },
            safe:      { v: 2, d: 5, s: 200, reps: 9, lapses: 0, lastInterval: 60, due: dstr(15), lastReview: dstr(-10) },
            risky:     { v: 2, d: 5, s: 2,   reps: 3, lapses: 0, lastInterval: 10, due: dstr(11), lastReview: dstr(-10) },
        };
        localStorage.setItem(SR_KEY(), JSON.stringify(recs));
        const risk = getExamRiskCards(10);
        expect(risk.map(r => r.id)).toEqual(['risky']);
        expect(risk[0].rExam).toBeLessThan(0.95);
    });

    it('F-09: 구 SM-2 레코드도 due 조회 호환 (지연 변환)', () => {
        localStorage.setItem(SR_KEY(), JSON.stringify({
            old_card: { repetition: 2, easiness: 2.5, nextReview: '2000-01-01', lastReview: '1999-12-28' }
        }));
        expect(getDueCards()).toContain('old_card');
    });
});
