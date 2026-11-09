# 배포 파이프라인 속도 개선 설계 — 게이트 실패 반복·CI 직렬 대기 해소

> **작성일**: 2026-11-09
> **목적**: 배포 사이클의 비생산 시간(게이트 실패 재시도·CI 직렬 대기·중복 로컬 검사)을 구조적으로 줄인다.
> **관련 문서**: `tools/deploy/deploy.js` · `.githooks/pre-commit` · `.githooks/pre-push` · `tools/check/steps.js`
> **관련 SPEC ID**: `PF-18` (측정 조건과 동일 철학 — 랩 측정 우선) · `AD-10` (배포 알림) · 해당 없음의 규약 게이트로 간주
> **상태**: 설계 확정 — 일괄 적용 (2026-11-09)
> **문서 ID**: DOC-DSN-90
> **범위**: platform · 판본: none

---

## 1. 시간 분해 (2026-11-09 세션 실측)

| 단계 | 소요 | 성격 |
|---|---|---|
| pre-commit 게이트 | ~40-60초 | 커밋마다 필수 |
| pre-push 게이트 (12단계 병렬) | ~70초 | 문서 정합 단계 ~52-62초가 최대 비중 |
| **CI 대기** | **~9-15분/회** | 커밋 1건당 Actions 완주 — 파생물 커밋 시 2회 직렬 가능 |
| deploy.js 로컬 게이트·스테이징 | ~1-3분 | audit·types/lint·build + 9.7k 파일 스테이징 |
| Vercel 업로드 (~225MB) | ~3-5분 | 대부분 런타임 필수 자산 — .vercelignore로 이미 1GB+→225MB |
| **게이트 실패 재시도** | **각 ~2-15분** | trace 재생성·specrefs 파싱·filenames·doc-sync·coverage — 1회 세션 5건 관측 |

핵심 관찰: 페이로드는 이미 최적화돼 있고, 손실은 **직렬 대기 구조**와 **게이트 실패의 왕복 비용**에 집중한다.

## 2. 개선안 (구현 우선순위)

### A. 게이트 실패 반복 제거 — pre-commit에 자동 복구·조기 검사 (최우선)

| 실패 유형 | 현재 차단 시점 | 변경 |
|---|---|---|
| TRACE_MATRIX 신선도 | pre-push | **pre-commit에서 `--check` 실패 시 자동 재생성+스테이징** — 실패 대신 복구 |
| @spec 태그 파싱 오류 | pre-push | **pre-commit에 `check_spec_refs.js` 추가** (~1초) — 신규 테스트 헤더 오류가 원격까지 도달 못 함 |
| doc-sync / test-first | pre-commit (이미) | 유지 |

효과: 원격 푸시 후 실패(=재커밋+재푸시+CI 재대기 ~12분)를 로컬 ~3초로 축소.

### B. CI 직렬 대기 해소 — 게이트 순서 교체 + in-wait 폴링

**현재 구조** (deploy.js): `CI 게이트 → audit → types/lint → build → stamp → 스테이징 → 업로드`

- CI `in_progress`이면 **즉시 실패** — 이후 로컬 작업 ~7분을 전부 재실행 + 사용자가 수동 재호출
- 파생물 커밋 발생 시 새 커밋 CI를 기다려 **두 번째 재호출** 필요

**변경**:
1. CI 게이트를 **빌드 단계 직후**로 이동 — CI 대기 중 audit·types·build(~5-7분)를 병행 수행. CI 완료 시점엔 업로드만 남음
2. `in_progress`/`queued` 시 fail 대신 **폴링 대기** (30초 간격, 30분 상한 — 실패·취소면 즉시 차단 유지). 1회 호출로 end-to-end 완주

효과: 일반 경로 ~5-7분 절감 + 수동 재호출 제거. 위험: CI 실패 시 로컬 작업 낭비 — 빈도 낮아 수용.

### C. 로컬 중복 검사 축소 — `DEPLOY_TRUST_CI=1`

CI가 이미 검증한 audit·types/lint를 스킵하는 env 플래그 (기본 OFF — 옵트인). 트리가 origin/main과 동기 보장돼 CI와 동일 입력이므로 안전. 긴급 배포 경로용.

### D. 파생물 드리프트 조기 차단 — 후속 과제

pre-push에 `build:derived --check` 계열 신선도 단계 추가 검토 — deploy 중 파생물 커밋+2차 CI 대기를 푸시 시점으로 앞당긴다. 이번 범위 외 (steps.js 레지스트리 구조 변경 필요).

### E. 업로드 페이로드 — 후속 과제

225MB 중 대부분이 런타임 필수. 상위 100MB 구성 1회 감사 후 재검토.

## 3. 구현 범위 (이번 적용)

- [x] A — `.githooks/pre-commit`: TRACE 자동 재생성+스테이징, specrefs 추가
- [x] B — `tools/deploy/deploy.js`: CI 게이트를 빌드 후로 이동 + in-wait 폴링
- [x] C — `DEPLOY_TRUST_CI` env 플래그
- [ ] D·E — 후속 과제 (§2 비고)

## 4. 검증

- B 재설계는 배포 경로 핵심 — `DEPLOY_DRY_RUN` 없이 직접 실행하지 않고, 정상 deploy 호출로 dogfood 검증
- A·C는 스크립트 단순 구조 — 게이트 실행 실측 확인
- 회귀: CI 레드·비정상 상태에서 차단 동작은 기존 fail 경로 그대로 유지
