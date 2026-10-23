-- Passmula Supabase 스키마 — docs/dev/design/SUPABASE_DESIGN.md §3
-- 실행 방법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
-- 재실행 안전 (IF NOT EXISTS / OR REPLACE 사용)

-- ============================================================
-- 1) profiles — 계정별 Pro 플랜 (entitlement는 서버가 보유)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  pro_since timestamptz,
  pro_expires_at timestamptz,          -- 기간권 만료 시각 (null = 무기한 — 관리자 수동 부여)
  created_at timestamptz not null default now()
);
-- 기존 배포에도 컬럼 추가 — create table은 기존 테이블의 컬럼을 추가하지 않으므로
-- 별도 alter를 둔다 (if not exists = 멱등, 신규 환경에서도 무해)
alter table public.profiles add column if not exists pro_expires_at timestamptz;

-- 가입 시 profiles 행 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 스키마 실행 전에 가입된 기존 사용자 백필 (트리거는 신규 가입에만 발화하므로)
insert into public.profiles (id)
  select id from auth.users on conflict (id) do nothing;

-- ============================================================
-- 2) sync_snapshots — 시험별 진도 스냅샷 (backup.js 논리 키→값 JSON)
-- ============================================================
create table if not exists public.sync_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  device_id text not null,
  primary key (user_id, exam_id)
);

-- ============================================================
-- 3) pro_codes — Pro 활성화 코드 (Phase 3용, 미리 생성)
-- ============================================================
create table if not exists public.pro_codes (
  code text primary key,
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz,
  valid_days int not null default 90,    -- 기간권 일수 (PAY-06 — 스프린트 30 / 스탠다드 60 / 풀코스 90)
  redeemed_exam_date date,             -- 사용 시점 활성 시험일 (PAY-08 보정 감사용 — 만료일이 valid_days보다 긴 이유 추적)
  created_at timestamptz not null default now()
);
alter table public.pro_codes add column if not exists valid_days int not null default 90;
alter table public.pro_codes add column if not exists redeemed_exam_date date;

-- 코드 사용: 유효한 미사용 코드면 plan='pro'로 갱신하고 true 반환.
-- 만료일 = max(기존 만료일, now()) + valid_days — 활성 기간권은 연장, 만료분은 오늘부터 재기산.
-- PAY-08: p_exam_date가 있으면 만료일을 시험일+3일 이상으로 보장한다 (시험 직전 잠김 방지).
-- 관리자 무기한 부여(plan='pro'·pro_expires_at null)는 유지한다.
-- 견고화 (2026-10-23):
--   - p_code 정규화(공백 제거·대문자)를 서버에도 둔다 — 클라 normalizeCode 우회 직접 호출 방어
--   - select 검사 + update 분리 대신 단일 update … returning으로 원자화 — 동시 사용 레이스 차단
--   - profiles 행 부재(트리거 누락·수동 생성 계정) 시 insert 폴백 — 코드만 소비되고 plan 미갱신되는 유실 방지
--   - pro_since는 coalesce로 최초 활성일 유지 — 연장 시 덮어쓰지 않음
-- 시그니처가 바뀌므로 구 단일인자 버전을 먼저 제거한다 (create or replace는 동일 시그니처만 교체).
drop function if exists public.redeem_code(text);
create or replace function public.redeem_code(p_code text, p_exam_date date default null)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_code public.pro_codes%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;
  p_code := upper(btrim(p_code));
  -- 미사용 코드를 원자적으로 소비 — 동시 요청 중 하나만 성공
  update public.pro_codes
    set redeemed_by = auth.uid(), redeemed_at = now(), redeemed_exam_date = p_exam_date
    where code = p_code and redeemed_by is null
    returning * into v_code;
  if not found then
    return false;
  end if;
  update public.profiles
    set plan = 'pro',
        pro_since = coalesce(pro_since, now()),
        pro_expires_at = case
          when plan = 'pro' and pro_expires_at is null then null
          else greatest(
                 greatest(coalesce(pro_expires_at, now()), now())
                      + make_interval(days => v_code.valid_days),
                 coalesce((p_exam_date + 3)::timestamptz, '-infinity'::timestamptz))
        end
    where id = auth.uid();
  if not found then
    -- profiles 행이 없는 계정(handle_new_user 트리거 누락 등) — 코드는 이미 소비됐으니 plan을 반드시 기록한다
    insert into public.profiles (id, plan, pro_since, pro_expires_at)
    values (auth.uid(), 'pro', now(),
            greatest(now() + make_interval(days => v_code.valid_days),
                     coalesce((p_exam_date + 3)::timestamptz, '-infinity'::timestamptz)));
  end if;
  return true;
end;
$$;
-- 익명 호출은 함수 본문의 auth.uid() 가드로 이미 false지만, 권한 경계를 명시한다.
revoke execute on function public.redeem_code(text, date) from anon, public;
grant execute on function public.redeem_code(text, date) to authenticated;
-- 기존 배포에 적용 (구 서명 함수 교체):
--   위 drop + create or replace 블록 전체를 SQL Editor에 실행하면 p_exam_date 인자가 추가된다.
--   앱은 미배포 스키마 감지 시 p_code 단독 호출로 폴백한다 (src/pro-redeem.js callRedeemRpc).

-- ============================================================
-- 4) Row Level Security — 모든 테이블에서 자기 데이터만 접근
-- ============================================================
alter table public.profiles enable row level security;
alter table public.sync_snapshots enable row level security;
alter table public.pro_codes enable row level security;

-- profiles: 본인 행 읽기만 (plan 갱신은 redeem_code RPC만 가능)
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

-- sync_snapshots: 본인 행 CRUD
drop policy if exists "own snapshots" on public.sync_snapshots;
create policy "own snapshots" on public.sync_snapshots
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- pro_codes: 클라이언트 직접 접근 금지 (정책 없음 = 모든 접근 차단, RPC만 사용)

-- ============================================================
-- feedback: 사용자 의견 수신 (USER_FEEDBACK_DESIGN.md §5)
--   - 익명 insert 허용 (비로그인 유튜브 유입자도 제출)
--   - select/update/delete 정책 없음 = 클라이언트 조회 전면 차단
--   - 조회는 대시보드(service role)에서만
-- ============================================================
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users,          -- 로그인 시만, 없으면 익명
  kind        text not null check (kind in ('praise','improve','bug','idea')),
  rating      smallint check (rating between 1 and 5),
  body        text not null check (char_length(body) between 4 and 2000),
  view        text,                                -- 제출 시점 뷰 id
  app_version text,
  entry_src   text,                                -- yt-main 등 유입 채널
  exam_id     text,
  user_agent  text,
  meta        jsonb                                -- 허니팝 통과 여부 등
);

alter table public.feedback enable row level security;

drop policy if exists "public insert" on public.feedback;
-- user_id는 본인 또는 익명만 허용 — 로그인 사용자가 타인 id로 피드백을 심는 스푸핑 차단
create policy "public insert" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- ============================================================
-- client_errors: 런타임 오류 텔레메트리 (src/error-telemetry.js)
--   - 익명 insert 허용 (비로그인도 전송 — 관측성 목적)
--   - select/update/delete 정책 없음 = 클라이언트 조회 전면 차단
--   - 앱 측에서 세션당 상한·메시지 중복 억제로 폭주 방지
-- ============================================================
create table if not exists public.client_errors (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('error','unhandledrejection','session')),
  session_id  uuid,                              -- 페이지 로드당 랜덤 — 사용자 식별 아님, bug 피드백 meta.session_id와의 join 키
  message     text not null check (char_length(message) between 1 and 500),
  stack       text,
  view        text,
  exam_id     text,
  app_version text,
  url         text,
  user_agent  text,
  meta        jsonb
);

-- kind 'session': 페이지 로드당 1건의 세션 핑 — 오류율(오류/세션)의 분모.
-- session_id: 신고 기반 오류 조회용 상관 키 — feedback(kind='bug')의
--   meta.session_id와 join하면 신고 시점 페이지 로드의 오류 이력이 나온다.
-- 기존 배포에 적용:
--   alter table public.client_errors drop constraint client_errors_kind_check;
--   alter table public.client_errors add constraint client_errors_kind_check
--     check (kind in ('error','unhandledrejection','session'));
--   alter table public.client_errors add column if not exists session_id uuid;

alter table public.client_errors enable row level security;

drop policy if exists "public insert" on public.client_errors;
create policy "public insert" on public.client_errors
  for insert to anon, authenticated with check (true);

-- ============================================================
-- usage_events: 과업 퍼널 이벤트 (src/usage-telemetry.js)
--   - 익명 insert 허용 (비로그인도 전송 — 관측성 목적)
--   - select/update/delete 정책 없음 = 클라이언트 조회 전면 차단
--   - session_id는 페이지 로드당 생성되는 랜덤 UUID — start↔complete
--     쌍을 묶는 용도로만 쓰이며 기기·사용자를 식별하지 않는다
--   - 앱 측에서 세션당 이벤트 상한으로 폭주 방지
-- ============================================================
create table if not exists public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  session_id  uuid not null,
  event       text not null check (char_length(event) between 1 and 60),
  exam_id     text,
  app_version text,
  url         text,
  user_agent  text,
  meta        jsonb
);

alter table public.usage_events enable row level security;

drop policy if exists "public insert" on public.usage_events;
create policy "public insert" on public.usage_events
  for insert to anon, authenticated with check (true);

-- ============================================================
-- 조회 인덱스 — 관리자 리포트·시간순 조회의 seq scan 방지
--   report:user(pro_codes.redeemed_by·feedback.user_id)
--   report:pro(profiles.pro_expires_at 버킷)
--   report:funnel·dashboard(usage_events event+created_at, client_errors created_at)
-- ============================================================
create index if not exists pro_codes_redeemed_by_idx
  on public.pro_codes (redeemed_by) where redeemed_by is not null;
create index if not exists profiles_pro_expires_idx
  on public.profiles (pro_expires_at) where plan = 'pro';
create index if not exists feedback_user_created_idx
  on public.feedback (user_id, created_at desc);
create index if not exists usage_events_event_created_idx
  on public.usage_events (event, created_at);
create index if not exists client_errors_created_idx
  on public.client_errors (created_at);

-- ============================================================
-- 확인 쿼리 (선택): 실행 후 테이블 5개·정책 4개·함수 2개가 보이면 성공
--   select table_name from information_schema.tables where table_schema='public';
--   select polname, polrelid::regclass from pg_policy;
-- ============================================================
