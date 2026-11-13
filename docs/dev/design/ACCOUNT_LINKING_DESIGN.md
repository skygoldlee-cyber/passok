# 계정 연결 설계 — 로그인 수단 간 유료 권한 통합

> **문서 ID**: DOC-DSN-50
> **범위**: platform · 판본: none
> **관련 SPEC ID**: AU-09 (소셜 로그인), AU-10 (계정 연결 — 본 설계로 신설), PAY-01 (라이선스 활성화)
> **유래**: `docs/exams/carework/business/이용자_관점_평가_2026-11-13.md`(DOC-BIZ-10) §7 — "로그인 수단마다 별도 계정, 유료 코드는 같은 계정에서만 사용" → 중장년 사용자 혼란 지적

## 1. 문제

Supabase는 로그인 수단(email OTP·google·kakao)마다 별도 `auth.users` 레코드를 만든다. `profiles.plan`과 `redeem_code`로 활성화한 라이선스는 그 `auth.users` 단위에 귀속되므로, 수단을 바꿔 로그인하면 유료 권한·동기화가 끊긴다. 요양보호사 주 사용자층(중장년)이 "결제했는데 사라졌다"고 인식하는 실전 시나리오다.

## 2. 목표·비목표

- **목표**: 한 사용자가 로그인 수단을 추가해도 Pro 권한·진행 동기화가 끊기지 않게 한다. 이미 분리된 계정에는 안전한 회복 경로를 제공한다.
- **비목표**: 서로 다른 사람의 계정 병합, 유료 권한의 무인증 이전, 진행 데이터 자동 병합(로컬↔클라우드 충돌 정책은 별도 과제).

## 3. 해결책 — 4단계

### ① linkIdentity 연결 UI (선제 차단)

Supabase `auth.linkIdentity({provider})`로 현재 로그인 사용자에 OAuth 아이덴티티를 추가 — 연결된 아이덴티티는 같은 `auth.users`에 귀속돼 `profiles.plan`이 자동 공유된다 (스키마 추가 불필요).

- **선행 조건 (Supabase 콘솔, 운영 작업 — §7 접근 경로 참조)**: Auth 설정의 **Manual Linking 활성화** + Redirect URL에 앱 도메인 등록. 미설정 시 `linkIdentity`는 오류 — UI는 실패 메시지를 친화적으로 표시해 무설정 상태에서도 안전하게 동작한다.
- **UI**: 계정 모달(`#auth-account-area`)에 "로그인 수단" 섹션 — `user.identities`로 연결된 수단 표시 + 미연결 수단(Google·카카오) 연결 버튼 + 해제 버튼.
- **해제 가드**: `auth.unlinkIdentity(identity)`는 검증된 로그인 수단이 **2개 이상**일 때만 허용 — 마지막 수단 해제로 계정 접근 불가가 되는 것 차단.
- **리다이렉트 왕복**: OAuth 링크는 페이지를 떠났다 돌아오므로 `PENDING_LINK_PROVIDER` 로컬 키로 대기 표시 → 복귀 후 `user.identities`에 수단이 들어왔으면 성공 토스트 + `account_link_success` 계측.
- **계측**: `account_link_start` / `account_link_success` / `account_link_conflict` — 충돌 비율이 실제 계정 분리 규모의 실측 지표.

### ② 수단 분리 사전 방지 (전환율 보호)

- **`LAST_LOGIN_METHOD` 기록**: 로그인 성공 경로마다 수단 저장(`email`/`google`/`kakao`). OAuth는 리다이렉트 전에 임시 키로 예약해 복귀 후 확정한다.
- **이전 수단 힌트**: 로그인 폼에 "지난번에는 카카오로 로그인하셨습니다" — 다른 수단 클릭 전 같은 수단으로 유도하는 최저비용 방어.
- **Pro 활성화 후 안내**: 코드 활성화 성공 시 identities가 1개뿐이면 "다른 로그인 방법도 계정 메뉴에서 연결해 두세요" 토스트 — 전환 직후가 연결 동기 최고점.

### ③ 충돌 경로 (이미 분리된 계정)

`linkIdentity` 실패 = 상대 수단이 **다른 `auth.users`에 귀속**된 경우. 자동 병합은 계정 탈취 경로라 금지하고:

1. **안내**: "해당 로그인 방법은 이미 다른 계정으로 사용 중입니다" → `account_link_conflict` 계층
2. **유도**: "유료가 활성화된 계정으로 로그인하시겠습니까?" 확인 → 로그아웃 → 해당 수단 재로그인
3. **코드 재입력 시**: `redeem_code`가 false(미사용 아님 = 무효 또는 사용됨, 구분은 오라클 축소로 의도적 비노출)여도 안내에 "처음 활성화한 로그인 방법으로 로그인해 보세요"를 병기 — 수단을 특정해 노출하지 않아 계정 존재 열거를 막는다

### ④ 동일인 재활성 (서버 정책)

`redeem_code` RPC 확장 — 코드가 이미 사용됐을 때, **사용 계정과 현재 계정의 이메일이 일치하면** 현재 계정에도 Pro를 부여하고 true 반환:

```sql
-- redeem_code 내부, 미사용 소비 실패 시:
select * into v_code from public.pro_codes where code = p_code and redeemed_by is not null;
if found and exists (
    select 1 from auth.users a join auth.users b
      on b.id = auth.uid() and a.id = v_code.redeemed_by
     and a.email = b.email and a.email <> ''
) then
    -- plan 부여 (기존 update/insert 경로 재사용) → return true
end if;
```

- **효과**: 카카오 가입(카카오 이메일) + 이메일 OTP 가입(같은 주소)처럼 동일인 중복 계정이면 코드가 자동 재활성 — 지원 없이 자기 회복.
- **한계**: 다른 이메일이면 false 유지 → 지원 채널 수동 처리 (저빈도, 자동화 비용 > 운영 비용).
- **보안**: 이메일 일치는 양쪽 계정 소유의 강한 증거 — 타인 이메일로는 성립 불가. `redeemed_by`는 원 계정에 유지(권한 이전이 아닌 동일인 중복 부여).

## 4. 구현 위치

| 항목 | 파일 |
|---|---|
| 연결 UI·핸들러 | `index.template.html` (`#auth-link-area`) · `src/auth-sync/auth-view.js` (`authLinkIdentity`·`authUnlinkIdentity`·`renderIdentityArea`) · `css/ui-overlay.css` |
| 핸들러 등록 | `src/shell/app.js` 위임 테이블 · `src/shell/offline-gate.js` 오프라인 셀렉터 |
| 이전 수단 힌트 | `auth-view.js` 로그인 성공 경로(4개) + `#auth-last-method` |
| Pro 후 안내 | `src/pro/pro-redeem.js` 성공 분기 |
| 스토리지 키 | `src/core/storage-keys.js` (`LAST_LOGIN_METHOD`·`PENDING_LINK_PROVIDER`, GLOBAL_KEYS) |
| 계측 | `src/telemetry/usage-telemetry.js` ALLOWED_EVENTS |
| RPC | `tools/supabase/schema.sql` §3 `redeem_code` — 배포는 Supabase SQL Editor 수동 실행 |

## 5. 검증·수용 기준

- **단위**: `linkedProviders(identities)` 수단 목록 추출 · `canUnlink(identities)` 마지막 수단 가드 — 순수 로직 유닛 테스트
- **DOM**: 계정 영역 identities 렌더 (연결됨 표시·해제 버튼 상태)
- **수동 시나리오**: manual linking 활성화된 프로젝트에서 ① 카카오 로그인 → Google 연결 → Google로 로그인 시 같은 user.id·Pro 유지 ② 이미 분리된 계정으로 연결 시도 → 충돌 안내 ③ 동일 이메일 두 계정에서 코드 재입력 → ④ 재활성 성공
- **로컬 Supabase 없이도** 비로그인 경로가 무너지지 않음 (선택적 Supabase 원칙)

## 6. 리스크

- **manual linking 미활성화 시 UI 무용** — 콘솔 설정을 배포 체크리스트에 포함, 미설정 감지 시 연결 버튼 비활성+안내
- **이메일 불일치 동일인**: 카카오 이메일 ≠ 가입 이메일이면 ④ 미작동 — 지원 런북이 뒷받침
- **unlink 후 OAuth 재로그인**: 해제한 수단으로 로그인하면 Supabase가 새 계정 생성 가능 — 해제 전 경고 문구 필수
- **PWA OAuth 제한**: 설치형 PWA는 OAuth 리다이렉트 복귀 불가(AU-09) — 연결 버튼도 standalone에서는 숨김, 이메일 경로 안내

## 7. 운영 적용 절차 (Supabase 콘솔 — 배포 시 수동 2건)

코드만으로는 동작하지 않는다 — 프로덕션 프로젝트의 콘솔 설정·스키마 적용이 선행돼야 한다.

### ① Manual Linking 활성화 + Redirect URL 등록

```
Supabase Dashboard (https://supabase.com/dashboard)
→ 프로젝트 선택
→ 좌측 메뉴 [Authentication]
→ [Sign In / Providers] 탭
→ 하단 "Manual Linking" — 토글 ON
→ [URL Configuration] 탭
→ "Redirect URLs"에 https://passok.vercel.app 등록 (개발 시 http://localhost:3000 도)
```

- 미설정 시 `linkIdentity` 호출이 오류를 반환 — 클라이언트는 "연결이 아직 활성화되지 않았습니다"로 표시

### ② `redeem_code` 동일인 재활성 분기 적용

```
Supabase Dashboard
→ [SQL Editor] → [New query]
→ tools/supabase/schema.sql §3의 redeem_code 함수 블록 전체
   (drop function if exists public.redeem_code(text); ~ grant execute … authenticated;)
   붙여넣기 → [Run]
→ 확인: select public.redeem_code('TEST', null) — 미인증이면 false
```

- 스키마는 자동 배포 경로가 없으므로 **수동 실행이 유일한 적용 수단**
- 적용 전에는 동일인 재활성이 동작하지 않음 (코드 재입력은 기존처럼 false)

### 배포 체크리스트 연계

AU-10 코드가 포함된 배포 시 위 ①②를 `deploy` 후속으로 확인 — 충돌/실패 계측(`account_link_*`)이 수신되기 시작하면 실제 발생률로 2단계 서버 작업 우선순위를 판단한다.
