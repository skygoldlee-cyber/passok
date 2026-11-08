// tests/unit/content/pdf-utils.test.js — 생성 PDF 색상 보정 판정 계약
// @spec CO-20
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

describe('pdfFileFromElStyled — 요소 경계 페이지네이션·오버레이 컨텍스트 계약', () => {
    const src = readFileSync('src/content/pdf-utils.js', 'utf8');

    it('오버레이 id 컨텍스트를 래퍼·페이지 컨테이너에 부여 (article 스코프 CSS 재현)', () => {
        assert.match(src, /closest\('\[id\$="-overlay"\]'\)/); // 오버레이 조상 탐색
        assert.match(src, /wrap\.id = ovId/);                    // 래퍼 컨텍스트
        assert.match(src, /pg\.id = ovId/);                      // 페이지 컨테이너 컨텍스트
    });

    it('요소 실측 높이로 페이지를 채움 — 고정 슬라이스가 아닌 요소 경계', () => {
        assert.match(src, /clone\.children/);                    // article 자식 요소 순회
        assert.match(src, /offsetHeight \+ parseFloat/);         // 실측 높이 + 마진
        assert.match(src, /curH \+ h > availPx/);                // 페이지 용량 채우기
        assert.match(src, /clone\.cloneNode\(false\)/);          // 페이지별 article 래퍼 복제
    });
});
