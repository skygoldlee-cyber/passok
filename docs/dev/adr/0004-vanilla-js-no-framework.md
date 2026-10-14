# ADR-0004: 프레임워크 무의존 Vanilla JS (빌드 도구 없는 ESM)

> **문서 ID**: DOC-ADR-04
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (플랫폼 전제 결정 — ARCHITECTURE §2 "Vanilla First")
> **상태**: accepted (2026-10-14 — 사후 백필: 프로젝트 초기부터 유지된 결정의 소급 기록)

## 상황 (Context)

시험 학습 SPA가 필요했다. 콘텐츠는 MD 원본이 SSOT이고 배포는 정적 호스팅(Vercel)이다.
프레임워크 도입은 런타임 의존·빌드 체인·버전 추종 비용을 수반한다.

## 결정 (Decision)

React/Vue 등 프레임워크와 Webpack/Vite 등 번들러를 도입하지 않는다.
브라우저 네이티브 ES Modules만 사용한다 (ARCHITECTURE §2·기술 스택 표:
"빌드 불필요, 장기 유지보수성, 번들 최소화").

## 대안 (Alternatives considered)

- **React/Vue + 번들러**: 컴포넌트 생태계 — 기각. 빌드 단계 의무화·프레임워크 버전
  종속성이 장기 유지보수 리스크 (브라우저가 곧 런타임이어야 한다는 전제와 충돌)
- **경량 프레임워크 (Svelte·Preact 등)**: 비교 검토 이력이 남아있지 않다. 다만 React/Vue
  기각 근거(런타임 의존·빌드 단계 의무화)는 소형 프레임워크에도 동일하게 적용된다 —
  Svelte는 컴파일러가 필수라 "브라우저가 곧 런타임" 전제와 충돌 (사후 추론)
- **Web Components**: Shadow DOM 캡슐화가 `data-click` 위임·전역 스타일 패턴과 상성이
  나쁘고, 네이티브라 의존 문제는 없으나 뷰 합성 이점이 파셜 조립(ADR-0011)으로 충분히
  대체됨 (사후 추론 — 비교 검토 이력 없음)

## 결과 (Consequences)

- DOM 조작·이벤트가 수동 → `data-click` 위임(S-02)·`is-hidden` 토글·`esc()` 이스케이프
  규약과 그 강제 게이트(check:uistyle·check:escape)가 이 결정의 비용이다 (ADR-0007 연결)
- 빌드 없음 = `src/`가 배포물 그 자체 → `check:perf`가 SHELL_ASSETS 바이트 예산 감시
- 뷰 마크업 분할은 프레임워크 대신 파셜 조립 빌드로 해결 (ADR-0011)
- 타입 안전은 TS 전환 대신 JSDoc + checkJs로 확보 (ADR-0015)
