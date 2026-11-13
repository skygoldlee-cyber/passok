// src/exams/carework/doc-md.js — 내보내기 문서 마크다운 초안 공용 빌더 (CO-13)
// @spec CO-13,DA-24 — 생성 문서는 MD를 표준 초안으로 삼아 docx·xlsx·html을 파생한다
import { getOrgName, getDocSign } from './facility.js';
import { todayKey } from '../../core/utils.js';
import { parseCsv } from '../../content/csv-utils.js';

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
 *  미리보기에서는 우측 정렬 서명 박스로 렌더된다 (본문 바로 아래가 아닌 문서 하단 배치) */
/** @param {Array<[string,string]>} items */
export const docMdSign = items => {
    const s = getDocSign();
    const nm = (/** @type {string} */ k) => (k === 'author' ? s.author : k === 'confirmer' ? s.confirmer : k === 'receiver' ? s.receiver : '');
    return '\n\n:::sign\n' + items.map(([label, k]) => `${label}: ${nm(k) || '＿＿＿＿＿＿＿＿'}`).join('\n') + '\n:::end';
};

/** 기존 CSV 직렬화 재사용 → MD 표 (BOM·인용 처리는 parseCsv 위임) */
/** @param {string} csv */
export const csvToMdTable = csv => {
    const rows = parseCsv(String(csv || '').replace(/^﻿/, ''));
    return rows.length > 1 ? mdTable(rows[0] || [], rows.slice(1)) : '';
};

/** MD 서브셋 → HTML — 미리보기·PDF 렌더 원본 (docx-utils의 _mdBody와 동일 서브셋) */
/** @param {string} md */
export const mdToHtml = md => {
    const esc = (/** @type {*} */ s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }))[c] || c);
    const out = [];
    // 서명 문서는 공문서 결재란 선두 부여 (docx _APPROVE와 동일 구조)
    if (/^:::sign\s*$/m.test(md)) {
        out.push('<div class="doc-approve-wrap"><table class="doc-approve"><tr><td rowspan="2">결 재</td><td>담당</td><td>팀장</td><td>시설장</td></tr><tr><td></td><td></td><td></td></tr></table></div>');
    }
    /** @type {string[][] | null} */
    let tbl = null;
    /** @type {string[] | null} */
    let list = null;
    /** @type {string[] | null} */
    let sign = null;
    let meta = false; // # 제목(h3) 직후 첫 단락 → 기관명·출력일 메타줄
    const flush = (/** @type {boolean} */ listOnly) => {
        if (tbl && !listOnly) {
            const kv = (tbl[0] || []).length === 2 ? ' class="doc-kv"' : ''; // 2열 표 — 첫 열 레이블 음영
            out.push(`<table${kv}><thead><tr>${(tbl[0] || []).map(c => `<th>${esc(c.trim())}</th>`).join('')}</tr></thead><tbody>` +
                tbl.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c.trim())}</td>`).join('')}</tr>`).join('') + '</tbody></table>');
            tbl = null;
        }
        if (list) { out.push(`<ul>${list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`); list = null; }
    };
    for (const line of String(md || '').split('\n')) {
        const t = line.trim();
        if (t === ':::sign') { flush(false); sign = []; meta = false; continue; }
        if (t === ':::end') {
            if (sign) {
                const d = new Date();
                const date = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                out.push(`<div class="doc-sign"><div class="doc-sign-date">${date}</div>${sign.map(l => `<div>${esc(l)}${/\(인\)\s*$/.test(l) ? '' : ' (인)'}</div>`).join('')}</div>`);
                sign = null;
            }
            continue;
        }
        if (sign) { if (t) sign.push(t); continue; }
        if (/^\|[\s:|-]+\|$/.test(t)) continue;
        if (t.startsWith('|') && t.endsWith('|')) { flush(true); meta = false; (tbl = tbl || []).push(t.slice(1, -1).split('|')); continue; }
        if (t.startsWith('- ')) { meta = false; (list = list || []).push(t.slice(2)); continue; }
        flush(false);
        const h = t.match(/^(#{1,3})\s+(.+)/);
        if (h) { out.push(`<h${+(h[1] || '').length + 2}>${esc(h[2])}</h${+(h[1] || '').length + 2}>`); meta = (h[1] || '').length === 1; continue; }
        if (meta && t) { meta = false; out.push(`<p class="doc-meta">${esc(t)}</p>`); continue; }
        if (!t) continue; // 빈 줄 — meta 플래그 유지
        meta = false;
        if (t === '---') { out.push('<hr>'); continue; }
        if (t) out.push(`<p>${esc(t)}</p>`);
    }
    flush(false);
    out.push('<p class="doc-end">끝.</p>'); // 공문서 종결 표기
    return `<div class="doc-md">${docWmHtml()}${out.join('')}</div>`;
};

/**
 * 기관명 워터마크 타일 — 설정(홈 → 출력물 서명 → 기관명 워터마크) 켜짐 + 기관명 있을 때만.
 * 대각선 반복 배치 — docx 헤더 VML 워터마크와 동일 문구(기관명 · 출력일)
 * @returns {string} doc-wm 컨테이너 HTML 또는 빈 문자열
 */
export const docWmHtml = () => {
    if (!getDocSign().wm) return '';
    const org = getOrgName();
    if (!org) return '';
    const t = `${org} · ${todayKey()}`.replace(/[&<>"]/g, c => /** @type {Object.<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c);
    return `<div class="doc-wm" aria-hidden="true"><span style="font-size:1.8em">${t}</span></div>`;
};

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
