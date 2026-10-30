// src/study-tracker.js — 학습 캘린더/목표 추적 헬퍼 (re-export 배럴)
// @spec SC-03,SC-05,SC-06,SC-07,SC-08,SC-09,SC-15,D-17,D-23,Q-12
// 학습 활동을 날짜별로 기록하고, 목표 달성률을 계산합니다.
//
// 모듈 분리 (호출부는 이 파일 경로 그대로 사용 — quiz.js/quiz-wrong-cause.js와
// 동일 배럴 패턴):
//   study-tracker-activity.js   — 📅 캘린더 기록 + 🎯 일일/주간 목표
//   study-tracker-plan.js       — 🗓️ 시험일·D-day·역산 학습 계획 (← activity)
//   study-tracker-adherence.js  — 📈 계획 준수율·마일스톤 (← activity·plan)
//   study-tracker-alloc.js      — 📚 과목별 가중 배분 (독립 — 순수 함수)
export {
    getTodayStr, getStudyCalendar, recordStudyActivity, getMonthlyStudyDays,
    getStudyGoals, setStudyGoals, getTodayGoalProgress, getWeeklyGoalProgress,
} from './study-tracker-activity.js';
export {
    getExamDate, setExamDate, getDDay, getTextbookReadProgress,
    getExamLeadStatus, getExamPlanStatus, tierStudyHint,
    getRemainingStudyDays, computeStudyPlan,
} from './study-tracker-plan.js';
export {
    sumRecentCards, sumRecentCardsBySubject, sumRecentQuizzesBySubject,
    computePlanAdherence, evalStudyMilestones, checkStudyMilestones,
} from './study-tracker-adherence.js';
export {
    MIN_ALLOC_SAMPLE, MAX_WEAK_WEIGHT, MAX_DIAG_BOOST,
    examWeightBySubject, apportionByWeight, selectExamRiskSession,
    computeSubjectAllocInputs, recentQuizBySubject, computeSubjectAllocation,
} from './study-tracker-alloc.js';
