// tests/unit/content/docx-utils.test.js
// @spec CO-13,DA-24 — 미니멀 docx 생성기: ZIP 구조·엔트리·document.xml 이스케이프 + MD→표 구조 변환 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docxFile, docxFileMd } from '../../../src/content/docx-utils.js';

const dec = new TextDecoder();
/** zip 구조 판독 — 로컬 헤더 순회 + EOCD 확인 */
const unzip = async file => {
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const entries = {};
    let eocd = false, i = 0;
    while (i < buf.length - 4) {
        const sig = dv.getUint32(i, true);
        if (sig === 0x04034b50) {
            const nlen = dv.getUint16(i + 26, true), elen = dv.getUint16(i + 28, true);
            const size = dv.getUint32(i + 18, true);
            const name = dec.decode(buf.slice(i + 30, i + 30 + nlen));
            entries[name] = dec.decode(buf.slice(i + 30 + nlen + elen, i + 30 + nlen + elen + size));
            i += 30 + nlen + elen + size;
        } else if (sig === 0x06054b50) { eocd = true; break; }
        else i++;
    }
    return { entries, eocd };
};

test('파일명·타입 + 필수 엔트리 + EOCD', async () => {
    const f = docxFile('첫째\n둘째', '인수인계서_2026-11-05');
    assert.equal(f.name, '인수인계서_2026-11-05.docx');
    assert.ok(f.type.includes('wordprocessingml.document'));
    const { entries, eocd } = await unzip(f);
    assert.deepEqual(Object.keys(entries), [
        '[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/settings.xml',
    ]);
    assert.ok(eocd, 'EOCD 레코드 없음');
    const settings = entries['word/settings.xml'];
    assert.ok(settings.includes('<w:view w:val="print"/>'), '인쇄 레이아웃 보기 강제 누락 — 페이지 경계 미표시 위험');
    assert.ok(settings.includes('<w:zoom w:percent="100"/>'), '확대율 100% 고정 누락');
});

test('단락 변환 — 줄 단위 w:p, 빈 줄은 빈 단락, 공백 보존', async () => {
    const { entries } = await unzip(docxFile('가  나\n\n다', 'doc'));
    const doc = entries['word/document.xml'];
    assert.equal((doc.match(/<w:p>/g) || []).length, 2);
    assert.ok(doc.includes('<w:p/>'));
    assert.ok(doc.includes('xml:space="preserve">가  나<'));
    assert.ok(doc.includes('w:document'), 'document 루트 누락');
    assert.ok(doc.includes('w:eastAsia="Malgun Gothic"'), '한글 폰트 지정 누락');
});

test('XML 이스케이프 — &<>"\' 가 엔티티로 변환', async () => {
    const { entries } = await unzip(docxFile('a & b <c> "d"', 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(!doc.includes('a & b <c> "d"'), '원시 특수문자 잔존');
    assert.ok(doc.includes('&amp;') && doc.includes('&lt;') && doc.includes('&gt;'));
});

test('빈 본문도 유효 문서 — 최소 구조 유지', async () => {
    const { entries, eocd } = await unzip(docxFile('', 'doc'));
    assert.ok(eocd);
    assert.ok(entries['word/document.xml'].includes('<w:sectPr>'));
});

test('docxFileMd — 헤딩·표·목록이 구조로 변환된다', async () => {
    const md = '# 제목\n\n메타 줄\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- 항목\n\n---\n\n본문';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('<w:tbl>'), '표 변환 누락');
    assert.ok(doc.includes('<w:b/>'), '굵기(헤딩·표머리) 누락');
    assert.ok((doc.match(/<w:tr>/g) || []).length === 2, '표 행 수 불일치');
    assert.ok(doc.includes('• 항목'), '목록 불릿 누락');
    assert.ok(doc.includes('<w:pBdr>'), '구분선 누락');
    assert.ok(doc.includes('w:type="dxa"'), '표 고정폭(dxa) 레이아웃 누락 — A4 본문 폭 미사용');
    assert.ok(doc.includes('<w:tblGrid>') && doc.includes('<w:gridCol'), '열 그리드 누락');
    assert.ok(doc.includes('<w:shd'), '표머리 음영 누락');
    assert.ok(doc.includes('<w:tblCellMar>'), '셀 내부 여백 누락');
    assert.ok(doc.includes('w:orient="portrait"'), 'A4 세로 방향 명시 누락');
});

test('docxFileMd — 공문서 격식: 제목 중앙·메타줄·표머리 연청·머리 반복', async () => {
    const md = '# 인수인계서\n\n○○요양원 · 2026-11-13 출력\n\n| A | B |\n|---|---|\n| 1 | 2 |';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    // 제목(#) — 중앙 정렬·대자, 제목 직후 단락은 메타줄(중앙·회색·소자)
    const titleIdx = doc.indexOf('인수인계서');
    assert.ok(doc.slice(0, titleIdx).includes('jc w:val="center"'), '제목 중앙 정렬 누락');
    assert.ok(doc.includes('<w:sz w:val="36"/>'), '제목 대자(18pt) 누락');
    const metaIdx = doc.indexOf('○○요양원 · 2026-11-13 출력');
    assert.ok(metaIdx > titleIdx && doc.slice(titleIdx, metaIdx).includes('w:color w:val="595959"'), '메타줄 회색 소자 처리 누락');
    // 표 — 머리 연청 음영·중앙 정렬·수직 가운데·페이지 넘김 시 머리 반복·내부선 연회색
    assert.ok(doc.includes('w:fill="DEEAF6"'), '표머리 연청 음영 누락');
    assert.ok(doc.includes('<w:tblHeader/>'), '표머리 반복(tblHeader) 누락');
    assert.ok(doc.includes('<w:vAlign w:val="center"/>'), '셀 수직 가운데 누락');
    assert.ok(doc.includes('w:color="BFBFBF"'), '내부선 연회색 누락');
    assert.ok(doc.includes('w:color="404040"'), '외곽선 색 누락');
    assert.ok(doc.includes('w:ascii="Malgun Gothic"'), '라틴·숫자 서체 통일 누락');
});

test('docxFileMd — :::sign 서명란은 하단 우측 부동 표, 셀 어절 줄바꿈', async () => {
    const md = '# 제목\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n:::sign\n인계자(서명): 김요양\n인수자(서명): 박인수\n:::end';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('w:tblpPr'), '서명란 부동 표(tblpPr) 누락');
    assert.ok(doc.includes('w:tblpYSpec="bottom"'), '서명란 하단 앵커 누락 — A4 하단 배치 아님');
    assert.ok(doc.includes('w:tblpXSpec="right"'), '서명란 우측 앵커 누락');
    assert.ok(doc.includes('인계자(서명): 김요양'), '서명 내용 누락');
    assert.ok(!doc.includes(':::sign'), '마커가 본문에 노출됨');
    assert.ok(doc.includes('<w:kinsoku/>'), '금칙 규칙(어절 줄바꿈) 누락');
    assert.ok(doc.includes('<w:wordWrap w:val="off"/>'), '단어 중간 분할 금지 누락');
});

test('docxFileMd — 좁은 셀 긴 텍스트는 어절 경계 <w:br/> 사전 줄바꿈', async () => {
    // 5열 표 → 셀 1805tw, usable ~1505tw → 한글 ~6자/줄. '요양일지 기록내용 확인'은
    // '기록내용' 앞에서만 끊겨야 한다 (Word는 OOXML 어절 스위치가 없어 생성 측 사전 줄바꿈)
    const md = '| 1 | 2 | 3 | 4 | 내용 |\n|---|---|---|---|---|\n| a | b | c | d | 요양일지 기록내용 확인 |';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('<w:br/>'), '사전 줄바꿈 <w:br/> 누락');
    // 본문 폰트 10pt 명시 — 미명시면 뷰어 기본값에 따라 폭이 달라져 어절 사전 줄바꿈이 깨짐
    assert.ok(doc.includes('<w:sz w:val="20"/>'), '본문 폰트 크기 명시(10pt) 누락');
    // 첫 줄은 '요양일지'로 끝나고 '기록내용'이 다음 줄 첫 토큰 — 음절 중간 분리 없음
    assert.ok(doc.includes('>요양일지</w:t><w:br/><w:t xml:space="preserve">기록내용 확인</w:t>'), '어절 경계가 아닌 위치에서 분리됨');
});
