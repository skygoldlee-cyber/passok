// src/content/xlsx-utils.js — Excel(.xlsx/.xls) 읽기·쓰기 — SheetJS 지연 로드
// @spec FO-22
// vendor/xlsx/xlsx.full.min.js (UMD → window.XLSX, ~880KB)는 가져오기·내보내기
// 첫 호출 시에만 동적 로드한다 (크리티컬 패스 제외 — mermaid와 동일 패턴).
// CSV 파서는 그대로 재사용 — .xlsx는 첫 시트를 CSV 텍스트로 변환해 넘긴다.
import { PATHS } from '../core/paths.js';
import { readCsvFile } from './csv-utils.js';

let _load = null;
/** vendor SheetJS UMD 지연 로드 → window.XLSX */
export function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (_load) return _load;
    _load = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PATHS.VENDOR_XLSX;
        s.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('window.XLSX 미정의'));
        s.onerror = () => { _load = null; reject(new Error('Excel 라이브러리를 불러오지 못했습니다.')); };
        document.head.appendChild(s);
    });
    return _load;
}

const XLSX_RE = /\.(xlsx|xls)$/i;

/**
 * 파일 → CSV 텍스트. .xlsx/.xls는 SheetJS 첫 시트를 CSV로 변환하고
 * 나머지는 readCsvFile(UTF-8/CP949 자동) — csvToObjects·csvToClients·csvToRoster 공용.
 */
export async function readTableFile(file) {
    if (!file || !XLSX_RE.test(file.name || '')) return readCsvFile(file);
    const XLSX = await ensureXlsx();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
}

/**
 * CSV 텍스트 → .xlsx 다운로드 (downloadCsv의 Excel 네이티브 버전 — 동일 호출 형태).
 * CSV 왕복 도구의 내보내기를 그대로 .xlsx로 전환하는 어댑터.
 */
export async function downloadSheet(csvText, filename) {
    const XLSX = await ensureXlsx();
    const wb = XLSX.read(String(csvText).replace(/^﻿/, ''), { type: 'string' });
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const url = URL.createObjectURL(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
