# 학습 표면 단순화 Phase 1.5 — 훈련소 메뉴 재편 + Pro 안내 수렴

> 상위 문서: [SPEC](../SPEC.md) §3.11·§3.20 · [LEARNING_UX_PHASE1_DESIGN](LEARNING_UX_PHASE1_DESIGN.md) (DOC-DSN-22, Phase 1) · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-21, Phase 0)
> **범위**: platform · 판본: none
> **상태**: 설계안 — 미구현
> **관련 SPEC ID**: 신규 `UX-NAV-14`(훈련소 메뉴 그룹핑) · `ROAD-P5`(Pro 안내 수렴) · 기존 `T-01~05` · `DR-01~02` · `ROAD-P0`
> **문서 ID**: DOC-DSN-23

## 1. 배경·목적

Phase 1까지 복습 허브 통합(RV-02~04)과 뷰 경계 문구화(UX-NAV-13)를 완료했다. Phase 1.5는 Phase 1 설계 §2에서 유보한 **훈련소 메뉴 재편**과, 계측 없이 UX 판단으로 결정 가능한 **Pro 안내 수렴** 두 가지를 처리한다.

### 훈련소 메뉴 현황

Phase 1 이후 메뉴 카드는 5장으로 정리됐으나, 성격이 다른 두 계열이 한 그리드에 평탄 나열된다:

- **기출·진술 기반 드릴**: O/X 판정 드릴(DR-01), ㄱㄴㄷ 조합 훈련(DR-02) — 기출 문항을 분해·변환한 문제 판정 훈련
- **생성형·실무 훈련**: 핵심 수치 암기(빈칸 4지선다, 난수 출제), 원료 배합 계산 연습기(T-01/05, 난수 생성), 원료 안전성 챌린지(T-02, 성분 분류)

사용자 관점에서 두 계열은 목적이 다르다 — 전자는 "기출 유형에 익숙해지기", 후자는 "시험과 무관하게 실무·암기 능력 다지기". 그룹 라벨 없이 나열되면 "이 중 뭘 해야 하지?"라는 선택 혼란이 남는다.

### Pro 안내 현황

`feature-plan.json`에서 현재 `pro` 키는 5개(story_textbook·personal_analysis·cloud_sync·audiobook·study_plan_pro). 각 Pro 기능의 첫 진입 시 `proFeatureNotice()`가 기능별 seen 플래그로 개별 모달을 표시한다 — 신규 사용자는 최대 4~5개의 "Pro 기능 안내" 모달을 서로 다른 시점에 순차로 만난다. 내용은 사실상 동일(Pro 예정 + 현재 무료 + 플랜 비교 버튼)이라 반복 노출은 피로만 유발한다.

## 2. 비목표

- **드릴 실행 패널 이관**(oxdrill·combo 패널의 뷰 이동) — DOC-DSN-22 §2 그대로 유보. 본 Phase는 메뉴 표면 재편만
- **점진적 공개·표본 게이트** — 계측 데이터 없이 결정하지 않음 (Phase 2)
- **Pro 기능 게이팅 변경** — 접근 차단·entitlement 검증(ROAD-P1) 없음. 안내 노출 전략만 변경
- **카드 추가·삭제** — 5장 그대로, 그룹핑과 순서만

## 3. 훈련소 메뉴 2그룹 재편 (UX-NAV-14)

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

## 4. Pro 안내 수렴 (ROAD-P5)

### 4.1 기능별 첫 진입 모달 → 전역 1회 수렴

`proFeatureNotice()`의 seen 플래그를 기능별 키에서 전역 단일 키로 수렴한다:

| 항목 | 현재 | 변경 |
|------|------|------|
| seen 키 | `PRO_NOTICE_SEEN` 맵의 기능별 키 (`{story_textbook: t, ...}`) | 동일 맵의 `_global` 단일 키 |
| 표시 조건 | 기능별 첫 진입 | **최초 Pro 기능 진입 1회만** — 이후 어떤 Pro 기능을 만나도 모달 없음 |
| 모달 문구 | `<기능명>은(는) Pro 버전에서…` | 첫 진입 기능명을 인자로 받되, "PRO 배지가 붙은 기능은 Pro에서 제공 예정 — 현재 무료 체험"으로 일반화 문구 |
| 마이그레이션 | — | 기존 seen 맵에 임의 키가 있으면 `_global`로 간주(재노출 없음) |
| 플랜 비교 버튼 | 각 모달에 포함 | 동일하게 유지 |

호출부 시그니처 `proFeatureNotice(featureKey, featureName)`는 유지 — 내부에서 `isProFeature(featureKey)` 판정 후 `_global` seen 검사. 호출부 9곳 재배선 없음.

### 4.2 PRO 배지 클릭 → 플랜 비교 단일 경로

현재 PRO 배지는 장식적 `<span>`이다. 클릭 가능하게 만들어 `showPlanCompare()`로 직행시킨다:

- `refreshProBadges()`에서 배지에 `role="button"`·`tabindex="0"`·커서 스타일 부여 + 클릭/Enter 시 `showPlanCompare()` 호출 (위임 리스너 또는 직접 바인딩 — `data-click` 체계에 `openPlanCompare` 신규 액션 등록해 기존 클릭 위임 활용)
- 배지의 title 툴팁 문구를 "Pro 제공 예정 — 눌러서 플랜 비교 보기"로 갱신

### 4.3 설계 근거

- **반복 안내는 정보가 아니라 노이즈** — 내용이 동일한 모달이 기능별로 다시 뜨는 것은 "Pro 예정" 사실의 학습이 아니라 팝업 피로. 전역 1회 + 배지 클릭 자기주도 경로가 더 적은 방해로 같은 정보를 전달한다
- **seen 마이그레이션** — 기존 사용자는 이미 최소 1회 안내를 봤으므로 재노출하지 않는다. 맵 구조를 유지해 코드 회귀 없이 `_global` 키만 추가
- **호출부 불변** — 기능별 featureKey 인자는 판정(`isProFeature`)과 문구 인자로 계속 유효. 9곳 호출부 수정 없이 정책만 교체

## 5. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 |
|------|------|-----------|
| 1 | 훈련소 메뉴 2그룹 마크업 + 그룹 라벨 스타일 | `html/views/trainer.html` · `css/study.css` |
| 2 | `proFeatureNotice` 전역 seen 수렴 + 배지 클릭 → `openPlanCompare` | `src/pro-upgrade.js` · `src/app.js`(data-click 등록) |
| 3 | 테스트 — 메뉴 그룹 구조 DOM 단언 + notice 전역 seen·배지 클릭 단언 (@spec UX-NAV-14, ROAD-P5) | `tests/dom/study-trainer.dom.test.js` · 신규 `tests/dom/pro-notice.dom.test.js` |
| 4 | SPEC `UX-NAV-14`·`ROAD-P5` 행 + SCREEN_MAP + 사용자 매뉴얼 §훈련소 + CHANGES + `build:html`·`build:trace` | 문서·생성물 |

## 6. 검증·수용 기준

- 훈련소 메뉴가 2개 그룹 라벨 아래 카드를 나열하고, 모든 카드의 `data-click`·배지가 기존대로 동작한다 (DOM 테스트)
- Pro 기능 첫 진입 시 안내 모달 1회 표시, 이후 다른 Pro 기능 진입 시 재표시 없음 (DOM 테스트 — seen `_global`)
- 기존 seen 데이터(기능별 키)가 있는 사용자에게 모달이 재노출되지 않음 (마이그레이션 단언)
- PRO 배지 클릭/Enter 시 플랜 비교 모달 표시 (DOM 테스트)
- `check:all` 전 단계 통과 — `check:html`(파셜 변경)·`check:plan`(플랜 키 불변)·E2E mobile-overflow 무회귀

## 7. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| seen 맵 스키마 변경으로 기존 사용자 재노출 | `_global` 키 추가 방식 + 임의 키 존재 시 global로 간주하는 마이그레이션 단언 테스트 |
| 배지 클릭화가 카드 `data-click`과 버블 충돌 (배지가 카드 내부에 있음 — `trainer-menu-card` 안의 PRO 배지) | 배지 클릭 핸들러에서 `stopPropagation` — 카드 본래 액션(드릴 시작) 오발 방지. DOM 테스트로 배지 클릭이 카드 액션을 실행하지 않음을 단언 |
| 그룹 라벨 추가로 훈련소 메뉴 세로 길이 증가 | 모바일 뷰포트에서 mobile-overflow E2E가 실측 — 카드 수 불변이라 위험 낮음 |
| "전역 1회"로 개별 기능의 Pro 소속 인지가 약해짐 | 모달 문구에 첫 진입 기능명 포함 + 배지 자체가 항상 표시되어 기능별 소속은 배지가 담당 |
