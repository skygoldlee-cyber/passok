// src/study-tracker-alloc.js — 과목별 가중 배분 (study-tracker.js 분리)
// @spec SC-08,SC-09,SC-12,SC-13,D-23,Q-12
import { subjectKeyFromItemId } from './weak-items.js';

/* =======================================================
   📚 과목별 가중 배분 (SC-08 — study_plan_pro)
   ======================================================= */

/** 약점 가중 최소 퀴즈 표본 — 미만이면 중립 가중 1.0 (가짜 정밀도 방지) */
export const MIN_ALLOC_SAMPLE = 20;

/** 약점 가중 상한 — 퀴즈 정답률 + 취약 카드 가산의 합계 상한 (SC-09) */
export const MAX_WEAK_WEIGHT = 2.5;

/** 최근 퀴즈 표본 윈도우 — 과목당 최근 N문만 약점 가중에 반영 (SC-09) */
const RECENT_QUIZ_WINDOW = 60;

/** 진단 신호 윈도우 — 오답 원인 태그는 최근 30일만 가산 (SC-12) */
const DIAG_CAUSE_WINDOW_DAYS = 30;

/** 진단 신호 가산 상한 — 오답 원인·취약 단원 가산 합계 상한 (SC-12) */
export const MAX_DIAG_BOOST = 0.5;

// @spec SC-08,D-23,Q-12
/**
 * 출제 비중 맵 — registry.exams의 과목별 문제은행 문항 수를 집계한다.
 * 주간 배분(SC-08)·최종 인출 층화(D-23)·진단 평가 층화(Q-12)의 단일 출처.
 * @param {Array} [exams] registry.exams — [{subject, stats:{questions}}]
 * @returns {Object} {subjKey: 출제 문항 수}
 */
export function examWeightBySubject(exams) {
    /** @type {{ [x: string]: number }} */
    const w = {};
    (exams || []).forEach(ex => {
        if (ex && ex.subject) w[ex.subject] = (w[ex.subject] || 0) + ((ex.stats && ex.stats.questions) || 0);
    });
    return w;
}

// @spec D-23,Q-12
/**
 * 출제 비중 비례 정수 쿼터 배분 (최대잔여법) — 각 키에 최소 min을 먼저 보장하고
 * 잔여를 비중 비례로 배분한다. 비중 합계가 0(미선언 시험)이면 균등 배분.
 * 총합은 항상 total과 일치하고, min×N > total이면 min을 floor(total/N)으로 축소한다.
 * @param {string[]} keys 대상 과목 키 (수요가 있는 과목만 전달할 것)
 * @param {Object} weightBySubject examWeightBySubject 결과 {subjKey: 문항 수}
 * @param {number} total 배분 총량 (정수)
 * @param {number} [minPerKey] 키당 최소 보장량 (기본 0)
 * @returns {Object} {key: 배정 수}
 */
export function apportionByWeight(keys, weightBySubject, total, minPerKey = 0) {
    const list = (keys || []).filter(Boolean);
    /** @type {{ [x: string]: number }} */
    const out = {};
    if (!list.length) return out;
    const cap = Math.max(0, Math.floor(total) || 0);
    const wMap = weightBySubject || {};
    const effMin = Math.max(0, Math.min(minPerKey, Math.floor(cap / list.length)));
    list.forEach(k => { out[k] = effMin; });
    let pool = cap - effMin * list.length;
    const wsum = list.reduce((s, k) => s + Math.max(0, wMap[k] || 0), 0);
    const rows = list.map(k => ({
        key: k,
        share: wsum > 0 ? pool * Math.max(0, wMap[k] || 0) / wsum : pool / list.length
    }));
    rows.forEach(r => {
        const g = Math.floor(r.share);
        out[r.key] += g;
        pool -= g;
    });
    // 최대잔여법 — 소수부 큰 순으로 잔여 1씩 (동점은 keys 선언 순서)
    rows.sort((a, b) => (b.share - Math.floor(b.share)) - (a.share - Math.floor(a.share)));
    for (const r of rows) {
        if (pool <= 0) break;
        out[r.key] += 1;
        pool -= 1;
    }
    return out;
}

// @spec D-23
/**
 * 최종 인출 세션 과목 층화 — D-19 위험 카드(R_exam 오름차순)가 세션 상한을 넘을 때
 * 과목별 출제 비중 비례 쿼터 + 과목당 최소 1장으로 자르고, 수요 소진 잔여는
 * 전역 R_exam 순으로 재충전한다. 소수 비중 과목이 세션에서 탈락하는 것을 차단.
 * 비중 미선언(합계 0)이면 기존 전역 R 절단. 결과는 R_exam 오름차순 유지.
 * @param {Array<{id:string, rExam:number}>} risk getExamRiskCards 결과 (R 오름차순)
 * @param {number} cap 세션 상한
 * @param {Object} [weightBySubject] examWeightBySubject 결과
 * @returns {Array<{id:string, rExam:number}>}
 */
export function selectExamRiskSession(risk, cap, weightBySubject) {
    const list = Array.isArray(risk) ? risk : [];
    const limit = Math.max(0, Math.floor(cap) || 0);
    if (list.length <= limit) return list.slice();
    const wsum = Object.values(weightBySubject || {}).reduce((s, n) => s + (n || 0), 0);
    if (wsum <= 0 || !list.length) return list.slice(0, limit);

    // 과목 그룹화 — subjectKeyFromItemId 해석 불가 id는 '' 버킷 (비중 0, 최소 1 보장)
    const groups = new Map();
    for (const r of list) {
        const k = subjectKeyFromItemId(r.id) || '';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
    }
    const quota = apportionByWeight([...groups.keys()], weightBySubject, limit, 1);
    const wanted = new Set();
    for (const [k, items] of groups) {
        items.slice(0, quota[k] || 0).forEach(r => wanted.add(r));
    }
    // 수요 소진 잔여 — 전역 R_exam 오름차순으로 재충전
    let need = limit - wanted.size;
    if (need > 0) {
        for (const r of list) {
            if (!wanted.has(r)) {
                wanted.add(r);
                if (--need <= 0) break;
            }
        }
    }
    return list.filter(r => wanted.has(r));
}

/**
 * 주간 배분 입력 집계 (SC-11·SC-12) — 캘린더 칩·학습 진단 카드·주간 리포트가
 * 동일 입력을 공유하도록 raw state/레지스트리 → computeSubjectAllocation opts 변환을
 * 한 곳에 둔다. 과목 키 해석은 subjectKeyFromItemId (숫자·밑줄 키 안전).
 * @param {Object} p
 * @param {Set|Array} [p.memorizedCards] 암기 카드 id 집합
 * @param {Object} [p.quizResults] {quizId: {correct}}
 * @param {Set|Array} [p.weakCards] 헷갈림 카드 id 집합
 * @param {Array} [p.exams] registry.exams — 출제 비중 (미전달 시 균등 배분)
 * @param {Object} [p.wrongCauses] {itemId: {cause, ts, subjectId}} — 최근 30일 태그만 집계 (SC-12)
 * @param {Array} [p.weakChapterGroups] computeSubjectWeakChapters 결과 — 과목별 취약 단원 수 (SC-12)
 * @param {Array} [p.dueCardIds] getDueCards() 결과 — FSRS 기한 도래 카드 id 배열 (SC-13)
 * @param {Date|number} [p.now] 기준 시각 (테스트 주입용)
 * @returns {{memBySubject:Object, quizBySubject:Object, recentQuizBySubject:Object,
 *   weakBySubject:Object, weightBySubject:Object, diagBySubject:Object, dueBySubject:Object}}
 */
export function computeSubjectAllocInputs(p = {}) {
    /** @type {{ [x: string]: number }} */
    const mem = {};
    /** @type {{ [x: string]: { solved: number, correct: number } }} */
    const quiz = {};
    /** @type {{ [x: string]: number }} */
    const weak = {};
    /** @type {{ [x: string]: number }} */
    const weights = examWeightBySubject(p.exams);
    /** @type {{ [x: string]: number }} */
    const due = {};
    /** @type {{ [x: string]: { causes: number, weakChapters: number } }} */
    const diag = {};
    const _diag = (k) => (diag[k] = diag[k] || { causes: 0, weakChapters: 0 });
    (p.memorizedCards || []).forEach(id => {
        const k = subjectKeyFromItemId(id);
        if (k) mem[k] = (mem[k] || 0) + 1;
    });
    Object.keys(p.quizResults || {}).forEach(id => {
        const k = subjectKeyFromItemId(id);
        if (k) {
            quiz[k] = quiz[k] || { solved: 0, correct: 0 };
            quiz[k].solved++;
            const r = p.quizResults[id];
            if (r && r.correct) quiz[k].correct++;
        }
    });
    (p.weakCards || []).forEach(id => {
        const clean = id.replace(/^weak_(quiz|sim)_/, '');
        if (!clean.includes('_card_')) return; // 카드 외 항목은 카드 잔여 대비 비율 왜곡 방지
        const k = subjectKeyFromItemId(id);
        if (k) weak[k] = (weak[k] || 0) + 1;
    });
    // SC-13 FSRS 복습 대기 — 기한 도래 카드 id를 과목별로 집계
    (p.dueCardIds || []).forEach(id => {
        const k = subjectKeyFromItemId(id);
        if (k) due[k] = (due[k] || 0) + 1;
    });
    // SC-12 진단 신호 — 오답 원인 태그(최근 30일) + 과목별 취약 단원 수
    const cutoff = (p.now !== undefined ? new Date(p.now).getTime() : Date.now()) - DIAG_CAUSE_WINDOW_DAYS * 86400000;
    Object.values(p.wrongCauses || {}).forEach(c => {
        if (!c || !c.subjectId || (c.ts || 0) < cutoff) return;
        _diag(c.subjectId).causes++;
    });
    (p.weakChapterGroups || []).forEach(g => {
        if (g && g.subjectKey) _diag(g.subjectKey).weakChapters += (g.chapters || []).length;
    });
    return {
        memBySubject: mem,
        quizBySubject: quiz,
        recentQuizBySubject: recentQuizBySubject(p.quizResults || {}),
        weakBySubject: weak,
        weightBySubject: weights,
        diagBySubject: diag,
        dueBySubject: due
    };
}

/**
 * 과목별 최근 퀴즈 표본 (SC-09) — quizResults를 뒤(최신)에서 읽어
 * 과목당 최근 RECENT_QUIZ_WINDOW문까지만 집계한다. 전 기간 누적 정답률 대신
 * 현재 약점에 가까운 최근 성적을 약점 가중에 반영하기 위한 윈도우.
 * @param {Object} quizResults state.quizResults — {quizId: {solved, correct}}
 * @param {number} [limit] 과목당 표본 상한
 * @returns {Object} {subjKey: {solved, correct}}
 */
export function recentQuizBySubject(quizResults, limit = RECENT_QUIZ_WINDOW) {
    const out = {};
    const entries = Object.entries(quizResults || {});
    for (let i = entries.length - 1; i >= 0; i--) {
        const k = subjectKeyFromItemId(entries[i][0]);
        if (!k) continue;
        const o = out[k] = out[k] || { solved: 0, correct: 0 };
        if (o.solved >= limit) continue;
        o.solved++;
        if (entries[i][1] && entries[i][1].correct) o.correct++;
    }
    return out;
}

/**
 * 한 주 총량을 과목별 수요 비례로 배분 — 워터필링(잔여 상한 + 초과 재배분).
 * @param {Array} rows {remaining, weakW, weight} 과목 행
 * @param {Array<number>} remNow 주차 누적 기준 현재 잔여 (in-place 감소)
 * @param {number} total 이번 주 배정 총량
 */
function _allocWeek(rows, remNow, total) {
    const alloc = rows.map(() => 0);
    let pool = Math.max(0, total);
    for (let iter = 0; iter < rows.length && pool > 0; iter++) {
        const cand = rows.map((r, i) => {
            const cap = remNow[i] - alloc[i];
            return { i, cap, demand: cap > 0 ? cap * r.weight * r.weakW : 0 };
        }).filter(c => c.cap > 0);
        if (!cand.length) break;
        let dsum = cand.reduce((s, c) => s + c.demand, 0);
        // 수요가 전부 0(비중 미선언·잔여만 존재)이면 잔여 비례로 폴백
        if (dsum === 0) { cand.forEach(c => { c.demand = c.cap; }); dsum = cand.reduce((s, c) => s + c.demand, 0); }
        let consumed = 0;
        cand.forEach(c => {
            const give = Math.min(c.cap, Math.floor(pool * c.demand / dsum));
            alloc[c.i] += give;
            consumed += give;
        });
        pool -= consumed;
        if (consumed === 0) {
            // 모든 몫이 0이면 pool < 후보 수 — 잔량을 순환 배분해 교착 해소
            for (const c of cand) {
                if (pool <= 0) break;
                alloc[c.i] += 1;
                pool -= 1;
            }
        }
    }
    return alloc;
}

/**
 * 과목별 가중 배분 계획 (SC-08·SC-09) — 주차 총량을
 *   수요_i = 잔여_i × 출제비중_i × 약점가중_i   비례로 배분한다.
 * 약점가중 = 퀴즈 표본 ≥ MIN_ALLOC_SAMPLE 이면 (2 − 정답률) [1.0~2.0], 미만이면 1.0.
 *   최근 표본(`recentQuizBySubject`)이 임계 이상이면 누적 대신 우선 적용하고,
 *   취약 카드 비율(헷갈림 표시 ÷ 잔여)을 최대 +0.5 가산한다 — 상한 MAX_WEAK_WEIGHT.
 *   SC-13: FSRS 기한초과 복습 비율(기한 도래 ÷ 암기 수)도 최대 +0.5 가산하고,
 *   과목별 퀴즈 잔여를 카드와 동일 수요 공식으로 주차 배분한다(주차 총량 = 학습일×일일 퀴즈 목표).
 * 주차를 순차 배정해 과목 조기 완료가 다음 주 배분에 자동 반영된다.
 * @param {Object|null} plan computeStudyPlan() 결과
 * @param {Array} subjects 과목 메타 — [{key, name, stats:{cards, targetCards?, quizzes?, targetQuizzes?}}]
 * @param {Object} [opts]
 * @param {Object} [opts.memBySubject] {key: 암기 카드 수}
 * @param {Object} [opts.quizBySubject] {key: {solved, correct}} — 전 기간 누적
 * @param {Object} [opts.recentQuizBySubject] {key: {solved, correct}} — 최근 윈도우 (SC-09)
 * @param {Object} [opts.weakBySubject] {key: 취약 카드 수} — 약점 가산 (SC-09)
 * @param {Object} [opts.weightBySubject] {key: 출제 문항 수} — 미선언 시 균등
 * @param {Object} [opts.diagBySubject] {key: {causes, weakChapters}} — 진단 신호 가산 (SC-12)
 * @param {Object} [opts.dueBySubject] {key: FSRS 기한 도래 카드 수} — 복습 대기 가산 (SC-13)
 * @returns {Object|null}
 *   { weeks:[{week, range, total, quizTotal, alloc:[{key, name, cards, quizzes, remaining, quizRemaining,
 *     weakW, diagBoost, dueBoost, weightPct, weakBadge}]}],
 *     thisWeek, hasWeights }
 */
export function computeSubjectAllocation(plan, subjects, opts = {}) {
    if (!plan || !plan.weeks || !plan.weeks.length) return null;
    const list = (subjects || []).filter(s => s && s.key);
    if (!list.length) return null;
    const mem = opts.memBySubject || {};
    const quiz = opts.quizBySubject || {};
    const recent = opts.recentQuizBySubject || {};
    const weak = opts.weakBySubject || {};
    const diag = opts.diagBySubject || {};
    const due = opts.dueBySubject || {};
    const wBySubj = opts.weightBySubject || {};
    const hasWeights = Object.keys(wBySubj).length > 0;
    const weightSum = Object.values(wBySubj).reduce((s, n) => s + (n || 0), 0);
    const dailyQuizzes = (plan.goals && plan.goals.dailyQuizzes) || 0;
    const rows = list.map(s => {
        const stats = (s && s.stats) || {};
        const total = stats.targetCards > 0 ? Math.min(stats.cards || 0, stats.targetCards) : (stats.cards || 0);
        const remaining = Math.max(0, total - (mem[s.key] || 0));
        // SC-13 퀴즈 잔여 — 은행 문항(targetQuizzes 상한) 대비 미풀이 수
        const qTotal = stats.targetQuizzes > 0 ? Math.min(stats.quizzes || 0, stats.targetQuizzes) : (stats.quizzes || 0);
        const quizRemaining = Math.max(0, qTotal - ((quiz[s.key] && quiz[s.key].solved) || 0));
        // 최근 표본이 임계 이상이면 우선, 아니면 누적 표본 폴백
        const rq = recent[s.key] || { solved: 0, correct: 0 };
        const q = (rq.solved >= MIN_ALLOC_SAMPLE) ? rq : (quiz[s.key] || { solved: 0, correct: 0 });
        const quizW = (q.solved >= MIN_ALLOC_SAMPLE && q.solved > 0)
            ? Math.max(0.1, 2 - q.correct / q.solved) : 1.0;
        // 취약 카드 비율 가산 — 헷갈림 표시 카드가 잔여에서 차지하는 비중, 최대 +0.5
        const weakBoost = remaining > 0 ? Math.min(0.5, (weak[s.key] || 0) / remaining) : 0;
        // SC-12 진단 신호 가산 — 최근 오답 원인 태그·취약 단원 수 (콜드스타트 과목 반영)
        const dg = diag[s.key] || { causes: 0, weakChapters: 0 };
        const diagBoost = Math.min(MAX_DIAG_BOOST, dg.causes * 0.1 + dg.weakChapters * 0.15);
        // SC-13 복습 대기 가산 — 암기 카드 중 FSRS 기한초과 비율, 최대 +0.5
        const dueBoost = Math.min(0.5, (due[s.key] || 0) / Math.max(1, mem[s.key] || 0));
        const weight = hasWeights ? (wBySubj[s.key] || 0) : 1;
        return {
            key: s.key,
            name: s.name || s.key,
            remaining,
            quizRemaining,
            weight,
            weightPct: (hasWeights && weightSum > 0) ? Math.round(weight / weightSum * 100) : 0,
            weakW: Math.min(MAX_WEAK_WEIGHT, quizW + weakBoost + diagBoost + dueBoost),
            diagBoost,
            dueBoost,
            weakBadge: quizW > 1.15 || weakBoost >= 0.25 || diagBoost >= 0.15 || dueBoost >= 0.25
        };
    });
    const remNow = rows.map(r => r.remaining);
    const quizRemNow = rows.map(r => r.quizRemaining);
    const weeks = plan.weeks.map(w => {
        const counts = _allocWeek(rows, remNow, w.cards);
        counts.forEach((c, i) => { remNow[i] -= c; });
        // SC-13 퀴즈 배분 — 주차 총량 = 학습일 × 일일 퀴즈 목표, 카드와 동일 수요 가중
        const quizTotal = (w.studyDays || 0) * dailyQuizzes;
        const quizCounts = _allocWeek(rows, quizRemNow, quizTotal);
        quizCounts.forEach((c, i) => { quizRemNow[i] -= c; });
        return {
            week: w.week,
            range: w.range,
            total: w.cards,
            quizTotal,
            alloc: rows.map((r, i) => ({
                key: r.key, name: r.name, cards: counts[i], quizzes: quizCounts[i],
                remaining: r.remaining, quizRemaining: r.quizRemaining,
                weakW: r.weakW, diagBoost: r.diagBoost, dueBoost: r.dueBoost,
                weightPct: r.weightPct, weakBadge: r.weakBadge
            }))
        };
    });
    return { weeks, thisWeek: weeks[0], hasWeights };
}
