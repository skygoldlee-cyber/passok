'use strict';
/**
 * changed_files.js — diff 스코프 게이트의 변경 파일 해석 공용 헬퍼
 *
 * `--ref <git-ref>` 인자를 받는 체커는 "이번 변경으로 새로 유입될 수 있는
 * 위반"만 보면 된다 — 변경되지 않은 파일의 기존 상태는 CI 전수 스캔의 몫.
 * 이 헬퍼로 ref..HEAD 범위 + 미커밋 작업트리 변경을 한 세트로 해석한다.
 *
 * // @spec none (공용 헬퍼)
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function git(args) {
    // core.quotepath=false — 비ASCII(한글) 경로의 octal 이스케이프 방지
    return execSync(`git -c core.quotepath=false ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** argv에서 --ref 값을 읽는다 (없으면 null). */
function refFromArgs(argv) {
    const i = argv.indexOf('--ref');
    return i >= 0 ? argv[i + 1] : null;
}

/**
 * ref..HEAD 커밋 범위 + 미커밋(staged·unstaged) 변경 파일의 합집합.
 * ref 해석 실패 시 null 반환 — 호출측은 전수 스캔으로 폴백한다.
 * @returns {string[]|null} repo-상대 경로 (posix 구분자)
 */
function changedFiles(ref) {
    try {
        const out = new Set();
        const committed = git(`diff --name-only ${ref}..HEAD`);
        for (const f of committed.split('\n')) if (f) out.add(f);
        // 미커밋 작업트리도 포함 — 로컬 게이트는 커밋 전 변경도 대상
        const worktree = git('diff --name-only HEAD');
        for (const f of worktree.split('\n')) if (f) out.add(f);
        const staged = git('diff --cached --name-only');
        for (const f of staged.split('\n')) if (f) out.add(f);
        return [...out];
    } catch {
        return null;
    }
}

module.exports = { ROOT, refFromArgs, changedFiles };
