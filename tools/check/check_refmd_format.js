#!/usr/bin/env node
/**
 * check_refmd_format.js — ref_md 추출 잔재·평탄화 형식 게이트
 *
 * PDF→ref_md 변환·웹 캡처 편입 과정에서 유입되는 표시 파손 패턴을 차단:
 *   - lone CR (\r 단독 — 셀 구분자로 박힌 원시 덤프)
 *   - C0 제어문자 (\x00–\x1f, \t·\n 제외)
 *   - PUA 글리프 (U+E000–F8FF, U+F0000–FFFFD — 전용폰트 추출 잔재)
 *   - 평탄화 초장문 줄 (구조 마커 없이 한 줄로 붙은 본문 — LINE_LIMIT 초과)
 *
 * 복구:
 *   PUA·lone CR → node tools/sync/fix_refmd_glyphs.js (글리프 매핑 치환)
 *   평탄화      → node tools/sync/reflow_flat_lines.js (구조 마커 분할)
 *   렌더러 방어 — parseMarkdown이 잔재를 표시 단계에서 걸러내나
 *                 정본 정제가 원칙 (인용 라인·검색 품질에도 영향)
 *
 * 사용: node tools/check/check_refmd_format.js   (위반 시 exit 1)
 */

// @spec none (ref_md 형식 게이트)
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const LINE_LIMIT = 2000; // 평탄화 잔재 상한 — reflow 기준(1500)에 여유 부여

const LONE_CR = /\r(?!\n)/g;
const CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
const PUA = /[\u{e000}-\u{f8ff}\u{f0000}-\u{ffffd}]/gu;

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.md')) yield p;
    }
}

function main() {
    console.log('ref_md 추출 잔재·평탄화 형식 검증');
    const errs = [];
    let files = 0;

    for (const t of getExamTargets(ROOT)) {
        const refMd = path.join(ROOT, t.contentRoot, '참조자료', 'ref_md');
        if (!fs.existsSync(refMd)) continue;
        for (const f of walk(refMd)) {
            files++;
            const rel = path.relative(ROOT, f);
            const src = fs.readFileSync(f, 'utf8');
            const cr = src.match(LONE_CR);
            if (cr) errs.push(`${rel} — lone CR ×${cr.length} (원시 덤프 잔재)`);
            const ct = src.match(CTRL);
            if (ct) errs.push(`${rel} — 제어문자 ×${ct.length}`);
            const pua = src.match(PUA);
            if (pua) errs.push(`${rel} — PUA 글리프 ×${pua.length} (fix_refmd_glyphs 대상)`);
            src.split('\n').forEach((line, i) => {
                if (line.length > LINE_LIMIT)
                    errs.push(`${rel}:${i + 1} — 초장문 줄 ${line.length}자 (reflow 대상)`);
            });
        }
    }

    console.log(`검사: ref_md ${files}파일`);
    if (errs.length) {
        console.log('\n■ 오류');
        errs.slice(0, 40).forEach(e => console.log('  ' + e));
        if (errs.length > 40) console.log(`  … 외 ${errs.length - 40}건`);
        console.log('\n복구: node tools/sync/fix_refmd_glyphs.js · node tools/sync/reflow_flat_lines.js');
        process.exit(1);
    }
    console.log('✅ 추출 잔재·평탄화 패턴 없음');
}

main();
