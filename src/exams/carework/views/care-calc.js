// src/exams/carework/views/care-calc.js — 장기요양 비용 계산 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { computeCareCost, formatWon } from '../care-calc.js';
import { GRADE_LIMITS, REDUCTIONS } from '../care-calc-data.js';

const $ = (id) => document.getElementById(id);

const _val = (id, fallback) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fallback;
};

function readForm() {
    return {
        type: _val('care-type', 'home'),
        grade: _val('care-grade', 'g1'),
        monthlyUse: Number(_val('care-use', '0')) || 0,
        reduction: _val('care-reduction', 'none'),
    };
}

export function careCalcRun() {
    const r = computeCareCost(readForm());
    const out = $('care-result');
    if (!out) return;
    if (!r) { out.innerHTML = '<p class="care-calc-err">입력을 확인하세요.</p>'; return; }
    const rows = [
        ['총 이용액', formatWon(r.covered + r.overLimit)],
        ['공단 부담', formatWon(r.publicPay)],
        ['본인부담금', formatWon(r.selfPay)],
        ...(r.overLimit ? [['한도 초과 자부담', formatWon(r.overLimit)]] : []),
        ...(r.limit ? [['등급 월 한도', formatWon(r.limit)]] : []),
    ];
    out.innerHTML = rows.map(([k, v]) => `<div class="care-calc-row"><span>${k}</span><strong>${v}</strong></div>`).join('')
        + '<p class="care-calc-src">근거: 노인장기요양보험법 §40 · 제공기준 고시 §13 · 본인부담금 감경 고시</p>';
}

export function careCalcReset() {
    ['care-use'].forEach(id => {
        const e = /** @type {HTMLInputElement|null} */ ($(id));
        if (e) e.value = '';
    });
    const out = $('care-result'); if (out) out.innerHTML = '';
}

export function careCalcPrint() { careCalcRun(); window.print(); }

export function initCareCalcView() {
    const g = $('care-grade');
    if (g && !g.children.length)
        g.innerHTML = GRADE_LIMITS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const r = $('care-reduction');
    if (r && !r.children.length)
        r.innerHTML = REDUCTIONS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
}
