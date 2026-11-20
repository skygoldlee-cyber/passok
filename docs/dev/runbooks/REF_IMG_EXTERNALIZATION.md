# 🖼️ 참조자료 ref_md 이미지 외부 호스팅 이전 계획

> **최종 업데이트**: 2026-11-20
> **상태**: ✅ 파일럿 완료 — fireelec 전환 (에셋 364개 업로드·복원 검증·추적 해제)
> **목적**: `content/exams/<id>/참조자료/ref_md/**/images/*.webp` (git LFS 추적, 실측 ~1.5GB·전체 추적 콘텐츠의 ~83%)를 git 저장소·Vercel 배포에서 분리해 리포 증가율과 배포 크기를 줄이는 절차
> **관련 SPEC ID**: `RR-13` (참조자료 레지스트리) · `P-02` (프리캐시 자산) · `CS-03` (참조자료 경로·배포 제외 원칙)
> **문서 ID**: DOC-RBK-25
> **범위**: platform · 판본: none
> **선행 문서**: DOC-RBK-12 (PDF 외부화 — 동일 패턴) · DOC-DSN-48 (대형 자산 저장 검토)

---

## 1. 현황 — 왜 분리해도 안전한가

| 사실 | 근거 |
|------|------|
| 프리캐시 대상이 아니다 | `sw.js` `MD_ASSETS`는 `교재/**/images`만 포함 — ref_md 이미지는 열람 시점의 지연 요청 |
| 이미 지연 캐시로 동작한다 | `sw.js` fetch 핸들러가 `/ref_md/` 요청을 `DATA_CACHE`(배포 간 유지)에 Cache First로 저장 — 외부 오리진으로 바꿔도 "열람한 문서는 오프라인 유지"가 그대로 성립 |
| 페이지는 동일 오리진만 요청한다 | `src/reader/exam-viewer.js`·`html-viewer.js`가 `images/...` 상대경로를 `new URL(src, baseUrl)`로 절대화 — SW가 응답을 중계하므로 `<img>`·CSP(`img-src`) 변경 불필요 |
| 무결성 매니페스트 패턴이 있다 | `pdf_hashes.json`+`fetch_ref_pdfs.js`+`pdf_hosting.json`(DOC-RBK-12)을 그대로 확장 재사용 — 에셋명=sha256, 미러 폴백, 해시 검증 |
| 배포 크기가 곧 리포 크기다 | Vercel 정적 배포가 `content/`를 그대로 서빙 — 트리에서 빼면 배포도 함께 슬림 |

### 규모 실측 (2026-11-20, `audit:size` 기준)

| 항목 | 값 |
|------|-----|
| content/ 추적 총량 | ~1.81GB · 23개 팩 |
| 참조자료(ref_md 이미지 중심) | ~1.5GB — lossadj 413MB · insadj 124MB · iteng 106MB · distmgr2 95MB · labor 88MB · skincare 89MB · hairdresser 88MB … |
| `.git/lfs` 캐시 | 1.5GB (팩당 평균 ~65MB/팩·연 ~30개 신규 팩 페이스) |

**대상 범위**: `{contentRoot}/참조자료/ref_md/**/images/*.{webp,png}` 한정 — `교재/**` 이미지는 `MD_ASSETS` 프리캐시 대상이라 **제외**(오프라인 첫 화면 보존).

## 2. 설계 — PDF 외부화(DOC-RBK-12) 패턴 확장

### 2.1 매니페스트·호스팅 선언

- **`{contentRoot}/참조자료/refimg_hashes.json`** (신규, 추적) — `ref_md/<과목>/<문서>/images/<파일>` 상대경로 → sha256. `build:refimg`가 스캔 생성.
- **`pdf_hosting.json` 확장** — `imageManifests` 필드 추가:
  ```json
  { "assetBase": ".../ref-img-<exam>", "mirrors": [".../ref-assets-mirror"],
    "manifests": ["pdf_hashes.json"], "imageManifests": ["refimg_hashes.json"] }
  ```
  에셋 네이밍 = `<sha256>.webp` (PDF와 동일 계약 → 같은 릴리스 네임스페이스 공존 가능). `imageManifests` 선언 시험만 외부화 대상 — **팩별 옵트인 단계 이전**.
- **릴리스 태그**: `ref-img-<exam>` (팩별 신설) 또는 기존 `ref-pdf-<exam>` 릴리스 재사용 — 에셋명이 sha256 기반이라 PDF·이미지 에셋이 충돌 없이 공존 (fireelec 파일럿은 `ref-pdf-fireelec` 재사용). 미러는 `ref-assets-mirror` 이중화 — 기존 PDF 에셋 규약과 동일.

### 2.2 도구

| 도구 | 역할 | 진입점 |
|------|------|--------|
| `tools/sync/build_refimg_manifest.js` | 선언 시험의 ref_md 이미지 → sha256 매니페스트 생성 | `npm run build:refimg` |
| `tools/sync/fetch_ref_pdfs.js` 확장 | 로컬 부재·불일치 이미지를 에셋에서 복원 — `imageManifests` 키로 통합 처리 (별도 명령 없이 `fetch:refpdfs`가 전부 복원) | `npm run fetch:refpdfs` |
| `tools/sync/upload_ref_images.js` | 신규 에셋을 `gh` API로 업로드 — 기존 에셋 skip(재개 가능)·병렬 N | `npm run upload:refimgs` |
| `tools/check/check_refimg.js` | 선언 시험의 ref_md 이미지 ↔ 매니페스트 정합 + 게이트 (추적 잔재·누락 탐지) | `check:refimg` (content 프리셋) |

### 2.3 런타임 (sw.js)

`/ref_md/` 경로의 이미지 요청(`.webp|.png|.jpg`)에 대해:

1. `DATA_CACHE` 조회 — 히트 시 반환 (기존 동작 유지)
2. 미스 시 해당 시험의 `refimg_hashes.json`을 fetch(메모이즈) → 경로→sha 조회
3. sha 존재 → `assetBase/<sha>.<ext>` fetch (실패 시 mirrors 폴백) → `DATA_CACHE` 저장·반환
   - **CORS 우선**: 응답이 읽히면 sha256 검증 후 반환 (ACAO 부여 미러·전용 오리진 대비)
   - **no-cors 폴백**: GitHub Releases 에셋은 `Access-Control-Allow-Origin`을 부여하지 않아 CORS fetch가 실패 → `mode:'no-cors'` opaque 응답으로 수신해 그대로 반환·캐시 (해시 검증 불가 — 에셋명 자체가 sha256이고 `upload:refimgs`가 무결성을 보장하는 데 의존. 부재 에셋도 opaque로 보이므로 매니페스트↔릴리스 정합 게이트가 전제)
4. 매니페스트 부재·해시 없음 → 기존 동일 오리진 fetch 폴백 — **미이전 팩·전환기 무영향**

SW 기동 전 최초 방문(또는 SW 비지원) 환경은 동일 오리진 요청이 404 — 이전 팩은 배포에서 이미지를 뺀 뒤 SW 활성화가 전제. PWA 코어 동작 전제상 수용 (미수용 시 `<img>`를 assetBase 직결로 바꾸는 reader 수정이 대안 — 기각: 개발환경도 외부망 의존이 되어 기각).

### 2.4 이전 절차 (팩별)

1. `pdf_hosting.json`에 `imageManifests` 선언 + 릴리스 `ref-img-<exam>` 생성
2. `npm run build:refimg` → `refimg_hashes.json` 생성·커밋
3. `npm run upload:refimgs` → 에셋 업로드 (재개 가능 — 기존 에셋 sha 목록과 차집합만 전송) + 미러 동기화
4. `.gitignore`에 팩별 라인 추가: `content/exams/<id>/참조자료/**/images/` + `.vercelignore`에 깊이별 라인(`ref_md/*/images/`·`ref_md/*/*/images/` — 로컬 `vercel --prod`는 작업트리를 올리므로 필수) → `git rm -r --cached` (images 경로만) → 커밋
5. `npm run fetch:refpdfs`로 로컬 복원 확인 → `check:refimg`·`check:reffresh`·`check:content` 통과
6. `check:size --update`로 예산/스탬프 재책정 (트리 급감)

### 2.5 게이트·규약 변경

- `check:refimg` (신규): 선언 팩의 ref_md 이미지 ↔ 매니페스트 양방향 정합 — 새 이미지 추가 시 매니페스트 재생성 강제 (PDF의 check:reffresh와 대응)
- `check:size`: 이전 팩 예산 재책정 (급감분 스탬프)
- `.gitignore`: 팩별 `ref_md/**/images/` 라인 — 선언 없이 ignore만 추가하면 추적 유실이므로 check:refimg가 "선언↔ignore" 정합도 검증
- `convert:refs`(ref-pipeline): 새 문서 변환 시 이미지 산출 → `build:refimg`+`upload:refimgs` 후속이 PDF 워크플로에 추가
- `.vercelignore`: 팩별 `ref_md/*/images/`·`*/*/images/` 라인 — `vercel --prod`는 git이 아니라 작업트리를 업로드하므로 gitignore만으로는 배포가 슬림해지지 않음. check:refimg가 선언↔gitignore↔vercelignore 3자 정합 검증

## 3. 주의 사항

- **git 이력 잔존** — 추적 해제 후에도 과거 커밋·LFS 객체는 남는다 (DOC-RBK-12 §3와 동일). 즉시 효과는 작업트리·신규 클론·배포 크기; 이력 재작성(`filter-repo`)은 강제 푸시 동반 파괴 작업 — 별도 합의 없이 금지.
- **업로드 규모** — ~4만 에셋(팩 전체 일괄 시). `gh release upload`는 파일당 1요청 — 재개 가능 설계(기존 에셋 skip)·병렬 4~8이 필수. 팩 단위 이전이면 팩당 수백~수천 에셋으로 현실적.
- **오프라인** — 열람한 문서 이미지는 DATA_CACHE에 남아 오프라인 유지. 미열람 문서는 오프라인에서 이미지 없음 (현재도 동일 — 미캐시 리소스는 어차피 오프라인 불가).
- **opaque 캐시 한계** — no-cors 응답은 상태코드를 읽을 수 없어 부재 에셋(404)도 캐시될 수 있다. 매니페스트↔릴리스 에셋 정합(업로드 후 `gh release view` 확인)과 check:refimg 게이트가 예방선. 부재 캐시가 생기면 DATA_CACHE 항목 삭제로 복구.
- **에셋 삭제 금지** — sha256 명명은 불변 콘텐츠 주소. 문서 교체 시 구 sha 에셋은 잔존시켜야 구버전 캐시·롤백이 유효. 릴리스 정리는 매니페스트 미참조 에셋 감사 후 수행.
- **롤백** — git 이력+LFS 객체 잔존 → 선언·ignore 되돌리고 `git lfs pull`로 복원 가능.

## 4. 대안 비교

| 방식 | 장점 | 단점 | 판단 |
|------|------|------|------|
| Releases+sha256 에셋 (채택) | 검증된 패턴 재사용·비용 0·해시 무결성·미러 이중화 | 대량 업로드 시간·에셋 수 많음 | ✅ |
| R2/S3 등 전용 오리진 | 캐시·지역 최적화·관리 콘솔 | 계정·비용·새 인프라·키 관리 | 기각 — 규모 대비 과잉 |
| 콘텐츠 레포 분리(서브모듈) | 앱 리포 경량·독립 버저닝 | 체크아웃 UX 악화·배포는 여전히 대형 | 기각 — 배포 크기 미해결 |
| LFS 유지 + sparse만 | 변경 최소 | 리포·배포·대역폭 성장 지속 | 부분 채택 — 외부화 전의 완충으로 유지 |

## 5. 실행 순서 (Phase)

- **A. 도구** — 매니페스트 빌더·fetch·upload·check:refimg + pdf_hosting 스키마 확장 (런타임 무영향)
- **B. 런타임** — sw.js `/ref_md/` 이미지 외부 해석 + 매니페스트 캐시
- **C. 이전** — 팩별 §2.4 절차 (대형 팩 우선: lossadj → insadj → …) · 팩당 커밋 분리
- **D. 정리** — 예산·문서·COMMANDS 재생성, check:all

### 판정 기준

- `check:all` 통과 유지 · `audit:size` 총량 감소 확인 · 신규 클론 LFS smudge 시간 단축 · 배포 자산 크기 감소 (vercel 빌드 로그)
