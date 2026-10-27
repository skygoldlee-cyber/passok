# 콘텐츠 파이프라인 규약 — 자료수집 → 참조자료 → 문제은행·교재

> 시험팩 콘텐츠가 만들어지는 전체 경로와 각 단계의 파일·선언·게이트 규약.
> **문서 ID**: DOC-RBK-19
> **범위**: platform · 판본: none
> **관련 문서**: CONTENT_WORKFLOW §3.3-2(순서 계약) · TEXTBOOK_AUTHORING_GUIDE(교재 마크업) · NEW_EXAM_RUNBOOK(스캐폴딩·플래그) · REF_PDF_EXTERNALIZATION(PDF 외부화) · STORY_PATCH_GUIDE(이야기형)

## 파이프라인 개요

```
tmp/materials/<id>/           gitignore — 원본 자산 스테이징 (수집·보관)
        │
        ▼ ① 변환·선별
참조자료/                     인용근거 정본 — ref_md/ + 기출/
        │
        ▼ ② 교재 작성 (참조자료 → 교재, CS-11 선행)
교재/                         표준형 교재 — manifest.subjects.chapters 선언
        │
        ▼ ③ 문제은행 작성 (교재 이후 — 인용 앵커가 교재 #LNN)
문제은행/                     ### Q·### S 은행 — manifest exams/pastExams/written 선언
        │
        ▼ ④ 등록·검증
manifest.json · sw.js · data/ 번들 · 게이트 통과
```

**순서 계약**: `참조자료 → 교재 → 문제은행`. 문제은행의 인용 앵커는 교재 `파일#LNN`이라 교재가 선행 필수 (CS-11). 기출 원문 자체를 인용하는 `pastExams`는 참조자료/기출 편입이 선행.

---

## 단계 0 — 자료 수집·스테이징 (`tmp/materials/<id>/`)

- **원본 자산**(기출 PDF/HWP/ZIP, 법령 txt·xml·md, 고시·기준·보고서, 강의록)은 `tmp/materials/<시험id>/` 하위에 보관한다 — **gitignore 대상, 저작권상 원본 그대로 커밋 불가**
- 팩마다 `NEEDS.md`로 수집 현황·미수집 목록을 추적한다
- `tmp/materials/INVENTORY.md`·`SOURCES.md`에 출처·라이선스를 기록한다
- 구 `tmp/sources/`는 폐기 — 전 자산이 `materials/` 하위로 통합됨 (NEW_EXAM_RUNBOOK의 `tmp/sources` 언급은 구식 표기)
- 수집 도구·중간 산출물은 `tmp/materials/<id>/tools/`·`_sources/`에 둔다

### 소재 선별 기준

| 소재 | 편입 판단 |
|---|---|
| 법령·시행령·시행규칙·고시 (DRF·공식) | **필수** — 인용근거 핵심. txt·md·PDF 모두 ref_md 후보 |
| 기출 문제지·정답표 | **필수** — pastExams 문제은행 원본 + 참조자료/기출 인용근거 |
| 출제기준·시험안내·이론서·강의록 | 권장 — 교재·은행 보강 소스. 스크랩 품질 불량(HTML 잔재)이면 보류 |
| 도제과정·NCS 개발보고서·훈련 커리큘럼 | **제외** — 시험 직접 연관성 없음 (hairdresser NCS 4건 제외 판례) |
| AI 생성 초안 | **tmp/ai_drafts/ 경유만** — 정본 문제은행 직접 투입 금지, 빈 스텁은 폐기 |

---

## 단계 1 — 참조자료 구성 (`{contentRoot}/참조자료/`)

인용근거의 **커밋 가능한 정본** 위치. 두 분류로 구성한다.

### 1-A `ref_md/` — 법령·고시·기준·이론서

```
ref_md/과목N/{문서명}/{문서명}.md
ref_md/과목N/{문서명}/images/    ← 변환 이미지 (있을 때)
```

- **명명 규약**: `{문서명}({법종|기관})({제N호})({시행일YYYYMMDD})` — 예: `근로기준법(법률)(제21533호)(20261008)` · `공중위생관리법 시행규칙(부령)`. 시행일·제호 불명이면 `({법종})`까지만 적는다
- **과목 귀속**: `references.json`의 `docSubjectRules[]` — `[정규식, 과목번호, 주석]` 순서 배열. 첫 매칭 규칙이 과목을 결정하므로 **구체 규칙을 앞에** 둔다 (예: `이론과 실무→과목5`가 `손해평가→과목2`보다 먼저)
- **출처 PDF**: `refDirs`에 등록된 폴더의 PDF → ref_md 의무 편입. **PDF 자체는 참조자료에 커밋 금지** (DOC-RBK-12 — 릴리스 에셋 외부화). PDF 미수록 팩은 ref_md 구조·귀속·링크만 검사된다
- **자체 편집 문서**: 출처 PDF 없는 자작 요지본은 `references.json` `selfAuthoredDocs`에 선언해 고아 판정을 면제한다
- 변환 도구: `python ref-pipeline/convert.py --pdf-root <dir> --staging <out>` (pdf2md 엔진 — `{문서}/{문서}.md` + `images/` 산출)
- 텍스트 소스(DRF txt/md)는 출처 표기(`> 출처: 법제처 국가법령정보센터 DRF · 시행일`) 후 그대로 배치한다

### 1-B `기출/` — 기출 원문 (pastExams 인용 대상)

```
기출/{회}_{차}/{문서명}.md          ← insadj 형: 회차 폴더 + 평면 md
기출/{문서}/{문서}.md (+images/)   ← broker/admagent 형: pdf2md 출력 그대로
기출/_meta/                        ← 출제분석 등 보조 문서
```

- 문제은행 기출 파일의 `[기출 시험문제]` 인용이 가리키는 원본 — **gitignore된 tmp에만 두면 배포 상태에서 깨진 링크**가 되므로 반드시 참조자료에 커밋한다
- 원본은 PDF지만 **참조자료에는 md 변환본만** 커밋 (DOC-RBK-12). 변환은 ref-pipeline 동일 사용
- 링크 형식: `](<../참조자료/기출/{회}_{차}/{파일}.md>)` 또는 `](<../참조자료/기출/{문서}/{문서}.md>)` — `기출/*.pdf` 직접 참조 금지 (구 링크 잔재는 깨짐)

---

## 단계 2 — 교재 작성 (`{contentRoot}/교재/`)

- 마크업 규약 전반은 **TEXTBOOK_AUTHORING_GUIDE**가 정본 (헤더·3영역·아이콘·📌출처·확인문제·서사 슬롯)
- 표준형 계약 요약: 학습안내 → 아이콘 범례 → 직전 지도 → 최우선 암기축 → 🔢숫자표 → 십진법 장절 본문 → 📌출처(ref_md `문서#LNN`) → 📝확인문제 → ⚖️법령 원문
- 파일명: `과목N_{이름}_표준형.md` (이야기형은 생성물 — 직접 작성 금지)
- **과목별 독립 디렉터리 필수**: `subjects[].dir`은 반드시 과목 1개가 점유한다 (`교재/law` 같은 다과목 공유 dir은 `_표준형` 자동할당이 전 과목에 퍼지는 오작동 유발 — sync_textbook_files가 공유 감지 시 자동할당 스킵·경고). dir명은 과목 key 권장 (`교재/broker_law` — broker·appraisal 마이그레이션 선례)
- 선언: `manifest.subjects[].dir` + `chapters[].file` — 신규 파일은 `sync_textbook_files.js`가 자동 등록·검증
- 이야기형: `story/*_서사.md` 패치 + `build:story` 생성 (features.storyTextbook 팩만)
- 초안 경로: `npm.cmd run ai:textbook` → `tmp/ai_drafts/` → **리뷰 승인분만 편입** (생성본 교재 직배치 금지 — CONTENT_WORKFLOW §3.3-2)

---

## 단계 3 — 문제은행 작성 (`{contentRoot}/문제은행/`)

### 문항 포맷

| 용도 | 블록 | 뷰어 | manifest 선언 |
|---|---|---|---|
| 객관식 문제은행 | `### Q1.` | ExamViewer | `exams[]` |
| **기출 원문** | `### Q1.` | ExamViewer | **`pastExams[]`** (`kind:'past'`) |
| 기출 외 보충 자료 | `### Q1.` | ExamViewer | `pastExams[]` (`kind:'supplement'`) |
| 주관식 연습 | `### S1.` | WrittenPractice | `written[]` |

- `written[]`에 ### Q 파일을 두면 "주관식" 카드가 `### S 문항이 없습니다`로 깨진다 — **기출은 반드시 `pastExams[]`** (check:manifest가 포맷 강제)
- 정답 블록: `**Q1답**: N` + `> 해설: …` + 인용 `[근거](<교재파일#LNN>)`

### 파일명 규약

| 유형 | 규약 | 예시 |
|---|---|---|
| 과목 문제은행 | `과목N_{이름}_문제은행.md` | `과목1_화장품법_문제은행.md` |
| 기출 | `기출_{차}차_{회}회_{연도}[_식별].md` | `기출_2차_43회_2020_의학이론.md` |
| 주관식 | `{영역}_주관식.md` | `2차_신체_주관식.md` |

- 리네임 일괄 적용: `sync_textbook_files.js --rename-batch <map.json>` (manifest·sw.js·본문 인용 경로 자동 전파)
- 인용 링크는 커밋된 파일만 가리킨다 — `../교재/...` · `../참조자료/ref_md/...` · `../참조자료/기출/...` (tmp 경로 참조 금지)

---

## 단계 4 — 등록·검증

### 선언 계층

| 위치 | 선언 | 자동/수동 |
|---|---|---|
| `manifest.exams[]/pastExams[]/written[]` | 문제은행 분류 | 수동 (sync가 exams[] 자동등록 지원) |
| `manifest.subjects[].chapters[]` | 교재 챕터 | sync 자동 등록 |
| `references.json` `docSubjectRules·refDirs·selfAuthoredDocs` | 참조자료 귀속·고아 면제 | 수동 |
| `sw.js MD_ASSETS` | 오프라인 프리캐시 | sync 자동 갱신 |
| `data/exams/<id>/` 번들 | 런타임 자산 | `build:derived` 생성 |

### 게이트 매트릭스

| 게이트 | 강제하는 규약 |
|---|---|
| `check:manifest` | written[] `### S`·pastExams[] `### Q` 포맷 · 기출 파일명 규약 · 선언↔파일 |
| `check:reflayout` | ref_md `과목N/{doc}/{doc}.md` · docSubject 귀속 · refDirs↔ref_md |
| `check:reflines` | 📌출처·(LNN) 인용 ↔ ref_md 실제 내용 |
| `check:structure` | 교재·문제은행 ↔ manifest·sw.js 드리프트 |
| `check:numbering` | 교재 십진법 번호체계 |
| `check:orphans` | 미참조 자산 차단 — 참조자료 신규 파일은 인용 선언 필수 |
| `check:binary` | 참조자료 PDF·500KB+ 바이너리 유입 차단 |
| `check:answers` | 정답 ↔ 인용 근거 지지 |
| `sync:citations` | 인용 #LNN 라인 동기화 (`--check`로 미리보기) |

### 표준 작업 순서 (커밋 단위)

```powershell
# 1. 소재 스테이징·선별 → 2. 참조자료 배치 + references.json
python ref-pipeline/convert.py --pdf-root <dir> --staging <out>   # PDF→md 변환
# 3. 교재 작성·갱신 → 4. 문제은행 작성·인용 링크 → 5. 동기화·빌드·검증
node tools/sync/sync_textbook_files.js          # 파일 ↔ manifest·sw.js 동기화
npm.cmd run sync:citations                       # 인용 라인번호 동기화
npm.cmd run build:derived                        # 번들·파생물 일괄 재생성
npm.cmd run check:all                            # 전 게이트 (생성물 clean 상태에서)
```

---

## 판례 (규약 적용 선례)

- **insadj**: `kidi_past_papers` md 224건 → `참조자료/기출/{회}_{차}/`, 인용 링크 350건 재지정
- **broker·admagent**: 기출 PDF 29건 pdf2md 변환 → `참조자료/기출/{문서}/{문서}.md`, 링크 2,115건 `기출/*.pdf` → `../참조자료/기출/*/*.md`
- **pastExams[] 분리**: insadj 139·admagent 36·appraisal 14·broker 21건을 `written[]`에서 분리 — 대시보드 기출 카드 → ExamViewer
- **Phase A 소재 보강**: indsafe DRF 법령 12건(전체 규약명) · skincare/hairdresser 공중위생관리법 3건 · lossadj 농어업재해보험법·손해평가요령·이론서·KOCW 강의록
