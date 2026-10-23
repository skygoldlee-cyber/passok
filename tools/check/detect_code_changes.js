#!/usr/bin/env node
/**
 * detect_code_changes.js — CI e2e 스킵 판정
 *
 * 변경 파일이 문서 전용(docs/**·루트 *.md·tmp/**)이면 E2E를 건너뛰기 위해
 * GITHUB_OUTPUT에 code=true|false를 쓴다. 워크플로 paths-ignore는 check-run
 * 자체가 안 생겨 배포 가드(deploy.js CI 게이트)를 막으므로, 잡 if: 방식으로
 * 제어한다 — e2e 잡은 needs.changes.outputs.code == 'true' 일 때만 실행.
 *
 * 판정은 보수적: 코드와 무관해 보이는 경로만 허용하고 나머지는 전부 실행.
 * content/**·.github/**·package*.json 등은 번들·런타임에 영향이 있어 code=true.
 *
 * 환경:
 *   EVENT_NAME   — github.event_name (push | pull_request)
 *   BASE_REF     — github.base_ref (PR 대상 브랜치, push 시 빈 값)
 *   EVENT_BEFORE — github.event.before (push 직전 SHA, 없으면 빈 값)
 *   GITHUB_OUTPUT — CI 출력 파일 (로컬 실행 시 stdout으로 대체 출력)
 *   E2E_FORCE=1  — 강제 실행 우회
 */

// @spec none (CI 잡 필터)
const { execSync } = require('child_process');
const fs = require('fs');

// 문서 전용으로 간주하는 경로 — 이 외 변경이 하나라도 있으면 E2E 실행
const DOCS_ONLY = /^(docs\/|tmp\/|\.devin\/|[^/]+\.md$)/;

function git(args) {
    return execSync(`git -c core.quotepath=false ${args}`, { encoding: 'utf8' }).trim();
}

function resolveBase() {
    const event = process.env.EVENT_NAME || '';
    const baseRef = process.env.BASE_REF || '';
    const before = process.env.EVENT_BEFORE || '';
    if (event === 'pull_request' && baseRef) return `origin/${baseRef}`;
    if (before && /^[0-9a-f]{40}$/.test(before)) {
        try { git(`rev-parse --verify -q ${before}`); return before; } catch { /* fall */ }
    }
    return 'HEAD~1';
}

function listChanged(base) {
    try { return git(`diff --name-only ${base} HEAD`).split('\n').filter(Boolean); }
    catch { return git('diff --name-only HEAD~1 HEAD').split('\n').filter(Boolean); }
}

const forced = process.env.E2E_FORCE === '1';
const base = resolveBase();
const files = forced ? ['<E2E_FORCE>'] : listChanged(base);
const codeFiles = files.filter((f) => !DOCS_ONLY.test(f));
const code = forced || codeFiles.length > 0;

console.log(`base: ${base} — 변경 ${files.length}개 중 코드 영향 ${codeFiles.length}개 → e2e ${code ? '실행' : '스킵'}`);
if (!code) console.log(`  문서 전용 변경: ${files.join(', ')}`);

const line = `code=${code ? 'true' : 'false'}`;
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, line + '\n');
else console.log(`(GITHUB_OUTPUT 없음 — 로컬) ${line}`);
