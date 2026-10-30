// src/views/personalization-view.js — 개인 맞춤 고도화 뷰 어댑터
// @spec PS-01,PS-03,PS-05,PS-06,PS-07,PS-08,PS-11
//
// 순수 로직(src/personalization.js)과 뷰·저장소 사이의 접착 계층.
// - 피팅 결과 영속 (PERSONAL_FIT — 시험 스코프 자동)
// - 리뷰 로그 → FSRS w20·BKT T/P0 피팅 적용
// - statement_stats + EMB_NEIGHBORS → 약점 개념 클러스터
// - cid → 교재 단원명 해석 (취약→교재 딥링크)

import { safeGetItem, safeSetItem } from '../state.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { DataLoader } from '../content/data-loader.js';
import { getReviewLog } from '../study/spaced-repetition.js';
import { setPersonalDecay } from '../study/fsrs.js';
import { getAllStatementStats } from '../study/statement-tracker.js';
import { resolveKtParams } from '../study/knowledge-tracing.js';
import {
    normalizeCidAnchor, chapterFromCid
} from '../study/analysis-engine.js';
import { resolveWrongQuiz, subjectKeyFromItemId } from '../study/weak-items.js';
import { examIdToSubjectId } from '../exam-context.js';
import { getWrongCauseLabels } from '../study/recommendations.js';
import {
    clusterWeakConcepts, fitFsrsParams, fitKT, inferP0, inferCause
} from '../study/personalization.js';

/** 피팅 재계산 최소 간격 — 로그 한 건으로 매번 재피팅하지 않도록 12시간 스로틀 */
const FIT_THROTTLE_MS = 12 * 3600 * 1000;
/** 과목별 BKT T 피팅 최소 관측 수 — 이 미만은 전역 T 유지 (표본 부족 오버피팅 방지) */
const KT_FIT_MIN_SEQ = 30;

/**
 * 영속된 개인 피팅 결과 — { w20?, ktT?:{subj:T}, ktP0?:{subj:P0}, fittedAt? }
 * @returns {Object}
 */
export function getPersonalFit() {
    try {
        const raw = safeGetItem(STORAGE_KEYS.PERSONAL_FIT);
        const fit = raw ? JSON.parse(raw) : {};
        return (fit && typeof fit === 'object' && !Array.isArray(fit)) ? fit : {};
    } catch (e) {
        return {};
    }
}

function _saveFit(fit) {
    safeSetItem(STORAGE_KEYS.PERSONAL_FIT, JSON.stringify(fit));
}

/**
 * 영속된 피팅을 런타임에 적용 — 앱 부팅 시 1회 호출 (PS-06).
 * w20이 없으면 FSRS-6 기본값 유지 (미피팅 폴백).
 */
export function applyPersonalFit() {
    const fit = getPersonalFit();
    if (typeof fit.w20 === 'number') setPersonalDecay(fit.w20);
}

/**
 * 퀴즈 정오 판정을 과목별 시간순 시퀀스로 묶는다 (PS-11 입력).
 * analysis-engine._unitObservationSeqs의 과목 귀속과 동일 경로 — 단원 없이
 * 과목 수준만 필요한 피팅용 경량 버전.
 * @returns {Map<string, boolean[]>} subjKey → [correct,...]
 */
export function subjectJudgmentSeqs() {
    const seqs = new Map();
    for (const e of getReviewLog()) {
        if (!e || e.k !== 'q' || !e.c) continue;
        const qid = String(e.c).replace(/^weak_(quiz|exam)_/, '');
        const simM = qid.match(/^(.+)_q\d+$/);
        const resolved = resolveWrongQuiz(qid);
        const subj = (resolved && resolved.subjectId) || subjectKeyFromItemId(qid)
            || (simM && examIdToSubjectId(simM[1])) || '';
        if (!subj) continue;
        const arr = seqs.get(subj) || [];
        arr.push(e.ok === 1);
        seqs.set(subj, arr);
    }
    return seqs;
}

/**
 * 리뷰 로그로 개인 파라미터 재피팅 — FSRS w20 (PS-06) + 과목별 BKT T (PS-11).
 * 12시간 스로틀; force=true면 즉시 재계산. 피팅 성공 시 즉시 적용·영속한다.
 * @param {boolean} [force]
 * @returns {Object} getPersonalFit() 결과
 */
export function refitPersonalModels(force = false) {
    const fit = getPersonalFit();
    if (!force && fit.fittedAt && (Date.now() - fit.fittedAt) < FIT_THROTTLE_MS) return fit;

    // PS-06 — 스케줄 이벤트({r,e,s})에서 (간격일, 정오, 복습 전 안정도) 표본 구성
    const fsrsSamples = [];
    for (const e of getReviewLog()) {
        if (e && typeof e.r === 'number' && typeof e.e === 'number' && e.e > 0
            && typeof e.s === 'number' && e.s > 0) {
            fsrsSamples.push({ days: e.e, correct: e.r >= 3, stability: e.s });
        }
    }
    const fsrs = fitFsrsParams(fsrsSamples);
    if (fsrs.fitted) {
        fit.w20 = fsrs.w20;
        // 피팅 효과 — 기본 w20 대비 예측 오차 감소율 (0~1, 효과 없으면 음수 가능)
        fit.w20Gain = (typeof fsrs.baseCost === 'number' && fsrs.baseCost > 0 && typeof fsrs.cost === 'number')
            ? +(1 - fsrs.cost / fsrs.baseCost).toFixed(3) : null;
    }

    // PS-11 — 과목별 정오 시퀀스가 충분하면 T 격자 탐색 (+ 기본 T 대비 우도 개선 기록)
    const ktT = {}, ktGain = {};
    for (const [subj, seq] of subjectJudgmentSeqs()) {
        if (seq.length >= KT_FIT_MIN_SEQ) {
            const k = fitKT(seq);
            ktT[subj] = k.T;
            if (typeof k.baseLogLik === 'number' && k.baseLogLik !== 0) {
                ktGain[subj] = +(k.logLik - k.baseLogLik).toFixed(3);
            }
        }
    }
    fit.ktT = ktT;
    fit.ktGain = ktGain;
    fit.fittedAt = Date.now();
    _saveFit(fit);
    applyPersonalFit();
    return fit;
}

/**
 * 입문 진단(배치 퀴즈) 정답률 → 과목별 BKT P0 영속 (PS-07).
 * @param {Object} rates {subjKey: 0..1}
 */
export function recordDiagnosticP0(rates) {
    const fit = getPersonalFit();
    fit.ktP0 = { ...(fit.ktP0 || {}), ...inferP0(rates) };
    fit.fittedAt = Date.now();
    _saveFit(fit);
}

/**
 * BKT 파라미터 — manifest 기본값 + 개인 피팅 과목별 오버라이드 (PS-07·PS-11).
 * 반환 객체는 resolveKtParams 결과 + bySubject 맵을 가지며,
 * analysis-engine._unitMastery가 과목 버킷의 파라미터로 bySubject를 우선 적용한다.
 * @returns {{P0:number, T:number, G:{mcq:number, ox:number}, S:number, bySubject:Object}}
 */
export function personalKtParams() {
    const kt = DataLoader.registry && DataLoader.registry.study && DataLoader.registry.study.kt;
    const base = resolveKtParams(kt);
    const fit = getPersonalFit();
    const bySubject = {};
    for (const subj of new Set([...Object.keys(fit.ktP0 || {}), ...Object.keys(fit.ktT || {})])) {
        bySubject[subj] = {
            P0: (fit.ktP0 || {})[subj] ?? base.P0,
            T: (fit.ktT || {})[subj] ?? base.T,
            G: base.G,
            S: base.S
        };
    }
    return { ...base, bySubject };
}

/**
 * 약점 개념 클러스터 — EMB_NEIGHBORS가 로드돼 있으면 의미 이웃 결합,
 * 아니면 cid 공통 앵커 단독으로 저하 동작한다 (PS-01).
 * @param {number} [minWrong] 취약 판정 최소 오답수 (기본 2)
 */
export function weakClusters(minWrong = 2) {
    const emb = (typeof window !== 'undefined' && /** @type {any} */ (window).EMB_NEIGHBORS) || null;
    return clusterWeakConcepts(getAllStatementStats(), emb && emb.adj, minWrong);
}

/**
 * cid → 교재 단원 표시명 해석 (PS-05 리졸버).
 * 레거시 L####는 CID_SECTION으로 §앵커 환산 후 단원명을 얻는다.
 * @param {string} cid
 * @param {string} subj 과목 키
 * @returns {string|null} 단원명(또는 앵커 문자열) — 해석 불가 시 null
 */
export function resolveCidChapter(cid, subj) {
    const qc = (DataLoader._questionChapters) || { ranges: {}, cidSection: {}, chapterTitles: {} };
    const anchor = normalizeCidAnchor(cid, subj, qc.cidSection);
    if (!anchor) return null;
    return chapterFromCid(anchor, subj, qc.ranges,
        { chapterTitles: qc.chapterTitles, cidSection: qc.cidSection }) || anchor;
}

// PS-08 추론 태그 → 오답 원인 분류표 키 매핑
// concept·doubt(망설임=개념 불확실) → 'concept', careless(즉답 실수) → 'calc'
const _INFER_TO_CAUSE = { concept: 'concept', doubt: 'concept', careless: 'calc' };

/**
 * 행동 신호로 오답 원인 후보 키를 추론한다 (PS-08).
 * 시험별 분류표에 동명 키(careless 등)가 있으면 직매핑, 없으면 기본 3분류로 환산.
 * @param {Object} obs { ms, changed, confidence, wasCorrect } — inferCause 입력
 * @returns {string|null} getWrongCauseLabels() 키 또는 null(제안 없음)
 */
export function suggestWrongCauseKey(obs) {
    const tag = inferCause(obs);
    if (!tag || tag === 'unknown') return null;
    const labels = getWrongCauseLabels();
    if (labels[tag]) return tag;
    const mapped = _INFER_TO_CAUSE[tag];
    return (mapped && labels[mapped]) ? mapped : null;
}
