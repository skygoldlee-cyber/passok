// src/exams/carework/views/care-flow.js — 4단계 학습 흐름 (DOC-USR-24)
// @spec none — 뷰 모듈 (개념 선택 → 미리풀기 → 이야기 → 요약 → 시나리오)
import { contentPath } from '../../../core/exam-context.js';
import { esc } from '../../../core/sanitize.js';
import { getItem, setItem } from '../../../core/storage.js';
import { state, saveProgress } from '../../../core/state.js';
import { recordQuizJudgment } from '../../../study/spaced-repetition.js';
import { switchView } from '../../../views/navigation.js';
import { parseStorySlots, renderSlotHtml } from '../../../reader/webtoon-render.js';
import { DataLoader } from '../../../content/data-loader.js';

const STEPS = ['home', 'pre', 'story', 'summary', 'scenario', 'result', 'complete'];
const STEP_LABELS = { home: '개념', pre: '①미리풀기', story: '②이야기', summary: '③요약', scenario: '④시나리오', result: '해설', complete: '완료' };
const NEXT_LABEL = { home: '시작 ▶', pre: '확인', story: '다음 ▶', summary: '문제 풀기 ▶', scenario: '정답 확인', result: '다음 ▶' };
const BOOKS = { 1: '교재/caretheory/1과목_요양보호론_이야기형.md', 2: '교재/careprac/2과목_요양보호실기_이야기형.md' };
const BANKS = { 1: '문제은행/과목1_요양보호론_문제은행.md', 2: '문제은행/과목2_요양보호실기_문제은행.md' };
const CIRCLED = '①②③④⑤';
const MAX_WRONG = 2; // 시나리오 연속 오답 상한 — 넘으면 해설 후 진행 (DOC-USR-22 §4)
const CHARS = {
    miyoung: { name: '미영', side: 'right', img: 'assets/characters/miyoung.svg' },
    mentor: { name: '박은정 선임', side: 'left', img: 'assets/characters/park-eunjung.svg' },
    elder: { name: '어르신', side: 'left', img: 'assets/characters/choi-boksun.svg' },
};

let _concepts = null, _items = null, _tags = null, _slots = null, _book = null;
const _bank = {};
let _c = null, _i = 0, _sel = -1, _answered = false, _dk = false;
let _preItem = null;   // 미리풀기 문항 (authored 우선, 없으면 은행 태그 문항)
let _scItem = null;    // 현재 시나리오 문항
let _scTried = new Set(); // 이번 개념에서 본 시나리오 id — 재도전은 다른 문항으로
let _scWrong = 0;      // 시나리오 연속 오답
let _lastCorrect = null; // result 표시용 마지막 판정

const _chars = () => Object.fromEntries(Object.entries(CHARS).map(([k, c]) => [k, { ...c, img: contentPath(c.img) }]));
/** 정답 인덱스 — authored는 원문자('②'), 은행 파싱은 숫자 */
const _ansIdx = q => typeof q.answer === 'number' ? q.answer : CIRCLED.indexOf(q.answer);
const _prog = () => { try { return JSON.parse(getItem('flow_progress') || '{}') || {}; } catch { return {}; } };
const _save = p => setItem('flow_progress', JSON.stringify(p));
const _conceptItems = (c, role) => (_items || []).filter(it => it.conceptId === c.id && it.role === role);

/** 개념의 과목 키 — 레지스트리 order 우선, 없으면 carework 상수 폴백 */
const SUBJ_KEY = { 1: 'caretheory', 2: 'careprac' };
const _subjKey = c => {
    const subs = (DataLoader.registry && DataLoader.registry.subjects) || [];
    const s = subs.find(x => x.order === c.subject) || subs[c.subject - 1];
    return (s && s.key) || SUBJ_KEY[c.subject] || null;
};

/**
 * 응답 기록 — ① flow_attempts(개념 단위 원자 로그, 최근 500건) ② 표준 진단 입력 연동.
 * scenario/pre 정오를 <subj>_quiz_flow_<itemId> 키로 quizResults에 기록하면
 * 학습진단 표본·과목별 정답률·BKT 시퀀스가 기존 파이프라인 그대로 집계된다.
 * 「모르겠어요」는 추측 없음 표시 — 오답이 아니므로 quizResults에는 쓰지 않는다.
 */
function _rec(itemId, choice, correct, dk) {
    let a;
    try { a = JSON.parse(getItem('flow_attempts') || '[]') || []; } catch { a = []; }
    a.push({ conceptId: _c && _c.id, itemId, choice, correct, dontKnow: !!dk, ts: Date.now() });
    if (a.length > 500) a.splice(0, a.length - 500);
    setItem('flow_attempts', JSON.stringify(a));
    const subjKey = _c && _subjKey(_c);
    if (subjKey && itemId && !dk) {
        const qid = `${subjKey}_quiz_flow_${itemId}`;
        state.quizResults[qid] = { solved: true, correct };
        recordQuizJudgment(qid, correct); // BKT 시퀀스 로그 (D-22)
        saveProgress();
    }
}

const _stage = s => {
    const p = _prog();
    const rec = p[_c.id] || {};
    rec.stage = s; rec.title = _c.title; rec.lastSeen = Date.now();
    p[_c.id] = rec; _save(p);
};

function _resetQ() { _sel = -1; _answered = false; _dk = false; }

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

/** 미리풀기 문항 — authored pre 우선, 없으면 은행 태그 문항을 인터랙티브로 */
function _preItemFor(c) {
    const it = _conceptItems(c, 'pre')[0];
    if (it) return it;
    const key = _bankKeys(c.id)[0];
    const bq = key && (_bank[c.subject] || {})[key];
    return bq ? { id: 'bank:' + key, stem: bq.stem, options: bq.options, answer: bq.answer, rationale: [] } : null;
}

/** 시나리오 문항 — 이번 개념에서 아직 안 본 것 우선 (재도전은 다른 문항) */
function _scItemFor(c) {
    const pool = _conceptItems(c, 'scenario').concat(_conceptItems(c, 'review'));
    return pool.find(q => !_scTried.has(q.id)) || null;
}

function _quizHtml(q) {
    return `<div class="flow-quiz"><div class="flow-stem">${esc(q.stem)}</div>` +
        q.options.map((o, oi) =>
            `<button class="flow-opt" data-click="flowOpt" data-arg="${oi}">${esc(CIRCLED[oi] || '')} ${esc(o)}</button>`).join('') + '</div>';
}

function _resultHtml() {
    const q = _scItem;
    if (!q) return '<p class="wb-scene">표시할 결과가 없습니다.</p>';
    const ai = _ansIdx(q);
    const ok = _lastCorrect === true;
    const verdict = ok ? '정답입니다!'
        : (_scWrong >= MAX_WRONG ? '두 번 연속 아쉬웠어요 — 해설을 읽고 넘어갈게요.' : '아쉬워요 — 같은 개념의 다른 문항으로 한 번 더 풀어봐요.');
    const opts = q.options.map((o, oi) => {
        const mark = oi === ai ? '✅' : (oi === _sel ? '❌' : '▫️');
        return `<p class="wb-scene">${mark} ${esc(o)} — ${esc((q.rationale || [])[oi] || '')}</p>`;
    }).join('');
    const canRetry = !ok && _scWrong < MAX_WRONG && !!_scItemFor(_c);
    return `<div class="flow-verdict ${ok ? 'ok' : 'no'}">${verdict}</div>` + opts
        + (canRetry ? '<p class="flow-hint">「다음」을 누르면 같은 개념의 다른 문항이 나옵니다.</p>' : '');
}

function _render() {
    const st = document.getElementById('flow-stage');
    const pg = document.getElementById('flow-progress');
    const back = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-back'));
    const next = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-next'));
    if (!st) return;
    const step = STEPS[_i];
    const c = _c;
    // 문항은 disabled 계산 전에 확정 — 진입 첫 렌더에서도 미응답 확인이 막히도록
    if (c && step === 'pre') _preItem = _preItem || _preItemFor(c);
    if (c && step === 'scenario') {
        _scItem = _scItem || _scItemFor(c);
        if (_scItem) _scTried.add(_scItem.id);
    }
    st.dataset.step = step;
    if (pg) pg.innerHTML = STEPS.map(s =>
        `<span class="flow-step${s === step ? ' on' : ''}">${esc(STEP_LABELS[s])}</span>`).join('');
    if (back) back.disabled = _i === 0;
    if (next) {
        next.textContent = NEXT_LABEL[step] || '다음 ▶';
        next.disabled = !c || (step === 'pre' && !!_preItem && !_answered)
            || (step === 'scenario' && !!_scItem && !_answered);
    }
    if (!c) { st.innerHTML = '<p class="wb-scene">위에서 개념을 선택하세요.</p>'; return; }
    const p = _prog()[c.id] || {};

    if (step === 'home') {
        const status = p.mastered ? '완료 — 정답으로 마쳤어요'
            : p.weak ? '취약 표시 — 다음에 먼저 다시 나와요'
            : p.stage ? `진행 중 — ${STEP_LABELS[p.stage] || '미시작'}부터 이어합니다`
            : '아직 시작 전';
        st.innerHTML = `<div class="wb-scene wb-scene-title">Ch${esc(c.chapter)} · ${esc(c.title)}</div><p class="wb-scene">${esc(status)}</p>`;
    } else if (step === 'pre') {
        st.innerHTML = _preItem
            ? `<div class="wb-scene wb-scene-title">먼저 풀어볼까요 — 모르면 「모르겠어요」를 눌러도 됩니다</div>${_quizHtml(_preItem)}
               <button class="flow-opt flow-dk" data-click="flowDontKnow">🙋 모르겠어요</button>`
            : '<p class="wb-scene">선행 문항이 없습니다 — 이야기로 넘어가세요.</p>';
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
        st.innerHTML = _scItem ? _quizHtml(_scItem) : '<p class="wb-scene">시나리오 문항이 없습니다.</p>';
    } else if (step === 'result') {
        st.innerHTML = _resultHtml();
    } else {
        const rec = _prog()[c.id] || {};
        const done = _lastCorrect === true;
        const p2 = _prog();
        if (done) { rec.mastered = true; rec.weak = false; }
        else if (_scWrong >= MAX_WRONG) { rec.weak = true; }
        rec.stage = 'complete'; rec.title = c.title; rec.lastSeen = Date.now();
        p2[c.id] = rec; _save(p2);
        const msg = done ? '정답으로 마쳤어요 — 잘하셨습니다.'
            : _scWrong >= MAX_WRONG ? '이 개념은 다음에 먼저 다시 나와요.'
            : '이 개념 학습을 마쳤어요.';
        st.innerHTML = `<div class="wb-scene wb-scene-title">학습 완료 — ${esc(c.title)}</div><p class="wb-scene">${esc(msg)}</p>
            <button class="btn btn-primary flow-next-concept" data-click="flowNextConcept">다음 개념으로 ▶</button>`;
    }
}

export function flowBack() { if (_i > 0) { _i--; _render(); } }
export function flowNext() {
    if (_i >= STEPS.length - 1) return;
    const step = STEPS[_i];

    if (step === 'pre' && _preItem) {
        // 미리풀기 판정 — 정답이면 이야기를 건너뛰고 요약으로 (DOC-USR-22 §4 라우팅)
        const correct = !_dk && _sel === _ansIdx(_preItem);
        _rec(_preItem.id || 'pre', _dk ? -1 : _sel, correct, _dk);
        const p = _prog(); const rec = p[_c.id] || {};
        rec.preOk = correct; rec.lastSeen = Date.now();
        p[_c.id] = rec; _save(p);
        _stage(correct ? 'summary' : 'story');
        _i = STEPS.indexOf(correct ? 'summary' : 'story');
        _resetQ(); _preItem = null;
        _render(); return;
    }
    if (step === 'scenario' && _scItem) {
        const correct = _sel === _ansIdx(_scItem);
        _scWrong = correct ? 0 : _scWrong + 1;
        _lastCorrect = correct;
        _rec(_scItem.id, _sel, correct, false);
        const p = _prog(); const rec = p[_c.id] || {};
        rec.attempts = (rec.attempts || 0) + 1; rec.lastSeen = Date.now();
        p[_c.id] = rec; _save(p);
        _stage('result');
        _i = STEPS.indexOf('result');
        _render(); return;
    }
    if (step === 'result' && _lastCorrect === false && _scWrong < MAX_WRONG) {
        // 오답 재도전 — 같은 개념의 다른 문항 (문항 소진 시 진행)
        const nq = _scItemFor(_c);
        if (nq) {
            _scItem = nq; _resetQ();
            _stage('scenario');
            _i = STEPS.indexOf('scenario');
            _render(); return;
        }
    }
    _i++;
    _render();
}

/** 시나리오·미리풀기 보기 클릭 — 위임 핸들러 (data-click="flowOpt") */
export function flowOpt(idx) {
    const step = STEPS[_i];
    if (step !== 'scenario' && step !== 'pre') return;
    _sel = Number(idx); _answered = true; _dk = false;
    document.querySelectorAll('#flow-stage .flow-opt[data-arg]').forEach(b => {
        const btn = /** @type {HTMLElement} */ (b);
        btn.classList.toggle('is-sel', btn.getAttribute('data-arg') === String(idx));
    });
    const next = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-next'));
    if (next) next.disabled = false;
}

/** 미리풀기 「모르겠어요」 — 오답과 같은 경로(이야기)로 보내되 추측 없음으로 기록 (DOC-USR-22 §4) */
export function flowDontKnow() {
    if (STEPS[_i] !== 'pre' || !_preItem) return;
    _dk = true; _answered = true; _sel = -1;
    document.querySelectorAll('#flow-stage .flow-opt[data-arg]').forEach(b => b.classList.remove('is-sel'));
    const dk = document.querySelector('#flow-stage .flow-dk');
    if (dk) dk.classList.add('is-sel');
    const next = /** @type {HTMLButtonElement|null} */ (document.getElementById('flow-next'));
    if (next) next.disabled = false;
}

/** 개념 id로 셀렉트 이동 — 과목 필터 변경 후 개념 선택, pick()까지 트리거 */
function _selectConcept(id) {
    const cs = _concepts || [];
    const c = cs.find(x => x.id === id);
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('flow-concept'));
    const subjSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('flow-subject'));
    if (!c || !sel) return;
    if (subjSel && String(c.subject) !== subjSel.value) {
        subjSel.value = String(c.subject);
        subjSel.dispatchEvent(new Event('change'));
    }
    sel.value = id;
    sel.dispatchEvent(new Event('change'));
}

/** 완료 후 다음 미완료 개념으로 이동 — 같은 과목 우선, 없으면 전체에서 탐색 */
export function flowNextConcept() {
    if (!_concepts || !_c) return;
    const p = _prog();
    const undone = x => !(p[x.id] && p[x.id].mastered);
    const next = _concepts.find(x => x.subject === _c.subject && undone(x))
        || _concepts.find(undone) || _c;
    _selectConcept(next.id);
}

/** 대시보드 큐·진단 온보딩 진입점 — 뷰 전환 후 지정 개념 자동 선택 (이어하기) */
let _pendingConcept = null;
export function startConceptFlow(conceptId) {
    _pendingConcept = conceptId || null;
    switchView('care-flow-view');
    // 이미 마운트된 경우 바로 선택 — enter() 재실행 시에는 init이 _pendingConcept을 소비한다
    if (_pendingConcept && document.getElementById('flow-concept')) {
        const id = _pendingConcept;
        _pendingConcept = null;
        _selectConcept(id);
    }
}

export async function initCareFlowView() {
    const subjSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('flow-subject'));
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('flow-concept'));
    const stage = document.getElementById('flow-stage');
    if (!subjSel || !sel || !stage) return;
    const cs = await _load();
    const pick = async () => {
        _c = cs.find(x => x.id === sel.value) || null;
        _i = 0; _preItem = null; _scItem = null;
        _scTried = new Set(); _scWrong = 0; _lastCorrect = null;
        _resetQ();
        if (_c) {
            await Promise.all([_storySlots(_c.subject), _bankLoad(_c.subject)]);
            const rec = _prog()[_c.id] || {};
            // 이어하기 — 미완료 단계로 복귀 (result는 scenario부터 다시)
            if (!rec.mastered && rec.stage && STEPS.indexOf(rec.stage) > 0) {
                _i = STEPS.indexOf(rec.stage === 'result' ? 'scenario' : rec.stage);
            }
            if (!rec.stage) _stage('pre');
        }
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
    // 외부 진입(startConceptFlow)으로 지정된 개념 자동 선택
    if (_pendingConcept) {
        const id = _pendingConcept;
        _pendingConcept = null;
        _selectConcept(id);
    }
}
