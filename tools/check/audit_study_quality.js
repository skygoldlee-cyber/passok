// tools/check/audit_study_quality.js — 스마트학습·맞춤학습 품질 감사
// @spec SQ-01,SQ-02,SQ-03,SQ-04
//
// 실행: npm run audit:study  (node tools/check/audit_study_quality.js)
//
// 합성 사용자 상태를 주입해 학습 계획·과목 배분·진단·추천·점수 추정이
// "설계된 규칙대로 동작하는가"를 결정론적으로 검증한다 (실효성 자체는
// 합격 데이터 부재로 측정 불가 — 규칙 일관성·내부 정합만 감사).
//
// 산출물: tools/state/study_quality_report.json (gitignore — 로컬 감사 산출물)
//   --update  기준선 study_quality_baseline.json 갱신
//   --check   기준선 대비 회귀 검증 (신규 실패 검사 항목 차단)

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const REPORT_PATH = path.join(__dirname, '..', 'state', 'study_quality_report.json');
const BASELINE_PATH = path.join(__dirname, '..', 'state', 'study_quality_baseline.json');
const CHECK_MODE = process.argv.includes('--check');
const UPDATE_BASELINE = process.argv.includes('--update');

/* =======================================================
   지표 헬퍼 — 순수 함수 (테스트에서 require, 스텁 불요)
   ======================================================= */

/** 등수 부여 (동점은 평균 등수) — Spearman 상관용 */
function _ranks(arr) {
    const order = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array(arr.length);
    for (let i = 0; i < order.length; i++) {
        let j = i;
        while (j + 1 < order.length && order[j + 1].v === order[i].v) j++;
        const avg = (i + j) / 2 + 1;
        for (let k = i; k <= j; k++) r[order[k].i] = avg;
        i = j;
    }
    return r;
}

/**
 * 두 수열의 Spearman 순위 상관 (−1~1). 동점은 평균 등수.
 * 길이 <2 또는 한쪽이 전부 동일(분산 0)이면 null — 상관 정의 불가.
 */
function spearman(xs, ys) {
    if (!Array.isArray(xs) || xs.length < 2 || xs.length !== ys.length) return null;
    const rx = _ranks(xs), ry = _ranks(ys);
    const mx = rx.reduce((a, b) => a + b, 0) / rx.length;
    const my = ry.reduce((a, b) => a + b, 0) / ry.length;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < rx.length; i++) {
        const a = rx[i] - mx, b = ry[i] - my;
        num += a * b; dx += a * a; dy += b * b;
    }
    if (!dx || !dy) return null;
    return Math.round((num / Math.sqrt(dx * dy)) * 100) / 100;
}

/**
 * computeSubjectAllocation 결과의 정합 지표.
 * @param {Object} res {weeks:[{total, alloc:[{key, cards, remaining, weakW, weight}]}]}
 * @returns {{coverage:number, consViolations:number, overCap:number,
 *   reversals:number, weakCorr:number|null, boostCorr:number|null,
 *   totalAlloc:number, capacity:number}}
 *   coverage       잔여 있는 과목 중 1장 이상 배정된 비율
 *   consViolations 주차 합계 > 주차 총량 위반 수
 *   overCap        잔여 초과 배정 건수 (과목×주차)
 *   reversals      잔여·가중 동일 쌍에서 잔여 많은 쪽이 적게 배정된 역전 수
 *   weakCorr       weakW ↔ 1주차 배정량 Spearman (비중 교란 포함 — 참고용)
 *   boostCorr      weakW ↔ 배정/(잔여×비중) 정규화 Spearman — 약점 가산의 순수 기여도
 */
function analyzeAlloc(res) {
    const out = { coverage: 0, consViolations: 0, overCap: 0, reversals: 0, weakCorr: null, boostCorr: null, totalAlloc: 0, capacity: 0 };
    if (!res || !res.weeks || !res.weeks.length) return out;
    const w0 = res.weeks[0].alloc;
    const allocSum = new Map();
    res.weeks.forEach(w => {
        const sum = w.alloc.reduce((s, a) => s + a.cards, 0);
        out.totalAlloc += sum;
        if (sum > w.total) out.consViolations++;
        w.alloc.forEach(a => {
            allocSum.set(a.key, (allocSum.get(a.key) || 0) + a.cards);
            if (a.cards > a.remaining) out.overCap++;
        });
    });
    const withRem = w0.filter(a => a.remaining > 0);
    const covered = withRem.filter(a => (allocSum.get(a.key) || 0) > 0);
    out.coverage = withRem.length ? Math.round(covered.length / withRem.length * 100) / 100 : 1;
    out.capacity = w0.reduce((s, a) => s + a.remaining, 0);
    for (let i = 0; i < w0.length; i++) for (let j = i + 1; j < w0.length; j++) {
        const a = w0[i], b = w0[j];
        if (a.weakW === b.weakW && a.weightPct === b.weightPct) {
            if ((a.remaining > b.remaining && a.cards < b.cards)
                || (a.remaining < b.remaining && a.cards > b.cards)) out.reversals++;
        }
    }
    out.weakCorr = spearman(w0.map(a => a.weakW), w0.map(a => a.cards));
    const boostable = w0.filter(a => a.remaining > 0 && a.weightPct > 0);
    if (boostable.length >= 2) {
        out.boostCorr = spearman(
            boostable.map(a => a.weakW),
            boostable.map(a => a.cards / (a.remaining * a.weightPct))
        );
    }
    return out;
}

/* =======================================================
   감사 본체 — 직접 실행 시에만 동작 (require 시 스텁 미설치)
   ======================================================= */

const SUBJECTS = [
    { key: 'suba', name: '과목A', stats: { cards: 200, quizzes: 120 } },
    { key: 'subb', name: '과목B', stats: { cards: 200, quizzes: 120 } },
    { key: 'subc', name: '과목C', stats: { cards: 200, quizzes: 120 } }
];

function _mockStorage() {
    const store = new Map();
    return {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: k => { store.delete(k); },
        key: i => [...store.keys()][i] ?? null,
        clear: () => store.clear(),
        get length() { return store.size; }
    };
}

function _installStubs() {
    globalThis.localStorage = _mockStorage();
    globalThis.window = {
        EXAMS_LIST: { exams: [{ id: 'simexam', name: '시뮬시험', default: true }] },
        DATA_REGISTRY: {
            subjects: SUBJECTS,
            // 문제은행 출제 비중 — subb만 2.5배
            exams: [
                { key: 'subject1', subject: 'suba', stats: { questions: 100 } },
                { key: 'subject2', subject: 'subb', stats: { questions: 250 } },
                { key: 'subject3', subject: 'subc', stats: { questions: 100 } }
            ],
            integratedExam: { passAverage: 60, subjectFailBelow: 40 },
            study: { minExamLeadDays: 50, readThroughDays: 10, readDayShare: 1 },
            analysis: { wrongCauses: [] }
        }
    };
}

function _dateStr(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- 가상 시계 — 시계열 시뮬용 Date 교체 ---------- */
// 모듈들이 `new Date()`를 호출 시점에 읽으므로 전역 Date를 오프셋 버전으로 바꾼다.
const _RealDate = Date;
function _setClockOffset(days) {
    const base = _RealDate.now();
    globalThis.Date = class extends _RealDate {
        constructor(...args) { super(...(args.length ? args : [base + days * 86400000])); }
        static now() { return base + days * 86400000; }
    };
}
function _resetClock() { globalThis.Date = _RealDate; }

async function main() {
    _installStubs();
    const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
    const tracker = await imp('src/study-tracker.js');
    const analysis = await imp('src/analysis-engine.js');
    const recs = await imp('src/recommendations.js');
    const sr = await imp('src/spaced-repetition.js');
    const fsrsMod = await imp('src/fsrs.js');
    const { safeSetItem, safeGetItem } = await imp('src/state.js');
    const { STORAGE_KEYS } = await imp('src/storage-keys.js');

    const seed = (k, v) => safeSetItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    const seedBase = (dday, opts = {}) => {
        localStorage.clear();
        localStorage.setItem('current_exam', 'simexam');
        seed(STORAGE_KEYS.EXAM_DATE, _dateStr(dday));
        seed(STORAGE_KEYS.STUDY_GOALS, { dailyCards: 50, dailyQuizzes: 10, weeklyStudyDays: 5 });
        if (opts.readProgress) seed(STORAGE_KEYS.READER_PROGRESS, opts.readProgress);
        if (opts.schedules) seed(STORAGE_KEYS.FC_SPACED_REPETITION, opts.schedules);
        if (opts.simHistory) seed(STORAGE_KEYS.SIM_RESULTS_HISTORY, opts.simHistory);
    };
    const allocOf = (res, w, key) => res.weeks[w].alloc.find(a => a.key === key).cards;
    const memIds = (k, n) => Array.from({ length: n }, (_, i) => `${k}_card_${i}`);
    const quizRes = (k, n, correctN) => Object.fromEntries(
        Array.from({ length: n }, (_, i) => [`${k}_quiz_${i}`, { correct: i < correctN }]));
    const allocInputs = extra => tracker.computeSubjectAllocInputs({
        memorizedCards: extra.mem || [], quizResults: extra.quiz || {},
        weakCards: extra.weak || [], exams: window.DATA_REGISTRY.exams,
        dueCardIds: extra.due || []
    });

    /** @type {Array<{name:string, checks:Array<{id:string,ok:boolean,detail:string}>, metrics:Object}>} */
    const results = [];
    const run = (name, fn) => {
        const checks = [];
        const ok = (id, cond, detail = '') => checks.push({ id, ok: !!cond, detail });
        let metrics = {};
        try { metrics = fn(ok) || {}; } catch (e) { ok('crash', false, String(e && e.stack || e)); }
        results.push({ name, checks, metrics });
    };

    /* ---------- 스마트학습: 배분·계획 시나리오 ---------- */

    run('S1 콜드스타트 — 중립 가중·전 과목 커버', ok => {
        seedBase(60);
        const plan = tracker.computeStudyPlan(600);
        const res = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({}));
        const m = analyzeAlloc(res);
        ok('neutral', res.weeks[0].alloc.every(a => a.weakW === 1), `weakW=${res.weeks[0].alloc.map(a => a.weakW).join(',')}`);
        ok('no-badge', res.weeks[0].alloc.every(a => !a.weakBadge));
        ok('coverage', m.coverage === 1, `coverage=${m.coverage}`);
        ok('cons', m.consViolations === 0 && m.overCap === 0);
        ok('weight-order', allocOf(res, 0, 'subb') > allocOf(res, 0, 'suba'), 'subb(비중250) > suba(100)');
        return { ...m, tier: plan.tier };
    });

    run('S2 균등 학습자 — 잔여·비중 비례 배분', ok => {
        seedBase(60);
        const plan = tracker.computeStudyPlan(450);
        const res = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({
            mem: ['suba', 'subb', 'subc'].flatMap(k => memIds(k, 50)),
            quiz: Object.assign({}, quizRes('suba', 30, 27), quizRes('subb', 30, 27), quizRes('subc', 30, 27))
        }));
        const m = analyzeAlloc(res);
        ok('cons', m.consViolations === 0 && m.overCap === 0);
        ok('reversals', m.reversals === 0, `reversals=${m.reversals}`);
        ok('weight-order', allocOf(res, 0, 'subb') > allocOf(res, 0, 'suba'));
        return m;
    });

    run('S3 약점 편중 — 약한 과목 배정 증가', ok => {
        seedBase(60);
        const plan = tracker.computeStudyPlan(450);
        const mk = weakSubj => allocInputs({
            mem: ['suba', 'subb', 'subc'].flatMap(k => memIds(k, 50)),
            quiz: Object.assign(
                {},
                quizRes('suba', 30, weakSubj === 'suba' ? 9 : 27),
                quizRes('subb', 30, weakSubj === 'subb' ? 9 : 27),
                quizRes('subc', 30, weakSubj === 'subc' ? 9 : 27))
        });
        const resWeak = tracker.computeSubjectAllocation(plan, SUBJECTS, mk('suba'));
        const resBase = tracker.computeSubjectAllocation(plan, SUBJECTS, mk(null));
        const a = resWeak.weeks[0].alloc.find(x => x.key === 'suba');
        const m = analyzeAlloc(resWeak);
        ok('weakW-up', a.weakW > 1.15, `weakW=${a.weakW}`);
        ok('badge', a.weakBadge);
        ok('alloc-up', allocOf(resWeak, 0, 'suba') > allocOf(resBase, 0, 'suba'),
            `${allocOf(resBase, 0, 'suba')} → ${allocOf(resWeak, 0, 'suba')}`);
        // 정규화 상관: 비중 효과를 나눠 약점 가중의 순수 기여 측정
        ok('boostCorr', m.boostCorr === null || m.boostCorr > 0.5, `boostCorr=${m.boostCorr}`);
        return m;
    });

    run('S4 과락 위험 — 추천 우선순위가 과락 과목을 선두에', ok => {
        seedBase(60, {
            simHistory: [{ date: '2026-10-01', examId: 'subject1', rate: 35, subjectRates: { subject1: 35, subject2: 80, subject3: 85 } }]
        });
        const counts = {
            suba: { mem: 50, weak: 0, quizSolved: 10, quizCorrect: 5 },   // 50% — 과락 과목
            subb: { mem: 50, weak: 0, quizSolved: 10, quizCorrect: 8 },
            subc: { mem: 50, weak: 0, quizSolved: 10, quizCorrect: 4 }    // 40% — 최저 정답률이지만 과락 아님
        };
        const out = recs.computeRecommendations(SUBJECTS, counts);
        const iFail = out.findIndex(r => /과락/.test(r.title));
        const iLow = out.findIndex(r => /정답률 최저/.test(r.title));
        ok('fail-first', iFail >= 0 && iLow >= 0 && iFail < iLow, `과락#${iFail} vs 최저#${iLow}`);
        ok('fail-target', iFail >= 0 && out[iFail].actions.some(x => x.arg === 'suba'));
        const primaries = out.map(r => r.actions[0] && r.actions[0].arg);
        ok('no-dup', new Set(primaries).size === primaries.length, primaries.join(','));
        ok('cap', out.length <= 5, `recs=${out.length}`);
        const hist = JSON.parse(safeGetItem(STORAGE_KEYS.SIM_RESULTS_HISTORY));
        const gap = analysis.computePassGap({ estimate: null, simHistory: hist, subjects: SUBJECTS, counts, rules: { passAverage: 60, subjectFailBelow: 40 } });
        ok('gap-weakest', gap && gap.weakest && gap.weakest.key === 'suba', gap && gap.weakest && gap.weakest.reason);
        return { recs: out.length };
    });

    run('S5 잔여 0 과목 — 배정 0 + 재배분', ok => {
        seedBase(60);
        const plan = tracker.computeStudyPlan(400);
        const res = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({ mem: memIds('subb', 200) }));
        const m = analyzeAlloc(res);
        ok('done-zero', res.weeks.every(w => w.alloc.find(a => a.key === 'subb').cards === 0));
        ok('cons', m.consViolations === 0 && m.overCap === 0);
        ok('coverage', m.coverage === 1);
        return m;
    });

    run('S6 임박 D-7 — triage 판정 + 용량 초과 경고', ok => {
        seedBase(7);
        const plan = tracker.computeStudyPlan(800);
        ok('triage', plan && plan.tier === 'triage', `tier=${plan && plan.tier}`);
        ok('one-week', plan.weeks.length === 1);
        ok('cumulative', plan.weeks[0].cumulative === 800, `cumulative=${plan.weeks[0].cumulative}`);
        const res = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({}));
        const m = analyzeAlloc(res);
        ok('cap-respect', m.overCap === 0, `overCap=${m.overCap}`);
        return { ...m, demandGap: 800 - m.totalAlloc };
    });

    run('S7 통독 중 — 읽기 주차 카드 배정 감소', ok => {
        seedBase(60);
        const planNoRead = tracker.computeStudyPlan(600);
        seedBase(60, { readProgress: { suba: { frac: 0.5 } } });
        const planRead = tracker.computeStudyPlan(600);
        ok('readDays', planRead.readDaysLeft > 0, `readDaysLeft=${planRead.readDaysLeft}`);
        ok('reading-weeks', planRead.weeks.some(w => w.reading > 0));
        ok('cards-reduced', planRead.weeks[0].cards < planNoRead.weeks[0].cards,
            `${planRead.weeks[0].cards} < ${planNoRead.weeks[0].cards}`);
        return { readDaysLeft: planRead.readDaysLeft, w0cards: planRead.weeks[0].cards };
    });

    run('S8 복습 밀림 — due 가산이 배정을 증가', ok => {
        seedBase(60);
        const plan = tracker.computeStudyPlan(300);
        const mem = ['suba', 'subb', 'subc'].flatMap(k => memIds(k, 100));
        const resDue = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({ mem, due: memIds('suba', 30) }));
        const resNo = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({ mem }));
        const a = resDue.weeks[0].alloc.find(x => x.key === 'suba');
        ok('dueBoost', a.dueBoost >= 0.25, `dueBoost=${a.dueBoost}`);
        ok('alloc-up', allocOf(resDue, 0, 'suba') > allocOf(resNo, 0, 'suba'),
            `${allocOf(resNo, 0, 'suba')} → ${allocOf(resDue, 0, 'suba')}`);
        return { dueBoost: a.dueBoost };
    });

    /* ---------- 맞춤학습: 진단·추천·추정 정확성 ---------- */

    run('D1 취약 단원 랭킹 — 주입된 오답 분포와 일치', ok => {
        seedBase(60);
        const out = analysis.computeChapterWeakness({
            quizResults: { suba_quiz_1: { correct: false }, suba_quiz_2: { correct: false }, suba_quiz_3: { correct: true } },
            weakCards: new Set(['weak_sim_subject1_q1', 'weak_sim_subject1_q2', 'weak_sim_subject1_q5']),
            statementStats: {},
            questionChapters: { subject1_q1: '제1장', subject1_q2: '제1장', subject1_q5: '제2장' },
            chapterRanges: { suba: [[1, '제1장'], [50, '제2장']] },
            resolveQuiz: id => ({ quiz: { category: id === 'suba_quiz_3' ? '제3장' : '제1장' }, subjectId: 'suba' })
        });
        const top = out[0];
        ok('top-chapter', top && top.chapter === '제1장' && top.wrongs === 4,
            top && `${top.chapter}:${top.wrongs}`);
        const grouped = analysis.computeSubjectWeakChapters({
            quizResults: {}, weakCards: new Set(['weak_sim_subject1_q1']),
            statementStats: {}, questionChapters: { subject1_q1: '제1장' },
            chapterRanges: { suba: [[1, '제1장']] }, resolveQuiz: () => null
        });
        ok('grouped', grouped.length === 1 && grouped[0].subjectKey === 'suba');
        return { topWrongs: top && top.wrongs };
    });

    run('D2 추천 불변식 — 우선순위·중복·상한', ok => {
        seedBase(60, {
            schedules: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`suba_card_${i}`, { repetition: 1, easiness: 2.5, nextReview: '2000-01-01', lastReview: null }])),
            simHistory: [{ date: '2026-10-01', examId: 'subject1', rate: 35, subjectRates: { subject1: 35, subject2: 80, subject3: 85 } }]
        });
        const counts = { suba: { mem: 10, weak: 3, quizSolved: 10, quizCorrect: 4 }, subb: { mem: 10, weak: 8, quizSolved: 10, quizCorrect: 9 }, subc: { mem: 0, weak: 0, quizSolved: 0, quizCorrect: 0 } };
        const out = recs.computeRecommendations(SUBJECTS, counts);
        ok('due-first', out.length > 0 && /복습할 카드/.test(out[0].title), out[0] && out[0].title);
        ok('cap', out.length <= 5, `recs=${out.length}`);
        ok('actions', out.every(r => Array.isArray(r.actions) && r.actions.length > 0));
        return { recs: out.length, first: out[0] && out[0].title };
    });

    run('D3 예상 점수 — 수렴·보정 절단', ok => {
        seedBase(60);
        const est = recs.estimateCompositeScore([{ rate: 70 }, { rate: 72 }, { rate: 74 }]);
        ok('expected', est && Math.abs(est.expected - 72) <= 1, `expected=${est && est.expected}`);
        ok('source', est && est.source === 'sim');
        const biased = recs.estimateCompositeScore([{ rate: 70 }, { rate: 72 }, { rate: 74 }], {}, 30);
        ok('bias-clamp', biased && biased.biasApplied === 15 && biased.expected === est.expected + 15,
            `bias=${biased && biased.biasApplied}`);
        const cal = recs.computeCalibrationBias({ score: 80, expectedAtReport: 60 });
        ok('cal-clamp', cal === 15, `cal=${cal}`);
        return { expected: est && est.expected };
    });

    run('D4 추천 효과 추적 — 기준선 대비 개선 감지', ok => {
        seedBase(60);
        seed(STORAGE_KEYS.REC_SNAPSHOT, {
            ts: Date.now() - 13 * 3600000, examId: 'simexam',
            targets: ['suba'], baseline: { suba: { solved: 10, correct: 5 } }
        });
        const eff = recs.evaluateRecommendationEffect({ suba: { mem: 0, weak: 0, quizSolved: 20, quizCorrect: 14 } });
        ok('detected', eff && eff.items.length === 1);
        ok('delta', eff && eff.items[0].delta === 20 && eff.items[0].added === 10,
            eff && `delta=${eff.items[0].delta} added=${eff.items[0].added}`);
        return { delta: eff && eff.items[0] && eff.items[0].delta };
    });

    run('D5 FSRS 스케줄 — reps 단조·오답 lapses·기한 집계', ok => {
        seedBase(60);
        sr.updateCardSchedule('suba_card_1', true);
        let s = JSON.parse(safeGetItem(STORAGE_KEYS.FC_SPACED_REPETITION)).suba_card_1;
        ok('rep1', s.reps === 1 && s.v === 2);
        sr.updateCardSchedule('suba_card_1', true);
        s = JSON.parse(safeGetItem(STORAGE_KEYS.FC_SPACED_REPETITION)).suba_card_1;
        ok('rep2', s.reps === 2 && s.due > _dateStr(0), `due=${s.due}`);
        const sBefore = s.s;
        sr.updateCardSchedule('suba_card_1', false);
        s = JSON.parse(safeGetItem(STORAGE_KEYS.FC_SPACED_REPETITION)).suba_card_1;
        ok('lapse', s.lapses === 1 && s.s <= sBefore, `s ${sBefore}→${s.s}`);
        // 기한 도래 카드 별도 시드 (구 SM-2 형식 — 지연 변환 호환 검증) → getDueCards 집계 확인
        seed(STORAGE_KEYS.FC_SPACED_REPETITION, { subb_card_9: { repetition: 2, easiness: 2.5, nextReview: '2000-01-01', lastReview: null } });
        const due = sr.getDueCards();
        ok('due', due.includes('subb_card_9'), `due=${due.length}`);
        return { due: due.length };
    });

    /* ---------- 시계열 시뮬레이션 (가상 시계) ---------- */

    run('T1 계획 준수 시뮬 — 주차 배분 추종 시 D-day 잔여 0', ok => {
        seedBase(63); // 9주 — 여유 용량 675 ≥ 수요 600
        _setClockOffset(0);
        try {
            const mem = { suba: 0, subb: 0, subc: 0 };
            const total = 600;
            let iters = 0, lastTier = null;
            while (iters < 12) {
                const remaining = total - (mem.suba + mem.subb + mem.subc);
                if (remaining <= 0) break;
                const plan = tracker.computeStudyPlan(remaining);
                if (!plan) break;
                lastTier = plan.tier;
                const res = tracker.computeSubjectAllocation(plan, SUBJECTS, allocInputs({
                    mem: Object.entries(mem).flatMap(([k, n]) => memIds(k, n))
                }));
                res.weeks[0].alloc.forEach(a => { mem[a.key] += Math.min(a.cards, a.remaining); });
                iters++;
                _setClockOffset(iters * 7);
            }
            const left = total - (mem.suba + mem.subb + mem.subc);
            ok('exhausted', left === 0, `잔여=${left} iters=${iters}`);
            ok('within-dday', iters <= 9, `iters=${iters}`);
            ok('tier-stable', lastTier !== 'triage', `tier=${lastTier}`);
            return { iters, left };
        } finally { _resetClock(); }
    });

    run('T2 추천 추종 시뮬 — 약점 추적 회전 + 개선 격차', ok => {
        seedBase(60);
        const mk = () => ({
            suba: { mem: 50, weak: 0, quizSolved: 10, quizCorrect: 3 }, // 30% — 최약
            subb: { mem: 50, weak: 0, quizSolved: 10, quizCorrect: 6 },
            subc: { mem: 50, weak: 0, quizSolved: 10, quizCorrect: 9 }
        });
        const follower = mk(), robin = mk();
        const targets = [];
        const cycle = ['subb', 'subc', 'suba']; // 고정 순환 — 약점 무시형 대조군
        for (let r = 0; r < 9; r++) {
            const out = recs.computeRecommendations(SUBJECTS, follower);
            const t = out[0].actions[0].arg;
            targets.push(t);
            follower[t].quizSolved += 10; follower[t].quizCorrect += 8;
            const rt = cycle[r % cycle.length];
            robin[rt].quizSolved += 10; robin[rt].quizCorrect += 8;
        }
        const minRate = c => Math.min(...SUBJECTS.map(s => c[s.key].quizCorrect / c[s.key].quizSolved));
        const mf = Math.round(minRate(follower) * 100), mr = Math.round(minRate(robin) * 100);
        ok('rotate', new Set(targets).size >= 2, targets.join(','));
        ok('gap', mf > mr, `추종 min=${mf}% vs 순환 min=${mr}%`);
        return { minFollower: mf, minRobin: mr, distinctTargets: new Set(targets).size };
    });

    run('T3 FSRS 30일 시뮬 — 안정도 확장·백로그 발산 없음', ok => {
        seedBase(60);
        _setClockOffset(0);
        try {
            const ids = memIds('suba', 60);
            let reviews = 0;
            // d0 최초 학습 + d1~30 매일 기한 도래분 복습 (9회 중 1회 오답 — 결정론적)
            ids.forEach(id => { sr.updateCardSchedule(id, true); reviews++; });
            for (let d = 1; d <= 30; d++) {
                _setClockOffset(d);
                const due = sr.getDueCards();
                due.forEach((id, i) => { sr.updateCardSchedule(id, i % 9 !== 8); reviews++; });
            }
            const sched = JSON.parse(safeGetItem(STORAGE_KEYS.FC_SPACED_REPETITION));
            const entries = ids.map(id => sched[id]).filter(Boolean);
            const sList = entries.map(e => e.s).sort((a, b) => a - b);
            const medS = sList[Math.floor(sList.length / 2)];
            const distinctDates = new Set(entries.map(e => e.due)).size;
            ok('no-loss', entries.length === ids.length, `${entries.length}/${ids.length}`);
            ok('spacing', reviews <= ids.length * 10, `reviews=${reviews} (일일 복습이면 ${ids.length * 30})`);
            ok('stability-grow', medS >= 3, `medianS=${medS}일`);
            // FSRS-6은 동일 이력(d·s 동일) 카드를 동일 due로 수렴 — 시뮬의 결정론 레이팅이
            // 2개 클러스터로 모이는 것은 정상 수렴이며, 가드 목적은 단일 날짜 몰림(백로그 집중) 차단
            ok('desync', distinctDates >= 2, `distinctDueDates=${distinctDates}`);
            return { reviews, medS, distinctDates };
        } finally { _resetClock(); }
    });

    run('T4 시험일 due 클램프 — 시험일 R<0.95 대역은 exam−1로 당김 (D-20)', ok => {
        seedBase(10);                        // 시험 D-10
        _setClockOffset(0);
        try {
            const examStr = _dateStr(10), examMinus1 = _dateStr(9);
            const sched0 = {};
            // 위험 대역: elapsed≈1 → s≈15 유지, 간격~16 > dday 10, 시험일 R≈0.93
            memIds('band', 10).forEach(id => {
                sched0[id] = { v: 2, d: 5, s: 15, reps: 3, lapses: 0, lastInterval: 15, due: _dateStr(14), lastReview: _dateStr(-1) };
            });
            sched0.mature = { v: 2, d: 3, s: 100, reps: 9, lapses: 0, lastInterval: 100, due: _dateStr(99), lastReview: _dateStr(-1) };
            seed(STORAGE_KEYS.FC_SPACED_REPETITION, sched0);
            const ids = Object.keys(sched0);
            ids.forEach(id => sr.updateCardSchedule(id, true));
            const sched = JSON.parse(safeGetItem(STORAGE_KEYS.FC_SPACED_REPETITION));
            const pulled = ids.filter(id => id !== 'mature' && sched[id].due === examMinus1).length;
            ok('clamp', pulled === ids.length - 1, `${pulled}/${ids.length - 1} → exam−1`);
            ok('mature-keep', sched.mature.due > examStr, `mature due=${sched.mature.due}`);
            // 클램프된 카드는 시험 전 예정 복습 보유 — 위험 집합 해소
            const riskIds = sr.getExamRiskCards(10).map(r => r.id);
            ok('risk-clear', !ids.filter(i => i !== 'mature').some(id => riskIds.includes(id)), `risk=${riskIds.length}`);
            // §5 계측 — exam−1로 당겨진 카드가 실제 복습되면 시험일 R이 회복되는가
            _setClockOffset(9);          // exam−1 — 당겨진 카드가 due 큐에 표면화돼야 함
            const dueNow = sr.getDueCards();
            const surfaced = ids.filter(i => i !== 'mature' && dueNow.includes(i));
            ok('due-surface', surfaced.length === ids.length - 1, `exam−1 due=${surfaced.length}`);
            surfaced.forEach(id => sr.updateCardSchedule(id, true)); // due 큐가 복습을 수행
            const sched2 = JSON.parse(safeGetItem(STORAGE_KEYS.FC_SPACED_REPETITION));
            // 시험일(d10) 시점 R = 마지막 복습(exam−1) 후 경과 1일
            const rList = surfaced.map(id => fsrsMod.retrievability(1, sched2[id].s));
            const minR = rList.length ? Math.min(...rList) : 0;
            ok('r-recovered', minR >= 0.95, `시험일 최소 R=${minR.toFixed(3)}`);
            return { pulled, riskLeft: riskIds.length, rExamMin: Math.round(minR * 1000) / 1000 };
        } finally { _resetClock(); }
    });

    run('T5 BKT 단원 숙달 — 정답 시퀀스의 회복이 P(L)에 반영 (D-22)', ok => {
        seedBase(60);
        const ch1 = { quiz: { category: '제1장' }, subjectId: 'suba' };
        const ch2 = { quiz: { category: '제2장' }, subjectId: 'suba' };
        const quizResults = {
            suba_q1: { correct: true }, suba_q2: { correct: true },
            suba_q3: { correct: true }, suba_q4: { correct: false }, // 제1장 카운트(3정1오)
            suba_q9: { correct: false }                             // 제2장 카운트(0정1오)
        };
        const resolveQuiz = id => ({ suba_q1: ch1, suba_q2: ch1, suba_q3: ch1, suba_q4: ch1, suba_q9: ch2 })[id] || null;
        const reviewLog = [ // 제1장: 오답 후 정답 3연속 회복 / 제2장: 오답으로 끝남
            { c: 'suba_q4', k: 'q', ok: 0, t: 1 },
            { c: 'suba_q1', k: 'q', ok: 1, t: 2 },
            { c: 'suba_q2', k: 'q', ok: 1, t: 3 },
            { c: 'suba_q3', k: 'q', ok: 1, t: 4 },
            { c: 'suba_q9', k: 'q', ok: 0, t: 5 }
        ];
        const p = {
            quizResults, weakCards: new Set(), statementStats: {},
            questionChapters: {}, chapterRanges: {}, resolveQuiz
        };
        const bkt = analysis.computeChapterWeakness({ ...p, reviewLog });
        const beta = analysis.computeChapterWeakness(p); // 시퀀스 없음 → Beta 폴백
        const b1 = bkt.find(b => b.chapter === '제1장'), b2 = bkt.find(b => b.chapter === '제2장');
        const bb1 = beta.find(b => b.chapter === '제1장');
        ok('recover', b1 && b1.mastery > 0.9, `제1장 P(L)=${b1 && b1.mastery}`);   // 정답 회복 인정 — Beta(~0.64)로는 불가
        ok('vs-beta', b1 && bb1 && b1.mastery > bb1.mastery + 0.3, `BKT ${b1 && b1.mastery} vs Beta ${bb1 && bb1.mastery}`);
        ok('weak-order', bkt[0] && bkt[0].chapter === '제2장' && b2.mastery < 0.3,
            `1위=${bkt[0] && bkt[0].chapter} P(L)=${b2 && b2.mastery}`);          // 최근 오답 단원이 최약 유지
        return { recovered: Math.round(b1.mastery * 100) / 100, weak: Math.round(b2.mastery * 100) / 100, betaCh1: Math.round(bb1.mastery * 100) / 100 };
    });

    /* ---------- 리포트 ---------- */

    let fail = 0;
    const lines = [];
    results.forEach(r => {
        const bad = r.checks.filter(c => !c.ok);
        fail += bad.length;
        const mStr = Object.entries(r.metrics).map(([k, v]) => `${k}=${v}`).join(' ');
        lines.push(`${bad.length ? '❌' : '✅'} ${r.name}${mStr ? `  [${mStr}]` : ''}`);
        bad.forEach(c => lines.push(`      ✗ ${c.id}: ${c.detail}`));
    });
    const report = {
        tool: 'audit_study_quality',
        generatedAt: new Date().toISOString(),
        summary: { scenarios: results.length, checks: results.reduce((s, r) => s + r.checks.length, 0), failed: fail },
        scenarios: results
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(lines.join('\n'));
    console.log(`\n시나리오 ${results.length}개 · 검사 ${report.summary.checks}건 · 실패 ${fail}건`);
    console.log(`리포트: ${path.relative(ROOT, REPORT_PATH)}`);

    if (CHECK_MODE || UPDATE_BASELINE) {
        const keys = results.flatMap(r => r.checks.map(c => `${r.name}/${c.id}:${c.ok ? 1 : 0}`));
        if (UPDATE_BASELINE) {
            fs.writeFileSync(BASELINE_PATH, JSON.stringify({ keys }, null, 2), 'utf-8');
            console.log(`기준선 갱신: ${path.relative(ROOT, BASELINE_PATH)}`);
        } else if (fs.existsSync(BASELINE_PATH)) {
            const base = new Set(JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8')).keys);
            const regressions = keys.filter(k => base.has(k.replace(/:0$/, ':1')) && k.endsWith(':0'));
            if (regressions.length) {
                console.error(`\n기준선 대비 회귀 ${regressions.length}건:`);
                regressions.forEach(k => console.error(`  - ${k.replace(/:0$/, '')}`));
                process.exitCode = 1;
            } else console.log('기준선 대비 회귀 없음');
        }
    }
    if (fail > 0) process.exitCode = 1;
}

module.exports = { spearman, analyzeAlloc };

if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
