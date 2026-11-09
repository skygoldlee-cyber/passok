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
        // 축소가 경계 측정 이전에 실행돼야 경계가 축소 후 위치로 잡힘
        assert.ok(src.indexOf('r.height > availPx') < src.indexOf('_cutsWithTableSplit(wrap, availPx)'));
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
        assert.ok(src.indexOf('await _settleImages(wrap)') < src.indexOf('_cutsWithTableSplit(wrap, availPx)'));
    });

    it('페이지 번호 스탬프 — 출력물 하단 N/total 표기', () => {
        assert.match(src, /_stampPageNumbers/);
        assert.match(src, /getNumberOfPages\(\)/);                           // 전체 페이지 수
        assert.match(src, /setPage\(p\)/);                                   // 페이지 재방문 스탬프
    });

    it('표 헤더 반복 — 경계를 넘는 표를 thead 복제로 분할 (CO-21)', () => {
        assert.match(src, /_cutsWithTableSplit/);                            // 분할+수렴 헬퍼
        assert.match(src, /thead\.cloneNode\(true\)/);                       // thead 복제
        assert.match(src, /COLGROUP/);                                       // 열 너비 보존
        // 양쪽 생성 경로에 적용
        assert.match(src, /pdfFileFromEl[\s\S]*_cutsWithTableSplit\(el, availPx\)/);
        assert.match(src, /_cutsWithTableSplit\(wrap, availPx\)/);
    });

    it('캔버스 높이 상한 대응 — 초장문서 배율 하향 (백지 렌더 방지)', () => {
        assert.match(src, /_CANVAS_MAX\s*=\s*32000/);                        // Chrome ~32767px 안전선
        assert.match(src, /_fitCanvasScale/);                                // 배율 산출 헬퍼
        assert.match(src, /html2canvas\(wrap, \{ scale/);                    // 고정 2 아닌 적응 배율
    });

    it('mermaid 인쇄 대비 — 화면 색상 유지(WYSIWYG 하이브리드) + 미렌더 보정 (CO-20)', () => {
        assert.match(src, /export function fixMermaidPrintContrast/);          // 공용 보정 헬퍼
        // WYSIWYG 계약 — 렌더된 다이어그램은 색 변경 없이 print-color-adjust만 부여
        assert.match(src, /'print-color-adjust', 'exact'/);                  // 브라우저 인쇄 배경 유지
        assert.match(src, /pre\.querySelector\('svg'\)\) return/);           // 렌더 완료 블록은 화면 그대로
        // 미렌더 블록(원문 코드)만 백지 보정 — 밝은 글자가 묻히는 결함 방지
        assert.match(src, /'color', '#000'/);                                // 밝은 원문 글자 → 검정
        assert.match(src, /'background', 'transparent'/);                    // 어두운 배경 제거
        // 보정 계약 — reader-mermaid.css의 전 규칙이 !important라 우선순위 없는
        // 인라인 스타일은 실제 다이어그램에서 패배한다. 반드시 'important'로 적용.
        assert.match(src, /setProperty\(prop, val, 'important'\)/);          // 인라인 !important 적용
        assert.match(src, /getPropertyPriority\(prop\)/);                    // 원복 시 우선순위 보존
        // styled 워크는 mermaid 서브트리를 건너뛰어 화면 색상을 유지
        assert.match(src, /el2\.closest\('pre\.mermaid'\)\) return/);        // 워크 스킵 — 화면 색상 유지
        // PDF 생성 양 경로 + 라이브 복원
        assert.match(src, /fixMermaidPrintContrast\(wrap\)/);                // styled 클론
        assert.match(src, /undoMermaid = fixMermaidPrintContrast\(el\)/);    // plain 라이브
        assert.match(src, /undoMermaid\.forEach\(u => u\(\)\)/);             // 라이브 원복
    });

    it('details 펼침 — 접힌 내용도 출력물에 포함', () => {
        assert.match(src, /details:not\(\[open\]\)/);                        // 닫힌 details 수집
        assert.match(src, /\.open = true/);                                  // 클론·렌더 전 펼침
    });
});
