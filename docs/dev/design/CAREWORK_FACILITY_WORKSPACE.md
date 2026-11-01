# 기관 워크스페이스 설계 — PassOK가 요양원 기록 서버가 되는 구독 확장

> **문서 ID**: DOC-DSN-43
> **범위**: platform · 판본: none
> **작성일**: 2026-11-01
> **전제**: DOC-DSN-42 실무도구 + Phase 5 인수인계(기록 우선 플로우) 반영 이후
> **관련 SPEC**: DA-13(도메인 격리) · ROAD-P5(Pro 게이팅) · SUBSCRIPTION_ROADMAP

## 1. 배경 — 왜 기관 서버가 필요한가

- 인수인계서·요양일지는 **기관의 기록 문서** — 평가방법 고시·청구기준의 보존 대상. 개인 폰의 카톡 공유는 기관 기록을 대체하지 못함
- 현재 구현(Phase 5)은 "공유 전 로컬 저장"까지 — 기기 보존은 준법적 근사치일 뿐 **기관 서버는 아님**
- 교대근무 구조상 인수인계는 같은 기관의 여러 요양보호사가 열람·서명해야 함 — 개인 계정 저장만으로는 조 단위 공유 불가

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
handover_records (facility_id, author_id, created_at, payload(text), log_refs)
handover_reads (handover_id, reader_id, read_at — 인수 확인)
carelog_records (facility_id, author_id, created_at, payload — 일지 기관 보존)
```

- `worker`: 기록 작성·열람·본인 기록 삭제 요청 / `manager`: 기관 전체 열람·기록 보존 관리·멤버 초대
- 인수인계 생성 → **기관 스코프 저장(필수)** → 같은 조 멤버 열람 → 인수자 `read` 마크 → 완료

## 4. 접근 제어 (RLS)

- `handover_records`·`carelog_records`: `facility_id`가 멤버십과 일치하는 멤버만 select/insert
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
| 6b | 인수인계 기관 저장 + 열람·읽음 확인 | handover_records + handover_reads + 인수 확인 UI |
| 6c | 요양일지 기관 보존 + manager 열람 | carelog_records + 기록 보존 뷰 (평가 대비) |
| 6d | 기관 플랜 결제·수출 어댑터 | 구독 과금 계층 + 기존 전자기록 연동 검토 |

## 7. 리스크·의존

- **법령 의무와의 정합**: "기관 서버"가 PassOK로 간주되려면 요양원이 이를 기록 시스템으로 채택해야 — 초기엔 기존 전자기록 병행+내보내기 서식(A+C)으로 기록 의무 우회
- 멤버십 미승인 상태의 데이터 소유권 명확화 — author 소유 vs facility 소유 정책을 스키마에 명시
- 오프라인 작성 후 온라인 동기화 충돌 — 인수인계는 단조 기록이라 충돌 여지 작음(append-only)
