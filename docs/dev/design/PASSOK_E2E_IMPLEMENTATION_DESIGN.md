# PassOK E2E 자동화 구현 설계 — 기존 Playwright 체계 + 가이드 절차 요소 이식

> **문서 ID**: DOC-DSN-46
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (테스트 인프라 설계 — 앱 동작 요구사항 아님)
> **관련 문서**: DOC-DSN-45 (E2E 자동화 구축 가이드 — 본 설계의 참조 원안) · `tests/e2e/` 기존 스펙
> **목적**: DOC-DSN-45 가이드의 절차적 설계(환경 분리·시나리오 카탈로그·DB 검증·보고서·CI 게이트)를 PassOK의 **기존 Playwright 체계 위에** 이식하는 실행 설계

## 1. 배경·문제

DOC-DSN-45는 agent-browser + 셸 스크립트 기반 E2E 구축을 가정한 범용 가이드다. PassOK는 이미 `test:e2e`(Playwright, 25 스펙, chromium/mobile/tablet 프로젝트)가 있으므로 가이드를 그대로 적용할 수 없다 — **도구 계층은 유지하고, 가이드의 절차적 요소(환경 분리·데이터 검증·보고서·판정 규칙)를 이식**한다.

> **필수 전제 (선행 조건)**: `src/auth-sync/supabase-config.js`는 **운영 프로젝트 URL·publishable key를 하드코딩**하고 serve.js도 env를 앱에 주입하지 않는다 — 즉 배포 앱에서 `isSupabaseConfigured()`는 항상 true다. **테스트 Supabase 오버라이드 기작 없이 인증 관련 스펙(J-102 계열)을 로컬에서 실행하면 운영 DB를 직접 쓴다.** 오버라이드 기작(§3-1-1)을 Phase 1의 선행 작업으로 둔다.

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
    j-101-nonlogin-study.spec.js
    J-102-auth-sync.spec.js
    j-201-mock-exam.spec.js
    j-202-progress-resume.spec.js
    j-203-access-control.spec.js
    j-301-exam-switch.spec.js
    j-302-docs-print.spec.js
    j-401-responsive.spec.js
    j-402-pwa-offline.spec.js
    ...
  db/                          # 신설 — Supabase 검증 스크립트 (가이드 §7-4/7-5 이식)
    verify-attempt.mjs         # 화면 점수 ↔ DB 행 대조
    rls-check.mjs              # 계정 간 데이터 격리 검사
    # 계정 시드는 tools/supabase/seed_test_accounts.js에 구현됨 (2026-11-11 — tools/supabase 관례)
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

- 기존 24 스펙은 **그대로 유지** — journeys/는 신규 시나리오 전용 디렉터리로 분리
- 공통 헬퍼는 `support/`에 신설 — 기존 스펙의 inline 선택자는 리팩터 시에만 이관 (대규모 재작성 금지)

## 3. 테스트 환경 분리

### 3-1. Supabase 테스트 프로젝트

| 구분 | 운영 | 테스트 |
|------|------|--------|
| 프론트엔드 | `https://passok.vercel.app` | `http://localhost:3000` 또는 Vercel Preview URL |
| Supabase | 운영 프로젝트 (`SUPABASE_URL` env) | 별도 테스트 프로젝트 또는 `supabase start` 로컬 |
| 설정 주입 | `supabase-config.js` **하드코딩 상수** (env 읽지 않음) | §3-1-1 오버라이드 기작 필요 — TEST env로 치환 |

### 3-1-1. Supabase 오버라이드 기작 (필수 선행)

`supabase-config.js`는 env를 읽지 않으므로, 앱 무수정(`data-testid` 원칙 정합)으로 테스트 프로젝트를 가리키게 하는 방법:

- **권장**: Playwright `page.route('**/supabase-config.js')`로 모듈 응답을 가로채 테스트 상수로 치환 — 스펙 공통 헬퍼(`support/supabase-override.js`)로 제공하고 인증 시나리오에서만 적용
- **대안**: serve.js가 `TEST_SUPABASE_URL` 감지 시 해당 모듈을 재작성 서빙
- **금지**: 운영 상수를 그대로 두고 인증·동기화 쓰기 테스트 실행 — 운영 DB 오염

스키마 프로비저닝도 선행이다 — 테스트 프로젝트에 운영과 동일 스키마·RLS가 필요하며, 마이그레이션 저장소가 없으면 스키마 스냅샷을 `db/`에 함께 둔다.

`isSupabaseConfigured()` 게이트로 미설정 시 인증 UI가 비활성이므로, **로그인 시나리오만 테스트 프로젝트 설정이 필요** — 비로그인 시나리오(J-101 계열)는 설정 없이도 동작.

### 3-2. 테스트 계정 시드

가이드의 4종 계정을 PassOK 상태로 각색 (이용권 → Supabase 계정 상태 + localStorage 시드로 치환):

| 계정 | 시드 상태 | 검증 용도 |
|------|-----------|-----------|
| `e2e-new@…` | 가입 직후, 동기화 이력 없음 | 신규 사용자 온보딩·첫 동기화 |
| `e2e-active@…` | 학습 이력 시드됨 (진도·답안 일부) | 로그인 후 복원·동기화·RLS 검증 |
| `e2e-sync@…` | 동기화 충돌 상태 (로컬·클라우드 서로 다른 진도) | 충돌 해결·마지막 쓰기 우선 검증 |
| `e2e-admin@…` | 관리자 플래그 (해당 시) | 관리자 화면 접근 — 미구현 시 생략 |

시드는 `tools/supabase/seed_test_accounts.js`가 service role key로 수행 — 매 실행 전 idempotent하게 동일 상태 복원 (구현됨 2026-11-11, 절차는 runbooks/E2E_TEST_SUPABASE.md).

### 3-3. 비밀정보

`TEST_SUPABASE_SERVICE_ROLE_KEY`·계정 비밀번호는 Devin Secrets/GitHub Secrets에만 — 저장소 기록 금지. `tests/.auth/`·storageState 파일은 gitignore 등록.

## 4. 시나리오 카탈로그 (가이드 §5 → PassOK 재작성)

가이드의 T-###을 PassOK 실제 기능으로 매핑한다. P1 = 배포 차단, P2 = 경고, P3 = 주기 점검.

| ID | 영역 | 우선 | 사용자 흐름 · UI 검증 | 데이터 검증 | 기존 커버 |
|----|------|------|---------------------|------------|-----------|
| J-101 | 비로그인 학습 | P1 | 시험 선택 → 과목 학습 → 퀴즈 풀이 → 진도 표시 — 로그인 없이 전 과정 | localStorage 진도 기록 (클라우드 미설정 상태에서) | flows.spec 부분 |
| J-102 | 인증·동기화 | P1 | 로그인 → 학습 → 로그아웃 → 재로그인 → 클라우드 진도 복원 | Supabase 사용자 행·동기화 테이블에 진도 저장 확인 | `j-102-auth-sync.spec.js` 구현됨 (로컬 9/9) |
| J-201 | 모의고사 응시 | P1 | `#/exam` 통합 모의고사 → 문제 풀이 → 제출 → 점수·과락(과목 60 미만)·평균60 판정 표시 | 점수 화면 = localStorage 기록 = (로그인 시) Supabase 동기화 행 | exam-risk 부분 |
| J-202 | 진도 복원 | P1 | 학습 중 이탈 → 새로고침 → 이어서 학습 → 복원 확인 | 진도 키 1건만 갱신 (중복 저장 없음) | reader-flow 부분 |
| J-203 | 접근 제어 | P1 | 만료/비인가 상태에서 Pro 배지 콘텐츠 접근 → 게이트 안내 | feature-plan pro 항목 노출 상태 검증 | ux-surfaces 부분 |
| J-301 | 콘텐츠 팩 | P2 | 시험 전환 (cosmetic↔carework) → 각 팩 콘텐츠 로드 | 팩 전환 시 스코프 분리 확인 (DA-13) | exam-switch |
| J-302 | 문서·인쇄 | P2 | 학습안내서·실무매뉴얼 열기 → 인쇄/PDF 버튼 → 미리보기 탭 | PDF 생성 실패 시 window.print 폴백 | 수동 검증 필요 |
| J-401 | 반응형 | P2 | 3 뷰포트 × 주요 화면 스크린샷·가로 스크롤 0px 판정 | — | mobile-overflow·responsive-flow |
| J-402 | PWA·오프라인 | P3 | 오프라인 전환 → 안내·캐시 서빙 → 복구 후 동기화 | 오프라인 중 진도 유실·중복 저장 없음 | 없음 (신규) |
| J-500 | 팩 적합성 | P2 | exams.json 전 팩 × 부팅·교재·퀴즈·통합 모의고사·선언 실무 뷰 렌더 | registry 기대치 대비 출제 계약 + 타 스코프 localStorage 키 0건 | `j-500-exam-conformance.spec.js` (매트릭스 동적 생성) |
| J-510 | 실무 기록 | P2 | care-log 작성→생성→저장→재진입 복원·삭제 · care-visit 예약→결과기록→완료 이동 · care-incident 생성→저장→목록 | `carework:` 스코프 localStorage 지속 + 라우팅 재진입 목록 일치 | `j-510-care-records.spec.js` |
| J-511 | 명부·근무표 | P2 | care-client 등록→일지 기록(명부 datalist 해소)→통합 이력 연동·수정 경로 · care-roster 배정→목록→삭제 | clientTimeline 이름/ID 해소 계약 | `j-511-care-clients-roster.spec.js` |
| J-512 | 도구·평가 | P2 | care-calc 재가급여→본인부담 결과 표 · care-card 상세→사고보고서 선기입 연동 · care-audit 체크→진행률→재부팅 지속 | CARE_INCIDENT_DRAFT 초안 소비 계약 | `j-512-care-tools.spec.js` |
| J-513 | 양식·기관찾기 | P2 | care-custom-form 템플릿({{항목}} 기입란) →기입→문서 생성·저장 · care-forms 발급처 링크 디렉터리 · care-finder 검색→기관 설정 | 로컬 시설 데이터 필터 + `care-finder-set` 기관명 연결 | `j-513-care-forms-finder.spec.js` |
| J-520 | 기관 생성·가입 | P1 | admin 기관 등록(UI→create_facility RPC)→초대 코드 발급 / 별도 컨텍스트 member 코드 가입(join_facility RPC)→소속 카드·멤버 2명 반영 + 무효 코드 오류·미가입 유지 | facilities·facility_members 행 REST 단언 | `j-520-facility-onboarding.spec.js` |
| J-521 | 기관 인수인계 | P1 | member care-handover '기관에 공유'(shift_handovers)→admin 대장 확인→'인수 확인'(handover_acks) + 작성자 본인 서명 RLS 차단 | handover_acks 행 REST 단언·작성자≠서명자 | `j-521-facility-handover.spec.js` |
| J-522 | 기관 기록 대장 | P1 | 면회 예약 '기관에 공유'→family_visits·기관 면회 대장 · 사고 보고서 공유→incident_reports·기관 사고 대장 | 두 테이블 행 REST 단언 | `j-522-facility-records.spec.js` |
| J-530 | 배합 계산기 | P2 | formulaNew → 원료 행·농도 입력 → 고시 검증 배지(정상·초과·확인) → 저장 → 보관함 카드 → 열기(editingId 복원) → 삭제 | `cosmetic:` 스코프 포뮬러 지속 + 스테퍼·절차·합계 | `j-530-formula-calc.spec.js` |
| J-531 | Formula 워크스페이스 | P2 | 고객 등록 → 처방 저장(고객 접힘 customerId 연동) → 조제 기록(처방 프리셀렉트·고객 연결) → 고객 상세 역조회 칩 · 원료 장부 · 기성품 전성분 · 사업 유형 카드 게이트 | 고객↔처방↔조제 3스토어 연동 + biz-profile 가시 게이트 | `j-531-formula-workspace.spec.js` |
| J-900 | 품질 신호 | P1 | 전 시나리오 공통: JS 예외 0 · 5xx 응답 0 | `evidence.js`의 console/network 수집 첨부 | app.spec 부분 |

**첫 구현 대상**: J-201(모의고사) — 학습·채점·저장이 한 흐름에 있어 공통 헬퍼가 함께 완성. 단 J-101(비로그인)이 선행으로 자연스럽게 붙는다 — 로그인 불필요, 오버라이드 기작 없이 즉시 작성 가능 (가이드 §5 권장과 동일 논리).

**시험팩 우선순위**: 시험팩 의존 시나리오(J-101/201/202 시드·J-301 커버리지)는 **carework 팩 기준으로 먼저 구축**한다 — carework는 `tier: active`이자 가장 빠르게 확장 중인 팩(실무 기능 14종)이며, 나머지 팩 커버리지는 carework 완성 후 동일 패턴으로 복제한다 (2026-11-11 확정).

> **carework 학습 경로 주의**: carework는 **careFlow 4단계**(미리풀기→이야기→요약→시나리오, 진도는 `carework:flow_progress`·`flow_attempts`·`quiz_results`의 `*_quiz_flow_*` 항목)가 기본 학습 경로이며, 표준 `quiz-view`·`flashcard-view`는 `data-needs` 게이트가 교재 파생 카드·퀴즈 존재 시에만 노출한다(UX-NAV-16). 2026-11-11 caretheory Ch.02 용어표 파일럿(카드 32·퀴즈 30 + careprac 은행보충 16/15)으로 게이트가 해제되어 J-101이 양쪽 경로를 모두 검증한다. 나머지 챕터 확장 중에는 과목별 데이터 편차를 주의한다.

> **J-201 구현 메모** (2026-11-11): `j-201-mock-exam.spec.js`는 통합 실전 모의고사 계약을 검증한다 — `#/exam` 딥링크 진입(모바일 탭바에 시험 항목 없음) → `#integrated-exam-btn`으로 manifest `questionsPerSubject` 합산(35+45) 응시 → 전 문항 응답·OMR 진행률·`sim_draft_session` 기록 → 제출 확인 모달(`showConfirm`) → `sim-result-*` 점수·과목별 분석·과락/합격 예측 판정 → `sim_results_history`의 `examId:'integrated'` 행과 화면 점수 일치·드래프트 제거를 확인한다. 과락 기준은 carework manifest `subjectFailBelow: 60` — 카탈로그 초기 표기(40)는 정정됨.
>
> **J-203 구현 메모** (2026-11-11): `j-203-access-control.spec.js`는 Pro 배지 게이트의 안내형 계약을 검증한다 — feature-plan `free` 표기(mock_exam) 배지 숨김·`pro` 표기(care_log_save) 배지 '유료' 노출 → 요양일지 저장(pro 기능) 최초 진입 시 `💎 유료 기능 안내` 모달 + `pro_notice_seen._global` 기록(GLOBAL_KEYS라 비스코프) → 안내 비차단으로 저장 완료 → 재진입 시 재표시 없음(전역 1회). 결제 미도입으로 "게이트"는 배지+안내이며 실제 이용을 차단하지 않는다 — 카탈로그 "게이트 안내"의 현재 구현 해석.
>
> **J-302 구현 메모** (2026-11-11): `j-302-docs-print.spec.js`는 매뉴얼 인쇄·PDF 계약을 검증한다 — `ManualViewer.openManual` → `[data-manual-print]` → 스타일드 PDF 새 탭(`popup` 이벤트 + 'PDF 미리보기' 토스트, headless에서 blob: URL 미커밋이라 토스트로 판정) + `html2canvas` 강제 실패 시 'PDF 생성 실패' 토스트·`window.print()` 폴백 호출 1회. 모바일은 더보기 시트 경유.
>
> **J-401 구현 메모** (2026-11-11): `j-401-responsive.spec.js`는 가로 오버플로 0 계약을 검증한다 — dashboard·exam·quiz·cards·calendar·analysis 6뷰를 해시로 순회하며 `scrollWidth > clientWidth + 1` 수집. 3프로젝트(1280/Pixel 7/834)가 뷰포트 매트릭스 역할.
>
> **J-402 구현 메모** (2026-11-11): `j-402-pwa-offline.spec.js`는 오프라인 계약을 검증한다 — SW 컨트롤 확보(미설치면 reload 1회, 미등록 환경은 skip) → `context.setOffline` 후 캐시로 재부팅·`#offline-banner.show` 표시(프로브 유예 15s+실패 3회라 45s 대기) → 온라인 복구 시 배너 해제.
>
> **J-301 구현 메모** (2026-11-11): `j-301-exam-switch.spec.js`는 시험 전환의 스코프 분리 계약을 검증한다 — `#/exams`에서 cosmetic 카드 선택 → `selectExam`의 `location.reload()` → 타이틀·`current_exam` 교체 + `carework:` 스코프 진도 무결 → carework 복귀 복원. **시드 주의**: `addInitScript`는 리로드마다 재실행되므로 `current_exam`은 `if (!getItem)` 조건부 시드가 필수 — 무조건 덮어쓰면 전환이 매번 되돌아간다(실제 디버깅으로 확인).
>
> **J-202 구현 메모** (2026-11-11): `j-202-progress-resume.spec.js`는 careFlow 이어하기 계약을 검증한다 — 중간 단계 중단(story/summary) 후 대시보드 경유·새로고침·개념 재선택 시 `flow_progress`의 저장 단계로 복귀(`result` 저장분은 `scenario`로 매핑), 완주 시 `stage='complete'` 기록, 재접속 후 개념 목록 옵션의 상태 접두(✓ 완료·! 취약·↻ 복습)를 확인한다. **2과목 개념을 쓴다** — 1과목 개념은 pre 문항이 없는 경우가 있어 단계 저장 시점(응답 시 기록)이 어긋난다.
>
> **J-102 차단 판정** (2026-11-11): 테스트 Supabase 환경 미확보로 구현 보류 — `.env`에 `TEST_SUPABASE_*` 키 없음(운영 키만 존재), 로컬 `supabase start`도 Docker 미설치로 불가. 해제 조건: ①별도 테스트 프로젝트 생성 + `TEST_SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY` 시크릿 등록 또는 ②Docker 설치 후 `supabase start` → 이후 §3-1-1 오버라이드 기작 구현 → J-102 작성. 운영 DB 직접 사용은 절대 금지.
> **→ 기반 선구현 완료** (2026-11-11): §3-1-1 오버라이드 헬퍼·`tools/supabase/seed_test_accounts.js`(멱등·운영 ref 감지 중단)·스키마 프로브 TEST_* 오버라이드·`.env.example` 키 선언까지 완비. 남은 것은 테스트 프로젝트 생성 + 키 3종 등록뿐 — 절차는 `docs/dev/runbooks/E2E_TEST_SUPABASE.md`.
> **→ 차단 해제·구현 완료** (2026-11-11): `passok-e2e` 프로젝트 생성·스키마 15테이블·시드 3계정·GitHub Secrets 4종 완비. `j-102-auth-sync.spec.js` 3시나리오 × 3프로젝트 로컬 9/9 통과, ci.yml e2e 잡에 TEST_* env 주입. 구현 중 발견된 함정(SW precache의 route 우회 → `serviceWorkers:'block'` 필수, Pro 게이트·비스코프 payload 키, getSupabase 경합)은 런북 Phase D에 기록.
>
> **J-500 구현 메모** (2026-11-12): `j-500-exam-conformance.spec.js`는 `tests/e2e/support/exam-matrix.js`가 exams.json + `data/exams/<id>/registry.js`(빌드 산출물)에서 읽은 기대치로 팩당 1테스트를 동적 생성한다 — 신규 팩은 스펙 수정 없이 자동 편입. **팩별 분기는 registry가 정본**: ①`stats.quizzes>0` 과목이 없는 팩(compapp2 등)은 빈칸퀴즈가 '미저작' 상태이므로 무응답이 아니라 '출제 가능한 퀴즈가 없습니다' 토스트의 정상 열화를 검증 ②통합 모의고사는 **모든 과목**에 문항 뱅크가 매핑돼야 시작된다(`exam-sim-session.js` missingSubjects 가드) — 미커버 과목이 있으면 '데이터 불완전' 토스트, 전 커버면 실제 출제+1문 응답을 요구 ③`integratedExam` 카드 노출 판정은 앱과 동일하게 `questionsPerSubject` 맵 유무 — hairdresser의 구형 `subjects[]` 배열 스키마는 비노출이 정상. 과목 순회는 '비어 있으면 다음 과목을 고르는' 사용자 행동을 그대로 따른다(과목별 콘텐츠 편차가 팩마다 다름).
>
> **J-510~513 구현 메모** (2026-11-12): carework 실무모드 로컬 CRUD 스위트 — 스토어는 `carework:` 스코프 localStorage라 Supabase 불필요(기관 경로는 J-52x 소관). 구현 중 확인된 함정 3가지: ①더보기 `details.care-more-actions > summary` 선택자는 **지연 주입된 다른 실무 뷰의 동명 summary까지 매칭**되므로 `#care-log-view`/… 뷰 스코프 필수 ②Pro 배지 버튼(`data-pro-feature` 저장 계열) 첫 클릭 시 `#pro-upgrade-overlay` 안내가 떠서 이후 클릭을 가로막는다 — `examSeed()`가 비스코프 `pro_notice_seen`에 `{"_global":…}`를 미리 기록해 해제(안내 모달 계약 자체는 J-203이 검증) ③`obs-*` 관찰 칩은 시각 숨김 radio + `label.obs-chip` 패턴이라 `check()`가 아니라 **라벨 클릭**이 실사용자 경로. 스토어 간 연동은 J-511의 clientTimeline(일지→명부 이력)과 J-512의 카드→사고보고서 `CARE_INCIDENT_DRAFT` 초안 소비가 핵심 계약이다.

> **J-520~522 구현 메모** (2026-11-12): 기관 워크스페이스는 Supabase 다중 사용자 경로 — `facility-setup.js`가 공통 기반: ①매 테스트 **고유 admin·member 사용자를 service role admin API로 생성·폐기** — 최초엔 공유 시드 계정+기관 삭제 리셋이었으나 CI에서 chromium·mobile·tablet 샤드가 동시 실행되며 한 잡의 reset이 다른 잡의 멤버십을 cascade 정리·시드된 멤버십이 J-520의 '미가입' 전제를 깨는 경합으로 4건 실패 → 계정 격리로 해결 ②J-521/522는 멤버십이 전제라 facility+멤버 2행을 REST 시드하고 UI는 도메인 동작만 검증 ③다중 사용자는 `browser.newContext(contextOptions)`로 세션 분리(test.use의 serviceWorkers:'block'가 contextOptions에 포함되므로 SW precache 우회도 상속). 스펙 작성 중 **실제 제품 결함 3건 적발**: ①`getAuthSession()`이 session 객체를 반환하는데 facility 3곳(facility.js `_session`·facility-admin·facility-join render)이 `{session}`으로 재분해해 항상 undefined — 로그인해도 "로그인 필요"로 기관 워크스페이스 전체 불능이었음 ②`create_facility` RPC가 `set search_path=''` 하에서 `gen_random_bytes(4)`를 미한정 호출 — pgcrypto는 `extensions` 스키마에 있어 42883 오류 ③shift_handovers·family_visits·incident_reports의 `author_id`, handover_acks의 `user_id`가 NOT NULL·무기본값인데 클라이언트 insert가 id 생략 → 23502 위반(스키마에 `default auth.uid()` 추가 — facility_records의 기존 선례와 동일 계약). DOM 테스트의 `getAuthSession` mock도 잘못된 `{session:null}` 형태라 `null`로 함께 교정.
>
> **J-530~531 구현 메모** (2026-11-12): cosmetic Formula OS 실무모드 — 단일 `#formula` 뷰 안 허브+서브패널(`is-hidden` 토글) 구조라 carework와 달리 해시가 아닌 **패널 전환**을 추적한다. 확인된 함정: ①같은 `data-click`이 허브 카드·툴바·빈상태 버튼·서브내비 칩에 중복 배치돼 strict-mode 위반 다수 — 허브 카드는 `#formula-menu-panel` 스코프, 툴바/상세 버튼은 `.first()`로 해결 ②**처방↔고객 연동은 계산기의 고객 접힘(`#formula-cust-ref` select)에서만 성립** — 조제 기록의 고객 선택은 배치에만 붙고 처방의 customerId는 안 바뀐다. 배치→고객·처방→고객은 별개 경로라 체인 테스트는 두 연동을 모두 밟아야 '연결된 처방'이 차오른다 ③`.formula-chip`(고객 고민·배치 위생 체크)도 obs-chip과 동일한 시각 숨김 input 패턴 — 라벨 클릭. 성분 검증 배지는 실데이터 기준: 글리세린=정상·레티놀(한도 1%)=초과·미등록명=확인+'사전 등록' 버튼.

## 5. 선택자 규약 — data-testid 점진 도입

- 명명: `{view}-{element}[-{index}]` — 예: `cbt-submit`, `quiz-choice-3`, `manual-print-btn`
- 도입 순서: ① journeys/ 신규 스펙은 무조건 data-testid ② 기존 스펙의 불안정 선택자(텍스트 의존)를 건드릴 때 함께 전환
- `support/selectors.js`에 ID 목록을 상수로 등록 — 스펙은 `S.cbt.submit` 형태로 참조해 오타 방지
- 앱 코드 수정은 data-testid 추가만 허용 (기능 변경 없음 — 가이드 원칙 계승)

## 6. 실패 증거·보고서

- Playwright `trace: retain-on-failure`가 스크린샷·DOM·네트워크를 이미 수집 — 추가로 `support/evidence.js`에서 `page.on('pageerror')`(미처리 JS 예외)·`page.on('console')`(로그)·`requestfailed`(4xx/5xx) 리스너로 수집해 테스트 메타데이터로 첨부. 재실행 통과(flaky)는 `PW_QUARANTINE` 격리 기작과 연계해 통과로 치지 않음
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
  - run: node tools/supabase/seed_test_accounts.js   # 시드 초기화 (Supabase 설정 시만)
  - run: npm run test:e2e                            # 기존 전체 스펙 + journeys/
  - uses: actions/upload-artifact@v4                 # trace·보고서 (기존 패턴)
```

- Preview 배포 트리거(`deployment_status`)는 가이드대로 별도 워크플로 — 로컬 serve.js 대상이 우선, Preview 대상은 후속 Phase
- P1 journeys만 별도 태그(`@p1`)로 분리해 `test:e2e --grep @p1`을 PR 게이트로 지정 가능

## 8. Phase별 구축 로드맵

| Phase | 범위 | 완료 기준 |
|-------|------|-----------|
| 0 — 갭 분석 | 기존 스펙 ↔ 카탈로그 매핑 완료, 미커버 영역 확정, data-testid 우선 목록 | 매핑 표 승인 + 선택자 우선순위 목록 |
| 1 — 기반 | `support/`·`db/` 골격, **Supabase 오버라이드 기작(§3-1-1)**, 테스트 프로젝트 스키마 프로비저닝, 계정 시드 스크립트, storageState | J-101 비로그인 + 오버라이드 검증(테스트 URL로 요청됨 확인) 3회 연속 성공 |
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

- **운영 Supabase 오염 (최상위)**: `supabase-config.js`는 운영 상수 하드코딩 — 오버라이드 기작(§3-1-1) 없이 인증·동기화 스펙을 돌리면 운영 DB에 계정·데이터가 생긴다. Phase 1 선행 필수이며, 오버라이드 미적용 스펙에서 인증 UI 호출을 차단하는 가드(`page.route` 실패 시 test.skip)도 둔다
- **테스트 프로젝트 스키마 drift**: 운영 스키마 변경이 테스트 프로젝트에 미반영되면 J-102가 거짓 통과 — 스키마 정본(`tools/supabase/schema.sql`+`exams/<id>/`)을 `SUPABASE_URL=<test>` 지정 `apply_schema.js`로 재적용하는 절차를 둔다 (check_supabase_schema.js가 TEST_* env로 테스트 프로젝트 프로브 가능)
- **기존 스펙 text 선택자 회귀**: data-testid 전환 중 기존 스펙이 깨질 수 있음 — 전환은 스펙을 건드릴 때만, 대량 일괄 변경 금지
- **Supabase 선택적 구조**: 테스트 프로젝트 미설정 시 J-102·J-203이 자동 스킵되어야 함 — 스킵 조건을 `isSupabaseConfigured()` 기반으로 명시해 CI에서 "설정 없음 = 스킵"과 "설정 있음 = 실행"을 분리
- **localStorage 시드**: Playwright의 `addInitScript`로 진도·설정을 사전 주입 — 시드 스키마가 `storage-keys.js`와 drift하지 않도록 키는 모듈에서 import
- **시드 계정 영속성**: 테스트 Supabase도 수동 리셋이 필요할 수 있음 — 시드 스크립트는 upsert idempotent 설계
