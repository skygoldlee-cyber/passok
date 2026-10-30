// command-palette.js — 통합 검색 팔레트 (Ctrl+K)
// @spec UX-NAV-06
// 뷰 이동·교재 섹션·성분 사전·문제집을 하나의 검색창에서 찾아 실행한다.
// (카드·퀴즈는 착지점이 '매치 항목'이 아닌 과목 학습 첫 화면 — 셔플·10문 추출로
//  정밀 착지가 불가하므로 검색 범위에서 제외. 본문 커버리지는 하단 전수검색 브리지가 담당)
// 모든 데이터는 로컬(window.STUDY_DATA/INGREDIENTS_DATA/DataLoader.registry) — 오프라인 완전 동작.

import { esc } from '../sanitize.js';
import { getChosung } from '../utils.js';
import { contentPath, hasFeature } from '../exam-context.js';
import { SemanticIndex } from '../search/semantic-index.js';
import { gotoOxDrill } from '../views/trainer-drills.js';
import { DataLoader } from '../content/data-loader.js';
import { openSubjectSection } from '../views/textbook-reader.js';
import { collectTextbookSections } from '../search/search-sources.js';
import { getReaderNotes } from '../study/reader-notes.js';
import { setTextbookSearchQuery } from '../views/textbook-search.js';
import { dictState } from '../views/dictionary.js';
import { trackAction } from '../telemetry/usage-stats.js';

const MAX_PER_GROUP = 5;
const MAX_TOTAL = 24;

/** 팔레트 검색 범위 라벨 — 지식DB 사전은 피처 보유 시험만 노출, 라벨은 시험 uiText 해석 (도메인 무관) */
function _scopeLabel() {
    const parts = ['화면', '교재'];
    if (hasFeature('dictionary')) {
        const reg = /** @type {any} */ (DataLoader.registry) || {};
        parts.push((reg.uiText && reg.uiText.dictionary && reg.uiText.dictionary.title) || '사전');
    }
    parts.push('문제집');
    return parts.join('·');
}

let _open = false;
let _activeIdx = 0;
let _results = [];
/** 과목 데이터 백그라운드 로드 진행 중 중복 방지 */
let _studyWarmPromise = null;

/**
 * 팔레트는 어느 뷰에서나 열 수 있어 STUDY_DATA가 미로드일 수 있다 —
 * 미로드 과목을 백그라운드로 채우고, 채워진 과목 수를 resolve한다.
 * 콜드스타트에서 교재 섹션 결과가 조용히 누락되는 것을 방지.
 */
const _warmedKeys = new Set();

function _warmStudyData() {
    if (_studyWarmPromise) return _studyWarmPromise;
    const loaded = (typeof window !== 'undefined' && window.STUDY_DATA) || {};
    // 키당 1회만 시도 — 로드 실패 과목이 매 렌더마다 재시도·재렌더 루프를 만들지 않게 한다
    const missing = DataLoader.getSubjectList()
        .filter(s => s && s.key && !loaded[s.key] && !_warmedKeys.has(s.key));
    if (!missing.length) return Promise.resolve(0);
    missing.forEach(s => _warmedKeys.add(s.key));
    _studyWarmPromise = Promise.all(
        missing.map(s => DataLoader.loadSubject(s.key).catch(() => null))
    ).then(() => {
        _studyWarmPromise = null;
        return missing.length;
    }).catch(() => { _studyWarmPromise = null; return 0; });
    return _studyWarmPromise;
}

/* ---------- 검색 소스 수집 ---------- */

/** 활성 시험에서 보이는 뷰 목록 — 사이드바 nav-item을 스캔해 feature 게이팅(is-hidden)을 그대로 반영한다 */
function getViewItems() {
    const seen = new Map();
    document.querySelectorAll('.nav-item[data-target]').forEach(node => {
        const el = /** @type {HTMLElement} */ (node);
        const target = el.dataset.target;
        if (!target || seen.has(target) || el.classList.contains('is-hidden')) return;
        seen.set(target, el.textContent.trim());
    });
    return [...seen.entries()].map(([target, label]) => ({ target, label }));
}

function _subjects() {
    const data = (typeof window !== 'undefined' && window.STUDY_DATA) || {};
    return Object.keys(data);
}

/** 검색어를 소문자 토큰 배열로 정규화 */
function _terms(query) {
    return (query || '').toLowerCase().split(/\s+/).filter(Boolean);
}

/** 모든 토큰이 대상 텍스트에 포함되면 점수 반환 (제목 접두 매칭 가산점) */
function _matchScore(text, title, terms) {
    const hay = (text || '').toLowerCase();
    if (!terms.every(t => hay.includes(t))) return -1;
    const t = (title || '').toLowerCase();
    return t.startsWith(terms[0]) ? 2 : t.includes(terms[0]) ? 1 : 0;
}

/**
 * 통합 검색 — 유형별 그룹 결과를 반환한다 (순수 함수, 테스트 가능).
 * @param {string} query
 * @param {Object} [sources] - 테스트 주입용 {views, studyData, ingredients, exams}
 * @returns {Array<{type:string,icon:string,title:string,sub:string,action:Object,score:number}>}
 */
export function searchAll(query, sources) {
    const terms = _terms(query);
    if (!terms.length) return [];
    const src = sources || {};
    const studyData = src.studyData || ((typeof window !== 'undefined' && window.STUDY_DATA) || {});
    const ingredients = src.ingredients || DataLoader.getKnowledgeItems();
    const registry = src.registry || DataLoader.registry || {};
    const views = src.views || (typeof document !== 'undefined' ? getViewItems() : []);
    const groups = { view: [], section: [], note: [], ingredient: [], exam: [] };
    const push = (type, item) => { if (groups[type].length < MAX_PER_GROUP) groups[type].push(item); };

    // 1) 뷰 바로가기
    views.forEach(v => {
        const s = _matchScore(v.label, v.label, terms);
        if (s >= 0) push('view', {
            type: 'view', icon: 'fa-arrow-right', title: v.label, sub: '화면 이동',
            action: { kind: 'view', target: v.target }, score: s + 2
        });
    });

    // 2) 과목 콘텐츠 — 교재 섹션 (카드·퀴즈는 매치 항목으로 착지 불가 → 범위 제외)
    // 수집·리더 이동 목적지 해석은 검색 소스 프로바이더(search-sources.js)가 담당 (TS-18)
    for (const e of collectTextbookSections(studyData)) {
        const s = _matchScore(`${e.title} ${e.crumb || ''}`, e.title, terms);
        if (s >= 0) {
            const [subject, gotoTitle, chAnchor] = e.nav.goto;
            push('section', {
                type: 'section', icon: 'fa-book-open', title: gotoTitle,
                sub: `${e.subjName || subject} · ${e.crumb || '교재'}`,
                action: { kind: 'section', subject, title: gotoTitle, anchor: chAnchor },
                score: s + 1
            });
        }
    }

    // 3) 지식DB 사전 (초성 검색 지원 — 자모 쿼리는 getChosung 통과 후 substring 매칭)
    const dictLabel = (registry.uiText && registry.uiText.dictionary && registry.uiText.dictionary.title) || '사전';
    ingredients.forEach(ing => {
        const name = (ing.name || '').toLowerCase();
        const eng = (ing.engName || '').toLowerCase();
        const chosung = getChosung(ing.name || '');
        const hit = terms.every(t => name.includes(t) || eng.includes(t) || chosung.includes(getChosung(t)));
        if (hit) push('ingredient', {
            type: 'ingredient', icon: 'fa-flask', title: ing.name,
            sub: ing.category ? `${dictLabel} · ${ing.category}` : dictLabel,
            action: { kind: 'ingredient', name: ing.name }, score: name.startsWith(terms[0]) ? 2 : 1
        });
    });

    // 4) 문제집/기출 파일
    (registry.exams || []).forEach(exam => {
        const s = _matchScore(`${exam.title} ${exam.file}`, exam.title, terms);
        if (s >= 0) push('exam', {
            type: 'exam', icon: 'fa-file-lines', title: exam.title,
            sub: '예상 문제집 열기',
            action: { kind: 'exam', path: `문제은행/${exam.file}` }, score: s
        });
    });

    // 5) 교재 섹션 메모 (TR-30) — 메모 본문+섹션 제목 매칭 → 해당 섹션으로 이동
    const notes = src.notes || getReaderNotes();
    for (const n of Object.values(notes)) {
        if (!n || !n.note) continue;
        const s = _matchScore(`${n.title || ''} ${n.note}`, n.title || '', terms);
        if (s >= 0) push('note', {
            type: 'note', icon: 'fa-note-sticky', title: n.title || '섹션 메모',
            sub: `메모 · ${n.note.slice(0, 50)}`,
            action: { kind: 'note', subject: n.subject, title: n.title }, score: s
        });
    }

    // 그룹 내 점수 정렬 후 플랫화 — 뷰·섹션·성분·문제집 순
    const order = ['view', 'section', 'note', 'ingredient', 'exam'];
    const flat = [];
    order.forEach(type => {
        groups[type].sort((a, b) => b.score - a.score);
        flat.push(...groups[type]);
    });
    const results = flat.slice(0, MAX_TOTAL);

    // 본문 전수검색 브리지 — 팔레트는 섹션 "제목"만 인덱스하므로, 본문에서 찾아야 하는
    // 쿼리는 항상 이 항목으로 교재 본문검색(역색인) 뷰에 넘긴다. 결과가 있어도 항상 맨 아래 표시.
    // 전수검색 뷰의 탐색 범위·순서는 교재 → 참조자료 → 문제은행 (TS-11/TS-12).
    results.push({
        type: 'fulltext', icon: 'fa-magnifying-glass',
        title: `교재·참조자료·문제은행에서 "${query}" 전체 검색`, sub: '교재 본문·참조자료·문제은행 전수 검색 (제목 매칭만으로는 못 찾는 내용)',
        action: { kind: 'fulltext', query: (query || '').trim() }, score: 0
    });
    return results;
}

/* ---------- 팔레트 UI ---------- */

const TYPE_LABELS = {
    view: '화면', section: '교재', note: '메모', ingredient: '사전', exam: '문제집',
    stmt: '의미 유사 진술', fulltext: '본문 검색'
};

/** 그룹 라벨 — ingredient는 활성 시험의 사전명(uiText.dictionary.title)으로 해석 */
function _typeLabel(type) {
    if (type === 'ingredient') {
        const reg = /** @type {any} */ ((typeof DataLoader !== 'undefined' && DataLoader.registry) || {});
        const t = reg.uiText && reg.uiText.dictionary;
        return (t && t.title) || TYPE_LABELS.ingredient;
    }
    return TYPE_LABELS[type] || type;
}

function _buildDom() {
    if (typeof document === 'undefined' || document.getElementById('cmdk-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'cmdk-overlay';
    overlay.className = 'cmdk-overlay is-hidden';
    overlay.innerHTML = `
        <div class="cmdk-panel dialog-card" role="dialog" aria-modal="true" aria-label="통합 검색">
            <div class="cmdk-input-row">
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                <input id="cmdk-input" type="text" autocomplete="off" spellcheck="false"
                    placeholder="검색: ${esc(_scopeLabel())}" aria-label="통합 검색어">
                <kbd>ESC</kbd>
            </div>
            <div id="cmdk-results" class="cmdk-results" role="listbox"></div>
            <div class="cmdk-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> 이동</span>
                <span><kbd>Enter</kbd> 선택</span>
                <span><kbd>Ctrl+K</kbd> 열기/닫기</span>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeCommandPalette(); });

    const input = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#cmdk-input'));
    if (!input) return;
    input.addEventListener('input', () => _renderResults(input.value));
    input.addEventListener('keydown', ev => {
        const e = /** @type {KeyboardEvent} */ (ev);
        if (e.key === 'ArrowDown') { e.preventDefault(); _moveActive(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); _moveActive(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); executePaletteResult(_activeIdx); }
        else if (e.key === 'Escape') { e.preventDefault(); closeCommandPalette(); }
    });
}

function _renderResults(query) {
    const box = document.getElementById('cmdk-results');
    if (!box) return;
    _activeIdx = 0;
    box.scrollTop = 0; // 결과 재구성 시 이전 스크롤 잔류로 목록 상단이 잘리는 것 방지

    // 콜드스타트: 과목 데이터가 미로드면 백그라운드 로드 후 같은 쿼리로 갱신
    _warmStudyData().then(added => {
        const inputEl = /** @type {HTMLInputElement|null} */ (document.getElementById('cmdk-input'));
        if (added && _open && inputEl && inputEl.value === query) _renderResults(query);
    });

    if (!(query || '').trim()) {
        _results = [];
        box.innerHTML = `<div class="cmdk-hint">검색어를 입력하면 ${esc(_scopeLabel())}을(를) 한 번에 찾습니다.</div>`;
        return;
    }

    _results = searchAll(query);
    _maybeAppendSemantic(query); // 어휘 결과와 무관하게 의미 검색은 항상 시도 (비동기 지연 로드)
    if (!_results.length) {
        box.innerHTML = `<div class="cmdk-hint">"${esc(query)}"에 대한 결과가 없습니다.</div>`;
        return;
    }
    _renderRows(box);
}

/** 결과 행 렌더 — 동기 결과와 비동기 의미 그룹 추가 시 재사용 */
function _renderRows(box) {
    let lastType = '';
    box.innerHTML = _results.map((r, i) => {
        const header = r.type !== lastType
            ? `<div class="cmdk-group-label">${_typeLabel(r.type)}</div>` : '';
        lastType = r.type;
        return `${header}
            <button type="button" class="cmdk-item${i === 0 ? ' is-active' : ''}" role="option"
                data-click="executePaletteResult" data-arg="${i}" data-idx="${i}">
                <i class="fa-solid ${r.icon}" aria-hidden="true"></i>
                <span class="cmdk-item-text">
                    <span class="cmdk-item-title">${esc(r.title)}</span>
                    <span class="cmdk-item-sub">${esc(r.sub)}</span>
                </span>
            </button>`;
    }).join('');
}

// 의미 검색 재진입 제어 — 쿼리가 바뀌면 진행 중인 지연 로드 결과를 무효화한다
let _semToken = 0;

/**
 * 의미 유사 그룹 (SEM-08 v1 앵커 프록시) — semantic 피처 시험에서만.
 * neighbors 번들을 지연 로드해 쿼리 앵커의 의미 이웃을 'stmt' 그룹으로 뒤에 붙인다.
 * 비동기 도착이므로 도착 시점에 같은 쿼리인지 검증 후 _results에 삽입·재렌더.
 */
function _maybeAppendSemantic(query) {
    if (!SemanticIndex.isEnabled() || (query || '').trim().length < 2) return;
    const token = ++_semToken;
    SemanticIndex.ensureLoaded().then(ok => {
        if (!ok || token !== _semToken || !_open) return;
        const input = /** @type {HTMLInputElement|null} */ (document.getElementById('cmdk-input'));
        if (!input || input.value !== query) return;
        const existing = new Set(_results.filter(r => r.type === 'stmt').map(r => r.action.sid));
        const fresh = SemanticIndex.searchByText(query, 4)
            .filter(h => h.key.startsWith('stmt:') && !existing.has(h.key.slice(5)))
            .map(h => ({
                type: 'stmt', icon: 'fa-wand-magic-sparkles', title: h.text,
                sub: `유사도 ${Math.round(h.score * 100)}%${h.anchorText ? ` · 앵커: ${h.anchorText.slice(0, 40)}` : ''}`,
                action: { kind: 'stmt', sid: h.key.slice(5) }, score: 0
            }));
        if (!fresh.length) return;
        const ftIdx = _results.findIndex(r => r.type === 'fulltext');
        _results.splice(ftIdx === -1 ? _results.length : ftIdx, 0, ...fresh);
        const box = document.getElementById('cmdk-results');
        if (box) _renderRows(box);
    }).catch(() => { /* noop — 의미 그룹 실패는 어휘 결과에 영향 없음 */ });
}

function _moveActive(delta) {
    if (!_results.length) return;
    _activeIdx = (_activeIdx + delta + _results.length) % _results.length;
    const items = document.querySelectorAll('#cmdk-results .cmdk-item');
    items.forEach(node => /** @type {HTMLElement} */ (node).classList.toggle('is-active', +(/** @type {HTMLElement} */ (node).dataset.idx || '') === _activeIdx));
    const active = document.querySelector(`#cmdk-results .cmdk-item[data-idx="${_activeIdx}"]`);
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
}

export function openCommandPalette() {
    _buildDom();
    const overlay = document.getElementById('cmdk-overlay');
    if (!overlay) return;
    _open = true;
    overlay.classList.remove('is-hidden');
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById('cmdk-input'));
    if (!input) return;
    input.value = '';
    trackAction('command_palette');
    _renderResults('');
    input.focus();
}

export function closeCommandPalette() {
    _open = false;
    const overlay = document.getElementById('cmdk-overlay');
    if (overlay) overlay.classList.add('is-hidden');
}

function toggleCommandPalette() {
    if (_open) closeCommandPalette(); else openCommandPalette();
}

/** 검색 결과 실행 — 유형별로 기존 앱 진입 경로를 재사용한다 */
export function executePaletteResult(idx) {
    const r = _results[idx];
    if (!r) return;
    closeCommandPalette();
    const a = r.action;
    const clickNav = target => {
        const btn = document.querySelector(`.nav-item[data-target="${target}"]`)
            || document.querySelector(`.mobile-tab-item[data-target="${target}"]`);
        if (btn) /** @type {HTMLElement} */ (btn).click();
    };
    switch (a.kind) {
        case 'view':
            clickNav(a.target);
            break;
        case 'section': {
            clickNav('textbook-reader-view');
            const paletteInput = /** @type {HTMLInputElement|null} */ (document.getElementById('cmdk-input'));
            openSubjectSection(a.subject, a.title, a.anchor || '',
                { query: (paletteInput && paletteInput.value || '').trim() });
            break;
        }
        case 'ingredient':
            dictState.query = a.name;
            dictState.filter = 'all';
            clickNav('dictionary-view');
            break;
        case 'exam': {
            if (window.ExamViewer && window.ExamViewer.openExam) {
                // 문제집은 문서 단위 진입점 — 매치 라인이 없으므로 검색어를 넘겨
                // 첫 매치 위치로 스크롤한다 (문서 상단 착지 방지)
                const paletteInput = /** @type {HTMLInputElement|null} */ (document.getElementById('cmdk-input'));
                window.ExamViewer.openExam(contentPath(a.path), null,
                    (paletteInput && paletteInput.value || '').trim());
            }
            break;
        }
        case 'note':
            // 섹션 메모 → 해당 교재 섹션으로 이동 (TR-30)
            clickNav('textbook-reader-view');
            openSubjectSection(a.subject, a.title, '');
            break;
        case 'fulltext':
            setTextbookSearchQuery(a.query);
            clickNav('textbook-view');
            break;
        case 'stmt':
            // 의미 유사 진술 → 해당 진술 O/X 드릴로 즉시 착지 (기존 드릴 경로 재사용)
            gotoOxDrill(`sid:${a.sid}`);
            break;
    }
}

/** 전역 키 바인딩 — Ctrl/Cmd+K로 열기·닫기 (입력 필드에서도 동작) */
export function initCommandPalette() {
    if (typeof document === 'undefined') return;
    _buildDom();
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleCommandPalette();
        }
    });
}
