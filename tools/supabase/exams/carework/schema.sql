-- carework Supabase 스키마 — 시험 전용 도메인 (DA-13, DOC-DSN-43)
-- 실행 방법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
-- 재실행 안전 (IF NOT EXISTS / OR REPLACE 사용)
-- 참고: 플랫폼 공통 테이블은 ../schema.sql — 시험별 테이블은 exams/<id>/schema.sql로 분리

-- ============================================================
-- 6) 기관 워크스페이스 — 요양원 기록 서버 (DOC-DSN-43, Phase 6a)
--   facility·membership 스키마 + manager 초대 코드 가입
-- ============================================================
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  biz_no text,                              -- 사업자/기관코드 (선택)
  invite_code text not null unique,          -- 멤버 초대 코드 — join_facility로만 소비
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.facility_members (
  facility_id uuid not null references public.facilities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'worker' check (role in ('worker','manager')),
  joined_at timestamptz not null default now(),
  primary key (facility_id, user_id)
);

alter table public.facilities enable row level security;
alter table public.facility_members enable row level security;

-- RLS 재귀 차단 — 정책의 facility_members 자기참조를 SECURITY DEFINER 함수로 분리
-- (정책이 자기 테이블을 참조하면 무한 재귀 — definer 함수는 RLS를 우회해 판정)
drop function if exists public.is_facility_member(uuid, uuid);
create or replace function public.is_facility_member(p_facility_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from public.facility_members
                 where facility_id = p_facility_id and user_id = p_user_id);
$$;

-- facilities: 멤버만 열람 (익명·비멤버 차단)
drop policy if exists "facility member read" on public.facilities;
create policy "facility member read" on public.facilities for select
  using (public.is_facility_member(id, auth.uid()));

-- facility_members: 같은 시설 멤버만 열람
drop policy if exists "members read own facility" on public.facility_members;
create policy "members read own facility" on public.facility_members for select
  using (public.is_facility_member(facility_id, auth.uid()));

-- 시설 생성 — 생성자가 role=manager로 자동 삽입 (원자적)
drop function if exists public.create_facility(text, text);
create or replace function public.create_facility(p_name text, p_biz_no text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.facilities (name, biz_no, invite_code, created_by)
    values (trim(p_name), nullif(trim(coalesce(p_biz_no,'')), ''),
            upper(substr(encode(gen_random_bytes(4),'hex'),1,8)), auth.uid())
    returning id into v_id;
  insert into public.facility_members (facility_id, user_id, role)
    values (v_id, auth.uid(), 'manager');
  return v_id;
end;
$$;

-- 초대 코드로 가입 — 코드 검증 후 worker 삽입 (코드 열거 방지: select 불가·함수만)
drop function if exists public.join_facility(text);
create or replace function public.join_facility(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.facilities
    where invite_code = upper(trim(p_code));
  if v_id is null then return null; end if;
  insert into public.facility_members (facility_id, user_id, role)
    values (v_id, auth.uid(), 'worker')
    on conflict (facility_id, user_id) do nothing;
  return v_id;
end;
$$;

revoke execute on function public.create_facility(text, text) from anon, public;
grant execute on function public.create_facility(text, text) to authenticated;
revoke execute on function public.join_facility(text) from anon, public;
grant execute on function public.join_facility(text) to authenticated;
