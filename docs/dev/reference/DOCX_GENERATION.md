# 📄 Word(.docx) 생성 + 워터마크 파이프라인 — 시험 팩 적용 가이드

> **작성일**: 2026-11-14
> **대상**: `docxFile`·`docxFileMd`(`src/content/docx-utils.js`)와 `docWm*`(`src/content/doc-wm.js`)으로 워터마크·서명·결재란을 갖는 공문서형 Word 문서를 만드는 파이프라인 + 문서 추적성(`doc-stamp`·`qr`·`opts.doc` — 문서번호·메타데이터·QR) — 다른 시험 팩에서 출력 문서를 만들 때의 적용 절차·계약·함정을 정리
> **관련 SPEC ID**: `CO-13`(생성 문서 공유) · `CO-22`(문서 추적성) · `DA-24`(문서 생성은 MD 초안에서 시작)
> **문서 ID**: DOC-REF-20
> **범위**: platform · 판본: none
> **적용 실례**: carework 8종 보고서 (`src/exams/carework/care-share.js`의 `_mkDocx`·`src/exams/carework/doc-md.js`)

---

## 📋 목차

1. [개요 — 구성 파일과 특성](#1-개요--구성-파일과-특성)
2. [공개 API](#2-공개-api)
3. [MD 서브셋 문법](#3-md-서브셋-문법)
4. [문서 레이아웃 상수](#4-문서-레이아웃-상수)
5. [워터마크 메커니즘 — 설계 제약과 실현](#5-워터마크-메커니즘--설계-제약과-실현)
6. [1장 보고서 원칙 — 밀도 티어](#6-1장-보고서-원칙--밀도-티어)
7. [문서 추적성 — 문서번호·메타데이터·QR](#7-문서-추적성--문서번호메타데이터qr)
8. [다른 시험 팩 적용 레시피](#8-다른-시험-팩-적용-레시피)
9. [검증 절차 — Word COM·PDF 스트림·유닛](#9-검증-절차--word-compdf-스트림유닛)
10. [함정·주의사항 (과거 결함 사례)](#10-함정주의사항-과거-결함-사례)

---

## 1. 개요 — 구성 파일과 특성

| 파일 | 역할 |
|------|------|
| `src/content/docx-utils.js` | OOXML(.docx) 직접 생성 — ZIP stored 엔트리·CRC32 자체 구현, **외부 라이브러리 의존 0** (PWA 오프라인·번들 크기 요구 대응) |
| `src/content/doc-wm.js` | 워터마크 공용 — 문구 규약(`docWmText`)·미리보기 DOM 오버레이(`docWmHtml`)·docx용 알파 PNG(`docWmPng`) |
| `src/content/doc-stamp.js` | 문서번호 발급 — `PREFIX-YYYYMMDD-HASH6` (내용 해시라 동일 내용=동일 번호, cosmetic FO-70과 동일 철학) |
| `src/content/qr.js` | 의존성 0 QR 인코더 — 매트릭스/PNG/data URL (V1–V7·EC-M·바이트 모드, Node 안전) |
| `src/exams/carework/doc-issue-store.js` | carework 발행 대장 — docNo별 발행 이력·판본·파일명 병합 (localStorage) |
| `src/exams/carework/care-share.js` | carework 적용 실례 — `_mkDocx`가 md 초안 + 워터마크 + 서명 이미지를 묶어 `docxFileMd` 호출 |
| `src/exams/carework/doc-md.js` | MD 초안 빌더·미리보기(`mdToHtml` + `docWmHtml`) 실례 |
| `tests/unit/content/docx-utils.test.js` | 계약 테스트 21건 — 워터마크 앵커·1장 원칙·서명/결재·표 구조 |
| `tmp/gen-carework-docs.mjs` | 샘플 재생성 스크립트 — `tmp/sample-docs/`에 8종 산출 (검증용) |

**핵심 특성**

- 출력물은 `.docx` File 객체 — 저장·공유·다운로드에 그대로 사용 (CO-13)
- 문서 초안의 정본은 **Markdown** (DA-24) — docx·xlsx·html 미리보기·PDF가 모두 같은 MD에서 파생
- 브라우저에서 완결 — 네트워크·서버 불필요 (로컬 퍼스트 원칙)

## 2. 공개 API

```js
import { docxFile, docxFileMd } from '../content/docx-utils.js';
import { docWmText, docWmPng, docWmHtml } from '../content/doc-wm.js';
import { docStamp } from '../content/doc-stamp.js';
import { qrPng, qrDataUrl, qrMatrix } from '../content/qr.js';
```

| 함수 | 시그니처 | 용도 |
|------|----------|------|
| `docxFile` | `(text, filename, boldLines = 0, wm = '', wmImg = null)` | 단순 텍스트 → docx. `boldLines`는 선두 N행 굵게 |
| `docxFileMd` | `(md, filename, wm = '', opts = {})` | **주 경로** — MD 초안 → 공문서형 docx (제목·표·서명란·결재란·"끝." 종결) |
| `docWmText` | `(org) => string` | 워터마크 문구 규약 — `"기관명 · YYYY-MM-DD"`, 기관명 없으면 `''`(미출력) |
| `docWmPng` | `(text) => {data:Uint8Array,w,h} \| null` | 캔버스에 `rgba(0,0,0,.12)`로 구운 알파 PNG — **docx·미리보기·PDF와 동일 농도 보장의 유일 수단**. 비브라우저면 `null` |
| `docWmHtml` | `(text) => string` | 미리보기·인쇄용 DOM 오버레이 — 문서 루트(`position:relative`)에 삽입, `css/doc-export.css` 필요 |

`docxFileMd`의 `opts`:

```js
{
  wmImg: { data: Uint8Array },              // docWmPng 결과 — 지정 시 텍스트 워터마크 대신 PNG 앵커(권장)
  images: { key: { data: Uint8Array, w: 90, h: 60 } },  // {{img:key}} 토큰 치환용 PNG + 표시 px
  // 예약 키: images.author → :::sign 내 {{img:author}} 치환(서명란 (인) 위 오버레이)
  //          images.approve → 결재란 '담당' 칸 (인) 위 오버레이 — 둘 다 서명-only 투명 PNG 권장
  doc: { no, org, title, rev, qr: { data } } // 문서 추적 메타 — §7. docProps/core.xml + 푸터 번호 + 서명란 좌측 QR 부동 표
}
```

## 3. MD 서브셋 문법

`docxFileMd`가 지원하는 마크업(`_mdBody`):

| MD | docx 결과 |
|----|-----------|
| `# 제목` | 중앙·굵게 대제목. **`#` 직후 첫 단락은 자동으로 메타줄**(회색 소자 중앙 — "기관명 · 출력일" 위치) |
| `##` / `###` | 섹션 소제목 (before/after 간격 부여) |
| `| a | b |` | 표 — thinThickSmallGap 테두리·헤더행 음영+반복(tblHeader)·행 분할 금지(cantSplit)·고정 레이아웃, 열 폭은 문자폭 추정(`_cw`)으로 자동 배분 + `<w:br/>` 사전 줄바꿈 |
| `- 항목` | `• 항목` 불릿 단락 |
| `---` | 하단선 단락(구분선) |
| `:::page` | 강제 페이지 나눔 — **1장 원칙 압축 대상에서 제외됨**(의도된 다면 구성) |
| `:::sign` … `:::end` | 서명 문서 — **선두에 결재란(결재/담당/팀장/시설장) 부동 표 자동 선 부여 — 서명 자리는 `(인)` 중앙정렬 표기**(`images.approve` 지정 시 담당 칸 (인) 위에 서명 앵커 오버레이) + `:::sign`~`:::end` 사이 줄들을 하단 우측 서명란으로 출력 (QR 있으면 종결 부동 표 `_closeTbl`의 우측 셀로 중첩 — §7.2). 줄 내 `{{img:key}}`는 (인) 위 오버레이 서명으로 치환 — **(인)은 문서 텍스트로 유지되고 이미지가 `wp:anchor`로 그 위에 겹침** (날인 형태 — §10 함정 참조) |
| 일반 단락 | 본문 단락 (맑은고딕 11pt·행간 336) |

자동 부가: 서명 문서의 결재란, 문서 말미의 `끝.` 종결 표기, 바닥글 쪽 번호(`{IF NUMPAGES>1}` 조건부 — 1쪽 문서는 번호 생략).

## 4. 문서 레이아웃 상수

| 항목 | 값 |
|------|-----|
| 용지 | A4 세로 고정 — `w:pgSz 11906×16838` (가로 출력 경로는 아직 없음 — 워터마크는 방향 자동 인지라 `_SECT`만 바꾸면 됨) |
| 여백 | 상하 1134tw(≈20mm)·좌우 1417tw(≈25mm) — 본문폭 `_TEXT_W=9072` |
| 서체 | Malgun Gothic 11pt (`w:sz=22`)·행간 `w:line=336`(1.4배)·단락 후간격 40tw |
| 표 | 행 최소 440tw·셀 여백 상하 120/좌우 140tw·테두리 thinThickSmallGap 18(≈2.25pt) `404040` |
| 부동 표 | 결재란 상단 우측(`tblpYSpec="top"`, 4열×960tw) · **종결 표 하단 우측**(`tblpYSpec="bottom"` — QR 셀 2600 + 서명 셀 4500의 단일 행 `cantSplit`, `끝.` 뒤 앵커 — 내부 서명 표는 4200+`tblInd` 60으로 셀보다 좁고 들여쓰기됨: 이중 외곽선 양쪽이 셀 경계 안에 들어오게 하려는 여유, 중첩 표를 셀 경계에서 잘라내는 렌더러 대비) — `tblpPr` 부동 앵커, 본문 흐름 높이를 차지하지 않되 텍스트가 감기는 시각적 점유 영역 존재 |
| 설정 | `w:view=print`·`zoom=100` — 생략 시 뷰어가 웹 레이아웃으로 열 수 있어 필수 |

## 5. 워터마크 메커니즘 — 설계 제약과 실현

### 5.1 확정된 설계 제약 (시행착오로 검증됨 — 변경 금지 사항)

1. **본문 앵커만 가능** — 헤더(`header1.xml`) 도형은 렌더러가 `behindDoc`와 무관하게 **항상 본문 아래층**에 그린다(PDF 스트림 최선두 실측). "본문 위 덮기"는 본문 앵커 + `behindDoc="0"`으로만 가능 (스트림 99~100% 지점 실측).
2. **용지 기준 중앙** — `positionH/V` 모두 `relativeFrom="page"` + `<wp:align>center</wp:align>` + `layoutInCell="0"`. Word가 실제 용지 크기로 중앙을 계산하므로 **세로·가로 방향을 자동 인지** — 고정 `posOffset`은 방향별 재계산이 필요해 쓰지 않는다.
3. **페이지당 앵커 ≥1개** — `wp:anchor`는 호스트 단락이 실려 있는 쪽에만 렌더된다. 추정 높이로 분산 배치하되 촘촘한 간격+꼬리 앵커로 누락을 막는다.
4. **PNG 알파 권장** — `w14:alpha`·`behindDoc`를 무시하는 뷰어가 있다. 텍스트 상자(`_wmPara`)는 진하면 본문을 가리고 연하면 안 보이는 양립 불가라, `docWmPng`의 알파 구운 PNG가 유일하게 렌더러 무관 동일 농도(`rgba(0,0,0,.12)`)를 보장한다. 텍스트 경로는 `behindDoc="1"` 폴백(캔버스 불가 환경).

### 5.2 배치 기계 (`_sprayWm`)

본문 XML을 최상위 요소(`w:p`·`w:tbl`) 단위로 순회하며 추정 높이(`_DENS` 티어)를 누적, `_WM_PT=360`pt 경계마다 앵커를 삽입한다:

- **선두 앵커** `mk(0)` — 문서 첫 단락(id=100), 스프레이 앵커는 id=101~ (docPr id 중복 시 Word가 손상으로 거부 — 유일성 필수)
- **소형 표**(<쪽 75%) — 통째로 누적, 경계 넘으면 **표 뒤**에 앵커 단락
- **거대 표** — 경계에 걸린 행의 첫 셀 단락 안에 **런 앵커**(`<w:r><w:drawing>…` — `mkCell`이 단락 껍질을 벗겨 도출). `wp:anchor`는 인라인 공간을 차지하지 않아 셀 레이아웃 무영향, 표는 하나로 유지됨
- **장문 단락** — 경계를 넘고 `<w:br/>`가 있으면 줄바꿈 위치에서 분할해 사이에 앵커 (요소 내부가 쪽 경계를 삼키는 것 차단)
- **`:::page`** — 실제 새 쪽이므로 누적 리셋 + 새 쪽 선두 앵커
- **끝쪽 앵커** — 마지막 앵커 뒤 꼬리 콘텐츠(≥10pt)가 남으면 문서 말단에 추가 — 추정 오차로 실제 렌더가 한 쪽 더 넘어가도 마지막 쪽 보장
- **부동 표(`tblpPr`)** — 여백 앵커라 누적에서 제외

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
- **스페이서 단락**(`lineRule="exact"`)은 고정 ~8pt로 추정 — 글자 기반 추정은 과대
- 글자 크기는 모든 티어에서 11pt 유지 — 가독성 본질은 건드리지 않음

## 7. 문서 추적성 — 문서번호·메타데이터·QR

발행 문서에 고유 번호를 부여하고 파일 안에까지 새겨 넣는 층위. `opts.doc`만 넘기면 docx 파이프라인이 알아서 처리한다.

### 7.1 문서번호 (`doc-stamp.js`)

```js
const no = docStamp('LOG', '2026-11-14', md);   // "LOG-20261114-251e3f"
```

- 형식 `PREFIX-YYYYMMDD-HASH6` — 해시는 fnv1a(내용 시드)라 **동일 내용 재출력=동일 번호**(중복 발행 자동 탐지), 내용 변경=다른 번호(변조 대조)
- carework 유형 접두어는 `doc-issue-store.js`의 `docPrefix(toolKey)`가 매핑 — LOG(요양일지)·HND(인수인계서)·INC(사고보고서)·VST(면회방문)·CHK(체크리스트)·RST(근무표)·CLT(수급자)·CST(비용계산)·DOC(폴백)
- 시드에는 **발급될 번호를 넣지 않는 것** — 자기 참조 순환 방지(번호 표기는 전부 렌더 시점 부여라 해시에 안 들어감)

### 7.2 `opts.doc` 계약 — `docxFileMd(md, filename, wm, { doc })`

```js
doc: { no: 'LOG-20261114-251e3f', org: '행복요양원', title: '요양일지', rev: 1,
       qr: { data: qrPng('LOG-20261114-251e3f').data } }
```

`doc` 지정 시 파이프라인이 자동 부여하는 것:

| 산출 | 위치 |
|------|------|
| `docProps/core.xml` | `dc:title`(문서 제목)·`dc:identifier`(문서번호)·`dc:creator`/`cp:lastModifiedBy`(기관)·`cp:revision`(판본)·`dcterms:created/modified` — **파일명을 바꿔도 번호가 파일 안에 남음** |
| 푸터 문서번호 | 쪽 번호 아래 소자 `문서번호 …` — 모든 쪽에 표기 (메타줄에는 미표기 — 상단·하단 중복 표기 방지) |
| QR 부동 표 | `doc.qr.data` 있으면 캡션+2cm 정사각 QR을 **서명란 좌측 셀**에 삽입 — 서명란과 QR을 `_closeTbl` 한 부동 표(단일 행 `cantSplit`)로 묶어 `끝.` 뒤 앵커. 쪽 경계에서 행이 쪼개지지 않고 통째로 넘어가며 두 요소가 항상 나란히 놓임 (서명 없는 문서는 `_qrTbl` 단독 — 하단 좌측 `tblpX=0`) |

### 7.3 QR (`qr.js`) — 의존성 0

```js
qrPng('LOG-20261114-251e3f')   // { data: Uint8Array, size } — 1비트 PNG, 결정적 바이트
qrDataUrl('LOG-...')           // data:image/png;base64 — HTML 미리보기·PDF 경로용
qrMatrix('LOG-...')            // boolean[][] — 필요 시 직접 렌더
```

- V1–V7·EC-M·바이트 모드 — 문서번호(~24자)는 V2(25×25)면 충분, UTF-8 한글도 수용
- PNG는 캔버스 없이 순수 JS 인코딩이라 **Node·jsdom·브라우저 어디서든 동일 바이트** — 샘플 생성·테스트에서 그대로 사용 가능
- 검증은 인코더 자체 경로가 아닌 **독립 디코더**(tests/unit/content/qr.test.js — 데이터 추출·RS 신드롬을 별개 알고리즘으로 재구현)로 라운드트립

### 7.4 발행 대장 (`doc-issue-store.js`, carework)

- 키 `carework_doc_issues` (`STORAGE_KEYS.CARE_DOC_ISSUES` — 백업·초기화 레지스트리 포함)
- `recordDocIssue({ docNo, toolKey, title, kinds, fname, hash, org })` — 같은 docNo 재발행이면 행을 새로 안 만들고 **rev+1·파일명/출력형식 병합**, 새 해시가 없으면 기존 해시 보존
- `nextDocRev(docNo)` — 발행 전 판본 번호 조회, `listDocIssues()`·`findDocIssue(docNo)` — 이력·검증 조회 (care-forms 발행 이력 UI가 사용)
- 로컬 퍼스트 — Supabase 없이 동작, 추후 동기화 대상 지정 시 기관 공용 대장으로 확장

### 7.5 적용 시 주의

- **파일명에도 번호** — `제목_DOCNO.ext` (care-share의 `_issueName` 실례). 파일명만으로도 추적 가능하게
- 번호는 **콘텐츠 확정 후** 발급 — QR PNG가 초안에 들어가면 QR 이미지가 다시 해시에 섞여 순환. `md`(해시 시드) → `docStamp` → `qrPng(docNo)` → `docxFileMd` 순이어야 함
- `doc` 미지정이면 core.xml·푸터 번호·QR 전부 생략 — 기존 동작과 완전 동일(하위 호환)

## 8. 다른 시험 팩 적용 레시피

```js
import { docxFileMd } from '../../content/docx-utils.js';
import { docWmText, docWmPng, docWmHtml } from '../../content/doc-wm.js';

// ① MD 초안 — DA-24: 문서 구조의 정본. docx·xlsx·미리보기·PDF가 같은 초안에서 파생
const md = `# 재고 현황 보고서

${orgName} · ${todayKey()}

| 품목 | 수량 | 비고 |
| 물품A | 12 | 정상 |

:::sign
작성자: {{img:author}}
:::end`;

// ② 워터마크 — 문구 규약은 docWmText로 통일 (모든 출력 경로 동일 문구)
const wm = docWmText(orgName);                  // "기관명 · 2026-11-14" — ''이면 미출력
const wmImg = wm ? docWmPng(wm) : null;         // 알파 PNG (Node·비브라우저면 null → 텍스트 폴백)

// ③ 생성 — opts는 필요한 것만
const file = docxFileMd(md, '재고현황_2026-11-14', wm, {
  ...(wmImg ? { wmImg } : {}),
  images: { author: { data: sigPngBytes, w: 90, h: 60 } },  // 서명 이미지 있을 때만
});

// ④ 미리보기 — 같은 MD를 mdToHtml로 렌더한 루트(position:relative)에
//    docWmHtml(wm) 삽입 + css/doc-export.css 임포트
```

**적용 시 체크리스트**

- [ ] 문서 초안은 MD로 작성 — `*DocMd` 빌더 함수로 만들고 `care-share.js`의 `mdgen` 슬롯 패턴 참조 (DA-24)
- [ ] 서명·결재가 필요한 문서만 `:::sign` 사용 — 선두 결재란이 자동 부여됨
- [ ] 워터마크 문구는 `docWmText(기관명)` — 경로별 임의 문구 금지
- [ ] 워터마크는 `wmImg`(PNG) 우선 전달, `wm` 텍스트는 폴백으로 병행 전달
- [ ] 서명 이미지는 `opts.images`로 — `images.author`는 서명란 `{{img:author}}` 토큰에, `images.approve`는 결재란 담당 칸에 적용. 둘 다 **서명-only 투명 PNG**여야 함 — (인)은 문서가 텍스트로 그리고 이미지는 그 위 오버레이라, (인)이 구워진 이미지를 넣으면 이중 표기됨
- [ ] `:::page`는 의도된 다면 구성에만 — 쓰면 밀도 압축이 비활성화됨

## 9. 검증 절차 — Word COM·PDF 스트림·유닛

**XML well-formedness만으로는 부족** — 과거 두 차례 스키마 결함(§9)이 파서를 통과하고도 Word에서 열리지 않았다. 기준은 실제 개방:

```powershell
# Word COM — 개방 성공 여부 + 실제 페이지 수 + 앵커 착지 페이지
$w = New-Object -ComObject Word.Application; $w.Visible = $false
$d = $w.Documents.Open($path, $false, $true)
$d.ComputeStatistics(2)                    # 페이지 수
$d.Shapes.Item(1).Anchor.Information(3)    # 앵커가 착지한 페이지 번호 (wdActiveEndPageNumber)
$d.SaveAs([ref]$pdf, [ref]17)              # wdFormatPDF — 오버레이 순서 검증용
$d.Close($false); $w.Quit()
```

```python
# PDF 스트림 — 워터마크 이미지(Do 연산자)가 본문 뒤에 그려지는지 확인
# 각 쪽 콘텐츠 스트림에서 ' Do' 위치 ≈99~100% → 본문 위 오버레이, ≈0% → 헤더층(불량)
import re, zlib
for s in re.findall(rb'stream\r?\n(.*?)endstream', data, re.S):
    s2 = zlib.decompress(s)
    pos = [m.start()/len(s2) for m in re.finditer(rb' Do', s2)]
```

- 유닛 회귀: `node --test tests/unit/content/docx-utils.test.js` → `npm.cmd test`
- 샘플 재생성: `node tmp/gen-carework-docs.mjs` → `tmp/sample-docs/` 8종 (carework 참조)
- **다면 문서는 각 쪽 워터마크 확인** — `Shapes.Anchor.Information(3)`로 앵커 착지 페이지 목록을 쪽 수와 대조

## 10. 함정·주의사항 (과거 결함 사례)

| 함정 | 증상·교훈 |
|------|-----------|
| `xmlns:a` 네임스페이스 오기 | `word/2010/wordprocessingDrawing`(wp URI)로 쓰면 `a:` 요소 전부 무명 네임스페이스 → **스키마 위반으로 Word 개방 거부**. 정본: `http://schemas.openxmlformats.org/drawingml/2006/main` |
| 템플릿 보간 누락 | 작은따옴표 문자열 안 `${_NOSPACE}`가 리터럴 텍스트로 `<w:pPr>` 안에 박힘 → 스키마 위반. XML 조각은 항상 백틱 리터럴 |
| 파서 검증의 한계 | 위 두 결함 모두 XML well-formed·패키지 정합성은 통과 — **Word COM 개방만이 스키마 검증**. docx 구조 변경 시 COM 개방을 기준으로 삼을 것 |
| 헤더 워터마크 | `behindDoc` 무관하게 항상 본문 아래 — "본문 위 덮기" 불가 (§5.1) |
| `relativeFrom="margin"` + `layoutInCell="1"` | 표 안/사이 단락의 앵커가 **셀 기준**으로 해석돼 표 중심 위치에 표시 → `page`+`0` 필수 |
| posOffset 순환 | 쪽마다 높이가 달라 보임 — 전 앵커 정중앙 통일이 요구사항 |
| 표 분할 앵커 | `</w:tbl>`→앵커→재개는 이중 테두리+틈으로 **표가 여러 개로 보임** → 거대 표는 셀 안 런 앵커 |
| 추정 상수 신뢰 금지 | `_DENS`는 맑은고딕 11pt·행간336 실측 교정치 — **폰트·크기·행간 변경 시 재측정 필요** (Word COM `Information(6)` vtb 위치로 요소별 실측 가능) |
| 부동 표 점유 | `tblpPr` 표는 흐름 높이를 안 쓰지만 시각적으로 쪽 높이를 잠식 — 1장 판정에 `_FLT_PT` 예약 필수 |
| docPr id 중복 | 같은 `wp:docPr id`가 두 개면 Word가 파일 손상으로 거부 — 앵커·이미지 id 연번 관리 필수 (선두 100·스프레이 101~·이미지 300~) |
| 동일 쪽 중복 앵커 | 추정 오차로 한 쪽에 앵커가 겹치면 같은 중앙에 중첩해 워터마크가 약간 진해짐 — 위치는 일관되므로 허용, 누락 방지가 우선 |
| 부동 표 분할 | `tblpYSpec=bottom` 부동 표가 앵커 아래 남은 공간보다 크면 **행 단위로 쪼개져** 다음 쪽 상단에 잔여 행이 렌더됨 (서명란 날짜 행만 앞쪽·서명 행이 뒤쪽 사례) — 종결 블록은 반드시 **단일 행 `cantSplit` 한 표**로 묶고 앵커를 본문 말미(`끝.` 뒤)에 둘 것 |
| 중첩 표 셀 경계 | 셀 폭과 같은 내부 표는 이중 외곽선(~38tw)이 셀 경계를 넘어 그려지고, 경계에서 자르는 렌더러에서 **서명란 우측선이 깎여 보임** → 서명 셀은 내부 표보다 `_SIG_SLK`(300) 넓게 + 내부 표 `tblInd`(60)로 양쪽 외곽선을 셀 안에 수용 |
| 셀 안 서명 앵커 | (인) 위 서명 오버레이는 `wp:anchor`+`layoutInCell="1"` 필수 — 셀 밖 기준으로 잡히면 서명이 셀 밖으로 이탈. 서명란은 `relativeFrom="character"`+`posOffset=_OVR_RPAD-폭`으로 우측 끝 정합((인) 잉크가 탭 정지 위치보다 ~3.5pt 우측에 넘침 — 보정 없으면 `)`가 삐져나옴), 결재란은 `column`+`center`. 세로는 `line`+`center` — (인)이 있는 줄 중앙 |

**관련 이력**: 상세한 시행착오 경위는 `docs/dev/CHANGES.md` 2026-11-14 묶음(워터마크 헤더→본문 복원, OOXML 결함 2종, 1장 원칙, 표 분할 폐기 등) 참조.
