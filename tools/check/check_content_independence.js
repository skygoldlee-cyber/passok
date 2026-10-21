#!/usr/bin/env node
/**
 * check_content_independence.js — Logic Independent of Content 게이트 (SPEC DA-15)
 *
 * 플랫폼·빌드 로직이 특정 시험/교재의 콘텐츠 식별자를 하드코딩하는 것을 차단한다.
 * 시험 id·이름·과목 키 같은 리터럴이 코드에 박히면 신규 시험 온보딩이나
 * 교재 교체 시 로직 수정이 필요해지므로 DA-15 위반이다 — 콘텐츠 특정 동작은
 * 반드시 exams.json·manifest·references.json 등 데이터 선언으로 해석한다.
 *
 * 탐지 규칙:
 *   R1  시험 식별 리터럴 — exams.json의 id·name/appName/shortName/title과
 *       동일한 인용 문자열 ('cosmetic', "손해사정사" …)
 *   R2  과목 키 리터럴 — manifest.subjects[].key/dir과 동일한 인용 문자열
 *   R3  시험 경로 리터럴 — exams/<시험id>/ 형태의 경로 문자열 내장
 *
 * 스캔 대상: src 하위 js(src/exams 도메인 모듈 제외 — DA-13상 허용)
 *            + tools 하위 js. 주석은 제거 후 코드 채널만 검사한다.
 * 제외: 헤더에 '자동 생성' 표기된 산출물(src/keyword-index.js 등 —
 *       콘텐츠에서 생성된 데이터 번들은 로직이 아님)과 ALLOWED 명단.
 *
 * 사용: node tools/check/check_content_independence.js [--ref <ref>]
 *   --ref 지정 시 ref..HEAD + 미커밋 변경 파일만 스캔 (diff 게이트)
 */
// @spec DA-15
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, refFromArgs, changedFiles } = require('./changed_files.js');
const { getExamTargets } = require('../build/exam_targets.js');

const SCAN_DIRS = ['src', 'tools'];
const EXCLUDE_PREFIX = 'src/exams/'; // DA-13: 시험 전용 도메인 모듈은 격리 규약상 허용
const GENERATED_HEADER_RE = /자동 생성|직접 수정하지 마시고/;

/**
 * 허용 목록 — 문자열이 콘텐츠 식별자가 아니거나 설계상 정당한 지점만
 * (file·포함 문자열·사유 기재 필수).
 */
const ALLOWED = [
    {
        file: 'src/notice-check.js', contains: "'law'",
        reason: "law.go.kr API target 구분자(법령 vs admrul 행정규칙) — 과목 키 'law'와 무관한 외부 API 상수"
    },
    {
        file: 'src/data-loader.js', contains: 'window.DATA_REGISTRY',
        reason: '레지스트리 로딩 경로 소유처 — registryGlobal 해석·기본 시험 정적 전역 확보·비기본 번들 누락 가드. 다른 모듈은 exam-context.getActiveRegistry()로만 접근'
    },
    {
        file: 'tools/check/audit_study_quality.js', contains: 'window.DATA_REGISTRY',
        reason: '시뮬레이션 스텁 — 가상 시험(simexam) 레지스트리를 window에 설치하고 스텁 값을 인자로 전달. 기본 시험 전역명 폴백 규약을 검증하는 하네스'
    },
    {
        file: 'tools/build/build_pdf_registry.js', contains: "type === 'law'",
        reason: 'law.go.kr 링크 유형 구분자 — 법령/행정규칙 분기, 과목 키 아님'
    },
    {
        file: 'tools/check/check_adlint_coverage.js', contains: 'exams/cosmetic/',
        reason: 'cosmetic 도메인 전용 감사 도구 — 광고금지표현 사전(src/exams/cosmetic/ad-lint)과 별표5 법정 조항 자체가 시험 도메인 콘텐츠'
    },
];

/* ---------- 코드 채널 추출 (주석 제거 — 문자열은 보존) ---------- */
function stripComments(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    let state = null; // 'line' | 'block' | "'" | '"' | '`'
    while (i < n) {
        const c = src[i], nx = src[i + 1];
        if (state === 'line') {
            if (c === '\n') { state = null; out += '\n'; }
            i++; continue;
        }
        if (state === 'block') {
            if (c === '*' && nx === '/') { state = null; i += 2; continue; }
            out += c === '\n' ? '\n' : ' ';
            i++; continue;
        }
        if (state === "'" || state === '"' || state === '`') {
            out += c;
            if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
            if (c === state) state = null;
            i++; continue;
        }
        if (c === '/' && nx === '/') { state = 'line'; i += 2; continue; }
        if (c === '/' && nx === '*') { state = 'block'; i += 2; continue; }
        if (c === "'" || c === '"' || c === '`') state = c;
        out += c; i++;
    }
    return out;
}

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

function isAllowed(rel, match) {
    return ALLOWED.some(a => a.file === rel && match.includes(a.contains));
}

function run({ args = [] } = {}) {
    const examsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf-8'));
    const examLiterals = new Set();
    for (const e of examsJson.exams || []) {
        for (const k of ['id', 'name', 'appName', 'shortName', 'title']) {
            if (typeof e[k] === 'string' && e[k].length >= 2) examLiterals.add(e[k]);
        }
    }
    const subjectLiterals = new Set();
    for (const t of getExamTargets(ROOT)) {
        for (const s of (t.manifest && t.manifest.subjects) || []) {
            if (s.key && s.key.length >= 3) subjectLiterals.add(s.key);
            if (s.dir && s.dir.length >= 3) subjectLiterals.add(s.dir);
        }
    }
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const examAlt = [...examLiterals].map(esc).join('|');
    const subjAlt = [...subjectLiterals].map(esc).join('|');
    const RULES = [];
    if (examAlt) {
        RULES.push({ re: new RegExp(`['"\`](?:${examAlt})['"\`]`), label: 'R1 시험 식별 리터럴' });
        const idAlt = [...new Set((examsJson.exams || []).map(e => e.id))].map(esc).join('|');
        RULES.push({ re: new RegExp(`exams/(?:${idAlt})/`), label: 'R3 시험 경로 리터럴' });
    }
    if (subjAlt) {
        RULES.push({ re: new RegExp(`['"\`](?:${subjAlt})['"\`]`), label: 'R2 과목 키 리터럴' });
    }
    // R4 — 기본 시험 레지스트리 전역 직독 차단. window.DATA_REGISTRY는 정적
    // 스크립트가 채우는 "기본 시험" 전역이라 비기본 시험 활성 시 엉뚱한 콘텐츠를
    // 반환한다. 활성 시험 해석은 exam-context.getActiveRegistry() 규약.
    RULES.push({ re: /window\.DATA_REGISTRY\b/, label: 'R4 기본 시험 레지스트리 직독 — getActiveRegistry() 사용' });

    const ref = refFromArgs(args);
    const changed = ref ? changedFiles(ref) : null;
    let files = [];
    for (const d of SCAN_DIRS) {
        files.push(...collectJsFiles(path.join(ROOT, d)).map(f => path.relative(ROOT, f).replace(/\\/g, '/')));
    }
    if (changed) {
        const set = new Set(changed);
        files = files.filter(f => set.has(f));
    }

    const violations = [];
    for (const rel of files) {
        if (rel.startsWith(EXCLUDE_PREFIX)) continue;
        if (rel === 'tools/check/check_content_independence.js') continue; // 자기 ALLOWED/규칙 문자열 오탐 방지
        const abs = path.join(ROOT, rel);
        let src;
        try { src = fs.readFileSync(abs, 'utf8'); } catch { continue; }
        const head = src.slice(0, 400);
        if (GENERATED_HEADER_RE.test(head)) continue; // 생성 데이터 번들 — 로직 아님
        const code = stripComments(src);
        for (const { re, label } of RULES) {
            const m = code.match(re);
            if (m && !isAllowed(rel, m[0])) {
                const line = code.slice(0, m.index).split('\n').length;
                violations.push(`${rel}:${line} ${label} — ${m[0]}`);
            }
        }
    }

    const header = `DA-15 콘텐츠 독립성 스캔: ${files.length}개 파일 (시험 식별자 ${examLiterals.size}개 · 과목 키 ${subjectLiterals.size}개 감시)`;
    if (violations.length) {
        const lines = [header, '', `❌ 콘텐츠 결합 리터럴 ${violations.length}건:`];
        for (const v of violations) lines.push(`  ${v}`);
        lines.push('');
        lines.push('시험/교재 식별자는 코드가 아닌 exams.json·manifest·references.json에 선언하세요.');
        lines.push('정당한 예외는 ALLOWED 목록에 file+contains+reason으로 명시하세요.');
        return { status: 1, output: lines.join('\n') };
    }
    return { status: 0, output: `${header}\n✅ 위반 0건 — 로직의 콘텐츠 독립성 유지` };
}

if (require.main === module) {
    const r = run({ args: process.argv.slice(2) });
    if (r.output) console.log(r.output);
    process.exit(r.status);
}
module.exports = { run, stripComments };
