# E2E 테스트 Supabase 프로젝트 런북 (J-102 해제 절차)

> **문서 ID**: DOC-RBK-23
> **범위**: platform · 판본: none
> **목적**: J-102(인증·동기화 E2E) 실행용 **별도 테스트 Supabase 프로젝트**를 준비한다.
> **관련 문서**: DSN-46 `docs/dev/design/PASSOK_E2E_IMPLEMENTATION_DESIGN.md` §3-1·§3-2·§7
> **최상위 원칙**: 운영 프로젝트에 인증·동기화 쓰기 테스트를 실행하면 안 된다 — `supabase-config.js`는 운영 상수를 하드코딩하므로, 오버라이드 없는 인증 호출은 운영 DB를 직접 오염시킨다.

## 준비 상태

| 항목 | 상태 |
|------|------|
| 앱 무수정 오버라이드 헬퍼 `tests/e2e/support/supabase-override.js` | ✅ 구현됨 (미설정 시 test.skip 가드 내장) |
| 계정 시드 스크립트 `tools/supabase/seed_test_accounts.js` | ✅ 구현됨 (멱등·운영 ref 감지 중단) |
| 스키마 프로브 `check_supabase_schema.js` TEST_* env 오버라이드 | ✅ 보강됨 |
| `.env.example` TEST_* 키 선언 | ✅ 등록됨 |
| 테스트 Supabase 프로젝트 + 키 3종 | ⬜ **사용자 작업 (Phase A)** |

## Phase A — 테스트 프로젝트 생성 (사용자, ~5분)

1. https://supabase.com/dashboard → **New project** (운영과 같은 organization)
   - 이름: `passok-e2e` 권장 · Region: 운영과 동일 · DB password 생성 후 보관
2. **Settings → API Keys**에서 3개 값 확보:
   - `Project URL` → `TEST_SUPABASE_URL`
   - `anon public` → `TEST_SUPABASE_ANON_KEY`
   - `service_role` → `TEST_SUPABASE_SERVICE_ROLE_KEY` (⚠ 시크릿 — 저장소 기록 금지)
3. **Authentication → Sign In/Providers → Email**: `Confirm email` **OFF**
   - 또는 OFF 유지 대신 시드 스크립트가 `email_confirm: true`로 생성하므로 ON이어도 동작함 (OFF 권장 — 로그인 경로 단순화)

> **대안 경로**: Docker Desktop 설치 후 `npx supabase start`로 로컬 스택 — 대시보드 불필요하나 Docker 설치가 선행 조건.

## Phase B — 키 등록

- 루트 `.env`에 4키 기록 (`.env.example`에 선언됨):
  ```
  TEST_SUPABASE_URL=https://<test-ref>.supabase.co
  TEST_SUPABASE_ANON_KEY=<anon 키>
  TEST_SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
  TEST_E2E_PASSWORD=<시드 계정 공통 비밀번호, 8자 이상>
  ```
- GitHub Secrets에 `TEST_SUPABASE_URL`·`TEST_SUPABASE_ANON_KEY`·`TEST_SUPABASE_SERVICE_ROLE_KEY` 등록
  — CI 워크플로 env 블록(DSN-46 §7)이 이 이름을 참조한다. `TEST_E2E_PASSWORD`도 J-102 CI 실행 시 필요.

## Phase C — 스키마·계정 프로비저닝

```powershell
# 스키마·RLS 적용 (멱등 — 기존 SUPABASE_ACCESS_TOKEN PAT 재사용, 계정 단위라 신규 프로젝트에도 적용)
$env:SUPABASE_URL="https://<test-ref>.supabase.co"; node tools/supabase/apply_schema.js

# 스키마 검증 — TEST_* env로 테스트 프로젝트 프로브
node tools/check/check_supabase_schema.js

# 테스트 계정 시드 (멱등 — 존재하면 비밀번호 리셋, snapshot upsert)
node tools/supabase/seed_test_accounts.js --dry-run   # 계획 확인
node tools/supabase/seed_test_accounts.js             # 적용
```

시드 계정 (DSN-46 §3-2 — `seed_test_accounts.js`의 `SEED_ACCOUNTS`가 계약 정본):

| 계정 | 시드 상태 | 검증 용도 |
|------|-----------|-----------|
| `e2e-new@passok.test` | 동기화 이력 없음 | 첫 로그인·첫 push |
| `e2e-active@passok.test` | carework `sync_snapshots` 1행 (marker `active`) | 재로그인 시 클라우드 진도 복원 |
| `e2e-sync@passok.test` | 충돌 snapshot (marker `cloud-side`, 어제 시각) | 충돌 해결·last-write 검증 |
| `e2e-admin` | — | 관리자 화면 미구현으로 생략 |

## Phase D — J-102 스펙 작성 (차단 해제 후)

- `requireSupabaseOverride(test)` 가드로 시작 — TEST_* 미설정 환경에서는 skip (운영 오염 차단이 스펙 레벨에서도 이중 보장됨)
- 로그인 → 학습 → 로그아웃 → 재로그인 → 클라우드 진도 복원 + `sync_snapshots` 행 확인
- `tests/.auth/` storageState는 `.gitignore` 등록 완료

## 안전 장치 요약

- `installSupabaseOverride`는 `TEST_SUPABASE_URL`+`TEST_SUPABASE_ANON_KEY` 둘 다 있을 때만 `supabase-config.js` 응답을 치환 — 미설정 시 인증 스펙은 무조건 skip
- `seed_test_accounts.js`는 대상 URL이 운영 ref와 같거나 Secret 키가 운영 키와 같으면 즉시 중단
- 운영 `SUPABASE_SECRET_KEY`는 시드에 사용하지 않음 — 테스트 Secret 전용
