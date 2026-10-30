// tests/unit/exam-simulator-facade.test.js — exam-simulator 파사드 export 계약
// @spec E-01~07
// exam-simulator.js 분해(session·arena·draft) 후에도 app.js·listeners-simulator·
// exam-sim-weak가 기존 경로로 import하는 이름이 전부 resolve돼야 한다.
// 재수출 누락 시 런타임 undefined 바인딩 — 정적 정합으로 사전 차단.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SIM_FACADE = path.join(ROOT, 'src', 'views', 'exam-sim', 'exam-simulator.js');

/** 모듈의 export 이름 수집 — `export { x } from './y'` 재수출 체인 추적 */
function collectExports(absPath, seen = new Set()) {
    if (seen.has(absPath)) return new Set();
    seen.add(absPath);
    const names = new Set();
    if (!fs.existsSync(absPath)) return names;
    const src = fs.readFileSync(absPath, 'utf8');
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) {
        names.add(m[1]);
    }
    for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s+as\s+/).pop().trim();
            if (name) names.add(name);
        }
        const dep = path.resolve(path.dirname(absPath), m[2]);
        for (const n of collectExports(dep, seen)) names.add(n);
    }
    return names;
}

/** 파일에서 `import { a, b } from './x.js'`의 {파일 → 이름 목록} 추출 */
function collectNamedImports(absPath) {
    const src = fs.readFileSync(absPath, 'utf8');
    const out = [];
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
        const names = m[1].split(',')
            .map(p => p.trim().split(/\s+as\s+/)[0].trim())
            .filter(Boolean);
        out.push({ spec: m[2], names });
    }
    return out;
}

const CONSUMERS = [
    path.join(ROOT, 'src', 'shell', 'app.js'),
    path.join(ROOT, 'src', 'views', 'listeners', 'listeners-simulator.js'),
    path.join(ROOT, 'src', 'views', 'exam-sim', 'exam-sim-weak.js'),
];

test('exam-simulator 파사드 — 소비자가 import하는 이름 전부 export된다 (재수출 체인 추적)', () => {
    const exported = collectExports(SIM_FACADE);
    assert.ok(exported.size > 0, '파사드 export 수집 실패');
    let checked = 0;
    for (const consumer of CONSUMERS) {
        for (const { spec, names } of collectNamedImports(consumer)) {
            const target = path.resolve(path.dirname(consumer), spec);
            if (target !== SIM_FACADE) continue;
            for (const name of names) {
                assert.ok(
                    exported.has(name),
                    `${path.basename(consumer)} → exam-simulator: '${name}' 미export — 파사드 재수출 누락`
                );
                checked++;
            }
        }
    }
    // 회귀가 실제로 잡히려면 import가 존재해야 함 — 빈 결과는 테스트 무의미
    assert.ok(checked >= 10, `검증된 import가 ${checked}건 — 소비자 import 파싱 실패 추정`);
});
