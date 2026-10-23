// tests/unit/check-runner.test.js — 통합 검증 실행기(run.js·steps.js) 레지스트리 무결성
// @spec none (검증 인프라 테스트)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import stepsModule from '../../../tools/check/steps.js';

const { resolveSteps, allSteps, findStep, CI_STEPS } = stepsModule;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('레지스트리 — node 단계의 스크립트 파일이 실제 존재', () => {
  for (const s of allSteps()) {
    if (s.bin !== 'node') continue;
    const script = s.args.find((a) => a.endsWith('.js') && !a.includes('*'));
    if (!script) continue; // glob 실행 단계(예: node --test tests/**)는 파일 존재 검사 면제
    assert.ok(fs.existsSync(path.join(ROOT, script)), `${s.id}: ${script} 파일 없음`);
  }
});

test('레지스트리 — npm 단계의 스크립트가 package.json에 존재', () => {
  for (const s of allSteps()) {
    if (s.bin === 'node') continue;
    const name = s.args[0] === 'test' ? 'test' : s.args[1];
    assert.ok(pkg.scripts[name], `${s.id}: package.json에 "${name}" 스크립트 없음`);
  }
});

test('package.json — node --test glob 인자는 인용 필수 (bash ** → * 축약 차단)', () => {
    // 회귀 가드: 미인용 tests/unit/**/*.test.js는 POSIX 셸에서 **가 *로 축약돼
    // 1레벨 하위 디렉터리만 매칭된다 (CI에서 top-level 테스트 전량 미실행 사고).
    // 인용하면 Node 자체 glob 확장(재귀)이 동작해 OS 무관하게 동일 집합이 실행된다.
    for (const [name, script] of Object.entries(pkg.scripts)) {
        if (!/node\s+--test\b/.test(script) || !script.includes('**')) continue;
        for (const token of script.split(/\s+/)) {
            if (!token.includes('**')) continue;
            assert.ok(
                /^["'].*\*.*["']$/.test(token),
                `"${name}": node --test glob 인자 미인용 — POSIX 셸에서 **가 *로 축약됨: ${token}`
            );
        }
    }
});

test('프리셋 — content 플래그 조합이 올바르게 필터링', () => {
  const full = resolveSteps('content', {});
  const quick = resolveSteps('content', { quick: true });
  const only = resolveSteps('content', { contentOnly: true });
  const build = resolveSteps('content', { withBuild: true, contentOnly: true });
  assert.ok(full.length > 20, 'content 프리셋 단계 수 이상');
  assert.ok(quick.every((s) => !s.slow), '--quick인데 slow 단계 잔존');
  assert.ok(quick.length < full.length, '--quick이 단계를 줄이지 못함');
  assert.ok(only.every((s) => s.content), '--content-only인데 비콘텐츠 단계 잔존');
  assert.equal(build[0].id, 'content:build', '--build 시 build:data 선행 아님');
});

test('프리셋 — all이 docs·content 단계를 인라인 확장', () => {
  const steps = resolveSteps('all', { quick: true });
  const ids = steps.map((s) => s.id);
  assert.ok(ids.includes('lint') && ids.includes('types') && ids.includes('html'));
  assert.ok(ids.some((id) => id.startsWith('docs:')), 'docs 단계 미확장');
  assert.ok(ids.some((id) => id.startsWith('content:')), 'content 단계 미확장');
  assert.ok(!ids.includes('content:dom'), '--quick인데 DOM 단계 잔존');
});

test('프리셋 — ci 토큰이 ci.yml 검증 명령을 커버', () => {
  const tokens = new Set(CI_STEPS.map((s) => s.token));
  const ciText = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  const CI_ONLY = /(npm ci|npm audit|npm run sbom|npm run coverage|coverage_merge|npx playwright|npm run test:e2e|impact_tests|npm run build:data|npm run build:drills|build_doc_bundles|detect_code_changes)/;
  for (const m of ciText.matchAll(/^\s+run:\s*(.+)$/gm)) {
    const line = m[1];
    if (CI_ONLY.test(line)) continue;
    if (line.startsWith('npm run ')) {
      const name = 'npm run ' + line.slice(8).trim().split(/\s+/)[0];
      assert.ok(tokens.has(name), `ci.yml "${line}"에 대응하는 ci 프리셋 단계 없음`);
    } else if (line.startsWith('node ')) {
      const base = path.basename(line.trim().split(/\s+/)[1]);
      assert.ok(tokens.has(base), `ci.yml "${line}"에 대응하는 ci 프리셋 단계 없음`);
    }
  }
});

test('복구 안내 — DERIVED_IDS·REMEDIES가 실제 단계 id를 가리킴', () => {
  const ids = new Set(allSteps().map((s) => s.id));
  for (const id of stepsModule.DERIVED_IDS) assert.ok(ids.has(id), `DERIVED_IDS의 ${id}는 없는 단계`);
  for (const id of Object.keys(stepsModule.REMEDIES)) assert.ok(ids.has(id), `REMEDIES의 ${id}는 없는 단계`);
  // 중복 안내 방지 — derived 묶음과 개별 힌트는 상호 배타
  for (const id of Object.keys(stepsModule.REMEDIES)) assert.ok(!stepsModule.DERIVED_IDS.has(id), `${id}가 양쪽에 중복`);
});

test('단계 조회 — id·스크립트명·npm 이름으로 findStep 검색', () => {
  assert.equal(findStep('content:manifest')?.id, 'content:manifest');
  assert.equal(findStep('manifest')?.id, 'content:manifest');
  assert.equal(findStep('check_manifest.js')?.id, 'content:manifest');
  assert.equal(findStep('check:manifest')?.id, 'content:manifest');
  assert.equal(findStep('docs:ciparity')?.id, 'docs:ciparity');
  assert.equal(findStep('없는단계'), undefined);
});
