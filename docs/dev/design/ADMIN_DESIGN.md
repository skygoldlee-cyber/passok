# 관리자 콘솔 설계 — 사용자·피드백·오류 운영 표면

> 상위 문서: `ARCHITECTURE.md` (전체 구조), `SUPABASE_DESIGN.md` (계정·동기화·RLS 기반 — DOC-DSN-08), `USER_FEEDBACK_DESIGN.md` (피드백 스키마 — DOC-DSN-09)
> **관련 SPEC ID**: `AD-01~06` (SPEC §3.26) · `FB-01~08` (피드백 수집) · `AU-01~08` (인증) · `ROAD-P0`·`ROAD-P1` (Pro entitlement)
> 목적: 사용자 증가에 대비해 운영 표면(사용자 조회·피드백 인박스·오류 대시보드·Pro 권한 부여)을 체계화한다. 정적 PWA·RLS 경계·프라이버시 최소화라는 기존 불변식 위에 얹는다.
> **구현 상태**: Phase 1(운영 CLI, AD-06)·Phase 1.5(로컬 대시보드, AD-07)·기간권 모니터링(AD-08·AD-09)·Discord 운영 표면(Phase 1.7 — AD-10 알림 push·AD-11 조회 봇) 구현됨 · Phase 2+(인앱 `#/admin`·RLS·RPC·감사) 설계안 — 미구현.
> 전제: Supabase는 계속 "없어도 되는" 선택 계층 — 관리자 기능은 Supabase 설정 프로젝트에서만 의미를 가지며, 미설정 환경의 로컬 전용 사용자에게는 노출되지 않는다.
> **문서 ID**: DOC-DSN-30
> **범위**: platform · 판본: none

---

## 1. 설계 원칙

1. **RLS가 권한 경계** — 클라이언트 측 UI 숨김은 편의장치일 뿐, 권한 판정은 PostgREST/RLS에서 수행한다. publishable key가 노출돼도 정책이 비관리자의 읽기를 차단한다.
2. **service_role 키는 프론트에 절대 금지** — 정적 배포 번들에 들어간 비밀은 전 세계에 공개된다. 권한 작업은 (a) 로컬 CLI의 service role 스크립트, (b) `security definer` RPC, (c) Edge Function 중 하나로만 수행한다.
3. **프라이버시 최소화 유지** — 텔레메트리(`client_errors`·`usage_events`)에는 의도적으로 `user_id`가 없다 (세션당 랜덤 UUID만). 이 설계를 관리자 도입을 이유로 되돌리지 않는다 — "사용자 → 오류" 조회는 `feedback.user_id`(로그인 사용자만, 기존 컬럼) → `meta.session_id` → `client_errors` 경로로 대체한다.
4. **관리자 행위는 감사된다** — plan 변경 등 상태 변경 작업은 `admin_audit`에 행위자·대상·시각을 남긴다. 관리자 자신도 무감사 영역이 아니다.
5. **점진 도입** — 페이지는 필요해질 때 만든다. 사용자 수가 작은 동안은 CLI가 더 저렴하다 (§5 Phase 구성).

---

## 2. 현재 상태 진단

| 자산 | 현재 접근성 | 관리자 관점의 갭 |
|---|---|---|
| `profiles` (plan, pro_since) | RLS: 본인 select만 | 타 사용자 plan 조회·변경 경로 없음 — 대시보드 SQL 수동 |
| `sync_snapshots` | RLS: 본인 CRUD | 사용자 진도 메타(최종 동기화·기기 수) 조회 불가 |
| `feedback` | insert-only 정책 | 조회 = Supabase 대시보드 or `report:*` CLI |
| `client_errors`·`usage_events` | insert-only 정책 | `report:errors` CLI만 접근 (service role) |
| `pro_codes` + `redeem_code()` | RPC만 | 운영자가 수동으로 코드 발급 — 부여/회수 동선 없음 |
| 관리자 역할 | **부재** — `app_metadata` 미사용 | 권한 모델 자체가 없음 |
| 텔레메트리 `user_id` | **의도적 미수집** | 사용자별 오류 이력 직접 조인 불가 (§7.1 참조) |

**근본 긴장점**: 관리자 페이지는 본질적으로 "사용자 중심 뷰"를 요구하는데, 현행 텔레메트리는 사용자 식별을 설계상 배제했다. 이 둘을 정면으로 화해시키는 것이 이 설계의 핵심이다 (§7.1).

---

## 3. 권한 모델

### 3.1 역할 표현 — `app_metadata` (서버 소유 클레임)

```sql
-- 관리자 부여: Supabase 대시보드 or service role 스크립트로만 수행
-- ⚠️ user_metadata는 클라이언트가 수정 가능 — 절대 사용 금지
update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  where email = 'admin@example.com';
```

`app_metadata`는 서버 측 소유이고 JWT에 포함되므로, 클라이언트는 `session.user.app_metadata.role`로 자기 역할을 읽기만 할 수 있다.

### 3.2 RLS 헬퍼

```sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;
```

`security definer` + `stable` — 모든 정책에서 재사용하는 단일 판정 지점.

### 3.3 관리자 읽기 정책 추가 (기존 정책 유지)

```sql
create policy "admin read" on public.feedback      for select to authenticated using (public.is_admin());
create policy "admin read" on public.client_errors for select to authenticated using (public.is_admin());
create policy "admin read" on public.usage_events  for select to authenticated using (public.is_admin());
create policy "admin read" on public.profiles      for select to authenticated using (public.is_admin());
create policy "admin read sync meta" on public.sync_snapshots
  for select to authenticated using (public.is_admin());
-- insert-only 기존 정책은 그대로 유지 — 누구든 쓰기 가능, 읽기는 본인/관리자만
```

`sync_snapshots`는 select 정책을 열지만 **뷰에서 payload를 표시하지 않는 것**을 권장한다 (§7.2 — 행 메타만 조회). payload까지 보려면 명시적 opt-in 열람 경로를 분리한다.

---

## 4. 스키마 변경 요약

```sql
-- (a) profiles.email 백필 — 사용자 목록에 식별자 표시용 (auth.users는 anon 조회 불가)
alter table public.profiles add column if not exists email text;

-- handle_new_user 트리거 갱신 — 신규 가입부터 email 기록
create or replace function public.handle_new_user() ... 
  insert into public.profiles (id, email) values (new.id, new.email) ...;

-- 기존 사용자 백필 (service role / 대시보드에서 1회)
update public.profiles p set email = u.email
  from auth.users u where p.id = u.id and p.email is null;

-- (b) admin_audit — 관리자 행위 감사 로그
create table public.admin_audit (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid not null references auth.users,   -- 수행 관리자
  action      text not null,                          -- 'set_plan' 등
  target      uuid references auth.users,             -- 대상 사용자
  detail      jsonb,
  created_at  timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create policy "admin read audit" on public.admin_audit for select to authenticated using (public.is_admin());
-- insert는 RPC 내부에서만 (정책 없음 → 직접 insert 차단)

-- (c) admin_set_plan — Pro 부여/회수 (security definer + is_admin 가드)
create or replace function public.admin_set_plan(p_target uuid, p_plan text)
returns boolean ... as $$
begin
  if not public.is_admin() then return false; end if;
  update public.profiles set plan = p_plan,
    pro_since = case when p_plan = 'pro' then coalesce(pro_since, now()) else null end
    where id = p_target;
  insert into public.admin_audit (actor, action, target, detail)
    values (auth.uid(), 'set_plan', p_target, jsonb_build_object('plan', p_plan));
  return found;
end; $$;
```

**재실행 안전** — `if not exists`/`or replace` 관용구 유지. 기존 `schema.sql`에 §5로 추가하되, 독립 `admin.sql`로 분리해도 된다 (기본 배포에 관리자 스키마를 싣지 않는 선택지 보존).

---

## 5. Phase 구성

### Phase 1 — 운영 CLI (구현됨, AD-06)

사용자 수 소규모 구간에서는 UI보다 스크립트가 빠르다. 기존 `tools/check/` 리포트 패턴(`report:errors`·`report:funnel`) 확장:

| 스크립트 | 파일 | 내용 |
|---|---|---|
| `report:feedback` | `tools/check/feedback_report.js` | kind별 건수·평점·일별·최근 항목 본문 — bug의 meta.session_id로 `report:errors --session` 연결 (`--days`·`--kind`·`--limit`) |
| `report:user` | `tools/check/user_report.js` | 이메일→GoTrue Admin API 해석 후 profiles + sync_snapshots **메타만**(exam_id·device_id·updated_at — payload 미열람) + 피드백 이력 + `pro_expires_at` 잔여/경과 일수·무기한 구분·사용 코드 이력 (AD-08) |
| `report:pro` | `tools/check/pro_report.js` | Pro 현황 — `pro_codes` 채널(프리픽스)·티어(`valid_days`)별 발급/사용률·미사용 재고 + `pro_expires_at` 만료 버킷(D-7 임박·만료 미갱신·활성·무기한 — PAY-07 툼스톤의 free 복귀자도 이탈 코호트로 집계) + 가입 수단별 계정 분포 (AD-09) |
| `admin:grant-pro` | `tools/check/grant_pro.js` | 이메일→사용자 해석 후 profiles.plan 갱신 — 기본 dry-run, `--apply` 확정·`--revoke` 회수·동일 상태는 no-op |
| `report:dashboard` (Phase 1.5) | `tools/check/dashboard_report.js` | 오류·퍼널·피드백 집계를 단일 자급적 HTML로 덤프 (`tools/state/dashboard_report.html`, gitignore) — 로컬 파일이라 인증·RLS 불필요. 기존 3개 리포트의 순수 `summarize()` 재사용, 사용자 텍스트 전면 이스케이프 |

공용 헬퍼는 `tools/lib/supabase_ops.js`(URL 해석·Secret 요구·restGet/**restGetAll**/Patch·findUserByEmail·**listAllUsers**). `restGetAll`은 PostgREST 서버 `max-rows`(기본 1000) 절단을 offset 페이지네이션으로 해소, `listAllUsers`는 GoTrue Admin API 전체 사용자 순회(200명/페이지 — providers 분포 집계용, AD-09) — 대량 기간 조회는 이 경로를 쓴다 (2026-10-22 실측: usage_events 7일 1,000행 절단 → 5,162행 전량 회수). 환경변수는 기존 `SUPABASE_SECRET_KEY`(Secret = 구 service_role) 경로 그대로 — §4의 is_admin/감사 스키마와 독립적으로 동작하며 **스키마 변경 없이 동작**한다 (service role은 RLS를 우회하므로). admin_audit 테이블은 AD-04 도입 전까지 grant-pro의 콘솔 출력이 감사 기록을 대신한다.

`report:funnel`에는 기존 과업 완주율 외에 **활성화 퍼널**(session_start→core_learning_action 세션·고유 install_id 전환율, DOC-DSN-34 §4의 "방문→핵심 학습 행동" KPI)이 포함되고, `report:dashboard`에는 활성화율 카드가 표시된다. 스키마 적용 자동화는 `npm run schema:apply`(Management API PAT — `SUPABASE_ACCESS_TOKEN`, SUPABASE_DESIGN §셋업 참조)로 SQL Editor 수동 실행을 대체한다.

#### Phase 1 수용 한계 — 사용자 수가 아니라 운영 패턴이 한계다

정의된 운영 표면(피드백 분류·개별 조회·플랜 부여)에서는 수백 명이 아니라 수천 명까지 커버된다 — 병목이 사용자 수가 아니라 **건당 지연시간**이기 때문이다:

| 연산 | 비용 구조 | 수백~수천 명에서 |
|---|---|---|
| `report:feedback` | 피드백 건수에 비례, 사용자 수와 무관 | 월 수백 건까지 무리 없음 (조회 수십 ms) |
| `report:user` | `findUserByEmail`이 200명/페이지 | 500명=3페이지·2,000명=10페이지 — 수 초 이내 |
| `admin:grant-pro` | 건당 O(1) PATCH | 부하가 아니라 운영자 시간 문제 |

실제 한계는 규모가 아니라 **운영 패턴의 변화**에서 온다:

1. **집계 뷰 부재** — "오늘 활성 사용자 수·신규 가입·이탈률" 같은 코호트 질문에 답할 도구가 없다. 개별 조회만 있고 전체 조감이 없으므로, 경영 질문이 생기는 순간 사용자 수와 무관하게 필요해진다
2. **능동적 지원 불가** — 텔레메트리에 `user_id`가 없는 의도된 설계(§6.1)상 "어느 사용자가 이 오류를 겪는지" 능동 식별이 불가하다. bug 신고 → session_id join 경로라 사용자가 신고해야 추적이 시작되고, 무음 오류 피해자를 찾을 수단이 없다 — 지원 품질의 구조적 천장
3. **감사 공백** — `admin_audit`가 없어 grant-pro의 콘솔 출력이 유일한 기록이다. 운영자 1인에는 충분하지만 운영자 2명 이상이거나 "누가 언제 누구에게 Pro를 줬는가" 분쟁이 생기면 취약하다
4. **비개발자 운영 불가** — CLI는 PowerShell + Secret 키 + repo 클론을 요구한다. 운영자가 개발자 본인이면 영구히 문제없지만 CS/운영 담당 투입 순간 Phase 1은 끝이다

**Phase 2 발동 조건 (사용자 수보다 이 지표를 본다)**:

- 운영자가 개발자 1인이고 지원이 반응형(신고 후 조회)으로 충분하며 플랜 부여가 희소 이벤트(주 단위 이하)면 → Phase 1로 충분
- 집계 지표를 정기적으로 봐야 함 → AD-03
- 운영자가 2명 이상 → AD-05 감사 로그
- 비개발자 운영자 투입 → AD-02·AD-04·AD-06 전체

실무적 한계 도달 신호: "bug 신고를 매주 수 건 이상 손으로 분류" 또는 "플랜 관련 문의가 반복 패턴이 됨".

#### Phase 1.7 — Discord 운영 표면 (구현됨, AD-10·AD-11)

CLI 진입 장벽(PowerShell·Secret·repo 클론)을 낮추는 경량 표면 — 모바일에서도 조회 가능:

- **알림 push (AD-10)** — `tools/lib/discord.js`의 `DISCORD_WEBHOOK_URL` 웹훅으로 배포 성공/실패·스모크 결과·keepalive CI 실패를 채널에 푸시. 미설정 시 조용히 skip(알림은 선택 계층). 기존 `feedback-notify`(FB-08)와 같은 webhook 패턴
- **조회 명령 봇 (AD-11)** — `tools/supabase/functions/admin-bot` Edge Function이 Discord Interactions 엔드포인트로 `/status`·`/user`·`/pro`·`/errors`·`/feedback` 읽기 전용 조회를 응답. ed25519 서명 검증 + `ADMIN_DISCORD_ID` 단일 게이트로 권한 제한. **쓰기 명령은 의도적 미포함** — 상태 변경·감사는 기존 CLI 경로(admin:grant-pro 콘솔 출력 → 향후 admin_audit)를 유지해 감사 공백(§5 한계 3)을 악화시키지 않는다
- **Phase 2와의 관계** — 인앱 `#/admin`의 대체가 아니라 보완: 비개발자 운영자 투입 전까지의 "조회만 어디서나" 수요를 커버. 한계 4(비개발자 운영 불가)의 부분 완화이며, 쓰기·감사가 필요해지면 Phase 2 발동 조건은 그대로 유효

셋업 절차·명령 표·시크릿 관리: `docs/dev/runbooks/DISCORD_ADMIN.md` (DOC-RBK-17)

### Phase 2 — 인앱 관리자 뷰 `#/admin`

운영 빈도가 CLI 진입 장벽을 넘을 때 도입.

**접근 경로**:
```text
로그인(관리자 계정) → 설정 or URL #/admin → role!=='admin'이면 "권한 없음" 카드
→ lazy import('./views/admin.js') → 4개 탭 렌더
```

- `src/views/admin.js`는 **동적 import + SW SHELL_ASSETS 제외** — 일반 사용자 번들에 관리자 코드를 싣지 않는다 (성능·공격면 절감).
- 내비게이션 노출 없음 — URL 해시 + 설정 메뉴의 조건부 항목(관리자 세션에서만 표시)으로 진입.

**화면 구성 (MVP)**:

| 탭 | 데이터 | 기능 |
|---|---|---|
| 피드백 | `feedback` (kind·날짜 필터) | 목록 → 상세 → `meta.session_id`로 오류 이력 join 링크 |
| 오류 | `client_errors` + `usage_events` | 일별 오류율(오류/세션)·상위 메시지 — `report:errors` 로직의 시각화 |
| 사용자 | `profiles` + `sync_snapshots` 메타 | 이메일 검색·plan 배지·마지막 동기화·기기 수 |
| 사용자 상세 | 상기 + `feedback.user_id` 필터 | plan 토글(`admin_set_plan`)·해당 사용자의 bug 제보 이력·감사 로그 조회 |

### Phase 3 — 별도 콘솔 분리 (보류)

대시보드·코호트·콘텐츠 플래그 관리처럼 기능이 커지면 독립 배포로 분리한다 (같은 Supabase 프로젝트, 별도 Vercel 사이트). 트리거 조건: 관리 화면 번들이 앱 부트 패스를 오염시키거나, 관리자 수 > 2명, 또는 BI급 분석 필요 시점.

---

## 6. 설계상 유지하는 비연결

### 6.1 텔레메트리 ↔ 사용자 연결 금지

`client_errors`·`usage_events`에 `user_id`를 추가하지 않는다. 근거:

- 수집 최소화 원칙 — 관측 목적 데이터가 사용자 식별을 얻으면 개인정보 처리 범위가 넓어진다
- 실용적 대체 경로 존재 — `feedback(kind='bug').user_id`(로그인 제출자) → `meta.session_id` → `client_errors` join으로 "신고된 문제의 오류 이력"은 이미 조회 가능하다
- 익명 오류의 집계 분석(오류율·상위 메시지)은 사용자 식별 없이 충분하다

### 6.2 sync payload 비열람 기본값

`sync_snapshots.payload`에는 사용자의 전체 진도(카드·퀴즈·목표)가 들어 있다. 관리자 목록·상세는 **메타 필드만**(`updated_at`·`device_id`·`exam_id`) 표시하고, payload 열람은 명시적 확인 단계를 거치는 별도 경로로 둔다. CS 대응에서 진도 데이터가 꼭 필요한 경우에만 연다.

### 6.3 관리자 자기 오프라인 환경

Supabase 미설정(순수 로컬) 환경에서는 `#/admin` 라우트 자체가 무의미하므로 진입 시 "이 환경에서는 사용할 수 없습니다" 안내로 종결한다 — 오류가 아닌 정상 분기.

---

## 7. 위협 모델 · 경계

| 위협 | 방어 |
|---|---|
| publishable key 탈취 | 정상 노출 키 — RLS 정책이 비관리자 읽기 차단. 관리자 표면은 UI가 아니라 정책이 지킨다 |
| 클라이언트가 `role:'admin'` 위조 | `app_metadata`는 서버 소유 — 클라이언트가 JWT를 위조하면 서명 검증 실패. `user_metadata`와 혼동 금지(§3.1) |
| 관리자 권한 남용 | `admin_audit` — 모든 상태 변경을 actor·target·detail로 기록, admin만 조회 |
| `admin.js` 모듈 직접 호출 | lazy import를 추측해 로드해도 `is_admin()` 정책이 빈 결과 반환 — UI만 열리고 데이터는 없음 |
| service_role 유출 | 프론트 번들에 비포함 강제 — `check:secrets` 게이트가 service_role 패턴을 스캔 |

---

## 8. SPEC 매핑

| SPEC | 항목 | Phase |
|---|---|---|
| AD-01 | 권한 모델 — `app_metadata.role` + `is_admin()` + 관리자 select 정책 스위트 | 2 |
| AD-02 | 피드백 인박스 뷰 | 2 |
| AD-03 | 오류 대시보드 뷰 | 2 |
| AD-04 | 사용자 관리 — 목록·상세·`admin_set_plan`·`admin_audit` | 2 |
| AD-05 | `#/admin` 라우트 — lazy 로드·SW 프리캐시 제외·비관리자 차단 | 2 |
| AD-06 | 운영 CLI — `report:feedback`·`report:user`·`admin:grant-pro` | 1 |
| AD-08 | `report:user` Pro 확장 — 만료일·잔여일·사용 코드 이력 | 1 |
| AD-09 | `report:pro` — 코드 발급/사용률·만료 버킷·가입 수단 분포 | 1 |

---

## 9. 검증 계획

- **RLS 정책**: 비관리자 계정으로 `feedback`/`client_errors` select → 0행 반환 확인 (수동 SQL or Supabase 테스트)
- **AD-05**: DOM 테스트 — 비관리자 진입 시 차단 카드, 관리자 클레임 시 탭 렌더
- **AD-04**: `admin_set_plan` RPC의 is_admin 가드 — 비관리자 호출 false 반환 + 감사 행 미생성
- **회귀**: 기존 insert-only 정책 유지 — 익명 제출 경로(FB-02·오류 텔레메트리) 비차단 확인

---

## 10. 미결정 사항

- 사용자 목록의 페이지네이션 규모 (수백 명까지는 클라이언트 측 필터로 충분 — 그 이상이면 서버 측 검색 RPC 필요)
- `admin_audit` 보존 기간·조회 UI 범위
- Phase 2 도입 트리거의 정량 기준 (주간 피드백·오류 건수 임계 제안: 주 10건 지속 시 착수)
- 공지 푸시(릴리스 노트 외 인앱 공지) — 현재 `release-notes.json`은 배포 결속형. 관리자가 배포 없이 공지를 띄우려면 별도 `notices` 테이블 + select 정책이 필요 (로드맵 후보, 본 설계 범위 외)
