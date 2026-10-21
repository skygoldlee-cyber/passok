// tests/unit/study-quality-audit.test.js — 학습 품질 감사 지표 헬퍼 + 실행 검증
// @spec SQ-01,SQ-02,SQ-03,SQ-04
// audit_study_quality.js의 순수 지표 함수(spearman·analyzeAlloc)가
// 배분 정합성·약점 상관을 올바르게 측정하고, 시나리오 스위트가 종단으로
// 실행돼 기준선 회귀 게이트(--check)와 연동되는지 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TOOL = join(ROOT, 'tools', 'check', 'audit_study_quality.js');
const REPORT = join(ROOT, 'tools', 'check', 'study_quality_report.json');
const BASELINE = join(ROOT, 'tools', 'check', 'study_quality_baseline.json');
const req = createRequire(import.meta.url);
const { spearman, analyzeAlloc } = req('../../../tools/check/audit_study_quality.js');

// ---------- spearman ----------

test('SQ-02: spearman — 완전 단조 +1 / 반전 −1', () => {
    assert.equal(spearman([1, 2, 3], [10, 20, 30]), 1);
    assert.equal(spearman([1, 2, 3], [30, 20, 10]), -1);
});

test('SQ-02: spearman — 동점 평균 등수 + 무상관 0 근처', () => {
    const r = spearman([1, 2, 2, 4], [1, 2, 3, 4]);
    assert.ok(r > 0.7 && r < 1, `동점 보정 ${r}`);
    assert.equal(spearman([1, 1, 1], [1, 2, 3]), null); // 분산 0 → null
    assert.equal(spearman([1], [1]), null);            // 표본 부족
});

// ---------- analyzeAlloc ----------

function allocOf(cards, remaining, weakW, weightPct) {
    return { weeks: [{ total: cards.reduce((a, b) => a + b, 0), alloc: cards.map((c, i) => ({ key: `s${i}`, cards: c, remaining: remaining[i], weakW: weakW[i], weightPct: weightPct[i] })) }] };
}

test('SQ-02: analyzeAlloc — 정상 배분은 위반 0', () => {
    const m = analyzeAlloc(allocOf([30, 40, 30], [100, 100, 100], [1, 1, 1], [25, 50, 25]));
    assert.equal(m.coverage, 1);
    assert.equal(m.consViolations, 0);
    assert.equal(m.overCap, 0);
    assert.equal(m.reversals, 0);
});

test('SQ-02: analyzeAlloc — 주차 총량 초과·잔여 초과·역전 검출', () => {
    // total(60) < Σcards(70) → consViolations
    const over = { weeks: [{ total: 60, alloc: [{ key: 'a', cards: 70, remaining: 100, weakW: 1, weightPct: 50 }, { key: 'b', cards: 0, remaining: 100, weakW: 1, weightPct: 50 }] }] };
    const m = analyzeAlloc(over);
    assert.equal(m.consViolations, 1);
    assert.equal(m.overCap, 0); // 70 ≤ 100 잔여 — 초과 아님
    // 역전: a 잔여 100·40장 vs b 잔여 200·10장
    const rev = { weeks: [{ total: 50, alloc: [{ key: 'a', cards: 40, remaining: 100, weakW: 1, weightPct: 50 }, { key: 'b', cards: 10, remaining: 200, weakW: 1, weightPct: 50 }] }] };
    assert.equal(analyzeAlloc(rev).reversals, 1);
});

test('SQ-02: analyzeAlloc — weakCorr/boostCorr로 약점 반영도 계측', () => {
    // 약한 과목(weakW 1.7)이 정규화 배정에서 1위 → boostCorr 양수
    const m = analyzeAlloc(allocOf([50, 80, 40], [150, 150, 150], [1.7, 1.1, 1.1], [22, 56, 22]));
    assert.ok(m.boostCorr !== null && m.boostCorr >= 0.5, `boostCorr=${m.boostCorr}`);
});

test('SQ-02: analyzeAlloc — 잔여 0 과목은 coverage 분모에서 제외', () => {
    const m = analyzeAlloc(allocOf([50, 0, 50], [100, 0, 100], [1, 1, 1], [33, 34, 33]));
    assert.equal(m.coverage, 1); // 잔여 있는 2과목 모두 배정됨
});

// ---------- 종단 실행 ----------

test('SQ-03: 시나리오 스위트 종단 실행 — 전 항목 통과 + 리포트 산출', () => {
    const out = execFileSync(process.execPath, [TOOL], { cwd: ROOT, encoding: 'utf-8' });
    assert.ok(/실패 0건/.test(out), out.slice(-400));
    assert.ok(existsSync(REPORT), '리포트 산출');
    const report = JSON.parse(readFileSync(REPORT, 'utf-8'));
    assert.equal(report.summary.failed, 0);
    assert.ok(report.scenarios.length >= 16, `시나리오 ${report.scenarios.length}개`);
    const names = report.scenarios.map(s => s.name).join('|');
    assert.ok(/T1.*T2.*T3/.test(names), '시계열 시뮬 시나리오 포함');
    assert.ok(report.scenarios.every(s => s.checks.length > 0), '시나리오별 검사 항목 존재');
});

test('SQ-04: 기준선 회귀 게이트 — --check 모드가 기준선과 비교해 통과', () => {
    assert.ok(existsSync(BASELINE), 'study_quality_baseline.json 커밋 필수');
    const out = execFileSync(process.execPath, [TOOL, '--check'], { cwd: ROOT, encoding: 'utf-8' });
    assert.ok(/회귀 없음/.test(out), out.slice(-400));
});
