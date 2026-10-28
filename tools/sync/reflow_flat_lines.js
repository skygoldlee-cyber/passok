#!/usr/bin/env node
/**
 * reflow_flat_lines.js — ref_md 평탄화(1줄 덤프) 라인 재분할
 *
 * 법령 DRF 자동추출·HWP 표 덤프 등으로 본문 전체가 한 줄에 붙은 ref_md는
 * 뷰어에서 거대 단락 하나로 렌더된다. 문자는 일절 삭제·변경하지 않고
 * 구조 마커 앞에 줄바꿈만 삽입해 표시 단위로 쪼갠다.
 *
 * 분할 마커 (모두 lookahead — 텍스트 보존):
 *   ┃            — HWP 변환 표의 행 경계
 *   박스 테두리   — ┌─┬─┐ / ├─┼─┤ / └─┴─┘ run
 *   제N조( · 제N장/절/관/편 — 조문 구조
 *   별표·별지·부칙 — 부속 구분
 *   ①-⑳         — 항목 기호 (제①항 등 참조 표현은 제외)
 *   NNN 한글     — 기준류 3자리 섹션 번호 (문장 경계 뒤)
 *   N.M.         — 접착된 소항목 번호 (한글 직후, 연도 19xx/20xx 제외)
 *   N. · 가.     — 문장부호 직후 항 번호
 *   <개정·<General> 등 — 태그 아닌 구조 꺾쇠
 *   |            — 서식 덤프의 3칸+ 공백 패딩 셀 경계 (마크다운 표 무영향)
 *   /xxx/yyy.do? — law.go.kr 첨부파일 URL 나열
 *
 * 주의: (LNN) 라인 인용이 있는 문서에는 적용 금지 — 분할은 이후 라인번호를
 * 밀어낸다. 실행 전 check_ref_lines로 인용 유무 확인 권장.
 *
 * 사용:
 *   node tools/sync/reflow_flat_lines.js          # 일괄 재분할
 *   node tools/sync/reflow_flat_lines.js --check  # 분할 예정 보고만
 */

// @spec none (ref_md 평탄화 라인 재분할)
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');

const LINE_LIMIT = 1500; // 이 길이 이상 줄만 평탄화로 간주

const RULES = [
    /(?=┃)/g,                                                  // HWP 표 행 경계
    /(?=[┌┬┐├┼┤└┴┘][─┼┬┴┌┐└┘┃│ ]{3,})/g,                       // 박스 테두리 run
    /(?=제\d+(?:의\d+)?조\s*\()/g,                             // 제N조(목적)
    /(?=제\d+[장편절관](?=[\s「【]|의\d|$))/g,                 // 제N장·절·관·편
    /(?<=[가-힣\)\s　])(?=별표|별지|부칙)/g,                    // 부속 구분
    /(?<![제호])(?=[①-⑳㉑-㉟])/g,                              // ①② 항목
    /(?<=[.\)」』】\s　]|^)(?=\d{3}\s[가-힣])/g,                // 100 총칙 섹션
    /(?<=[가-힣])(?=\d{1,3}\.\d{1,2}(?:\.\d{1,2})?\s)/g,        // 경우4.3 절
    /(?<=[.\)」』】])\s?(?=\d{1,2}\.\s)/g,                     // 한다.1. 항
    /(?<=[.\)」』】])\s?(?=[가-힣]\.\s)/g,                     // 한다.가. 목
    /(?<=[가-힣\)])(?=<(?:개정|신설|주|참고|별표|그림|표|General|Detailed)[ >])/g,
    /(?<=\s{3,})(?=\|)/g,                                      // 서식 셀 경계
    /(?<=│)\s*\|\s*(?=│)/g,                                    // │ | │ 접착 행 경계 (구분자 소비)
    /(?=│[가-힣]\.\s)|(?=│\d+\)\s)/g,                          // │가. ·│1) 항목 행 시작
    /(?=\/[A-Za-z]+\/[A-Za-z]+\.do\?)/g,                       // 첨부 URL
];

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.md')) yield p;
    }
}

function reflowLine(line) {
    const parts = [line];
    for (const re of RULES) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const segs = parts[i].split(re).filter(s => s !== '');
            parts.splice(i, 1, ...segs);
        }
    }
    return parts;
}

function main() {
    console.log(`ref_md 평탄화 라인 재분할${CHECK ? ' (--check 보고만)' : ''} — 기준 ${LINE_LIMIT}자`);
    let files = 0, touched = 0, splitLines = 0, addedLines = 0;

    for (const t of getExamTargets(ROOT)) {
        const refMd = path.join(ROOT, t.contentRoot, '참조자료', 'ref_md');
        if (!fs.existsSync(refMd)) continue;
        for (const f of walk(refMd)) {
            files++;
            const src = fs.readFileSync(f, 'utf8');
            const lines = src.split('\n');
            const out = [];
            let hit = 0, added = 0;
            for (const line of lines) {
                if (line.length > LINE_LIMIT) {
                    const parts = reflowLine(line);
                    if (parts.length > 1) { hit++; added += parts.length - 1; }
                    out.push(...parts);
                } else out.push(line);
            }
            if (hit) {
                touched++;
                splitLines += hit;
                addedLines += added;
                const rel = path.relative(ROOT, f);
                console.log(`  ${CHECK ? '○' : '✓'} ${rel} — ${hit}줄 분할 (+${added}줄)`);
                if (!CHECK) fs.writeFileSync(f, out.join('\n'), 'utf8');
            }
        }
    }
    console.log(`\n대상 ${files}파일 — ${touched}파일 / ${splitLines}줄 분할 (+${addedLines}줄)`);
}

main();
