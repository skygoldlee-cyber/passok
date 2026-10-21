// tests/unit/runbook-links.test.js
// @spec none (체커 자체 검증)
// tools/check/check_runbook_links.js — slugify GitHub 헤딩 해석 규칙

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { slugify } = require('../../../tools/check/check_runbook_links.js');

test('slugify: 번호·문장부호 제거 + 공백→하이픈 + 한글 보존', () => {
    assert.equal(slugify('3. 흔한 실패 → 복구'), '3-흔한-실패-복구');
    assert.equal(slugify('5-3. 롤백 절차 (프로덕션을 이전 버전으로 복귀)'),
        '5-3-롤백-절차-프로덕션을-이전-버전으로-복귀');
});

test('slugify: 이모지·백틱 제거, 소문자화', () => {
    assert.equal(slugify('📋 목차'), '-목차'); // 이모지 제거 후 선행 공백이 하이픈으로 잔존 (GitHub 규칙)
    assert.equal(slugify('2. 프리셋 지도 (`tools/check/steps.js`가 단일 선언부)'),
        '2-프리셋-지도-toolscheckstepsjs가-단일-선언부');
    assert.equal(slugify('TL;DR'), 'tldr');
});
