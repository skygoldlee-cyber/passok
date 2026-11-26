// tests/unit/passloop/learner-profile.test.js
// @spec AI-41
// PassLoop 학습자 취약 개념 프로필 — recordConcept·topWeakConcepts
// 순수 로직 검증 (누적·LRU 상한·90일 만료·빈도/최근성 정렬).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    PROFILE_DEFAULTS,
    recordConcept,
    topWeakConcepts,
} from '../../../src/passloop/index.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

test('recordConcept — 신규 라벨 누적 + 동일 라벨 재누적은 n 증가·lastTs 갱신', () => {
    let p = recordConcept(null, { label: '할부거래', cid: 'law:§2.1', src: 'feedback' }, NOW);
    assert.equal(p['할부거래'].n, 1);
    assert.equal(p['할부거래'].lastTs, NOW);
    assert.equal(p['할부거래'].cid, 'law:§2.1');
    assert.equal(p['할부거래'].src, 'feedback');

    p = recordConcept(p, { label: '할부거래', src: 'stmt' }, NOW + DAY);
    assert.equal(p['할부거래'].n, 2);
    assert.equal(p['할부거래'].lastTs, NOW + DAY);
    assert.equal(p['할부거래'].cid, 'law:§2.1'); // cid 미제공 시 기존 유지
    assert.equal(Object.keys(p).length, 1);
});

test('recordConcept — 빈 라벨·비정상 src 무시, 라벨 60자 절단', () => {
    let p = recordConcept({}, { label: '  ', src: 'feedback' }, NOW);
    assert.equal(Object.keys(p).length, 0);
    p = recordConcept(p, { label: 'x'.repeat(100), src: 'bogus' }, NOW);
    const k = Object.keys(p)[0];
    assert.equal(k.length, PROFILE_DEFAULTS.labelMax);
    assert.equal(p[k].src, 'stmt'); // 비정상 src는 stmt로 정규화
});

test('recordConcept — LRU 상한 초과 시 최장기 미갱신 항목부터 퇴출', () => {
    let p = {};
    for (let i = 0; i < PROFILE_DEFAULTS.maxEntries; i++) {
        p = recordConcept(p, { label: `c${i}`, src: 'stmt' }, NOW + i);
    }
    assert.equal(Object.keys(p).length, PROFILE_DEFAULTS.maxEntries);
    // 최근 항목을 한 번 더 누적 → c0(가장 오래됨) 퇴출
    p = recordConcept(p, { label: 'new', src: 'stmt' }, NOW + 10_000);
    assert.equal(Object.keys(p).length, PROFILE_DEFAULTS.maxEntries);
    assert.equal(p['c0'], undefined);
    assert.ok(p['new']);
});

test('topWeakConcepts — 만료(90일) 제외, 빈도 desc → 최근성 desc', () => {
    let p = {};
    // a: 3회(오래됨)  b: 3회(최근)  c: 1회  d: 만료
    for (let i = 0; i < 3; i++) p = recordConcept(p, { label: 'a', src: 'stmt' }, NOW - 10 * DAY + i);
    for (let i = 0; i < 3; i++) p = recordConcept(p, { label: 'b', src: 'feedback' }, NOW - DAY + i);
    p = recordConcept(p, { label: 'c', src: 'stmt' }, NOW);
    p = recordConcept(p, { label: 'd', src: 'stmt' }, NOW - 91 * DAY);
    const top = topWeakConcepts(p, { nowMs: NOW });
    assert.deepEqual(top, ['b', 'a', 'c']); // d 만료 제외, a·b 동률이면 최근 b 우선
});

test('topWeakConcepts — limit 적용 + 입력 없으면 빈 배열', () => {
    assert.deepEqual(topWeakConcepts(null), []);
    let p = {};
    for (let i = 0; i < 10; i++) p = recordConcept(p, { label: `w${i}`, src: 'stmt' }, NOW);
    assert.equal(topWeakConcepts(p, { nowMs: NOW, limit: 3 }).length, 3);
    assert.equal(topWeakConcepts(p, { nowMs: NOW }).length, PROFILE_DEFAULTS.topLimit);
});
