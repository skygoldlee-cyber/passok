# 📏 문서 규약 (Documentation Conventions)

> **문서 ID**: DOC-DEV-08
> **범위**: platform · 판본: none
> **관련 SPEC ID**: DA-13 (도메인 자산 격리 — 본 규약의 문서판)
> **최종 업데이트**: 2026-10-13
> 상위 문서: [docs/README.md](README.md) (문서 인덱스·ID 레지스트리) · [AGENTS.md](../AGENTS.md) (작업 가이드) · [SPEC.md](dev/SPEC.md) (요구사항 원천)

본 문서는 저장소 문서의 **분류·명칭·배치·헤더·ID·생명주기** 규약의 단일 출처(SSOT)다. 기능 요구사항은 `SPEC.md`, 작업 절차는 `AGENTS.md`, 문서 목록은 `docs/README.md`가 각각 담당한다. 실제 배치가 규약과 어긋나면 규약이 정본이며 문서를 먼저 고친다 (Docs-First). 파생 문서(시험별 README 등)는 규약을 복제하지 않고 본 문서를 참조한다.

---

## 1. 문서 계층

```
docs/
├── README.md               ← 문서 인덱스 + 읽기 순서 + ID 레지스트리 (DOC-IDX)
├── DOC_CONVENTIONS.md      ← 본 문서 — 문서 규약 정본
├── dev/                    ← 플랫폼 공통 문서 (범위: platform)
└── exams/<id>/             ← 시험 종속 문서 (범위: exam:<id>)
```

- **도메인 격리**: 플랫폼 공통 ↔ 시험 종속 분리는 SPEC DA-13(도메인 자산 격리)의 문서판 반영 — 시험에만 의미 있는 문서를 `dev/`에 두지 않는다
- **docs/ 루트**에는 인덱스·규약·수위 문서만 둔다 — 주제 문서는 `dev/` 버킷으로
- 앱 내 문서(`content/exams/<id>/docs/`)는 `docs/`가 아니라 **콘텐츠 팩 소속** — `manual-viewer` 런타임 fetch 대상이며 갱신 후 `node tools/build/build_doc_bundles.js` 필수

## 2. 버킷 분류 (docs/dev/)

| 버킷 | 성격 | 판정 기준 | 예시 |
|------|------|-----------|------|
| `dev/` 수위 | 플랫폼 최상위 기준서·독립 산출물 | 특정 계열에 속하지 않는 단독 문서 | SPEC · ARCHITECTURE · CHANGES · TRACE_MATRIX · UIUX_외주전달_패키지 |
| `adr/` | 아키텍처 결정 기록 | 대안·트레이드오프 등 결정의 "왜" | `NNNN-slug.md` |
| `design/` | 설계 **의도** 문서 | "무엇을/왜 그렇게" — 설계안·가이드·계획·로드맵·흐름 명세 | SUPABASE_DESIGN · USER_FLOW · UIUX_DESIGN_GUIDE |
| `reference/` | **현행 구현** 기술 명세·참조 | "지금 어떻게 동작" — 화면 지도·로직 해설·환경·테스트 정책 | SCREEN_MAP · FLASHCARD_LOGIC · TESTING |
| `runbooks/` | 실행 절차 | "어떻게 수행" — 작업 순서·운영 체크리스트 | DEPLOYMENT_GUIDE · CONTENT_WORKFLOW |

**design ↔ reference 경계**: 의도·결정·계획은 design, 구현 사실의 기술은 reference다. 예 — `USER_FLOW`(흐름 계약=설계 의도)는 design, `SCREEN_MAP`(화면 인벤토리=현행 사실)는 reference.

## 3. 시험 종속 문서 (docs/exams/\<id\>/)

| 버킷 | 성격 |
|------|------|
| `design/` · `reference/` | dev/와 동일 분류 기준을 시험 범위에 적용 |
| `user/` | 학습자 대상 문서 (시험 공략·암기 정리) |
| `business/` | 사업 기획·시장 조사·마케팅 |
| `report_archive/` | 시점 스냅샷 보고서·대체된 전략/설계 원전 — **앱 런타임·콘텐츠 의존 금지** |
| `<id>/` 루트 | 분류 예외 — 하위 버킷에 넣을 수 없는 특수 문서 (현재 1건: `ingredients_audit_제2026-19호.md` — 앱 콘텐츠가 인용하는 refmat 스냅샷이라 아카이브 불가, 교재 비종속이라 reference 부적합) |

- **report_archive 계약**: 앱 런타임이 fetch하거나 `content/`·`data/` 번들(UI 표시 대상)이 경로를 인용하는 문서는 아카이브 금지. 소스 주석의 출처(provenance) 인용은 허용한다 — 아카이브 문서는 재이동하지 않아 경로가 고정되므로 설계 근거 추적에 유효 (선례: `src/study/recommendations.js`·`src/views/quiz/quiz-wrong-cause.js`의 FEATURE_PROPOSALS §4 인용, `src/exams/cosmetic/formula-rules.js`의 FORMULA_OS_DESIGN §9.3 인용). 대체된 설계 원전(`FORMULA_OS_DESIGN.md` 등)은 여기가 정위치다 — 명칭이 `*_DESIGN`이어도 배치가 우선
- 시험별 인덱스(`docs/exams/<id>/README.md`)는 본 규약의 시험 범위 파생본 — 규약 본문은 복제하지 않는다

## 4. 배치 판정 순서

1. **도메인** — 시험 종속이면 `exams/<id>/`, 플랫폼 공통이면 `dev/` (§1)
2. **역할** — §2·§3 표로 버킷 결정 (의도=design · 현행 기술=reference · 절차=runbooks · 결정=adr)
3. **생명주기** — 대체됐거나 시점 스냅샷이면 `report_archive/` (런타임·콘텐츠 참조 문서 제외 — §3 계약)
4. **예외** — 어느 버킷에도 못 넣으면 해당 루트에 두고 인덱스에 예외 사유를 명시

## 5. 명칭 규약

- 개발 문서는 ASCII `UPPER_SNAKE.md` 권장. 시험 종속 사업·리포트·가이드 문서는 한글 파일명 허용 (예: `맞춤형화장품판매업소_조사_2026-09.md`, `ingredients_audit_제2026-19호.md`)
- 파일명 접미사가 성격을 표시한다:

| 접미사 | 성격 | 버킷 |
|--------|------|------|
| `*_DESIGN.md` | 기능·시스템 설계안 | design/ |
| `*_DESIGN_GUIDE.md` | 재사용 설계 가이드·규약집 | design/ |
| `*_PLAN.md` · `*_ROADMAP.md` | 계획·로드맵 | design/ |
| `*_FLOW.md` | 흐름 명세·계약 | design/ |
| `*_MAP.md` | 지도·매핑표 | reference/ |
| `*_LOGIC.md` · `*_STRATEGY.md` | 로직 해설·전략 참조 | reference/ |
| `*_GUIDE.md` · `*_RUNBOOK.md` | 절차·지침·안내서 | runbooks/ (수행 절차) · reference/ (독자 안내 — 예: CODE_READING_GUIDE) |
| `NNNN-slug.md` | ADR (4자리 연속 채번) | adr/ |
| `README.md` | 디렉터리 인덱스 | 해당 디렉터리 루트 |

- 표에 없는 접미사·무접미사 명칭(`TESTING.md`·`DEV_ENVIRONMENT.md`·`PROJECT_STRUCTURE_TOUR.md` 등)은 §2 역할 판정으로 배치한다 — 접미사 표는 신규 명명 지침이며 기존 명칭의 소급 개명을 요구하지 않는다

- **배치가 명칭에 우선** — `*_DESIGN`이어도 대체된 원전은 report_archive/ 소속
- 생성물 접미사·경로: `*_이야기형.md`(`build:story`) · `data/**/docs_md/`(`build_doc_bundles`) · `docs/dev/TRACE_MATRIX.md`(`build:trace`) — **직접 편집 금지**, 생성 명령으로만 갱신

## 6. 헤더 메타데이터 규약

모든 문서 상단에 선언한다 — `check:docs`가 누락·중복·위치↔선언 일치를 기계 검증한다.

- `> **문서 ID**: DOC-XX-NN` — 필수, §7 채번
- `> **범위**: platform | exam:<id>` + `· 판본: none | textbook | refmat` — 판본은 갱신 트리거 선언: `textbook`=교재 교체 시 갱신 대상(`check:textbookdocs` 게이트), `refmat`=법령·고시 판본 변경 시 갱신 대상
- `> **관련 SPEC ID**: XX-NN, …` — 인용 ID 또는 `해당 없음 (사유)`
- `최종 업데이트`(또는 갱신일) 명시
- `> 상위 문서:`·`> 관련 문서:` 링크 권장
- **면제**: `ref_md/`·`교재/*.md`는 판본이 파일명·변환 파이프라인에 내재화돼 헤더 대상에서 제외

## 7. 문서 ID 체계

- 형식: `DOC-{영역}-{NN}` — 접두사는 문서 종류를 선언한다 (채번 레지스트리: `docs/README.md` §문서 ID 레지스트리)
- **접두사↔디렉터리 일치**: `DOC-DSN`=design/ · `DOC-REF`=reference/ · `DOC-RBK`=runbooks/ · `DOC-ADR`=adr/ · `DOC-ARC`=report_archive/ · `DOC-USR`=user/·앱 문서 · `DOC-BIZ`=business/ · `DOC-PPL`=ref-pipeline/. 수위 문서(`DOC-DEV`)·인덱스(`DOC-IDX`)·루트(`DOC-ROOT`)는 위치 무관
- 신규 문서는 해당 영역의 다음 번호를 채번하고 레지스트리에 등록한다. **ID 회수·재사용 금지** — 이력 보존
- 문서 이동으로 접두사가 버킷과 어긋나면 재채번하고 구 ID는 레지스트리에 이관 표기한다

## 8. 링크·인용 규약

- 링크는 상대 경로 (`../`, `dev/`, `exams/<id>/`) — 공백 파일명은 `%20` 인코딩
- 요구사항 인용은 SPEC ID(`XX-NN`) — **요구사항 ID의 원천은 SPEC.md뿐**이다. 문서 내부 규약 번호(예: `UIUX_DESIGN_GUIDE`의 EXP-1~6)는 허용하되 SPEC ID처럼 위장하지 않는다
- 소스 `@spec` 주석 ↔ 문서 SPEC ID 인용은 `build:trace`가 `TRACE_MATRIX.md`로 자동 연결
- Mermaid는 `securityLevel: 'strict'` + crypto nonce (인앱·GitHub 겸용 렌더링)

## 9. 생명주기

- **생성**: 헤더 선언 + ID 채번·레지스트리 등록 + `docs/README.md` 인덱스 행 + (시험 문서는 `exams/<id>/README.md` 갱신) + `CHANGES.md` 이력
- **갱신**: 최종 업데이트 표기 + 판본 선언에 따른 의무 — `판본: textbook` 문서는 교재 커밋 이후 미갱신 시 `check:textbookdocs`가 게이트
- **대체·아카이브**: 원전을 `report_archive/`로 이동하고 인덱스에 "대체됨 → 후속 문서" 표기. 앱 런타임·콘텐츠 참조 문서는 아카이브 불가 (§3 계약)
- **이동·삭제·개명**: 경로 참조 문서를 전수 갱신한다 — `README.md`·`AGENTS.md` 트리, `ARCHITECTURE.md` 트리·변경 매트릭스, `docs/README.md` 인덱스·레지스트리, 관련 런북. 마지막으로 `build:trace` 재생성
- **자동 생성 문서**는 생성 명령으로만 갱신 (§5 생성물 목록)

## 10. 검증 게이트 매핑

| 게이트 | 검증하는 규약 |
|--------|---------------|
| `check:docs` | 경로 참조 존재 · 문서 ID 누락/중복·범위/판본 헤더 · 디렉토리 인벤토리(AGENTS·ARCHITECTURE 트리↔실물) · npm 명령 정합 |
| `check:textbookdocs` | `판본: textbook` 문서 ↔ 교재 갱신 신선도 |
| `build:trace` + `check:trace` | SPEC↔문서↔@spec 연결 신선도 |
| pre-push `check:docsync` | 소스 변경 시 문서 동반 갱신 의무 |

## 11. 규약 변경 절차

1. 본 문서를 먼저 수정한다 (Docs-First)
2. 파생 선언(`docs/README.md`·`AGENTS.md`·`docs/exams/<id>/README.md`·런북)과의 충돌을 검사한다
3. `npm.cmd run check:docs` 통과 후 커밋 — `CHANGES.md`에 이력 기록
