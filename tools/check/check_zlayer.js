#!/usr/bin/env node
/**
 * check_zlayer.js — CSS z-index 계층 계약 (UX-SET-06)
 * @spec UX-SET-06
 *
 * 배경: .app-header(앱 크롬)가 뷰 내부 오버레이와 같은 z를 쓰면 DOM 후순 규칙으로
 * 헤더 드롭다운(설정 패널)이 불투명 카드 아래로 가려진다 — .reader-chrome 실사례
 * (2026-10-24). 정적 계약으로 같은 계열 회귀를 차단한다.
 *
 * 계약 (해석값 = --z-* 토큰 해소 후 숫자):
 *   ≤ --z-sticky(100)        뷰 내부 오버레이 대역 — 제한 없음
 *   == --z-popover(200)      앱 크롬 전용 — chromePatterns 등록 셀렉터만
 *   (200, 1400)              금지 대역 — zoneExceptions 등록 외 오류
 *   ≥ --z-drawer(1400)       전면 takeover 대역 — 제한 없음
 *   원시 숫자 z-index        금지 (토큰만) — rawNumericAllowlist 예외
 *
 * 사용:
 *   node tools/check/check_zlayer.js              # 전체 css/ 스캔
 *   node tools/check/check_zlayer.js --ref <base> # 변경 css만 (diff 스코프)
 */

// @spec UX-SET-06
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CSS_DIR = path.join(ROOT, 'css');
const REGISTRY_PATH = path.join(ROOT, 'tools', 'config', 'layer_registry.json');

const REF = process.argv.includes('--ref')
    ? process.argv[process.argv.indexOf('--ref') + 1]
    : null;

// ── css 파일 수집 ──────────────────────────────────────────────────
function walkCss(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walkCss(p));
        else if (e.name.endsWith('.css')) out.push(p);
    }
    return out;
}

let files = walkCss(CSS_DIR).map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
if (REF) {
    let changed;
    try {
        changed = execSync(`git -c core.quotepath=false diff --name-only ${REF} HEAD`, { encoding: 'utf8' })
            .split('\n').filter((f) => /^css\/.+\.css$/.test(f));
    } catch { changed = null; }
    if (!changed) {
        console.warn(`⚠ --ref ${REF} diff 실패 — 전체 스캔으로 폴백`);
    } else {
        files = files.filter((f) => changed.includes(f));
        if (!files.length) { console.log(`✅ 변경 css 없음 (${REF}..HEAD) — 스킵`); process.exit(0); }
    }
}

// ── --z-* 토큰 해석 ────────────────────────────────────────────────
const tokens = {};
const TOKEN_DEF_RE = /--(z-[\w-]+)\s*:\s*(-?\d+)\s*[;!]/g;
for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(TOKEN_DEF_RE)) tokens[m[1]] = Number(m[2]);
}
for (const required of ['z-sticky', 'z-popover', 'z-drawer']) {
    if (!(required in tokens)) {
        console.error(`✗ 필수 토큰 --${required} 정의를 css/에서 찾지 못했습니다`);
        process.exit(2);
    }
}
const STICKY = tokens['z-sticky'];   // 뷰 오버레이 상한 (100)
const POPOVER = tokens['z-popover']; // 앱 크롬 대역 (200)
const DRAWER = tokens['z-drawer'];   // takeover 하한 (1400)

// ── 규칙 레지스트리 ────────────────────────────────────────────────
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const toRes = (obj) => Object.fromEntries(
    Object.entries(obj || {}).map(([k, v]) => [k, { re: new RegExp(k), reason: v }]));
// chromePatterns: { 셀렉터정규식: 요구 해석값 } — 크롬 셀렉터는 지정 대역 유지
// 강제 (헤더를 다시 sticky로 내리는 회귀도 차단) + 크롬 대역의 독점 보장
const chromeEntries = Object.entries(registry.chromePatterns || {})
    .map(([k, expected]) => ({ re: new RegExp(k), expected }));
const zoneExceptions = toRes(registry.zoneExceptions);
const rawAllowlist = toRes(registry.rawNumericAllowlist);
const matchMap = (table, sel) => Object.values(table).find((e) => e.re.test(sel));

// ── 규칙 파싱 — 셀렉터{본문} 단순 스캔 (중첩 @media 무시해도 내부 규칙은 매칭됨)
const RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
const ZINDEX_RE = /z-index\s*:\s*([^;}]+)/g;

/** z-index 값 문자열 → 해석 숫자 | 'raw' 숫자 | null(비정적) */
function resolveValue(raw) {
    const v = raw.replace(/!important/g, '').trim();
    const calc = v.match(/^calc\(\s*var\(--(z-[\w-]+)\)\s*([+-])\s*(-?\d+)\s*\)$/);
    if (calc && calc[1] in tokens) {
        return { value: tokens[calc[1]] + (calc[2] === '-' ? -1 : 1) * Number(calc[3]), raw: false, expr: v };
    }
    const varRef = v.match(/^var\(--(z-[\w-]+)(?:,[^)]*)?\)$/);
    if (varRef && varRef[1] in tokens) return { value: tokens[varRef[1]], raw: false, expr: v };
    if (/^-?\d+$/.test(v)) return { value: Number(v), raw: true, expr: v };
    return { value: null, raw: false, expr: v };
}

const violations = [];
const notes = [];
for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const m of src.matchAll(RULE_RE)) {
        const body = m[2];
        if (!body.includes('z-index')) continue;
        const parts = m[1].split(',').map((s) => s.trim()).filter(Boolean);
        for (const zm of body.matchAll(ZINDEX_RE)) {
            const r = resolveValue(zm[1]);
            if (r.value === null) {
                notes.push(`${f}: ${m[1].trim()} — z-index: ${r.expr} (비정적 값 — 수동 검토)`);
                continue;
            }
            for (const sel of parts) {
                const at = `${f} :: ${sel} :: z-index:${r.expr} (해석 ${r.value})`;
                // 1) 원시 숫자 — 토큰 외 리터럴 금지
                if (r.raw && !matchMap(rawAllowlist, sel)) {
                    violations.push(`${at} — 원시 숫자 z-index 금지 (--z-* 토큰 사용 또는 rawNumericAllowlist 등록)`);
                    continue;
                }
                // 2) 크롬 셀렉터는 지정 대역 유지 강제 — 대역 이탈(하향 회귀 포함) 차단
                const chrome = chromeEntries.find((e) => e.re.test(sel));
                if (chrome) {
                    if (r.value !== chrome.expected) {
                        violations.push(`${at} — 앱 크롬 셀렉터는 z=${chrome.expected}(--z-popover) 고정 — 대역 이탈 시 헤더 드롭다운 오클루전 재발 (UX-SET-06)`);
                    }
                    continue;
                }
                // 3) 금지 대역 (sticky, drawer) — popover는 크롬 전용
                if (r.value === POPOVER) {
                    violations.push(`${at} — --z-popover는 앱 크롬 전용 (chromePatterns 미등록 셀렉터)`);
                    continue;
                }
                if (r.value > STICKY && r.value < DRAWER) {
                    const ex = matchMap(zoneExceptions, sel);
                    if (!ex) {
                        violations.push(`${at} — 금지 대역(${(STICKY + 1)}~${DRAWER - 1}) — 뷰 오버레이는 ≤--z-sticky, 전면 오버레이는 ≥--z-drawer, 앱 크롬은 --z-popover 단독 사용`);
                    } else {
                        notes.push(`${at} — 예외 인정: ${ex.reason}`);
                    }
                }
            }
        }
    }
}

if (notes.length) {
    console.log('ℹ 참고:');
    for (const n of notes) console.log(`   ${n}`);
}
if (violations.length) {
    console.error(`\n❌ z-index 계층 계약 위반 ${violations.length}건:`);
    for (const v of violations) console.error(`   ${v}`);
    console.error(`\n계약: 뷰 오버레이 ≤--z-sticky(${STICKY}) · 앱 크롬 --z-popover(${POPOVER}, chromePatterns) · takeover ≥--z-drawer(${DRAWER}) · 사이 대역 금지`);
    console.error('예외 등록: tools/config/layer_registry.json');
    process.exit(1);
}
console.log(`✅ z-index 계층 계약 통과 — ${files.length}개 css 스캔, 대역 규약 위반 0건`);
