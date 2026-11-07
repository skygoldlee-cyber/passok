// tests/dom/exams/carework/care-flow.test.js
// @spec none — care-flow 4단계 뷰 상태머신 커버리지 (DOM 측정 범위 확보)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const CONCEPTS = { concepts: [{ id: 's2-c10-x', subject: 2, chapter: 10, title: '식사 자세', bodyAnchor: '10-1', storySlot: 's01' }] };
const ITEMS = { items: [
    { id: 'pre1', conceptId: 's2-c10-x', role: 'pre', stem: '선행 문항', options: ['a', 'b', 'c', 'd', 'e'], answer: 0, rationale: ['p', 'q', 'r', 's', 't'], source: {} },
    { id: 'sc1', conceptId: 's2-c10-x', role: 'scenario', stem: '시나리오 문항1', options: ['a', 'b', 'c', 'd', 'e'], answer: 1, rationale: ['p', 'q', 'r', 's', 't'], source: {} },
    { id: 'sc2', conceptId: 's2-c10-x', role: 'scenario', stem: '시나리오 문항2', options: ['a', 'b', 'c', 'd', 'e'], answer: 2, rationale: ['p', 'q', 'r', 's', 't'], source: {} },
] };
const STORY_MD = '<!-- story:start -->\n### 장면\n\n"미영 씨, 여기 처음이세요?"\n<!-- story:end -->';
const TAGS = { tags: { Q9: { conceptId: 's2-c10-x', role: 'review' } } };
const BANK_MD = '### Q9. 미리풀기 문항?\n① 오답\n② 정답\n\n## 🔑 정답 및 교재 근거\n\n**Q9.**\n> **정답: ②** [교재: L10](<x.md#L10>)';

function _mount() {
    document.body.innerHTML = readFileSync(join(ROOT, 'html/exams/carework/care-flow.html'), 'utf-8')
        .replace(/<script[\s\S]*?<\/script>/gi, '');
}
const stage = () => /** @type {HTMLElement} */ (document.getElementById('flow-stage'));
const text = () => stage().textContent || '';
const nextBtn = () => /** @type {HTMLButtonElement} */ (document.getElementById('flow-next'));
// storage.js가 시험 스코프 접두를 붙일 수 있어 접미사로 조회
const _read = suffix => {
    const k = Object.keys(localStorage).find(k => k.endsWith(suffix));
    return k ? JSON.parse(localStorage.getItem(k)) : null;
};
const attempts = () => _read('flow_attempts') || [];
const progress = () => _read('flow_progress') || {};

async function _start(m) {
    await m.initCareFlowView();
    const sel = /** @type {HTMLSelectElement} */ (document.getElementById('flow-concept'));
    sel.value = 's2-c10-x';
    await sel.onchange?.(/** @type {any} */ ({}));
}

beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    _mount();
    globalThis.fetch = vi.fn(async url => {
        const u = String(url);
        const body = u.includes('concepts.json') ? JSON.stringify(CONCEPTS)
            : u.includes('scenario_items') ? JSON.stringify(ITEMS)
            : u.includes('bank_tags') ? JSON.stringify(TAGS)
            : u.includes('문제은행') ? BANK_MD
            : STORY_MD;
        return { ok: true, json: async () => JSON.parse(body), text: async () => body };
    });
});

describe('care-flow 4단계 뷰 상태머신', () => {
    it('pre 정답 → 이야기 건너뛰고 요약 → 시나리오 정답 → 완료·mastered 기록', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await _start(m);
        m.flowNext(); // home → pre (미응답이면 확인 비활성)
        expect(text()).toContain('선행 문항');
        m.flowOpt(0); // 정답 선택
        m.flowNext(); // pre 판정 → summary (story 스킵)
        expect(text()).toContain('핵심 요약');
        expect(stage().innerHTML).not.toContain('wb-bubble');
        m.flowNext(); // → scenario
        expect(text()).toContain('시나리오 문항1');
        expect(nextBtn().disabled).toBe(true);
        m.flowOpt(1); // 정답
        m.flowNext(); // → result
        expect(text()).toContain('정답입니다');
        m.flowNext(); // → complete
        expect(text()).toContain('학습 완료');
        const p = progress();
        expect(p['s2-c10-x'].mastered).toBe(true);
        expect(attempts().length).toBe(2); // pre + scenario
        // 진단 연동 — flow 응답이 표준 quizResults로 집계된다 (<subj>_quiz_flow_ 패턴)
        const { state } = await import('../../../../src/core/state.js');
        expect(state.quizResults['careprac_quiz_flow_pre1'].correct).toBe(true);
        expect(state.quizResults['careprac_quiz_flow_sc1'].correct).toBe(true);
    });

    it('pre 모르겠어요 → 이야기 경유 → 시나리오 오답 재도전(다른 문항) → 2연속 오답 weak 표시', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await _start(m);
        m.flowNext();
        m.flowDontKnow();
        m.flowNext(); // → story
        expect(stage().innerHTML).toContain('wb-bubble');
        m.flowNext(); // → summary
        m.flowNext(); // → scenario
        m.flowOpt(0); // sc1 오답 (정답=1)
        m.flowNext(); // → result — 아쉬움 + 다른 문항 안내
        expect(text()).toContain('아쉬워요');
        m.flowNext(); // → 재도전: sc2
        expect(text()).toContain('시나리오 문항2');
        m.flowOpt(0); // sc2 오답 (정답=2) → 2연속
        m.flowNext(); // → result
        expect(text()).toContain('두 번 연속');
        m.flowNext(); // → complete — weak 표시, mastered 없음
        const p = progress();
        expect(p['s2-c10-x'].weak).toBe(true);
        expect(p['s2-c10-x'].mastered).toBeUndefined();
        expect(attempts().filter(a => a.dontKnow).length).toBe(1);
        // 모르겠어요는 quizResults에 쓰지 않고, 오답은 incorrect로 기록
        const { state } = await import('../../../../src/core/state.js');
        expect(state.quizResults['careprac_quiz_flow_pre1']).toBeUndefined();
        expect(state.quizResults['careprac_quiz_flow_sc1'].correct).toBe(false);
    });

    it('미완료 개념 재선택 — 저장된 단계로 이어하기', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        const { setItem } = await import('../../../../src/core/storage.js');
        setItem('flow_progress', JSON.stringify({ 's2-c10-x': { stage: 'story', lastSeen: 1 } }));
        await _start(m);
        expect(stage().innerHTML).toContain('wb-bubble'); // story로 복귀
    });

    it('개념 미선택 상태 — 안내 문구 렌더', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await m.initCareFlowView();
        expect(stage().textContent).toContain('개념을 선택하세요');
    });

    it('과목 필터 — 해당 과목 개념만 셀렉트에 표시', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await m.initCareFlowView();
        const subjSel = /** @type {HTMLSelectElement} */ (document.getElementById('flow-subject'));
        const sel = /** @type {HTMLSelectElement} */ (document.getElementById('flow-concept'));
        expect(subjSel.options.length).toBeGreaterThan(0);
        expect([...sel.options].filter(o => o.value).every(o => o.value.startsWith('s2'))).toBe(true);
    });

    it('보기 버튼은 data-click 위임 마커를 갖는다 (dead 버튼 회귀)', async () => {
        const m = await import('../../../../src/exams/carework/views/care-flow.js');
        await _start(m);
        m.flowNext();
        document.querySelectorAll('#flow-stage .flow-opt').forEach(b => {
            expect(b.getAttribute('data-click')).toBeTruthy();
        });
    });
});
