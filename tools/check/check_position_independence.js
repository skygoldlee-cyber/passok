#!/usr/bin/env node
/**
 * check_position_independence.js — 교재 좌표 비의존 정적 게이트 (SPEC ID-05)
 *
 * 신규·수정 로직이 교재의 위치 좌표(라인 번호·배열 인덱스)를 식별자나
 * 영속 저장 키로 사용하는 것을 차단한다. AN-10(conceptId §앵커)·
 * TR-27(북마크 콘텐츠 키)으로 제거된 결함 유형의 회귀 방지:
 *   라인이 밀리거나 섹션이 재정렬되면 위치 기반 식별자는 같은 개념을
 *   다른 것으로 취급해 학습 이력이 사일런트 분열·오표적된다.
 *
 * 탐지 규칙:
 *   R1  식별자·키 lvalue(*Key/*Id/cid/sid 계열)의 대입식에 위치 좌표
 *       삽입 — L#### 리터럴·L${…} 템플릿·*Idx/*index/*lineNo/
 *       scrollTop 변수의 보간·연결
 *   R2  bare 라인-id 리터럴 생성 'L####'·'L${…}' (컨텍스트 무관)
 *       — 표시용 '#L'·'(L?' 접두 문자는 제외
 *   R3  영속 저장 호출(setItem·setJSON 계열) 키 인자에 위치 변수 보간
 *
 * 대상: src/**\/*.js · tools/build/**\/*.js (식별자 생성처)
 * 허용 목록: ALLOWED — 표시층·세션 전용 등 위치 키가 설계상 정당한 지점만
 * (사유 기재 필수). 표시용 #L 링크·(LNN) 인용 텍스트·마이그레이션 독자의
 * L(\d+) 파싱은 식별자 생성이 아니므로 대상 외.
 *
 * 사용: node tools/check/check_position_independence.js [--ref <ref>]
 *   --ref 지정 시 ref..HEAD + 미커밋 변경 파일만 스캔 (로컬·pre-push 게이트 —
 *   신규 위반 유입 탐지. CI/전수 점검은 인자 없이 전체 스캔)
 */
// @spec ID-05
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, refFromArgs, changedFiles } = require('./changed_files.js');

const SCAN_DIRS = ['src', path.join('tools', 'build')];

// 식별자·키 lvalue — *Key/*Id/*ID/cid/sid/uid 계열 (cache* 는 세션 캐시 관례로 제외)
const LVALUE_RE = /\b([A-Za-z_$][\w$]*)\s*[:=]\s*/;
const IDENT_NAME_RE = /(?:key|id|cid|sid|uid)$/i;
const POSITIONAL_VAR_RE = /\w*(?:Idx|Index|index|lineNo|lineNum|scrollTop|position)\w*/;
// RHS 금지 토큰 — L#### 리터럴·L${…}·위치 변수 보간·위치 변수 연결
const RHS_LINE_LITERAL = /['"`]L(?:\$\{|\d{2,})/;
const RHS_POS_INTERP = new RegExp('\\$\\{[^}]*\\b' + POSITIONAL_VAR_RE.source + '\\b[^}]*\\}');
const RHS_POS_CONCAT = new RegExp('(?:\\+\\s*' + POSITIONAL_VAR_RE.source + '|' + POSITIONAL_VAR_RE.source + '\\s*\\+)');
// R2 — 라인-id 리터럴 (문자열 시작 위치의 L) — '#L'/'(L' 등 표시 접두는 미부합
const LINE_ID_LITERAL = /['"`]L(?:\$\{|\d{3,})/;
// R3 — 저장 호출 키 인자
const STORE_CALL_RE = /(?:safeSetItem|safeSetJSON|setItem|setJSON|setItemAsync|setJSONAsync|(?:local|session)Storage\.setItem)\s*\(/;

/** 허용 목록 — 위치 키가 설계상 정당한 지점만 (file·포함 문자열·사유) */
const ALLOWED = [
    {
        file: 'src/reader/reader-format.js', contains: 'idxKey',
        reason: 'GLOSSARY_INDEX 조회 키 — 번들과 동일 규칙으로 매 빌드 재계산되는 표시층 인덱스 (사용자 데이터 영속 아님)'
    },
    {
        file: 'tools/build/build_keyword_index.js', contains: 'idxKey',
        reason: 'GLOSSARY_INDEX 생성 키 — reader-format 조회 측과 동일 규칙. 번들 내 자기완결 인덱스 (사용자 데이터 아님)'
    },
    {
        file: 'tools/build/report.js', contains: 'L${s.line}',
        reason: '품질 리포트의 인용 라인 표시 텍스트 (출력 문자열 — 식별자 아님)'
    },
    {
        file: 'src/views/reader/reader-loader.js', contains: 'cacheKey',
        reason: '세션 전용 LRU 캐시 키 — 영속 저장소 아님, 챕터 인덱스는 세션 내 고유하면 충분'
    },
    {
        file: 'src/views/exam-sim/exam-sim-session.js', contains: 'integrated_q${index + 1}',
        reason: '통합 모의고사 문항 순번 id — 빌드 산출물 QUESTION_CHAPTERS도 동일 순번 규칙이라 일관. 개선 후보: 콘텐츠 기반 id (weak_sim_* 영속 키로 흘러 문제은행 재정렬 시 귀속 오류 가능)'
    },
];

function collectJsFiles(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...collectJsFiles(full));
        else if (e.name.endsWith('.js')) out.push(full);
    }
    return out;
}

/**
 * 소스 한 줄을 검사해 위반 목록 반환 (테스트 가능 단위).
 * @param {string} line
 * @returns {Array<{rule:string, detail:string}>}
 */
function scanLine(line) {
    const hits = [];

    // R2 — bare 라인-id 리터럴 (어디서든)
    if (LINE_ID_LITERAL.test(line)) {
        hits.push({ rule: 'R2', detail: '라인-id 리터럴 생성 (L####/L${…})' });
    }

    // R3 — 저장 호출 키 인자의 위치 변수
    if (STORE_CALL_RE.test(line) && RHS_POS_INTERP.test(line)) {
        hits.push({ rule: 'R3', detail: '영속 저장 키에 위치 변수 보간' });
    }

    // R1 — 식별자·키 lvalue 대입식의 위치 좌표
    const lv = line.match(LVALUE_RE);
    if (lv && IDENT_NAME_RE.test(lv[1]) && !/cache/i.test(lv[1])) {
        // 코드 위치 판정 — `id="…"`·`data-x="…"` 같은 마크업 속성은 제외.
        // lvalue 직전 비공백이 . { ; , ( : 이거나 선행 단어가 키워드면 코드.
        const before = line.slice(0, lv.index);
        const prevCh = before.replace(/\s+$/, '').slice(-1);
        const prevWord = (before.match(/(\w+)\s*$/) || [])[1] || '';
        const isCodePos = '.{;,(:'.includes(prevCh)
            || ['const', 'let', 'var', 'return', 'case'].includes(prevWord)
            || before.trim() === '';
        if (!isCodePos) return hits;
        const rhs = line.slice(lv.index + lv[0].length);
        if (RHS_LINE_LITERAL.test(rhs)) {
            hits.push({ rule: 'R1', detail: `식별자 '${lv[1]}'에 라인-id 리터럴 대입` });
        } else if (RHS_POS_INTERP.test(rhs) || RHS_POS_CONCAT.test(rhs)) {
            hits.push({ rule: 'R1', detail: `식별자 '${lv[1]}'에 위치 변수 삽입` });
        }
    }
    return hits;
}

/** 파일 전체 검사 */
function scanFile(relPath, src) {
    const violations = [];
    src.split(/\r?\n/).forEach((line, i) => {
        // 주석 라인은 스킵 — 문자열 내 // 는 무시 가능 수준
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const hit of scanLine(line)) {
            const allow = ALLOWED.find(a =>
                a.file === relPath && line.includes(a.contains) &&
                (!a.rule || a.rule === hit.rule));
            if (!allow) {
                violations.push({ line: i + 1, ...hit, code: line.trim().slice(0, 120) });
            }
        }
    });
    return violations;
}

/**
 * 인프로세스/CLI 공용 실행 — {status, output} 계약.
 * @param {{args?: string[]}} opts — CLI 인자 배열 (process.argv.slice(2) 상당)
 * @returns {{status:number, output:string}}
 */
function run({ args = [] } = {}) {
    // --ref: ref..HEAD+미커밋 변경 파일만 스캔 — 신규 유입 탐지 (로컬·pre-push)
    const ref = refFromArgs(args);
    const scoped = ref ? new Set(changedFiles(ref)) : null;
    const scopeNote = scoped ? ` · 변경 파일 ${scoped.size}개 스코프` : '';

    const violations = [];
    for (const d of SCAN_DIRS) {
        for (const file of collectJsFiles(path.join(ROOT, d))) {
            const rel = path.relative(ROOT, file).replace(/\\/g, '/');
            if (scoped && !scoped.has(rel)) continue;
            for (const v of scanFile(rel, fs.readFileSync(file, 'utf8'))) {
                violations.push({ file: rel, ...v });
            }
        }
    }

    if (violations.length) {
        const lines = ['\n❌ 교재 좌표 비의존 위반 — 위치 좌표를 식별자·저장 키로 사용 (ID-05):\n'];
        for (const v of violations) {
            lines.push(`  ${v.file}:${v.line}  [${v.rule}] ${v.detail}`);
            lines.push(`      ${v.code}`);
        }
        lines.push(`\n총 ${violations.length}건 — 위치 좌표 대신 콘텐츠·구조 기반 식별자를 사용하세요.`);
        lines.push('표시층 등 설계상 정당한 경우는 ALLOWED에 사유와 함께 등록.');
        return { status: 1, output: lines.join('\n') };
    }
    return { status: 0,
        output: `✅ 교재 좌표 비의존 통과 — 식별자·저장 키에 위치 좌표 없음 (허용 목록 ${ALLOWED.length}건${scopeNote})` };
}

if (require.main === module) {
    const r = run({ args: process.argv.slice(2) });
    if (r.output) console.log(r.output);
    process.exit(r.status);
}
module.exports = { scanLine, scanFile, run };
