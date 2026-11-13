# 기관 사이트 라이선스 설계 — 요양원 단위 월권·기간권 부여

> **문서 ID**: DOC-DSN-51
> **범위**: exam:carework · 판본: none
> **작성일**: 2026-11-13
> **전제**: DOC-DSN-43 기관 워크스페이스 Phase 6a(facilities·facility_members·invite_code·facility-admin 뷰) 배포 완료. PAY-01~08 개인 라이선스 코드(pro_codes·redeem_code) 운영 중
> **관련 SPEC**: PAY-01~08(코드·동기화·만료) · DA-13(도메인 격리) · ROAD-P2(PG·웹훅) · SUBSCRIPTION_ROADMAP

## 1. 배경 — 왜 기관 단위인가

- 개인 라이선스(P2 선실험)는 **수험생 1인 = 1코드** 모델 — 요양원 구독은 구매 주체가 시설(관리책임자·법인)이라 1인 단위 코드 발급·배포가 판매·운영 마찰을 만든다
- 요양원은 시험 주기와 무관한 **상시 고용**이라 개인용 기간권(30/60/90일)보다 **월 반복 과금**이 자연스럽다 (PAYMENT_PILOT_DESIGN §5의 기간권 근거는 수험생 한정)
- DOC-DSN-43 §3이 "개인 Pro 위에 기관 과금 계층"을 이미 예고 — `feature-plan.json`의 `facility_workspace: "pro"`도 그 연장

### 1-1. 기존 자산 — 추가 구현이 거의 없는 이유

| 자산 | 위치 | 기관 라이선스에서의 역할 |
|------|------|------------------------|
| `facilities` + `facility_members`(role worker\|manager) | `tools/supabase/exams/carework/schema.sql` | 라이선스 바인딩 대상 — 멤버십이 곧 좌석 점유 |
| `invite_code` + `join_facility(code)` RPC | 동일 | 직원 유입 단일 경로 — 별도 라이선스 코드 불필요 |
| `facility-admin` 뷰 | `html/exams/carework/facility-admin.html` | manager 셀프서비스의 확장 지점 |
| `syncPlanFromProfile` → `applyPlanToLocal` | `src/pro/pro-redeem.js` | entitlement 동기화 파이프라인 — 재사용 |
| `admin:issue-code` CLI | `tools/check/issue_pro_code.js` | 운영 CLI 패턴(수동 입금 확인 → 명령 1회) 미러링 |

즉 **멤버십 바인딩과 entitlement 파이프라인이 둘 다 존재** — 설계 과제는 둘을 연결하는 것이다.

## 2. 목표와 비목표

**목표**
- 기관(요양원) 단위로 월권·기간권을 부여하고, 소속 멤버 전원에게 entitlement를 자동 부여
- 갱신 운영을 "입금 확인 → 운영자 명령 1회"로 유지 (현 수동 결제 워크플로와 동일)
- 퇴사자 회수: 멤버십 제거 시 entitlement도 해제 — 기관 라이선스의 핵심 차별점

**비목표**
- PG 자동 결제·웹훅 갱신 (ROAD-P2 본실험 범위)
- manager 셀프서비스 결제·좌석 관리 UI (후속 단계)
- 기관 외 다중시험 사이트 라이선스 (학원·교육기관 등) — 본 설계는 carework 기관 한정

## 3. 옵션 비교

| | A. 기관 채널 배치 코드 | B. 기관 구독 테이블 (권장) | C. 정식 결제·셀프서비스 |
|---|---|---|---|
| 방식 | `admin:issue-code --channel ORG<기관> --count N --days 30` — 인원수만큼 개인 코드 발급 | `facility_subscriptions` 테이블 — 멤버십 ∈ 구독중 기관이면 자동 entitlement | B + manager 좌석·갱신 UI + 결제 웹훅 |
| 스키마 변경 | 없음 (오늘 가능) | 테이블 1개 + RPC 1개 + admin CLI | B + PG 연동 |
| 갱신 운영 | 매월 N개 코드 재발급·재배포 | `valid_until` 한 줄 갱신 | 자동 |
| 퇴사자 회수 | 불가 — 코드 만료까지 유효 | 멤버십 제거 시 즉시 해제 | 동일 |
| 직원 배포 코드 수 | 인원수 × 매월 | 0 — 초대코드가 곧 라이선스 경로 | 0 |

**판정**: A는 스키마 변경 없이 오늘부터 판매 실험이 가능한 검증 경로, B는 실제 사이트 라이선스 구현체, C는 로드맵 종착점. A로 수요 검증 후 B로 진입한다.

## 4. 권장 설계 (B) — 상세

### 4-1. 스키마 (`tools/supabase/exams/carework/schema.sql` 추가)

```sql
create table if not exists public.facility_subscriptions (
  facility_id uuid primary key references public.facilities(id) on delete cascade,
  seats int not null default 20,          -- 허용 좌석 (티어 상한)
  valid_until timestamptz not null,        -- 월권=다음 결제일 / 기간권=종료일
  status text not null default 'active',   -- active | paused | refunded
  note text,                               -- 운영 메모 (입금자·계약 경로)
  updated_at timestamptz not null default now()
);
-- 쓰기: service key 전용 (운영자 CLI) — 클라이언트 write 없음
-- select: 해당 기관 manager만 (RLS — is_facility_manager 재사용)
```

### 4-2. entitlement 판정 — `syncPlanFromProfile` 확장

신규 RPC `effective_entitlement()` (SECURITY DEFINER):

```text
개인 경로: profiles.plan='pro' and (pro_expires_at null or > now)  → 'pro', expires
기관 경로: facility_members ⋈ facility_subscriptions
          where status='active' and valid_until > now              → 'facility', expires=valid_until
반환: 우선순위 높은 쪽 (expires가 더 먼 쪽 — 개인 Pro와 기관 중복 시 긴 것 적용)
```

- **lazy 판정** — cron·트리거 없이 다음 로그인 동기화 때 반영. `syncPlanFromProfile` 호출 지점 그대로 RPC만 교체
- 클라이언트는 `applyPlanToLocal`을 그대로 재사용 — 로컬 플래그·PAY-07 만료 톰스톤 파이프라인 무변경. **프론트 구조 변경이 거의 없다**

### 4-3. 운영 CLI (신설 제안 — `admin:facility-sub`, issue_pro_code.js 패턴 미러)

package.json에 스크립트를 신설하는 구현 시점의 호출 형태:

```powershell
admin:facility-sub --facility <biz_no|id> --months 1 --seats 20   # 부여·갱신
admin:facility-sub --facility <id> --revoke                       # 환불·해지 (status='refunded')
admin:facility-sub --list                                         # 구독 기관 현황
```

입금 확인 → 명령 1회 = 갱신 끝. 발급 대장 수기 매칭은 개인 코드와 동일하게 유지.

### 4-4. 직원 가입 경로

시설장이 `invite_code` 하나만 직원 카톡방에 배포 → 각자 `join_facility(code)` → entitlement 자동 부여. **라이선스 코드 배포 단계가 소멸** — 1인 코드 모델 대비 최대 UX 개선점.

### 4-5. 좌석 상한

- 초기: **soft-cap** — 가입 시 멤버 수가 `seats` 초과면 manager에게 경고 배너 + 운영자 확인 대상
- 정착 후: `join_facility` RPC에 hard-cap 분기 추가 가능 (스키마 호환 — seats 컬럼 이미 존재)

## 5. 과금 모델

| 구분 | 제안 | 근거 |
|------|------|------|
| 월권 | `valid_until = 결제일 + 1개월`, 매월 입금 확인 연장 | 요양원은 상시 고용 — 개인 기간권과 달리 월 반복이 자연스러움 |
| 기간권 | 6개월·연 단위 선납 할인 — `valid_until`만 길게 | 동일 스키마, 운영 0 추가 |
| 좌석 티어 | 소형 ≤20인 / 중형 ≤50인 / 대형 무제한 정액 | 요양원 인원 편차(10~100+) 흡수 — 좌석당 단가보다 협상·운영이 단순 |
| 파일럿 가격 | 안 A로 1~2개 기관에 무료·할인 제공, 갱신 의사·체감 단가 수집 | BUSINESS_VALIDATION 판정 프레임 재사용 |

## 6. 기관 자체 서버DB — 상황별 연동

기관의 IT 성숙도가 두 갈래로 갈린다. 자체 서버·전자기록 시스템이 있는 곳(중형 이상 — 상용 ERP 또는 자체 구축)과 없는 곳(소규모 다수). 라이선스 상품 설계에 반영할 상황별 연동 매트릭스:

| 티어 | 기관 상황 | 연동 방식 | 현재 상태 |
|------|----------|-----------|----------|
| T0 | 자체 서버DB **없음** | 연동 불필요 — PassOK `facility_records`가 곧 기관 기록 서버 | ✅ 동작 중 (Phase 6a) |
| T1 | 자체 서버 **있음·HTTP 수신 가능** | 실시간 수출: `facility_records` INSERT → `doc_webhook_url`로 POST (`record-webhook` Edge Function, CO-16) | 🔶 코드 선구축·미개통 |
| T2 | 자체 서버 **있음·폐쇄형** (상용 ERP — 웹훅 수신 불가) | 주기적 묶음 수출: 기록을 PDF/DOCX/CSV로 일괄 내보내기 (CO-13 생성 인프라) → 기관이 자체 시스템에 첨부·보관 | 🔶 부품 존재, 묶음 수출 UI 미구현 |
| T3 | 공단 제출·양방향 동기화 | 비목표 — 청구 연동은 별도 차원의 사업 (DOC-DSN-43 §비목표) | ❌ |

### 6-1. 데이터 방향은 비대칭 — 수출·수입을 분리해서 본다

| 방향 | 내용 | 수단 | 상태 |
|------|------|------|------|
| **수출** (PassOK → 기관 서버) | 인수인계·면회·사고보고·기록 | T1 webhook / T2 묶음 수출 | T1 선구축 |
| **수입** (기관 → PassOK) | 수급자 명부 | ERP CSV 덤프 → `care-csv-presets`(헤더 alias 매핑) 가져오기 | ✅ 동작 중 |

수급자 명부처럼 "기관 시스템이 정본"인 마스터 데이터는 라이브 동기화가 아니라 **CSV 가져오기 반복 적용**으로 충분 — 폐쇄형 ERP도 엑셀 내보내기는 대부분 지원하므로 T2 기관까지 커버된다. 쓰기 방향 동기화(PassOK 기록을 기관 DB에 직접 삽입)는 상용 ERP가 외부 쓰기를 허용하지 않아 현실적 경로가 없으므로 어댑터로도 다루지 않는다.

### 6-2. T1(webhook) 개통 절차 — 선구축 코드의 남은 작업

- Supabase 대시보드 → Database → Webhooks에서 `facility_records` INSERT에 `record-webhook` 함수 등록 + `x-webhook-secret` 헤더 설정 (`WEBHOOK_SECRET` 시크릿) — CO-16 명세의 "운영 절차"
- **법무 검토(0b) 선행** — 수급자 개인정보를 기관 외부가 아닌 기관 자체 서버로 보내는 경로지만, 전송 대상 URL의 적격성(기관 소유 엔드포인트인지)·전송 범위·보관 책임을 계약서 조항으로 확정 후 개통
- 기관 측 엔드포인트가 없는 경우: 수신 람다/중계 어댑터를 기관별로 만들지 않고, **표준 페이로드 스펙 문서만 제공**해 기관 SI가 수신단을 구현하게 한다 (비용·유지보수 경계)

### 6-3. 라이선스 티어와의 연결

| 티어 | 연동 제공 범위 제안 |
|------|---------------------|
| 소형 ≤20인 | T0 기본 (PassOK가 기관 서버) + CSV 가져오기 |
| 중형 ≤50인 | + T2 묶음 수출 (PDF/DOCX/CSV 정기 내보내기) |
| 대형 무제한 | + T1 실시간 webhook 수출 (기관 자체 서버 연동) |

연동 깊이를 티어 차별화 요소로 쓰면, 자체 서버를 가진 큰 기관이 상위 티어를 사는 자연스러운 이유가 된다.

## 7. 미결정 쟁점 (구현 전 확정 필요)

| # | 쟁점 | 선택지 |
|---|------|--------|
| 1 | 기관 라이선스 부여 범위 | (a) 기관 기능만(`facility_workspace` 등) — 개인 Pro는 별도 구매 (DOC-DSN-43 원안) · (b) 좌석당 개인 Pro 포함 — 학습 Pro + 기관 기능 (사이트 라이선스 통상 정의) |
| 2 | entitlement 시험 스코프 | (a) 전역 — `profiles.plan`처럼 전 시험 pro · (b) carework 한정 — entitlement 응답에 scope 필드 추가 필요 (멀티시험 DA-13 정합) |

## 8. 엣지케이스

| 상황 | 처리 |
|------|------|
| 구독 만료 후 오프라인 사용 | 로컬 플래그가 `pro_expires_at`까지 유지 → 경과 시 자동 해제 (PAY-07과 동일, 문제없음) |
| 복수 기관 가입 | PK가 (facility_id, user_id)라 이론상 다중 가능 — `myMembership`은 1건만 읽음. entitlement는 "하나라도 유효 구독" 기준이면 충분 |
| 개인 Pro + 기관 구독 중복 | `max()` 로직 — 양쪽 만료 중 긴 것 적용, 코드 중복 소비 없음 |
| 환불 | `status='refunded'` 또는 `valid_until=now` → 다음 로그인 동기화 시 전원 해제 (grant-pro --revoke 대응물) |
| 시설 삭제 | `on delete cascade` — 멤버십·구독 함께 제거 |
| 기존 멤버 소급 | 구독 활성화 시점에 기존 멤버 전원 즉시 entitlement — 파일럿 기관 온보딩에 유리 |

## 9. 단계 로드맵

| 단계 | 내용 | 선행 조건 |
|------|------|----------|
| 1 | **안 A 수요 검증** — 파일럿 요양원 1~2곳에 채널 코드 발급, 갱신 의사·단가 수집 | 없음 (오늘 가능) |
| 2 | **안 B 구현** — 스키마 + `effective_entitlement` RPC + `admin:facility-sub` CLI | 쟁점 1·2 확정 + 파일럿 피드백 |
| 3 | manager 셀프서비스 — facility-admin에 구독 상태·좌석 현황·갱신 안내 | B 안정화 |
| 4 | 자동 결제 — ROAD-P2 PG 웹훅에 기관 상품 추가 | 본실험 진입 |

## 10. 검증 계획 (단계 2 구현 시)

- RPC 단위 테스트: `effective_entitlement` — 개인만/기관만/중복/만료 경계·refunded 무시
- DOM 테스트: 만료 임박 배너(기존 PAY-07 톰스톤 UI)가 기관 경로 expires에도 동작하는지
- E2E: 시드 계정 기관 가입 → entitlement → 멤버십 제거 → 해제 (시드는 `tools/supabase/seed_test_accounts.js` 패턴)
