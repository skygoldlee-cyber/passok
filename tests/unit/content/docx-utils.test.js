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
        '[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/settings.xml', 'word/footer1.xml',
    ]);
    assert.ok(eocd, 'EOCD 레코드 없음');
    const settings = entries['word/settings.xml'];
    assert.ok(settings.includes('<w:view w:val="print"/>'), '인쇄 레이아웃 보기 강제 누락 — 페이지 경계 미표시 위험');
    assert.ok(settings.includes('<w:zoom w:percent="100"/>'), '확대율 100% 고정 누락');
    // 바닥글 쪽 번호 — 공문서 격식 (PAGE 필드 자동 매김)
    const footer = entries['word/footer1.xml'];
    assert.ok(footer.includes('fldSimple') && footer.includes('PAGE'), '쪽 번호 필드 누락');
    assert.ok(entries['word/document.xml'].includes('w:footerReference'), '바닥글 참조 누락');
});

test('단락 변환 — 줄 단위 w:p, 빈 줄은 빈 단락, 공백 보존', async () => {
    const { entries } = await unzip(docxFile('가  나\n\n다', 'doc'));
    const doc = entries['word/document.xml'];
    assert.equal((doc.match(/<w:p>/g) || []).length, 3);
    assert.ok(doc.includes('<w:spacing w:line="140" w:lineRule="exact"/>'), '빈 단락 소형 줄높이 누락');
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
    assert.ok(doc.includes('<w:tblLayout w:type="fixed"/>'), '표 고정 레이아웃 누락 — gridCol 폭이 무시될 수 있음');
    assert.ok(doc.includes('<w:shd'), '표머리 음영 누락');
    assert.ok(doc.includes('<w:tblCellMar>'), '셀 내부 여백 누락');
    assert.ok(doc.includes('w:orient="portrait"'), 'A4 세로 방향 명시 누락');
});

test('docxFileMd — 열 너비 내용 기반 배분: 레이블 열이 내용 열보다 좁다', async () => {
    const md = '| 항목 | 내용 |\n|---|---|\n| 성명 | 김요양 |\n| 기록 | 개별급여제공기록 작성지침에 따라 서비스제공내역을 상세하게 기재한다 |';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    const ws = [...doc.matchAll(/<w:gridCol w:w="(\d+)"/g)].map(m => +m[1]);
    assert.strictEqual(ws.length, 2);
    assert.ok(ws[0] < ws[1] * 0.5, `레이블 열(${ws[0]})이 내용 열(${ws[1]}) 대비 과도 — 균등 배분 잔재`);
    assert.strictEqual(ws[0] + ws[1], 9072, '열 너비 합계가 본문 폭과 불일치');
});

test('docxFileMd — 다열 표(min 합계 초과)는 최소폭 비율 축소 배분', async () => {
    // 9열 — 균등 fallback이면 어느 열도 어절을 못 담는다. 긴 토큰 열이 더 넓어야 함
    const md = '| 방문일 | 시간 | 대상자 | 방문객 | 연락처 | 관계 | 목적 | 상태 | 결과 |\n|---|---|---|---|---|---|---|---|---|\n'
        + '| 2026-11-10 | 14:00 | 김○○ | 김민수 | 010-1234-5678 | 아들 | 면회 | 정상 | 면회 30분 — 특이사항 없음 |';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    const ws = [...doc.matchAll(/<w:gridCol w:w="(\d+)"/g)].map(m => +m[1]).slice(0, 9);
    assert.strictEqual(ws.length, 9);
    const mn = Math.min(...ws), mx = Math.max(...ws);
    assert.ok(mx > mn * 1.3, `다열 표가 균등 배분으로 fallback됨 (min ${mn}, max ${mx})`);
    assert.ok(ws[4] >= 1500, `연락처 열(${ws[4]})이 토큰 폭(~1750)에 미달`);
    assert.strictEqual(ws.reduce((a, b) => a + b, 0), 9072, '열 너비 합계 불일치');
    // 헤더 항목명은 줄넘김 금지 — 각 헤더가 단일 w:t로 존재(중간 <w:br/> 없음)
    for (const h of ['방문일', '대상자', '방문객', '연락처']) {
        assert.ok(doc.includes(`<w:t xml:space="preserve">${h}</w:t>`), `헤더 "${h}" 줄넘김 발생`);
    }
});

test('docxFileMd — 공문서 격식: 제목 중앙·메타줄·표머리 연청·머리 반복', async () => {
    const md = '# 인수인계서\n\n○○요양원 · 2026-11-13 출력\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
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
    assert.ok(doc.includes('w:val="thinThickSmallGap"'), '외곽 이중선(가는선+굵은선) 누락');
    assert.ok(doc.includes('w:color="404040"'), '외곽선 색 누락');
    assert.ok(doc.includes('w:ascii="Malgun Gothic"'), '라틴·숫자 서체 통일 누락');
    // 행 속성 — 페이지 경계 행 분할 금지 + 최소 행 높이(여유 있는 행간)
    assert.ok(doc.includes('<w:cantSplit/>'), '행 분할 방지 누락');
    assert.ok(doc.includes('<w:trHeight'), '최소 행 높이 누락');
    // 2열 표 레이블 열 음영 + 짝수 행 줄무늬
    assert.ok(doc.includes('w:fill="F2F2F2"'), '레이블 열 음영 누락');
    assert.ok(doc.includes('w:fill="F7F9FC"'), '짝수 행 줄무늬 음영 누락');
    // 타이포 — 제목 명조계·본문 1.15배 줄간격·'끝.' 종결 표기
    assert.ok(doc.includes('w:eastAsia="바탕"'), '제목 명조 서체 누락');
    assert.ok(doc.includes('w:line="276"'), '줄간격 1.15배 누락');
    assert.ok(doc.includes('끝.'), '문서 종결 표기 누락');
});

test('docxFileMd — 서명 문서 공문서 격식: 결재란·발신일·(인) 표기', async () => {
    const md = '# 인수인계서\n\n메타\n\n:::sign\n인계자(서명): 김요양\n:::end';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    // 결재란 — 문서 선두 우측 정렬 표, '결 재' 세로병합 + 담당·팀장·시설장
    const approveIdx = doc.indexOf('결 재');
    const titleIdx = doc.indexOf('인수인계서');
    assert.ok(approveIdx >= 0 && approveIdx < titleIdx, '결재란 선두 배치 누락');
    assert.ok(doc.includes('w:tblpX="5814"'), '결재란 우측 상단 부동 앵커 누락');
    assert.ok(doc.includes('w:gridCol w:w="840"'), '결재란 열 폭 부족 — 시설장 줄넘김 방지 하한');
    assert.ok(doc.includes('<w:vMerge'), '결재란 세로병합 누락');
    for (const r of ['담당', '팀장', '시설장']) assert.ok(doc.includes(r), `결재란 "${r}" 누락`);
    // 서명란 — 발신일(중앙) + (인) 표기
    assert.ok(/년 \d+월 \d+일/.test(doc), '서명란 발신일 누락');
    assert.ok(doc.includes('김요양 (인)'), '서명 (인) 표기 누락');
});

test('docxFileMd — 비서명 문서는 결재란 미부여, 종결 표기는 유지', async () => {
    const { entries } = await unzip(docxFileMd('# 명부\n\n| A | B |\n|---|---|\n| 1 | 2 |', 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(!doc.includes('결 재'), '비서명 문서에 결재란 부여됨');
    assert.ok(doc.includes('끝.'), '종결 표기 누락');
});

test('docxFileMd — :::sign 서명란은 하단 우측 부동 표, 셀 어절 줄바꿈', async () => {
    const md = '# 제목\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n:::sign\n인계자(서명): 김요양\n인수자(서명): 박인수\n:::end';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('w:tblpPr'), '서명란 부동 표(tblpPr) 누락');
    assert.ok(doc.includes('w:tblpYSpec="bottom"'), '서명란 하단 앵커 누락 — A4 하단 배치 아님');
    // 명시적 tblpX — XSpec="right"는 우측 초과, 이중 외곽선 포함 우측끝을 본문 표와 정합(+102 보정)
    assert.ok(doc.includes('w:tblpX="4974"'), '서명란 우측 앵커(본문폭−서명폭+102 보정) 누락');
    assert.ok(doc.includes('인계자(서명): 김요양'), '서명 내용 누락');
    assert.ok(!doc.includes(':::sign'), '마커가 본문에 노출됨');
    assert.ok(doc.includes('<w:kinsoku/>'), '금칙 규칙(어절 줄바꿈) 누락');
    assert.ok(doc.includes('<w:wordWrap w:val="off"/>'), '단어 중간 분할 금지 누락');
});

test('docxFileMd — 좁은 셀 긴 텍스트는 어절 경계 <w:br/> 사전 줄바꿈', async () => {
    // 5열 표 — 긴 내용 열도 60% 상한으로 셀 폭 한정 → 줄바꿈은 어절 경계에서만 발생해야 함
    // (Word는 OOXML 어절 스위치가 없어 생성 측 사전 줄바꿈)
    const md = '| 1 | 2 | 3 | 4 | 내용 |\n|---|---|---|---|---|\n| a | b | c | d | 요양일지 기록내용 확인 작성지침에 따라 서비스제공내역을 상세하게 기재한다 |';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('<w:br/>'), '사전 줄바꿈 <w:br/> 누락');
    // 본문 폰트 10pt 명시 — 미명시면 뷰어 기본값에 따라 폭이 달라져 어절 사전 줄바꿈이 깨짐
    assert.ok(doc.includes('<w:sz w:val="20"/>'), '본문 폰트 크기 명시(10pt) 누락');
    // 어절이 쪼개지지 않음 — 줄바꿈된 조각들 사이에서도 각 어절은 통째로 존재
    assert.ok(doc.includes('기록내용'), '어절 중간 분리(기록내용)');
    assert.ok(doc.includes('서비스제공내역을'), '어절 중간 분리(서비스제공내역을)');
});

test('워터마크 — 문구 지정 시 본문 선두 VML 셰이프 삽입, 미지정 시 생략', async () => {
    const { entries } = await unzip(docxFileMd('# t\n\n본문', 'doc', '테스트요양원 · 2026-11-14'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('w:drawing'), '본문 앵커 워터마크 드로잉 누락');
    assert.ok(doc.includes('테스트요양원'), '워터마크 문구 누락');
    assert.ok(doc.includes('rot="-2700000"'), '대각선 회전(-45°) 누락 — VML rotation은 txbx에 무력이라 DrawingML 필수');
    assert.ok(doc.includes('w:txbxContent'), '회전 텍스트 상자 누락 — textpath는 렌더러별로 깨짐');
    // 머리글 앵커는 본문 아래 레이어 고정이라 표 음영에 가려짐 — 본문 앵커+텍스트 앞 z-order 필수
    assert.ok(doc.includes('<wp:positionH relativeFrom="margin"><wp:align>center</wp:align>'), '수평 중앙 앵커 누락');
    assert.ok(doc.includes('<wp:positionV relativeFrom="margin"><wp:align>center</wp:align>'), '수직 중앙 앵커 누락');
    assert.ok(doc.includes('behindDoc="0"'), '텍스트 앞 배치 누락 — 뒤쪽이면 음영 셀에 가려짐');
    assert.ok(doc.includes('w14:alpha w14:val="20000"'), '투명 텍스트 누락 — w14:textFill alpha로 본문 가림 없이 전면 표시');
    const { entries: plain } = await unzip(docxFileMd('# t\n\n본문', 'doc'));
    assert.ok(!plain['word/document.xml'].includes('w:drawing'), '워터마크 미지정 시 드로잉 없어야 함');
});
