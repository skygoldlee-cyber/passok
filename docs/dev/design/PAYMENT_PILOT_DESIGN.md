# 💳 P2 유료 수요 검증 — 결제·라이선스 설계 (Payment Pilot Design)

> **문서 ID**: DOC-DSN-35
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `ROAD-P0~P6` (SPEC §3.23) · `ROAD-L5` · `UX-MET-02` · `UX-MET-05~08` (신규 요구사항 ID는 본 문서에서 만들지 않음 — 구현 시 SPEC.md에 발번)
> **상위 문서**: `BUSINESS_VALIDATION.md` (DOC-DSN-34 §5.2/§5.3 — 실험 정의·판정 기준) · `SUBSCRIPTION_ROADMAP.md` (DOC-DSN-07 — 정식 구독 인프라 로드맵) · `ADMIN_DESIGN.md` (DOC-DSN-30 — 운영 CLI)
> **독자**: 의사결정자(본인) — P2 선실험(2026-11-09~11-30)의 결제·라이선스 실행 설계
> **기준일**: 2026-10-22 · **정기 검토**: P2 선실험 개시 전(11/9) 확정 항목 재검

## 0. 목적·경계

**이 문서는 P2 선실험의 결제·라이선스 코드 경로를 설계한다.** 목적은 수요 검증("돈을 낼 사람이 있는가")이지 결제 인프라 구축이 아니다 — ROAD-P1~P4(서버 entitlement·PG 연동·콘텐츠 게이팅)는 본 설계의 **범위 밖**이며, SUBSCRIPTION_ROADMAP(DOC-DSN-07)의 "가치 검증 전 결제 인프라 구축 금지" 지연 원칙을 그대로 따른다.

| 범위 내 | 범위 밖 (후속 단계) |
|---------|-------------------|
| 수동 결제 안내(계좌이체/토스 송금 링크) + 코드 발급 | PG 결제링크·구독 자동 갱신·웹훅 (본실험 전, ROAD-P2) |
| 라이선스 코드 입력 UX → `redeem_code` RPC | 서버 entitlement 조회 API (ROAD-P1) |
| 채널별 전환 계측(코드 프리픽스·텔레메트리) | 콘텐츠 게이팅·CSP/SW 재작업 (ROAD-P3) |
| 환불 수동 처리(`grant-pro --revoke`) | 자동 환불·부분환불 정책 엔진 |

## 1. 현재 인벤토리 — 재사용 가능한 것

| 자산 | 위치 | 역할 |
|------|------|------|
| `pro_codes` 테이블 + `redeem_code()` RPC | `tools/supabase/schema.sql` §3 | 1회용 코드 → `profiles.plan='pro'` 갱신 (security definer — 클라이언트 직접 접근 차단, RPC만) |
| `admin:grant-pro` | `tools/check/grant_pro.js` | 수동 plan 부여·회수(`--revoke`) — 환불 처리 경로로 재사용 |
| `feature-plan.json` + `pro_entitled` | `src/pro-upgrade.js`·`feature-plan` 게이트 | Free/Pro 기능 경계 (UX 게이팅 — ROAD-P0) |
| `entry_source` | `src/feedback.js` | `?src=` 유입 채널 캡처 — 현재 feedback에만 첨부 |
| `pro_badge_click`·`plan_compare` | `src/usage-stats.js` 액션 키 | 플랜 비교 진입 계측 (UX-MET-02) |
| 설정 토글·고지 패턴 | UX-MET-06 구현물 | 동의 UX 설계 선례 — 코드 입력 UI 배치 기준 |

**갭**: ① 앱 내 코드 입력 UI 부재 (`redeem_code` RPC를 호출하는 경로가 없음) ② `pro_codes` 발급 도구 부재 ③ 결제 안내가 "준비 중" (`showUpgradeNotice`) ④ `entry_source`가 `usage_events`에 미탑재.

## 2. 결제 수단 결정

### 옵션 비교

| 옵션 | 수수료 | 준비 기간 | 특성 |
|------|--------|-----------|------|
| **A. 수동 결제 안내** (계좌이체/토스 송금 링크) | 0% | 즉시 | 마찰이 크지만 "결제 의지"의 가장 강한 시그널. 개인 송금의 세무·약관 리스크 — 실험 규모(판정 3건)에 한정, 매출 발생 시 사업자 전환 |
| **B. 토스페이먼츠 결제 링크** | ~3.5%+VAT | 사업자등록 + 심사(수일~수주) | 정식 경로 — 본실험(2027.3~5)까지 완비 필요 |
| C. 카카오페이 결제 | ~3% | 사업자 심사 | B와 동률 |

### 권고 (의사결정 대기)

**A로 선실험 개시 + B를 병렬 준비.** 근거: 선실험 목적은 결제 UX 검증이 아니라 수요 유무 판정 — 수동 결제가 개시일(11/9)을 지키고 시그널도 더 강하다. B는 본실험 전 완료하면 된다.

**리스크**: 개인 송금 상업 수취의 세무 문제 — 판정 건수(3건) 도달 즉시 사업자등록 진행 여부 판단. 고지 문구에 "정식 판매 채널 준비 중" 명시는 하지 않는다(신뢰 하락) — 대신 "유료 기능 검증 운영" 톤으로 일관.

## 3. 라이선스 코드 플로우

```
[운영자]  admin:issue-code --channel cafe --count 5   (P-OPS-1 — 신규 CLI, 구현 시 npm 스크립트 등록)
          → pro_codes에 CAFE-XXXX-XXXX 형식 코드 insert (신규 CLI)
[구매자]  결제 확인 → 코드 수신(오픈채팅/메일)
          → 앱 로그인(Pro=계정 동기화 정책 — 로그인 필수 고지)
          → 설정 → '라이선스 코드' 입력 → redeem_code() 호출
[서버]    RPC: 미사용 코드면 profiles.plan='pro' + redeemed_by 귀속 → true
[앱]      성공 시 pro_entitled 갱신 + Pro 해제 안내 + 동기화 제안
```

| 결정 | 내용 |
|------|------|
| 코드 형식 | `<채널>-<8자리 난수>` (예: `CAFE-3K9X-7Q2M`) — 프리픽스로 유입 채널 추적 (§5.3 #6 전환 계측 해결) |
| 1회 사용 | `redeemed_by` 귀속 후 재사용 불가 — 유출 시 유효 기간 없음 (코드 자체가 증빙) |
| 로그인 선행 | `redeem_code`는 `auth.uid()` 필수 → 결제 안내에서 "계정 로그인 후 코드 입력" 고지. 비로그인 구매자에게는 로그인 유도가 자연스러운 전환 단계 |
| 실패 UX | 무효/사용됨 코드 → "코드를 확인해주세요" (구분 노출 안 함 — 오라클 최소화) |

## 4. 앱 변경 설계 (구현 항목)

| # | 항목 | 설계 | 영향 파일 |
|---|------|------|-----------|
| P-UI-1 | **라이선스 코드 입력** | 설정 메뉴 또는 계정 화면에 '라이선스 코드 입력' 항목 → 입력 다이얼로그 → `redeem_code()` RPC → 성공 시 `profiles.plan` 재조회 → `pro_entitled` 갱신 + 확인 토스트 · 비로그인 시 로그인 유도 | 신규 `src/pro-redeem.js` + `index.template.html` + `app.js` 핸들러 |
| P-UI-2 | **결제 안내 모달** | `showUpgradeNotice`의 "Pro 플랜(준비 중)" → 실제 결제 안내로 교체: 결제 방법(계좌이체/토스 송금)·가격·환불 고지·문의 채널 링크. 게이트는 `feature-plan.json`의 결제 활성 플래그로 제어 — 실험 전까지 표시 비활성 가능 | `src/pro-upgrade.js` + `feature-plan.json` |
| P-OPS-1 | **`admin:issue-code`** | 코드 생성 CLI — `--channel <name> --count N` → `pro_codes` insert (service role) + 생성 목록 출력(발급 대장 = 콘솔 캡처) | `tools/check/issue_pro_code.js` |
| P-TEL-1 | **전환 텔레메트리** | 화이트리스트에 `plan_compare_view`·`payment_notice_view`·`payment_link_click`·`code_redeem_attempt`·`code_redeem_success` 추가 + `session_start.meta.entry_src` 탑재(`entry_source` 재사용) | `src/usage-telemetry.js`·`usage-stats.js`·`storage-keys.js` |
| P-SYNC-1 | **plan 동기화 확인** | 로그인/동기화 시 `profiles.plan` → `pro_entitled` 반영 경로 검증 — 현행은 로컬 플래그만 참조 (redeem 후 타 기기 반영 포함) | `src/auth-sync/sync.js` 검토 |

### 데이터 흐름 (entitlement)

```
redeem_code 성공 → profiles.plan='pro' (서버 정본)
     ↓ 로그인/동기화 시
app이 profiles.plan 조회 → pro_entitled(localStorage, UX 게이팅용) 갱신
     ↓
feature-plan.json pro 키 해제 + PRO 배지 숨김 + 동기화 가능
```

`pro_entitled`는 표시용 참고(실제 권한은 서버) — DOC-DSN-34 §5.2 "로컬 값은 표시용" 원칙 유지.

## 5. 가격·가치 제안

### 가격안

| 안 | 구조 | 판단 |
|----|------|------|
| **권장: 시험 기간권 단일가** | 9,900원 / 90일 (가칭 — 확정 필요) | 표본 50명에 가격 A/B 무의미 — 수요 유무만 판정. 시험 준비 주기와 정합 |
| 대안 | 월 4,900원 구독 | 본실험의 2안으로 보류 — 반복 매출 구조 vs 해지 관리 부담 |

### 가치 제안 문구 (커뮤니티 게시용 — 확정 필요)

Pro의 차별점을 "동기화 + 무제한"으로 정리 (feature-plan의 pro 키 기준): 클라우드 동기화(기기 변경 무손실)·학습 진단 리포트·이야기형 교재·오디오북·저장 한도 무제한. **가치 제안은 기능 나열이 아니라 결과** — "기기 바뀌어도 학습 기록 그대로" 등 사용자 언어로.

## 6. 환불·청약철회

| 정책 옵션 | 내용 | 판단 |
|-----------|------|------|
| **권장: 7일 미사용 전액 환불** | 코드 미사용 시 청약철회 7일 — 사용(코드 등록) 시 전자상거래법상 철회 제한 고지 | 단순·명확 — 기간권이라 비율공제 계산 불필요 |
| 대안: 비율 공제 | 사용 후에도 잔여 기간 비율 환불 | 관리 복잡 — 9,900원 규모에 과함 |

고지 위치: ① 결제 안내 모달(P-UI-2) ② 코드 발급 메시지(오픈채팅 답변 템플릿) ③ 사용자 매뉴얼 §11.6 부근. 환불 처리는 `admin:grant-pro --revoke` + 수동 송금, 응답 SLA 48시간 고지.

## 7. 구현 시퀀스

```
1. P-OPS-1 admin:issue-code           (코드 발급 도구 — 무관 독립)
2. P-TEL-1 텔레메트리 이벤트 추가      (plan_compare→redeem 퍼널 계측 선행)
3. P-UI-1  라이선스 코드 입력 UI       (redeem_code RPC 연결 — 핵심)
4. P-SYNC-1 plan→entitled 동기화 검증 (코드 활성화의 실효 확인)
5. P-UI-2  결제 안내 모달 교체         (실험 개시 직전에 활성화 플래그)
6. 문서    사용자 매뉴얼 코드 입력·환불 절 + SPEC 신규 ID + @spec 태그
```

검증: redeem 실패·로그인 유도·중복 사용·환불 회수 경로 단위 테스트 + e2e 코드 활성화 시나리오. 결제는 수동이라 e2e 불가 — 운영 리허설 1건(자가 구매)으로 종단 검증.

## 8. 미결정 항목 (사용자 결정 필요)

| # | 항목 | 옵션 | 권고 |
|---|------|------|------|
| D-1 | 결제 수단 | A 수동 송금 / B PG 링크 | **A + B 병렬 준비** |
| D-2 | 가격 | 9,900원/90일 기간권 (가칭) | 단일가 권장 — 금액 확정 필요 |
| D-3 | 청약철회 | 미사용 7일 전액 / 비율 공제 | 미사용 전액 권장 |
| D-4 | 결제 활성 시점 | 선실험 개시일(11/9)부터 / 모집 확인 후 | 개시일부터 — 지연하면 표본 손실 |
| D-5 | 코드 문의 채널 | 오픈채팅 / 이메일 | 수집 채널과 동일(오픈채팅) 권장 |
