// tests/unit/exams/carework/care-client-resolve.test.js
// @spec CO-01 — clientId 해석 순수 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveClientId, backfillClientIds } from '../../../../src/exams/carework/care-client-resolve.js';

const clients = [
    { id: 'cli_a', name: '김영희' },
    { id: 'cli_b', name: '박철수' },
    { id: 'cli_c', name: '김영희' }, // 동명이인
];

test('단일 매칭 → clientId 해석', () => {
    assert.deepEqual(resolveClientId('박철수', clients), { id: 'cli_b', candidates: 1 });
});

test('동명이인 → 미해결 (candidates 2, id null)', () => {
    assert.deepEqual(resolveClientId('김영희', clients), { id: null, candidates: 2 });
});

test('무 매칭·공백·앞뒤 공백 이름', () => {
    assert.deepEqual(resolveClientId('이없음', clients), { id: null, candidates: 0 });
    assert.deepEqual(resolveClientId('  박철수 ', clients), { id: 'cli_b', candidates: 1 });
    assert.deepEqual(resolveClientId('', clients), { id: null, candidates: 0 });
});

test('백필 — 단일 매칭만 채우고 해석 수 반환', () => {
    const recs = [
        { id: 'l1', client: '박철수' },           // 해석
        { id: 'l2', client: '김영희' },           // 동명이인 미해결
        { id: 'l3', client: '이없음' },           // 무 매칭
        { id: 'l4', client: '박철수', clientId: 'cli_x' }, // 기존 유지
        { id: 'l5' },                            // client 없음
    ];
    assert.equal(backfillClientIds(recs, clients), 1);
    assert.equal(recs[0].clientId, 'cli_b');
    assert.equal(recs[1].clientId, undefined);
    assert.equal(recs[4].clientId, undefined);
    assert.equal(recs[3].clientId, 'cli_x');
});

test('백필 — 빈 명부·빈 레코드는 0', () => {
    assert.equal(backfillClientIds([{ client: '박철수' }], []), 0);
    assert.equal(backfillClientIds([], clients), 0);
    assert.equal(backfillClientIds(null, clients), 0);
});
