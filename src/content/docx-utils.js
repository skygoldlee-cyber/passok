// src/content/docx-utils.js — Word(.docx) 생성 — 미니멀 OOXML, 의존성 없음
// @spec CO-13 — 출력 문서 Word 파일 공유/다운로드
// 문서가 단락 텍스트뿐이라 [Content_Types].xml + _rels/.rels + word/document.xml
// 3엔트리면 Word·HWP·Google Docs 모두 정상 개방된다 — 라이브러리 벤더 불필요.
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
    for (let i = 0; i < buf.length; i++) c = _CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
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

/** zip 무압축(stored) 작성 — local headers → central directory → EOCD. 미설정 필드는 0 (flags·method·extra). */
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
    return new Blob([...chunks, ...central, new Uint8Array(e.buffer)]);
};

const TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

// 단락 — eastAsia 폰트 명시로 한글이 맑은 고딕 계열로 렌더. 빈 줄은 빈 단락. 선두 N줄은 굵게(문서 헤더).
const _P = (line, i, boldLines) => line
    ? `<w:p><w:r><w:rPr><w:rFonts w:eastAsia="Malgun Gothic"/>${i < boldLines ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`
    : '<w:p/>';

const _doc = (lines, boldLines) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map((l, i) => _P(l, i, boldLines)).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;

/**
 * 텍스트 → .docx File (줄 단위 단락) — 공유·다운로드 공용, 지연 로드 불필요.
 * @param {string} text - 본문 (\n 단락 구분)
 * @param {string} filename - 확장자 제외 파일명
 * @param {number} [boldLines] - 선두 N줄을 굵게 (문서 헤더)
 */
export function docxFile(text, filename, boldLines = 0) {
    const blob = _zipStore([
        ['[Content_Types].xml', _enc.encode(TYPES)],
        ['_rels/.rels', _enc.encode(RELS)],
        ['word/document.xml', _enc.encode(_doc(String(text || '').split('\n'), boldLines))],
    ]);
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
