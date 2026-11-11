// tests/e2e/support/exam-matrix.js — 시험 팩 기능 매트릭스 (J-500 적합성 스위트 입력)
// @spec none
//
// content/exams.json의 팩 목록·features 플래그를 읽어 스펙이 팩당 테스트를 동적 생성
// 하게 한다. 신규 팩 온보딩 시 스펙 수정 없이 자동 편입된다.
// 실무 피처 슬러그 맵의 정본은 src/practice-registry.js — 키 추가·슬러그 변경 시
// 이 표를 함께 갱신할 것 (불일치는 스위트가 뷰 미렌더로 감지).

import fs from 'node:fs';
import path from 'node:path';

const EXAMS_JSON = path.resolve(process.cwd(), 'content', 'exams.json');

/**
 * 빌드된 과목 레지스트리(data/exams/<id>/registry.js — git 미추적 생성물)에서
 * 콘텐츠 기대치를 읽는다. 번들 미빌드 시 null → 스펙은 UI 탐색 폴백을 쓴다.
 *
 * - quizSubjects: stats.quizzes > 0 인 과목 수 — '퀴즈'(빈칸 채우기) 표면 기대치.
 *   0이면 그 팩은 퀴즈 콘텐츠를 저작하지 않는 것이며 빈 뱅크는 정상 상태다.
 * - examBanks: exams[] 문제은행 번들 수 — '실전 모의고사' 표면 기대치.
 *   active 티어는 check:onboard가 과목당 문항 수를 강제하므로 사실상 항상 >0.
 */
function readRegistry(examId) {
    const p = path.resolve(process.cwd(), 'data', 'exams', examId, 'registry.js');
    if (!fs.existsSync(p)) return null;
    const src = fs.readFileSync(p, 'utf8');
    // 'var X = {…}; if (typeof window…' 형태 — 첫 객체 리터럴만 균형 스캔으로 추출
    let depth = 0, inStr = false, esc = false, end = -1;
    const start = src.indexOf('{');
    for (let i = start; i < src.length; i++) {
        const c = src[i];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) { end = i + 1; break; }
    }
    const json = src.slice(start, end);
    try {
        const reg = JSON.parse(json);
        const subjects = reg.subjects || [];
        const exams = reg.exams || [];
        // 통합 모의고사는 "모든 과목"에 문항이 있어야 시작된다 (exam-sim-session.js
        // missingSubjects 가드) — 과목별 문항>0 뱅크 매핑으로 사전 판정한다.
        const covered = new Set(exams.filter((e) => (e.stats?.questions || 0) > 0).map((e) => e.subject));
        return {
            quizSubjects: subjects.filter((s) => (s.stats?.quizzes || 0) > 0).length,
            examBanks: exams.length,
            // 앱과 동일 판정(app-dashboard.js): 카드는 questionsPerSubject 맵이
            // 있을 때만 노출 — 구형 subjects[] 배열 스키마는 비노출(정상)이다.
            hasIntegrated: !!(reg.integratedExam && reg.integratedExam.questionsPerSubject),
            simCovered: subjects.length > 0 && subjects.every((s) => covered.has(s.key)),
        };
    } catch {
        return null;
    }
}

/** @type {{id:string, name:string, tier:string, features:Object<string, boolean>, registry:Object|null}[]} */
export const EXAMS = JSON.parse(fs.readFileSync(EXAMS_JSON, 'utf8')).exams
    .map(({ id, name, tier, features }) => ({ id, name, tier, features: features || {}, registry: readRegistry(id) }));

/** 실무 피처 키 → 라우트 슬러그 (정본: src/practice-registry.js PRACTICE_FEATURES) */
export const PRACTICE_SLUGS = {
    formula: 'formula',
    careHome: 'care-home',
    careCalc: 'care-calc',
    careCard: 'care-card',
    careLog: 'care-log',
    careWebtoon: 'care-webtoon',
    careFlow: 'care-flow',
    careAudit: 'care-audit',
    careHandover: 'care-handover',
    careVisit: 'care-visit',
    careClients: 'care-client',
    careIncident: 'care-incident',
    careRoster: 'care-roster',
    careFinder: 'care-finder',
    careForms: 'care-forms',
    careCustomForm: 'care-custom-form',
    careFacilityJoin: 'facility-join',
    careFacilityAdmin: 'facility-admin',
};

/**
 * 시드 스크립트 — 온보딩·시험 선택을 건너뛰고 해당 시험으로 부팅한다.
 * ui_mode는 'study' 기본 — 실무 피처 뷰는 해시 라우트로도 진입된다.
 */
export function examSeed(examId, { uiMode = 'study' } = {}) {
    return `(() => {
        const L = localStorage;
        L.setItem('current_exam', '${examId}');
        L.setItem('onboarding_seen_v1', '1');
        L.setItem('${examId}:onboarding_seen_v1', '1');
        L.setItem('telemetry_notice_shown', '1');
        L.setItem('ui_mode', '${uiMode}');
        // Pro 배지 첫 진입 안내(#pro-upgrade-overlay)를 해제된 상태로 —
        // 비차단 안내지만 오버레이가 이후 클릭을 가로막아 CRUD 스펙이 멈춘다.
        // 안내 모달 자체의 계약은 J-203이 검증한다.
        L.setItem('pro_notice_seen', '{"_global":"2026-01-01T00:00:00"}');
    })()`;
}
