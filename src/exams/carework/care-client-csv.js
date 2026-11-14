// src/exams/carework/care-client-csv.js — 수급자 명부 CSV 왕복·문서 표 변환 (순수 로직, DOM 비의존)
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 헤더: 성명,상태,호실,생년월일,비상연락처,알레르기,주의사항,메모,<서류 단명>...
// 서류 열은 ADMIT_SECTIONS의 짧은 이름(— 앞부분)으로 매칭; 수납 표시: ○/O/✓/x/1 등
import { ADMIT_SECTIONS } from './care-admit.js';
import { mdTable } from './doc-md.js';
import { fmtDocName, fmtDocNames } from './name-fmt.js';

export const CLIENT_STATUSES = ['입소대기', '입소중', '재가이용'];
export const ADMIT_ITEMS = ADMIT_SECTIONS.flatMap(s => s.items.map(i => ({
    id: i.id,
    label: i.label,
    short: (i.label.split('—')[0] || '').replace(/\(.*?\)|·.*/g, '').trim(),
})));
const BASE_COLS = ['성명', '상태', '호실', '생년월일', '비상연락처', '알레르기', '주의사항', '메모'];
const FIELD_OF = { 성명: 'name', 상태: 'status', 호실: 'room', 생년월일: 'birth', 비상연락처: 'phone', 알레르기: 'allergy', 주의사항: 'caution', 메모: 'memo' };
const YES = new Set(['○', 'o', 'O', '✓', '√', 'x', 'X', '1', '수납', 'Y', 'y', 'yes']);

/** @param {string} line */
function parseLine(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) {
            if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
            else cur += ch;
        } else if (ch === '"') q = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
}
const q = (/** @type {*} */ s) => /[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : (s || '');

/** CSV 텍스트 → 수급자 레코드 배열 (헤더 필수, BOM 허용) */
/** @param {string} text */
export function csvToClients(text) {
    const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    const header = parseLine(lines[0] || '');
    const docCols = header.map((/** @type {string} */ h) => ADMIT_ITEMS.find((/** @type {*} */ i) => i.short === h || i.label.startsWith(h)) || null);
    return lines.slice(1).map(line => {
        const cells = parseLine(line);
        /** @type {*} */
        const rec = { docs: {} };
        cells.forEach((/** @type {*} */ v, /** @type {number} */ i) => {
            const f = (/** @type {Object.<string,string>} */ (FIELD_OF))[header[i] || ''];
            if (f) rec[f] = v;
            else if (docCols[i]) rec.docs[docCols[i].id] = YES.has(v);
        });
        if (rec.status && !CLIENT_STATUSES.includes(rec.status)) delete rec.status;
        return rec.name ? rec : null;
    }).filter(Boolean);
}

/** 수급자 레코드 → CSV 텍스트 (Excel 한글 호환 BOM 포함) */
/** @param {*[]} items */
export function clientsToCsv(items) {
    const docCols = ADMIT_ITEMS;
    const rows = [[...BASE_COLS, ...docCols.map(d => d.short)]];
    for (const c of items) {
        rows.push([
            c.name || '', c.status || '', c.room || '', c.birth || '', c.phone || '',
            c.allergy || '', c.caution || '', c.memo || '',
            ...docCols.map(d => (c.docs && c.docs[d.id]) ? '○' : ''),
        ]);
    }
    return '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n');
}

/** 수급자 1명 → 항목별 행 표 — 명부 문서는 항목|내용 2열 kv 형식 (다열 표는 Excel 내보내기에 한정) */
/** @param {*} c */
export const clientKvMd = (c) => {
    const docs = c.docs || {};
    const checked = ADMIT_ITEMS.filter(d => docs[d.id]).map(d => d.short);
    const missing = ADMIT_ITEMS.filter(d => !docs[d.id]).map(d => d.short);
    const rows = [
        ['성명', fmtDocName(c.name)], ['상태', c.status || ''], ['호실', c.room || ''],
        ['생년월일', c.birth || ''], ['비상연락처', c.phone || ''],
        ['알레르기', c.allergy || ''], ['주의사항', c.caution || ''], ['메모', fmtDocNames(c.memo, true)],
        ['수납 서류', checked.length ? checked.join(' · ') : '없음'],
        ['미수납 서류', missing.length ? missing.join(' · ') : '없음'],
    ];
    return mdTable(['항목', '내용'], rows);
};
