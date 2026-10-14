# ADR-0015: TypeScript 전환 대신 JSDoc + checkJs

> **문서 ID**: DOC-ADR-15
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (언어·도구 결정)
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

코드가 커지면서 타입 안전이 필요해졌으나, ADR-0004의 전제(빌드 없음·
src/가 배포물)는 TS 소스를 그대로 서빙할 수 없게 한다.

## 결정 (Decision)

TypeScript 전환 대신 `jsconfig.json`의 `checkJs` + `tsc --noEmit`으로
JSDoc 타입 진단을 한다. 중앙 typedef는 `types.js`, 전역 선언은
`globals.d.ts`. 게이트는 `check:types` (pre-commit·check:ci).

## 대안 (Alternatives considered)

- **TypeScript 전면 전환**: 기각 — emit 빌드가 필요해져 ADR-0004 위반.
  (tsc만으로 emit하는 선택지도 있으나 src/↔산출물 2계층 관리가 생김)
- **타입 검사 없음**: 기각 — IDE 진단·리팩터 안전 상실
- **JSDoc 일부 파일만 선택적 활성화**: 기각 — 실제로 백로그 관리가 이 경로를
  밟았다가 전수 편입으로 수렴했다 (CHANGES: checkJs 백로그 "활성 검사 대상 진단 0"
  → 백로그 49파일 순차 편입 기록). 선택적이면 진단 공백 파일이 영구 잔존한다

## 결과 (Consequences)

- `typescript`는 devDependency로 진단 전용 — emit 경로 없음
- TS 메이저 업그레이드는 checkJs 진단 동작 변화 가능성으로 별도 검토 대상
  (CHANGES: 7.0.2 보류 기록)
- 엄격한 .ts 수준의 표현력 제약은 감수 — 대가로 빌드 파이프라인 무의존 유지
