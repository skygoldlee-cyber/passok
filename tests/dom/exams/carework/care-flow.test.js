// tests/dom/exams/carework/care-flow.test.js
// @spec none — care-flow 4단계 뷰 상태머신 커버리지 (DOM 측정 범위 확보)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const CONCEPTS = { concepts: [{ id: 's2-c10-x', subject: 2, chapter: 10, title: '식사 자세', bodyAnchor: '10-1', storySlot: 's01' }] };
const ITEMS = { items: [
    { conceptId: 's2-c10-x', role: 'pre', stem: '선행 문항', options: ['a', 'b', 'c', 'd', 'e'], answer: 0, rationale: ['p', 'q', 'r', 's', 't'], source: {} },
    { conceptId: 's2-c10-x', role: 'scenario', stem: '시나리오 문항', options: ['a', 'b', 'c', 'd', 'e'], answer: 1, rationale: ['p', 'q', 'r', 's', 't'], source: {} },
] };
const STORY_MD = '<!-- story:start -->\n### 장면\n\n"미영 씨, 여기 처음이세요?"\n<!-- story:end -->';

function _mount() {
    document.body.innerHTML = readFileSync(join(ROOT, 'html/exams/carework/care-flow.html'), 'utf-8')
        .replace(/<script[\s\S]*?<\/script>/gi, '');
}

beforeEach(() => {
    vi.resetModules();
    _mount();
    globalThis.fetch = vi.fn(async url => {
        const u = String(url);
        const body = u.includes('concepts.json') ? JSON.stringify(CONCEPTS)
            : u.includes('scenario_items') ? JSON.stringify(ITEMS)
            : STORY_MD;
        return { ok: true, json: async () => JSON.parse(body), text: async () => body };
    });
});

describe('care-flow 4단계 뷰 상태머신', () => {
    it('개념 선택 → pre→story→summary→scenario→result→complete 전환', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await m.initCareFlowView();
        const sel = /** @type {HTMLSelectElement} */ (document.getElementById('flow-concept'));
        expect(sel.options.length).toBe(2); // placeholder + 1개념
        sel.value = 's2-c10-x';
        await sel.onchange?.(/** @type {any} */ ({}));
        const stage = () => /** @type {HTMLElement} */ (document.getElementById('flow-stage'));
        const text = () => stage().textContent || '';

        m.flowNext(); // pre — 문항 렌더
        expect(text()).toContain('선행 문항');
        m.flowNext(); // story — 버블 렌더
        expect(stage().innerHTML).toContain('wb-bubble');
        m.flowNext(); // summary
        expect(text()).toContain('핵심 요약');
        m.flowNext(); // scenario — 미응답 시 다음 비활성
        const next = /** @type {HTMLButtonElement} */ (document.getElementById('flow-next'));
        expect(text()).toContain('시나리오 문항');
        m.flowOpt(1); // 보기 선택 → 다음 활성
        expect(next.disabled).toBe(false);
        m.flowNext(); // result — 보기별 해설
        expect(text()).toContain('해설');
        m.flowNext(); // complete
        expect(text()).toContain('학습 완료');
        m.flowBack(); // 뒤로
        expect(text()).toContain('해설');
    });

    it('개념 미선택 상태 — 안내 문구 렌더', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await m.initCareFlowView();
        expect(document.getElementById('flow-stage')?.textContent).toContain('개념을 선택');
    });

    it('과목 필터 — 해당 과목 개념만 셀렉트에 표시', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await m.initCareFlowView();
        const subjSel = /** @type {HTMLSelectElement} */ (document.getElementById('flow-subject'));
        const sel = /** @type {HTMLSelectElement} */ (document.getElementById('flow-concept'));
        expect(subjSel.options.length).toBeGreaterThan(0);
        expect([...sel.options].filter(o => o.value).every(o => o.value.startsWith('s2'))).toBe(true);
    });
});
