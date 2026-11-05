// src/exams/carework/doc-md.js — 내보내기 문서 마크다운 초안 공용 빌더 (CO-13)
// @spec CO-13,DA-24 — 생성 문서는 MD를 표준 초안으로 삼아 docx·xlsx·html을 파생한다
import { getOrgName } from './facility.js';
import { todayKey } from '../../core/utils.js';
import { parseCsv } from '../../content/csv-utils.js';

/** 문서 헤더 — # 제목 + 기관명·출력일 메타 (모든 내보내기 문서 공통 머리) */
export const docMdHead = title => {
    const org = getOrgName();
    return `# ${title}\n\n${org ? org + ' · ' : ''}${todayKey()} 출력\n`;
};

/** 표 — 헤더 + --- 구분행 + 데이터 행 */
export const mdTable = (headers, rows) =>
    ['| ' + headers.join(' | ') + ' |',
        '|' + headers.map(() => '---').join('|') + '|',
        ...rows.map(r => '| ' + r.map(c => String(c ?? '')).join(' | ') + ' |')].join('\n');

/** 기존 CSV 직렬화 재사용 → MD 표 (BOM·인용 처리는 parseCsv 위임) */
export const csvToMdTable = csv => {
    const rows = parseCsv(String(csv || '').replace(/^﻿/, ''));
    return rows.length > 1 ? mdTable(rows[0], rows.slice(1)) : '';
};

/** MD 서브셋 → HTML — 미리보기·PDF 렌더 원본 (docx-utils의 _mdBody와 동일 서브셋) */
export const mdToHtml = md => {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const out = [];
    /** @type {string[][] | null} */
    let tbl = null;
    /** @type {string[] | null} */
    let list = null;
    const flush = () => {
        if (tbl) {
            out.push(`<table><thead><tr>${tbl[0].map(c => `<th>${esc(c.trim())}</th>`).join('')}</tr></thead><tbody>` +
                tbl.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c.trim())}</td>`).join('')}</tr>`).join('') + '</tbody></table>');
            tbl = null;
        }
        if (list) { out.push(`<ul>${list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`); list = null; }
    };
    for (const line of String(md || '').split('\n')) {
        const t = line.trim();
        if (/^\|[\s:|-]+\|$/.test(t)) continue;
        if (t.startsWith('|') && t.endsWith('|')) { flush(); (tbl = tbl || []).push(t.slice(1, -1).split('|')); continue; }
        if (t.startsWith('- ')) { (list = list || []).push(t.slice(2)); continue; }
        flush();
        const h = t.match(/^(#{1,3})\s+(.+)/);
        if (h) { out.push(`<h${+h[1].length + 2}>${esc(h[2])}</h${+h[1].length + 2}>`); continue; }
        if (t === '---') { out.push('<hr>'); continue; }
        if (t) out.push(`<p>${esc(t)}</p>`);
    }
    flush();
    return `<div class="doc-md">${out.join('')}</div>`;
};
