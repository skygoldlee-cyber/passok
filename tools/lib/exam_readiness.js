/**
 * exam_readiness.js — 시험 팩 준비도 측정 공유 모듈
 *
 * @spec DA-06,ES-01
 *
 * check_exam_onboard.js(승격 게이트)와 tools/audit 스코어카드가 동일 실측을
 * 공유한다 — 기준 상수·문항 실측·교재 본문량의 정본. 판정(오류/경고 부여·
 * grandfathered 완화)은 호출부 책임이며 여기서는 측정값만 만든다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/** 정식 승격 정량 기준 — 과목당 모의고사 N회분 문항 (manifest exams 파일 ###Q 실측).
 *  과목당 출제 문항 수는 manifest.integratedExam.questionsPerSubject 선언 우선,
 *  미선언 시 DEFAULT_Q_PER_SUBJECT로 간주한다. */
const MOCK_ROUNDS_REQUIRED = 3;
const MOCK_ROUNDS_RECOMMENDED = 6;
const DEFAULT_Q_PER_SUBJECT = 20;
/** 정식 승격 팩 과목별 표준형 교재 최소 본문량 — 비공백 문자 기준.
 *  ~A4 13쪽 분량. 시중 수험서 절당 4쪽·최소 5절 구성을 하한으로 삼는다. */
const MIN_TEXTBOOK_CHARS_PER_SUBJECT = 20000;

/** 성숙도 티어 — draft(선언) < pilot(출제기준+표준형 챕터) < active(pilot+과목당 ≥최소 문항) */
const TIERS = ['draft', 'pilot', 'active'];
/** retired — 퇴역 팩: 성숙도 요건 면제. 빌드·기존 사용자 접근은 유지하고 승격/신규 요건 검사 대상에서만 제외 */
const VALID_TIERS = [...TIERS, 'retired'];
const tierOf = (entry) => entry.tier || (entry.comingSoon ? 'pilot' : 'active');

/** 과목 1회 출제 문항 수 — questionsPerSubject 선언 우선, 미선언 20 간주 */
const perSubjectQ = (manifest, subjKey) =>
    ((manifest.integratedExam || {}).questionsPerSubject || {})[subjKey] || DEFAULT_Q_PER_SUBJECT;

/** 과목별 요구 문항 수 — 모의고사 MOCK_ROUNDS_REQUIRED회 비반복 구성 가능량 (active 승격 기준) */
const requiredFor = (manifest, subjKey) => MOCK_ROUNDS_REQUIRED * perSubjectQ(manifest, subjKey);

/** 과목별 권장 문항 수 — 모의고사 MOCK_ROUNDS_RECOMMENDED회 비반복 구성량 (품질 권장, 비차단) */
const recommendedFor = (manifest, subjKey) => MOCK_ROUNDS_RECOMMENDED * perSubjectQ(manifest, subjKey);

/** 정식 팩 최소 sanity 바닥 — 과목당 1회분 미만이면 모의고사 1회도 비반복 구성 불가 */
const floorFor = (manifest, subjKey) => perSubjectQ(manifest, subjKey);

/** 참조자료/ref_md 하위의 출제기준 문서 경로 (파일명 매칭, 깊이 제한) */
function findSyllabusDoc(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return null;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            const found = findSyllabusDoc(path.join(dir, e.name), depth + 1);
            if (found) return found;
        } else if (e.isFile() && e.name.endsWith('.md') && e.name.includes('출제기준')) {
            return path.join(dir, e.name);
        }
    }
    return null;
}

/** 출제기준 문서가 과목|주요항목|세부내용 표 형식을 포함하는지 (감사 파싱 가능 형식) */
function hasSyllabusTable(file) {
    return /\|\s*과목\s*\|/m.test(fs.readFileSync(file, 'utf8'));
}

/** 챕터 파일 존재 + 번호 챕터 헤딩 (## N. 또는 ## Chapter NN. — 표준 규약은 Chapter NN., 이모지 접두 허용) */
function isStandardChapter(file) {
    if (!fs.existsSync(file)) return false;
    return /^##\s+(?:\S+\s+)*(?:Chapter\s+)?\d+\./m.test(fs.readFileSync(file, 'utf8').slice(0, 20000));
}

/** 문제은행 파일의 ###Q 문항 수 (check_manifest.js와 동일 규칙). 부재 시 null */
function questionCount(rootAbs, contentRoot, file) {
    const p = path.join(rootAbs, contentRoot, '문제은행', file);
    if (!fs.existsSync(p)) return null;
    return (fs.readFileSync(p, 'utf-8').match(/^###\s*Q\d+/gm) || []).length;
}

/** 주관식 문제은행 파일의 ###S 문항 수 (객관식과 동일 기준 계수용) */
function writtenCount(absPath) {
    if (!fs.existsSync(absPath)) return 0;
    return (fs.readFileSync(absPath, 'utf8').match(/^###\s*S\d+/gm) || []).length;
}

/** 과목별 표준형 교재 본문량 — manifest chapters[] 선언 파일의 비공백 문자 합계 */
function textbookChars(rootAbs, contentRoot, subject) {
    let total = 0;
    for (const c of subject.chapters || []) {
        const f = typeof c === 'string' ? c : c.file;
        if (!f) continue;
        const p = path.join(rootAbs, contentRoot, subject.dir || '', f);
        if (fs.existsSync(p)) {
            total += fs.readFileSync(p, 'utf-8')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/[#>*`\-\[\]()|]/g, '')
                .replace(/\s/g, '').length;
        }
    }
    return total;
}

module.exports = {
    MOCK_ROUNDS_REQUIRED, MOCK_ROUNDS_RECOMMENDED, DEFAULT_Q_PER_SUBJECT,
    MIN_TEXTBOOK_CHARS_PER_SUBJECT, TIERS, VALID_TIERS,
    tierOf, perSubjectQ, requiredFor, recommendedFor, floorFor,
    findSyllabusDoc, hasSyllabusTable, isStandardChapter,
    questionCount, writtenCount, textbookChars,
};
