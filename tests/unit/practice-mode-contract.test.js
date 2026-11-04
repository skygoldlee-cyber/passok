// tests/unit/practice-mode-contract.test.js
// @spec DA-20, UM-06, DA-19 — 모드 메뉴 분리·팩별 실무 구성·실무매뉴얼 팩 소유 계약
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('모드 분리 마크업 계약 — 학습/실무 클래스 양측 존재 (DA-20)', () => {
    const t = readFileSync('index.template.html', 'utf8');
    assert.match(t, /nav-study-only/);
    assert.match(t, /nav-practice-only|nav-item-practice/);
});

test('실무 피처 레지스트리 — 팩별 구성 선언 (UM-06)', () => {
    const src = readFileSync('src/practice-registry.js', 'utf8');
    assert.match(src, /PRACTICE_FEATURES/);
    assert.match(src, /careCalc/);
});

test('실무매뉴얼 — 시험 팩 소유 문서 존재 (DA-19)', () => {
    assert.ok(existsSync('content/exams/carework/docs/실무매뉴얼.md'));
});
