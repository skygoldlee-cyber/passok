// fsrs.js — FSRS-6 기억 모델 순수 함수 (SM-2 대체 스케줄 엔진)
// @spec F-07,F-08,F-11,PS-06
//
// DSR 모델: 카드마다 Difficulty(난이도)·Stability(안정도, 일)를 추적하고
// 경과일로부터 Retrievability(기억 확률)를 추정해 목표 기억률 0.9가 되는
// 시점으로 다음 복습 간격을 산출한다. 저장·시계는 spaced-repetition.js 어댑터 담당.
// 파라미터·수식 정합 근거: docs/dev/design/LEARNING_ALGORITHM_DESIGN.md (DOC-DSN-27)

// FSRS-6 기본 파라미터 (w0..w20 — fsrs-rs 6.x / ts-fsrs 공개 안정 세트)
const W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
    0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
let DECAY = -W[20];                          // 망각 곡선 지수 — 피팅 가능 (w20)
let FACTOR = Math.pow(0.9, -1 / W[20]) - 1;  // 곡선 형상 — w20에서 유도, R(s,s)=0.9 불변식 유지

// @spec PS-06
/**
 * 개인 피팅된 망각 지수 w20 적용 — DECAY·FACTOR를 재계산한다.
 * personalization.js fitFsrsParams가 리뷰 로그로 추정한 값만 유효 범위
 * (0.05~0.40, 격자 탐색 범위와 동일)에서 수용 — 범위 밖·비수치는 무시해
 * 스케줄 손상을 방지한다. 미적용 시 FSRS-6 기본값 유지.
 * @param {number} w20 망각 곡선 지수 (0.05~0.40)
 * @returns {boolean} 적용 여부
 */
export function setPersonalDecay(w20) {
    if (typeof w20 !== 'number' || !Number.isFinite(w20) || w20 < 0.05 || w20 > 0.40) return false;
    DECAY = -w20;
    FACTOR = Math.pow(0.9, -1 / w20) - 1;
    return true;
}

/** 현재 적용 중인 망각 지수 w20 — 피팅 상태 표시·테스트용 */
export function currentDecayW20() {
    return -DECAY;
}
const REQUEST_RETENTION = 0.9;      // 목표 기억률
const S_MIN = 0.01;                 // 안정도 하한
const MAX_INTERVAL = 36500;         // 100년 상한

/** 평가 등급 — 현행 2버튼 UI는 Again/Good만 사용 (4단계는 LEARNING_ALGORITHM_DESIGN §8 후속) */
export const Rating = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

const _clampD = (d) => Math.min(10, Math.max(1, d));
const _round2 = (v) => Math.round(v * 100) / 100;

/** 최초 학습 카드 초기 난이도 — FSRS-6 지수형 D0(G) = w4 − e^{w5·(G−1)} + 1 */
export function initDifficulty(rating) {
    return _clampD(W[4] - Math.exp(W[5] * (rating - 1)) + 1);
}

/** 최초 학습 카드 초기 안정도 (레이팅별 상수) */
export function initStability(rating) {
    return Math.min(Math.max(S_MIN, W[rating - 1]), MAX_INTERVAL);
}

/** 경과 t일 후 기억 확률 — R(t,s) = (1 + FACTOR·t/s)^DECAY */
export function retrievability(elapsedDays, s) {
    if (s <= 0) return 0;
    return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / s, DECAY);
}

/** 안정도 s에서 목표 기억률이 되는 다음 복습 간격(일) — 정수·하한 1 */
export function nextInterval(s) {
    const ivl = Math.round((s / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1));
    return Math.min(Math.max(ivl, 1), MAX_INTERVAL);
}

/** 복습 후 난이도 — Δd 선형 감쇠(d→10 포화 둔화) + Easy 초기값 방향 평균 회귀 */
export function nextDifficulty(d, rating) {
    const delta = -W[6] * (rating - 3);
    const next = d + delta * (10 - d) / 9;
    const d0Easy = W[4] - Math.exp(W[5] * 3) + 1; // 평균 회귀 기준은 클램프 전 원시 D0(4) (정본 동형)
    return _clampD(W[7] * d0Easy + (1 - W[7]) * next);
}

/** 성공 복습 후 안정도 */
export function recallStability(d, s, r, rating) {
    const hardPenalty = rating === Rating.HARD ? W[15] : 1;
    const easyBonus = rating === Rating.EASY ? W[16] : 1;
    return _round2(s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9])
        * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus));
}

/** 실패(Again) 복습 후 안정도 — 랩스 상한 s·e^{−w17·w18} 적용 (FSRS-6) */
export function forgetStability(d, s, r) {
    const sf = W[11] * Math.pow(d, -W[12])
        * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
    return _round2(Math.min(Math.max(sf, S_MIN), s * Math.exp(-W[17] * W[18])));
}

/** 당일(동일일) 복습 후 안정도 — S′ = S·e^{w17·(G−3+w18)}·S^{−w19}, G≥Hard는 감소 없음 (FSRS-6) */
export function sameDayStability(s, rating) {
    const sinc = Math.pow(s, -W[19]) * Math.exp(W[17] * (rating - 3 + W[18]));
    const masked = rating >= Rating.HARD ? Math.max(sinc, 1) : sinc;
    return _round2(Math.min(Math.max(s * masked, S_MIN), MAX_INTERVAL));
}

/**
 * 카드 상태 갱신 — 순수 계산 (날짜 결정은 호출부).
 * @param {Object|null} cur {d, s, lastReview, reps, lapses} (null=신규)
 * @param {number} rating Rating.AGAIN~EASY
 * @param {number} elapsedDays 마지막 복습 이후 경과일 (신규면 0)
 * @returns {{v:2, d:number, s:number, reps:number, lapses:number, lastInterval:number}}
 *   due·lastReview 날짜는 호출부가 elapsed/today로 채운다
 */
export function fsrsReview(cur, rating, elapsedDays) {
    if (!cur) {
        return {
            v: 2,
            d: initDifficulty(rating),
            s: initStability(rating),
            reps: 1,
            lapses: rating === Rating.AGAIN ? 1 : 0,
            lastInterval: 0
        };
    }
    const d = nextDifficulty(cur.d, rating);
    // @spec F-11 — 당일 재복습(elapsed=0)은 단기 안정도 경로 (4.5의 r=1→증분0 결함 해소)
    const s = elapsedDays === 0
        ? sameDayStability(cur.s, rating)
        : rating === Rating.AGAIN
            ? forgetStability(d, cur.s, retrievability(elapsedDays, cur.s))
            : recallStability(d, cur.s, retrievability(elapsedDays, cur.s), rating);
    return {
        v: 2,
        d: _round2(d),
        s,
        reps: (cur.reps || 0) + 1,
        lapses: (cur.lapses || 0) + (rating === Rating.AGAIN ? 1 : 0),
        lastInterval: elapsedDays
    };
}

/**
 * SM-2 레코드 → FSRS 레코드 지연 변환 (지연 마이그레이션 — LEARNING_ALGORITHM_DESIGN §3.2).
 * nextReview는 어댑터가 due로 계승한다 (여기서는 상태 필드만 변환).
 * @param {Object} rec {repetition, easiness, nextReview, lastReview}
 * @param {string} [today] YYYY-MM-DD — lastReview 없을 때 간격 근사 기준
 * @returns {{v:2, d:number, s:number, due:string|null, lastReview:string|null, reps:number, lapses:number}|null}
 */
export function migrateSm2Record(rec, today) {
    if (!rec || typeof rec !== 'object') return null;
    const repetition = Number.isFinite(rec.repetition) ? rec.repetition : 0;
    const easiness = Number.isFinite(rec.easiness) ? rec.easiness : 2.5;
    const lastReview = typeof rec.lastReview === 'string' ? rec.lastReview : null;
    const nextReview = typeof rec.nextReview === 'string' ? rec.nextReview : null;
    let interval = 0;
    if (lastReview && nextReview) {
        interval = Math.round((Date.parse(nextReview + 'T00:00:00') - Date.parse(lastReview + 'T00:00:00')) / 86400000);
    } else if (nextReview && today) {
        interval = Math.max(0, Math.round((Date.parse(nextReview + 'T00:00:00') - Date.parse(today + 'T00:00:00')) / 86400000));
    }
    return {
        v: 2,
        d: _clampD(10 - ((easiness - 1.3) / 1.2) * 9), // EF 1.3→d=10(어려움), 2.5→d=1(쉬움) 선형 역산
        s: Math.max(interval, 0.4),          // 기존 간격을 안정도 근사치로
        due: nextReview,
        lastReview,
        reps: repetition,
        lapses: repetition === 0 && lastReview ? 1 : 0
    };
}
