#!/usr/bin/env node
/**
 * check_seed_keys.js — 테스트 시드 저장 키 ↔ 스토리지 스코프 정합 정적 검사
 *
 * 배경: GLOBAL_KEYS(비스코프 키) 전환 후 테스트 픽스처가 구 `examId:` 스코프
 * 키를 계속 심으면 시드가 무력화돼 E2E가 조용히 깨진다 (pro_notice_seen
 * 드리프트 실사례 — 오버레이가 클릭을 차단해 파이프라인 테스트 타임아웃).
 *
 * 검사 규칙 (단방향 — 오탐 없는 확정 위반만):
 *   스코프 시드 → 전역 키: `P('x')`·`${examId}:x` 패턴으로 심은 x가
 *   GLOBAL_KEYS이면 앱은 루트 키를 읽으므로 시드 불발 — 오류.
 *   (반대 방향 — 스코프 키의 비스코프 시드 — 는 레거시 마이그레이션·
 *   스토리지 계층·raw 리더 테스트가 의도적으로 쓰므로 검사하지 않는다)
 *
 * 대상: tests 아래 모든 .js (fixtures + e2e 스펙의 인라인 시드).
 * 면제: 라인에 seedkey-ok 토큰 포함 시 해당 라인 스킵.
 */

// @spec DA-07 (시드 키 ↔ GLOBAL_KEYS 스코프 정합 — 스코프드 진도 키 계약 보호)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXAM_CONTEXT = path.join(ROOT, 'src', 'exam-context.js');
const TESTS_DIR = path.join(ROOT, 'tests');

/** GLOBAL_KEYS 집합 추출 — exam-context.js의 `const GLOBAL_KEYS = new Set([...])` 블록 */
function loadGlobalKeys() {
    const src = fs.readFileSync(EXAM_CONTEXT, 'utf8');
    const m = src.match(/GLOBAL_KEYS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
    if (!m) throw new Error('GLOBAL_KEYS Set 블록을 찾지 못함 — exam-context.js 구조 변경 확인');
    return new Set([...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
}

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.js')) yield p;
    }
}

function main() {
    const globalKeys = loadGlobalKeys();
    const violations = [];

    // 스코프 시드 패턴 — `P('x')` (픽스처 네임스페이스 헬퍼) 또는 `${examId}:x` 템플릿
    const SCOPED_RE = /P\('([^']+)'\)|\$\{(?:examId|eid|exam)\}:`?([a-zA-Z0-9_]+)`?/g;

    for (const file of walk(TESTS_DIR)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
            if (line.includes('seedkey-ok')) return;
            for (const m of line.matchAll(SCOPED_RE)) {
                const key = m[1] || m[2];
                if (key && globalKeys.has(key)) {
                    violations.push(`${rel}:${i + 1} — '${key}'는 GLOBAL_KEYS인데 시험 스코프로 시드 (앱은 루트 키를 읽음)`);
                }
            }
        });
    }

    if (violations.length) {
        console.error(`❌ 시드 키 스코프 위반 ${violations.length}건`);
        violations.forEach(v => console.error(`  ${v}`));
        console.error('  → GLOBAL_KEYS 전환 키는 루트로 시드하세요 (스코프 시드는 앱이 읽지 않는 사장 키)');
        process.exit(1);
    }
    console.log(`✅ 시드 키 스코프 정합 — tests/ 스코프 시드 패턴 검사, 위반 0건 (GLOBAL_KEYS ${globalKeys.size}개 대조)`);
}

main();
