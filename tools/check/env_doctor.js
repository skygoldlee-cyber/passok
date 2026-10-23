#!/usr/bin/env node
/**
 * env_doctor.js — 개발환경 기능별 가용성 진단 리포트
 * @spec none (개발환경 진단 — 게이트 아님, 정보 리포트)
 *
 * "이 머신에서 어떤 명령이 동작하는가"를 한 번에 보여준다.
 * 루틴 경로(clone → build → test → serve → check:all → deploy)는 Node만 요구하고,
 * 제작 경로(PDF 변환·임베딩·오디오북·Edge Function)는 Python 등 선택 도구를
 * 요구한다 — DEV_ENVIRONMENT.md §2·§3의 지식을 실행 가능한 검증으로 옮긴 것.
 *
 * 판정: 필수 항목(Node≥24·git·node_modules) 미충족만 exit 1.
 *       선택 도구 부재는 어떤 명령이 제한되는지 안내할 뿐 exit 0.
 *
 * 사용법:
 *   npm.cmd run doctor                       # 리포트
 *   node tools/check/env_doctor.js --json    # 머신 가독 출력
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT } = require('../lib/env');

// package.json engines.node (>=24)와 정합 — 버전 상향 시 함께 갱신
const MIN_NODE_MAJOR = 24;

// ── 프로브 (I/O — 한 번만 실행해 env 스냅샷 수집) ─────────────────────
function probe(cmd) {
    try {
        const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 });
        return out.trim().split('\n')[0].trim() || null;
    } catch { return null; }
}

/** python → python3 → py -3 순으로 탐지 (Windows는 python·py, POSIX는 python3가 일반) */
function findPython() {
    for (const cmd of ['python --version', 'python3 --version', 'py -3 --version']) {
        const v = probe(cmd);
        if (v && /Python\s+\d/.test(v)) return { version: v, bin: cmd.split(' ')[0] };
    }
    return null;
}

/** 설치된 pip 모듈 집합 — python 부재 시 null. 모듈명은 pip 패키지명이 아닌 import명.
 *  -c 인자를 싱글쿼트만으로 작성 — Windows cmd가 -c "..." 내부의 더블쿼트를 조기 종결한다 */
function findPipModules(pyBin, modules) {
    const list = `'${modules.join("','")}'`;
    const src = `import importlib.util as u;print(','.join(m for m in [${list}] if u.find_spec(m)))`;
    const out = probe(`${pyBin} -c "${src}"`);
    return out === null ? null : new Set(out.split(',').filter(Boolean));
}

function playwrightCacheDir() {
    if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
    if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    return path.join(os.homedir(), '.cache', 'ms-playwright');
}

/** 설치된 chromium-NNNN 디렉터리명 (최신) — playwright.config은 chromium만 사용 */
function findPlaywrightChromium() {
    try {
        return fs.readdirSync(playwrightCacheDir())
            .filter((d) => /^chromium-\d+$/.test(d)).sort().pop() || null;
    } catch { return null; }
}

const PIP_GROUPS = [
    { mods: ['pdfplumber', 'fitz', 'markdown'], label: 'pdfplumber·PyMuPDF·markdown', need: 'convert:refs · verify:refs · md2doc' },
    { mods: ['gtts', 'pyttsx3', 'pydub', 'elevenlabs'], label: 'TTS 모음(gtts·pyttsx3·pydub·elevenlabs)', need: '오디오북 TTS 생성' },
];

function collectEnv() {
    const python = findPython();
    const pipMods = python ? findPipModules(python.bin, PIP_GROUPS.flatMap((g) => g.mods)) : null;
    return {
        nodeVersion: process.version,
        gitVersion: probe('git --version'),
        nodeModules: fs.existsSync(path.join(ROOT, 'node_modules', 'vitest')),
        hooksPath: probe('git config --get core.hooksPath'),
        playwrightChromium: findPlaywrightChromium(),
        python,
        pipMods,
        ffmpeg: probe('ffmpeg -version'),
        deno: probe('deno --version'),
        vercel: probe('vercel --version'),
        dotenv: fs.existsSync(path.join(ROOT, '.env')),
    };
}

// ── 분석 (순수 — 테스트는 env를 주입해 검증) ─────────────────────────
/** 'v24.19.0'·'git version 2.43.0.windows.1'·'Python 3.12.1'에서 major 추출 */
function parseMajor(versionText) {
    const m = String(versionText || '').match(/(\d+)\.\d+/);
    return m ? parseInt(m[1], 10) : null;
}

/**
 * env 스냅샷 → 행 배열. level: required(필수 — exit 코드 결정) | optional(안내)
 * status: ok | fail(필수 미충족) | info(선택 부재 — 해당 명령만 제한)
 */
function buildRows(env) {
    const rows = [];
    const nodeOk = (parseMajor(env.nodeVersion) || 0) >= MIN_NODE_MAJOR;
    rows.push({ level: 'required', name: 'Node.js', status: nodeOk ? 'ok' : 'fail',
        detail: `${env.nodeVersion} (≥${MIN_NODE_MAJOR} 필요 — .nvmrc·engines)`, need: '전체' });
    rows.push({ level: 'required', name: 'git', status: env.gitVersion ? 'ok' : 'fail',
        detail: env.gitVersion || '없음', need: '소스 관리·deploy 가드' });
    rows.push({ level: 'required', name: 'node_modules', status: env.nodeModules ? 'ok' : 'fail',
        detail: env.nodeModules ? '설치됨' : '없음 — npm install 실행', need: 'test:dom · check:all · lint' });

    rows.push({ level: 'optional', name: '.githooks', status: env.hooksPath === '.githooks' ? 'ok' : 'info',
        detail: env.hooksPath === '.githooks' ? '활성 (pre-commit·pre-push 게이트)' : `미설치(${env.hooksPath || '기본'}) — npm run hooks:install`,
        need: '로컬 커밋·푸시 게이트' });
    rows.push({ level: 'optional', name: 'Playwright chromium', status: env.playwrightChromium ? 'ok' : 'info',
        detail: env.playwrightChromium || '없음 — npx playwright install chromium', need: 'test:e2e' });
    rows.push({ level: 'optional', name: 'Python 3', status: env.python ? 'ok' : 'info',
        detail: env.python ? `${env.python.version} (${env.python.bin})` : '없음 — 제작 경로만 제한 (루틴 경로 정상)',
        need: 'convert:refs · 오디오북' });
    if (env.python && env.pipMods) {
        for (const g of PIP_GROUPS) {
            const missing = g.mods.filter((m) => !env.pipMods.has(m));
            rows.push({ level: 'optional', name: `pip: ${g.label}`, status: missing.length ? 'info' : 'ok',
                detail: missing.length ? `미설치 ${missing.join('·')} — pip install -r ref-pipeline/…/requirements.txt` : '설치됨',
                need: g.need });
        }
    }
    rows.push({ level: 'optional', name: 'ffmpeg', status: env.ffmpeg ? 'ok' : 'info',
        detail: env.ffmpeg ? env.ffmpeg.split(' ').slice(0, 3).join(' ') : '없음 (winget install ffmpeg)', need: '오디오북 MP3 병합' });
    rows.push({ level: 'optional', name: 'vercel CLI', status: env.vercel ? 'ok' : 'info',
        detail: env.vercel || '없음 — npm i -g vercel', need: 'npm run deploy' });
    rows.push({ level: 'optional', name: 'Deno', status: env.deno ? 'ok' : 'info',
        detail: env.deno || '없음', need: 'Edge Function 로컬 개발' });
    rows.push({ level: 'optional', name: '.env', status: env.dotenv ? 'ok' : 'info',
        detail: env.dotenv ? '존재함' : '없음 — .env.example 참조', need: 'AI 제작 도구 · 운영 CLI(report:*·admin:*)' });
    return rows;
}

function analyze(rows) {
    return {
        requiredFails: rows.filter((r) => r.level === 'required' && r.status === 'fail'),
        optionalMissing: rows.filter((r) => r.level === 'optional' && r.status === 'info'),
    };
}

const MARK = { ok: '✅', fail: '❌', info: 'ℹ️ ' };

function render(rows) {
    const { requiredFails, optionalMissing } = analyze(rows);
    const lines = ['🩺 개발환경 진단 — 루틴 경로는 Node-only, 제작 경로만 선택 도구 필요', ''];
    lines.push('── 필수 ────────────────────────────────────────────');
    for (const r of rows.filter((x) => x.level === 'required')) {
        lines.push(`  ${MARK[r.status]} ${r.name} — ${r.detail}`);
    }
    lines.push('── 선택 ── (부재해도 루틴 경로는 정상 동작)');
    for (const r of rows.filter((x) => x.level === 'optional')) {
        lines.push(`  ${MARK[r.status]} ${r.name} — ${r.detail}   ·   ${r.need}`);
    }
    lines.push('');
    if (requiredFails.length) {
        lines.push(`❌ 필수 ${requiredFails.length}건 미충족 — 루틴 경로 불가. DEV_ENVIRONMENT.md §4 절차를 따르세요.`);
    } else if (optionalMissing.length) {
        lines.push(`✅ 루틴 경로 사용 가능 — 선택 ${optionalMissing.length}건 미설치는 표기된 명령만 제한`);
    } else {
        lines.push('✅ 전부 충족 — 모든 명령 사용 가능');
    }
    return lines.join('\n');
}

function main(argv = process.argv.slice(2)) {
    const env = collectEnv();
    if (argv.includes('--json')) {
        console.log(JSON.stringify({ env: { ...env, pipMods: env.pipMods ? [...env.pipMods] : null }, rows: buildRows(env) }, null, 2));
        return analyze(buildRows(env)).requiredFails.length ? 1 : 0;
    }
    const rows = buildRows(env);
    console.log(render(rows));
    return analyze(rows).requiredFails.length ? 1 : 0;
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('env_doctor.js');
if (isDirectRun) process.exit(main());

module.exports = { parseMajor, buildRows, analyze, render, collectEnv, main, PIP_GROUPS, MIN_NODE_MAJOR };
