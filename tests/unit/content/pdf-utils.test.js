// tests/unit/content/pdf-utils.test.js — 생성 PDF 색상 보정 판정 계약
// @spec CO-20
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { _lum } from '../../../src/content/pdf-utils.js';

describe('_lum — 흰 배경 가독성 밝기 판정', () => {
    it('흰 배경에서 안 보이는 밝은 글자는 0.82 초과', () => {
        assert.ok(_lum('rgb(255, 255, 255)') > 0.82);   // 화이트
        assert.ok(_lum('rgb(229, 231, 235)') > 0.82);   // 다크 테마 본문색
    });
    it('일반 글자·액센트 색은 유지 대상 (0.82 이하)', () => {
        assert.ok(_lum('rgb(0, 0, 0)') < 0.82);
        assert.ok(_lum('rgb(16, 185, 129)') < 0.82);    // --color-primary 계열
        assert.ok(_lum('rgb(59, 130, 246)') < 0.82);
    });
    it('비색상 입력은 null', () => {
        assert.equal(_lum('transparent'), null);
        assert.equal(_lum(''), null);
    });
});
