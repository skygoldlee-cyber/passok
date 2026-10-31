# Git LFS 마이그레이션 런북 — 이미지 자산 이력 이전

> **문서 ID**: DOC-RBK-21
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (저장소 위생 절차)
> **상태**: 전향 적용 완료(2026-10-31) / 이력 재작성 **로컬 완료** — push 미완(업로드 대역 부족으로 중단, §현재 상태)

## 배경·현재 상태

- `.git` ~559MB — 대부분 `content/**`의 webp 페이지 이미지(iteng 팩만 3,902장)와 과거 누적분.
- **2026-10-31 전향 적용 완료**: `.gitattributes`에 `content/**/*.{webp,png} filter=lfs` 선언 + `.githooks/pre-push`에 `git lfs pre-push` 수동 병합(기존 품질 게이트 보존).
- 이후 **신규·수정되는** 이미지는 LFS 포인터로 커밋된다. 기존 추적 blob은 그대로 — `.git` 크기는 즉시 줄지 않고 팽창만 멈춘다.

## 전제 조건 (머신별 1회)

- `git-lfs` 설치 (`git lfs version`으로 확인 — 본 환경 3.7.1)
- clone 직후: `git lfs install` — **단, 이 저장소는 `.githooks/` 커스텀 훅이라 충돌**. 이미 병합된 `pre-push`를 보존하려면 `git lfs update --manual` 출력을 참조해 수동 병합할 것 (`filter.lfs.*` 설정은 install이 수행 — 필수).

## CI·배포 영향

| 경로 | 영향 | 조치 |
|------|------|------|
| `vercel --prod` 배포 | **없음** — 로컬 작업트리 업로드라 git 미경유, smudge 필터가 실파일 복원 | — |
| GitHub Actions checkout | `actions/checkout` 기본은 LFS 미페치 → 신규 이미지가 **포인터 파일**로 보임 | 현재 게이트는 확장자·이름·참조 기반이라 통과. 이미지 "내용"을 읽는 게이트 추가 시 `lfs: true` 필요 (대역 주의) |
| GitHub LFS 쿼터 | 무료 1GB 저장·1GB/월 대역 | CI에서 `lfs: true` 쓰면 대역 급소모 — 켜지 말 것. 개발자 clone은 필요 시 `git lfs pull` |
| 로컬 게이트 | check:webp(확장자)·orphan-assets(텍스트 코퍼스 — 포인터는 텍스트라 스캔되나 무해) | 영향 없음 확인 |

## 이력 소급 이전 (선택 — 파괴적, 실행 전 확인 필수)

현재 추적 중인 webp ~7,100파일을 이력까지 소급 이전하면 `.git`이 수백 MB 축소된다. **모든 커밋 해시가 바뀐다** (2026-10-22 filter-repo 선례 있음).

```powershell
# 0) 사전 — 클린 트리 + 최신 동기화 + 로컬 백업 클론 권장
git status; git fetch origin; git pull --ff-only

# 1) 이력 재작성 (태그 포함 — deploy/* 태그도 재작성됨. 태그 "이름"의 구 sha 문자열은 바뀌지 않음)
git lfs migrate import --include="content/**/*.webp,content/**/*.png" --everything

# 2) 검증 — 파일 내용 일치 + LFS 포인터 확인
git lfs ls-files | head
npm.cmd run check:all:quick

# 3) 강제 푸시 (태그 포함)
git push --force-with-lease origin main --tags

# 4) 다른 로컬 클론은 re-clone 필수 (해시 전부 변경)
```

### 주의사항

- **해시 전량 변경**: 과거 커밋 참조(ci:diagnose 구 sha·EVAL의 커밋 인용·deploy 태그명의 sha 접미사)가 실제 해시와 어긋난다 — 이력은 이름/날짜로 추적.
- **force-push**: `.github` 브랜치 보호 규칙이 force-push를 막으면 일시 해제 후 복원.
- **푸시 후 LFS 객체 업로드**: migrate import 직후 첫 push는 수백 MB LFS 업로드 — 시간 소요.
- **선택적 범위**: `--everything` 대신 `--include-ref=refs/heads/main`으로 main만 재작성하면 태그는 보존되나 과거 이력의 blob은 남는다(축소 효과 반감).

## 현재 상태 (2026-10-31 실측)

- `git lfs migrate import --include="content/**/*.webp,content/**/*.png" --everything` **로컬 완료** — 3,710 커밋 재작성, `git lfs ls-files` 7,100개 확인
- 체크아웃 후 작업트리가 포인터 텍스트로 남는 문제 발생 → `git lfs checkout`으로 7,100개 실바이너리 복원 완료 (189MB)
- 로컬 백업 미러: `C:\Project\PassOK-backup-pre-lfs.git` (재작성 전 전체 refs 보존)
- **push 중단** — 업로드 실측 ~66KB/s로 장시간 소요 → 취소. 원격(origin/main)은 구 이력 그대로 **미변경**

### 재시도 절차 (빠른 네트워크에서)

```powershell
# 이미 업로드된 LFS 객체는 재전송되지 않음 — 이어서 진행됨
SKIP_PREPUSH=1 git push --force-with-lease origin main --tags
# --force-with-lease가 거부되면(원격 ref가 부분 갱신된 드문 경우) --force 사용
```

재시도 후 확인: `gh api repos/{owner}/{repo}/lfs/objects` 대신 `git lfs ls-remote origin`이 없으므로, `git ls-remote`로 main 해시 일치 + `git lfs pull`로 다른 클론에서 실파일 내려오는지 확인.

## 롤백

- 전향 선언만 되돌리기: `.gitattributes`의 LFS 2행 삭제 + pre-push의 LFS 블록 제거.
- migrate import 후: **되돌리기 실질 불가** — 사전 로컬 백업 클론(객체 포함 미러 `git clone --mirror`)만이 복원 경로.
