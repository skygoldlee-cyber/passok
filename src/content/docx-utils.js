// src/content/docx-utils.js — Word(.docx) 생성 — 미니멀 OOXML, 의존성 없음
// @spec CO-13,CO-22,DA-24 — 출력 문서 Word 파일 공유/다운로드 (MD 초안 → docx 파생) + 문서 추적 메타(opts.doc)
// [Content_Types]·_rels·document·document.rels·styles·settings·(+header)·footer 엔트리면
// Word·HWP·Google Docs 정상 개방 — settings.xml로 인쇄 레이아웃(A4 페이지 경계 표시)을 강제한다.
// opts.doc(문서 추적 메타 {no,org,title,rev,qr}) 지정 시 docProps/core.xml·푸터 문서번호·
// 푸터 QR 표를 추가한다 — docProps 파트는 OOXML 표준이라 모든 뷰어가 무시하거나 읽는다.
import { esc } from '../core/sanitize.js';

const _enc = new TextEncoder();

// 단락 공통 — 한글↔라틴(autoSpaceDE)·한글↔숫자(autoSpaceDN) 자동 간격 끄기. 미명시 시 뷰어 기본값 ON이라
// 숫자·라틴 밀집 본문(비용 계산서 등)의 어절 간격이 벌어져 보인다 — pPr 시퀀스상 spacing·jc 앞에 위치
const _NOSPACE = '<w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/>';

// wp:docPr id 할당기 — 그리기 요소 id는 파트 내 유일해야 하므로 문서 생성마다 순번 발급.
// 하드코딩 상수(구 100/300/400/500/600)는 이미지가 늘면 중복돼 Word가 '읽을 수 없는 내용' 경고를 낸다.
let _dpId = 100;
const _dpNext = () => _dpId++;

// 본문 폭 — :::landscape 마커 문서는 가로(A4 16838−여백 2834=14004). 문서 생성 시작 시 리셋.
const _TW_PORT = 9072, _TW_LAND = 14004;
let _TW = _TW_PORT;

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

/** @param {boolean} [hasImg] - 미디어 파트 포함 여부 @param {boolean} [hasCore] - docProps/core.xml 포함 여부 @param {boolean} [hasHdr] - header1.xml(워터마크) 포함 여부 */
const _types = (hasImg, hasCore, hasHdr) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${hasImg ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${hasHdr ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>${hasCore ? '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' : ''}</Types>`;
/** @param {boolean} [hasCore] - docProps/core.xml 패키지 관계 포함 여부 */
const _rels = hasCore => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>${hasCore ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' : ''}</Relationships>`;
// 본문 관계 — rId1 settings·rId2 footer·rId3 styles·rId4 header(워터마크 시)·이미지 rId6~ 연번.
// rId5는 결번으로 둔다 — 이미지 시작 번호(rId6)를 기존 문서와 유지하기 위함
/** @param {number} [nImg] - 본문 이미지 수 (rId6~ 연번) @param {boolean} [hasHdr] - header 관계 포함 여부 */
const _docrels = (nImg = 0, hasHdr = false) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${hasHdr ? '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : ''}${[...Array(nImg)].map((_, i) => `<Relationship Id="rId${6 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img_${i}.png"/>`).join('')}</Relationships>`;
// 헤더 파트 자체 관계 — 헤더 안 그림(워터마크 PNG)은 반드시 header1.xml.rels에서 참조한다
// (r:embed는 소속 파트의 관계 기준 — 본문 rels에 넣으면 참조 실패)
const _HDR_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img_wm.png"/></Relationships>`;
/** 헤더 본문 — 워터마크 앵커 단락 1개 (xmlns:r는 그림 r:embed 참조에 필요) */
const _header = (/** @type {string} */ para) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${para}</w:hdr>`;
// 스타일 — docDefaults로 기본 글꼴(맑은 고딕)·언어(ko-KR) 선언 + 제목 스타일(탐색창·북마크·접근성용).
// 직접 서식은 유지 — styles.xml을 무시하는 단순 뷰어에서도 동일 결과가 나오도록.
// w:lang eastAsia="ko-KR" — 맞춤법 검사·한글 금칙(줄바꿈)이 영어 기준으로 굴러가는 것을 막는다.
const _STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic" w:cs="Malgun Gothic"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="ko-KR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
// 보기 설정 — 인쇄 레이아웃 + 100% 고정. 생략 시 뷰어가 웹 레이아웃(전체폭·페이지 경계 없음)으로 열 수 있다
const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:view w:val="print"/><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/></w:settings>`;
// 바닥글 — 공문서 쪽 번호(중앙·회색·소자) '— 쪽 / 전체 —'. LibreOffice·한컴·모바일 미리보기는
// IF 필드를 계산하지 못해 '11'로 깨져 표시되므로 조건부 IF 중첩은 쓰지 않고 PAGE/NUMPAGES만 둔다.
const _FRP = '<w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic" w:cs="Malgun Gothic"/><w:color w:val="595959"/><w:sz w:val="18"/></w:rPr>';
const _fB = `<w:r>${_FRP}<w:fldChar w:fldCharType="begin"/></w:r>`;
const _fE = `<w:r>${_FRP}<w:fldChar w:fldCharType="end"/></w:r>`;
const _fI = (/** @type {string} */ t) => `<w:r>${_FRP}<w:instrText xml:space="preserve"> ${t} </w:instrText></w:r>`;
const _fS = (/** @type {string} */ t) => `<w:r>${_FRP}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${_FRP}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const _fF = (/** @type {string} */ instr, /** @type {string} */ dft) => _fB + _fI(instr) + _fS(dft) + _fE;
const _FRP_NO = _FRP.replace('<w:sz w:val="18"/>', '<w:sz w:val="14"/>'); // 문서번호행 — 쪽 번호보다 한 단계 소자
// 푸터 QR — 본문 종결 부동 표 안 wp:inline 이미지는 인쇄→PDF·일부 변환 경로에서 탈락해
// (Word 화면엔 보이고 PDF엔 없는 증상) 푸터 일반 표로 옮겼다. 푸터는 렌더러 무관 동일 출력·
// 모든 쪽 반복이라 쪽마다 진위 확인이 가능하다.
const _FTR_QR_EMU = 504000; // 푸터 QR 0.55" — 본문(0.75") 대비 소형으로 푸터 높이 절약
const _FTR_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img_qr.png"/></Relationships>`;
/** @param {{rid:string, id:number}} img @param {string} no */
const _ftrQrTbl = (img, no) => `<w:tbl><w:tblPr><w:tblW w:w="${_TW}" w:type="dxa"/><w:tblBorders>${_QR_NIL_B}</w:tblBorders><w:tblLayout w:type="fixed"/>${_TCMAR0}</w:tblPr><w:tblGrid><w:gridCol w:w="1200"/><w:gridCol w:w="${_TW - 1200}"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr>${_NOSPACE}</w:pPr>${_imgRun({ ...img, cx: _FTR_QR_EMU, cy: _FTR_QR_EMU, name: '문서번호 QR', file: 'docno.png', desc: `문서번호 QR ${no || ''}` })}</w:p></w:tc>`
    + `<w:tc><w:tcPr><w:tcW w:w="${_TW - 1200}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>`
    + `<w:p><w:pPr>${_NOSPACE}</w:pPr><w:r><w:rPr>${_RF}<w:color w:val="595959"/><w:sz w:val="14"/></w:rPr><w:t xml:space="preserve">진위 확인 — 발행 대장 대조</w:t></w:r></w:p>`
    + (no ? `<w:p><w:pPr>${_NOSPACE}</w:pPr><w:r><w:rPr>${_FRP_NO}</w:rPr><w:t xml:space="preserve">문서번호 ${esc(no)}</w:t></w:r></w:p>` : '')
    + `</w:tc></w:tr></w:tbl>`;
// 푸터 QR 캡션·문서번호는 우측이 아닌 QR 옆 좌측 정렬 — 서명 부동 표(우측 하단)와 겹치지 않도록
/** @param {string} [docNo] - 문서 추적 번호 — 지정 시 쪽 번호 아래 소자로 모든 쪽에 표기
 *  @param {?{rid:string, id:number}} [qr] - 문서번호 QR — 지정 시 QR+캡션·번호 표 + 중앙 쪽 번호 */
const _footer = (docNo, qr = null) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${qr ? `${_ftrQrTbl(qr, docNo || '')}<w:p><w:pPr>${_NOSPACE}<w:spacing w:before="20"/><w:jc w:val="center"/></w:pPr><w:r>${_FRP}<w:t xml:space="preserve">— </w:t></w:r>${_fF('PAGE', '1')}<w:r>${_FRP}<w:t xml:space="preserve"> / </w:t></w:r>${_fF('NUMPAGES', '1')}<w:r>${_FRP}<w:t xml:space="preserve"> —</w:t></w:r></w:p>` : `<w:p><w:pPr>${_NOSPACE}<w:jc w:val="center"/></w:pPr><w:r>${_FRP}<w:t xml:space="preserve">— </w:t></w:r>${_fF('PAGE', '1')}<w:r>${_FRP}<w:t xml:space="preserve"> / </w:t></w:r>${_fF('NUMPAGES', '1')}<w:r>${_FRP}<w:t xml:space="preserve"> —</w:t></w:r></w:p>${docNo ? `<w:p><w:pPr>${_NOSPACE}<w:spacing w:before="20"/><w:jc w:val="center"/></w:pPr><w:r>${_FRP_NO}<w:t xml:space="preserve">문서번호 ${esc(docNo)}</w:t></w:r></w:p>` : ''}`}</w:ftr>`;

// 코어 속성 — docProps/core.xml. 파일이 복사·이름변경돼도 문서번호·기관·판본이 파일 안에 남는다
// (파일명만 바꾸면 추적 불가 — 추적성의 파일 내장 층). revision은 발행 차수(재발행 시 증가)
/** @param {{no?:string, org?:string, title?:string, rev?:number}} [doc] @param {string} [titleFallback] */
const _coreXml = (doc = {}, titleFallback = '') => {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(doc.title || titleFallback)}</dc:title>${doc.no ? `<dc:identifier>${esc(doc.no)}</dc:identifier>` : ''}${doc.org ? `<dc:creator>${esc(doc.org)}</dc:creator><cp:lastModifiedBy>${esc(doc.org)}</cp:lastModifiedBy>` : ''}<cp:revision>${Math.max(1, doc.rev || 0)}</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
};

// 워터마크 — 회전 상자 앵커를 header1.xml에 1개 배치한다. 헤더 도형은 렌더러가 본문과 무관하게
// 모든 쪽에 반복 출력하므로 본문 분산 삽입(_sprayWm 구버전)이 불필요하다.
// 헤더 도형은 본문 아래층에 그려지지만, ①의 알파 구운 PNG는 텍스트 뒤에서도 동일 농도로
// 보이므로 표준 워터마크(문자 뒤 배치) 외형 그대로다.
// 표현은 2경로:
//   ① wmImg(알파 구운 PNG, pic 앵커) — 이미지 알파라 렌더러 무관 동일 농도 (미리보기·PDF와 동일)
//   ② wm 텍스트(wps 상자) — PNG 생성 불가 환경 폴백
// textpath(t136)는 경로 기반 글리프라 렌더러별 축소·방향 처리가 달라 깨지므로,
// 일반 단락 텍스트를 담은 상자 자체를 회전
/** 워터마크 폰트 크기 — 문구 길이로 명시 계산 (전각 1em·반각 .55em, 굵게+기울임 보정 ×1.15, 640pt 박스 폭) */
/** @param {string} text @returns {number} pt */
const _wmFont = text => {
    const units = [...String(text)].reduce((a, c) => a + (/[\x20-\x7E]/.test(c) ? 0.55 : 1), 0);
    return Math.min(64, Math.max(24, Math.floor(550 / Math.max(1, units * 1.15))));
};

// 앵커 래퍼 — 용지 중앙 정렬 640×90pt 상자, id는 문서 내 유일 (중복 시 Word가 파일 손상으로 거부).
// relativeFrom="page" + align=center — Word가 실제 용지 크기 기준으로 중앙을 계산하므로
// 세로·가로 방향을 자동 인지한다 (고정 posOffset은 방향별 재계산이 필요해 사용하지 않음).
// layoutInCell="0" — 표 안/표 사이 단락의 앵커가 셀 기준으로 해석되는 것을 차단.
const _wmOpen = (/** @type {number} */ id, /** @type {number} */ behind) => `<w:p><w:pPr><w:spacing w:after="0" w:line="40" w:lineRule="exact"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="${behind}" locked="0" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV><wp:extent cx="12192000" cy="1270000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id || _dpNext()}" name="워터마크" descr="워터마크"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="`;
const _wmClose = `</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;

/** @param {string} rid - 이미지 관계 id (rIdN) @param {number} [id] - wp:docPr id */
const _wmPicPara = (rid, id = 0) => `${_wmOpen(id, 0)}http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="wm.png" descr="워터마크"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm rot="-2700000"><a:off x="0" y="0"/><a:ext cx="12192000" cy="1270000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>${_wmClose}`;

/** @param {string} text - 워터마크 문구 @param {number} [id] - wp:docPr id */
const _wmPara = (text, id = 0) => `${_wmOpen(id, 1)}http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm rot="-2700000"><a:off x="0" y="0"/><a:ext cx="12192000" cy="1270000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr>${_NOSPACE}<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:color w:val="C0C0C0"/><w:b/><w:i/><w:sz w:val="${_wmFont(text) * 2}"/><w14:textFill xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"><w14:solidFill><w14:srgbClr w14:val="C0C0C0"><w14:alpha w14:val="100000"/></w14:srgbClr></w14:solidFill></w14:textFill></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" horzOverflow="overflow" vertOverflow="overflow"/></wps:wsp>${_wmClose}`;

/** @param {?{xml:string, img?:?{data:Uint8Array}}} hdr @returns {Array.<[string, Uint8Array]>} */
const _hdrParts = hdr => (hdr ? [
    /** @type {[string, Uint8Array]} */(['word/header1.xml', _enc.encode(hdr.xml)]),
    ...(hdr.img ? [ /** @type {[string, Uint8Array]} */(['word/_rels/header1.xml.rels', _enc.encode(_HDR_RELS)]), /** @type {[string, Uint8Array]} */(['word/media/img_wm.png', hdr.img.data]) ] : []),
] : []);
/** @param {?{data:Uint8Array}} qr - 푸터 QR — 자체 관계·미디어 파트 (본문 이미지 풀과 분리) @returns {Array.<[string, Uint8Array]>} */
const _qrParts = qr => (qr ? [
    /** @type {[string, Uint8Array]} */(['word/_rels/footer1.xml.rels', _enc.encode(_FTR_RELS)]),
    /** @type {[string, Uint8Array]} */(['word/media/img_qr.png', qr.data]),
] : []);
/**
 * @param {string} docXml - word/document.xml 내용
 * @param {Array.<{data: Uint8Array}>} [imgs] - 본문 이미지 (word/media/img_N.png 순번)
 * @param {?{no?:string, org?:string, title?:string, rev?:number, date?:string, qr?:{data:Uint8Array}}} [doc] - 문서 추적 메타 — 지정 시 docProps/core.xml·푸터 문서번호·푸터 QR 추가
 * @param {?{xml:string, img?:?{data:Uint8Array}}} [hdr] - header1.xml 내용 (+워터마크 PNG 시 자체 rels·미디어 동봉)
 * @returns {Array.<[string, Uint8Array]>}
 */
const _parts = (docXml, imgs = [], doc = null, hdr = null) => {
    const qr = _qrMeta(doc);
    return [
        ['[Content_Types].xml', _enc.encode(_types(imgs.length > 0 || !!qr || !!(hdr && hdr.img), !!doc, !!hdr))],
        ['_rels/.rels', _enc.encode(_rels(!!doc))],
        ['word/_rels/document.xml.rels', _enc.encode(_docrels(imgs.length, !!hdr))],
        ['word/document.xml', _enc.encode(docXml)],
        ['word/styles.xml', _enc.encode(_STYLES)],
        ['word/settings.xml', _enc.encode(SETTINGS)],
        ..._hdrParts(hdr),
        ['word/footer1.xml', _enc.encode(_footer(doc ? doc.no : undefined, qr ? { rid: 'rId1', id: _dpNext() } : null))],
        ..._qrParts(qr),
        ...(doc ? [/** @type {[string, Uint8Array]} */(['docProps/core.xml', _enc.encode(_coreXml(doc))])] : []),
        ...imgs.map((img, i) => /** @type {[string, Uint8Array]} */([`word/media/img_${i}.png`, img.data])),
    ];
};

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
    ? `<w:p><w:pPr>${_NOSPACE}<w:snapToGrid w:val="0"/><w:spacing w:after="40" w:line="336" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr>${_RF}${i < boldLines ? '<w:b/>' : ''}<w:sz w:val="22"/></w:rPr>${_runs(_wrap(line, _TW - 300))}</w:r></w:p>`
    : `<w:p><w:pPr>${_NOSPACE}<w:spacing w:line="150" w:lineRule="exact"/></w:pPr></w:p>`;
// 메타줄 — 제목 바로 아래 기관명·출력일. 중앙·회색·소자로 공문서 머리 격식
/** @param {string} t */
// 메타줄(기관명·출력일) — 중앙 소자 + 하단 가는선 (공문서 제목-본문 분리 관행)
const _meta = t => `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="10" w:color="999999"/></w:pBdr>${_NOSPACE}<w:spacing w:after="140"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${_RF}<w:color w:val="595959"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;

// 각주성 줄 — '※'/'근거'로 시작하는 법적 근거·주의 문구. 소자 회색으로 본문과 격을 낮춘다
// (9pt라 한 줄 수용량이 넓어 근거 열거가 본문폭을 넘어 2줄로 깨지는 것도 막는다)
const _NOTE_RE = /^(※|근거)/;
/** @param {string} t */
const _note = t => `<w:p><w:pPr>${_NOSPACE}<w:snapToGrid w:val="0"/><w:spacing w:after="40" w:line="260" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr>${_RF}<w:color w:val="595959"/><w:sz w:val="18"/></w:rPr>${_runs(_wrap(t, Math.round((_TW - 300) * 22 / 18)))}</w:r></w:p>`; // _cw는 11pt 기준 — 9pt 본문폭은 ×22/18

// 페이지 설정 — A4(orient 명시 — 일부 임포터가 생략 시 가로로 해석) + 좌우 25mm 여백 + 1단.
// 워터마크는 header1.xml(rId4) 참조 — 모든 쪽에 반복되는 표준 경로.
// docGrid는 제거 — 글자 격자로 오해석해 어절·자간을 늘리는 임포터가 있음 (비용 계산서 어절 간격 신고)
const _sect = (/** @type {boolean} */ hasHdr, /** @type {boolean} */ land = false) => `<w:sectPr>${hasHdr ? '<w:headerReference w:type="default" r:id="rId4"/>' : ''}<w:footerReference w:type="default" r:id="rId2"/>${land ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' : '<w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>'}<w:pgMar w:top="1134" w:right="1417" w:bottom="1134" w:left="1417"/><w:cols w:space="708"/></w:sectPr>`;

// 워터마크 균등 분포 — 추정 페이지 높이(단락≈14pt·행≈22pt, 한 장 본문≈640pt)마다 뒤쪽 앵커를 삽입.
// 첫·끝 고정 앵커는 같은 쪽에 중첩돼 문서마다 농도가 달라지므로, 페이지 경계 추정 위치마다
// 1개씩 배치해 쪽당 동일 농도를 노린다
const _PAGE_PT = 700; // 실측 본문 용량 ≈728pt — 추정 오차 안전 마진 28pt
// 부동 표(결재란 top·서명란 bottom)가 본문 흐름에서 점유하는 시각적 높이 예약치 —
// tblpPr 표는 흐름 높이를 안 쓰지만 텍스트가 감겨 그 영역만큼 가용 쪽이 줄어든다 (결재≈55 + 서명≈150)
const _FLT_PT = 200;
const _TAIL_SLK = 100; // 꼬리 여유 판정 슬랙 — 추정 모델의 낙관 편향(~10%) 보정
// 밀도 티어별 추정 상수 — l:줄높이(pt), a:단락 후간격, rMin/rPad:행 최소·셀 여백(pt).
// 추정은 줄 수(<w:p>·<w:br/>) 기반 — 상수는 Word 실측 렌더 높이로 교정 (맑은고딕 11pt 행간336
// 실측 줄 ≈25pt·표 행 ≈47pt = 셀 여백12+줄35 — 평면 상수는 실제의 ~0.55배라 1장 판정·워터마크 경계가 어긋남)
/** @typedef {{l:number,a:number,rMin:number,rPad:number,rl:number}} DocxDens - 밀도 티어 추정 상수 (pt) */
const _DENS = {
    normal:  { l: 25, a: 0, rMin: 47, rPad: 12, rl: 35 }, // 행간336 → 단락 ≈25pt·행 ≈47pt
    compact: { l: 23, a: 0, rMin: 43, rPad: 11, rl: 31 }, // 행간300 → 단락 ≈23pt·행 ≈43pt
    tight:   { l: 19, a: 0, rMin: 31, rPad: 6,  rl: 25 }, // 행간240·셀여백 축소 → 단락 ≈19pt·행 ≈31pt
};
/** @param {string} el - 최상위 본문 요소 XML @param {DocxDens} [d] - 밀도 티어 @returns 추정 높이(pt) */
const _estEl = (el, d = _DENS.normal) => el.includes('w:lineRule="exact"')
    ? 8 // 스페이서 단락 — lineRule=exact라 글자 크기 무관 고정 높이 (150/120/100tw ≈ 5~8pt)
    : (((el.match(/<w:p[ >]/g) || []).length + (el.match(/<w:br\/>/g) || []).length) * d.l + d.a);
/** 표 행 추정 — 행 높이는 최장 셀의 줄 수에 의함 (셀별 <w:br/> 수의 최대 + 셀 상하 여백, 최소 행높이 하한) */
const _estRow = (/** @type {string} */ tr, /** @type {DocxDens} */ d) => {
    const cells = tr.split(/(?=<w:tc[ >])/).filter(s => s.startsWith('<w:tc'));
    const L = Math.max(1, ...cells.map(c => 1 + (c.match(/<w:br\/>/g) || []).length));
    return Math.max(d.rMin, d.rPad + L * (d.rl || d.l));
};
/** 본문 요소 → 흐름 부품 배열 — 본문 표는 행 단위로 분해 (표 내부 페이지 경계 추적용) */
const _flowParts = (/** @type {string} */ el) => (el.startsWith('<w:tbl>') && !el.includes('<w:tblpPr'))
    ? el.split(/(?=<w:tr[ >])/) : [el];
/** 부품 높이 추정 — 표 행은 최장 셀 줄 수 기반(셀 단락 합산 금지: 행 높이는 최장 셀 높이라 평행 합산은 과대), 그 외는 요소 추정 */
const _estPart = (/** @type {string} */ el, /** @type {DocxDens} */ d) => el.startsWith('<w:tr') ? _estRow(el, d) : (el.startsWith('<w:tbl') ? 0 : _estEl(el, d));
/** 본문 흐름 높이 추정 — 부동 표(결재·서명, tblpPr)는 여백 앵커라 본문 높이를 소비하지 않아 제외 */
const _estFlow = (/** @type {string} */ body, /** @type {DocxDens} */ d) => _topEls(body)
    .flatMap(_flowParts)
    .filter(el => !(el.startsWith('<w:tbl') && el.includes('<w:tblpPr')))
    .reduce((n, el) => n + _estPart(el, d), 0);
// 콤팩트 티어 셀 여백 (표준 120/140 → 90/120)
const _CELL_MAR_C = '<w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>';
// 리터럴 문자열 전량 치환 — lib가 ES2020이라 replaceAll 대신 split/join (정규식 이스케이프 불필요)
const _repAll = (/** @type {string} */ s, /** @type {string} */ a, /** @type {string} */ b) => s.split(a).join(b);
/**
 * 콤팩트 밀도 변환 — 1장 원칙: 표준 밀도가 한 장을 넘기면 행간·단락 간격·행높이·셀 여백을
 * 축소해 한 장 수용을 재시도한다 (글자 크기는 유지 — 가독성 본질은 건드리지 않음).
 * @param {string} body @returns {string}
 */
const _compact = body => [
    ['<w:spacing w:after="40" w:line="336" w:lineRule="auto"/>', '<w:spacing w:after="20" w:line="300" w:lineRule="auto"/>'],
    ['<w:spacing w:line="336" w:lineRule="auto"/>', '<w:spacing w:line="300" w:lineRule="auto"/>'],
    ['<w:trHeight w:val="440" w:hRule="atLeast"/>', '<w:trHeight w:val="420" w:hRule="atLeast"/>'],
    [_CELL_MAR, _CELL_MAR_C],
    ['<w:spacing w:line="150" w:lineRule="exact"/>', '<w:spacing w:line="120" w:lineRule="exact"/>'],
    ['<w:spacing w:before="160" w:after="80"/>', '<w:spacing w:before="120" w:after="60"/>'],
].reduce((s, [a, b]) => _repAll(s, a || '', b || ''), body);
// 타이트 티어 셀 여백 (콤팩트 90/120 → 60/90) — 콤팩트로도 한 장을 넘는 문서용 최종 압축
const _CELL_MAR_T = '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>';
/** 타이트 밀도 변환 — 콤팩트 결과를 한 단계 더 압축 (행간 240·행높이 360·셀 여백·스페이서 축소) */
const _tight = (/** @type {string} */ body) => [
    ['w:line="300" w:lineRule="auto"', 'w:line="240" w:lineRule="auto"'],
    ['<w:trHeight w:val="420" w:hRule="atLeast"/>', '<w:trHeight w:val="360" w:hRule="atLeast"/>'],
    [_CELL_MAR_C, _CELL_MAR_T],
    ['<w:spacing w:line="120" w:lineRule="exact"/>', '<w:spacing w:line="100" w:lineRule="exact"/>'],
    ['<w:spacing w:before="120" w:after="60"/>', '<w:spacing w:before="80" w:after="40"/>'],
].reduce((s, [a, b]) => _repAll(s, a || '', b || ''), _compact(body));
/** 본문 XML → 최상위 요소 배열 (w:p·w:tbl — 표 내부 단락은 표 단위로 묶음) */
/** @param {string} xml */
const _topEls = xml => {
    const out = [];
    let i = 0;
    while (i < xml.length) {
        const end = xml.startsWith('<w:tbl>', i)
            ? xml.indexOf('</w:tbl>', i) + 8
            : xml.indexOf('</w:p>', i) + 6; // w:p·기타 요소 — </w:p> 없으면 -1+6=5 < i라 루프 종료
        if (end <= i) { out.push(xml.slice(i)); break; }
        out.push(xml.slice(i, end));
        i = end;
    }
    return out;
};
/**
 * @param {string[]} lines
 * @param {number} boldLines
 * @param {boolean} [hasHdr] - header1.xml 참조 여부 (워터마크)
 * @returns {string}
 */
const _doc = (lines, boldLines, hasHdr = false) => {
    const body = lines.map((l, i) => _P(l, i, boldLines)).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"><w:body>${body}${_sect(hasHdr)}</w:body></w:document>`;
};

/** 워터마크 헤더 조립 — PNG 우선, 텍스트 상자 폴백. 반환 null이면 헤더 파트 미생성 */
const _wmHdr = (/** @type {string} */ wm, /** @type {?{data:Uint8Array}} */ wmImg) => {
    if (wm && !wmImg && typeof console !== 'undefined') console.warn('[docx] 워터마크 텍스트 상자 폴백 사용 — wmImg PNG 경로 권장');
    if (!wm && !wmImg) return null;
    return { xml: _header(wmImg ? _wmPicPara('rId1', _dpNext()) : _wmPara(wm, _dpNext())), img: wmImg };
};

/**
 * 텍스트 → .docx File (줄 단위 단락) — 공유·다운로드 공용, 지연 로드 불필요.
 * 인터페이스는 docxFileMd와 동형 — (본문, 파일명, [평문 전용 굵기], wm, opts).
 * @param {string} text - 본문 (\n 단락 구분)
 * @param {string} filename - 확장자 제외 파일명
 * @param {number} [boldLines] - 선두 N줄을 굵게 (문서 헤더)
 * @param {string} [wm] - 워터마크 문구 (header1.xml 배치 — 모든 쪽 반복)
 * @param {{wmImg?: ?{data:Uint8Array}, doc?: {no?:string, org?:string, title?:string, rev?:number, date?:string}}} [opts] - wmImg: 워터마크 PNG (지정 시 텍스트 대신 사용), doc: 문서 추적 메타
 */
export function docxFile(text, filename, boldLines = 0, wm = '', opts = {}) {
    _dpId = 100;
    const hdr = _wmHdr(wm, opts.wmImg || null);
    const blob = _zipStore(_parts(_doc(String(text || '').split('\n'), boldLines, !!hdr), [], opts.doc || null, hdr));
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// — MD 서브셋 → WordprocessingML (문서 표준 초안: 헤딩·표·목록·구분선·단락) —

// 표 테두리 — 얇은 단선 통일. 이중선·진한 외곽선은 흑백 인쇄 시 탁하고 토너를 많이 쓴다
// (사용자 렌더 리뷰 — 얇은 단선 + 연한 줄무늬 권고). 외곽 1pt·내부 0.5pt 회색.
// 내부선은 D9D9D9(85%)까지 연하면 인쇄·PDF 래스터에서 소멸하므로 999999(60%) — 인쇄에서도 격자 인식 가능.
const _BORDERS = ['top', 'left', 'bottom', 'right'].map(b => `<w:${b} w:val="single" w:sz="8" w:color="595959"/>`).join('')
    + ['insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:color="999999"/>`).join('');
// 표 레이아웃 — 본문 폭 고정 dxa (A4 11906 − 좌우 여백 1417×2 = 9072) + 균등 열 그리드 + 셀 내부 여백.
// pct(상대폭)는 한글 등 일부 임포터가 미지원해 표가 본문 폭 밖으로 렌더될 수 있어 dxa 고정 사용.

const _CELL_MAR = '<w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>';
// 셀 단락 — kinsoku(동아시아 금칙 규칙) + wordWrap=off(라틴 단어 중간 분할 금지).
// 주의: Word는 한글을 음절 단위로 끊으며 어절 단위 강제 OOXML 스위치가 없다(COM 실측 —
// kinsoku·wordWrap·lang=ko-KR·noLineBreaksAfter·useFELayout 모두 중간 분리 유지).
// 그래서 어절 줄넘김은 생성 측에서 폭 추정 후 <w:br/>를 직접 삽입해 구현한다.
const _CELL_PPR = `<w:pPr><w:kinsoku/><w:wordWrap w:val="off"/>${_NOSPACE}<w:snapToGrid w:val="0"/><w:spacing w:line="336" w:lineRule="auto"/></w:pPr>`;
// 글자 폭 — 맑은고딕 11pt(w:sz 22 명시): 한글·전각 220tw(1em 정확), ASCII·반각 120tw(보수 추정),
// 공백은 80tw(실측 ≈62+여유 — 과대 추정은 공백 많은 줄이 수백 tw 일찍 끊겨 어절 고아 유발).
// 폰트 크기를 명시하지 않으면 뷰어 기본값에 따라 달라져 어절 분리가 깨지므로 sz를 고정한다.
const _cw = (/** @type {string} */ c) => (c === ' ' ? 80 : (c.codePointAt(0) || 0) < 128 ? 120 : 220);
/**
 * 어절 단위 사전 줄바꿈 — usable(dxa) 폭에 맞게 공백 경계에서 분리.
 * 어절 하나가 폭을 넘으면 글자 폭 기준으로 강제 분할한다 — Word가 어차피 음절 단위로 끊는 토큰인데
 * 한 줄로 두면 실제 렌더 높이(수십 줄)와 추정(1줄)이 어긋나 쪽 경계 산출이 무너진다.
 * @param {string} t @param {number} usable - dxa
 * @returns {string[]}
 */
/** 글자열 렌더 폭 추정 (dxa) */
/** @param {string} s */
const _wOf = s => [...s].reduce((n, c) => n + _cw(c), 0);

/** 줄 폭 초과 장문 토큰 강제 분할 — 원자 토큰(공백 없음·16자 이하: 날짜·전화·짧은 성명)은
 *  중간에서 끊지 않고 통째로 유지한다 ('1943-05-/12' 분할 방지 — tcPr noWrap과 세트) */
/** @param {string} line @param {number} lw @param {number} usable @param {string[]} lines
 *  @returns {[string, number]} */
const _splitLong = (line, lw, usable, lines) => {
    while (!/^\S{1,16}$/.test(line) && lw > usable) {
        const chars = [...line]; let i = 0, cw = 0;
        while (i < chars.length && cw + _cw(chars[i] || '') <= usable) { cw += _cw(chars[i] || ''); i++; }
        if (!i) break;
        lines.push(chars.slice(0, i).join(''));
        line = chars.slice(i).join('').trimStart(); lw = _wOf(line);
    }
    return [line, lw];
};

/** 마지막 줄 어절 고아 방지 — 1어절뿐이면 앞 줄 끝 어절을 내려 2어절 이상으로 (있습니다. 단독행 신고) */
/** @param {string[]} lines */
const _orphanFix = lines => {
    while (lines.length > 1 && !/ /.test(lines[lines.length - 1] || '')) {
        const m = (lines[lines.length - 2] || '').match(/^(.*\S)\s+(\S+)$/);
        if (!m) break;
        lines[lines.length - 2] = m[1] || '';
        lines[lines.length - 1] = `${m[2] || ''} ${lines[lines.length - 1] || ''}`;
    }
};

/** @param {string} t @param {number} usable @returns {string[]} */
const _wrap = (t, usable) => {
    /** @type {string[]} */ const lines = []; let line = '', lw = 0;
    for (const tok of String(t).split(/( +)/)) {
        const tw = _wOf(tok);
        if (line && lw + tw > usable) { lines.push(line.trimEnd()); line = tok.trimStart(); lw = _wOf(line); }
        else { line += tok; lw += tw; }
        [line, lw] = _splitLong(line, lw, usable, lines);
    }
    if (line || !lines.length) lines.push(line.trimEnd());
    _orphanFix(lines);
    return lines;
};
/** 줄 배열 → 단일 런의 t/br 시퀀스 */
/** @param {string[]} lines */
const _runs = lines => lines.map(l => `<w:t xml:space="preserve">${esc(l)}</w:t>`).join('<w:br/>');
const _estW = (/** @type {string} */ t) => [...String(t)].reduce((n, c) => n + _cw(c), 0);
const _CPAD = 320; // 셀 좌우 여백(100×2)+테두리 여유
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
    const cap = Math.floor(_TW * 0.6);
    const pf = pref.map(p => Math.min(p, cap));
    const sp = pf.reduce((a, b) => a + b, 0), sm = min.reduce((a, b) => a + b, 0);
    let ws, fixIdx = n - 1;
    // 잉여 배분 가중 — 줄바꿈으로 늘어날 수 있는 열(pref>min)만 잉여를 받는다. 고정 폭 레이블 열은 제외
    const grow = pf.map((p, i) => Math.max(0, p - min[i]));
    const sg = grow.reduce((a, b) => a + b, 0);
    if (sp <= _TW) ws = pf.map((p, i) => Math.floor(p + (_TW - sp) * (sg ? (grow[i] || 0) / sg : 1 / n)));
    else if (sm < _TW) ws = pf.map((p, i) => Math.floor((min[i] || 0) + (_TW - sm) * (((p) - (min[i] || 0)) / Math.max(1, sp - sm))));
    else if (400 * n < _TW) {
        // min 합계조차 초과(다열 표) — min 비율 축소 배분. 어절 분리는 불가피하나 균등 절삭보다 낫다
        const k = _TW / sm;
        ws = min.map(m => Math.max(400, Math.floor(m * k)));
        fixIdx = ws.indexOf(Math.max(...ws)); // 잔여 보정은 가장 넓은 열에
    } else ws = Array(n).fill(Math.floor(_TW / n));
    // 헤더 어절 폭은 하한 — 항목명(대상자·방문객 등) 줄넘김 금지. 초과분은 여유 열에서 회수
    const hw = (rows[0] || []).map(c => _estW(String(c).trim().split(/ +/).sort((a, b) => _estW(b) - _estW(a))[0] || '') + _CPAD);
    ws = ws.map((w, i) => Math.max(w, hw[i] || 0));
    const over = ws.reduce((a, b) => a + b, 0) - _TW;
    if (over > 0) {
        const room = ws.map((w, i) => Math.max(0, w - (hw[i] || 0)));
        const sr = room.reduce((a, b) => a + b, 0);
        if (sr > 0) ws = ws.map((w, i) => w - Math.min(room[i] || 0, Math.ceil(over * (room[i] || 0) / sr)));
    }
    ws[fixIdx] = (ws[fixIdx] || 0) + _TW - ws.reduce((a, b) => a + b, 0); // 반올림 잔여 보정
    return ws;
};
/**
 * @param {string} c
 * @param {boolean} head
 * @param {number} [w] - 셀 너비 (dxa)
 * @param {string} [shd] - 배경색 (헤더·레이블·줄무늬 음영)
 * @param {boolean} [center] - 본문 셀 중앙 정렬 (레이블 열)
 * @param {boolean} [keep] - 다음 요소와 분리 금지 (페이지 경계)
 * @param {?string} [merge] - 세로 병합 ('restart'|'cont')
 * @returns {string}
 */
/** @param {number} w */
const _tcW = w => (w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : '');
/** @param {?string} m */
const _tcMerge = m => (m ? `<w:vMerge${m === 'cont' ? '' : ' w:val="restart"'}/>` : '');
/** 원자 토큰 단일 셀(날짜·전화·호실 등)은 자동 줄넘김 금지 — 토큰 중간 분할 차단 */
/** @param {string} t @param {number} w */
const _tcNoWrap = (t, w) => (t && !/\s/.test(t) && _estW(t) <= Math.max(440, (w || _TW) - _CPAD) ? '<w:noWrap/>' : '');
/** @param {?string} s */
const _tcShd = s => (s ? `<w:shd w:val="clear" w:color="auto" w:fill="${s}"/>` : '');

/** @param {string} c @param {boolean} head @param {number} w @param {?string} shd @param {boolean} center @param {boolean} keep @param {?string} merge */
const _cell = (c, head, w, shd, center, keep, merge) => {
    const t = c.trim();
    const ppr = _CELL_PPR.replace('</w:pPr>', `${keep ? '<w:keepNext/>' : ''}${head || center ? '<w:jc w:val="center"/>' : ''}</w:pPr>`);
    const tcPr = `<w:tcPr>${_tcW(w)}${_tcMerge(merge)}${_tcNoWrap(t, w)}${_tcShd(shd)}<w:vAlign w:val="center"/></w:tcPr>`;
    return `<w:tc>${tcPr}<w:p>${ppr}<w:r><w:rPr>${_RF}${head ? '<w:b/>' : ''}<w:sz w:val="22"/></w:rPr>${merge === 'cont' ? '' : _runs(_wrap(t, Math.max(440, (w || _TW) - _CPAD)))}</w:r></w:p></w:tc>`;
};
// 표 음영 — 흑백 인쇄 가독성: 머리행만 연청색, 데이터행은 짝수만 아주 옅은 줄무늬, 레이블 열은 연회색
const _SHD_HEAD = 'D9E6F7', _SHD_ZEBRA = 'F2F6FB', _SHD_LABEL = 'EFEFEF';
/** @param {?string[][]} rows @param {number} w0 @returns {number} */
const _kvRowsW = (rows, w0) => {
    if (!rows || Math.max(0, ...rows.map(r => r.length)) !== 2) return w0;
    return rows.reduce((m, r) => Math.max(m, _estW(String(r[0] || '').trim()) + _CPAD), w0);
};

/** 문서 내 2열 표(항목|내용 서식)의 라벨 열 통일 폭 — 표마다 내용 기반 폭이 달라지면 위아래 표의 열 경계가
 *  계단처럼 어긋나므로, 문서에서 가장 긴 라벨이 한 줄에 들어가는 폭을 모든 2열 표에 공유한다
 *  (공문 서식의 라벨 열은 문서 전체 단일 폭). _colWs의 잉여 배분폭이 아닌 내용 적합 폭 기준.
 * @param {string} md @returns {number} */
const _kvLabelW = md => {
    // :::sign 블록 제거 — 서명란 줄은 |…| 표 행이 아니지만 방어적으로 제외
    const txt = String(md || '').replace(/:::sign[\s\S]*?:::end/g, '');
    let w0 = 0;
    /** @type {string[][] | null} */ let rows = null;
    const done = () => { w0 = _kvRowsW(rows, w0); rows = null; };
    for (const line of txt.split('\n')) {
        const t = line.trim();
        if (t.startsWith('|') && t.endsWith('|')) {
            if (!/^\|[\s:|-]+\|$/.test(t)) (rows = rows || []).push(t.slice(1, -1).split('|')); // 구분행 제외 — _mdStruct와 동일 규약
        } else done();
    }
    done();
    return w0 ? Math.min(Math.max(w0, 1600), Math.floor(_TW * 0.4)) : 0;
};

/**
 * @param {string[][]} rows
 * @param {number} [w0] - 2열 표 라벨 열 통일 폭 (dxa, 문서 내 공유)
 * @returns {string}
 */
const _tbl = (rows, w0 = 0) => {
    const ws = _colWs(rows);
    if (w0 && ws.length === 2) { ws[0] = w0; ws[1] = _TW - w0; }
    const n = ws.length;
    const grid = ws.map(w => `<w:gridCol w:w="${w}"/>`).join('');
    const wAt = (/** @type {number} */ i) => ws[i];
    // 3열 이상 표는 같은 값이 연속되는 첫 열을 세로 병합 (평가 영역·날짜 그룹 등)
    const mergeC0 = n >= 3;
    const m0 = rows.map((r, i) => i > 0 && String(r[0] ?? '').trim() !== '' && String(r[0]).trim() === String((rows[i - 1] || [])[0] ?? '').trim());
    // 소형 표(14행 이하)는 keepNext로 한 덩어리 유지 — 표 끝 1행만 다음 쪽으로 넘어가는 고아 방지
    const cx = { n, mergeC0, m0, atomic: rows.length <= 14, total: rows.length, wAt, mergedShd: '' };
    // 첫 행 tblHeader(페이지 넘김 시 표머리 반복) + cantSplit(행이 페이지 경계에서 쪼개지지 않음) + 최소 행 높이 24pt
    return `<w:tbl><w:tblPr><w:tblW w:w="${_TW}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>`
        + rows.map((r, i) => _tblRow(r, i, cx)).join('') + '</w:tbl>';
};

/** 첫 열 세로 병합 상태 — 'cont'|'start'|null */
/** @param {boolean[]} m0 @param {number} i @param {boolean} on */
const _cellMerge = (m0, i, on) => (on ? (m0[i] ? 'cont' : (m0[i + 1] ? 'start' : null)) : null);

/** 셀 음영 — 병합 연속셀은 시작 행 음영을 물려받는다 (응용 불일치 파란 띠 방지) */
/** @param {string} base @param {?string} merge @param {{mergedShd:string}} cx */
const _cellShd = (base, merge, cx) => (merge === 'cont' ? cx.mergedShd : (merge === 'start' ? (cx.mergedShd = base) : base));

/** @param {string} c @param {number} ci @param {number} i @param {*} cx */
const _tblCellXml = (c, ci, i, cx) => {
    const keep = cx.atomic && i < cx.total - 1;
    const base = i === 0 ? _SHD_HEAD : (cx.n === 2 && ci === 0 ? _SHD_LABEL : (i % 2 === 0 ? _SHD_ZEBRA : ''));
    const merge = _cellMerge(cx.m0, i, cx.mergeC0 && ci === 0);
    return _cell(merge === 'cont' ? '' : c, i === 0, cx.wAt(ci), _cellShd(base, merge, cx), cx.n === 2 && ci === 0, keep, merge);
};

/** @param {string[]} r @param {number} i @param {*} cx */
const _tblRow = (r, i, cx) => `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="440" w:hRule="atLeast"/>${i === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${r.map((c, ci) => _tblCellXml(c, ci, i, cx)).join('')}</w:tr>`;

// 헤딩 — Heading 스타일 병기(탐색창·PDF 북마크·접근성 인식) + 직접 서식(스타일 미지원 뷰어 대비).
// 글꼴은 맑은 고딕 통일 — 한 군데만 바탕/Times를 쓰면 맥·모바일·한컴에서 다른 글꼴로 떨어진다.
// ##·### 는 keepNext — 절 제목이 쪽 끝에 고아로 남고 표만 다음 쪽으로 넘어가는 것을 차단
/**
 * @param {string} t
 * @param {number} lv - 헤딩 깊이 1~3
 * @returns {string}
 */
const _h = (t, lv) => lv === 1
    ? `<w:p><w:pPr><w:pStyle w:val="Heading1"/>${_NOSPACE}<w:spacing w:before="80" w:after="80"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${_RF}<w:b/><w:u w:val="double"/><w:sz w:val="40"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`
    : `<w:p><w:pPr><w:pStyle w:val="Heading${lv}"/><w:keepNext/>${lv === 2 ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:color="999999"/></w:pBdr>' : ''}${_NOSPACE}<w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr>${_RF}<w:b/><w:sz w:val="${lv === 2 ? 28 : 24}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const _HR = `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:color="999999"/></w:pBdr>${_NOSPACE}</w:pPr></w:p>`;
const _PAGEBREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

// 결재란 — 공문서 상단 우측 승인 표 ('결 재' 세로병합 + 역할별 '(인)' 중앙 서명칸).
// 서명 문서(:::sign)에만 부여. 역할은 :::approve 마커로 지정 (기본 담당·팀장·시설장 —
// 재가기관은 사회복지사·센터장, 소규모 기관은 2단 결재 등 기관별 결재선 반영).
// 서명 이미지는 결재하지 않은 문서에 미리 찍히면 위·변조 오해가 있어 넣지 않는다 — (인) 빈칸 유지.
const _AW = 960; // 결재란 열 폭 — 11pt '사회복지사'(1100tw)도 2줄 이내 수용
const _APPR_FILL = 'D9E6F7'; // 결재 머리 음영 — 병합 연속셀도 같은 색 (응용 불일치 파란 띠 방지)
const _cellPprC = _CELL_PPR.replace('</w:pPr>', '<w:jc w:val="center"/></w:pPr>');
const _apprCell = (/** @type {string} */ t, /** @type {boolean} */ merge, /** @type {boolean} */ cont) => `<w:tc><w:tcPr><w:tcW w:w="${_AW}" w:type="dxa"/>${merge ? `<w:vMerge${cont ? '' : ' w:val="restart"'}/>` : ''}<w:shd w:val="clear" w:color="auto" w:fill="${_APPR_FILL}"/><w:vAlign w:val="center"/></w:tcPr>${t ? `<w:p>${_cellPprC}<w:r><w:rPr>${_RF}<w:b/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>` : '<w:p/>'}</w:tc>`;
// 서명 자리 — 역할 칸마다 '(인)'을 중앙 정렬로 표기 (공문서 날인 위치 표시 관행)
const _apprSignCell = () => `<w:tc><w:tcPr><w:tcW w:w="${_AW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:vAlign w:val="center"/></w:tcPr><w:p>${_cellPprC}<w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr><w:t>(인)</w:t></w:r></w:p></w:tc>`;
/** @param {string[]} [roles] - 결재 역할 (예: ['담당','팀장','시설장'] / ['사회복지사','센터장']) */
const _approve = (roles = ['담당', '팀장', '시설장']) => {
    const w = _AW * (1 + roles.length);
    return `<w:tbl><w:tblPr><w:tblpPr w:horzAnchor="margin" w:vertAnchor="margin" w:tblpX="${_TW - w + 102}" w:tblpYSpec="top" w:leftFromText="180" w:rightFromText="180" w:topFromText="60" w:bottomFromText="300"/><w:tblW w:w="${w}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid>${`<w:gridCol w:w="${_AW}"/>`.repeat(1 + roles.length)}</w:tblGrid>`
        + `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="440" w:hRule="atLeast"/></w:trPr>`
        + _apprCell('결 재', true, false)
        + roles.map(t => _apprCell(t, false, false)).join('')
        + `</w:tr><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="640" w:hRule="atLeast"/></w:trPr>`
        + _apprCell('', true, true)
        + roles.map(() => _apprSignCell()).join('')
        + '</w:tr></w:tbl>';
};
// 상단 서식란 — 공문서 표준 상단 표기(문서번호·시행일자·수신·참조). 라벨 1200tw 탭 정지로 값 정렬.
// opts.doc가 있을 때만 부여 — 미리보기/PDF는 발행 전 초안이라 doc 번호 미부여 (푸터·QR과 동일 비대칭)
const _formP = (/** @type {string} */ k, /** @type {string} */ v) => `<w:p><w:pPr>${_NOSPACE}<w:spacing w:after="20"/><w:tabs><w:tab w:val="left" w:pos="1200"/></w:tabs></w:pPr><w:r><w:rPr>${_RF}<w:b/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${k}</w:t></w:r><w:r><w:rPr>${_RF}<w:sz w:val="18"/></w:rPr><w:tab/><w:t xml:space="preserve">${esc(v)}</w:t></w:r></w:p>`;
/** @param {{no?:string, recipient?:string, cc?:string, date?:string}} doc @returns {string} */
const _formBlk = doc => [
    doc.no ? _formP('문서번호', doc.no) : '',
    _formP('시행일자', _docDate(doc.date)),
    doc.recipient ? _formP('수신', doc.recipient) : '',
    doc.cc ? _formP('참조', doc.cc) : '',
].join('');
// 종결 문구 — :::closing 마커. 서명란 위 "상기와 같이 …합니다."류 마무리 문구를 중앙 표기
const _closeP = (/** @type {string} */ t) => `<w:p><w:pPr>${_NOSPACE}<w:spacing w:before="120" w:after="40"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
// 문서 종결 — 공문서 관행의 '끝.' 표기 (중앙)
const _END = `<w:p><w:pPr>${_NOSPACE}<w:spacing w:before="80"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr><w:t>끝.</w:t></w:r></w:p>`;

// 서명란 — 본문 여백 영역 하단 우측에 부동 표(tblpPr — Word 텍스트 상자와 동일한 앵커 방식).
// 문서 끝에 배치하면 마지막 페이지 하단 오른쪽에 고정된다. 첫 행은 발신일(중앙), 서명행은 (인) 표기
const _SIG_W = 4200;
/** 문서 표기일 — 'YYYY-MM-DD' → 'YYYY년 M월 D일'. opts.doc.date 단일 소스 (미지정 시 당일) */
/** @param {string} [ds] */
const _docDate = ds => {
    const m = String(ds || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 이미지 <a:graphic> 본체 — 인라인·앵커 런 공용
/** @param {{rid:string, cx:number, cy:number, file?:string, desc?:string}} img */
const _imgPic = img => `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${img.file || 'sign.png'}" descr="${img.desc || '서명'}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${img.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
// 인라인 이미지 런 — 문서번호 QR 삽입용. rIdN 관계의 word/media/img_N.png 참조
/** @param {{rid:string, cx:number, cy:number, id:number, name?:string, file?:string, desc?:string}} img */
const _imgRun = img => `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${img.cx}" cy="${img.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${img.id}" name="${img.name || '서명'}" descr="${img.desc || img.name || '서명'}"/>${_imgPic(img)}</wp:inline></w:drawing></w:r>`;
/** 서명 이미지 표시 상한(pt) — author: 서명란 인라인 서명, approve: 결재란 칸(현재 미사용 — 결재란은
 *  확인 전 서명 미삽입 원칙상 (인) 빈칸 유지). facility.js docSignImages·샘플 생성기·호출자가
 *  같은 상한을 공유해야 한다 (렌더 픽셀은 이 상한의 2x로 인쇄 선명도를 확보하고 표시 pt만 여기로 전달) */
export const DOCX_SIGN_MAX = { author: { w: 74, h: 38 }, approve: { w: 52, h: 40 } };

const _QR_NIL_B = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="nil"/>`).join('');

// 종결 부동 표 — 서명란을 마지막 쪽 하단에 통째로 배치.
// cantSplit 단일 행이라 쪽 경계에서 행이 쪼개지지 않는다 — 별개 부동 표 2개를 :::end 지점에
// 두면 앵커 아래 공간보다 크거나 서로 다른 쪽에 앵커될 때 표가 분할·이탈됐다 (평가체크리스트 4쪽 사례).
const _TCMAR0 = '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>'; // 서명 셀 — 내부 표가 테두리·여백을 갖고 있어 셀 여백 0
const _MIN_P = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>'; // 셀 내 중첩 표 뒤 필수 단락 — 최소 높이
// 서명 셀 여유폭 — 내부 표는 셀보다 _SIG_SLK 좁게 둔다. 내부 표 폭=셀 폭이면 이중 외곽선의
// 바깥 선분(~38tw)이 셀 경계를 넘어가고, 중첩 표를 셀 경계에서 잘라내는 렌더러에서 서명란
// 우측선이 깎여 보인다. 여유폭이 외곽선 여유분+렌더러별 셀 여백 차이를 흡수한다.
const _SIG_SLK = 300;
const _SIG_IND = 60; // 내부 표 좌측 들여쓰기 — 좌측 외곽선(~38tw)도 셀 경계 안에 그려지도록
/** @param {string[]} sigLines @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} imgMap @param {?{date?:string}} [doc] - 문서 표기일 단일 소스 */
const _closeTbl = (sigLines, imgMap, doc = null) => {
    const cells = [{ w: _SIG_W + _SIG_SLK, mar: _TCMAR0, v: 'top', xml: _sigInner(sigLines, imgMap, (doc || {}).date || '') + _MIN_P }];
    const w = cells.reduce((s, c) => s + c.w, 0);
    // tblpX는 그리드 총폭이 아니라 내용 우측 끝(들여쓰기+내부 표 폭) 기준 — 서명 박스 우측선이 본문 표와 정렬.
    // +88 보정: 중첩 표 구조에서 실 렌더 위치가 tblpX 산술보다 ~65tw 좌측에 착지하고 본문 표 외곽선은
    // 텍스트 경계보다 ~24tw 우측에 그려져, 보정 없으면 서명란 우측선이 본문 표보다 ~128tw 안쪽에 뜬다
    // (인수인계서 PDF 실측 519.2pt vs 본문 표 525.6pt — 결재란 +102와 다른 중첩 구조)
    const vis = _SIG_IND + _SIG_W;
    return `<w:tbl><w:tblPr><w:tblpPr w:horzAnchor="margin" w:vertAnchor="margin" w:tblpX="${_TW - vis + 88}" w:tblpYSpec="bottom" w:leftFromText="180" w:rightFromText="180" w:topFromText="180" w:bottomFromText="180"/><w:tblW w:w="${w}" w:type="dxa"/><w:tblBorders>${_QR_NIL_B}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid>${cells.map(c => `<w:gridCol w:w="${c.w}"/>`).join('')}</w:tblGrid>`
        + `<w:tr><w:trPr><w:cantSplit/></w:trPr>` + cells.map(c => `<w:tc><w:tcPr><w:tcW w:w="${c.w}" w:type="dxa"/>${c.mar}<w:vAlign w:val="${c.v}"/></w:tcPr>${c.xml}</w:tc>`).join('') + '</w:tr></w:tbl>';
};

// 서명 셀 내용 — 라벨 + 우측 탭 정지 (인). `{{img:key}}` 토큰에 이미지가 지정되면
// (인) 자리에 인라인 이미지로 삽입 — 고정 좌표 앵커 오버레이는 글자를 덮어 폐기 (렌더 리뷰)
/** @param {string} line @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} imgMap */
const _sigRuns = (line, imgMap) => {
    const m = line.match(/\{\{img:([\w-]+)\}\}/);
    const im = m ? imgMap[m[1] || ''] : undefined;
    const t = (m ? line.replace(m[0], im ? '' : '＿＿＿＿＿＿＿＿') : line).trim();
    // (인)·서명은 우측 탭 정지로 셀 우측 끝에 배치 — 이름 뒤 공백 누적은 줄넘김·위치 불안정이라 탭 사용
    const label = t.replace(/\s*\(인\)\s*$/, '').trimEnd();
    return `<w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr>${_runs(_wrap(label, _SIG_W - 300))}</w:r><w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr><w:tab/></w:r>` +
        (im ? _imgRun({ ...im, id: _dpNext(), name: '서명', desc: '서명' })
            : `<w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr><w:t>(인)</w:t></w:r>`);
};
/** @param {string[]} lines @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} [imgMap] @param {string} [date] - 문서 표기일 'YYYY-MM-DD' */
const _sigRows = (lines, imgMap = {}, date = '') => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${_SIG_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${_SHD_ZEBRA}"/><w:vAlign w:val="center"/></w:tcPr><w:p>${_cellPprC}<w:r><w:rPr>${_RF}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${_docDate(date)}</w:t></w:r></w:p></w:tc></w:tr>`
    + lines.map((l, i) => {
        // 서명·(인) 우측 정렬용 탭 정지 — 모든 서명행 부여 (공백 누적은 셀 폭 초과 시 줄넘김)
        const ppr = _CELL_PPR.replace('</w:pPr>', `<w:tabs><w:tab w:val="right" w:pos="${_SIG_W - 300}"/></w:tabs></w:pPr>`);
        const shd = i % 2 ? `<w:shd w:val="clear" w:color="auto" w:fill="${_SHD_ZEBRA}"/>` : ''; // 옅은 줄무늬만 — 흑백 인쇄 토너 절감
        return `<w:tr><w:tc><w:tcPr><w:tcW w:w="${_SIG_W}" w:type="dxa"/>${shd}<w:vAlign w:val="center"/></w:tcPr><w:p>${ppr}${_sigRuns(l, imgMap)}</w:p></w:tc></w:tr>`;
    }).join('');
// 서명란 내부 표(비부동) — 종결 부동 표의 셀에 중첩
/** @param {string[]} lines @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} [imgMap] @param {string} [date] - 문서 표기일 'YYYY-MM-DD' */
const _sigInner = (lines, imgMap = {}, date = '') => `<w:tbl><w:tblPr><w:tblW w:w="${_SIG_W}" w:type="dxa"/><w:tblInd w:w="${_SIG_IND}" w:type="dxa"/><w:tblBorders>${_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/>${_CELL_MAR}</w:tblPr><w:tblGrid><w:gridCol w:w="${_SIG_W}"/></w:tblGrid>${_sigRows(lines, imgMap, date)}</w:tbl>`;

/**
 * @param {string} md
 * @param {Object<string,{rid:string,cx:number,cy:number,id:number}>} [imgMap]
 * @param {?{no?:string, recipient?:string, cc?:string, date?:string}} [doc] - 지정 시 제목 위에 공문서 상단 서식란(문서번호·시행일자·수신·참조) 부여
 * @returns {string}
 */
/** 결재란 역할 해석 — :::sign 있고 :::approve none 아니면 역할 배열 (기본 담당·팀장·시설장) */
/** @param {string} md */
const _apprRoles = md => {
    const am = String(md).match(/^:::approve\s*(.*)$/m);
    if (!/^:::sign\s*$/m.test(md) || (am && (am[1] || '').trim() === 'none')) return null;
    const roles = am ? (am[1] || '').split('|').map(s => s.trim()).filter(Boolean) : ['담당', '팀장', '시설장'];
    return roles.length ? roles : null;
};

/** 본문 단락 계열 — :::page 쪽 나눔·:::closing 종결 문구·--- 구분선·각주·불릿·일반 단락 */
/** @param {string} t */
const _blockXml = t => {
    if (t === ':::page') return _PAGEBREAK; // 페이지 나눔 마커 — 1건 1쪽 문서
    if (t.startsWith(':::closing')) return _closeP(t.slice(10).trim()); // 종결 문구 마커 — 서명란 위 중앙 표기
    if (t === '---') return _HR;
    if (_NOTE_RE.test(t)) return _note(t); // 각주성 소자 회색 줄
    return _P(t.startsWith('- ') ? '• ' + t.slice(2) : t, 99, 0);
};

/** 서명란 수집 상태 — :::sign~:::end 구간. 처리했으면 true */
/** @param {string} t @param {*} st @param {*} cx */
const _mdSignSt = (t, st, cx) => {
    if (t === ':::sign') { cx.flush(); st.sign = []; st.meta = false; return true; }
    if (t === ':::end') { if (st.sign) { st.sigLines = st.sign; st.sign = null; } return true; }
    if (st.sign) { if (t) st.sign.push(t); return true; }
    return false;
};

/** 구조 줄 처리 — 설정 마커·표 구분행·표 행. 소비했으면 true */
/** @param {string} t @param {*} st @param {*} cx */
const _mdStruct = (t, st, cx) => {
    if (t.startsWith(':::approve') || t === ':::landscape') return true; // 문서 설정 마커 — 본문 출력 없음
    if (/^\|[\s:|-]+\|$/.test(t)) return true; // 표 구분행
    if (t.startsWith('|') && t.endsWith('|')) { st.meta = false; cx.emitAppr(); (st.tbl = st.tbl || []).push(t.slice(1, -1).split('|')); return true; }
    return false;
};

/** 헤딩 줄 → XML + 메타 플래그 설정. 헤딩이면 true */
/** @param {string} t @param {*} st @param {*} cx */
const _mdHead = (t, st, cx) => {
    const h = t.match(/^(#{1,3})\s+(.+)/);
    if (!h) return false;
    cx.out.push(_h(h[2] || '', (h[1] || '').length));
    st.meta = (h[1] || '').length === 1;
    return true;
};

/** 한 줄 변환 — 헤딩·메타·빈 줄·본문 블록 */
/** @param {string} line @param {*} st @param {*} cx */
const _mdLine = (line, st, cx) => {
    const t = line.trim();
    if (_mdSignSt(t, st, cx) || _mdStruct(t, st, cx)) return;
    cx.flush();
    if (_mdHead(t, st, cx)) return;
    if (!t) { cx.out.push(_P('', 99, 0)); return; } // 빈 줄 — meta 플래그 유지
    const firstMeta = st.meta; st.meta = false;
    if (firstMeta) cx.out.push(_meta(t));
    cx.emitAppr(); // 제목·메타 이후 첫 본문 요소 직전 — 결재란이 제목 줄을 감싸지 않게
    if (!firstMeta) cx.out.push(_blockXml(t));
};

/** @param {string} md @param {Object<string,{data:Uint8Array,rid:string,cx:number,cy:number,id:number}>} [imgMap]
 *  @param {?{no?:string,org?:string,title?:string,rev?:number,recipient?:string,cc?:string,date?:string}} [doc] */
const _mdBody = (md, imgMap = {}, doc = null) => {
    const out = [];
    if (doc && (doc.no || doc.recipient || doc.cc)) out.push(_formBlk(doc)); // 상단 서식란 — 제목 위 좌측 (결재란은 부동 표라 우측 정합 유지)
    // 결재란 — :::approve 마커로 역할 지정 (기본 담당·팀장·시설장, 'none'이면 미부여).
    // 부동 표는 앵커 지점 뒤 단락만 감싸므로 제목·메타 줄 출력 뒤에 삽입한다 —
    // 문서 선두 삽입은 제목이 결재란 좌측으로 치우쳐 중앙이 깨졌다 (렌더 리뷰).
    const roles = _apprRoles(md);
    const st = { tbl: /** @type {string[][] | null} */ (null), sign: /** @type {string[] | null} */ (null), sigLines: /** @type {string[] | null} */ (null), meta: false, apprXml: roles ? _approve(roles) : null };
    const w0 = _kvLabelW(md);
    const cx = { out,
        flush: () => { if (st.tbl) { out.push(_tbl(st.tbl, w0)); st.tbl = null; } },
        emitAppr: () => { if (st.apprXml) { out.push(st.apprXml); st.apprXml = null; } } };
    for (const line of String(md || '').split('\n')) _mdLine(line, st, cx);
    cx.flush();
    cx.emitAppr(); // 메타 없는 문서 폴백 — 본문 끝 앵커라도 부동 표는 상단 여백에 렌더
    // 종결 부동 표는 끝. 뒤에 둔다 — 앵커가 본문 흐름 말미라 항상 마지막 쪽 하단에 통째로 놓인다.
    // 서명란은 _closeTbl 부동 표로 마지막 쪽 하단 배치 (문서번호 QR은 푸터 — 부동 표 안 이미지는 인쇄 경로 탈락)
    const close = st.sigLines ? _closeTbl(st.sigLines, imgMap, doc) : '';
    return out.join('') + _END + close;
};

/** 본문 이미지 풀 — {{img:key}} 토큰이 실제 참조하는 것만 임베드 + 동일 바이트(crc·길이)는
 *  같은 미디어 파트·rid 공유 (같은 서명 PNG가 img_0/img_1로 중복 임베드되던 것 방지) */
/** @param {string} mdS @param {*} images */
const _imgPool = (mdS, images) => {
    /** @type {{data: Uint8Array}[]} */
    const media = [];
    const seen = new Map(); // 'crc:len' → media 인덱스
    const add = (/** @type {Uint8Array} */ data) => {
        const sig = `${_crc32(data)}:${data.length}`;
        let idx = seen.get(sig);
        if (idx === undefined) { idx = media.length; seen.set(sig, idx); media.push({ data }); }
        return `rId${6 + idx}`;
    };
    /** @type {Object<string,{data:Uint8Array,rid:string,cx:number,cy:number,id:number}>} */
    const imgMap = {};
    for (const [key, im] of Object.entries(images || {})) {
        if (!mdS.includes(`{{img:${key}}}`)) continue; // 본문 미참조 이미지는 임베드 생략
        imgMap[key] = { data: im.data, cx: (im.w || 90) * 9525, cy: (im.h || 60) * 9525, rid: add(im.data), id: _dpNext() };
    }
    return { media, imgMap, add };
};

/** 꼬리 부동 표 이탈 방지 — Word는 부동 표가 놓일 여유(≈표 높이)를 앵커 쪽에 요구해 부족하면
 *  앵커 단락째 새 쪽으로 옮긴다 → 끝.+부동 표만의 빈 꼬리 쪽 발생(본인부담금계산 3쪽 사례).
 *  필요 여유 = flt + 추정 오차 슬랙(_TAIL_SLK — 추정은 ~10% 낙관 편향). 더 촘촘한 티어로 교체 */
/** @param {string} body @param {number} estC @param {number} estT @param {number} flt */
const _densifyTail = (body, estC, estT, flt) => {
    if (flt <= 0) return null;
    const need = flt + _TAIL_SLK;
    const tailFree = (/** @type {number} */ e) => (e ? _PAGE_PT - (e % _PAGE_PT || _PAGE_PT) : _PAGE_PT);
    if (tailFree(_estFlow(body, _DENS.normal)) >= need) return null;
    if (tailFree(estC) >= need) return { body: _compact(body), dens: _DENS.compact };
    return tailFree(estT) >= need ? { body: _tight(body), dens: _DENS.tight } : null;
};

/** 1장 원칙 밀도 선택 — 표준 추정(부동 표 점유 예약 _FLT_PT 포함)이 한 장을 넘기면 콤팩트→타이트
 *  순으로 재시도해 한 장 수용. 그래도 넘치면 표준 유지(어차피 2장이면 가독성 우선).
 *  :::page 명시 쪽 나눔 문서는 의도된 다면 구성이라 압축하지 않음 */
/** @param {string} body */
const _densify = body => {
    const flt = body.includes('<w:tblpPr') ? _FLT_PT : 0;
    if (body.includes('<w:br w:type="page"/>') || _estFlow(body, _DENS.normal) + flt <= _PAGE_PT)
        return { body, dens: _DENS.normal };
    const estC = _estFlow(body, _DENS.compact), estT = _estFlow(body, _DENS.tight);
    if (estC + flt <= _PAGE_PT) return { body: _compact(body), dens: _DENS.compact };
    if (estT + flt <= _PAGE_PT) return { body: _tight(body), dens: _DENS.tight };
    return _densifyTail(body, estC, estT, flt) || { body, dens: _DENS.normal };
};

/** 문서번호 QR 메타 — doc.qr 지정 시 푸터 표 삽입 (자체 미디어 파트 img_qr.png·footer 관계 사용) */
/** @param {?{qr?:{data?:Uint8Array}, no?:string}} doc */
const _qrMeta = doc => (doc && doc.qr && doc.qr.data ? { data: doc.qr.data, no: doc.no || '' } : null);

/**
 * Markdown 초안 → .docx File — # 헤딩·|표|·- 목록·--- 구분선·단락을 구조 보존 변환.
 * @param {string} md - 문서 마크다운 (:::approve 역할|역할 결재란 지정·none 억제, :::landscape 가로,
 *   :::page 쪽 나눔, :::sign 서명란, :::closing 종결 문구 마커 지원)
 * @param {string} filename - 확장자 제외 파일명
 * @param {string} [wm] - 워터마크 문구 (header1.xml 배치 — 모든 쪽 반복, 텍스트 상자 폴백)
 * @param {{images?: Object<string,{data:Uint8Array,w:number,h:number}>, wmImg?: {data:Uint8Array}, doc?: {no?:string, org?:string, title?:string, rev?:number, qr?:{data:Uint8Array}, recipient?:string, cc?:string, date?:string}}} [opts] - images: `{{img:key}}` 토큰(서명란)용 서명 PNG 바이트 + 표시 크기(px) — 셀 안 인라인 삽입, wmImg: 알파 구운 워터마크 PNG (지정 시 텍스트 대신 사용), doc: 문서 추적 메타 (core.xml·푸터 번호·date는 시행일자·서명일 단일 소스, qr 지정 시 푸터 QR 표, no/recipient/cc 지정 시 상단 서식란 부여)
 */
export function docxFileMd(md, filename, wm = '', opts = {}) {
    _dpId = 100; // wp:docPr id 할당기 리셋 — 문서마다 유일 순번 (중복 id는 Word 복구 경고 유발)
    const land = /^:::landscape\s*$/m.test(md);
    _TW = land ? _TW_LAND : _TW_PORT;
    const doc = opts.doc || null;
    const pool = _imgPool(String(md || ''), opts.images);
    // 문서번호 QR은 푸터 표에 삽입 — _parts가 자체 미디어 파트·관계를 만든다 (본문 이미지 풀과 분리)
    const r0 = _densify(_mdBody(md, pool.imgMap, doc));
    // 워터마크는 header1.xml에 1개 — 모든 쪽에 반복 (본문 분산 앵커 구버전 폐기)
    const hdr = _wmHdr(wm, opts.wmImg || null);
    const body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"><w:body>${r0.body}${_sect(!!hdr, land)}</w:body></w:document>`;
    const blob = _zipStore(_parts(body, pool.media, doc, hdr));
    return new File([blob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
