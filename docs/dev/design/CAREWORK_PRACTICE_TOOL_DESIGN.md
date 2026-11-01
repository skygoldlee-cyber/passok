# 요양보호사 현장도구(Practice Tool) 설계 — 시험→실무 구독 전환

> **문서 ID**: DOC-DSN-42
> **범위**: platform · 판본: none
> **관련 SPEC ID**: UM-01~04 (학습/실무 모드 전환·실무 랜딩) · PAY-01~08 (Pro 게이팅) · DA-13 (시험 격리) · DA-15 (콘텐츠 독립)
> **목적**: carework 팩에 "시험 합격 후 현장에서 매일 쓰는" 실무 피처를 추가해 구독 수익모델을 만드는 설계 — 시장분석(DOC-DSN-41)의 후속 실행 설계

## 1. 배경·문제

- 요양보호사 시장의 수익 구조는 **시험학습 일회성**이 아니라 **합격자의 현장 업무**에 있다 — 재가센터·요양원 근무자는 기록 작성·급여 계산·대처 판단을 매일 수행
- cosmetic은 Formula OS(배합·기록)로 같은 패턴이 검증됨 — 시험 콘텐츠는 무료 유지, **실무 생성·저장·출력을 Pro**로 게이팅
- 법적 근거 데이터는 이미 확보 — 장기요양급여 제공기준 고시·등급판정 고시·본인부담금 감경 고시·인권교육·평가방법 고시가 `ref_md`에 편입됨

## 2. 목표

| # | 목표 | 지표 |
|---|---|---|
| G1 | 합격자가 **매일** 쓰는 도구 (기록 생성) | 주간 활성 실무 사용자 |
| G2 | 시험→실무 전환 구독 | carework 실무 피처 Pro 전환율 |
| G3 | 기존 아키텍처 재사용 — 신규 개념 0 | formula-view 패턴 그대로, UM/PAY 기존 계약 유지 |

## 3. 기능 스펙 — 3단계 도구

### 3.1 Phase 1 — 장기요양 비용 계산기 (`careCalc`)

**가장 작고 즉효** — 데이터는 모두 수집됨.

- 입력: 급여종류(재가·시설), 등급(1~5·인지지원), 감경 여부(60%·40%), 서비스 월 이용량
- 계산: 월한도 적용 → 총급여 → 본인부담금 (재가 15%·시설 20%, 감경 반영)
- 근거: 노인장기요양보험법 §40·시행령 §27(본인부담), 본인부담금 감경 고시 — **법령 변경 시 ref_md만 갱신하면 수치 추적**
- 출력: 계산 근거 조문 링크 (ref_md 인용 — 학습 콘텐츠와 동일 패턴)

### 3.2 Phase 2 — 상황별 대처 카드 (`careCard`)

**현장 판단 지원** — 교재 15장 내용을 위기 상황용 플로우카드로 재구성.

- 카드 종류: BPSD(망상·배회·공격·불안), 낙상, 욕창, 응급(의식·호흡·가슴통증), 감염 의심
- 구조: `상황 인식 → 즉시 조치 → 보고 → 기록` 4단계 플로우 — 조문 근거 없는 판단 기준은 표준교재 기반(저작 내용)
- 구현: static JSON 콘텐츠로 충분 — `content/exams/carework/실무/care_cards.json` 데이터 번들로 생성

### 3.3 Phase 3 — 요양일지·서비스기록지 생성기 (`careLog`) ← **구독 핵심**

**매일 사용하는 기록 도구** — 리텐션 본체.

- 입력: 날짜, 대상자, 급여종류, 수행 서비스 체크(신체·가사·정서 지원 카테고리), 특이사항
- 생성: 장기요양급여 제공기준 고시의 기록 항목에 맞춘 표준 일지 텍스트 자동 조립 → 복사·PDF·저장
- 저장: `adverse-store.js`(cosmetic 유해사례 기록) 패턴 — `src/exams/carework/care-log-store.js`에서 로컬 저장 + Pro는 클라우드 동기화
- Pro 게이팅: **저장·내보내기만 Pro**, 생성 미리보기는 무료 — 시험→실무 전환 유도점

## 4. 아키텍처 — 기존 패턴 그대로

```
exams.json carework.features:
  careCalc: true   # Phase 1
  careCard: true   # Phase 2
  careLog: true    # Phase 3 — Pro 게이팅

src/exams/carework/           # 도메인 모듈 (DA-13 격리)
  care-calc.js        # 급여 계산 로직 — ref_md 수치는 데이터 파일로
  care-calc-data.js   # 등급·부담률·한도 상수 (법령 출처 주석)
  care-card.js        # 대처카드 렌더 데이터
  care-log.js         # 일지 생성 로직
  care-log-store.js   # 로컬·클라우드 저장 (adverse-store 패턴)

src/html/exams/carework/      # 뷰 마크업 (도메인 경로 규약)
  care-calc-view.html
  care-card-view.html
  care-log-view.html

practice-registry.js          # 1:1 엔트리 등록 — getPracticeLanding priority: careLog(0)<careCalc(1)<careCard(2)
registry.uiText               # 카피 슬롯 — 타이틀 맵으로 중립 기본값 덮어씀
feature-plan.json             # careLog.save/pdf → pro 게이팅, 나머지 free
```

## 5. 데이터 출처 (ref_md 인용 — 학습 콘텐츠 동일 패턴)

| 도구 | 근거 문서 |
|---|---|
| careCalc | 노인장기요양보험법 §40 · 시행령 §27 · 본인부담금 감경 고시 · 등급판정 고시(월한도) |
| careCard | 교재 Ch12~15(치매·임종·응급·감염) + 노인복지법 §39의2(학대 신고 의무) |
| careLog | 장기요양급여 제공기준 고시 — 기록 항목·주기·서식 요건 |

**법령 변경 추적**: `ai:stale` 패턴 — ref_md 갱신 시 계산 상수 영향 문항처럼 스모크 항목 나열

## 6. Pro 게이팅 모델

| 기능 | Free | Pro |
|---|---|---|
| careCalc | 계산·조문 링크 | — |
| careCard | 카드 열람 | — |
| careLog | 일지 생성·미리보기 | **저장·PDF·내보내기·클라우드 동기화** |

- 시험학습은 전부 무료 유지 — 학습→실무 전환 자체가 결제 유도
- `feature-plan.json` 신규 키: `care_log_save`, `care_log_export` → `pro` 선언 → `canCloudSync()`·`pro_entitled` 기존 계약 사용

## 7. 구현 순서·범위

| Phase | 범위 | 검증 |
|---|---|---|
| 1 | careCalc 모듈 + 뷰 + registry + feature 키 | 단위 테스트(계산 케이스) + UI 커버리지 |
| 2 | careCard JSON 데이터 + 뷰 | 컨텐츠 게이트(형식·귀속) |
| 3 | careLog 생성 + 로컬 저장 + Pro 게이트 | 저장 경계 테스트 + e2e 플로우 |
| 4 | 클라우드 동기화 + 스모크 | 실서버 Supabase (스키마 필요 시 별도) |

## 8. 원칙·제약

- **DA-15**: 코어 코드에 `carework`·`care*` 하드코딩 금지 — 전부 features/registry 패턴으로 선언
- **DA-13**: 시험별 모듈은 `src/exams/carework/`에 격리 — 코어 수정 없이 온보딩
- **법령 수치는 코드 상수에 두지 않고 데이터로** — ref_md 연동 출처 주석 필수
- **기존 SPEC 수정 없음** — UM/PAY/DA 계약을 그대로 사용
