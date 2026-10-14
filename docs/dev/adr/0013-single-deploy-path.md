# ADR-0013: 배포는 `npm run deploy` 단일 경로 — 스탬프는 비커밋

> **문서 ID**: DOC-ADR-13
> **범위**: platform · 판본: none
> **관련 SPEC ID**: P-13 (릴리스 노트·버전 스탬프)
> **상태**: accepted (2026-10-14 — 사후 백필)

## 상황 (Context)

`vercel --prod` 직접 실행은 미커밋 변경·미푸시 커밋을 프로덕션에 올린다.
또한 sw.js `CACHE_VERSION`·APP_VERSION·릴리스 노트 스탬프를 커밋하면
"chore(sw)" 이력 노이즈가 누적되고, 배포 버전과 코드 해시의 대응이 어긋난다.

## 결정 (Decision)

배포 진입점은 `tools/deploy/deploy.js` 단 하나 — clean tree + origin/main
동기화 가드 → 타입·린트 게이트 → sw/버전/릴리스 노트를 **작업 트리에만**
스탬프(비커밋) → `vercel --prod` → 성공 시 `deploy/<버전>` 어노테이티드
태그 push 후 스탬프 파일 원복. 배포 실패 시에도 원복.

## 대안 (Alternatives considered)

- **스탬프를 커밋(구 방식)**: 기각 — 커밋 이력 노이즈 + 배포 버전이 실제 코드
  해시를 가리키지 못함
- **Vercel Git 연동 자동 배포**: 기각 — push-triggered 배포는 스탬프와 양립 불가하다.
  `CACHE_VERSION`은 **배포 시점 커밋 해시**를 내포해야 하는데 Git 연동은 커밋된 상태만
  배포하므로 스탬프가 항상 한 커밋 늦는다. 또한 clean-tree·origin/main 가드가
  push 경로에는 끼어들 자리가 없다 (DEPLOYMENT_GUIDE는 Git 연동·Actions 자동화를
  보조 수단으로 문서화하되 "혼용 금지" 경고 — 단일 경로 원칙과 정합)
- **태그 대신 스탬프 커밋으로 이력 관리**: 기각 — 동일 사유

## 결과 (Consequences)

- `deploy/*` 태그가 배포 이력의 SSOT — 영향 분석·롤백 기준 ref로 사용
- 미푸시/오염 트리 배포는 가드가 차단 (우회 없음 — `vercel --prod` 직접 실행 금지)
- 배포 후 스모크(200·sw.js·APP_VERSION) 자동 통과 확인이 절차에 포함
