#!/usr/bin/env node
/**
 * audit_tool_usage.js — tools/ 도달성·단계 생존 감사 (advisory 전용, 종료 0)
 * @spec none (감사)
 *
 * tools/ 하위 스크립트가 실제 진입점에서 도달 가능한지 정적 감사한다.
 * "게이트·도구도 코드 — 안 쓰이면 유지비만 발생" 원칙의 주기 점검 도구.
 *
 * 진입점 = package.json scripts 전체 문자열 + steps.js 단계 레지스트리 +
 *          .github/workflows run 라인 + .githooks/* + 루트 스크립트(serve.js).
 * 그래프 = require()/import 상대 경로 재귀 + 소스 내 'tools/x.js' 리터럴 참조
 *          (execSync·spawn 등 동적 실행 커버).
 *
 * 보고 항목:
 *   1) 도달 불가 tools/*.js — 사망 후보 (EXEMPT 접두사 제외)
 *   2) steps.js 등록 단계 중 어느 PRESET에도 속하지 않은 단계 — 죽은 게이트
 *   3) tools/state/step_runs.jsonl 최근 30일 미실행 단계 (로그 존재 시)
 *
 * 사용: node tools/check/audit_tool_usage.js   (npm run audit:tools)
 */

// @spec none (감사)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOLS_DIR = path.join(ROOT, 'tools');

// 컨벤션 로딩·외부 런타임·아카이브 — 정적 도달성으로 판정 불가한 제외 접두사
const EXEMPT_PREFIXES = [
    ['tools/_archive/', '아카이브 (설계상 미실행)'],
    ['tools/supabase/', 'Supabase Edge Functions (Deno 런타임)'],
    ['tools/build/plugins/', '컨벤션 로딩 플러그인 (readdir+동적 require)'],
];

// ── 진입점 수집 ────────────────────────────────────────────────────
const entries = new Set();
const addEntry = (rel) => { if (rel && rel.endsWith('.js')) entries.add(rel); };

// 1) package.json scripts — 모든 명령 문자열의 node 참조가 진입점
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
for (const cmd of Object.values(pkg.scripts || {})) {
    for (const m of String(cmd).matchAll(/node\s+(?:--\w+\s+)*([\w./-]+\.js)/g)) addEntry(m[1]);
}

// 2) steps.js 단계 레지스트리 — nodeStep의 첫 인자 스크립트
let stepsMod = null;
try { stepsMod = require('./steps.js'); } catch { /* 레지스트리 부재 시 스킵 */ }
if (stepsMod) {
    for (const s of stepsMod.allSteps()) {
        for (const a of s.args || []) if (/^tools\/.+\.js$/.test(a)) addEntry(a);
    }
}

// 3) .github/workflows + .githooks — node 직접 호출
const scanCmdFile = (abs) => {
    if (!fs.existsSync(abs)) return;
    for (const m of fs.readFileSync(abs, 'utf8').matchAll(/node\s+(?:--\w+\s+)*([\w./-]+\.js)/g)) addEntry(m[1]);
};
const wfDir = path.join(ROOT, '.github', 'workflows');
if (fs.existsSync(wfDir)) for (const f of fs.readdirSync(wfDir)) if (/\.ya?ml$/.test(f)) scanCmdFile(path.join(wfDir, f));
const hooksDir = path.join(ROOT, '.githooks');
if (fs.existsSync(hooksDir)) for (const f of fs.readdirSync(hooksDir)) scanCmdFile(path.join(hooksDir, f));
for (const rootJs of ['serve.js', 'playwright.config.js']) addEntry(rootJs);

// 4) 문서 진입점 — AGENTS/README/docs에 'tools/x.js'로 기재된 수동 호출 도구
//    (무인자 CLI·무거운 진단 등 npm 스크립트 없이 직접 쓰는 도구는 문서가 생명줄)
const DOCS = ['AGENTS.md', 'README.md'];
const docsDir = path.join(ROOT, 'docs');
const docFiles = DOCS.filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => path.join(ROOT, f));
(function collectDocs(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) collectDocs(p);
        else if (e.name.endsWith('.md')) docFiles.push(p);
    }
})(docsDir);
for (const df of docFiles) {
    for (const m of fs.readFileSync(df, 'utf8').matchAll(/tools\/[\w./-]+\.js/g)) addEntry(m[0]);
}

// ── tools/ 전체 파일 ───────────────────────────────────────────────
function walkJs(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walkJs(p));
        else if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
}
const allTools = walkJs(TOOLS_DIR).map((f) => path.relative(ROOT, f).split(path.sep).join('/'));

// ── 도달성 그래프 ──────────────────────────────────────────────────
const IMPORT_RE = /(?:require\(|import\s+(?:[\w*{}\s,]+\s+from\s+)?|import\()\s*['"]([^'"]+)['"]/g;
const TOOLS_LIT_RE = /['"](tools\/[\w./-]+\.js)['"]/g;
// path.join(__dirname, 'x.js')·path.join(ROOT,'tools','a.js') 등 조합 경로의 .js 인자
const JOIN_ARG_RE = /path\.(?:posix\.)?join\(([^)]*?)\)/g;
const JS_ARG_RE = /['"]([\w./-]+\.js)['"]/g;

const reachable = new Set();
const queue = [...entries].filter((e) => fs.existsSync(path.join(ROOT, e)));
while (queue.length) {
    const rel = queue.pop();
    if (reachable.has(rel)) continue;
    reachable.add(rel);
    let src;
    try { src = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { continue; }
    // 상대 경로 require/import — tools/ 내부만 추적
    for (const m of src.matchAll(IMPORT_RE)) {
        const spec = m[1];
        if (!spec.startsWith('.')) continue;
        const base = path.posix.join(path.posix.dirname(rel), spec);
        for (const cand of [base, base + '.js', path.posix.join(base, 'index.js')]) {
            if (cand.startsWith('tools/') && cand.endsWith('.js') && fs.existsSync(path.join(ROOT, cand)) && !reachable.has(cand)) queue.push(cand);
        }
    }
    // 소스 내 절대 리터럴 'tools/x.js' — spawn·execSync 동적 호출
    for (const m of src.matchAll(TOOLS_LIT_RE)) {
        if (fs.existsSync(path.join(ROOT, m[1])) && !reachable.has(m[1])) queue.push(m[1]);
    }
    // path.join(...)의 .js 인자 — __dirname 기준 상대 해석 시도 (두 축 모두 커버)
    for (const jm of src.matchAll(JOIN_ARG_RE)) {
        for (const am of jm[1].matchAll(JS_ARG_RE)) {
            const arg = am[1];
            const cands = arg.startsWith('tools/')
                ? [arg]
                : [path.posix.join(path.posix.dirname(rel), arg), 'tools/' + arg];
            for (const cand of cands) {
                if (cand.startsWith('tools/') && cand.endsWith('.js')
                    && fs.existsSync(path.join(ROOT, cand)) && !reachable.has(cand)) queue.push(cand);
            }
        }
    }
}

const isExempt = (f) => EXEMPT_PREFIXES.find(([p]) => f.startsWith(p));
const dead = allTools.filter((f) => !reachable.has(f));

console.log(`tools/ 도달성 감사 — 진입점 ${entries.size}개 → 도달 가능 ${reachable.size}개 / 전체 ${allTools.length}개\n`);

const deadReal = dead.filter((f) => !isExempt(f));
const deadExempt = dead.filter((f) => isExempt(f));
console.log(`■ 사망 후보 (진입점에서 도달 불가): ${deadReal.length}개`);
for (const f of deadReal) {
    const kb = (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(1);
    console.log(`   ${f}  (${kb}KB)`);
}
if (deadExempt.length) {
    console.log(`\n■ 면제 (컨벤션·외부 런타임): ${deadExempt.length}개`);
    for (const f of deadExempt) console.log(`   ${f} — ${isExempt(f)[1]}`);
}

// ── steps.js 단계 생존 — 레지스트리 등록됐으나 프리셋 미소속 = 죽은 게이트
// withBuild 변형도 소속으로 인정 (content:build는 --build 옵션 전용 단계)
if (stepsMod) {
    const presetIds = new Set();
    for (const name of Object.keys(stepsMod.PRESETS)) {
        for (const opts of [{}, { withBuild: true }]) {
            for (const s of stepsMod.resolveSteps(name, opts)) presetIds.add(s.id);
        }
    }
    const orphanSteps = stepsMod.allSteps().filter((s) => !presetIds.has(s.id));
    console.log(`\n■ 프리셋 미소속 단계 (죽은 게이트 후보): ${orphanSteps.length}개`);
    for (const s of orphanSteps) console.log(`   ${s.id} — ${s.desc}`);
}

// ── 실행 텔레메트리 — step_runs.jsonl 최근 30일 미실행 단계
const LOG = path.join(ROOT, 'tools', 'state', 'step_runs.jsonl');
if (fs.existsSync(LOG) && stepsMod) {
    const cutoff = Date.now() - 30 * 86400e3;
    const ranIds = new Set();
    let lines = 0;
    for (const l of fs.readFileSync(LOG, 'utf8').split('\n')) {
        if (!l.trim()) continue;
        try {
            const r = JSON.parse(l);
            if (new Date(r.ts).getTime() >= cutoff) { ranIds.add(r.id); lines++; }
        } catch { /* 손상 라인 무시 */ }
    }
    if (lines) {
        const presetIds = new Set();
        for (const name of Object.keys(stepsMod.PRESETS)) {
            for (const s of stepsMod.resolveSteps(name, {})) presetIds.add(s.id);
        }
        const neverRan = stepsMod.allSteps().filter((s) => presetIds.has(s.id) && !ranIds.has(s.id));
        console.log(`\n■ 최근 30일 미실행 단계 (로그 ${lines}건 기준): ${neverRan.length}개`);
        for (const s of neverRan) console.log(`   ${s.id} — ${s.desc}`);
    } else {
        console.log('\n■ step_runs.jsonl 존재하나 최근 30일 데이터 없음 — 관측 기간 부족');
    }
} else {
    console.log('\n■ step_runs.jsonl 없음 — run.js 텔레메트리 누적 후 미실행 단계 리포트 활성');
}

console.log('\n※ advisory — 후보는 사람 검토 후 정리 (즉시 차단 아님)');
process.exit(0);
