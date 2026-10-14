# ADR-0014: 3계층 테스트 스택 — node:test + Vitest/jsdom + Playwright

> **문서 ID**: DOC-ADR-14
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (테스트 아키텍처 — TESTING.md 정본)
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

검증 대상이 세 종류로 갈린다: 순수 로직(FSRS·문항 스키마·체커 판정),
DOM 계약(뷰 마크업·이벤트 위임·모달 상태), 실브라우저 동작(SW·PWA·
네비게이션·접근성). 단일 러너로는 층별 비용/환경 요구가 맞지 않는다.

## 결정 (Decision)

- 유닛: `node --test` — 무의존·빠름 (1,271건 ~2s)
- DOM: Vitest + jsdom — DOM API·실제 HTML 파셜 주입
- E2E: Playwright 실브라우저 — serve.js 자동 기동, axe 접근성 포함
- 보조: fast-check(속성 기반)·Stryker(변이, 수동 스팟 체크)
- 두 러너의 커버리지는 `coverage_merge.js`가 병합해 단일 래칫 적용

## 대안 (Alternatives considered)

- **Vitest로 전면 통일**: 기각 (사후 추론 — 비교 이력 미기록). `node --test`는 설치
  의존 0으로 유닛 경로가 의존성 사고에서 자유롭고(이 프로젝트는 vendor 벤더링도
  같은 이유), 유닛 1,271건이 ~2s로 이미 충분히 빠르다. jsdom 환경만 Vitest에
  위임하는 최소 의존 구조가 의도와 일치
- **Cypress 등 다른 E2E**: Playwright는 axe 접근성 주입·SW 네트워크 제어·
  `file://` 계열 시나리오를 내장 지원하며 serve.js 자동 기동이 이미 통합됨 —
  대안 검토 이력 미기록
- **jsdom 없이 E2E만**: 기각 — 유닛/DOM 피드백 루프가 느려짐

## 결과 (Consequences)

- `test_stats.json`이 수치 SSOT — `check:teststats`가 문서 인용과 실측 정합 검증
- 커버리지는 병합 리포트 + vitest 단독 임계값 이중 적용 (vitest 단독 표시가
  병합보다 낮게 나오는 계측 차이가 실제로 있었음 — CHANGES)
- 변이 테스트는 CI 미편입 — 수동 스팟 체크로 제한 (향후 정기화 검토 여지)
