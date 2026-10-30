# AI 코치 설계 — 서버측 Gemini 런타임 학습 기능

> 상위 문서: `ARCHITECTURE.md` (전체 구조) · `LEARNING_ALGORITHM_DESIGN.md` (DOC-DSN-32, FSRS) · `AI_AUTHORING_DESIGN.md` (오프라인 제작 파이프라인)
> **문서 ID**: DOC-DSN-40
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `AI-25~30`(신규 제안 — 본 문서 §2) · `PAY-03~07`(Pro 게이트) · `AU-08`(로그인 세션) · `UX-MET-05~08`(계측)
> **상태**: ✅ 단계 1 구현 완료 (2026-10-30) — ai-proxy 배포·ai_usage 프로덕션 적용·클라이언트/계측/방침 반영. 단계 2부터는 §5 배치 참조

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
  └─ src/ai/ai-client.js — 세션 JWT + kind + 인자 전송
       └─ POST {SUPABASE_URL}/functions/v1/ai-proxy
            ├─ Authorization: <user JWT> 검증 (미로그인 401)
            ├─ ai_usage 쿼터 확인·증가 (service-role, Free N/일 · Pro 무제한)
            ├─ kind별 고정 템플릿으로 프롬프트 조립 (서버측 — 인자만 수신)
            └─ Gemini 호출 (GOOGLE_API_KEY = Edge Function 시크릿) → 결과 반환
```

### 3.1 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `ai-client.js` | `src/ai/` | 프록시 호출 래퍼 — 세션 토큰 첨부·타임아웃(10s)·콘텐츠 해시 캐시(localStorage)·폴백 분기 |
| `ai-proxy` Edge Function | `tools/supabase/functions/ai-proxy/` | JWT 검증 → 쿼터 → kind 라우팅 → Gemini `generateContent` → JSON 응답. 자유 텍스트 인자는 길이 제한(문항 본문만 허용) |
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

## 5. 항목별 실현 판정·단계 배치

### 5.1 실현 판정 (2026-10-30 평가 — 전 항목 기술적 가능, 선행조건 상이)

| 항목 | 판정 | 전제·제약 |
|---|---|---|
| 오답 맞춤 피드백 | ✅ 즉시 | 오판 진술은 **복수정답형(combo)만 구조화** — 단순 객관식은 "선택 오답 선지+정답+인용"으로 입력 구성 |
| 4버튼 등급 UI | ✅ 즉시 | `Rating.HARD/EASY`가 fsrs.js에 이미 정의 — 순수 프론트. LLM 보조 채점은 서술형(manifest.written 선언 시험) 범위 한정 |
| 자연어 학습 진단 | ✅ 즉시 | 입력이 집계 수치(주간 리포트·합격 갭)라 해석 작업 — 생성 리스크 없음 |
| FSRS 큐 동적 변형 | ⚠️ 생성 게이트 선행 | 문항 **생성**이므로 인용 강제·dupcheck·AI 배지 검증 체계가 전제. 설계 결정: 변형 채점 결과는 원본 카드와 **같은 conceptId 스케줄 공유**로 정합 (변형≠신규 문항) |
| 콜드스타트 난이도 시딩 | ⚠️ 오프라인 유효성 선행 | LLM 난이도 추정은 노이즈 큼 — `tools/ai`로 기존 은행의 "예측 D vs 실제 첫 리뷰 결과" 측정 후 런타임 투입 여부 판정 |
| 플랜 대화 조정 | ⚠️ 입력 구조화 필요 | 자유 텍스트 입력은 AI-30과 충돌 — "이번 주 가능 일수" 등 **선택형 입력+템플릿**이면 정합, 자유 채팅은 정책 개정 선행 |
| 약점 맞춤 미니퀴즈 | ⚠️ 선정형부터 | 생성형은 검증 비용 최대 — 실용 대안: 취약 conceptId 기반 기존 문항 **선정**(exam-sim-weak 경로 확장)을 먼저, 생성은 그 다음 |
| 교재 질의응답 | ⚠️ 최대 공사 | 자유 입력 = AI-30 정책 개정 동반 조건. 자산은 양호: `build:embeddings` 사전 계산 임베딩(SEM-05)으로 검색은 정적 해결, 서버는 청크+인용 강제 출력만 담당 |

### 5.2 단계 배치 — 해석 계열 → 검증 게이트 → 생성 계열

| 단계 | 내용 | 선행 조건 |
|---|---|---|
| **1 (초기)** | ai-proxy `wrong_feedback` 단일 kind + ai_usage 쿼터 + 퀴즈 결과 AI 해설 버튼 + ai_feature 계측 + 방침 개정 | 본 문서 확정 |
| 2 | ✅ 4버튼 등급 UI (LEARNING_ALGORITHM §8) — FSRS 정확도, LLM 무관 (2026-10-30, ROAD-L7) | 독립 — 병행 가능 |
| 3 | ✅ 자연어 주간 진단 — weekly_diagnosis kind + 학습 리듬 카드 AI 코칭 (2026-10-30, AI-33) | 단계 1 사용률 실측 |
| 4 | ✅ 선정형 미니퀴즈 (2026-10-30, AI-34) — 취약 conceptId 기반 기존 문항 선정 · ✅ 생성물 검증 게이트(인용 강제·dupcheck·AI 배지 규약 — 2026-10-30, AI-37) | 단계 3 |
| 5 | 🟡 콜드스타트 난이도 시딩 오프라인 검증 — ✅ 검증 하네스 구현(2026-10-30, AI-32: `ai:seedcheck` 예측 D vs 실측 오답률 단조성 판정) · 런타임 시딩·FSRS 큐 동적 변형은 valid 판정 후 | 단계 4 + 검증 통과 |
| 6 | ✅ 자유 입력 계열 — 플랜 조정(AI-35) + 교재 질의응답(AI-36: 임베딩 근거 스니펫 + 인용 강제 + 경계형 자유 입력으로 AI-30 개정) — 2026-10-30 | 단계 5 + 정책 개정 |

신규 SPEC 후보 (구현 착수 시 등록): AI-31 변형 문항 · AI-36 교재 질의응답 — ~~AI-32 난이도 시딩 · AI-33 자연어 진단 · AI-34 약점 미니퀴즈 · AI-35 플랜 조정~~ 등록됨 · AI-37 생성물 검증 게이트 · AI-38 약점 생성형 미니퀴즈(2026-10-30 등록·구현)

### 구현 체크리스트 (단계 1 — 2026-10-30 완료)

1. ✅ `schema.sql`: `ai_usage` 테이블 + RLS 정책 + `day` 인덱스 + `ai_usage_consume` RPC → 프로덕션 적용·`check:rls` 프로브 추가 완료
2. ✅ `tools/supabase/functions/ai-proxy/index.ts` — JWT 검증·쿼터·템플릿·Gemini 호출
3. ✅ `src/ai/ai-client.js` — 호출 래퍼 + 캐시 + 서버→BYOK 폴백 분기
4. ✅ `src/views/quiz/quiz.js` — 오답 항목 "AI 해설" 버튼 + 결과 인라인 표시·`AI 생성` 배지 (로그인+기능 사용 가능 시에만 표시)
5. ✅ `usage-telemetry.js` — `ai_feature` 이벤트 allowlist 추가
6. ✅ `PRIVACY_POLICY.md` — §1.2·§5 개정 + 문서 번들 재생성
7. ✅ 테스트 — `tests/dom/study/ai-feedback.dom.test.js` (쿼터 초과·미로그인·성공 경로) + `tests/unit/engine/ai-client.test.js`

## 6. 미결정·리스크

- ~~**Pro 자격 조회 경로**~~ → 확정: `profiles.plan`+`pro_expires_at`을 service-role로 조회 (redeem_code RPC가 갱신하는 정본 — SPEC AI-26)
- **비용 누적 상한**: 일일 총 호출 상한(전 사용자 합) — 운영 측 예산 알림 외에 Function 내 글로벌 일일 상한을 둘지 (초기엔 모니터링만 — 출력 토큰 상한 MAX_OUTPUT_TOKENS=400과 사용자별 쿼터만 적용됨)
- ~~**폴백 UX**~~ → 확정: 은닉 — 버튼은 로그인 세션 또는 BYOK 키가 있을 때만 노출(`aiFeedbackAvailable`), 로그인 유도 UI 없음
- ~~**모델 버전**~~ → 확정: `GEMINI_MODEL` Function env로 관리 (기본 `gemini-3.8-flash`) — 앱 재배포 없이 시크릿 교체로 모델 변경
