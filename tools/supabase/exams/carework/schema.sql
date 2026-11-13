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
-- ※ drop function 금지 — 정책이 함수에 의존해 drop이 2BP01로 실패한다.
--    create or replace는 시그니처 동일 시 의존 객체를 유지한 채 갱신된다.
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
create or replace function public.create_facility(p_name text, p_biz_no text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- search_path='' 하에서 extensions 스키마 함수는 반드시 한정자 필요
  -- (pgcrypto는 Supabase 기본 설치지만 search_path 밖 — 미한정 호출은 42883)
  insert into public.facilities (name, biz_no, invite_code, created_by)
    values (trim(p_name), nullif(trim(coalesce(p_biz_no,'')), ''),
            upper(substr(encode(extensions.gen_random_bytes(4),'hex'),1,8)), auth.uid())
    returning id into v_id;
  insert into public.facility_members (facility_id, user_id, role)
    values (v_id, auth.uid(), 'manager');
  return v_id;
end;
$$;

-- 초대 코드로 가입 — 코드 검증 후 worker 삽입 (코드 열거 방지: select 불가·함수만)
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

-- DSN-43 6b — 교대 인수 확인: shift_handovers + handover_acks
-- 인수인계는 별도 문서가 아닌 "교대 경계 이벤트": 이력 자동 요약(참조) + 전망 인계 메모 + 인수 서명

create table if not exists public.shift_handovers (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  author_id uuid not null references auth.users(id),      -- 인계자 (소유권=author)
  client text not null,                                  -- 대상자 식별 (최소 단위)
  shift_date date not null,                              -- 교대 일자
  memo text not null default '',                         -- 전망 인계 메모 (미완료·주의만)
  payload jsonb,                                         -- 이력 요약 파생 (참조용 — 권한 표면 최소화)
  created_at timestamptz not null default now()
);

create table if not exists public.handover_acks (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references public.shift_handovers(id) on delete cascade,
  user_id uuid not null references auth.users(id),       -- 인수자
  acked_at timestamptz not null default now(),
  unique (handover_id, user_id)                          -- 인수자별 1회 서명
);

alter table public.shift_handovers enable row level security;
alter table public.handover_acks enable row level security;

-- shift_handovers: 같은 시설 멤버만 열람·작성 (익명·비멤버 차단)
drop policy if exists "handover member read" on public.shift_handovers;
create policy "handover member read" on public.shift_handovers for select
  using (public.is_facility_member(facility_id, auth.uid()));

drop policy if exists "handover member write" on public.shift_handovers;
create policy "handover member write" on public.shift_handovers for insert
  with check (public.is_facility_member(facility_id, auth.uid()) and author_id = auth.uid());

-- handover_acks: 같은 시설 멤버만 서명·열람 — 작성자는 자기 인수인계에 서명 불가
create or replace function public.handover_facility(p_handover_id uuid)
returns uuid
language sql security definer stable set search_path = ''
as $$
  select facility_id from public.shift_handovers where id = p_handover_id;
$$;

drop policy if exists "ack member read" on public.handover_acks;
create policy "ack member read" on public.handover_acks for select
  using (public.is_facility_member(public.handover_facility(handover_id), auth.uid()));

drop policy if exists "ack member write" on public.handover_acks;
create policy "ack member write" on public.handover_acks for insert
  with check (
    user_id = auth.uid()
    and public.is_facility_member(public.handover_facility(handover_id), auth.uid())
    and exists (select 1 from public.shift_handovers h
                where h.id = handover_id and h.author_id <> auth.uid())
  );

-- DSN-43 6c — 면회·방문 기록: family_visits
-- 가족·친지 방문 예약과 방문 결과를 기관 단위로 공유하는 면회 대장.
-- 예약(scheduled) → 방문완료(done: result jsonb)/취소(canceled) 상태 전이.

create table if not exists public.family_visits (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  author_id uuid not null references auth.users(id),       -- 예약 등록자
  client text not null,                                   -- 대상자 식별 (최소 단위)
  visitor_name text not null,                             -- 방문객 성명
  visitor_phone text,                                     -- 방문객 연락처 (선택)
  relation text not null default '',                      -- 대상자와의 관계 (배우자·자녀 등)
  visit_date date not null,                               -- 방문 예정일
  visit_time text,                                        -- 예정 시간 (선택)
  purpose text not null default '',                       -- 목적·요청사항
  status text not null default 'scheduled'
    check (status in ('scheduled','done','canceled')),
  result jsonb,                                           -- {date,time,summary} 방문 결과
  created_at timestamptz not null default now()
);

alter table public.family_visits enable row level security;

-- 컬럼 추가 — create table if not exists는 기존 테이블을 갱신하지 않으므로
-- 신규 컬럼은 add column if not exists로 별도 선언한다 (재실행 안전)
alter table public.family_visits add column if not exists visitor_phone text;

-- family_visits: 같은 시설 멤버만 열람·등록 (익명·비멤버 차단)
drop policy if exists "visit member read" on public.family_visits;
create policy "visit member read" on public.family_visits for select
  using (public.is_facility_member(facility_id, auth.uid()));

drop policy if exists "visit member write" on public.family_visits;
create policy "visit member write" on public.family_visits for insert
  with check (public.is_facility_member(facility_id, auth.uid()) and author_id = auth.uid());

-- 결과 기록·취소는 시설 멤버 전원 허용 — 방문 응대 근무자가 예약 등록자와
-- 다를 수 있어 update를 멤버로 개방 (인수인계와 달리 상태 전이 테이블)
drop policy if exists "visit member update" on public.family_visits;
create policy "visit member update" on public.family_visits for update
  using (public.is_facility_member(facility_id, auth.uid()));

-- DSN-43 6d — 사고 보고서: incident_reports
-- 기관 평가 증적 — 사고 기록은 법적 문서라 수정·삭제 정책 없음 (등록 후 정정은 신규 기록으로)

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  client text not null,
  occurred_at text not null,                            -- 발생 일시 'YYYY-MM-DD HH:MM'
  place text not null default '',
  type text not null,                                   -- 낙상·욕창·약물·외상·배회·기타
  severity text not null default '',
  description text not null default '',
  action text not null default '',
  family_notified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.incident_reports enable row level security;

drop policy if exists "incident member read" on public.incident_reports;
create policy "incident member read" on public.incident_reports for select
  using (public.is_facility_member(facility_id, auth.uid()));

drop policy if exists "incident member write" on public.incident_reports;
create policy "incident member write" on public.incident_reports for insert
  with check (public.is_facility_member(facility_id, auth.uid()) and author_id = auth.uid());

-- CO-14 — 실무 기록 통합 서버 저장: facility_records
-- 요양일지·근무표·점검표·방문결과 등 실무 산출물을 doc_type 단일 스키마로 기관 스코프 보존.
-- 개인정보 계층: L1(기관 서버) — payload는 코드화·구조화 필드만 (자유서술 원문·서명 이미지는
--   L0 로컬 전용 — CO-06 최소화 원칙 계승). L2(외부 전송) 대상 아님.
-- local_id는 L0 스토어 id 상관키 — (facility, author, local_id) 유니크로 오프라인 재전송 멱등.
-- 개통 조건: 수탁 처리 법무 준비 완료 전 facility 플래그 비활성 유지 (SPEC §3.31 전제).

create table if not exists public.facility_records (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  author_id uuid not null references auth.users(id),       -- 작성 근무자
  doc_type text not null check (doc_type in (
    'care_log','roster','audit','visit_result','client','report')),
  client text not null default '',                         -- 대상자 식별 (최소 단위)
  record_date date not null default current_date,          -- 기록 기준일 (서비스 제공일)
  payload jsonb not null default '{}'::jsonb,              -- 구조화 필드만 (자유서술 금지)
  local_id text,                                           -- L0 스토어 id — 재전송 멱등 상관키
  created_at timestamptz not null default now()
);

create index if not exists facility_records_fac_type_date
  on public.facility_records (facility_id, doc_type, record_date desc);
-- plain 유니크 — NULL local_id는 충돌 비대상(Postgres 관례), upsert arbiter로 사용
create unique index if not exists facility_records_local_uidx
  on public.facility_records (facility_id, author_id, local_id);

alter table public.facility_records enable row level security;

-- facility_records: 같은 시설 멤버만 열람·작성 — append-only (수정·삭제 정책 없음, 보존 원칙)
drop policy if exists "records member read" on public.facility_records;
create policy "records member read" on public.facility_records for select
  using (public.is_facility_member(facility_id, auth.uid()));

drop policy if exists "records member write" on public.facility_records;
create policy "records member write" on public.facility_records for insert
  with check (public.is_facility_member(facility_id, auth.uid()) and author_id = auth.uid());

-- 상태형 doc_type만 본인 행 멱등 upsert 허용 — roster·audit·client는 최신 상태 공유 문서.
-- 이벤트형(care_log·report)은 update 정책 없이 append-only 유지 (보존 원칙)
drop policy if exists "records member update" on public.facility_records;
create policy "records member update" on public.facility_records for update
  using (public.is_facility_member(facility_id, auth.uid())
         and author_id = auth.uid()
         and doc_type in ('roster','audit','client','visit_result'))
  with check (author_id = auth.uid());

-- CO-16 — 외부 수출 webhook 어댑터: facilities.doc_webhook_url
-- 기관이 자체 서버를 둔 경우 facility_records INSERT를 Edge Function이 이 URL로 POST.
-- NULL이면 전송 없음 — L2(외부 전송)는 manager가 명시 설정한 경우에만 개통.

alter table public.facilities add column if not exists doc_webhook_url text;

-- manager 판정 헬퍼 — is_facility_member 동형 (정책 자기참조 재귀 회피, SECURITY DEFINER)
create or replace function public.is_facility_manager(p_facility_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from public.facility_members
                 where facility_id = p_facility_id and user_id = p_user_id and role = 'manager');
$$;

-- facilities: manager만 설정 변경 (webhook_url·초대코드 회전 등)
drop policy if exists "facility manager update" on public.facilities;
create policy "facility manager update" on public.facilities for update
  using (public.is_facility_manager(id, auth.uid()));

-- CO-17 — 기관 자체 양식 템플릿: facility_form_templates
-- 실무도구 기본 양식 외에 기관 고유 양식을 MD+{{키}} 플레이스홀더로 등록·공유
-- (CO-11의 facility_templates 저장 수단 구현). 양식 정의는 개인정보가 아니므로
-- L1 기관 서버 허용. 기입 문서는 facility_records doc_type 'custom_form'으로 기록.
-- 개통 조건: CO-14와 동일 — 수탁 처리 법무 준비 완료 전 facility 플래그 비활성 유지.

create table if not exists public.facility_form_templates (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  title text not null,
  body text not null,                                    -- MD 양식 본문 ({{키}} 플레이스홀더)
  author_id uuid not null default auth.uid() references auth.users(id), -- 등록 manager
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facility_form_templates_fac
  on public.facility_form_templates (facility_id, updated_at desc);

alter table public.facility_form_templates enable row level security;

-- facility_form_templates: 열람은 같은 시설 멤버 전체, 등록·수정·삭제는 manager만
drop policy if exists "form_templates member read" on public.facility_form_templates;
create policy "form_templates member read" on public.facility_form_templates for select
  using (public.is_facility_member(facility_id, auth.uid()));

drop policy if exists "form_templates manager write" on public.facility_form_templates;
create policy "form_templates manager write" on public.facility_form_templates for insert
  with check (public.is_facility_manager(facility_id, auth.uid()) and author_id = auth.uid());

drop policy if exists "form_templates manager update" on public.facility_form_templates;
create policy "form_templates manager update" on public.facility_form_templates for update
  using (public.is_facility_manager(facility_id, auth.uid()));

drop policy if exists "form_templates manager delete" on public.facility_form_templates;
create policy "form_templates manager delete" on public.facility_form_templates for delete
  using (public.is_facility_manager(facility_id, auth.uid()));

-- CO-17 — 기입 문서 유형 확장: facility_records doc_type 'custom_form' (이벤트형 append-only)
-- author_id 기본값 부여 — 클라이언트 insert가 author_id를 생략하므로 NOT NULL 위반 방지
alter table public.facility_records alter column author_id set default auth.uid();

-- author_id·user_id 기본값 — facility_records와 동일 계약 (클라이언트가 id를 생략하는
-- insert는 auth.uid() 기본값으로 채움). 미보정 시 23502 NOT NULL 위반 — J-52x E2E가 적발
alter table public.shift_handovers alter column author_id set default auth.uid();
alter table public.family_visits alter column author_id set default auth.uid();
alter table public.incident_reports alter column author_id set default auth.uid();
alter table public.handover_acks alter column user_id set default auth.uid();
alter table public.facility_records drop constraint if exists facility_records_doc_type_check;
alter table public.facility_records add constraint facility_records_doc_type_check
  check (doc_type in ('care_log','roster','audit','visit_result','client','report','custom_form'));
