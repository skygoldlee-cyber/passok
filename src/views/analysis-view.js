// src/views/analysis-view.js — 학습 진단(개인화 분석) 뷰 컨트롤러
// @spec AN-01~09,SC-11,SC-12,D-23,PS-01,PS-04,PS-05,PS-09,PS-10
//
// dashboard.js에서 분리 (모듈 경계 정리) — 학습 진단 뷰의 진단 카드 7종,
// 과목별 학습 진입(startSubject*), 주간 리포트보내기를 전담한다.
// 과목 카드·히트맵·모의고사 차트의 DOM 요소는 대시보드 뷰와 공유한다
// (renderDashboard가 ID 기준으로 채우므로 그대로 재사용).

import { state } from '../state.js';
import { esc } from '../sanitize.js';
import { DataLoader } from '../data-loader.js';
import { switchView } from './navigation.js';
import { getDueCount, getDueCards, getExamRiskCards, EXAM_R_SESSION_CAP, getReviewLog } from '../spaced-repetition.js';
import { computeWrongCauseSummary, getWrongCauseLabels, getSimHistory, evaluateRecommendationEffect, computeCalibrationBias, getActualResult } from '../recommendations.js';
import {
    getDDay, getStudyGoals, getTodayGoalProgress, getWeeklyGoalProgress,
    getStudyCalendar, computeStudyPlan, computePlanAdherence,
    computeSubjectAllocation, computeSubjectAllocInputs,
    sumRecentCardsBySubject, sumRecentQuizzesBySubject,
    examWeightBySubject, selectExamRiskSession
} from '../study-tracker.js';
import { getWeakStatements, getDueStatementSids, getAnomalousStatements, getAllStatementStats } from '../statement-tracker.js';
import {
    computeSubjectWeakChapters, computeWeeklyGrowth, computePassGap,
    computeWeakConceptClusters, computePaceProjection, estimateUntaggedCauses,
    computeStudyPattern, buildWeeklyReportText, computeMasteryLevels, normalizeCidAnchor, subjectFromSid
} from '../analysis-engine.js';
import { SemanticIndex } from '../semantic-index.js';
import { generateClinic, estimatePassProb, weeklyReport, weakRefLink } from '../personalization.js';
import {
    personalKtParams, weakClusters, resolveCidChapter, refitPersonalModels
} from './personalization-view.js';
import { resolveWrongQuiz } from '../weak-items.js';
import { showToast, showGlobalLoading, hideGlobalLoading } from '../ui-utils.js';
import { getExamRules, getExamAppName } from '../exam-context.js';
import { trackAction } from '../usage-stats.js';
import { renderDashboard, onAnalysisRefresh } from './dashboard.js';
import { getSubjCounts, displayCounts } from './subject-stats.js';
import { compositeEstimate } from './score-estimate.js';
import { mountProMoment } from '../pro-upgrade.js';

/**
 * 학습 진단 뷰 렌더링 — renderDashboard()가 과목 카드·히트맵·차트를
 * 채운 뒤, 이 뷰 전용 진단 요약 카드 3종을 추가로 렌더링한다.
 */
export function renderAnalysisView() {
    renderDashboard();
    _renderAnalysisOnboarding();
    _renderSmartPlanInsight();
    _renderWrongCauseInsight();
    _renderWeakStatementInsight();
    _renderStudyRhythmInsight();
    _renderChapterWeakness();
    _renderPassGapInsight();
    // PS-01 — 의미 이웃 자산 미로드 시 지연 로드 후 취약 진술 카드만 재렌더
    // (첫 렌더는 cid 단독 클러스터, 로드 완료 시 이웃 결합 클러스터로 승격)
    if (SemanticIndex.isEnabled() && !(typeof window !== 'undefined' && /** @type {any} */ (window).EMB_NEIGHBORS && /** @type {any} */ (window).EMB_NEIGHBORS.adj)) {
        SemanticIndex.ensureLoaded().then(ok => { if (ok) _renderWeakStatementInsight(); });
    }
    // PS-06·PS-11 — 개인 파라미터 재피팅 (내부 12h 스로틀 — 실패가 진단 렌더를 막지 않도록 격리)
    try { refitPersonalModels(); } catch (e) { /* 피팅은 부가 기능 — 조용히 폴백 */ }
    // ROAD-P6 — 진단 리포트 열람(aha 모멘트)에 비차단 Pro 넛지
    mountProMoment(document.getElementById('analysis-view'), 'analysis_report');
}

// 백그라운드 통계 갱신 시 분석 뷰도 함께 갱신 — dashboard.js의 onAnalysisRefresh 훅
// (양방향 import 대신 콜백 등록으로 모듈 순환을 피한다)
onAnalysisRefresh(_renderChapterWeakness);

/** BKT 입력 공용 — 리뷰 로그 시퀀스 + manifest·개인 피팅 병합 kt 파라미터 (D-22·PS-07·PS-11) */
function _ktInputs() {
    return { reviewLog: getReviewLog(), ktParams: personalKtParams() };
}

/** 과목별 취약 단원 그룹 공용 계산 — 단원 카드·주간 배분·리포트가 공유 (SC-11·SC-12) */
function _weakChapterGroups(chaptersPerSubject = 2) {
    const qc = (DataLoader._questionChapters) || { questions: {}, ranges: {}, cidSection: {}, chapterTitles: {} };
    const subjectsMeta = (typeof DataLoader !== 'undefined' && DataLoader.registry)
        ? DataLoader.getSubjectList() : [];
    const nameOf = (key) => { const s = subjectsMeta.find(x => x.key === key); return s ? s.name : key; };
    return computeSubjectWeakChapters({
        quizResults: state.quizResults, weakCards: state.weakCards,
        statementStats: getAllStatementStats(),
        questionChapters: qc.questions, chapterRanges: qc.ranges,
        chapterTitles: qc.chapterTitles, cidSection: qc.cidSection,
        resolveQuiz: resolveWrongQuiz, subjectName: nameOf, chaptersPerSubject,
        ..._ktInputs()
    });
}

/** 주간 배분 입력 공용 집계 — 분석 카드·리포트가 캘린더 칩과 동일 입력 공유 (SC-11·SC-12) */
function _allocInputs() {
    return computeSubjectAllocInputs({
        memorizedCards: state.memorizedCards,
        quizResults: state.quizResults,
        weakCards: state.weakCards,
        exams: (DataLoader.registry && DataLoader.registry.exams) || [],
        wrongCauses: state.wrongCauses,
        dueCardIds: getDueCards(),
        weakChapterGroups: _weakChapterGroups()
    });
}

/**
 * 이번 주 주간 배분 카드 (SC-11) — 캘린더 계획 패널의 과목별 배분을
 * 학습 진단 뷰에 요약 표시 (진단 → 실행 연결). 시험일 미설정 시 설정 유도.
 */
function _renderSmartPlanInsight() {
    const el = document.getElementById('analysis-smart-plan');
    if (!el) return;
    const subjectsMeta = (typeof DataLoader !== 'undefined' && DataLoader.registry)
        ? DataLoader.getSubjectList()
        : Object.keys(window.STUDY_DATA || {}).map(key => {
            const d = (window.STUDY_DATA || {})[key];
            return { key, name: d.name, stats: { cards: (d.cards || []).length, quizzes: (d.quizzes || []).length } };
        });
    const totalCards = subjectsMeta.reduce((s, m) => s + displayCounts(m).cards, 0);
    const plan = computeStudyPlan(Math.max(0, totalCards - state.memorizedCards.size));
    const alloc = plan && plan.tier !== 'done' ? computeSubjectAllocation(plan, subjectsMeta, _allocInputs()) : null;
    if (!alloc) {
        el.innerHTML = `<h4>🧠 이번 주 주간 배분 <span class="pro-badge" data-pro-feature="study_plan_pro">PRO</span></h4>
            <p class="analysis-empty">시험일을 설정하면 출제 비중과 약점 가중으로 과목별 주간 목표를 배분해 보여줍니다.</p>
            <button class="btn btn-primary btn-sm analysis-card-btn" data-click="openGoalSettings"><i class="fa-solid fa-gear" aria-hidden="true"></i> 시험일·목표 설정</button>`;
        return;
    }
    const doneBySubj = sumRecentCardsBySubject(getStudyCalendar());
    const quizDoneBySubj = sumRecentQuizzesBySubject(getStudyCalendar());
    const rowsHtml = alloc.thisWeek.alloc.filter(a => a.remaining > 0).map(a => {
        const done = doneBySubj[a.key] || 0;
        const qDone = quizDoneBySubj[a.key] || 0;
        const met = a.cards > 0 && done >= a.cards;
        const quizPart = a.quizzes > 0 ? ` · 퀴즈 ${qDone}/${a.quizzes}문` : '';
        const badgesHtml = (a.weakBadge ? ' <span class="alloc-badge alloc-badge-weak">약점</span>' : '')
            + (alloc.hasWeights && a.weightPct > 0 ? ` <span class="alloc-badge">${a.weightPct}%</span>` : '');
        return `<div class="wc-row"><span>${esc(a.name)}${badgesHtml}</span><strong${met ? ' class="alloc-met"' : ''}>${done}/${a.cards}장${quizPart}</strong></div>`;
    }).join('');
    el.innerHTML = `<h4>🧠 이번 주 주간 배분 <span class="pro-badge" data-pro-feature="study_plan_pro">PRO</span></h4>
        ${rowsHtml}
        <p class="analysis-advice">배정 = 잔여량 × 출제 비중 × 약점 가중(밀린 복습 포함) — 칩의 ⓘ 버튼으로 과목별 근거를 볼 수 있습니다.</p>
        <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="switchView" data-arg="calendar-view"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i> 캘린더 보기</button>`;
}

/**
 * 주간 배분 배정 근거 딥링크 (SC-11) — 학습 진단 뷰로 전환 후
 * 해당 과목 카드로 스크롤·일시 강조한다.
 */
export function gotoSubjectAnalysis(subjKey) {
    switchView('analysis-view', { scrollTop: true });
    setTimeout(() => {
        const card = document.getElementById(`subj-card-${subjKey}`);
        if (!card) return;
        if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('subj-card-flash');
        setTimeout(() => card.classList.remove('subj-card-flash'), 1600);
    }, 60);
}

/**
 * 진단 온보딩 — 데이터가 최소 표본에 못 미칠 때 진행률 카드를 최상단에 표시.
 * 의미 있는 진단에는 최소 퀴즈 10문 또는 모의고사 1회가 필요하다.
 * 표본이 충분해지면 카드는 자동으로 사라진다.
 */
const ANALYSIS_MIN_QUIZ = 10;
const ANALYSIS_MIN_SIM = 1;
function _renderAnalysisOnboarding() {
    const grid = document.querySelector('#analysis-view .analysis-insight-grid');
    if (!grid) return;
    let hint = document.getElementById('analysis-onboarding-hint');
    const counts = getSubjCounts();
    const quizSolved = Object.values(counts).reduce((s, c) => s + (c ? c.quizSolved || 0 : 0), 0);
    const simDone = getSimHistory().length;
    const ready = quizSolved >= ANALYSIS_MIN_QUIZ || simDone >= ANALYSIS_MIN_SIM;
    if (ready) {
        if (hint) hint.remove();
        return;
    }
    const quizPct = Math.min(100, Math.round((quizSolved / ANALYSIS_MIN_QUIZ) * 100));
    const simPct = Math.min(100, Math.round((simDone / ANALYSIS_MIN_SIM) * 100));
    const meter = (label, cur, min, pct) =>
        `<div class="wc-subrow"><span>${label}</span><strong>${cur}/${min}</strong></div>
         <div class="analysis-meter"><div class="analysis-meter-fill" style="width:${pct}%"></div></div>`;
    const html = `<h4>🌱 진단 준비 중</h4>
        <p class="analysis-empty">학습 진단은 푼 문제가 쌓일수록 정확해집니다 — 아래 중 하나만 채우면 진단이 시작됩니다.</p>
        ${meter(`퀴즈 풀이 (최소 ${ANALYSIS_MIN_QUIZ}문)`, quizSolved, ANALYSIS_MIN_QUIZ, quizPct)}
        ${meter(`모의고사 (최소 ${ANALYSIS_MIN_SIM}회)`, simDone, ANALYSIS_MIN_SIM, simPct)}
        <button class="btn btn-primary btn-sm analysis-card-btn" data-click="startSubjectQuiz"><i class="fa-solid fa-play" aria-hidden="true"></i> 지금 퀴즈 풀기</button>
        <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="startIntegratedMockExam"><i class="fa-solid fa-clock" aria-hidden="true"></i> 모의고사 시작</button>`;
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'analysis-onboarding-hint';
        hint.className = 'analytics-card';
        grid.prepend(hint);
    }
    hint.innerHTML = html;
}

/** 오답 패턴 분석 카드 — 최근 7일 원인 분포 + 권장 학습법 */
function _renderWrongCauseInsight() {
    const el = document.getElementById('analysis-wrong-cause');
    if (!el) return;
    const sum = computeWrongCauseSummary(state.wrongCauses);
    const goBtnHtml = `<button class="btn btn-secondary btn-sm analysis-card-btn" data-click="switchView" data-arg="review-view"><i class="fa-solid fa-star" aria-hidden="true"></i> 오답 복습으로</button>`;
    if (sum.total === 0) {
        el.innerHTML = `<h4>🧩 오답 패턴 분석</h4>
            <p class="analysis-empty">오답 복습에서 "틀린 이유"를 태그하면 최근 7일의 실수 패턴을 분석합니다.</p>${goBtnHtml}`;
        return;
    }
    const rowsHtml = Object.entries(getWrongCauseLabels())
        .map(([k, label]) => `<div class="wc-row"><span>${esc(label)}</span><strong>${sum.counts[k] || 0}건</strong></div>`).join('');

    // 미태깅 오답 자동 추정 (태깅 데이터가 희소할 때 보완)
    const est = estimateUntaggedCauses({
        quizResults: state.quizResults,
        wrongCauses: state.wrongCauses,
        resolveQuiz: resolveWrongQuiz
    });
    const estRowsHtml = est.estimated > 0
        ? `<p class="analysis-advice">추정 (미태깅 오답 ${est.estimated}건): 암기 부족 ${est.counts.memorize} · 개념 오해 ${est.counts.concept} · 계산 ${est.counts.calc}</p>`
        : '';

    el.innerHTML = `<h4>🧩 오답 패턴 분석 <span class="analysis-meta">최근 7일 · ${esc(sum.total)}건</span></h4>
        ${rowsHtml}
        <p class="analysis-advice">${esc(sum.advice)}</p>${estRowsHtml}${goBtnHtml}`;
}

/** 취약 진술 카드 — 반복 오판 진술 수 + 오늘 복습 대기 + 리뷰 딥링크 */
function _renderWeakStatementInsight() {
    const el = document.getElementById('analysis-weak-statements');
    if (!el) return;
    const weak = getWeakStatements(5);
    const dueCount = getDueStatementSids().length;
    const anomalous = getAnomalousStatements();
    if (weak.length === 0) {
        el.innerHTML = `<h4>🎯 취약 진술 추적</h4>
            <p class="analysis-empty">O/X·ㄱㄴㄷ 조합 드릴을 풀면 반복 오판 진술을 추적해 보여줍니다.</p>
            <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="switchView" data-arg="trainer-view"><i class="fa-solid fa-dumbbell" aria-hidden="true"></i> 훈련소로</button>`;
        return;
    }
    const qc = (DataLoader._questionChapters) || { questions: {}, ranges: {}, cidSection: {}, chapterTitles: {} };
    const rowsHtml = weak.slice(0, 3).map(w => {
        const label = w.t ? w.t : w.sid;
        const truthTag = w.truth === true ? ' <span class="analysis-truth">참</span>'
            : w.truth === false ? ' <span class="analysis-truth">거짓</span>' : '';
        return `<div class="wc-row"><span class="analysis-sid">${esc(label)}${truthTag}</span><strong>${w.w}회 오판</strong></div>`;
    }).join('');
    const clusters = computeWeakConceptClusters(getAllStatementStats(), qc.ranges, 2,
        { chapterTitles: qc.chapterTitles, cidSection: qc.cidSection });
    const clusterNoteHtml = clusters.length > 0
        ? `<p class="analysis-advice">🔗 같은 개념 구간에서 반복 오판: ${esc(clusters[0].chapter || clusters[0].cid)} (${clusters[0].count}개 진술)</p>` : '';

    // PS-01 — union-find 약점 개념 축 (의미 이웃+cid 결합) → PS-10 클리닉 처방 + PS-05 교재·드릴 딥링크
    const conceptClusters = weakClusters();
    let clinicHtml = '';
    if (conceptClusters.length > 0) {
        const top = conceptClusters[0];
        const rep = top.members[0];
        const subj = rep ? subjectFromSid(rep.sid) || '' : '';
        const anchor = rep ? normalizeCidAnchor(rep.cid, subj, qc.cidSection) : null;
        const chapter = rep ? resolveCidChapter(rep.cid, subj) : null;
        const link = rep ? weakRefLink(rep, () => chapter) : null;
        const clinic = generateClinic(top, { neighborCount: top.size - 1, refUrl: link && link.url });
        const stepsHtml = clinic.steps.slice(1).map(s => `<li>${esc(s)}</li>`).join('');
        clinicHtml = `<div class="clinic-block">
            <p class="clinic-head">🧪 ${esc(clinic.headline)}</p>
            <ul class="clinic-steps">${stepsHtml}</ul>
            <div class="clinic-actions">
                ${(subj && chapter) ? `<button class="btn btn-secondary btn-sm" data-click="openSubjectSection" data-args='${esc(JSON.stringify([subj, chapter]))}'><i class="fa-solid fa-book-open" aria-hidden="true"></i> 교재</button>` : ''}
                ${anchor ? `<button class="btn btn-secondary btn-sm" data-click="gotoOxDrill" data-arg="concept:${esc(anchor)}"><i class="fa-solid fa-bullseye" aria-hidden="true"></i> 이 개념 드릴</button>` : ''}
            </div></div>`;
    }
    const anomalousNoteHtml = anomalous.length > 0
        ? `<p class="analysis-advice">⚠️ 반복 오판 진술 ${anomalous.length}개 — 표현 검수가 필요할 수 있습니다.</p>` : '';
    el.innerHTML = `<h4>🎯 취약 진술 추적 <span class="analysis-meta">오늘 복습 대기 ${esc(dueCount)}개</span></h4>
        ${rowsHtml}${clusterNoteHtml}${clinicHtml}${anomalousNoteHtml}
        <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="gotoWeakReview"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> 취약 리뷰 열기</button>`;
}

/** 학습 리듬 카드 — 오늘 목표·주간 학습일·D-day 요약 + 캘린더 링크 */
function _renderStudyRhythmInsight() {
    const el = document.getElementById('analysis-study-rhythm');
    if (!el) return;
    const today = getTodayGoalProgress();
    const week = getWeeklyGoalProgress();
    const dday = getDDay();
    const ddayLabel = dday === null ? '미설정' : (dday < 0 ? `D+${-dday}` : (dday === 0 ? 'D-Day' : `D-${dday}`));

    // 주간 성장 — 최근 7일 vs 이전 7일
    const growth = computeWeeklyGrowth(getStudyCalendar());
    const growthRowHtml = growth.thisWeek.rate !== null
        ? `<div class="wc-row"><span>주간 정답률</span><strong>${growth.thisWeek.rate}%${growth.rateDelta !== null ? ` <span class="growth-delta ${growth.rateDelta >= 0 ? 'growth-up' : 'growth-down'}">${growth.rateDelta >= 0 ? '▲' : '▼'}${Math.abs(growth.rateDelta)}%p</span>` : ''}</strong></div>`
        : '';

    // 학습 패턴 — 최다 활동 시간대·요일 (캘린더 시간대 버킷 집계, 표본 부족 시 미표시)
    const pattern = computeStudyPattern(getStudyCalendar());
    const patternRowHtml = pattern
        ? `<div class="wc-row"><span>집중 패턴</span><strong>${pattern.topBand ? esc(pattern.topBand.label) : ''}${pattern.topBand && pattern.topDow ? ' · ' : ''}${pattern.topDow ? esc(pattern.topDow.label) : ''}</strong></div>
           <div class="wc-row"><span>주말 학습 비중</span><strong>${pattern.weekendShare}%</strong></div>`
        : '';

    // D-day 페이스 판정 — 현재 속도로 커버 가능한지
    const subjectsMeta = (typeof DataLoader !== 'undefined' && DataLoader.registry)
        ? DataLoader.getSubjectList() : [];
    const totalCards = subjectsMeta.reduce((s, m) => s + displayCounts(m).cards, 0);
    const pace = computePaceProjection({
        calendar: getStudyCalendar(), totalCards,
        memorized: state.memorizedCards.size, dday
    });
    const paceNoteHtml = pace
        ? `<p class="analysis-advice">${pace.verdict === 'ahead'
            ? `✅ 현재 페이스면 시험일까지 전체 커버 가능합니다.`
            : pace.verdict === 'ontrack'
                ? `📈 현재 페이스(학습일당 ${pace.pacePerDay}장)로 약 ${pace.projectedCoverage}% 커버 예상 — 학습일당 ${pace.neededPerDay}장 목표로 조금만 더.`
                : `⚠️ 현재 페이스로는 ${pace.projectedCoverage}% 커버에 그칩니다 — 학습일당 ${pace.neededPerDay}장 필요합니다.`}</p>`
        : '';

    el.innerHTML = `<h4>📅 학습 리듬</h4>
        <div class="wc-row"><span>오늘 목표 달성</span><strong>${esc(today.overallPercent)}%</strong></div>
        <div class="wc-row"><span>이번 주 학습일</span><strong>${esc(week.studyDays)}/${esc(week.goalDays)}일</strong></div>
        <div class="wc-row"><span>시험일</span><strong>${esc(ddayLabel)}</strong></div>
        ${growthRowHtml}${patternRowHtml}${paceNoteHtml}
        <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="switchView" data-arg="calendar-view"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i> 캘린더 보기</button>`;
}

/** 단원별 취약 분석 카드 — 과목별 그룹화 (과락이 과목 단위 평가이므로) */
function _renderChapterWeakness() {
    const el = document.getElementById('analysis-chapter-weak');
    if (!el) return;
    const groups = _weakChapterGroups();
    if (groups.length === 0) {
        el.innerHTML = `<h4>📖 단원별 취약 분석</h4>
            <p class="analysis-empty">퀴즈·모의고사·드릴에서 오답이 쌓이면 과목별로 어떤 단원이 약한지 보여줍니다.</p>`;
        return;
    }
    const sectionsHtml = groups.slice(0, 4).map(g => {
        const chRows = g.chapters.map(c =>
            `<div class="wc-subrow" role="button" tabindex="0" style="cursor:pointer" title="교재에서 이 단원 보기" data-click="openSubjectSection" data-args='${esc(JSON.stringify([g.subjectKey, c.chapter]))}'><span class="analysis-sid">${esc(c.chapter)}</span><span>숙달 ${Math.round((c.mastery || 0) * 100)}% · 오답 ${c.wrongs}건 <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span></div>`
        ).join('');
        return `<div class="wc-row wc-subj-row"><span>${esc(g.subject)}</span><strong>${g.totalWrongs}건</strong></div>${chRows}`;
    }).join('');
    el.innerHTML = `<h4>📖 단원별 취약 분석 <span class="analysis-meta">과목별 오답 집중 단원 — 클릭 시 해당 교재 단원으로 이동</span></h4>
        ${sectionsHtml}
        <p class="analysis-advice">과락은 과목 단위 평가 — 각 과목의 최약 단원부터 재학습하면 과락 방어에 효과적입니다.</p>`;
}

/** 합격 갭 분석 카드 — 합격선까지 점수 갭 + 최우선 보강 과목 */
function _renderPassGapInsight() {
    const el = document.getElementById('analysis-pass-gap');
    if (!el) return;
    const subjects = (typeof DataLoader !== 'undefined' && DataLoader.registry)
        ? DataLoader.getSubjectList() : [];
    const rules = getExamRules();
    const gap = computePassGap({
        estimate: compositeEstimate(),
        simHistory: getSimHistory(),
        subjects,
        counts: getSubjCounts(),
        rules
    });
    if (!gap || (!gap.weakest && gap.gap === null)) {
        el.innerHTML = `<h4>🎓 합격 갭 분석</h4>
            <p class="analysis-empty">모의고사나 퀴즈를 풀면 합격선까지의 거리와 보강 우선순위를 진단합니다.</p>
            <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="startIntegratedMockExam"><i class="fa-solid fa-clock" aria-hidden="true"></i> 모의고사 시작</button>`;
        return;
    }
    // PS-04 — 합격 확률 추정: 과목 숙달(0.5)+모의고사 추세(0.3)+기억률(0.2) 로지스틱 혼합
    const masteryLevels = computeMasteryLevels(getAllStatementStats());
    const subjectMastery = {};
    Object.entries(masteryLevels).forEach(([k, m]) => { subjectMastery[k] = m.percent / 100; });
    const mockRates = getSimHistory().slice(-5).map(h => (h.rate || 0) / 100);
    const totalCardsEst = subjects.reduce((s, m) => s + displayCounts(m).cards, 0);
    const hasEstData = Object.keys(subjectMastery).length > 0 || mockRates.length > 0;
    const passEst = hasEstData ? estimatePassProb({
        subjectMastery,
        dueRatio: getDueCount() / Math.max(1, totalCardsEst),
        mockRates,
        cutoff: (rules.passAverage || 60) / 100
    }) : null;
    const probRowHtml = passEst
        ? `<div class="wc-row"><span>합격 확률 추정</span><strong>${Math.round(passEst.probability * 100)}%</strong></div>` : '';
    const needRowHtml = (passEst && passEst.weakest && passEst.needHours[passEst.weakest] > 0)
        ? `<div class="wc-subrow"><span>보강 필요 학습량</span><strong>${esc((subjects.find(s => s.key === passEst.weakest) || { name: passEst.weakest }).name)} ≈${passEst.needHours[passEst.weakest]}h</strong></div>` : '';

    const gapRowHtml = gap.gap !== null
        ? `<div class="wc-row"><span>합격선(평균 ${gap.passLine}점)까지</span><strong>${gap.gap === 0 ? '도달 ✅' : `+${gap.gap}점`}</strong></div>`
        : '';
    const weakRowHtml = gap.weakest
        ? `<div class="wc-row"><span>최우선 보강</span><strong class="gap-weakest">${esc(gap.weakest.name)} ${gap.weakest.rate}%</strong></div>`
        : '';
    const rankRowHtml = gap.ranking.length > 1
        ? `<div class="wc-row"><span>보강 순위</span><strong>${esc(gap.ranking.slice(1, 4).map((s, i) => `${i + 2}위 ${s.name} ${s.rate}%`).join(' · '))}</strong></div>`
        : '';
    const weakBtnHtml = gap.weakest
        ? `<button class="btn btn-primary btn-sm analysis-card-btn" data-click="startSubjectQuiz" data-arg="${esc(gap.weakest.key)}"><i class="fa-solid fa-play" aria-hidden="true"></i> ${esc(gap.weakest.name)} 퀴즈</button>`
        : '';
    // SC-14 합격 갭→목표 상향 권고 — 진단 갭을 계획 파라미터 조정 동선으로 연결
    let goalAdviceHtml = '';
    if (gap.gap !== null && gap.gap > 0) {
        const planSubjects = (subjects && subjects.length) ? subjects
            : Object.keys(window.STUDY_DATA || {}).map(k => ({
                key: k, stats: { cards: (((window.STUDY_DATA || {})[k] || {}).cards || []).length }
            }));
        const totalCards2 = planSubjects.reduce((s, m) => s + displayCounts(m).cards, 0);
        const plan = totalCards2 > 0 ? computeStudyPlan(Math.max(0, totalCards2 - state.memorizedCards.size)) : null;
        const goals = getStudyGoals();
        const advice = (plan && plan.tier !== 'done' && plan.perStudyDay > goals.dailyCards)
            ? `예상 점수가 합격선에 미달합니다. 계획 속도를 따라잡으려면 일일 카드 목표를 ${goals.dailyCards}→${plan.perStudyDay}장으로 올리는 것을 권장합니다.`
            : '예상 점수가 합격선에 미달합니다. 일일 목표 또는 주간 학습 일수를 올려 커버 속도를 높이는 것을 권장합니다.';
        goalAdviceHtml = `<p class="analysis-advice">${esc(advice)}</p>
            <button class="btn btn-secondary btn-sm analysis-card-btn" data-click="openGoalSettings"><i class="fa-solid fa-gear" aria-hidden="true"></i> 목표 상향</button>`;
    }
    el.innerHTML = `<h4>🎓 합격 갭 분석</h4>
        ${probRowHtml}${needRowHtml}${gapRowHtml}${weakRowHtml}${rankRowHtml}
        ${gap.weakest ? `<p class="analysis-advice">${esc(gap.weakest.reason)} — 이 과목이 점수 상승 여력이 가장 큽니다.</p>` : ''}
        ${weakBtnHtml}${goalAdviceHtml}`;
}

/**
 * 오늘 복습 대상(FSRS due) 카드만 모아 전 과목 합산 플래시카드 세션을 시작합니다.
 * 대시보드 '오늘 복습' 카드의 '지금 복습' 버튼에서 호출.
 */
export function startDueReview() {
    const n = getDueCount();
    if (n === 0) {
        showToast('오늘 복습할 카드가 없습니다.', 'info');
        return;
    }
    showGlobalLoading('복습 대상 카드를 불러오는 중입니다...');
    Promise.all(DataLoader.getSubjectList().map(s => DataLoader.loadSubject(s.key)))
        .catch(() => {})
        .finally(() => {
            hideGlobalLoading();
            state.flashcards.dueOnly = true;
            state.flashcards.currentIndex = 0;
            switchView('flashcard-view', { scrollTop: true });
            showToast(`오늘 복습 대상 ${n}장 — 간격 반복 세션을 시작합니다`, 'success');
        });
}

/**
 * 시험일 기억률 미달 카드만 모아 최종 인출 세션을 시작합니다 (D-19).
 * 대시보드 '오늘 할 일' 큐의 '인출 세션' 버튼에서 호출 — 기억률 낮은 순 출제.
 * 상한 초과 시 과목별 출제 비중 층화로 절단한다 (D-23).
 */
export function startExamRiskReview() {
    const risk = selectExamRiskSession(
        getExamRiskCards(getDDay()), EXAM_R_SESSION_CAP,
        examWeightBySubject((DataLoader.registry && DataLoader.registry.exams) || [])
    );
    if (!risk.length) {
        showToast('시험 전 추가 인출이 필요한 카드가 없습니다.', 'info');
        return;
    }
    showGlobalLoading('시험 전 인출 카드를 불러오는 중입니다...');
    Promise.all(DataLoader.getSubjectList().map(s => DataLoader.loadSubject(s.key)))
        .catch(() => {})
        .finally(() => {
            hideGlobalLoading();
            state.flashcards.onlyIds = risk.map(r => r.id);
            state.flashcards.currentIndex = 0;
            switchView('flashcard-view', { scrollTop: true });
            showToast(`시험 전 최종 인출 ${risk.length}장 — 기억률 낮은 순으로 출제합니다`, 'success');
        });
}

/**
 * 특정 과목의 카드 학습을 시작합니다.
 * @param {string} [subjId] 생략 시 활성 시험의 첫 과목
 */
export function startSubjectStudy(subjId) {
    if (!subjId) {
        const subs = DataLoader.getSubjectList();
        subjId = (subs[0] && subs[0].key) || '';
    }
    state.flashcards.subject = subjId;
    state.flashcards.currentIndex = 0;
    const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('fc-subject-select'));
    if (select) select.value = subjId;
    switchView('flashcard-view', { scrollTop: true });
}

/**
 * 특정 과목의 퀴즈 풀기를 시작합니다.
 * @param {string} subjId
 */
export function startSubjectQuiz(subjId) {
    if (!subjId) {
        const subs = DataLoader.getSubjectList();
        subjId = (subs[0] && subs[0].key) || '';
    }
    state.quiz.subject = subjId;
    const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('quiz-subject-select'));
    if (select) select.value = subjId;
    switchView('quiz-view', { scrollTop: true });
    const startQuizBtn = /** @type {HTMLElement|null} */ (document.getElementById('start-quiz-btn'));
    if (startQuizBtn) startQuizBtn.click();
}

/**
 * 특정 과목의 교재 읽기를 시작합니다. (약점 → 교재 딥링크)
 * @param {string} subjId
 */
export function startSubjectReader(subjId) {
    const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('reader-subject-select'));
    if (select) select.value = subjId;
    switchView('textbook-reader-view', { scrollTop: true });
}

// SC-06 주간 리포트용 계획 준수 요약 — {weekActual, weekTarget, percent, statusLabel} | null
function _planAdherenceSummary(subjects) {
    let total = 0;
    (subjects || []).forEach(s => { total += displayCounts(s).cards; });
    const plan = computeStudyPlan(Math.max(0, total - state.memorizedCards.size));
    const adh = computePlanAdherence(plan);
    if (!adh || adh.status === 'done') return null;
    const statusLabel = { met: '달성', ontrack: '추적 중', behind: '부족' }[adh.status];
    return { weekActual: adh.weekActual, weekTarget: adh.weekTarget, percent: adh.percent, statusLabel };
}

/**
 * 주간 학습 리포트 공유 — 진단 요약을 평문으로 생성해
 * Web Share API(모바일) 또는 클립보드로보낸다. (data-click)
 */
export function exportAnalysisReport() {
    trackAction('analysis_report');
    const subjects = (typeof DataLoader !== 'undefined' && DataLoader.registry)
        ? DataLoader.getSubjectList() : [];
    const nameOf = (k) => { const s = subjects.find(x => x.key === k); return s ? s.name : k; };
    const dday = getDDay();
    const qc = (DataLoader._questionChapters) || { questions: {}, ranges: {}, cidSection: {}, chapterTitles: {} };
    const est = compositeEstimate();
    // 주간 배분 과목별 준수 (SC-11) — 배분이 없으면(시험일 미설정·완료) null
    const totalCards = subjects.reduce((s, m) => s + displayCounts(m).cards, 0);
    const weekPlan = computeStudyPlan(Math.max(0, totalCards - state.memorizedCards.size));
    const weekAlloc = weekPlan && weekPlan.tier !== 'done'
        ? computeSubjectAllocation(weekPlan, subjects, _allocInputs()) : null;
    const doneBySubj = weekAlloc ? sumRecentCardsBySubject(getStudyCalendar()) : {};
    const quizDoneBySubj = weekAlloc ? sumRecentQuizzesBySubject(getStudyCalendar()) : {};
    const planBySubject = weekAlloc
        ? weekAlloc.thisWeek.alloc
            .filter(a => a.remaining > 0 && a.cards > 0)
            .map(a => ({ name: a.name, done: doneBySubj[a.key] || 0, cards: a.cards, quizDone: quizDoneBySubj[a.key] || 0, quizzes: a.quizzes || 0 }))
        : null;
    const growth = computeWeeklyGrowth(getStudyCalendar());
    const gapForReport = computePassGap({
        estimate: est, simHistory: getSimHistory(), subjects,
        counts: getSubjCounts(), rules: getExamRules()
    });
    const text = buildWeeklyReportText({
        appName: getExamAppName(),
        plan: _planAdherenceSummary(subjects),
        planBySubject,
        growth,
        estimate: est,
        gap: gapForReport,
        weakChapters: computeSubjectWeakChapters({
            quizResults: state.quizResults, weakCards: state.weakCards,
            statementStats: getAllStatementStats(),
            questionChapters: qc.questions, chapterRanges: qc.ranges,
            chapterTitles: qc.chapterTitles, cidSection: qc.cidSection,
            resolveQuiz: resolveWrongQuiz, subjectName: nameOf, chaptersPerSubject: 1,
            ..._ktInputs()
        }),
        pattern: computeStudyPattern(getStudyCalendar()),
        recEffect: evaluateRecommendationEffect(getSubjCounts(), nameOf),
        actual: getActualResult(),
        bias: computeCalibrationBias(getActualResult()),
        ddayLabel: dday === null ? null : (dday < 0 ? `D+${-dday}` : (dday === 0 ? 'D-Day' : `D-${dday}`))
    }) + (() => {
        // PS-09 — 주간 리포트: 계획 순응도 헤드라인 + 최다 오개념·취약 과목 제안
        const wr = weeklyReport({
            solvedWeek: growth.thisWeek.quizzes,
            planWeek: weekAlloc ? weekAlloc.thisWeek.alloc.reduce((s, a) => s + (a.quizzes || 0), 0) : 0,
            wrongWeek: Math.max(0, growth.thisWeek.quizzes - growth.thisWeek.correct),
            topCluster: (weakClusters()[0] || {}).label || null,
            weakestSubject: (gapForReport && gapForReport.weakest && gapForReport.weakest.name) || null
        });
        return `\n${wr.headline}\n💡 ${wr.suggestion}`;
    })();
    if (navigator.share) {
        navigator.share({ title: `${getExamAppName()} 주간 학습 리포트`, text })
            .then(() => {})
            .catch(() => {});
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('주간 리포트를 클립보드에 복사했습니다.', 'success'))
            .catch(() => showToast('리포트 복사에 실패했습니다.', 'error'));
        return;
    }
    showToast('이 환경에서는 리포트보내기를 지원하지 않습니다.', 'warning');
}
