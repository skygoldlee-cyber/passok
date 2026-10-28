#!/usr/bin/env node
/**
 * fix_refmd_glyphs.js — ref_md PUA 글리프 정제
 *
 * pdf2md 변환 시 PDF 내장 전용폰트(MT Extra 수식 템플릿·Wingdings 불릿)의
 * 글리프가 사설영역(U+E000–F8FF, U+F0000–FFFFD) 코드포인트로 추출되어
 * 뷰어에 깨진 문자로 표시된다. 컨텍스트 기준으로 해독한 매핑 테이블로
 * 실제 의미 문자(불릿·괄호·연산자·아래첨자 숫자·수식 변수)로 치환한다.
 *
 * 사용:
 *   node tools/sync/fix_refmd_glyphs.js          # 일괄 치환
 *   node tools/sync/fix_refmd_glyphs.js --check  # 보고만 (미수정)
 *
 * 매핑 근거(컨텍스트 해독):
 *   f0xx — Wingdings 불릿 (f0d8 ▸ 화살촉, f0fc ✓, f0e0 → 화살표, f06c •,
 *          f0a7 ▪, f075/f0c6/f000 •)
 *   e044/e045 ( ) · e046 − · e047 = · e048/e052 + · e049/e04a [ ] ·
 *   e04b/e04c ( ) · e053 소수점 · e05c √ · e067 Σ · e06d 분수선 /
 *   e034–e03d — 수식 아래첨자 숫자 (C₁₀H₁₃N₅O₄·0.040·E^1%₁cm 실측 해독)
 *   e002 C · e005 F · e00f P · e012 S · e013 N · e015 V — (SPF), ×V×N 등
 *   e0ex–e0fx — 수식 이탤릭 변수/단위 (x,e,g,i,k,m,n,S · α)
 *   e000 A (분자 기호) · e042 % · e035 D (n_D 아래첨자)
 *
 * 잔여 미매핑 PUA는 치환하지 않고 보고한다 — check_refmd_glyphs 게이트가 감지.
 */

// @spec none (ref_md 글리프 정제)
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');

// 코드포인트 → 치환 문자 (해독 근거는 파일 헤더 주석)
const GLYPH_MAP = {
    // Wingdings 불릿·화살표
    0xf000: '•', 0xf06c: '•', 0xf075: '•', 0xf0a7: '▪', 0xf0c6: '•',
    0xf0d8: '▸', 0xf0e0: '→', 0xf0fc: '✓',
    // 수식 괄호·연산자
    0xe044: '(', 0xe045: ')', 0xe04b: '(', 0xe04c: ')',
    0xe046: '−', 0xe047: '=', 0xe048: '+', 0xe052: '+',
    0xe049: '[', 0xe04a: ']', 0xe053: '.', 0xe05c: '√',
    0xe067: 'Σ', 0xe06d: '/', 0xe042: '%',
    // 수식 아래첨자 숫자 → 유니코드 아래첨자 (자리 의미 보존)
    0xe03d: '₀', 0xe034: '₁', 0xe036: '₃', 0xe037: '₄',
    0xe038: '₅', 0xe039: '₆', 0xe03a: '₇', 0xe03b: '₈',
    // 수식 변수·단위 문자
    0xe000: 'A', 0xe002: 'C', 0xe005: 'F', 0xe00f: 'P',
    0xe012: 'S', 0xe013: 'N', 0xe015: 'V', 0xe035: 'D',
    0xe09d: 'α', 0xe0e5: 'x', 0xe0e9: 'e', 0xe0eb: 'g',
    0xe0ed: 'i', 0xe0ef: 'k', 0xe0f1: 'm', 0xe0f2: 'n', 0xe0f7: 'S',
};

const PUA_RE = /[\u{e000}-\u{f8ff}\u{f0000}-\u{ffffd}]/gu;

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.md')) yield p;
    }
}

function main() {
    console.log(`ref_md PUA 글리프 정제${CHECK ? ' (--check 보고만)' : ''}`);
    let files = 0, changed = 0, total = 0;
    const unmapped = new Map();

    for (const t of getExamTargets(ROOT)) {
        const refMd = path.join(ROOT, t.contentRoot, '참조자료', 'ref_md');
        if (!fs.existsSync(refMd)) continue;
        for (const f of walk(refMd)) {
            files++;
            const src = fs.readFileSync(f, 'utf8');
            let count = 0;
            const out = src.replace(PUA_RE, ch => {
                const cp = ch.codePointAt(0);
                if (cp in GLYPH_MAP) { count++; return GLYPH_MAP[cp]; }
                unmapped.set(cp, (unmapped.get(cp) || 0) + 1);
                return ch;
            });
            if (count) {
                changed++;
                total += count;
                const rel = path.relative(ROOT, f);
                console.log(`  ${CHECK ? '○' : '✓'} ${rel} — ${count}글리프`);
                if (!CHECK) fs.writeFileSync(f, out, 'utf8');
            }
        }
    }

    console.log(`\n대상 ${files}파일 — ${CHECK ? '치환 예정' : '치환'} ${changed}파일 / ${total}글리프`);
    if (unmapped.size) {
        console.log('미매핑 PUA 잔존:');
        for (const [cp, n] of [...unmapped].sort((a, b) => b[1] - a[1]))
            console.log(`  U+${cp.toString(16)} ×${n}`);
    }
}

main();
