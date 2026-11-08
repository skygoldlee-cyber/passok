// src/exams/carework/views/care-card.js — 상황별 대처 카드 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadCareCards, cardById } from '../care-card.js';
import { setJSON } from '../../../core/storage.js';
import { STORAGE_KEYS } from '../../../core/storage-keys.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _cards = [];
let _open = null;

function renderList() {
    const host = $('care-card-list');
    if (!host) return;
    host.innerHTML = _cards.map(c => `
        <button class="care-card-item" data-click="careCardOpen" data-arg="${esc(c.id)}">
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
        <div class="care-calc-actions">
            <button data-click="careCardToIncident" data-arg="${esc(c.id)}" class="btn">📝 사고보고서 작성</button>
            <button data-click="careCardClose" class="btn btn-secondary">목록으로</button>
        </div>`;
}

export function careCardOpen(id) {
    _open = id || _open;
    renderDetail();
    const d = $('care-card-detail'); if (d) d.scrollIntoView?.({ behavior: 'smooth' });
}
export function careCardClose() { _open = null; renderDetail(); }

// 카드 → 사고보고서 유형 매핑 — 이벤트 발생 시 사고보고서에 상황을 선기입으로 연결
const CARD_INCIDENT_TYPE = {
    'fall': 'fall',                    // 낙상 발생 → 낙상
    'pressure-ulcer': 'pressure',      // 욕창 발견 → 욕창
    'bpsd-wander': 'missing',          // 배회·소실 → 배회·실종
    'bpsd-aggression': 'injury',       // 공격적 언행 → 외상·부상
    'emergency': 'other', 'infection': 'other', 'abuse-suspect': 'other', 'bpsd-delusion': 'other',
};

/** 대처카드 이벤트 발생 → 사고보고서 뷰로 이동 (유형·경위 선기입 초안 전달) */
export function careCardToIncident(id) {
    const c = cardById(_cards, id || _open);
    if (!c) return;
    const draft = { type: CARD_INCIDENT_TYPE[c.id] || 'other', desc: `대처카드 '${c.title}' 상황 발생 — 경위를 기록하세요.` };
    setJSON(STORAGE_KEYS.CARE_INCIDENT_DRAFT, draft); // 뷰 전환 후 init이 소비-삭제
    location.hash = '#/care-incident';
}

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
