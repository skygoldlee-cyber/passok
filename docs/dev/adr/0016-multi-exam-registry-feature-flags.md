# ADR-0016: 멀티시험 레지스트리 + feature flag 게이팅

> **문서 ID**: DOC-ADR-16
> **범위**: platform · 판본: none
> **관련 SPEC ID**: DA-08, DA-13
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

cosmetic 단일 시험 앱을 멀티시험 플랫폼으로 확장해야 했다. 목표는
"새 시험 추가가 앱 로직 변경 없이 콘텐츠 작업만으로 완료"되는 것 —
시험별 기능 차이(성분사전·계산 연습 등)를 코드 분기 없이 흡수해야 한다.

## 결정 (Decision)

`content/exams.json`이 시험 레지스트리 SSOT — 시험별 `features` 키를 선언하고
`hasFeature()`·`data-feature`로 게이팅한다. 시험 전용 코드는
`src/exams/<id>/`·`html/exams/<id>/`·`css/exams/<id>/`에 물리 격리(DA-13)하고,
플랫폼 코어는 시험 id 문자열 리터럴 참조 금지 — `check:featflags`가 미선언
키 사용(영구 falsy 죽은 경로)을, `check:domainmap`이 계층 위반을 차단한다.

## 대안 (Alternatives considered)

- **시험별 if/switch 분기 산재**: 기각 — 두 번째 시험에서 유지 불가
- **시험별 별도 배포·앱**: 기각 — 셸·진도·동기화 인프라 중복
- **기능 자동 탐지(파일 존재 기반)**: 기각 — 선언이 곧 게이트 대상이 된다.
  자동 탐지는 "파일이 있으면 켜짐"이라 준비 안 된 기능이 노출되고, 선언은
  `check:featflags`가 코드 사용↔선언을 양방향 검증할 수 있는 표면을 만든다.
  단 `docs/*.md`만은 예외적으로 존재=선언 모델 (번들 스캔) — 혼합이 의도 (사후
  추론 — 이력 미기록)

## 결과 (Consequences)

- `scaffold:exam`이 골격 생성·제거까지 담당 — NEW_EXAM_RUNBOOK이 절차 정본
- 조건부 기능이 문항 수 등 표면 수치를 바꾼다 (데일리 챌린지 8문은
  calcPractice+dictionary 충족 시에만) — 기능별 조건 분기가 정상 동작
- ⚠️ ADR 작성 시점에는 두 번째 시험이 comingSoon 파일럿뿐이라 실측 검증이 한 시험뿐이었음 — 이후 lossadj·insadj·indsafe·admagent 실사용 팩이 온보딩되어 검증됨
  (2026-10-14 rehearsal 시험 스캐폴드 E2E로 온보딩 경로는 검증했으나
  실콘텐츠 시험의 전수 기능 검증은 잔존 과제)
