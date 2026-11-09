# PassOK E2E 자동화 구현 설계 — 기존 Playwright 체계 + 가이드 절차 요소 이식

> **문서 ID**: DOC-DSN-46
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (테스트 인프라 설계 — 앱 동작 요구사항 아님)
> **관련 문서**: DOC-DSN-45 (E2E 자동화 구축 가이드 — 본 설계의 참조 원안) · `tests/e2e/` 기존 스펙
> **목적**: DOC-DSN-45 가이드의 절차적 설계(환경 분리·시나리오 카탈로그·DB 검증·보고서·CI 게이트)를 PassOK의 **기존 Playwright 체계 위에** 이식하는 실행 설계

## 1. 배경·문제

DOC-DSN-45는 agent-browser + 셸 스크립트 기반 E2E 구축을 가정한 범용 가이드다. PassOK는 이미 `test:e2e`(Playwright, 21+ 스펙, chromium/mobile/tablet 프로젝트)가 있으므로 가이드를 그대로 적용할 수 없다 — **도구 계층은 유지하고, 가이드의 절차적 요소(환경 분리·데이터 검증·보고서·판정 규칙)를 이식**한다.

### 현재 체계 대비 가이드의 갭

| 영역 | PassOK 현황 | 가이드 전제 | 판단 |
|------|------------|------------|------|
| 실행 도구 | Playwright Test (`playwright.config.js`) | agent-browser + `lib.sh` | **Playwright 유지** — 가이드 §13-4 권장 조합과 일치 |
| 인증 | Supabase **이메일+비밀번호** (`auth-view.js` signInWithPassword/signUp + OTP) | Magic Link 전용 | Magic Link 발급 스크립트 불필요 — 비밀번호 로그인이 더 단순 |
| 결제·이용권 | feature-plan.json Pro 배지 게이팅만 — 실결제 없음 | 입금 승인·이용권 만료 시나리오 | 시나리오 조정 — Pro 게이트 노출 검증으로 축소 |
| 계정 필수성 | **비로그인 = 전 기능 사용 가능** (localStorage 1차, Supabase 선택적) | 로그인 필수 서비스 | 시나리오 재구성 — "비로그인 학습"이 P1 핵심 |
| data-testid | **0건** — 기존 스펙은 text/role 선택자 | data-testid 규칙 | 점진 도입 — 신규·불안정 선택자부터 |
| DB 검증 | 없음 — 동기화 검증 부재 | Supabase 검증 스크립트 | `tests/e2e/db/` 신설로 이식 (서비스키 검증) |
| 실패 증거 | `trace: retain-on-failure` (zip 아티팩트) | 스크린샷+console+network 자동 수집 | Playwright trace가 상위호환 — 보고서 형식만 이식 |
| 환경 분리 | localhost:3000 만 사용 — Supabase 미설정 시 비활성 | Preview + 테스트 Supabase | 테스트 프로젝트 + `SUPABASE_URL` 환경 분리 추가 |

## 2. 목표 아키텍처

```
tests/e2e/
  *.spec.js                    # 기존 스펙 (유지 — 점진 data-testid 전환)
  exams/<id>/                  # 기존 시험별 스펙 (유지)
  journeys/                    # 신설 — P1/P2 사용자 여정 시나리오 (§4)
    J-101-nonlogin-study.spec.js
    J-102-auth-sync.spec.js
    J-201-cbt-score.spec.js
    J-202-progress-restore.spec.js
    ...
  db/                          # 신설 — Supabase 검증 스크립트 (가이드 §7-4/7-5 이식)
    verify-attempt.mjs         # 화면 점수 ↔ DB 행 대조
    rls-check.mjs              # 계정 간 데이터 격리 검사
    seed-test-accounts.mjs     # 테스트 계정 생성·상태 시드
  fixtures/
    auth.setup.js              # Playwright storageState — 로그인 세션 재사용
  support/
    selectors.js               # data-testid 중앙 레지스트리 (네이밍 규약 §5)
    evidence.js                # 실패 증거 수집 래퍼 (console·network 수집)
tests/reports/
  latest-report.md             # P1/P2 판정 보고서 (가이드 §9 형식)
  runs/<run-id>/               # trace.zip·스크린샷·console 로그
```

### 기존 스펙과의 관계

- 기존 21+ 스펙은 **그대로 유지** — journeys/는 신규 시나리오 전용 디렉터리로 분리
- 공통 헬퍼는 `support/`에 신설 — 기존 스펙의 inline 선택자는 리팩터 시에만 이관 (대규모 재작성 금지)

## 3. 테스트 환경 분리

### 3-1. Supabase 테스트 프로젝트

| 구분 | 운영 | 테스트 |
|------|------|--------|
| 프론트엔드 | `https://passok.vercel.app` | `http://localhost:3000` 또는 Vercel Preview URL |
| Supabase | 운영 프로젝트 (`SUPABASE_URL` env) | 별도 테스트 프로젝트 또는 `supabase start` 로컬 |
| 설정 주입 | `src/auth-sync/supabase-config.js`의 env 키 | `TEST_SUPABASE_URL`/`TEST_SUPABASE_ANON_KEY` → serve.js 주입 또는 `.env.test` |

`isSupabaseConfigured()` 게이트로 미설정 시 인증 UI가 비활성이므로, **로그인 시나리오만 테스트 프로젝트 설정이 필요** — 비로그인 시나리오(J-101 계열)는 설정 없이도 동작.

### 3-2. 테스트 계정 시드

가이드의 4종 계정을 PassOK 상태로 각색 (이용권 → Supabase 계정 상태 + localStorage 시드로 치환):

| 계정 | 시드 상태 | 검증 용도 |
|------|-----------|-----------|
| `e2e-new@…` | 가입 직후, 동기화 이력 없음 | 신규 사용자 온보딩·첫 동기화 |
| `e2e-active@…` | 학습 이력 시드됨 (진도·답안 일부) | 로그인 후 복원·동기화·RLS 검증 |
| `e2e-sync@…` | 동기화 충돌 상태 (로컬·클라우드 서로 다른 진도) | 충돌 해결·마지막 쓰기 우선 검증 |
| `e2e-admin@…` | 관리자 플래그 (해당 시) | 관리자 화면 접근 — 미구현 시 생략 |

시드는 `db/seed-test-accounts.mjs`가 service role key로 수행 — 매 실행 전 idempotent하게 동일 상태 복원.

### 3-3. 비밀정보

`TEST_SUPABASE_SERVICE_ROLE_KEY`·계정 비밀번호는 Devin Secrets/GitHub Secrets에만 — 저장소 기록 금지. `tests/.auth/`·storageState 파일은 gitignore 등록.

## 4. 시나리오 카탈로그 (가이드 §5 → PassOK 재작성)

가이드의 T-###을 PassOK 실제 기능으로 매핑한다. P1 = 배포 차단, P2 = 경고, P3 = 주기 점검.

| ID | 영역 | 우선 | 사용자 흐름 · UI 검증 | 데이터 검증 | 기존 커버 |
|----|------|------|---------------------|------------|-----------|
| J-101 | 비로그인 학습 | P1 | 시험 선택 → 과목 학습 → 퀴즈 풀이 → 진도 표시 — 로그인 없이 전 과정 | localStorage 진도 기록 (클라우드 미설정 상태에서) | flows.spec 부분 |
| J-102 | 인증·동기화 | P1 | 로그인 → 학습 → 로그아웃 → 재로그인 → 클라우드 진도 복원 | Supabase 사용자 행·동기화 테이블에 진도 저장 확인 | 없음 (신규) |
| J-201 | CBT 응시 | P1 | 시험 선택 → 문제 풀이 → 제출 → 점수·정오답 표시 | 점수 화면 = localStorage 기록 = (로그인 시) Supabase 동기화 행 | exam-risk 부분 |
| J-202 | 진도 복원 | P1 | 학습 중 이탈 → 새로고침 → 이어서 학습 → 복원 확인 | 진도 키 1건만 갱신 (중복 저장 없음) | reader-flow 부분 |
| J-203 | 접근 제어 | P1 | 만료/비인가 상태에서 Pro 배지 콘텐츠 접근 → 게이트 안내 | feature-plan pro 항목 노출 상태 검증 | ux-surfaces 부분 |
| J-301 | 콘텐츠 팩 | P2 | 시험 전환 (cosmetic↔carework) → 각 팩 콘텐츠 로드 | 팩 전환 시 스코프 분리 확인 (DA-13) | exam-switch |
| J-302 | 문서·인쇄 | P2 | 학습안내서·실무매뉴얼 열기 → 인쇄/PDF 버튼 → 미리보기 탭 | PDF 생성 실패 시 window.print 폴백 | 수동 검증 필요 |
| J-401 | 반응형 | P2 | 3 뷰포트 × 주요 화면 스크린샷·가로 스크롤 0px 판정 | — | mobile-overflow·responsive-flow |
| J-402 | PWA·오프라인 | P3 | 오프라인 전환 → 안내·캐시 서빙 → 복구 후 동기화 | 오프라인 중 진도 유실·중복 저장 없음 | 없음 (신규) |
| J-900 | 품질 신호 | P1 | 전 시나리오 공통: JS 예외 0 · 5xx 응답 0 | `evidence.js`의 console/network 수집 첨부 | app.spec 부분 |

**첫 구현 대상**: J-201(CBT) — 로그인·학습·채점·저장이 한 흐름에 있어 공통 헬퍼가 함께 완성 (가이드 §5 권장과 동일 논리).

## 5. 선택자 규약 — data-testid 점진 도입

- 명명: `{view}-{element}[-{index}]` — 예: `cbt-submit`, `quiz-choice-3`, `manual-print-btn`
- 도입 순서: ① journeys/ 신규 스펙은 무조건 data-testid ② 기존 스펙의 불안정 선택자(텍스트 의존)를 건드릴 때 함께 전환
- `support/selectors.js`에 ID 목록을 상수로 등록 — 스펙은 `S.cbt.submit` 형태로 참조해 오타 방지
- 앱 코드 수정은 data-testid 추가만 허용 (기능 변경 없음 — 가이드 원칙 계승)

## 6. 실패 증거·보고서

- Playwright `trace: retain-on-failure`가 스크린샷·DOM·네트워크를 이미 수집 — 추가로 `support/evidence.js`에서 `page.on('console')`/`requestfailed` 리스너로 JS 예외·4xx/5xx 수집해 테스트 메타데이터로 첨부
- 보고서는 `latest-report.md` 형식(가이드 §9)으로 생성 — playwright reporter 커스텀 또는 `test:e2e` 후 집계 스크립트:
  - P1 실패 1건 → 배포 차단 · P2 실패 → 이슈 등록 · 재실행 통과 = flaky 표시 (통과로 치지 않음)
  - 실패마다 재현 명령·계정·trace 경로 기록

## 7. CI/CD 연동

기존 `ci.yml`의 E2E 잡 구조를 확장 (워크플로 신설이 아닌 기존 통합):

```yaml
# 기존 ci.yml에 추가될 env·단계 개념
env:
  BASE_URL: http://localhost:3000          # serve.js (기존 동일)
  TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
  TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
  TEST_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
steps:
  - run: node tests/e2e/db/seed-test-accounts.mjs   # 시드 초기화 (Supabase 설정 시만)
  - run: npm run test:e2e                            # 기존 전체 스펙 + journeys/
  - uses: actions/upload-artifact@v4                 # trace·보고서 (기존 패턴)
```

- Preview 배포 트리거(`deployment_status`)는 가이드대로 별도 워크플로 — 로컬 serve.js 대상이 우선, Preview 대상은 후속 Phase
- P1 journeys만 별도 태그(`@p1`)로 분리해 `test:e2e --grep @p1`을 PR 게이트로 지정 가능

## 8. Phase별 구축 로드맵

| Phase | 범위 | 완료 기준 |
|-------|------|-----------|
| 0 — 갭 분석 | 기존 스펙 ↔ 카탈로그 매핑 완료, 미커버 영역 확정, data-testid 우선 목록 | 매핑 표 승인 + 선택자 우선순위 목록 |
| 1 — 기반 | `support/`·`db/` 골격, 테스트 Supabase 설정, 계정 시드 스크립트, storageState | J-101 비로그인 + 시드 스크립트 3회 연속 성공 |
| 2 — P1 journeys | J-101·J-102·J-201·J-202·J-203·J-900 | P1 전부 3회 연속 통과, 실패 증거 자동 수집 |
| 3 — P2/P3 | J-301·J-302·J-401·J-402, 반응형 수치 판정 | 3 뷰포트 스크린샷 + 가로 스크롤 판정 |
| 4 — 보고서·CI | latest-report.md 자동 생성, CI 통합, Preview 트리거 워크플로 | 버그 주입 브랜치에서 P1 실패·차단 확인 |

## 9. 가이드 대비 기각·보류 사항

| 가이드 제안 | 판단 | 사유 |
|------------|------|------|
| agent-browser + lib.sh 셸 스크립트 | 기각 | 기존 Playwright가 동일 역할·더 풍부 — 병행 시 유지비 이중화 |
| Magic Link 발급 (`generateLink`) | 기각 | 이메일+비밀번호 인증이라 불필요 — `signInWithPassword`로 로그인 자동화 |
| 결제·입금 승인 시나리오 | 보류 | 실결제·이용권 모델 미구현 — Pro 배지 게이트 검증(J-203)으로 축소, 결제 도입 시 재검토 |
| 실기기 클라우드 | 보류 | 수동 실기기 확인 관행 유지 — 규모 확대 시 재검토 |
| `tests/.auth/*.json` state 파일 | 각색 | Playwright `storageState`로 동일 목적 — 세션 파일 gitignore 규칙 동일 |

## 10. 리스크·미해결

- **기존 스펙 text 선택자 회귀**: data-testid 전환 중 기존 스펙이 깨질 수 있음 — 전환은 스펙을 건드릴 때만, 대량 일괄 변경 금지
- **Supabase 선택적 구조**: 테스트 프로젝트 미설정 시 J-102·J-203이 자동 스킵되어야 함 — 스킵 조건을 `isSupabaseConfigured()` 기반으로 명시해 CI에서 "설정 없음 = 스킵"과 "설정 있음 = 실행"을 분리
- **localStorage 시드**: Playwright의 `addInitScript`로 진도·설정을 사전 주입 — 시드 스키마가 `storage-keys.js`와 drift하지 않도록 키는 모듈에서 import
- **시드 계정 영속성**: 테스트 Supabase도 수동 리셋이 필요할 수 있음 — 시드 스크립트는 upsert idempotent 설계
