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

test('파일명·타입 + 3필수 엔트리 + EOCD', async () => {
    const f = docxFile('첫째\n둘째', '인수인계서_2026-11-05');
    assert.equal(f.name, '인수인계서_2026-11-05.docx');
    assert.ok(f.type.includes('wordprocessingml.document'));
    const { entries, eocd } = await unzip(f);
    assert.deepEqual(Object.keys(entries), ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
    assert.ok(eocd, 'EOCD 레코드 없음');
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
    assert.ok(doc.includes('w:type="pct"'), '표 전폭(pct) 레이아웃 누락 — A4 본문 폭 미사용');
    assert.ok(doc.includes('<w:shd'), '표머리 음영 누락');
    assert.ok(doc.includes('<w:tblCellMar>'), '셀 내부 여백 누락');
});
