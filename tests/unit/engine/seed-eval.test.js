// tests/unit/seed-eval.test.js — 난이도 시딩 오프라인 평가기
// @spec AI-32
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSeedAccuracy } from '../../../tools/ai/lib/difficulty.js';

test('AI-32: 단조 오답률 → valid', () => {
    const pairs = [];
    for (let i = 0; i < 20; i++) pairs.push({ pred: 2, wrong: i % 5 === 0 });   // 20%
    for (let i = 0; i < 20; i++) pairs.push({ pred: 4, wrong: i % 2 === 0 });   // 50%
    const r = evaluateSeedAccuracy(pairs, 30);
    assert.equal(r.verdict, 'valid');
    assert.equal(r.sample, 40);
    assert.equal(r.buckets[1].wrongRate, 0.5);
});

test('AI-32: 역전 1쌍 → borderline, 다수 역전 → invalid', () => {
    const pairs = [];
    for (let i = 0; i < 20; i++) pairs.push({ pred: 2, wrong: i % 2 === 0 });   // 50%
    for (let i = 0; i < 20; i++) pairs.push({ pred: 3, wrong: i % 5 === 0 });   // 20% (1쌍 역전)
    assert.equal(evaluateSeedAccuracy(pairs, 30).verdict, 'borderline');
    for (let i = 0; i < 20; i++) pairs.push({ pred: 4, wrong: false });          // 0% (2쌍 역전)
    assert.equal(evaluateSeedAccuracy(pairs, 30).verdict, 'invalid');
});

test('AI-32: 표본 미달 → insufficient (승격 차단)', () => {
    const r = evaluateSeedAccuracy([{ pred: 2, wrong: true }], 30);
    assert.equal(r.verdict, 'insufficient');
    assert.equal(r.sample, 1);
});
