// src/views/flashcard.js - 플래시카드 뷰 로직
// @spec F-01~10,A-02
import { state } from '../core/state.js';
import { byId, setTextById, setHtml, toggleCls, showEl } from '../core/dom.js';
import { safeTextWithBreaks } from '../core/sanitize.js';
import { shuffle } from '../core/utils.js';
import { getDueCards, previewCardReview } from '../study/spaced-repetition.js';

const CARD_TYPE_LABELS = {
    penalty: '처벌',
    prohibition: '금지',
    exception: '예외',
    number: '숫자',
    requirement: '요건',
    comparison: '비교',
    procedure: '절차',
    definition: '개념'
};

/**
 * 플래시카드 데이터를 로드하고 필터링 상태를 설정합니다.
 */
export function loadFlashcards() {
    const fcConfig = state.flashcards;

    // 지정 id 세션 — 시험 전 최종 인출 등 임의 카드 집합을 지정 순서로 출제 (1회 적용 후 해제, D-19)
    if (fcConfig.onlyIds) {
        const order = new Map(fcConfig.onlyIds.map((id, i) => [id, i]));
        fcConfig.onlyIds = null;
        const picked = Object.values(window.STUDY_DATA || {})
            .flatMap(d => (d && d.cards) || [])
            .filter(c => order.has(c.id))
            .sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0));
        if (picked.length) {
            fcConfig.data = picked;
            fcConfig.currentIndex = 0;
            renderFlashcard();
            return;
        }
    }

    // 오늘 복습 모드 — FSRS due 카드를 전 과목에서 합산 출제 (1회 적용 후 해제)
    if (fcConfig.dueOnly) {
        fcConfig.dueOnly = false;
        const dueSet = new Set(getDueCards());
        const dueCards = Object.values(window.STUDY_DATA || {})
            .flatMap(d => (d && d.cards) || [])
            .filter(c => dueSet.has(c.id));
        if (dueCards.length) {
            fcConfig.data = shuffle(dueCards);
            fcConfig.currentIndex = 0;
            renderFlashcard();
            return;
        }
    }

    const subjData = (window.STUDY_DATA && fcConfig.subject != null ? window.STUDY_DATA[fcConfig.subject] : undefined);
    if (!subjData) return;

    // 카드 필터링
    let cards = subjData.cards;
    if (fcConfig.keyOnly) {
        cards = cards.filter((/** @type {*} */ c) => c.isKey);
    }
    if (fcConfig.difficultyFilter && fcConfig.difficultyFilter !== 'all') {
        cards = cards.filter((/** @type {*} */ c) => c.difficulty === fcConfig.difficultyFilter);
    }

    // 중요도 내림차순 정렬 (기본) 또는 랜덤 셔플
    if (fcConfig.shuffle) {
        cards = shuffle(cards);
    } else if (fcConfig.sortBy === 'importance') {
        cards = [...cards].sort((a, b) => (b.importance || 0) - (a.importance || 0));
    }

    fcConfig.data = cards;

    // 인덱스 범위 초과 방지
    if (fcConfig.currentIndex >= cards.length) {
        fcConfig.currentIndex = Math.max(0, cards.length - 1);
    }

    renderFlashcard();
}

/** 카드 데이터 없음 상태 렌더 */
function renderEmptyCardState() {
    setTextById('card-front-term', '조건에 맞는 카드가 없습니다.');
    setTextById('card-back-definition', '과목을 바꾸거나 필터를 조정해 보세요.');
    setTextById('card-front-category', '공백');
    setTextById('card-back-category', '공백');
    setTextById('card-front-type', '');
    setTextById('card-back-type', '');
    const starEl = byId('card-front-star');
    if (starEl) starEl.classList.remove('active');
    setTextById('fc-current-index', '0');
    setTextById('fc-total-count', '0');
    showEl(byId('card-tip-container'), false);
}

/** 카드 타입 배지 표시 (앞·뒷면 동일) @param {*} card */
function renderCardTypeBadges(card) {
    const typeLabel = card.cardType ? (CARD_TYPE_LABELS[/** @type {keyof CARD_TYPE_LABELS} */ (card.cardType)] || card.cardType) : '';
    for (const id of ['card-front-type', 'card-back-type']) {
        const el = byId(id);
        if (!el) continue;
        el.textContent = typeLabel;
        el.setAttribute('data-type', card.cardType || 'definition');
        el.classList.toggle('is-hidden', !typeLabel);
    }
}

/** @param {*} fcConfig */
function renderCardCounters(fcConfig) {
    setTextById('fc-current-index', String(fcConfig.currentIndex + 1));
    setTextById('fc-total-count', String(fcConfig.data.length));

    // 외움/헷갈림 카드 카운트 표시 (현재 필터된 카드 기준)
    const memorizedCount = fcConfig.data.filter((/** @type {*} */ c) => state.memorizedCards.has(c.id)).length;
    const weakCount = fcConfig.data.filter((/** @type {*} */ c) => state.weakCards.has(c.id)).length;
    toggleCls(byId('fc-memorized-badge'), 'is-hidden', memorizedCount === 0);
    setTextById('fc-memorized-count', String(memorizedCount));
    toggleCls(byId('fc-weak-badge'), 'is-hidden', weakCount === 0);
    setTextById('fc-weak-count', String(weakCount));
}

/** 진도 버튼들 스타일 동적 제어 (ROAD-L7 — 4버튼: 마지막 등급 강조, 레거시 상태는 약점→다시·외움→쉬움에 매핑) @param {*} card */
function renderRateButtons(card) {
    const RATE_BTNS = ['fc-again-btn', 'fc-hard-btn', 'fc-good-btn', 'fc-easy-btn'];
    const { intervals, lastRating } = previewCardReview(card.id);
    RATE_BTNS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const ivEl = document.getElementById(`${id.slice(0, -4)}-interval`);
        if (ivEl) ivEl.textContent = `${intervals[i] ?? 0}일`;
        const active = lastRating ? lastRating === i + 1
            : (state.weakCards.has(card.id) ? i === 0
                : state.memorizedCards.has(card.id) ? i === 3 : false);
        el.style.opacity = active ? '1' : '0.75';
        el.style.boxShadow = active ? '0 0 10px var(--success-tint-40)' : 'none';
    });
}

/**
 * 현재 플래시카드를 화면에 렌더링하고 상태를 업데이트합니다.
 */
export function renderFlashcard() {
    const fcConfig = state.flashcards;
    const cardEl = document.getElementById('flashcard-item');
    if (!cardEl) return;

    // 카드 뒤집힌 상태 원복
    cardEl.classList.remove('flipped');

    if (fcConfig.data.length === 0) { renderEmptyCardState(); return; }

    const card = fcConfig.data[fcConfig.currentIndex];
    if (!card) return;

    // 마크업 데이터 주입
    setTextById('card-front-term', card.term);
    setHtml(byId('card-back-definition'), safeTextWithBreaks(card.definition));
    // 카드팁 오버레이 (AI-12) — 리뷰된 암기팁이 있으면 정의 아래 표시
    setTextById('card-back-tip', card.tip || '');
    showEl(byId('card-tip-container'), !!card.tip);
    setTextById('card-front-category', card.category || '');
    setTextById('card-back-category', card.category || '');

    renderCardTypeBadges(card);
    // 기출 표시 제어
    const starEl = byId('card-front-star');
    if (starEl) {
        starEl.classList.toggle('active', !!card.isKey);
        starEl.classList.toggle('is-hidden', !card.isKey);
    }

    renderCardCounters(fcConfig);
    renderRateButtons(card);
}
