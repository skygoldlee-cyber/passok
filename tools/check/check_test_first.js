#!/usr/bin/env node
/**
 * check_test_first.js — 소스 변경 시 테스트 동반 강제 게이트 (Docs-First)
 *
 * 실행 로직(src/*.js, ref-pipeline/*.py)이 변경됐는데 테스트
 * (tests/, ref-pipeline/tests/)가 함께 변경되지 않으면 실패한다.
 * AGENTS.md의 "테스트 선행" 규칙을 작업 트리·push·CI 3층에서 구조적으로
 * 강제한다 — 머신·에이전트·기여자와 무관하게 동일하게 적용된다.
 *
 * 사용법:
 *   node tools/check/check_test_first.js            # 작업 트리(HEAD 대비) 검사
 *   node tools/check/check_test_first.js --staged   # 스테이징된 변경 검사
 *                                                   # (브랜치 내 기커밋 테스트도 인정)
 *   node tools/check/check_test_first.js --ref origin/main  # ref 대비 검사 (pre-push/CI)
 *
 * 우회:
 *   - 커밋 메시지 행 끝에 [no-test] 기재 — --ref 모드 전용, 그 커밋의 파일만 면제
 *   - 환경변수 SKIP_TESTFIRST=1 (모든 모드)
 *   - pre-commit: git commit --no-verify
 *   ※ 우회 사용은 tools/state/gate_bypasses.jsonl에 누적 — audit:gates
 *     "게이트 우회 이력"이 빈도를 보고한다 (캘리브레이션 입력)
 *
 * 범위 (의도적 제한):
 *   - 트리거: src/*.js · ref-pipeline/*.py — 실행 로직만. 마크업·스타일·
 *     설정·tools/ 체커는 테스트 의무가 과도하므로 제외 (docsync가 문서를 강제)
 *   - 인정: tests/ · ref-pipeline/tests/ — 기존 테스트 갱신도 인정
 *     ("테스트 작성 후 구현"의 순서는 커밋 분할로 표현 가능 — 범위 합산)
 *   - 주석 전용 면제: 구버전↔신버전을 주석 제거 후 비교해 diff가 주석·공백만
 *     다르면 트리거에서 제외 (코드 주석 처리·문자열 내용 변경은 여전히 트리거)
 */

// @spec none (테스트 선행 게이트)
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseStatusLine } = require('../lib/git_status.js');
const { GENERATED_SRC } = require('../lib/generated_files.js');

// 테스트 동반을 요구하는 실행 로직 변경
const TRIGGERS = [
    /^src\/.+\.js$/,
    /^ref-pipeline\/.+\.py$/,
];

// 테스트 변경으로 인정하는 경로
const TESTS = [
    /^tests\//,
    /^ref-pipeline\/tests\//,
];

const BYPASS_MARK = '[no-test]';

const TRIGGER_HINTS = [
    { re: /^src\//, hint: 'tests/ (node --test) · tests/dom/ (Vitest) — DOM_TEST_DESIGN.md §구조' },
    { re: /^ref-pipeline\//, hint: 'ref-pipeline/tests/ (pytest — 순수 함수 단위)' },
];

/* =========================================================
   주석 전용 변경 감지 — 주석·공백만 바뀐 diff는 로직 변경이 아니다.
   구버전·신버전 전체를 주석 제거 후 비교한다 (코드를 주석 처리한 변경은
   구버전에 코드 라인이 남아 여전히 트리거). 스트리퍼의 미세 오판은
   "트리거" 방향으로만 실패하도록 설계 — 게이트가 약해지지 않는다.
   ========================================================= */

// 이 문자 직후의 / 는 나눗셈 (피연산자 직후 컨텍스트)
const JS_OPERAND_END = /[\w$)\]"'`]/;
// 키워드 직후의 / 는 정규식 시작 (return /re/, case /re/: 등)
const JS_REGEX_KEYWORDS = new Set([
    'return', 'typeof', 'case', 'throw', 'in', 'of', 'new', 'delete',
    'void', 'do', 'else', 'yield', 'await', 'instanceof',
]);

/** JS 소스에서 //·/*⋯* / 주석을 제거 — 문자열·템플릿·정규식 내용은 보존한다. */
function stripJsComments(src) {
    const out = [];
    let st = 'code', lastSig = '', lastWord = '', i = 0;
    while (i < src.length) {
        const c = src[i], n = src[i + 1];
        if (st === 'code') {
            if (c === '/' && n === '/') { st = 'line'; i += 2; continue; }
            if (c === '/' && n === '*') { st = 'block'; i += 2; continue; }
            if (c === "'" || c === '"' || c === '`') {
                st = c === "'" ? 'sq' : c === '"' ? 'dq' : 'tpl';
                out.push(c); lastSig = c; lastWord = ''; i++; continue;
            }
            const kw = lastWord && JS_REGEX_KEYWORDS.has(lastWord);
            if (c === '/' && (!JS_OPERAND_END.test(lastSig) || kw)) {
                st = 're'; out.push(c); lastSig = c; i++; continue;
            }
            out.push(c);
            if (/[\w$]/.test(c)) { lastWord += c; lastSig = c; }
            else if (!/\s/.test(c)) { lastSig = c; lastWord = ''; }
            i++;
        } else if (st === 'line') {
            if (c === '\n') { st = 'code'; out.push(c); }
            i++;
        } else if (st === 'block') {
            if (c === '*' && n === '/') { st = 'code'; i += 2; continue; }
            if (c === '\n') out.push(c);   // 줄 구조 유지 — 라인 단위 비교 정합
            i++;
        } else if (st === 'reclass') {
            // 정규식 문자 클래스 [...] — ] 까지 / 는 종결자가 아니다
            if (c === '\\') { out.push(c); if (n !== undefined) out.push(n); i += 2; continue; }
            if (c === ']') st = 're';
            out.push(c); i++;
        } else {
            // sq|dq|tpl|re — 문자열·정규식 본문은 보존 (내용 diff는 코드 변경으로 간주)
            if (c === '\\') { out.push(c); if (n !== undefined) out.push(n); i += 2; continue; }
            if (st === 're' && c === '[') { st = 'reclass'; out.push(c); i++; continue; }
            const closer = st === 'sq' ? "'" : st === 'dq' ? '"' : st === 'tpl' ? '`' : '/';
            if (c === closer || c === '\n') { st = 'code'; out.push(c); lastSig = c; lastWord = ''; i++; continue; }
            out.push(c); i++;
        }
    }
    return out.join('');
}

/** Python 소스에서 # 주석을 제거 — 문자열(삼중따옴표 포함) 내용은 보존한다. */
function stripPyComments(src) {
    const out = [];
    let st = 'code', i = 0;
    while (i < src.length) {
        const c = src[i];
        if (st === 'code') {
            if (c === '#') { st = 'line'; i++; continue; }
            const tri = src.slice(i, i + 3);
            if (tri === "'''" || tri === '"""') { st = tri === "'''" ? 'tsq' : 'tdq'; out.push(tri); i += 3; continue; }
            if (c === "'" || c === '"') { st = c === "'" ? 'sq' : 'dq'; out.push(c); i++; continue; }
            out.push(c); i++;
        } else if (st === 'line') {
            if (c === '\n') { st = 'code'; out.push(c); }
            i++;
        } else if (st === 'tsq' || st === 'tdq') {
            const tri = st === 'tsq' ? "'''" : '"""';
            if (src.slice(i, i + 3) === tri) { st = 'code'; out.push(tri); i += 3; continue; }
            out.push(c); i++;
        } else {
            if (c === '\\') { out.push(c); if (src[i + 1] !== undefined) out.push(src[i + 1]); i += 2; continue; }
            if (c === (st === 'sq' ? "'" : '"') || c === '\n') { st = 'code'; out.push(c); i++; continue; }
            out.push(c); i++;
        }
    }
    return out.join('');
}

/** 주석 제거 후 비교용 정규화 — 빈 줄·행 끝 공백도 무시한다. */
function normSource(src, ext) {
    const stripped = ext === 'py' ? stripPyComments(src) : stripJsComments(src);
    return stripped.split('\n').map((l) => l.trimEnd()).filter(Boolean).join('\n');
}

/** 구버전·신버전 소스가 주석·공백만 다른지 순수 판정 (단위 테스트 대상). */
function isCommentOnlyDiff(oldSrc, newSrc, ext) {
    return normSource(oldSrc, ext) === normSource(newSrc, ext);
}

let _stagedBase;
/** --staged 모드 비교 기준 — origin/main 머지베이스(부재·오프라인 시 HEAD). */
function stagedBase() {
    if (_stagedBase === undefined) {
        try { _stagedBase = git('merge-base origin/main HEAD') || 'HEAD'; }
        catch { _stagedBase = 'HEAD'; }
    }
    return _stagedBase;
}

/** rev:file 내용 — 해당 rev에 파일이 없으면 null. */
function showRev(rev, file) {
    try { return git(`show "${rev}:${file}"`); } catch { return null; }
}

/** 트리거 파일의 diff가 주석·공백 전용인지 — 판정 불가(삭제·읽기 실패)는 트리거 유지. */
function isCommentOnlyChange(file, mode, ref) {
    const ext = file.endsWith('.py') ? 'py' : 'js';
    let oldSrc, newSrc;
    if (mode === 'ref') {
        oldSrc = showRev(ref, file);
        newSrc = showRev('HEAD', file);
    } else if (mode === 'staged') {
        oldSrc = showRev(stagedBase(), file);
        newSrc = showRev('', file);      // 인덱스 블랍 — 기커밋+스테이징 변경 합산
    } else {
        oldSrc = showRev('HEAD', file);
        try { newSrc = fs.readFileSync(path.resolve(file), 'utf8'); } catch { newSrc = null; }
    }
    if (newSrc === null || newSrc === undefined) return false;  // 삭제·읽기 불가 — 보수적 트리거
    return isCommentOnlyDiff(oldSrc || '', newSrc, ext);
}

/* =========================================================
   우회 텔레메트리 — SKIP_*·[no-test] 사용을 로컬 로그에 누적한다.
   audit:gates의 "게이트 우회 이력"이 읽는다 (캘리브레이션 입력 —
   우회가 잦으면 게이트 정밀도·범위를 검토). 로컬 전용·gitignore.
   ========================================================= */
const BYPASS_LOG = path.join(__dirname, '..', 'state', 'gate_bypasses.jsonl');

function _appendBypass(records) {
    try {
        fs.mkdirSync(path.dirname(BYPASS_LOG), { recursive: true });
        fs.appendFileSync(BYPASS_LOG, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
    } catch { /* 텔레메트리 실패는 게이트 판정과 무관 */ }
}

/** 이벤트성 우회 — 호출될 때마다 1건 기록 (env 변수 등). */
function logBypass(mechanism, detail = {}) {
    _appendBypass([{ ts: new Date().toISOString(), gate: 'test-first', mechanism, ...detail }]);
}

/** 면제 커밋 우회 — 이미 기록된 sha는 재집계하지 않는다 (--ref 재실행 중복 방지). */
function logBypassCommits(shas) {
    try {
        const seen = new Set();
        if (fs.existsSync(BYPASS_LOG)) {
            for (const l of fs.readFileSync(BYPASS_LOG, 'utf8').split('\n')) {
                try { const r = JSON.parse(l); if (r.gate === 'test-first' && r.sha) seen.add(r.sha); } catch { }
            }
        }
        const fresh = shas.filter((s) => !seen.has(s));
        if (fresh.length) {
            const ts = new Date().toISOString();
            _appendBypass(fresh.map((sha) => ({ ts, gate: 'test-first', mechanism: 'commit-mark', sha })));
        }
    } catch { /* 텔레메트리 실패는 게이트 판정과 무관 */ }
}

function git(args) {
    // -c core.quotepath=false — 비ASCII(한글) 경로의 옥탈 이스케이프·인용 방지
    // Windows spawnSync는 대용량 stdout 파이프에서 ENOBUFS — 임시파일 리다이렉트로 우회
    const tmp = path.join(os.tmpdir(), `testfirst-git-${process.pid}-${Math.random().toString(36).slice(2)}.txt`);
    try {
        execSync(`git -c core.quotepath=false ${args} > "${tmp}"`, { shell: true });
        return fs.readFileSync(tmp, 'utf8').trim();
    } finally { try { fs.unlinkSync(tmp); } catch {} }
}

const GENERATED = new Set(GENERATED_SRC);

function isTrigger(file) {
    return TRIGGERS.some((re) => re.test(file)) && !TESTS.some((re) => re.test(file)) && !GENERATED.has(file);
}
function isTest(file) {
    return TESTS.some((re) => re.test(file));
}

/** 파일 목록에서 트리거/테스트를 분류해 위반 여부를 판정한다. */
function analyze(files) {
    const triggers = files.filter(isTrigger);
    const tests = files.filter(isTest);
    return {
        triggers,
        tests,
        violated: triggers.length > 0 && tests.length === 0,
    };
}

function suggestTests(files) {
    const hints = new Set();
    for (const f of files) {
        for (const { re, hint } of TRIGGER_HINTS) {
            if (re.test(f)) hints.add(hint);
        }
    }
    return [...hints];
}

function listStaged() {
    return git('diff --cached --name-only').split('\n').filter(Boolean);
}

/** 브랜치에 이미 커밋된 테스트 변경 — "테스트 먼저 커밋 → 구현 커밋" 순서를 인정한다. */
function committedBranchFiles() {
    try {
        return git('diff --name-only origin/main...HEAD').split('\n').filter(Boolean);
    } catch {
        return []; // origin/main 부재(오프라인·신규 클론) — 스테이징분만 평가
    }
}

function listRange(ref) {
    // 커밋 단위 수집 — [no-test]는 그 커밋의 파일만 면제한다 (check_doc_sync와 동일 계약)
    const commits = git(`log --format=%H ${ref}..HEAD`).split('\n').filter(Boolean);
    const files = new Set();
    const exempted = [];
    for (const sha of commits) {
        const subject = git(`log -1 --format=%B ${sha}`);
        if (/\[no-test\]\s*$/m.test(subject)) {
            exempted.push({ sha, subject: subject.split('\n')[0] });
            continue;
        }
        for (const f of git(`diff-tree --no-commit-id --name-only -r ${sha}`).split('\n').filter(Boolean)) {
            files.add(f);
        }
    }
    if (exempted.length) {
        console.log(`◇ ${BYPASS_MARK} 면제 커밋 ${exempted.length}개: ${exempted.map((e) => `${e.sha.slice(0, 7)} ${e.subject}`).join(' · ')}`);
    }
    return { files: [...files], exempted };
}

function listWorkingTree() {
    return git('status --porcelain').split('\n').filter(Boolean).map(parseStatusLine);
}

function run(mode, ref) {
    let files;
    let exempted = [];
    if (mode === 'staged') {
        // 스테이징 ∪ 브랜치 기커밋 — 테스트를 먼저 커밋한 뒤 구현을 스테이징하는
        // Docs-First 커밋 분할을 통과시킨다
        files = [...new Set([...listStaged(), ...committedBranchFiles()])];
    } else if (mode === 'ref') {
        try {
            git(`rev-parse --verify ${ref}`);
        } catch {
            console.warn(`⚠️  ref '${ref}' 확인 불가 — 작업 트리 기준으로 검사합니다.`);
            files = listWorkingTree();
        }
        if (!files) {
            const r = listRange(ref);
            files = r.files;
            exempted = r.exempted;
        }
    } else {
        // 작업 트리는 미커밋 변경만 본다 — 소스를 먼저 건드리면 테스트가
        // 생기기 전까지 실패하므로 작성 순서 자체를 강제한다
        files = listWorkingTree();
    }

    if (process.env.SKIP_TESTFIRST === '1') {
        logBypass('env', { mode });
        console.log('✅ 테스트 선행 게이트 우회 — SKIP_TESTFIRST=1');
        return 0;
    }
    if (exempted.length) logBypassCommits(exempted.map((e) => e.sha));
    if (!files.length) {
        console.log('✅ 테스트 선행 게이트 통과 — 분석할 변경 없음');
        return 0;
    }

    const { triggers, tests } = analyze(files);
    if (!triggers.length) {
        console.log(`✅ 테스트 선행 게이트 통과 — 실행 로직 변경 없음 (${files.length}개 파일)`);
        return 0;
    }

    // 주석·공백 전용 diff는 로직 변경으로 보지 않는다 (구버전↔신버전 주석 제거 비교)
    const effective = triggers.filter((f) => !isCommentOnlyChange(f, mode, ref));
    const commentOnly = triggers.length - effective.length;
    if (!effective.length) {
        console.log(`✅ 테스트 선행 게이트 통과 — 주석·공백 전용 변경 ${commentOnly}개 (실행 로직 diff 없음)`);
        return 0;
    }
    if (tests.length) {
        console.log(`✅ 테스트 선행 게이트 통과 — 로직 변경 ${effective.length}개 + 테스트 변경 ${tests.length}개`
            + (commentOnly ? ` (주석 전용 ${commentOnly}개 제외)` : ''));
        return 0;
    }

    console.error(`\n❌ 테스트 선행 게이트 실패 — 로직 ${effective.length}개가 변경됐지만 테스트 변경이 없습니다:`);
    for (const f of effective.slice(0, 15)) console.error(`   - ${f}`);
    if (effective.length > 15) console.error(`   … 외 ${effective.length - 15}개`);
    if (commentOnly) console.error(`   (주석·공백 전용 ${commentOnly}개는 트리거에서 제외됨)`);
    console.error('\n   Docs-First: 실패 테스트(재현/기대 동작)를 먼저 작성하세요. 후보:');
    for (const h of suggestTests(effective)) console.error(`   - ${h}`);
    console.error(`\n   기존 테스트로 충분하면 커밋 메시지에 ${BYPASS_MARK} 를 넣거나 SKIP_TESTFIRST=1로 우회하세요.`);
    console.error('   (커밋 단계라면 git commit --no-verify 도 가능)\n');
    return 1;
}

function main(argv = process.argv.slice(2)) {
    let mode = 'worktree';
    let ref = null;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--staged') mode = 'staged';
        else if (argv[i] === '--ref') { mode = 'ref'; ref = argv[++i]; }
    }
    if (mode === 'ref' && !ref) {
        console.error('❌ --ref 뒤에 기준 ref를 지정하세요 (예: --ref origin/main)');
        return 1;
    }
    return run(mode, ref);
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check_test_first.js');
if (isDirectRun) {
    process.exit(main());
}

module.exports = { TRIGGERS, TESTS, BYPASS_MARK, GENERATED_SRC, isTrigger, isTest, analyze, parseStatusLine, run, main, stripJsComments, stripPyComments, normSource, isCommentOnlyDiff, isCommentOnlyChange, logBypass, BYPASS_LOG };
