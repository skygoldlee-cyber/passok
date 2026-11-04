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
vi.mock('../../../../src/exams/carework/facility.js', async (importOriginal) => ({
    ...await importOriginal(),
    docHeadHtml: vi.fn(t => `<div class="doc-head">${t}</div>`),
    refreshOrgName: vi.fn(),
}));

const setup = (html) => {
    document.body.innerHTML = html;
    globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
    delete globalThis.navigator.share; // 공유 시트 미지원 환경 시뮬레이션
    toasts.length = 0;
};

describe('CO-13 careShare 시뮬레이션', () => {
    beforeEach(() => vi.resetModules());

    it('미생성 + 생성버튼 자동 실행 — 생성되면 그 내용으로 공유', async () => {
        setup(`<section class="view-section">
            <pre id="out"></pre>
            <button data-click="careCalcRun">계산</button>
            <button id="share" data-click="careShare" data-arg="#out|계산 결과|careCalcRun">공유</button></section>`);
        // 계산 핸들러 시뮬레이션 — 클릭 시 결과 채움
        document.querySelector('[data-click="careCalcRun"]').addEventListener('click',
            () => { document.getElementById('out').textContent = '계산 결과: 123,456원'; });
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('계산 결과: 123,456원');
    });

    it('미생성 + 생성도 비어있음 → 폼 입력값이 양식 텍스트로 공유', async () => {
        setup(`<section class="view-section">
            <pre id="out"></pre>
            <label>장기요양등급 <select id="g"><option>1등급</option><option selected>2등급</option></select></label>
            <label>월 이용액 <input id="u" value="1000000"></label>
            <button id="share" data-arg="#out|본인부담금|careCalcRun">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        const text = globalThis.navigator.clipboard.writeText.mock.calls[0][0];
        expect(text).toContain('장기요양등급');
        expect(text).toContain('1000000');
        expect(toasts.find(t => t.includes('생성'))).toBeUndefined(); // "먼저 생성" 토스트 없음
    });

    it('결과 있음 → 확인 후 그대로 공유 + mask 시 인명·연락처 가림', async () => {
        setup(`<section class="view-section">
            <pre id="out">김철수 일지 — 010-1234-5678</pre>
            <button id="share" data-arg="#out|요양일지|mask">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        const text = globalThis.navigator.clipboard.writeText.mock.calls[0][0];
        expect(text).not.toContain('010-1234-5678');
        expect(text).toContain('[연락처]');
    });

    it('입력도 없는 빈 뷰 → "공유할 내용이 없습니다" 안내', async () => {
        setup(`<section class="view-section"><pre id="out"></pre>
            <button id="share" data-arg="#out|빈 문서">공유</button></section>`);
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        expect(globalThis.navigator.clipboard.writeText).not.toHaveBeenCalled();
        expect(toasts.find(t => t.includes('공유할 내용이 없습니다'))).toBeTruthy();
    });

    it('데스크톱(pointer:fine) — navigator.share가 있어도 무응답 없이 클립보드로 복사', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        // 데스크톱: share 존재하나 실패해도 복사 폴백 — coarse 미매칭(jsdom 기본)
        globalThis.navigator.share = vi.fn().mockRejectedValue(new Error('no OS share UI'));
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        expect(globalThis.navigator.share).not.toHaveBeenCalled(); // 데스크톱은 호출 자체 생략
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('문서 내용');
        expect(toasts.find(t => t.includes('클립보드'))).toBeTruthy();
    });

    it('생성 핸들러 예외 시에도 공유 중단 없이 폼 폴백으로 진행', async () => {
        setup(`<section class="view-section"><pre id="out"></pre>
            <label>항목 <input id="f" value="값"></label>
            <button data-click="boom">생성</button>
            <button id="share" data-arg="#out|문서|boom">공유</button></section>`);
        const genBtn = /** @type {HTMLButtonElement} */ (document.querySelector('[data-click="boom"]'));
        genBtn.click = () => { throw new Error('생성 실패'); }; // 위임 핸들러 예외는 .click() 스로우로 전파됨
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled(); // 폼 양식으로 공유 완료
        const text = globalThis.navigator.clipboard.writeText.mock.calls[0][0];
        expect(text).toContain('항목');
    });

    it('모바일(pointer:coarse) — 공유 시트 우선, 실패 시 복사 폴백', async () => {
        setup(`<section class="view-section"><pre id="out">문서 내용</pre>
            <button id="share" data-arg="#out|문서">공유</button></section>`);
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'TypeError' }));
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        await careShare(document.getElementById('share'));
        expect(globalThis.navigator.share).toHaveBeenCalled();
        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('문서 내용');
    });
});

// 실제 본인부담금 계산 뷰 시뮬레이션 — 실마크업 파셜 + 실제 careCalcRun
describe('CO-13 본인부담금 계산 실제 시뮬레이션', () => {
    const partial = readFileSync(join(__dirname, '../../../../html/exams/carework/care-calc.html'), 'utf8');

    it('공유 버튼 클릭 → 자동 계산 실행 → 계산 결과 공유', async () => {
        document.body.innerHTML = partial;
        globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
        delete globalThis.navigator.share;
        const { initCareCalcView, careCalcRun } = await import('../../../../src/exams/carework/views/care-calc.js');
        await initCareCalcView();
        // 프로덕션 data-click 위임 shim — jsdom에는 전역 위임이 없으므로 수동 연결
        document.body.addEventListener('click', e => {
            const b = e.target.closest('[data-click]');
            if (b?.dataset.click === 'careCalcRun') careCalcRun();
        });
        // 입력 없이도 등급·유형 기본값으로 계산 가능해야 함
        const { careShare } = await import('../../../../src/exams/carework/care-share.js');
        const btn = document.querySelector('[data-click="careShare"]');
        await careShare(btn);
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
        const btn = document.querySelector('[data-click="careShare"]');
        await careShare(btn);
        const call = globalThis.navigator.clipboard.writeText.mock.calls[0];
        expect(call).toBeTruthy();
        expect(call[0]).toBe(document.getElementById('care-result').textContent);
    });
});
