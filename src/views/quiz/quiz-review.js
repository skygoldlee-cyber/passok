// src/views/quiz-review.js - 오답 노트(복습) 뷰 로직 (quiz.js 분리 — 배럴 re-export)
// @spec RV-01
import { state, saveProgress } from '../../state.js';
import { safeTextWithBreaks, esc } from '../../sanitize.js';
import { switchView } from '../navigation.js';
import { examIdToSubjectId } from '../../exam-context.js';
import {
    WEAK_QUIZ_PREFIX, WEAK_SIM_PREFIX,
    resolveWrongQuiz, resolveCard, parseWeakSimId, collectWeakConceptQuizzes
} from '../../study/weak-items.js';
import { getAllStatementStats } from '../../study/statement-tracker.js';
import { showToast } from '../../ui-utils.js';
import { hasProEntitlement, proFeatureNotice } from '../../pro/pro-upgrade.js';
import { requestWeakQuizGen } from '../../ai/ai-client.js';
import { filterGeneratedItems } from '../../ai/gen-gate.js';
import { computeWrongCauseSummary, getWrongCauseLabels } from '../../study/recommendations.js';
import { shuffle } from '../../utils.js';
import { updateGlobalStats } from '../dashboard.js';
import { _beginQuizRun } from './quiz.js';

/**
 * 헷갈린 카드 목록을 반환
 */
function getWeakCardsList() {
    const list = [];

    // 1. 일반 카드 복구 (인덱스 캐시 — weak-items.js)
    if (window.STUDY_DATA) {
        state.weakCards.forEach(cardId => {
            const rc = resolveCard(cardId);
            if (rc) {
                list.push({ ...rc.card, subjectId: rc.subjectId, subjectName: (window.STUDY_DATA || {})[rc.subjectId].name });
            }
        });
    }

    // 2. 모의고사·기출 퀴즈 오답 카드 복구
    state.weakCards.forEach(cardId => {
        if (cardId.startsWith(WEAK_QUIZ_PREFIX)) {
            const resolved = resolveWrongQuiz(cardId);
            if (resolved) {
                const { quiz: q, subjectId } = resolved;
                const subjectName = (window.STUDY_DATA || {})[subjectId].name;
                list.push({
                    id: cardId,
                    subjectId: subjectId,
                    category: q.category,
                    term: `[기출 퀴즈 오답] ${q.question.substring(0, 30)}...`,
                    definition: `문제: ${q.question}\n정답: ${q.answer}`,
                    subjectName: subjectName
                });
            }
            return;
        }
        if (cardId.startsWith(WEAK_SIM_PREFIX)) {
            const simId = parseWeakSimId(cardId);
            if (simId) {
                const examId = simId.examId;
                const qNum = simId.qNum;
                if (window.EXAM_DATA && window.EXAM_DATA[examId]) {
                    const exam = window.EXAM_DATA[examId];
                    const q = exam.questions.find(quest => quest.num === qNum);
                    if (q) {
                        const targetSubject = examIdToSubjectId(examId);
                        const subjectName = (window.STUDY_DATA && targetSubject && window.STUDY_DATA[targetSubject]) ? (window.STUDY_DATA || {})[targetSubject].name : '모의고사';
                        list.push({
                            id: cardId,
                            subjectId: targetSubject,
                            category: exam.title.split('(')[0].trim() || '모의고사 오답',
                            term: `[모의고사 오답] ${q.question.substring(0, 30)}...`,
                            definition: `문제: ${q.question}\n정답: ${q.answer}\n해설: ${q.explanation}`,
                            subjectName: subjectName
                        });
                    }
                }
            }
        }
    });

    return list;
}

/**
 * 복습 노트 렌더링
 */
export function renderReviewList() {
    const container = document.getElementById('review-cards-list-container');
    if (!container) return;
    container.innerHTML = '';

    const printBtn = document.getElementById('print-review-btn');
    const examBtn = document.getElementById('start-weak-exam-btn');
    const emptyStateEl = document.getElementById('review-empty-state');
    const focusQuizBtn = document.getElementById('start-weak-quiz-btn');

    if (state.weakCards.size === 0) {
        if (emptyStateEl) emptyStateEl.classList.remove('is-hidden');
        if (focusQuizBtn) focusQuizBtn.classList.add('is-hidden');
        if (examBtn) examBtn.classList.add('is-hidden');
        if (printBtn) printBtn.classList.add('is-hidden');
        return;
    }

    let allCards = getWeakCardsList();

    // 필터링 적용
    if (state.reviewFilter && state.reviewFilter !== 'all') {
        allCards = allCards.filter(c => c.subjectId === state.reviewFilter);
    }

    if (allCards.length === 0) {
        if (emptyStateEl) {
            emptyStateEl.classList.remove('is-hidden');
            const h3 = emptyStateEl.querySelector('h3');
            const p = emptyStateEl.querySelector('p');
            if (h3) h3.textContent = '이 과목에 해당하는 복습 카드가 없습니다!';
            if (p) p.textContent = '다른 과목 필터를 선택하거나 전체 보기를 누르세요.';
        }
        if (focusQuizBtn) focusQuizBtn.classList.add('is-hidden');
        if (examBtn) examBtn.classList.add('is-hidden');
        if (printBtn) printBtn.classList.add('is-hidden');
        return;
    }

    if (emptyStateEl) {
        emptyStateEl.classList.add('is-hidden');
        const h3 = emptyStateEl.querySelector('h3');
        const p = emptyStateEl.querySelector('p');
        if (h3) h3.textContent = '복습할 카드가 없습니다!';
        if (p) p.textContent = '플래시카드 학습 중에 "아직 헷갈림"으로 분류한 카드가 여기에 수집됩니다.';
    }

    if (focusQuizBtn) focusQuizBtn.classList.remove('is-hidden');
    if (examBtn) examBtn.classList.remove('is-hidden');
    if (printBtn) printBtn.classList.remove('is-hidden');

    // 오답 패턴 분석 요약 — 최근 7일 원인 분포 + 권장 학습법
    const causeSummary = computeWrongCauseSummary(state.wrongCauses);
    if (causeSummary.total > 0) {
        const dist = Object.entries(getWrongCauseLabels())
            .filter(([k]) => causeSummary.counts[k] > 0)
            .map(([k, label]) => `${label} ${causeSummary.counts[k]}`)
            .join(' · ');
        container.insertAdjacentHTML('beforeend', `
            <div class="wrong-cause-summary">
                <span class="wrong-cause-chip"><i class="fa-solid fa-chart-pie"></i> 오답 패턴 (7일): ${esc(dist)}</span>
                <span class="wrong-cause-advice">${esc(causeSummary.advice)}</span>
            </div>
        `);
    }

    allCards.forEach(card => {
        const itemHTML = `
            <div class="review-card-item" id="rev-${card.id}">
                <div class="review-card-item-header">
                    <span class="card-badge">${esc(card.subjectName)}</span>
                    <button class="review-remove-btn" data-click="removeWeakCard" data-arg="${esc(card.id)}" title="약점 카드 목록에서 제외 (카드 자체는 유지)">
                        <i class="fa-solid fa-trash-can"></i> 제외
                    </button>
                </div>
                <h5>${esc(card.term)}</h5>
                <p>${safeTextWithBreaks(card.definition)}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    });
}

/**
 * 복습 카드 제외
 * @param {string} cardId
 */
export function removeWeakCard(cardId) {
    state.weakCards.delete(cardId);
    saveProgress();

    const cardEl = document.getElementById(`rev-${cardId}`);
    if (cardEl) {
        cardEl.style.transform = 'scale(0.9)';
        cardEl.style.opacity = '0';
        setTimeout(() => {
            renderReviewList();
            updateGlobalStats();
        }, 200);
    }
}

/**
 * 복습 카드 과목 필터 선택
 * @param {string} filterType
 */
export function setReviewFilter(filterType) {
    state.reviewFilter = filterType;

    const buttons = document.querySelectorAll('#review-filter-group .filter-btn');
    buttons.forEach(node => {
        const btn = /** @type {HTMLElement} */ (node);
        if (btn.getAttribute('data-filter') === filterType) {
            btn.classList.add('active');
            btn.style.background = 'var(--color-primary)';
            btn.style.borderColor = 'var(--color-primary)';
            btn.style.color = 'var(--color-on-brand)';
        } else {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    });

    renderReviewList();
}

/**
 * 헷갈린 카드로 즉시 기출 퀴즈를 출제하는 퀴즈 모드
 */
/**
 * 약점 선정형 미니퀴즈 (AI-34) — 취약 conceptId를 가진 기존 문항을 모아 출제.
 * 생성형이 아닌 선정형: 오답 문항 + 같은 conceptId(혼동쌍·관련 진술)의 문항을 우선 추출.
 */
export function startWeakConceptQuiz() {
    const weakCids = new Set();
    const stats = getAllStatementStats();
    for (const st of Object.values(stats)) {
        if (st && st.w > 0 && st.cid) weakCids.add(st.cid);
    }
    const wrongIds = new Set(
        Object.keys(state.quizResults || {}).filter(id => !state.quizResults[id].correct));
    // 오답 문항 자체의 conceptId도 약점으로 간주 — 혼동쌍 선정 범위 확장
    for (const d of Object.values(window.STUDY_DATA || {})) {
        for (const q of (d && d.quizzes) || []) {
            if (wrongIds.has(q.id) && q.conceptId) weakCids.add(q.conceptId);
        }
    }
    const items = collectWeakConceptQuizzes(window.STUDY_DATA || {}, weakCids, wrongIds, 10);
    if (!items.length) {
        showToast('약점 개념 문항이 아직 없습니다 — 오답이 쌓이면 생성됩니다.', 'info');
        return;
    }
    state.quiz.data = shuffle(items);
    _beginQuizRun();
}

/**
 * 약점 생성형 미니퀴즈 (AI-38, Pro) — 취약 개념으로 새 문항을 생성해 출제.
 * 생성물은 gen-gate(AI-37) 통과분만 출제 — 인용 없는 문항·기존 문항 중복은 폐기.
 */
export async function startWeakGenQuiz() {
    if (!hasProEntitlement()) {
        proFeatureNotice('mock_exam', 'AI 약점 미니퀴즈');
        return;
    }
    const wrongIds = new Set(
        Object.keys(state.quizResults || {}).filter(id => !state.quizResults[id].correct));
    const poolTexts = [], wrongTexts = [];
    for (const d of Object.values(window.STUDY_DATA || {})) {
        for (const q of (d && d.quizzes) || []) {
            if (q.question) poolTexts.push(q.question);
            if (wrongIds.has(q.id)) wrongTexts.push(q.question);
        }
    }
    if (!wrongTexts.length) {
        showToast('오답이 없습니다 — 먼저 퀴즈를 풀어 약점을 쌓아 주세요.', 'info');
        return;
    }
    showToast('AI가 약점 문항을 생성하고 있습니다…', 'info');
    const res = await requestWeakQuizGen({
        cluster: '약점 개념 복습', existing: wrongTexts.slice(0, 8), count: 3,
    });
    if (!res.ok) {
        showToast(res.error || 'AI 미니퀴즈 생성에 실패했습니다.', 'error');
        return;
    }
    const { passed, rejected } = filterGeneratedItems(res.items || [], { poolTexts });
    if (!passed.length) {
        showToast('생성된 문항이 검증을 통과하지 못했습니다 — 다시 시도해 보세요.', 'warning');
        return;
    }
    if (rejected.length) {
        showToast(`검증 미통과 ${rejected.length}문항 제외`, 'info');
    }
    state.quiz.data = passed.map((g, i) => ({
        id: `ai_gen_${Date.now()}_${i}`,
        category: 'AI 생성',
        context: '[AI 생성 — 오류가 있을 수 있습니다 · 인용 근거 확인 권장]',
        question: g.question, answer: g.answer,
        options: g.options, type: 'single',
    }));
    _beginQuizRun();
}

export function startWeakFocusQuiz() {
    let weakCards = getWeakCardsList();
    if (weakCards.length === 0) return;

    if (state.reviewFilter && state.reviewFilter !== 'all') {
        weakCards = weakCards.filter(c => c.subjectId === state.reviewFilter);
    }

    if (weakCards.length === 0) return;

    const weakList = weakCards.map(card => {
        if (card.id.startsWith(WEAK_QUIZ_PREFIX)) {
            const resolved = resolveWrongQuiz(card.id);
            if (!resolved) return null;
            const q = resolved.quiz;
            return {
                id: card.id,
                category: q.category,
                context: `[기출 퀴즈 오답 퀴즈]`,
                question: q.question,
                answer: q.answer,
                type: q.type,
                options: q.options || null
            };
        }
        if (card.id.startsWith(WEAK_SIM_PREFIX)) {
            const simId = parseWeakSimId(card.id);
            if (!simId) return null;
            const examId = simId.examId;
            const qNum = simId.qNum;
            if (!window.EXAM_DATA || !window.EXAM_DATA[examId]) return null;
            const exam = window.EXAM_DATA[examId];
            const q = exam.questions.find(quest => quest.num === qNum);
            if (!q) return null;

            return {
                id: card.id,
                category: card.category,
                context: `[모의고사 오답 퀴즈]`,
                question: q.question,
                answer: q.answer,
                type: q.type,
                options: q.options || null
            };
        } else {
            return {
                id: card.id,
                category: card.category,
                context: `[오답 집중 학습] 정의에 해당하는 용어를 입력하세요.`,
                question: card.definition,
                answer: card.term,
                type: 'term'
            };
        }
    });

    state.quiz.data = shuffle(weakList.filter(Boolean)).slice(0, 10);
    state.quiz.diagnostic = false;
    switchView('quiz-view', { scrollTop: true });
    _beginQuizRun();
}
