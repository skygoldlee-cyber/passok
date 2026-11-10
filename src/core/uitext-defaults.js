// src/core/uitext-defaults.js — 플랫폼 공통 UI 텍스트 기본값
// @spec DA-12
// manifest.uiText > 공통 기본값 > 템플릿 정적 문구 순으로 해석한다.
// 공통 뷰(대시보드·카드·퀴즈 등) 라벨은 여기 선언으로 전 시험이 정합되고,
// 시험 팩은 커스텀이 필요한 키만 manifest.uiText에 둔다 (미선언 시 표준 라벨).
// dictionary·formula-manual 등 시험별 명칭이 다른 키는 중립 기본값만 둔다.
// 순수 데이터 모듈 — tools/check/check_uitext.js가 동적 import로 교차 검증한다.

/**
 * @type {Object.<string, Object.<string, string>>}
 * title = 긴 라벨(사이드바·뷰 타이틀), nav = 짧은 라벨(탭바·내비), subtitle = 뷰 부제
 */
export const COMMON_UITEXT = {
    dashboard: { title: '학습 대시보드', nav: '대시보드' },
    analysis: { title: '학습진단', nav: '학습진단', subtitle: '학습 기록을 바탕으로 약점을 분석하여 학습 우선순위를 진단합니다' },
    flashcard: { title: '플래시카드', nav: '카드', subtitle: '과목별 핵심 개념을 카드로 뒤집으며 암기' },
    quiz: { title: '퀴즈', nav: '퀴즈', subtitle: '빈칸 채우기형 퀴즈로 실전 완벽 대비' },
    review: { title: '오답 및 중요 복습', nav: '복습', subtitle: '헷갈리거나 어려운 약점 카드 집중 복습' },
    trainer: { title: '훈련소', subtitle: '수치 암기·판정·실전 연습 트레이닝 센터' },
    exam: { title: '실전 모의고사', nav: '모의고사', subtitle: '문제은행으로 과목별 모의고사 및 학습안내서 열람' },
    textbook: { title: '교재검색', subtitle: '교재 본문과 참조자료를 실시간 키워드로 검색' },
    'textbook-reader': { title: '교재리더', subtitle: '과목을 선택하여 교재 본문을 읽기' },
    dictionary: { title: '사전', nav: '사전', subtitle: '지식DB 항목 검색' },
    calendar: { title: '캘린더' },
    manual: { title: '매뉴얼' },
    'formula-manual': { title: '실무 매뉴얼', nav: '매뉴얼' },
    'practice-manual': { title: '실무 매뉴얼', nav: '매뉴얼' },
};

/**
 * manifest.uiText를 플랫폼 공통 기본값 위에 키·필드 단위로 병합 (순수 함수).
 * @param {Object.<string, Object.<string, string>>|null|undefined} examUi
 * @returns {Object.<string, Object.<string, string>>}
 */
export function mergeUiText(examUi) {
    /** @type {Object.<string, Object.<string, string>>} */
    const out = {};
    for (const k of Object.keys(COMMON_UITEXT)) out[k] = { ...COMMON_UITEXT[k] };
    for (const [k, v] of Object.entries(examUi || {})) out[k] = { ...(out[k] || {}), ...v };
    return out;
}

/** 사용자 표시 플랜 용어 정본 — 배지·모달·토스트의 Pro 표기는 여기서만 정의 (전환 시 1곳 수정)
 *  코드 참조 시 PLAN_TERMS 사용 — 리터럴 '유료' 대신 일관 유지. */
export const PLAN_TERMS = Object.freeze({
    badge: '유료',          // pro-badge 표시 문자
    plan: '유료',
    free: '무료',
    period: '유료 기간권',
    activate: '유료 활성화',
    compare: '무료 / 유료 비교',
    exclusive: '유료 전용',
    feature: '유료 기능',
});
