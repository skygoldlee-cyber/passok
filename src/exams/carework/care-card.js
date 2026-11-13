// src/exams/carework/care-card.js — 상황별 대처 카드 데이터
// @spec none — 시험 전용 도메인 데이터 (DA-13)
// 카드 본문은 content/exams/carework/실무/care_cards.json — 정적 데이터 번들
/** @type {*[]|null} */
let _cards = null;

export async function loadCareCards() {
    if (_cards) return _cards;
    const res = await fetch('./content/exams/carework/실무/care_cards.json');
    if (!res.ok) throw new Error(`care_cards ${res.status}`);
    _cards = (await res.json()).cards;
    return _cards;
}

/** @param {*[]} cards @param {string} id */
export function cardById(cards, id) {
    return (cards || []).find((/** @type {*} */ c) => c.id === id) || null;
}
