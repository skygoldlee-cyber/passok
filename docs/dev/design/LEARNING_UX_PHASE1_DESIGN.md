# 학습 표면 단순화 Phase 1 — 복습 허브 통합 + 학습 루프 경계 문구화

> 상위 문서: [SPEC](../SPEC.md) §3.1·§3.11·§3.20 · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-21, Phase 0) · [USER_FLOW](USER_FLOW.md) §2
> **범위**: platform · 판본: none
> **상태**: 설계안 — 미구현
> **관련 SPEC ID**: 신규 `RV-02~04`(복습 허브 통합) · `UX-NAV-13`(뷰 목적 문구) · 기존 `RV-01`(복습 뷰) · `DR-04~05`(weak 드릴·취약 패널) · `TQ-01~05` · `UX-NAV-07~08`(딥링크·해시 규칙)
> **문서 ID**: DOC-DSN-22

## 1. 배경·목적

Phase 0에서 "오늘 할 일" 큐로 추천 발언권을 단일화했다(TQ-01~05). 잔여 혼란 원인은 **복습 진입점 분산**과 **뷰 성격 경계의 모호함**이다:

- 복습 성격의 표면이 6곳에 분산 — 복습 뷰(RV-01), 플래시카드 FSRS due, 훈련소 weak 드릴(DR-04), 훈련소 취약 진술 리뷰 패널(DR-05), 퀴즈 오답노트(Q-04), 대시보드 "오늘 복습" 카드
- 훈련소가 두 성격의 잡동사니 — 문제 풀이 계열(O/X·ㄱㄴㄷ·취약 리뷰, DR-01~07)과 보조 도구 계열(수치 암기·계산·원료 챌린지·뽀모도로, T-01~05·ND-01) 혼재
- 퀴즈·드릴·모의고사가 사용자 눈에 전부 "문제 풀기" — 진입 카드에 목적 구분 문구가 없음

Phase 1 목표: **"틀린 것·약한 것을 다시 보는" 활동은 복습 뷰 한 곳에 모으고**, 나머지 뷰는 목적 문구로 경계를 선명히 한다. 뷰 삭제·알고리즘 변경 없이 패널 이관과 진입점 정리로 완료한다.

## 2. 비목표

- **드릴 실행 패널 이관** — O/X·ㄱㄴㄷ 드릴의 진행 UI(`trainer-oxdrill-panel`·`trainer-combo-panel`)는 훈련소에 유지. 복습에서의 진입은 딥링크로 해결한다. 드릴 자체의 뷰 이관(훈련소 보조 도구화 완결)은 Phase 1.5로 유보 — 사용량 계측(Phase 2) 후 결정
- **훈련소 메뉴 재편** — 수치·계산·원료·뽀모도로 카드의 재배치·통합은 Phase 1.5
- **점진적 공개(표본 게이트)** — AN-04가 이미 "데이터 수집 중" 힌트를 제공. 탭 축소·기능 잠금 같은 구조적 게이팅은 계측 후 별도 설계
- **Pro 배지 수렴** — Phase 2 범위 유지
- **알고리즘 변경** — `getWeakStatements`·`getDueStatementSids`·FSRS·배분 계산은 그대로. 이동하는 것은 렌더 컨테이너와 진입점뿐

## 3. 복습 허브 통합 (RV-02~03)

### 3.1 취약 진술 리뷰 패널 → 복습 뷰 이관 (RV-02)

현재 `trainer-weak-panel`은 훈련소 서브패널이지만 내용은 오판 진술 목록·FSRS 복습 대상·졸업 진행 — 완전히 복습 성격이다.

| 항목 | 변경 |
|------|------|
| 마크업 | `html/views/trainer.html`의 `#trainer-weak-panel` 블록을 `html/views/review.html`로 이동 — id는 `review-weak-panel`로 개명해 소속 명확화. 내부 id(`weak-summary`·`weak-mastery`·`weak-list`·`weak-sim-*`)는 유지해 `renderWeakReview`·`toggleSimilarStmts` 재수술 최소화 |
| 진입 | `openWeakReview()` → `switchView('review-view', {scrollTop:true})` 후 패널 표시 + 섹션 스크롤. `gotoWeakReview()`는 그대로 `openWeakReview` 위임(시그니처·data-click 경로 불변 — AN-02 카드·TQ 큐 항목 무변경) |
| 나가기 | 패널 내 "나가기" 버튼 제거 — 복습 뷰는 독립 뷰라 서브패널 개념 없음. 패널은 뷰 내 `<details>` 접이식 섹션으로 전환(기본 펼침 — 목적 뷰의 핵심 콘텐츠) |
| 레거시 해시 | `#/trainer/weak` 도달 시 `gotoWeakReview()`로 리다이렉트해 `#/review`로 정규화 — 기존 북마크·이력 링크 보존. `TRAINER_SUB_SLUGS`에서 `weak` 엔트리 제거 |
| 훈련소 메뉴 | "취약 진술 리뷰" 카드를 제거하고, 자리에 "복습 뷰로 이동" 배너형 링크를 두지 않음 — 오히려 O/X 드릴 결과화면의 "취약 진술 리뷰" 버튼(`extraActions`, trainer-drills.js:265)도 복습 뷰로 연결되므로 훈련소 측 발견 경로는 유지 |
| 상태 | `state.trainer.activeSubView='weak'` 분기 삭제, `initTrainer()`의 weakPanel 참조 정리 |
| 배지 | `updateDueBadges()`의 `weak-due-badge` 타깃은 패널 이관과 함께 복습 뷰 배지로 이동 |

복습 뷰 구성(이관 후):

```
[헤더] 헷갈린 카드 N · [취약 진술 드릴] [헷갈린 집중 퀴즈] [모의고사] [인쇄]
[필터] 전체 | 과목1 | 과목2 ...
[오답·헷갈림 카드 목록] (RV-01 기존)
<details open>[취약 진술 리뷰] — 요약·마스터리·필터(all|due)·행 목록 (이관)</details>
```

### 3.2 복습 → 드릴 원클릭 진입 (RV-03)

복습 뷰 헤더에 "취약·복습 진술 O/X 드릴" 버튼을 추가한다 — 기존 `startOxDrill` `data-arg="weak"` 모드 재사용. 드릴 실행은 훈련소로 전환해 수행하고, 종료 화면의 `extraActions` 버튼("취약 진술 리뷰")은 이제 복습 뷰로 귀환해 왕복 동선을 완성한다.

| 규약 | 내용 |
|------|------|
| 노출 조건 | `getWeakStatements().length + getDueStatementSids().length > 0`일 때만 표시 — 없으면 숨김(기존 `is-hidden` 패턴) |
| 라벨 | 배지로 대상 수 표시 (`복습 대상 N개` — `updateDueBadges` 라벨 규약 재사용) |
| 해시 | 드릴 실행 시 기존 `#/trainer/oxdrill` 깊이 해시 규칙 유지 — 뒤로가기 시 드릴 메뉴가 아닌 **복습 뷰로 복귀**하도록 `switchView` 스택이 아닌 `history` 마커만 활용(기존 UX-NAV-08 규칙 그대로, 추가 분기 없음) |

### 3.3 설계 근거

- **진입점 통합 ≠ 실행 이관** — 취약 리뷰(읽기/점검 표면)는 복습으로, 드릴(실행 표면)은 훈련에 두는 비대칭이 자연스럽다: 리뷰는 상태 조회라 읽는 곳에, 드릴은 훈련이라 하는 곳에. 드릴 패널까지 옮기면 복습 뷰가 훈련 UI를 품어 다시 잡동사니가 된다
- **해시 보존** — `#/trainer/weak`를 리다이렉트로 처리해 외부 공유 링크와 뒤로가기 이력이 깨지지 않는다(UX-NAV-08 정신)
- **테스트 재배치** — `study-trainer-drills.dom.test.js`의 weak 블록(6건)은 대상 id만 바뀌고 로직은 동일 — `study-review.dom.test.js`로 이동해 "복습 뷰가 취약 리뷰를 렌더한다"를 단언

## 4. 학습 루프 경계 문구화 (UX-NAV-13, RV-04)

"배우기 → 연습하기 → 복습하기 → 평가하기" 4축을 진입 화면에 명시한다:

| 뷰 | 위치 | 문구 |
|----|------|------|
| 기출 퀴즈 | 설정 패널 상단 | "단원별로 골라 푸는 **연습** — 정답을 확인하며 개념을 다집니다" |
| 실전 모의고사 | 뷰 상단 설명 확장 | "**실전 평가** — 시간·과락 규칙 그대로 실력을 측정합니다. 연습은 기출 퀴즈에서" |
| 훈련소 | 메뉴 패널 상단 | "**반복 훈련** — 수치 암기·O/X 판정·배합 계산 등 정밀 훈련" |
| 복습 | 헤더 한 줄 | "**틀린 것과 약한 것**을 다시 확인하는 곳 — 카드·진술·문제를 한 화면에서" |

- 구현은 각 `html/views/*.html`의 정적 문구 1줄 + 필요시 `section-subtitle` 스타일 — 로직 변경 없음
- 매니페스트 `uiText`의 subtitle과 충돌하지 않도록 본문 문구로 둠(`check:uitext` 대상 아님)

## 5. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 |
|------|------|-----------|
| 1 | `#trainer-weak-panel` 마크업 → `html/views/review.html`로 이동·개명, details 섹션화 | `html/views/review.html` · `html/views/trainer.html` |
| 2 | `openWeakReview`/`gotoWeakReview`·`initTrainer`·해시 슬러그·레거시 리다이렉트 | `src/views/trainer-drills.js` · `src/views/trainer.js` · `src/views/navigation.js` |
| 3 | 복습 헤더에 weak 드릴 버튼 + 배지 타깃 이동 | `html/views/review.html` · `src/views/quiz.js`(renderReviewList) · `src/views/trainer-drills.js` |
| 4 | 4개 뷰 목적 문구 | `html/views/quiz.html` · `exam.html` · `trainer.html` · `review.html` |
| 5 | 테스트 — weak 블록 DOM 테스트 재배치 + 진입점·리다이렉트 케이스 (@spec RV-02~04, UX-NAV-13) | `tests/dom/study-review.dom.test.js` · `study-trainer*.dom.test.js` |
| 6 | SPEC `RV-02~04`·`UX-NAV-13` 행 + SCREEN_MAP(복습 뷰 상태·취약 패널 행 갱신) + 사용자 매뉴얼 §복습/§훈련소 + `build:html`·`build:trace` | 문서·생성물 |

## 6. 검증·수용 기준

- `gotoWeakReview` 호출 시 복습 뷰로 전환되고 취약 진술 섹션이 렌더된다 (DOM 테스트)
- `#/trainer/weak` 해시 진입·뒤로가기 시 `#/review`로 정규화 (DOM/E2E 테스트)
- 복습 뷰에서 weak 드릴 버튼이 대상 존재 시에만 노출되고 클릭 시 O/X weak 모드가 시작된다 (DOM 테스트)
- 훈련소 메뉴에 취약 리뷰 카드가 없고, 드릴 결과 화면의 "취약 진술 리뷰" 버튼이 복습 뷰로 이동한다 (DOM 테스트)
- `check:all` 전 단계 통과 — 특히 `check:html`(파셜 이동)·`check:uitext`·E2E `mobile-overflow` 무회귀

## 7. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| `#trainer/weak` 해시를 참조하는 외부 문서·북마크 | 리다이렉트로 보존, `initTrainer`의 해시 정규화보다 먼저 판정 |
| `weak-list` 등 id를 참조하는 다른 코드 잔존 | 전수 grep으로 참조 표 확정 후 이관 — `toggleSimilarStmts`의 `weak-sim-*` id는 패널 내부라 그대로 이동 |
| 복습 뷰가 무거워짐 (오답 카드 + 진술 목록 동시 렌더) | 취약 섹션은 `<details>` 접이식 + 최초 펼침 시 렌더(지연) 검토 — Phase 1은 기본 펼침으로 단순화, 성능 문제 시 지연 로딩으로 후속 |
| 기존 사용자가 훈련소 메뉴에서 취약 리뷰를 찾음 | whats-new 릴리스 노트에 이관 안내 1줄 + 드릴 결과 화면의 복습 복귀 버튼이 자연 유도 |
