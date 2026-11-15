# 📄 Word(.docx) 생성 + 워터마크 파이프라인 — 시험 팩 적용 가이드

> **작성일**: 2026-11-14 · **갱신**: 2026-11-15 (워터마크 header1.xml 전환·푸터 QR·`:::approve`/`:::landscape`·서명 인라인화·표 정합 일괄 교정·ref-pipeline md2doc DOCX 경로 추가 · 본문 `{{img:key}}`·코드 펜스·인라인 `**`/`` ` `` 지원·doc-md 공용 팩토리화·PDF 가로 페이지 정합 · md2doc 인자 마커/`{{img:}}` 누수 차단·rowspan·tblHeader/cantSplit·`:::page`/`:::landscape` 의미 보존 · 인라인 확장(`*·~~·[]()·![]()`)·md-tokens 공용 분류 모듈·ref `:::sign`/`:::approve` 표 렌더·ref 페이지 번호 필드·`#anchor`→북마크·오프라인 mermaid(vendor+Chrome))
> **대상**: `docxFile`·`docxFileMd`(`src/content/docx-utils.js`)와 `docWm*`(`src/content/doc-wm.js`)으로 워터마크·서명·결재란을 갖는 공문서형 Word 문서를 만드는 파이프라인 + 문서 추적성(`doc-stamp`·`qr`·`doc-issues`·`opts.doc` — 문서번호·메타데이터·QR·발행 대장) — 다른 시험 팩에서 출력 문서를 만들 때의 적용 절차·계약·함정을 정리
> **관련 SPEC ID**: `CO-13`(생성 문서 공유) · `CO-22`(문서 추적성) · `DA-24`(문서 생성은 MD 초안에서 시작)
> **문서 ID**: DOC-REF-20
> **범위**: platform · 판본: none
> **적용 실례**: carework 보고서 (`src/exams/carework/care-share.js`의 `_docxFile`·`src/exams/carework/doc-md.js`)

---

## 📋 목차

1. [개요 — 구성 파일과 특성](#1-개요--구성-파일과-특성)
2. [공개 API](#2-공개-api)
3. [MD 서브셋 문법](#3-md-서브셋-문법)
4. [문서 레이아웃 상수](#4-문서-레이아웃-상수)
5. [워터마크 메커니즘 — 헤더 스탬프](#5-워터마크-메커니즘--헤더-스탬프)
6. [1장 보고서 원칙 — 밀도 티어](#6-1장-보고서-원칙--밀도-티어)
7. [문서 추적성 — 문서번호·메타데이터·QR·발행 대장](#7-문서-추적성--문서번호메타데이터qr발행-대장)
8. [다른 시험 팩 적용 레시피](#8-다른-시험-팩-적용-레시피)
9. [검증 절차 — Word COM·PDF 스트림·유닛](#9-검증-절차--word-compdf-스트림유닛)
10. [함정·주의사항 (과거 결함 사례)](#10-함정주의사항-과거-결함-사례)
11. [ref-pipeline md2doc DOCX 경로 — MD→HTML 공유 파생](#11-ref-pipeline-md2doc-docx-경로--mdhtml-공유-파생)

---

## 1. 개요 — 구성 파일과 특성

| 파일 | 역할 |
|------|------|
| `src/content/docx-utils.js` | OOXML(.docx) 직접 생성 — ZIP stored 엔트리·CRC32 자체 구현, **외부 라이브러리 의존 0** (PWA 오프라인·번들 크기 요구 대응) |
| `src/content/doc-wm.js` | 워터마크 공용 — 문구 규약(`docWmText`)·미리보기 DOM 오버레이(`docWmHtml`)·docx용 알파 PNG(`docWmPng`) |
| `src/content/doc-stamp.js` | 문서번호 발급 — `PREFIX-YYYYMMDD-HASH6` (내용 해시라 동일 내용=동일 번호, cosmetic FO-70과 동일 철학) |
| `src/content/qr.js` | 의존성 0 QR 인코더 — 매트릭스/PNG/data URL (V1–V7·EC-M·바이트 모드, Node 안전) |
| `src/content/doc-issues.js` | 발행 대장 **공용 팩토리** `createDocIssueStore({key, org})` — 시험 팩은 저장 키·기관명 공급자만 주입 (DA-13 격리는 키 선택으로 유지) |
| `src/exams/carework/doc-issue-store.js` | carework 결합 — 팩토리 + 문서 유형 접두어 맵(`docPrefix`) |
| `src/exams/carework/care-share.js` | carework 적용 실례 — `_docxFile`이 md 초안 + 워터마크 + 서명 이미지 + `doc` 메타를 묶어 `docxFileMd` 호출 |
| `src/content/doc-md.js` | MD 초안 빌더·미리보기 **공용 팩토리** `createDocMd({org, sign})` — `docMdHead`·`docMdSign`·`mdTable`·`csvToMdTable`·`mdToHtml`·`pinDocSignBottom`. 시험 팩은 기관명·서명 설정 공급자만 주입 |
| `src/exams/carework/doc-md.js` | carework 결합 — 팩토리 + `facility.js` 공급자 (`getOrgName`/`getDocSign`). 기존 호출 계약 유지 |
| `tests/unit/content/docx-utils.test.js` | 계약 테스트 29건 — 워터마크 헤더·1장 원칙·서명/결재·표 구조·열 폭 |
| `tmp/gen_sample_docs.js` | 샘플 재생성 스크립트 — `tmp/sample-docs/`에 산출 (검증용). `--wm`=워터마크 PNG 포함, `WM_ORG` 환경변수로 기관명 지정 |
| `tools/check/check_docx_render.ps1` + `docx_render_assert.py` | 시각 회귀 게이트 — Word COM 전수 PDF 내보내기 + PyMuPDF 렌더 계약 검증 (로컬 전용) |
| `ref-pipeline/md2doc.py` | **제2의 docx 경로** — `--docx` CLI·GUI 체크박스. `md_to_html_body` 산출 본문을 python-docx로 걷는 파생 방식 (§11) |

**핵심 특성**

- 출력물은 `.docx` File 객체 — 저장·공유·다운로드에 그대로 사용 (CO-13)
- 문서 초안의 정본은 **Markdown** (DA-24) — docx·xlsx·html 미리보기·PDF가 모두 같은 MD에서 파생
- 브라우저에서 완결 — 네트워크·서버 불필요 (로컬 퍼스트 원칙)

## 2. 공개 API

```js
import { docxFile, docxFileMd, DOCX_SIGN_MAX } from '../content/docx-utils.js';
import { docWmText, docWmPng, docWmHtml } from '../content/doc-wm.js';
import { docStamp } from '../content/doc-stamp.js';
import { qrPng, qrDataUrl, qrMatrix } from '../content/qr.js';
import { createDocIssueStore } from '../content/doc-issues.js';
```

| 함수 | 시그니처 | 용도 |
|------|----------|------|
| `docxFile` | `(text, filename, boldLines = 0, wm = '', opts = {})` | 단순 텍스트 → docx. `boldLines`는 선두 N행 굵게. `opts`는 docxFileMd와 동형(`wmImg`·`doc`) |
| `docxFileMd` | `(md, filename, wm = '', opts = {})` | **주 경로** — MD 초안 → 공문서형 docx (제목·표·서명란·결재란·"끝." 종결) |
| `docWmText` | `(org, date?) => string` | 워터마크 문구 규약 — `"기관명 · YYYY-MM-DD"`, 기관명 없으면 `''`(미출력). `date`는 호출층 단일 날짜 소스(미지정 시 당일) |
| `docWmPng` | `(text) => {data:Uint8Array,w,h} \| null` | 캔버스에 `rgba(0,0,0,.22)`로 구운 알파 PNG(1920×200, 2배 해상도) — **docx·미리보기·PDF와 동일 농도 보장의 유일 수단**. 문구가 `W×0.77`(회전 수평 투영 ≈ 페이지 폭 595pt)을 넘으면 폰트 자동 축소. 비브라우저면 `null` |
| `docWmHtml` | `(text) => string` | 미리보기·인쇄용 DOM 오버레이 — 문서 루트(`position:relative`)에 삽입, `css/doc-export.css` 필요. 문구 추정 폭(`_wmEm`)으로 `font-size`를 인라인 산출 — 장문 기관명도 페이지 폭 내 수렴. **쪽 단위 스탬프**: 986px(1쪽) 간격으로 최대 12개 중첩 생성해 다면 문서 각 쪽 중앙에 배치 — 인쇄는 `fixed` 자동 반복이라 첫 스탬프만 표시 |
| `docStamp` | `(prefix, seed, date?) => string` | 문서번호 — `PREFIX-YYYYMMDD-HASH6`. 시드는 내용(보통 MD 초안), `date`는 발행일 단일 소스(미지정 시 당일) |
| `createDocIssueStore` | `({key, org?, idPrefix?}) => {list, findDocIssue, nextDocRev, recordDocIssue}` | 발행 대장 팩토리 — §7.4 |

`docxFileMd`의 `opts`:

```js
{
  wmImg: { data: Uint8Array },              // docWmPng 결과 — 지정 시 텍스트 워터마크 대신 PNG(권장)
  images: { key: { data: Uint8Array, w: 90, h: 60 } },  // {{img:key}} 토큰 치환용 PNG + 표시 px
  // 본문에 {{img:key}} 토큰이 실제 있는 키만 임베드 — 미참조 키는 생략,
  // 같은 바이트(crc32:길이)는 같은 미디어 파트·rId를 공유 (중복 임베드 방지)
  doc: { no, org, title, rev, date, qr: { data }, recipient, cc }
       // 문서 추적 메타 — §7. 상단 서식란 + core.xml + 푸터 문서번호·QR 표
       // (date→시행일자·서명란 발신일 단일 소스 · recipient→수신·cc→참조 선택)
}
```

## 3. MD 서브셋 문법

`docxFileMd`가 지원하는 마크업(`_mdBody`):

| MD | docx 결과 |
|----|-----------|
| `# 제목` | 중앙·굵게 대제목(명조 20pt·**이중 밑줄** — 공문서 관행) + `Heading1` 스타일 병기(탐색창·PDF 북마크·접근성). **`#` 직후 첫 단락은 자동으로 메타줄**(회색 소자 중앙 + 하단 가는선 — "기관명 · 출력일" 위치·제목-본문 구분) |
| `##` / `###` | 섹션 소제목 — `keepNext`(절 제목이 쪽 끝 고아로 남는 것 차단) + `##`는 하단 가는선(pBdr) |
| `\| a \| b \|` | 표 — 단선 테두리(외곽 1pt `595959`·내부 0.5pt `999999`)·헤더행 음영+반복(tblHeader)·전 행 분할 금지(cantSplit)·고정 레이아웃. 열 폭은 내용 추정(`_colWs` min/pref/잉여 배분 + 헤더 어절 폭 하한)·**3열 이상은 첫 열 연속값 세로병합(vMerge)**·**14행 이하는 keepNext로 한 덩어리**·2열 표 라벨 열 폭은 문서 내 모든 2열 표에 통일(`_kvLabelW`)·날짜·전화 등 원자 토큰 셀은 `noWrap` |
| `- 항목` | `• 항목` 불릿 단락 |
| `---` | 하단선 단락(구분선) — pBdr, `_PBDR_IND`로 표 외곽선과 수평 정합 |
| `:::page` | 강제 페이지 나눔 — **1장 원칙 압축 대상에서 제외됨**(의도된 다면 구성) |
| `:::landscape` | 가로 방향 설정 마커(본문 출력 없음) — docx는 A4 가로+본문폭 `_TW` 9072→14004 전환, 미리보기는 `.doc-landscape` 클래스(가로 폭), PDF는 `pdfFileFromEl` `{landscape}` 옵션으로 A4 가로 페이지 — 세 경로 정합. 넓은 다열 표(명부 등)용 |
| `:::approve 역할\|역할` | 결재란 역할 지정 — 기본 `담당·팀장·시설장`, `:::approve none`이면 결재란 억제. **`:::sign` 있는 문서에서만 효력** (설정 마커 — 본문 출력 없음). 재가기관은 `사회복지사\|센터장` 등 기관 결재선 반영 |
| `:::closing <문구>` | 종결 문구 — 서명란 위 "상기와 같이 …합니다."류 마무리 문구를 중앙 표기 (미리보기 `.doc-closing`과 정합) |
| `※`·`근거` 시작 줄 | 각주성 소자 회색 단락(9pt, `595959`) — 법적 근거·주의 문구. 본문폭 한계로 11pt면 2줄로 깨지는 근거 열거도 9pt 한 줄 수용 (미리보기 `.doc-note`와 정합) |
| `:::sign` … `:::end` | 서명 문서 — **선두에 결재란 부동 표 자동 선 부여**(결 재 세로병합 + 역할별 `(인)` 중앙 칸 — 미결재 문서에 서명을 미리 넣지 않는 빈칸 원칙) + `:::sign`~`:::end` 사이 줄들을 하단 우측 서명란 부동 표로 출력 (`끝.` 뒤 `_closeTbl` 단일 행 `cantSplit` 앵커 — §7.2). 줄은 `라벨: 성명 {{img:key}}` 병기가 계약 — `{{img:key}}`는 우측 탭 뒤 **인라인 이미지**로 치환(성명·라벨은 문서 텍스트로 유지). 이미지 미지정 시 토큰은 `＿＿＿＿＿＿＿＿`(수기 서명 공란)으로 치환되고 끝에 `(인)` 표기 |
| `{{img:key}}` (본문 단독 줄) | 중앙 정렬 **인라인 이미지 단락** (`_imgP` — 서명란과 동일 `wp:inline` 기구). `opts.images`에 키가 없으면 `(이미지)` 텍스트 표기 — 토큰은 절대 리터럴 출력 안 됨. **행 중간 토큰**은 인라인 이미지 미지원 — `(이미지)` 텍스트로 치환 (미리보기는 `<img class="doc-img">`, 복사·텍스트 공유도 `(이미지)`) |
| ` ``` ` … ` ``` ` (코드 펜스) | 등폭 폰트(Courier New 10pt) 단락으로 **원문 줄바꿈·들여쓰기 보존** — 펜스 내 `:::sign`·`\|…\|`·`**` 등 마커는 미해석 (미리보기는 `<pre class="doc-code">`). **Mermaid 등 다이어그램은 소스 텍스트 표기** — 앱 경로는 다이어그램 렌더 미지원, 렌더가 필요하면 ref-pipeline `md2doc.py`(§11) 사용. 미닫힘 펜스는 수집분까지 출력 |
| `**굵게**`·`` `코드` ``·`*기울임*`·`~~취소~~`·`[텍스트](url)` (인라인) | 런 단위 서식 — b/i/strike 런·Courier New·링크는 밑줄+링크색 텍스트 (실 하이퍼링크 rId는 미지원 — 문서 인쇄용). 미리보기는 strong/code/em/del/a — 인식 집합 정본 `src/content/md-tokens.js` (`RE_INL_*` — 두 이미터 공유). 미닫힘 마커·위험 URL(`javascript:`)은 리터럴 유지 |
| `![alt](key)` · `![alt](url)` | 단독 줄 — `{{img:key}}`와 동일 인라인 이미지 단락/`<img>` 블록 (images 맵 키 또는 data:/http(s): URL). 행 중간은 `(이미지)` 표기 |
| 일반 단락 | 본문 단락 (맑은고딕 11pt·행간 336) |

자동 부가: 서명 문서의 결재란, 문서 말미의 `끝.` 종결 표기, 바닥글 `— 쪽 / 전체 —` 중앙 쪽 번호(`PAGE`/`NUMPAGES` 단순 필드 — 조건부 `IF` 중첩은 LibreOffice·한컴·모바일 미리보기가 계산하지 못해 폐기).

## 4. 문서 레이아웃 상수

| 항목 | 값 |
|------|-----|
| 용지 | A4 세로 `w:pgSz 11906×16838` / `:::landscape` 시 가로 `16838×11906` (`orient` 명시 — 생략 시 가로로 해석하는 임포터 있음). 본문폭 `_TW` = 9072(세로)·14004(가로) — 표 폭·열 배분·부동 표 위치가 전부 `_TW` 기준이라 가로 전환은 `_sect` 플래그만으로 성립. 앱 PDF도 `pdfFileFromEl`의 `{landscape:true}`로 A4 가로 지원 — 호출층(care-share `_pdfFile`)이 `:::landscape` 감지해 래퍼 폭 700→990px 확장과 함께 전달 |
| 여백 | 상하 1134tw(≈20mm)·좌우 1417tw(≈25mm) |
| 서체 | Malgun Gothic 11pt (`w:sz=22`)·행간 `w:line=336`(1.4배)·단락 후간격 40tw·`autoSpaceDE/DN=0`(한글↔라틴·숫자 자동 간격 끔 — 숫자 밀집 본문 어절 벌어짐 방지). `styles.xml`에 docDefaults + `w:lang eastAsia="ko-KR"` + Heading1~3 스타일(outlineLvl — 탐색창·PDF 북마크용) |
| 표 | 행 최소 440tw·셀 여백 상하 120/좌우 140tw·단선 테두리 외곽 sz8(1pt) `595959`·내부 sz4(0.5pt) `999999` — 이중선·진한 외곽은 흑백 인쇄 시 탁하고 토너 낭비. 내부선은 `D9D9D9`까지 연하면 인쇄·PDF 래스터에서 소멸 |
| 부동 표 | 결재란 상단 우측(`tblpYSpec="top"`, `_AW`960×(1+역할 수), `tblpX=_TW−w+102`) · **종결 표 하단 우측**(`tblpYSpec="bottom"` — 서명 셀 `4500`(`_SIG_W`4200+`_SIG_SLK`300) 단일 행 `cantSplit`, `끝.` 뒤 앵커 — 내부 서명 표는 4200+`tblInd` 60으로 셀보다 좁고 들여쓰기됨: 이중 외곽선 양쪽이 셀 경계 안에 들어오게 하려는 여유, 중첩 표를 셀 경계에서 잘라내는 렌더러 대비) — `tblpPr` 부동 앵커, 본문 흐름 높이를 차지하지 않되 텍스트가 감기는 시각적 점유 영역 존재 |
| 설정 | `w:view=print`·`zoom=100`·`defaultTabStop=708` — 생략 시 뷰어가 웹 레이아웃으로 열 수 있어 필수. `docGrid`는 없음(글자 격자로 오해석해 어절·자간을 늘리는 임포터 존재) |
| 표 음영 팔레트 | 헤더 `D9E6F7`(연청) · 교번 줄무늬 `F2F6FB`(아주 옅은 파랑) · 2열 라벨 열 `EFEFEF`(연회색) — 흑백 인쇄 토너 절감형 연색 계열. 결재란 머리 `D9E6F7`·결재 `(인)` 칸 `F2F2F2`·서명란 날짜행/교번행 `F2F6FB`. 병합 연속 셀(`vMerge cont`)은 시작 행 음영을 물려받는다(`_cellShd` — 응용 불일치 파란 띠 방지). `care-tools.css` 미리보기도 동일 패턴 |
| 서명 이미지 | `{{img:key}}` 토큰 → 서명란 셀 내 **우측 탭 정지 뒤 인라인 삽입** (`wp:inline`) — 고정 좌표 `wp:anchor` 오버레이는 글자를 덮는 결함으로 폐기. `(인)`은 이미지 없을 때만 탭 뒤 표기. 표시 상한 `DOCX_SIGN_MAX`(export) — author **74×38**·approve **52×40**pt (approve는 결재란 빈칸 원칙상 현재 미소비 — `{{img:approve}}` 토큰을 직접 넣은 경우만 임베드). `facility.js docSignImages`·샘플 생성기·호출자가 같은 상한을 공유 (렌더 PNG는 2x로 인쇄 선명도 확보, 표시 pt만 전달) |
| 종결 표 우측 정합 | `_closeTbl`의 `tblpX` 보정은 **−10** — `tblpX`는 그리드 총폭이 아니라 내용 우측 끝(`_SIG_IND`+`_SIG_W`) 기준이고 중첩 표의 실 착지는 `tblpX+vis+~20tw`라, −10 보정으로 서명란 우측선이 본문 표 외곽선(≈525.0pt)과 일치한다. +88이던 구값은 우측 여백선(524.45)을 ~4.5pt 침범했다(인수인계서 PDF 벡터 실측). 결재란(+102)과 다른 이유는 중첩 표 구조(외곽 셀 여백+`tblInd`)로 기준점이 다르기 때문 |
| 단락 가로선 | pBdr는 텍스트 영역보다 양끝 ~1.5pt 넓게 그려져 표 외곽선과 어긋남 — `_PBDR_IND`(좌우 `w:ind` 20tw)로 선 끝을 표 경계(≈70.3/525.0pt)와 일치. 메타줄·`##` 밑줄·`---` 3곳 적용 (`w:space`는 수평 범위와 무관함을 실측 확인) |

## 5. 워터마크 메커니즘 — 헤더 스탬프

### 5.1 확정된 설계 (2026-11-15 재설계 — 본문 스프레이 폐기)

1. **`header1.xml` 앵커 1개 = 전 쪽 반복** — 헤더 도형은 렌더러가 호스트 단락과 무관하게 **모든 쪽에 자동 반복 출력**한다. 구버전의 본문 분산 앵커(`_sprayWm` — 추정 쪽 경계마다 삽입)는 쪽 경계 추정 자체가 필요 없어져 폐기했다. 쪽당 스탬프 정확히 1개는 **구조적으로 보장**된다(앵커가 1개뿐이라 중첩·누락 불가).
2. **헤더 도형은 본문 아래층** — 렌더러가 `behindDoc`와 무관하게 항상 본문보다 먼저 그린다(PDF 스트림 최선두 실측). 이는 결함이 아니라 **표준 워터마크(본문 위에 문자, 도형은 뒤) 외형 그대로**다 — 알파 PNG라 텍스트가 스탬프를 덮어도 농도 변화 없음. "본문 위 덮기"가 정말 필요하면 본문 앵커 + `behindDoc="0"`뿐이다(구버전 설계 — 필요가 없어 폐기).
   - **수반 제약 — 셀 음영이 스탬프를 가린다**: OOXML 셀 음영(`w:shd`)은 투명도가 없는 불투명 채움이라, 아래층 스탬프는 표·결재란·서명란의 음영 셀 아래에서 **완전히 가려진다** — 표가 큰 문서에서 대각선 띠가 끊겨 "일부만 표시"로 보인다(2026-11-15 면회방문기록·수급자명부 실측). 이는 **Word 기본 워터마크와 동일한 동작**이며, 본문 위 덮기로만 회피 가능한 구조적 한계다 — 스프레이 폐기로 채택한 트레이드오프. 가려짐을 피하는 방법이 없으므로 "표 아래 묻힘"은 재보고 대상이 아니다 (§10 함정 표 참조). 단, 앱의 PDF 경로(`pdfFileFromEl`)는 래스터 위 스탬프라 항상 완전 표시 — docx 구조 한계에만 해당하는 현상이다.
3. **용지 기준 중앙** — `positionH/V` 모두 `relativeFrom="page"` + `<wp:align>center</wp:align>` + `layoutInCell="0"`. Word가 실제 용지 크기로 중앙을 계산하므로 **세로·가로(`:::landscape`) 방향을 자동 인지** — 고정 `posOffset`은 방향별 재계산이 필요해 쓰지 않는다.
4. **PNG 알파 권장** — `w14:alpha`·`behindDoc`를 무시하는 뷰어가 있다. 텍스트 상자(`_wmPara`)는 진하면 본문을 가리고 연하면 안 보이는 양립 불가 + **Word 내보내기에서 조용히 소실**되는 실측 사례가 있어, `docWmPng`의 알파 구운 PNG가 유일하게 렌더러 무관 동일 농도(`rgba(0,0,0,.22)`)를 보장한다. 텍스트 경로는 캔버스 불가 환경 폴백 — 사용 시 `console.warn`으로 진단 로그를 남긴다(폴백 상자는 `behindDoc="1"` + 글자 폭 추정 폰트 크기 `_wmFont`, 24~64pt).
5. **알파는 3경로 통일 `.22`** — docx PNG·미리보기(`doc-export.css`)·PDF 스탬프(`pdf-utils.js`)가 같은 농도여야 경로 간 출력이 어긋나지 않는다. `.12`는 순백지 위에서 인지 불가 수준(255×0.88≈224 — 실측 "표 안에서만 보임" 민원)이라 `.22`로 상향했다.

### 5.2 스탬프 기하 — 페이지 중심 대각선, 내부 요소와 무관

워터마크는 **용지 크기만** 보고 중심점에 대각선으로 그린다 — 본문 요소(표·단락)와의 상관관계는 고려 대상이 아니다.

- **앵커**: `relativeFrom="page"` + `align=center` (H/V 모두) + `wrapNone` + `layoutInCell="0"`
- **상자(extent)**: `12192000×1270000` EMU = **960×100pt**, `rot="-2700000"`(-45°) — 회전 후 대각선 띠가 페이지를 코너투코너로 관통(bbox ≈ 785pt 각, 용지 밖으로 삐져나가는 부분은 클립)
- **PNG**: 1920×200 캔버스 = 상자의 2배 해상도, 굵은 이탤릭 맑은고딕, `rgba(0,0,0,.22)`
- **동적 축소**: 문구 폭 > `W×0.77`이면 폰트를 4px씩 낮춤(하한 20px) — 회전 수평 투영 `(잉크폭+띠높이)/√2 ≤ 595pt`(페이지 폭) 조건. 긴 기관명(60자 극단 포함)도 페이지 폭 내 수렴 — px≈18까지 하강 실측
- **PDF 스탬프**(`pdf-utils.js`)·**미리보기**(`docWmHtml`)도 동일 원칙 — 각각 `width×1.35`·`60/(em+2)` 상한으로 자동 축소

### 5.3 배치 기계 (`_wmHdr` + `_hdrParts`)

```js
const hdr = _wmHdr(wm, opts.wmImg);   // { xml: header1.xml, img } | null
// _sect(hasHdr) → <w:headerReference r:id="rId4"/> — 워터마크 없으면 헤더 파트 자체 미생성
// _docrels → rId4 = header1.xml · _hdrParts → header1.xml + header1.xml.rels + media/img_wm.png
```

- **파트 3종 세트** — `word/header1.xml`(앵커 단락) + `word/_rels/header1.xml.rels`(rId1→`media/img_wm.png`) + 미디어. `r:embed`는 **소속 파트의 관계** 기준이라 헤더 안 그림을 본문 rels에 넣으면 참조 실패한다.
- **`_wmPicPara`** — `pic:pic` 앵커 (`behindDoc="0"`로 보내지만 헤더층이라 실질 본문 아래 렌더 — §5.1-2 참조)
- **`_wmPara`** — `wps:wsp` 텍스트 상자 폴백 (`behindDoc="1"` + `C0C0C0` + `w14:alpha` — 무시 뷰어 대비 이중 지정)
- **docPr id** — `_dpNext()` 순번 할당기 (문서 생성마다 `_dpId=100` 리셋). 하드코딩 상수는 이미지가 늘면 중복돼 Word가 '읽을 수 없는 내용' 경고를 낸다 — 헤더 wm·푸터 QR·본문 이미지 전부 같은 할당기에서 발급.
- **1장 판정·쪽 경계 추정(`_estFlow`·`_DENS`)은 워터마크와 무관하게 유지** — 밀도 티어 선택(§6)에만 쓰인다.

## 6. 1장 보고서 원칙 — 밀도 티어

`docxFileMd`는 본문 추정 높이가 한 장을 넘기면 밀도를 단계적으로 올려 한 장 수용을 시도한다. `:::page` 명시 쪽 나눔 문서는 제외.

| 티어 | 행간 | 단락 후간격 | 행 최소 | 셀 여백(상하/좌우) | 스페이서 |
|------|------|------------|---------|------------------|----------|
| normal | 336 | 40tw | 440tw | 120/140 | 150tw |
| compact | 300 | 20tw | 420tw | 90/120 | 120tw |
| tight | 240 | 20tw | 360tw | 60/90 | 100tw |

**판정**: `estFlow(normal) + flt > _PAGE_PT(700)`이면 → `estFlow(compact)+flt ≤700`이면 콤팩트 → 아니면 `estFlow(tight)+flt ≤700`이면 타이트 → 그래도 넘치면 **표준 유지**(어차피 2장이면 가독성 우선).

**추정 모델(`_DENS`)은 실측 교정됨** — 맑은고딕 11pt 기준 단락 ≈25/23/19pt·표 행 ≈47/43/31pt(셀 여백+최장 셀 줄 수, 행 줄높이는 `rl` 별도). 평면 상수 시절은 실제의 ~0.55배라 판정이 발동조차 못 했다.

- **`_FLT_PT=200` 예약** — 결재·서명 부동 표는 흐름 높이를 안 쓰지만 텍스트가 감겨 쪽 가용 높이를 잠식 → 본문에 `tblpPr`가 있으면 판정에 예약치 합산
- **꼬리 부동 표 이탈 방지(빈 쪽 규칙)** — 3티어가 모두 한 장 수용에 실패해도(`estFlow+_flt>700`), 부동 표가 있으면 마지막 쪽 잔여 공간을 별도 판정한다(`_densifyTail`). Word는 부동 표 전체 높이를 앵커 쪽의 빈 공간으로 요구하므로, `tailFree = _PAGE_PT − (est % _PAGE_PT)`가 `_flt + _TAIL_SLK(100)`(추정 ~10% 낙관 편향 슬랙)보다 작으면 `끝.`+종결 표가 통째로 새 쪽으로 밀려 `끝.`만의 빈 꼬리 쪽이 생긴다(본인부담금계산 3쪽→2쪽 사례). 잔여가 확보되는 더 촘촘한 티어로 교체, 둘 다 부족하면 표준 유지
- **스페이서 단락**(`lineRule="exact"`)은 고정 ~8pt로 추정 — 글자 기반 추정은 과대
- **표 행은 최장 셀의 줄 수**로 추정(`_estRow` — 셀별 `<w:br/>` 최대 + 셀 여백, 평행 셀 높이 합산 금지)
- 글자 크기는 모든 티어에서 11pt 유지 — 가독성 본질은 건드리지 않음
- **`_wrap`이 어절 분리 불가 토큰(CJK 무공백 장문)을 글자 폭 기준으로 강제 분할**하므로 Word가 실제로 수십 줄로 끊는 토큰도 추정과 일치한다 — 단, 16자 이하 원자 토큰(날짜·전화·짧은 성명)은 중간 분할하지 않고 통째로 유지(셀 `noWrap`과 세트)

## 7. 문서 추적성 — 문서번호·메타데이터·QR·발행 대장

발행 문서에 고유 번호를 부여하고 파일 안에까지 새겨 넣는 층위. `opts.doc`만 넘기면 docx 파이프라인이 알아서 처리한다.

### 7.1 문서번호 (`doc-stamp.js`)

```js
const no = docStamp('LOG', md, '2026-11-14');   // "LOG-20261114-251e3f" — (prefix, seed, date)
```

- 형식 `PREFIX-YYYYMMDD-HASH6` — 해시는 fnv1a(내용 시드 JSON 직렬화)라 **동일 내용 재출력=동일 번호**(중복 발행 자동 탐지), 내용 변경=다른 번호(변조 대조)
- `date` 생략 시 당일 — 호출층(`ctx.date`)을 시행일자·워터마크·서명일과 같은 소스로 넘기는 것이 정합
- carework 유형 접두어는 `doc-issue-store.js`의 `docPrefix(title)`가 매핑 — LOG(요양일지)·HND(인수인계서)·INC(사고보고서)·VST(면회방문)·CHK(평가·체크)·RST(근무표)·CLT(명부·수급자)·CST(비용계산)·FRM(양식·서식)·DOC(폴백)
- 시드에는 **발급될 번호를 넣지 않는 것** — 자기 참조 순환 방지(번호 표기는 전부 렌더 시점 부여라 해시에 안 들어감)

### 7.2 `opts.doc` 계약 — `docxFileMd(md, filename, wm, { doc })`

```js
doc: { no: 'LOG-20261114-251e3f', org: '행복요양원', title: '요양일지', rev: 1,
       date: '2026-11-14',                        // 시행일자·서명란 발신일 단일 소스 (미지정 시 당일)
       qr: { data: qrPng(payload).data },
       recipient: '시설장', cc: '근무조' }   // 수신·참조는 선택 — 지정 시 서식란 행 추가
```

`doc` 지정 시 파이프라인이 자동 부여하는 것:

| 산출 | 위치 |
|------|------|
| 상단 서식란 | 제목 위 좌측 소형 표기 — `문서번호`·`시행일자`(`doc.date`→'YYYY년 M월 D일') + `doc.recipient`→수신·`doc.cc`→참조 (공문서 표준 서식; 라벨 굵게+1200tw 탭 정지 값 정렬). `no`/`recipient`/`cc` 중 하나라도 있으면 부여 — `date`는 서명란 발신일에도 같은 소스로 사용 |
| `docProps/core.xml` | `dc:title`(문서 제목)·`dc:identifier`(문서번호)·`dc:creator`/`cp:lastModifiedBy`(기관)·`cp:revision`(판본)·`dcterms:created/modified` — **파일명을 바꿔도 번호가 파일 안에 남음**. `rev`는 발행 대장 `nextDocRev` 선기입용 |
| 푸터 문서번호·쪽 번호 | 중앙 `— 쪽 / 전체 —` + 그 아래 소자 `문서번호 …` — 모든 쪽에 표기 (QR 지정 시 문서번호 행은 QR 옆 셀로 이동) |
| 푸터 QR 표 | `doc.qr.data` 있으면 좌측 0.55" QR + 옆에 `진위 확인 — 발행 대장 대조` 캡션·문서번호(좌측 정렬 — 우측 하단 서명 부동 표와 겹치지 않음) + 중앙 쪽 번호를 푸터 **일반 표**로 부여. 자체 파트(`footer1.xml.rels` + `media/img_qr.png`)라 본문 이미지 풀과 분리. **전 쪽 반복**이라 다중 페이지 인쇄물 어느 쪽에서든 발행 대장 대조 가능 — 본문 종결 부동 표 안 `wp:inline` 이미지는 인쇄→PDF·일부 변환 경로에서 탈락해(Word 화면엔 보이고 PDF엔 없는 증상) 푸터로 이동한 것이다 (§10) |

### 7.3 QR (`qr.js`) — 의존성 0

```js
qrPng('PASSOK LOG-20261114-251e3f #a3f2c1d4e5b6')  // { data: Uint8Array, size } — 1비트 PNG, 결정적 바이트
qrDataUrl('...')                                    // data:image/png;base64 — HTML 미리보기·PDF 경로용
qrMatrix('...')                                     // boolean[][] — 필요 시 직접 렌더
```

- V1–V7·EC-M·바이트 모드 — UTF-8 한글도 수용
- PNG는 캔버스 없이 순수 JS 인코딩이라 **Node·jsdom·브라우저 어디서든 동일 바이트** — 샘플 생성·테스트에서 그대로 사용 가능
- **carework 페이로드 계약** — `PASSOK <문서번호> #<본문 해시12>` (care-share `_qrPayload`). 스캔 결과를 인쇄 문서번호·발행 대장의 `hash`와 대조해 진위 확인 (샘플 생성기는 번호만 인코딩)
- 검증은 인코더 자체 경로가 아닌 **독립 디코더**(tests/unit/content/qr.test.js — 데이터 추출·RS 신드롬을 별개 알고리즘으로 재구현)로 라운드트립

### 7.4 발행 대장 (`doc-issues.js` 공용 + `doc-issue-store.js` carework 결합)

```js
const issues = createDocIssueStore({ key: STORAGE_KEYS.CARE_DOC_ISSUES, org: getOrgName });
issues.recordDocIssue({ docNo, tool, kind, filenames, hash });   // kind: docx|pdf|xlsx|share|print
```

- 키는 시험별 `STORAGE_KEYS` — carework는 `carework_doc_issues` (백업·초기화 레지스트리 포함)
- 같은 docNo 재발행이면 행을 새로 안 만들고 **rev+1·파일명(최대 30)·출력형식(`kinds`) 병합**, 새 해시가 없으면 기존 해시 보존 — docNo가 내용 해시라 "몇 번째 발행인가"를 파일의 `cp:revision`과 대조 가능
- `nextDocRev(docNo)` — 발행 전 판본 번호 조회 (core.xml `rev` 선기입용), `list`·`findDocIssue` — 이력·검증 조회 (care-forms 발행 이력 UI가 사용)
- **실패한 발행은 기록하지 않는다** — 호출부(care-share `_issue`)에서 산출 성공 후 호출
- 로컬 퍼스트 — Supabase 없이 동작, 추후 동기화 대상 지정 시 기관 공용 대장으로 확장

### 7.5 적용 시 주의

- **파일명에도 번호** — `제목_DOCNO.ext` (care-share의 `ctx.fname` 실례). 파일명만으로도 추적 가능하게
- 번호는 **콘텐츠 확정 후** 발급 — QR PNG가 초안에 들어가면 QR 이미지가 다시 해시에 섞여 순환. `md`(해시 시드) → `docStamp` → `qrPng` → `docxFileMd` 순이어야 함
- `doc` 미지정이면 core.xml·푸터 번호·QR 전부 생략 — 기존 동작과 완전 동일(하위 호환)
- `date`는 하나로 통일 — 시행일자·서명란 발신일·워터마크 문구(`docWmText`의 `date`)·문서번호 날짜가 같은 소스를 써야 문서 한 장 안에 다른 날짜가 찍히지 않는다

## 8. 다른 시험 팩 적용 레시피

```js
import { docxFileMd } from '../../content/docx-utils.js';
import { docWmText, docWmPng, docWmHtml } from '../../content/doc-wm.js';
import { docStamp } from '../../content/doc-stamp.js';
import { qrPng } from '../../content/qr.js';

// ① MD 초안 — DA-24: 문서 구조의 정본. docx·xlsx·미리보기·PDF가 같은 초안에서 파생
const md = `# 재고 현황 보고서

${orgName} · ${date} 출력

| 품목 | 수량 | 비고 |
| 물품A | 12 | 정상 |

:::approve 담당|팀장|시설장

:::sign
작성자: ${name} {{img:author}}
:::end`;

// ② 추적 메타 — 내용 확정 후 번호 발급 → QR → 생성 순 (순환 방지)
const no = docStamp('INV', md, date);                    // (prefix, seed, date)
const qr = qrPng(`PASSOK ${no} #${fnv1aHex(JSON.stringify(md)).slice(0, 12)}`);
const doc = { no, org: orgName, title: '재고 현황 보고서', rev: nextDocRev(no), date,
              ...(qr ? { qr } : {}) };

// ③ 워터마크 — 문구 규약은 docWmText로 통일 (모든 출력 경로 동일 문구·동일 날짜)
const wm = docWmText(orgName, date);                // "기관명 · 2026-11-14" — ''이면 미출력
const wmImg = wm ? docWmPng(wm) : null;             // 알파 PNG (Node·비브라우저면 null → 텍스트 폴백)

// ④ 생성 — opts는 필요한 것만
const file = docxFileMd(md, `재고현황_${no}`, wm, {
  ...(wmImg ? { wmImg } : {}),
  images: { author: { data: sigPngBytes, w: 90, h: 60 } },  // 서명 이미지 있을 때만
  doc,
});

// ⑤ 미리보기 — 같은 MD를 mdToHtml로 렌더한 루트(position:relative)에
//    docWmHtml(wm) 삽입 + css/doc-export.css 임포트
```

**적용 시 체크리스트**

- [ ] 문서 초안은 MD로 작성 — `*DocMd` 빌더 함수로 만들고 `care-share.js`의 `mdgen` 슬롯 패턴 참조 (DA-24)
- [ ] 서명·결재가 필요한 문서만 `:::sign` 사용 — 선두 결재란이 자동 부여됨. 기관 결재선이 다르면 `:::approve 역할|역할`, 결재란이 필요 없는 서명 문서는 `:::approve none`
- [ ] 결재란 `(인)` 칸에는 서명 이미지를 넣지 않는다 — **미결재 문서에 날인을 미리 찍으면 위·변조 오해**. 서명 이미지는 서명란 `{{img:key}}` 토큰으로만
- [ ] 가로가 필요한 넓은 표(명부 등)는 `:::landscape` — 본문폭이 14004로 전환됨
- [ ] 워터마크 문구는 `docWmText(기관명, 출력일)` — 경로별 임의 문구·날짜 금지
- [ ] 워터마크는 `wmImg`(PNG) 우선 전달, `wm` 텍스트는 폴백으로 병행 전달
- [ ] 서명 이미지는 `opts.images`로 — 서명란 셀 내 **인라인 삽입**이라 배경이 불투명하면 그대로 출력됨. **서명-only 투명 PNG** 권장. 표시 상한은 `DOCX_SIGN_MAX`(author 74×38) 공유
- [ ] 서명란 줄은 `라벨: 성명 {{img:key}}` 병기 — `{{img:key}}` 단독이면 성명이 누락됨 (토큰은 날인 위치 표식일 뿐 성명을 대체하지 않음. 이미지 없으면 `＿＿＿＿＿＿＿＿` 수기 공란으로 치환)
- [ ] `:::page`는 의도된 다면 구성에만 — 쓰면 밀도 압축이 비활성화됨

## 9. 검증 절차 — Word COM·PDF 스트림·유닛

**XML well-formedness만으로는 부족** — 과거 두 차례 스키마 결함(§10)이 파서를 통과하고도 Word에서 열리지 않았다. 기준은 실제 개방:

```powershell
# Word COM — 개방 성공 여부 + 실제 페이지 수 + 도형 착지
$w = New-Object -ComObject Word.Application; $w.Visible = $false
$d = $w.Documents.Open($path, $false, $true)
$d.ComputeStatistics(2)                    # 페이지 수
$d.SaveAs([ref]$pdf, [ref]17)              # wdFormatPDF — 오버레이 순서 검증용
$d.Close($false); $w.Quit()
```

```python
# PDF 스트림 — 헤더 워터마크 이미지(Do 연산자)는 본문보다 먼저 그려진다
# 각 쪽 콘텐츠 스트림에서 ' Do' 위치 ≈0% → 헤더층(정상 — 표준 워터마크는 본문 아래)
# ※ 구버전 본문 앵커 설계의 ≈99~100% 기대와 반대 — 헤더 전환으로 위치가 뒤집혔다
import re, zlib
for s in re.findall(rb'stream\r?\n(.*?)endstream', data, re.S):
    s2 = zlib.decompress(s)
    pos = [m.start()/len(s2) for m in re.finditer(rb' Do', s2)]
```

```python
# PyMuPDF — 쪽별 워터마크 이미지 개수 = 정확히 1·bbox 전 쪽 동일·본문 영역 4방향 초과
# (헤더 반복이라 이제 구조적으로 보장되지만, 상자 기하·방향 인지 회귀는 여전히 감지)
import pymupdf
for i, p in enumerate(pymupdf.open(f)):
    wms = [im for im in p.get_image_info() if im['width'] == 1920]  # wmPNG 폭
    assert len(wms) == 1, f'p{i+1}: wm {len(wms)}개'
    bb = wms[0]['bbox']  # x0<좌여백·y0<상여백·x1>우본문끝·y1>하본문끝 확인
```

- 유닛 회귀: `node --test tests/unit/content/docx-utils.test.js tests/unit/content/doc-wm.test.js tests/unit/content/qr.test.js` → `npm.cmd test`
- 샘플 재생성: `node tmp/gen_sample_docs.js --wm` → `tmp/sample-docs/` (carework 참조. `WM_ORG=기관명`으로 문구 지정)
- **시각 회귀 게이트**: `powershell -File tools/check/check_docx_render.ps1` — Word COM 전수 PDF 내보내기(`ps1`) + PyMuPDF 계약 검증(`docx_render_assert.py`: 쪽당 wm 1개·bbox 전 쪽 동일·bbox 본문 4방향 초과·꼬리 빈 쪽 없음)을 한 명령으로 수행 (Word COM 의존 — 로컬 게이트)
- **다면 문서는 각 쪽 워터마크 확인** — 위 PyMuPDF 카운트로 쪽당 정확히 1개인지 대조

## 10. 함정·주의사항 (과거 결함 사례)

| 함정 | 증상·교훈 |
|------|-----------|
| `xmlns:a` 네임스페이스 오기 | `word/2010/wordprocessingDrawing`(wp URI)로 쓰면 `a:` 요소 전부 무명 네임스페이스 → **스키마 위반으로 Word 개방 거부**. 정본: `http://schemas.openxmlformats.org/drawingml/2006/main` |
| 템플릿 보간 누락 | 작은따옴표 문자열 안 `${_NOSPACE}`가 리터럴 텍스트로 `<w:pPr>` 안에 박힘 → 스키마 위반. XML 조각은 항상 백틱 리터럴 |
| 파서 검증의 한계 | 위 두 결함 모두 XML well-formed·패키지 정합성은 통과 — **Word COM 개방만이 스키마 검증**. docx 구조 변경 시 COM 개방을 기준으로 삼을 것 |
| 헤더 도형은 본문 아래층 | `behindDoc` 무관하게 항상 본문보다 먼저 렌더 — 현 설계는 이를 **표준 워터마크(본문 위 문자·도형 뒤)**로 활용. "본문 위 덮기"가 필요하면 본문 앵커+`behindDoc="0"`뿐 (§5.1) |
| 헤더 이미지 관계 소속 | 헤더 안 `r:embed`는 `header1.xml.rels` 기준 — 본문 `document.xml.rels`에 넣으면 참조 실패. 푸터 QR도 `footer1.xml.rels`로 분리 (§5.3·§7.2) |
| `relativeFrom="margin"` + `layoutInCell="1"` | 표 안/사이 단락의 앵커가 **셀 기준**으로 해석돼 표 중심 위치에 표시 → `page`+`0` 필수 |
| docPr id 중복 | 같은 `wp:docPr id`가 두 개면 Word가 파일 손상으로 거부 — `_dpNext()` 순번 할당기(문서마다 100 리셋)로 통일. 하드코딩 구간(구 100/300/400…)은 이미지 증가 시 중복 |
| 푸터 `IF NUMPAGES` 중첩 | LibreOffice·한컴·모바일 미리보기는 IF 필드를 계산 못 해 `11`로 깨져 표시 → `PAGE`/`NUMPAGES` 단순 필드 `— 쪽 / 전체 —`로 폐기 |
| 부동 표 안 `wp:inline` 이미지 | `tblpYSpec=bottom` 부동 표 안 인라인 이미지는 인쇄→PDF·일부 변환 경로에서 탈락(화면엔 보이고 PDF엔 없음) → QR은 푸터 **일반 표**로 이동. 푸터는 렌더러 무관 동일 출력+전 쪽 반복 |
| 추정 상수 신뢰 금지 | `_DENS`는 맑은고딕 11pt·행간336 실측 교정치 — **폰트·크기·행간 변경 시 재측정 필요** (Word COM `Information(6)` vtb 위치로 요소별 실측 가능) |
| 부동 표 점유 | `tblpPr` 표는 흐름 높이를 안 쓰지만 시각적으로 쪽 높이를 잠식 — 1장 판정에 `_FLT_PT` 예약 필수 |
| 부동 표 분할 | `tblpYSpec=bottom` 부동 표가 앵커 아래 남은 공간보다 크면 **행 단위로 쪼개져** 다음 쪽 상단에 잔여 행이 렌더됨 — 종결 블록은 반드시 **단일 행 `cantSplit` 한 표**로 묶고 앵커를 본문 말미(`끝.` 뒤)에 둘 것 |
| 중첩 표 셀 경계 | 셀 폭과 같은 내부 표는 이중 외곽선(~38tw)이 셀 경계를 넘어 그려지고, 경계에서 자르는 렌더러에서 **서명란 우측선이 깎여 보임** → 서명 셀은 내부 표보다 `_SIG_SLK`(300) 넓게 + 내부 표 `tblInd`(60)로 양쪽 외곽선을 셀 안에 수용 |
| 서명 고정 좌표 앵커 | (인) 위 `wp:anchor` 오버레이는 글자를 덮는 결함 — 폐기하고 셀 내 **우측 탭 정지 + 인라인 이미지**로 전환 (§4). 탭 정지는 `라벨+(인)` 우측 정렬에도 사용 — 공백 누적은 셀 폭 초과 시 줄넘김·위치 불안정 |
| `{{img:key}}` 성명 유지 | 서명란 줄은 **`성명 {{img:key}}` 병기**가 계약 — 토큰은 날인 위치 표식일 뿐 성명 자리를 대체하면 성명이 누락된다(`인계자(서명): (인)` 결함 사례). `docMdSign`·생성기 `sign()` 모두 `라벨: 성명 {{img:author}}` 형태로 방출 |
| 원자 토큰 중간 분할 | 날짜·전화·짧은 성명(공백 없음·16자 이하)을 폭 추정으로 끊으면 `1943-05-/12` 식 파편 — `_splitLong`은 원자 토큰을 통째로 유지하고 단일 셀은 `tcPr noWrap`으로 자동 줄넘김 자체를 차단 |
| 마지막 줄 어절 고아 | 본문 마지막 줄에 1어절만 남으면("있습니다." 단독행) 보기 나쁨 — `_orphanFix`가 앞 줄 끝 어절을 내려 2어절 이상 보장 |
| 2열 표 라벨 열 계단 | 표마다 내용 기반 폭을 계산하면 상하 인접 표의 라벨 열 경계가 계단처럼 어긋남 — `_kvLabelW`가 문서 내 모든 2열 표의 최장 라벨 한 줄 폭을 산출해 공유(하한 1600·상한 본문폭 40%) |
| 단락 가로선 오버행 | pBdr는 텍스트 영역보다 양끝 ~1.5pt 넓게 그려져 표 외곽선과 어긋남 — `_PBDR_IND` 좌우 1pt 들여쓰기로 정합 (`w:space`는 수평 범위와 무관) |
| 표 내부선 연색 | `D9D9D9`(85%) 0.5pt는 인쇄·PDF 래스터에서 소멸 — 내부선은 `999999`(60%) 유지 |
| vMerge 음영 불일치 | 병합 연속 셀이 자기 행 규칙(교번)으로 음영을 정하면 띠가 끊겨 보임 — `cont` 셀은 시작 행 음영 상속(`_cellShd`) |
| 워터마크 잉크 길이 | 캔버스(상자)가 길어도 **텍스트 자체가 짧으면 잉크 띠가 표 중간에서 끊겨** "표 안에서만 보임"으로 보임 — 문구를 상자 폭의 77%까지 키워 띠를 코너투코너로 연장 + 알파 `.22`로 순백지 시인성 확보 |
| 워터마크 농도 `.12` | 순백지 위 88% 흰색이라 실사용자에게 **사실상 비가시** — 표 음영 위에서만 구분되어 "테이블 내에서만 표시"로 보고됨. 경로 통일 농도는 `.22` |
| 셀 음영이 워터마크를 가림 | 헤더 스탬프는 본문 아래층이고 OOXML 셀 음영은 불투명 — 표가 큰 문서에서 대각선 띠가 끊겨 "일부만 표시"로 보임(면회방문기록·수급자명부 실측). **Word 기본 워터마크와 동일한 동작**으로 의도된 트레이드오프(§5.1-2) — 본문 위 덮기는 스프레이 추정 기계+내용 덮기(서명·QR·가독성)가 필요해 채택하지 않음. `w:shd`에 투명도는 없고 헤더층을 표 위로 올리는 OOXML 경로도 없음. 완전 표시가 필요하면 앱 PDF 경로(`pdfFileFromEl` — 래스터 위 스탬프) 사용 |
| `w:docGrid` 잔존 | 격자 선언이 있으면 한글 금칙(줄바꿈) 격자로 오해석해 어절·자간을 늘리는 임포터 있음 — `_sect`에 두지 않는다 |
| `autoSpaceDE/DN` 미명시 | 뷰어 기본값 ON이라 한글↔라틴·숫자 사이 자동 간격이 벌어져 숫자 밀집 본문(비용 계산서)이 어색해짐 — `_NOSPACE`로 명시 OFF (pPr 시퀀스상 spacing·jc 앞) |
| 추정 vs 렌더 불일치 | `_wrap`이 어절 분리 불가 토큰(`'가'×2000` 같은 무공백 장문)을 1줄로 두면 Word는 실제로 수십 줄로 끊어 **쪽 경계 추정이 무너짐** — 글자 폭 기준 강제 분할로 해결(§6. 1장 판정 정확도에 직결) |
| 소자 `_wrap` 스케일 | `_cw` 글자폭은 **11pt 기준 dxa** — 9pt 소자(`_note`·메타) 등 다른 크기 단락은 `_wrap` 가용폭을 ×22/18로 스케일해야 함. 보정 없으면 9pt로 한 줄 들어가는 텍스트를 11pt 폭으로 판정해 불필요한 `<w:br/>` 사전 줄바꿈이 들어간다 (근거 열거 2줄 결함 사례) |
| 미리보기 다면 스탬프 | `docWmHtml`은 986px(1쪽 관례, `pinDocSignBottom`과 동일) 간격으로 최대 12개 스탬프를 중첩 생성 — `inset:0` 단일 절대배치는 문서 전체 높이 중앙에 1번만 그려져 2쪽+ 문서의 쪽 중앙에 없음. 인쇄는 `position:fixed`가 장마다 자동 반복하므로 `@media print`에서 **첫 스탬프만 표시**해 중첩 방지 |
| 본문 분산 워터마크 (폐기) | 구버전 `_sprayWm`은 추정 쪽 경계마다 본문 앵커를 삽입 — 같은 쪽 중복 착지 시 알파 배가·경계 누락 시 스탬프 없는 쪽 발생 + 거대 표를 쪼개야 했다. 헤더 스탬프로 전환해 기계 자체를 폐기 (§5.3) |
|| 인접 `<w:tbl>` 병합 | OOXML에서 단락 없이 연속한 두 표는 Word가 **한 표로 병합** — MD에서 빈 줄로 구분된 별도 표도 붙어 보임. md2doc `_add_table`이 직전 내용 요소가 표면 빈 단락 삽입 (말미 `sectPr` 건너뜀 — 있으면 마지막 내용 요소 판정이 항상 실패) |
|| 셀 단락 스타일 상속 → vAlign 치우침 | Normal의 `line`/후행 간격이 표 셀 단락까지 상속되면 행이 부풀고, `vAlign=center`가 **여백 포함 블록**을 중앙화해 텍스트가 위로 치우침 (Word→PDF 실측 8pt 편향). md2doc `_compact_cell`이 셀 단락을 space 0/0·line 1.0으로 — vAlign은 텍스트 자체 중앙화용, 셀 여백은 `tblCellMar`로 부여 |
|| `:::` 마커 출력 노출 | `:::sign`/`:::end` 등 doc-md 펜스 마커는 앱 `_mdBody`가 구조 처리하지만, 범용 MD 파이프라인(md2doc)에서는 텍스트로 새어나옴 — `_sanitize_marker_lines` 공용 정화 + `_strip_fence_markers`(본문 `<p>` 라인) + `_emit_block`(단락) 이중 제거. **인자 있는 마커(`:::approve 역할`·`:::closing 문구`)도 정규식이 `[ \t]*:::[\w-]+[ \t]*` fullmatch라 인자 붙으면 빗나가던 이력** — 인자 유무 무관하게 처리. `{{img:key}}` 토큰도 `(이미지)` 치환으로 누수 차단. pre·코드 펜스 안은 출력 내용이라 보존 |

**관련 이력**: 상세한 시행착오 경위는 `docs/dev/CHANGES.md` 2026-11-14 묶음(워터마크 헤더→본문 복원, OOXML 결함 2종, 1장 원칙, 표 분할 폐기 등) + 2026-11-15 묶음(헤더 워터마크 재전환·푸터 QR·`:::approve`/`:::landscape`·날짜 단일 소스·표 정합 교정·md2doc DOCX 경로) 참조.

## 11. ref-pipeline md2doc DOCX 경로 — MD→HTML 공유 파생

`ref-pipeline/md2doc.py`의 `--docx`는 **앱 파이프라인(§1~§10)과 독립된 두 번째 docx 생성 경로**다. 목적이 다르다 — 앱 경로는 carework 공문서(워터마크·서명·결재·추적 번호)용, md2doc 경로는 임의 Markdown(ref_md·양식 md)의 범용 변환용.

**구조 — 파생 방식**: 별도 MD 파서를 두지 않고 PDF 경로와 **같은 본문**(`md_to_html_body` 산출 HTML)을 경량 트리(`_HNode`, stdlib HTMLParser)로 파싱해 python-docx 블록 워커가 매핑한다 — 표·콜아웃·이미지·mermaid의 내용 정합이 원천 보장. 맑은 고딕(eastAsia)·A4·18/15mm 여백.

| 항목 | 규약 |
|------|------|
| 블록 매핑 | h1-6(크기 계열 + h1 3px·h2 1.5px 밑줄)·p(strong/em/code/a/sub/sup/del/mark/br)·ul/ol(중첩 들여쓰기·`start`)·blockquote/콜아웃(1×1 음영 표+좌측 바)·표(헤더 음영·colspan/**rowspan** 점유 맵+vMerge)·pre(음영+테두리·Consolas 8.5)·hr·img(상대경로/data URI/원격)·svg(headless Chrome 스크린샷→PNG — mermaid SVG의 `<text>`·외부 폰트를 PyMuPDF가 검은 박스로 깨뜨려 브라우저 우선, PyMuPDF 폴백)·외부 링크는 실 하이퍼링크·`#앵커`는 텍스트 폴백 |
| 표 열 폭 | `_col_widths_emu` — 열별 최장 셀 추정 폭(전각 2·그 외 1, 앱 `_estW` 동일) 비례 + 고정 레이아웃(gridCol·tcW 동기). 2열 표는 `_kv_label_emu`가 문서 전체 라벨 폭 공유(최장 라벨 기준, 하한 25mm·상한 본문폭 40%) — 앱 `_kvLabelW`와 같은 규약 |
| 표 셀 정렬 | vAlign center 전 셀 + 헤더·2열 라벨 열 jc=center — 앱 `_cell` 규약. `_compact_cell`이 셀 단락을 space 0/0·line 1.0으로(§10 함정 참조) + `_tbl_cell_mar` 상하 75dxa(print.html padding 해당) |
| 표 행 속성 | 헤더 행 `tblHeader`(쪽 넘김 시 반복 — print.html `thead{display:table-header-group}`과 동일 의미) + 전 행 `cantSplit`(쪽 경계 분할 금지) |
| 인접 표 | `<w:tbl>` 연속 시 빈 단락 삽입 — Word 병합 방지 |
| `:::` 마커 | `_sanitize_marker_lines`(공용) + `_strip_fence_markers`(HTML `<p>` 라인) + `_emit_block`(DOCX 단락) — **인자 있는 마커(`:::approve 역할`·`:::approve none`)도 누수 금지**. `:::closing <문구>`는 접두만 제거해 문구 보존. `:::page`는 `<div class="new-page">`로 치환해 PDF(`.new-page` CSS)·DOCX(페이지 브레이크) 양쪽에서 쪽 나눔 보존. `:::landscape`는 DOCX 섹션 A4 가로(`WD_ORIENT.LANDSCAPE`, 본문폭 267mm)·PDF `@page size: A4 landscape`로 방향 보존 — 앱 §3과 동일 의미. `{{img:key}}`는 `(이미지)` 텍스트 치환(앱 토큰 — 이 경로는 해석 불가) |
| kv 클래스 | `_mark_kv_tables`가 2열 표에 `class="kv"` 부여 — `print.html`/`doc.html`의 CSS가 라벨 열 가운데 정렬해 DOCX 규약을 다른 경로에 재현 |
| mermaid | 사전렌더 `<img src="data:image/svg+xml">` → `_parse_body`가 placeholder로 추출 → Chrome 스크린샷 PNG 임베드(미설치·실패 시 PyMuPDF 폴백). 오프라인·미렌더(`div.mermaid` 잔존 — **정확한 클래스 매치**, `mermaid-img`와 구분)면 소스를 코드 블록으로 출력 |
| 인터페이스 | CLI `--docx`(`--pdf`와 병기 가능, `--out` 확장자 자동 조정)·GUI `DOCX 생성` 체크박스+결과 열+설정 저장·`requirements.txt`에 `python-docx>=1.1.0` |
| 검증 | `python -m pytest ref-pipeline/tests/test_md2doc.py` (repo 루트 기준 — basetemp 경로 주의)·실물 md → Word COM PDF 내보내기로 렌더·벡터 실측 |
