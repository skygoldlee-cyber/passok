# 학습 표면 단순화 Phase 2 — 사용량 계측 보강 + 유보 결정 트리거

> 상위 문서: [SPEC](../SPEC.md) §3.11·§3.20·§7.6 · [LEARNING_UX_PHASE15_DESIGN](LEARNING_UX_PHASE15_DESIGN.md) (DOC-DSN-23, Phase 1.5) · [LEARNING_UX_PHASE1_DESIGN](LEARNING_UX_PHASE1_DESIGN.md) (DOC-DSN-22, Phase 1) · [LEARNING_UX_SIMPLIFICATION_DESIGN](LEARNING_UX_SIMPLIFICATION_DESIGN.md) (DOC-DSN-21, Phase 0)
> **범위**: platform · 판본: none
> **상태**: Phase 2-a 계측 구현 (2026-10-13) — UX-GATE 판정은 측정 창 종료 후
> **관련 SPEC ID**: `UX-MET-01~04`, `UX-GATE-01~03`(신규) · `ROAD-L5`, `TQ-01~05`, `RV-02~03`, `DR-01~02`, `DR-04~05`, `UX-NAV-12~14`, `ROAD-P5`(기존)
> **문서 ID**: DOC-DSN-24

## 1. 배경·목적

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

## 2. 비목표

- **구조적 축소·이관의 실행** — 뷰 제거·탭 축소·기능 잠금·드릴 패널 이관은 트리거 충족 후 별도 설계·구현. 본 Phase는 계측과 트리거 정의만 다룬다
- **외부 전송·서버 수집** — ROAD-L5의 로컬 전용 원칙(localStorage만, 백업·동기화 제외) 유지. 회수는 사용자 자발적 내보내기 경로뿐이다
- **추천·배분 알고리즘 변경** — 큐 소스·FSRS·배분 계산 불변
- **저장 스키마 변경** — `usage_stats`의 `actions` 맵에 키만 추가. 마이그레이션 불필요 (기존 데이터 그대로 유효)

## 3. 계측 지표 정의 (UX-MET-01~04)

### 3.1 표면 진입 계측 (UX-MET-01)

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

### 3.2 PRO 배지 전환 계측 (UX-MET-02)

`showPlanCompare()`는 이미 `plan_compare`를 계측한다. 배지 발 유입만 구분하려면 배지 클릭 시점의 키가 필요하다:

| 액션 키 | 발생 지점 | 판정 연결 |
|---------|-----------|-----------|
| `pro_badge_click` | `[data-pro-feature]` 배지 클릭 — `initUsageMetrics()` 위임 리스너가 `closest('[data-pro-feature]')`로 판정해 `showPlanCompare` 디스패치와 별개로 계측 | UX-GATE-03 — `pro_badge_click` ÷ `plan_compare` = 배지 경로의 전환 기여도 |

### 3.3 사용 통계 내보내기 (UX-MET-03)

로컬 전용 계측의 구조적 한계: 데이터는 각 기기에만 있어 개발자가 볼 수 없다. 유일한 회수 경로로 내보내기를 둔다:

- '내 사용 통계' 모달(`showUsageStats`) 하단에 **"통계 복사"** 버튼 추가 — `getUsageStats()` 결과 JSON을 `navigator.clipboard.writeText`로 복사, 실패 시 `<textarea>` 선택 폴백 (AN-09 주간 리포트 클립보드 폴백 패턴 재사용)
- 파일럿·베타 사용자가 복사한 JSON을 피드백 채널로 전달하는 절차 — `src/feedback.js` 의견 제출 경로에 첨부 문구 안내로 연결 가능 (통계 자체를 서버로 보내지는 않음 — 개인정보 원칙 ROAD-L5 유지)
- 회수된 JSON들은 `tools/check/aggregate_usage.js`(신규)로 병합 — owner별 키 합산·뷰 분포·드릴 진입 비율을 출력하는 오프라인 집계기

### 3.4 계측 정합 규약 (UX-MET-04)

- 신규 키는 `ACTION_LABELS`에 표시 라벨을 동반 등록 — 미등록 키는 모달에 원시 키가 노출된다
- 신규 키는 **`VALUE_ACTIONS`에 포함하지 않는다** — 표면 진입 지표가 `PRO_VALUE_THRESHOLD`(20회) 유료가치 판정을 오염시키면 ROAD-P1 근거가 부풀려진다
- `:` 포함 키(`tq_run:startDueReview` 등)는 라벨 테이블에서 접두사 매칭으로 표시 — 구현 시 `ACTION_LABELS` 조회를 `key.split(':')[0]` 폴백으로 확장

## 4. 유보 결정 트리거 (UX-GATE-01~03)

| ID | 결정 항목 | 판정 지표 | 트리거 |
|----|-----------|-----------|--------|
| UX-GATE-01 | **드릴 실행 패널 이관** — oxdrill·combo 진행 UI의 복습 뷰 이관 여부 | `drill_from_review` ÷ (`oxdrill_start:weak`+`combo_start:weak`) + `review_weak_open` 활성도 | 측정 창(§5) 종료·표본 충족 시: 복습 발 weak 드릴 비율 **≥60%** → 패널 이관 설계 착수 / 훈련소 메뉴 발이 주도면 "이관 안 함" 확정 |
| UX-GATE-02 | **점진적 공개·표본 게이트** — 저사용 표면의 접힘·시트 이관 | `trackView` 뷰별 진입 분포 + `trainer_menu:*` 카드 분포 | 창 종료 시 전체 대비 진입 **<5%** 표면을 "관찰 목록"으로 분류 — 목록 편입은 축소 실행이 아니며, 실제 접힘·잠금은 개별 설계로 |
| UX-GATE-03 | **PRO 경로 수렴 잔여** — ROAD-P5의 안내 수렴 정책 검증 + ROAD-P1 착수 근거 보강 | `pro_badge_click`·`plan_compare` 전환률 + `VALUE_ACTIONS` 추이 | 전환률 분석 가능 시점에 ROAD-P1 판정 입력으로 보고 — 배지가 `plan_compare`의 주 유입이면 안내 수렴(전역 1회) 정책 유지 확정 |

설계 근거:

- **트리거를 선언하면 판정이 기계적이 된다** — "데이터가 모이면 결정하자"가 아니라 비율·표본·창을 미리 정해 논쟁과 미루기를 제거한다
- **복습 발 60% 기준의 의미** — weak 드릴의 주 진입이 복습이면 훈련소의 드릴 패널은 우회 표면이 되어 이관이 정당화된다. 60%는 명확한 주도 기준(과반 + 완충)으로, 40~60% 회색 지대는 현상 유지(보수 판정)
- **<5% 관찰 목록은 비파괴적** — UX-GATE-02의 산출물은 "후보 목록"일 뿐 즉시 축소가 아니다. 0건이 나와도 정상 결과로 기록한다

## 5. 측정 창·표본 기준

| 항목 | 기준 |
|------|------|
| 측정 창 | 계측 배포일로부터 **최소 4주** 누적 — 주간 배분(SC-08~13) 사이클과 주중·주말 패턴을 최소 1회 이상 커버 |
| 표본 단위 | `owner`(device_id) — 기기별 독립 카운터 |
| 표본 하한 | 회수된 서로 다른 owner **≥3기기** — 단일 기기(개발자 자신 포함)는 표본으로 인정하지 않음 |
| 데이터 부족 시 | 결정 연기가 정상 종료 — "계측 없는 구조 변경"만이 실패. 창 종료 시 표본 미달이면 창을 연장하고 판정은 하지 않는다 |

## 6. 구현 계획·영향 파일

| 순서 | 작업 | 주요 파일 (구현 결과) |
|------|------|-----------|
| 1 | `ACTION_LABELS` 확장 + `actionLabel()` 접두사 폴백 + `initUsageMetrics()` 위임 리스너 — 큐·details toggle·메뉴 카드·배지를 단일 리스너로 통합 | `src/usage-stats.js` · `src/views/event-listeners.js` |
| 2 | 드릴 진입 계측 — `startDrill` 공통 경로(ox·combo 양쪽 커버) + `gotoOxDrill` 복습 발 | `src/views/trainer-drills.js` (`trainer-drill-combo.js` 변경 불필요 — combo도 `startDrill` 경유) |
| 3 | 통계 복사 버튼 + 클립보드 폴백 | `src/usage-stats.js` |
| 4 | 회수 집계 도구 — owner 병합·액션/뷰 합계·UX-GATE 판정 입력 출력 | `tools/check/aggregate_usage.js` (신규) |
| 5 | 테스트 — 신규 키 기록·details toggle·배지 계측·내보내기 단언 (@spec UX-MET-01~04) | `tests/unit/usage-metrics.test.js` (신규) · `tests/dom/usage-stats.dom.test.js` · `tests/e2e/usage-metrics.spec.js` (신규) |
| 6 | SPEC §7.6 상태 갱신 + TRACE_MATRIX 재생성 + CHANGES 기록 | 문서·생성물 |

## 7. 검증·수용 기준

- 각 계측 키가 대응 트리거(큐 버튼·드릴 시작·리뷰 개방·메뉴 카드·배지 클릭)에서 정확히 1회씩 기록된다 (DOM 테스트)
- '내 사용 통계' 모달에 신규 액션이 라벨과 함께 표시되고, 통계 복사 버튼이 JSON을 클립보드에 쓴다 (DOM 테스트 — clipboard 모킹)
- 신규 키가 `VALUE_ACTIONS` 집계에 포함되지 않아 `isValueThresholdMet()` 판정이 변하지 않는다 (유닛 테스트)
- `check:all` 전 단계 통과 — 계측 추가만으로 기존 동작 회귀 없음
- 구현 배포 후 §5의 창·표본 기준 충족 시 §4 트리거로 판정 기록을 CHANGES.md에 남긴다

## 8. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| 로컬 전용 계측이라 회수 표본이 영원히 부족할 수 있음 | 표본 하한(≥3기기) 미달 시 결정 연기를 명문화 — 데이터 없는 축소를 원천 차단. 표본 확보는 파일럿 배포·피드백 채널 안내로 진행 |
| 계측 키 증가로 통계 모달이 지표로 범람 | 라벨 동반 등록(UX-MET-04) + 모달의 기능별 표가 정렬돼 있어 하위로 밀림 — 필요시 "표면 진입" 그룹핑은 후속 |
| 위임 리스너와 `data-click` 디스패치의 이중 처리 | 계측 리스너는 `trackAction`만 호출하고 `stopPropagation` 없음 — 동작 경로 불변 |
| `tq_run:<click>`·`trainer_menu:<click>` 키 폭증 (click 값 다양) | click 값은 유한한 상수 집합 — `:` 접미 버킷으로 관리. 모달 라벨은 접두사 폴백 |
| 내보내기 JSON의 개인정보 | owner는 익명 device_id, 카운터만 포함 — 학습 내용·답변 내용은 미포함. 복사는 사용자 자발 동작 |
