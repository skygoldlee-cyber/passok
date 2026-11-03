// tests/unit/exams/carework/care-client-csv.test.js
// @spec none — 도메인 순수 로직 (CSV 왕복)
// 수급자 CSV 왕복 — 파싱·직렬화·상태 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvToClients, clientsToCsv, ADMIT_ITEMS, CLIENT_STATUSES } from '../../../../src/exams/carework/care-client-csv.js';

test('round-trip: 직렬화→파싱 동일 필드 보존', () => {
    const items = [
        { name: '김○○', status: '입소대기', room: '302호', birth: '1950-01-01', phone: '010-1111-2222', allergy: '페니실린', caution: '낙상 위험, 연하곤란', memo: '특이 "메모"', docs: { 'a-cert': true, 'a-health': true } },
        { name: '박○○', status: '입소중', docs: {} },
    ];
    const back = csvToClients(clientsToCsv(items));
    assert.equal(back.length, 2);
    assert.equal(back[0].name, '김○○');
    assert.equal(back[0].status, '입소대기');
    assert.equal(back[0].caution, '낙상 위험, 연하곤란');
    assert.equal(back[0].memo, '특이 "메모"');
    assert.equal(back[0].docs['a-cert'], true);
    assert.equal(back[0].docs['a-health'], true);
    assert.equal(back[0].docs['a-plan'], false);
    assert.equal(back[1].status, '입소중');
});

test('파싱: 헤더 없는 행·성명 누락 제외, 비정상 상태 제거', () => {
    const csv = '성명,상태,호실\n김○○,퇴소,302\n,입소중,303\n';
    const recs = csvToClients(csv);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].status, undefined);
});

test('파싱: 서류 열 수납 표시 인식 (○·x·1)', () => {
    const doc = ADMIT_ITEMS[0].short;
    const csv = `성명,${doc}\n김○○,○\n박○○,x\n최○○,\n`;
    const recs = csvToClients(csv);
    assert.equal(recs[0].docs[ADMIT_ITEMS[0].id], true);
    assert.equal(recs[1].docs[ADMIT_ITEMS[0].id], true);
    assert.equal(recs[2].docs[ADMIT_ITEMS[0].id], false);
});

test('상태 목록 — 입소대기·입소중·재가이용', () => {
    assert.deepEqual(CLIENT_STATUSES, ['입소대기', '입소중', '재가이용']);
});
