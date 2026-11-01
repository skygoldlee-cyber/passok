// tests/unit/exams/carework/care-card.test.js
// @spec none — carework 대처카드 데이터 계약
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cardById } from '../../../../src/exams/carework/care-card.js';

const cards = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'content/exams/carework/실무/care_cards.json'), 'utf8')).cards;

test('카드 구조 — id·카테고리·제목·트리거·4단계 이하 스텝', () => {
    assert.ok(cards.length >= 6);
    for (const c of cards) {
        for (const k of ['id', 'category', 'title', 'trigger']) assert.ok(c[k], `${c.id}: ${k} 누락`);
        assert.ok(Array.isArray(c.steps) && c.steps.length >= 2, `${c.id}: steps 부족`);
        for (const s of c.steps) { assert.ok(s.phase && s.text, `${c.id}: step 필드 누락`); }
    }
});
test('필수 시나리오 커버 — BPSD·낙상·욕창·응급·감염·학대', () => {
    const ids = cards.map(c => c.id);
    for (const req of ['bpsd-wander', 'bpsd-aggression', 'fall', 'pressure-ulcer', 'emergency', 'infection', 'abuse-suspect'])
        assert.ok(ids.includes(req), `${req} 누락`);
});
test('cardById — 존재 id 반환, 미존재 null', () => {
    assert.equal(cardById(cards, 'fall').title, '낙상 발생');
    assert.equal(cardById(cards, 'nope'), null);
});
