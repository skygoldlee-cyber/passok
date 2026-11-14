// tests/unit/exams/carework/care-csv-presets.test.js
// @spec CO-07 — ERP 프리셋 alias 정규화 + 제공기록지 양식
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvToClientsAny } from '../../../../src/exams/carework/care-csv-presets.js';
import { buildRecordText } from '../../../../src/exams/carework/care-log.js';

test('외부 헤더 alias → 정식 컬럼 정규화 (이지케어·롱텀 계열)', () => {
    const csv = '수급자명,생활실,보호자연락처,특이사항\n김영희,302,010-1111-2222,낙상주의';
    const recs = csvToClientsAny(csv);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].name, '김영희');
    assert.equal(recs[0].room, '302');
    assert.equal(recs[0].phone, '010-1111-2222');
    assert.equal(recs[0].caution, '낙상주의');
});

test('정식 헤더는 기존 파서 그대로 통과', () => {
    const csv = '성명,호실\n박철수,305';
    const recs = csvToClientsAny(csv);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].name, '박철수');
});

test('buildRecordText — 공단 제공기록지 양식', () => {
    const t = buildRecordText({ date: '2026-11-04', client: '김영희', service: 'visit-care', start: '09:00', end: '12:00', activities: { physical: ['식사 보조'] }, note: '혈압 확인' });
    assert.match(t, /급여제공기록지/);
    assert.match(t, /김 영희/);
    assert.match(t, /방문요양/);
    assert.match(t, /식사 보조/);
    assert.equal(buildRecordText({ client: 'x' }), null);
});
