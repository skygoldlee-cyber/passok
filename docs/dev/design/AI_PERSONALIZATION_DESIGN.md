# AI 개인화 학습 설계 — PassLoop 학습엔진: 숙련도 경로·학습자 메모리·다턴 교재 튜터

> 상위 문서: `AI_COACH_DESIGN.md` (DOC-DSN-40, 런타임 AI 계약) · `LEARNING_ALGORITHM_DESIGN.md` (DOC-DSN-32, FSRS) · `SEMANTIC_EMBEDDING_DESIGN.md` (SEM-01~08) · `LEARNING_MEDIA_LINK_DESIGN.md` (DOC-DSN-52, 개념 딥링크)
> **문서 ID**: DOC-DSN-56
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `AI-40~44`(신규 — 본 문서 §2) · `AI-25~30`(프록시·쿼터·템플릿 계약) · `AI-36`(교재 질의응답) · `SEM-02`(임베딩 검색) · `SEM-08`(임베딩 검색) · `DR-08`(개념 문항 딥링크) · `TR-30`(리더 메모)
> **상태**: 🟡 단계 6 구현 중 (2026-11-26) — AI-40 엔진·어댑터·분석 뷰 카드 + AI-41 프로필 + AI-43 퀵체크(`ai:quickcheck` 도구·오버레이·리더 이해도 점검) + AI-44 내 노트 카드(분석 뷰 최신순 목록·섹션 회귀) 구현. AI-42만 제안 유지 — DeepTutor(HKUDS) 벤치마크 이식 설계

## 1. 배경·결정 요약

DeepTutor(HKUDS/DeepTutor, Apache-2.0)는 "agent-native" 개인화 튜터 플랫폼이다 — 근거 기반 채팅, Mastery Path(지식포인트 숙련도 경로), L1~L3 학습자 메모리, 대화형 Reading+퀵체크, 노트북·캘린더를 하나의 런타임으로 묶는다. 플랫폼 **통째 통합은 기각**한다 — Python 백엔드 + 벡터 DB + 사용자별 LLM 키를 요구해 정적 Vercel 배포·localStorage-first PWA 구조와 정면 충돌한다.

대신 기능 개념의 이식을 검토한 결과, PassOK는 이미 "DeepTutor-lite"에 해당하는 런타임 AI를 보유한다 — ai-proxy 고정 템플릿(AI-30) 위의 `textbook_qa`·`weekly_diagnosis`·`quiz_gen`·`plan_adjust`(AI-33~38). DeepTutor 대비 실질 갭은 세 가지다:

1. **지식포인트 숙련도 모델 부재** — DeepTutor Mastery Path. PassOK는 진술 통계·FSRS·오답 이력이 있어도 §앵커(conceptId) 단위의 통합 숙련도 뷰가 없다.
2. **세션을 가로지르는 학습자 메모리 부재** — `wrong_feedback`의 `confused_concept`가 표시 후 소실, 다음 진단·퀴즈 생성 입력으로 재활용되지 않는다.
3. **QA의 단턴 한정** — `textbook_qa`(AI-36)는 질의 1회=응답 1회. 후속 질문이 이전 문답을 참조하지 못한다.

본 설계가 다루는 개인화 학습 계층을 **PassLoop**(패스루프)로 명명한다 — FSRS 복습 루프와 "오답→복습→재평가" 폐쇄 학습 사이클의 이름이며, PassOK·Passmula의 Pass- 계열 명명 규약을 따른다. PassLoop = 숙련도 모델(AI-40) + 학습자 메모리(AI-41) + 다턴 튜터(AI-42) + 저작 퀵체크(AI-43) + 노트(AI-44)의 통칭 — 기존 FSRS·statement_stats·SEM 검색·ai-proxy 계약 위의 루프 엔진.

**확정 방향**:
- **로컬 우선** — 숙련도·학습자 메모리는 순수 로컬 로직. LLM·네트워크 무관 → 오프라인 PWA·비로그인 사용자도 동작 (DeepTutor는 메모리조차 파일 기반이라 동일 철학)
- **런타임 AI는 기존 kind 확장만** — 다턴 이력도 구조화 인자로 전달. 신규 자유 채널 없음 (AI-30 유지)
- **저작 계열은 `ai:*` 파이프라인** — 런타임 생성 비용 없이 사람 리뷰를 거친 정적 콘텐츠로 편입 (AI-15/19/22 오버레이 정본 패턴 재사용)

## 2. 신규 SPEC ID 제안

| ID | 내용 |
|---|---|
| AI-40 | 개념 숙련도 맵 (Mastery Path) — §앵커 개념 단위 숙련도 점수·등급 산출 순수 로직 `src/passloop/core/mastery.js`(§3.7): statement_stats·FSRS 스케줄·퀴즈 오답 신호를 conceptId로 환산 집계, "다음 학습 추천"(최하 숙련 개념 → `#/trainer/concept/<cid>` 드릴 연결). LLM 무관·오프라인 동작 |
| AI-41 | 학습자 취약 개념 프로필 — `ai_learner_profile` 로컬 맵 {개념 라벨/§앵커 → {n, lastTs, src}}. `wrong_feedback`의 `confused_concept`·오판 진술 라벨을 누적하고, `weekly_diagnosis`·`plan_adjust`·`quiz_gen`의 구조화 인자(weakConcepts 라벨 배열 — AI-30 정합)로 주입 |
| AI-42 | 다턴 교재 튜터 — `textbook_qa` kind에 `history`(직전 문답 최대 4턴, q≤200자·a≤600자) 구조화 인자 추가. 매 턴 근거 재검색(SEM-08)·인용 강제 유지 — 자유 대화가 아닌 "이력 첨부 경계형 질의"로 AI-30 범위 내 |
| AI-43 | 챕터 퀵체크 사전 생성 — `ai:quickcheck` 스크립트(신설): 표준형 교재 섹션 → 이해 점검 2~3문(OX·단답형) 초안 → 사람 리뷰 → `content/exams/<id>/피드백/quickcheck.json` 정본 오버레이 → 리더 섹션 말미 "이해도 점검" 로컬 채점. 런타임 비용 0 |
| AI-44 | 통합 학습 노트 — READER_NOTES(TR-30) 섹션 메모의 교차 목록 뷰 + 노트→개념 드릴·교재 질의 진입 훅 (후순위 — §5 단계 6) |

## 3. 아키텍처

```
로컬 계층 (네트워크·LLM 무관)
  statement_stats(sid→{j,w}) ─┐
  FSRS 스케줄(카드 D·S·리뷰수) ─┼─→ src/passloop/core/mastery.js (AI-40)
  quiz 오답·weakCards        ─┘      │ §앵커별 {score, grade, coverage}
                                     ├→ 분석 뷰 "개념 숙련도" 카드
                                     └→ 추천 → #/trainer/concept/<cid> (DR-08)
  wrong_feedback.confused_concept ──→ src/ai/learner-profile.js (AI-41)
  오판 진술 라벨              ──╯        │ ai_learner_profile (상한 200, LRU)
                                        └→ ai-client 구조화 인자 주입

런타임 AI 계층 (기존 계약 확장 — 신규 kind·채널 없음)
  ai-client.js ─→ ai-proxy
    ├─ textbook_qa + history[]            (AI-42 — 템플릿 서버·BYOK 양쪽 미러)
    ├─ weekly_diagnosis·plan_adjust·quiz_gen + weakConcepts[]  (AI-41)
    └─ ai_usage 쿼터·ai_feature 계측 그대로

저작 계층 (오프라인, 사람 리뷰 경유)
  tools/ai/ai_quickcheck.js → tmp/ai_drafts/ → 리뷰 → content/exams/<id>/피드백/quickcheck.json
    → DataLoader 오버레이 병합 → 교재 리더 "이해도 점검" 로컬 채점 (AI-43)
```

### 3.1 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `mastery.js` | `src/passloop/core/` (신규) | §앵커별 숙련도 산출 순수 로직 — DOM·저장소 비의존, 입력은 주입받은 통계 맵 (§3.7) |
| `passloop-adapter.js` | `src/study/` (신규) | 런타임 어댑터 — 신호 수집(statement_stats·quiz_results·fc_review_log) + ContentIndex 구현(`subj:§N.M` 정규화·단원 해석·딥링크 메타) |
| `learner-profile.js` | `src/passloop/core/` | 취약 개념 프로필 순수부 — (라벨+§앵커, LRU) 맵 연산. 영속화 어댑터는 `src/study/learner-profile-store.js` (§3.7) |
| 숙련도 카드 | `src/views/analysis-view.js` | §앵커 목록 + 등급 배지 + 추천 버튼(개념 드릴·유사 진술·교재 이동) |
| QA 스레드 | `src/views/analysis-view.js` | `textbook_qa` 슬롯을 턴 목록형으로 — 후속 질문 시 history 조립 |
| `ai-proxy` | `tools/supabase/functions/ai-proxy/` | `textbook_qa` 입력 스키마 + 템플릿 확장 (history 섹션 재조립) |
| `ai_quickcheck.js` | `tools/ai/` (신규) | 섹션→이해점검 초안 생성. 근거=섹션 본문 한정, `ai:lint` 발문 검수 재사용 |
| `quickcheck.json` | `content/exams/<id>/피드백/` | 퀵체크 정본 오버레이 — `DataLoader.loadSubject`가 섹션 키 기준 병합 (AI-15/19 동형) |

### 3.2 숙련도 산출 (AI-40)

개념 키는 `subj:§N.M` 과목한정 앵커 — §앵커의 Chapter 번호는 과목별로 리셋(각 과목 Chapter 01부터)되어 과목 간 충돌하므로 과목 키를 포함한다. `normalizeCidAnchor`(analysis-engine.js, AN-10)가 문항 인용 `L####`·저장 cid를 과목 스코프로 환산하고, 단원 해석은 QUESTION_CHAPTERS(문항→단원명) + CHAPTER_RANGES(단원명→N.M) 경로를 따른다. 개념별 입력 신호:

| 신호 | 출처 | 개념 귀속 |
|---|---|---|
| 진술 정오답 j/w | `statement_stats` | 진술→문항→첫 인용 라인→§앵커 |
| 카드 리뷰 | `fc_review_log`·FSRS 스케줄 | 카드→출처 교재 라인→§앵커 |
| 퀴즈·모의고사 오답 | `weakCards`·`quiz_wrong_causes` | 문항 인용→§앵커 (weak-items.js 키 해석 재사용) |

산출식 (계수는 §6 오프라인 실측 후 확정):

```
시도수 n      = Σ(진술 j+w) + 카드 리뷰수
정답률 acc    = (정답 수 + prior) / (n + 2·prior)     — 베타 사전 prior=2, 소표본 안정화
최근성 r      = 0.5 ^ (마지막 시도 후 일수 / 14)       — 망각 반감 고정 상수
숙련도 score  = round(100 × acc × (0.5 + 0.5r))
커버리지 cov  = 시도된 개념 귀속 진술 수 / 개념 전체 진술 수 — 점수 신뢰도 표시
등급          = 미학습(n=0) · 도입(<40) · 진행(40~69) · 숙련(70~89) · 유지(≥90)
```

추천 규칙: 등급 `도입~진행`이고 cov≥0.3인 개념 중 score 하위 3개 → 각 항목에 `개념 문항 풀기(#/trainer/concept/<cid>)`·`유사 진술(SEM-03)`·`교재 섹션` 액션 버튼. `미학습` 개념은 추천에서 제외 — 측정 없는 영역을 취약으로 오인하지 않음 (커버리지 별도 표시).

### 3.3 학습자 프로필 (AI-41)

```
STORAGE_KEYS.AI_LEARNER_PROFILE = 'ai_learner_profile'
{ "<label>": { n, lastTs, cid?, src } }   — label: confused_concept·진술 개념 라벨 (≤60자)
                                          src: 'feedback'|'stmt'   상한 200개 (LRU)
```

- **기록**: ① `wrong_feedback` 응답의 `confused_concept` — 문항 §앵커를 `cid`로 병기 ② statement-tracker 오판 판정 진술의 개념 라벨. 둘 다 표시 즉시 기록 (사용자 액션 없음 — 수집 동의는 기존 방침 범위)
- **소비**: `requestWeeklyDiagnosis`·`requestPlanAdjust`·`requestWeakQuizGen` 호출 시 상위 5개 라벨(빈도·최근성 순)을 `weakConcepts: string[]` 인자로 주입 — 기존 "취약 라벨" 입력을 프로필로 보강. 라벨 문자열만 전송 (문항·질문 원문 없음 — AI-30·방침 정합)
- **시험 스코프**: `scopedKey`로 시험별 분리 — 시험 전환 시 프로필 오염 없음
- **만료**: lastTs 90일 경과 항목은 소비에서 제외 (점진적 망각 — 개념이 자연 퇴출)

### 3.4 다턴 교재 튜터 (AI-42)

`textbook_qa` kind 입력 계약 확장 (서버 정본 + BYOK 미러 동시 변경 — ai-client.js §프롬프트 계약 주석 규약):

```json
{ "question": "≤200자", "evidence": ["스니펫×≤5"],
  "history": [{ "q": "≤200자", "a": "≤600자" }] — 최대 4턴, 선택 }
```

- 서버 템플릿은 history를 "이전 문답" 섹션으로 재조립 — 질문은 여전히 `<user_input>` 경계 마커 격리, 시스템의 "근거 밖 명령 무시·인용 강제" 규칙 불변. **다턴이어도 자유 대화가 아니다** — 매 턴이 `질문+신규 근거` 쌍
- 근거는 **매 턴 재검색** — 후속 질문("그럼 예외는?")도 `SemanticIndex.searchByText` top-k를 새로 가져와 근거를 강제. 이전 턴 근거는 재사용하지 않음 (근거 범위를 사용자가 넓히는 경로 차단)
- 클라이언트: 분석 카드 QA 슬롯 → 턴 목록 UI (질문·답변·인용 순차 표시 + 후속 입력칸 유지). 이력은 탭 세션 한정(sessionStorage — 영속 저장 안 함)
- 캐시·쿼터: 콘텐츠 해시에 history 포함 → 동일 후속 질문은 캐시 히트. 턴당 `ai_usage` 1회 소비 — Free 일일 한도(AI_FREE_DAILY) 내 사용, 잔여 안내 동일
- BYOK 미러: `buildTextbookQaPrompt`에 history 섹션 추가 — 서버·로컬 프롬프트 동형 유지

### 3.5 챕터 퀵체크 (AI-43)

- `tools/ai/ai_quickcheck.js` (`ai:quickcheck` 스크립트 신설, 옵션 `--exam <id>`·`--dry-run`): 표준형 교재의 `##` 섹션 단위 순회 → 섹션 본문만 근거로 이해점검 2~3문 초안 — **OX·단답형 한정** (객관식 선지 생성은 오답 설계 품질 검증 비용이 커서 v1 제외)
- 자기검증: 초안 발문·정답이 섹션 본문에 없는 사실을 단정하면 `[폐기 후보]` 표시 (AI-24의 제N조 검증 패턴), `ai:lint` 발문 규칙 재사용
- 정본: `content/exams/<id>/피드백/quickcheck.json` — `{ "<sectionKey>": [{q, a, type}] }` (AI-15/19/22 동형 오버레이 — 사람 리뷰 후 `ai:apply` 편입, 정본 없으면 기능 무표시)
- 런타임: `DataLoader.loadSubject` 오버레이 병합 → 리더 섹션 말미 "이해도 점검" 토글 → OX 즉시 채점·단답형은 키워드 매칭 + 자가 채점("맞혔어요/몰랐어요") 폴백
- 딥링크 연계: 오답 시 해당 §앵커의 개념 드릴 버튼 (DR-08) — 퀵체크가 Mastery Path의 진입점 역할

### 3.6 통합 학습 노트 (AI-44 — 후순위)

- 현재 `READER_NOTES`(TR-30)는 섹션별 메모 맵이라 교차 열람 경로가 없다
- v1 범위: 분석 뷰 또는 리더에 "내 노트" 목록 카드 — 최신순 나열 + 섹션 링크 회귀. entity-store 패턴, 로컬 전용
- **채택 안 함**: 노트 자유 텍스트를 LLM 프롬프트에 넣는 기능(DeepTutor Dito식 "노트 설명")은 AI-30의 구조화 인자 원칙과 충돌 — v2 재검토

### 3.7 엔진 경계 — PassLoop 라이브러리 구성

PassLoop을 **인프로 독립 라이브러리 경계**로 구성한다 — `src/study/`의 기존 순수 모듈 관례(데이터 주입·DOM 비의존)를 물리적 경계로 격상한다. 외부 npm 패키지/별도 리포는 **기각** — 소비자가 PassOK 하나이고 입력 스키마(§앵커·sid·weak ID 문법·manifest)가 전부 PassOK 모양이라, 독립 배포의 실익 없이 버전 동기화 비용만 발생한다.

```
src/passloop/                    — 엔진 (외부 import 금지 — 어댑터→엔진 단방향)
  index.js          — 공개 API: computeMastery·nextActions·profileOps
  ports.js          — 입력 계약 JSDoc 타입: StatsSource·ScheduleSource·ContentIndex·KvStore·Clock
  core/
    mastery.js            ← AI-40 신규
    learner-profile.js    ← AI-41 순수부 (LRU 맵 연산)
    fsrs.js·knowledge-tracing.js·personalization.js·concept-drill.js  ← 기존 순수 자산 (이전 완료 2026-11-26)
```

| 구분 | 위치 | 해당 |
|---|---|---|
| 엔진 코어 (순수) | `src/passloop/core/` | AI-40·AI-41 순수부 + 기존 순수 자산(fsrs·BKT·personalization·concept-drill) — 물리 이전 완료. weak-items는 exam-context 결합으로 어댑터 잔류 |
| 어댑터 (플랫폼 결합) | `src/study/` 잔류 | 프로필 영속화(storage.js+scopedKey로 KvStore 구현)·statement-tracker·spaced-repetition·passloop-adapter |
| 엔진 외부 | `src/ai/`·`src/views/`·`tools/ai/` | AI-42(ai-client·세션·텔레메트리 밀착)·AI-43(저작 런타임)·AI-44(entity-store)·모든 UI |

- **의존 규칙** — `src/passloop/**`는 `src/passloop/` 밖을 import하지 않는다 (fsrs.js의 무import 선례). `check:imports`가 정적·동적 import·외부 패키지를 강제(게이트화 완료, 2026-11-26), `domain-map.json`에 `src/passloop/**` → `feature:passloop` layer 등록
- **단계적 적용** — 단계 1에서 신규 모듈(mastery·learner-profile)만 `src/passloop/core/`에 배치해 경계 확보 → 후속 정리로 기존 순수 모듈(fsrs·knowledge-tracing·personalization·concept-drill) 물리 이전 완료 (import 전수 갱신 + domainmap·복잡도 베이스라인 정합)
- **시험 중립** — 코어는 시험 무관 layer(`feature:passloop` 또는 platform) — 시험 특화 데이터는 전부 포트로 주입 (DA-13 정합)

## 4. 프라이버시·정합

- **신규 서버 수집 없음** — 숙련도·프로필은 로컬 전용. 프록시로 가는 것은 개념 "라벨"·질문·문답 이력뿐 (기존 `textbook_qa` 질문 수집과 동일 수준). `PRIVACY_POLICY.md` §1.2 개정 완료(2026-11-26) — 교재 질의 항목에 질문 문장·근거·"이전 문답 컨텍스트(최대 4턴)" 포함 (다턴 조항은 AI-42 착수 시 실효)
- **계측 정합** — 신규 호출도 `ai_feature` 이벤트 계약 유지 (기능·성공/실패·캐시 히트·경로만). 다턴은 feature=`textbook_qa` 공유, turn 수를 별도 필드로 집계 가능
- **프로필 동기** — `ai_learner_profile`은 학습 진행 데이터이므로 스코프 동기 대상에 포함 (syncKeys 등록 — 기기 간 개인화 일관). 단, 라벨만이므로 민감 정보 아님
- **오프라인 정합** — AI-40/41/44는 네트워크 불필요 (offline-gate 대상 아님), AI-42는 기존 네트워크 기능 게이트(UX-PWA-08) 적용
- **쿼터** — AI-42 턴당 1회 소비: Free는 대화 깊이 제한(4턴 이력 × 일일 10회), Pro 무제한과의 차별화 포인트 — 과도한 소비 방지로 오히려 바람직

## 5. 단계 배치

| 단계 | 내용 | 선행 조건 |
|---|---|---|
| 1 | AI-40 숙련도 모델 `mastery.js` 순수 로직 + 유닛 테스트 — UI 없이 백업 데이터 기반 분포 실측 (ai:seedcheck 선례: 계산 정합 먼저) | — |
| 2 | AI-40 UI — 분석 뷰 "개념 숙련도" 카드 + 추천 → 개념 드릴·유사 진술 연결 | 단계 1 |
| 3 | AI-41 프로필 — 수집 훅 + `weakConcepts` 인자 주입 (프록시·BYOK 템플릿 입력 확장) | 단계 1 (개념 키 공유) |
| 4 | AI-42 다턴 튜터 — kind 입력 확장 + 스레드 UI + 방침 개정 | AI-36 사용률 실측 (독립) |
| 5 | AI-43 `ai:quickcheck` 도구 + `quickcheck.json` 오버레이 + 리더 "이해도 점검" | 독립 — 저작 파이프라인 |
| 6 | AI-44 노트 목록 뷰 | — (후순위) |

신규 SPEC 후보 등록: AI-40~44 — 구현 착수 시 SPEC.md에 등록 (AI-31 변형 문항 슬롯은 기존 예약 유지, 본 대역과 무관).

## 6. 미결정·리스크

- **숙련도 점수의 수험 유효성** — 정답률×최근성 가중치·등급 임계는 가설값. 단계 1에서 백업 데이터로 분포 실측 후 임계 확정 (valid 판정 없이 UI 노출 금지 — AI-32 검증 선례와 동일 절차)
- **개념 키 이원화** — §앵커(정형)와 `confused_concept` 자유 라벨(비정형)의 정합 문제: 프로필은 `(label, cid?)` 쌍으로 수용하고 cid 해석 실패 시 라벨만으로 누적. 라벨 오염(모델이 제멋대로 라벨링)은 상한·만료로 완화
- **다턴 이력의 캐시 분기** — history 포함 해시라 이력이 다르면 캐시 미스 → 쿼터 소비 증가. 최대 4턴 상한 + 동일 질문 감지(직전 턴과 동일 질문이면 로컬 차단)로 완화
- **퀵체크 학습 효과 한계** — OX·단답형은 단순 확인이라 시험 대비 효과가 제한적일 수 있음 — 단답형 오채점(동의어)은 자가 채점 폴백으로 수용, 객관식 확장은 v2 판정
- **§앵커 커버리지 편차** — 인용 없는 문항·카드는 개념 귀속 불가 → 숙련도 맵이 인용 백필 완성도에 의존. 팩별 인용 커버리지가 낮으면 맵이 희소 — `check:content` 인용 지표와 연동해 표시 조건으로 활용 검토
