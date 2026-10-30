# 🚑 장애·깨짐 증상 색인 (When Things Break)

> **문서 ID**: DOC-RBK-14
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (운영 색인 — 개별 절차의 정본은 각 런북·게이트 문서에 귀속)
> **최종 갱신**: 2026-10-14 (초기 골격 작성)

이 문서는 **색인**이다 — 절차의 정본을 여기 복제하지 않는다. "증상 → 유력 원인 → 진단 → 정본 문서"를
한 표로 라우팅하는 것이 목적이며, 절차 본문이 필요하면 표의 정본 링크로 이동한다.

- 게이트 실패별 복구 표의 정본은 **[GATE_MAP.md §3](../reference/GATE_MAP.md#3-흔한-실패-복구)** — 이 문서는 그 표로
  도달하기 위한 증상별 진입점과, GATE_MAP이 다루지 않는 **우회 장치·기준선 갱신 정당성**을 다룬다.
- 새 장애·오탐을 겪으면 **절차를 쓰기 전에 이 표에 증상 행을 먼저 추가**한다 (§6 기록 규약).

---

## 📋 목차

1. [배포된 앱 — 사용자 표면 증상](#1-배포된-앱--사용자-표면-증상)
2. [로컬 개발 — 커밋·푸시·도구 증상](#2-로컬-개발--커밋푸시도구-증상)
3. [게이트 계열 분류 — 어느 버킷인가](#3-게이트-계열-분류--어느-버킷인가)
4. [우회 장치 전체 일람](#4-우회-장치-전체-일람)
5. [기준선 갱신 — 정당한 리셋과 회귀 은폐의 구분](#5-기준선-갱신--정당한-리셋과-회귀-은폐의-구분)
6. [새 증상 기록 규약](#6-새-증상-기록-규약)

---

## 1. 배포된 앱 — 사용자 표면 증상

| 증상 | 유력 원인 | 진단 방법 | 복구 / 정본 |
|------|-----------|-----------|-------------|
| 배포 후 구버전이 뜨거나 백지 | SW 캐시가 구 셸을 서빙, 또는 스탬프 미적용 | `passok.vercel.app/sw.js`의 `CACHE_VERSION` ↔ 최신 `deploy/*` 태그 비교 | `npm.cmd run deploy` 재실행 (스탬프·스모크 자동). 절차: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| 오프라인에서 앱이 안 켜짐 | `SHELL_ASSETS` 프리캐시 누락 | `npm.cmd run verify:assets` | 누락 자산을 sw.js 목록에 추가 |
| 로그인·클라우드 동기화가 안 됨 | Supabase 미설정(정상 — 로컬 모드) 또는 프로젝트 키 문제 | 설정 메뉴에서 계정 상태 확인 | 설계: [SUPABASE_DESIGN.md](../design/SUPABASE_DESIGN.md), 운영: [Supabase SMTP 가이드](Supabase_Custom_SMTP_MagicLink_OTP_설정가이드.md) |
| 로그인·동기화 전면 실패 + `*.supabase.co`가 DNS 조회 실패 (NXDOMAIN·`ERR_NAME_NOT_RESOLVED`) | Free 프로젝트 7일 무활동 **일시정지** — 정지 시 서비스만이 아니라 DNS 레코드 자체가 제거되어 삭제와 증상 동일 | `nslookup <프로젝트ref>.supabase.co 8.8.8.8` — 여러 공용 리졸버(8.8.8.8·1.1.1.1)에서 모두 NXDOMAIN이면 정지 또는 삭제. **구분은 대시보드에서만 가능** | 대시보드 → 프로젝트 선택 → **Resume project** (데이터 유지, DNS 재전파 수 분~수 시간). 프로젝트가 목록에 없으면 삭제 — 스키마 재실행 필요. 예방·감지: [supabase-keepalive.yml](../../../.github/workflows/supabase-keepalive.yml) (핑 실패 = 정지 알림) — 정본: [SUPABASE_DESIGN.md §12](../design/SUPABASE_DESIGN.md#12-비시즌-비용-평가-supabase-free-keep-alive-채택-2026-10-17) |
| 배포는 됐는데 특정 기능만 죽음 | CSP 차단(인라인 스크립트/핸들러) 또는 런타임 오류 | 브라우저 콘솔 CSP 위반 로그 · `client_errors` 텔레메트리(`src/telemetry/error-telemetry.js`) | `check:uistyle`·`check:escape` 규약 위반 여부 확인 — [CODE_CONVENTIONS.md](../../CODE_CONVENTIONS.md) |
| 사용자 데이터(프로필·동기화·코드) 보호 경계가 의심됨 | Supabase RLS 정책 미적용·드리프트 | `npm.cmd run check:rls` — 공개 anon 키로 select 유출·insert·타인 user_id 스푸핑·redeem_code RPC 차단을 실측 (check:ci·CI 상시 게이트) | 정책 원본: `tools/supabase/schema.sql` §4 — 미적용 시 `npm.cmd run schema:apply` 또는 SQL Editor 재실행. 설계: [SUPABASE_DESIGN.md §3](../design/SUPABASE_DESIGN.md) |
| 데이터(진행률)가 사라짐 | localStorage 키 변경 또는 시험 전환 스코프 오인 | `src/storage-keys.js`의 `examId:` 스코프 규약 확인 | 백업/복원 경로: `src/views/backup.js` |
| 롤백이 필요함 | — | `git tag -l "deploy/*"`로 이전 배포 태그 조회 | Vercel 대시보드에서 이전 배포 promote 또는 태그 시점 재배포 — [DEPLOYMENT_GUIDE.md §5-3](DEPLOYMENT_GUIDE.md#5-3-롤백-절차-프로덕션을-이전-버전으로-복귀) |

## 2. 로컬 개발 — 커밋·푸시·도구 증상

| 증상 | 유력 원인 | 진단 방법 | 복구 / 정본 |
|------|-----------|-----------|-------------|
| `npm`/`npx` 명령이 차단됨 | PowerShell 실행 정책 | — | `npm.cmd`/`npx.cmd` 사용 (AGENTS.md 주의사항) |
| 커밋·푸시 시 게이트가 전혀 안 돎 | Git 훅 미설치 (opt-in) | `git config core.hooksPath` → `.githooks` 여부 | `npm.cmd run hooks:install` |
| 로컬은 통과, CI만 실패 | 로컬/CI 단계 비대칭 또는 미실행 단계 | `npm.cmd run check:ci`로 로컬 재현 | 비대칭은 `check:ciparity`의 CI_ONLY·LOCAL_ONLY 명단 확인 — [GATE_MAP.md](../reference/GATE_MAP.md) §2 |
| `check:ci`가 너무 느림 | 전체 유닛 대신 영향 테스트로 축소 가능 | `npm.cmd run check:ci -- --affected` | [GATE_MAP.md](../reference/GATE_MAP.md) §2 |
| 게이트 단계 자체가 예외로 죽음 | 체커 버그 또는 환경 문제 | `npm.cmd run check -- --step <id>`로 단독 재현 (`--list`로 id 조회) | 체커 자체 수정은 §5 "기준선 갱신" 규약과 무관하게 일반 버그로 처리 |
| `check:*` 단계가 실패했는데 어느 종류인지 모름 | — | 실패한 단계명을 §3 계열 표에 대입 | 복구 표 정본: [GATE_MAP.md §3](../reference/GATE_MAP.md#3-흔한-실패-복구) |
| `check:orphans`가 로컬은 통과·CI에서만 실패 | 탐지가 `git ls-files` 한정 — 미커밋 신규 자산은 미검출 | `git status`로 untracked 확인 | 커밋 후 재검사되므로 실패는 정상 — 파일을 참조시키거나 삭제 |
| `check:datafresh`가 첫 단계에서 즉시 중단 | 생성물 경로에 미커밋·미추적 변경 존재 (빌드 덮어쓰기 방지) | 오류가 나열한 파일 목록 = dirty 생성물 | 빌드 → 생성물 커밋 → 재검증. 순서 규약: [GATE_MAP.md §3](../reference/GATE_MAP.md#3-흔한-실패-복구) |
| pre-push가 불필요한 단계까지 돎 | 적응형 선별이 전체 폴백 | `tools/check/push_gate.js`의 파일 경로 태그 분류 확인 | 미분류 파일은 전체 실행이 정상 — 필요 시 태그 추가 |
| `scaffold:exam --remove` 후 게이트가 잔재를 잡음 | `manifest.<id>.webmanifest`·`.last-stats.<id>.json`·sw.js/registry 잔존 참조 | `git status`로 잔여물 확인 | `--remove`는 둘을 자동 삭제하도록 개선됨(구버전은 수동 삭제) — 이후 `build:data` 재실행으로 sw.js·exams.js 정리 |
| 신규 시험의 오프라인 부팅 실패 · registry 404 | `sw.js` DATA_ASSETS는 **기본 시험(cosmetic) 빌드 패스에서만** 재생성 + 존재하는 번들만 포함 → 첫 빌드에 신규 시험 누락 | `sw.js`의 DATA_ASSETS에 `data/exams/<id>/registry.js` 존재 여부 | `npm.cmd run build:data` **2차** 실행으로 반영 — [NEW_EXAM_RUNBOOK.md §3](NEW_EXAM_RUNBOOK.md#3단계--빌드--커밋--검증-순서-중요) |

## 3. 게이트 계열 분류 — 어느 버킷인가

실패 메시지가 어디 계열인지만 알면 복구 명령은 정해져 있다. 상세 표는 [GATE_MAP.md](../reference/GATE_MAP.md) §3이 정본.

| 계열 | 대표 단계 | 복구 패턴 |
|------|-----------|-----------|
| **신선도** (원본↔생성물) | `check:html` · `check:datafresh` · `check:drillfresh` · `check:embfresh` · `check:docbundles` · `check:trace` | 대응 빌드 재실행 (`build:html` · `build:data` · `build:drills` · `build:embeddings` · `build:trace`) |
| **선언 정합** (코드↔선언부) | `check:domainmap` · `check:featflags` · `check:plan` · `check:manifest` | 누락된 선언 추가 (domain-map.json · exams.json · feature-plan.json · manifest.json) |
| **규약 위반** (차단 목적) | `check:storage` · `check:uistyle` · `check:escape` · `check:posind` · `check:mobilesafe` | 코드를 규약으로 수정 — 우회는 §4, 기준선 건드리지 않음 |
| **문서 동반** | `check:docsync` · `check:testfirst` | 문서/테스트 추가 또는 정당한 면제 (`[no-docs]`·`[no-test]`) — §5 |
| **기준선 래칫** | `check:enc` · `check:orphans` · `check:teststats` · 커버리지 · `audit:study` | 잔재 정리 후 `--update`/`--stamp`로 하향 — §5의 정당성 조건 충족 시에만 |
| **콘텐츠 추적** | `check:reflines` · `check:numbering` · 인용 동기화 | `sync:citations` · `fix:citations` · `sync_textbook_files.js` — [CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md) |

## 4. 우회 장치 전체 일람

모든 우회는 **기록되지 않는 면제는 곧 회귀**라는 원칙 아래 있다. 어느 장치를 썼으면 그 사유가
커밋 메시지·CHANGES.md·이 문서 중 어딘가에 남아야 한다.

| 장치 | 위치·형태 | 면제 범위 | 정당한 사용 | 남용 시 깨지는 것 |
|------|-----------|-----------|-------------|-------------------|
| `git commit --no-verify` | 커밋 플래그 | pre-commit 전체 | 훅 환경 자체가 고장난 긴급 커밋 | 타입·린트·시크릿 오류가 푸시·CI로 밀림 |
| `SKIP_PRECOMMIT=1` | 환경 변수 | pre-commit 훅 전체 | 훅 셸 환경 고장 시 임시 | 동일 — 훅 전체 우회 |
| `SKIP_DOCSYNC=1` | 환경 변수 | docsync 모든 단계 | 문서 갱신이 의미 없는 기계적 변경 | 코드↔문서 괴리 누적 |
| `SKIP_TESTFIRST=1` | 환경 변수 | testfirst 모든 단계 | 순수 리네임·주석 변경 등 테스트 무의미 변경 | 로직 변경의 무테스트 유입 |
| `SKIP_PREPUSH=1` | 환경 변수 | pre-push 훅 | 훅 러너 자체 장애 시 임시 | CI로 전 단계 이연 |
| `PUSH_GATE_ALL=1` | 환경 변수 | (우회 아님 — 전체 강제) | 선별 신뢰가 의심될 때 | — |
| `PUSH_GATE_NOCACHE=1` · `--no-cache` | 환경 변수·플래그 | (우회 아님 — 결과 캐시 무시하고 재실행) | 통과 캐시가 stale하다고 의심될 때 | — |
| `[no-docs]` | 커밋 메시지 행 끝 | pre-push `--ref` 단계의 docsync, **그 커밋만** | 해당 커밋이 문서 영향 없음이 명확할 때 | pre-commit은 메시지 미존재로 인식 불가 — 다른 커밋은 계속 검사됨 |
| `[no-test]` | 커밋 메시지 행 끝 | pre-push `--ref` 단계의 testfirst, **그 커밋만** | 테스트 불필요 변경이 명확할 때 | 동일 |
| `style-ok` | 라인 토큰 | `check:uistyle` 해당 라인 | 불가피한 인라인 스타일 예외 | 라인 단위라 전파 쉬움 — 사유를 같은 라인에 |
| `seedkey-ok` | 라인 토큰 | `check:seedkeys` 해당 라인 | 의도적 전역 시드 | 시드 무력화 드리프트 |
| `esc-ok` | 라인 주석 | `check:escape` 해당 라인 | 검토를 마친 안전 보간 예외 | 미이스케이프 싱크 유입 |
| `@spec none` | 파일 헤더 주석 | 추적성 규약 | 순수 유틸·중앙 typedef 등 SPEC 귀속 불가 모듈 | 추적 매트릭스 공백 |
| 체커 내 허용 목록 | `ALLOWED_FILES`(check:storage) · `ALLOWLIST`(check:secrets 공개키) · `examLiteralAllow`/domain-map.json(check:domainmap 리터럴) · `tools/config/docs_paths_allowlist.json`(docs 경로 참조) | 해당 체커의 지정 파일·패턴 | 구조적 예외 — 부트스크립트·공개키·의도된 참조 | 명단이 커지면 게이트가 무의미해짐 — 추가 시 사유 필수 |

## 5. 기준선 갱신 — 정당한 리셋과 회귀 은폐의 구분

래칫 게이트의 기준선은 **남은 잔재의 스냅샷**이다. 갱신은 "줄였다는 증명 후 기준선을 낮추는 것"이며,
새 위반을 숨기려고 올리는 것(방향 역행)은 정상 플로우에 없다 — 기준선 파일(`tools/state/*_baseline.json`)의
수치가 올라가는 diff는 커밋 전 반드시 사유가 필요하다.

| 갱신 명령 | 대상 | 정당한 조건 |
|-----------|------|-------------|
| `node tools/check/check_replacement_char.js --update` | U+FFFD 잔재 | 잔재를 실제로 정리한 후에만 |
| `node tools/check/check_orphan_assets.js --update` | 고아 자산 | 삭제 또는 의도적 보존 사유 기입 후 |
| `npm.cmd run stats:stamp` | 테스트 수치 SSOT | 실제 테스트 수 변동 반영 |
| `npm.cmd run ratchet:coverage` | 커버리지 기준선 | 커버리지가 실제로 올랐을 때 |
| `npm.cmd run audit:study -- --update` | 학습 품질 기준선 | 규칙 변경의 의도적 반영 |
| `npm.cmd run check:vendor -- --update` | vendor 해시 | 수동 파일 변경을 정식으로 재스탬프할 때 (버전 갱신은 `sync:vendor`) |
| 소스 상수 직접 편집 (`--update` 없음) | `JS_STYLE_BASELINE`(`check_ui_style.js`) · `ESCAPE_GAP_BASELINE`(`check_html_escape.js`) | 잔재를 실제로 줄인 후 상수를 새 실측으로 하향 — 상향 diff는 회귀 은폐 |

> 게이트가 **진짜 회귀**를 잡았는데 기준선으로 덮는 것이 최악의 패턴이다. 판정 순서:
> ① 변경분이 의도된 동작인가 → ② 게이트 판정 로직이 틀렸나(체커 버그 — 코드 수정) →
> ③ 둘 다 아니면 기준선 갱신이 마지막 수단.

## 6. 새 증상 기록 규약

1. **증상 단위로 쓴다** — "check:X 실패"가 아니라 사용자가 보는 형태("배포 후 백지", "푸시가 막힘")로.
2. 절차 본문은 쓰지 않고 정본 링크로 라우팅한다 — 이 문서가 런북들의 사본이 되지 않도록.
3. 한 번 발생한 증상은 재발 가능성이 있다 — 임시 조치로 끝내지 말고 표에 행을 추가한다.
4. 우회 장치를 실제로 사용했다면 §4 표의 "정당한 사용"에 해당하는지 점검하고, 새 패턴이면 행을 추가한다.

### 기록된 사례 — 2026-10-14 문서 리허설

"낯선 눈" 리허설(무컨텍스트 에이전트 2세션: 신규 시험 온보딩·게이트 복구) + `rehearsal` 시험 실스캐폴드 E2E로 실증된 결함과 조치. 재발 방지 차원에서 발견 경위를 남긴다:

| 발견 | 성격 | 조치 |
|------|------|------|
| `check:datafresh`가 미커밋 생성물에서 즉시 중단 — "check 후 커밋" 순서로 문서화돼 실패 유도 | 문서가 실제와 다름 | GATE_MAP §3·NEW_EXAM_RUNBOOK §3에 "빌드→커밋→검증" 순서 명시, §2 표에 증상 행 추가 |
| `build_doc_bundles.js`가 `build:data` 체인 미포함 — 문서 편집 후 번들 미갱신 함정 | 누락된 절차 | AGENTS 명령어 표 + runbook에 별도 실행 명시 |
| 신규 시험 registry가 sw.js에 안 들어감 — 1차 빌드에선 파일 미존재(기본 시험 패스가 "존재하는 것만" 수집) | 사일런트 함정 | §1·§2 증상 행 + NEW_EXAM_RUNBOOK에 2패스 규칙 명시, E2E로 실증 |
| `scaffold --remove`가 `manifest.<id>.webmanifest`·`.last-stats.<id>.json` 잔존 | 도구 결함 | `tools/build/scaffold_exam.js`에 잔여물 삭제 + 도메인 자산 잔존 경고 추가 |
| `scaffold`의 "다음 단계" 안내가 `check:content -- --build`(datafresh 중단 유발 순서)를 지시 | 도구 출력의 stale 지침 | 동일 파일의 next-steps 출력을 런북 순서로 교정 |
| `CONTENT_WORKFLOW`가 `vercel --prod` 직접 실행 지시 — 단일 배포 경로 규약 위반 유도 | 문서가 규약과 충돌 | `npm run deploy`로 교정 |
| `TEXTBOOK_AUTHORING_GUIDE`의 "이야기형 자동 파생" 주장 — 실제는 `chapters[].storyFile` 선언 + `build:story` 생성물 | stale 주장 | STORY_PATCH_GUIDE 정본으로 라우팅 |

**리허설 교훈**: 문서에 정답이 *있는* 것과 문서가 정답으로 *인도하는* 것은 다르다 — 에이전트는 결국 정답에 도달했으나 잘못된 순서로 유도되는 함정을 여럿 밟았다. 분기별 재리허설 권장.

### 기록된 사례 — 2026-10-14 롤백 경로 리허설

롤백 경로(§1 표 "Vercel promote 또는 태그 시점 재배포")의 **실행 리허설** — 프로덕션 불개입:

| 단계 | 명령 | 결과 |
|------|------|------|
| 대상 선택 | `git for-each-ref --sort=-creatordate refs/tags/deploy` → `deploy/v20261014-1169ed2` (HEAD-19커밋) | ✅ |
| 복원 | `git worktree add ../passok-rollback <태그>` + `.vercel` 수동 복사(gitignore) | ✅ |
| 배포 검증 | `vercel deploy --yes` (preview — 프로덕션 불개입) | ✅ 배포 성공 |
| 스모크 | `vercel curl`로 index·sw.js·version.js 확인 — `CACHE_VERSION=v20261014-4b281f4` 일치 | ✅ |

리허설로 드러난 문서 결함·조치:

| 발견 | 성격 | 조치 |
|------|------|------|
| DEPLOYMENT_GUIDE에 롤백 절차 자체가 부재 — §1 표의 링크 대상이 공백 | 정본 부재 | 가이드 §5-3 신설 — 경로 A(대시보드 promote)·경로 B(태그 재배포) 명문화 |
| preview 배포는 SSO 보호로 익명 `curl`이 302 — 스모크는 `vercel curl` 필요 | 함정 | §5-3 절차에 명시 |
| 롤백은 `npm run deploy`를 쓸 수 없음 — 가드가 main 브랜치+HEAD CI 검사를 강제 | 설계 확인 | §5-3에 "단일 배포 경로의 명시적 예외"로 기록 |

**미검증 잔여**: 경로 A(대시보드 promote) 자체는 UI 클릭 경로라 이번 리허설에서 실행하지 않았다 — 재빌드 없는 alias 전환이라 리스크는 경로 B보다 낮다.

### 기록된 사례 — 2026-10-17 Supabase 프로젝트 일시정지 실측

비시즌(시험 연 2회) 무트래픽으로 실제 프로젝트가 정지된 사례 — 비용 대안 평가(SUPABASE_DESIGN §12) 중 발견, keep-alive 도입의 계기:

| 발견 | 성격 | 조치 |
|------|------|------|
| `hunpzznyiaddekuggupu.supabase.co`가 ISP DNS·8.8.8.8·dns.google 모두 NXDOMAIN | Free 정지 시 DNS 레코드 제거 — 클라이언트에서 정지와 삭제가 구분 불가 | §1 증상 행 추가 + [supabase-keepalive.yml](../../../.github/workflows/supabase-keepalive.yml) 일일 핑 도입 (핑 실패 = 정지 감지 알림 겸함) + SUPABASE_DESIGN §12.1에 실측 기록 — 인시던트 보고서: [INCIDENT_2026-10-17_SUPABASE_PAUSE.md](INCIDENT_2026-10-17_SUPABASE_PAUSE.md) |
| 정지 복구 경로는 대시보드 수동 Resume뿐 — API·CLI 복원 불가 | 운영 절차 필요 | §1 표에 Resume 절차 명시 (복원 후 DNS 재전파 수 분~수 시간) |

### 기록된 사례 — 2026-10-30 RLS 익명 침투 검증 실측

평가(EVAL_2026-10-30)에서 "RLS 설계 존재·배포 실검증 공백"으로 지적된 항목을 `tools/check/rls_probe.js`로 실측 해소 — 공개 anon 키(공격자 최대 권한)로 프로덕션에 침투 시도:

| 검증 | 결과 |
|------|------|
| select 유출 — profiles·sync_snapshots·pro_codes·feedback·client_errors·usage_events | 전부 행 0 (HTTP 200+빈 배열 — RLS 필터) |
| insert 거부 — profiles·sync_snapshots·pro_codes | HTTP 401/400 거부 (RLS 강제 입증) |
| 스푸핑 — feedback에 타인 user_id 심기 | HTTP 401 거부 (with check 정책) |
| RPC — redeem_code anon 호출 | HTTP 401 거부 (revoke execute) |

**잔여 공백**: 인증 사용자 간 격리(타인 JWT로 본인 아닌 행 접근)는 anon 키로 검증 불가 — 실계정 2개 필요. 프로브는 check:ci·CI 상시 게이트로 편입돼 정책 드리프트를 상시 감시.

---

## 🔗 정본 문서

- [GATE_MAP.md](../reference/GATE_MAP.md) — 게이트 4층 구조·실패별 복구 표 (정본)
- [VERIFY_DEPLOY_PIPELINE.md](VERIFY_DEPLOY_PIPELINE.md) — 배포 게이트 파이프라인·실패 복구 표
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Vercel 배포·트러블슈팅
- [MULTI_MACHINE_SETUP.md](MULTI_MACHINE_SETUP.md) — 새 머신 환경 재현
- [CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md) — 콘텐츠 변경 표준 절차
- [../adr/README.md](../adr/README.md) — 반복 제안 방지가 필요한 결정은 ADR로
