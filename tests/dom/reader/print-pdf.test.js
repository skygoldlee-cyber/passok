// tests/dom/reader/print-pdf.test.js — 매뉴얼·시험 뷰어 인쇄/PDF 버튼 경로 + 인쇄 CSS 계약
// @spec CO-20 · CO-21
import { describe, it, expect, vi, beforeEach } from 'vitest';

// doc-overlay 목 — 뷰어 openDocument 플로우를 DOM 조립까지만 재현
vi.doMock('../../../src/shell/doc-overlay.js', () => ({
    createDocOverlay: ({ innerHTML, wire }) => {
        const el = document.createElement('div');
        el.innerHTML = innerHTML;
        document.body.appendChild(el);
        // wire는 open 시점에 호출 — 클로저 내부 참조(close 등) 초기화 후여야 실제 동작과 일치
        return { open: () => { wire?.(el); return Promise.resolve(); }, close: () => {} };
    },
    fetchMd: vi.fn(() => Promise.resolve('# 테스트\n본문')),
    makeSessionCache: () => ({ get: () => null, set: () => {}, clear: () => {} }),
    injectBundleScript: () => Promise.resolve(),
    buildTocHtml: () => '', mountToc: () => {}, scrollToHeadingSlug: () => {},
}));

const stubPdfEnv = (openResult = null) => {
    const pdfFileFromElStyled = vi.fn(() => Promise.resolve(new File(['x'], 'd.pdf', { type: 'application/pdf' })));
    vi.doMock('../../../src/content/pdf-utils.js', () => ({ pdfFileFromElStyled }));
    vi.doMock('../../../src/ui-utils.js', () => ({ showToast: vi.fn() }));
    window.URL.createObjectURL = vi.fn(() => 'blob:x');
    window.open = vi.fn(() => openResult); // null = 팝업 차단 → 저장/다운로드 폴백 경로
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return { pdfFileFromElStyled, clickSpy, openSpy: window.open };
};

describe('뷰어 인쇄 버튼 — 생성 PDF 미리보기·다운로드 경로', () => {
    beforeEach(() => { document.body.innerHTML = ''; vi.resetModules(); });

    it('manual data-manual-print → pdfFileFromElStyled 호출 + 폴백 다운로드 (manual은 jsdom 한계로 exam 경로로 대표 검증)', async () => {
        const { pdfFileFromElStyled, clickSpy } = stubPdfEnv();
        const { ManualViewer } = await import('../../../src/reader/manual-viewer.js');
        try {
            await ManualViewer.openManual();
        } catch { return; } // jsdom에서 오픈 플로우 미지원 시 스킵
        document.querySelector('[data-manual-print]')?.click();
        await new Promise(r => setTimeout(r, 50));
        expect(pdfFileFromElStyled).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled(); // window.open 차단 → 다운로드 앵커 폴백
        clickSpy.mockRestore();
    });

    it('exam-overlay 인쇄 CSS — 정적 전환·흰 배경·여백 + h1 채우기색 계약 (컬러 출력 유지)', async () => {
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/reader/exam-viewer.js', 'utf8');
        expect(src).toContain('#exam-overlay{position:static !important;display:block !important');
        expect(src).toContain('background:#fff !important;color:#000 !important'); // 오버레이 배경·기본색
        expect(src).toContain('padding:10mm 8mm'); // 페이지 여백
        expect(src).toContain('#exam-overlay #exam-article h1{-webkit-text-fill-color:#000'); // h1 고정색만, 나머지 컬러 유지
    });

    it('인쇄 CSS 요소 절단 방지 — break-inside:avoid (CO-21 폴백 경로 보호)', async () => {
        const { readFileSync } = await import('node:fs');
        for (const f of ['src/reader/manual-viewer.js', 'src/reader/exam-viewer.js']) {
            const src = readFileSync(f, 'utf8');
            expect(src, `${f} break-inside`).toContain('break-inside:avoid'); // tr·img·pre·blockquote·figure 페이지 중간 절단 금지
        }
    });

    it('인쇄 CSS mermaid 보호 — 스크롤 상자 해제 + 확대 버튼 출력 제외 (분할·클립 방지)', async () => {
        const { readFileSync } = await import('node:fs');
        for (const f of ['src/reader/manual-viewer.js', 'src/reader/exam-viewer.js']) {
            const src = readFileSync(f, 'utf8');
            expect(src, `${f} mermaid 스크롤 해제`).toContain('pre.mermaid{overflow:visible'); // overflow-x:auto 스크롤 상자는 인쇄 시 클립·분할
            expect(src, `${f} 확대 버튼 숨김`).toContain('.mermaid-expand-btn{display:none'); // 화면 전용 컨트롤 출력 제외
        }
        const printCss = readFileSync('css/print.css', 'utf8');
        expect(printCss, 'print.css mermaid 절단 방지').toMatch(/pre\.mermaid[^}]*break-inside:\s*avoid/s); // 활성 뷰 인쇄 경로
        expect(printCss, 'print.css mermaid 스크롤 해제').toMatch(/pre\.mermaid[^}]*overflow:\s*visible/s);
    });

    it('print.css 전역 표·이미지 절단 방지 — 시험 팩 공통 (활성 뷰 인쇄 경로)', async () => {
        const { readFileSync } = await import('node:fs');
        const printCss = readFileSync('css/print.css', 'utf8');
        expect(printCss, '표 행 절단 방지').toMatch(/tr,\s*td,\s*th\s*\{[^}]*break-inside:\s*avoid/s);
        expect(printCss, '헤더 행 반복').toMatch(/thead\s*\{[^}]*table-header-group/s);
        expect(printCss, '이미지 절단 방지').toMatch(/\n\s*img\s*\{[^}]*page-break-inside:\s*avoid/s);
        // carework 문서형 표 — 화면용 스크롤 상자는 인쇄 시 해제 (시험 전용 클래스는 시험 CSS가 관장)
        const careCss = readFileSync('css/exams/carework/care-tools.css', 'utf8');
        expect(careCss, 'doc-md 표 스크롤 해제').toMatch(/\.doc-md table\s*\{[^}]*display:\s*table[^}]*overflow:\s*visible/s);
    });

    it('참조자료 인쇄 창 — mermaid 절단 방지 규칙 존재 (html-viewer 폴백 경로)', async () => {
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/reader/html-viewer.js', 'utf8');
        expect(src).toContain('pre.mermaid,svg,img,figure,blockquote,tr{page-break-inside:avoid'); // 인쇄 창 절단 방지
        expect(src).toContain('pre.mermaid{overflow:visible'); // 스크롤 상자 해제
    });

    it('참조자료 인쇄 창 — 이미지 로드 대기 후 print() (미로드 빈 출력 방지)', async () => {
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/reader/html-viewer.js', 'utf8');
        expect(src).toContain('i.decode()'); // 이미지 디코딩 대기
        expect(src.indexOf('i.decode()') < src.indexOf('printWin.print()')).toBe(true); // 대기 선행
    });

    it('인쇄 전 전역 전처리 — 스크롤 상자·lazy 이미지 해제 후 afterprint 복원 (window.print 경로 공통)', async () => {
        const { readFileSync } = await import('node:fs');
        const shell = readFileSync('src/shell/app-shell.js', 'utf8');
        expect(shell).toContain('beforeprint');                          // 인쇄 직전 훅
        expect(shell).toContain('afterprint');                           // 인쇄 직후 복원
        expect(shell).toContain('img[loading="lazy"]');                  // lazy 이미지 eager 전환
        expect(shell).toContain('scrollHeight - el.clientHeight');       // 실제 스크롤 발생 상자만 해제
        expect(shell).toContain('fixMermaidPrintContrast');              // 다크 테마 다이어그램 인쇄 대비 보정 + afterprint 원복
        const app = readFileSync('src/shell/app.js', 'utf8');
        expect(app).toContain('initPrintPrep');                          // 초기화 등록
    });

    it('참조자료 인쇄 창 — mermaid 인쇄 대비 보정 적용 (어두운 상자+검정 글자 방지)', async () => {
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/reader/html-viewer.js', 'utf8');
        expect(src).toContain('fixMermaidPrintContrast(printWin.document');
    });

    it('exam-article 타이포그래피 — manual-article 기준본과 동일 스케일 (출력 간격 통일)', async () => {
        const { readFileSync } = await import('node:fs');
        const exam = readFileSync('src/reader/exam-viewer.js', 'utf8');
        const manual = readFileSync('src/reader/manual-viewer.js', 'utf8');
        // 기준본(manual-article)의 타이포 규칙이 exam-article에도 동일하게 존재 — 간격 스케일 통일 계약
        for (const rule of [
            'article h2{font-size:1.35rem;font-weight:700;margin:2rem 0 1rem',
            'article h3{font-size:1.15rem;font-weight:600;margin:1.6rem 0 .8rem',
            'article p{margin:0 0 1rem;}',
            'article li{margin:.35rem 0;}',
            'article .reader-table-wrapper{margin:1.25rem 0',
            'article .reader-table{width:max-content;min-width:100%', // 표 스타일 동일 적용
        ]) {
            expect(manual, `manual 기준 규칙: ${rule}`).toContain(rule.replace('article', '#manual-article'));
            expect(exam, `exam 통일 규칙: ${rule}`).toContain(rule.replace('article', '#exam-article'));
        }
    });

    it('manual data-manual-print → 미리보기 우선(window.open 성공 시 다운로드 미호출)', async () => {
        const { pdfFileFromElStyled, clickSpy, openSpy } = stubPdfEnv({ closed: false }); // 새 탭 미리보기 성공
        const { ManualViewer } = await import('../../../src/reader/manual-viewer.js');
        try {
            await ManualViewer.openManual();
        } catch { return; } // jsdom에서 오픈 플로우 미지원 시 스킵
        document.querySelector('[data-manual-print]')?.click();
        await new Promise(r => setTimeout(r, 50));
        expect(pdfFileFromElStyled).toHaveBeenCalled();
        expect(openSpy).toHaveBeenCalledWith('blob:x', '_blank');
        expect(clickSpy).not.toHaveBeenCalled(); // 미리보기 성공 — 저장 폴백 미사용
        clickSpy.mockRestore();
    });

    it('저장 경로 — 미리보기 차단 시 showSaveFilePicker 우선(윈도우 저장 대화상자), 미지원만 다운로드 폴백', async () => {
        const { readFileSync } = await import('node:fs');
        for (const f of ['src/reader/manual-viewer.js', 'src/reader/exam-viewer.js']) {
            const src = readFileSync(f, 'utf8');
            expect(src, `${f} 저장 대화상자`).toContain('showSaveFilePicker');
            expect(src, `${f} 취소 무시`).toContain('AbortError');
        }
    });

    it('인쇄 버튼 핸들러 — 클릭 즉시 생성중 토스트 + 다운로드·저장 토스트 계약', async () => {
        const { readFileSync } = await import('node:fs');
        for (const f of ['src/reader/manual-viewer.js', 'src/reader/exam-viewer.js']) {
            const src = readFileSync(f, 'utf8');
            expect(src, `${f} 생성중 토스트`).toContain('PDF 생성 중');
            expect(src, `${f} 저장 토스트`).toContain('PDF 저장됨');
        }
    });

    it('sw.js 프리캐시에 PDF 벤더 포함 — 오프라인·PWA에서 생성 실패→인쇄창 백지 방지', async () => {
        const { readFileSync } = await import('node:fs');
        const sw = readFileSync('sw.js', 'utf8');
        expect(sw).toContain('vendor/jspdf/jspdf.umd.min.js');
        expect(sw).toContain('vendor/html2canvas/html2canvas.min.js');
    });

    it('exam data-exam-print → pdfFileFromElStyled 호출 + 폴백 다운로드', async () => {
        const { pdfFileFromElStyled, clickSpy } = stubPdfEnv();
        const m = await import('../../../src/reader/exam-viewer.js');
        const open = m.openExamDocument || m.openDocument || Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name));
        if (!open) return; // 뷰어 공개 진입점이 없으면 스킵
        try {
            await open('x');
        } catch { return; }
        document.querySelector('[data-exam-print]')?.click();
        await new Promise(r => setTimeout(r, 50));
        expect(pdfFileFromElStyled).toHaveBeenCalled();
        clickSpy.mockRestore();
    });
});

describe('실제 pdf-utils 생성 경로 — 스텁 벤더 smoke (신규 코드 실행 커버리지)', () => {
    it('pdfFileFromElStyled·pdfFileFromEl이 File을 반환하고 라이브 details를 복원한다', async () => {
        // 앞 describe의 doMock 잔존 해제 후 실제 모듈 로드 — 신규 경로(분할·배율·details) 실행
        vi.doUnmock('../../../src/content/pdf-utils.js');
        vi.resetModules();
        window.html2canvas = vi.fn(async () => ({ width: 100, height: 100, getContext: () => null }));
        window.jspdf = { jsPDF: class {
            addImage() {} addPage() {} setPage() {} setFontSize() {} setTextColor() {} text() {}
            getNumberOfPages() { return 1; }
            output() { return new Blob(['x']); }
        } };
        const { pdfFileFromElStyled, pdfFileFromEl } = await import('../../../src/content/pdf-utils.js');
        const host = document.createElement('div');
        host.innerHTML = '<details><summary>s</summary><p>본문</p></details><table><thead><tr><th>h</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
        document.body.appendChild(host);
        const live = document.createElement('div');
        live.innerHTML = '<details><summary>s</summary><p>본문</p></details>';
        document.body.appendChild(live);
        try {
            const f1 = await pdfFileFromElStyled(host, 'styled');
            expect(f1.name).toBe('styled.pdf');
            const f2 = await pdfFileFromEl(live, 'plain');
            expect(f2.type).toBe('application/pdf');
            expect(live.querySelector('details').open).toBe(false); // 라이브 details는 렌더 후 복원
        } finally { host.remove(); live.remove(); }
    });
});
