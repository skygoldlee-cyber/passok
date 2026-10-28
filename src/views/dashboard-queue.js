// src/views/dashboard-queue.js — "오늘 할 일" 단일 큐 (TQ-01~05, DOC-DSN-21)
// @spec TQ-01,TQ-02,TQ-03,TQ-05,D-23,PS-01,PS-03,PS-10
//
// 모든 추천 소스의 출력을 하나의 우선순위 큐로 병합한다.
// 큐 빌드(buildTodayQueue)는 DOM 비의존 순수 로직 — 렌더는 renderTodayQueue가 담당.
// 추천·배분 알고리즘 자체는 변경하지 않고 노출 채널만 단일화한다.

import { state } from '../state.js';
import { esc } from '../sanitize.js';
import { safeGetItem } from '../state.js';
import { DataLoader } from '../data-loader.js';
import { getDueCards, getExamRiskCards, EXAM_R_WINDOW_DAYS, EXAM_R_SESSION_CAP } from '../spaced-repetition.js';
import { getWeakStatements } from '../statement-tracker.js';
import {
    getStudyCalendar, computeStudyPlan, computeSubjectAllocation,
    computeSubjectAllocInputs, sumRecentCardsBySubject, sumRecentQuizzesBySubject,
    getDDay, getStudyGoals, examWeightBySubject, selectExamRiskSession
} from '../study-tracker.js';
import { computeRecommendations, snapshotRecommendations, evaluateRecommendationEffect } from '../recommendations.js';
import { buildTodayQueue as buildPersonalQueue } from '../personalization.js';
import { weakClusters } from './personalization-view.js';
import { getSubjCounts, displayCounts } from './subject-stats.js';
import { subjectKeyFromItemId } from '../weak-items.js';
import { todayKey } from '../utils.js';
import { dailyCompletedKey } from '../storage-keys.js';

const MAX_PLAN_ITEMS = 2; // 주간 배정 큐 항목 상한 — 과목 나열은 최대 2개

/**
 * 오늘 할 일 큐 생성 — 모든 추천 소스를 우선순위 병합 (TQ-01·TQ-02).
 * @param {Object} p
 * @param {string[]} [p.dueCardIds] FSRS 기한 도래 카드 id
 * @param {Array} [p.subjects] 과목 메타 [{key, name, stats}]
 * @param {Array} [p.recs] computeRecommendations 결과 (흡수 대상 — TQ-01)
 * @param {Array} [p.allocRemaining] 주간 배정 잔여 [{key,name,cardsLeft,quizzesLeft}]
 * @param {number} [p.reviewCount] 복습 대기(오답+헷갈림) 수
 * @param {number} [p.weakStatementCount] 취약 진술 수
 * @param {boolean} [p.dailyDone] 일일 챌린지 완료 여부
 * @param {number|null} [p.dday] 시험 D-day (미설정 null)
 * @param {string[]} [p.examRiskIds] 시험일 기억률 미달 카드 id — R_exam 오름차순·세션 상한 적용분 (D-19)
 * @param {boolean} [p.hasProgress] 학습 이력 존재 여부
 * @param {Array} [p.behindSubjects] 계획 밀림 과목 [{key,name,daysBehind}] — PS-03 우선순위 입력
 * @param {number} [p.unlearnedCount] 미학습 카드 수 — PS-03 우선순위 입력
 * @param {Object} [p.topCluster] 최다 오개념 클러스터 (weakClusters()[0] — PS-01·PS-10 클리닉 항목)
 * @returns {Array<{icon:string, color:string, title:string, reason:string,
 *   actions:Array<{click:string, arg?:string, args?:Array, label:string, icon:string, cls:string}>}>}
 */
export function buildTodayQueue(p = {}) {
    const items = [];
    const used = new Set(); // `click:arg` 중복 방지 — 같은 실행을 두 번 권하지 않음
    const subjName = (key) => {
        const s = (p.subjects || []).find(x => x.key === key);
        return s ? s.name : key;
    };
    const push = (item) => {
        const key = item.actions[0] ? `${item.actions[0].click}:${item.actions[0].arg || ''}` : item.title;
        if (used.has(key)) return;
        used.add(key);
        items.push(item);
    };

    // ⓪ 시험일 미설정 — 역산 계획·주간 배분의 전제 조건이라 최우선.
    // D-day 카드의 중복 설정 버튼은 제거 — 설정 액션은 이 큐가 단독 소유한다
    if (p.dday === null) {
        push({
            kind: 'goal',
            icon: 'fa-calendar-day', color: 'var(--color-primary)',
            title: '시험일 설정',
            reason: '학습 계획의 시작점 — 역산 계획·주간 목표가 생성됩니다',
            actions: [{ click: 'openGoalSettings', label: '지금 설정', icon: 'fa-gear', cls: 'btn-primary' }]
        });
    }

    // ① FSRS 기한 도래 — 시간 민감, 최우선
    const due = p.dueCardIds || [];
    if (due.length) {
        const bySubj = {};
        due.forEach(id => {
            const k = subjectKeyFromItemId(id);
            if (k) bySubj[k] = (bySubj[k] || 0) + 1;
        });
        const top = Object.entries(bySubj).sort((a, b) => b[1] - a[1])[0];
        push({
            kind: 'due',
            icon: 'fa-clock', color: 'var(--color-primary)',
            title: `복습 카드 ${due.length}장`,
            reason: top ? `FSRS 복습 시간 도래 — ${subjName(top[0])} ${top[1]}장 포함` : 'FSRS 복습 시간 도래',
            actions: [{ click: 'startDueReview', label: '지금 복습', icon: 'fa-play', cls: 'btn-primary' }]
        });
    }

    // ② 과락·위험 추천 — 기존 엔진의 위험 신호는 계획보다 우선
    const dangerRecs = (p.recs || []).filter(r => r.icon === 'fa-triangle-exclamation');
    dangerRecs.forEach(r => push({ kind: 'danger', ...r }));

    // ③ 주간 배정 잔여 — 주간 배분(구 스마트학습, study_plan_pro) 이번 주 목표 미달분
    (p.allocRemaining || [])
        .filter(a => a.cardsLeft > 0 || a.quizzesLeft > 0)
        .slice(0, MAX_PLAN_ITEMS)
        .forEach(a => {
        const parts = [];
        if (a.cardsLeft > 0) parts.push(`카드 ${a.cardsLeft}장`);
        if (a.quizzesLeft > 0) parts.push(`퀴즈 ${a.quizzesLeft}문`);
        const actions = [];
        if (a.cardsLeft > 0) actions.push({ click: 'startSubjectStudy', arg: a.key, label: '카드 학습', icon: 'fa-layer-group', cls: 'btn-primary' });
        if (a.quizzesLeft > 0) actions.push({ click: 'startSubjectQuiz', arg: a.key, label: '퀴즈', icon: 'fa-play', cls: 'btn-secondary' });
        push({
            kind: 'alloc',
            icon: 'fa-calendar-check', color: 'var(--color-primary)',
            title: `${a.name} 주간 배정 잔여`,
            reason: `이번 주 목표 미달 — ${parts.join(' · ')} 남음`,
            actions
        });
    });

    // ④ 오답·헷갈림 재채점
    if ((p.reviewCount || 0) > 0) {
        push({
            kind: 'review',
            icon: 'fa-star', color: 'var(--color-warning)',
            title: `복습 대기 ${p.reviewCount}건`,
            reason: '틀린 문제·헷갈린 카드 재채점',
            actions: [{ click: 'switchView', args: ['review-view', { scrollTop: true }], label: '복습 열기', icon: 'fa-arrow-right', cls: 'btn-primary' }]
        });
    }

    // ⑤ 취약 진술·혼동쌍 드릴
    if ((p.weakStatementCount || 0) > 0) {
        push({
            kind: 'weak',
            icon: 'fa-dumbbell', color: 'var(--color-warning)',
            title: `취약 진술 ${p.weakStatementCount}개`,
            reason: '혼동쌍·오판 진술 — 연속 정답 3회 시 졸업',
            actions: [{ click: 'gotoWeakReview', label: '리뷰', icon: 'fa-crosshairs', cls: 'btn-primary' }]
        });
    }

    // ⑤# 무너진 개념 축 — 약점 개념 클러스터 최상위의 클리닉 진입점 (PS-01·PS-10)
    if (p.topCluster) {
        push({
            kind: 'clinic',
            icon: 'fa-flask-vial', color: 'var(--color-warning)',
            title: `오개념 클리닉: ${p.topCluster.label}`,
            reason: `같은 개념 축 ${p.topCluster.size}개 진술에서 ${p.topCluster.totalWrong}회 오판 — 개념 단위 복습 권장`,
            actions: [{ click: 'switchView', args: ['analysis-view', { scrollTop: true }], label: '진단 보기', icon: 'fa-stethoscope', cls: 'btn-primary' }]
        });
    }

    // ⑤+ 시험일 목표 R 최종 인출 — 다음 복습이 시험일 이후인 스케줄 사각지대 카드 (D-19)
    const examRisk = p.examRiskIds || [];
    if (p.dday !== null && p.dday !== undefined && p.dday >= 0 && p.dday <= EXAM_R_WINDOW_DAYS && examRisk.length) {
        push({
            kind: 'examr',
            icon: 'fa-bullseye', color: 'var(--color-danger)',
            title: `시험 전 최종 인출 ${examRisk.length}장`,
            reason: '시험일까지 기억률 95% 미만 예상 — 지금 한 번 더 인출',
            actions: [{ click: 'startExamRiskReview', label: '인출 세션', icon: 'fa-play', cls: 'btn-primary' }]
        });
    }

    // ⑥ 잔여 추천 — 정답률 최저·헷갈림 집중·미학습 (중복 실행 제외)
    (p.recs || [])
        .filter(r => r.icon !== 'fa-triangle-exclamation' && r.icon !== 'fa-clock')
        .forEach(r => push({ kind: 'rec', ...r }));

    // TQ-05 빈 큐 — 학습 이력이 없으면 시작 안내 항목으로 대체 (챌린지보다 우선).
    // goal 항목은 안내성이라 작업 항목 유무 판정에서 제외한다
    if (!items.some(i => i.kind !== 'goal') && !p.hasProgress) {
        const first = (p.subjects || [])[0];
        if (first) {
            items.push({
                kind: 'start',
                icon: 'fa-seedling', color: 'var(--color-success)',
                title: `첫 학습 시작: ${first.name}`,
                reason: '카드 학습으로 진단 데이터를 쌓으면 맞춤 큐가 정확해집니다',
                actions: [{ click: 'startSubjectStudy', arg: first.key, label: '학습 시작', icon: 'fa-seedling', cls: 'btn-secondary' }]
            });
        }
    }

    // ⑦ 일일 챌린지 미완료 — 습관 유지 항목은 후순위
    if (p.dailyDone === false) {
        push({
            kind: 'daily',
            icon: 'fa-calendar-day', color: 'var(--color-success)',
            title: '일일 챌린지 미완료',
            reason: '5분 압축 세트 — 오늘의 학습 습관 유지',
            actions: [{ click: 'startDailyChallenge', label: '챌린지', icon: 'fa-play', cls: 'btn-success' }]
        });
    }

    // PS-03 — 통합 학습 큐 우선순위 정렬 엔진. personalization.buildTodayQueue가
    // 계획 밀림(최우선)→SRS 대기→취약 진술→미학습의 유형별 우선순위를 결정하면,
    // 로컬 고유 항목(goal·danger·examr·review·clinic·rec·start·daily)은
    // 고정 우선순위로 사이에 배치해 최종 순서를 만든다 (안정 정렬 — 동순위는 생성 순).
    const personal = buildPersonalQueue({
        dueCount: due.length,
        weakCount: p.weakStatementCount || 0,
        behindSubjects: p.behindSubjects || [],
        unlearnedCount: p.unlearnedCount || 0
    });
    const behindPrio = new Map();
    let srsPrio = 0, weakPrio = 0;
    personal.forEach(i => {
        if (i.type === 'behind') behindPrio.set(i.payload.key, i.priority);
        else if (i.type === 'srs') srsPrio = i.priority;
        else if (i.type === 'weak') weakPrio = i.priority;
    });
    // PS-03 미관할 항목의 고정 우선순위 — 기존 상대 순서(due>danger>review>weak>examr>rec>start/daily) 보존
    const FIXED_PRIO = {
        goal: 1000, danger: 79, review: 70, clinic: 65, examr: 55, rec: 50, daily: 10, start: 5
    };
    const prioMap = new Map();
    items.forEach(it => {
        // alloc: 밀림 데이터가 있을 때만 개인화 우선순위(90+일수)로 승격 — 없으면 기존 위치(danger 아래)
        prioMap.set(it, it.kind === 'alloc' ? (behindPrio.get(it.actions[0] && it.actions[0].arg) ?? 78)
            : it.kind === 'due' ? (srsPrio || 80)
            : it.kind === 'weak' ? (weakPrio || 60)
            : (FIXED_PRIO[it.kind] ?? 40));
    });
    items.sort((a, b) => (prioMap.get(b) || 0) - (prioMap.get(a) || 0));

    return items;
}

/** 직전 렌더의 큐 길이 — 완료 전이(>0→0) 시에만 축하 펄스를 1회 부착 (UX-FB-08) */
let _prevQueueLen = null;

/**
 * 입력 수집 + 큐 렌더 — 기존 weak-subject-recommendation 컨테이너 재사용 (TQ-03).
 * @param {Array} subjects 과목 메타 목록
 */
export function renderTodayQueue(subjects) {
    const recEl = document.getElementById('weak-subject-recommendation');
    if (!recEl) return;
    const prevLen = _prevQueueLen; // 완료 전이 감지용 — 렌더 직전 큐 길이 (UX-FB-08)

    const counts = getSubjCounts();
    const dueCardIds = getDueCards();

    // 주간 배정 잔여 — 시험일 설정 시에만 계획 존재 (computeStudyPlan은 D-day 없으면 null)
    let allocRemaining = [];
    const totalCards = subjects.reduce((s, x) => s + displayCounts(x).cards, 0);
    const plan = computeStudyPlan(totalCards - state.memorizedCards.size);
    if (plan) {
        const inputs = computeSubjectAllocInputs({
            memorizedCards: state.memorizedCards,
            quizResults: state.quizResults,
            weakCards: state.weakCards,
            exams: (DataLoader.registry && DataLoader.registry.exams) || [],
            wrongCauses: state.wrongCauses,
            dueCardIds: dueCardIds
        });
        const alloc = computeSubjectAllocation(plan, subjects, inputs);
        if (alloc && alloc.thisWeek) {
            const cal = getStudyCalendar();
            const doneC = sumRecentCardsBySubject(cal);
            const doneQ = sumRecentQuizzesBySubject(cal);
            allocRemaining = alloc.thisWeek.alloc.map(a => ({
                key: a.key, name: a.name,
                cardsLeft: Math.max(0, a.cards - (doneC[a.key] || 0)),
                quizzesLeft: Math.max(0, (a.quizzes || 0) - (doneQ[a.key] || 0))
            })).filter(a => a.cardsLeft > 0 || a.quizzesLeft > 0);
        }
    }

    const recs = computeRecommendations(subjects, counts);
    const hasProgress = subjects.some(s => {
        const c = counts[s.key];
        return c && (c.mem > 0 || c.quizSolved > 0);
    });

    const dday = getDDay();
    // D-23 — 세션 상한 초과 시 과목별 출제 비중 층화로 절단 (전역 R 절단의 과락 사각 차단)
    const examRiskIds = selectExamRiskSession(
        getExamRiskCards(dday), EXAM_R_SESSION_CAP,
        examWeightBySubject((DataLoader.registry && DataLoader.registry.exams) || [])
    ).map(r => r.id);
    // PS-03 우선순위 입력 — 잔여 배정량을 일일 목표로 환산해 밀림 일수 추정.
    // 1일치 미만 잔여는 주 초반 정상 배정 잔여이므로 밀림으로 취급하지 않는다
    // (≥2일치 = 실질 계획 지연이 있을 때만 최우선 승격 — 정상 잔여는 기존 순위 유지)
    const dailyCards = Math.max(1, getStudyGoals().dailyCards || 1);
    const behindSubjects = allocRemaining.map(a => ({
        key: a.key, name: a.name,
        daysBehind: Math.ceil((a.cardsLeft + (a.quizzesLeft || 0)) / dailyCards)
    })).filter(s => s.daysBehind >= 2);
    const items = buildTodayQueue({
        dueCardIds, subjects, recs, allocRemaining,
        reviewCount: state.weakCards.size,
        weakStatementCount: getWeakStatements().length,
        dailyDone: !!safeGetItem(dailyCompletedKey(todayKey())),
        dday,
        examRiskIds,
        hasProgress,
        behindSubjects,
        unlearnedCount: Math.max(0, totalCards - state.memorizedCards.size),
        topCluster: weakClusters()[0] || null
    });

    _prevQueueLen = items.length;

    if (!items.length) {
        // UX-FB-08 — 큐가 있던 상태에서 비워지는 전이에만 축하 펄스 1회 부착
        const celebrate = prevLen !== null && prevLen > 0 ? ' is-celebrate' : '';
        recEl.innerHTML = `<p class="rec-empty${celebrate /*esc-ok — 내부 고정 클래스 리터럴(' is-celebrate' 또는 '')*/}"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> 오늘의 목표를 모두 달성했습니다 — 수고하셨습니다!</p>`;
        return;
    }

    // 추천 효과 추적 (AN-06) — 기존 엔진 출력 기준선 유지
    const nameOf = (k) => { const s = subjects.find(x => x.key === k); return s ? s.name : k; };
    const effect = evaluateRecommendationEffect(counts, nameOf);
    snapshotRecommendations(recs, counts);

    let html = '';
    if (effect) {
        const parts = effect.items.map(i =>
            `${esc(i.name)} ${i.fromRate}%→${i.toRate}% (${i.delta >= 0 ? '▲' : '▼'}${Math.abs(i.delta)}%p)`);
        html += `<p class="rec-effect"><i class="fa-solid fa-chart-line" aria-hidden="true"></i> 지난 추천 이후 ${parts.join(' · ')}</p>`;
    }
    html += '<ol class="rec-list today-queue">';
    items.forEach((item, i) => {
        const actions = item.actions.map(a => {
            const argsAttr = a.args ? ` data-args='${esc(JSON.stringify(a.args))}'` : (a.arg !== undefined ? ` data-arg="${esc(a.arg)}"` : '');
            return `<button class="btn btn-sm ${a.cls}" data-click="${a.click}"${argsAttr}><i class="fa-solid ${a.icon}"></i> ${esc(a.label)}</button>`;
        }).join('');
        html += `
            <li class="rec-item tq-item">
                <span class="tq-num" aria-hidden="true">${i + 1}</span>
                <i class="fa-solid ${item.icon}" style="color:${item.color};"></i>
                <span class="rec-text"><strong>${esc(item.title)}</strong><span class="rec-reason">${esc(item.reason)}</span></span>
                <div class="rec-actions">${actions}</div>
            </li>
        `;
    });
    html += '</ol>';
    recEl.innerHTML = html;
}
