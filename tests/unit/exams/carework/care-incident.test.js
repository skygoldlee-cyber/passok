// tests/unit/exams/carework/care-incident.test.js
// @spec none — carework 사고보고서 생성 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIncidentText, buildIncidentMd, INCIDENT_TYPES, SEVERITIES } from '../../../../src/exams/carework/care-incident.js';

const base = { date: '2026-11-01', time: '14:30', client: '김○○', place: '화장실', type: 'fall', severity: 'minor', desc: '미끄러짐', action: '응급조치', witness: '이○○', familyNotified: true };

test('평문 생성 — 필수 항목·라벨 치환', () => {
    const t = buildIncidentText(base);
    assert.match(t, /발생 일시: 2026-11-01 14:30/);
    assert.match(t, /사고 유형: 낙상/);
    assert.match(t, /가족 통지: 완료/);
});

test('격식표 MD — 전 항목이 2열 표로 구성', () => {
    const md = buildIncidentMd(base);
    assert.match(md, /\| 항목 \| 내용 \|/);
    assert.match(md, /\| 발생 일시 \| 2026-11-01 14:30 \|/);
    assert.match(md, /\| 대상자 \| 김 ○○ \|/);
    assert.match(md, /\| 사고 유형 \| 낙상 \|/);
    assert.match(md, /\| 중증도 \| 경미 \(관찰 필요\) \|/);
    assert.match(md, /\| 가족 통지 \| 완료 \|/);
    assert.match(md, /\|---\|/); // MD 표 구분행 — docxFileMd가 표로 변환
});

test('선택 항목 생략 — 빈 필드는 행 미생성', () => {
    const md = buildIncidentMd({ ...base, place: '', witness: '', desc: '', action: '', severity: '' });
    assert.ok(!md.includes('발생 장소'));
    assert.ok(!md.includes('목격자'));
    assert.ok(!md.includes('중증도'));
});

test('필수 입력 누락 — 공백 반환', () => {
    assert.equal(buildIncidentMd({ ...base, client: '' }), '');
    assert.equal(buildIncidentMd({ ...base, type: '' }), '');
});

test('상수 계약 — 유형 6종·중증도 3종', () => {
    assert.equal(INCIDENT_TYPES.length, 6);
    assert.equal(SEVERITIES.length, 3);
});
