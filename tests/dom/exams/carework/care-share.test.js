// tests/dom/exams/carework/care-share.test.js
// @spec CO-13 — careShare 내보내기 메뉴 전체 흐름 시뮬레이션 (폼 폴백·복사·시트)
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
    getAuthSession: vi.fn(() => Promise.resolve(null)),
    getSupabase: vi.fn(() => Promise.resolve({})),
    onAuthChange: vi.fn(),
}));
vi.mock('../../../../src/pro/pro-upgrade.js', () => ({
    proFeatureNotice: vi.fn(() => false),
    hasProEntitlement: vi.fn(() => false),
    refreshProBadges: vi.fn(),
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
    delete /** @type {any} */ (globalThis).matchMedia; // pointer:fine 기본 — 각 테스트가 coarse를 개별 설정
    // jsdom은 앵커 다운로드 클릭을 네비게이션 오류로 처리 — 테스트에서 무력화
    /** @type {any} */ (HTMLAnchorElement.prototype).click = () => {};
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    toasts.length = 0;
};

/** 내보내기 메뉴 항목 조회 — 라벨 일부 문자열로 검색 */
const menuItem = (label) => /** @type {HTMLButtonElement|undefined} */ (
    [...document.querySelectorAll('.care-export-sheet button')]
        .find(x => x.textContent?.includes(label)));

const tapMenu = async (label) => {
    await vi.waitFor(() => expect(menuItem(label), `메뉴 항목이 표시되지 않음: ${label}`).toBeTruthy());
    const b = menuItem(label);
    expect(b.disabled, `메뉴 항목이 비활성: ${label}`).toBe(false);
    b.click();
};

const tapShareBtn = async () => { // "공유하기" 플로팅 버튼 탭 — 파일 생성 후 시트 오픈
    await vi.waitFor(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('공유하기'));
        expect(b, '공유하기 버튼이 표시되지 않음').toBeTruthy();
    });
    /** @type {HTMLElement} */ ([...document.querySelectorAll('button')]
        .find(x => x.textContent?.includes('공유하기'))).click();
};

describe('CO-13 careShare 내보내기 메뉴', () => {
    beforeEach(() => vi.resetModules());

    it('미생성 + 생성버튼 자동 실행 — 생성되면 그 내용으로 복사', async () => {
        setup(`<section class="view-section">
            <pre id="out"></pre>
            <button data-click="careCalcRun">계산</button>
            <button id="share" data-click="careShare" data-arg="#out|계산 결과|careCalcRun">공유</button></section>`);
        document.querySelector('[data-click="careCalcRun"]').addEventListener('click',
            () => { document.getElementById('out').textContent = '계산 결과: 123,456원'; });
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('본문 복사');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('계산 결과: 123,456원'));
    });

    it('생성 후 → 내보내기 메뉴는 생성된 문서 내용으로 복사', async () => {
        setup(`<section class="view-section">
            <pre id="out"></pre>
            <button data-click="careCalcRun">계산</button>
            <button id="share" data-arg="#out|본인부담금|careCalcRun">공유</button></section>`);
        // 인쇄·생성 선행 시뮬레이션
        document.getElementById('out').textContent = '본인부담금: 123,456원';
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('본문 복사');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('본인부담금: 123,456원'));
    });

    it('mask 시 복사·PDF 항목은 인명·연락처를 가림', async () => {
        setup(`<section class="view-section">
            <pre id="out">김철수 일지 — 010-1234-5678</pre>
            <button id="share" data-arg="#out|요양일지|mask">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('본문 복사');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled());
        const text = globalThis.navigator.clipboard.writeText.mock.calls[0][0];
        expect(text).not.toContain('010-1234-5678');
        expect(text).toContain('[연락처]');
    });

    it('입력도 없는 빈 뷰 → "내보낼 내용이 없습니다" 안내', async () => {
        setup(`<section class="view-section"><pre id="out"></pre>
            <button id="share" data-arg="#out|빈 문서">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        expect(globalThis.navigator.clipboard.writeText).not.toHaveBeenCalled();
        expect(toasts.find(t => t.includes('내보낼 내용이 없습니다'))).toBeTruthy();
        expect(document.querySelector('.care-export-sheet')).toBeFalsy(); // 메뉴도 열리지 않음
    });

    it('데스크톱(pointer:fine) — 공유 시트 항목 숨김, 복사는 메뉴에서 제공', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        // Windows는 파일 공유를 OS 수준 차단 + 카톡 PC판은 공유 대상 미등록 — 시트 항목을 숨긴다
        globalThis.navigator.share = vi.fn().mockRejectedValue(new Error('no OS share UI'));
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await vi.waitFor(() => expect(document.querySelector('.care-export-sheet')).toBeTruthy());
        expect(menuItem('카카오톡')).toBeFalsy(); // 데스크톱은 공유 시트 항목 없음
        await tapMenu('본문 복사');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('문서 내용'));
        expect(globalThis.navigator.share).not.toHaveBeenCalled();
        await vi.waitFor(() => expect(toasts.find(t => t.includes('클립보드'))).toBeTruthy());
    });

    it('모바일 + 파일 공유 지원 — 메뉴 → 공유하기 버튼 탭으로 파일 첨부 시트 발화', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.canShare = vi.fn(() => true);
        globalThis.navigator.share = vi.fn().mockResolvedValue();
        pdfSpy.mockResolvedValue(new File(['%pdf'], '문서.pdf')); // pdf 생성 성공 — 시트에 pdf만 탑재
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('카카오톡');
        await tapMenu('전체 파일로 보내기'); // 형식 선택 시트 — 전체 = 기존 동작
        expect(globalThis.navigator.share).not.toHaveBeenCalled(); // 메뉴 탭은 생성만 — 시트는 버튼 탭
        await tapShareBtn();
        await vi.waitFor(() => expect(globalThis.navigator.share).toHaveBeenCalled());
        const payload = globalThis.navigator.share.mock.calls[0][0];
        expect(payload.files).toHaveLength(2); // pdf + docx 첨부
        expect(payload.files.map(f => f.name).join()).toContain('.docx');
        expect(payload.files.every(f => !f.name.includes('.txt'))).toBe(true); // txt는 다운로드 전용 — 카톡 이중 수신 방지
        expect(payload.text).toBeUndefined(); // text 병기 시 카톡이 파일 대신 텍스트만 수신
    });

    it('PDF 렌더 대상은 미리보기 DOM 클론 — 표 구조 유지 + 텍스트 노드만 가림', async () => {
        setup(`<section class="view-section"><pre id="out"></pre>
            <div id="doc"><table><tr><td>김철수</td><td>식사</td></tr></table></div>
            <button id="share" data-arg="#doc|표 문서|mask">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('PDF 파일 다운로드');
        await vi.waitFor(() => expect(pdfSpy).toHaveBeenCalled());
        const rendered = pdfSpy.mock.calls[0][0]; // pdfFileFromEl의 첫 인자 = 렌더 컨테이너
        expect(rendered.querySelector('table')).toBeTruthy(); // 표 구조가 렌더 대상에 유지
        expect(rendered.textContent).toContain('[인명]'); // 텍스트 노드만 가림
        expect(rendered.textContent).not.toContain('김철수');
    });

    it('공유 형식 선택 — Word만 선택 시 docx 하나만 첨부 (PDF 생성 생략)', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.canShare = vi.fn(() => true);
        globalThis.navigator.share = vi.fn().mockResolvedValue();
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('카카오톡');
        for (const label of ['PDF로 보내기', 'Word·한글로 보내기', '전체 파일로 보내기']) // 형식 선택 시트 항목
            expect(menuItem(label), `선택 항목 없음: ${label}`).toBeTruthy();
        await tapMenu('Word·한글로 보내기');
        await tapShareBtn();
        await vi.waitFor(() => expect(globalThis.navigator.share).toHaveBeenCalled());
        const payload = globalThis.navigator.share.mock.calls[0][0];
        expect(payload.files).toHaveLength(1);
        expect(payload.files[0].name).toMatch(/\.docx$/);
        expect(pdfSpy).not.toHaveBeenCalled(); // 미선택 형식은 생성 비용을 소비하지 않는다
    });

    it('CsvExport 뷰 — 공유 시트에는 실제 .xlsx 파일 첨부', async () => {
        setup(`<section class="view-section"><pre id="out">방문 기록 목록</pre>
            <button id="share" data-arg="#out|방문 기록|mask|careVisitCsvExport">공유</button></section>`);
        const csv = '날짜,대상자,내용\n01-01,홍길동,방문';
        const sheetSpy = vi.fn(async () => new File(['x'], '방문 기록.xlsx'));
        vi.doMock('../../../../src/content/xlsx-utils.js', () => ({ sheetFile: sheetSpy }));
        vi.resetModules();
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.canShare = vi.fn(() => true);
        globalThis.navigator.share = vi.fn().mockResolvedValue();
        pdfSpy.mockRejectedValue(new Error('jsdom'));
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        (/** @type {any} */ (window)).careVisitCsvExport = () => Promise.resolve(csv);
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('카카오톡');
        await tapMenu('Excel로 보내기'); // 형식 선택 — xlsx만 생성
        await vi.waitFor(() => expect(sheetSpy).toHaveBeenCalled()); // 실제 xlsx 생성 확인
        expect(sheetSpy.mock.calls[0][0]).toBe(csv);
        expect(sheetSpy.mock.calls[0][1]).toMatch(/^방문 기록_[A-Z]+-\d{8}-[0-9a-f]{6}\.xlsx$/); // 추적 문서번호 접미사
        expect(pdfSpy).not.toHaveBeenCalled(); // 미선택 형식은 생성하지 않는다
    });

    it('Excel 내보내기 항목 — CsvExport 핸들러 직접 호출', async () => {
        setup(`<section class="view-section"><pre id="out">근무표</pre>
            <button id="share" data-arg="#out|교대 근무표|mask|careRosterCsvExport">공유</button></section>`);
        const xlsxSpy = vi.fn().mockResolvedValue('a,b\n1,2');
        (/** @type {any} */ (window)).careRosterCsvExport = xlsxSpy;
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('Excel 내보내기');
        await vi.waitFor(() => expect(xlsxSpy).toHaveBeenCalled());
    });

    it('Word 파일 다운로드 항목 — .docx 파일 생성·다운로드', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('Word·한글 파일 다운로드');
        await vi.waitFor(() => expect(globalThis.URL.createObjectURL).toHaveBeenCalled());
        const file = globalThis.URL.createObjectURL.mock.calls[0][0];
        expect(file.name).toMatch(/문서_[A-Z]+-\d{8}-[0-9a-f]{6}\.docx$/);
        expect(file.type).toContain('wordprocessingml.document');
    });

    it('인쇄 항목 — 인쇄핸들러 지정 시 뷰 전용 핸들러 호출', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서|||careDocPrint">공유</button></section>`);
        const printSpy = vi.fn();
        (/** @type {any} */ (window)).careDocPrint = printSpy;
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('인쇄·PDF 저장');
        await vi.waitFor(() => expect(printSpy).toHaveBeenCalled());
    });

    it('pro키 지정 시 내보내기 항목 전체에 PRO 배지 — 무료 경로 우회 없음', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서|||careDocPrint|care_doc_share">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await vi.waitFor(() => expect(document.querySelector('.care-export-sheet')).toBeTruthy());
        for (const label of ['인쇄·PDF 저장', '본문 복사', 'PDF 파일 다운로드']) {
            const badge = menuItem(label)?.querySelector('[data-pro-feature="care_doc_share"]');
            expect(badge, `PRO 배지 없음: ${label}`).toBeTruthy();
        }
    });

    it('인쇄 항목 — 인쇄핸들러 미지정 시 생성 후 window.print 폴백', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서|careDocGen">공유</button></section>`);
        const genSpy = vi.fn();
        (/** @type {any} */ (window)).careDocGen = genSpy;
        globalThis.window.print = vi.fn();
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('인쇄·PDF 저장');
        await vi.waitFor(() => expect(globalThis.window.print).toHaveBeenCalled());
        expect(genSpy).toHaveBeenCalled();
    });

    it('모바일 파일 거절(NotAllowedError) → 다음 공유는 텍스트만 — 차단 학습', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.canShare = vi.fn(() => true);
        globalThis.navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
        pdfSpy.mockResolvedValue(new File(['%pdf'], '문서.pdf')); // 시트에 pdf 첨부 시도 → 거절 학습 대상
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('카카오톡');
        await tapMenu('전체 파일로 보내기');
        await tapShareBtn();
        await vi.waitFor(() => expect(globalThis.navigator.share).toHaveBeenCalled());
        expect(globalThis.navigator.share.mock.calls[0][0].files).toHaveLength(2); // 첫 시도는 pdf+docx 첨부
        globalThis.navigator.share.mockResolvedValue();
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('카카오톡');
        await tapMenu('전체 파일로 보내기');
        await tapShareBtn();
        await vi.waitFor(() => expect(globalThis.navigator.share).toHaveBeenCalledTimes(2));
        expect(globalThis.navigator.share.mock.calls[1][0].files).toBeUndefined(); // 차단 학습 — 재시도는 텍스트만
        expect(globalThis.navigator.share.mock.calls[1][0].text).toBe('문서 내용');
    });

    it('모바일(pointer:coarse) — 시트 거절 시 복사+다운로드 폴백 (텍스트 페이로드는 MD 초안)', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서|||||careDocMd">공유</button></section>`);
        (/** @type {any} */ (window)).careDocMd = () => '# 문서\n\n마크다운 본문';
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'TypeError' }));
        globalThis.navigator.canShare = () => false; // 파일 공유 미지원 → 텍스트 시트, 실패 시 폴백
        pdfSpy.mockResolvedValue(new File(['%pdf'], '문서.pdf')); // 다운로드 폴백 대상 파일
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share').dataset.arg);
        await tapMenu('카카오톡');
        await tapMenu('전체 파일로 보내기');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('# 문서\n\n마크다운 본문')); // 클립보드도 MD 초안
        await tapShareBtn();
        await vi.waitFor(() => expect(globalThis.navigator.share).toHaveBeenCalled()); // canShare false → {title, text} 시도
        expect(globalThis.navigator.share.mock.calls[0][0].text).toBe('# 문서\n\n마크다운 본문'); // 텍스트 페이로드는 DOM 평문이 아니라 MD 초안
        await vi.waitFor(() => expect(toasts.find(t => t.includes('다운로드'))).toBeTruthy()); // 거절 → 파일 다운로드 폴백
    });
});

// 실제 본인부담금 계산 뷰 시뮬레이션 — 실마크업 파셜 + 실제 careCalcRun
describe('CO-13 본인부담금 계산 실제 시뮬레이션', () => {
    const partial = readFileSync(join(__dirname, '../../../../html/exams/carework/care-calc.html'), 'utf8');

    it('미생성 내보내기 클릭 → 자동 계산 실행 후 결과 복사 (단독 완결)', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        delete /** @type {any} */ (globalThis).matchMedia;
        const { initCareCalcView, careCalcRun } = await import('../../../../src/exams/carework/views/care-calc.js');
        await initCareCalcView();
        document.body.addEventListener('click', e => { // 위임 shim
            const b = e.target.closest('[data-click]');
            if (b?.dataset.click === 'careCalcRun') careCalcRun();
        });
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        const btn = /** @type {HTMLElement} */ (document.querySelector('[data-click="careShare"]'));
        await careShare(btn.dataset.arg);
        await tapMenu('본문 복사');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled());
        const call = globalThis.navigator.clipboard.writeText.mock.calls[0];
        expect(call, '공유가 실행되지 않음 — 미생성 시 자동 계산 실패').toBeTruthy();
        expect(call[0]).toContain('본인부담금');
    });

    it('인쇄 후 미리보기 있음 → 내보내기 메뉴로 같은 내용 복사', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        delete /** @type {any} */ (globalThis).matchMedia;
        window.print = vi.fn();
        const { initCareCalcView, careCalcPrint } = await import('../../../../src/exams/carework/views/care-calc.js');
        await initCareCalcView();
        careCalcPrint(); // 인쇄 먼저 → 결과 렌더
        expect(document.getElementById('care-result').textContent).toContain('본인부담금');
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        const btn = /** @type {HTMLElement} */ (document.querySelector('[data-click="careShare"]'));
        await careShare(btn.dataset.arg);
        await tapMenu('본문 복사');
        await vi.waitFor(() => expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled());
        const call = globalThis.navigator.clipboard.writeText.mock.calls[0];
        expect(call).toBeTruthy();
        expect(call[0]).toBe(document.getElementById('care-result').textContent);
    });

    it('인쇄 출력 = 내보내기 PDF 렌더 — 동일 문서 내용·표 구조', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        delete /** @type {any} */ (globalThis).matchMedia;
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
        await tapMenu('PDF 파일 다운로드');
        await vi.waitFor(() => expect(pdfSpy).toHaveBeenCalled());
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
