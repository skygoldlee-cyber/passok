// views/exam-sim-draft.js - 실전 모의고사 임시 세션(드래프트) 저장·배너 (E-05)
// @spec E-05
//
// SIM_DRAFT_SESSION의 읽기·쓰기·배너 표시 — 뷰 렌더링(arena)을 참조하지 않는
// 순수 저장소 모듈이라 arena → draft 단방향 의존이 유지된다.
// 세션 복구(resumeSimDraft)·나가기(exitSimArena)는 렌더가 필요해
// exam-sim-session.js에 있다.

import { safeGetItem, safeSetItem, safeRemoveItem } from '../../state.js';
import { fmtMMSS } from '../../utils.js';
import { STORAGE_KEYS } from '../../storage-keys.js';
import { simState } from './exam-sim-state.js';

export function saveSimDraft() {
    if (!simState.data || !simState.data.questions) return;
    const draft = {
        examId: simState.examId,
        examTitle: simState.data.title,
        timeLeft: simState.timeLeft,
        userAnswers: simState.userAnswers,
        currentIndex: simState.currentIndex,
        questions: simState.data.questions
    };
    safeSetItem(STORAGE_KEYS.SIM_DRAFT_SESSION, JSON.stringify(draft));
}

export function clearSimDraft() {
    safeRemoveItem(STORAGE_KEYS.SIM_DRAFT_SESSION);
    const banner = document.getElementById('draft-resume-banner');
    if (banner) banner.classList.add('is-hidden');
}

export function checkExamDraft() {
    const banner = document.getElementById('draft-resume-banner');
    if (!banner) return;

    const saved = safeGetItem(STORAGE_KEYS.SIM_DRAFT_SESSION);
    if (saved) {
        try {
            const draft = JSON.parse(saved);

            const titleEl = document.getElementById('draft-banner-title');
            const descEl = document.getElementById('draft-banner-desc');

            if (titleEl) titleEl.textContent = `📝 진행 중인 모의고사: ${draft.examTitle}`;
            if (descEl) descEl.textContent = `이전 진행 상태 복구 가능 (남은 시간: ${fmtMMSS(draft.timeLeft)}, 풀이한 문항: ${Object.keys(draft.userAnswers).length}/${draft.questions.length})`;

            banner.classList.remove('is-hidden');
        } catch(e) {
            banner.classList.add('is-hidden');
        }
    } else {
        banner.classList.add('is-hidden');
    }
}
