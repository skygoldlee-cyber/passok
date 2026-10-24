#!/usr/bin/env node
/**
 * check_filenames.js — 파일명 대소문자 규약 (CODE_CONVENTIONS §2.1)
 * @spec none (규약 게이트)
 *
 * 영역별 지배 패턴을 강제한다. 신규 유입만 차단 — 기존 일탈은
 * tools/state/filename_baseline.json으로 승계(단조 감소).
 *
 * 규칙 (위에서부터 첫 매칭 적용):
 *   루트 파일(깊이 0)             면제
 *   docs 하위 모든 .md            SCREAMING_SNAKE 시작 또는 한글 포함
 *   *.json                        snake 또는 kebab 단일 패턴 (혼용 금지)
 *   이미지·음성 확장자            kebab-case (content/** 한글 자산 면제)
 *   src/ html/ css/ tests/ .github/workflows/   kebab-case
 *   tools/                        snake_case
 *
 * 사용:
 *   node tools/check/check_filenames.js            # 검사 (기본)
 *   node tools/check/check_filenames.js --update   # 기준선 갱신
 */

// @spec none (규약 게이트)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(ROOT, 'tools', 'state', 'filename_baseline.json');

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SNAKE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const KEBAB_OR_SNAKE = /^[a-z0-9]+([_-][a-z0-9]+)*$/; // 단일 구분자만 허용
const MIXED_SEP = /[_-].*[_-]/;
const HANGUL = /[가-힯]/;

const ASSET_EXT = /\.(svg|png|jpe?g|webp|gif|mp3|mp4|wav|ico|woff2?|ttf)$/i;

/** 파일 경로 → 위반 사유 (null이면 준수) */
function check(file) {
    const base = path.basename(file);
    const dir = file.slice(0, file.length - base.length);
    const stem = base.replace(/\.[a-z0-9]+$/i, ''); // 마지막 확장자만 제거

    if (!file.includes('/')) return null; // 루트 파일 면제

    // docs/**/*.md — SCREAMING_SNAKE 시작 또는 한글 포함
    if (/\.md$/i.test(base) && file.startsWith('docs/')) {
        if (/^[A-Z0-9]/.test(stem) || HANGUL.test(stem)) return null;
        return `문서 파일명은 SCREAMING_SNAKE 또는 한글 (${stem})`;
    }
    // *.json — 단일 구분 패턴 (snake 또는 kebab, 혼용·대문자 금지)
    if (/\.json$/i.test(base)) {
        const s = stem;
        if (KEBAB.test(s) || SNAKE.test(s)) return null;
        if (KEBAB_OR_SNAKE.test(s) && !MIXED_SEP.test(s.replace(/[_-]/g, m => m))) return null;
        return `json 파일명은 snake 또는 kebab 단일 패턴 (${stem})`;
    }
    // 자산 확장자 — kebab (content/** 한글 자산 면제)
    if (ASSET_EXT.test(base)) {
        if (file.startsWith('content/')) return null;
        if (KEBAB.test(stem)) return null;
        return `자산 파일명은 kebab-case (${stem})`;
    }
    // 디렉터리 규칙
    if (/^(src|html|css|tests)\//.test(file) || file.startsWith('.github/workflows/')) {
        if (KEBAB.test(stem.replace(/\.(test|spec|dom)$/,''))) return null;
        return `${dir.split('/')[0]} 코드 파일명은 kebab-case (${base})`;
    }
    if (file.startsWith('tools/')) {
        if (SNAKE.test(stem)) return null;
        return `tools 파일명은 snake_case (${base})`;
    }
    return null;
}

const files = execSync('git -c core.quotepath=false ls-files', { encoding: 'utf8', cwd: ROOT })
    .split('\n').filter(Boolean);

const violations = [];
for (const f of files) {
    const why = check(f);
    if (why) violations.push(`${f} — ${why}`);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : [];

if (process.argv.includes('--update')) {
    fs.writeFileSync(BASELINE, JSON.stringify(violations, null, 2) + '\n');
    console.log(`기준선 갱신 — ${violations.length}건 기록 (${path.relative(ROOT, BASELINE)})`);
    process.exit(0);
}

const fresh = violations.filter((v) => !baseline.includes(v));
const gone = baseline.filter((b) => !violations.includes(b));

if (gone.length) {
    console.log(`ℹ 기준선 해소 ${gone.length}건 — --update로 단조 감소 반영 권장`);
}
if (fresh.length) {
    console.error(`\n❌ 파일명 규약 신규 위반 ${fresh.length}건:`);
    for (const v of fresh) console.error(`   ${v}`);
    console.error('\n규약: docs/CODE_CONVENTIONS.md §2.1 — 예외는 tools/state/filename_baseline.json');
    process.exit(1);
}
console.log(`✅ 파일명 규약 통과 — 신규 위반 0건 (기준선 승계 ${baseline.length}건${gone.length ? `, 해소 대기 ${gone.length}건` : ''})`);
