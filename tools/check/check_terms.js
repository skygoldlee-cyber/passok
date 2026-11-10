#!/usr/bin/env node
// tools/check/check_terms.js — 사용자 표시 용어 정합 게이트 (Pro/Free 잔재 차단)
// @spec none — 정책 게이트: PLAN_TERMS(uitext-defaults.js) 외 사용자 문자열에 구 표기 잔류 금지
const { readFileSync, readdirSync, statSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const ROOT = join(__dirname, '../..');
const DIRS = ['src', 'html'];
const FILES = ['index.template.html', 'docs/user/user_manual.md'];
// 시험별 문서는 exams 루트를 동적 순회 — 시험 id 하드코딩 금지 (DA-15)
try { for (const ex of readdirSync(join(ROOT, 'content/exams'))) DIRS.push(`content/exams/${ex}/docs`); } catch {}
// 사용자 표시 금지 패턴 — Pro/PRO 배지·플랜 표기 + Free 플랜 (식별자·코드 주석은 허용)
const BAN = [
    [/>PRO</, '배지 리터럴 >PRO<'],
    [/Pro\s*(기능|전용|기간권|활성화|제공|표시|표기|업그레이드|결제|플랜|가입|라이선스|코드|안내|버전)/, 'Pro + 한글 표기'],
    [/'Pro'|"Pro"/, "리터럴 'Pro' 표시"],
    [/Free\s*플랜/, 'Free 플랜'],
    [/Free\s*\/\s*Pro|Free와\s*Pro/, 'Free/Pro 비교 표기'],
    [/\(PRO\)|\(Pro\)/, '(PRO)/(Pro) 표기'],
];
const SKIP = /node_modules|\.git|dist|build/;
const EXT = /\.(js|html|md)$/;
function* walk(d) {
    for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (SKIP.test(p)) continue;
        if (statSync(p).isDirectory()) yield* walk(p); else if (EXT.test(e)) yield p;
    }
}
let bad = 0;
for (const t of [...DIRS.map(d => join(ROOT, d)), ...FILES.map(x => join(ROOT, x))].filter(existsSync)) {
    const files = statSync(t).isDirectory() ? [...walk(t)] : [t];
    for (const p of files) {
        const rel = p.slice(ROOT.length + 1);
        const lines = readFileSync(p, 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
            if (/^\s*(\/\/|\*|<!--|@spec)/.test(line)) return; // 주석·spec 태그 제외
            for (const [re, label] of BAN) if (re.test(line)) { console.error(`✗ ${rel}:${i + 1} — ${label}`); bad++; }
        });
    }
}
if (bad) { console.error(`구 표기 ${bad}건 — PLAN_TERMS(uitext-defaults.js) 참조로 통일하세요`); process.exit(1); }
console.log('✅ 사용자 표시 용어 정합 — 잔재 0건');
