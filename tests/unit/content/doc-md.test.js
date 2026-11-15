// tests/unit/content/doc-md.test.js
// @spec CO-13,DA-24 — MD 초안 빌더 팩토리 계약: org/sign 공급자 주입·마커·결재란·워터마크
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createDocMd } = await import('../../../src/content/doc-md.js');
const { todayKey } = await import('../../../src/core/utils.js');

const make = (org = () => '테스트기관', sign = () => ({}), images = () => ({})) => createDocMd({ org, sign, images });

test('docMdHead — 제목 + 기관명·출력일 메타', () => {
    const d = make();
    const h = d.docMdHead('요양일지');
    assert.ok(h.startsWith('# 요양일지'));
    assert.ok(h.includes(`테스트기관 · ${todayKey()} 출력`));
});

test('docMdHead — 기관 공급자 없으면 기관명 생략', () => {
    const d = make(() => '');
    const h = d.docMdHead('문서');
    assert.ok(h.includes(`${todayKey()} 출력`));
    assert.ok(!h.includes(' · '));
});

test('mdTable/csvToMdTable — 헤더·구분행·데이터행', () => {
    const d = make();
    const t = d.mdTable(['항목', '값'], [['a', '1'], ['b', '2']]);
    assert.ok(t.startsWith('| 항목 | 값 |'));
    assert.ok(t.includes('|---|---|'));
    assert.ok(t.includes('| a | 1 |'));
    const c = d.csvToMdTable('항목,값\na,1\nb,2');
    assert.equal(c, t);
});

test('docMdSign — sign 공급자 성명 기입·미지정 슬롯 공란·author 서명 이미지 토큰', () => {
    const d = make(() => '기관', () => ({ author: '홍길동', confirmer: '', receiver: '김영희', signImage: 'data:image/png;base64,xx' }));
    const s = d.docMdSign([['작성자', 'author'], ['확인자', 'confirmer'], ['수령인', 'receiver']]);
    assert.ok(s.includes(':::sign'));
    assert.ok(s.includes('작성자: 홍길동 {{img:author}}'), '서명 이미지 토큰 병기');
    assert.ok(s.includes('확인자: ＿＿＿＿＿＿＿＿'), '미설정 슬롯 공란');
    assert.ok(s.includes('수령인: 김영희'));
});

test('docMdSign — approve 역할 지정·none 억제', () => {
    const d = make();
    assert.ok(d.docMdSign([['작성자', 'author']], ['사회복지사', '센터장']).includes(':::approve 사회복지사|센터장'));
    assert.ok(d.docMdSign([['작성자', 'author']], 'none').includes(':::approve none'));
    assert.ok(!d.docMdSign([['작성자', 'author']]).includes(':::approve'), '미지정 시 마커 없음 — 기본 결재선');
});

test('mdToHtml — 헤딩·메타·표·결재란·서명란·종결 마커', () => {
    const d = make(() => '테스트기관', () => ({ author: '홍길동', wm: false }));
    const md = d.docMdHead('보고서') + '\n| 항목 | 값 |\n|---|---|\n| a | 1 |\n\n' + d.docMdSign([['작성자', 'author']]);
    const h = d.mdToHtml(md);
    assert.ok(h.includes('<div class="doc-md">'));
    assert.ok(h.includes('<h3>보고서</h3>'));
    assert.ok(h.includes('doc-meta'), 'H1 직후 메타줄');
    assert.ok(h.includes('<table class="doc-kv">'), '2열 표 레이블 음영 클래스');
    assert.ok(h.includes('doc-approve'), '기본 결재란');
    assert.ok(h.includes('doc-sign'), '서명 블록');
    assert.ok(h.includes('doc-end'), '종결 표기 끝.');
});

test('mdToHtml — :::approve none이면 결재란 미출력, 마커 자체는 미출력', () => {
    const d = make(() => '기관', () => ({ wm: false }));
    const md = '# 문서\n\n:::approve none\n\n:::sign\n작성자: 홍길동\n:::end';
    const h = d.mdToHtml(md);
    assert.ok(!h.includes('doc-approve'));
    assert.ok(!h.includes(':::'), '설정 마커가 출력으로 새면 안 됨');
});

test('mdToHtml — sign().wm 켜짐 + 기관명 있을 때만 워터마크 오버레이', () => {
    const on = make(() => '테스트기관', () => ({ wm: true }));
    const off = make(() => '테스트기관', () => ({ wm: false }));
    const noOrg = make(() => '', () => ({ wm: true }));
    assert.ok(on.mdToHtml('# 문서\n\n본문').includes('doc-wm'), 'wm on → 오버레이');
    assert.ok(!off.mdToHtml('# 문서\n\n본문').includes('doc-wm'), 'wm off → 없음');
    assert.ok(!noOrg.mdToHtml('# 문서\n\n본문').includes('doc-wm'), '기관명 없음 → 없음');
});

test('본문 {{img:key}} — images 공급자 해석 시 doc-img 블록, 미등록·행 중간은 (이미지) 표기', () => {
    const d = make(() => '기관', () => ({}), () => ({ chart: 'data:image/png;base64,zz' }));
    const h = d.mdToHtml('# 문서\n\n본문\n\n{{img:chart}}');
    assert.ok(h.includes('doc-img'), '본문 이미지 태그 누락');
    assert.ok(h.includes('src="data:image/png;base64,zz"'));
    assert.ok(!h.includes('{{img'), '토큰 누수');
    const miss = d.mdToHtml('# 문서\n\n{{img:none}}');
    assert.ok(miss.includes('(이미지)'), '미등록 키는 플레이스홀더');
    const mid = d.mdToHtml('# 문서\n\n참고 {{img:chart}} 그림');
    assert.ok(mid.includes('참고 (이미지) 그림'), '행 중간 토큰은 텍스트 표기');
});

test('서명란 {{img:key}} 임의 키 — images 맵 해석·author 폴백·미등록 공란', () => {
    const d = make(() => '기관', () => ({ author: '홍길동', signImage: 'data:image/png;base64,aa' }), () => ({ seal: 'data:image/png;base64,bb' }));
    const md = ':::sign\n작성자: 홍길동 {{img:author}}\n날인: {{img:seal}}\n수령: {{img:other}}\n:::end';
    const h = d.mdToHtml(md);
    assert.ok((h.match(/doc-sign-spot/g) || []).length === 2, 'author·seal 두 키 모두 이미지 서명');
    assert.ok(h.includes('base64,bb'), 'images 맵의 임의 키 해석');
    assert.ok(h.includes('수령: ＿＿＿＿＿＿＿＿ (인)'), '미등록 키는 수기 공란');
    assert.ok(!h.includes('{{img'), '토큰 누수');
});

test('코드 펜스 — doc-code pre로 원문 보존, 펜스 내 마커는 미해석', () => {
    const d = make(() => '기관', () => ({ wm: false }));
    const h = d.mdToHtml('# 문서\n\n```\n| a | b |\n:::sign\n```\n\n본문');
    assert.ok(h.includes('<pre class="doc-code">'));
    assert.ok(h.includes('| a | b |'), '펜스 내 표 행은 원문 유지');
    assert.ok(!h.includes('doc-approve'), '펜스 내 :::sign은 결재란으로 해석 안 함');
    assert.ok(!h.includes('<table'), '펜스 내 표 행은 표로 렌더 안 함');
    const unclosed = d.mdToHtml('# 문서\n\n```\ncode line');
    assert.ok(unclosed.includes('code line'), '미닫힘 펜스도 내용 출력');
});

test('인라인 서식 — **굵게**·`코드`가 strong·code로, 본문·표·목록 공통', () => {
    const d = make(() => '기관', () => ({ wm: false }));
    const h = d.mdToHtml('# 문서\n\n**중요** 사항과 `값` 확인\n\n| 항목 | 내용 |\n|---|---|\n| a | **필수** |\n\n- `opt` 선택');
    assert.ok(h.includes('<strong>중요</strong>'));
    assert.ok(h.includes('<code>값</code>'));
    assert.ok(h.includes('<td><strong>필수</strong></td>'), '표 셀 인라인');
    assert.ok(h.includes('<li><code>opt</code> 선택</li>'), '목록 인라인');
    assert.ok(!h.includes('**중요**'), '마커 누수');
});

test(':::landscape — 미리보기 루트에 doc-landscape 클래스 부여', () => {
    const d = make(() => '기관', () => ({ wm: false }));
    assert.ok(d.mdToHtml(':::landscape\n\n# 문서\n\n본문').includes('doc-md doc-landscape'));
    assert.ok(!d.mdToHtml('# 문서\n\n본문').includes('doc-landscape'), '세로 문서에 클래스 오부여');
});

test('시험별 공급자 격리 — 두 팩토리 인스턴스는 독립 공급자 반영', () => {
    const a = make(() => 'A기관', () => ({ author: '에이', wm: false }));
    const b = make(() => 'B센터', () => ({ author: '비이', wm: false }));
    assert.ok(a.docMdHead('t').includes('A기관'));
    assert.ok(b.docMdHead('t').includes('B센터'));
    assert.ok(!b.docMdSign([['작성자', 'author']]).includes('에이'));
});

test('인라인 확장 — *em*·~~del~~·[링크]·![img] 변환', () => {
    const { mdToHtml } = make(() => '기', () => ({}), () => ({ fig: 'data:image/png;base64,AA==' }));
    const h = mdToHtml('**b** *i* ~~s~~ [t](https://x.kr) `c`');
    assert.ok(h.includes('<strong>b</strong>') && h.includes('<em>i</em>') && h.includes('<del>s</del>'), '서식 태그 누락');
    assert.ok(h.includes('<a href="https://x.kr"'), '링크 누락');
    const h2 = mdToHtml('![도식](fig)');
    assert.ok(h2.includes('doc-img'), '단독 이미지 누락');
    const h3 = mdToHtml('참고 ![x](fig) 끝');
    assert.ok(h3.includes('doc-img-inline'), '행 중간 이미지 누락');
    assert.ok(mdToHtml('[x](javascript:alert(1))').includes('[x]('), '위험 URL 차단 누락');
});
