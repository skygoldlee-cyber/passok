// src/exams/carework/views/care-card.js — 상황별 대처 카드 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadCareCards, cardById } from '../care-card.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _cards = [];
let _open = null;

function renderList() {
    const host = $('care-card-list');
    if (!host) return;
    host.innerHTML = _cards.map(c => `
        <button class="care-card-item" data-click="careCardOpen" data-id="${esc(c.id)}">
            <span class="care-card-cat">${esc(c.category)}</span>
            <strong>${esc(c.title)}</strong>
            <span class="care-card-trig">${esc(c.trigger)}</span>
        </button>`).join('');
}

function renderDetail() {
    const host = $('care-card-detail');
    const c = cardById(_cards, _open);
    if (!host) return;
    if (!c) { host.innerHTML = ''; return; }
    host.innerHTML = `
        <div class="care-card-head">
            <span class="care-card-cat">${esc(c.category)}</span>
            <h3>${esc(c.title)}</h3>
            <p class="care-card-trig">${esc(c.trigger)}</p>
        </div>
        ${c.steps.map((s, i) => `
            <div class="care-card-step">
                <span class="care-card-stepno">${i + 1}</span>
                <div><strong>${esc(s.phase)}</strong><p>${esc(s.text)}</p></div>
            </div>`).join('')}
        <button data-click="careCardClose" class="secondary">목록으로</button>`;
}

export function careCardOpen(evt) {
    _open = evt?.currentTarget?.dataset?.id || _open;
    renderDetail();
    const d = $('care-card-detail'); if (d) d.scrollIntoView?.({ behavior: 'smooth' });
}
export function careCardClose() { _open = null; renderDetail(); }

export async function initCareCardView() {
    try {
        _cards = await loadCareCards();
    } catch (e) {
        const host = $('care-card-list');
        if (host) host.innerHTML = '<p class="care-calc-err">카드 데이터를 불러오지 못했습니다.</p>';
        return;
    }
    renderList();
}
