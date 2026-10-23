// tests/unit/gates/env-doctor.test.js — 개발환경 진단 리포트 검증
// @spec none (개발환경 진단 도구)
// env_doctor.js의 순수 분석 계층(buildRows·analyze·parseMajor) + 스크립트 종단 스모크.
// 프로브는 I/O라 대상 아님 — env 스냅샷을 주입해 행 분류·exit 코드를 검증한다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(import.meta.url);
const { parseMajor, buildRows, analyze, render, MIN_NODE_MAJOR } = require(join(ROOT, 'tools', 'check', 'env_doctor.js'));

const BASE = {
    nodeVersion: 'v24.19.0',
    gitVersion: 'git version 2.43.0.windows.1',
    nodeModules: true,
    hooksPath: '.githooks',
    playwrightChromium: 'chromium-1243',
    python: { version: 'Python 3.12.1', bin: 'python' },
    pipMods: new Set(['sentence_transformers', 'pdfplumber', 'fitz', 'markdown', 'gtts', 'pyttsx3', 'pydub', 'elevenlabs']),
    ffmpeg: 'ffmpeg version 7.1',
    deno: 'deno 2.1.4',
    vercel: 'Vercel CLI 48.1.0',
    dotenv: true,
};

describe('env_doctor — parseMajor', () => {
    it('다양한 버전 문자열에서 major를 추출한다', () => {
        assert.equal(parseMajor('v24.19.0'), 24);
        assert.equal(parseMajor('git version 2.43.0.windows.1'), 2);
        assert.equal(parseMajor('Python 3.12.1'), 3);
        assert.equal(parseMajor('deno 2.1.4'), 2);
        assert.equal(parseMajor('garbage'), null);
        assert.equal(parseMajor(null), null);
    });
});

describe('env_doctor — buildRows 분류', () => {
    it('전부 충족이면 required fail 0 · optional missing 0', () => {
        const rows = buildRows(BASE);
        const { requiredFails, optionalMissing } = analyze(rows);
        assert.equal(requiredFails.length, 0);
        assert.equal(optionalMissing.length, 0);
    });

    it('Node 구버전은 required fail', () => {
        const rows = buildRows({ ...BASE, nodeVersion: 'v20.11.0' });
        const fails = analyze(rows).requiredFails;
        assert.equal(fails.length, 1);
        assert.equal(fails[0].name, 'Node.js');
        assert.match(fails[0].detail, new RegExp(`≥${MIN_NODE_MAJOR}`));
    });

    it('node_modules·git 부재는 각각 required fail', () => {
        const rows = buildRows({ ...BASE, nodeModules: false, gitVersion: null });
        assert.equal(analyze(rows).requiredFails.length, 2);
    });

    it('Python 부재는 required가 아닌 optional info — 루틴 경로를 막지 않는다', () => {
        const rows = buildRows({ ...BASE, python: null, pipMods: null });
        const { requiredFails, optionalMissing } = analyze(rows);
        assert.equal(requiredFails.length, 0);
        const py = optionalMissing.find((r) => r.name === 'Python 3');
        assert.ok(py);
        assert.match(py.need, /build:embeddings/);
        // python 없으면 pip 모듈 행 자체가 생략된다
        assert.ok(!rows.some((r) => r.name.startsWith('pip:')));
    });

    it('python은 있으나 pip 모듈 일부 부재 → 그룹별 미설치 행', () => {
        const rows = buildRows({ ...BASE, pipMods: new Set(['pdfplumber', 'fitz', 'markdown']) });
        const missing = analyze(rows).optionalMissing;
        const emb = missing.find((r) => r.name.includes('sentence-transformers'));
        assert.ok(emb, '임베딩 모듈 부재 행');
        assert.match(emb.need, /build:embeddings/);
        // pdfplumber 그룹은 전부 있으므로 ok
        assert.ok(rows.find((r) => r.name.includes('pdfplumber')).status === 'ok');
    });

    it('hooksPath가 .githooks가 아니면 안내(info)', () => {
        const rows = buildRows({ ...BASE, hooksPath: null });
        const hooks = rows.find((r) => r.name === '.githooks');
        assert.equal(hooks.status, 'info');
        assert.match(hooks.detail, /hooks:install/);
    });
});

describe('env_doctor — 리포트·스크립트', () => {
    it('render는 필수 실패와 선택 부재를 구분해 요약한다', () => {
        const okOut = render(buildRows(BASE));
        assert.match(okOut, /전부 충족/);
        const failOut = render(buildRows({ ...BASE, gitVersion: null }));
        assert.match(failOut, /필수 1건 미충족/);
        const partial = render(buildRows({ ...BASE, ffmpeg: null, deno: null }));
        assert.match(partial, /루틴 경로 사용 가능/);
    });

    it('스크립트 종단 — 이 머신(필수 충족)에서 exit 0 + 진단 리포트 출력', () => {
        const out = execFileSync(process.execPath, [join(ROOT, 'tools', 'check', 'env_doctor.js')],
            { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        assert.match(out, /개발환경 진단/);
        assert.match(out, /Node\.js/);
        assert.match(out, /루틴 경로|전부 충족/);
    });

    it('--json — env·rows를 머신 가독으로 출력', () => {
        const out = execFileSync(process.execPath, [join(ROOT, 'tools', 'check', 'env_doctor.js'), '--json'],
            { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        const doc = JSON.parse(out);
        assert.equal(typeof doc.env.nodeModules, 'boolean');
        assert.ok(doc.rows.find((r) => r.name === 'Node.js'));
    });
});
