#!/usr/bin/env node
/**
 * 배포 이미지 webp 강제 — 서빙 이미지는 .webp만 허용.
 * png/jpeg/jpg는 원본 마스터(.vercelignore 대상) 또는 예외 경로(아이콘·테스트 스냅샷)만 허용.
 * @spec none (배포 자산 이미지 포맷 규약 — webp 전용 서빙)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const IMG_EXTS = new Set(['.png', '.jpeg', '.jpg']);
// 예외 — 배포에 png가 필요한 경로 (파비콘·manifest는 PNG 규격, 테스트 스냅샷, vendor 자산)
const ALLOW = [/^icons\//, /^tests\//, /^vendor\//, /^docs\//, /^landing-qr/];
const SKIP = /^(node_modules|\.git|tmp|coverage|coverage-merged|coverage-unit|test-results)/;
// .vercelignore에 명시된 원본 마스터 패턴 — 배포 제외 대상이면 허용
const IGNORE_PATTERNS = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf-8')
    .split('\n').filter(l => l.trim() && !l.startsWith('#'));
function ignored(rel) {
    return IGNORE_PATTERNS.some(p => {
        const pat = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        try { return new RegExp('^' + pat + '$').test(rel); } catch { return false; }
    });
}
const violations = [];
(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.relative(ROOT, path.join(dir, e.name)).replace(/\\/g, '/');
        if (e.isDirectory()) {
            if (!SKIP.test(rel)) walk(path.join(dir, e.name));
        } else if (IMG_EXTS.has(path.extname(e.name).toLowerCase())) {
            if (!ALLOW.some(p => p.test(rel)) && !ignored(rel)) violations.push(rel);
        }
    }
})(ROOT);
if (violations.length) {
    console.error(`✗ 배포 이미지 webp 규약 위반 ${violations.length}건 — webp로 재인코딩하거나 .vercelignore 마스터 처리:`);
    violations.slice(0, 20).forEach(v => console.error('  - ' + v));
    process.exit(1);
}
console.log('✓ 배포 이미지 webp 규약 통과 — 서빙 이미지는 .webp만 사용');
