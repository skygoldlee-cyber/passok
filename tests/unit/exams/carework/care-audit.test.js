// tests/unit/exams/carework/care-audit.test.js
// @spec none — carework 평가 체크리스트 데이터 계약
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const data = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'content/exams/carework/실무/audit_checklist.json'), 'utf8'));

test('섹션 구조 — 4개 영역·항목 필드', () => {
    assert.equal(data.sections.length, 4);
    for (const s of data.sections) {
        assert.ok(s.id && s.title && Array.isArray(s.items), `${s.id}: 구조 누락`);
        assert.ok(s.items.length >= 4, `${s.id}: 항목 4개 미만`);
        for (const i of s.items) { assert.ok(i.id && i.text && i.ref, `${i.id}: 필드 누락`); }
    }
});
test('항목 id 전체 유니크', () => {
    const ids = data.sections.flatMap(s => s.items.map(i => i.id));
    assert.equal(new Set(ids).size, ids.length);
});
test('필수 영역 — 인권·기록·감염·안전', () => {
    const ids = data.sections.map(s => s.id);
    for (const req of ['rights', 'records', 'infection', 'safety'])
        assert.ok(ids.includes(req), `${req} 누락`);
});

test('항목 텍스트 — innerHTML 렌더용 HTML 특수문자 미포함', () => {
    for (const s of data.sections) for (const i of s.items) {
        assert.ok(!/[<>"]/.test(i.text), `${i.id}: 텍스트에 HTML 특수문자`);
        assert.ok(!/[<>"]/.test(i.ref), `${i.id}: ref에 HTML 특수문자`);
    }
});
