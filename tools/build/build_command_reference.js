#!/usr/bin/env node
/**
 * build_command_reference.js — docs/dev/reference/COMMANDS.md 생성기
 *
 * 정본 소스:
 *   1) package.json scripts        — npm 스크립트 전체 목록 (그룹 = 접두어)
 *   2) tools/check/steps.js        — 검증 단계 레지스트리 (id·desc·prio·명령)
 *   3) 각 도구 파일의 헤더 주석     — `// x.js — <설명>` 첫 행
 *
 * 세 소스가 이미 단일 진실이므로 이 문서는 "조합 뷰"일 뿐 별도 편집 대상이 아니다.
 * 출력은 입력 대비 결정론적 — --check는 재생성 문자열과 파일을 비교해 drift를 감지한다.
 *
 * 사용:
 *   node tools/build/build_command_reference.js          # 생성
 *   node tools/build/build_command_reference.js --check  # 신선도 검증 (docs:cmdref 단계)
 */

// @spec none (문서 생성기)
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'dev', 'reference', 'COMMANDS.md');
const CHECK_MODE = process.argv.includes('--check');

const { allSteps, PRESETS } = require('../check/steps.js');
const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;

// ── 도구 파일 헤더에서 설명 추출 (`// x.js — <설명>` / `* x.js — <설명>` 첫 매칭) ──
function toolDesc(file) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) return '';
    const head = fs.readFileSync(abs, 'utf8').split('\n').slice(0, 40).join('\n');
    const m = head.match(/^[/\s*]*\S+\.(?:js|mjs|py)\s*—\s*(.+)$/m);
    if (m) return m[1].trim().replace(/\.\s*$/, '');
    const m2 = head.match(/^[/\s*]*(.{10,140}?)—(.+)$/m);
    if (m2) return m2[2].trim().replace(/\.\s*$/, '');
    return '';
}

const stepByToken = new Map();
for (const s of allSteps()) {
    if (s.token) stepByToken.set(s.token, s);
    stepByToken.set(path.basename(s.args[0] || '', '.js'), s);
}

function scriptDesc(name, body) {
    const step = stepByToken.get(`npm run ${name}`) || stepByToken.get(`npm run check:${name.replace(/^check:/, '')}`);
    if (step) return step.desc;
    const tool = body.match(/(?:tools|ref-pipeline)\/[\w./-]+\.(?:js|mjs|py)/);
    if (tool) return toolDesc(tool[0]);
    const chain = [...body.matchAll(/npm\s+run\s+([\w:-]+)/g)].map((m) => m[1]);
    if (chain.length) return `체인: ${chain.join(' → ')}`;
    return '';
}

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();

// ── 프리셋 요약 (정본 steps.js — 안내 문구는 본 생성기의 고정 라벨) ──
const PRESET_INFO = {
    content: '콘텐츠 통합 검증 — 교재 교체 등 대규모 콘텐츠 변경 후 (--quick, --content-only, --build 옵션)',
    docs: '문서 정합 묶음 — 경로 참조·문서 ID·트리·명령 정합 등',
    ci: 'CI 게이트 로컬 재현 — ci.yml과 토큰 1:1 대응',
    all: '저장소 전체 검증 — lint·types·docs·콘텐츠·테스트 일괄',
    refs: '참조자료 검증 묶음 — 레이아웃·귀속·신선도·인용 라인·병합 품질',
    freshness: '생성물 신선도 묶음 — 파생물 미재생성 감지',
    audit: '감시·감사 묶음 — P2 advisory (실패해도 종료 0·차단 없음)',
};

function emit() {
    const L = [];
    L.push('# 명령 카탈로그 — npm 스크립트·검증 단계 전체 (COMMANDS.md)');
    L.push('');
    L.push('> ⚙️ **생성물** — `npm run build:commands`로 재생성. 직접 편집 금지.');
    L.push('> 정본: `package.json` scripts + `tools/check/steps.js` 단계 레지스트리 + 각 도구 헤더 주석.');
    L.push('> **문서 ID**: DOC-REF-19');
    L.push('> **범위**: platform · 판본: none');
    L.push('> **관련 SPEC ID**: 해당 없음 (명령 카탈로그 — 개별 단계는 각 SPEC에 귀속)');
    L.push('');
    L.push('---');
    L.push('');
    L.push('## 1. 검증 실행기 (run.js 프리셋)');
    L.push('');
    L.push('단일 진입점은 `tools/check/run.js` — 프리셋이 `steps.js`에 선언된 단계 묶음을 실행한다.');
    L.push('');
    L.push('```powershell');
    L.push('npm.cmd run check -- --preset <이름> [--quick|--content-only|--build|--jobs N|--ref <ref>]');
    L.push('npm.cmd run check -- --step <id>      # 단일 단계만 (--list로 id 조회)');
    L.push('```');
    L.push('');
    L.push('| 프리셋 | 단계 수 | 용도 |');
    L.push('|---|---|---|');
    for (const name of Object.keys(PRESETS)) {
        const n = PRESETS[name]({ quick: false }).length;
        L.push(`| \`${name}\` | ${n} | ${PRESET_INFO[name] || ''} |`);
    }
    L.push('');
    L.push('## 2. 검증 단계 카탈로그 (steps.js 레지스트리)');
    L.push('');
    L.push('| 단계 id | 티어 | 분류 | 명령 | 설명 |');
    L.push('|---|---|---|---|---|');
    for (const s of allSteps()) {
        // s.bin은 플랫폼 분기(win32=npm.cmd / 그 외=npm) — 카탈로그는 Windows 개발
        // 환경 표기(npm.cmd)로 정규화해 Linux CI에서도 재생성 결과가 동일하도록 한다.
        const bin = s.bin === 'npm' ? 'npm.cmd' : s.bin;
        const cmd = `${bin} ${s.args.join(' ')}`.trim();
        L.push(`| \`${s.id}\` | ${(s.prio || 'p1').toUpperCase()} | ${s.layer} | \`${esc(cmd)}\` | ${esc(s.desc)} |`);
    }
    L.push('');
    L.push('## 3. npm 스크립트 전체 (package.json)');
    L.push('');
    const groups = new Map();
    for (const [name, body] of Object.entries(scripts)) {
        const g = name.includes(':') ? name.split(':')[0] : '기타';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push([name, body]);
    }
    for (const [g, list] of groups) {
        L.push(g === '기타' ? `### 기타 — ${list.length}개` : `### \`${g}:*\` — ${list.length}개`);
        L.push('');
        L.push('| 스크립트 | 실행 내용 | 설명 |');
        L.push('|---|---|---|');
        for (const [name, body] of list) {
            L.push(`| \`npm run ${name}\` | \`${esc(body)}\` | ${esc(scriptDesc(name, body))} |`);
        }
        L.push('');
    }
    L.push('---');
    L.push('');
    L.push('※ 이 파일은 생성물이다. 스크립트·단계 추가 시 package.json / steps.js를 수정한 뒤 `npm run build:commands`로 재생성할 것.');
    L.push('');
    return L.join('\n');
}

const next = emit();
if (CHECK_MODE) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur.replace(/\r\n/g, '\n') === next.replace(/\r\n/g, '\n')) {
        console.log('✅ COMMANDS.md가 최신 생성 상태입니다');
        process.exit(0);
    }
    console.error('❌ COMMANDS.md가 정본(package.json·steps.js·도구 헤더)과 불일치 — npm run build:commands 실행 필요');
    process.exit(1);
}
fs.writeFileSync(OUT, next, 'utf8');
console.log(`✅ COMMANDS.md 생성 — ${next.split('\n').length}줄, 스크립트 ${Object.keys(scripts).length}개 · 단계 ${allSteps().length}개`);
