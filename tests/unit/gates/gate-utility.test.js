// tests/unit/gates/gate-utility.test.js — P2 게이트 효용 감사 판정 로직 고정
// @spec none (검증 인프라 테스트)
// collectStepStats의 dormant/silent/noisy/ok 분류를 고정한다 — audit_gate_utility는
// advisory 도구지만 판정 회귀는 리뷰 판단을 오도하므로 테스트로 고정.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import auditMod from '../../../tools/check/audit_gate_utility.js';

const { collectStepStats } = auditMod;
const NOW = Date.parse('2026-10-26T00:00:00Z');
const step = (id) => ({ id, desc: `desc ${id}`, prio: 'p2' });
const run = (id, ok, ts = '2026-10-20T00:00:00Z', ms = 100) =>
    JSON.stringify({ ts, id, ok, ms });

test('collectStepStats — dormant/silent/noisy/ok 분류', () => {
    const steps = [step('a'), step('b'), step('c'), step('d')];
    const lines = [
        run('b', true), run('b', true),           // 실행됨·실패 0 → silent
        run('c', false), run('c', false), run('c', true), // 실패율 67% → noisy
        run('d', true), run('d', false), run('d', true),  // 실패율 33% → noisy
        // 'a' — 실행 기록 없음 → dormant
        run('e', true),                            // 비대상 단계 — 무시
        run('b', true, '2020-01-01T00:00:00Z'),    // 윈도우 밖 — 무시
        '{"bad json',
    ];
    const out = collectStepStats({ steps, runLines: lines, now: NOW, days: 90 });
    const byId = Object.fromEntries(out.map((r) => [r.id, r]));
    assert.equal(byId.a.verdict, 'dormant');
    assert.equal(byId.b.verdict, 'silent');
    assert.equal(byId.c.verdict, 'noisy');
    assert.equal(byId.d.verdict, 'noisy');
    assert.equal(byId.b.runs, 2);
    assert.equal(byId.b.lastRunTs, Date.parse('2026-10-20T00:00:00Z'));
    assert.equal(byId.b.avgMs, 100);
});

test('collectStepStats — 기준선 갱신 이력이 있으면 silent 아님', () => {
    const steps = [step('x')];
    const lines = [run('x', true)];
    const out = collectStepStats({
        steps, runLines: lines, now: NOW, days: 90,
        stateFilesByStep: { x: ['tools/state/foo_baseline.json'] },
        baselineInfo: { 'tools/state/foo_baseline.json': { lastTs: NOW - 86400e3, updates: 2 } },
    });
    assert.equal(out[0].verdict, 'ok'); // 실패 0이지만 기준선 갱신 흔적 = 발화 증거
    assert.equal(out[0].baselineUpdates, 2);
    assert.equal(out[0].lastBaselineTs, NOW - 86400e3);
});

test('collectStepStats — 기준선 잦은 갱신(≥6)은 noisy', () => {
    const steps = [step('y')];
    const out = collectStepStats({
        steps, runLines: [run('y', true)], now: NOW, days: 90,
        stateFilesByStep: { y: ['tools/state/b.json'] },
        baselineInfo: { 'tools/state/b.json': { lastTs: NOW, updates: 8 } },
    });
    assert.equal(out[0].verdict, 'noisy');
});
