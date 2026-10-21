# 학습 표면 단순화 설계 — "오늘 할 일" 단일 큐 + 네이밍·내비 정리 (Phase 0)

> 상위 문서: [SPEC](../SPEC.md) §3.1(대시보드) · §3.1.5(맞춤학습) · §3.20(캘린더·복습·드릴) · §4.8.1(네비게이션) · [USER_FLOW](USER_FLOW.md) §2(학습 루프)
> **범위**: platform · 판본: none
> **상태**: Phase 0·1·1.5 구현 완료 (TQ-01~05·UX-NAV-12·RV-02~03·UX-NAV-13~14·ROAD-P5) · Phase 2-a 계측 구현 (UX-GATE 판정은 측정 창 종료 후). Phase 1·1.5·2 설계는 2026-10-17 본 문서 하단 절로 통합 (구 DOC-DSN-22~24)
> **관련 SPEC ID**: 신규 `TQ-01~05`(오늘 할 일 큐) · `UX-NAV-12~14`(사이드바 그룹핑·뷰 목적 문구·훈련소 재편) · `RV-02~04`(복습 허브 통합) · `ROAD-P5`(Pro 안내 수렴) · `UX-MET-01~04`·`UX-GATE-01~03`(사용량 계측·유보 판정) · `ROAD-L5` · 기존 `D-11`(추천 엔진) · `D-08`(오늘 복습) · `AN-02`(진단 3카드) · `SC-08~13`(스마트학습 배분) · `RV-01`(복습 뷰) · `DR-01~02`·`DR-04~05`(훈련·weak 드릴·취약 패널) · `T-01~05` · `UX-NAV-07~08`(딥링크·해시 규칙) · `ROAD-P0`
> **문서 ID**: DOC-DSN-21

## 1. 배경·목적

학습 관련 뷰가 10개까지 늘면서 **"지금 뭘 해야 하는가"를 답하는 표면이 5개**로 분산됐다:

| 화면 | 자체 추천 로직 |
|---|---|
| 대시보드 | 오늘의 합격 전략(D-11) + 오늘 복습 수(D-08) + 약점 추천(D-10) + 일일 챌린지(D-07) |
| 맞춤학습 | 진단 3카드(AN-02) + 스마트학습 요약(SC-11) |
| 캘린더 | 계획 패널(SC-05~06) + 스마트학습 배분 칩(SC-08~13) |
| 복습 | 오답·헷갈림 통합 목록(RV-01) |
| 훈련소 | 취약 진술 리뷰 패널(DR-05) + weak 드릴(DR-04) |

여기에 유사 네이밍 3종(**스마트학습**=캘린더 배분 알고리즘 / **맞춤학습**=진단 뷰 / **스마트 훈련소**=훈련 뷰)과 6개의 복습 진입점이 겹쳐, 구독자는 "대시보드 추천과 스마트학습 칩이 같은 말인가"를 판단할 수 없다.

Phase 0의 목표는 **추천 발언권을 대시보드 "오늘 할 일" 큐 하나로 수렴**하고, 나머지 표면은 실행 장소·근거 표시로 역할을 좁히는 것이다. 뷰 삭제 없이 라우팅·딥링크·라벨만 재편해 회귀 리스크를 최소화한다.

## 2. 비목표

- **뷰 통합·삭제** — 취약 진술 패널의 복습 뷰 이관·훈련소 보조 도구화·점진적 공개(표본 게이트)는 Phase 1~2 후속 설계. 본 Phase 0는 큐·네이밍·내비 그룹핑만 다룬다.
- **추천·배분 알고리즘 변경** — `recommendations.js`(D-11)와 `computeSubjectAllocation`(SC-08)의 계산 로직은 그대로 두고, **노출 채널만 단일화**한다.
- **Pro 게이팅 변경** — `personal_analysis`·`mock_exam`·`study_plan_pro` 배지 노출 정책은 유지.
- **모바일 탭바 구성 변경** — 현행 5탭(대시보드·카드·퀴즈·사전·더보기) 유지. 시트 그룹핑은 이미 존재해 데스크톱과 정합화만 한다.

## 3. "오늘 할 일" 단일 큐 (TQ-01~05)

### 3.1 개념

대시보드 상단에 **우선순위 큐 카드**를 둔다. 모든 추천 소스의 출력을 번호 붙은 할 일 리스트로 병합하고, 각 항목은 실행 버튼으로 해당 뷰에 딥링크한다.

```
┌ 오늘 할 일 ──────────────── 시험까지 D-32 ─┐
│ 1. 복습 카드 18장 — 기한 도래        [풀기] │ → flashcard (FSRS due)
│ 2. 과목2 퀴즈 10문 — 이번 주 배정 잔여 [시작] │ → quiz (스마트학습 배분)
│ 3. 오답 재채점 6문 — 졸업까지 1회     [복습] │ → review
│ 4. 취약 진술 드릴 — 과목3 혼동쌍       [훈련] │ → trainer weak 모드
│ 모두 완료 시: "오늘 목표 달성 🎉" 스트릭 유지  │
└──────────────────────────────────────────┘
```

### 3.2 요구사양

| ID | 요구사양 |
|----|---------|
| TQ-01 | **단일 추천 원천** — `buildTodayQueue()`가 모든 추천 소스를 하나의 우선순위 리스트로 병합해 대시보드 최상단에 렌더. 대시보드의 기존 개별 추천 카드(D-10 약점 추천·D-11 합격 전략 카드)는 큐로 흡수되어 중복 노출하지 않음 |
| TQ-02 | **큐 소스 규칙** — 수집 순서: ① FSRS 기한 도래 카드 수(`getDueCards`) ② 스마트학습 이번 주 배정 잔여(`computeSubjectAllocation` 결과 − 실적, SC-13의 카드·퀴즈 병기 반영) ③ 오답 재채점 대상(review 목록 수) ④ 취약 진술·혼동쌍(DR-05 집계) ⑤ 일일 챌린지 미완료 시(D-07). 항목은 `{label, reason, count?, action}` 스키마, reason은 "왜 이게 우선인가" 한 줄 |
| TQ-03 | **실행 딥링크** — 큐 항목 버튼은 기존 진입 함수 재사용(`startSubjectStudy`·`gotoWeakReview`·review-view 전환 등) + `scrollTop: true` 액션 딥링크 규칙(UX-NAV-07) 준수. 신규 네비 분기 신설 금지 — UX-NAV-06 팔레트와 같은 재사용 원칙 |
| TQ-04 | **타 뷰 추천 축소** — 캘린더 스마트학습 칩·맞춤학습 진단 카드는 "오늘 할 일"을 재발언하지 않고 **배정 근거·진단 상세** 역할로 제한(배지·완료 상태 표시는 유지). 중복 카피("지금 이 과목을 하세요"류)는 큐 카피와 충돌하지 않게 근거 문구로 교체 |
| TQ-05 | **빈 상태·완료 상태** — 모든 소스가 비면 D-12 D-day 맥락의 다음 안내(목표 설정 유도 또는 "오늘 목표 달성")로 대체. 데이터 없는 신규 사용자는 기존 순서(시험일 설정 → 교재 1회독 → 카드 학습) 안내 항목을 큐로 표현해 온보딩과 연속성 확보 |

### 3.3 설계 근거

- **추천 로직은 합치지 않는다** — FSRS·스마트학습·오답 추적은 각각 정제된 도메인 로직. 큐는 "출력의 우선순위 집계"만 담당해 회귀 위험이 없고, 각 소스의 테스트가 그대로 유효하다.
- **기존 딥링크 자산 재사용** — `gotoWeakReview`(AN-02), `startSubjectStudy`(SC-09), `gotoSubjectAnalysis`(SC-11), `openSubjectSection`(AN-04)이 이미 존재해 큐의 실행 버튼은 조합만 하면 된다.
- **"번호 붙은 리스트" 선택 이유** — 카드 그리드보다 순서가 명시적이라 "다음에 뭘 할지" 모호성을 제거한다. 완료 시 사라지는 과제형 UI라 체크감도 제공.

## 4. 네이밍 정리

| 현재 | 변경 | 근거 |
|------|------|------|
| 맞춤학습 | **학습 진단** | 실제 내용이 분석·진단(AN-02~09) — "맞춤"은 마케팅어, 진단이 기능을 정확히 기술 |
| 스마트학습 | **주간 배분** | 캘린더 계획 패널의 속성으로 격하 — 진단 뷰와의 형제어 혼동 해소 |
| 스마트 훈련소 | **훈련소** | "스마트" 중복 제거 |

라벨 발생 지점: 네비 항목·뷰 제목(`getViewTitles`)·더보기 시트·온보딩 문구·학습안내서·`manifest.uiText`/`data-uitext` 커버리지(`check:uitext`가 정합 강제 — 라벨 변경 시 매니페스트·문서 동반 갱신 필요). `trackAction`의 액션 키(`personal_analysis` 등)는 내부 식별자라 **유지** — 표시 라벨만 바꿔 지표 연속성을 보존한다.

## 5. 사이드바 그룹핑 (UX-NAV-12)

`>900px` 사이드바에 모바일 더보기 시트와 동일한 3그룹 헤더 적용 — 대역 간 구조 일치로 "모바일에서 찾던 곳"과 "데스크톱"의 인지 차이 제거:

- **학습** — 대시보드 · 학습 진단 · 플래시카드 · 퀴즈
- **훈련 · 평가** — 훈련소 · 복습 · 모의고사
- **자료 · 도구** — 교재리더 · 교재검색 · 사전 · 캘린더

| 항목 | 규약 |
|------|------|
| 마크업 | 그룹 라벨은 `<p class="nav-group-label nav-study-only">` — 시트의 `more-sheet-label`과 동일 역할, 사이드바용 클래스 |
| 모드 연동 | 실무 모드에서는 그룹 라벨도 `nav-study-only`로 함께 숨김 — 빈 헤더 잔존 금지 (UM-02 패턴) |
| CSS | `nav-group-label`은 사이드바 폭·간격 토큰 사용, 탭바 영역에는 미적용(시트 라벨이 이미 존재) |
| 검증 | `check:uitext`의 data-uitext 매핑이 뷰 항목만 대상이면 라벨은 정적 텍스트로 유지 가능 — 매핑 규칙 확인 후 결정 |

## 6. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 |
|------|------|-----------|
| 1 | `buildTodayQueue()` 순수 로직 + 큐 카드 렌더 | `src/views/dashboard-queue.js`(신규) · `src/views/dashboard.js` |
| 2 | 기존 D-10·D-11 카드의 큐 흡수 + 타 뷰 중복 카피 정리 | `src/recommendations.js` · `src/views/analysis-view.js` · `src/views/study-calendar.js` |
| 3 | 라벨 정리 (진단/주간 배분/훈련소) | `src/views/navigation.js` · `index.template.html` · `content/exams/cosmetic/manifest.json`(uiText) · `content/exams/cosmetic/docs/학습안내서.md` |
| 4 | 사이드바 그룹 라벨 + CSS | `index.template.html` · `css/components.css` |
| 5 | 테스트 | `tests/unit/engine/today-queue.test.js` (큐 병합·우선순위·빈 상태 @spec TQ-01~05) · DOM 테스트 1건 |
| 6 | 문서·추적 | SPEC.md `TQ-01~05`·`UX-NAV-12` 행 + SCREEN_MAP 라벨 갱신 + `build:trace` |

## 7. 검증·수용 기준

- 큐 렌더 시 FSRS due·배정 잔여·오답·취약이 우선순위 순으로 병합되고, 각 항목 버튼이 기존 딥링크로 실행됨 (DOM 테스트)
- 라벨 변경 후 `check:uitext`·`check:manifest`·`check:docs` 통과, 온보딩·학습안내서 문구 일치
- 사이드바 그룹 라벨이 3대역(>900px·769~900px 상단바·≤768px 탭바+시트)에서 각각 의도대로 표시/숨김 — E2E `mobile-overflow` 스윕 무회귀
- `check:all` 전 단계 통과 + SPEC `TQ-01~05`·`UX-NAV-12`의 @spec 테스트 참조 존재(갭 기준선 0)

## 8. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| 라벨 변경이 기존 사용자의 위치 기억을 깨뜨림 | `whats-new` 모달로 변경 안내 — 아이콘·순서 유지로 시각 재식별 지원 |
| 큐 흡수로 D-10·D-11 카드가 비어 대시보드 밀도 저하 | 큐는 카드 영역을 대체 — 통계 그리드·히트맵 등 정보 표면은 그대로 유지 |
| 타 뷰 "근거 전환"의 카피 축소가 기능 발견성을 해침 | 큐 항목의 reason에 근거 한 줄을 포함해 연결 문맥 보존 |
| `study_plan_pro` 등 Pro 표기는 라벨과 별개 | feature-plan 키·배지 텍스트는 유지, 표시 라벨만 교체 |

---

## 학습 표면 단순화 Phase 1 — 복습 허브 통합 + 학습 루프 경계 문구화

> 상위 문서: [SPEC](../SPEC.md) §3.1·§3.11·§3.20 · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-21, Phase 0) · [USER_FLOW](USER_FLOW.md) §2
> **범위**: platform · 판본: none
> **상태**: 설계안 — 미구현
> **관련 SPEC ID**: 신규 `RV-02~04`(복습 허브 통합) · `UX-NAV-13`(뷰 목적 문구) · 기존 `RV-01`(복습 뷰) · `DR-04~05`(weak 드릴·취약 패널) · `TQ-01~05` · `UX-NAV-07~08`(딥링크·해시 규칙)
> 원본 문서: `LEARNING_UX_PHASE1_DESIGN.md` — 구 DOC-DSN-22 (2026-10-17 본 문서로 통합)

### 1. 배경·목적

Phase 0에서 "오늘 할 일" 큐로 추천 발언권을 단일화했다(TQ-01~05). 잔여 혼란 원인은 **복습 진입점 분산**과 **뷰 성격 경계의 모호함**이다:

- 복습 성격의 표면이 6곳에 분산 — 복습 뷰(RV-01), 플래시카드 FSRS due, 훈련소 weak 드릴(DR-04), 훈련소 취약 진술 리뷰 패널(DR-05), 퀴즈 오답노트(Q-04), 대시보드 "오늘 복습" 카드
- 훈련소가 두 성격의 잡동사니 — 문제 풀이 계열(O/X·ㄱㄴㄷ·취약 리뷰, DR-01~07)과 보조 도구 계열(수치 암기·계산·원료 챌린지·뽀모도로, T-01~05·ND-01) 혼재
- 퀴즈·드릴·모의고사가 사용자 눈에 전부 "문제 풀기" — 진입 카드에 목적 구분 문구가 없음

Phase 1 목표: **"틀린 것·약한 것을 다시 보는" 활동은 복습 뷰 한 곳에 모으고**, 나머지 뷰는 목적 문구로 경계를 선명히 한다. 뷰 삭제·알고리즘 변경 없이 패널 이관과 진입점 정리로 완료한다.

### 2. 비목표

- **드릴 실행 패널 이관** — O/X·ㄱㄴㄷ 드릴의 진행 UI(`trainer-oxdrill-panel`·`trainer-combo-panel`)는 훈련소에 유지. 복습에서의 진입은 딥링크로 해결한다. 드릴 자체의 뷰 이관(훈련소 보조 도구화 완결)은 Phase 1.5로 유보 — 사용량 계측(Phase 2) 후 결정
- **훈련소 메뉴 재편** — 수치·계산·원료·뽀모도로 카드의 재배치·통합은 Phase 1.5
- **점진적 공개(표본 게이트)** — AN-04가 이미 "데이터 수집 중" 힌트를 제공. 탭 축소·기능 잠금 같은 구조적 게이팅은 계측 후 별도 설계
- **Pro 배지 수렴** — Phase 2 범위 유지
- **알고리즘 변경** — `getWeakStatements`·`getDueStatementSids`·FSRS·배분 계산은 그대로. 이동하는 것은 렌더 컨테이너와 진입점뿐

### 3. 복습 허브 통합 (RV-02~03)

#### 3.1 취약 진술 리뷰 패널 → 복습 뷰 이관 (RV-02)

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

#### 3.2 복습 → 드릴 원클릭 진입 (RV-03)

복습 뷰 헤더에 "취약·복습 진술 O/X 드릴" 버튼을 추가한다 — 기존 `startOxDrill` `data-arg="weak"` 모드 재사용. 드릴 실행은 훈련소로 전환해 수행하고, 종료 화면의 `extraActions` 버튼("취약 진술 리뷰")은 이제 복습 뷰로 귀환해 왕복 동선을 완성한다.

| 규약 | 내용 |
|------|------|
| 노출 조건 | `getWeakStatements().length + getDueStatementSids().length > 0`일 때만 표시 — 없으면 숨김(기존 `is-hidden` 패턴) |
| 라벨 | 배지로 대상 수 표시 (`복습 대상 N개` — `updateDueBadges` 라벨 규약 재사용) |
| 해시 | 드릴 실행 시 기존 `#/trainer/oxdrill` 깊이 해시 규칙 유지 — 뒤로가기 시 드릴 메뉴가 아닌 **복습 뷰로 복귀**하도록 `switchView` 스택이 아닌 `history` 마커만 활용(기존 UX-NAV-08 규칙 그대로, 추가 분기 없음) |

#### 3.3 설계 근거

- **진입점 통합 ≠ 실행 이관** — 취약 리뷰(읽기/점검 표면)는 복습으로, 드릴(실행 표면)은 훈련에 두는 비대칭이 자연스럽다: 리뷰는 상태 조회라 읽는 곳에, 드릴은 훈련이라 하는 곳에. 드릴 패널까지 옮기면 복습 뷰가 훈련 UI를 품어 다시 잡동사니가 된다
- **해시 보존** — `#/trainer/weak`를 리다이렉트로 처리해 외부 공유 링크와 뒤로가기 이력이 깨지지 않는다(UX-NAV-08 정신)
- **테스트 재배치** — `study-trainer-drills.dom.test.js`의 weak 블록(6건)은 대상 id만 바뀌고 로직은 동일 — `study-review.dom.test.js`로 이동해 "복습 뷰가 취약 리뷰를 렌더한다"를 단언

### 4. 학습 루프 경계 문구화 (UX-NAV-13, RV-04)

"배우기 → 연습하기 → 복습하기 → 평가하기" 4축을 진입 화면에 명시한다:

| 뷰 | 위치 | 문구 |
|----|------|------|
| 기출 퀴즈 | 설정 패널 상단 | "단원별로 골라 푸는 **연습** — 정답을 확인하며 개념을 다집니다" |
| 실전 모의고사 | 뷰 상단 설명 확장 | "**실전 평가** — 시간·과락 규칙 그대로 실력을 측정합니다. 연습은 기출 퀴즈에서" |
| 훈련소 | 메뉴 패널 상단 | "**반복 훈련** — 수치 암기·O/X 판정·배합 계산 등 정밀 훈련" |
| 복습 | 헤더 한 줄 | "**틀린 것과 약한 것**을 다시 확인하는 곳 — 카드·진술·문제를 한 화면에서" |

- 구현은 각 `html/views/*.html`의 정적 문구 1줄 + 필요시 `section-subtitle` 스타일 — 로직 변경 없음
- 매니페스트 `uiText`의 subtitle과 충돌하지 않도록 본문 문구로 둠(`check:uitext` 대상 아님)

### 5. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 |
|------|------|-----------|
| 1 | `#trainer-weak-panel` 마크업 → `html/views/review.html`로 이동·개명, details 섹션화 | `html/views/review.html` · `html/views/trainer.html` |
| 2 | `openWeakReview`/`gotoWeakReview`·`initTrainer`·해시 슬러그·레거시 리다이렉트 | `src/views/trainer-drills.js` · `src/views/trainer.js` · `src/views/navigation.js` |
| 3 | 복습 헤더에 weak 드릴 버튼 + 배지 타깃 이동 | `html/views/review.html` · `src/views/quiz.js`(renderReviewList) · `src/views/trainer-drills.js` |
| 4 | 4개 뷰 목적 문구 | `html/views/quiz.html` · `exam.html` · `trainer.html` · `review.html` |
| 5 | 테스트 — weak 블록 DOM 테스트 재배치 + 진입점·리다이렉트 케이스 (@spec RV-02~04, UX-NAV-13) | `tests/dom/study/study-review.dom.test.js` · `study-trainer*.dom.test.js` |
| 6 | SPEC `RV-02~04`·`UX-NAV-13` 행 + SCREEN_MAP(복습 뷰 상태·취약 패널 행 갱신) + 사용자 매뉴얼 §복습/§훈련소 + `build:html`·`build:trace` | 문서·생성물 |

### 6. 검증·수용 기준

- `gotoWeakReview` 호출 시 복습 뷰로 전환되고 취약 진술 섹션이 렌더된다 (DOM 테스트)
- `#/trainer/weak` 해시 진입·뒤로가기 시 `#/review`로 정규화 (DOM/E2E 테스트)
- 복습 뷰에서 weak 드릴 버튼이 대상 존재 시에만 노출되고 클릭 시 O/X weak 모드가 시작된다 (DOM 테스트)
- 훈련소 메뉴에 취약 리뷰 카드가 없고, 드릴 결과 화면의 "취약 진술 리뷰" 버튼이 복습 뷰로 이동한다 (DOM 테스트)
- `check:all` 전 단계 통과 — 특히 `check:html`(파셜 이동)·`check:uitext`·E2E `mobile-overflow` 무회귀

### 7. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| `#trainer/weak` 해시를 참조하는 외부 문서·북마크 | 리다이렉트로 보존, `initTrainer`의 해시 정규화보다 먼저 판정 |
| `weak-list` 등 id를 참조하는 다른 코드 잔존 | 전수 grep으로 참조 표 확정 후 이관 — `toggleSimilarStmts`의 `weak-sim-*` id는 패널 내부라 그대로 이동 |
| 복습 뷰가 무거워짐 (오답 카드 + 진술 목록 동시 렌더) | 취약 섹션은 `<details>` 접이식 + 최초 펼침 시 렌더(지연) 검토 — Phase 1은 기본 펼침으로 단순화, 성능 문제 시 지연 로딩으로 후속 |
| 기존 사용자가 훈련소 메뉴에서 취약 리뷰를 찾음 | whats-new 릴리스 노트에 이관 안내 1줄 + 드릴 결과 화면의 복습 복귀 버튼이 자연 유도 |

---

## 학습 표면 단순화 Phase 1.5 — 훈련소 메뉴 재편 + Pro 안내 수렴

> 상위 문서: [SPEC](../SPEC.md) §3.11·§3.20 · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-22, Phase 1) · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-21, Phase 0)
> **범위**: platform · 판본: none
> **상태**: 구현 완료 (UX-NAV-14·ROAD-P5 — `tests/dom/misc/pro-notice.dom.test.js`·`study-trainer.dom.test.js`)
> **관련 SPEC ID**: 신규 `UX-NAV-14`(훈련소 메뉴 그룹핑) · `ROAD-P5`(Pro 안내 수렴) · 기존 `T-01~05` · `DR-01~02` · `ROAD-P0`
> 원본 문서: `LEARNING_UX_PHASE15_DESIGN.md` — 구 DOC-DSN-23 (2026-10-17 본 문서로 통합)

### 1. 배경·목적

Phase 1까지 복습 허브 통합(RV-02~04)과 뷰 경계 문구화(UX-NAV-13)를 완료했다. Phase 1.5는 Phase 1 설계 §2에서 유보한 **훈련소 메뉴 재편**과, 계측 없이 UX 판단으로 결정 가능한 **Pro 안내 수렴** 두 가지를 처리한다.

#### 훈련소 메뉴 현황

Phase 1 이후 메뉴 카드는 5장으로 정리됐으나, 성격이 다른 두 계열이 한 그리드에 평탄 나열된다:

- **기출·진술 기반 드릴**: O/X 판정 드릴(DR-01), ㄱㄴㄷ 조합 훈련(DR-02) — 기출 문항을 분해·변환한 문제 판정 훈련
- **생성형·실무 훈련**: 핵심 수치 암기(빈칸 4지선다, 난수 출제), 원료 배합 계산 연습기(T-01/05, 난수 생성), 원료 안전성 챌린지(T-02, 성분 분류)

사용자 관점에서 두 계열은 목적이 다르다 — 전자는 "기출 유형에 익숙해지기", 후자는 "시험과 무관하게 실무·암기 능력 다지기". 그룹 라벨 없이 나열되면 "이 중 뭘 해야 하지?"라는 선택 혼란이 남는다.

#### Pro 안내 현황

`feature-plan.json`에서 현재 `pro` 키는 5개(story_textbook·personal_analysis·cloud_sync·audiobook·study_plan_pro). 각 Pro 기능의 첫 진입 시 `proFeatureNotice()`가 기능별 seen 플래그로 개별 모달을 표시한다 — 신규 사용자는 최대 4~5개의 "Pro 기능 안내" 모달을 서로 다른 시점에 순차로 만난다. 내용은 사실상 동일(Pro 예정 + 현재 무료 + 플랜 비교 버튼)이라 반복 노출은 피로만 유발한다.

### 2. 비목표

- **드릴 실행 패널 이관**(oxdrill·combo 패널의 뷰 이동) — DOC-DSN-22 §2 그대로 유보. 본 Phase는 메뉴 표면 재편만
- **점진적 공개·표본 게이트** — 계측 데이터 없이 결정하지 않음 (Phase 2)
- **Pro 기능 게이팅 변경** — 접근 차단·entitlement 검증(ROAD-P1) 없음. 안내 노출 전략만 변경
- **카드 추가·삭제** — 5장 그대로, 그룹핑과 순서만

### 3. 훈련소 메뉴 2그룹 재편 (UX-NAV-14)

`trainer-menu-grid`를 두 그룹 섹션으로 분할한다:

| 그룹 | 라벨 | 카드 (순서) |
|------|------|------------|
| A | **기출 드릴** — 기출 문항 분해·변환 | O/X 판정 드릴 → ㄱㄴㄷ 조합 훈련 |
| B | **암기·실무 훈련** — 생성형 문항·계산 | 핵심 수치 암기 → 원료 안전성 챌린지 → 원료 배합 계산 |

구현 규약:

- 마크업: `html/views/trainer.html`에서 기존 `.trainer-menu-grid`를 `.trainer-menu-group` 2개로 분할, 각 그룹 앞에 `.trainer-group-label`(제목+한 줄 설명) 정적 마크업. UX-NAV-12의 `.nav-group-label`과 동일한 "그룹 라벨" 시각 패턴 적용
- 카드 DOM·`data-click`·`data-feature`·배지 id(`oxdrill-due-badge`·`combo-due-badge`) 불변 — 이동만 수행, JS 재배선 없음
- 기출 드릴 그룹을 상단에 배치 — 학습 루프상 "기출 판정"이 시험 대비 직접 동선. 수치 암기·계산은 보조
- 카드 설명 문구 미세 조정 허용(그룹 라벨과 중복되는 설명 생략) — 단 카드 제목·핵심 설명은 유지
- `check:uitext`: 그룹 라벨은 본문 정적 텍스트(기존 `.view-purpose`와 동일 원칙 — manifest uiText 비대상)

### 4. Pro 안내 수렴 (ROAD-P5)

#### 4.1 기능별 첫 진입 모달 → 전역 1회 수렴

`proFeatureNotice()`의 seen 플래그를 기능별 키에서 전역 단일 키로 수렴한다:

| 항목 | 현재 | 변경 |
|------|------|------|
| seen 키 | `PRO_NOTICE_SEEN` 맵의 기능별 키 (`{story_textbook: t, ...}`), 시험별 스코프 | 동일 맵의 `_global` 단일 키 + 키를 `GLOBAL_KEYS`로 승격(플랜 안내는 시험 무관 사용자 수준 — `pro_entitled`·`usage_stats`와 같은 분류) |
| 표시 조건 | 기능별 첫 진입 | **최초 Pro 기능 진입 1회만** — 이후 어떤 Pro 기능·다른 시험을 만나도 모달 없음 |
| 모달 문구 | `<기능명>은(는) Pro 버전에서…` | 첫 진입 기능명을 인자로 받되, "PRO 배지가 붙은 기능은 Pro에서 제공 예정 — 현재 무료 체험"으로 일반화 문구 |
| 마이그레이션 | — | 레거시 시험 스코프 seen(`<exam>:pro_notice_seen`)은 고아 키가 되어 도달 불가 — 기존 사용자도 최대 1회의 전역 안내를 마지막으로 받고 종료(수용 가능: 이후 영구 비노출). 새 `_global` 규약 아래 저장된 맵에 비-`_global` 키가 있으면 seen으로 간주하는 방어 판정 유지 |
| 플랜 비교 버튼 | 각 모달에 포함 | 동일하게 유지 |

호출부 시그니처 `proFeatureNotice(featureKey, featureName)`는 유지 — 내부에서 `isProFeature(featureKey)` 판정 후 `_global` seen 검사. 호출부 9곳 재배선 없음.

#### 4.2 PRO 배지 클릭 → 플랜 비교 단일 경로

현재 PRO 배지는 장식적 `<span>`이다. 클릭 가능하게 만들어 `showPlanCompare()`로 직행시킨다:

- `refreshProBadges()`에서 배지에 `role="button"`·`tabindex="0"`·커서 스타일 부여 + 클릭/Enter 시 `showPlanCompare()` 호출 (위임 리스너 또는 직접 바인딩 — `data-click` 체계에 `openPlanCompare` 신규 액션 등록해 기존 클릭 위임 활용)
- 배지의 title 툴팁 문구를 "Pro 제공 예정 — 눌러서 플랜 비교 보기"로 갱신

#### 4.3 설계 근거

- **반복 안내는 정보가 아니라 노이즈** — 내용이 동일한 모달이 기능별로 다시 뜨는 것은 "Pro 예정" 사실의 학습이 아니라 팝업 피로. 전역 1회 + 배지 클릭 자기주도 경로가 더 적은 방해로 같은 정보를 전달한다
- **seen 마이그레이션** — 기존 사용자는 이미 최소 1회 안내를 봤으므로 재노출하지 않는다. 맵 구조를 유지해 코드 회귀 없이 `_global` 키만 추가
- **호출부 불변** — 기능별 featureKey 인자는 판정(`isProFeature`)과 문구 인자로 계속 유효. 9곳 호출부 수정 없이 정책만 교체

### 5. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 |
|------|------|-----------|
| 1 | 훈련소 메뉴 2그룹 마크업 + 그룹 라벨 스타일 | `html/views/trainer.html` · `css/study.css` |
| 2 | `proFeatureNotice` 전역 seen 수렴 + 배지 클릭 → `openPlanCompare` | `src/pro-upgrade.js` · `src/app.js`(data-click 등록) |
| 3 | 테스트 — 메뉴 그룹 구조 DOM 단언 + notice 전역 seen·배지 클릭 단언 (@spec UX-NAV-14, ROAD-P5) | `tests/dom/study/study-trainer.dom.test.js` · 신규 `tests/dom/misc/pro-notice.dom.test.js` |
| 4 | SPEC `UX-NAV-14`·`ROAD-P5` 행 + SCREEN_MAP + 사용자 매뉴얼 §훈련소 + CHANGES + `build:html`·`build:trace` | 문서·생성물 |

### 6. 검증·수용 기준

- 훈련소 메뉴가 2개 그룹 라벨 아래 카드를 나열하고, 모든 카드의 `data-click`·배지가 기존대로 동작한다 (DOM 테스트)
- Pro 기능 첫 진입 시 안내 모달 1회 표시, 이후 다른 Pro 기능 진입 시 재표시 없음 (DOM 테스트 — seen `_global`)
- 기존 seen 데이터(기능별 키)가 있는 사용자에게 모달이 재노출되지 않음 (마이그레이션 단언)
- PRO 배지 클릭/Enter 시 플랜 비교 모달 표시 (DOM 테스트)
- `check:all` 전 단계 통과 — `check:html`(파셜 변경)·`check:plan`(플랜 키 불변)·E2E mobile-overflow 무회귀

### 7. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| seen 맵 스키마 변경으로 기존 사용자 재노출 | `_global` 키 추가 방식 + 임의 키 존재 시 global로 간주하는 마이그레이션 단언 테스트 |
| 배지 클릭화가 카드 `data-click`과 버블 충돌 (배지가 카드 내부에 있음 — `trainer-menu-card` 안의 PRO 배지) | 배지 클릭 핸들러에서 `stopPropagation` — 카드 본래 액션(드릴 시작) 오발 방지. DOM 테스트로 배지 클릭이 카드 액션을 실행하지 않음을 단언 |
| 그룹 라벨 추가로 훈련소 메뉴 세로 길이 증가 | 모바일 뷰포트에서 mobile-overflow E2E가 실측 — 카드 수 불변이라 위험 낮음 |
| "전역 1회"로 개별 기능의 Pro 소속 인지가 약해짐 | 모달 문구에 첫 진입 기능명 포함 + 배지 자체가 항상 표시되어 기능별 소속은 배지가 담당 |

---

## 학습 표면 단순화 Phase 2 — 사용량 계측 보강 + 유보 결정 트리거

> 상위 문서: [SPEC](../SPEC.md) §3.11·§3.20·§7.6 · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-23, Phase 1.5) · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-22, Phase 1) · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-21, Phase 0)
> **범위**: platform · 판본: none
> **상태**: Phase 2-a 계측 구현 (2026-10-13) — UX-GATE 판정은 측정 창 종료 후
> **관련 SPEC ID**: `UX-MET-01~04`, `UX-GATE-01~03`(신규) · `ROAD-L5`, `TQ-01~05`, `RV-02~03`, `DR-01~02`, `DR-04~05`, `UX-NAV-12~14`, `ROAD-P5`(기존)
> 원본 문서: `LEARNING_UX_PHASE2_DESIGN.md` — 구 DOC-DSN-24 (2026-10-17 본 문서로 통합)

### 1. 배경·목적

Phase 0~1.5에서 학습 표면 정리가 완료됐다 — "오늘 할 일" 단일 큐(TQ-01~05), 복습 허브 통합(RV-02~04), 뷰 경계 문구화(UX-NAV-13), 훈련소 메뉴 2그룹(UX-NAV-14), Pro 안내 수렴(ROAD-P5). 남은 것은 **구조적 축소·이관 결정**인데, 이들은 전 Phase에서 일관되게 "계측 데이터 없이 결정하지 않음"으로 유보됐다:

| 유보 항목 | 유보 출처 |
|-----------|-----------|
| 드릴 실행 패널 이관 (oxdrill·combo 패널의 뷰 이동 — 훈련소 보조 도구화 완결) | DOC-DSN-22 §2 |
| 점진적 공개·표본 게이트 (저사용 표면의 접힘·탭 축소·기능 잠금) | DOC-DSN-21 §2 · DOC-DSN-22 §2 · DOC-DSN-23 §2 |
| PRO 배지 수렴 잔여 판정 (ROAD-P1 착수 근거 보강) | DOC-DSN-22 §2 |

문제는 **결정에 필요한 데이터를 모으는 계측 자체가 아직 없다**는 것이다. 기존 `usage-stats.js`(ROAD-L5)는 유료가치 판정 지표(`VALUE_ACTIONS` — 오답 루프·진단·이야기형 등) 위주로 구성돼 있고, Phase 2 결정에 필요한 표면 진입 지표 — 드릴 시작 경로·큐 항목 실행·취약 리뷰 개방·훈련소 카드별 진입·PRO 배지 클릭 — 는 계측되지 않는다.

Phase 2의 목표는 **축소 결과가 아니라 "축소를 결정할 수 있는 상태"를 만드는 것**이다:

1. 결정용 계측 지표를 `trackAction` 확장으로 보강한다 (스키마 변경 없이 키 추가)
2. 로컬 전용 계측의 회수 경로(내보내기)와 표본 기준을 정의한다
3. 유보 항목별 판정 트리거를 선언해, 데이터가 모이면 설계 논쟁 없이 판정할 수 있게 한다

### 2. 비목표

- **구조적 축소·이관의 실행** — 뷰 제거·탭 축소·기능 잠금·드릴 패널 이관은 트리거 충족 후 별도 설계·구현. 본 Phase는 계측과 트리거 정의만 다룬다
- **외부 전송·서버 수집** — ROAD-L5의 로컬 전용 원칙(localStorage만, 백업·동기화 제외) 유지. 회수는 사용자 자발적 내보내기 경로뿐이다
- **추천·배분 알고리즘 변경** — 큐 소스·FSRS·배분 계산 불변
- **저장 스키마 변경** — `usage_stats`의 `actions` 맵에 키만 추가. 마이그레이션 불필요 (기존 데이터 그대로 유효)

### 3. 계측 지표 정의 (UX-MET-01~04)

#### 3.1 표면 진입 계측 (UX-MET-01)

기존 `trackAction(key)` 시그니처를 재사용하고, 결정 지표별 호출부에 키를 추가한다:

| 액션 키 | 발생 지점 | 판정 연결 |
|---------|-----------|-----------|
| `tq_run:<click>` | `#weak-subject-recommendation` 컨테이너 내 `[data-click]` 클릭 — `initUsageMetrics()`의 문서 단 위임 리스너가 `data-click` 디스패치와 **별개로** 계측만 수행 (디스패치 로직 미수정) | 큐 실사용률 — TQ-01 효과 검증 |
| `oxdrill_start:<mode>` | `startDrill('ox', …)` 진입 — mode = `weak`·`num`·과목번호 | UX-GATE-01 |
| `combo_start:<mode>` | `startComboDrill` 진입 — mode = `weak`·`num`·과목번호 | UX-GATE-01 |
| `drill_from_review` | `gotoOxDrill` 진입 — 복습 뷰·취약 리뷰 행 발 드릴 진입 전용 경로 | UX-GATE-01의 분모·분자 |
| `review_weak_open` | `#review-weak-panel` `<details>` toggle 이벤트에서 `open=true`일 때만 | UX-GATE-01 (리뷰 표면 활성도) |
| `trainer_menu:<click>` | 훈련소 메뉴 카드 위임 클릭 — `openOxDrillSetup`·`openComboDrillSetup`·`startLimitsTrainer`·`startIngredientsChallenge`·`startCalcPractice` | UX-GATE-02 (카드별 사용 분포) |

구현 규약:

- **위임 리스너는 계측만 한다** — 표면 클릭 계측은 `initUsageMetrics()`(`usage-stats.js`)가 문서 단에 설치하는 단일 위임 리스너로 통합하고, `setupEventListeners()`(`event-listeners.js`)에서 `bindDelegation` 직후 1회 설치한다. 기존 `data-click` 디스패치(`closest` 해석)에 손대지 않아 회귀 위험이 없다. `toggle` 이벤트는 버블링하지 않으므로 캡처 단계 구독 — `trainer_menu:*`는 `#trainer-view` 스코프로 한정해 formula 뷰의 동명 카드를 제외한다
- **드릴 시작은 출제 성립 시점에 계측** — `startDrill` 본문에서 `st.data.length === 0` 조기 반환 이후에 두어 "문항 0건 안내 토스트" 클릭은 집계하지 않는다. 버튼·딥링크·재시도 등 모든 진입을 포괄하고, 발신지 구분은 `drill_from_review`가 담당 (`gotoOxDrill`은 복습 발 전용 경로라 호출 자체가 출처 정보)
- **mode 값 정규화** — `sid:*`·`concept:*` 등 행 단위 재시도 인자는 `retry`로 묶어 버킷 수를 제한한다

#### 3.2 PRO 배지 전환 계측 (UX-MET-02)

`showPlanCompare()`는 이미 `plan_compare`를 계측한다. 배지 발 유입만 구분하려면 배지 클릭 시점의 키가 필요하다:

| 액션 키 | 발생 지점 | 판정 연결 |
|---------|-----------|-----------|
| `pro_badge_click` | `[data-pro-feature]` 배지 클릭 — `initUsageMetrics()` 위임 리스너가 `closest('[data-pro-feature]')`로 판정해 `showPlanCompare` 디스패치와 별개로 계측 | UX-GATE-03 — `pro_badge_click` ÷ `plan_compare` = 배지 경로의 전환 기여도 |

#### 3.3 사용 통계 내보내기 (UX-MET-03)

로컬 전용 계측의 구조적 한계: 데이터는 각 기기에만 있어 개발자가 볼 수 없다. 유일한 회수 경로로 내보내기를 둔다:

- '내 사용 통계' 모달(`showUsageStats`) 하단에 **"통계 복사"** 버튼 추가 — `getUsageStats()` 결과 JSON을 `navigator.clipboard.writeText`로 복사, 실패 시 `<textarea>` 선택 폴백 (AN-09 주간 리포트 클립보드 폴백 패턴 재사용)
- 파일럿·베타 사용자가 복사한 JSON을 피드백 채널로 전달하는 절차 — `src/feedback.js` 의견 제출 경로에 첨부 문구 안내로 연결 가능 (통계 자체를 서버로 보내지는 않음 — 개인정보 원칙 ROAD-L5 유지)
- 회수된 JSON들은 `tools/check/aggregate_usage.js`(신규)로 병합 — owner별 키 합산·뷰 분포·드릴 진입 비율을 출력하는 오프라인 집계기

#### 3.4 계측 정합 규약 (UX-MET-04)

- 신규 키는 `ACTION_LABELS`에 표시 라벨을 동반 등록 — 미등록 키는 모달에 원시 키가 노출된다
- 신규 키는 **`VALUE_ACTIONS`에 포함하지 않는다** — 표면 진입 지표가 `PRO_VALUE_THRESHOLD`(20회) 유료가치 판정을 오염시키면 ROAD-P1 근거가 부풀려진다
- `:` 포함 키(`tq_run:startDueReview` 등)는 라벨 테이블에서 접두사 매칭으로 표시 — 구현 시 `ACTION_LABELS` 조회를 `key.split(':')[0]` 폴백으로 확장

### 4. 유보 결정 트리거 (UX-GATE-01~03)

| ID | 결정 항목 | 판정 지표 | 트리거 |
|----|-----------|-----------|--------|
| UX-GATE-01 | **드릴 실행 패널 이관** — oxdrill·combo 진행 UI의 복습 뷰 이관 여부 | `drill_from_review` ÷ (`oxdrill_start:weak`+`combo_start:weak`) + `review_weak_open` 활성도 | 측정 창(§5) 종료·표본 충족 시: 복습 발 weak 드릴 비율 **≥60%** → 패널 이관 설계 착수 / 훈련소 메뉴 발이 주도면 "이관 안 함" 확정 |
| UX-GATE-02 | **점진적 공개·표본 게이트** — 저사용 표면의 접힘·시트 이관 | `trackView` 뷰별 진입 분포 + `trainer_menu:*` 카드 분포 | 창 종료 시 전체 대비 진입 **<5%** 표면을 "관찰 목록"으로 분류 — 목록 편입은 축소 실행이 아니며, 실제 접힘·잠금은 개별 설계로 |
| UX-GATE-03 | **PRO 경로 수렴 잔여** — ROAD-P5의 안내 수렴 정책 검증 + ROAD-P1 착수 근거 보강 | `pro_badge_click`·`plan_compare` 전환률 + `VALUE_ACTIONS` 추이 | 전환률 분석 가능 시점에 ROAD-P1 판정 입력으로 보고 — 배지가 `plan_compare`의 주 유입이면 안내 수렴(전역 1회) 정책 유지 확정 |

설계 근거:

- **트리거를 선언하면 판정이 기계적이 된다** — "데이터가 모이면 결정하자"가 아니라 비율·표본·창을 미리 정해 논쟁과 미루기를 제거한다
- **복습 발 60% 기준의 의미** — weak 드릴의 주 진입이 복습이면 훈련소의 드릴 패널은 우회 표면이 되어 이관이 정당화된다. 60%는 명확한 주도 기준(과반 + 완충)으로, 40~60% 회색 지대는 현상 유지(보수 판정)
- **<5% 관찰 목록은 비파괴적** — UX-GATE-02의 산출물은 "후보 목록"일 뿐 즉시 축소가 아니다. 0건이 나와도 정상 결과로 기록한다

### 5. 측정 창·표본 기준

| 항목 | 기준 |
|------|------|
| 측정 창 | 계측 배포일로부터 **최소 4주** 누적 — 주간 배분(SC-08~13) 사이클과 주중·주말 패턴을 최소 1회 이상 커버 |
| 표본 단위 | `owner`(device_id) — 기기별 독립 카운터 |
| 표본 하한 | 회수된 서로 다른 owner **≥3기기** — 단일 기기(개발자 자신 포함)는 표본으로 인정하지 않음 |
| 데이터 부족 시 | 결정 연기가 정상 종료 — "계측 없는 구조 변경"만이 실패. 창 종료 시 표본 미달이면 창을 연장하고 판정은 하지 않는다 |

### 6. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 (구현 결과) |
|------|------|-----------|
| 1 | `ACTION_LABELS` 확장 + `actionLabel()` 접두사 폴백 + `initUsageMetrics()` 위임 리스너 — 큐·details toggle·메뉴 카드·배지를 단일 리스너로 통합 | `src/usage-stats.js` · `src/views/event-listeners.js` |
| 2 | 드릴 진입 계측 — `startDrill` 공통 경로(ox·combo 양쪽 커버) + `gotoOxDrill` 복습 발 | `src/views/trainer-drills.js` (`trainer-drill-combo.js` 변경 불필요 — combo도 `startDrill` 경유) |
| 3 | 통계 복사 버튼 + 클립보드 폴백 | `src/usage-stats.js` |
| 4 | 회수 집계 도구 — owner 병합·액션/뷰 합계·UX-GATE 판정 입력 출력 | `tools/check/aggregate_usage.js` (신규) |
| 5 | 테스트 — 신규 키 기록·details toggle·배지 계측·내보내기 단언 (@spec UX-MET-01~04) | `tests/unit/app/usage-metrics.test.js` (신규) · `tests/dom/misc/usage-stats.dom.test.js` · `tests/e2e/usage-metrics.spec.js` (신규) |
| 6 | SPEC §7.6 상태 갱신 + TRACE_MATRIX 재생성 + CHANGES 기록 | 문서·생성물 |

### 7. 검증·수용 기준

- 각 계측 키가 대응 트리거(큐 버튼·드릴 시작·리뷰 개방·메뉴 카드·배지 클릭)에서 정확히 1회씩 기록된다 (DOM 테스트)
- '내 사용 통계' 모달에 신규 액션이 라벨과 함께 표시되고, 통계 복사 버튼이 JSON을 클립보드에 쓴다 (DOM 테스트 — clipboard 모킹)
- 신규 키가 `VALUE_ACTIONS` 집계에 포함되지 않아 `isValueThresholdMet()` 판정이 변하지 않는다 (유닛 테스트)
- `check:all` 전 단계 통과 — 계측 추가만으로 기존 동작 회귀 없음
- 구현 배포 후 §5의 창·표본 기준 충족 시 §4 트리거로 판정 기록을 CHANGES.md에 남긴다

### 8. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| 로컬 전용 계측이라 회수 표본이 영원히 부족할 수 있음 | 표본 하한(≥3기기) 미달 시 결정 연기를 명문화 — 데이터 없는 축소를 원천 차단. 표본 확보는 파일럿 배포·피드백 채널 안내로 진행 |
| 계측 키 증가로 통계 모달이 지표로 범람 | 라벨 동반 등록(UX-MET-04) + 모달의 기능별 표가 정렬돼 있어 하위로 밀림 — 필요시 "표면 진입" 그룹핑은 후속 |
| 위임 리스너와 `data-click` 디스패치의 이중 처리 | 계측 리스너는 `trackAction`만 호출하고 `stopPropagation` 없음 — 동작 경로 불변 |
| `tq_run:<click>`·`trainer_menu:<click>` 키 폭증 (click 값 다양) | click 값은 유한한 상수 집합 — `:` 접미 버킷으로 관리. 모달 라벨은 접두사 폴백 |
| 내보내기 JSON의 개인정보 | owner는 익명 device_id, 카운터만 포함 — 학습 내용·답변 내용은 미포함. 복사는 사용자 자발 동작 |
