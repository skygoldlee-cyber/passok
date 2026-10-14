# ADR-0011: index.html의 템플릿+파셜 조립 빌드

> **문서 ID**: DOC-ADR-11
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (빌드 계층 — build:html / check:html)
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

ADR-0004로 프레임워크를 배제했으나 12개+ 뷰의 마크업을 단일 `index.html`에서
관리하면 파일이 비대해지고 diff가 충돌한다. 뷰별 HTML 분리가 필요했으나
런타임 fetch 조립은 초기 렌더 지연·SW 프리캐시 복잡화를 만든다.

## 결정 (Decision)

`index.template.html`의 `<!-- @include -->` 마커에 `html/views/*.html` 파셜을
빌드타임에 조립해 `index.html`을 생성한다(`build:html`). `index.html`은
생성물이며 직접 편집 금지, `check:html`이 파셜↔산출물 일치를 검증한다.
시험 전용 뷰는 `data-lazy-view` 스텁 + 런타임 지연 주입으로 분리한다.

## 대안 (Alternatives considered)

- **런타임 fetch로 뷰 조립**: 기각 — 초기 렌더 폭포·오프라인 엣지
- **뷰별 독립 페이지(MPA)**: 기각 — SPA 전환·공유 상태(storage·state.js) 분리됨
- **JS 템플릿 문자열에 마크업 내장**: 기각 — 마크업 편집 DX·`check:uistyle`의
  JS 템플릿 정적 style 기준선과 충돌
- **도메인 파셜도 전량 정적 include**: 기각 — 시험별 실무 피처(formula.html
  649줄)가 셸을 비대화 → `data-lazy-view` 지연 주입으로 분리

## 결과 (Consequences)

- html/ 편집 → `build:html` → `check:html` 패턴이 모든 뷰 작업의 표준 절차
- `data-lazy-view`의 `{examId}` 플레이스홀더로 시험별 파셔解을 활성 시험으로 해석
- DOM 테스트 helpers가 지연 파셜을 파일에서 즉시 주입해 테스트 계약 유지
