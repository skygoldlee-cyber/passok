// tests/unit/step-runner.test.js — step_runner 병렬 실행기
// @spec none (검증 실행기)
// 워커 풀 병렬성·serial 단계 격리·failFast 중단·선언 순서 결과 정렬 검증.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { runSteps } = require('../../../tools/check/step_runner.js');

const sleepStep = (ms, { serial = false, fail = false, tag = '' } = {}) => ({
  bin: 'node',
  args: ['-e', `setTimeout(()=>process.exit(${fail ? 1 : 0}),${ms})`],
  shell: false,
  serial,
  desc: tag || `sleep${ms}`,
});

test('병렬 실행 — jobs=4가 jobs=1 대비 유의하게 빠르다 (베이스라인 보정)', async () => {
  // 절대 시간 대신 동일 단계 세트의 순차 소요 대비 비율로 판정 —
  // 부하 환경(전체 스위트 병렬 구동)에서도 안정적
  const mk = () => [sleepStep(80), sleepStep(80), sleepStep(80), sleepStep(80)];
  const t1 = Date.now();
  await runSteps(mk(), { jobs: 1 });
  const serialMs = Date.now() - t1;
  const t2 = Date.now();
  const results = await runSteps(mk(), { jobs: 4 });
  const parallelMs = Date.now() - t2;
  assert.equal(results.length, 4);
  assert.ok(results.every((r) => r.ok));
  assert.ok(
    parallelMs < serialMs * 0.75,
    `serial ${serialMs}ms vs parallel ${parallelMs}ms — 병렬 효과 부족`,
  );
});

test('결과는 실행 완료 순이 아니라 선언 순서로 정렬된다', async () => {
  const results = await runSteps(
    [sleepStep(60, { tag: 'a' }), sleepStep(10, { tag: 'b' }), sleepStep(40, { tag: 'c' })],
    { jobs: 3 },
  );
  assert.deepEqual(results.map((r) => r.step.desc), ['a', 'b', 'c']);
});

test('serial 단계는 배치와 겹치지 않고 단독 실행된다', async () => {
  // 각 단계가 시작·종료 타임스탬프를 파일로 남기고, serial 단계의 실행
  // 구간이 다른 어떤 단계의 구간과도 겹치지 않는지 검증 — 부하 무관 결정적
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'step-runner-'));
  const mark = (tag, ms, serial = false) => ({
    bin: 'node',
    args: ['-e',
      `const fs=require('fs');` +
      `fs.writeFileSync(${JSON.stringify(path.join(dir, `${tag}.start`))},Date.now()+'');` +
      `setTimeout(()=>fs.writeFileSync(${JSON.stringify(path.join(dir, `${tag}.end`))},Date.now()+''),${ms})`],
    shell: false,
    serial,
    desc: tag,
  });
  try {
    const results = await runSteps(
      [mark('a', 60), mark('b', 60), mark('s', 60, true), mark('c', 60), mark('d', 60)],
      { jobs: 4 },
    );
    assert.equal(results.length, 5);
    const iv = (tag) => [
      Number(fs.readFileSync(path.join(dir, `${tag}.start`), 'utf8')),
      Number(fs.readFileSync(path.join(dir, `${tag}.end`), 'utf8')),
    ];
    const s = iv('s');
    for (const tag of ['a', 'b', 'c', 'd']) {
      const o = iv(tag);
      const overlap = s[0] < o[1] && o[0] < s[1];
      assert.ok(!overlap, `serial 구간이 ${tag}와 겹침`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('failFast — 첫 실패 이후 단계는 실행되지 않는다', async () => {
  const marker = path.join(os.tmpdir(), `step-runner-${process.pid}.flag`);
  try { fs.unlinkSync(marker); } catch {}
  const ran = [];
  const results = await runSteps(
    [
      sleepStep(10, { fail: true, tag: 'fail' }),
      sleepStep(200, { tag: 'slow' }),
      { bin: 'node', args: ['-e', `require('fs').writeFileSync(${JSON.stringify(marker)},'x')`], shell: false, desc: 'writes' },
      sleepStep(10, { serial: true, tag: 'serial-after' }),
    ],
    { jobs: 1, failFast: true, onResult: (r) => ran.push(r.step.desc) },
  );
  assert.ok(!results.every((r) => r.ok));
  assert.ok(!ran.includes('serial-after'), 'serial 단계는 failFast로 중단돼야 함');
  assert.ok(!fs.existsSync(marker), '실패 이후 단계는 실행되지 않아야 함');
});

test('inProcess — run() 계약 모듈은 spawn 없이 직접 실행', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'step-runner-ip-'));
  const modPath = path.join(dir, 'fake_checker.js');
  fs.writeFileSync(modPath,
    `module.exports = { run: async ({ args }) => ({` +
    ` status: args.includes('--fail') ? 1 : 0,` +
    ` output: 'inprocess:' + args.join(',') }) };`);
  try {
    const results = await runSteps(
      [
        { inProcess: modPath, bin: 'node', args: ['fake_checker.js', '--ref', 'HEAD~1'], shell: false, desc: 'ok' },
        { inProcess: modPath, bin: 'node', args: ['fake_checker.js', '--fail'], shell: false, desc: 'bad' },
      ],
      { jobs: 2 },
    );
    assert.equal(results.length, 2);
    assert.ok(results[0].ok);
    assert.match(results[0].output, /inprocess:--ref,HEAD~1/);
    assert.equal(results[1].ok, false);
    assert.equal(results[1].status, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('failFast 미지정 시 실패 후에도 나머지 전부 실행', async () => {
  const results = await runSteps(
    [sleepStep(5, { fail: true }), sleepStep(5), sleepStep(5)],
    { jobs: 3, failFast: false },
  );
  assert.equal(results.length, 3);
  assert.equal(results.filter((r) => !r.ok).length, 1);
});
