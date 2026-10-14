# ADR-0012: 콘텐츠 MD를 SSOT로, 생성 번들은 커밋한다

> **문서 ID**: DOC-ADR-12
> **범위**: platform · 판본: none
> **관련 SPEC ID**: BP-01~13, CS-01~10
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

교재·문제은행은 사람이 편집하는 MD이고, 앱이 소비하는 형식(과목별 번들·
인덱스·임베딩)은 다르다. 생성물을 gitignore하면 정적 호스팅에서 런타임
빌드가 불가하고, 파서를 빌드/런타임 양쪽에 두면 발산한다.

## 결정 (Decision)

`content/exams/<id>/`의 MD가 SSOT — `build:data`가 `data/exams/<id>/`
번들로 변환하고 **생성물도 커밋**한다. 빌드 파서와 런타임 파서는
`textbook-core.js`를 공유하고 `check:parser`가 등가성을 검증한다.
신선도는 생성물별 게이트(datafresh·drillfresh·embfresh·docbundles)가 감시.

## 대안 (Alternatives considered)

- **런타임 MD 파싱**: 기각 — 초기 로드에 파싱+인덱싱 비용, 모바일에서 큼
- **생성물 gitignore + 배포 파이프라인 빌드**: 기각 — Vercel 정적 배포 단순성과
  충돌, 로컬↔프로덕션 산출물 동일성(리뷰 가능한 diff) 상실
- **빌드·런타임 파서 각각 유지**: 기각 — 파서 발산이 실제 버그를 만들었음
  (check:parser가 등가성을 게이트로 고정)

## 결과 (Consequences)

- 콘텐츠 편집 → `build:data` → 번들 커밋이 필수 절차 (CONTENT_WORKFLOW 정본)
- 인용 라인번호 같은 좌표 계열은 표시층에 한정 — 식별자 계층은 ADR-0008이 차단
- `check:datafresh`는 빌드 체인 재실행 후 git diff 비교로 신선도를 자동 원복 검증
