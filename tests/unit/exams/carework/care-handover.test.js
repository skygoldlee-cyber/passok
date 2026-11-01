// tests/unit/exams/carework/care-handover.test.js
// @spec none — carework 인수인계서 생성 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHandover, SHIFTS } from '../../../../src/exams/carework/care-handover.js';

const base = { date: '2026-11-01', from: '김○○', to: '박○○', shift: 'day', clients: '302호', status: '식사 양호', tasks: '', caution: '', logs: [] };

test('정상 생성 — 헤더·인계자·상태 구조', () => {
    const t = buildHandover(base);
    assert.match(t, /■ 요양보호 인수인계서/);
    assert.match(t, /인계자: 김○○ → 인수자: 박○○/);
    assert.match(t, /식사 양호/);
    assert.match(t, /주간/);
});
test('필수 입력 누락 — null', () => {
    assert.equal(buildHandover({ ...base, from: '' }), null);
    assert.equal(buildHandover({ ...base, to: '' }), null);
});
test('일지 병합 — logs 반영', () => {
    const t = buildHandover({ ...base, logs: ['김○○ — 방문요양'] });
    assert.match(t, /당일 수행 서비스 기록/);
    assert.match(t, /방문요양/);
});
test('상수 계약 — 근무조 3종', () => { assert.equal(SHIFTS.length, 3); });
