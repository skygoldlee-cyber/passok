# ADR-0017: 외부 라이브러리는 vendor/ 벤더링 + 해시 매니페스트

> **문서 ID**: DOC-ADR-17
> **범위**: platform · 판본: none
> **관련 SPEC ID**: BP-13
> **상태**: accepted (2026-10-14 — 사후 백필, 설계 정본 DOC-DSN-20)

## 상황 (Context)

Mermaid·Supabase·폰트 등 외부 자산이 필요한데, CSP `script-src 'self'`와
오프라인 PWA 요건상 CDN 링크는 불가하다. npm 의존 + 번들 경로는
ADR-0004(번들러 없음)와 충돌한다.

## 결정 (Decision)

런타임 외부 자산은 `vendor/`에 실물 파일로 벤더링한다.
`vendor-manifest.json`이 패키지별 npm 출처·버전·라이선스·파일 sha256을
선언하고, `check:vendor`가 매니페스트↔실물 정합을 게이트한다.
갱신은 `sync:vendor -- <key>`(npm pack → 복사 → 스탬프) 단일 절차로만.

## 대안 (Alternatives considered)

- **CDN 링크**: 기각 — CSP 위반 + 오프라인 불가
- **npm 의존 + 번들 import**: 기각 — 번들러 부재(ADR-0004)
- **vendor 파일 무관리(커밋만)**: 기각 — 출처·버전·변조 추적 불가.
  매니페스트+주간 `vendor-check.yml`(최신 버전 비교 이슈 보고)으로 커버

## 결과 (Consequences)

- versionFree 수동 자산(폰트 등)은 sync:vendor가 거부 — 수동 스탬프 절차
- vendor 파일의 수동 편집은 해시 불일치로 즉시 검출됨
- 공급망 리스크는 해시 고정 + 신규 버전 유예(AGENTS 규약 7일+)로 완화
