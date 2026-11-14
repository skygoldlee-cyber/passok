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
 * zip 중앙 디렉터리 나열 — EOCD 탐색 후 엔트리 {name, method, csize, lho} 배열 반환.
 * docx·xlsx·hwpx는 zip 컨테이너라 별도 라이브러리 없이 해제 가능.
 * @param {ArrayBuffer} buf
 * @returns {{u8:Uint8Array<ArrayBuffer>, dv:DataView, entries:Array<{name:string, method:number, csize:number, lho:number}>}}
 */
function _zipDir(buf) {
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
    const entries = [];
    for (let i = 0; i < count; i++) {
        if (dv.getUint32(off, true) !== 0x02014b50) break;
        const method = dv.getUint16(off + 10, true);
        const csize = dv.getUint32(off + 20, true);
        const nlen = dv.getUint16(off + 28, true);
        const elen = dv.getUint16(off + 30, true);
        const clen = dv.getUint16(off + 32, true);
        const lho = dv.getUint32(off + 42, true);
        const name = td.decode(u8.subarray(off + 46, off + 46 + nlen));
        entries.push({ name, method, csize, lho });
        off += 46 + nlen + elen + clen;
    }
    return { u8, dv, entries };
}

/**
 * zip 엔트리 읽기 — name으로 디렉터리 탐색, deflate는 네이티브 DecompressionStream.
 * (iOS 15.x 등 미지원 시 no-inflate 오류)
 * @param {ArrayBuffer} buf @param {string} name
 * @returns {Promise<Uint8Array|null>}
 */
async function _zipEntry(buf, name) {
    const { u8, dv, entries } = _zipDir(buf);
    const e = entries.find(x => x.name === name);
    if (!e) return null;
    const lnlen = dv.getUint16(e.lho + 26, true);
    const lelen = dv.getUint16(e.lho + 28, true);
    const data = u8.subarray(e.lho + 30 + lnlen + lelen, e.lho + 30 + lnlen + lelen + e.csize);
    if (e.method === 0) return data;
    if (e.method === 8) {
        if (typeof DecompressionStream !== 'function') throw new Error('no-inflate');
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    throw new Error('지원하지 않는 압축 방식');
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

// — HWPX(아래한글) 양식 추출 (CO-17) — KS X 6101: ZIP + OWPML —

const _HP_NS = 'http://www.hancom.co.kr/hwpml/2011/paragraph';
const _HS_NS = 'http://www.hancom.co.kr/hwpml/2011/section';

/** hp:p 직접 텍스트 — 표(hp:tbl) 내부의 hp:t는 제외 (표는 별도 MD 행으로 복원) */
/** @param {Element} p */
function _hpPText(p) {
    const parts = [];
    for (const t of p.getElementsByTagNameNS(_HP_NS, 't')) {
        let inTbl = false;
        for (let a = t.parentElement; a && a !== p; a = a.parentElement) {
            if (a.namespaceURI === _HP_NS && a.localName === 'tbl') { inTbl = true; break; }
        }
        if (!inTbl) parts.push(t.textContent);
    }
    return parts.join('').trim();
}

/** section XML → 텍스트 — 단락은 개행, 표(hp:tbl 안 hp:tr/hp:tc)는 MD 표 행으로 복원 */
/** @param {string} xml */
function _hwpxXmlToText(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const sec = doc.getElementsByTagNameNS(_HS_NS, 'sec')[0];
    if (!sec) return '';
    const out = [];
    for (const p of sec.getElementsByTagNameNS(_HP_NS, 'p')) {
        // 표: 문단(run) 내부 객체로 존재 — tr/tc를 MD 행으로
        for (const tbl of p.getElementsByTagNameNS(_HP_NS, 'tbl')) {
            for (const tr of tbl.getElementsByTagNameNS(_HP_NS, 'tr')) {
                const cells = [...tr.getElementsByTagNameNS(_HP_NS, 'tc')]
                    .map(tc => [...tc.getElementsByTagNameNS(_HP_NS, 'p')]
                        .map(q => _hpPText(q)).filter(Boolean).join(' '));
                if (cells.some(Boolean)) out.push('| ' + cells.join(' | ') + ' |');
            }
        }
        const t = _hpPText(p);
        if (t) out.push(t);
    }
    return out.join('\n');
}

/**
 * HWPX(아래한글) 양식 → {text, fields:[], pages:N} — Contents/sectionN.xml 전부 순회.
 * 구형 바이너리 .hwp(OLE/CFB)는 zip이 아니라 여기서 거부 — docx로 저장해 올리도록 안내.
 * @param {File|Blob} file
 */
export async function extractFormHwpx(file) {
    const buf = await file.arrayBuffer();
    let dir;
    try { dir = _zipDir(buf); }
    catch { throw new Error('HWPX 파일이 아닙니다 — 구형 .hwp는 한글에서 Word(docx)로 저장해 올려주세요.'); }
    const names = dir.entries.map(e => e.name)
        .filter(n => /^Contents\/section\d+\.xml$/i.test(n))
        .sort((a, b) => (+/** @type {*} */ (a.match(/\d+/))[0]) - (+/** @type {*} */ (b.match(/\d+/))[0]));
    if (!names.length) throw new Error('HWPX 본문(section XML)을 찾지 못했습니다 — 구형 .hwp는 Word(docx)로 저장해 올려주세요.');
    const td = new TextDecoder('utf-8');
    const texts = [];
    for (const name of names) {
        const bytes = await _zipEntry(buf, name).catch(e => {
            if (e.message === 'no-inflate') throw new Error('이 브라우저는 HWPX 압축 해제를 지원하지 않습니다 — PDF로 저장해 올려주세요.');
            throw e;
        });
        if (bytes) texts.push(_hwpxXmlToText(td.decode(bytes)));
    }
    return { text: texts.filter(Boolean).join('\n\n---\n\n'), fields: [], pages: names.length };
}
