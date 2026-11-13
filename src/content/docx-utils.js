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

/** @param {string} wm - 워터마크 문구 (있으면 헤더 파트 추가) @param {boolean} [hasImg] - 미디어 파트 포함 여부 */
const _types = (wm, hasImg) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${hasImg ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>${wm ? '<Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}</Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
/** @param {string} wm - 워터마크 문구 @param {number} [nImg] - 본문 이미지 수 (rId6~ 연번) */
const _docrels = (wm, nImg = 0) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${wm ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>' : ''}${[...Array(nImg)].map((_, i) => `<Relationship Id="rId${6 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img_${i}.png"/>`).join('')}</Relationships>`;
// 보기 설정 — 인쇄 레이아웃 + 100% 고정. 생략 시 뷰어가 웹 레이아웃(전체폭·페이지 경계 없음)으로 열 수 있다
const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:view w:val="print"/><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/></w:settings>`;
// 바닥글 — 공문서 쪽 번호(중앙·회색·소자). 1쪽 문서는 번호 생략: { IF {NUMPAGES} > 1 … } 조건부 필드
const _FRP = '<w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:color w:val="595959"/><w:sz w:val="18"/></w:rPr>';
const _fB = `<w:r>${_FRP}<w:fldChar w:fldCharType="begin"/></w:r>`;
const _fE = `<w:r>${_FRP}<w:fldChar w:fldCharType="end"/></w:r>`;
const _fI = (/** @type {string} */ t) => `<w:r>${_FRP}<w:instrText xml:space="preserve"> ${t} </w:instrText></w:r>`;
const _fS = (/** @type {string} */ t) => `<w:r>${_FRP}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${_FRP}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const _fF = (/** @type {string} */ instr, /** @type {string} */ dft) => _fB + _fI(instr) + _fS(dft) + _fE;
const _ifLt = (/** @type {string} */ lit, /** @type {string} */ dft) => _fB + _fI('IF') + _fF('NUMPAGES', '1') + _fI(`&gt; 1 "${lit}"`) + _fS(dft) + _fE;
const FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${_ifLt('— ', '— ')}${_fB}${_fI('IF')}${_fF('NUMPAGES', '1')}${_fI('&gt; 1')}${_fF('PAGE', '1')}${_fE}${_ifLt(' —', ' —')}</w:p></w:ftr>`;

// 워터마크 — 회전 텍스트 상자(wps/DrawingML). 1쪽: 첫 단락 본문 앵커+텍스트 앞(표 음영 위로 보임)·
// 2쪽 이상: 기본 헤더 앵커(본문 뒤, 매 장 반복 — titlePg로 1쪽 제외). textpath(t136)는 경로 기반
// 글리프라 렌더러별 축소·방향 처리가 달라 깨지므로, 일반 단락 텍스트를 담은 상자 자체를 회전
/** 워터마크 폰트 크기 — 문구 길이로 명시 계산 (전각 1em·반각 .55em, 굵게+기울임 보정 ×1.15, 640pt 박스 폭) */
/** @param {string} text @returns {number} pt */
const _wmFont = text => {
    const units = [...String(text)].reduce((a, c) => a + (/[\x20-\x7E]/.test(c) ? 0.55 : 1), 0);
    return Math.min(64, Math.max(24, Math.floor(550 / Math.max(1, units * 1.15))));
};

/** @param {string} text - 워터마크 문구 @param {boolean} [behind] - 헤더용이면 true(텍스트 뒤=네이티브 워터마크 레이어), 본문 앵커용이면 false(텍스트 앞) @param {number} [id] - wp:docPr id (문서 내 유일해야 함 — 중복 시 Word가 파일 손상으로 거부) */
const _wmPara = (text, behind = false, id = 0) => `<w:p><w:pPr><w:spacing w:after="0" w:line="40" w:lineRule="exact"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="margin"><wp:align>center</wp:align></wp:positionV><wp:extent cx="8128000" cy="1143000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id || (behind ? 200 : 100)}" name="워터마크"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm rot="-2700000"><a:off x="0" y="0"/><a:ext cx="8128000" cy="1143000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:color w:val="C0C0C0"/><w:b/><w:i/><w:sz w:val="${_wmFont(text) * 2}"/><w14:textFill xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"><w14:solidFill><w14:srgbClr w14:val="C0C0C0"><w14:alpha w14:val="40000"/></w14:srgbClr></w14:solidFill></w14:textFill></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" horzOverflow="overflow" vertOverflow="overflow"/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;

// 헤더 — 기본 헤더(2쪽 이상 매 장 반복)에 워터마크: 헤더 앵커는 본문 아래 레이어라 네이티브 워터마크와 동일.
// 1쪽은 첫 단락 본문 앵커가 담당하므로 첫 페이지 헤더(header2)는 비움 — titlePg와 세트
/** @param {string} wm - 워터마크 문구 */
const _headerWm = wm => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${_wmPara(wm, true)}</w:hdr>`;
const HEADER_EMPTY = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:spacing w:after="0" w:line="40" w:lineRule="exact"/></w:pPr></w:p></w:hdr>`;

/**
 * @param {string} docXml - word/document.xml 내용 @param {string} wm - 워터마크 문구
 * @param {Array.<{data: Uint8Array}>} [imgs] - 본문 이미지 (word/media/img_N.png 순번)
 * @returns {Array.<[string, Uint8Array]>}
 */
const _parts = (docXml, wm, imgs = []) => [
    ['[Content_Types].xml', _enc.encode(_types(wm, imgs.length > 0))],
    ['_rels/.rels', _enc.encode(RELS)],
    ['word/_rels/document.xml.rels', _enc.encode(_docrels(wm, imgs.length))],
    ['word/document.xml', _enc.encode(docXml)],
    ['word/settings.xml', _enc.encode(SETTINGS)],
    ['word/footer1.xml', _enc.encode(FOOTER)],
    ...(wm ? /** @type {Array.<[string, Uint8Array]>} */([
        ['word/footer2.xml', _enc.encode(FOOTER)], // 첫 페이지 바닥글 — titlePg 대응 (기본과 동일 내용)
        ['word/header1.xml', _enc.encode(_headerWm(wm))],
        ['word/header2.xml', _enc.encode(HEADER_EMPTY)],
    ]) : []),
    ...imgs.map((img, i) => /** @type {[string, Uint8Array]} */([`word/media/img_${i}.png`, img.data])),
];

// 서체 — 라틴·한글 모두 맑은 고딕으로 통일 (미지정 시 라틴은 Calibri로 바뀌어 두서 없음)
const _RF = '<w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/>';
// 단락 — 빈 줄은 빈 단락. 선두 N줄은 굵게(문서 헤더). after 간격으로 줄 호흡 확보
/**
 * @param {string} line
 * @param {number} i
 * @param {number} boldLines
 * @returns {string}
 */
const _P = (line, i, boldLines) => line
    ? `<w:p><w:pPr><w:spacing w:after="40" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${_RF}${i < boldLines ? '<w:b/>' : ''}<w:sz w:val="20"/></w:rPr>${_runs(_wrap(line, _TEXT_W - 300))}</w:r></w:p>`
    : '<w:p><w:pPr><w:spacing w:line="140" w:lineRule="exact"/></w:pPr></w:p>';
// 메타줄 — 제목 바로 아래 기관명·출력일. 중앙·회색·소자로 공문서 머리 격식
/** @param {string} t */
const _meta = t => `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="140"/></w:pPr><w:r><w:rPr>${_RF}<w:color w:val="595959"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;

// 페이지 설정 — A4 세로(orient 명시 — 일부 임포터가 생략 시 가로로 해석) + 좌우 25mm 여백 + 1단·문서 그리드 (Word 정본과 동일한 sectPr 형태)
const _SECT = '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1134" w:right="1417" w:bottom="1134" w:left="1417"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';
// 워터마크 있으면 titlePg — 1쪽: 빈 첫 헤더+본문 앵커(전면) / 2쪽 이상: 기본 헤더 앵커(본문 뒤, 매 장 반복)
/** @param {string} wm - 워터마크 문구 */
const _sect = wm => wm
    ? `<w:sectPr><w:headerReference w:type="default" r:id="rId3"/><w:footerReference w:type="default" r:id="rId2"/><w:headerReference w:type="first" r:id="rId4"/><w:footerReference w:type="first" r:id="rId5"/><w:titlePg/><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1134" w:right="1417" w:bottom="1134" w:left="1417"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`
    : _SECT;

// 다중 페이지 추정 — 본문 XML의 단락·표 행 수로 콘텐츠 높이 근사 (단락≈14pt·행≈22pt, 한 장 본문≈640pt)
// 길다고 판단되면 문서 끝에도 전면 워터마크 앵커를 둬 마지막 쪽도 1쪽과 동일 농도로 표시.
// 헤더 워터마크는 본문 뒤 레이어라 표 음영에 가려 옅어지므로, 전면 앵커가 실질 표시를 담당한다
/** @param {string} bodyXml */
const _isLong = bodyXml =>
    ((bodyXml.match(/<w:p[ >]/g) || []).length * 14 + (bodyXml.match(/<w:tr[ >]/g) || []).length * 22) > 640;

/**
 * @param {string[]} lines
 * @param {number} boldLines
 * @returns {string}
 */
const _doc = (lines, boldLines, wm = '') => {
    const body = lines.map((l, i) => _P(l, i, boldLines)).join('');
    const tail = wm && _isLong(body) ? _wmPara(wm, false, 101) : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"><w:body>${wm ? _wmPara(wm) : ''}${body}${tail}${_sect(wm)}</w:body></w:document>`;
};

/**
 * 텍스트 → .docx File (줄 단위 단락) — 공유·다운로드 공용, 지연 로드 불필요.
 * @param {string} text - 본문 (\n 단락 구분)
 * @param {string} filename - 확장자 제외 파일명
 * @param {number} [boldLines] - 선두 N줄을 굵게 (문서 헤더)
 * @param {string} [wm] - 워터마크 문구 (첫·끝쪽 본문 앵커 전면 + 2쪽~ 기본 헤더 반복)
 */
export function docxFile(text, filename, boldLines = 0, wm = '') {
    const blob = _zipStore(_parts(_doc(String(text || '').split('\n'), boldLines, wm), wm));
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// — MD 서브셋 → WordprocessingML (문서 표준 초안: 헤딩·표·목록·구분선·단락) —

// 표 테두리 — 외곽선 이중(가는선+굵은선 thinThickSmallGap)·내부선 0.5pt. 공문서 격식의 외곽 강조 +
// 이중선은 화면 배율·PDF 변환에서도 외곽이 명확히 보임
const _BORDERS = ['top', 'left', 'bottom', 'right'].map(b => `<w:${b} w:val="thinThickSmallGap" w:sz="18" w:color="404040"/>`).join('')
    + ['insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:color="BFBFBF"/>`).join('');
// 표 레이아웃 — 본문 폭 고정 dxa (A4 11906 − 좌우 여백 1417×2 = 9072) + 균등 열 그리드 + 셀 내부 여백.
// pct(상대폭)는 한글 등 일부 임포터가 미지원해 표가 본문 폭 밖으로 렌더될 수 있어 dxa 고정 사용.
const _TEXT_W = 9072;
const _CELL_MAR = '<w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>';
// 셀 단락 — kinsoku(동아시아 금칙 규칙) + wordWrap=off(라틴 단어 중간 분할 금지).
// 주의: Word는 한글을 음절 단위로 끊으며 어절 단위 강제 OOXML 스위치가 없다(COM 실측 —
// kinsoku·wordWrap·lang=ko-KR·noLineBreaksAfter·useFELayout 모두 중간 분리 유지).
// 그래서 어절 줄넘김은 생성 측에서 폭 추정 후 <w:br/>를 직접 삽입해 구현한다.
const _CELL_PPR = '<w:pPr><w:kinsoku/><w:wordWrap w:val="off"/><w:spacing w:line="276" w:lineRule="auto"/></w:pPr>';
// 글자 폭 — 맑은고딕 10pt(w:sz 20 명시): 한글·전각 200tw(1em 정확), ASCII·반각 110tw(보수 추정).
// 폰트 크기를 명시하지 않으면 뷰어 기본값에 따라 달라져 어절 분리가 깨지므로 sz를 고정한다.
const _cw = (/** @type {string} */ c) => ((c.codePointAt(0) || 0) < 128 ? 110 : 200);
/**
 * 어절 단위 사전 줄바꿈 — usable(dxa) 폭에 맞게 공백 경계에서만 분리.
 * 어절 하나가 폭을 넘으면 그대로 둔다 (그 경우 Word의 음절 분리가 불가피 — 중간 강제 분할보다 자연스러움).
 * @param {string} t @param {number} usable - dxa
 * @returns {string[]}
 */
const _wrap = (t, usable) => {
    const lines = []; let line = '', lw = 0;
    for (const tok of String(t).split(/( +)/)) {
        const tw = [...tok].reduce((n, c) => n + _cw(c), 0);
        if (line && lw + tw > usable) {
            lines.push(line.trimEnd());
            line = tok.trimStart();
            lw = [...line].reduce((n, c) => n + _cw(c), 0);
        } else { line += tok; lw += tw; }
    }
    if (line || !lines.length) lines.push(line.trimEnd());
    return lines;
};
/** 줄 배열 → 단일 런의 t/br 시퀀스 */
/** @param {string[]} lines */
const _runs = lines => lines.map(l => `<w:t xml:space="preserve">${esc(l)}</w:t>`).join('<w:br/>');
const _estW = (/** @type {string} */ t) => [...String(t)].reduce((n, c) => n + _cw(c), 0);
const _CPAD = 280; // 셀 좌우 여백(100×2)+테두리 여유
/**
 * 열 너비 배분 — 내용 폭 추정 기반 (HTML auto-layout 유사). min=최장 어절 수용 폭, pref=한 줄 수용 폭.
 * pref 합계가 본문 폭 이하면 잉여를 pref 비율로, 넘으면 min 확보 후 잉여를 (pref−min) 비율로 배분한다.
 * @param {string[][]} rows @returns {number[]}
 */
const _colWs = rows => {
    const n = Math.max(1, ...rows.map(r => r.length));
    const min = Array(n).fill(900), pref = Array(n).fill(900);
    for (const r of rows) r.forEach((c, i) => {
        const t = String(c).trim();
        pref[i] = Math.max(pref[i], _estW(t) + _CPAD);
        min[i] = Math.max(min[i], Math.min(_estW(t.split(/ +/).sort((a, b) => _estW(b) - _estW(a))[0] || '') + _CPAD, pref[i]));
    });
    const cap = Math.floor(_TEXT_W * 0.6);
    const pf = pref.map(p => Math.min(p, cap));
    const sp = pf.reduce((a, b) => a + b, 0), sm = min.reduce((a, b) => a + b, 0);
    let ws, fixIdx = n - 1;
    // 잉여 배분 가중 — 줄바꿈으로 늘어날 수 있는 열(pref>min)만 잉여를 받는다. 고정 폭 레이블 열은 제외
    const grow = pf.map((p, i) => Math.max(0, p - min[i]));
    const sg = grow.reduce((a, b) => a + b, 0);
    if (sp <= _TEXT_W) ws = pf.map((p, i) => Math.floor(p + (_TEXT_W - sp) * (sg ? (grow[i] || 0) / sg : 1 / n)));
    else if (sm < _TEXT_W) ws = pf.map((p, i) => Math.floor((min[i] || 0) + (_TEXT_W - sm) * (((p) - (min[i] || 0)) / Math.max(1, sp - sm))));
    else if (400 * n < _TEXT_W) {
        // min 합계조차 초과(다열 표) — min 비율 축소 배분. 어절 분리는 불가피하나 균등 절삭보다 낫다
        const k = _TEXT_W / sm;
        ws = min.map(m => Math.max(400, Math.floor(m * k)));
        fixIdx = ws.indexOf(Math.max(...ws)); // 잔여 보정은 가장 넓은 열에
    } else ws = Array(n).fill(Math.floor(_TEXT_W / n));
    // 헤더 어절 폭은 하한 — 항목명(대상자·방문객 등) 줄넘김 금지. 초과분은 여유 열에서 회수
    const hw = (rows[0] || []).map(c => _estW(String(c).trim().split(/ +/).sort((a, b) => _estW(b) - _estW(a))[0] || '') + _CPAD);
    ws = ws.map((w, i) => Math.max(w, hw[i] || 0));
    const over = ws.reduce((a, b) => a + b, 0) - _TEXT_W;
    if (over > 0) {
        const room = ws.map((w, i) => Math.max(0, w - (hw[i] || 0)));
        const sr = room.reduce((a, b) => a + b, 0);
        if (sr > 0) ws = ws.map((w, i) => w - Math.min(room[i] || 0, Math.ceil(over * (room[i] || 0) / sr)));
    }
    ws[fixIdx] = (ws[fixIdx] || 0) + _TEXT_W - ws.reduce((a, b) => a + b, 0); // 반올림 잔여 보정
    return ws;
};
/**
 * @param {string} c
 * @param {boolean} head
 * @param {number} [w] - 셀 너비 (dxa)
 * @param {string} [shd] - 배경색 (헤더 DEEAF6·레이블 F2F2F2·줄무늬 F7F9FC)
 * @param {boolean} [center] - 본문 셀 중앙 정렬 (레이블 열)
 * @returns {string}
 */
const _cell = (c, head, w, shd, center) => {
    const ppr = _CELL_PPR.replace('</w:pPr>', `${head || center ? '<w:jc w:val="center"/>' : ''}</w:pPr>`);
    return `<w:tc><w:tcPr>${w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : ''}${shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr><w:p>${ppr}<w:r><w:rPr>${_RF}${head ? '<w:b/>' : ''}<w:sz w:val="20"/></w:rPr>${_runs(_wrap(c.trim(), Math.max(400, (w || _TEXT_W) - _CPAD)))}</w:r></w:p></w:tc>`;
};
/**
 * @param {string[][]} rows
 * @returns {string}
 */
const _tbl = rows => {
    const ws = _colWs(rows);
    const n = ws.length;
    const grid = ws.map(w => `<w:gridCol w:w="${w}"/>`).join('');
    const wAt = (/** @type {number} */ i) => ws[i];
    // 첫 행 tblHeader(페이지 넘김 시 표머리 반복) + cantSplit(행이 페이지 경계에서 쪼개지지 않음) + 최소 행 높이 24pt
    return `<w:tbl><w:tblPr><w:tblW w:w="${_TEXT_W}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>`
        + rows.map((r, i) => `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="400" w:hRule="atLeast"/>${i === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${r.map((c, ci) => {
            const shd = i === 0 ? 'DEEAF6' : (n === 2 && ci === 0 ? 'F2F2F2' : (i % 2 === 0 ? 'F7F9FC' : ''));
            return _cell(c, i === 0, wAt(ci), shd, n === 2 && ci === 0);
        }).join('')}</w:tr>`).join('') + '</w:tbl>';
};
// 제목 서체 — 공문서 관행에 따라 문서 제목만 명조계(바탕)로 전환. 본문은 맑은 고딕 유지
const _RF_T = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="바탕"/>';
// 헤딩 — # 는 문서 제목(중앙·대자·명조), ## 는 절 제목(하단 가는 선), ### 는 소제목
/**
 * @param {string} t
 * @param {number} lv - 헤딩 깊이 1~3
 * @returns {string}
 */
const _h = (t, lv) => lv === 1
    ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80" w:after="80"/></w:pPr><w:r><w:rPr>${_RF_T}<w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`
    : `<w:p><w:pPr><w:spacing w:before="160" w:after="80"/>${lv === 2 ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/></w:pBdr>' : ''}</w:pPr><w:r><w:rPr>${_RF}<w:b/><w:sz w:val="${lv === 2 ? 28 : 24}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const _HR = '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="999999"/></w:pBdr></w:pPr></w:p>';

// 결재란 — 공문서 상단 우측 승인 표 ('결 재' 세로병합 + 담당·팀장·시설장 빈 서명칸).
// 서명 문서(:::sign 포함)에만 부여
const _AW = 840; // 결재란 열 폭 — '시설장'(600tw)+셀 여백(200tw) 수용 하한
const _APPR_W = _AW * 4;
// 인라인 jc=right도 셀 여백+테두리만큼 우측 가이드선을 넘어감(PDF 실측) — 부동 표+tblpX 보정은 서명란과 동일
const _APPR_X = _TEXT_W - _APPR_W + 102;
const _cellPprC = _CELL_PPR.replace('</w:pPr>', '<w:jc w:val="center"/></w:pPr>');
const _apprCell = (/** @type {string} */ t, /** @type {boolean} */ merge, /** @type {boolean} */ cont) => `<w:tc><w:tcPr><w:tcW w:w="${_AW}" w:type="dxa"/>${merge ? `<w:vMerge${cont ? '' : ' w:val="restart"'}/>` : ''}${t && !cont ? '<w:shd w:val="clear" w:color="auto" w:fill="DEEAF6"/>' : ''}<w:vAlign w:val="center"/></w:tcPr>${t ? `<w:p>${_cellPprC}<w:r><w:rPr>${_RF}<w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>` : '<w:p/>'}</w:tc>`;
// 담당 칸 서명 — 셀(42pt)에 맞게 축소 인라인. 같은 rId의 a:blip을 extent만 줄여 참조 (미디어 파트 중복 없음)
const _apprImgCell = (/** @type {{rid:string,cx:number,cy:number,id:number}} */ im) => `<w:tc><w:tcPr><w:tcW w:w="${_AW}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p>${_cellPprC}${_imgRun({ rid: im.rid, cx: Math.round(im.cx * 0.42), cy: Math.round(im.cy * 0.42), id: im.id + 50 })}</w:p></w:tc>`;
/** @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} [imgMap] */
const _approve = (imgMap = {}) => `<w:tbl><w:tblPr><w:tblpPr w:horzAnchor="margin" w:vertAnchor="margin" w:tblpX="${_APPR_X}" w:tblpYSpec="top" w:leftFromText="180" w:rightFromText="180" w:topFromText="60" w:bottomFromText="120"/><w:tblW w:w="${_APPR_W}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid>${`<w:gridCol w:w="${_AW}"/>`.repeat(4)}</w:tblGrid>`
    + `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="400" w:hRule="atLeast"/></w:trPr>`
    + _apprCell('결 재', true, false)
    + ['담당', '팀장', '시설장'].map(t => _apprCell(t, false, false)).join('')
    + `</w:tr><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="640" w:hRule="atLeast"/></w:trPr>`
    + _apprCell('', true, true)
    + (imgMap.author ? _apprImgCell(imgMap.author) : _apprCell('', false, false))
    + _apprCell('', false, false) + _apprCell('', false, false)
    + '</w:tr></w:tbl>';
// 문서 종결 — 공문서 관행의 '끝.' 표기 (중앙)
const _END = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80"/></w:pPr><w:r><w:rPr>${_RF}<w:sz w:val="20"/></w:rPr><w:t>끝.</w:t></w:r></w:p>`;

// 서명란 — 본문 여백 영역 하단 우측에 부동 표(tblpPr — Word 텍스트 상자와 동일한 앵커 방식).
// 문서 끝에 배치하면 마지막 페이지 하단 오른쪽에 고정된다. 첫 행은 발신일(중앙), 서명행은 (인) 표기
const _SIG_W = 4200;
// tblpX는 좌측 셀 여백(100)+테두리 반폭만큼 좌측으로 치우쳐 렌더되고 이중 외곽선은 ~38tw 더 바깥에 그려짐(PDF 실측) — 102tw 보정으로 본문 표 우측선과 정합
const _SIG_X = _TEXT_W - _SIG_W + 102;
const _docDate = () => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };

// 인라인 이미지 런 — 서명란 `{{img:key}}` 토큰 치환용. rIdN 관계의 word/media/img_N.png 참조
/** @param {{rid:string, cx:number, cy:number, id:number}} img */
const _imgRun = img => `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${img.cx}" cy="${img.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${img.id}" name="서명"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="sign.png" descr="서명"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${img.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

// 서명 셀 내용 — `{{img:key}}` 토큰이 있고 이미지가 지정되면 라벨+서명 이미지((인)은 이미지에 합성), 아니면 텍스트+(인)
/** @param {string} line @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} imgMap */
const _sigRuns = (line, imgMap) => {
    const m = line.match(/\{\{img:([\w-]+)\}\}/);
    const im = m ? imgMap[m[1] || ''] : undefined;
    if (m && im) {
        const label = line.replace(m[0], '').trim();
        return `<w:r><w:rPr>${_RF}<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(label + '　　　　')}</w:t></w:r>${_imgRun(im)}`;
    }
    const t = (m ? line.replace(m[0], '＿＿＿＿＿＿＿＿') : line).trim();
    return `<w:r><w:rPr>${_RF}<w:sz w:val="20"/></w:rPr>${_runs(_wrap(t + (/\(인\)\s*$/.test(t) ? '' : ' (인)'), _SIG_W - 300))}</w:r>`;
};
/** @param {string[]} lines @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} [imgMap] */
const _sigTbl = (lines, imgMap = {}) => `<w:tbl><w:tblPr><w:tblpPr w:horzAnchor="margin" w:vertAnchor="margin" w:tblpX="${_SIG_X}" w:tblpYSpec="bottom" w:leftFromText="180" w:rightFromText="180" w:topFromText="180" w:bottomFromText="180"/><w:tblW w:w="${_SIG_W}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid><w:gridCol w:w="${_SIG_W}"/></w:tblGrid>`
    + `<w:tr><w:tc><w:tcPr><w:tcW w:w="${_SIG_W}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p>${_cellPprC}<w:r><w:rPr>${_RF}<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${_docDate()}</w:t></w:r></w:p></w:tc></w:tr>`
    + lines.map(l => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${_SIG_W}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p>${_CELL_PPR}${_sigRuns(l, imgMap)}</w:p></w:tc></w:tr>`).join('') + '</w:tbl>';

/**
 * @param {string} md
 * @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} [imgMap]
 * @returns {string}
 */
const _mdBody = (md, imgMap = {}) => {
    const out = [], lines = String(md || '').split('\n');
    if (/^:::sign\s*$/m.test(md)) out.push(_approve(imgMap)); // 서명 문서는 결재란 선두 부여 (images.author 있으면 담당 칸 서명)
    /** @type {string[][] | null} */
    let tbl = null;
    /** @type {string[] | null} */
    let sign = null;
    let meta = false; // # 제목 직후 첫 단락 → 기관명·출력일 메타줄
    const flush = () => { if (tbl) { out.push(_tbl(tbl)); tbl = null; } };
    for (const line of lines) {
        const t = line.trim();
        if (t === ':::sign') { flush(); sign = []; meta = false; continue; }
        if (t === ':::end') { if (sign) { out.push(_sigTbl(sign, imgMap)); sign = null; } continue; }
        if (sign) { if (t) sign.push(t); continue; }
        if (/^\|[\s:|-]+\|$/.test(t)) continue; // 표 구분행
        if (t.startsWith('|') && t.endsWith('|')) { meta = false; (tbl = tbl || []).push(t.slice(1, -1).split('|')); continue; }
        flush();
        const h = t.match(/^(#{1,3})\s+(.+)/);
        if (h) { out.push(_h(h[2] || '', (h[1] || '').length)); meta = (h[1] || '').length === 1; continue; }
        if (meta && t) { meta = false; out.push(_meta(t)); continue; }
        if (!t) { out.push(_P('', 99, 0)); continue; } // 빈 줄 — meta 플래그 유지
        meta = false;
        if (t === '---') { out.push(_HR); continue; }
        if (t.startsWith('- ')) { out.push(_P('• ' + t.slice(2), 99, 0)); continue; }
        out.push(_P(t, 99, 0));
    }
    flush();
    return out.join('') + _END; // 공문서 종결 표기
};

/**
 * Markdown 초안 → .docx File — # 헤딩·|표|·- 목록·--- 구분선·단락을 구조 보존 변환.
 * @param {string} md - 문서 마크다운
 * @param {string} filename - 확장자 제외 파일명
 * @param {string} [wm] - 워터마크 문구 (첫·끝쪽 본문 앵커 전면 + 2쪽~ 기본 헤더 반복)
 * @param {{images?: Object<string,{data:Uint8Array,w:number,h:number}>}} [opts] - images: `{{img:key}}` 토큰(서명란) 치환용 PNG 바이트 + 표시 크기(px)
 */
export function docxFileMd(md, filename, wm = '', opts = {}) {
    const imgs = Object.entries(opts.images || {}).map(([key, im], i) => ({ key, data: im.data, cx: (im.w || 90) * 9525, cy: (im.h || 60) * 9525, rid: `rId${6 + i}`, id: 300 + i }));
    const imgMap = Object.fromEntries(imgs.map(x => [x.key, x]));
    const mdBody = _mdBody(md, imgMap);
    const tail = wm && _isLong(mdBody) ? _wmPara(wm, false, 101) : '';
    const body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"><w:body>${wm ? _wmPara(wm) : ''}${mdBody}${tail}${_sect(wm)}</w:body></w:document>`;
    const blob = _zipStore(_parts(body, wm, imgs));
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
