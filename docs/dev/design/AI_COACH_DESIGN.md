# AI 코치 설계 — 서버측 Gemini 런타임 학습 기능

> 상위 문서: `ARCHITECTURE.md` (전체 구조) · `LEARNING_ALGORITHM_DESIGN.md` (DOC-DSN-32, FSRS) · `AI_AUTHORING_DESIGN.md` (오프라인 제작 파이프라인)
> **문서 ID**: DOC-DSN-40
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `AI-25~30`(신규 제안 — 본 문서 §2) · `PAY-03~07`(Pro 게이트) · `AU-08`(로그인 세션) · `UX-MET-05~08`(계측)
> **상태**: 📋 설계 확정 대기 — §5 단계 1만 초기 구현 범위

## 1. 배경·결정 요약

학습 기능에 Google Gemini를 적용한다. 접근 방식은 **서버측 키**(운영자 보유)로 확정 — BYOK(`written-grading.js`의 기존 방식)는 키를 직접 등록한 소수 사용자에게만 도달하는 한계가 있다. 서버 경유로 바꾸면 도달률이 전체 로그인 사용자로 확장되고, Pro 혜택으로도 연결할 수 있다.

**확정된 정책**:
- 접근 게이트 — **로그인 필수 + Free 일일 소량 쿼터, Pro 무제한**
- 첫 구현 — **설계 문서(본서) 먼저**, 구현은 §5 단계 1(오답 피드백)부터
- BYOK — 기존 서술형 채점(`written-grading.js`)의 BYOK 경로는 유지, 서버 프록시와 병존 (서버 미설정·미로그인 사용자의 폴백)

## 2. 신규 SPEC ID 제안

| ID | 내용 |
|---|---|
| AI-25 | `ai-proxy` Supabase Edge Function — 로그인 JWT 검증 + kind별 프롬프트 라우팅 + Gemini 호출 프록시 |
| AI-26 | `ai_usage` 일일 쿼터 — 로그인 사용자당 일일 호출 카운터 (Free 한도 / Pro 무제한), RLS 전면 차단·service-role 기록 |
| AI-27 | 오답 맞춤 피드백 — 퀴즈 오답 시 오판 진술·정답 근거를 바탕으로 1~2문장 해설 생성, 결과 화면 인라인 표시 + "AI 생성" 배지 |
| AI-28 | AI 기능 계측 — `ai_feature` 사용 이벤트(기능 종류·성공/실패·캐시 히트만, 내용 미수집) — BYOK/서버 도달률 실측 근거 |
| AI-29 | 서버 키 폴백 정책 — 프록시 실패·미로그인 시 BYOK(`written-grading.js` 패턴) 경로로 순차 폴백, 둘 다 불가 시 기능 무표시 |
| AI-30 | 프롬프트 고정 템플릿 — v1은 자유 입력 채널 없이 고정 템플릿+구조화 인자만 허용 (남용·인젝션 차단) |

## 3. 아키텍처

```
src/views/quiz 결과 화면
  └─ src/ai/ai-client.js (신규) — 세션 JWT + kind + 인자 전송
       └─ POST {SUPABASE_URL}/functions/v1/ai-proxy
            ├─ Authorization: <user JWT> 검증 (미로그인 401)
            ├─ ai_usage 쿼터 확인·증가 (service-role, Free N/일 · Pro 무제한)
            ├─ kind별 고정 템플릿으로 프롬프트 조립 (서버측 — 인자만 수신)
            └─ Gemini 호출 (GOOGLE_API_KEY = Edge Function 시크릿) → 결과 반환
```

### 3.1 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `ai-client.js` | `src/ai/` 신규 | 프록시 호출 래퍼 — 세션 토큰 첨부·타임아웃(10s)·콘텐츠 해시 캐시(localStorage)·폴백 분기 |
| `ai-proxy` Edge Function | `supabase/functions/ai-proxy/` | JWT 검증 → 쿼터 → kind 라우팅 → Gemini `generateContent` → JSON 응답. 자유 텍스트 인자는 길이 제한(문항 본문만 허용) |
| `ai_usage` 테이블 | `schema.sql` 추가 | `(user_id, day, kind, count)` — upsert 증가, SELECT/INSERT/UPDATE 모두 RLS 차단(service-role만), `day` 인덱스 |
| 피드백 표시부 | `src/views/quiz/quiz.js` 결과 패널 | 오답 항목에 "AI 해설 보기" 버튼 → 생성 결과 인라인 + `AI 생성` 배지 |

### 3.2 프롬프트 계약 (AI-30)

v1의 `kind`는 `wrong_feedback` 하나. 서버가 조립하는 입력:

```
문항 본문, 정답 진술, 사용자가 고른 오답 진술, statement-tracker의 오판 진술(있으면), 인용 근거(ref_md 라인)
→ 출력 계약: 1~2문장 해설 + 혼동 개념 1어절. JSON 스키마 강제(responseSchema)
```

자유 사용자 입력은 받지 않는다 — 인젝션·남용의 주 경로를 구조적으로 차단.

### 3.3 쿼터·남용 방어 (AI-26)

| 층 | 방어 |
|---|---|
| 인증 | 유효 Supabase JWT 필수 — 익명 호출 차단 (install_id 스푸핑 불가 계층) |
| 쿼터 | Free `AI_FREE_DAILY=10`회/일·Pro 무제한(`pro_codes` 자격 조회) — 429 + 남은 횟수 표시 |
| 계측 | `ai_usage`가 종류별 호출 수의 정본 — 비용 모니터링·이상 급증 감지 |
| 비용 상한 | Function 레벨 최대 토큰 출력 제한 + Gemini 프로젝트 자체 예산 알림 (운영 설정) |

## 4. 프라이버시·정합

- **방침 개정 필수** — `docs/user/PRIVACY_POLICY.md` §1.2 "서버 수집" 표에 AI 호출 행 추가(문항 식별자·오답 선택만, 학습 이력 원문 미포함), §5 Google 행에 "서버 경유" 명시. 서버는 프롬프트를 로그하지 않는다 (응답 본문 미기록, `ai_usage`는 카운터만)
- **텔레메트리 정합** — `ai_feature` 이벤트도 기존 usage_events 화이트리스트에 추가 후에만 전송 가능 (allowlist 확장 필요). 자동화 런타임 게이트(`isAutomatedRuntime`) 그대로 적용
- **보안** — 키는 Edge Function 시크릿 전용, 클라이언트·리포 커밋 금지. RLS 침투 프로브(`tools/check/rls_probe.js`)에 `ai_usage` 익명 접근 프로브 추가

## 5. 단계별 범위

| 단계 | 내용 | 선행 조건 |
|---|---|---|
| **1 (초기)** | ai-proxy `wrong_feedback` 단일 kind + ai_usage 쿼터 + 퀴즈 결과 AI 해설 버튼 + ai_feature 계측 + 방침 개정 | 본 문서 확정 |
| 2 | 4버튼 등급 UI (LEARNING_ALGORITHM §8) — FSRS 정확도, LLM 무관 | 독립 — 병행 가능 |
| 3 | 자연어 주간 진단(analysis-engine 수치 → 코칭 문장) | 단계 1 사용률 실측 |
| 4 | 콜드스타트 난이도 시딩·변형 문항 — 생성물 검증 게이트(인용 강제·dupcheck·AI 배지) 선행 | 단계 3 + 검증 체계 |
| 5 | 캐시→생성 확장: 취약 개념 미니퀴즈·진술 변형 | 단계 4 |

### 구현 체크리스트 (단계 1)

1. `schema.sql`: `ai_usage` 테이블 + RLS 정책 + `day` 인덱스 → 프로덕션 적용 후 `check:rls` 프로브 추가
2. `supabase/functions/ai-proxy/index.ts` — JWT 검증·쿼터·템플릿·Gemini 호출
3. `src/ai/ai-client.js` — 호출 래퍼 + 캐시 + `AI 생성` 배지 렌더
4. `src/views/quiz/quiz.js` — 오답 항목 "AI 해설 보기" 버튼 (로그인+기능 사용 가능 시에만 표시)
5. `usage-telemetry.js` — `ai_feature` 이벤트 allowlist 추가
6. `PRIVACY_POLICY.md` — §1.2·§5 개정 + 문서 번들 재생성
7. DOM 테스트 — 쿼터 초과·미로그인·성공 경로 3분기

## 6. 미결정·리스크

- **Pro 자격 조회 경로**: `pro_codes` 테이블 직접 조회 vs `hasProEntitlement` 동등 서버 로직 — Edge Function은 서비스 키로 `pro_codes` 조회가 정합
- **비용 누적 상한**: 일일 총 호출 상한(전 사용자 합) — 운영 측 예산 알림 외에 Function 내 글로벌 일일 상한을 둘지 (초기엔 모니터링만)
- **폴백 UX**: 미로그인 시 "로그인하면 AI 해설" 유도 버튼 vs 완전 은닉 — 초기는 은닉 (광고성 UI 지양)
- **모델 버전**: `gemini-flash` 계열 고정 — 모델명은 Function env로 관리해 앱 배포 없이 교체 가능하게
