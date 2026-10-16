// @spec D-22
// 지식 추적 — 단원별 은닉 숙달 상태 P(L)를 정오 관측 시퀀스로 추정 (BKT).
// LEARNING_ALGORITHM_DESIGN §3.2 — DOM·저장 비의존 순수 모듈.
// 증거 정의·귀속은 analysis-engine이 담당 — 이 모듈은 시퀀스 → P(L) 변환만.
// 망각은 모델하지 않는다 (시점 관리는 FSRS 소관 — 설계 §3.2 비모델 명시).

/**
 * BKT 파라미터 기본값 — 시험별 manifest study.kt 오버라이드 허용 (단일 사용자라
 * 개인 피팅 불가 — 집단 기본값, 설계 §3.2).
 */
export const KT_DEFAULTS = Object.freeze({
    P0: 0.30,                 // 초기 숙달 확률 (콜드스타트 중립)
    T: 0.08,                  // 기회당 학습 전이율
    G: Object.freeze({ mcq: 0.15, ox: 0.30 }), // 추측률 — 5지선다 / OX·진술
    S: 0.10                   // 슬립률 (숙달 후 실수)
});

/** 숙달 졸업 기준 — 전통적 BKT 관례 P(L) ≥ 0.9 (설계 §3.2) */
export const KT_GRADUATE_PL = 0.9;

function _num(v, dflt, min, max) {
    return (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) ? v : dflt;
}

/**
 * manifest study.kt 오버라이드를 기본값과 병합 — 범위 밖·누락 값은 기본값 유지.
 * @param {Object|undefined} ov manifest study.kt 블록
 * @returns {{P0:number, T:number, G:{mcq:number, ox:number}, S:number}}
 */
export function resolveKtParams(ov) {
    const g = (ov && ov.G) || {};
    return {
        P0: _num(ov && ov.P0, KT_DEFAULTS.P0, 0, 1),
        T: _num(ov && ov.T, KT_DEFAULTS.T, 0, 1),
        G: {
            mcq: _num(g.mcq, KT_DEFAULTS.G.mcq, 0, 1),
            ox: _num(g.ox, KT_DEFAULTS.G.ox, 0, 1)
        },
        S: _num(ov && ov.S, KT_DEFAULTS.S, 0, 1)
    };
}

/**
 * BKT 1회 갱신 — 관측 후 사후확률 + 학습 전이.
 *   정답: P(L|o) = P·(1−S) / [P·(1−S) + (1−P)·G]
 *   오답: P(L|o) = P·S / [P·S + (1−P)·(1−G)]
 *   전이: P ← P(L|o) + (1−P(L|o))·T
 * @param {number} pL 현재 숙달 확률 (0~1)
 * @param {boolean} correct 정답 여부
 * @param {{T:number, G:number, S:number}} p 해당 경로의 파라미터 (G는 스칼라)
 * @returns {number} 갱신된 P(L)
 */
export function bktUpdate(pL, correct, p) {
    const num = correct ? pL * (1 - p.S) : pL * p.S;
    const den = correct ? num + (1 - pL) * p.G : num + (1 - pL) * (1 - p.G);
    const post = den > 0 ? num / den : pL;
    return post + (1 - post) * p.T;
}

/**
 * 단원 숙달 확률 — 관측 시퀀스를 시간순으로 접어 P(L) 산출.
 * @param {Array<{correct:boolean, kind?:'mcq'|'ox'}>} observations 시간순 관측
 * @param {Object} [params] resolveKtParams 결과 (기본 KT_DEFAULTS)
 * @param {number} [p0] 초기 P(L) — 생략 시 params.P0. v1 카운트 증거(Beta 사후평균)를
 *   사전으로 승계할 때 사용 (설계 §3.2 — v1 증거 집계 계층 위의 정밀화)
 * @returns {number} 단원 숙달 확률 P(L)
 */
export function computeUnitMastery(observations, params, p0) {
    const prm = params || KT_DEFAULTS;
    let p = (typeof p0 === 'number' && p0 >= 0 && p0 <= 1) ? p0 : prm.P0;
    for (const o of observations || []) {
        if (!o) continue;
        p = bktUpdate(p, !!o.correct, { T: prm.T, G: o.kind === 'ox' ? prm.G.ox : prm.G.mcq, S: prm.S });
    }
    return p;
}
