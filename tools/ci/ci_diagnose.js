// @spec none
// tools/ci/ci_diagnose.js — CI 실패 위치 진단 (npm run ci:diagnose [sha] [--specs])
//
// 대상 커밋의 ci.yml run을 GitHub REST로 조회해 실패 잡→실패 스텝을 나열.
// --specs 지정 시 실패한 e2e 샤드에 속한 스펙 파일 목록도 출력 (플레이크 원인 분리용).
// 공개 레포는 무인증 조회 가능(로그 본문은 403 — 잡·스텝 이름만 노출).
// 비공개 레포는 GH_TOKEN/GITHUB_TOKEN 필요. gh CLI 인증돼 있으면 그쪽을 우선 사용.

const { execSync } = require('node:child_process');
const fs = require('node:fs');

const args = process.argv.slice(2);
const sha = args.find(a => /^[0-9a-f]{7,40}$/.test(a)) ||
    execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const wantSpecs = args.includes('--specs');

function loadEnv() {
    const envFile = '.env';
    if (!fs.existsSync(envFile)) return;
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
}

function repoSlug() {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const m = remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
    if (!m) throw new Error(`origin URL에서 owner/repo 해석 실패: ${remote}`);
    return m[1];
}

async function api(path) {
    loadEnv();
    const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'passok-ci-diagnose' };
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${repoSlug()}/${path}`, { headers });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status} — ${path}`);
    return res.json();
}

// 실패한 e2e 잡 이름 "e2e (mobile, 2, 2)" → playwright --list로 샤드 스펙 목록
function listShardSpecs(jobName) {
    const m = jobName.match(/e2e \((.+?),\s*(\d+),\s*(\d+)\)/);
    if (!m) return [];
    const [, project, shard, total] = m;
    try {
        const out = execSync(
            `npx playwright test --list --project=${project} --shard=${shard}/${total}`,
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 });
        const files = new Set();
        for (const line of out.split(/\r?\n/)) {
            const f = line.match(/([^\s]+\.spec\.[jt]s)/);
            if (f) files.add(f[1].split(/[\\/]/).slice(-1)[0]);
        }
        return [...files];
    } catch {
        return ['(playwright --list 실패 — 로컬 playwright 미설치?)'];
    }
}

async function main() {
    const runs = await api(`actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=1`);
    const run = (runs.workflow_runs || [])[0];
    if (!run) {
        console.log(`커밋 ${sha.slice(0, 8)}에 대한 ci.yml 실행이 없습니다.`);
        return;
    }
    console.log(`# ci.yml 진단 — ${sha.slice(0, 8)} · ${run.status} / ${run.conclusion || '-'} · ${run.html_url}\n`);

    const jobs = (await api(`actions/runs/${run.id}/jobs?per_page=50`)).jobs || [];
    const failed = jobs.filter(j => j.conclusion === 'failure');
    if (!failed.length) {
        console.log(`실패 잡 없음 (${jobs.length}개 잡 모두 ${run.conclusion || '진행 중'})`);
        jobs.forEach(j => console.log(`- ${j.name}: ${j.conclusion || j.status}`));
        return;
    }

    for (const job of failed) {
        const detail = await api(`actions/jobs/${job.id}`);
        const badSteps = (detail.steps || []).filter(s => s.conclusion === 'failure');
        console.log(`\n## 실패 잡: ${job.name}`);
        badSteps.forEach(s => console.log(`- 스텝 ${s.number}: ${s.name}`));
        if (wantSpecs && /e2e/.test(job.name)) {
            const specs = listShardSpecs(job.name);
            console.log(`- 샤드 스펙 (${specs.length}개):`);
            specs.forEach(f => console.log(`  · ${f}`));
        }
    }
    console.log(`\n※ 로그 본문은 인증 필요 — 실패 스텝의 로컬 재현 명령으로 확인하세요.`);
}

main().catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
