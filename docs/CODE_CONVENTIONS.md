# 📐 코드 규약 (Code Conventions)

> **문서 ID**: DOC-DEV-09
> **범위**: platform · 판본: none
> **관련 SPEC ID**: DA-13 (도메인 격리) · ID-05 (위치 비의존) · S-05 (이스케이프) · DA-12 (UI 텍스트) · UX-VFY-06 (모바일 잘림) · DA-05 · DA-07 · DA-09 (저장소)
> **최종 업데이트**: 2026-10-13
> 상위 문서: [AGENTS.md](../AGENTS.md) (작업 가이드·실무 체크리스트) · [ARCHITECTURE.md](dev/ARCHITECTURE.md) (구조 상세) · [DOC_CONVENTIONS.md](DOC_CONVENTIONS.md) (문서 규약 — 문서판 규약 모델)

본 문서는 소스 코드(`src/`·`css/`·html 파셜·`tests/`·`tools/`·`sw.js` 등 실행 가능 자산)의 **배치·명칭·금지 패턴·추적성** 규약의 단일 출처(SSOT)다. 문서 규약은 [DOC_CONVENTIONS.md](DOC_CONVENTIONS.md), 콘텐츠 절차는 `runbooks/CONTENT_WORKFLOW.md`, UI 표면 설계는 `design/UIUX_DESIGN_GUIDE.md`가 담당한다.

**적용 원칙**

- **기계 강제 우선** — 정적 게이트로 강제 가능한 규약은 `tools/check/`가 담당하고, 본 문서는 규약의 선언·판정 기준·게이트 매핑을 보관한다. 게이트 없는 규약은 리뷰 기준이다
- **심각도**: `금지` = 게이트 실패 또는 리뷰 반려 · `필수` = 기본 요구 · `권장` = 신규 코드 기준 우선 적용
- **명시 면제만 허용** — ALLOWED 목록·`esc-ok`·`@spec none` 등 면제는 도구별 인정 장치에 사유 기재로만 가능 (§9)
- **래칫** — 기존 위반은 기준선으로 승계하고 신규 유입만 차단, 기준선은 단조 감소 (§9)

---

## 1. 파일 배치·계층 규약

| 규약 | 심각도 | 강제 |
|------|--------|------|
| **계층 분류** — `domain-map.json`의 감시 디렉터리(src·css·html·data·content·tests) 내 모든 파일이 정확히 하나의 layer(`platform` / `feature:<이름>` / `domain:<examId>`)에 분류 | 필수 | `check:domainmap` |
| **도메인 격리** — 시험 전용 코드·마크업·스타일·테스트는 `src/exams/<id>/`·`html/exams/<id>/`·`css/exams/<id>/`·`tests/{unit,dom,e2e}/exams/<id>/`에 배치 (DA-13) | 필수 | `check:domainmap` |
| **계층 방향** — `src/views/` 뷰 컨트롤러는 셸 모듈(`SHELL_MODULES`: `app.js`·`router.js`·`command-palette.js`·`manual-viewer.js`·`ui-mode.js`)만 import 가능. 코어→views 역참조 금지 | 금지 | `check:imports` |
| **기능 게이트 파일** — `feature:<이름>` layer 파일은 해당 기능 플래그 시험에서만 로드·노출 | 필수 | `check:featflags` |
| **생성물 직접 편집 금지** — `index.html`·`data/`·`docs_md/`·`*_이야기형.md` 등은 빌드 명령으로만 갱신 | 금지 | 신선도 게이트(`check:html`·`check:datafresh` 등) |
| **로컬 절대 경로 하드코딩 금지** — 경로는 `import.meta`/`__file__` 기준 상대 해석 | 금지 | 리뷰 |

## 2. 명칭 규약

- 소스·스타일·마크업 파일은 ASCII `kebab-case` (`src/views/daily-challenge.js`, `css/app-responsive.css`)
- 테스트 파일은 러너별 접미사: `tests/unit/*.test.js` (node:test) · `tests/dom/*.dom.test.js` (Vitest+jsdom) · `tests/e2e/*.spec.js` (Playwright)
- 시험 종속 파일은 도메인 디렉터리 하위에 동일 패턴 (`tests/dom/exams/<id>/*.dom.test.js`)
- 클래식(비ESM) 스크립트는 부트스트랩·데이터 번들로 한정 — `exam-data-boot.js`·`pwa-manifest.js`·`theme-init.js` 등 (§6 저장소 예외와 연동)

### 2.1 파일명 대소문자 규칙 (`check:filenames` 게이트)

영역별 지배 패턴을 코드화 — **신규 파일만 적용**, 기존 일탈은 `tools/state/filename_baseline.json`으로 승계(단조 감소).

| 영역 | 패턴 | 예시 |
|---|---|---|
| `src/` · `html/` · `css/` · `tests/` · `.github/workflows/` | `kebab-case` | `textbook-reader.js`, `settings-occlusion.spec.js` |
| `tools/` | `snake_case` | `check_zlayer.js`, `build_all_data.js` |
| `docs/**/*.md` | `SCREAMING_SNAKE` 또는 한글 포함 | `DISCORD_COMMUNITY_SETUP.md`, `사업기획서.md` |
| `*.json` (전역) | `snake_case` 또는 `kebab-case` 단일 패턴 (혼용 금지) | `layer_registry.json`, `touch-targets.json` |
| 이미지·음성 자산 (`svg\|png\|jpg\|webp\|mp3\|mp4` …) | `kebab-case` — `content/` 한글 자산은 면제 | `discord-invite-qr.svg` |
| 루트(깊이 0) 파일 | 규약 면제 (관습적 이름) | `serve.js`, `package.json`, `AGENTS.md` |

## 3. 언어·서식

- **ES Modules 전용** (`import`/`export`) — 클래식 스크립트는 §2 한정 예외
- **들여쓰기 4칸 공백** — 실물 코드·`.editorconfig`(`indent_size = 4`)가 정본
- 개행 LF (`.gitattributes` `eol=lf` — 결정성 빌드 기반, ENGINEERING_PRACTICES §3)
- ESLint(`eslint.config.mjs`)는 버그성 규칙 위주 — 스타일 강제는 최소, `warn→error` 승격식 래칫
- `eqeqeq`·`prefer-const`·`no-var` 필수 (error)

## 4. 금지 패턴 (즉결 규약)

| 금지 | 대체 | 강제 |
|------|------|------|
| 인라인 `onclick`/`oninput` 등 HTML 핸들러 (CSP 차단) | `data-click`/`data-input`/`data-arg` 위임 + `app.js` 핸들러 맵 | `check:uistyle` |
| `element.style.display = …`·`.style.setProperty('display',…)` JS 인라인 표시 | 클래스 토글 (`is-hidden`·`nav-*-only` 선언적 게이팅 — UIUX_GUIDE EXP-6) | `check:uistyle` |
| 마크업의 인라인 `style="…"` 속성 (표시 상태·레이아웃 전면) | CSS 클래스·유틸리티 (`is-hidden`·`text-muted`·`mb-*`) | `check:uistyle` |
| `alert()`/`confirm()`/`prompt()` | `showConfirm`/`showAlert`/`showToast` (UX-FB-02) | `check:uistyle` |
| JS 템플릿 리터럴 내 인라인 `style="…"` — `display:none` 즉시 금지 · 정적 선언은 기준선 래칫(단조 감소) · 동적 값(`--var:${x}`)만 허용 | CSS 클래스 · 동적 값은 CSS 커스텀 프로퍼티 | `check:uistyle` |
| `localStorage` 직접 접근 | `storage.js` 추상화 + `storage-keys.js` 키 SSOT | `check:storage` |
| 미이스케이프 보간의 HTML 싱크 대입 (`innerHTML`·`insertAdjacentHTML`) | `sanitize.js` `html` 태그드 템플릿 또는 `esc()` 계열 (S-05) | `check:escape` |
| 위치 좌표(라인·인덱스·scrollTop)를 식별자·영속 키로 사용 | 콘텐츠 앵커 식별자 (`conceptId §`·`sid` — ID-05) | `check:posind` |
| 코어 모듈의 `views/` 역참조 | §1 계층 방향 | `check:imports` |
| platform 분류 HTML의 시험명·도메인 라벨 잔존 | `data-uitext` 키 + manifest.uiText (DA-12) | `check:uitext` |
| `role="dialog"` 카드의 `.dialog-card` 부재·버튼 나열 행 미줄바꿈 | 공용 `.dialog-card` 규약 (UX-FB-06·UX-VFY-06) | `check:mobilesafe` |
| `window` 전역 함수 추가 | `app.js` 위임 핸들러 맵 경유 | 리뷰 |
| 시크릿·키 커밋 | `check_secrets.js` ALLOWLIST 등록 경유 | `check:secrets` |

## 5. 상태·저장소·식별자 규약

- **저장소 단일 진입**: `localStorage`는 `src/storage.js`만 접근 — `scopedKey()` 시험 네임스페이스, 키 정의는 `storage-keys.js` (SSOT), 비네임스페이스 예외는 `GLOBAL_KEYS`에만
- **면제 목록**: `storage.js`·`exam-context.js`·`theme-init.js`·`pwa-manifest.js`·`pwa-install-capture.js`·`exam-data-boot.js` — 부트스트랩 시점 제약으로 추상화 불가 지점만 허용 (`check:storage` ALLOWED_FILES)
- **식별자는 콘텐츠 앵커**: 개념·진술·북마크는 `conceptId §`·`sid` 등 콘텐츠 기반 키 — 위치 좌표는 표시 전용(`#L`·`(LNN)` 표기)으로만 (ID-05)
- **강건성**: 배열 접근 bounds 체크 · `window.X` 존재 체크 · `parseInt` 후 `isNaN` · `getElementById` null 체크 · Promise `.catch` — 상세는 ARCHITECTURE 강건성 절
- **피처 플래그**: `exams.json features` 미선언 키 사용 = 영구 falsy 죽은 경로 — `hasFeature()`/`data-feature` 경유 (`check:featflags`)

## 6. UI·DOM 규약

- 이벤트는 `data-click`/`data-input` 위임 (CSP `script-src 'self'`) — 뷰별 리스너는 `views/listeners-*.js`
- UI 모드·기능 노출은 선언적 클래스·속성 게이팅 (`body.ui-mode-practice`·`nav-study-only`/`nav-practice-only`·`data-feature`) — JS가 인라인 display로 게이팅하지 않는다 (UIUX_GUIDE EXP-6)
- 도메인 라벨은 `data-uitext`로 중립화 — platform HTML에 시험명 하드코딩 금지 (DA-12)
- 접근성: 아이콘 전용 버튼 `aria-label` · 동적 피드백 `role="status" aria-live` · 헤딩 위계 순서 — 상세는 UIUX_DESIGN_GUIDE §6
- CSS: 디자인 토큰 변수 사용 · 브레이크포인트 768/900/1200 3단계 · `!important` 최소화 (Mermaid 규칙 예외) · 진입점 `style.css`의 `@import` 순서 유지

## 7. 추적성·동반 갱신 규약

- **`@spec` 헤더 필수** — SPEC 대상 파일은 구현 범위를 태그하고, 미해당 인프라는 `@spec none (사유)`로 의도적 미커버 명시 (`check:specrefs`가 양방향 검증)
- **요구사항 ID의 원천은 SPEC.md** — 코드·문서에서 신규 ID 발명 금지, 기능 추가는 SPEC ID 선부여 (Docs-First)
- **로직 변경 시 테스트 동반** — `check:testfirst` (`src/`·`ref-pipeline/` 로직 → `tests/`·`ref-pipeline/tests/` 동반)
- **문서 동반 갱신** — `check:docsync` (소스 변경 시 docs/·AGENTS·README 갱신)
- 신선도 게이트가 통과하는 생성물만 커밋 — `build:*` 실행 누락은 커밋 단계에서 차단됨

## 8. 규약 → 게이트 매핑

| 규약 | 게이트 | 체인 |
|------|--------|------|
| 계층 분류·도메인 격리 | `check:domainmap` | check:ci·CI |
| 계층 방향·import 정합 | `check:imports` | check:all·check:ci |
| 위치 비의존 (ID-05) | `check:posind` | check:ci·CI·pre-push |
| 저장소 추상화 | `check:storage` | check:docs·check:ci |
| 이스케이프 싱크 (S-05) | `check:escape` | check:ci·CI (기준선 래칫) |
| UI 텍스트 중립화 (DA-12) | `check:uitext` | check:ci·CI |
| 모바일 잘림 (UX-VFY-06) | `check:mobilesafe` | check:ci·CI |
| UI 스타일 (인라인 style·display 조작·인라인 핸들러·네이티브 다이얼로그·JS 템플릿 style 기준선) | `check:uistyle` | check:ci·CI |
| 성능 예산 | `check:perf` | check:ci·CI |
| 린트 규칙 | `npm run lint` | pre-commit·check:ci |
| 타입 진단 | `check:types` | pre-commit·check:ci |
| @spec·테스트 갭 | `check:specrefs` | pre-push·CI |
| 테스트·문서 동반 | `check:testfirst`·`check:docsync` | pre-commit·pre-push |
| 시크릿 | `check:secrets` | pre-commit |
| 생성물 신선도 | `check:fresh` 계열 | pre-commit·CI |

## 9. 예외·면제·래칫 규약

- 면제는 각 게이트의 명시 장치로만 가능: `ALLOWED_FILES`(storage) · `esc-ok` 라인 주석(escape, 사유 기재) · `@spec none`(추적) · `KEEP`/`examLiteralAllow`(도메인 리터럴) 등 — 사유 없는 면제·무단 우회 변수 남용 금지
- 우회 변수(`SKIP_*`·`[no-test]`·`[no-docs]`)는 일회성 비상용 — 영구 회피 수단으로 사용 금지
- 기존 위반은 기준선(`ESCAPE_GAP_BASELINE`·커버리지 기준선 등)에 승계 — 신규 유입 차단이 기본이며 기준선 상향(악화)은 금지, 정리 시 하향 조정(단조 감소)

## 10. 규약 변경 절차

1. 본 문서를 먼저 수정한다 (Docs-First — 규약이 정본)
2. 해당 게이트 도구·`AGENTS.md` 실무 규칙·관련 reference 문서와 충돌 검사 — 파생 문서는 규약을 복제하지 않고 본 문서를 참조
3. `npm.cmd run check:ci` 통과 후 커밋 — `CHANGES.md` 이력 기록
