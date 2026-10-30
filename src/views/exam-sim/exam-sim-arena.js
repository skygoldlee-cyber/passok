// views/exam-sim-arena.js - 실전 모의고사 아레나 (타이머·OMR·문항 렌더·채점) (E-03~06)
// @spec E-03,E-04,E-05,E-06,DR-06
//
// 시험 진행 중 기계 장치 — 절대 시각 타이머, OMR 시트, 문항 렌더,
// 응답 저장, 채점·제출. 세션 시작(시험 구성)은 exam-sim-session.js,
// 드래프트 저장소는 exam-sim-draft.js — arena → draft 단방향.

import { state, saveProgress } from '../../state.js';
import { esc, safeTextWithBreaks } from '../../sanitize.js';
import { checkShortAnswer } from '../trainer.js';
import { DataLoader } from '../../content/data-loader.js';
import { showToast, vibrate, HAPTIC } from '../../ui-utils.js';
import { fmtMMSS, OPTION_INDICATORS } from '../../utils.js';
import { TIMING } from '../../config/timing.js';
import { simState } from './exam-sim-state.js';
import { chapterForQuestion, renderSimResultBreakdown } from './exam-sim-review.js';
import { recordStatementJudgments } from '../../study/statement-tracker.js';
import { recordQuizJudgment } from '../../study/spaced-repetition.js';
import { examIdToSubjectId, getActiveRegistry } from '../../exam-context.js';
import { resetMainScroll } from '../navigation.js';
import { WEAK_SIM_PREFIX } from '../../study/weak-items.js';
import { saveSimDraft, clearSimDraft } from './exam-sim-draft.js';

/* =======================================================
    ⏱️ 시험 타이머 (백그라운드 탭 스로틀링 방지)
    * 단순 setInterval 초 차감 대신, 시작 시각의 절대 타임스탬프 차이(Date.now())
    * 기반으로 남은 시간을 계산하여, 백그라운드 탭 전환 시에도 실제 경과 시간이
    * 정확히 반영되도록 합니다. (뽀모도로 타이머와 동일한 방식)
    ======================================================= */
export function startSimTimer() {
    if (simState.timerInterval) clearInterval(simState.timerInterval);
    // 현재 남은 시간을 기준으로 종료 시각을 고정
    simState.endTime = Date.now() + (simState.timeLeft * 1000);
    simState.timerInterval = setInterval(tickSimTimer, TIMING.EXAM_TIMER_TICK_MS); // 500ms 간격 갱신
    tickSimTimer();
}

function tickSimTimer() {
    // 절대 시각 기반 남은 시간 계산 (백그라운드 스로틀링 극복 핵심)
    const remaining = Math.max(0, Math.round(((simState.endTime || 0) - Date.now()) / 1000));
    simState.timeLeft = remaining;

    if (simState.timeLeft <= 0) {
        clearInterval(simState.timerInterval);
        const timeEl = document.getElementById('sim-time-left');
        if (timeEl) timeEl.textContent = '00:00';
        showToast("제한 시간이 만료되었습니다. 답안지가 자동 제출됩니다.", "warning", 4000);
        submitExam();
        return;
    }

    const timeEl = document.getElementById('sim-time-left');
    if (timeEl) timeEl.textContent = fmtMMSS(simState.timeLeft);

    // 임박 단계 시각화 — 잔여 10분 이하 경고(주황), 5분 이하 위험(빨강+펄스)
    const timerBox = timeEl ? timeEl.closest('.sim-timer') : null;
    if (timerBox) {
        timerBox.classList.toggle('sim-time-warning', remaining <= 600 && remaining > 300);
        timerBox.classList.toggle('sim-time-danger', remaining <= 300);
    }

    // 매 5초마다 타이머 임시 저장
    if (simState.timeLeft % 5 === 0) {
        saveSimDraft();
    }
}

export function renderOMRSheet() {
    const omrGrid = document.getElementById('omr-grid');
    if (!omrGrid) return;
    omrGrid.innerHTML = '';

    const total = simState.data.questions.length;
    const totalEl = document.getElementById('omr-total-count');
    if (totalEl) totalEl.textContent = String(total);

    for (let i = 0; i < total; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'omr-bubble';
        bubble.id = `omr-b-${i}`;
        bubble.textContent = String(i + 1);
        bubble.setAttribute('role', 'button');
        bubble.setAttribute('tabindex', '0');
        bubble.setAttribute('aria-label', `문제 ${i + 1}번으로 이동`);
        bubble.addEventListener('click', () => {
            jumpToSimQuestion(i);
        });
        bubble.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                jumpToSimQuestion(i);
            }
        });
        omrGrid.appendChild(bubble);
    }
    updateOMRProgress();
}

function updateOMRProgress() {
    let solvedCount = 0;
    const total = simState.data.questions.length;

    for (let i = 0; i < total; i++) {
        const qId = simState.data.questions[i].id;
        const bubble = document.getElementById(`omr-b-${i}`);

        if (bubble) {
            // 풀었는지 여부 확인
            if (simState.userAnswers[qId] && String(simState.userAnswers[qId]).trim() !== '') {
                bubble.classList.add('solved');
                solvedCount++;
            } else {
                bubble.classList.remove('solved');
            }

            // 현재 문제 활성화
            if (i === simState.currentIndex) {
                bubble.classList.add('active');
            } else {
                bubble.classList.remove('active');
            }
        }
    }

    const solvedEl = document.getElementById('omr-solved-count');
    if (solvedEl) solvedEl.textContent = String(solvedCount);
    // 미답 수 — OMR 접힘(모바일) 상태에서도 헤더에 항상 노출
    const unsolvedEl = document.getElementById('omr-unsolved-count');
    if (unsolvedEl) {
        unsolvedEl.textContent = String(total - solvedCount);
        unsolvedEl.classList.toggle('omr-unsolved-warn', total - solvedCount > 0);
    }
}

export function jumpToSimQuestion(index) {
    simState.currentIndex = index;
    renderSimQuestion();
}

export function renderSimQuestion() {
    resetMainScroll(); // 문항 이동 — 이전 문항을 읽으며 스크롤한 위치가 잔류하면 신규 문항 상단이 잘림
    const q = simState.data.questions[simState.currentIndex];
    if (!q) return;

    // 문제 정보 주입
    const qNumEl = document.getElementById('sim-q-num');
    if (qNumEl) qNumEl.textContent = `Q ${simState.currentIndex + 1} / ${simState.data.questions.length}`;

    let typeName = '단답형';
    if (q.type === 'choice') typeName = '객관식 5지선다';
    else if (q.type === 'ox') typeName = '진위형 OX';
    else if (q.type === 'combo') typeName = 'ㄱㄴㄷ 조합형';
    const qTypeEl = document.getElementById('sim-q-type');
    if (qTypeEl) qTypeEl.textContent = typeName;

    // 개행 문자를 BR 태그로 치환해 질문 가독성 보장
    const qTextEl = document.getElementById('sim-q-text');
    if (qTextEl) qTextEl.innerHTML = safeTextWithBreaks(q.question);

    // 옵션 컨테이너 채우기
    const container = document.getElementById('sim-options-container');
    if (!container) return;
    container.innerHTML = '';

    const savedAns = simState.userAnswers[q.id] || '';

    if (q.type === 'choice' || q.type === 'combo') {
        const optionIndicators = ['①', '②', '③', '④', '⑤'];
        q.options.forEach((optText, idx) => {
            const ind = optionIndicators[idx] || String(idx + 1);
            const isSelected = (savedAns === ind);

            const btn = document.createElement('div');
            btn.className = `sim-option-item ${isSelected ? 'active' : ''}`;
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('aria-label', `선택지 ${idx + 1}: ${optText}`);
            btn.innerHTML = `<span class="opt-num">${esc(ind)}</span> <span class="opt-text">${esc(optText)}</span>`;
            btn.addEventListener('click', () => {
                saveSimAnswer(q.id, ind);
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    saveSimAnswer(q.id, ind);
                }
            });
            container.appendChild(btn);
        });
    } else if (q.type === 'ox') {
        q.options.forEach(optVal => {
            const isSelected = (savedAns === optVal);
            const btn = document.createElement('div');
            btn.className = `sim-option-item ${isSelected ? 'active' : ''}`;
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('aria-label', `선택지 ${optVal}`);
            btn.innerHTML = `<span class="opt-num"><i class="fa-solid ${optVal === 'O' ? 'fa-circle' : 'fa-xmark'}"></i></span> <span class="opt-text">${esc(optVal)} 퀴즈</span>`;
            btn.addEventListener('click', () => {
                saveSimAnswer(q.id, optVal);
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    saveSimAnswer(q.id, optVal);
                }
            });
            container.appendChild(btn);
        });
    } else {
        // 단답형 빈칸 주관식
        const inputDiv = document.createElement('div');
        inputDiv.className = 'sim-input-wrapper';
        inputDiv.innerHTML = `
            <input type="text" id="sim-text-input" class="form-input" placeholder="정답을 입력하세요 (예: (A) 5, (B) 10)" value="${esc(savedAns)}" autocomplete="off">
        `;
        container.appendChild(inputDiv);

        const textInput = /** @type {HTMLInputElement|null} */ (document.getElementById('sim-text-input'));
        if (!textInput) return;
        textInput.focus();

        // 입력 변경 감지
        textInput.addEventListener('input', (e) => {
            saveSimAnswer(q.id, e.target instanceof HTMLInputElement ? e.target.value : '', false);
        });

        // 엔터키 누르면 다음 문제
        textInput.addEventListener('keypress', (ev) => {
            const e = /** @type {KeyboardEvent} */ (ev);
            if (e.key === 'Enter') {
                /** @type {HTMLElement} */ (document.getElementById('sim-next-btn'))?.click();
            }
        });
    }

    // 이전/다음 버튼 보이기 여부 및 제어
    const prevBtn = document.getElementById('sim-prev-btn');
    const nextBtn = document.getElementById('sim-next-btn');
    const submitBtn = document.getElementById('sim-submit-exam-btn');
    if (!prevBtn || !nextBtn || !submitBtn) return;

    if (simState.currentIndex === 0) {
        prevBtn.classList.add('is-hidden');
    } else {
        prevBtn.classList.remove('is-hidden');
    }

    if (simState.currentIndex === simState.data.questions.length - 1) {
        nextBtn.classList.add('is-hidden');
        submitBtn.classList.remove('is-hidden');
    } else {
        nextBtn.classList.remove('is-hidden');
        submitBtn.classList.add('is-hidden');
    }

    updateOMRProgress();
}

export function saveSimAnswer(qId, value, triggerRender = true) {
    // PS-08 — 선택지 변경 추적: 기존 응답과 다르면 '망설임' 신호로 기록
    const prev = simState.userAnswers[qId];
    if (prev !== undefined && prev !== value) {
        (simState.answerChanges ||= {})[qId] = true;
    }
    simState.userAnswers[qId] = value;
    if (triggerRender) {
        renderSimQuestion();
    } else {
        updateOMRProgress();
    }
    saveSimDraft();
}

/**
 * 시뮬 복수정답형 응답 → 진술별 판정 도출 (선택 선지의 members = "참으로 판정한 집합")
 * @returns {Array<{sid, judgedCorrect, text, truth, conceptId}>|null}
 */
function deriveComboJudgments(q, userAns) {
    if (!userAns || !Array.isArray(q.statements) || !Array.isArray(q.comboOptions)) return null;
    const idx = OPTION_INDICATORS.indexOf(userAns);
    const opt = idx >= 0 ? q.comboOptions[idx] : null;
    if (!opt) return null;
    const chosen = new Set(opt.members || []);
    return q.statements.map(s => ({
        sid: s.sid,
        judgedCorrect: chosen.has(s.id) === !!s.truth,
        text: s.text,
        truth: s.truth,
        conceptId: s.conceptId
    }));
}

/**
 * 문항의 교재 단원(챕터) 해석 — QUESTION_CHAPTERS(문항id→단원) 우선,
 * combo는 "출처: 과목N 문제은행 Qn"으로 원문항을 거슬러 매핑, 실패 시 citation L번호→라인 경계
 */
export function submitExam() {
    if (simState.timerInterval) clearInterval(simState.timerInterval);

    // 점수 채점 및 틀린 문항 수집
    let score = 0;
    const total = simState.data.questions.length;
    simState.wrongQuestions = [];

    // 과목별 정답 및 총 문제수 집계용 (레지스트리 기반 동적 초기화)
    /** @type {Object<string,{score:number,total:number}>} */
    const subjectScores = {};
    const subjects = (getActiveRegistry() || {}).subjects || [];
    subjects.forEach(sub => {
        subjectScores[sub.key] = { score: 0, total: 0 };
    });

    // 단원(챕터)별 집계용 — question_chapters.js 인덱스 (미로드 시 빈 객체)
    const qc = (DataLoader._questionChapters) || {
        questions: window.QUESTION_CHAPTERS || {},
        ranges: window.CHAPTER_RANGES || {}
    };
    /** @type {Object<string,Object<string,{score:number,total:number}>>} */
    const chapterStats = {};

    for (let i = 0; i < total; i++) {
        const q = simState.data.questions[i];
        const userAns = simState.userAnswers[q.id] || '';

        // 객관식/OX는 선택지 기호(①~⑤, O/X)를 직접 비교, 단답형만 텍스트 정규화 채점
        const isCorrect = (q.type === 'choice' || q.type === 'ox' || q.type === 'combo')
            ? (userAns === q.answer)
            : checkShortAnswer(userAns, q.answer);
        vibrate(isCorrect ? HAPTIC.correct : HAPTIC.wrong);

        // 복수정답형: 선택 선지의 members로 진술별 판정을 도출해 취약 추적·FSRS에 기록
        if (q.type === 'combo') {
            const perStatement = deriveComboJudgments(q, userAns);
            if (perStatement) recordStatementJudgments(perStatement);
        }
        // @spec D-22 — 문항 단위 BKT 시퀀스 로그 + PS-08 선택지 변경 신호
        recordQuizJudgment(q.id, isCorrect, { chg: (simState.answerChanges && simState.answerChanges[q.id]) ? 1 : 0 });

        if (isCorrect) {
            score++;
        } else {
            simState.wrongQuestions.push({
                ...q,
                userAnswer: userAns
            });

            // 틀린 문제는 복습용 오답 카드로 자동으로 등록! (중요 기능 요구사항 구현)
            const fakeCardId = `${WEAK_SIM_PREFIX}${q.id}`;
            state.weakCards.add(fakeCardId);
        }

        // 과목 판별 및 집계 (동적 변환 적용)
        let subj = q.subject;
        if (!subj) {
            const prefix = q.id.split('_')[0]; // 'subject1' 등
            subj = examIdToSubjectId(prefix);
        } else if (subj.startsWith('subject')) {
            subj = examIdToSubjectId(subj);
        }

        if (subj && subjectScores[subj]) {
            subjectScores[subj].total++;
            if (isCorrect) {
                subjectScores[subj].score++;
            }
            // 단원별 집계 — 교재 인용이 없는 문항은 '기타(참조자료)'로 묶음
            const chTitle = chapterForQuestion(q, subj, qc) || '기타 (법령·참조자료)';
            const cBucket = chapterStats[subj] || (chapterStats[subj] = {});
            const c = cBucket[chTitle] || (cBucket[chTitle] = { score: 0, total: 0 });
            c.total++;
            if (isCorrect) c.score++;
        }
    }

    saveProgress();
    clearSimDraft(); // 제출 시 임시 세션 제거

    // 과목별 정답률 계산
    const subjectRates = {};
    let hasSubjectData = false;
    Object.keys(subjectScores).forEach(subj => {
        if (subjectScores[subj].total > 0) {
            subjectRates[subj] = Math.round((subjectScores[subj].score / subjectScores[subj].total) * 100);
            hasSubjectData = true;
        } else {
            subjectRates[subj] = null;
        }
    });

    // 모의고사 결과 성적 이력 저장 및 성적 분석 연동
    if (typeof window !== 'undefined' && typeof window.saveExamResultToHistory === 'function') {
        window.saveExamResultToHistory(simState.data.id, score, total, hasSubjectData ? subjectRates : null);
    }

    // 결과 패널 렌더링 (exam-sim-review.js)
    renderSimResultBreakdown({ score, total, subjectScores, chapterStats, subjects });
}
