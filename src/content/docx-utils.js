// src/content/docx-utils.js — Word(.docx) 생성 — 미니멀 OOXML, 의존성 없음
// @spec CO-13,DA-24 — 출력 문서 Word 파일 공유/다운로드 (MD 초안 → docx 파생)
// [Content_Types]·_rels·document·document.rels·settings 5엔트리면 Word·HWP·Google Docs
// 정상 개방 — settings.xml로 인쇄 레이아웃(A4 페이지 경계 표시)을 강제한다.
import { esc } from '../core/sanitize.js';

const _enc = new TextEncoder();

// CRC-32 (IEEE) — ZIP 로컬 헤더·중앙 디렉터리의 무결성 필드
const _CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
/** @param {Uint8Array} buf */
const _crc32 = buf => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = (_CRC[(c ^ (buf[i] || 0)) & 0xFF] || 0) ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
};

/** ZIP 타임스탬프 — DOS 포맷 (시:분:초/2 · 연-1980/월/일) */
const _dosNow = () => {
    const d = new Date();
    return {
        t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
        d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
};

/**
 * zip 무압축(stored) 작성 — local headers → central directory → EOCD. 미설정 필드는 0 (flags·method·extra).
 * @param {Array.<[string, Uint8Array]>} files
 * @returns {Blob}
 */
const _zipStore = files => {
    const { t, d } = _dosNow();
    const chunks = [], central = [];
    let off = 0;
    for (const [name, data] of files) {
        const nb = _enc.encode(name), crc = _crc32(data);
        const h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true);
        h.setUint16(4, 20, true);
        h.setUint16(10, t, true);
        h.setUint16(12, d, true);
        h.setUint32(14, crc, true);
        h.setUint32(18, data.length, true);
        h.setUint32(22, data.length, true);
        h.setUint16(26, nb.length, true);
        chunks.push(new Uint8Array(h.buffer), nb, data);
        const c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true);
        c.setUint16(4, 20, true);
        c.setUint16(6, 20, true);
        c.setUint16(12, t, true);
        c.setUint16(14, d, true);
        c.setUint32(16, crc, true);
        c.setUint32(20, data.length, true);
        c.setUint32(24, data.length, true);
        c.setUint16(28, nb.length, true);
        c.setUint32(42, off, true);
        central.push(new Uint8Array(c.buffer), nb);
        off += 30 + nb.length + data.length;
    }
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, files.length, true);
    e.setUint16(10, files.length, true);
    e.setUint32(12, central.reduce((n, b) => n + b.length, 0), true);
    e.setUint32(16, off, true);
    return new Blob(/** @type {BlobPart[]} */ ([...chunks, ...central, new Uint8Array(e.buffer)]));
};

const TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOCRELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`;
// 보기 설정 — 인쇄 레이아웃 + 100% 고정. 생략 시 뷰어가 웹 레이아웃(전체폭·페이지 경계 없음)으로 열 수 있다
const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:view w:val="print"/><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/></w:settings>`;

/**
 * @param {string} docXml - word/document.xml 내용
 * @returns {Array.<[string, Uint8Array]>}
 */
const _parts = docXml => [
    ['[Content_Types].xml', _enc.encode(TYPES)],
    ['_rels/.rels', _enc.encode(RELS)],
    ['word/_rels/document.xml.rels', _enc.encode(DOCRELS)],
    ['word/document.xml', _enc.encode(docXml)],
    ['word/settings.xml', _enc.encode(SETTINGS)],
];

// 단락 — eastAsia 폰트 명시로 한글이 맑은 고딕 계열로 렌더. 빈 줄은 빈 단락. 선두 N줄은 굵게(문서 헤더).
/**
 * @param {string} line
 * @param {number} i
 * @param {number} boldLines
 * @returns {string}
 */
const _P = (line, i, boldLines) => line
    ? `<w:p><w:r><w:rPr><w:rFonts w:eastAsia="Malgun Gothic"/>${i < boldLines ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`
    : '<w:p/>';

// 페이지 설정 — A4 세로(orient 명시 — 일부 임포터가 생략 시 가로로 해석) + 1인치 여백 + 1단·문서 그리드 (Word 정본과 동일한 sectPr 형태)
const _SECT = '<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';

/**
 * @param {string[]} lines
 * @param {number} boldLines
 * @returns {string}
 */
const _doc = (lines, boldLines) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map((l, i) => _P(l, i, boldLines)).join('')}${_SECT}</w:body></w:document>`;

/**
 * 텍스트 → .docx File (줄 단위 단락) — 공유·다운로드 공용, 지연 로드 불필요.
 * @param {string} text - 본문 (\n 단락 구분)
 * @param {string} filename - 확장자 제외 파일명
 * @param {number} [boldLines] - 선두 N줄을 굵게 (문서 헤더)
 */
export function docxFile(text, filename, boldLines = 0) {
    const blob = _zipStore(_parts(_doc(String(text || '').split('\n'), boldLines)));
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// — MD 서브셋 → WordprocessingML (문서 표준 초안: 헤딩·표·목록·구분선·단락) —

// 표 테두리 — 외곽선 1pt(sz=8)·내부선 0.5pt(sz=4). 격식 문서 관행(외곽 강조) +
// 0.5pt는 화면 배율에서 서브픽셀로 사라지므로 PDF 변환 시 외곽선이 안 보이는 문제 방지
const _BORDERS = ['top', 'left', 'bottom', 'right'].map(b => `<w:${b} w:val="single" w:sz="8" w:color="666666"/>`).join('')
    + ['insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:color="999999"/>`).join('');
// 표 레이아웃 — 본문 폭 고정 dxa (A4 11906 − 여백 1440×2 = 9026) + 균등 열 그리드 + 셀 내부 여백.
// pct(상대폭)는 한글 등 일부 임포터가 미지원해 표가 본문 폭 밖으로 렌더될 수 있어 dxa 고정 사용.
const _TEXT_W = 9026;
const _CELL_MAR = '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar>';
// 셀 단락 — kinsoku(동아시아 금칙 규칙) + wordWrap=off(단어 중간 분할 금지) → 어절 단위 줄넘김
const _CELL_PPR = '<w:pPr><w:kinsoku/><w:wordWrap w:val="off"/></w:pPr>';
/**
 * @param {string} c
 * @param {boolean} head
 * @param {number} [w] - 셀 너비 (dxa)
 * @returns {string}
 */
const _cell = (c, head, w) => `<w:tc><w:tcPr>${w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : ''}${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E8E8E8"/>' : ''}</w:tcPr><w:p>${_CELL_PPR}<w:r><w:rPr><w:rFonts w:eastAsia="Malgun Gothic"/>${head ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(c.trim())}</w:t></w:r></w:p></w:tc>`;
/**
 * @param {string[][]} rows
 * @returns {string}
 */
const _tbl = rows => {
    const n = Math.max(1, ...(rows.map(r => r.length)));
    const base = Math.floor(_TEXT_W / n), last = _TEXT_W - base * (n - 1);
    const grid = Array.from({ length: n }, (/** @type {*} */ _, i) => `<w:gridCol w:w="${i === n - 1 ? last : base}"/>`).join('');
    const wAt = (/** @type {number} */ i) => i === n - 1 ? last : base;
    return `<w:tbl><w:tblPr><w:tblW w:w="${_TEXT_W}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders>${_CELL_MAR}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>`
        + rows.map((r, i) => `<w:tr>${r.map((c, ci) => _cell(c, i === 0, wAt(ci))).join('')}</w:tr>`).join('') + '</w:tbl>';
};
/**
 * @param {string} t
 * @param {number} sz
 * @returns {string}
 */
const _h = (t, sz) => `<w:p><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="Malgun Gothic"/><w:b/><w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const _HR = '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="999999"/></w:pBdr></w:pPr></w:p>';

// 서명란 — 본문 여백 영역 하단 우측에 부동 표(tblpPr — Word 텍스트 상자와 동일한 앵커 방식).
// 문서 끝에 배치하면 마지막 페이지 하단 오른쪽에 고정된다
const _SIG_W = 4200;
/** @param {string[]} lines */
const _sigTbl = lines => `<w:tbl><w:tblPr><w:tblpPr w:horzAnchor="margin" w:vertAnchor="margin" w:tblpXSpec="right" w:tblpYSpec="bottom" w:leftFromText="180" w:rightFromText="180" w:topFromText="180" w:bottomFromText="180"/><w:tblW w:w="${_SIG_W}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid><w:gridCol w:w="${_SIG_W}"/></w:tblGrid>`
    + lines.map(l => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${_SIG_W}" w:type="dxa"/></w:tcPr><w:p>${_CELL_PPR}<w:r><w:rPr><w:rFonts w:eastAsia="Malgun Gothic"/></w:rPr><w:t xml:space="preserve">${esc(l.trim())}</w:t></w:r></w:p></w:tc></w:tr>`).join('') + '</w:tbl>';

/**
 * @param {string} md
 * @returns {string}
 */
const _mdBody = md => {
    const out = [], lines = String(md || '').split('\n');
    /** @type {string[][] | null} */
    let tbl = null;
    /** @type {string[] | null} */
    let sign = null;
    const flush = () => { if (tbl) { out.push(_tbl(tbl)); tbl = null; } };
    for (const line of lines) {
        const t = line.trim();
        if (t === ':::sign') { flush(); sign = []; continue; }
        if (t === ':::end') { if (sign) { out.push(_sigTbl(sign)); sign = null; } continue; }
        if (sign) { if (t) sign.push(t); continue; }
        if (/^\|[\s:|-]+\|$/.test(t)) continue; // 표 구분행
        if (t.startsWith('|') && t.endsWith('|')) { (tbl = tbl || []).push(t.slice(1, -1).split('|')); continue; }
        flush();
        const h = t.match(/^(#{1,3})\s+(.+)/);
        if (h) { out.push(_h(h[2] || '', (h[1] || '').length === 1 ? 32 : (h[1] || '').length === 2 ? 28 : 24)); continue; }
        if (t === '---') { out.push(_HR); continue; }
        if (t.startsWith('- ')) { out.push(_P('• ' + t.slice(2), 99, 0)); continue; }
        out.push(_P(t, 99, 0));
    }
    flush();
    return out.join('');
};

/**
 * Markdown 초안 → .docx File — # 헤딩·|표|·- 목록·--- 구분선·단락을 구조 보존 변환.
 * @param {string} md - 문서 마크다운
 * @param {string} filename - 확장자 제외 파일명
 */
export function docxFileMd(md, filename) {
    const body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${_mdBody(md)}${_SECT}</w:body></w:document>`;
    const blob = _zipStore(_parts(body));
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
