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

test('roster 계측 — 신규 도구 키 누적', () => {
    markFunnel('tool:care-roster');
    assert.equal(funnelStats().tools['tool:care-roster'], 1);
});

// 카카오맵 검색 쿼리 계약 — 주소만 전달 (기관명+주소 조합은 지도 미검색)
import { readFileSync } from 'node:fs';
test('카카오맵 링크 — 주소만 검색 쿼리로 사용', () => {
    const src = readFileSync('src/exams/carework/views/care-finder.js', 'utf8');
    assert.match(src, /encodeURIComponent\(f\.address \|\| f\.region \|\| f\.name\)/);
});

test('공단 검색 링크 — 카드 반복 없이 뷰 상단 단일 위치', () => {
    assert.ok(!/selectLtcoSrch/.test(readFileSync('src/exams/carework/views/care-finder.js', 'utf8')));
    assert.match(readFileSync('html/exams/carework/care-finder.html', 'utf8'), /selectLtcoSrch/);
});
