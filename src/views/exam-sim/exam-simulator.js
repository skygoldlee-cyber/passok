// views/exam-simulator.js - 실전 모의고사 시뮬레이터 파사드 (Exam Simulator)
// @spec E-01~07,DR-06
//
// 세션 수명주기(exam-sim-session) → 아레나 기계 장치(exam-sim-arena) →
// 드래프트 저장소(exam-sim-draft) 단방향으로 분해됐다. 이 파일은 전체
// 공개 핸들러를 재수출해 app.js·listeners-simulator·exam-sim-weak·DOM
// 테스트의 기존 import를 무파손 유지한다 (formula.js와 동일 패턴).
// 성적 이력 저장(saveExamResultToHistory)은 어느 하위 모듈에도 속하지
// 않아 이 파사드에 남긴다.
export { startWeakExam } from './exam-sim-weak.js';
export { simState } from './exam-sim-state.js';
export {
    startSimSession, startMockExamSim, startComboMockExam,
    startIntegratedMockExam, comboToSimQuestion, comboSubjOrder,
    resumeSimDraft, exitSimArena,
} from './exam-sim-session.js';
export {
    jumpToSimQuestion, renderSimQuestion, saveSimAnswer, submitExam,
} from './exam-sim-arena.js';
export { clearSimDraft, checkExamDraft } from './exam-sim-draft.js';

import { safeGetItem, safeSetItem } from '../../state.js';
import { todayKey } from '../../utils.js';
import { STORAGE_KEYS } from '../../storage-keys.js';

/**
 * 모의고사 결과를 성적 이력(sim_results_history)에 저장한다.
 * 차트(성적 추이/레이더/합격 진단)와 추천 엔진의 과락 감지가 이 데이터를 소비한다.
 * 최근 50건만 유지한다.
 */
export function saveExamResultToHistory(examId, score, total, subjectRates) {
    let history = [];
    try {
        const parsed = JSON.parse(safeGetItem(STORAGE_KEYS.SIM_RESULTS_HISTORY) || '[]');
        if (Array.isArray(parsed)) history = parsed;
    } catch (e) { history = []; }
    history.push({
        date: todayKey(),
        examId: examId,
        rate: Math.round((score / total) * 100),
        subjectRates: subjectRates || null
    });
    if (history.length > 50) history = history.slice(-50);
    safeSetItem(STORAGE_KEYS.SIM_RESULTS_HISTORY, JSON.stringify(history));
}
