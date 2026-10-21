// tests/unit/grant-pro.test.js
// @spec AD-06 (관리자 운영 CLI)
// tools/check/grant_pro.js — buildPlanChange()·isNoop() 순수 로직 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildPlanChange, isNoop } = require('../../../tools/check/grant_pro.js');

test('buildPlanChange: 부여는 pro + pro_since 시각, 회수는 free + null', () => {
    const grant = buildPlanChange(false);
    assert.equal(grant.plan, 'pro');
    assert.match(grant.pro_since, /^\d{4}-\d{2}-\d{2}T/);
    const rev = buildPlanChange(true);
    assert.deepEqual(rev, { plan: 'free', pro_since: null });
});

test('isNoop: 동일 상태 재적용은 변경 불필요로 판정', () => {
    assert.equal(isNoop('pro', false), true);   // 이미 pro인데 부여
    assert.equal(isNoop('free', true), true);   // 이미 free인데 회수
    assert.equal(isNoop('free', false), false);
    assert.equal(isNoop('pro', true), false);
});
