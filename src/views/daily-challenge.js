// src/views/daily-challenge.js - 일일 5분 데일리 챌린지 & Streak 로직 (quiz.js에서 분리)
// @spec D-07,Q-06,SC-04
import { state, saveProgress, safeGetItem, safeSetItem } from '../state.js';
import { safeTextWithBreaks, esc } from '../sanitize.js';
import { DataLoader } from '../content/data-loader.js';
import { checkShortAnswer } from './trainer.js';
import { shuffle, todayKey } from '../utils.js';
import { showToast, showConfirm, markChoiceButtons, showAnswerFeedback } from '../ui-utils.js';
import { STORAGE_KEYS, dailyCompletedKey } from '../storage-keys.js';
import { reportEvent } from '../telemetry/usage-telemetry.js';
import { getWeeklyGoalProgress } from '../study/study-tracker.js';
import { hasFeature } from '../exam-context.js';

/* =======================================================
   🧩 일일 5분 데일리 챌린지 (Daily 5-Min Challenge) & Streak
   ======================================================= */
/** @type {{currentIndex: number, correctCount: number, questions: Array<Record<string,any>>}} */
const dailyState = {
    currentIndex: 0,
    correctCount: 0,
    questions: []
};

// 스트릭 복구권 (SC-04) — STREAK_FREEZE_EARN_EVERY일 연속 학습마다 1장 획득,
// 어제 하루만 결손이면 자동 소비해 스트릭을 유지한다. 보유 상한은 한 번에 MAX장.
const STREAK_FREEZE_MAX = 2;
const STREAK_FREEZE_EARN_EVERY = 7;

function _getFreezeCount() {
    return parseInt(safeGetItem(STORAGE_KEYS.STREAK_FREEZES) || '0') || 0;
}

/**
 * 연속 학습일 Streak 정보 및 데일리 챌린지 미션 상태 UI 업데이트
 */
export function updateStreakAndDailyUI() {
    const streakDaysEl = document.getElementById('streak-days');
    const challengeStatusEl = document.getElementById('daily-challenge-status');
    const startBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('start-daily-btn'));

    if (!streakDaysEl) return;

    let streak = parseInt(safeGetItem(STORAGE_KEYS.STUDY_STREAK) || '0') || 0;
    const lastDate = safeGetItem(STORAGE_KEYS.STUDY_STREAK_LAST_DATE);
    const todayStr = todayKey();

    if (lastDate) {
        const last = new Date(lastDate);
        const today = new Date(todayStr);
        const diffTime = Math.abs(today.getTime() - last.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 2 && _getFreezeCount() > 0) {
            // 어제 하루만 결손 — 복구권 자동 소비. lastDate를 어제로 보정해
            // 재진입 시 중복 소비를 막고 오늘 학습이 스트릭을 잇게 한다.
            const freezes = _getFreezeCount() - 1;
            safeSetItem(STORAGE_KEYS.STREAK_FREEZES, freezes);
            const yesterday = todayKey(new Date(Date.now() - 86400000));
            safeSetItem(STORAGE_KEYS.STUDY_STREAK_LAST_DATE, yesterday);
            showToast(`스트릭 복구권을 사용해 연속 학습을 지켰습니다 (잔여 ${freezes}장)`, 'info', 4000);
        } else if (diffDays > 1) {
            streak = 0;
            safeSetItem(STORAGE_KEYS.STUDY_STREAK, 0);
        }
    } else {
        streak = 0;
    }

    streakDaysEl.textContent = String(streak);

    // 복구권 보유 수 + 이번 주 학습일 칩 (SC-04 / SC-01 확장)
    const freezeEl = document.getElementById('streak-freezes');
    if (freezeEl) {
        const freezes = _getFreezeCount();
        freezeEl.textContent = freezes > 0 ? `복구권 ${freezes}` : '';
        freezeEl.classList.toggle('is-hidden', freezes <= 0);
        freezeEl.title = `스트릭 복구권 ${freezes}장 — 어제 학습을 놓치면 자동으로 스트릭을 지켜줍니다 (7일 연속마다 1장, 최대 ${STREAK_FREEZE_MAX}장)`;
    }
    const weeklyEl = document.getElementById('weekly-goal-chip');
    if (weeklyEl) {
        const w = getWeeklyGoalProgress();
        weeklyEl.textContent = `이번 주 ${w.studyDays}/${w.goalDays}일`;
        weeklyEl.classList.toggle('weekly-goal-done', w.percent >= 100);
    }

    const todayCompleted = safeGetItem(dailyCompletedKey(todayStr));
    if (todayCompleted) {
        if (challengeStatusEl) {
            challengeStatusEl.textContent = '오늘 미션 완료';
            challengeStatusEl.classList.add('daily-status-done');
            challengeStatusEl.classList.remove('daily-status-muted');
        }
        if (startBtn) {
            startBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> 오늘 완료됨';
            startBtn.disabled = true;
        }
    } else {
        if (challengeStatusEl) {
            challengeStatusEl.textContent = '오늘 미션 미완료';
            challengeStatusEl.classList.add('daily-status-muted');
            challengeStatusEl.classList.remove('daily-status-done');
        }
        if (startBtn) {
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i> 챌린지 시작';
            startBtn.disabled = false;
        }
    }
}

/**
 * 데일리 챌린지 시작
 */
export function startDailyChallenge() {
    const todayStr = todayKey();
    const todayCompleted = safeGetItem(dailyCompletedKey(todayStr));
    if (todayCompleted) {
        showToast('오늘의 데일리 챌린지를 이미 달성하셨습니다! 내일 다시 도전해 주세요.', 'info');
        return;
    }

    const loaderPromises = DataLoader.getSubjectList().map(s => DataLoader.loadSubject(s.key));
    // 지식DB 분류 문항용 데이터셋도 함께 로드 (스키마 미선언 시험은 무시)
    if (hasFeature('dictionary')) {
        loaderPromises.push(DataLoader.loadDictionary().catch(() => []));
    }
    Promise.all(loaderPromises).then(() => {
        _startDailyChallengeImpl();
    }).catch(err => {
        console.error(err);
        showToast("챌린지 데이터를 로드하지 못했습니다.", "error");
    });
}

function _startDailyChallengeImpl() {
    const qPack = [];

    // 1. 플래시카드 복습 3개
    let allCards = [];
    if (window.STUDY_DATA) {
        Object.keys(window.STUDY_DATA).forEach(subjId => {
            allCards = allCards.concat((window.STUDY_DATA || {})[subjId].cards.map(c => ({...c, subject: subjId})));
        });
    }
    const selectedCards = shuffle(allCards).slice(0, 3);
    selectedCards.forEach(c => {
        qPack.push({
            type: 'card',
            cardObj: c,
            question: `다음 개념의 정답을 아십니까?\n\n[설명]\n${c.definition}`,
            correct: c.term
        });
    });

    // 2. 퀴즈 풀이 3개
    let allQuizzes = [];
    if (window.STUDY_DATA) {
        Object.keys(window.STUDY_DATA).forEach(subjId => {
            allQuizzes = allQuizzes.concat((window.STUDY_DATA || {})[subjId].quizzes.map(q => ({...q, subject: subjId})));
        });
    }
    const selectedQuizzes = shuffle(allQuizzes).slice(0, 3);
    selectedQuizzes.forEach(q => {
        qPack.push({
            type: q.type === 'choice' ? 'choice' : 'short',
            question: `[기출 퀴즈] ${q.question}`,
            correct: q.answer,
            options: q.options || null,
            explanation: `과목: ${q.subject}`
        });
    });

    // 3. 농도 계산 문제 1개 — calcPractice 기능 시험만 (도메인 시나리오 문구)
    if (hasFeature('calcPractice')) {
        const w = [100, 200, 300][Math.floor(Math.random() * 3)];
        const cVal = [1, 2, 3, 5][Math.floor(Math.random() * 4)];
        const formulaWeight = (w * cVal) / 100;
        qPack.push({
            type: 'short',
            question: `[실전 계산] 베이스 용액 ${w}g에 활성 성분 ${cVal}%를 배합하여 제품을 만들려고 합니다. 첨가해야 할 성분의 중량은 몇 g인가요? (소수점 둘째자리까지 정답 인정)`,
            correct: String(formulaWeight.toFixed(2)),
            explanation: `계산 공식: 중량 = (전체 중량 * 배합 %) / 100 = (${w} * ${cVal}) / 100 = ${formulaWeight}g`
        });
    }

    // 4. 지식DB 분류 판별 1개 — registry.knowledge 스키마로 데이터셋 해석
    const db = DataLoader.getKnowledgeItems();
    const kSchema = (DataLoader.registry && DataLoader.registry.knowledge) || {};
    const badgeField = (kSchema.badge && kSchema.badge.field) || 'type';
    const badgeLabels = (kSchema.badge && kSchema.badge.labels) || {};
    const unit = kSchema.entityUnit || '항목';
    // 분류 판별 문항은 badge 필드와 라벨 맵이 있는 데이터셋에서만 생성한다
    if (db.length > 0 && Object.keys(badgeLabels).length > 1 && db.some(i => i && i[badgeField] !== undefined)) {
        const ing = db[Math.floor(Math.random() * db.length)];
        const correctText = badgeLabels[ing[badgeField]] || (kSchema.badge && kSchema.badge.defaultLabel) || String(ing[badgeField]);
        const options = Object.values(badgeLabels);
        qPack.push({
            type: 'choice',
            question: `[${unit} 분류] 다음 항목 "${ing.name}"은(는) 기준상 어느 그룹에 속하나요?`,
            correct: correctText,
            options,
            explanation: `"${ing.name}" — 분류: ${correctText}${ing.limit ? ` · 기준: ${ing.limit}` : ''}`
        });
    }

    dailyState.currentIndex = 0;
    dailyState.correctCount = 0;
    dailyState.questions = qPack;

    // 과업 퍼널 계측 — daily_start ↔ finishDailyChallenge의 daily_complete 쌍
    void reportEvent('daily_start', { count: qPack.length });

    showDailyModal();
}

function showDailyModal() {
    const oldModal = document.getElementById('daily-challenge-modal');
    if (oldModal) oldModal.remove();

    const modalHTML = `
        <div id="daily-challenge-modal" class="daily-modal-overlay" role="dialog" aria-modal="true" aria-label="데일리 챌린지">
            <div class="glass-card dialog-card daily-modal-card">
                <div class="daily-modal-head">
                    <h3 class="daily-modal-title"><i class="fa-solid fa-fire"></i> 데일리 챌린지</h3>
                    <span id="daily-modal-progress" class="daily-modal-progress"></span>
                </div>

                <div class="progress-bar-container daily-modal-track">
                    <div id="daily-modal-bar" class="progress-bar daily-modal-bar"></div>
                </div>

                <div id="daily-modal-q-body" class="daily-modal-body">
                    질문 로딩 중...
                </div>

                <div id="daily-modal-answer-area" class="daily-modal-answer">
                </div>

                <div class="quiz-feedback is-hidden daily-modal-feedback" id="daily-modal-feedback">
                    <div class="feedback-icon" id="daily-modal-feedback-icon"><i class="fa-solid fa-check"></i></div>
                    <div class="feedback-content">
                        <h4 id="daily-modal-feedback-title">정답입니다!</h4>
                        <p id="daily-modal-feedback-desc" class="daily-modal-feedback-desc">설명</p>
                    </div>
                </div>

                <div class="daily-modal-foot">
                    <button class="btn btn-secondary" data-click="closeDailyModal" title="데일리 챌린지 닫기"><i class="fa-solid fa-xmark"></i> 나가기</button>
                    <button id="daily-modal-next-btn" class="btn btn-success is-hidden" data-click="nextDailyStep">다음 단계 <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    renderDailyStep();
}

export async function closeDailyModal() {
    let ok = false;
    try {
        ok = await showConfirm('도중에 나가시면 데일리 미션 진도가 저장되지 않습니다. 정말 나가시겠습니까?', '데일리 챌린지 종료');
    } catch (e) {
        // showConfirm 거부/에러 시 안전하게 모달 유지
        return;
    }
    if (ok) {
        const modal = document.getElementById('daily-challenge-modal');
        if (modal) modal.remove();
    }
}

function renderDailyStep() {
    // 단계 전환 — .dialog-card는 자체 스크롤 컨테이너라 이전 스크롤이 잔류하면 다음 문항 상단이 잘림
    const card = document.querySelector('#daily-challenge-modal .dialog-card');
    if (card) card.scrollTop = 0;
    const q = dailyState.questions[dailyState.currentIndex];

    const progEl = document.getElementById('daily-modal-progress');
    if (progEl) progEl.textContent = `진행: ${dailyState.currentIndex + 1} / ${dailyState.questions.length}`;
    const barEl = /** @type {HTMLElement|null} */ (document.getElementById('daily-modal-bar'));
    if (barEl) barEl.style.width = `${((dailyState.currentIndex + 1) / dailyState.questions.length) * 100}%`;
    document.getElementById('daily-modal-feedback')?.classList.add('is-hidden');
    document.getElementById('daily-modal-next-btn')?.classList.add('is-hidden');

    const qBody = document.getElementById('daily-modal-q-body');
    if (!qBody) return;
    qBody.innerHTML = `<h4 class="daily-modal-question">${safeTextWithBreaks(q.question)}</h4>`;

    const answerArea = document.getElementById('daily-modal-answer-area');
    if (!answerArea) return;
    answerArea.innerHTML = '';

    if (q.type === 'card') {
        qBody.innerHTML = `
            <div id="daily-card-container" class="daily-card-container">
                <div id="daily-card-inner" class="daily-card-inner">
                    <div class="daily-card-face daily-card-front">
                        <p class="daily-card-def">${safeTextWithBreaks(q.cardObj.definition)}</p>
                        <span class="daily-card-hint"><i class="fa-solid fa-rotate"></i> 카드를 클릭해 뒤집기</span>
                    </div>
                    <div class="daily-card-face daily-card-back">
                        <h2 class="daily-card-term">${esc(q.cardObj.term)}</h2>
                    </div>
                </div>
            </div>
        `;

        const cardContainer = document.getElementById('daily-card-container');
        cardContainer?.addEventListener('click', () => {
            const inner = /** @type {HTMLElement|null} */ (document.getElementById('daily-card-inner'));
            if (inner) inner.style.transform = inner.style.transform === 'rotateY(180deg)' ? 'rotateY(0deg)' : 'rotateY(180deg)';
        });

        answerArea.innerHTML = `
            <div class="daily-choice-row">
                <button class="btn btn-warning" data-click="submitDailyCardAnswer" data-args="[false]"><i class="fa-solid fa-question"></i> 아직 헷갈림</button>
                <button class="btn btn-success" data-click="submitDailyCardAnswer" data-args="[true]"><i class="fa-solid fa-check"></i> 완벽히 외움</button>
            </div>
        `;
    } else if (q.type === 'choice') {
        const optionIndicators = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'limits-opt-btn daily-choice-btn';
            btn.dataset.value = opt;
            btn.innerHTML = `<span class="limits-opt-num">${esc(optionIndicators[idx])}</span> <span class="limits-opt-text">${esc(opt)}</span>`;
            btn.addEventListener('click', () => {
                submitDailyChoiceAnswer(btn, opt, q.correct);
            });
            answerArea.appendChild(btn);
        });
    } else {
        answerArea.innerHTML = `
            <div class="daily-short-row">
                <input type="text" id="daily-answer-input" class="form-input" placeholder="정답을 기재하세요" autocomplete="off">
                <button class="btn btn-primary" data-click="submitDailyShortAnswer"><i class="fa-solid fa-circle-check"></i> 제출</button>
            </div>
        `;
    }
}

export function submitDailyCardAnswer(isMemorized) {
    if (isMemorized) {
        dailyState.correctCount++;
    }

    const feedback = document.getElementById('daily-modal-feedback');
    const title = document.getElementById('daily-modal-feedback-title');
    const desc = document.getElementById('daily-modal-feedback-desc');

    if (feedback) feedback.classList.remove('is-hidden');
    if (feedback) feedback.classList.remove('incorrect');
    if (title) title.textContent = isMemorized ? '완벽히 외운 카드로 분류했습니다.' : '헷갈린 복습 카드로 분류했습니다.';
    if (desc) desc.textContent = `용어: ${dailyState.questions[dailyState.currentIndex].correct}`;

    const q = dailyState.questions[dailyState.currentIndex];
    if (isMemorized) {
        state.memorizedCards.add(q.cardObj.id);
        state.weakCards.delete(q.cardObj.id);
    } else {
        state.weakCards.add(q.cardObj.id);
    }
    saveProgress();

    const nextBtn = document.getElementById('daily-modal-next-btn');
    if (nextBtn) nextBtn.classList.remove('is-hidden');
}

function submitDailyChoiceAnswer(selectedBtn, selectedValue, correctValue) {
    const isCorrect = (selectedValue === correctValue);
    markChoiceButtons(document.getElementById('daily-modal-answer-area'), selectedBtn, correctValue);
    if (isCorrect) {
        dailyState.correctCount++;
    }

    showDailyFeedback(isCorrect, correctValue);
}

export function submitDailyShortAnswer() {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById('daily-answer-input'));
    if (!input) return;
    const userInput = input.value.trim();
    if (!userInput) {
        showToast('정답을 입력하세요!', 'warning');
        return;
    }

    const q = dailyState.questions[dailyState.currentIndex];
    const isCorrect = checkShortAnswer(userInput, q.correct);

    if (isCorrect) {
        dailyState.correctCount++;
    }

    input.disabled = true;
    const btn = /** @type {HTMLButtonElement|null} */ (document.querySelector('#daily-modal-answer-area button'));
    if (btn) btn.disabled = true;

    showDailyFeedback(isCorrect, q.correct);
}

function showDailyFeedback(isCorrect, correctValue) {
    const q = dailyState.questions[dailyState.currentIndex];
    showAnswerFeedback({
        panelId: 'daily-modal-feedback', titleId: 'daily-modal-feedback-title',
        descId: 'daily-modal-feedback-desc', nextBtnId: 'daily-modal-next-btn',
        isCorrect,
        titleHtml: isCorrect ? '🟢 정답입니다!' : `🔴 오답입니다! (정답: <strong>${esc(correctValue)}</strong>)`,
        descHtml: safeTextWithBreaks(q.explanation || '해설은 교재·참조자료에서 확인하세요.'),
    });
}

export function nextDailyStep() {
    dailyState.currentIndex++;
    if (dailyState.currentIndex >= dailyState.questions.length) {
        finishDailyChallenge();
    } else {
        renderDailyStep();
    }
}

function finishDailyChallenge() {
    const modal = document.getElementById('daily-challenge-modal');
    if (modal) modal.remove();

    // 과업 퍼널 계측 — 완주 이벤트 (점수는 집계용 수치)
    void reportEvent('daily_complete', {
        correct: dailyState.correctCount, total: dailyState.questions.length,
    });

    showToast(`일일 챌린지 완료 — 점수 ${dailyState.correctCount} / ${dailyState.questions.length}`, 'success');

    const todayStr = todayKey();
    safeSetItem(dailyCompletedKey(todayStr), "true");

    let streak = parseInt(safeGetItem(STORAGE_KEYS.STUDY_STREAK) || '0') || 0;
    const lastDate = safeGetItem(STORAGE_KEYS.STUDY_STREAK_LAST_DATE);

    if (lastDate !== todayStr) {
        streak++;
        safeSetItem(STORAGE_KEYS.STUDY_STREAK, streak);
        safeSetItem(STORAGE_KEYS.STUDY_STREAK_LAST_DATE, todayStr);
        // 스트릭 복구권 획득 — 7일 연속 마일스톤마다 1장 (SC-04)
        if (streak % STREAK_FREEZE_EARN_EVERY === 0) {
            const freezes = _getFreezeCount();
            if (freezes < STREAK_FREEZE_MAX) {
                safeSetItem(STORAGE_KEYS.STREAK_FREEZES, freezes + 1);
                showToast(`${streak}일 연속 학습 — 스트릭 복구권을 받았습니다 (${freezes + 1}/${STREAK_FREEZE_MAX}장)`, 'success', 4000);
            }
        }
    }

    updateStreakAndDailyUI();
}
