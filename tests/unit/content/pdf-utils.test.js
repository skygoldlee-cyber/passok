// tests/unit/content/pdf-utils.test.js — 생성 PDF 색상 보정 판정 계약
// @spec CO-20 · CO-21
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

    it('오버레이 id 컨텍스트를 래퍼에 부여 (article 스코프 CSS 재현)', () => {
        assert.match(src, /closest\('\[id\$="-overlay"\]'\)/); // 오버레이 조상 탐색
        assert.match(src, /wrap\.id = ovId/);                    // 래퍼 컨텍스트 — 단일 렌더라 wrap만 필요
    });

    it('빈 캔버스 감지 — 비백 픽셀 없으면 예외로 호출부 폴백 유도', () => {
        assert.match(src, /getImageData/);          // 캔버스 픽셀 샘플링
        assert.match(src, /BLANK_CANVAS/);          // 빈 렌더 판정 → 호출부 인쇄창 폴백
    });

    it('벤더 지연 로드 — ensurePdf() 선행 (미호출 시 즉시 크래시 회귀)', () => {
        assert.match(src, /pdfFileFromElStyled[\s\S]{0,300}await ensurePdf\(\)/); // 함수 선두에 벤더 로드
    });

    it('단일 캔버스 렌더 + 요소 경계 절단 — 표·그림 중간 절단 방지', () => {
        assert.match(src, /querySelectorAll\(_BLOCK_SEL\)/);     // 하위 블록 요소 경계 측정 (직계 자식뿐 아니라 tr·img·p 포함)
        assert.match(src, /closest\('td,th'\)/);                 // 셀 내부 제외 — 표는 행 경계까지만 절단
        assert.match(src, /_expandScrollClips/);                 // 세로 스크롤 클립 해제 — 잘린 행 누락 방지 (480px 표 래퍼)
        assert.match(src, /getBoundingClientRect/);              // 실측 위치
        assert.match(src, /availPx/);                            // 페이지 용량
        assert.match(src, /html2canvas\(wrap/);                  // 단일 1회 렌더 (견고 경로)
    });

    it('페이지 용량 초과 다이어그램 비례 축소 — 초대형 블록 고정 슬라이스 조각 방지', () => {
        assert.match(src, /querySelectorAll\('pre\.mermaid svg/);   // mermaid 대상 측정
        assert.match(src, /r\.height > availPx/);                   // 페이지 용량 초과 판정
        assert.match(src, /style\.width = `\$\{Math\.max\(1, Math\.round\(r\.width \* k\)\)\}px`/); // 비례 축소
        // 축소가 _blockCuts 경계 측정 이전에 실행돼야 경계가 축소 후 위치로 잡힘
        assert.ok(src.indexOf('r.height > availPx') < src.indexOf('_blockCuts(wrap, availPx)'));
    });

    it('화면 전용 컨트롤 클론 제거 — 다이어그램 확대 버튼이 PDF에 찍히지 않음', () => {
        assert.match(src, /querySelectorAll\('\.mermaid-expand-btn'\)/); // 클론 내 확대 버튼 탐색·제거
    });

    it('lazy 이미지 정착 대기 — 미로드 0높이 측정으로 절단선 어긋남 방지 (CO-21)', () => {
        assert.match(src, /_settleImages/);                                  // 정착 헬퍼
        assert.match(src, /removeAttribute\('loading'\)/);                   // lazy 해제 → 즉시 로드
        assert.match(src, /i\.decode\(\)/);                                  // 디코딩 완료 대기
        assert.match(src, /setTimeout\(r, 10000\)/);                         // 디코딩 상한 — 교착 방지
        // 정착이 경계 측정·스크롤 클립 해제 이전에 실행돼야 측정이 최종 레이아웃 기준
        assert.ok(src.indexOf('await _settleImages(wrap)') < src.indexOf('_expandScrollClips(wrap)'));
        assert.ok(src.indexOf('await _settleImages(wrap)') < src.indexOf('_blockCuts(wrap, availPx)'));
    });

    it('페이지 번호 스탬프 — 출력물 하단 N/total 표기', () => {
        assert.match(src, /_stampPageNumbers/);
        assert.match(src, /getNumberOfPages\(\)/);                           // 전체 페이지 수
        assert.match(src, /setPage\(p\)/);                                   // 페이지 재방문 스탬프
    });
});
