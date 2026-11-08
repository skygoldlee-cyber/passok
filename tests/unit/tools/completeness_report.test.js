// tests/unit/tools/completeness_report.test.js — 완성도 리포트 순수 함수 계약
// @spec none — 도구 검증 (측정 집계 함수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { specStatusDist, traceSummary, bypassStats } = require('../../../tools/check/completeness_report.js');

const SPEC = `| CO-01 | **A** — 설명 | 구현 완료 |
| CO-02 | **B** — 설명 | 부분 구현 |
| CO-03 | **C** — 설명 | 미구현 |
| CO-04 | **D** — 설명 | 미구현 — 조건부(법무 0b) |
| CO-05 | **E** — 설명 | 보류 |
| CO-06 | **F** — 설명 | 폐기 (CO-05로 통합) |`;

test('specStatusDist — 상태 버킷 분류', () => {
    const d = specStatusDist(SPEC);
    assert.equal(d.ids, 6);
    assert.equal(d.done, 1);
    assert.equal(d.partial, 1);
    assert.equal(d.notimpl, 1);
    assert.equal(d.conditional, 1);
    assert.equal(d.deferred, 1);
    assert.equal(d.retired, 1);
});

test('specStatusDist — 비요구사항 행(주석·표머리)은 무시', () => {
    const d = specStatusDist('| ID | 요구사항 | 구현 상태 |\n| 비고 | 폐기 |');
    assert.equal(d.ids, 0);
});

test('traceSummary — 커버리지 요약행 파싱 + 테스트 갭', () => {
    const t = traceSummary('**커버리지 요약**: 요구사항 688개 — 문서 연결 464 · 소스 연결 611 · 테스트 연결 652 · 보고서 연결 109\n참조가 없는 요구사항 6개');
    assert.deepEqual(t, { req: 688, doc: 464, src: 611, test: 652, rep: 109, testGap: 6 });
    assert.equal(traceSummary(''), null);
});

test('bypassStats — jsonl 기제별 카운트', () => {
    const b = bypassStats('{"gate":"test-first","mechanism":"env"}\n{"gate":"test-first","mechanism":"env"}\n{"gate":"doc-sync","mechanism":"commit-mark"}\n깨진행');
    assert.equal(b['test-first:env'], 2);
    assert.equal(b['doc-sync:commit-mark'], 1);
});
