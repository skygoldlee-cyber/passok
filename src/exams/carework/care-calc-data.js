// src/exams/carework/care-calc-data.js — 장기요양 비용 계산 상수
// @spec none — 시험 전용 도메인 데이터 (DA-13)
//
// 법령 출처 (content/exams/carework/참조자료/ref_md/과목1/):
//   - 본인부담률: 노인장기요양보험법 제40조 — 재가 15%·시설 20%
//   - 월 한도액: 장기요양급여 제공기준 및 급여비용 산정방법 고시 제13조(별표는 이미지)
//   - 감경률: 장기요양 본인부담금 감경에 관한 고시 — 대상별 60%·40%
// 한도액은 2025년 공지값 — 고시 별표(이미지) 갱신 시 수치 업데이트 필요
export const GRADE_LIMITS = [
    { key: 'g1', label: '1등급', home: 2306400 },
    { key: 'g2', label: '2등급', home: 2083400 },
    { key: 'g3', label: '3등급', home: 1485700 },
    { key: 'g4', label: '4등급', home: 1350600 },
    { key: 'g5', label: '5등급', home: 1151200 },
    { key: 'gc', label: '인지지원등급', home: 649300 },
];
export const SELF_PAY_RATE = { home: 0.15, facility: 0.20 };
export const REDUCTIONS = [
    { key: 'none', label: '일반', rate: 0 },
    { key: 'r60', label: '감경 60%', rate: 0.60 },
    { key: 'r40', label: '감경 40%', rate: 0.40 },
];
