# ADR-0019: 텔레메트리는 opt-out 동의 + 퍼스트파티 익명 수집

> **문서 ID**: DOC-ADR-19
> **범위**: platform · 판본: none
> **관련 SPEC ID**: UX-MET-05, UX-MET-06, UX-MET-07, UX-MET-08
> **상태**: accepted (2026-10-22)

## 상황 (Context)

사업 검증 계획(DOC-DSN-34)의 KPI — 활성 사용자·유지율·무료→유료 전환율 — 를
측정하려면 "고유 사용자 단위"의 이벤트 수집이 필요하다. 그러나 프로젝트
원칙은 Local-First(학습 데이터는 기기에만) + 런타임 의존성 0 + 익명
insert 텔레메트리(`usage_events`)만 허용이다. 기존 `usage-telemetry.js`는
페이지 로드당 `session_id`(랜덤 UUID)만 전송해 고유 사용자 추정이 불가하고,
동의(opt-out) 장치도 없어 "최초 실행 시 고지·거부 가능" 요구를 충족하지
못한다.

## 결정 (Decision)

1. **opt-out 동의 모델** — 텔레메트리는 기본 활성, 설정 메뉴에서 언제든
   끌 수 있다 (`telemetry_opt_out` GLOBAL 키). opt-out은 Local-First와
   충돌하지 않는다 — 수집 자체가 익명·집계용이며 거부 시 기능 제한이 없다.
   최초 실행 시 1회 고지 토스트로 수집 사실을 알린다.
2. **익명 설치 ID = 기존 `device_id` 재사용** — `usage-stats.js`의 익명
   기기 식별자(`DEVICE_ID` GLOBAL 키)를 `meta.install_id`로 전송한다.
   별도 설치 ID를 새로 만들지 않는다 — 스키마 컬럼 추가 없이 `meta` jsonb에
   싣고, "고유 사용자"는 `install_id` 단위로 추정한다 (기기 단위 한계는
   알려진 제약 — 브라우저 삭제 시 신규 ID로 카운트).
3. **이벤트 화이트리스트** — `usage-telemetry.js`에 정의된 이벤트만 전송
   허용. 화이트리스트 외 이벤트는 'skipped'. 퍼널 측정용 신규 이벤트는
   `session_start`(방문 분모)·`core_learning_action`(핵심 학습 행동)을 추가.
4. **오프라인 큐** — 전송 실패·오프라인 시 로컬 큐(localStorage, 상한 200)에
   보관하고 `online` 이벤트·다음 전송 시 재시도한다.
5. **서드파티 분석 SDK 금지** — Google Analytics 등 외부 SDK는 도입하지
   않는다. 런타임 의존성 0 원칙 유지, 전송 경로는 기존 Supabase
   `usage_events` 익명 insert 하나로 통일한다.

## 대안 (Alternatives considered)

- **opt-in 동의**: 기각 — UX-MET-05 스냅샷·오류 텔레메트리가 이미 익명
  기본 활성으로 동작 중. 수집 내용이 집계용 수치뿐이어서 opt-in은 표본을
  과도하게 줄인다 (판정 표본 ≥3기기 확보가 목적).
- **신규 설치 ID 모듈**: 기각 — `DEVICE_ID`가 이미 동일 역할(익명 기기
  식별, GLOBAL 키)을 수행. 중복 식별자는 혼란만 키운다.
- **스키마 `install_id` 컬럼 추가**: 기각 — 마이그레이션 없이 `meta`
  jsonb로 충분. 컬럼 필요 시 후속 마이그레이션으로 승격 가능.
- **Supabase Edge Function 경유**: 기각(보류) — 정식 결제 도입 시 서버측
  집계가 필요해지면 재검토. 실험 단계에서는 익명 insert로 충분하다.

## 결과 (Consequences)

- **정**: KPI 고유 사용자 측정 가능 · 동의 장치로 수집 정당성 확보 ·
  스키마·의존성 변경 없이 기존 인프라 재사용
- **부**: opt-out이 기본 ON이라 "명시 동의" 해석에는 민감 — 수집 내용이
  익명 집계용임을 고지 문구로 상쇄. `device_id`는 기기 단위라 브라우저
  데이터 삭제 시 사용자가 신규로 카운트됨 (알려진 오차)
- **제약**: 학습 내용·메모·개인 텍스트는 어떤 경로로도 전송 금지 —
  화이트리스트에 이벤트명만 등록되고 `meta`는 집계 수치만 허용한다.
