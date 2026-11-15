// src/exams/carework/doc-md.js — 내보내기 문서 마크다운 초안 공용 빌더 (CO-13)
// @spec CO-13,DA-24 — 생성 문서는 MD를 표준 초안으로 삼아 docx·xlsx·html을 파생한다
import { getOrgName, getDocSign } from './facility.js';
import { todayKey } from '../../core/utils.js';
import { parseCsv } from '../../content/csv-utils.js';
import { docWmText, docWmHtml } from '../../content/doc-wm.js';

/** 문서 헤더 — # 제목 + 기관명·출력일 메타 (모든 내보내기 문서 공통 머리) */
/** @param {string} title */
export const docMdHead = title => {
    const org = getOrgName();
    return `# ${title}\n\n${org ? org + ' · ' : ''}${todayKey()} 출력\n`;
};

/** 표 — 헤더 + --- 구분행 + 데이터 행 */
/** @param {string[]} headers @param {Array<*[]>} rows */
export const mdTable = (headers, rows) =>
    ['| ' + headers.join(' | ') + ' |',
        '|' + headers.map(() => '---').join('|') + '|',
        ...rows.map((/** @type {*[]} */ r) => '| ' + r.map((/** @type {*} */ c) => String(c ?? '')).join(' | ') + ' |')].join('\n');

/** 문서 서명란 — items: [[라벨, 'author'|'confirmer'|'receiver'|'']] — docSignHtml의 MD 대응.
 *  홈 설정 성명은 기입되고, 미설정·빈키(날짜) 슬롯은 수기 서명용 공란 유지.
 *  :::sign 블록 마커로 감싼다 — docx에서는 페이지 하단 우측 부동 표(tblpPr)로,
 *  미리보기에서는 우측 정렬 서명 박스로 렌더된다 (본문 바로 아래가 아닌 문서 하단 배치).
 *  approve: 결재란 역할 배열 또는 'none' — 기본(미지정) 담당·팀장·시설장. 재가기관 문서는
 *  ['사회복지사','센터장'] 등 기관 결재선에 맞게 지정한다. */
/** @param {Array<[string,string]>} items @param {string[] | 'none'} [approve] */
export const docMdSign = (items, approve) => {
    const s = getDocSign();
    const nm = (/** @type {string} */ k) => (k === 'author' ? s.author : k === 'confirmer' ? s.confirmer : k === 'receiver' ? s.receiver : '');
    // author 슬롯에 등록 서명 이미지가 있으면 이름 뒤에 {{img:author}} 토큰 병기 — (인) 위 날인 표식이며
    // 성명 텍스트는 그대로 유지 (토큰이 이름 자리를 대체하면 서명란에 성명이 누락됨)
    const roles = approve ? `\n:::approve ${approve === 'none' ? 'none' : approve.join('|')}` : '';
    return `${roles}\n\n:::sign\n` + items.map(([label, k]) => `${label}: ${nm(k) || '＿＿＿＿＿＿＿＿'}${k === 'author' && s.signImage ? ' {{img:author}}' : ''}`).join('\n') + '\n:::end';
};

/** 기존 CSV 직렬화 재사용 → MD 표 (BOM·인용 처리는 parseCsv 위임) */
/** @param {string} csv */
export const csvToMdTable = csv => {
    const rows = parseCsv(String(csv || '').replace(/^﻿/, ''));
    return rows.length > 1 ? mdTable(rows[0] || [], rows.slice(1)) : '';
};

/** @param {*} s */
const _esc = s => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }))[c] || c);

/** 결재란 역할 해석 — :::sign 있고 :::approve none 아니면 역할 배열 (미지정 시 담당·팀장·시설장) */
/** @param {string} md */
const _apprRoles = md => {
    const am = String(md).match(/^:::approve\s*(.*)$/m);
    if (!/^:::sign\s*$/m.test(md) || (am && (am[1] || '').trim() === 'none')) return null;
    const roles = am ? (am[1] || '').split('|').map(s => s.trim()).filter(Boolean) : ['담당', '팀장', '시설장'];
    return roles.length ? roles : null;
};

/** 결재란 HTML — docx _approve와 동일 구조. 결재하지 않은 문서에 서명 미삽입 — (인) 빈칸 유지 */
/** @param {string[] | null} roles */
const _apprHtml = roles => !roles ? '' :
    `<div class="doc-approve-wrap"><table class="doc-approve"><tr><td rowspan="2">결 재</td>${roles.map(r => `<td>${_esc(r)}</td>`).join('')}</tr><tr>${roles.map(() => '<td><span class="doc-sign-spot">(인)</span></td>').join('')}</tr></table></div>`;

/** 표 HTML — 2열 표는 첫 열 레이블 음영(doc-kv) */
/** @param {string[][]} tbl */
const _tblHtml = tbl => `<table${(tbl[0] || []).length === 2 ? ' class="doc-kv"' : ''}><thead><tr>${(tbl[0] || []).map(c => `<th>${_esc(c.trim())}</th>`).join('')}</tr></thead><tbody>` +
    tbl.slice(1).map(r => `<tr>${r.map(c => `<td>${_esc(c.trim())}</td>`).join('')}</tr>`).join('') + '</tbody></table>';

/** 서명란 한 줄 — {{img:author}} 토큰은 (인) 위 날인 이미지로, 나머지는 성명+(인) */
/** @param {string} l */
const _signLineHtml = l => {
    const m = l.match(/^(.*)\{\{img:author\}\}\s*$/);
    if (m) { const im = getDocSign().signImage; if (im) return `<div>${_esc(m[1])} <span class="doc-sign-spot">(인)<img class="care-doc-signimg" alt="${_esc(getDocSign().author || '서명')}" src="${im}"></span></div>`; }
    return `<div>${_esc(l)}${/\(인\)\s*$/.test(l) ? '' : ' (인)'}</div>`;
};

/** 서명 블록 HTML — 당일 날짜 + 서명란 줄들 */
/** @param {string[]} sign */
const _signHtml = sign => {
    const d = new Date();
    const date = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    return `<div class="doc-sign"><div class="doc-sign-date">${date}</div>${sign.map(_signLineHtml).join('')}</div>`;
};

/** 일반 텍스트 줄 → HTML — 문서 설정 마커는 '', :::page·:::closing·---·각주·본문 순 */
/** @param {string} t */
const _textHtml = t => {
    if (t.startsWith(':::approve') || t === ':::landscape') return ''; // 문서 설정 마커 — 출력 없음
    if (t === ':::page') return '<div class="doc-pagebreak"></div>'; // 인쇄 시 쪽 나눔 — docx의 :::page와 동일 마커
    if (t.startsWith(':::closing')) return `<p class="doc-closing">${_esc(t.slice(10).trim())}</p>`; // 종결 문구
    if (t === '---') return '<hr>';
    if (/^(※|근거)/.test(t)) return `<p class="doc-note">${_esc(t)}</p>`; // 각주성 소자 회색 — docx _note와 동일 규칙
    return `<p>${_esc(t)}</p>`;
};

/** 서명란 블록 상태 — :::sign~:::end 구간 수집·종결. 처리했으면 true */
/** @param {string} t @param {*} st @param {*} cx */
const _mdSign = (t, st, cx) => {
    if (t === ':::sign') { cx.flush(false); st.sign = []; st.meta = false; return true; }
    if (t === ':::end') { if (st.sign) { cx.out.push(_signHtml(st.sign)); st.sign = null; } return true; }
    if (st.sign) { if (t) st.sign.push(t); return true; }
    return false;
};

/** 표·목록 구조 줄 — 소비했으면 true */
/** @param {string} t @param {*} st @param {*} cx */
const _mdStruct = (t, st, cx) => {
    if (/^\|[\s:|-]+\|$/.test(t)) return true;
    if (t.startsWith('|') && t.endsWith('|')) { cx.flush(true); st.meta = false; (st.tbl = st.tbl || []).push(t.slice(1, -1).split('|')); return true; }
    if (t.startsWith('- ')) { st.meta = false; (st.list = st.list || []).push(t.slice(2)); return true; }
    return false;
};

/** 헤딩 줄 → HTML + 메타 플래그. 헤딩이면 true */
/** @param {string} t @param {*} st @param {*} cx */
const _mdHead = (t, st, cx) => {
    const h = t.match(/^(#{1,3})\s+(.+)/);
    if (!h) return false;
    cx.out.push(`<h${+(h[1] || '').length + 2}>${_esc(h[2])}</h${+(h[1] || '').length + 2}>`);
    st.meta = (h[1] || '').length === 1;
    return true;
};

/** MD 서브셋 → HTML — 미리보기·PDF 렌더 원본 (docx-utils의 _mdBody와 동일 서브셋) */
/** @param {string} md */
export const mdToHtml = md => {
    /** @type {string[]} */
    const out = [];
    // 서명 문서는 공문서 결재란 부여 — :::approve 마커로 역할 지정 (docx _approve와 동일 구조)
    const st = { apprHtml: _apprHtml(_apprRoles(md)), tbl: /** @type {string[][] | null} */ (null), list: /** @type {string[] | null} */ (null), sign: /** @type {string[] | null} */ (null), meta: false };
    const cx = { out, flush: (/** @type {boolean} */ listOnly) => {
        if (st.tbl && !listOnly) { out.push(_tblHtml(st.tbl)); st.tbl = null; }
        if (st.list) { out.push(`<ul>${st.list.map(i => `<li>${_esc(i)}</li>`).join('')}</ul>`); st.list = null; }
    } };
    for (const line of String(md || '').split('\n')) {
        const t = line.trim();
        if (_mdSign(t, st, cx) || _mdStruct(t, st, cx)) continue;
        cx.flush(false);
        if (_mdHead(t, st, cx)) continue;
        if (!t) continue; // 빈 줄 — meta 플래그 유지
        const firstMeta = st.meta; st.meta = false;
        if (t.startsWith(':::approve') || t === ':::landscape') continue; // 문서 설정 마커 — 출력 없음
        if (firstMeta) out.push(`<p class="doc-meta">${_esc(t)}</p>`);
        if (st.apprHtml) { out.push(st.apprHtml); st.apprHtml = ''; } // 메타 없는 문서 폴백 — 첫 비마커 줄 앞
        if (!firstMeta) { const html = _textHtml(t); if (html) out.push(html); }
    }
    cx.flush(false);
    out.push('<p class="doc-end">끝.</p>'); // 공문서 종결 표기
    return `<div class="doc-md">${docWmHtml(_wmText())}${out.join('')}</div>`;
};

/** 워터마크 문구 — 설정(홈 → 출력물 서명 → 기관명 워터마크) 켜짐 + 기관명 있을 때만.
 *  문구 자체는 공용 docWmText — docx 회전 상자·PDF 캔버스 스탬프와 동일 */
const _wmText = () => (getDocSign().wm ? docWmText(getOrgName()) : '');

/**
 * 서명란을 문서 하단 우측에 고정 — docx 출력의 부동 표(tblpPr, 페이지 하단 우측 앵커)와
 * 같은 위치를 PDF 캡처용 DOM에서 재현한다. root는 position이 지정된 래퍼여야 한다
 * (서명란 absolute의 containing block). root 높이를 한 페이지 분량으로 채워 서명란이
 * 본문 직후가 아니라 페이지 하단에 오게 한다.
 * @param {HTMLElement} root - positioned 래퍼 (.doc-md를 자신 또는 자손으로 포함)
 * @param {{minHeight?: string, innerPad?: string, right?: string}} [o]
 * @returns {boolean} 서명란을 찾아 고정했으면 true
 */
export const pinDocSignBottom = (root, { minHeight = '986px', innerPad = '64px', right = '88px' } = {}) => {
    if (!(root instanceof HTMLElement)) return false;
    const md = root.classList.contains('doc-md') ? root : root.querySelector('.doc-md');
    const sign = /** @type {HTMLElement|null} */ (md && /** @type {HTMLElement} */ (md).querySelector('.doc-sign'));
    if (!(md instanceof HTMLElement) || !sign) return false;
    md.style.padding = `0 ${innerPad}`; // 본문 폭을 docx 좌우 25mm에 근사
    sign.style.position = 'absolute';
    sign.style.right = right; // 래퍼 여백(24px) + innerPad — 표 우측선과 정합
    sign.style.bottom = '0';
    root.style.boxSizing = 'border-box';
    root.style.minHeight = minHeight;
    return true;
};
