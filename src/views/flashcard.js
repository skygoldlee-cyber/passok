// src/views/flashcard.js - 플래시카드 뷰 로직
// @spec F-01~10,A-02
import { state } from '../state.js';
import { safeTextWithBreaks } from '../sanitize.js';
import { shuffle } from '../utils.js';
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
        cards = cards.filter(c => c.isKey);
    }
    if (fcConfig.difficultyFilter && fcConfig.difficultyFilter !== 'all') {
        cards = cards.filter(c => c.difficulty === fcConfig.difficultyFilter);
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

/**
 * 현재 플래시카드를 화면에 렌더링하고 상태를 업데이트합니다.
 */
export function renderFlashcard() {
    const fcConfig = state.flashcards;
    const cardEl = document.getElementById('flashcard-item');
    if (!cardEl) return;

    // 카드 뒤집힌 상태 원복
    cardEl.classList.remove('flipped');

    const termEl = document.getElementById('card-front-term');
    const defEl = document.getElementById('card-back-definition');
    const frontCatEl = document.getElementById('card-front-category');
    const backCatEl = document.getElementById('card-back-category');
    const frontTypeEl = document.getElementById('card-front-type');
    const backTypeEl = document.getElementById('card-back-type');
    const starEl = document.getElementById('card-front-star');
    const curIdxEl = document.getElementById('fc-current-index');
    const totalEl = document.getElementById('fc-total-count');
    const tipWrapEl = document.getElementById('card-tip-container');
    const tipEl = document.getElementById('card-back-tip');

    if (fcConfig.data.length === 0) {
        if (termEl) termEl.textContent = "조건에 맞는 카드가 없습니다.";
        if (defEl) defEl.textContent = "과목을 바꾸거나 필터를 조정해 보세요.";
        if (frontCatEl) frontCatEl.textContent = "공백";
        if (backCatEl) backCatEl.textContent = "공백";
        if (frontTypeEl) frontTypeEl.textContent = '';
        if (backTypeEl) backTypeEl.textContent = '';
        if (starEl) starEl.classList.remove('active');
        if (curIdxEl) curIdxEl.textContent = '0';
        if (totalEl) totalEl.textContent = '0';
        if (tipWrapEl) tipWrapEl.hidden = true;
        return;
    }

    const card = fcConfig.data[fcConfig.currentIndex];

    // 마크업 데이터 주입
    if (termEl) termEl.textContent = card.term;
    if (defEl) defEl.innerHTML = safeTextWithBreaks(card.definition);
    // 카드팁 오버레이 (AI-12) — 리뷰된 암기팁이 있으면 정의 아래 표시
    if (tipWrapEl && tipEl) {
        tipEl.textContent = card.tip || '';
        tipWrapEl.hidden = !card.tip;
    }
    if (frontCatEl) frontCatEl.textContent = card.category || '';
    if (backCatEl) backCatEl.textContent = card.category || '';

    // 카드 타입 배지 표시
    const typeLabel = card.cardType ? (CARD_TYPE_LABELS[card.cardType] || card.cardType) : '';
    if (frontTypeEl) {
        frontTypeEl.textContent = typeLabel;
        frontTypeEl.setAttribute('data-type', card.cardType || 'definition');
        frontTypeEl.classList.toggle('is-hidden', !typeLabel);
    }
    if (backTypeEl) {
        backTypeEl.textContent = typeLabel;
        backTypeEl.setAttribute('data-type', card.cardType || 'definition');
        backTypeEl.classList.toggle('is-hidden', !typeLabel);
    }

    // 기출 표시 제어
    if (starEl) {
        if (card.isKey) {
            starEl.classList.add('active');
            starEl.classList.remove('is-hidden');
        } else {
            starEl.classList.remove('active');
            starEl.classList.add('is-hidden');
        }
    }

    // 인덱스 상태 갱신
    if (curIdxEl) curIdxEl.textContent = String(fcConfig.currentIndex + 1);
    if (totalEl) totalEl.textContent = String(fcConfig.data.length);

    // 외움/헷갈림 카드 카운트 표시 (현재 필터된 카드 기준)
    const memorizedCount = fcConfig.data.filter(c => state.memorizedCards.has(c.id)).length;
    const weakCount = fcConfig.data.filter(c => state.weakCards.has(c.id)).length;
    const memBadge = document.getElementById('fc-memorized-badge');
    const memCountEl = document.getElementById('fc-memorized-count');
    const weakBadge = document.getElementById('fc-weak-badge');
    const weakCountEl = document.getElementById('fc-weak-count');
    if (memBadge) { memBadge.classList.toggle('is-hidden', memorizedCount === 0); }
    if (memCountEl) memCountEl.textContent = String(memorizedCount);
    if (weakBadge) { weakBadge.classList.toggle('is-hidden', weakCount === 0); }
    if (weakCountEl) weakCountEl.textContent = String(weakCount);

    // 진도 버튼들 스타일 동적 제어 (ROAD-L7 — 4버튼: 마지막 등급 강조, 레거시 상태는 약점→다시·외움→쉬움에 매핑)
    const RATE_BTNS = ['fc-again-btn', 'fc-hard-btn', 'fc-good-btn', 'fc-easy-btn'];
    const { intervals, lastRating } = previewCardReview(card.id);
    RATE_BTNS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const ivEl = document.getElementById(`${id.slice(0, -4)}-interval`);
        if (ivEl) ivEl.textContent = `${intervals[i]}일`;
        const active = lastRating ? lastRating === i + 1
            : (state.weakCards.has(card.id) ? i === 0
                : state.memorizedCards.has(card.id) ? i === 3 : false);
        el.style.opacity = active ? '1' : '0.75';
        el.style.boxShadow = active ? '0 0 10px var(--success-tint-40)' : 'none';
    });
}
