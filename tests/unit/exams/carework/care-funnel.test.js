// tests/unit/exams/carework/care-funnel.test.js
// @spec CO-12 — 전환 퍼널 계측 순수 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';

// storage.js는 브라우저 storage 필요 — 순수 판독만 검증하기 위해 localStorage 스텁
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };

const { markFunnel, funnelStats } = await import('../../../../src/exams/carework/care-funnel.js');

test('최초 사용 기록 + 도구별 누적', () => {
    const f1 = markFunnel('tool:care-log');
    assert.ok(f1.first_use);
    markFunnel('tool:care-log');
    const f2 = markFunnel('tool:care-client');
    assert.equal(f2.tools['tool:care-log'], 2);
    assert.equal(f2.tools['tool:care-client'], 1);
    assert.equal(f2.first_use, f1.first_use); // 첫 사용 시점 불변
    const s = funnelStats();
    assert.equal(s.tools['tool:care-log'], 2);
});
