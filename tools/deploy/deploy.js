#!/usr/bin/env node
/**
 * tools/deploy/deploy.js — 안전한 Vercel 배포 가드
 *
 * `vercel --prod`는 git을 거치지 않고 로컬 파일을 직접 업로드하므로,
 * 미푸시 커밋/미커밋 변경이 그대로 프로덕션에 올라가는 사고를 막기 위한 래퍼.
 *
 * 순서:
 *   1) main 브랜치 + 작업 트리 clean + origin/main 동기화 검사
 *   2) CI 게이트 — 배포 대상 커밋의 ci.yml run이 completed+success
 *      (커밋 스코프로 조회해야 진행 중 run이 이전 커밋 녹색에 올라타지 않는다)
 *   3) sw.js CACHE_VERSION + 앱 버전/릴리스 노트 스탬프 — 작업 트리에만 적용
 *      (커밋하지 않는다. vercel은 로컬 파일을 업로드하므로 프로덕션에는
 *      스탬프된 파일이 그대로 배포된다)
 *   4) vercel --prod --yes 실행
 *   5) 성공 시 deploy/<버전> 태그 생성·push 로 배포 이력 기록 → 스탬프 원복
 *   6) 프로덕션 스모크 — https://<projectName>.vercel.app 200 +
 *      sw.js·version.js 스탬프 일치 (엣지 전파 대기 재시도 포함)
 *
 * 차단 조건:
 *   - 커밋되지 않은 변경이 있는 경우 (untracked 포함)
 *   - origin/main 에 없는 로컬 커밋이 있는 경우 (unpushed)
 *   - origin/main 보다 뒤처진 경우 (push 전 pull 필요)
 *   - 대상 커밋의 ci.yml run이 없거나 진행 중이거나 실패인 경우
 *     (gh CLI 우선, 부재·실패 시 GitHub REST 폴백 — 공개 레포 무인증,
 *      비공개는 GH_TOKEN/GITHUB_TOKEN. 조회 불가 시 SKIP_CI_GATE=1로 우회 가능, 권장하지 않음)
 *   - 스탬프 태그 생성/push 실패
 *
 * 사용: npm run deploy
 */

// @spec BP-07
const { execSync, spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ignore = require('ignore');
const { loadEnv } = require('../lib/env');
const { stampSwVersion } = require('../build/stamp_sw_version.js');
const { stampReleaseNotes } = require('../build/stamp_release_notes.js');
const { parseStatusLine, isNoiseOnlyDiff: noiseOnlyDiffText } = require('../lib/git_status.js');
const { postDiscord, eventEmbed, announceRelease } = require('../lib/discord.js');

// 팀 프로젝트는 개인 계정 기본 스코프로는 배포가 거부되므로(Not authorized),
// .vercel/project.json의 orgId를 --scope로 명시한다. 개인 프로젝트(orgId 없음)면 생략.
function vercelScopeArgs() {
    try {
        const p = path.join(__dirname, '..', '..', '.vercel', 'project.json');
        const { orgId } = JSON.parse(fs.readFileSync(p, 'utf8'));
        return orgId ? ['--scope', orgId] : [];
    } catch {
        return [];
    }
}

// 프로젝트의 기본 *.vercel.app 도메인 — projectName 기반이라 리네임에 자동 추종
function projectUrl() {
    try {
        const p = path.join(__dirname, '..', '..', '.vercel', 'project.json');
        const { projectName } = JSON.parse(fs.readFileSync(p, 'utf8'));
        return projectName ? `https://${projectName}.vercel.app` : null;
    } catch {
        return null;
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 커뮤니티 공지 — DISCORD_ANNOUNCE[_<EXAM>] 채널로 릴리스 노트 push (AD-12).
// 채널 미설정 시 내부에서 조용히 skip — 발송 실패도 배포를 무효화하지 않는다.
async function notifyCommunity(version, url) {
    try {
        const ann = await announceRelease(version, { url });
        if (ann.sent) console.log(`📣 커뮤니티 공지 발송 — ${ann.sent}개 채널`);
        if (ann.skippedUnknown && ann.skippedUnknown.length) {
            console.warn(`⚠️  미등록 시험 공지 env 스킵: ${ann.skippedUnknown.join(', ')}`);
        }
        if (ann.failed && ann.failed.length) {
            console.warn(`⚠️  커뮤니티 공지 일부 실패: ${ann.failed.map((f) => `${f.key}(${f.reason})`).join(', ')}`);
        }
    } catch (e) {
        console.warn(`⚠️  커뮤니티 공지 발송 실패 (배포는 완료됨): ${e.message}`);
    }
}

// 배포 스테이징 — 작업 트리 전체를 .vercelignore 규칙으로 필터링해 임시 디렉터리로
// 복사한다. vercel --archive=tgz는 ignore 규칙 없이 작업 트리를 통째로 아카이브
// 하므로(.tmp_*/audiobook mp3 등 비배포 자산이 Vercel 서버로 업로드됨), 업로드
// 단계부터 배포 집합을 물리적으로 한정한다. 스탬프된 작업 트리 파일(sw.js 등)
// 도 그대로 반영된다.
async function makeStagingDir() {
    const ig = ignore().add(fs.readFileSync('.vercelignore', 'utf8'));
    const deployFiles = [];
    // .git은 vercelignore 무관하게 항상 제외 — 나머지는 규칙으로 프루닝
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, e.name);
            const rel = path.relative('.', abs).split(path.sep).join('/');
            if (e.isDirectory()) {
                if (e.name !== '.git' && !ig.ignores(rel + '/')) walk(abs);
            } else if (!ig.ignores(rel)) {
                deployFiles.push(rel);
            }
        }
    };
    walk('.');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'passok-deploy-'));
    // 대형 트리(수십만 파일) 대비 — 직렬 copyFileSync 대신 비동기 풀로 복사
    const dirs = new Set(deployFiles.map((f) => path.dirname(path.join(dir, f))));
    for (const d of dirs) fs.mkdirSync(d, { recursive: true });
    let i = 0;
    await Promise.all(Array.from({ length: 64 }, async () => {
        while (i < deployFiles.length) {
            const f = deployFiles[i++];
            await fs.promises.copyFile(f, path.join(dir, f));
        }
    }));
    // vercel CLI가 요구하는 프로젝트 링크 — .vercel/은 .vercelignore로 비배포
    const projectJson = path.join('.vercel', 'project.json');
    if (fs.existsSync(projectJson)) {
        fs.mkdirSync(path.join(dir, '.vercel'), { recursive: true });
        fs.copyFileSync(projectJson, path.join(dir, '.vercel', 'project.json'));
    }
    return { dir, fileCount: deployFiles.length };
}

/** 배포 직후 프로덕션 스모크 — 응답·버전 스탬프·SW 실서빙 확인 (엣지 전파 대기 포함) */
async function smokeCheck(baseUrl, expectedVersion) {
    const checks = [
        { url: `${baseUrl}/`, want: null, label: 'index 응답' },
        { url: `${baseUrl}/sw.js`, want: expectedVersion, label: 'sw.js CACHE_VERSION' },
        { url: `${baseUrl}/data/version.js`, want: expectedVersion, label: 'APP_VERSION' },
    ];
    const fails = [];
    for (const c of checks) {
        let ok = false, detail = '';
        for (let i = 0; i < 4 && !ok; i++) {  // 최대 ~25s (엣지 전파 대기)
            try {
                const r = await fetch(c.url, { cache: 'no-store' });
                if (r.status !== 200) {
                    detail = `HTTP ${r.status}`;
                } else if (c.want) {
                    const body = await r.text();
                    ok = body.includes(c.want);
                    if (!ok) detail = `스탬프 불일치 (기대 ${c.want})`;
                } else {
                    ok = true;
                }
            } catch (e) {
                detail = e.message;
            }
            if (!ok && i < 3) await sleep(5000);
        }
        if (ok) console.log(`  ✓ ${c.label} — 200${c.want ? ` · ${c.want}` : ''}`);
        else fails.push(`${c.label}: ${detail}`);
    }
    return fails;
}

function git(args, opts = {}) {
    return execSync(`git ${args}`, { encoding: 'utf8', ...opts }).trim();
}

/** shell 명령행용 인자 인용 — 공백·따옴표 포함 인자만 따옴표 처리 (DEP0190 대응) */
function quoteArg(a) {
    const s = String(a);
    return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function fail(msg) {
    console.error(`\n❌ 배포 차단: ${msg}\n`);
    process.exit(1);
}

/**
 * 대상 커밋의 ci.yml run 조회 — gh CLI 우선, 부재·미인증·실패 시 GitHub REST 폴백.
 * 공개 레포는 무인증으로 읽힌다. 비공개 레포는 GH_TOKEN/GITHUB_TOKEN env를 사용.
 * owner/repo는 `git remote get-url origin`에서 파싱 (SSH 별칭·HTTPS 모두 대응).
 */
async function queryCiRun(sha) {
    try {
        const out = execSync(
            `gh run list --workflow=ci.yml --commit ${sha} --limit 1 --json status,conclusion`,
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { run: JSON.parse(out)[0], via: 'gh' };
    } catch { /* gh 미설치·미인증 — REST 폴백 */ }
    const remote = git('remote get-url origin');
    const m = remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
    if (!m) throw new Error(`origin URL에서 owner/repo 해석 실패: ${remote}`);
    const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'passok-deploy' };
    loadEnv();
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
        `https://api.github.com/repos/${m[1]}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=1`,
        { headers });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    const body = await res.json();
    return { run: (body.workflow_runs || [])[0], via: 'REST' };
}

async function main() {
    // 최신 원격 상태 반영 (실패해도 계속 — 오프라인이면 아래 비교가 로컬 기준으로 동작)
    try {
        git('fetch origin main --quiet');
    } catch {
        console.warn('⚠️  git fetch 실패 — 로컬에 기록된 origin/main 기준으로 검사합니다.');
    }

    const branch = git('rev-parse --abbrev-ref HEAD');
    if (branch !== 'main') {
        fail(`현재 브랜치가 '${branch}' 입니다. main 브랜치에서만 배포하세요.`);
    }

    // 작업 트리 오염 검사
    const dirty = git('status --porcelain');
    if (dirty) {
        console.error(dirty);
        fail('커밋되지 않은 변경이 있습니다. 커밋 후 배포하세요.');
    }

    // 미푸시 커밋 검사
    const unpushed = git('rev-list --count origin/main..HEAD');
    if (parseInt(unpushed, 10) > 0) {
        fail(`원격에 없는 로컬 커밋 ${unpushed}개가 있습니다. 'git push' 후 배포하세요.`);
    }

    // 원격보다 뒤처짐 검사
    const behind = git('rev-list --count HEAD..origin/main');
    if (parseInt(behind, 10) > 0) {
        fail(`origin/main 보다 ${behind}개 커밋 뒤처져 있습니다. 'git pull' 후 배포하세요.`);
    }

    console.log('✅ 배포 전 검사 통과 (main · clean · origin/main 동기화)');

    // CI 게이트 — 레드 상태의 배포를 차단한다. `--branch main` 최신 run을 보는
    // 방식은 진행 중 run을 건너뛰어 이전 커밋 녹색으로 통과되는 구멍이 있으므로,
    // 반드시 배포 대상 커밋 스코프로 조회한다 (HEAD == origin/main은 위에서 보장됨).
    // 57연속 레드가 푸시·배포를 통과한 사고(2026-10)의 재발 방지 장치.
    if (process.env.SKIP_CI_GATE === '1') {
        console.warn('⚠️  SKIP_CI_GATE=1 — CI 검증 없이 배포합니다 (권장하지 않음)');
    } else {
        const sha = git('rev-parse HEAD');
        let run, via;
        try {
            ({ run, via } = await queryCiRun(sha));
        } catch (e) {
            fail(`CI 상태를 조회할 수 없습니다 — gh 설치·인증(gh auth login) 또는 GH_TOKEN/GITHUB_TOKEN 확인 후 재시도하세요. ` +
                `조회 불가 상태에서 배포하려면 SKIP_CI_GATE=1 (${e.message.split('\n')[0]})`);
        }
        const short = sha.slice(0, 8);
        if (!run) {
            fail(`커밋 ${short}에 대한 ci.yml 실행이 없습니다 — push 후 CI 시작 여부를 확인하세요.`);
        }
        if (run.status !== 'completed') {
            fail(`커밋 ${short}의 CI가 ${run.status} 상태입니다 — 완료 후 배포하세요.`);
        }
        if (run.conclusion !== 'success') {
            fail(`커밋 ${short}의 CI가 ${run.conclusion} 입니다 — 레드 상태에서는 배포할 수 없습니다.`);
        }
        console.log(`✅ CI 게이트 통과 (${short} — success${via === 'REST' ? ' · REST 폴백' : ''})`);
    }

    // 영향도 경고 — 직전 배포(deploy/* 태그, 구버전은 스탬프 커밋) 이후 변경 파일의
    // 영향 요구사항 표시. 차단은 아니며, 고영향 코어 파일 변경 시 스모크 확인을 권고한다.
    try {
        let lastDeploy = '';
        try {
            const tag = git('describe --tags --match "deploy/*" --abbrev=0', { stdio: ['ignore', 'pipe', 'ignore'] });
            if (tag) lastDeploy = git(`rev-list -n 1 ${tag}`);
        } catch { /* deploy 태그 없음 — 구 스탬프 커밋 기준으로 폴백 */ }
        if (!lastDeploy) lastDeploy = git('log -1 --format=%H --grep="CACHE_VERSION 스탬프"');
        if (lastDeploy && lastDeploy !== git('rev-parse HEAD')) {
            const impact = spawnSync('node', ['tools/impact_tests.js', '--ref', lastDeploy], { encoding: 'utf8' });
            const out = (impact.stdout || '').trim();
            if (impact.status === 0 && out && !out.includes('분석할 파일이 없습니다')) {
                const m = out.match(/영향 요구사항 (\d+)개/);
                const count = m ? parseInt(m[1], 10) : 0;
                const HIGH_IMPACT = ['src/app.js', 'src/state.js', 'src/storage.js', 'src/data-loader.js', 'sw.js'];
                const changed = git(`diff --name-only ${lastDeploy}..HEAD`).split('\n');
                const hitCore = changed.filter(f => HIGH_IMPACT.includes(f));
                if (hitCore.length || count >= 10) {
                    console.log(`\n⚠️  배포 영향 경고 — 영향 요구사항 ${count}개` +
                        (hitCore.length ? ` · 코어 파일 변경: ${hitCore.join(', ')}` : ''));
                    console.log(out.split('\n').filter(l => l.startsWith('  ') || l.startsWith('■')).slice(0, 20).join('\n'));
                    console.log('   → 배포 후 핵심 플로우 스모크 확인 권장 (학습 진행 저장·뷰 전환·데이터 로드)\n');
                } else {
                    console.log(`ℹ️  영향 분석: 요구사항 ${count}개 (경미 — 자세히: node tools/impact_tests.js --ref ${lastDeploy.slice(0, 8)})`);
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️  영향 분석 생략 (${e.message})`);
    }

    // 콘텐츠 품질 게이트 — 콤보 감사 오류(무결성·회귀)가 있으면 배포 차단.
    // 경고는 통과시키되 리포트는 tools/state/combo_audit_report.json에 남는다.
    const audit = spawnSync('node', ['tools/check/audit_combo.js'], { encoding: 'utf8' });
    if (audit.status !== 0) {
        process.stdout.write(audit.stdout || '');
        process.stderr.write(audit.stderr || '');
        fail('audit:combo 품질 게이트 실패 — 오류 해소 후 배포하세요.');
    }
    console.log('✅ 콤보 품질 게이트 통과');

    // IDE 오류 게이트 — 타입 진단·린트 에러가 있으면 배포 차단.
    // check:types는 IDE와 동일 계열(TS 5.x)의 진단이므로 IDE에 오류가 보이는 상태 = 배포 불가.
    for (const gate of ['check:types', 'lint']) {
        const r = spawnSync(`npm run ${gate} --silent`, { encoding: 'utf8', shell: true });
        if (r.status !== 0) {
            process.stdout.write(r.stdout || '');
            process.stderr.write(r.stderr || '');
            fail(`${gate} 실패 — IDE에 오류가 표시되는 상태에서는 배포할 수 없습니다.`);
        }
    }
    console.log('✅ 타입·린트 게이트 통과 (IDE 오류 없음)');

    // 생성물(index.html·data/ 번들)은 git 미추적 — 커밋 상태와 무관하게 배포
    // 직전 현재 트리에서 재생성해 스테이징 누락을 막는다. 빌드가 추적 파일을
    // 변경하면(원본↔생성물 동기화 누락) 그 상태는 커밋되지 않은 것이므로 차단.
    console.log('▶ 배포용 생성물 빌드');
    for (const cmd of ['build:html', 'build:landing', 'build:data', 'build:drills']) {
        const r = spawnSync(`npm run ${cmd} --silent`, { encoding: 'utf8', shell: true });
        if (r.status !== 0) {
            process.stdout.write(r.stdout || '');
            process.stderr.write(r.stderr || '');
            fail(`${cmd} 실패 — 생성물을 만들 수 없어 배포할 수 없습니다.`);
        }
    }
    {
        const r = spawnSync('node tools/build/build_doc_bundles.js', { encoding: 'utf8', shell: true });
        if (r.status !== 0) {
            process.stdout.write(r.stdout || '');
            process.stderr.write(r.stderr || '');
            fail('build_doc_bundles 실패 — 생성물을 만들 수 없어 배포할 수 없습니다.');
        }
    }
    // 빌드는 sw.js CACHE_VERSION을 HEAD 해시로 재스탬프한다 — 커밋된 값은
    // 항상 지난 스탬프라 이 라인만의 차이는 정상 (check:datafresh의 노이즈 규칙과 동일)
    const noiseOnlyDiff = (f) => noiseOnlyDiffText(git(`diff -U0 HEAD -- "${f}"`));
    // parseStatusLine: porcelain 상태 열 정규식 제거 (lib 공용)
    const postBuildDirty = git('status --porcelain').split('\n').filter(Boolean)
        .map(parseStatusLine).filter((f) => !noiseOnlyDiff(f));
    if (postBuildDirty.length) {
        console.error(postBuildDirty.join('\n'));
        fail('빌드가 추적 파일을 변경했습니다 — 동기화 누락입니다. 변경을 커밋·푸시(CI 통과) 후 재배포하세요.');
    }
    console.log('✅ 생성물 빌드 완료 (index.html · data/ 번들 · 문서 번들)');

    // sw.js CACHE_VERSION + 앱 버전/릴리스 노트 스탬프 — 커밋하지 않고 작업 트리에만
    // 적용한다. vercel --prod는 로컬 파일을 업로드하므로 프로덕션에는 스탬프된
    // 내용이 그대로 배포되고, 배포 후 원복하면 이력 노이즈(chore(sw) 커밋)가 없다.
    // 배포 이력은 deploy/<버전> 태그가 대신 기록한다.
    const stamp = stampSwVersion();
    const stampedFiles = [];
    const restoreStamps = () => {
        if (!stampedFiles.length) return;
        try {
            git(`checkout -- ${stampedFiles.map((f) => `"${f}"`).join(' ')}`);
        } catch (e) {
            console.warn(`⚠️  스탬프 원복 실패 — 수동으로 복원하세요: ${stampedFiles.join(', ')} (${e.message})`);
        }
    };
    if (stamp.newValue) {
        // build:data가 이미 sw.js를 HEAD 해시로 재스탬프하므로 stamp.changed는
        // '신버전 배포'가 아니라 빌드 스탬프 여부일 뿐 — version.js·릴리스 노트·
        // package.json은 배포마다 갱신해야 한다.
        // prevVersion(자동 초안의 커밋 범위 기준)은 version.js에 남은 이전
        // 배포 스탬프에서 읽는다 — stamp.oldValue는 이미 HEAD라 쓸 수 없다.
        const prevDeployed = (fs.readFileSync(
            path.join(__dirname, '..', '..', 'data', 'version.js'), 'utf8')
            .match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
        // data/version.js를 동일 버전으로 갱신하고, pending 노트를 확정
        // (pending이 없으면 커밋 subject로 자동 초안 — 배포 전 notes:draft로 편집 권장)
        stampReleaseNotes({ version: stamp.newValue, prevVersion: prevDeployed });
        // porcelain 캡처 대신 스탬프 대상 파일을 명시 — 직후 status가 stat 캐시로
        // 방금 쓴 파일을 놓치는(racy-clean) 경합이 관측돼 원복 누락이 생겼다.
        stampedFiles.push('sw.js', 'data/version.js', 'data/release-notes.js',
            'data/release-notes.json', 'package.json');
        console.log(`✅ 스탬프 적용 (${stamp.newValue}) — 배포 후 원복 · 이력은 deploy 태그\n`);
    }

    // DEP0190 — shell:true + 인자 배열 금지. win32의 vercel.cmd는 shell 경유가
    // 필요하므로 직접 인용한 단일 명령 문자열로 전달한다.
    // 스테이징 디렉터리에서 실행해 .vercelignore 외 자산(mp3·.tmp 등)이
    // 아카이브에도 포함되지 않도록 한다.
    const staging = await makeStagingDir();
    console.log(`📦 배포 스테이징 — ${staging.fileCount}파일 → ${staging.dir}`);
    let result;
    try {
        result = spawnSync(
            ['vercel', '--prod', '--yes', '--archive=tgz', ...vercelScopeArgs()].map(quoteArg).join(' '),
            { stdio: 'inherit', shell: true, cwd: staging.dir });
    } finally {
        // win32는 vercel.cmd 자식의 cwd 핸들이 수십 초간 남아 EPERM이 날 수
        // 있다. 즉시 삭제를 시도하고, 실패하면 detached 헬퍼가 최대 5분간
        // 재시도한다 — 배포 흐름을 블로킹하지 않으며 잔재는 Temp라 무해하다.
        try {
            fs.rmSync(staging.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
        } catch { /* 아래 분기에서 처리 */ }
        if (fs.existsSync(staging.dir)) {
            try {
                const child = spawn(
                    process.execPath,
                    [path.join(__dirname, 'cleanup_staging.js'), staging.dir],
                    { detached: true, stdio: 'ignore' });
                child.unref();
            } catch {
                console.warn(`⚠️  스테이징 정리 실패 — 수동 삭제: ${staging.dir}`);
            }
        }
    }
    if ((result.status ?? 1) !== 0) {
        restoreStamps();
        // 운영 알림 — webhook 미설정이면 내부에서 조용히 skip (AD-10)
        await postDiscord(eventEmbed('배포 실패 — vercel --prod', false, [
            { name: '종료 코드', value: String(result.status ?? 1), inline: true },
            { name: '커밋', value: git('rev-parse --short HEAD') || 'unknown', inline: true },
        ]));
        process.exit(result.status ?? 1);
    }

    // 배포 성공 — deploy/<버전> 태그로 이력 기록 후 스탬프 파일 원복.
    // stamped는 스탬프 변경 시 새 버전, 동일 버전 재배포 시 파일에 남은 값.
    const stamped = stamp.changed ? stamp.newValue
        : (fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8').match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1];
    try {
        if (stamped) {
            const tag = `deploy/${stamped}`;
            if (git(`tag -l ${tag}`)) {
                console.log(`ℹ️  deploy 태그 이미 존재 (${tag}) — 동일 버전 재배포`);
            } else {
                git(`tag -a ${tag} -m "deploy ${stamped}"`);
                git(`push origin ${tag} --quiet`);
                console.log(`✅ 배포 이력 태그 기록 (${tag})`);
            }
        }
    } catch (e) {
        // 태그 실패는 배포 자체를 무효화하지 않는다 — 이미 프로덕션에 올라간 상태
        console.warn(`⚠️  deploy 태그 기록 실패 (배포는 완료됨): ${e.message}`);
    } finally {
        // 스탬프 5종은 원복하지 않고 확정 커밋으로 남긴다 — 저장소가 실제
        // 릴리스 기록(버전·노트·패키지·SW)을 보존해야 한다. release-notes.json을
        // 원복하면 pending 초안이 소비되지 않아 다음 배포가 같은 초안을
        // 재스탬프해 같은 노트를 반복 공지하고, version.js가 구 값에 머물러
        // check:notes의 최신노트↔APP_VERSION 정합이 깨진다.
        // --no-verify: 스탬프 산출물의 기계적 기록 커밋이라 훅 게이트 비대상.
        try {
            if (stampedFiles.length) {
                git(`add ${stampedFiles.map((f) => `"${f}"`).join(' ')}`);
                // 동일 버전 재배포 등 이미 확정된 상태면 스킵
                if (git(`diff --cached --name-only`)) {
                    // 면제 마크는 행 끝 계약이라 같은 줄에 붙이면 앞 마크가 무효 — 각자 행 끝으로
                    git(`commit --no-verify -m "chore(release): ${stamped} 스탬프 확정 [no-docs]" -m "[no-test]"`);
                    console.log(`✅ 릴리스 스탬프 확정 커밋 (${stamped}) — 푸시는 다음 작업과 함께`);
                }
            }
        } catch (e) {
            // 스테이징 잔재 해제 후 원복 경로로 — 트리는 clean으로 돌아간다
            try { git(`reset -q`); } catch {}
            console.warn(`⚠️  릴리스 스탬프 확정 커밋 실패 — 수동 커밋 필요: ${stampedFiles.join(', ')} (${e.message})`);
        }
        restoreStamps();
    }

    // 배포 후 스모크 — 200·스탬프 불일치·엣지 정체를 자동 탐지
    const baseUrl = projectUrl();
    if (baseUrl && stamped) {
        console.log(`\n▶ 배포 후 스모크 — ${baseUrl}`);
        smokeCheck(baseUrl, stamped).then(async (fails) => {
            // 운영 알림 — webhook 미설정이면 내부에서 조용히 skip (AD-10)
            const fields = [
                { name: '버전', value: stamped, inline: true },
                { name: 'URL', value: baseUrl, inline: true },
            ];
            if (fails.length) {
                fields.push({ name: '스모크 실패', value: fails.join('\n').slice(0, 900) });
                console.error(`\n❌ 스모크 실패:\n  ${fails.join('\n  ')}\n  배포는 됐지만 프로덕션 응답 이상 — Vercel 대시보드·엣지 캐시 확인`);
                await postDiscord(eventEmbed('배포 완료 — 스모크 실패 ⚠️', false, fields));
                process.exit(1);
            }
            console.log('✅ 프로덕션 스모크 통과');
            await postDiscord(eventEmbed('배포 완료', true, fields));
            await notifyCommunity(stamped, baseUrl);
        });
    } else if (stamped) {
        // 스모크 대상 URL을 모르는 환경에서도 커뮤니티 공지는 발송
        await notifyCommunity(stamped, baseUrl);
    }
}

main().catch((e) => {
    console.error(`\n❌ 배포 실패: ${e.message}\n`);
    process.exit(1);
});
