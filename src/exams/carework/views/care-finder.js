// src/exams/carework/views/care-finder.js — 요양기관 찾기 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadFacilities, searchFacilities } from '../care-finder.js';
import { setLocalOrgName, getOrgName } from '../facility.js';
import { showToast } from '../../../ui-utils.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let _items = [];

function render() {
    const host = $('find-list');
    if (!host) return;
    const q = /** @type {HTMLInputElement|null} */ ($('find-q'))?.value || '';
    const region = /** @type {HTMLSelectElement|null} */ ($('find-region'))?.value || '';
    const hits = searchFacilities(_items, { q, region });
    const cur = getOrgName();
    const hint = $('find-hint');
    if (hint) hint.classList.toggle('is-hidden', !!cur);
    host.innerHTML = hits.length
        ? hits.map(f => `<div class="care-finder-item">
            <strong class="care-finder-name">${esc(f.name)}</strong>
            <span class="care-finder-meta">${esc(f.region)} · ${esc(f.type || '')}${f.phone ? esc(' · ' + f.phone) : ''}${f.capacity ? esc(' · 정원 ' + f.capacity + '명') : ''}${f.careWorkers ? esc(' · 요양보호사 ' + f.careWorkers + '명') : ''}</span>
            ${f.address ? `<span class="care-finder-addr">${esc(f.address)}</span>` : ''}
            ${cur === f.name
                ? '<span class="care-finder-set">✓ 설정됨</span>'
                : `<button data-click="careFinderUseOrg" data-arg="${esc(f.name)}" class="btn btn-secondary care-finder-btn">이 기관으로 설정</button>`}
            <span class="care-finder-links">
                <a href="https://map.kakao.com/link/search/${encodeURIComponent(f.address || f.region || f.name)}" target="_blank" rel="noopener" class="btn btn-secondary care-finder-btn">카카오맵</a>
                <a href="https://www.longtermcare.or.kr/npbs/r/a/201/selectLtcoSrch" target="_blank" rel="noopener" class="btn btn-secondary care-finder-btn">장기요양보험</a>
            </span>
          </div>`).join('')
        : '<p class="care-log-empty">검색 결과가 없습니다.</p>';
}

export function careFinderSearch() { render(); }

export function careFinderUseOrg(name) {
    if (!name) return;
    setLocalOrgName(name);
    showToast(`기관명 "${name}" 설정 — 출력물에 표기됩니다.`);
    render();
}

export async function initCareFinderView() {
    const host = $('find-list');
    try {
        const d = await loadFacilities();
        _items = d.items || [];
        const sel = /** @type {HTMLSelectElement|null} */ ($('find-region'));
        if (sel && sel.children.length <= 1)
            sel.innerHTML = '<option value="">전체 지역</option>' + (d.regions || []).map(r => `<option value="${r}">${r}</option>`).join('');
        render();
        const src = $('find-source');
        if (src && d.source) {
            const [pre, url, post] = d.source.split(/(https?:\/\/\S+)/);
            src.innerHTML = url
                ? `출처: ${esc(pre)}<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>${esc(post || '')}`
                : `출처: ${esc(d.source)}`;
        }
    } catch (e) {
        if (host) host.innerHTML = '<p class="care-calc-err">시설 목록을 불러오지 못했습니다.</p>';
    }
    const q = $('find-q');
    if (q && !q.dataset.wired) {
        q.dataset.wired = '1';
        q.addEventListener('input', render);
        $('find-region')?.addEventListener('change', render);
    }
}
