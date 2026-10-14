#!/usr/bin/env node
/**
 * check_runbook_links.js — 런북 정본 도달 검증 (런북 커버리지 측정, §2.5)
 * @spec none
 *
 * docs/dev/runbooks/*.md의 상대 링크를 검증한다:
 *   1) 파일 존재 — docs:paths와 겹치지만 앵커까지 검증하는 것이 이 체커의 역할
 *   2) `#anchor`가 있으면 GitHub slug 규칙으로 해석해 대상 문서의 실제 헤딩과 대조
 *      — "링크된 파일은 있으나 절차 섹션이 없는" 결함 유형을 차단
 *      (사례: WHEN_THINGS_BREAK §1 → DEPLOYMENT_GUIDE 롤백 절차 공백, 2026-10-14)
 *
 * 또한 WHEN_THINGS_BREAK.md §1·§2 표의 증상 행 중 정본 링크를 1개 이상 갖는
 * 비율(런북 커버리지)을 출력한다 — PROJECT_METRICS §2.5 지식 비율 지표의
 * 측정 경로. 커버리지는 정보 출력이며, 파일·앵커 미해석만 실패로 처리한다.
 *
 * 사용: node tools/check/check_runbook_links.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const RUNBOOK_DIR = path.join(ROOT, 'docs', 'dev', 'runbooks');

/** GitHub 헤딩 slug 규칙 — 소문자화·문장부호/이모지 제거·공백→하이픈 (한글 보존) */
function slugify(heading) {
    return heading.trim().toLowerCase()
        .replace(/[^\p{L}\p{N} _-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/** md 파일의 헤딩 slug 집합 */
function headingSlugs(file) {
    const slugs = new Set();
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^#{1,6}\s+(.+)$/);
        if (m) slugs.add(slugify(m[1].replace(/[*`]/g, '')));
    }
    return slugs;
}

/** 인라인 코드 스팬 제거 — 백틱 안의 예시 링크는 검증 대상이 아니다 */
function stripInlineCode(line) {
    return line.replace(/`[^`]*`/g, '');
}

/** 표 행의 마지막 셀에서 상대 링크 추출 */
function rowLinks(row) {
    const links = [];
    const re = /\[([^\]]*)\]\(([^)\s]+)\)/g;
    let m;
    while ((m = re.exec(row))) {
        const href = m[2].replace(/^<|>$/g, '');   // <경로> 감싸기 형식
        if (/^https?:/i.test(href) || href.startsWith('mailto:')) continue;
        if (/[<>]/.test(href) || /path|경로|파일명/.test(href)) continue; // 자리표시자 예시
        links.push(href);
    }
    return links;
}

function main() {
    const errors = [];
    const files = fs.readdirSync(RUNBOOK_DIR).filter((f) => f.endsWith('.md'));
    const slugCache = new Map();
    const slugsFor = (abs) => {
        if (!slugCache.has(abs)) slugCache.set(abs, headingSlugs(abs));
        return slugCache.get(abs);
    };

    for (const f of files) {
        const abs = path.join(RUNBOOK_DIR, f);
        const lines = fs.readFileSync(abs, 'utf8').split('\n');
        let inFence = false;
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
            if (inFence) continue;
            for (const href of rowLinks(stripInlineCode(lines[i]))) {
                const [rel, anchor] = href.split('#');
                const target = path.resolve(path.dirname(abs), decodeURIComponent(rel));
                if (!rel) { // 같은 문서 내 앵커
                    if (anchor && !slugsFor(abs).has(slugify(anchor))) {
                        errors.push(`${f}:${i + 1} — 자기 문서 앵커 미해석: #${anchor}`);
                    }
                    continue;
                }
                if (!fs.existsSync(target)) {
                    errors.push(`${f}:${i + 1} — 링크 대상 없음: ${rel}`);
                    continue;
                }
                if (anchor && target.endsWith('.md') && !slugsFor(target).has(slugify(anchor))) {
                    errors.push(`${f}:${i + 1} — 앵커 미해석: ${rel}#${anchor} (절차 섹션 부재 가능)`);
                }
            }
        }
    }

    // 런북 커버리지 — WHEN_THINGS_BREAK §1·§2 표의 증상 행 중 정본 링크 보유 비율
    const wtb = fs.readFileSync(path.join(RUNBOOK_DIR, 'WHEN_THINGS_BREAK.md'), 'utf8').split('\n');
    let total = 0, covered = 0;
    let inSym = false, inWtbFence = false;
    for (const line of wtb) {
        if (/^\s*```/.test(line)) { inWtbFence = !inWtbFence; continue; }
        if (inWtbFence) continue;
        if (/^##\s*[12]\./.test(line)) { inSym = true; continue; }
        if (/^##/.test(line)) { inSym = false; }
        if (!inSym || !line.startsWith('|')) continue;
        if (/^\|[-\s|]+\|?$/.test(line) || /증상/.test(line.split('|')[1] || '')) continue; // 구분선·헤더
        total++;
        if (rowLinks(stripInlineCode(line)).length) covered++;
    }

    console.log(`런북 링크 검증 — ${files.length}개 문서`);
    console.log(`  WHEN_THINGS_BREAK 커버리지: ${covered}/${total} 증상 행이 정본 링크 보유` +
        (total ? ` (${((covered / total) * 100).toFixed(1)}%)` : ''));
    if (errors.length) {
        console.error('\n미해석 링크:');
        for (const e of errors) console.error(`  ✗ ${e}`);
        process.exit(1);
    }
    console.log('✅ 전 링크·앵커 해석');
}

if (require.main === module) main();

module.exports = { slugify };
