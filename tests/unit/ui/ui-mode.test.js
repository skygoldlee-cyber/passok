// tests/unit/ui/ui-mode.test.js — 글자 크게 토글 레이블 계약
// @spec none
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../../src/shell/ui-mode.js', import.meta.url), 'utf8');

describe('글자 크게 레이블 계약', () => {
    it('레이블은 아이콘 문자 없이 "글자 크게"/"글자 더 크게"', () => {
        assert.match(src, /'글자 크게'/);                    // 기본·lg 레이블
        assert.match(src, /'글자 더 크게'/);                  // xl 레이블
        assert.doesNotMatch(src, /'가 글자/);                // 중복 아이콘 문자 금지
    });
});
