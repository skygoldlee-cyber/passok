# Devin + agent-browser — 사용자환경 E2E 자동화 구축 가이드

> **문서 ID**: DOC-DSN-45
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (테스트 인프라 가이드)
> **목적**: 수험생의 실제 사용 흐름(가입 → 학습 → CBT → 진도 저장 → 이용권)을 브라우저와 DB 양쪽에서 자동 검증하는 체계 설계
> **원본**: `tmp/source-docs/PASSOK_E2E_자동화_구축가이드.pdf` (v1.2 보완판, 2026-11-09 작성 — 로컬 전용, git 미추적) 마크다운 변환
> **주의**: 문서의 URL·테이블명·경로는 예시. 실제 PASSOK 저장소 구조에 맞게 사전 조사(Phase 0) 결과로 치환할 것

## 이번 보완판에서 추가·수정된 내용

- **테스트 환경 분리 설계** — Vercel Preview + Supabase 테스트 프로젝트, 상태별 테스트 계정 4종, 시드 데이터
- **Magic Link 인증 자동화** — 메일함 없이 Supabase Admin API로 로그인 링크 발급, state save로 세션 재사용
- **검증된 agent-browser 명령 레퍼런스** — viewport/device, console·errors, network requests, session, auth, record
- **실행 가능한 예시 코드** — 공통 라이브러리(lib.sh), CBT 시나리오, DB·RLS 검증 스크립트, 반응형 검사
- **안정적인 선택자 규칙(data-testid)**과 탐색형/회귀형 테스트의 역할 분리
- **Devin 작업지시서 단계화** — Phase별 산출물과 완료 기준(Definition of Done)
- **CI/CD 연동** — Preview 배포 완료 시 자동 실행하는 GitHub Actions 예시, Vercel 배포 보호 우회 헤더
- **흔한 실패 원인과 대응**, 4주 구축 로드맵
- **agent-browser 대안 도구 비교** — Playwright Test Agents·MCP/CLI, Chrome DevTools MCP, Stagehand, Browser Use, 실기기 클라우드의 장단점과 PASSOK 추천 조합

---

## 1. 전체 구조와 역할 분담

핵심은 "페이지가 열리는가"가 아니라 **실제 수험생이 하는 일을 끝까지 수행했을 때 화면과 데이터가 모두 맞는가**를 검증하는 것입니다.

agent-browser는 AI 에이전트가 터미널 명령으로 브라우저를 조작하도록 만든 Vercel Labs의 오픈소스 CLI이므로, 터미널 중심으로 일하는 Devin과 잘 맞습니다.

```
Devin → agent-browser → PASSOK PWA (Vercel Preview 배포) ↔ Supabase (테스트: 인증·DB·진도·RLS)
기능 개발·테스트 작성·    사용자 행동 재현·스냅샷·
실패 원인 분석·수정      스크린샷·콘솔/네트워크 수집
```

테스트 보고서(`latest-report.md`) → Devin이 원인 분석·수정 → 회귀 테스트 재실행 → 필수 테스트 전부 통과 시 운영 배포

### 도구별 역할

| 도구 | 역할 | 언제 쓰는가 | 권장도 |
|------|------|------------|--------|
| agent-browser | AI가 화면을 읽고(접근성 스냅샷 + ref) 조작하는 탐색형 테스트, 그리고 셸 스크립트로 고정한 시나리오 실행 | 새 기능 첫 검증, UI 변경 확인, 버그 재현 | 핵심 |
| Supabase 검증 스크립트 | 화면 결과가 DB에 올바르게 저장됐는지, 다른 사용자 데이터가 차단되는지(RLS) 확인 | 모든 쓰기 동작 직후 | 핵심 |
| Playwright | 정형화된 회귀 테스트를 빠르고 결정적으로 반복 실행 | 안정화된 시나리오를 CI에 고정할 때 | 추천 |
| Vitest | 적응형 학습 엔진·이용권 만료 계산 등 순수 로직 단위 테스트 | 로직 변경 시 | 추천 |
| Lighthouse | 성능·접근성·PWA 점수 | 주 1회 또는 배포 전 | 추천 |

두 가지 사용 방식을 구분하세요.

1. **탐색형**: Devin이 `snapshot -i`로 화면을 읽고 판단하며 진행합니다. 새 화면에 강하지만 실행마다 경로가 조금씩 달라질 수 있습니다.
2. **스크립트형**: 같은 명령을 `.sh` 파일로 고정하고 `data-testid` 선택자로 조작합니다. 매번 같은 결과가 나와야 하는 회귀 테스트는 이 방식으로 만듭니다.

탐색형으로 찾은 흐름을 스크립트형으로 굳히고, 충분히 안정되면 Playwright로 옮기는 순서가 효율적입니다.

## 2. 사전 준비: 테스트 환경 분리

자동화 테스트는 가입·답안 제출·이용권 변경처럼 데이터를 쓰는 동작을 반복합니다. 운영 DB와 분리하지 않으면 테스트가 실제 수험생 데이터와 통계를 오염시킵니다. 구현 전에 아래 네 가지를 먼저 갖춥니다.

### 2-1. 환경 구성

| 구분 | 운영 | 테스트 |
|------|------|--------|
| 프론트엔드 | Vercel Production (운영 도메인) | Vercel Preview 배포 URL 또는 Devin 내부 localhost |
| Supabase | 운영 프로젝트 | 별도 테스트 프로젝트(또는 Supabase Branching / 로컬 `supabase start`) |
| 환경변수 | Production 환경변수 | Preview 환경변수에 테스트 프로젝트 URL·anon key 지정 |
| 결제 | 실제 입금 확인 | 관리자 승인 API/화면만 사용, 실제 금융거래 없음 |

### 2-2. 상태별 테스트 계정 4종

만료까지 30일을 기다릴 수 없으므로, 시간이 지난 상태를 시드 데이터로 미리 만들어 둡니다.

| 계정 | 시드 상태 | 검증 용도 |
|------|-----------|-----------|
| `qa-new@…` | 가입 직후, 이용권 없음 | 신규 사용자 흐름, 결제 안내 노출, 유료 콘텐츠 차단 |
| `qa-active@…` | 이용권 활성(만료 20일 남음), 학습 이력 일부 | 학습·CBT·진도 복원 등 대부분의 시나리오 |
| `qa-expired@…` | 이용권 만료(만료일 = 어제) | 만료 사용자 접근 제한, 연장 안내 |
| `qa-admin@…` | 관리자 권한 | 입금 승인 → 이용권 활성화, 관리자 화면 접근 |

시드는 `tests/fixtures/seed.sql`(또는 스크립트)로 만들어 매 실행 전 같은 상태로 초기화합니다. 만료일 경계(오늘 23:59, 내일 00:00 KST)처럼 시간대가 얽힌 계산은 Vitest 단위 테스트로도 함께 검증합니다.

### 2-3. 안정적인 선택자: data-testid 규칙

문구("제출하기")나 CSS 클래스로 버튼을 찾으면 디자인을 바꿀 때마다 테스트가 깨집니다. 핵심 요소에 테스트 전용 속성을 붙이는 규칙을 정합니다. 애플리케이션 동작은 바뀌지 않는 최소 변경이므로, 이 부분만은 앱 코드 수정을 허용합니다.

```html
<button data-testid="cbt-submit">제출하기</button>
<div data-testid="cbt-score">{score}점</div>
<li data-testid="cbt-choice-3">…</li>
```

```
# 명명 규칙: {화면}-{요소}[-{번호}]   예) login-email, flashcard-next, pass-expiry-date
```

### 2-4. 비밀정보 관리

- 테스트 계정 비밀번호, Supabase service role key, Vercel 보호 우회 토큰은 Devin의 Secrets 기능(CI에서는 GitHub Secrets)에만 저장하고 저장소에 기록하지 않습니다.
- service role key는 **테스트 프로젝트의 것만** 사용합니다. 운영 키는 테스트 환경 어디에도 두지 않습니다.
- 로그인 상태 파일(`tests/.auth/*.json`)에는 세션 토큰이 들어 있으므로 `.gitignore`에 추가합니다.

## 3. Devin 환경에 agent-browser 설치

```bash
npm install -g agent-browser
agent-browser install --with-deps     # Chrome for Testing + Linux 시스템 의존성 설치
agent-browser --help
```

Devin의 작업 머신은 리눅스이므로 `--with-deps`를 붙여 시스템 라이브러리까지 설치하는 편이 안전합니다. 세션마다 다시 설치하지 않도록 Devin의 저장소/머신 환경 설정 단계에 위 명령을 등록해 두세요(메뉴 명칭은 Devin 버전에 따라 다를 수 있습니다).

### 동작 확인

```bash
export BASE_URL="https://<preview-url>"      # 테스트 대상 URL
agent-browser open "$BASE_URL"
agent-browser wait --load networkidle
agent-browser snapshot -i                      # 클릭 가능한 요소와 ref(@e1, @e2…) 목록
agent-browser screenshot --annotate tests/screenshots/home-annotated.png
agent-browser errors                           # JS 예외가 없어야 정상
agent-browser close
```

### Devin에게 남겨둘 지식(Knowledge) 항목 예시

Devin이 매번 같은 방식으로 테스트하도록, 아래 내용을 Devin의 Knowledge 또는 Playbook으로 등록해 두면 좋습니다.

```
[PASSOK E2E 규칙]
- 테스트 대상은 항상 $BASE_URL(Preview 또는 localhost). 운영 도메인 금지.
- 전체 회귀: ./scripts/test-e2e.sh  / 단일: ./tests/e2e/cbt.test.sh
- 요소 선택은 data-testid 우선, 없으면 snapshot -i의 ref 사용 후 data-testid 추가를 제안.
- 실패 시 tests/reports/runs/<실행ID>/ 의 스크린샷·console·errors·network 로그를 근거로 원인 분석.
- 앱 코드 수정은 data-testid 추가를 제외하고 사용자 승인 후에만.
```

## 4. agent-browser 핵심 명령 레퍼런스

공식 저장소 README 기준(2026-11 확인)으로 PASSOK 테스트에 필요한 명령만 추렸습니다.

| 명령 | PASSOK 활용 |
|------|------------|
| `open <url>` / `close` | 페이지 진입 / 브라우저 종료 |
| `snapshot -i` | 버튼·입력창 등 상호작용 요소와 ref 파악 (탐색형의 핵심) |
| `click @e2` · `click "[data-testid=x]"` | ref 또는 선택자로 클릭 |
| `fill @e3 "텍스트"` | 로그인·검색·주관식 입력 (기존 값 지우고 입력) |
| `get text <sel>` · `get url` · `get title` | 점수·오류 메시지·현재 경로 확인 |
| `wait --text "…"` · `wait --url "**/result"` | 문구 표시·페이지 전환 대기 |
| `wait --load networkidle` · `wait "#spinner" --state hidden` | 데이터 로딩 완료 대기 |
| `screenshot f.png --full` · `--annotate` | 전체 페이지 / 요소 번호가 표시된 스크린샷 |
| `set viewport 390 844 3` · `set device "iPhone 14"` | 모바일·태블릿·PC 화면 크기 전환 |
| `set offline on|off` | 네트워크 단절·복구 시 PWA 동작 |
| `set headers '{"x-vercel-protection-bypass":"…"}'` | 보호된 Preview 배포 접근 |
| `console --json` · `errors` | 콘솔 메시지·미처리 JS 예외 수집 |
| `network requests --status 4xx` · `--filter api` | 실패한 API 요청 수집 |
| `network route <url> --abort` | 특정 API 장애 상황 재현 |
| `state save|load <path>` · `open --state <path>` | 로그인 세션 저장 후 재사용 (매번 로그인 불필요) |
| `--session <name>` / `AGENT_BROWSER_SESSION` | 계정별·실행별 브라우저 격리 |
| `eval "<js>"` | localStorage·Service Worker 등 내부 상태 진단 |
| `record start f.webm` / `record stop` | 실패 재현 영상 (ffmpeg 필요) |

## 5. 테스트 시나리오 카탈로그

모든 시나리오에 UI 검증과 데이터 검증을 함께 정의합니다. 우선순위 P1은 배포 차단 조건, P2는 경고, P3는 주기 점검입니다.

| ID | 영역 | 우선 | 사용자 흐름 · UI 검증 | 데이터 · 보안 검증 |
|----|------|------|---------------------|-------------------|
| T-001 | 회원 인증 | P1 | 가입 → Magic Link 로그인 → 로그아웃 → 재로그인, 새로고침 후 로그인 유지 | auth.users·프로필 행 생성, 세션 만료 처리 |
| T-002 | 접근 제어 | P1 | 비로그인 상태로 학습·CBT URL 직접 접근 시 로그인 화면으로 이동 | 다른 사용자 진도·답안 조회 시 0건(RLS) |
| T-003 | CBT 응시 | P1 | 시험 선택 → 문제 풀이 → 제출 → 점수·정오답·해설 표시 | 답안·점수 행이 해당 사용자로 저장, 화면 점수 = DB 점수 |
| T-004 | 진도 저장·복원 | P1 | 학습 중간 이탈 → 새로고침/재로그인 → 이어서 학습 | 진도 행 1건만 갱신(중복 생성 없음) |
| T-005 | 학습 콘텐츠 | P2 | 과목 → 챕터 → 이야기형 교재 → 플래시카드 → 완료 표시 | 완료 상태 저장 |
| T-006 | 적응형 학습 | P2 | 오답 누적 후 취약 과목 표시·오답 재출제·추천 노출 | 추천 결과가 시드 이력에서 기대되는 과목과 일치 |
| T-007 | 이용권 | P1 | 만료 계정: 유료 콘텐츠 차단·연장 안내 / 활성 계정: 만료일 표시 | 만료일 계산(KST 경계) 일치 |
| T-008 | 입금 승인 | P2 | 관리자 승인 → 대상 계정 재접속 시 이용 가능 | 승인 기록·이용권 시작/만료일 30일 |
| T-009 | 반응형 | P2 | 3개 화면 크기에서 주요 화면 스크린샷·가로 스크롤 검사 | — |
| T-010 | PWA·네트워크 | P3 | 오프라인 전환 시 안내, 복구 후 답안 제출 성공 | 오프라인 중 입력의 유실·중복 저장 여부 |
| T-011 | 품질 신호 | P1 | 모든 시나리오 공통: 미처리 JS 예외 0건, 5xx 응답 0건 | console·errors·network 로그 첨부 |

첫 구현 대상은 **T-003 CBT 응시**를 추천합니다. 로그인 → 시험 선택 → 풀이 → 채점 → 저장까지 PASSOK의 핵심 경험이 한 흐름에 모두 들어 있어, 하나만 만들어도 공통 라이브러리·인증 재사용·DB 검증 구조가 함께 완성됩니다.

## 6. 저장소 구조

```
PASSOK/
├── tests/
│   ├── e2e/
│   │   ├── lib.sh                 # 공통 함수: 단계 기록, 검증, 실패 증거 수집
│   │   ├── auth-setup.sh          # 계정별 로그인 → state 파일 저장
│   │   ├── auth.test.sh           # T-001, T-002
│   │   ├── cbt.test.sh            # T-003
│   │   ├── progress.test.sh       # T-004
│   │   ├── learning.test.sh       # T-005, T-006
│   │   ├── pass.test.sh           # T-007, T-008
│   │   └── responsive.test.sh     # T-009
│   ├── db/
│   │   ├── verify-cbt.mjs         # 화면 결과 ↔ DB 비교
│   │   └── rls-check.mjs          # 사용자 간 데이터 격리 검사
│   ├── fixtures/
│   │   ├── seed.sql               # 계정 4종 + 이용권 + 학습 이력
│   │   └── magic-link.mjs         # Admin API로 로그인 링크 발급
│   ├── scenarios/                 # 사람이 읽는 시나리오 문서 (student-journey.md 등)
│   ├── .auth/                     # 로그인 상태 파일 (gitignore)
│   └── reports/
│       ├── initial-audit.md
│       ├── latest-report.md
│       └── runs/<실행ID>/         # 스크린샷·로그 (gitignore 또는 CI 아티팩트)
└── scripts/
    ├── test-e2e.sh                # 시드 초기화 → 전체 실행 → 보고서 생성
    └── test-regression.sh         # P1만 빠르게
```

## 7. 구현 예시 코드

아래는 Devin이 출발점으로 삼을 수 있는 골격입니다. 테이블명(`cbt_attempts` 등)과 경로는 Phase 0 조사 결과로 바꿔야 합니다.

### 7-1. 공통 라이브러리 `tests/e2e/lib.sh`

실패하는 순간의 스크린샷·콘솔·JS 예외·실패 요청을 자동으로 모아, Devin이 "왜 실패했는지"를 바로 분석할 수 있게 합니다.

```bash
#!/usr/bin/env bash
set -uo pipefail
: "${BASE_URL:?BASE_URL 환경변수가 필요합니다}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
OUT="tests/reports/runs/$RUN_ID"; mkdir -p "$OUT"
RESULTS="$OUT/results.tsv"; touch "$RESULTS"
CURRENT_TEST="(none)"

ab() { agent-browser "$@"; }

begin_test() {             # begin_test T-003 "CBT 응시" [state파일]
  CURRENT_TEST="$1"; echo "=== $1 $2" | tee -a "$OUT/log.txt"
  export AGENT_BROWSER_SESSION="passok-$RUN_ID-$1"
  if [[ -n "${BYPASS_TOKEN:-}" ]]; then
    ab set headers "{\"x-vercel-protection-bypass\":\"$BYPASS_TOKEN\"}"
  fi
}

step() { echo "  ▶ $*" | tee -a "$OUT/log.txt"; }

collect_evidence() {       # 실패 시 증거 수집
  local tag="$CURRENT_TEST-$1"
  ab screenshot "$OUT/$tag.png" --full       >/dev/null 2>&1
  ab console --json   > "$OUT/$tag-console.json" 2>/dev/null
  ab errors           > "$OUT/$tag-errors.txt"   2>/dev/null
  ab network requests --status 4xx > "$OUT/$tag-net4xx.txt" 2>/dev/null
  ab network requests --status 5xx > "$OUT/$tag-net5xx.txt" 2>/dev/null
  ab get url          > "$OUT/$tag-url.txt"      2>/dev/null
}

check() {                  # check "설명" 명령...
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf "%s\tPASS\t%s\n" "$CURRENT_TEST" "$desc" >> "$RESULTS"
  else
    printf "%s\tFAIL\t%s\n" "$CURRENT_TEST" "$desc" >> "$RESULTS"
    collect_evidence "$(echo "$desc" | tr ' /' '__')"
    return 1
  fi
}

expect_text() { check "문구 표시: $1" ab wait --text "$1"; }
expect_url()  { check "URL 이동: $1"  ab wait --url "$1"; }
expect_no_js_errors() {
  local n; n=$(ab errors 2>/dev/null | grep -c . || true)
  check "JS 예외 0건 (현재 $n)" test "$n" -eq 0
}
end_test() { expect_no_js_errors; ab close >/dev/null 2>&1; }
```

### 7-2. Magic Link 로그인 자동화 `tests/fixtures/magic-link.mjs`

메일함을 열지 않고 Supabase Admin API로 로그인 링크를 직접 발급합니다. 테스트 프로젝트의 service role key로만 실행합니다.

```js
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.auth.admin.generateLink({
  type: "magiclink",
  email: process.argv[2],
  options: { redirectTo: `${process.env.BASE_URL}/auth/callback` },
});
if (error) { console.error(error.message); process.exit(1); }
console.log(data.properties.action_link);   // 이 링크를 브라우저로 열면 로그인 완료
```

`tests/e2e/auth-setup.sh` — 계정별 로그인 상태 저장:

```bash
source tests/e2e/lib.sh
mkdir -p tests/.auth
for who in active expired admin; do
  begin_test "SETUP-$who" "로그인 상태 저장"
  link=$(node tests/fixtures/magic-link.mjs "qa-$who@example.com")
  ab open "$link"
  expect_url "**/dashboard"
  ab state save "tests/.auth/$who.json"
  ab close
done
```

### 7-3. CBT 시나리오 `tests/e2e/cbt.test.sh` (T-003)

```bash
#!/usr/bin/env bash
source tests/e2e/lib.sh
begin_test T-003 "CBT 응시 전체 과정"

step "로그인 상태로 시험 목록 진입"
ab --state tests/.auth/active.json open "$BASE_URL/cbt"
ab wait --load networkidle
check "시험 목록 표시" ab wait "[data-testid=cbt-exam-list]"

step "모의고사 1회 선택 후 시작"
ab click "[data-testid=cbt-exam-1]"
ab click "[data-testid=cbt-start]"
expect_url "**/cbt/**/q/1"

step "시드 정답표에 따라 1~5번 응답 (3정답·2오답)"
for pick in 2 4 1 3 3; do
  ab click "[data-testid=cbt-choice-$pick]"
  ab click "[data-testid=cbt-next]"
done

step "제출 및 결과 확인"
ab click "[data-testid=cbt-submit]"
expect_url "**/result"
SCORE=$(ab get text "[data-testid=cbt-score]" | tr -dc '0-9')
check "화면 점수 = 60 (기대값)" test "$SCORE" = "60"
check "해설 표시" ab wait "[data-testid=cbt-explanation-1]"

step "DB에 같은 점수로 저장됐는지 검증"
check "DB 점수 일치" node tests/db/verify-cbt.mjs qa-active@example.com "$SCORE"
end_test
```

### 7-4. 데이터 검증 `tests/db/verify-cbt.mjs`

```js
import { createClient } from "@supabase/supabase-js";
const [email, uiScore] = process.argv.slice(2);
const sb = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY);
const { data: users } = await sb.auth.admin.listUsers();
const uid = users.users.find(u => u.email === email)?.id;
const { data, error } = await sb.from("cbt_attempts")          // ← 실제 테이블명으로 교체
  .select("score, user_id, created_at").eq("user_id", uid)
  .order("created_at", { ascending: false }).limit(1).single();
if (error || !data) { console.error("저장된 응시 기록 없음", error); process.exit(1); }
if (String(data.score) !== String(uiScore)) {
  console.error(`불일치: 화면 ${uiScore} / DB ${data.score}`); process.exit(1);
}
console.log("OK", data);
```

### 7-5. 사용자 간 데이터 격리 검사 `tests/db/rls-check.mjs` (T-002)

service role이 아니라 일반 사용자 권한(anon key + 사용자 로그인)으로 다른 사람의 데이터를 조회해 0건이어야 통과입니다. 화면 테스트로는 잡기 어려운 보안 결함을 직접 확인합니다.

```js
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_ANON_KEY);
await sb.auth.signInWithPassword({ email: "qa-active@example.com", password: process.env.QA_PW });
const otherId = process.env.QA_EXPIRED_UID;                     // 다른 테스트 계정
for (const table of ["cbt_attempts", "learning_progress", "passes"]) {
  const { data } = await sb.from(table).select("id").eq("user_id", otherId);
  if (data?.length) { console.error(`RLS 누출: ${table} ${data.length}건`); process.exit(1); }
}
console.log("RLS OK");
```

> RLS 검사용 계정은 비밀번호 로그인을 허용한 **테스트 프로젝트 전용** 계정이어야 합니다. 운영에서 Magic Link만 쓰더라도 테스트 프로젝트에서는 이 목적에 한해 비밀번호 로그인을 켜 둘 수 있습니다.

## 8. 반응형 · PWA 검사 기준

### 8-1. 화면 크기와 검사 대상

| 환경 | 설정 | 대상 화면 |
|------|------|-----------|
| PC | `set viewport 1440 900` | 홈, 로그인, 과목 목록, 이야기형 교재, 플래시카드, CBT 문제, CBT 결과, 이용권 안내 |
| 태블릿 | `set viewport 768 1024 2` | (동일) |
| 모바일 | `set device "iPhone 14"` 또는 `set viewport 390 844 3` | (동일) |

### 8-2. 가로 스크롤 자동 판정

스크린샷은 사람이 보는 증거이고, 판정은 숫자로 합니다.

```bash
for size in "1440 900" "768 1024" "390 844"; do
  ab set viewport $size
  for path in / /cbt /study /pass; do
    ab open "$BASE_URL$path"; ab wait --load networkidle
    name="$(echo $size | tr ' ' 'x')$(echo $path | tr '/' '_')"
    ab screenshot "$OUT/resp-$name.png" --full
    over=$(ab eval "document.documentElement.scrollWidth - window.innerWidth")
    check "가로 스크롤 없음 $name (초과 ${over}px)" test "${over:-0}" -le 0
  done
done
```

### 8-3. 육안 검사 체크리스트 (Devin이 스크린샷을 보고 판정)

- 버튼·메뉴가 잘리거나 겹치지 않는가
- 입력창이 화면 밖으로 나가지 않는가
- 모달·팝업이 화면 안에 표시되고 닫을 수 있는가
- 본문 글자 크기가 모바일에서 읽을 만한가(16px 내외)
- 터치 대상이 충분히 큰가(약 44px 이상)
- CBT 보기 문항이 줄바꿈 후에도 구분되는가

### 8-4. PWA 동작

| 항목 | 방법 |
|------|------|
| Service Worker 등록 | `eval "navigator.serviceWorker.getRegistrations().then(r=>r.length)"` 결과 1 이상 |
| 오프라인 안내 | `set offline on` 후 페이지 이동 → 오프라인 안내 문구 확인 |
| 복구 후 제출 | `set offline off` → 답안 제출 성공, DB에 1건만 저장 |
| API 장애 | `network route "**/rest/v1/cbt_attempts*" --abort` → 사용자에게 오류 안내가 보이는가 |
| manifest·아이콘 | Lighthouse PWA 항목으로 점검 |

화면 크기 전환은 실제 스마트폰의 터치, 가상 키보드, 홈 화면에 설치된 PWA, iOS Safari 고유 동작을 완전히 대신하지 못합니다. **배포 전 실제 iPhone(Safari)과 Android(Chrome) 각 1대로 설치·로그인·CBT 제출을 수동 확인하세요.**

## 9. 테스트 보고서 형식

`scripts/test-e2e.sh`가 `results.tsv`를 집계해 `tests/reports/latest-report.md`를 생성합니다. Devin이 바로 수정 작업에 들어갈 수 있도록 실패마다 재현 방법과 증거 파일 경로를 포함합니다.

```markdown
# PASSOK E2E 보고서 — 2026-11-09 14:20 KST (RUN 20261109-142003)
- 대상: https://passok-git-feat-cbt-….vercel.app  (commit a1b2c3d)
- 환경: agent-browser vX.Y / Chrome for Testing / Supabase test
- 결과: 47 검증 중 45 통과, 2 실패  → 판정: 배포 차단 (P1 실패 1건)

## 실패 요약
| ID | 우선 | 검증 | 증거 |
|----|------|------|------|
| T-003 | P1 | DB 점수 일치 (화면 60 / DB 40) | runs/…/T-003-DB_점수_일치.png, -console.json |
| T-009 | P2 | 가로 스크롤 없음 390x844_cbt (초과 24px) | runs/…/resp-390x844_cbt.png |

## T-003 상세
- 재현: ./tests/e2e/cbt.test.sh  (계정 qa-active)
- 관찰: 결과 화면 60점, cbt_attempts.score = 40
- 단서: errors 0건 / network 4xx 없음 / 마지막 2문항 답안이 저장 요청에 누락
- 추정 원인: 제출 시 마지막 문항 답안이 반영되기 전 요청 전송
- 수정 제안: 제출 핸들러에서 현재 문항 답안을 확정한 뒤 저장

## 콘솔 경고 (실패는 아님)
- …
```

### 판정 규칙

- P1 실패 1건 이상 → **배포 차단**
- P2 실패 → 배포 가능하되 이슈 등록
- 같은 테스트가 재실행에서 통과하면 불안정(flaky)로 표시하고, 대기 조건을 보강할 때까지 통과로 치지 않습니다.

## 10. Devin 작업지시서 (보완판)

아래 내용을 그대로 Devin에 전달합니다. 한 번에 전부 맡기기보다 Phase 단위로 요청하고 각 Phase 결과를 검토하는 것을 권장합니다.

```
[목표]
PASSOK에 Vercel Labs agent-browser 기반 E2E 테스트 체계를 구축한다.
실제 수험생 관점의 흐름을 브라우저와 Supabase 데이터 양쪽에서 검증한다.

[절대 원칙]
1. 운영 도메인·운영 Supabase에 접속하거나 데이터를 쓰지 않는다. 대상은 $BASE_URL(Preview/로컬)뿐이다.
2. 실제 결제·금융거래를 수행하지 않는다.
3. 키·비밀번호·세션 파일을 저장소에 커밋하지 않는다(Secrets 사용, tests/.auth는 gitignore).
4. 앱 코드는 data-testid 추가만 허용한다. 그 외 수정은 제안서로 남기고 승인을 받는다.
5. 테스트 코드와 앱 코드를 분리한다.

[Phase 0 — 사전 조사]  산출물: tests/reports/initial-audit.md
- 프레임워크·실행 방법·라우트 목록, 인증 방식(Magic Link 흐름과 callback 경로)
- Supabase 테이블(진도·CBT 답안·이용권·결제 승인)과 RLS 정책 현황
- 기존 테스트 유무, Vercel Preview 환경변수 구성
- 테스트 환경 분리 방안(테스트 프로젝트/Branching/로컬) 제안
완료 기준: 위 항목 표로 정리 + 추가가 필요한 data-testid 목록

[Phase 1 — 기반]  산출물: 설치 확인 로그, lib.sh, seed, magic-link, auth-setup
- npm i -g agent-browser && agent-browser install --with-deps
- 테스트 계정 4종(new/active/expired/admin) 시드와 초기화 스크립트
- auth-setup.sh로 계정별 state 파일 생성
완료 기준: ./tests/e2e/auth-setup.sh 가 3회 연속 성공

[Phase 2 — 핵심 P1 시나리오]
- T-003 CBT → T-004 진도 → T-001/T-002 인증·접근제어 → T-007 이용권 만료
- 각 시나리오에 DB 검증 포함, T-002는 rls-check.mjs 포함
완료 기준: P1 전부 3회 연속 통과, 실패 시 증거 파일 자동 생성 확인

[Phase 3 — P2/P3, 반응형]
- T-005, T-006, T-008, T-009, T-010
완료 기준: 3개 화면 크기 스크린샷 + 가로 스크롤 수치 판정

[Phase 4 — 보고서와 자동화]
- scripts/test-e2e.sh: 시드 초기화 → 전체 실행 → latest-report.md 생성
- GitHub Actions 워크플로 초안 (Preview 배포 완료 시 P1 실행)
완료 기준: 고의로 버그를 넣은 브랜치에서 P1 실패·배포 차단이 보고서에 나타남

[각 Phase 종료 시 보고]
- 만든 파일 목록, 실행 결과, 발견한 앱 결함(재현 방법 포함), 다음 Phase 계획
```

## 11. CI/CD 연동

Devin 내부 브라우저와 GitHub Actions는 서로 다른 실행 환경이므로, CI에도 설치와 비밀정보 설정이 따로 필요합니다. Vercel이 Preview 배포를 마치면 GitHub에 `deployment_status` 이벤트가 발생하므로 이를 트리거로 씁니다.

```yaml
# .github/workflows/e2e.yml
name: PASSOK E2E
on: deployment_status
jobs:
  e2e:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      BASE_URL: ${{ github.event.deployment_status.environment_url }}
      BYPASS_TOKEN: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      TEST_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
      QA_PW: ${{ secrets.QA_PW }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm i -g agent-browser && agent-browser install --with-deps
      - name: 운영 URL 차단 가드
        run: case "$BASE_URL" in *vercel.app*|*localhost*) ;; *) echo "운영 URL 금지"; exit 1;; esac
      - run: ./scripts/test-regression.sh          # P1만
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report
          path: tests/reports/
```

Preview에 Vercel 배포 보호(Deployment Protection)가 켜져 있으면 **Protection Bypass for Automation** 비밀값을 발급해 `x-vercel-protection-bypass` 헤더로 전달합니다(`lib.sh`의 `begin_test`가 처리).

이 워크플로를 GitHub의 브랜치 보호 규칙에서 **필수 상태 검사**로 지정하면, P1 실패 시 main 병합이 막혀 운영 배포까지 차단됩니다. 전체 시나리오(P2·P3 포함)는 매일 새벽 정기 실행(`schedule`)으로 돌려 실행 시간을 PR에서 분리합니다.

## 12. 운영 원칙 · 흔한 실패 원인

| 증상 | 흔한 원인 | 대응 |
|------|-----------|------|
| 가끔만 실패한다(flaky) | 데이터 로딩 전에 클릭·텍스트 확인 | `wait --load networkidle`, 스피너 `--state hidden` 대기, 고정 `wait 2000` 남용 금지 |
| 디자인 수정 후 대량 실패 | 문구·클래스 기반 선택자 | `data-testid`로 교체 |
| 두 번째 실행부터 실패 | 이전 실행 데이터가 남아 상태가 달라짐 | 실행 전 시드 초기화, 테스트끼리 계정 공유 금지 |
| 로그인 단계에서 멈춤 | Magic Link redirect URL 미허용, state 파일 만료 | Supabase Auth의 Redirect URL에 Preview 도메인 패턴 등록, 실행마다 auth-setup 재실행 |
| Preview 접속 시 401/로그인 화면 | Vercel 배포 보호 | 보호 우회 헤더 사용 |
| 만료 테스트가 날짜마다 다름 | UTC/KST 경계, 실행 시각 의존 | 시드에 상대 날짜(now() - interval) 사용, 경계는 단위 테스트로 고정 |
| CI에서만 브라우저 실행 실패 | 리눅스 의존성 누락 | `agent-browser install --with-deps` |
| 화면은 맞는데 데이터가 틀림 | 낙관적 UI 업데이트 후 저장 실패 | 모든 쓰기 시나리오에 DB 검증 필수화 |

### 운영 원칙 요약

- 운영 DB·운영 결제에는 절대 접근하지 않습니다. CI에 운영 URL 차단 가드를 둡니다.
- 실패는 반드시 재현 명령·계정·증거 파일과 함께 기록합니다.
- 테스트가 통과했다는 것은 "검증한 범위에서 문제가 없다"는 뜻입니다. 실제 기기 확인과 사람의 사용성 검토를 대신하지 않습니다.

## 13. agent-browser 대안 도구와 장단점 비교

agent-browser는 가볍고 빠르지만, PASSOK처럼 같은 시나리오를 계속 반복 검증해야 하는 프로젝트에서는 **결과가 코드로 남는 도구**가 장기적으로 유지보수에 유리합니다. 아래는 2026-11 기준 주요 대안입니다.

### 13-1. 도구별 개요

| 도구 | 제공 | 성격 |
|------|------|------|
| Playwright Test + Test Agents | Microsoft | v1.56부터 planner(앱 탐색 → Markdown 계획)·generator(계획 → 테스트 코드)·healer(실패 테스트 자동 수리) 에이전트 내장. AI가 만들고, 결과는 일반 Playwright 코드로 남음 |
| Playwright MCP / CLI | Microsoft | 접근성 트리 기반으로 에이전트가 브라우저를 직접 조작. CLI판은 MCP보다 토큰 사용량이 훨씬 적은 신규 방식 — agent-browser의 직접 대체재 |
| Chrome DevTools MCP | Google Chrome 팀 | CDP로 실행 중인 Chrome을 조작·검사. 성능 트레이스, Web Vitals, 네트워크 분석에 강함("관찰" 도구) |
| Stagehand | Browserbase | Playwright 위의 AI SDK. 코드 + 자연어 지시 혼합, 실행한 동작을 캐시해 반복 비용 절감 |
| Browser Use | Browser Use 팀 | Python 기반 완전 자율 에이전트. 매 실행마다 LLM이 실시간 판단 |
| 실기기 클라우드(BrowserStack 등) | 상용 | 실제 iPhone·Android에서 기존 Playwright 테스트 실행 |

### 13-2. 장단점 비교

| 도구 | 장점 | 단점 | PASSOK 활용 |
|------|------|------|------------|
| **agent-browser (현재안)** | 설치·사용이 매우 간단한 CLI · 스냅샷 ref 방식이라 토큰 효율 좋음 · 셸 스크립트로 바로 고정 가능 | Chromium 계열 중심(Safari/WebKit 검증 불가) · 단언(assert)·리포트·병렬 실행을 직접 구현해야 함 · 비교적 신생 프로젝트, 옵션 변경 잦음 | 빠른 탐색·버그 재현용 |
| **Playwright Test + Agents** | 결과가 결정적 코드 → CI에서 AI 없이 매번 동일 실행 · Chrome·Firefox·WebKit·Edge 지원 · 자동 대기, 병렬, HTML 리포트, 트레이스 뷰어 내장 · healer가 선택자 변경 자동 수리 | TypeScript 테스트 코드 학습 필요 · 초기 설정(seed 테스트·인증 fixture) 수고 · healer 수정 결과는 사람이 검토해야 함 | 회귀 테스트 주력 (배포 차단 기준) |
| **Playwright MCP / CLI** | agent-browser와 같은 탐색형 사용 가능 · Playwright Test와 같은 엔진 → 탐색 결과를 테스트 코드로 옮기기 쉬움 · 멀티 브라우저 | MCP판은 도구 정의·스냅샷으로 토큰 소모 큼 · CLI판은 아직 신규라 자료가 적음 | Devin의 탐색형 검증 (agent-browser 대체) |
| **Chrome DevTools MCP** | 성능 프로파일링(트레이스, Web Vitals) · 콘솔·네트워크 심층 분석 · 실행 중인 브라우저 상태 진단 | 공식 지원은 Chrome / Chrome for Testing만 · 시나리오 테스트 프레임워크가 아님 · 도구 수가 많아 컨텍스트 소모 | 실패 원인·"모바일에서 느림" 분석 보조 |
| **Stagehand** | UI 변경에 강함(자연어로 요소 지정) · 동작 캐시로 반복 비용 절감 · Playwright 코드와 혼용 가능 | LLM API 비용·지연 발생 · AI 판단 구간은 완전 결정적이지 않음 · Browserbase 생태계 의존도 | 콘텐츠 화면 개편이 잦은 시기의 보조 수단 |
| **Browser Use** | Python 친화적 · 목표만 주면 스스로 계획·탐색 · 클라우드 병렬 실행 옵션 | 실행마다 경로가 달라 회귀 판정에 부적합 · 매 실행 LLM 비용 · 실패 원인 재현이 어려움 | "처음 온 수험생처럼" 사용성 탐색 점검 |
| **실기기 클라우드** | 실제 iOS Safari, 설치형 PWA, 가상 키보드 검증 · 기존 Playwright 테스트 재사용 | 유료(월 구독) · 실행 속도 느림 · 기기 대기 시간 | 배포 전 주 1회 실기기 확인 |

### 13-3. 선택 기준 요약

| 판단 기준 | agent-browser | Playwright Test | Playwright MCP/CLI | DevTools MCP | Stagehand | Browser Use |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| 반복 실행 결과 일관성 | 중 | 상 | 중 | 중 | 중상 | 하 |
| Safari(WebKit) 검증 | ✕ | ○ | ○ | ✕ | ○ | △ |
| CI 통합 용이성 | 중 | 상 | 중 | 하 | 중 | 하 |
| UI 변경 내성 | 중 | 중(healer) | 중 | 중 | 상 | 상 |
| 실행 비용(LLM) | 탐색 시만 | 없음(생성 시만) | 탐색 시만 | 사용 시만 | 있음(캐시로 감소) | 매번 |
| 성능·디버깅 분석 | 중 | 중(트레이스) | 중 | 상 | 하 | 하 |
| 도입 난이도 | 쉬움 | 보통 | 쉬움 | 쉬움 | 보통 | 쉬움 |

> ○ 지원 · △ 설정에 따라 가능 · ✕ 미지원. 평가는 공식 문서와 2026년 공개 비교 자료를 바탕으로 한 PASSOK 관점의 상대 평가입니다.

### 13-4. PASSOK 권장 조합

| 용도 | 도구 |
|------|------|
| 회귀 테스트 (CI, 배포 차단) | Playwright Test — Test Agents로 생성·유지보수 |
| Devin의 탐색형 검증 | Playwright CLI/MCP (또는 기존 agent-browser 유지) |
| 실패 원인·성능 분석 | Chrome DevTools MCP |
| DB·RLS 검증 | 7장의 Supabase 검증 스크립트 그대로 |
| 실기기 확인 | iPhone·Android 수동 확인 또는 실기기 클라우드 |

**전환 방법** — 이 문서의 시나리오 카탈로그(5장), 테스트 환경 분리(2장), 데이터 검증(7-4·7-5), 보고서·판정 규칙(9장)은 도구와 무관하게 그대로 씁니다. 바뀌는 것은 7-1·7-3의 셸 스크립트뿐이며, Playwright로 옮길 때는 `npx playwright init-agents --loop=claude`(사용하는 에이전트에 맞게 지정)로 에이전트 정의를 만든 뒤 planner에 5장의 시나리오를 입력하고, generator가 만든 `.spec.ts`를 검토해 CI(11장)의 실행 명령을 `npx playwright test`로 바꾸면 됩니다. agent-browser는 버그 재현과 빠른 화면 확인용으로 병행해도 무방합니다.

## 14. 구축 로드맵

| 주차 | 작업 | 완료 기준 |
|------|------|-----------|
| 1주차 | Phase 0 조사, 테스트 Supabase 분리, 계정 4종 시드, agent-browser 설치, data-testid 추가 | initial-audit.md 승인, auth-setup 3회 연속 성공 |
| 2주차 | T-003 CBT 완성(공통 라이브러리·DB 검증 포함), T-004 진도 | 두 시나리오 3회 연속 통과, 실패 증거 자동 수집 확인 |
| 3주차 | T-001·T-002(RLS)·T-007 이용권, 반응형 T-009, 보고서 생성 | P1 전체 통과, latest-report.md 자동 생성 |
| 4주차 | GitHub Actions 연동, 필수 상태 검사 지정, P2·P3 정기 실행, 안정 시나리오의 Playwright 이전 검토 | 버그 주입 브랜치에서 병합 차단 확인 |

### 운영 리듬 제안

- 기능 개발 PR마다: Devin이 해당 기능을 agent-browser 탐색형으로 먼저 검증 → 안정된 흐름을 스크립트로 추가
- PR 병합 전: CI가 P1 회귀 자동 실행
- 매일 새벽: 전체 시나리오 + 반응형 스크린샷
- 배포 전 주 1회: 실제 iPhone·Android 수동 확인 + Lighthouse

## 15. 참고 자료

- agent-browser GitHub (설치·명령 레퍼런스): https://github.com/vercel-labs/agent-browser
- agent-browser 공식 문서: https://agent-browser.dev
- Supabase Auth Admin — generateLink: https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Protection Bypass for Automation: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection
- Playwright 공식 문서: https://playwright.dev
- Playwright Test Agents: https://playwright.dev/docs/test-agents
- Playwright MCP vs Chrome DevTools MCP 비교(eSEOspace, 2026-10): https://eseospace.com/blog/playwright-vs-chrome-devtools-mcp/
- Stagehand vs Browser Use vs Playwright(NxCode): https://www.nxcode.io/resources/news/stagehand-vs-browser-use-vs-playwright-ai-browser-automation-2026
- Browser Use vs Stagehand(Skyvern): https://www.skyvern.com/blog/browser-use-vs-stagehand-which-is-better/

> agent-browser는 빠르게 업데이트되는 프로젝트입니다. 명령 옵션은 설치된 버전의 `agent-browser --help`로 최종 확인하세요.
