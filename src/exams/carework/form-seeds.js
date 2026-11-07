// src/exams/carework/form-seeds.js — 내장 실무도구 표준 양식 시드·본문 오버라이드 (CO-18)
// @spec CO-18 — 시험 전용 도메인 로직 (DA-13)
// 각 도구의 문서 본문(docMdHead·docMdSign 사이)을 {{키}} 템플릿으로 공개:
//   - 기본 양식: 도구가 생성하는 구조 블록({{기록표}} 등) — 고객이 MD로 보고 사본 편집
//   - 사본: 기관 양식 뷰에서 편집 → 커스텀 기입용으로도 사용 가능 (CO-17 파이프라인)
//   - 오버라이드: toolKey 연동 사본이 있으면 해당 도구 출력 본문이 사본 서식으로 렌더
// 템플릿의 사용자 추가 키는 도구가 값을 모르면 출력 시 공란(수기 기입란)으로 유지.
import { fillTemplate, listFormTemplates } from './form-template-store.js';

/**
 * 내장 양식 레지스트리 — block 키는 도구가 조립하는 본문(표·생성문)의 자리표시.
 * seed는 고객에게 보여줄 MD 골격: 블록 + 표준 문구 + 예시 기입란.
 */
export const TOOL_FORM_SEEDS = {
    careLog: {
        title: '요양보호 서비스 기록', block: '기록내용',
        // 실제 양식의 필드명을 {{키}}로 노출 — 스칼라는 생성기가 주입, 블록은 서비스·특이사항 등 조립 영역
        seed: '일시: {{일시}}\n대상자: {{client}} 님\n급여 종류: {{급여종류}}\n\n{{기록내용}}\n\n비고: {{비고}}',
    },
    careVisit: {
        title: '면회·방문 기록', block: '기록표',
        seed: '{{기록표}}\n\n비고: {{비고}}',
    },
    careHandover: {
        title: '인수인계서', block: '인계내용',
        seed: '일시: {{일시}}\n인계자: {{인계자}}\n인수자: {{인수자}}\n대상자: {{대상자}}\n\n{{인계내용}}\n\n비고: {{비고}}',
    },
    careIncident: {
        title: '사고·낙상 보고서', block: '보고내용',
        // 사고보고서는 전 항목 스칼라 — 필드 전부 세분화 노출
        seed: '발생 일시: {{발생일시}}\n대상자: {{client}}\n발생 장소: {{발생장소}}\n사고 유형: {{사고유형}}\n중증도: {{중증도}}\n발생 경위: {{발생경위}}\n조치 내용: {{조치내용}}\n목격자: {{목격자}}\n가족 통지: {{가족통지}}\n\n비고: {{비고}}',
    },
    careAudit: {
        title: '기관 평가 점검표', block: '점검표',
        seed: '{{점검표}}\n\n비고: {{비고}}',
    },
    careRoster: {
        title: '교대 근무표', block: '근무표',
        seed: '{{근무표}}\n\n비고: {{비고}}',
    },
};

/** toolKey 연동 사용자 사본 조회 — 로컬 템플릿 중 toolKey가 일치하는 첫 항목 */
export function toolOverride(toolKey) {
    const t = listFormTemplates().find(x => x.toolKey === toolKey);
    return t ? t.body : null;
}

/**
 * 도구 본문 렌더 — toolKey 연동 사본이 있으면 사본 서식, 없으면 기본(블록 그대로).
 * values에 블록 키(기록표 등) + 선택 시스템 보조값을 넣으면 fillTemplate이 치환한다.
 * @param {string} toolKey @param {Object<string,string>} values
 */
export function renderToolBody(toolKey, values = {}) {
    const def = TOOL_FORM_SEEDS[toolKey];
    const body = toolOverride(toolKey) ?? `{{${def.block}}}`;
    return fillTemplate(body, values, 'md', new Set([def.block]));
}
