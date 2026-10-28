// @spec none
// tools/ci/ci_retrigger.js — CI 플레이크 재실행 트리거 (npm run ci:retrigger)
//
// 배포 가드가 "CI failure"로 막힐 때: 로컬 재현이 통과하면 플레이크 가능성이 높다.
// 빈 커밋을 만들어 push → 새 ci.yml run이 완료될 때까지 폴링 → 결과 보고.
// 사용 후 바로 `npm run deploy`를 재실행하면 된다.
//
// 주의: 진짜 회귀일 때도 재실행되므로, 실행 전 실패 스텝의 로컬 재현 통과를 전제로 한다.
// 동일 스텝에서 재실패하면 플레이크가 아니라 회귀 — 로그 확인이 필요하다.

const { execSync } = require('node:child_process');
const fs = require('node:fs');

const POLL_MS = 60_000;
const TIMEOUT_MS = 25 * 60_000;

const git = cmd => execSync(cmd, { encoding: 'utf8' }).trim();

function loadEnv() {
    if (!fs.existsSync('.env')) return;
    for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
}

function repoSlug() {
    const m = git('git remote get-url origin').match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
    if (!m) throw new Error('origin URL 해석 실패');
    return m[1];
}

async function runFor(sha) {
    loadEnv();
    const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'passok-ci-retrigger' };
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
        `https://api.github.com/repos/${repoSlug()}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=1`,
        { headers });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    return ((await res.json()).workflow_runs || [])[0];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    if (git('git status --porcelain')) {
        console.error('❌ 작업 트리가 더럽습니다 — 빈 커밋 트리거는 clean 상태에서만 허용됩니다.');
        process.exit(1);
    }
    console.log('▶ 빈 커밋으로 CI 재실행을 트리거합니다...');
    git('git commit --allow-empty -m "ci: CI 재실행 트리거 [no-docs]"');
    git('git push');
    const sha = git('git rev-parse HEAD');
    console.log(`▶ 커밋 ${sha.slice(0, 8)}의 ci.yml 완료를 기다립니다 (최대 ${TIMEOUT_MS / 60000}분)...`);

    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
        await sleep(POLL_MS);
        const run = await runFor(sha);
        if (!run) { console.log('  · run 아직 없음 — 대기'); continue; }
        console.log(`  · ${run.status}${run.conclusion ? ' / ' + run.conclusion : ''}`);
        if (run.status === 'completed') {
            if (run.conclusion === 'success') {
                console.log(`\n✅ CI 통과 (${sha.slice(0, 8)}) — npm run deploy 를 실행하세요.`);
                return;
            }
            console.error(`\n❌ CI 재실패 (${run.conclusion}) — npm run ci:diagnose -- --specs 로 실패 위치를 확인하세요.`);
            process.exit(1);
        }
    }
    console.error('❌ CI 완료 대기 시간 초과 — GitHub에서 상태를 확인하세요.');
    process.exit(1);
}

main().catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
