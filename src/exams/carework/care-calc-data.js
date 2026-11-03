// src/exams/carework/care-calc-data.js — 장기요양 비용 계산 상수
// @spec none — 시험 전용 도메인 데이터 (DA-13)
//
// 법령 출처 (content/exams/carework/참조자료/ref_md/과목1/):
//   - 본인부담률: 노인장기요양보험법 제40조 — 재가 15%·시설 20%
//   - 월 한도액: 장기요양급여 제공기준 및 급여비용 산정방법 고시 제13조(별표는 이미지)
//   - 감경률: 장기요양 본인부담금 감경에 관한 고시 — 대상별 60%·40%·수급자 0원
// 한도액은 2026년 고지값 — 고시 별표(이미지) 갱신 시 수치·EFFECTIVE_YEAR 함께 업데이트
export const EFFECTIVE_YEAR = 2026;
export const GRADE_LIMITS = [
    { key: 'g1', label: '1등급', home: 2512900 },
    { key: 'g2', label: '2등급', home: 2331200 },
    { key: 'g3', label: '3등급', home: 1528200 },
    { key: 'g4', label: '4등급', home: 1409700 },
    { key: 'g5', label: '5등급', home: 1208900 },
    { key: 'gc', label: '인지지원등급', home: 676320 },
];
export const SELF_PAY_RATE = { home: 0.15, facility: 0.20 };
// 시설급여 1일당 수가 (2026 — 요양보호사 배치기준별, 인지지원등급은 재가 전용이라 시설 수가 없음)
export const FACILITY_TYPES = [
    { key: 'nursing', label: '노인요양시설 (요양보호사 2.1:1)', rates: { g1: 93070, g2: 86340, g3: 81540, g4: 81540, g5: 81540 } },
    { key: 'shared', label: '노인요양공동생활가정 (3:1)', rates: { g1: 74590, g2: 69210, g3: 63800, g4: 63800, g5: 63800 } },
];
export const REDUCTIONS = [
    { key: 'none', label: '일반', rate: 0 },
    { key: 'r40', label: '감경 40%', rate: 0.40 },
    { key: 'r60', label: '감경 60%', rate: 0.60 },
    { key: 'basic', label: '기초생활수급자', rate: 1 },
];
