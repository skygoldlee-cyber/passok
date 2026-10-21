# vendor/ 자산 거버넌스 설계 — 매니페스트 + 무결성 게이트 + 주기 신선도 감지

> 상위 문서: [SPEC](../SPEC.md) §2.3(의존성), §5.3(BP-13)
> **범위**: platform · 판본: none
> **상태**: 구현 완료 (2026-10-13)
> **관련 SPEC ID**: `BP-13`(vendor 자산 매니페스트·무결성 게이트) · `DA-02`(빌드 번들) · `PF-17`(폰트 서브셋)
> **문서 ID**: DOC-DSN-20

## 1. 배경·목적

`vendor/`의 자체 호스팅 라이브러리(FontAwesome·Mermaid·supabase-js·웹폰트)는 CSP 준수와 공급망 통제를 위한 의도된 선택이다(SPEC §4.3, ARCHITECTURE §18). 그러나 **버전·출처·갱신일을 기록한 진실 소스가 없어** 다음 문제가 있다:

- **버전 식별 불가** — mermaid.min.js는 minified 번들이라 파일만으로 버전을 알 수 없다(번들 내 `"10.9.8"` 문자열로 추정만 가능). FontAwesome은 CSS 헤더 주석(6.4.0), supabase-js는 번들 내 `supabase-js/x.y.z` 마커로만 식별 가능.
- **신선도가 사람 기억에 의존** — FontAwesome 6.4.0(2023-04)은 최신 7.3.1 대비 3개 메이버 뒤처진 채 발견되지 않았다.
- **무결성 게이트 없음** — vendor 파일이 부분 교체·오염돼도 감지할 구조가 없다(나머지 자산은 `verify:assets`·`check:reffresh`가 해시/존재를 강제).

목표는 **기존 게이트 패턴(check:reffresh의 해시 매니페스트 + notice-check.yml의 주기 이슈 생성)을 vendor에 그대로 적용**하는 것이다:

1. `vendor/vendor-manifest.json` — 패키지별 npm 출처·버전·라이선스·파일 sha256을 선언한 진실 소스
2. `tools/check/check_vendor.js` — 매니페스트 ↔ 실물 정합(존재·sha256·버전 문자열) + 미등록 파일 탐지
3. `tools/sync/sync_vendor.js` — `npm pack` 기반 갱신 절차 자동화(추출→복사→스탬프)
4. `.github/workflows/vendor-check.yml` — 주간 레지스트리 비교 → 뒤처진 패키지 이슈 생성

## 2. 비목표

- **devDependencies 전환** — vendor를 node_modules로 옮기면 `npm audit`·Dependabot을 공짜로 얻지만 "소스=배포물" 철학(Vercel 정적 배포에 빌드 스텝이 없다)과 충돌한다. vendor는 커밋된 정적 자산으로 유지한다.
- **자동 갱신 커밋** — 라이브러리 교체는 회귀 리스크가 있으므로 사람이 `sync:vendor`를 실행하고 `check:all`로 검증 후 커밋한다. 워크플로는 감지·이슈 생성까지만 한다.
- **SRI(Subresource Integrity)** — same-origin 자체 호스팅이므로 무의미. sha256 매니페스트는 무결성 검증용이지 브라우저 속성용이 아니다.
- **폰트 자동 갱신** — `vendor/fonts`는 사용 글자 서브셋(PF-17: 5.4MB→0.17MB)이라 npm 배포물과 해시가 다르다. 매니페스트에는 선언하되 무결성 검사 대상이며, registry 비교 대상에서는 제외(`versionFree`).

## 3. 매니페스트 스키마

`vendor/vendor-manifest.json`:

```jsonc
{
  "version": 1,
  "packages": {
    "fontawesome": {
      "npm": "@fortawesome/fontawesome-free",   // npm 패키지명 (registry 비교·sync 소스)
      "version": "6.4.0",                        // vendored 버전 — 진실 소스
      "license": "CC-BY-4.0 / SIL-OFL-1.1 / MIT",
      "updatedAt": "2026-10-13",
      "versionProbe": {                          // 파일 내 버전 문자열 검증 (선택)
        "file": "css/all.min.css",
        "pattern": "Font Awesome Free ([0-9.]+)"
      },
      "files": {                                 // path → sha256 (무결성 대상)
        "css/all.min.css": "<sha256>",
        "webfonts/fa-solid-900.woff2": "<sha256>"
      },
      "syncMap": {                               // 패키지 tarball → vendor 복사 매핑 (sync:vendor)
        "css/all.min.css": "css/all.min.css",
        "webfonts": "webfonts"                   // 디렉터리 키는 디렉터리 통째 복사
      }
    },
    "mermaid":  { "npm": "mermaid", "version": "10.9.8", "files": { "mermaid.min.js": "…" },
                  "syncMap": { "dist/mermaid.min.js": "mermaid.min.js" }, … },
    "supabase": { "npm": "@supabase/supabase-js", "version": "2.116.0",
                  "versionProbe": { "file": "supabase.js", "pattern": "supabase-js/([0-9.]+)" },
                  "files": { "supabase.js": "…" },
                  "syncMap": { "dist/umd/supabase.js": "supabase.js" }, … },
    "fonts":    { "versionFree": true, "source": "google-fonts-subset",
                  "note": "PF-17 서브셋 — npm 배포물과 해시 불일치. 갱신은 수동 subset 절차",
                  "files": { "fonts.css": "…", "noto-sans-kr-400.woff2": "…" } }
  }
}
```

설계 결정:

- **파일별 sha256** — 패키지 단위가 아닌 파일 단위 해시로 선언한다. 부분 교체(폰트 하나만 교체 등)까지 탐지되고, `syncMap`의 파일 단위 복사와 대응된다.
- **`versionProbe`** — 번들 내부 버전 문자열을 정규식으로 추출해 매니페스트 `version`과 교차 검증. minified 파일도 지원되는 패턴이 있으면 선언한다(supabase-js는 `supabase-js/x.y.z`, FontAwesome은 CSS 헤더). mermaid는 번들 내 유일 semver 문자열이 패키지 버전이라 `"version":"10.9.8"` 형태의 probe를 쓴다.
- **`versionFree`** — 서브셋·수작업 생성 파일(폰트)은 버전 비교 대상이 아니며 파일 무결성만 검사한다.

## 4. `check:vendor` — 무결성 게이트

`tools/check/check_vendor.js` — `check:reffresh`와 동일 계약(단독 실행, 불일치 exit 1):

| 검사 | 내용 |
|---|---|
| 미등록 파일 | vendor/ 아래 실존 파일이 매니페스트 `files`에 없음 → 선언 필요 오류 |
| 파일 소실 | 매니페스트에 선언됐으나 디스크에 없음 → 오류 |
| 해시 불일치 | sha256 불일치 → 무단 교체·부분 갱신 감지, `--update`로 재스탬프 안내 |
| 버전 정합 | `versionProbe` 추출값 ≠ 매니페스트 `version` → 오류 |

플래그:

- `--update` — 현재 파일 해시로 매니페스트 재스탬프(파일·버전 목록 변경은 수동 편집)
- `--latest` — 레지스트리 `npm view <npm> version`과 비교해 뒤처진 패키지 나열. **뒤처짐 = exit 2**(경고성 — 워크플로가 이슈 생성), 구조 불일치 = exit 1

편입: `steps.js`에서 `all` 프리셋 + `ci` 프리셋에 추가 — ci.yml에 대응 `run:` 토큰(`check:ciparity` 계약).

## 5. `sync:vendor` — 갱신 절차

```
node tools/sync/sync_vendor.js fontawesome@7.3.1
  ① npm pack <npm>@<ver> (임시 디렉터리)
  ② tarball 해제 → syncMap 규칙으로 vendor/<dir>/에 복사
  ③ manifest files sha256·version·updatedAt 재스탬프
  ④ 이후 npm.cmd run check:all로 회귀 검증 → 커밋
```

`@ver` 생략 시 최신(`npm view … version`). 다운로드·복사 외 로직은 없고, **매니페스트에 `syncMap`이 선언된 패키지만 갱신 가능**(폰트 등 수동 자산은 명시적으로 거부).

## 6. `vendor-check.yml` — 주기 신선도 워크플로

`notice-check.yml` 패턴 복제 — 매주 월요일 schedule + `workflow_dispatch`:

```
node tools/check/check_vendor.js --latest
  exit 0 → 최신, 종료
  exit 2 → 뒤처진 패키지 존재 → gh issue create
    제목: "📦 vendor 라이브러리 업데이트 — fontawesome 6.4.0 → 7.3.1"
    본문: 패키지별 현재↔최신 표 + sync:vendor 절차
```

정기 확인만 하고 커밋은 하지 않는다(상태 파일이 없으므로 notice-check보다 단순).

## 7. 경계·절충

- **해시 기준선의 신뢰** — 최초 매니페스트는 현재 파일을 기준선으로 스탬프한다. 기준선 생성 시점에 이미 오염된 파일이면 게이트는 그 오염을 "정상"으로 보존한다 — mermaid는 패키지 tarball과 해시를 대조해 정품임을 확인하고 스탬프했다(§검증).
- **minor/patch vs major** — 워크플로는 버전 차이만 보고하며 심각도 판단은 사람에게 넘긴다. major 점프(FA 6→7)는 아이콘 rename·CSS 변수 변경 리스크가 있어 별도 검토가 필요하다는 것을 이슈 본문에 명시한다.
- **오프라인 게이트 분리** — `check:vendor`(무결성)는 네트워크 없이 동작하고 `--latest`(신선도)만 네트워크를 쓴다. `check:all`·CI에는 무결성만 편입해 로컬·CI가 결정적으로 유지된다.

## 8. 구현 체크리스트

| 산출물 | 파일 |
|---|---|
| 매니페스트 | `vendor/vendor-manifest.json` |
| 무결성 게이트 | `tools/check/check_vendor.js` (`@spec BP-13`) |
| 갱신 스크립트 | `tools/sync/sync_vendor.js` (`@spec BP-13`) |
| 워크플로 | `.github/workflows/vendor-check.yml` |
| 명령 등록 | package.json `check:vendor`·`sync:vendor`, steps.js(all·ci), ci.yml |
| 테스트 | `tests/unit/gates/vendor-manifest.test.js` (`@spec BP-13`) |
| 문서 | AGENTS.md 명령 절 · GATE_MAP.md · docs/README.md 레지스트리 |
