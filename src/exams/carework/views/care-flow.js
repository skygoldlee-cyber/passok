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
import { todayKey } from '../../../core/utils.js';

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

/** @type {*[]|null} */
let _concepts = null;
/** @type {*[]|null} */
let _items = null;
/** @type {Object.<string,*>|null} */
let _tags = null;
/** @type {*[]|null} */
let _slots = null;
/** @type {string|number|null} */
let _book = null;
/** @type {Object.<string,*>} */
const _bank = {};
/** @type {*|null} */
let _c = null;
let _i = 0, _sel = -1, _answered = false, _dk = false;
/** @type {*|null} */
let _preItem = null;   // 미리풀기 문항 (authored 우선, 없으면 은행 태그 문항)
/** @type {*|null} */
let _scItem = null;    // 현재 시나리오 문항
/** @type {Set<*>} */
let _scTried = new Set(); // 이번 개념에서 본 시나리오 id — 재도전은 다른 문항으로
let _scWrong = 0;      // 시나리오 연속 오답
/** @type {boolean|null} */
let _lastCorrect = null; // result 표시용 마지막 판정

const _chars = () => Object.fromEntries(Object.entries(CHARS).map(([k, c]) => [k, { ...c, img: contentPath(c.img) }]));
/** 정답 인덱스 — authored는 원문자('②'), 은행 파싱은 숫자 */
/** @param {*} q */
const _ansIdx = q => typeof q.answer === 'number' ? q.answer : CIRCLED.indexOf(q.answer);
const _prog = () => { try { return JSON.parse(getItem('flow_progress') || '{}') || {}; } catch { return {}; } };
/** @param {*} p */
const _save = p => setItem('flow_progress', JSON.stringify(p));

// 개념 복습 큐 — DOC-USR-22 §4: 완료한 개념은 1·3·7일 뒤 다시 나온다 (개념 단위 간격)
const _IVLS = [1, 3, 7];
const _rv = () => { try { return JSON.parse(getItem('flow_review') || '{}') || {}; } catch { return {}; } };
/** @param {string} id */
function _scheduleReview(id) {
    const rv = _rv();
    const step = rv[id] ? Math.min((rv[id].step || 0) + 1, _IVLS.length - 1) : 0;
    const d = new Date(); d.setDate(d.getDate() + (_IVLS[step] || 0));
    rv[id] = { step, due: todayKey(d) };
    setItem('flow_review', JSON.stringify(rv));
}
/** 복습 기한 도래 개념 id[] — 대시보드 큐가 이어하기 최우선으로 제안한다 */
export function flowDueReviews() {
    const rv = _rv(); const t = todayKey();
    return Object.keys(rv).filter((/** @type {string} */ id) => rv[id] && rv[id].due <= t);
}
/** @param {*} c @param {string} role */
const _conceptItems = (c, role) => (_items || []).filter((/** @type {*} */ it) => it.conceptId === c.id && it.role === role);

/** 개념의 과목 키 — 레지스트리 order 우선, 없으면 carework 상수 폴백 */
const SUBJ_KEY = { 1: 'caretheory', 2: 'careprac' };
/** @param {*} c */
const _subjKey = c => {
    const subs = (DataLoader.registry && DataLoader.registry.subjects) || [];
    const s = subs.find((/** @type {*} */ x) => x.order === c.subject) || subs[c.subject - 1];
    return (s && s.key) || (/** @type {Object.<string,string>} */ (SUBJ_KEY))[c.subject] || null;
};

/**
 * 응답 기록 — ① flow_attempts(개념 단위 원자 로그, 최근 500건) ② 표준 진단 입력 연동.
 * scenario/pre 정오를 <subj>_quiz_flow_<itemId> 키로 quizResults에 기록하면
 * 학습진단 표본·과목별 정답률·BKT 시퀀스가 기존 파이프라인 그대로 집계된다.
 * 「모르겠어요」는 추측 없음 표시 — 오답이 아니므로 quizResults에는 쓰지 않는다.
 */
/** @param {string} itemId @param {number} choice @param {boolean} correct @param {boolean} dk */
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

/** @param {string} s */
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
/** @param {string|number} subject */
async function _bankLoad(subject) {
    if (_bank[subject]) return _bank[subject];
    const md = await DataLoader._getMd(contentPath((/** @type {Object.<string,string>} */ (BANKS))[subject] || ''));
    const out = _parseBankQuestions(md);
    _applyBankAnswers(md, out);
    _bank[subject] = out;
    return out;
}

/** 문제은행 md → 문항 맵 { qid: { stem, options, answer:-1 } }. @param {string} md */
function _parseBankQuestions(md) {
    /** @type {Record<string, { stem: string, options: string[], answer: number }>} */
    const out = {};
    for (const m of md.matchAll(/###\s*Q(\d+)\.\s*([^\n]+)\n([\s\S]*?)(?=\n###\s|\n##\s|$)/g)) {
        const opts = (m[3] || '').split('\n').map(l => l.trim()).filter(l => /^[①-⑤]/.test(l))
            .map(l => l.slice(1).trim());
        if (opts.length >= 2) out['Q' + (m[1] || '')] = { stem: (m[2] || '').trim(), options: opts, answer: -1 };
    }
    return out;
}

/** 정답 섹션 — **Q{n}.** 다음의 정답 표기를 문항 맵에 매핑. @param {string} md @param {*} out */
function _applyBankAnswers(md, out) {
    for (const m of md.matchAll(/\*\*Q(\d+)\.\*\*[\s\S]*?정답:\s*([①-⑤])/g)) {
        const qk = 'Q' + (m[1] || '');
        if (out[qk]) /** @type {*} */ (out[qk]).answer = CIRCLED.indexOf(m[2] || '');
    }
}

/** 개념에 태깅된 은행 문항 키 목록 (bank_tags → Q{id}) */
/** @param {string} conceptId */
function _bankKeys(conceptId) {
    return Object.keys(_tags || {}).filter((/** @type {string} */ k) => /** @type {Object.<string,*>} */ (_tags)[k].conceptId === conceptId);
}

/** @param {string|number} subject */
async function _storySlots(subject) {
    if (_book !== subject) { _book = subject; _slots = null; }
    if (!_slots) _slots = parseStorySlots(await DataLoader._getMd(contentPath((/** @type {Object.<string,string>} */ (BOOKS))[subject] || '')));
    return _slots;
}

/** @param {*} c */
function _slotFor(c) {
    const n = parseInt(String(c.storySlot || '').replace(/\D/g, ''), 10);
    return _slots && _slots[n - 1] ? _slots[n - 1] : null;
}

/** 글자 크게 토글 — DOC-USR-22 §8 확대 옵션 (시험 스코프 저장) */
export function flowLgToggle() {
    _applyLg(getItem('flow_lg') !== '1');
    setItem('flow_lg', getItem('flow_lg') === '1' ? '0' : '1');
}
/** @param {boolean} on */
function _applyLg(on) {
    const st = document.getElementById('flow-stage');
    const btn = document.getElementById('flow-lg-btn');
    if (st) st.classList.toggle('flow-lg', on);
    if (btn) { btn.textContent = on ? '글자 보통' : '글자 크게'; btn.setAttribute('aria-pressed', String(on)); }
}

/** 홈 추천 — 개념 미선택 시: 복습 도래 → 취약 → 첫 미완료 순으로 제안 */
function _homeRecHtml() {
    if (!_concepts || !_concepts.length) return '<p class="wb-scene">위에서 개념을 선택하세요.</p>';
    const p = _prog(), rv = _rv(), t = todayKey();
    const due = _concepts.find((/** @type {*} */ x) => rv[x.id] && rv[x.id].due <= t);
    const weak = _concepts.find((/** @type {*} */ x) => p[x.id] && p[x.id].weak && !p[x.id].mastered);
    const undone = _concepts.find((/** @type {*} */ x) => !(p[x.id] && p[x.id].mastered));
    const rec = due || weak || undone;
    if (!rec) return '<p class="wb-scene">모든 개념을 완료했습니다 — 훌륭합니다.</p>';
    const why = rec === due ? '복습할 시간이 된 개념입니다'
        : rec === weak ? '취약 표시된 개념입니다'
        : '처음 배울 개념입니다';
    return `<div class="flow-rec">
        <p class="wb-scene">어디서부터 시작할지 모르시면 추천 개념부터 해보세요</p>
        <p class="flow-rec-why">${why}</p>
        <p class="flow-rec-title">Ch${esc(rec.chapter)} · ${esc(rec.title)}</p>
        <button class="btn btn-primary" data-click="flowRec" data-arg="${esc(rec.id)}">이 개념부터 시작 ▶</button>
        <p class="wb-scene">또는 위에서 직접 개념을 골라도 됩니다</p>
    </div>`;
}
/** 추천 카드 진입 — _selectConcept으로 셀렉트 동기화 후 pick */
/** @param {string} id */
export function flowRec(id) { _selectConcept(id); }

/** 미리풀기 문항 — authored pre 우선, 없으면 은행 태그 문항을 인터랙티브로 */
/** @param {*} c */
function _preItemFor(c) {
    const it = _conceptItems(c, 'pre')[0];
    if (it) return it;
    const key = _bankKeys(c.id)[0];
    const bq = key && (_bank[c.subject] || {})[key];
    return bq ? { id: 'bank:' + key, stem: bq.stem, options: bq.options, answer: bq.answer, rationale: [] } : null;
}

/** 시나리오 문항 — 이번 개념에서 아직 안 본 것 우선 (재도전은 다른 문항) */
/** @param {*} c */
function _scItemFor(c) {
    const pool = _conceptItems(c, 'scenario').concat(_conceptItems(c, 'review'));
    return pool.find((/** @type {*} */ q) => !_scTried.has(q.id)) || null;
}

/** @param {*} q */
function _quizHtml(q) {
    return `<div class="flow-quiz"><div class="flow-stem">${esc(q.stem)}</div>` +
        q.options.map((/** @type {string} */ o, /** @type {number} */ oi) =>
            `<button class="flow-opt" data-click="flowOpt" data-arg="${oi}">${esc(CIRCLED[oi] || '')} ${esc(o)}</button>`).join('') + '</div>';
}

function _resultHtml() {
    const q = _scItem;
    if (!q) return '<p class="wb-scene">표시할 결과가 없습니다.</p>';
    const ai = _ansIdx(q);
    const ok = _lastCorrect === true;
    const verdict = ok ? '정답입니다!'
        : (_scWrong >= MAX_WRONG ? '두 번 연속 아쉬웠어요 — 해설을 읽고 넘어갈게요.' : '아쉬워요 — 같은 개념의 다른 문항으로 한 번 더 풀어봐요.');
    const opts = q.options.map((/** @type {string} */ o, /** @type {number} */ oi) => {
        const mark = oi === ai ? '✅' : (oi === _sel ? '❌' : '▫️');
        return `<p class="wb-scene">${mark} ${esc(o)} — ${esc((q.rationale || [])[oi] || '')}</p>`;
    }).join('');
    const canRetry = !ok && _scWrong < MAX_WRONG && !!_scItemFor(_c);
    const cutSlot = ok ? null : _wrongCutSlot(q);
    return `<div class="flow-verdict ${ok ? 'ok' : 'no'}">${verdict}</div>` + opts
        + (cutSlot ? `<div class="webtoon-reader">${renderSlotHtml(cutSlot, _chars())}</div>` : '')
        + (canRetry ? '<p class="flow-hint">「다음」을 누르면 같은 개념의 다른 문항이 나옵니다.</p>' : '');
}

/** 오답 보기에 연결된 교정 컷 슬롯 (items.cutOnWrong — 오개념을 고른 장면으로 바로 교정). @param {*} q @returns {*} */
function _wrongCutSlot(q) {
    if (!_slots || !q.cutOnWrong) return null;
    const cutId = q.cutOnWrong[_sel];
    if (!cutId) return null;
    return _slots[parseInt(String(cutId).replace(/\D/g, ''), 10) - 1] || null;
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
    _prepStepItem(step, c);
    st.dataset.step = step;
    _renderChrome(pg, back, next, step, c);
    _applyLg(getItem('flow_lg') === '1');
    if (!c) { st.innerHTML = _homeRecHtml(); return; }
    const p = _prog()[c.id] || {};
    const renderer = (/** @type {Object.<string, Function>} */ (_STEP_RENDERERS))[step || ''];
    if (renderer) { st.innerHTML = /** @type {string} */ (renderer(c, p)); return; }
    _renderComplete(st, c);
}

/** 단계별 문항 확정 — pre·scenario 진입 시 미로드 문항을 선택하고 시도 기록. @param {*} step @param {*} c */
function _prepStepItem(step, c) {
    if (!c) return;
    if (step === 'pre') { _preItem = _preItem || _preItemFor(c); return; }
    if (step !== 'scenario') return;
    _scItem = _scItem || _scItemFor(c);
    if (_scItem) _scTried.add(_scItem.id);
}

/** 단계 진행바 + 뒤로/다음 버튼 상태 갱신. @param {Element|null} pg @param {HTMLButtonElement|null} back @param {HTMLButtonElement|null} next @param {*} step @param {*} c */
function _renderChrome(pg, back, next, step, c) {
    if (pg) pg.innerHTML = STEPS.map((/** @type {string} */ s) =>
        `<span class="flow-step${s === step ? ' on' : ''}">${esc((/** @type {Object.<string,string>} */ (STEP_LABELS))[s] || s)}</span>`).join('');
    if (back) back.disabled = _i === 0;
    if (!next) return;
    next.textContent = (/** @type {Object.<string,string>} */ (NEXT_LABEL))[step || ''] || '다음 ▶';
    next.disabled = _nextDisabled(step, c);
}

/** 「다음」 비활성 판정 — 개념 미선택 또는 미응답 문항 대기 중. @param {*} step @param {*} c */
function _nextDisabled(step, c) {
    if (!c) return true;
    if (step === 'pre' && !!_preItem && !_answered) return true;
    return step === 'scenario' && !!_scItem && !_answered;
}

/** @param {*} c @param {*} p */
function _stepHomeHtml(c, p) {
    const status = p.mastered ? '완료 — 정답으로 마쳤어요'
        : p.weak ? '취약 표시 — 다음에 먼저 다시 나와요'
        : p.stage ? `진행 중 — ${(/** @type {Object.<string,string>} */ (STEP_LABELS))[p.stage] || '미시작'}부터 이어합니다`
        : '아직 시작 전';
    return `<div class="wb-scene wb-scene-title">Ch${esc(c.chapter)} · ${esc(c.title)}</div><p class="wb-scene">${esc(status)}</p>`;
}

function _stepPreHtml() {
    if (!_preItem) return '<p class="wb-scene">선행 문항이 없습니다 — 이야기로 넘어가세요.</p>';
    return `<div class="wb-scene wb-scene-title">먼저 풀어볼까요 — 모르면 「모르겠어요」를 눌러도 됩니다</div>${_quizHtml(_preItem)}
        <button class="flow-opt flow-dk" data-click="flowDontKnow">🙋 모르겠어요</button>`;
}

/** @param {*} c @param {*} p */
function _stepStoryHtml(c, p) {
    const slot = _slotFor(c);
    if (!slot) return `<div class="wb-scene wb-scene-title">${esc(c.title)}</div><p class="wb-scene">이 개념에 연결된 이야기 장면이 없습니다.</p>`;
    const dkNote = p.preDk ? '<p class="wb-scene">몰라도 괜찮아요 — 이야기로 쉽게 설명해드릴게요.</p>' : '';
    return dkNote + `<div class="webtoon-reader">${renderSlotHtml(slot, _chars())}</div>`;
}

/** @param {*} c */
function _stepSummaryHtml(c) {
    const key = _conceptItems(c, 'scenario').concat(_conceptItems(c, 'review'))[0];
    const good = key ? key.options[_ansIdx(key)] : '';
    return `<div class="wb-scene wb-scene-title">핵심 요약</div><div class="wb-scene">${esc(c.title)}</div>` +
        (key ? `<p class="wb-scene">포인트 — ${esc(key.stem.slice(0, 80))}… → <b>${esc(good)}</b></p>` : '');
}

/** @param {*} p */
function _stepScenarioHtml(p) {
    // 직전 오답 해설 재확인 — 재도전 문항 위에 접이식으로 노출 (오답 피드백 경로)
    const lw = p.lastWrong;
    const again = lw ? `<details class="flow-again"><summary>방금 문제 해설 보기</summary>
        <p>${esc(lw.stem)}…</p><p class="flow-again-ans">정답 — ${esc(lw.ans)}</p></details>` : '';
    if (!_scItem) return '<p class="wb-scene">시나리오 문항이 없습니다.</p>';
    return again + _quizHtml(_scItem);
}

/** 학습 완료 단계 — 진행 저장·복습 큐 등록 후 완료 화면 렌더. @param {Element} st @param {*} c */
function _renderComplete(st, c) {
    const rec = _prog()[c.id] || {};
    const done = _lastCorrect === true;
    const p2 = _prog();
    if (done) { rec.mastered = true; rec.weak = false; }
    else if (_scWrong >= MAX_WRONG) { rec.weak = true; }
    rec.stage = 'complete'; rec.title = c.title; rec.lastSeen = Date.now();
    p2[c.id] = rec; _save(p2);
    _scheduleReview(c.id); // 개념 완료 → 1·3·7일 복습 큐 등록 (DOC-USR-22 §4)
    const msg = done ? '정답으로 마쳤어요 — 잘하셨습니다.'
        : _scWrong >= MAX_WRONG ? '이 개념은 다음에 먼저 다시 나와요.'
        : '이 개념 학습을 마쳤어요.';
    // 완료 집계 + 다음 복습 예정일 — 효능감(진행 체감) 표시
    const rv = (_rv() || {})[c.id];
    const doneN = Object.values(p2).filter((/** @type {*} */ r) => r && r.mastered).length;
    const leftN = Math.max(0, (_concepts || []).length - doneN);
    const dueTxt = rv ? ` · ${rv.due.slice(5).replace('-', '/')}에 다시 나와요` : '';
    st.innerHTML = `<div class="wb-scene wb-scene-title">학습 완료 — ${esc(c.title)}</div><p class="wb-scene">${esc(msg)}</p>
        <p class="flow-sum">지금까지 ${esc(doneN)}개 완료 · 남은 개념 ${esc(leftN)}개${esc(dueTxt)}</p>
        <button class="btn btn-primary flow-next-concept" data-click="flowNextConcept">다음 개념으로 ▶</button>`;
}

const _STEP_RENDERERS = {
    home: _stepHomeHtml,
    pre: _stepPreHtml,
    story: _stepStoryHtml,
    summary: _stepSummaryHtml,
    scenario: _stepScenarioHtml,
    result: _resultHtml,
};

export function flowBack() { if (_i > 0) { _i--; _render(); } }
export function flowNext() {
    if (_i >= STEPS.length - 1) return;
    const step = STEPS[_i];
    if (step === 'pre' && _preItem) { _nextFromPre(); return; }
    if (step === 'scenario' && _scItem) { _nextFromScenario(); return; }
    if (step === 'result' && _nextRetry()) return;
    _i++;
    _render();
}

/** 미리풀기 다음 — 정답이면 이야기를 건너뛰고 요약으로 (DOC-USR-22 §4 라우팅) */
function _nextFromPre() {
    const correct = !_dk && _sel === _ansIdx(_preItem);
    _rec(_preItem.id || 'pre', _dk ? -1 : _sel, correct, _dk);
    const p = _prog(); const rec = p[_c.id] || {};
    rec.preOk = correct; rec.preDk = !!_dk; rec.lastSeen = Date.now();
    p[_c.id] = rec; _save(p);
    _stage(correct ? 'summary' : 'story');
    _i = STEPS.indexOf(correct ? 'summary' : 'story');
    _resetQ(); _preItem = null;
    _render();
}

/** 시나리오 다음 — 오답 카운트·직전 오답 요약 저장 후 해설 단계로 */
function _nextFromScenario() {
    const correct = _sel === _ansIdx(_scItem);
    _scWrong = correct ? 0 : _scWrong + 1;
    _lastCorrect = correct;
    _rec(_scItem.id, _sel, correct, false);
    const p = _prog(); const rec = p[_c.id] || {};
    rec.attempts = (rec.attempts || 0) + 1; rec.lastSeen = Date.now();
    // 직전 오답 요약 — 재도전 시나리오 상단 재확인용
    rec.lastWrong = correct ? null
        : { stem: String(_scItem.stem).slice(0, 100), ans: _scItem.options[_ansIdx(_scItem)] || '' };
    p[_c.id] = rec; _save(p);
    _stage('result');
    _i = STEPS.indexOf('result');
    _render();
}

/** 오답 재도전 — 같은 개념의 다른 문항 (문항 소진 시 false → 진행). @returns {boolean} */
function _nextRetry() {
    if (_lastCorrect !== false || _scWrong >= MAX_WRONG) return false;
    const nq = _scItemFor(_c);
    if (!nq) return false;
    _scItem = nq; _resetQ();
    _stage('scenario');
    _i = STEPS.indexOf('scenario');
    _render();
    return true;
}

/** 시나리오·미리풀기 보기 클릭 — 위임 핸들러 (data-click="flowOpt") */
/** @param {string|number} idx */
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
/** @param {string} id */
function _selectConcept(id) {
    const cs = _concepts || [];
    const c = cs.find((/** @type {*} */ x) => x.id === id);
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
    const undone = (/** @type {*} */ x) => !(p[x.id] && p[x.id].mastered);
    const next = _concepts.find((/** @type {*} */ x) => x.subject === _c.subject && undone(x))
        || _concepts.find(undone) || _c;
    _selectConcept(next.id);
}

/** 대시보드 큐·진단 온보딩 진입점 — 뷰 전환 후 지정 개념 자동 선택 (이어하기) */
/** @type {string|null} */
let _pendingConcept = null;
/** @param {string} conceptId */
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
    const cs = (await _load()) || [];
    const pick = async () => {
        _c = cs.find((/** @type {*} */ x) => x.id === sel.value) || null;
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
        // 상태 접두 — 진도가 선택 단계에서도 보이게 (✓ 완료 · ↻ 복습 예정 · ! 취약)
        const p = _prog(), rv = _rv(), t = todayKey();
        cs.filter((/** @type {*} */ c) => String(c.subject) === (subjSel.value || '1'))
            .forEach((/** @type {*} */ c) => {
                const r = p[c.id] || {};
                const mark = r.mastered ? '✓ ' : (rv[c.id] && rv[c.id].due <= t ? '↻ ' : (r.weak ? '! ' : ''));
                sel.add(new Option(`${mark}Ch${c.chapter} ${c.title}`, c.id));
            });
    };
    if (!subjSel.options.length) {
        const subs = [...new Set(cs.map((/** @type {*} */ c) => c.subject))].sort();
        if (!subs.length) subs.push(2); // 파일럿 과목만 있어도 셀렉트는 보이게
        subs.forEach((/** @type {*} */ s) => {
            const op = new Option(s === 1 ? '1과목 요양보호론' : '2과목 요양보호 실기', String(s));
            // 개념이 없는 과목도 표시하되, 파일럿 안내를 위해 라벨에 집계 표기
            const n = cs.filter((/** @type {*} */ c) => c.subject === s).length;
            sel && (op.textContent += ` (${n})`);
            subjSel.add(op);
        });
        // 개념이 있는 첫 과목을 기본 선택 — 없는 과목이면 목록이 비어 혼란
        const first = subs.find((/** @type {*} */ s) => cs.some((/** @type {*} */ c) => c.subject === s));
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
