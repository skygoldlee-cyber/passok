// tests/unit/push-gate.test.js — pre-push 적응형 게이트 분류기
// @spec none (검증 실행기)
// push 대상 diff를 docs/content/logic으로 분류해 필요 단계만 선택하는
// planSteps의 계층 판정 검증 — 미분류 파일은 보수적으로 전체 게이트.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyFile, planSteps } = require('../../tools/check/push_gate.js');

const FULL = ['types', 'trace', 'specrefs', 'docs', 'html', 'lint', 'posind', 'impact', 'docsync', 'testfirst'];

test('파일 분류 — docs·content·logic', () => {
    assert.equal(classifyFile('docs/dev/SPEC.md'), 'docs');
    assert.equal(classifyFile('AGENTS.md'), 'docs');
    assert.equal(classifyFile('docs/dev/TRACE_MATRIX.md'), 'docs');
    assert.equal(classifyFile('content/exams/cosmetic/textbook/law.md'), 'content');
    assert.equal(classifyFile('data/exams/cosmetic/questions.js'), 'content');
    assert.equal(classifyFile('src/app.js'), 'logic');
    assert.equal(classifyFile('tools/check/push_gate.js'), 'logic');
    assert.equal(classifyFile('tests/e2e/app.spec.js'), 'logic');
    assert.equal(classifyFile('sw.js'), 'logic');
    assert.equal(classifyFile('package.json'), 'logic');
    assert.equal(classifyFile('.github/workflows/ci.yml'), 'logic');
});

test('문서 전용 변경 → 경량 단계 (types·lint·impact 생략)', () => {
    const plan = planSteps(['docs/dev/SPEC.md', 'AGENTS.md']);
    assert.equal(plan.tier, 'docs');
    assert.deepEqual(plan.ids, ['trace', 'specrefs', 'docs', 'docsync', 'testfirst']);
});

test('콘텐츠 전용 변경 → 경량 단계 (docs 검사 제외)', () => {
    const plan = planSteps(['content/exams/cosmetic/textbook/law.md', 'data/exams/cosmetic/questions.js']);
    assert.equal(plan.tier, 'content');
    assert.deepEqual(plan.ids, ['trace', 'specrefs', 'docsync', 'testfirst']);
});

test('docs+content 혼합 → 양쪽 단계 합집합', () => {
    const plan = planSteps(['docs/dev/SPEC.md', 'data/exams/cosmetic/questions.js']);
    assert.equal(plan.tier, 'content');
    assert.deepEqual(plan.ids, ['trace', 'specrefs', 'docs', 'docsync', 'testfirst']);
});

test('로직·미분류 파일이 섞이면 전체 게이트 폴백', () => {
    assert.deepEqual(planSteps(['docs/dev/SPEC.md', 'src/app.js']).ids, FULL);
    assert.deepEqual(planSteps(['package.json']).ids, FULL);
    assert.deepEqual(planSteps(['weird_file.xyz']).ids, FULL); // 미분류 → 보수적 전체
});

test('diff 실패(null)·빈 목록도 안전한 계획', () => {
    assert.deepEqual(planSteps(null).ids, FULL);
    const empty = planSteps([]);
    assert.equal(empty.tier, 'docs');
    assert.ok(empty.ids.includes('docsync'));
});
