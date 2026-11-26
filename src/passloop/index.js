// src/passloop/index.js — PassLoop 학습엔진 공개 API (AI-40·41)
// @spec AI-40
// @spec AI-41
//
// 엔진 경계의 유일 진입점 — 어댑터(src/study/ 잔류 계층)·뷰는 이 모듈의
// export만 소비한다. 코어는 외부 import 금지 (어댑터→엔진 단방향, §3.7).
// 설계: docs/dev/design/AI_PERSONALIZATION_DESIGN.md (DOC-DSN-56)

export {
    MASTERY_GRADES,
    MASTERY_DEFAULTS,
    collectConceptStats,
    computeConceptTotals,
    computeMastery,
    nextActions,
} from './core/mastery.js';

export {
    PROFILE_DEFAULTS,
    recordConcept,
    topWeakConcepts,
} from './core/learner-profile.js';
