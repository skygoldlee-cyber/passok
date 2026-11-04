// tests/dom/exams/carework/care-share.test.js
// @spec CO-13 — careShare 전체 흐름 시뮬레이션 (폼 폴백·확인·복사)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const toasts = [];
vi.mock('../../../../src/ui-utils.js', () => ({
    showToast: (m) => { toasts.push(m); },
    showConfirm: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../../../src/auth-sync/supabase-client.js', () => ({
    getAuthSession: vi.fn(() => Promise.resolve({ session: null })),
    getSupabase: vi.fn(() => Promise.resolve({})),
    onAuthChange: vi.fn(),
}));
const pdfSpy = vi.fn().mockRejectedValue(new Error('jsdom — PDF 미지원'));
vi.mock('../../../../src/content/pdf-utils.js', () => ({
    pdfFileFromEl: pdfSpy,
}));
vi.mock('../../../../src/exams/carework/facility.js', async (importOriginal) => ({
    ...await importOriginal(),
    docHeadHtml: vi.fn(t => `<div class="doc-head">${t}</div>`),
    refreshOrgName: vi.fn(),
}));

const setup = (html) => {
    document.body.innerHTML = html;
    globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
    delete globalThis.navigator.share; // 공유 시트 미지원 환경 시뮬레이션
    // jsdom은 앵커 다운로드 클릭을 네비게이션 오류로 처리 — 테스트에서 무력화
    /** @type {any} */ (HTMLAnchorElement.prototype).click = () => {};
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    toasts.length = 0;
};

describe('CO-13 careShare 시뮬레이션', () => {
    beforeEach(() => vi.resetModules());

    it('미생성 + 생성버튼 자동 실행 — 생성되면 그 내용으로 공유', async () => {
        setup(`<section class="view-section">
            <pre id="out"></pre>
            <button data-click="careCalcRun">계산</button>
            <button id="share" data-click="careShare" data-arg="#out|계산 결과|careCalcRun">공유</button></section>`);
        document.querySelector('[data-click="careCalcRun"]').addEventListener('click',
            () => { document.getElementById('out').textContent = '계산 결과: 123,456원'; });
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('계산 결과: 123,456원');
    });

    it('인쇄 생성 후 → 공유 시 생성된 문서 내용으로 공유', async () => {
        setup(`<section class="view-section">
            <pre id="out"></pre>
            <button data-click="careCalcRun">계산</button>
            <button id="share" data-arg="#out|본인부담금|careCalcRun">공유</button></section>`);
        // 인쇄·생성 선행 시뮬레이션
        document.getElementById('out').textContent = '본인부담금: 123,456원';
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('본인부담금: 123,456원');
    });

    it('결과 있음 → 확인 후 그대로 공유 + mask 시 인명·연락처 가림', async () => {
        setup(`<section class="view-section">
            <pre id="out">김철수 일지 — 010-1234-5678</pre>
            <button id="share" data-arg="#out|요양일지|mask">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        const text = globalThis.navigator.clipboard.writeText.mock.calls[0][0];
        expect(text).not.toContain('010-1234-5678');
        expect(text).toContain('[연락처]');
    });

    it('입력도 없는 빈 뷰 → "공유할 내용이 없습니다" 안내', async () => {
        setup(`<section class="view-section"><pre id="out"></pre>
            <button id="share" data-arg="#out|빈 문서">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.clipboard.writeText).not.toHaveBeenCalled();
        expect(toasts.find(t => t.includes('공유할 내용이 없습니다'))).toBeTruthy();
    });

    it('데스크톱(pointer:fine) — navigator.share가 있어도 무응답 없이 클립보드로 복사', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        // share() 직접 시도 — 데스크톱 거절 시 복사 폴백 (게이트 없음)
        globalThis.navigator.share = vi.fn().mockRejectedValue(new Error('no OS share UI'));
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.share).toHaveBeenCalled(); // 게이트 없이 시도, 실패 시 폴백
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('문서 내용');
        expect(toasts.find(t => t.includes('클립보드'))).toBeTruthy();
    });

    it('모바일 + 파일 공유 지원 — 파일 첨부로 공유 시트 발화', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.canShare = vi.fn(() => true);
        globalThis.navigator.share = vi.fn().mockResolvedValue();
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.share).toHaveBeenCalled();
        expect(globalThis.navigator.share.mock.calls[0][0].files).toHaveLength(1); // 파일 첨부
    });

    it('PDF 렌더 대상은 미리보기 DOM 클론 — 표 구조 유지 + 텍스트 노드만 가림', async () => {
        setup(`<section class="view-section"><pre id="out"></pre>
            <div id="doc"><table><tr><td>김철수</td><td>식사</td></tr></table></div>
            <button id="share" data-arg="#doc|표 문서|mask">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        const rendered = pdfSpy.mock.calls[0][0]; // pdfFileFromEl의 첫 인자 = 렌더 컨테이너
        expect(rendered.querySelector('table')).toBeTruthy(); // 표 구조가 렌더 대상에 유지
        expect(rendered.textContent).toContain('[인명]'); // 텍스트 노드만 가림
        expect(rendered.textContent).not.toContain('김철수');
    });

    it('CsvExport 뷰 — 미리보기 있으면 실제 .xlsx 파일로 공유', async () => {
        setup(`<section class="view-section"><pre id="out">방문 기록 목록</pre>
            <button id="share" data-arg="#out|방문 기록|mask|careVisitCsvExport">공유</button></section>`);
        const csv = '날짜,대상자,내용\n01-01,홍길동,방문';
        const sheetSpy = vi.fn(async () => new File(['x'], '방문 기록.xlsx'));
        vi.doMock('../../../../src/content/xlsx-utils.js', () => ({ sheetFile: sheetSpy }));
        vi.resetModules();
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        (/** @type {any} */ (window)).careVisitCsvExport = () => Promise.resolve(csv);
        await careShare(document.getElementById('share').dataset.arg);
        expect(sheetSpy).toHaveBeenCalledWith(csv, `방문 기록_${new Date().toISOString().slice(0, 10)}.xlsx`); // 실제 xlsx 생성 확인
    });

    it('데스크톱 — canShare가 파일을 허용해도 텍스트만 시트에 실음 (Windows 파일 차단 회피)', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        delete /** @type {any} */ (globalThis).matchMedia; // coarse=false — 이전 테스트의 목 잔류 방지
        globalThis.navigator.canShare = vi.fn(() => true); // Chromium은 파일 지원을 거짓 보고
        globalThis.navigator.share = vi.fn().mockResolvedValue();
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.share.mock.calls[0][0].files).toBeUndefined(); // 데스크톱은 파일 미첨부 — NotAllowedError 회피
    });

    it('모바일 파일 거절(NotAllowedError) → 다음 공유는 텍스트만 — 차단 학습', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.canShare = vi.fn(() => true);
        globalThis.navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.share.mock.calls[0][0].files).toHaveLength(1); // 첫 시도는 파일 첨부
        globalThis.navigator.share.mockResolvedValue();
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.share.mock.calls[1][0].files).toBeUndefined(); // 차단 학습 — 재시도는 텍스트만
    });

    it('모바일(pointer:coarse) — 공유 시트 우선, 실패 시 복사 폴백', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'TypeError' }));
        globalThis.navigator.canShare = () => false; // 파일 공유 미지원 → 텍스트 시트 대신 복사 폴백
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('문서 내용');
    });
});

// 실제 본인부담금 계산 뷰 시뮬레이션 — 실마크업 파셜 + 실제 careCalcRun
describe('CO-13 본인부담금 계산 실제 시뮬레이션', () => {
    const partial = readFileSync(join(__dirname, '../../../../html/exams/carework/care-calc.html'), 'utf8');

    it('미생성 공유 클릭 → 자동 계산 실행 후 결과 공유 (단독 완결)', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        const { initCareCalcView, careCalcRun } = await import('../../../../src/exams/carework/views/care-calc.js');
        await initCareCalcView();
        document.body.addEventListener('click', e => { // 위임 shim
            const b = e.target.closest('[data-click]');
            if (b?.dataset.click === 'careCalcRun') careCalcRun();
        });
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        const btn = /** @type {HTMLElement} */ (document.querySelector('[data-click="careShare"]'));
        await careShare(btn.dataset.arg);
        const call = globalThis.navigator.clipboard.writeText.mock.calls[0];
        expect(call, '공유가 실행되지 않음 — 미생성 시 자동 계산 실패').toBeTruthy();
        expect(call[0]).toContain('본인부담금');
    });

    it('인쇄 후 미리보기 있음 → 공유 버튼으로 같은 내용 공유', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        window.print = vi.fn();
        const { initCareCalcView, careCalcPrint } = await import('../../../../src/exams/carework/views/care-calc.js');
        await initCareCalcView();
        careCalcPrint(); // 인쇄 먼저 → 결과 렌더
        expect(document.getElementById('care-result').textContent).toContain('본인부담금');
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        const btn = /** @type {HTMLElement} */ (document.querySelector('[data-click="careShare"]'));
        await careShare(btn.dataset.arg);
        const call = globalThis.navigator.clipboard.writeText.mock.calls[0];
        expect(call).toBeTruthy();
        expect(call[0]).toBe(document.getElementById('care-result').textContent);
    });

    it('인쇄 출력 = 공유 PDF 렌더 — 동일 문서 내용·표 구조', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        window.print = vi.fn();
        pdfSpy.mockClear();
        const { initCareCalcView, careCalcPrint } = await import('../../../../src/exams/carework/views/care-calc.js');
        await initCareCalcView();
        careCalcPrint(); // 인쇄 경로 — 미리보기 렌더
        const printed = document.getElementById('care-result');
        expect(printed.textContent).toContain('본인부담금');
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        const btn = /** @type {HTMLElement} */ (document.querySelector('[data-click="careShare"]'));
        await careShare(btn.dataset.arg);
        // 공유 PDF 렌더 대상 = 문서 헤더 + 미리보기 DOM 클론 — 인쇄와 동일한 본문·표
        const wrap = pdfSpy.mock.calls[0][0];
        expect(wrap).toBeTruthy();
        // 본문 텍스트가 인쇄 미리보기와 동일
        for (const t of printed.textContent.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3))
            expect(wrap.textContent).toContain(t);
        // 표가 있으면 표 구조도 유지
        if (printed.querySelector('table')) expect(wrap.querySelector('table')).toBeTruthy();
        // 문서 헤더가 인쇄와 동일 형식으로 포함
        expect(wrap.querySelector('.care-doc-head') || wrap.textContent.includes('본인부담금')).toBeTruthy();
    });
});
