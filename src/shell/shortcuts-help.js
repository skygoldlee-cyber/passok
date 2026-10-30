// src/shortcuts-help.js — 키보드 단축키 도움말 오버레이
// @spec UX-HELP-01
// '?' 키로 전체 단축키 시트를 연다. 목록은 아래 SHORTCUTS 선언이 정본 —
// 신규 단축키 추가 시 여기에 등록해 도움말과 실제 바인딩의 불일치를 방지한다.
import { esc } from '../sanitize.js';
import { trapFocus } from '../ui-utils.js';

/**
 * 단축키 목록 정본 (그룹 → [{keys, desc, view?}]).
 * view는 단축키가 동작하는 뷰 id — 뷰 한정 단축키는 표시를 분리한다.
 */
export const SHORTCUT_GROUPS = [
    {
        title: '전역',
        items: [
            { keys: 'Ctrl/⌘+K', desc: '통합 검색 열기·닫기' },
            { keys: '?', desc: '단축키 도움말 (이 창)' },
            { keys: 'Esc', desc: '오버레이·시트·모달 닫기' },
        ],
    },
    {
        title: '카드 학습',
        view: 'flashcard-view',
        items: [
            { keys: '← →', desc: '이전 · 다음 카드' },
            { keys: 'Space', desc: '카드 뒤집기' },
            { keys: 'E', desc: '쉬움 (기억함)' },
            { keys: 'H', desc: '어려움 (복습 필요)' },
        ],
    },
    {
        title: '퀴즈 · 훈련소',
        view: 'quiz-view',
        items: [
            { keys: '1~5', desc: '객관식 선지 선택' },
            { keys: 'O / P', desc: 'O / X 응답' },
        ],
    },
];

/**
 * 그룹 목록 → 오버레이 본문 HTML (순수 함수 — 테스트 가능).
 * @param {Array<{title:string, items:Array<{keys:string,desc:string}>}>} groups
 */
export function renderShortcutHelpHtml(groups) {
    return groups.map(g => `
        <section class="kbd-help-group">
            <h4>${esc(g.title)}</h4>
            <ul class="kbd-help-list">
                ${g.items.map(i => `<li><kbd>${esc(i.keys)}</kbd><span>${esc(i.desc)}</span></li>`).join('')}
            </ul>
        </section>`).join('');
}

function _buildDom() {
    if (typeof document === 'undefined' || document.getElementById('kbd-help-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'kbd-help-overlay';
    overlay.className = 'cmdk-overlay is-hidden';
    overlay.innerHTML = `
        <div class="cmdk-panel dialog-card kbd-help-panel" role="dialog" aria-modal="true" aria-label="키보드 단축키">
            <div class="kbd-help-head">
                <h3><i class="fa-solid fa-keyboard" aria-hidden="true"></i> 키보드 단축키</h3>
                <button type="button" class="btn btn-secondary btn-sm" data-kbd-help-close aria-label="닫기">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>
            <div class="kbd-help-body">${renderShortcutHelpHtml(SHORTCUT_GROUPS) /*esc-ok — 레지스트리 상수를 esc() 처리해 조립한 HTML*/}</div>
            <div class="cmdk-footer">
                <span><kbd>?</kbd><kbd>Esc</kbd> 닫기</span>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
        if (e.target === overlay || (/** @type {Element|null} */ (e.target))?.closest('[data-kbd-help-close]')) {
            closeShortcutHelp();
        }
    });
}

export function isShortcutHelpOpen() {
    const el = typeof document !== 'undefined' && document.getElementById('kbd-help-overlay');
    return !!(el && !el.classList.contains('is-hidden'));
}

export function openShortcutHelp() {
    if (typeof document === 'undefined') return;
    _buildDom();
    const overlay = document.getElementById('kbd-help-overlay');
    if (!overlay) return;
    overlay.classList.remove('is-hidden');
    trapFocus(overlay);
    const closeBtn = overlay.querySelector('[data-kbd-help-close]');
    if (closeBtn) /** @type {HTMLElement} */ (closeBtn).focus();
}

export function closeShortcutHelp() {
    const overlay = typeof document !== 'undefined' && document.getElementById('kbd-help-overlay');
    if (overlay) overlay.classList.add('is-hidden');
}

/** 전역 바인딩 — '?' (Shift+/) 로 열기. 입력 필드·수식키 조합에서는 동작하지 않는다. */
export function initShortcutHelp() {
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tgt = /** @type {HTMLElement|null} */ (e.target);
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
        if (e.key === '?') {
            e.preventDefault();
            if (isShortcutHelpOpen()) closeShortcutHelp(); else openShortcutHelp();
        } else if (e.key === 'Escape' && isShortcutHelpOpen()) {
            closeShortcutHelp();
        }
    });
}
