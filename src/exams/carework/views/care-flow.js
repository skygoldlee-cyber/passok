// src/exams/carework/views/care-flow.js — 4단계 학습 흐름 (DOC-USR-24)
// @spec none — 뷰 모듈 (개념 선택 → 미리풀기 → 이야기 → 요약 → 시나리오)
import { contentPath } from '../../../core/exam-context.js';
import { esc } from '../../../core/sanitize.js';
import { getItem, setItem } from '../../../core/storage.js';
import { parseStorySlots, renderSlotHtml } from '../../../reader/webtoon-render.js';
import { DataLoader } from '../../../content/data-loader.js';

const STEPS = ['home', 'pre', 'story', 'summary', 'scenario', 'result', 'complete'];
const STEP_LABELS = { home: '개념', pre: '①미리풀기', story: '②이야기', summary: '③요약', scenario: '④시나리오', result: '채점', complete: '완료' };
const BOOKS = { 1: '교재/caretheory/1과목_요양보호론_이야기형.md', 2: '교재/careprac/2과목_요양보호실기_이야기형.md' };
const BANKS = { 1: '문제은행/과목1_요양보호론_문제은행.md', 2: '문제은행/과목2_요양보호실기_문제은행.md' };
const CIRCLED = '①②③④⑤';
const CHARS = {
    miyoung: { name: '미영', side: 'right', img: 'assets/characters/miyoung.svg' },
    mentor: { name: '박은정 선임', side: 'left', img: 'assets/characters/park-eunjung.svg' },
    elder: { name: '어르신', side: 'left', img: 'assets/characters/choi-boksun.svg' },
};

let _concepts = null, _items = null, _tags = null, _slots = null, _book = null;
const _bank = {};
let _c = null, _i = 0, _sel = -1, _answered = false;

const _chars = () => Object.fromEntries(Object.entries(CHARS).map(([k, c]) => [k, { ...c, img: contentPath(c.img) }]));
/** 정답 인덱스 — authored는 원문자('②'), 은행 파싱은 숫자 */
const _ansIdx = q => typeof q.answer === 'number' ? q.answer : CIRCLED.indexOf(q.answer);
const _prog = () => { try { return JSON.parse(getItem('flow_progress') || '{}') || {}; } catch { return {}; } };
const _save = p => setItem('flow_progress', JSON.stringify(p));
const _conceptItems = (c, role) => (_items || []).filter(it => it.conceptId === c.id && it.role === role);

async function _load() {
    if (!_concepts) {
        const [a, b, t] = await Promise.all(['concepts.json', 'items/scenario_items.json', 'items/bank_tags.json'].map(f => fetch(contentPath(f)).then(r => r.json())));
        _concepts = a.concepts;
        _items = b.items;
        _tags = (t && t.tags) || {};
    }
    return _concepts;
}

/** 과목별 문제은행 지연 로드 → { qid: { stem, options, answer } } */
async function _bankLoad(subject) {
    if (_bank[subject]) return _bank[subject];
    const md = await DataLoader._getMd(contentPath(BANKS[subject]));
    /** @type {Record<string, { stem: string, options: string[], answer: number }>} */
    const out = {};
    for (const m of md.matchAll(/###\s*Q(\d+)\.\s*([^\n]+)\n([\s\S]*?)(?=\n###\s|\n##\s|$)/g)) {
        const opts = m[3].split('\n').map(l => l.trim()).filter(l => /^[①-⑤]/.test(l))
            .map(l => l.slice(1).trim());
        if (opts.length >= 2) out['Q' + m[1]] = { stem: m[2].trim(), options: opts, answer: -1 };
    }
    // 정답 섹션 — **Q{n}.** 다음의 정답 표기를 매핑
    for (const m of md.matchAll(/\*\*Q(\d+)\.\*\*[\s\S]*?정답:\s*([①-⑤])/g)) {
        if (out['Q' + m[1]]) out['Q' + m[1]].answer = CIRCLED.indexOf(m[2]);
    }
    _bank[subject] = out;
    return out;
}

/** 개념에 태깅된 은행 문항 키 목록 (bank_tags → Q{id}) */
function _bankKeys(conceptId) {
    return Object.keys(_tags || {}).filter(k => _tags[k].conceptId === conceptId);
}

async function _storySlots(subject) {
    if (_book !== subject) { _book = subject; _slots = null; }
    if (!_slots) _slots = parseStorySlots(await DataLoader._getMd(contentPath(BOOKS[subject])));
    return _slots;
}

function _slotFor(c) {
    const n = parseInt(String(c.storySlot || '').replace(/\D/g, ''), 10);
    return _slots && _slots[n - 1] ? _slots[n - 1] : null;
}

function _render() {
    const st = document.getElementById('flow-stage');
    const pg = document.getElementById('flow-progress');
    const back = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-back'));
    const next = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-next'));
    if (!st) return;
    const step = STEPS[_i];
    st.dataset.step = step;
    if (pg) pg.textContent = STEPS.map(s => s === step ? `[${STEP_LABELS[s]}]` : STEP_LABELS[s]).join(' · ');
    if (back) back.disabled = _i === 0;
    if (next) next.disabled = !_c || (step === 'scenario' && !_answered);
    const c = _c;
    if (!c) { st.innerHTML = '<p class="wb-scene">위에서 개념을 선택하세요.</p>'; return; }

    if (step === 'home') {
        const p = _prog()[c.id] || {};
        st.innerHTML = `<div class="wb-scene wb-scene-title">Ch${esc(c.chapter)} · ${esc(c.title)}</div><p class="wb-scene">진행: ${esc(p.stage ? STEP_LABELS[p.stage] || p.stage : '미시작')}${p.mastered ? ' — 마스터' : ''}</p>`;
    } else if (step === 'pre') {
        const qs = _conceptItems(c, 'pre').slice(0, 2);
        // 문제은행 태깅 문항 — 개념당 최대 2개, 정답은 details로 확인
        const bank = _bank[c.subject] || {};
        const bq = _bankKeys(c.id).map(k => bank[k]).filter(Boolean).slice(0, 2);
        const bHtml = bq.map(q => `<div class="flow-quiz"><div class="wb-scene wb-scene-title">${esc(q.stem)}</div>` +
            q.options.map(o => `<div class="wb-scene">${esc(o)}</div>`).join('') +
            `<details class="flow-answer"><summary>정답 보기</summary>정답: ${esc(CIRCLED[q.answer] || '?')}</details></div>`).join('');
        st.innerHTML = (qs.length ? qs.map((q, qi) => _quizHtml(q, 'pre' + qi)).join('') : '') + bHtml ||
            '<p class="wb-scene">선행 문항이 없습니다 — 이야기로 넘어가세요.</p>';
    } else if (step === 'story') {
        const slot = _slotFor(c);
        st.innerHTML = slot
            ? `<div class="webtoon-reader">${renderSlotHtml(slot, _chars())}</div>`
            : `<div class="wb-scene wb-scene-title">${esc(c.title)}</div><p class="wb-scene">이 개념에 연결된 이야기 장면이 없습니다.</p>`;
    } else if (step === 'summary') {
        const key = _conceptItems(c, 'scenario').concat(_conceptItems(c, 'review'))[0];
        const good = key ? key.options[_ansIdx(key)] : '';
        st.innerHTML = `<div class="wb-scene wb-scene-title">핵심 요약</div><div class="wb-scene">${esc(c.title)}</div>` +
            (key ? `<p class="wb-scene">포인트 — ${esc(key.stem.slice(0, 80))}… → <b>${esc(good)}</b></p>` : '');
    } else if (step === 'scenario') {
        const qs = _conceptItems(c, 'scenario').concat(_conceptItems(c, 'review')).slice(0, 3);
        st.innerHTML = qs.length ? qs.map((q, qi) => _quizHtml(q, 'sc' + qi)).join('') : '<p class="wb-scene">시나리오 문항이 없습니다.</p>';
    } else if (step === 'result') {
        const q = _conceptItems(c, 'scenario').concat(_conceptItems(c, 'review'))[0];
        st.innerHTML = q ? _resultHtml(q) : '<p class="wb-scene">표시할 결과가 없습니다.</p>';
    } else {
        const p = _prog(); p[c.id] = { stage: 'complete', mastered: true, lastSeen: Date.now() }; _save(p);
        st.innerHTML = `<div class="wb-scene wb-scene-title">학습 완료 — ${esc(c.title)}</div><p class="wb-scene">복습 큐에 등록됐습니다. 다른 개념으로 계속하세요.</p>`;
    }
}

function _quizHtml(q, id) {
    return `<div class="flow-quiz" data-q="${esc(id)}"><div class="wb-scene wb-scene-title">${esc(q.stem)}</div>` +
        q.options.map((o, oi) => `<button class="flow-opt secondary" data-opt="${oi}">${esc(o)}</button>`).join('') + '</div>';
}

function _resultHtml(q) {
    return `<div class="wb-scene wb-scene-title">${_answered ? '해설' : '문항 없음'}</div>` +
        q.options.map((o, oi) => `<p class="wb-scene">${oi === _ansIdx(q) ? '✅' : '▫️'} ${esc(o)} — ${esc(q.rationale[oi] || '')}</p>`).join('');
}

export function flowBack() { if (_i > 0) { _i--; _render(); } }
export function flowNext() {
    if (_i >= STEPS.length - 1) return;
    if (STEPS[_i] === 'scenario') _answered = true;
    _i++; _render();
}

/** 시나리오 보기 클릭 — 위임 핸들러 (app.js data-click: flowOpt) */
export function flowOpt(idx) {
    if (_i < 0 || STEPS[_i] !== 'scenario') return;
    _sel = idx; _answered = true;
    document.querySelectorAll('.flow-opt').forEach(b => {
        const btn = /** @type {HTMLElement} */ (b);
        btn.style.borderColor = Number(btn.dataset.opt) === idx ? 'var(--color-primary)' : '';
    });
    const next = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-next'));
    if (next) next.disabled = false;
}

export async function initCareFlowView() {
    const subjSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('flow-subject'));
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('flow-concept'));
    const stage = document.getElementById('flow-stage');
    if (!subjSel || !sel || !stage) return;
    const cs = await _load();
    const pick = async () => {
        _c = cs.find(x => x.id === sel.value) || null;
        _i = 0; _sel = -1; _answered = false;
        if (_c) { await Promise.all([_storySlots(_c.subject), _bankLoad(_c.subject)]); const p = _prog(); p[_c.id] = p[_c.id] || {}; p[_c.id].stage = 'pre'; _save(p); }
        _render();
    };
    const refill = () => {
        sel.innerHTML = '';
        sel.add(new Option('— 개념을 고르세요 —', ''));
        cs.filter(c => String(c.subject) === (subjSel.value || '1'))
            .forEach(c => sel.add(new Option(`Ch${c.chapter} ${c.title}`, c.id)));
    };
    if (!subjSel.options.length) {
        const subs = [...new Set(cs.map(c => c.subject))].sort();
        if (!subs.length) subs.push(2); // 파일럿 과목만 있어도 셀렉트는 보이게
        subs.forEach(s => {
            const op = new Option(s === 1 ? '1과목 요양보호론' : '2과목 요양보호실기', String(s));
            // 개념이 없는 과목도 표시하되, 파일럿 안내를 위해 라벨에 집계 표기
            const n = cs.filter(c => c.subject === s).length;
            sel && (op.textContent += ` (${n})`);
            subjSel.add(op);
        });
        // 개념이 있는 첫 과목을 기본 선택 — 없는 과목이면 목록이 비어 혼란
        const first = subs.find(s => cs.some(c => c.subject === s));
        if (first) subjSel.value = String(first);
    }
    refill();
    subjSel.onchange = refill;
    sel.onchange = pick;
    _render();
}
