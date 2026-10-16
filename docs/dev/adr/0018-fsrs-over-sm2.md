# ADR-0018: 간격 반복은 SM-2 대신 FSRS

> **문서 ID**: DOC-ADR-18
> **범위**: platform · 판본: none
> **관련 SPEC ID**: F-07, F-08, F-11, D-18, D-22
> **상태**: accepted (2026-10-14 — 사후 백필. 선정 근거의 정본은 LEARNING_ALGORITHM_DESIGN.md,
> FSRS-6 승계는 LEARNING_ALGORITHM_DESIGN.md)

## 상황 (Context)

플래시카드 복습 스케줄링에 간격 반복 알고리즘이 필요했다. 초기 SM-2
구현이 있었으나 카드별 난이도·안정도 추적과 목표 기억률 기반 산출이
불가능했다.

## 결정 (Decision)

복습 엔진은 FSRS — 현재 FSRS-6(21 파라미터, F-11). `fsrs.js`가 순수 수학
(DSR 상태 전이·간격 산출)을 담당하고 `spaced-repetition.js`가 저장 어댑터로
시그니처를 유지해 호출층 영향을 차단한다. 리뷰 로그 링버퍼(D-18)가 관측
계층, BKT(D-22)와 역할 분리 — FSRS=시점 관리, BKT=숙달 추정.

## 대안 (Alternatives considered)

- **SM-2 유지**: 기각 — 난이도·안정도 분리·목표 기억률 산출 불가
  (선정 근거 상세는 LEARNING_ALGORITHM_DESIGN.md — 본 ADR은 포인터)
- **자체 경험적 스케줄**: 기각 — 검증된 알고리즘의 이론 근거가 없는 휴리스틱은
  신뢰 불가 (FSRS 선정 근거 자체가 "실험 검증된 DSR 모델"이므로 정합 — LEARNING_ALGORITHM_DESIGN 정본)
- **외부 라이브러리(ts-fsrs 등) 벤더링/의존**: 기각 — 수식만 자체 구현하고
  정확성은 외부 정본으로 검증하는 경로를 택했다 (CHANGES: FSRS-6 승계 시
  ts-fsrs `algorithm.test.ts` 골든 벡터 정합 기록). 근거: ① 프로젝트 고유
  레코드 스키마 `{v:2,d,s,due}`와 어댑터 계층(D-18 관측·D-20 due 클램프)이
  라이브러리 API에 맞출 수 없고, ② `script-src 'self'`·빌드 없음 제약에서
  순수 함수 포팅이 의존성 추가보다 단순하며, ③ 무수정 어댑터 정책으로
  알고리즘 버전 승계(4.5→6)가 검증됨
- **Anki 연동**: 검토 이력 없음 — PWA 단독 동작·로컬 퍼스트 설계와 방향이 다름

## 결과 (Consequences)

- 구 SM-2 레코드는 지연 변환으로 마이그레이션 없이 승계 (F-08)
- FSRS-4.5→6 승계가 어댑터 계층 분리 덕에 레코드 형식 무수정으로 완료됨
- 이 파일은 결정 포인터 — 파라미터·수식·효능 근거는 design 문서가 정본
