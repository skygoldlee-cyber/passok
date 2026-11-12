// src/exams/carework/care-finder.js — 요양기관 찾기 데이터
// @spec none — 시험 전용 도메인 데이터 (DA-13)
// content/exams/carework/실무/facilities.json — 공공데이터 시설 목록

/** @type {{items:*[],regions:string[],source:string}|null} */
let _data = null;
export async function loadFacilities() {
    if (_data) return _data;
    const res = await fetch('./content/exams/carework/실무/facilities.json');
    if (!res.ok) throw new Error(`facilities ${res.status}`);
    _data = await res.json();
    return _data;
}

/**
 * @param {Array<*>} items
 * @param {{q?:string, region?:string}} f
 */
export function searchFacilities(items, { q = '', region = '' } = {}) {
    const kw = q.trim().toLowerCase();
    return items.filter((/** @type {*} */ f) =>
        (!region || f.region === region) &&
        (!kw || [f.name, f.address, f.phone].join(' ').toLowerCase().includes(kw)));
}
