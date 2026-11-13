// tests/unit/exams/carework/care-handover.test.js
// @spec none — carework 인수인계서 생성 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHandover, buildHandoverMd, SHIFTS } from '../../../../src/exams/carework/care-handover.js';

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
test('격식표 MD — 기본정보·인계 내용이 2열 표로 구성', () => {
    const md = buildHandoverMd({ ...base, logs: ['김○○ — 방문요양'] });
    assert.match(md, /\| 일시 \| 2026-11-01 \(주간 근무조\) \|/);
    assert.match(md, /\| 인계자 \| 김○○ \|/);
    assert.match(md, /\| 대상자 \| 302호 \|/);
    assert.match(md, /\| 대상자 상태 \| 식사 양호 \|/);
    assert.match(md, /\| 당일 수행 서비스 \| 김○○ — 방문요양 \|/);
    assert.match(md, /\| 미완료·인계 작업 \| 없음 \|/);
    assert.match(md, /\|---\|/); // MD 표 구분행 — docxFileMd가 표로 변환
    assert.equal(buildHandoverMd({ ...base, from: '' }), null);
});
