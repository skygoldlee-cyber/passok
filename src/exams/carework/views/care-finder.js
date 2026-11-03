// src/exams/carework/views/care-finder.js — 요양기관 찾기 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { loadFacilities, searchFacilities } from '../care-finder.js';
import { setLocalOrgName } from '../facility.js';
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
    host.innerHTML = hits.length
        ? hits.map(f => `<div class="care-log-saved-item">
            <span><strong>${esc(f.name)}</strong> ${esc(f.region)} · ${esc(f.type || '')}${f.address ? esc(' · ' + f.address) : ''}${f.phone ? esc(' · ' + f.phone) : ''}</span>
            <button data-click="careFinderUseOrg" data-arg="${esc(f.name)}" class="btn btn-secondary">기관명 설정</button>
          </div>`).join('')
        : '<p class="care-log-empty">검색 결과가 없습니다.</p>';
}

export function careFinderSearch() { render(); }

export function careFinderUseOrg(name) {
    if (!name) return;
    setLocalOrgName(name);
    showToast(`기관명 "${name}" 설정 — 출력물에 표기됩니다.`);
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
