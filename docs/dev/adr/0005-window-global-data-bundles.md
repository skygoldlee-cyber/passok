# ADR-0005: 데이터 번들을 window 전역에 할당하는 클래식 스크립트

> **문서 ID**: DOC-ADR-05
> **범위**: platform · 판본: none
> **관련 SPEC ID**: P-01~06 (ADR-0001 후속 — 데이터 로딩 표면)
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

시험 데이터(문항·카드·교재 번들)가 수십 MB이고 시험별로 분리돼 있다.
ESM 정적 임포트는 전량 초기 로드를 강제하고, fetch+JSON은 비동기 폭포와
파싱 비용을 만든다. CSP `script-src 'self'` 아래 동적 코드 평가는 불가.

## 결정 (Decision)

`build:data`가 콘텐츠 MD를 `data/exams/<id>/**/*.js` 번들로 변환하고,
각 번들은 클래식 스크립트로 `window.STUDY_DATA`·`window.DATA_REGISTRY` 등
전역에 할당한다. 시험별 `registryGlobal`로 네임스페이스를 분리한다.
부트 순서는 ADR-0001의 document.write 부트 스크립트가 보장한다.

## 대안 (Alternatives considered)

- **JSON + fetch**: 구조 단순 — 기각. 대기(loading) 상태·파싱 비용·SW 캐시 의존
- **ESM 동적 `import()`로 데이터 모듈**: 기각. ① ESM은 `file://` 컨텍스트에서 CORS로
  차단 — 번들을 `var`-only 클래식 스크립트로 유지한 근거 (CHANGES 2026-09 멀티시험
  도입 기록). ② 동적 import는 비동기라 부트 순서 규칙(ADR-0001: 모듈 스크립트는
  문서 순서 deferred)과 충돌 — document.write 부트가 해석한 활성 시험 번들만
  동기 삽입하는 현 구조로는 보장 불가. ③ 해시 파일명 캐시 무효화는 클래식 번들에도
  동일하게 동작하므로 ESM 전환 이점이 없음
- **IndexedDB에 파싱 결과 저장**: 기각 (사후 추론 — 이력 미기록). SW 프리캐시 +
  정적 번들이 이미 오프라인·캐시 계층을 담당하고, IndexedDB는 비동기 API라 부트의
  동기 가용성 불변식을 깬다

## 결과 (Consequences)

- `window.*` 쓰기는 번들·부트 경로에 한정 — src/ 모듈의 임의 전역 오염은
  `check:uistyle`·린트가 차단
- 번들은 생성물이므로 신선도 게이트(check:datafresh·docbundles 등)가
  원본↔번들 드리프트를 차단 (ADR-0012 연결)
