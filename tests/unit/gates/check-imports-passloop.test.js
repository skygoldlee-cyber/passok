// tests/unit/gates/check-imports-passloop.test.js — PassLoop 엔진 경계 게이트
// @spec BP-02
// check_imports.js의 passloopBoundaryError — src/passloop/ 외부 의존 0 규칙 검증
// (DOC-DSN-56 §3.7: 어댑터→엔진 단방향, 정적·동적·외부 패키지 동일 적용)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { passloopBoundaryError } = require('../../../tools/check/check_imports.js');

test('엔진 내부 상대 import는 허용', () => {
    assert.equal(
        passloopBoundaryError('src/passloop/index.js', './core/mastery.js', 'src/passloop/core/mastery.js'),
        null
    );
});

test('엔진 코어가 외부 모듈을 import하면 경계 위반', () => {
    const err = passloopBoundaryError('src/passloop/core/mastery.js', '../../study/fsrs.js', 'src/study/fsrs.js');
    assert.ok(err && err.includes('경계 위반'));
});

test('외부 패키지(bare specifier)는 의존 0 규칙 위반', () => {
    const err = passloopBoundaryError('src/passloop/core/mastery.js', 'lodash-es', null);
    assert.ok(err && err.includes('외부 패키지'));
});

test('상대경로 미해석은 경계 판정 없음 — 기존 모듈 없음 오류가 담당', () => {
    assert.equal(passloopBoundaryError('src/passloop/x.js', './missing.js', null), null);
});

test('어댑터→엔진 방향(src 외부 파일 → passloop)은 허용', () => {
    assert.equal(
        passloopBoundaryError('src/study/passloop-adapter.js', '../passloop/index.js', 'src/passloop/index.js'),
        null
    );
});

test('passloop 외 파일의 외부 import는 이 규칙과 무관', () => {
    assert.equal(
        passloopBoundaryError('src/views/analysis-view.js', '../study/personalization.js', 'src/study/personalization.js'),
        null
    );
});
