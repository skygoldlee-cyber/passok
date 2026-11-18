// src/views/exam-sim-weak.js - 오답 모의고사
// @spec E-04,PS-02
import { state } from '../../core/state.js';
import { DataLoader } from '../../content/data-loader.js';
import { shuffle } from '../../core/utils.js';
import { WEAK_SIM_PREFIX, parseWeakSimId, resolveCard, cardSubjectOf } from '../../study/weak-items.js';
import { examIdToSubjectId, getActiveRegistry } from '../../core/exam-context.js';
import { proFeatureNotice } from '../../pro/pro-upgrade.js';
import { showToast } from '../../ui-utils.js';
import { startSimSession, comboToSimQuestion, comboSubjOrder } from './exam-simulator.js';
import { getAllStatementStats } from '../../study/statement-tracker.js';
import { subjectFromSid } from '../../study/analysis-engine.js';
import { buildWeakMock } from '../../study/personalization.js';

/* =======================================================
   📋 "틀린 문제만 모아 풀기" 오답 모의고사 (Weakness Exam)
   ======================================================= */
export function startWeakExam() {
    proFeatureNotice('mock_exam', '헷갈린 문제 집중 모의고사');
    const loaderPromises = DataLoader.getSubjectList().map(s => DataLoader.loadSubject(s.key));
    // 복수정답형 모의고사 오답이 있으면 해당 과목의 combo 번들도 함께 로드
    const comboSubsNeeded = new Set();
    (state.weakCards || new Set()).forEach(cardId => {
        const m = cardId.match(new RegExp('^' + WEAK_SIM_PREFIX + '([a-z]+)_combo_'));
        if (m) {
            const order = comboSubjOrder(m[1] || '');
            if (order) comboSubsNeeded.add(order);
        }
    });
    // PS-02 — 취약 진술(sid)이 속한 과목의 combo 번들도 로드 (진술→모체 문항 환원용)
    const stmtStatsForLoad = getAllStatementStats();
    for (const [sid, st] of Object.entries(stmtStatsForLoad)) {
        if (!(st && st.w > 0)) continue;
        const sk = subjectFromSid(sid);
        const order = sk && comboSubjOrder(sk);
        if (order) comboSubsNeeded.add(order);
    }
    comboSubsNeeded.forEach(n => loaderPromises.push(DataLoader.loadComboDrills(n)));
    Promise.all(loaderPromises).then(() => {
        _startWeakExamImpl();
    }).catch(err => {
        console.error(err);
        showToast("복습 데이터를 로드하지 못했습니다.", "error");
    });
}

/** reviewFilter 적용 — 카드는 sim/일반 ID에서 과목 해석, 퀴즈는 STUDY_DATA 소속 과목으로 */
function _filterWeakForReview(/** @type {string[]} */ weakCards, /** @type {string[]} */ solvedQuizzes, /** @type {*} */ STUDY_DATA) {
    const cards = weakCards.filter(cardId => {
        const simId = parseWeakSimId(cardId);
        if (simId) {
            const targetSub = examIdToSubjectId(simId.examId);
            return targetSub === state.reviewFilter;
        } else {
            const cardSubj = cardSubjectOf(cardId);
            return cardSubj === state.reviewFilter;
        }
    });
    const quizzes = solvedQuizzes.filter(quizId => {
        for (const subjId of Object.keys(STUDY_DATA)) {
            if (STUDY_DATA[subjId].quizzes.some((/** @type {*} */ q) => q.id === quizId)) {
                return subjId === state.reviewFilter;
            }
        }
        return false;
    });
    return { cards, quizzes };
}

/** combo 번들의 진술들을 sidIndex에 등록 */
function _indexComboStatements(/** @type {*[]} */ bundle, /** @type {*} */ subjKey, /** @type {Map<string,{q:*,subjKey:*}>} */ sidIndex) {
    for (const q of bundle) {
        for (const st of (q.statements || [])) {
            if (st.sid && !sidIndex.has(st.sid)) sidIndex.set(st.sid, { q, subjKey });
        }
    }
}

/** PS-02 — 취약 진술(sid)→모체 combo 문항 환원 인덱스 (로드된 번들 스캔) @returns {Map<string,{q:*,subjKey:*}>} */
function _buildSidIndex() {
    /** @type {Map<string,{q:*,subjKey:*}>} */
    const sidIndex = new Map(); // sid → { q, subjKey }
    const subjects = (getActiveRegistry() || {}).subjects || [];
    for (const s of subjects) {
        const bundle = (typeof window !== 'undefined') ? /** @type {*} */ (window)[`COMBO_DRILLS_subject${s.order}`] : null;
        if (!Array.isArray(bundle)) continue;
        _indexComboStatements(bundle, s.key, sidIndex);
    }
    return sidIndex;
}

/** 복수정답형 오답 원본 검색 — COMBO_DRILLS_subjectN 번들 (id 형식: <subjKey>_combo_<hash>) @returns {{q:*, subj:string}|null} */
function _findComboOriginal(/** @type {string} */ origQId) {
    const subjects = (getActiveRegistry() || {}).subjects || [];
    for (const s of subjects) {
        const bundle = (typeof window !== 'undefined') ? /** @type {*} */ (window)[`COMBO_DRILLS_subject${s.order}`] : null;
        if (!Array.isArray(bundle)) continue;
        const q = bundle.find((/** @type {*} */ qq) => qq.id === origQId);
        if (q) {
            return { q: comboToSimQuestion(q, s.key), subj: s.key };
        }
    }
    return null;
}

/** weak_sim_ 오답 원본 문항 검색 — EXAM_DATA 우선, 없으면 COMBO_DRILLS 번들 @returns {{q:*, subj:*}|null} */
function _findSimOriginal(/** @type {string} */ origQId) {
    const EXAM_DATA = (typeof window !== 'undefined' && window.EXAM_DATA) ? window.EXAM_DATA : {};
    for (const examId of Object.keys(EXAM_DATA)) {
        const qs = EXAM_DATA[examId].questions || [];
        const q = qs.find((/** @type {*} */ qq) => qq.id === origQId);
        if (q) {
            return { q, subj: examIdToSubjectId(examId) };
        }
    }
    return _findComboOriginal(origQId);
}

/** weak_sim_ 오답 → 복습 문항 객체 조립 (combo 문항은 members·진술 구조를 유지해야 채점·리뷰가 동작) */
function _simReviewQuestion(/** @type {string} */ origQId, /** @type {*} */ foundQ, /** @type {*} */ foundSubj) {
    return {
        subject: foundSubj ?? '',
        q: {
            id: `weak_exam_${origQId}`,
            subject: foundSubj,
            type: foundQ.type || 'blank',
            question: foundQ.question,
            answer: foundQ.answer,
            options: foundQ.options || null,
            comboOptions: foundQ.comboOptions || null,
            statements: foundQ.statements || null,
            explanation: foundQ.explanation || '모의고사 오답 복습 문제입니다.'
        }
    };
}

/** 헷갈린 카드 ID → 복습 문항 (일반 플래시카드 또는 weak_sim_ 모의고사 오답) @returns {{q:*, subject:string}|null} */
function _weakCardQuestion(/** @type {string} */ cardId) {
    // 1-a) 일반 플래시카드: 인덱스 캐시로 검색 (weak-items.js)
    const rc = resolveCard(cardId);
    const cardObj = /** @type {*} */ (rc && rc.card);
    if (cardObj) {
        const subject = rc ? rc.subjectId : '';
        return {
            subject,
            q: {
                id: `weak_card_${cardObj.id}`,
                subject: subject,
                type: 'blank',
                question: `[용어 정의] 다음 설명이 뜻하는 개념은 무엇입니까?\n설명: ${cardObj.definition}`,
                answer: cardObj.term,
                explanation: `정의: ${cardObj.definition}\n용어: ${cardObj.term}`
            }
        };
    }

    // 1-b) 모의고사 오답: weak_sim_<examId>_q<num> 형태의 ID
    // STUDY_DATA에 없으므로 window.EXAM_DATA에서 원본 문제를 찾아 복습 문제로 조립
    if (!cardId.startsWith(WEAK_SIM_PREFIX)) return null;
    const origQId = cardId.substring(WEAK_SIM_PREFIX.length);
    const hit = _findSimOriginal(origQId);
    if (!hit) return null;
    return _simReviewQuestion(origQId, hit.q, hit.subj);
}

/** 오답 기출 퀴즈 ID → 복습 문항 @returns {{q:*, subject:string}|null} */
function _weakQuizQuestion(/** @type {string} */ quizId, /** @type {*} */ STUDY_DATA) {
    for (const subjId of Object.keys(STUDY_DATA)) {
        const quizObj = STUDY_DATA[subjId].quizzes.find((/** @type {*} */ q) => q.id === quizId);
        if (quizObj) {
            return {
                subject: subjId,
                q: {
                    id: `weak_quiz_${quizObj.id}`,
                    subject: subjId,
                    type: quizObj.type,
                    question: quizObj.question,
                    answer: quizObj.answer,
                    options: quizObj.options || null,
                    explanation: `기존 문제에 포함된 오답 기출 연동 퀴즈입니다.`
                }
            };
        }
    }
    return null;
}

/** 편성 데이터 없음 안내 토스트 */
function _toastNoWeakData() {
    /** @type {Object.<string,string>} */
    const filterNames = {};
    const subjects = (getActiveRegistry() || {}).subjects || [];
    subjects.forEach((/** @type {*} */ sub, /** @type {number} */ idx) => {
        const shortName = sub.shortName || sub.name;
        filterNames[sub.key] = `${idx + 1}과목 (${shortName})`;
    });
    const filterName = filterNames[state.reviewFilter] || '선택한 과목';
    showToast(`복습할 헷갈린 카드나 오답 퀴즈가 없습니다! (${filterName})\n플래시카드나 기출 퀴즈를 학습하여 약점 데이터를 모아보세요.`, "info", 4000);
}

/** 3개 소스(카드/퀴즈/진술) → poolId 문항 맵 + 과목키 맵 (가중 편성 id 공간) */
function _assembleWeakPool(/** @type {string[]} */ weakCards, /** @type {string[]} */ solvedQuizzes, /** @type {string[]} */ weakSids, /** @type {Map<string,{q:*,subjKey:*}>} */ sidIndex, /** @type {*} */ STUDY_DATA) {
    const pool = new Map();
    /** @type {Object.<string,string>} */
    const qsubj = {};   // poolId → 과목키 (과목 분포 산출용)

    // 1. 헷갈린 카드로부터 질문 생성
    weakCards.forEach(cardId => {
        const hit = _weakCardQuestion(cardId);
        if (!hit) return;
        pool.set(cardId, hit.q);
        qsubj[cardId] = hit.subject;
    });

    // 2. 오답 기출 퀴즈로부터 질문 생성
    solvedQuizzes.forEach(quizId => {
        const hit = _weakQuizQuestion(quizId, STUDY_DATA);
        if (!hit) return;
        pool.set(quizId, hit.q);
        qsubj[quizId] = hit.subject;
    });

    // 3. 취약 진술 → 모체 combo 문항 (PS-02 — 진술 오판이 문항 단위 편성으로 환원)
    weakSids.forEach(sid => {
        const hit = sidIndex.get(sid);
        if (!hit) return;
        pool.set(sid, comboToSimQuestion(hit.q, hit.subjKey));
        qsubj[sid] = hit.subjKey;
    });
    return { pool, qsubj };
}

/**
 * PS-02 — 취약 가중 편성: 진술 오답 2×·weakCards +3 정렬 상위 N문,
 * 순위 밖 잔여는 무작위로 뒤를 채움 (오답 퀴즈는 w=1 의사 통계로 동일 척도 편입).
 */
function _pickWeakQuestions(/** @type {Map<string,*>} */ pool, /** @type {*} */ stmtStats, /** @type {string[]} */ solvedQuizzes, /** @type {string[]} */ weakCards, /** @type {Object.<string,string>} */ qsubj) {
    const ranked = buildWeakMock({
        statementStats: Object.assign({}, stmtStats,
            Object.fromEntries(solvedQuizzes.filter(id => !(id in stmtStats)).map(id => [id, { w: 1, j: 0 }]))),
        weakCards: new Set(weakCards),
        questionSubjects: qsubj
    }, 20);
    /** @type {*[]} */
    const picked = [];
    const usedQ = new Set();
    const take = (/** @type {string} */ poolId) => {
        const q = pool.get(poolId);
        // weak_card_/weak_exam_/weak_quiz_ 접두사 정규화 — sid 경유·카드 경유 중복 문항 차단
        const key = q && q.id.replace(/^weak_(card|exam|quiz)_/, '');
        if (!q || usedQ.has(key)) return;
        usedQ.add(key);
        picked.push(q);
    };
    (ranked.items || []).forEach(take);
    const rankedSet = new Set(ranked.items || []);
    shuffle([...pool.keys()].filter(id => !rankedSet.has(id))).forEach(take);
    return { shuffled: picked.slice(0, 20), ranked };
}

/** 대시보드/리뷰 뷰를 닫고 시험 뷰로 전환 */
function _activateExamView() {
    state.currentView = 'exam-view';
    const dashView = document.getElementById('dashboard-view');
    const revView = document.getElementById('review-view');
    const examView = document.getElementById('exam-view');
    if (dashView) dashView.classList.remove('active');
    if (revView) revView.classList.remove('active');
    if (examView) examView.classList.add('active');
}

/** PS-02 — 가중 편성 근거 안내 (상위 취약 편성 수·과목 분포) */
function _toastWeakComposition(/** @type {*} */ ranked, /** @type {*[]} */ shuffled) {
    if (!ranked.items.length) return;
    const subs = (getActiveRegistry() || {}).subjects || [];
    const nameOf = (/** @type {string} */ k) => { const s = subs.find((/** @type {*} */ x) => x.key === k); return s ? (s.shortName || s.name) : k; };
    const dist = Object.entries(ranked.bySubject).map(([k, n]) => `${nameOf(k)} ${n}문`).join(' · ');
    showToast(`취약 우선 편성 — 상위 ${shuffled.length}문${dist ? ` (${dist})` : ''}`, 'info', 3500);
}

function _startWeakExamImpl() {
    const STUDY_DATA = (typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {};
    // 헷갈린 카드나 오답 데이터 로딩
    let weakCards = Array.from(state.weakCards);
    let solvedQuizzes = Object.keys(state.quizResults).filter(id => !(state.quizResults[id] || {}).correct);

    // 필터링 적용 (신규 Feature 3)
    if (state.reviewFilter && state.reviewFilter !== 'all') {
        const filtered = _filterWeakForReview(weakCards, solvedQuizzes, STUDY_DATA);
        weakCards = filtered.cards;
        solvedQuizzes = filtered.quizzes;
    }

    const stmtStats = getAllStatementStats();
    const sidIndex = _buildSidIndex();
    const weakSids = Object.keys(/** @type {Object.<string,*>} */ (stmtStats))
        .filter(sid => ((/** @type {Object.<string,*>} */ (stmtStats))[sid].w || 0) > 0 && sidIndex.has(sid));

    if (weakCards.length === 0 && solvedQuizzes.length === 0 && weakSids.length === 0) {
        _toastNoWeakData();
        return;
    }

    const { pool, qsubj } = _assembleWeakPool(weakCards, solvedQuizzes, weakSids, sidIndex, STUDY_DATA);
    const { shuffled, ranked } = _pickWeakQuestions(pool, stmtStats, solvedQuizzes, weakCards, qsubj);

    // 모의고사 세션 구동
    const mockExam = {
        title: '헷갈린 문제 집중 오답 모의고사 (20제)',
        questions: shuffled
    };

    // OMR 및 타이머 제어용 데이터 이식
    _activateExamView();

    // OMR Sheet, Timer 활성화
    startSimSession(mockExam);

    _toastWeakComposition(ranked, shuffled);
}

