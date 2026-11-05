// src/exams/carework/views/care-webtoon.js — 웹툰 버블 뷰 (이야기 슬롯 → 말풍선 패널)
// @spec none — 뷰 모듈 (실습 도구. 요구사항 ID 미부여)
// 이야기형 MD의 story:start~end 블록을 씬 단위로 파싱해 대사는 화자별 버블,
// 지문은 장면 패널로 렌더링. 인물 아바타는 인물 설정표(DOC-USR-23) 고정 아트.
import { contentPath } from '../../../core/exam-context.js';
import { esc } from '../../../core/sanitize.js';

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

/** @param {string} md */
export function _parse(md) {
    /** @type {typeof _slots} */
    const out = [];
    for (const b of md.split('<!-- story:start -->').slice(1)) {
        const body = b.split('<!-- story:end -->')[0];
        const beats = body.split('\n').map(l => l.trim())
            .filter(l => l && !l.startsWith('<!--'))
            .map(l => {
                const m = l.match(/^["“](.+)["”]$/);
                return m ? { t: 'line', text: m[1] } : { t: 'scene', text: l };
            });
        if (beats.length) out.push({ beats, title: beats[0].text.replace(/\*\*/g, '').slice(0, 20) });
    }
    return out;
}

// 화자 추정 — 선임님을 부르면 미영, 미영을 부르면 선임, 표지 없으면 직전 화자와 교대
/** @param {string} text @param {string|null} prev */
export function _who(text, prev) {
    if (/선임님/.test(text)) return 'miyoung';
    if (/미영|교육생/.test(text)) return 'mentor';
    if (/어르신|어머니|아버지|할아버지|할머니/.test(text) && /[요야네임][.!?]?$/.test(text)) return 'elder';
    return prev === 'mentor' ? 'miyoung' : 'mentor';
}

/** @param {{ beats: Array<{ t: string, text: string }> }} slot */
function _render(slot) {
    let prev = null;
    return slot.beats.map(b => {
        if (b.t === 'scene') return `<div class="wb-scene">${esc(b.text)}</div>`;
        const who = _who(b.text, prev);
        prev = who;
        const c = CHARS[who];
        const av = `<img class="wb-avatar" src="${esc(contentPath(c.img))}" alt="${esc(c.name)}">`;
        const bubble = `<div class="wb-bubble wb-bubble-${who}"><div class="wb-name">${esc(c.name)}</div>${esc(b.text)}</div>`;
        return `<div class="wb-row wb-${c.side}">${c.side === 'left' ? av + bubble : bubble + av}</div>`;
    }).join('');
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
        _slots = _parse(await res.text());
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
