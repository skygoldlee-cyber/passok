// src/exams/carework/views/care-home.js — Care OS 홈 뷰 (오늘 요약·확인 권장·빠른 기록)
// @spec CO-12 — 시험 전용 실무 뷰 (DA-13)
import { listCareLogs } from '../care-log-store.js';
import { listVisits } from '../care-visit-store.js';
import { listIncidents } from '../incident-store.js';
import { listClients } from '../care-client-store.js';
import { clientTrends } from '../care-trend.js';
import { markFunnel, funnelStats } from '../care-funnel.js';
import { escapeHTML as esc } from '../../../core/sanitize.js';
import { refreshOrgName } from '../facility.js';

const $ = (id) => document.getElementById(id);
const todayKey = () => new Date().toISOString().slice(0, 10);
const dayOf = (r) => r.date || r.shift_date || '';

export function initCareHomeView() {
    markFunnel('tool:care-home');
    void refreshOrgName();
    const d = todayKey();
    const logs = listCareLogs(), visits = listVisits(), incidents = listIncidents();
    const cnt = (arr) => arr.filter(r => dayOf(r) === d).length;
    const dateEl = $('home-date');
    if (dateEl) dateEl.textContent = `${d} (${'일월화수목금토'[new Date().getDay()]})`;
    const sumEl = $('home-summary');
    if (sumEl) sumEl.textContent = `일지 ${cnt(logs)}건 · 방문 ${cnt(visits)} · 사고 ${cnt(incidents)}`;
    const warns = listClients().flatMap(c =>
        clientTrends(logs, { clientId: c.id, name: c.name }).map(t => `${c.name} — ${t.message}`));
    const wEl = $('home-warn');
    if (wEl) wEl.innerHTML = warns.map(w => `<div class="care-trend-warn">⚠ ${esc(w)}</div>`).join('');
    // 미사용 도구 "처음" 마크 — 퍼널 사용 횟수 0인 도구
    const used = funnelStats()?.tools || {};
    document.querySelectorAll('.care-home-nav a[href^="#/"]').forEach(a => {
        const slug = /** @type {HTMLAnchorElement} */ (a).href.split('#/')[1];
        if (slug && !(used[`tool:${slug}`] > 0)) a.insertAdjacentHTML('beforeend', '<span class="care-new">처음</span>');
    });
}
