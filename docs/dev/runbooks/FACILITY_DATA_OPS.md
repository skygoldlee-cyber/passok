# 기관 데이터 운영 절차 — 접근 통제·백업·복구

> **문서 ID**: DOC-RBK-24
> **범위**: platform · 판본: none
> **관련 SPEC ID**: AD-06 (운영 CLI), CO-16 (record-webhook)
> **최종 갱신**: 2026-11-13

carework 기관 워크스페이스 데이터(`facilities` 계열 테이블)에 대한 **수탁자 운영 절차의 정본**이다.
`개인정보처리_위탁계약서_초안`(DOC-BIZ-11) 별지 2의 두 잔여 항목 — ①운영자 접근 절차 문서화
②수탁자 자체 복구 절차 문서화 — 를 이 문서가 해소한다. 계약서 별지 2는 본 런북을 절차 근거로 참조한다.

**대상 테이블**: `facilities` · `facility_members` · `shift_handovers` · `handover_acks` ·
`family_visits` · `incident_reports` · `facility_records` · `facility_form_templates`
(스키마 원본: `tools/supabase/exams/carework/schema.sql`)

---

## 1. 운영자 접근 절차

### 1.1 관리자 자격이 존재하는 위치 (전수 목록)

| 위치 | 형태 | 용도 |
|------|------|------|
| 로컬 `.env`의 `SUPABASE_SECRET_KEY` | Secret(구 service_role) 키 | `tools/lib/supabase_ops.js` 계열 운영 CLI — RLS 우회 |
| GitHub Secrets | 리포지토리 Secret | CI의 `check:rls` 프로브·E2E 시드·스키마 검증 |
| Edge Function env | `SUPABASE_SERVICE_ROLE_KEY` | `record-webhook`(CO-16)·`admin-bot`(AD-11)·`ai-proxy` 서버측 실행 — 운영자 대화형 접근 아님 |
| Supabase 대시보드 | 계정 로그인 | SQL Editor·Table Editor·Auth 관리 — **가장 강력한 경로**, 본 절차의 통제 대상 |
| Management API PAT | `SUPABASE_ACCESS_TOKEN` | `schema:apply`·프로젝트 메타 조회 — DDL 실행 가능 |

키 취급 규약은 `supabase_ops.js` 헤더 주석이 정본이다 — **env로만 전달, 파일·인자·커밋 금지**,
`check:secrets` 게이트가 번들·저장소 유입을 차단한다.

### 1.2 기관 데이터 접근 가능 도구

| 경로 | 접근 범위 | 현 상태 |
|------|-----------|---------|
| 대시보드 SQL/Table Editor | 전 테이블 읽기·쓰기 | 사용 가능 — §1.4 기록 대상 |
| `supabase_ops.js` 기반 CLI (`report:user`·`admin:grant-pro`·`issue_pro_code` 등) | 개인 계정 표(profile·pro_codes) 중심 — 기관 테이블 조회 스크립트는 현재 없음 | 기관 테이블용 CLI가 생기면 이 표에 추가 |
| `tests/e2e/support/facility-setup.js` | **테스트 프로젝트** 한정 시드 — 프로덕션 기관 데이터와 무관 | 테스트 전용 |
| `admin-bot` Edge Function | 읽기 전용 조회(`/status`·`/user` 등), `ADMIN_DISCORD_ID` 게이트 | 기관 테이블 집계 외 본문 조회 명령 없음 |

### 1.3 접근 원칙

`ADMIN_DESIGN.md` §6.2 "sync payload 비열람 기본값"을 기관 데이터로 확장한 것이 본 절차의 원칙이다:

1. **목적 제한** — 접근은 아래 허용 목적에 한한다. 호기심·습관적 열람은 목적이 아니다.
2. **메타 우선** — 건수·존재 여부·타임스탬프 확인으로 답할 수 있는 문제에 기록 본문을 열지 않는다.
3. **최소 범위** — 목적 달성에 필요한 기관·테이블·기간으로 한정한다 (`where` 절에 범위를 명시).
4. **기록 본문 열람·변경은 반드시 기록** — §1.5의 접근 기록에 남긴다.

### 1.4 허용 접근 목적

| 목적 | 예시 | 기록 의무 |
|------|------|-----------|
| 장애·버그 대응 | 기관 신고 건의 데이터 정합 확인, 마이그레이션 오류 조사 | 본문 열람 시 ✅ |
| 기관 요청 처리 | 위탁계약 §12 수출 요청(반환), §6 목적 외 이용 금지 위반 조사, 삭제 요청 | ✅ 항상 |
| 법적 의무 | 수사기관·감독기관의 적법한 제출 요구 | ✅ 항상 (사후 기관 통지 여부 검토) |
| 백업·복구 작업 | §2·§3 절차 수행 | 작업 자체는 런북 실행으로 간주, 덤프 파일 취급은 §2.4 |
| RLS·정책 검증 | `check:rls` 프로브, 정책 드리프트 실측 | anon/테스트 계정 검증은 기록 불요 — 본문 확인이면 ✅ |

**목적 외 금지**: 기관 간 비교 분석, 영업 자료용 열람, 제3자 제공 — 위탁계약 §6 위반이다.

### 1.5 접근 기록

기록 대상 작업(§1.4 ✅)을 수행하면 아래 표에 행을 추가한다. 단일 운영자 체제에서도
"무기록 열람"과 "기록된 열람"의 구분이 수탁자 감독권(계약 §10)의 실체다.

| 일시 | 목적(§1.4 분류) | 대상 범위 | 수행 내용 | 비고 |
|------|----------------|-----------|-----------|------|
| 2026-11-13 | 백업·복구 작업 | `facilities` 마커 행 1건 | 백업·복원 실습 — `TEST-REHEARSAL-DELETE` 삽입→덤프→삭제→`--apply` 복원→삭제. 종료 시 0행 확인 | §4 ★ 실습 기록 |

기록은 이 표에 직접 추가해 커밋한다 — 커밋 자체가 부인 방지 감사 추적이 된다.

### 1.6 키 로테이션·폐기

- Secret 키 노출 의심 시: Supabase 대시보드 → Settings → API Keys → **롤오버** → `.env`·GitHub Secrets·Edge Function env를 순서대로 갱신 → CHANGES.md에 사실 기록.
- PAT(`SUPABASE_ACCESS_TOKEN`)도 동일 절차(Settings → Access Tokens).
- 계약 종료 기관의 데이터는 계정·키와 무관하게 §12 반환·파기 절차를 따른다(§3.4).

---

## 2. 백업 절차

### 2.1 인프라 백업 현황 (Free 플랜 실측 기준)

| 계층 | 제공 여부 | 비고 |
|------|-----------|------|
| Supabase 자동 백업 | **미제공 — Free 플랜** | 일일 백업·PITR는 Pro 플랜부터. 플랜 업그레이드 시 본 행 갱신 |
| 프로젝트 일시정지 방지 | ✅ keep-alive 운영 중 | `supabase-keepalive.yml` 일일 핑 — 정지는 데이터 소실이 아님(INCIDENT_2026-10-17 참조) |
| **운영자 수동 덤프** | §2.2 절차 — **현 시점의 실질 백업 경로** (2026-11-13 실습 완료) | Free 플랜에서는 이것이 유일한 복원 소스 |

결론: **Free 플랜에서는 공급자 백업이 없으므로, §2.2의 운영자 덤프가 백업 의무의 실체다.**

### 2.2 운영자 백업 절차 (PostgREST JSON 덤프 — 실습 검증됨)

`tools/supabase/dump_facility.js`가 기관 8개 테이블을 `restGetAll`로 전량 덤프한다 — 설치 불필요, Secret 키만으로 동작 (2026-11-13 프로덕션 실습: 삽입→덤프→삭제→복원→삭제 전 주기 통과):

```powershell
npm.cmd run admin:facility-backup            # 프로덕션 기관 테이블 → backup/facility_dump_<타임스탬프>.json
npm.cmd run admin:facility-backup -- --test  # 테스트 프로젝트 대상 (TEST_SUPABASE_* 필요)
```

- 덤프 파일은 `backup/`에 생성 — **gitignore 등록 완료, 커밋 금지** (개인정보 포함 가능)
- **커버 범위**: 테이블 데이터만. 스키마·RLS 정책·함수는 `tools/supabase/exams/carework/schema.sql` 재실행으로 복원 — 덤프와 스키마 파일이 쌍으로 백업의 실체를 이룬다

**대안 — pg_dump** (PostgreSQL 클라이언트 설치된 환경 한정 — 본 운영 머신 미설치로 미실습):
대시보드 → Connect → Direct connection URI로 `pg_dump --format=custom` 실행.
스키마 포함 전체 백업이 필요하거나 행 수가 커져 REST 덤프가 느려지면 이 경로로 전환한다.

### 2.3 백업 주기

| 트리거 | 주기 |
|--------|------|
| 기관 파일럿 첫 가입 이후 | **주 1회** `admin:facility-backup` (데이터 작아 비용 무시 수준) |
| 스키마 변경 배포 전 | 덤프 1회 (마이그레이션 롤백 소스) |
| 위탁계약 해지 처리 전 | 해당 기관 데이터 수출(§3.4)과 별개로 덤프 1회 |

주기 실행은 수동 — 자동화가 필요해지면 GitHub Actions cron + Secrets의 connection string으로
`pg_dump → GitHub Release private asset` 경로를 검토한다(기존 REF_PDF 외부화 패턴 재사용 가능).

### 2.4 백업 파일 취급

- 보관 위치: 운영자 로컬 디스크의 비저장소 경로 — OS 계정·디스크 암호화 범위 내
- 보관 기간: 최근 3개분 롤링 유지, 그 이전은 삭제
- 이동·공유 금지: 덤프는 복원 전용 — 다른 매체·전송 경로로 옮기지 않는다

---

## 3. 복구 절차

### 3.1 시나리오별 복구 경로

| 시나리오 | 복구 경로 | 정본 |
|----------|-----------|------|
| 프로젝트 일시정지 (Free 무활동) | 대시보드 Resume — 데이터 무손실 | INCIDENT_2026-10-17_SUPABASE_PAUSE.md (DOC-RBK-15) |
| RLS 정책 드리프트·미적용 | `npm.cmd run schema:apply` → `npm.cmd run check:rls` 실측 | WHEN_THINGS_BREAK §1 |
| 일부 테이블 데이터 소실 | §3.2 테이블 복원 절차 | 본 문서 |
| 프로젝트 삭제·전면 소실 | §3.3 전면 복원 절차 | 본 문서 |

### 3.2 테이블 복원 (덤프 파일에서 upsert — 실습 검증됨)

1. 사전 확인: 소실 범위(테이블·기관·기간)를 `where` 조회로 확정 — 전체 복원 남발 금지
2. 최신 덤프 파일로 복원 — FK 부모(facilities)부터 순서대로 upsert:

```powershell
node tools/supabase/dump_facility.js --restore backup/facility_dump_<타임스탬프>.json          # 복원 계획 (dry-run)
node tools/supabase/dump_facility.js --restore backup/facility_dump_<타임스탬프>.json --apply  # 실행
```

3. 복원 후 검증: 행 수 대조 + RLS 정책 존재 확인(`check:rls`) + 해당 기관에 영향 통지 여부 판단
4. §1.5 접근 기록에 복원 작업을 남긴다

★ 부분 복원(특정 기관·테이블만)은 덤프 JSON을 편집해 대상 행만 남긴 후 `--apply` — 전체 덤프를 그대로 복원하면 다른 기관 행도 upsert된다(merge라 덮어쓰기 없이 idempotent).

### 3.3 전면 복원 (프로젝트 삭제 시)

1. Supabase 프로젝트 재생성 — **리전 `ap-northeast-2`(서울) 필수** (계약 §13 근거)
2. 스키마 재적용: `npm.cmd run schema:apply` + `tools/supabase/exams/carework/schema.sql` SQL Editor 실행
3. Edge Function 재배포: `tools/supabase/functions/` (record-webhook·admin-bot·ai-proxy·feedback-notify) + env 시크릿 재설정
4. 데이터 복원: `dump_facility.js --restore <파일> --apply`로 기관 테이블 upsert (§3.2)
5. 검증: `check:rls` + 로그인·동기화 수동 확인 + 기관 manager 1명 가입 흐름 확인
6. `src/auth-sync/supabase-config.js`의 URL·publishable key 갱신 → 배포 (프로젝트 ref 변경 시)

### 3.4 위탁 종료 시 반환·파기 (계약 §12 연결)

| 단계 | 절차 |
|------|------|
| 반환 | 기관 요청 형식(CSV/PDF)으로 해당 `facility_id` 전 테이블 수출 — service key로 조회 후 전달, §1.5 기록 |
| 파기 | 반환 확인 후 해당 행 삭제 — `facilities` 삭제 시 FK cascade로 하위 테이블 정리 (스키마 `on delete cascade` 확인 후 실행) |
| 증빙 | 삭제 실행 일시·범위를 §1.5 접근 기록에 남기고, 기관에 완료 통지 |

---

## 4. 계약 별지 2와의 대응

| 별지 2 행 | 본 문서 절 | 상태 |
|-----------|-----------|------|
| 운영자 접근 — 접근 사유·절차 문서화 | §1 전체 (자격 위치·도구·원칙·허용 목적·기록·로테이션) | ✅ 문서화 완료 |
| 재해 대응 — 수탁자 자체 복구 절차 | §2~§3 (Free 플랜 실측 기반 백업 경로 + 시나리오별 복원) | ✅ 문서화 완료 |

★ **2026-11-13 실습 완료** — 프로덕션에서 마커 행(`TEST-REHEARSAL-DELETE`) 삽입→덤프→삭제→`--apply` 복원→삭제 전 주기 통과. 실습이 밝힌 사실 2건:
- 본 운영 머신에 pg_dump·psql·Supabase CLI 미설치 → §2.2의 PostgREST 도구 경로가 정본 (pg_dump는 대안 표기)
- `TEST_SUPABASE_SERVICE_ROLE_KEY`가 무효(HTTP 401) — 테스트 프로젝트가 PAT 권한 범위 밖 조직에 있어 자동 갱신 불가, 대시보드에서 수동 갱신 필요 |

## 🔗 정본 문서

- [../../exams/carework/business/개인정보처리_위탁계약서_초안.md](../../exams/carework/business/개인정보처리_위탁계약서_초안.md) — 본 절차가 근거가 되는 계약 (DOC-BIZ-11)
- [../design/ADMIN_DESIGN.md](../design/ADMIN_DESIGN.md) — 운영 CLI·비열람 원칙·위협 모델 (§5 Phase 1·§6.2·§7)
- [../design/SUPABASE_DESIGN.md](../design/SUPABASE_DESIGN.md) — 스키마·키 체계·Free keep-alive 결정
- [INCIDENT_2026-10-17_SUPABASE_PAUSE.md](INCIDENT_2026-10-17_SUPABASE_PAUSE.md) — 일시정지 실측·Resume 절차 (DOC-RBK-15)
- `tools/lib/supabase_ops.js` — Secret 키 취급 규약 (코드 헤더가 정본)
