// src/exams/carework/views/care-webtoon.js — 웹툰 버블 뷰 (이야기 슬롯 → 말풍선 패널)
// @spec none — 뷰 모듈 (실습 도구. 요구사항 ID 미부여)
// 이야기형 MD의 story:start~end 블록을 씬 단위로 파싱해 대사는 화자별 버블,
// 지문은 장면 패널로 렌더링. 인물 아바타는 인물 설정표(DOC-USR-23) 고정 아트.
import { contentPath } from '../../../core/exam-context.js';
import { parseStorySlots, renderSlotHtml } from '../../../reader/webtoon-render.js';

// 공용 모듈 재수출 — tests/unit/content/care-webtoon.test.js가 _parse/_who를 import
export { parseStorySlots as _parse, whoSays as _who } from '../../../reader/webtoon-render.js';

const BOOKS = {
    s2: { label: '2과목 요양보호관련', file: '교재/careprac/2과목_요양보호관련_이야기형.md' },
    s1: { label: '1과목 요양보호론', file: '교재/caretheory/1과목_요양보호론_이야기형.md' },
};
const CHARS = {
    miyoung: { name: '미영', img: 'assets/characters/miyoung.svg', side: 'right' },
    mentor: { name: '박은정 선임', img: 'assets/characters/park-eunjung.svg', side: 'left' },
    elder: { name: '어르신', img: 'assets/characters/choi-boksun.svg', side: 'left' },
};

/** @type {Array<{ beats: Array<{ t: string, text: string }>, title: string }>} */
let _slots = [];
let _cur = 0;
let _bound = false;

/** carework 인물 설정 — 아바타 경로를 contentPath로 해석해 공용 렌더에 주입 */
function _render(slot) {
    /** @type {Record<string, { name: string, side: string, img?: string }>} */
    const chars = {};
    for (const [k, c] of Object.entries(CHARS)) chars[k] = { name: c.name, side: c.side, img: contentPath(c.img) };
    return renderSlotHtml(slot, chars);
}

/** @param {number} i */
function _show(i) {
    _cur = Math.max(0, Math.min(i, _slots.length - 1));
    const slot = _slots[_cur];
    const stage = document.getElementById('webtoon-stage');
    if (slot && stage) stage.innerHTML = _render(slot);
    const pick = /** @type {HTMLSelectElement|null} */ (document.getElementById('webtoon-slot'));
    if (pick) pick.value = String(_cur);
    const pg = document.getElementById('webtoon-pager');
    if (pg) pg.textContent = `씬 ${_cur + 1} / ${_slots.length}`;
}

export function webtoonPrev() { _show(_cur - 1); }
export function webtoonNext() { _show(_cur + 1); }

export async function initCareWebtoonView() {
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('webtoon-subject'));
    const pick = /** @type {HTMLSelectElement|null} */ (document.getElementById('webtoon-slot'));
    if (!sel || !pick) return;
    if (!sel.options.length) {
        for (const [k, b] of Object.entries(BOOKS)) sel.add(new Option(b.label, k));
    }
    const reload = async () => {
        const res = await fetch(contentPath(BOOKS[/** @type {'s1'|'s2'} */ (sel.value || 's2')].file));
        _slots = parseStorySlots(await res.text());
        pick.innerHTML = '';
        _slots.forEach((s, i) => pick.add(new Option(`${i + 1}. ${s.title}`, String(i))));
        pick.onchange = () => _show(Number(pick.value));
        _show(0);
    };
    sel.onchange = reload;
    await reload();
    if (!_bound) {
        _bound = true;
        document.addEventListener('keydown', e => {
            const v = document.getElementById('care-webtoon-view');
            if (!v || v.classList.contains('is-hidden') || v.offsetParent === null) return;
            if (e.key === 'ArrowLeft') _show(_cur - 1);
            if (e.key === 'ArrowRight') _show(_cur + 1);
        });
    }
}
