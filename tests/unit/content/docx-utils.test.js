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
        '[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/styles.xml', 'word/settings.xml', 'word/footer1.xml',
    ]);
    assert.ok(eocd, 'EOCD 레코드 없음');
    const settings = entries['word/settings.xml'];
    assert.ok(settings.includes('<w:view w:val="print"/>'), '인쇄 레이아웃 보기 강제 누락 — 페이지 경계 미표시 위험');
    assert.ok(settings.includes('<w:zoom w:percent="100"/>'), '확대율 100% 고정 누락');
    // 바닥글 쪽 번호 — 공문서 격식 (PAGE 필드 자동 매김). IF 중첩은 LibreOffice·한컴이
    // 계산하지 않아 "11"로 깨지므로 단순 PAGE/NUMPAGES만 사용한다
    const footer = entries['word/footer1.xml'];
    assert.ok(footer.includes('PAGE') && footer.includes('NUMPAGES'), '쪽 번호 필드 누락');
    assert.ok(!footer.includes('IF '), 'IF 필드 잔존 — 미지원 뷰어에서 쪽 번호가 깨짐');
    // styles.xml — 기본 글꼴·한글 언어·제목 스타일 (탐색창·PDF 북마크·접근성)
    const styles = entries['word/styles.xml'];
    assert.ok(styles.includes('w:eastAsia="ko-KR"'), '한글 언어 지정 누락 — 맞춤법·금칙이 영어 기준으로 동작');
    assert.ok(styles.includes('w:styleId="Heading1"'), '제목 스타일 누락');
    assert.ok(entries['word/document.xml'].includes('w:footerReference'), '바닥글 참조 누락');
});

test('단락 변환 — 줄 단위 w:p, 빈 줄은 빈 단락, 공백 보존', async () => {
    const { entries } = await unzip(docxFile('가  나\n\n다', 'doc'));
    const doc = entries['word/document.xml'];
    assert.equal((doc.match(/<w:p>/g) || []).length, 3);
    assert.ok(doc.includes('<w:spacing w:line="150" w:lineRule="exact"/>'), '빈 단락 소형 줄높이 누락');
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
    // 제목(#) — 중앙 정렬·대자·제목 스타일(탐색창·북마크), 제목 직후 단락은 메타줄(중앙·회색·소자)
    const titleIdx = doc.indexOf('인수인계서');
    assert.ok(doc.slice(0, titleIdx).includes('jc w:val="center"'), '제목 중앙 정렬 누락');
    assert.ok(doc.includes('<w:pStyle w:val="Heading1"/>'), '제목 스타일 누락 — 탐색창·PDF 북마크용');
    assert.ok(doc.includes('<w:sz w:val="40"/>'), '제목 대자(20pt) 누락');
    assert.ok(doc.includes('<w:u w:val="double"/>'), '제목 이중 밑줄 누락');
    const metaIdx = doc.indexOf('○○요양원 · 2026-11-13 출력');
    assert.ok(metaIdx > titleIdx && doc.slice(titleIdx, metaIdx).includes('w:color w:val="595959"'), '메타줄 회색 소자 처리 누락');
    // 표 — 머리 연청 음영·중앙 정렬·수직 가운데·페이지 넘김 시 머리 반복·내부선 연회색
    assert.ok(doc.includes('w:fill="D9E6F7"'), '표머리 연청 음영 누락');
    assert.ok(doc.includes('<w:tblHeader/>'), '표머리 반복(tblHeader) 누락');
    assert.ok(doc.includes('<w:vAlign w:val="center"/>'), '셀 수직 가운데 누락');
    assert.ok(doc.includes('w:color="999999"'), '내부선 회색 누락 — D9D9D9급 연색은 인쇄·PDF에서 소멸');
    // 외곽선 — 얇은 단선(흑백 인쇄 가독성·토너 절감). 이중선·진회색은 렌더 리뷰에서 탁하다고 지적됨
    assert.ok(doc.includes('w:val="single"'), '외곽 단선 누락');
    assert.ok(doc.includes('w:color="595959"'), '외곽선 색 누락');
    assert.ok(doc.includes('w:ascii="Malgun Gothic"'), '라틴·숫자 서체 통일 누락');
    // 행 속성 — 페이지 경계 행 분할 금지 + 최소 행 높이(여유 있는 행간)
    assert.ok(doc.includes('<w:cantSplit/>'), '행 분할 방지 누락');
    assert.ok(doc.includes('<w:trHeight'), '최소 행 높이 누락');
    // 2열 표 레이블 열 음영 + 짝수 행 연한 줄무늬 (진회색 D0D0D0 계열은 인쇄 시 탁함)
    assert.ok(doc.includes('w:fill="EFEFEF"'), '레이블 열 음영 누락');
    assert.ok(doc.includes('w:fill="F2F6FB"'), '짝수 행 줄무늬 음영 누락');
    // 타이포 — 맑은 고딕 통일(플랫폼 무관)·본문 1.4배 줄간격·'끝.' 종결 표기
    assert.ok(!doc.includes('w:eastAsia="바탕"'), '한 군데만 명조체 사용 — 플랫폼별 대체 글꼴로 떨어짐');
    assert.ok(doc.includes('w:line="336"'), '줄간격 1.4배 누락');
    assert.ok(doc.includes('끝.'), '문서 종결 표기 누락');
});

test('docxFileMd — 서명 문서 공문서 격식: 결재란·발신일·(인) 표기', async () => {
    const md = '# 인수인계서\n\n메타\n\n:::sign\n인계자(서명): 김요양\n:::end';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    // 결재란 — 우측 상단 부동 표, '결 재' 세로병합 + 담당·팀장·시설장.
    // 부동 표는 메타줄 뒤에 삽입한다 — 선두 삽입은 제목을 좌측으로 밀어 중앙 정렬이 깨졌다 (렌더 리뷰)
    const approveIdx = doc.indexOf('결 재');
    const metaIdx = doc.indexOf('메타');
    assert.ok(approveIdx > metaIdx, '결재란은 메타줄 뒤 삽입 — 선두 삽입 시 제목이 치우침');
    assert.ok(doc.includes('w:tblpX="5334"'), '결재란 우측 상단 부동 앵커 누락');
    assert.ok(doc.includes('w:gridCol w:w="960"'), '결재란 열 폭 부족 — 시설장(11pt) 줄넘김 방지 하한');
    assert.ok(doc.includes('<w:vMerge'), '결재란 세로병합 누락');
    for (const r of ['담당', '팀장', '시설장']) assert.ok(doc.includes(r), `결재란 "${r}" 누락`);
    // 서명란 — 발신일(중앙) + (인)은 우측 탭 정지로 셀 우측 끝 배치
    assert.ok(/년 \d+월 \d+일/.test(doc), '서명란 발신일 누락');
    assert.ok(doc.includes('김요양'), '서명인 누락');
    assert.ok(/<w:tab\/><\/w:r><w:r>.*?<w:t>\(인\)<\/w:t>/.test(doc), '(인) 우측 탭 배치 누락');
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
    // 명시적 tblpX — XSpec="right"는 우측 초과, 이중 외곽선 포함 우측끝을 본문 표와 정합(+88 보정 —
    // 중첩 표는 tblpX 산술보다 ~65tw 좌측에 착지 + 본문 표 외곽선 ~24tw 우측 돌출, PDF 실측)
    // 내부 표 들여쓰기(_SIG_IND=60)만큼 좌측으로 — 시각적 우측선은 본문 표 외곽선과 일치
    assert.ok(doc.includes('w:tblpX="4900"'), '서명란 우측 앵커(본문폭−서명폭−들여쓰기+88 보정) 누락');
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
    // 본문 폰트 11pt 명시 — 미명시면 뷰어 기본값에 따라 폭이 달라져 어절 사전 줄바꿈이 깨짐
    assert.ok(doc.includes('<w:sz w:val="22"/>'), '본문 폰트 크기 명시(11pt) 누락');
    // 어절이 쪼개지지 않음 — 줄바꿈된 조각들 사이에서도 각 어절은 통째로 존재
    assert.ok(doc.includes('기록내용'), '어절 중간 분리(기록내용)');
    assert.ok(doc.includes('서비스제공내역을'), '어절 중간 분리(서비스제공내역을)');
});

test('워터마크 — 문구 지정 시 헤더 파트 앵커(모든 쪽 반복), 미지정 시 생략', async () => {
    const { entries } = await unzip(docxFileMd('# t\n\n본문', 'doc', '테스트요양원 · 2026-11-14'));
    // 헤더 배치 — 본문 앵커는 1쪽에만 묶이고, 페이지 경계 추정 분산은 농도를 들쭉날쭉하게 했다.
    // 헤더 도형은 렌더러가 모든 쪽에 반복하므로 쪽 수·길이와 무관하게 동일 농도다 (렌더 리뷰)
    const hdr = entries['word/header1.xml'];
    assert.ok(hdr, 'header1.xml 누락 — 워터마크는 헤더 파트로 이동');
    assert.ok(hdr.includes('테스트요양원'), '워터마크 문구 누락');
    assert.ok(hdr.includes('rot="-2700000"'), '대각선 회전(-45°) 누락 — VML rotation은 txbx에 무력이라 DrawingML 필수');
    assert.ok(hdr.includes('w:txbxContent'), '회전 텍스트 상자 누락 — textpath는 렌더러별로 깨짐');
    assert.ok(hdr.includes('<wp:positionH relativeFrom="page"><wp:align>center</wp:align>'), '수평 중앙 앵커 누락');
    assert.ok(hdr.includes('<wp:positionV relativeFrom="page"><wp:align>center</wp:align>'), '수직 중앙 앵커 누락');
    assert.ok(hdr.includes('w14:srgbClr w14:val="C0C0C0"'), '회색 누락');
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('<w:headerReference'), '헤더 참조 누락 — 모든 쪽 반복의 연결 고리');
    assert.ok(!doc.includes('<wp:anchor'), '본문 앵커 잔존 — 헤더 전환으로 본문에는 앵커 없어야 함');
    const { entries: plain } = await unzip(docxFileMd('# t\n\n본문', 'doc'));
    assert.ok(!('word/header1.xml' in plain), '워터마크 미지정 시 헤더 없어야 함');
    // 다중 페이지 — 헤더 앵커 1개가 모든 쪽에 반복 (쪽별 분산 앵커 구버전 폐기)
    const longMd = '# t\n\n' + Array.from({ length: 50 }, (_, i) => '단락 ' + i).join('\n\n');
    const { entries: long } = await unzip(docxFileMd(longMd, 'doc', '테스트요양원'));
    assert.equal((long['word/header1.xml'].match(/<wp:anchor/g) || []).length, 1, '헤더 워터마크 앵커는 1개 — 모든 쪽에 반복');
    assert.ok(!long['word/document.xml'].includes('<wp:anchor'), '긴 문서에도 본문 앵커 없음 — 헤더가 전 쪽 커버');
});

test('워터마크 — 장문·쪽 나눔과 무관하게 전 쪽 적용 (헤더 방식)', async () => {
    // 본문 분산 앵커 시대에는 쪽 경계 추정을 놓치면 빈 쪽이 생겼다 — 헤더 워터마크는 구조상 불가
    const md = '# t\n\n' + '가'.repeat(2000) + '\n\n:::page\n\n둘째 쪽';
    const { entries } = await unzip(docxFileMd(md, 'doc', '테스트요양원'));
    assert.ok(entries['word/header1.xml'].includes('테스트요양원'), '헤더 워터마크 — :::page 뒤 새 쪽에도 자동 반복');
    assert.ok(entries['word/document.xml'].includes('<w:br w:type="page"/>'), '쪽 나눔 브레이크 누락');
});

test('워터마크 PNG — wmImg 지정 시 헤더에 알파 이미지 앵커 (w14:alpha 무시 뷰어 대응)', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
    const { entries } = await unzip(docxFileMd('# t\n\n본문', 'doc', '테스트요양원', { wmImg: { data: png, w: 1280, h: 180 } }));
    const hdr = entries['word/header1.xml'];
    assert.ok(hdr.includes('pic:pic'), '그림 워터마크 누락 — 이미지 알파는 렌더러 무관 적용');
    assert.ok(hdr.includes('r:embed="rId1"'), '헤더 이미지는 header1.xml.rels의 rId1 참조');
    assert.ok(hdr.includes('rot="-2700000"'), '대각선 회전 누락');
    assert.ok(!hdr.includes('w:txbxContent'), 'PNG 지정 시 텍스트 상자 경로 사용 안 함');
    assert.ok(entries['word/media/img_wm.png'], '워터마크 미디어 파트 누락');
    assert.ok(entries['word/_rels/header1.xml.rels'].includes('img_wm.png'), '헤더 관계 선언 누락 — 헤더 그림은 헤더 rels 기준');
    assert.ok(!entries['word/document.xml'].includes('pic:pic'), '본문 그림 없음 — 워터마크는 헤더 전용');
    // 본문 이미지와 공존 — 서명은 본문 rels rId6~·media/img_N, 워터마크는 헤더 rels rId1·media/img_wm (풀 분리)
    const md = ':::sign\n작성자: {{img:a}}\n:::end';
    const { entries: both } = await unzip(docxFileMd(md, 'doc', 'wm', { images: { a: { data: png, w: 90, h: 60 } }, wmImg: { data: png } }));
    assert.ok(both['word/document.xml'].includes('r:embed="rId6"'), '서명 이미지 rId6 유지');
    assert.ok(both['word/header1.xml'].includes('r:embed="rId1"'), '워터마크는 헤더 rels rId1');
    assert.ok(both['word/media/img_0.png'] && both['word/media/img_wm.png'], '본문·헤더 미디어 파트 분리');
});

test('서명 이미지 — 서명란 {{img:key}}를 셀 인라인 이미지로 삽입 (미참조 이미지는 임베드 안 함)', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
    const md = '# t\n\n:::sign\n작성자: {{img:author}}\n확인자: 박 시설\n:::end';
    // 인라인 삽입 — 고정 좌표 앵커는 (인)·라벨 위에 겹쳐 글자를 덮었다 (렌더 리뷰).
    // 미사용 approve 이미지는 참조 없으면 임베드하지 않는다 — 같은 서명의 이중 임베드 방지
    const { entries } = await unzip(docxFileMd(md, 'doc', '', { images: { author: { data: png, w: 90, h: 61 }, approve: { data: png, w: 52, h: 35 } } }));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('wp:inline'), '인라인 이미지 누락 — 앵커 오버레이는 글자를 덮어 폐기');
    assert.ok(!doc.includes('wp:anchor'), '앵커 오버레이 잔존 — 서명은 셀 안 인라인이어야 함');
    assert.ok(doc.includes('<w:t>(인)</w:t>'), '(인) 표기 — 이미지 없는 서명 칸은 빈칸 유지 (미결재 자동 서명 금지)');
    assert.ok(doc.includes('r:embed="rId6"'), '서명란 이미지 관계 참조 누락 — 본문 이미지는 rId6~ 연번');
    assert.ok(!doc.includes('r:embed="rId7"'), '미참조 approve 이미지 임베드됨 — 위·변조 오해 방지 위해 자동 서명 없음');
    assert.ok(doc.includes('<w:tab w:val="right"'), '우측 탭 정지 누락 — 서명을 셀 우측에 정렬');
    assert.ok(doc.includes('descr="서명"'), '대체 텍스트 누락');
    assert.ok(!doc.includes('{{img'), '토큰 잔존 — 치환 실패');
    assert.ok(entries['word/media/img_0.png'], '미디어 파트 누락');
    assert.ok(!entries['word/media/img_1.png'], '미참조 이미지 임베드됨 — 본문 미참조 서명은 생략해야 함');
    assert.ok(entries['word/_rels/document.xml.rels'].includes('media/img_0.png'), '이미지 관계 선언 누락');
    assert.ok(entries['[Content_Types].xml'].includes('Extension="png"'), 'png 콘텐츠 타입 누락');
    // 이미지 미지정 시 토큰은 빈 서명 자리로 치환 (토큰 잔존 금지)
    const { entries: plain } = await unzip(docxFileMd(md, 'doc'));
    assert.ok(!plain['word/document.xml'].includes('{{img'), '미지정 시에도 토큰 잔존 금지');
    assert.ok(plain['word/document.xml'].includes('＿＿＿＿'), '빈 서명 자리 표기 누락');
    // 텍스트 서명행 — (인)은 우측 탭 정지로 셀 우측 끝 (이름 뒤 공백 누적은 위치 불안정)
    const pdoc = plain['word/document.xml'];
    assert.ok(pdoc.includes(`<w:tab w:val="right" w:pos="${4200 - 300}"`), '(인) 우측 탭 정지 누락');
    assert.ok(pdoc.includes('<w:tab/></w:r><w:r>') && pdoc.includes('(인)'), '(인) 탭 뒤 배치 누락');
});

test('docxFileMd — :::page 페이지 나눔: 강제 브레이크 + 헤더 워터마크가 새 쪽에도 반복', async () => {
    const md = '# 기록\n\n### 1. 김 ○○ — 2026-11-05\n\n| 항목 | 내용 |\n|---|---|\n| 대상자 | 김 ○○ |\n\n:::page\n\n### 2. 이 ○○ — 2026-11-06\n\n| 항목 | 내용 |\n|---|---|\n| 대상자 | 이 ○○ |';
    const { entries } = await unzip(docxFileMd(md, 'doc', '행복요양원'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('<w:br w:type="page"/>'), '페이지 나눔 브레이크 누락');
    // 헤더 워터마크 — 쪽 나눔 뒤 새 쪽도 렌더러가 자동 반복 (본문 앵커 시대의 쪽별 앵커 삽입 불필요)
    assert.ok(entries['word/header1.xml'].includes('행복요양원'), '헤더 워터마크 누락');
});


test('docxFileMd — 결재란 열 폭: 시설장(11pt) 한 줄 수용 하한', async () => {
    const md = '# 보고서\n\n:::sign\n작성자: 김요양\n:::end';
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    // 11pt '시설장'(3×220=660tw)+셀 여백(280tw) = 940tw 필요 — 열 폭은 960tw
    assert.ok(doc.includes('<w:gridCol w:w="960"/>'), '결재란 열 폭 960 누락 — 시설장 줄넘김 위험');
});

test('docxFileMd — 1장 원칙: 살짝 넘치는 문서는 콤팩트 밀도로 한 장 수용', async () => {
    // 25단락(+제목·메타·빈줄·종결≈30요소): 표준 추정 ≈750pt(>700)이나 콤팩트 ≈690pt(≤700) → 콤팩트 적용
    const md = '# 기록\n\n기관명\n\n' + Array.from({ length: 25 }, (_, i) => `항목 ${i + 1} 내용입니다.`).join('\n');
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('w:line="300"'), '콤팩트 행간 300 미적용');
    assert.ok(!doc.includes('w:line="336"'), '표준 행간 336 잔존 — 콤팩트 미적용');
});

test('docxFileMd — 1장 원칙: 콤팩트로도 넘치는 문서는 타이트 밀도로 한 장 수용', async () => {
    // 28단락(≈33요소): 표준 ≈825pt·콤팩트 ≈759pt(>700)이나 타이트 ≈627pt(≤700) → 타이트 적용
    const md = '# 기록\n\n기관명\n\n' + Array.from({ length: 28 }, (_, i) => `항목 ${i + 1} 내용입니다.`).join('\n');
    const { entries } = await unzip(docxFileMd(md, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('w:line="240"'), '타이트 행간 240 미적용');
    assert.ok(!doc.includes('w:line="300"') && !doc.includes('w:line="336"'), '상위 티어 행간 잔존 — 타이트 미적용');
});

test('docxFileMd — 1장 원칙: 크게 넘치는 문서·:::page 문서는 표준 밀도 유지', async () => {
    // 80단락: 콤팩트로도 1장 불가(≈1245pt) → 가독성 우선 표준 유지
    const long = '# 기록\n\n기관명\n\n' + Array.from({ length: 80 }, (_, i) => `항목 ${i + 1} 내용입니다.`).join('\n');
    const { entries } = await unzip(docxFileMd(long, 'doc'));
    const doc = entries['word/document.xml'];
    assert.ok(doc.includes('w:line="336"'), '다면 문서까지 압축됨 — 표준 밀도 유지 필요');
    // :::page 명시 쪽 나눔은 의도된 다면 구성 — 압축 대상 아님
    const paged = '# 기록\n\n기관명\n\n' + Array.from({ length: 38 }, (_, i) => `항목 ${i + 1}`).join('\n') + '\n\n:::page\n\n다음 쪽';
    const { entries: e2 } = await unzip(docxFileMd(paged, 'doc'));
    const d2 = e2['word/document.xml'];
    assert.ok(d2.includes('w:line="336"'), ':::page 문서 압축됨 — 명시 쪽 나눔은 표준 유지 필요');
});

// — 문서 추적 메타 (opts.doc): docProps/core.xml·푸터 번호·QR 부동 표 —

test('docxFileMd — docProps/core.xml: 번호·기관·제목·판본 + 패키지 관계·콘텐츠타입', async () => {
    const doc = { no: 'LOG-20261114-a3f2c1', org: '테스트요양원', title: '요양일지', rev: 2 };
    const { entries } = await unzip(docxFileMd('# 요양일지\n\n테스트요양원 · 2026-11-14 출력\n\n본문', 'doc', '', { doc }));
    const core = entries['docProps/core.xml'];
    assert.ok(core, 'docProps/core.xml 파트 누락');
    assert.ok(core.includes('<dc:identifier>LOG-20261114-a3f2c1</dc:identifier>'), '문서번호 식별자 누락');
    assert.ok(core.includes('<dc:creator>테스트요양원</dc:creator>'), '발행 기관 누락');
    assert.ok(core.includes('<cp:revision>2</cp:revision>'), '발행 판본 누락');
    assert.ok(core.includes('<dc:title>요양일지</dc:title>'), '문서 제목 누락');
    assert.ok(core.includes('dcterms:created'), '생성 시각 누락');
    assert.ok(entries['[Content_Types].xml'].includes('core-properties'), '콘텐츠 타입 선언 누락');
    assert.ok(entries['_rels/.rels'].includes('metadata/core-properties'), '패키지 관계 누락');
    const footer = entries['word/footer1.xml'];
    assert.ok(footer.includes('문서번호 LOG-20261114-a3f2c1'), '푸터 문서번호 누락 — 모든 쪽 표기 기대');
    const docXml = entries['word/document.xml'];
    assert.ok(docXml.includes('테스트요양원 · 2026-11-14 출력'), '메타줄 누락');
    assert.ok(docXml.includes('문서번호') && docXml.includes('LOG-20261114-a3f2c1'), '상단 서식란 문서번호 미부여 — 공문서 표준 서식');
    assert.ok(docXml.includes('시행일자'), '상단 서식란 시행일자 미부여');
});

test('docxFileMd — doc.qr: 푸터 QR 표 + 자체 media 파트 + 관계 (부동 표 안 이미지는 인쇄 경로 탈락)', async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const doc = { no: 'LOG-20261114-a3f2c1', qr: { data: png } };
    const { entries } = await unzip(docxFileMd('# t\n\n본문', 'doc', '', { doc }));
    assert.ok(entries['word/media/img_qr.png'], 'QR 미디어 파트 누락');
    assert.ok(entries['word/_rels/footer1.xml.rels'].includes('media/img_qr.png'), '푸터 QR 이미지 관계 누락');
    const ftr = entries['word/footer1.xml'];
    assert.ok(ftr.includes('진위 확인'), 'QR 용도 캡션 누락');
    assert.ok(ftr.includes('docno.png'), 'QR 이미지 런 누락');
    assert.ok(ftr.includes('문서번호 LOG-20261114-a3f2c1'), '푸터 문서번호 누락');
    assert.ok(!ftr.includes('<w:tblpPr'), '푸터 QR는 부동 표가 아니어야 함 — 인쇄→PDF 탈락 방지');
    const docXml = entries['word/document.xml'];
    assert.ok(docXml.includes('문서번호') && docXml.includes('LOG-20261114-a3f2c1'), '상단 서식란 문서번호 누락');
    assert.ok(!docXml.includes('docno.png'), '본문 QR 잔재 — 부동 표 안 이미지는 인쇄→PDF에서 탈락');
});

test('docxFileMd — doc 미지정 시 파트 구성 불변 (기존 6엔트리 + 이미지)', async () => {
    const { entries } = await unzip(docxFileMd('# t\n\n본문', 'doc'));
    assert.ok(!entries['docProps/core.xml'], 'doc 미지정인데 core.xml 생성됨');
    assert.ok(!entries['_rels/.rels'].includes('core-properties'), 'doc 미지정인데 패키지 관계 추가됨');
    assert.ok(!entries['word/footer1.xml'].includes('문서번호'), 'doc 미지정인데 푸터 번호 삽입됨');
});

test('docxFile — doc 미지정 시 기본 엔트리 유지 (회귀)', async () => {
    const { entries } = await unzip(docxFile('첫째\n둘째', 'doc'));
    assert.deepEqual(Object.keys(entries), [
        '[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/styles.xml', 'word/settings.xml', 'word/footer1.xml',
    ]);
});

test('docxFile — opts.doc: 평문 경로도 core.xml + 푸터 번호 부여', async () => {
    const doc = { no: 'INC-20261113-b7e4d2', org: '테스트요양원', rev: 1 };
    const { entries } = await unzip(docxFile('제목\n기관 · 2026-11-13 출력 · 문서번호 INC-20261113-b7e4d2\n\n본문', 'doc', 2, '', { doc }));
    assert.ok(entries['docProps/core.xml'].includes('<dc:identifier>INC-20261113-b7e4d2</dc:identifier>'));
    assert.ok(entries['word/footer1.xml'].includes('문서번호 INC-20261113-b7e4d2'));
});
