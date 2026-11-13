// src/exams/carework/care-form-pdf.js — 기관 양식 파일 텍스트·필드 추출
// @spec CO-17 — 시험 전용 도메인 로직 (DA-13)
// pdf.js(vendor/pdfjs) 지연 로드 — AcroForm 위젯 필드 우선, 없으면 텍스트 추출.
// 스캔(이미지) PDF는 텍스트가 없어 추출 불가 — 호출부에서 안내한다.
import { PATHS } from '../../core/paths.js';

/** @type {*} */
let _pdfjs = null;
const _script = (/** @type {string} */ src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('PDF 읽기 라이브러리 로드 실패'));
    document.head.appendChild(s);
});

/** pdf.js 지연 로드 — 워커 경로 지정 후 window.pdfjsLib 반환 */
export function ensurePdfjs() {
    if (_pdfjs) return Promise.resolve(_pdfjs);
    return _script(PATHS.VENDOR_PDFJS).then(() => {
        const lib = /** @type {any} */ (window).pdfjsLib;
        if (!lib) throw new Error('pdf.js 미정의');
        lib.GlobalWorkerOptions.workerSrc = PATHS.VENDOR_PDFJS_WORKER;
        return (_pdfjs = lib);
    });
}

/**
 * PDF 파일 → {text, fields, pages}
 * - text: 페이지별 텍스트 합본 (AI 추출 입력 — 위치 정렬로 개행 복원)
 * - fields: AcroForm 위젯 필드명 [{name, type}] — 대화형 PDF일 때만 존재
 * @param {File|Blob} file
 */
export async function extractFormPdf(file) {
    const pdfjs = await ensurePdfjs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const numPages = doc.numPages;
    const fields = [];
    const seen = new Set();
    const pages = [];
    try {
        for (let p = 1; p <= numPages; p++) {
            const page = await doc.getPage(p);
            const tc = await page.getTextContent();
            const items = tc.items.filter((/** @type {*} */ i) => i.str && i.str.trim());
            // y 내림차순(위→아래)·x 오름차순 정렬 후 y 변화로 개행 복원
            items.sort((/** @type {*} */ a, /** @type {*} */ b) => (b.transform[5] - a.transform[5]) || (a.transform[4] - b.transform[4]));
            let lastY = null;
            const parts = [];
            for (const it of items) {
                const y = Math.round(it.transform[5]);
                if (lastY !== null) parts.push(Math.abs(y - lastY) > 3 ? '\n' : ' ');
                parts.push(it.str);
                lastY = y;
            }
            pages.push(parts.join('').replace(/[ \t]+\n/g, '\n').trim());
            const annos = await page.getAnnotations().catch(() => []);
            for (const a of annos) {
                if (a.subtype === 'Widget' && a.fieldName && !seen.has(a.fieldName)) {
                    seen.add(a.fieldName);
                    fields.push({ name: String(a.fieldName), type: String(a.fieldType || '') });
                }
            }
        }
    } finally {
        doc.destroy?.();
    }
    return { text: pages.filter(Boolean).join('\n\n---\n\n'), fields, pages: numPages };
}

/**
 * 추출 텍스트 → 템플릿 초안 휴리스틱 (AI 불가 폴백)
 * '라벨:'·'라벨：' 패턴과 밑줄 공란을 {{라벨}} 플레이스홀더로 변환 — 사용자 검토 편집 전제.
 * @param {string} text @param {string} [title]
 * @returns {{title:string, body:string}}
 */
export function textToTemplate(text, title = '') {
    const body = String(text || '')
        .replace(/([가-힣A-Za-z][가-힣A-Za-z0-9·() ]{0,14})\s*[:：](?=[\s_＿]*(?:$|[\s_＿]))/gm, (m, k) => `${k.trim()}: {{${k.trim()}}}`)
        .replace(/[_＿]{3,}/g, '＿＿＿＿＿＿');
    return { title: String(title || '').trim() || '기관 양식', body };
}

/**
 * AcroForm 필드 목록 → 템플릿 본문 — 대화형 PDF의 필드명을 {{필드명}} 기입란으로 직렬화
 * @param {Array<{name:string,type:string}>} fields @param {string} [title]
 */
export function fieldsToTemplate(fields, title = '') {
    const rows = (fields || []).map(f => `- ${f.name}: {{${f.name}}}`);
    return {
        title: String(title || '').trim() || '기관 양식',
        body: rows.length ? rows.join('\n') : '',
    };
}

// — DOCX·Excel 양식 추출 (CO-17) —

/**
 * zip 엔트리 읽기 — EOCD→중앙 디렉터리에서 name 탐색, deflate는 네이티브 DecompressionStream.
 * docx·xlsx는 zip+OOXML이라 별도 라이브러리 없이 해제 가능 (iOS 15.x 등 미지원 시 no-inflate 오류).
 * @param {ArrayBuffer} buf @param {string} name
 * @returns {Promise<Uint8Array|null>}
 */
async function _zipEntry(buf, name) {
    const u8 = new Uint8Array(buf);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65536); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('zip 형식이 아닙니다');
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const td = new TextDecoder();
    for (let i = 0; i < count; i++) {
        if (dv.getUint32(off, true) !== 0x02014b50) break;
        const method = dv.getUint16(off + 10, true);
        const csize = dv.getUint32(off + 20, true);
        const nlen = dv.getUint16(off + 28, true);
        const elen = dv.getUint16(off + 30, true);
        const clen = dv.getUint16(off + 32, true);
        const lho = dv.getUint32(off + 42, true);
        const fname = td.decode(u8.subarray(off + 46, off + 46 + nlen));
        off += 46 + nlen + elen + clen;
        if (fname !== name) continue;
        const lnlen = dv.getUint16(lho + 26, true);
        const lelen = dv.getUint16(lho + 28, true);
        const data = u8.subarray(lho + 30 + lnlen + lelen, lho + 30 + lnlen + lelen + csize);
        if (method === 0) return data;
        if (method === 8) {
            if (typeof DecompressionStream !== 'function') throw new Error('no-inflate');
            const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        }
        throw new Error('지원하지 않는 압축 방식');
    }
    return null;
}

const _W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

/** word/document.xml → 텍스트 — 단락은 개행, 표는 MD 표 행으로 복원 (AI 추출 입력용) */
/** @param {string} xml */
function _docxXmlToText(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const body = doc.getElementsByTagNameNS(_W_NS, 'body')[0];
    if (!body) return '';
    const pText = (/** @type {Element} */ p) => [...p.getElementsByTagNameNS(_W_NS, 't')].map(n => n.textContent).join('').trim();
    const out = [];
    for (const el of body.children) {
        if (el.localName === 'p') {
            const t = pText(el);
            if (t) out.push(t);
        } else if (el.localName === 'tbl') {
            for (const tr of el.getElementsByTagNameNS(_W_NS, 'tr')) {
                const cells = [...tr.getElementsByTagNameNS(_W_NS, 'tc')]
                    .map(tc => [...tc.getElementsByTagNameNS(_W_NS, 'p')].map(pText).filter(Boolean).join(' '));
                if (cells.some(c => c)) out.push('| ' + cells.join(' | ') + ' |');
            }
        }
    }
    return out.join('\n');
}

/**
 * DOCX 파일 → {text, fields:[], pages:1} — word/document.xml의 단락·표 텍스트 추출.
 * 콘텐츠 컨트롤(w:sdt)의 기입란은 텍스트 흐름에 그대로 남아 AI가 항목으로 인식한다.
 * @param {File|Blob} file
 */
export async function extractFormDocx(file) {
    const xmlBytes = await _zipEntry(await file.arrayBuffer(), 'word/document.xml').catch(e => {
        if (e.message === 'no-inflate') throw new Error('이 브라우저는 DOCX 압축 해제를 지원하지 않습니다 — PDF로 저장해 올려주세요.');
        throw e;
    });
    if (!xmlBytes) throw new Error('DOCX 본문을 찾지 못했습니다.');
    const text = _docxXmlToText(new TextDecoder('utf-8').decode(xmlBytes));
    return { text, fields: [], pages: 1 };
}

/**
 * Excel·CSV 양식 → {text, fields:[], pages:1} — 기존 SheetJS 벤더(readTableFile)로 첫 시트 CSV 추출.
 * @param {File|Blob} file
 */
export async function extractFormXlsx(file) {
    const { readTableFile } = await import('../../content/xlsx-utils.js');
    const csv = await readTableFile(file);
    return { text: String(csv || ''), fields: [], pages: 1 };
}
