// src/exams/carework/care-admit.js — 입소 서류 체크리스트 도메인
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 노인복지법·장기요양보험법 시행규칙 근거의 구비서류 목록 + 체크 상태 로컬 저장
import { getJSON, setJSON } from '../../core/storage.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';

export const ADMIT_SECTIONS = [
    { title: '공단 발급 서류', items: [
        { id: 'a-cert', label: '장기요양인정서 — 1·2등급 시설급여, 3~5등급은 시설급여 인정 필요', },
        { id: 'a-plan', label: '개인별 장기요양 이용계획서 — 인정서와 함께 공단 발송' },
    ]},
    { title: '건강 서류', items: [
        { id: 'a-health', label: '건강진단서 — 결핵·B형간염 등 전염성 질환, 입소일 기준 1개월 이내' },
        { id: 'a-rx', label: '복용약 처방전·의사소견서' },
        { id: 'a-prehealth', label: '사전 건강조사표 (시설 양식)' },
    ]},
    { title: '신분·가족 서류', items: [
        { id: 'a-resident', label: '주민등록등본 — 입소자·보호자 각 1부' },
        { id: 'a-family', label: '가족관계증명서 — 입소자 명의 발급' },
        { id: 'a-id', label: '신분증·도장 — 입소자·보호자' },
        { id: 'a-bank', label: '통장 사본 — 결제 계좌' },
    ]},
    { title: '의료급여 해당자', items: [
        { id: 'a-medaid', label: '수급자 증명서·의료급여증 사본' },
        { id: 'a-request', label: '시·군·구 입소 의뢰서 — 의료급여 수급권자는 시설 직접 계약 불가' },
    ]},
    { title: '계약·수령 확인', items: [
        { id: 'a-apply', label: '입소신청서·개인정보 수집이용 동의서 작성' },
        { id: 'a-contract', label: '표준장기요양 이용계약서 1부 교부받음 — 시행규칙 §16①' },
        { id: 'a-consent', label: '급여 제공계획·비급여 비용 설명 후 동의서 서명 — §16③' },
    ]},
];

const KEY = STORAGE_KEYS.ADMIT_CHECKS;
export function loadChecks() { return getJSON(KEY) || {}; }
export function toggleCheck(id) {
    const c = loadChecks();
    c[id] = !c[id];
    if (!c[id]) delete c[id];
    setJSON(KEY, c);
}
export function clearChecks() { setJSON(KEY, {}); }
export function admitProgress() {
    const c = loadChecks();
    let done = 0, total = 0;
    for (const s of ADMIT_SECTIONS) for (const i of s.items) { total++; if (c[i.id]) done++; }
    return { done, total };
}
