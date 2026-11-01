# 기관 워크스페이스 설계 — PassOK가 요양원 기록 서버가 되는 구독 확장

> **문서 ID**: DOC-DSN-43
> **범위**: platform · 판본: none
> **작성일**: 2026-11-01
> **전제**: DOC-DSN-42 실무도구 + Phase 5 인수인계(기록 우선 플로우) 반영 이후
> **관련 SPEC**: DA-13(도메인 격리) · DA-18(권한 뷰 분리) · ROAD-P5(Pro 게이팅) · SUBSCRIPTION_ROADMAP

## 1. 배경 — 왜 기관 서버가 필요한가

- 요양일지 등 돌봄 기록은 **기관의 기록 문서** — 평가방법 고시·청구기준의 보존 대상. 개인 폰의 카톡 공유는 기관 기록을 대체하지 못함
- 현재 구현(Phase 5)은 "공유 전 로컬 저장"까지 — 기기 보존은 준법적 근사치일 뿐 **기관 서버는 아님**
- 교대근무 구조상 돌봄 이력은 같은 기관의 여러 요양보호사가 열람해야 함 — 개인 계정 저장만으로는 조 단위 공유 불가

## 1-1. 핵심 판단 — 인수인계는 "문서"가 아니라 "교대 경계 이벤트"

돌봄 이력이 기관 서버에 누적되면 인수인계의 **정보 전달 기능은 소멸**한다 — 다음 근무자가 이력 타임라인을 직접 열람하면 된다. 그러나 두 기능은 이력으로 대체 불가하다:

| 인수인계의 기능 | 서버 누적 후 |
|---|---|
| 정보 전달(무슨 일이 있었나) | ✅ 대체 — 이력 타임라인 직접 열람 |
| 미완료·예정 작업(전망 정보) | ❌ 이력에 없음 — 별도 인계 메모 필요 |
| 특이 주의사항 | ❌ 부분 — 이력에 흩어진 것을 자동 요약 + 명시 인계 보완 |
| 책임 이관 확인(인수 서명) | ❌ 없음 — "읽고 인수함" 확인 기록 필요 |

따라서 기관 워크스페이스에서 인수인계는 **누적 이력 위의 교대 경계 이벤트**로 정의한다 — 별도 문서 작성이 아니라 (a) 이력 자동 요약 열람, (b) 전망 인계 메모(미완료·주의만), (c) 인수 확인 마킹의 조합. 생성 문서는 보존·인쇄용 파생물로 격하한다.

## 2. 목표와 비목표

**목표**
- 기관(`facility`) 단위의 기록 저장·공유 — 인수인계·요양일지가 기관 스코프로 보존
- 인수자 열람 확인(서명/읽음) — 인계 완료 상태 추적
- 요양원 단위 구독(기관 플랜) — 개인 Pro 위에 기관 과금 계층

**비목표(본 설계 범위 외)**
- 국가 보고·공단 전송 API 연동 — 청구 연동은 별도 차원의 사업
- 실시간 동시 편집 — 인수인계는 1인 작성·n인 열람 구조면 충분
- 기존 기관 전자기록 시스템과의 양방향 동기화 — Phase 후반에 수출 어댑터로 검토

## 3. 모델

```
account (Supabase auth 사용자)
facility (요양원 — name, 사업자번호 또는 공단 코드, 관리자)
membership (account ↔ facility — role: worker | manager)
carelog_records (facility_id, author_id, client, created_at, payload — 돌봄 이력: 인수인계의 기반)
shift_handovers (facility_id, from_worker, to_worker, shift, forward_note(미완료·주의만), log_refs, created_at)
handover_acks (handover_id, reader_id, read_at — 인수 확인: 책임 이관 지점)
```

- `carelog_records`가 정보 전달의 본체 — `shift_handovers`는 전망 메모 + 인계 경계 이벤트로 축소 (전체 일지 재기입 금지)
- 인수인계 화면 = 해당 대상자의 최근 carelog 자동 요약 + forward_note 작성 + `handover_acks` 인수 확인
- `worker`: 기록 작성·열람·인수 확인 / `manager`: 기관 전체 열람·기록 보존 관리·멤버 초대

## 4. 접근 제어 (RLS)

- `shift_handovers`·`handover_acks`·`carelog_records`: `facility_id`가 멤버십과 일치하는 멤버만 select/insert
- `manager`만 facility 설정·멤버 초대 가능 — worker 초대는 manager 승인 흐름
- RLS 익명 침투 프로브(CI 기존 검사)에 신규 테이블 포함 — 익명 select/insert 차단을 스키마 선언과 함께 검증

## 5. 구현 위치 — 기존 패턴 유지

- 도메인 격리 유지: `src/exams/carework/` 도메인 모듈은 순수 로직·뷰만 — Supabase 쓰기는 플랫폼 계층(`auth-sync/sync.js` 계열)이 담당
- 동기화 계층은 기존 스토어 래퍼 패턴 — `handover-store.js`가 로컬 + 기관 저장소 이중 기록 (오프라인 우선, 접속 시 기관 동기화)
- 뷰는 기존 `views/`에 추가 — `facility-setup`(기관 연결/멤버십)·`handover`는 기관 열람 섹션 추가
- feature-plan: 기관 플랜 키 `facility_records`, `facility_workspace` — 개인 Pro와 별개 과금 계층 (구독 로드맵 확장)

## 6. 단계

| Phase | 범위 | 비고 |
|---|---|---|
| 6a | facility·membership 스키마 + manager 초대 | Supabase 테이블·RLS + 가입/기관 연결 뷰 |

### 6a-1. DDL 스펙 (`tools/supabase/exams/carework/schema.sql` — 시험별 분리, 재실행 안전)

```sql
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  biz_no text,                              -- 사업자/기관코드 (선택)
  invite_code text not null unique,          -- 멤버 초대 코드 (서버 생성)
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
```

- `invite_code`는 `join_facility(code)` SECURITY DEFINER 함수로만 소비 — 코드 열거 방지 (직접 select 불가)
- `create_facility(name, biz_no)` 함수 — 시설 생성 + 생성자를 role=manager로 자동 삽입 (원자적)
- 기존 패턴 동일: IF NOT EXISTS·SECURITY DEFINER·RLS enable + 익명 침투 프로브 대상

### 6a-2. RLS 정책

```sql
alter table public.facilities enable row level security;
alter table public.facility_members enable row level security;
-- facilities: 멤버만 열람 (익명 차단)
create policy "facility member read" on public.facilities for select
  using (exists (select 1 from public.facility_members m
                 where m.facility_id = id and m.user_id = auth.uid()));
-- facility_members: 같은 시설 멤버만 열람
create policy "members read own facility" on public.facility_members for select
  using (exists (select 1 from public.facility_members m
                 where m.facility_id = facility_id and m.user_id = auth.uid()));
```

### 6a-3. 멤버십 흐름 — manager 생성 / worker 코드 가입

**뷰 분리 원칙 (DA-18)**: 클라이언트 뷰(worker)와 어드민 뷰(manager)는 별도 뷰로 분리 — 한 뷰 내 역할 전환형 금지 (권한 표면 노출·감사 추적 분리·nav 독립 진입)

| 뷰 | 대상 | 내용 |
|---|---|---|
| `facility-join` (클라이언트) | worker | 초대 코드 가입 + 내 소속 기관·역할 표시 — 등록·멤버관리 없음 |
| `facility-admin` (어드민) | manager | 기관 등록 + 초대 코드 관리·재발급 + 멤버 목록·역할 관리 — **nav 항목은 기본 숨김, manager 확인 후 해제** + worker 접근 시 "관리책임자 전용" 안내 |

| 흐름 | 진입 | 동작 |
|---|---|---|
| manager | "기관관리" 어드민 뷰 | `create_facility(name)` → invite_code 발급 → 멤버·코드 관리 |
| worker | "기관가입" 클라이언트 뷰 | `join_facility(code)` → membership worker 삽입 → 소속 표시 |

### 6a-4. 구현 위치

- `src/exams/carework/facility.js` — 도메인 API 호출 (getSupabase 래퍼 경유, RPC 호출만)
- `views/facility-join.js` + `html/exams/carework/facility-join.html` — **클라이언트 뷰**: 코드 가입 + 내 소속 표시 (registry `careFacilityJoin`, priority 5)
- `views/facility-admin.js` + `html/exams/carework/facility-admin.html` — **어드민 뷰**: 기관 등록 + 멤버·초대코드 관리 (registry `careFacilityAdmin`, priority 6, manager 전용)
- `data-pro-feature="facility_workspace"` — 기관 워크스페이스는 Pro 계층 |
| 6b | 교대 인수 확인 — 이력 자동 요약 + 인계 메모(전망만) + 인수 서명 | shift_handovers + handover_acks — 별도 문서 아닌 교대 경계 이벤트 |
| 6c | 요양일지 기관 보존 + manager 열람 | carelog_records + 기록 보존 뷰 (평가 대비) |
| 6d | 기관 플랜 결제·수출 어댑터 | 구독 과금 계층 + 기존 전자기록 연동 검토 |

## 7. 리스크·의존

- **법령 의무와의 정합**: "기관 서버"가 PassOK로 간주되려면 요양원이 이를 기록 시스템으로 채택해야 — 초기엔 기존 전자기록 병행+내보내기 서식(A+C)으로 기록 의무 우회
- 멤버십 미승인 상태의 데이터 소유권 명확화 — author 소유 vs facility 소유 정책을 스키마에 명시
- 오프라인 작성 후 온라인 동기화 충돌 — 인수인계는 단조 기록이라 충돌 여지 작음(append-only)
