// views/exam-sim-session.js - 실전 모의고사 세션 수명주기 (시험 구성·시작·복구·종료) (E-01·02·05·07)
// @spec E-01,E-02,E-05,E-07
//
// 세션 경계 로직 — 시험 데이터 구성(과목별/ㄱㄴㄷ/통합 모의고사), 세션 시작
// (startSimSession), 드래프트 복구(resumeSimDraft), 아레나 나가기(exitSimArena).
// 아레나 기계 장치(타이머·OMR·렌더)는 exam-sim-arena.js, 드래프트 저장소는
// exam-sim-draft.js — session → arena → draft 단방향.

import { state, safeGetItem } from '../state.js';
import { DataLoader } from '../data-loader.js';
import { getActiveRegistry } from '../exam-context.js';
import { showGlobalLoading, hideGlobalLoading, showToast } from '../ui-utils.js';
import { shuffle, OPTION_INDICATORS } from '../utils.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { TIMING } from '../config/timing.js';
import { simState } from './exam-sim-state.js';
import { proFeatureNotice } from '../pro-upgrade.js';
import { resetMainScroll } from './navigation.js';
import { startSimTimer, renderOMRSheet, renderSimQuestion } from './exam-sim-arena.js';
import { checkExamDraft } from './exam-sim-draft.js';

export function startSimSession(examData) {
    // 시뮬레이터 상태 초기화
    simState.examId = examData.id || 'dynamic';
    simState.data = examData;
    simState.currentIndex = 0;
    simState.userAnswers = {};
    simState.answerChanges = {}; // PS-08 — 세션 시작 시 변경 추적 리셋
    // 문항당 1분 기산, 실전 형식(통합 모의고사)은 명시된 제한시간 우선 (실제 시험: 100문/120분)
    simState.timeLeft = examData.timeLimitSec || examData.questions.length * TIMING.EXAM_TIME_PER_QUESTION_SEC;
    simState.wrongQuestions = [];

    // UI 전환
    const examListPanel = document.getElementById('exam-list-panel');
    const simResultPanel = document.getElementById('sim-result-panel');
    const simReviewPanel = document.getElementById('sim-review-panel');
    const simArenaPanel = document.getElementById('sim-arena-panel');
    if (examListPanel) examListPanel.classList.add('is-hidden');
    if (simResultPanel) simResultPanel.classList.add('is-hidden');
    if (simReviewPanel) simReviewPanel.classList.add('is-hidden');
    if (simArenaPanel) simArenaPanel.classList.remove('is-hidden');
    resetMainScroll();

    // 타이머 및 OMR 렌더링
    const simExamTitle = document.getElementById('sim-exam-title');
    if (simExamTitle) simExamTitle.textContent = examData.title;
    renderOMRSheet();
    renderSimQuestion();

    // 기존 타이머 중지 후 신규 시작
    startSimTimer();
}

/**
 * 과목별 실전 모의고사 시작 — data-arg 'examKey' 또는 'examKey:count' (count = 출제 수, 생략 시 전체)
 * 부분 출제 시 문항을 무작위 추출하고 제한시간도 문항 수 비례로 축소
 */
export function startMockExamSim(arg) {
    const [examId, countStr] = String(arg).split(':');
    const want = countStr ? parseInt(countStr, 10) : NaN;
    proFeatureNotice('mock_exam', '실전 모의고사');
    showGlobalLoading('모의고사 데이터를 불러오는 중입니다...');
    DataLoader.loadExam(examId).then((examData) => {
        hideGlobalLoading();
        const total = examData.questions.length;
        if (!isNaN(want) && want > 0 && want < total) {
            examData = {
                ...examData,
                questions: shuffle(examData.questions).slice(0, want),
                timeLimitSec: examData.timeLimitSec ? Math.round(examData.timeLimitSec * want / total) : undefined
            };
        }
        startSimSession(examData);
    }).catch(err => {
        hideGlobalLoading();
        console.error(err);
        showToast("모의고사 데이터를 로드하지 못했습니다.", "error");
    });
}

/* =======================================================
   ㄱㄴㄷ 복수정답형 모의고사 — combo 드릴 번들을 시뮬레이터 형식으로 변환
   ======================================================= */

/**
 * combo 문항 → 시뮬레이터 문항 평탄화
 * (citation·진술 목록을 question 본문에 편입해 아레나·리뷰 양쪽에서 표시,
 *  options.members를 문자열 배열로, 정답을 지시자 기호로 변환)
 */
export function comboToSimQuestion(q, subjKey) {
    const stmtLines = (q.statements || []).map(s => `${s.id}. ${s.text}`);
    const ansIdx = (q.options || []).findIndex(o => o.id === q.answer);
    return {
        ...q,
        subject: subjKey,
        type: 'combo',
        question: [q.citation, q.stem, stmtLines.join('\n')].filter(Boolean).join('\n\n'),
        comboOptions: q.options || [], // 원본 members 구조 보존 — 채점 시 진술 판정 도출·리뷰 정오표용
        options: (q.options || []).map(o => (o.members || []).join(', ')),
        answer: OPTION_INDICATORS[ansIdx] || q.answer,
        explanation: q.explain || ''
    };
}

// 복수정답형 번들 과목 번호 조회 (combo 오답 복습 시 과목 번들 로드용) — registry.subjects의 order 기반
export function comboSubjOrder(subjKey) {
    const subjects = (getActiveRegistry() || {}).subjects || [];
    const s = subjects.find(x => x.key === subjKey);
    return s ? s.order : null;
}

/**
 * 과목별 복수정답형 모의고사 시작 — data/drills/combo_subjectN.js 로드
 * @param {string} arg 'N' 또는 'N:count' (count = 출제 수, 생략 시 전체)
 */
export function startComboMockExam(arg) {
    const [numStr, countStr] = String(arg).split(':');
    const num = parseInt(numStr, 10);
    const orders = DataLoader.getSubjectOrders();
    if (isNaN(num) || !orders.includes(num)) return;
    const want = countStr ? parseInt(countStr, 10) : NaN;
    proFeatureNotice('combo_mock', 'ㄱㄴㄷ 조합 모의고사');
    showGlobalLoading('ㄱㄴㄷ 조합 모의고사 데이터를 불러오는 중입니다...');
    DataLoader.loadComboDrills(num).then(questions => {
        hideGlobalLoading();
        const subjects = (getActiveRegistry() || {}).subjects || [];
        const subjMeta = subjects.find(s => s.order === num);
        const subjKey = subjMeta ? subjMeta.key : `subject${num}`;
        const subjName = subjMeta ? (subjMeta.shortName || subjMeta.name) : `${num}과목`;
        const picked = (!isNaN(want) && want > 0 && want < questions.length)
            ? shuffle(questions).slice(0, want)
            : questions;
        const simQuestions = picked.map(q => comboToSimQuestion(q, subjKey));
        if (simQuestions.length === 0) {
            showToast('이 과목의 ㄱㄴㄷ 조합 문항이 없습니다.', 'warning');
            return;
        }
        startSimSession({
            id: `combo_subject${num}`,
            title: `${subjName} ㄱㄴㄷ 조합 모의고사 (${simQuestions.length}제)`,
            questions: simQuestions
        });
    }).catch(err => {
        hideGlobalLoading();
        console.error(err);
        showToast('ㄱㄴㄷ 조합 데이터를 불러오지 못했습니다.', 'error');
    });
}

export function startIntegratedMockExam() {
    proFeatureNotice('mock_exam', '실전 모의고사');
    // 복수정답형 혼합 옵션 체크 시 combo 번들도 함께 로드
    const mixChk = /** @type {HTMLInputElement|null} */ (document.getElementById('integrated-mix-combo'));
    const mixCombo = !!(mixChk && mixChk.checked);
    showGlobalLoading('통합 모의고사 데이터를 불러오는 중입니다...');
    const loaderPromises = (DataLoader.registry?.exams || []).map(e => DataLoader.loadExam(e.key));
    if (mixCombo) DataLoader.getSubjectOrders().forEach(n => loaderPromises.push(DataLoader.loadComboDrills(n)));
    Promise.all(loaderPromises).then(() => {
        hideGlobalLoading();
        _startIntegratedMockExamImpl(mixCombo);
    }).catch(err => {
        hideGlobalLoading();
        console.error(err);
        showToast("모의고사 데이터를 로드하지 못했습니다.", "error");
    });
}

function _startIntegratedMockExamImpl(mixCombo = false) {
    // 과목별 문제들 동적 수집 (registry 기반 — 과목 키별 자동 분류)
    const registry = getActiveRegistry();
    const integratedConfig = registry && registry.integratedExam ? registry.integratedExam.questionsPerSubject : null;
    const subjects = registry && registry.subjects ? registry.subjects : [];

    // 과목별 문제 버킷 (동적 생성)
    const subjectQuestions = {};
    const subjectCounts = {};
    for (const subj of subjects) {
        subjectQuestions[subj.key] = [];
        subjectCounts[subj.key] = integratedConfig ? (integratedConfig[subj.key] || 0) : 0;
    }

    const EXAM_DATA = (typeof window !== 'undefined' && window.EXAM_DATA) ? window.EXAM_DATA : {};

    // registry.exams에서 examId → subject 매핑 구축
    const examToSubject = {};
    if (registry && registry.exams) {
        for (const exam of registry.exams) {
            examToSubject[exam.key] = exam.subject;
        }
    }

    Object.keys(EXAM_DATA).forEach(examId => {
        const questions = EXAM_DATA[examId].questions || [];
        // registry 매핑 우선, 없으면 접두사 폴백 (subject1 → law 등)
        let subjKey = examToSubject[examId];
        if (!subjKey) {
            // 폴백: examId 접두사 → registry.subjects 순서 기반 매칭
            const prefixMatch = examId.match(/^(subject\d+)/);
            if (prefixMatch) {
                const idx = parseInt(prefixMatch[1].replace('subject', '')) - 1;
                if (subjects[idx]) subjKey = subjects[idx].key;
            }
        }
        if (subjKey && subjectQuestions[subjKey]) {
            subjectQuestions[subjKey].push(...questions);
        }
    });

    // 모든 과목에 문제가 있는지 확인
    const missingSubjects = subjects.filter(s => subjectQuestions[s.key].length === 0);
    if (missingSubjects.length > 0) {
        showToast("모의고사 데이터가 불완전합니다. 모든 과목의 모의고사가 정상 로드되었는지 확인하세요.", "error");
        return;
    }

    // 과목별 무작위 선택 함수
    const getRandomSample = (arr, count, subjectId) => {
        const shuffled = shuffle(arr);
        return shuffled.slice(0, count).map(q => ({
            ...q,
            subject: subjectId // 과목 정보 태깅
        }));
    };

    // 복수정답형 혼합: 과목별 배정의 약 20%를 combo 문항으로 교체 (선지 다양화, 실전 패턴 훈련)
    const comboPoolBySubject = {};
    if (mixCombo) {
        subjects.forEach((subj, idx) => {
            const bundle = (typeof window !== 'undefined') ? window[`COMBO_DRILLS_subject${idx + 1}`] : null;
            if (Array.isArray(bundle)) comboPoolBySubject[subj.key] = bundle;
        });
    }

    // 과목별 샘플링 (registry에서 동적 조회)
    const selectedBySubject = {};
    for (const subj of subjects) {
        const count = subjectCounts[subj.key];
        if (count > 0) {
            const pool = comboPoolBySubject[subj.key] || [];
            const comboCount = Math.min(Math.round(count * 0.2), pool.length);
            const picked = getRandomSample(subjectQuestions[subj.key], count - comboCount, subj.key);
            if (comboCount > 0) {
                shuffle(pool).slice(0, comboCount).forEach(q =>
                    picked.push(comboToSimQuestion(q, subj.key)));
            }
            selectedBySubject[subj.key] = shuffle(picked);
        }
    }
    const allSelected = subjects.flatMap(s => selectedBySubject[s.key] || []);

    // 문항 결합
    const combinedQuestions = allSelected;

    // 문항 번호를 1부터 순차적으로 재지정
    combinedQuestions.forEach((q, index) => {
        q.num = index + 1;
        q.id = `integrated_q${index + 1}`;
    });

    const totalQuestions = combinedQuestions.length;
    const subjectCount = subjects.length;
    const integratedExam = {
        id: 'integrated',
        title: subjects.length > 0
            ? `1~${subjectCount}과목 통합 실전 모의고사 (${totalQuestions}제)`
            : `통합 실전 모의고사 (${totalQuestions}제)`,
        questions: combinedQuestions,
        // 실제 시험 시간: manifest integratedExam.examTimeMin (100문/120분)
        timeLimitSec: ((registry && registry.integratedExam && registry.integratedExam.examTimeMin) || 120) * 60
    };

    // UI 전환
    state.currentView = 'exam-view';
    const dashboardView = document.getElementById('dashboard-view');
    const reviewView = document.getElementById('review-view');
    const examView = document.getElementById('exam-view');
    if (dashboardView) dashboardView.classList.remove('active');
    if (reviewView) reviewView.classList.remove('active');
    if (examView) examView.classList.add('active');

    // OMR Sheet, Timer 활성화
    startSimSession(integratedExam);
}

export function resumeSimDraft() {
    const saved = safeGetItem(STORAGE_KEYS.SIM_DRAFT_SESSION);
    if (!saved) return;

    try {
        const draft = JSON.parse(saved);

        simState.examId = draft.examId;
        simState.data = {
            id: draft.examId,
            title: draft.examTitle,
            questions: draft.questions
        };
        simState.currentIndex = draft.currentIndex;
        simState.userAnswers = draft.userAnswers;
        simState.timeLeft = draft.timeLeft;
        simState.wrongQuestions = [];

        const _examListPanel = document.getElementById('exam-list-panel');
        const _simResultPanel = document.getElementById('sim-result-panel');
        const _simReviewPanel = document.getElementById('sim-review-panel');
        const _simArenaPanel = document.getElementById('sim-arena-panel');
        if (_examListPanel) _examListPanel.classList.add('is-hidden');
        if (_simResultPanel) _simResultPanel.classList.add('is-hidden');
        if (_simReviewPanel) _simReviewPanel.classList.add('is-hidden');
        if (_simArenaPanel) _simArenaPanel.classList.remove('is-hidden');
        resetMainScroll();

        const _simExamTitle = document.getElementById('sim-exam-title');
        if (_simExamTitle) _simExamTitle.textContent = draft.examTitle;
        renderOMRSheet();
        renderSimQuestion();

        startSimTimer();

        // 메인 뷰 전환 강제 처리
        state.currentView = 'exam-view';
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(nav => {
            if (nav.getAttribute('data-target') === 'exam-view') {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });
        const sections = document.querySelectorAll('.view-section');
        sections.forEach(sec => {
            if (sec.id === 'exam-view') {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        const banner = document.getElementById('draft-resume-banner');
        if (banner) banner.classList.add('is-hidden');

    } catch(e) {
        console.error("Failed to resume draft: ", e);
        showToast("저장된 모의고사 세션을 불러오지 못했습니다.", "error");
    }
}

export function exitSimArena() {
    if (simState.timerInterval) clearInterval(simState.timerInterval);

    // UI 전환
    const _arena = document.getElementById('sim-arena-panel');
    const _result = document.getElementById('sim-result-panel');
    const _review = document.getElementById('sim-review-panel');
    const _list = document.getElementById('exam-list-panel');
    if (_arena) _arena.classList.add('is-hidden');
    if (_result) _result.classList.add('is-hidden');
    if (_review) _review.classList.add('is-hidden');
    if (_list) _list.classList.remove('is-hidden');
    resetMainScroll();

    // 대시보드 갱신하여 배너 확인
    checkExamDraft();
}
