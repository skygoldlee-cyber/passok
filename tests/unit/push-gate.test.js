// tests/unit/push-gate.test.js — pre-push 적응형 게이트 분류기
// @spec none (검증 실행기)
// 파일 태그(경로 유형)→단계별 필요 표로 필요 단계만 선택하는 planSteps
// 검증 — 어떤 규칙에도 안 맞는 파일은 보수적으로 전체 게이트.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyFile, fileTags, planSteps } = require('../../tools/check/push_gate.js');

const FULL = ['types', 'trace', 'specrefs', 'docs', 'html', 'lint', 'posind', 'impact', 'docsync', 'testfirst', 'drillfresh', 'embfresh', 'docbundles'];
// 콘텐츠 파생물 신선도 — 'content' 태그에만 필요 (로직 변경에는 무관)
const FRESH = ['drillfresh', 'embfresh', 'docbundles'];

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

test('파일 태그 — 경로 유형 분류, 미분류는 unknown', () => {
    assert.deepEqual(fileTags('docs/dev/SPEC.md'), ['docs']);
    assert.deepEqual(fileTags('src/app.js'), ['src']);
    assert.deepEqual(fileTags('sw.js'), ['src']);
    assert.deepEqual(fileTags('tools/check/run.js'), ['tools']);
    assert.deepEqual(fileTags('tests/unit/x.test.js'), ['tests']);
    assert.deepEqual(fileTags('package.json'), ['config']);
    assert.deepEqual(fileTags('html/views/reader.html'), ['html']);
    assert.deepEqual(fileTags('.github/workflows/ci.yml'), ['ci']);
    assert.deepEqual(fileTags('weird_file.xyz'), ['unknown']);
});

test('문서 전용 변경 → 문서 관련 단계만', () => {
    const plan = planSteps(['docs/dev/SPEC.md', 'AGENTS.md']);
    assert.equal(plan.tier, 'docs');
    assert.deepEqual(plan.ids, ['trace', 'specrefs', 'docs', 'impact', 'docsync']);
});

test('콘텐츠 전용 변경 → 콘텐츠 추적·문서·동기화·신선도 단계', () => {
    // content/*.md는 content+docs 복합 태그 — docsync도 대상 (기존 커버리지 유지)
    // 신선도 3종은 파생물 재생성 누락을 CI 이전에 차단 (해시 비교 경량)
    const plan = planSteps(['content/exams/cosmetic/textbook/law.md', 'data/exams/cosmetic/questions.js']);
    assert.equal(plan.tier, 'content');
    assert.deepEqual(plan.ids, ['trace', 'specrefs', 'docs', 'impact', 'docsync', 'drillfresh', 'embfresh', 'docbundles']);
});

test('docs+content 혼합 → 동일 태그 집합', () => {
    const plan = planSteps(['docs/dev/SPEC.md', 'data/exams/cosmetic/questions.js']);
    assert.equal(plan.tier, 'content');
    assert.deepEqual(plan.ids, ['trace', 'specrefs', 'docs', 'impact', 'docsync', 'drillfresh', 'embfresh', 'docbundles']);
});

test('src 변경 → html·신선도 제외 전 단계', () => {
    // index.html 신선도는 html/·템플릿 변경에만, 파생물 신선도는 content/에만 의미가 있다
    const ids = planSteps(['docs/dev/SPEC.md', 'src/app.js']).ids;
    assert.deepEqual(ids, FULL.filter((id) => id !== 'html' && !FRESH.includes(id)));
    assert.ok(ids.includes('posind') && ids.includes('testfirst'));
});

test('config 변경 → 타입·린트·문서·동기화 단계', () => {
    assert.deepEqual(planSteps(['package.json']).ids,
        ['types', 'trace', 'docs', 'lint', 'impact', 'docsync']);
});

test('tools/tests 변경 → html·신선도 제외 로직 단계', () => {
    const toolsIds = planSteps(['tools/check/run.js']).ids;
    assert.deepEqual(toolsIds, FULL.filter((id) => id !== 'html' && !FRESH.includes(id)));
    const testsIds = planSteps(['tests/unit/x.test.js']).ids;
    assert.deepEqual(testsIds, ['types', 'trace', 'specrefs', 'lint', 'impact', 'docsync']);
});

test('미분류 파일 → 전체 게이트 폴백', () => {
    assert.deepEqual(planSteps(['weird_file.xyz']).ids, FULL);
    assert.deepEqual(planSteps(['src/app.js', 'weird_file.xyz']).ids, FULL);
});

test('diff 실패(null)·빈 목록도 안전한 계획', () => {
    assert.deepEqual(planSteps(null).ids, FULL);
    const empty = planSteps([]);
    assert.equal(empty.tier, 'docs');
    assert.deepEqual(empty.ids, ['impact']); // 변경 없음 — 분석 단계만
});
