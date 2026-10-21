# 새 시험 추가 런북

> **문서 ID**: DOC-RBK-10
> **범위**: platform · 판본: none
> **관련 SPEC ID**: ES-01, DA-11, DA-12, BP-09
> **대상**: Passmula 플랫폼에 새 자격시험을 추가하는 사람
> **전제**: 멀티시험 아키텍처 — `docs/dev/ARCHITECTURE.md` "새 시험 추가 절차"·"시험별 문서 규약"·"파일 계층 분류" 절

## 개요

새 시험 추가는 **앱 코드 변경 없이 콘텐츠 선언만으로** 완료된다. 절차는 4단계:

> 📐 **참조 팩**: `content/exams/lossadj/`는 다과목 실사용 팩(1차 3과목 + 2차 주관식 2과목) — 스키마·파일 배치·선언 형식의 참조 기준이다 (최소 구성 Phase C 파일럿 `food`는 2026-10 제거 — MULTI_EXAM_DB_DESIGN §9에 이력).

```mermaid
flowchart TD
    A["① scaffold:exam -- &lt;id&gt; --name"] --> A1["exams.json 자동 등록<br/>+ content/exams/&lt;id&gt;/ 골격"]
    A1 --> B["② 콘텐츠·선언"]
    B --> B1["manifest·교재·문제은행 교체"]
    B --> B2["features 플래그 ↔ docs/ 문서 불변식"]
    B --> B3["manifest.uiText 라벨"]
    B1 & B2 & B3 --> C["③ build:data ×2회 + doc 번들<br/>→ 커밋"]
    C --> D["④ check:content → check:all<br/>→ deploy"]
    D -->|"실패"| E["실패한 게이트 수정<br/>(domainmap·uitext·docbundles…)"]
    E --> D
    subgraph AUTO["자동 처리 (편집 불필요)"]
        F1["domain-map 규칙"]
        F2["data/exams.js · 번들"]
        F3["스토리지·exam_id 스코프"]
    end
```

1. `scaffold:exam`으로 골격 생성 (exams.json 등록 자동)
2. 샘플 콘텐츠를 실제 콘텐츠로 교체 + 기능 플래그·문서 선언
3. **빌드 → 커밋 → 검증** (순서 중요 — `check:datafresh`는 생성물 경로가 미커밋이면 즉시 실패하므로, 생성물 커밋 후에 검증한다)
4. 배포

### 소스 자료 스테이징 규약

기출문제·법령 원문·가이드 PDF 등 제작용 소스 자료는 **`tmp/sources/<시험id>/`**에 모은다 (gitignore — 저작권상 편입 불가 자료의 표준 보관소). 루트 `.tmp_*`·`tmp/` 산재 금지, 시험 전용 수집·변환 스크립트는 `tmp/sources/<시험id>/tools/`에 둔다. 현황·라이선스 주의는 `tmp/sources/README.md` 참조.

## 1단계 — 스캐폴딩

```powershell
npm.cmd run scaffold:exam -- <id> --name "시험명" [--short-name X] [--year YYYY]
```

- `<id>`: 영문 소문자 식별자 (예: `lossadj`) — URL·디렉터리·스토리지 네임스페이스에 사용
- `--dry-run`: 생성 없이 미리보기 · `--force`: 기존 골격 덮어쓰기 · `<id> --remove`: 골격 전체 제거

생성물:

```
content/exams/<id>/
├── manifest.json          # 과목·챕터·기능 콘텐츠 선언 (샘플)
├── references.json        # 참조자료 레지스트리 골격
├── 교재/·문제은행/         # 샘플 교재·문항
├── docs/                  # 앱 내 문서 (이 단계에선 비어있음)
├── 참조자료/               # ref_md 변환본 + PDF
└── knowledge/             # 지식DB (필요 시)
```

동시에 `content/exams.json`에 엔트리가 자동 등록된다 (`contentRoot`/`dataRoot`/`registryBundle`/`registryGlobal`).

`exams.json` 엔트리의 선택 필드 `pwaShortcuts`: 설치형 PWA의 앱 아이콘 롱프레스 shortcut 배열 — `build_exams_list.js`가 `manifest.<id>.webmanifest`의 `shortcuts`로 패스스루한다 (SPEC UX-PWA-06 — 시험 도메인 기능이라 시험별 매니페스트에만 선언, cosmetic의 '배합 계산기' `#/formula`가 유일 사례).

## 2단계 — 콘텐츠와 선언

### 필수 콘텐츠 교체

- `manifest.json` — `subjects`·`exams`·`integratedExam`을 실제 과목 구성으로. 선택 선언: `uiText`(뷰 라벨)·`synonyms`(주관식 유사어)·`analysis.wrongCauses`(오답 원인 분류 확장 — `key`·`label`·`advice` 배열, 미선언 시 기본 3종)·`searchDocs`(통합검색 대상 문서 — `[{file:'docs/x.md', title, subject?, kind?, feature?}]`, 미선언 시 교재·참조자료·문제은행·서사만 검색 — SPEC TS-18)
  - **표시 수치 정합**: `exams[].title`의 "N제"·`desc`의 "N과목/N문"은 `check:manifest`가 문제은행 `### Q` 실측과 대조 — 실제 수치로 갱신하거나 수치 표기를 생략 (scaffold 기본 문구는 샘플)
  - **uiText**: 플랫폼 마크업의 `data-uitext` 키 전수를 채워야 도메인 라벨이 cosmetic 전용 문구로 새지 않는다 — cosmetic `manifest.uiText` 블록을 복사해 문구만 교체하는 것이 키 목록 확보의 실질 경로 (`npm run check:uitext`가 누락 경고)
  - **문서 헤더**: `docs/*.md` 파일 상단에 `> **문서 ID**: DOC-XX-NN` + `> **범위**: exam:<id> · 판본: …` 헤더가 필수 (`check:docs` 강제 — 발번은 `docs/README.md` ID 레지스트리)
- `교재/`·`문제은행/` — 샘플 파일을 실제 MD로 교체. 작성 규약·참조자료 도출 방법론은 `TEXTBOOK_AUTHORING_GUIDE.md`가 정본 (§6 참조자료 기반 도출 — `scaffold:chapter`로 챕터 골격 생성 가능)
- `references.json` — 참조자료 메타데이터 SSOT (`pdf-registry.js`는 여기서 빌드 생성). 파일 내 `*Comment` 필드가 필드별 규약을 자기문서화한다. 필드 그룹:
  - **문서 레지스트리**: `referenceLaw`·`referenceFiles`·`referenceCommon`·`referenceIngredients`는 `{name,file,type,dir}` 엔트리 — `참조자료/<dir>/`의 물리 파일과 정합. `refDirs`는 디렉터리→파일 목록 선언 (PDF 미확보 시 ref_md 발췌본만 두고 comment 명기 — lossadj 선례)
  - **과목 귀속**: `subjectDirMap`(과목키→과목N)·`docSubjectRules`(ref_md 디렉터리명→과목 귀속 정규식 `[패턴, 과목번호, 사유]`, 첫 매칭 우선)·`multiSubjectDocs`(다과목 공동 인용 문서)·`subjectDefaultRefdoc`(과목별 기본 문서명)
  - **출처 매핑**: `sourceRefMap`·`keywordRefMap` — 본문 출처 표기·키워드를 refdoc PDF로 연결하는 정규식 규칙
  - **법령·고시 연동**: `lawRefs`(`content/lawdb.json`의 법령 id 목록 — 나열 순서가 매칭 우선순위)·`noticeCore`(고시 감시 기준 문서명)·`noticeIngredientDocs`(성분사전 '고시 확인' 대상 고시 subset — dictionary 시험용)
  - **검증 게이트**: `check:reflayout`(PDF↔ref_md↔references.json 4계층)·`check:refsubjects`(귀속 교차)·`check:reffresh`(PDF 해시 신선도)·`check:lawurls`(law.go.kr slug 실호출). `check_mfds_notice.py` 감시는 `lawRefs`→`referenceLaw`로 유도되는 문서에 lawdb `watch` 필드가 있을 때만 동작

### 시험 팩 파일 3분류

cosmetic의 모든 파일을 복사할 필요는 없다 — 필요한 분류의 파일만 배치하면 된다:

| 분류 | 파일 | 처리 |
|---|---|---|
| **필수** | `manifest.json`, `references.json`, `교재/`, `문제은행/` | 스캐폴더 생성 → 실제 콘텐츠로 교체 |
| **기능 콘텐츠** | `docs/*.md`, `knowledge/`, `number-drills/`, `limits-trainer.json`, `audiobook/`, `교재/glossary/` | 해당 `features` 플래그를 켤 때만 배치 — 아래 불변식 표 참조 |
| **도구 산출물** | `combo_blocklist.json`, `law_verified.json`, `notice_status.json`, `report/`, `html/` | **미리 만들지 않음** — 감사·변환 도구가 첫 실행 시 자동 기록 (`html/`은 ref-pipeline 산출로 gitignore) |

처리 도구도 선택이다 — `ref-pipeline`(PDF→ref_md)은 참조 PDF 보유 시, `check_mfds_notice.py`는 `referenceLaw` 설정 시, 오디오 생성은 `audiobook` 플래그 시에만 필요하다.

### 기능 플래그 (`exams.json` 엔트리의 `features`)

켜둔 플래그만 UI에 노출된다 (`data-feature` 게이팅). **유효 키는 코드 실측 기준** — `check:featflags`가 미선언 키 사용(죽은 경로)과 선언만 되고 미사용 키를 양방향 검증하므로, cosmetic 엔트리(`content/exams.json`)와 `hasFeature`/`data-feature` 사용처 grep이 키 목록의 실질 소스다. 미완성 시험은 `comingSoon: true`를 추가해 선택 UI 노출을 막는다 (lossadj 선례).

**플래그 ↔ 필수 문서 불변식**이 강제된다 — 플래그를 켰는데 `docs/`에 문서가 없으면 `check:docbundles --check`가 실패한다 (불변식 SSOT: `docs/dev/ARCHITECTURE.md` "시험별 문서 규약" 절):

| 플래그 | 필수 문서 | 기능 |
|---|---|---|
| `studyGuide` | `{contentRoot}/docs/학습안내서.md` | 대시보드 학습 안내서 카드 |
| `userManual` | `{contentRoot}/docs/user_manual.md` | 사이드바 사용자 매뉴얼 링크 |
| `formula` | `{contentRoot}/docs/formula_manual.md` | 실무 매뉴얼 링크 + Formula OS |
| `appendixDocs` | `{contentRoot}/docs/두음법_암기_총정리.md` | 부록 문서 |

문서가 없는 기능은 플래그를 선언하지 않는다. `docs/*.md`는 **존재 자체가 선언** — 번들 대상은 디렉터리 스캔으로 자동 결정된다 (단, `node tools/build/build_doc_bundles.js`를 별도 실행해 `docs_md/` 번들을 생성해야 한다 — `build:data` 체인에 미포함).

문서 외 플래그별 동반 산출물 (UI 토글만으로 산출물이 없는 플래그도 있다):

| 플래그 | 동반 산출물 | 비고 |
|---|---|---|
| `dictionary` | `manifest.knowledge` 스키마 + `knowledge/<registryKey>.json` | registryKey 미선언 시 `ingredients` 기본 경로 |
| `ingredients` | dictionary와 동일 knowledge 데이터 재사용 | 성분 훈련 서브뷰 등 |
| `calcPractice` | 없음 | 데일리 챌린지 계산 문항은 코드 난수 생성 |
| `limitsTrainer` | `limits-trainer.json` (contentRoot) | 수치 암기 훈련 마스터 |
| `audiobook` | `audiobook/mp3/**` + `npm run build:audio-manifest` | TTS 생성 파이프라인 별도 |
| `story_textbook` | `교재/<과목>/story/*_서사.md` + `chapters[].storyFile` + `npm run build:story` | 패치 문법은 STORY_PATCH_GUIDE.md |
| `semantic` | `npm run build:embeddings` → `embeddings/` | Python + sentence-transformers 필요 |
| `formula` 등 실무 피처 | `src/exams/<id>/`·`html/exams/<id>/`·`css/exams/<id>/` 도메인 자산 | 아래 "도메인 자산 규약" |
| `pomodoro` | 없음 | UI 토글 |

`practiceMode`·`examSwitch`는 exams.json에 선언하지 않는 **동적 판정 키** (app-shell 런타임 상태 — `check:featflags`의 DYNAMIC_KEYS).

**실무작업실 피처**(실습 도구 — cosmetic의 `formula`가 유일 사례): `features` 키 선언 외에 `src/practice-registry.js` 엔트리·뷰 파셜·storage 키 등 선언 접점이 필요하다 — 절차는 `docs/dev/ARCHITECTURE.md` "신규 실무 피처 추가 체크리스트" 참조 (ui-mode·router·app 코어 수정 불필요). **기존 피처를 새 시험에서 재사용하는 경우는 아래 "도메인 자산 규약"만 따르면 된다** — 플랫폼 코드 수정 없이 규약 경로에 파일을 배치하면 활성 시험 id로 자동 해석된다.

### 도메인 자산 규약 (`exams/<id>/`)

시험 전용 코드·마크업·스타일·테스트는 **활성 시험 id 아래 시험 무관 동일 상대 경로**에 둔다. 플랫폼 레지스트리는 `./exams/${getActiveExamId()}/…` 템플릿으로 해석하므로 시험 id가 플랫폼 코드에 남지 않는다:

| 자산 | 규약 경로 | 예시 (cosmetic) |
|---|---|---|
| 도메인 모듈·스토어 | `src/exams/<id>/` | `src/exams/cosmetic/formula-store.js` |
| 실무 뷰 모듈 | `src/exams/<id>/views/` | `src/exams/cosmetic/views/formula.js` |
| 뷰 마크업 파셜 (지연 주입) | `html/exams/<id>/` | `html/exams/cosmetic/formula.html` |
| 도메인 스타일 | `css/exams/<id>/` — 레지스트리 `styles` 필드로 `<link>` 지연 주입 | `css/exams/cosmetic/formula.css` |
| 도메인 테스트 | `tests/{unit,dom}/exams/<id>/` | `tests/unit/exams/cosmetic/formula-os.test.js` |

- **기존 피처 재사용** (예: 새 시험에서 `formula` 활성화): 위 경로에 같은 파일명으로 자산을 배치하고 `features.formula`를 선언하면 끝 — `_domainImport`/`_domainMarkup`이 활성 시험으로 해석하고, 유닛 테스트(`practice-registry.test.js` 규약 검증)가 feature 선언 시험마다 파일 실존을 강제한다
- **신규 피처 추가**: `practice-registry.js`에 엔트리 1건(시험 무관 상대 경로만 선언) + 규약 경로에 자산 배치 — 상세는 ARCHITECTURE "신규 실무 피처 추가 체크리스트"
- **회귀 게이트**: `check:domainmap`이 platform 파일의 `exams/<id>/` 경로 리터럴을 오류로 차단 — 하드코딩 대신 `_domainImport`/`_domainMarkup`·`getActiveExamId()` 사용

### UI 텍스트 (`manifest.uiText`)

- 플랫폼 마크업의 `data-uitext` 키를 시험별 문구로 치환
- `npm run check:uitext`가 data-uitext↔uiText 양방향 + platform 마크업의 시험 용어 잔존을 감사

### 편집 불필요 항목 (자동)

- `domain-map.json` — `check_domain_map.js`가 등록 시험의 `contentRoot`/`dataRoot`를 `domain:<id>` 규칙으로 자동 주입
- `data/exams.js` — `build:exams-list`가 exams.json에서 생성
- `data/exams/<id>/` 번들 — `build:data`가 전 시험 순회 생성
- 로컬 저장소 네임스페이스·클라우드 `exam_id` 분리 — `scopedKey`/`exam-context` 자동

## 3단계 — 빌드 → 커밋 → 검증 (순서 중요)

```powershell
npm.cmd run build:data                 # 1차 — data/exams/<id>/** · exams.js · manifest.<id>.webmanifest 생성
node tools/build/build_doc_bundles.js  # docs/*.md가 있다면 필수 — build:data 체인에 미포함
npm.cmd run build:data                 # 2차 — 신규 시험 registry.js·id_migration.js를 sw.js DATA_ASSETS에 반영
git add -A; git commit -m "content: <id> 시험 추가"   # 생성물 전부 커밋 (data/·manifest.<id>.webmanifest·sw.js 포함)
npm.cmd run check:content              # 콘텐츠 통합 검증
npm.cmd run check:all                  # lint·types·imports·html·docs·domainmap·uitext·specrefs·trace·테스트 일괄
```

> **왜 2회 빌드 + 커밋 후 검증인가**: `sw.js`의 DATA_ASSETS는 기본 시험(cosmetic) 빌드 패스에서만 재생성되고 "존재하는 번들만" 포함되므로, 신규 시험 첫 빌드에는 registry 번들이 아직 없어 누락된다 — 2차 빌드가 이를 반영한다. 그리고 `check:datafresh`는 생성물 경로에 미커밋·미추적 파일이 있으면 즉시 중단되므로(빌드 덮어쓰기로 사용자 변경 유실 방지), 검증은 반드시 생성물 커밋 **이후**에 실행한다.

주요 게이트와 잡는 결함:

| 게이트 | 잡는 결함 |
|---|---|
| `check:domainmap` | 미등록 시험 디렉터리, 미분류 신규 파일 |
| `check:uitext` | manifest에 없는 data-uitext, platform HTML의 시험명 잔존 |
| `check:docbundles` | 플래그↔문서 불변식 위반, 번들 신선도 |
| `check:manifest` | manifest 선언 ↔ 실제 파일 불일치 |
| `tests/unit/multi-exam-gates.test.js` | 게이트 자체 + 등록 시험 디렉터리 정합 |
| `tests/dom/exam-switching.dom.test.js` | 신규 시험 활성 시 게이팅·브랜딩·스코프 격리 |

**제거 롤백**: `npm.cmd run scaffold:exam -- <id> --remove` — 골격 전체 삭제 후 `check:all` 재실행.

## 4단계 — 커밋·배포

표준 절차와 동일: 커밋 → `npm run deploy` (배포 가드 → sw 스탬프 → vercel --prod). 상세는 `DEPLOYMENT_GUIDE.md`.

## 체크리스트

- [ ] `scaffold:exam` 실행 — exams.json 엔트리·디렉터리 트리 생성됨 (수동으로 `content/exams/<id>/`를 먼저 만들면 `check:domainmap`이 미등록 디렉터리로 실패 — 등록·생성이 원자적인 scaffold를 먼저)
- [ ] `manifest.json` 실제 과목·문항으로 교체 — title "N제"·desc 수치를 `### Q` 실측과 일치 (`check:manifest`)
- [ ] `exams.json` 엔트리 브랜딩 채움 — scaffold 기본값(desc 골격 문구·`logoSub:''`·기본 아이콘) 제거, 미완성이면 `comingSoon: true`
- [ ] `features` 플래그 = 보유 기능만 선언 (문서 불변식 충족) — `dictionary`면 knowledge 스키마·데이터 동반, `semantic`이면 build:embeddings 동반
- [ ] `manifest.uiText` 시험명·과목 라벨 채움 — `data-uitext` 키 전수 (cosmetic 블록 복사 후 교체)
- [ ] `docs/*.md` 상단에 `문서 ID`(레지스트리 발번) + `범위: exam:<id> · 판본` 헤더 기입
- [ ] `build:data` ×2회 + `build_doc_bundles.js` 실행 → **생성물 전부 커밋 후** `check:content`·`check:all` 통과 — domainmap·uitext·docbundles 오류 0
- [ ] `README.md` 등록 시험 목록 갱신 (현재 등록 열거는 수동 — 게이트 없음)
- [ ] DOM 시험 전환 테스트에서 새 시험 케이스 추가 검토 (`tests/dom/exam-switching.dom.test.js`) — 추가 시 `npm.cmd run stats:stamp` 수치 재스탬프 + 문서 동반(docsync) 필요
