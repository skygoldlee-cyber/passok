// tests/unit/exams/carework/care-log.test.js
// @spec none — carework 일지 생성 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCareLog, buildCareLogMd, SERVICE_TYPES, ACTIVITY_GROUPS } from '../../../../src/exams/carework/care-log.js';

const base = { date: '2026-11-01', client: '김○○', service: 'visit-care', start: '09:00', end: '12:00', activities: { physical: ['식사 보조'], household: ['청소·정리'], cognitive: [] }, note: '' };

test('정상 생성 — 헤더·서비스·특이사항 구조', () => {
    const t = buildCareLog(base);
    assert.match(t, /■ 요양일지/);
    assert.match(t, /방문요양/);
    assert.match(t, /식사 보조/);
    assert.match(t, /특이사항 없음/);
});
test('필수 입력 누락 — null', () => {
    assert.equal(buildCareLog({ ...base, client: '' }), null);
    assert.equal(buildCareLog({ ...base, date: '' }), null);
});
test('시간 범위·특이사항 반영', () => {
    const t = buildCareLog({ ...base, note: '혈압 상승 주의' });
    assert.match(t, /09:00~12:00/);
    assert.match(t, /혈압 상승 주의/);
});
test('선택 없는 그룹은 생략', () => {
    const t = buildCareLog(base);
    assert.ok(!t.includes('정서·인지 지원'));
});
test('상수 계약 — 서비스 5종·활동 3그룹', () => {
    assert.equal(SERVICE_TYPES.length, 5);
    assert.equal(ACTIVITY_GROUPS.length, 3);
});
test('관찰 칩 입력은 본문에 반영 — 미선택 시 생략', () => {
    const t = buildCareLog({ ...base, obs: { meal: '전', sleep: '양호', voided: '' } });
    assert.match(t, /\[상태 관찰\] 식사량: 전 · 수면: 양호/);
    assert.ok(!t.includes('배변'));
    assert.ok(!buildCareLog(base).includes('상태 관찰')); // obs 없으면 행 자체 생략
});
test('격식표 MD — 기본정보·서비스·특이사항이 표로 구성', () => {
    const md = buildCareLogMd({ ...base, obs: { meal: '전' } });
    assert.match(md, /\| 일시 \| 2026-11-01 09:00~12:00 \|/);
    assert.match(md, /\| 대상자 \| 김 ○○ 님 \|/);
    assert.match(md, /\| 급여 종류 \| 방문요양 \|/);
    assert.match(md, /\| 신체활동 지원 \| 식사 보조 \|/); // 선택 그룹만 행
    assert.match(md, /\| 상태 관찰 \| 식사량: 전 \|/);
    assert.match(md, /\| 특이사항 \|/);
    assert.match(md, /\|---\|/); // MD 표 구분행 존재 — docxFileMd가 표로 변환
    assert.ok(!md.includes('정서·인지 지원')); // 미선택 그룹 생략
    assert.equal(buildCareLogMd({ ...base, client: '' }), null);
});
