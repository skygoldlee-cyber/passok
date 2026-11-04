// tests/dom/exams/carework/care-share.test.js
// @spec CO-13 — careShare 전체 흐름 시뮬레이션 (폼 폴백·확인·복사)
import { describe, it, expect, vi, beforeEach } from 'vitest';

const toasts = [];
vi.mock('../../../../src/ui-utils.js', () => ({
    showToast: (m) => { toasts.push(m); },
    showConfirm: vi.fn().mockResolvedValue(true),
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
});
