# AI 학습 엔진 설계 — DeepTutor 하이브리드 개인화 학습 계층 (v1.1)

> 상위 문서: `AI_PERSONALIZATION_DESIGN.md` (DOC-DSN-56, PassLoop 런타임 계열) · `AI_COACH_DESIGN.md` (DOC-DSN-40, 런타임 AI 계약) · `AI_AUTHORING_DESIGN.md` (DOC-DSN-33, author-time 검증망) · `../SPEC.md` (요구사양 §3.32)
> **문서 ID**: DOC-DSN-58
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `AL-01~20` (신규 — §3.32) · `AI-25~30` (ai-proxy·쿼터·템플릿 계약) · `AI-36`·`AI-42` (교재 질의응답·다턴) · `AI-40~44` (PassLoop 숙련도·프로필·퀵체크 계열) · `SEM-02`·`SEM-05` (임베딩 검색·이웃 인덱스) · `CQ-07`·`CQ-08`·`AI-45`·`AI-46` (콘텐츠 신뢰성 장치 — 설계: CONTENT_SAFETY_DESIGN)
> **상태**: **보류** (2026-11-27 결정 — 기존 PassLoop·ai-proxy·textbook_qa 계열 유지. 향후 기능 심화 확장 필요 시 재검토. 재검토 전제: §15 미결 사항의 기존 인프라 흡수/병행 확정 + G1~G3 관문 기준 확보 + §10 RAG 소스를 기존 교재 md·ref_md 재사용으로 전제)
> **원본**: `PassOK DeepTutor Hybrid AI Learning 설계서 v1.1.md` (2026-11-27, @coteleaf) — 파일명·헤더·SPEC 연동만 규약에 맞춰 정리, 본문은 원본 그대로

Nov 27, 2026 · @coteleaf

파일럿 시험팩: Cosmetic Pass Master (맞춤형화장품 조제관리사) · 개발 에이전트: Devin

## v1.0 대비 변경 요약

v1.1의 핵심 변경은 세 가지다. 문항-개념 매핑을 1급 데이터로 추가하고, AI 문제는 사전 생성 풀에서만 출제하며, DeepTutor는 상태 없는 HTTP 서비스로만 사용한다.

| 영역 | v1.0 | v1.1 | 이유 |
| --- | --- | --- | --- |
| 전제 | Next.js + Supabase가 학습 데이터 원본 | 대상 앱 확정 + 로컬 기록 서버 이관 단계 추가, AI 기능은 로그인 필수 | Cosmetic Pass Master는 로컬 우선 SPA라 서버에 기존 성적이 없을 수 있음 |
| 문항-개념 연결 | STEP 1 질문으로만 존재 | `ai_question_unit_map` 테이블 + 태깅 작업(AI 초안 → 사람 검수) | 숙달도·진단·기존 성적 반영 모두 이 매핑에 의존 |
| 문제 생성 | 요청 시 실시간 생성 | 오프라인 생성 → 검증 → 승인된 풀에서 적응형 선택. 실시간 생성은 연습 모드(기록 미반영) | 검증 원칙과 충돌, 지연·비용 |
| DeepTutor 연동 | SDK / CLI / Mock 어댑터 | HTTP(REST/SSE) 어댑터 + Mock. CLI 제외, 버전 고정 | 실제 노출 인터페이스는 `/api/*`, `/ws/*`. CLI는 다중 사용자 서비스에 부적합 |
| DeepTutor 메모리 | 대화 맥락에 활용, 격리 방법 미정 | 파일럿은 비활성화. 학습자 맥락은 매 요청 PassOK가 주입 | 서비스 계정 공유 시 사용자 간 메모리 혼입 위험 |
| DeepTutor 도입 | 전제 | Phase 0 Go/No-Go: pgvector 자체 RAG와 동일 질문셋 비교 | 1인 운영 부담 대비 효용 검증 |
| 숙달도 | 6요소 가중합(요소 정의 없음) | 난이도 가중 Beta-Binomial, 신뢰구간 폭 = confidence | 정의 가능·검증 가능, 망각은 복습 모델로 분리 |
| 복습 | 고정 간격 + SM-2 컬럼 혼재 | FSRS 단일 모델, 복습일은 `ai_review_schedules` 한 곳에만 | 이중 원본 제거 |
| 정답 보안 | `answer_json`이 문항과 같은 테이블 | 정답 테이블 분리, 클라이언트 접근 불가 | 풀이 전 정답 노출 |
| RLS | select/update 예시만 | 클라이언트 select 전용, 쓰기는 FastAPI(service role)만 | 쓰기 주체 명확화 |
| 테이블 | `ai_ai_jobs`, DDL 누락 2개 | `ai_jobs`(user\_id nullable), `ai_document_sources`·`ai_tutor_feedback` DDL 추가 | 정합성 |
| 스트리밍 | 경로 미정 | 브라우저 → Python API 직접 SSE(Supabase JWT, CORS) | Vercel 함수 타임아웃·버퍼링 회피 |
| 비용 | 기록만 | 이용권별 일·월 호출 상한 | 원가 통제 |
| KPI | 시스템 지표 위주 | 숙달도 향상, 모의고사 점수 변화 추가 | 학습 성과 측정 |

## 1. 프로젝트 개요와 착수 전 전제

PassOK 기존 학습 기능 위에 개인별 지식 상태를 측정하고 다음 학습 행동을 결정하는 AI 학습 계층을 추가한다. 파일럿은 `cosmetic` 시험팩 하나로 한정한다.

### 1.1 개발 목표

1. 교재 근거 기반 AI 튜터
2. 개념 단위 숙달도 측정과 취약 개념 분석
3. 숙달도 기반 문제 선택과 학습 경로
4. 오답 원인 분류
5. 장기 기억 기반 복습(FSRS)
6. 학습 성과 분석

### 1.2 설계 원칙

| 원칙 | 내용 |
| --- | --- |
| Existing First | 기존 기능·DB를 보존하고 추가 방식으로만 변경 |
| Source of Truth | 회원·학습 데이터의 원본은 Supabase 하나 |
| Stateless AI | DeepTutor는 상태를 갖지 않는 추론·검색 서비스로만 사용 |
| Evidence Based | 답변은 교재·법령 근거를 갖추고, 근거가 없으면 확정하지 않음 |
| Validated Content | 채점 기록에 반영되는 문항은 승인된 문항만 |
| Deterministic Core | 숙달도·채점·경로 확정은 규칙/통계 엔진이 결정, LLM은 제안만 |
| Cost Bounded | 이용권별 호출 상한, 모델은 설정으로 교체 |
| Expandable | 공통 엔진 + 시험팩별 지식베이스·개념 체계 |
| Auditable | AI 생성·검증·승인·채점 이력 추적 |

### 1.3 착수 전 확정할 전제

v1.0은 "Vercel Next.js + Supabase가 학습 데이터 원본"을 전제했다. Cosmetic Pass Master는 SPA(index.html + app.js)이고 로컬 저장을 우선하며 로그인·동기화는 선택 사항이다. 따라서 다음을 Phase 0에서 확정한다.

- [ ] **대상 앱 확정**: AI 학습을 PassOK 본체(23개 시험팩) 위에 올릴지, Passmula(Cosmetic Pass Master) 위에 올릴지
- [ ] **기존 학습 기록 위치**: 모의고사·퀴즈·오답 기록 중 서버(Supabase)에 있는 것과 로컬(localStorage)에만 있는 것 구분
- [ ] **로그인 정책**: AI 학습 기능은 로그인 필수. 기존 비로그인 학습 기능은 그대로 유지
- [ ] **로컬 기록 이관**: AI 학습 최초 진입 시 로컬 풀이 기록을 사용자 동의 후 1회 업로드(`legacy_import` 이벤트로 기록, 중복 방지 키 사용)
- [ ] **기존 문항 ID 체계**: 문항이 DB 테이블에 있는지, 정적 JSON/JS에 있는지. 안정적인 문항 ID가 없으면 부여 규칙 수립

로컬 기록은 클라이언트가 제출한 값이라 조작 가능성이 있다. 이관 기록은 숙달도 사전분포에만 낮은 가중치(0.5)로 반영하고 공식 성적으로 취급하지 않는다.

## 2. 전체 시스템 아키텍처

브라우저는 Supabase JWT를 들고 Python Learning API를 직접 호출한다. DeepTutor는 같은 호스트의 내부망에서만 접근 가능한 상태 없는 서비스다.

> ⚠️ **원본 임베디드 콘텐츠 미포함** — "전체 아키텍처 · 4개 계층" 도식은 원본 전자본 참조. 텍스트 대체: 브라우저(PassOK SPA) → Python Host(FastAPI Learning API + Worker) → DeepTutor(내부망 전용) · Supabase(데이터 원본, ai_* 테이블)의 4계층. 구성요소 역할은 §2.1 표.

DB 쓰기는 Python Host(Learning API와 Worker)만 service role로 수행한다. DeepTutor는 외부 포트를 열지 않는다.

### 2.1 구성요소별 역할

| 구성요소 | 역할 | 하지 않는 것 |
| --- | --- | --- |
| PassOK Frontend (Vercel) | 학습 UI, PWA, Supabase 로그인 | AI 호출 프록시, 장시간 작업 |
| Supabase | 회원·권한·시험팩·문항·학습 데이터 원본, 교재 파일 보관 | — |
| Learning API (FastAPI) | JWT 검증, 문항 선택, 채점, 숙달도·복습 계산, 튜터 스트리밍, AI 출력 검증, 사용량 상한 | 요청 본문의 `user_id` 신뢰 |
| AI Worker | 문서 인덱싱, 문항 배치 생성·자동 검증, 오답 분류 배치, 야간 재계산 | 사용자 요청 동기 처리 |
| DeepTutor Runtime | RAG 검색, 튜터 답변 생성, 생성 보조 | 인증, 사용자 상태 저장, 외부 노출 |
| LLM / Embedding Provider | 추론, 임베딩 | — |

### 2.2 배치 규칙

- Vercel Serverless Function은 AI 호출을 중계하지 않는다. 브라우저가 `https://ai.<도메인>/api/v1/learning/*`을 직접 호출하고, CORS는 PassOK 도메인만 허용한다.
- Python Host는 Docker Compose 서비스 3개(`api`, `worker`, `deeptutor`)로 구성한다. `deeptutor`는 내부 네트워크에만 붙이고 호스트 포트를 바인딩하지 않는다.
- DeepTutor 이미지는 `latest`가 아닌 고정 태그를 쓰고, 아래 벤더링 절차에 따라 로컬 소스에서 빌드한다(작성일 기준 v1.6.15). 업그레이드는 어댑터 계약 테스트 통과 후에만 한다.
- 작업 큐는 파일럿에서 별도 브로커 없이 `ai_jobs` 테이블 + `FOR UPDATE SKIP LOCKED` 폴링으로 구현한다.
- 개발·스테이징·운영은 Supabase 프로젝트와 Python Host를 각각 분리한다.

#### DeepTutor 벤더링·업데이트 절차

DeepTutor는 저장소 안에 git 클론으로 두고 안정 태그에 고정한다. 실행은 이 소스로 로컬에서 빌드한 이미지로 한다. 원본 변경분은 파일 단위가 아니라 릴리스 태그 단위로만 반영한다. 파일 단위로 받으면 의존성·빌드·설정 스키마가 어느 버전과도 맞지 않게 되고, 삭제·이동된 파일이 남는다.

| 항목 | 규칙 |
| --- | --- |
| 위치 | `vendor/deeptutor`(git 클론, ZIP 사본 금지). PassOK 저장소에는 submodule로 연결 |
| 기준 버전 | 안정 태그(작성일 기준 `v1.6.15`). 로컬 브랜치 `passok/v<버전>` |
| 로컬 패치 | `passok/*` 브랜치에만 커밋. 설정으로 해결 가능하면 패치하지 않음. 수정 파일에 변경 사실 표기 |
| 이미지 | 이 소스로 빌드, 태그 `passok/deeptutor:<버전>-p<패치번호>`. 실행 시 GitHub·ghcr 접근 없음 |
| 기록 | `docs/ai-learning/deeptutor-version.md`: 태그, 커밋 해시, 패치 목록, 계약 테스트 결과, 갱신일 |
| 라이선스 | Apache-2.0. LICENSE·NOTICE 유지 |
| Windows | `git config core.autocrlf input`. 실행은 Docker(WSL2) |

업데이트는 아래 순서로만 한다. 새 릴리스가 나왔다고 자동으로 따라가지 않는다.

1. **점검**: 새 태그와 변경 범위를 확인한다.
2. **판단**: 보안 수정, 필요한 기능, 사용 중인 엔드포인트 변경 여부로 올릴지 정한다. 올리지 않으면 확인일만 기록한다.
3. **반영**: 로컬 패치를 새 태그 위로 rebase한다. 충돌이 나면 패치를 줄일 기회로 본다.
4. **검증**: 새 이미지를 빌드하고 어댑터 계약 테스트와 13.2 평가 세트 중 교재 30문항을 돌린다.
5. **승격**: 통과하면 compose의 이미지 태그와 버전 기록을 갱신하고, 개발 → 스테이징 → 운영 순서로 배포한다. 실패하면 이전 이미지 태그로 되돌린다.

```bash
# 최초 1회
git submodule add https://github.com/HKUDS/DeepTutor.git vendor/deeptutor
cd vendor/deeptutor
git checkout -b passok/v1.6.15 v1.6.15
docker build -t passok/deeptutor:1.6.15-p0 .

# 업데이트 점검 (예: v1.6.16)
git fetch --tags origin
git tag --sort=-v:refname | head -5
git diff --stat v1.6.15 v1.6.16
git log --oneline v1.6.15..v1.6.16

# 반영
git checkout -b passok/v1.6.16 passok/v1.6.15
git rebase --onto v1.6.16 v1.6.15
docker build -t passok/deeptutor:1.6.16-p0 .
```

#### 주기적 신규 태그 감지·승격 후보 파이프라인

"로컬을 항상 최신으로"라는 목적은 **감지 자동화 + 승격 사람 승인**으로 분리해 달성한다. 엔진 실행 시점에 원격과 diff를 비교해 로컬을 자동 갱신하는 방식은 채택하지 않는다 — 그 경로는 ①계약 테스트(유일한 안전장치, §2.3)를 우회하고 ②`passok/*` 패치를 소실하며 ③Phase 0 완료 조건인 "네트워크 차단 상태 `docker compose up` 기동"을 위반하고 ④실행 단위가 소스가 아니라 빌드된 이미지라 런타임 교체가 부분 실패 위험을 갖고 ⑤재현성·롤백·감사의 전제인 "고정 태그"를 깬다.

| 단계 | 자동/사람 | 내용 |
| --- | --- | --- |
| 1. 감지 | 자동 | worker가 주 1회 `deeptutor-check-update.sh`를 실행 — 신규 태그 목록·현재 버전과의 diff 통계·사용 중인 엔드포인트 관련 파일 변경 여부를 수집. 신규 태그 발견 시 관리자 알림(이벤트 로그 + 관리자 대시보드 표시) |
| 2. 긴급도 분류 | 자동 | 릴리스 노트에서 보안 키워드(security·CVE·vuln·패치) 감지 시 알림 등급 상승 — §2.2 "확인일만 기록" 절차에 긴급 플래그를 부가 |
| 3. 승격 후보 준비 | 자동(개발 환경 한정) | 신규 태그에 대해 자동으로: fetch → `passok/*` 패치 rebase → 이미지 빌드 → 어댑터 계약 테스트 → 평가 세트 30문 실행 → 결과 리포트. 통과분을 "승격 후보"로 제시. 어느 단계든 실패하면 후보 폐기·사유 기록 |
| 4. 승격 | 사람 | 관리자가 후보 리포트 검토 후 승인 → compose 이미지 태그·버전 기록 갱신 → 개발→스테이징→운영 순서 배포(§2.2 5단계와 동일). 실패 시 이전 이미지 태그로 되돌림 |

이 구조는 "최신 버전 인지"는 자동이지만 "실서비스에 들어가는 코드"는 계약 테스트 + 사람 승인을 거친다 — 무검증 코드의 런타임 유입은 구조적으로 차단된다. 3단계의 자동 준비는 개발 환경에서만 수행하고, 운영 호스트에서는 어떤 fetch·빌드도 실행하지 않는다.

LLM·임베딩 호출은 이 절차와 별개로 외부 API를 쓴다. 로컬 모델(예: Ollama)로 바꾸려면 Phase 0에서 한국어 품질을 따로 검증한다.

### 2.3 DeepTutor 어댑터

PassOK가 인터페이스를 소유하고, 구현체는 HTTP와 Mock 두 개만 둔다. CLI 구현체는 요청마다 프로세스를 띄워 다중 사용자 서비스에 맞지 않아 제외한다.

```python
class TutorEngine(Protocol):
    async def retrieve(self, kb_id: str, query: str, top_k: int = 8) -> list[Passage]: ...
    async def answer_stream(self, kb_id: str, message: str,
                            learner_context: LearnerContext,
                            history: list[Turn]) -> AsyncIterator[TutorChunk]: ...
    async def generate(self, kb_id: str, task: GenerationTask) -> dict: ...
    async def index_document(self, kb_id: str, file_uri: str,
                             metadata: DocMeta) -> IndexResult: ...
    async def health(self) -> EngineHealth: ...

class DeepTutorHttpEngine(TutorEngine): ...   # PoC에서 확인한 엔드포인트만 사용
class MockTutorEngine(TutorEngine): ...       # 고정 응답, CI·UI 테스트용
class PgVectorEngine(TutorEngine): ...        # Phase 0 비교용 / No-Go 시 대체안
```

- 대화 이력(`history`)은 PassOK가 `ai_tutor_messages`에서 읽어 매 요청에 넘긴다. DeepTutor 세션을 대화 원본으로 쓰지 않는다.
- 어댑터는 DeepTutor의 응답을 PassOK 스키마(`TutorChunk`, `Passage`)로 변환한다. DeepTutor 내부 클래스를 import하지 않는다.
- 사용하는 DeepTutor 엔드포인트의 요청·응답을 계약 테스트로 고정한다. 공개 API 레퍼런스가 없으므로 버전을 올릴 때 이 테스트가 유일한 안전장치다.

## 3. DeepTutor와 PassOK의 책임 분리

DeepTutor는 검색과 자연어 생성만 맡는다. 사용자 상태, 채점, 학습 결정은 모두 PassOK가 갖는다.

| 기능 | DeepTutor | PassOK |
| --- | --- | --- |
| 교재 RAG 검색 | 주 담당 | 자료 등록·버전·권한 관리 |
| 튜터 답변 생성 | 주 담당 | 학습자 맥락 주입, 대화 기록 저장, 인용 검증 |
| 문항 생성 | 초안 생성(배치) | 스키마·정답·유사도 검증, 사람 승인, 출제 |
| 채점 | 사용하지 않음 | 정답 키 비교(결정적) |
| 오답 유형 분류 | 모호한 경우만 보조 | 규칙 기반 1차 분류, 최종 기록 |
| 숙달도·복습일 | 사용하지 않음 | 계산·저장(통계 모델) |
| 학습 경로 | 설명 문구 생성(선택) | 규칙 엔진이 생성·확정 |
| 대화 이력 | 저장하지 않음 | `ai_tutor_messages`에 저장 |
| 장기 메모리 | 비활성화 | 숙달도·취약 개념을 매 요청 주입 |
| 인증·결제·이용권 | 사용하지 않음(자체 auth 끔) | Supabase Auth, 기존 결제 |

**메모리를 끄는 이유.** DeepTutor는 계층형 메모리와 사용자별 워크스페이스를 제공한다. PassOK가 서비스 계정 하나로 호출하면 모든 학습자가 같은 메모리를 공유한다. 파일럿에서는 메모리를 끄고 다음 맥락을 매 요청에 넣는다.

```json
{
  "learner_context": {
    "level": "보통",
    "preferred_style": "easy",
    "unit": {"code": "SKIN_001", "mastery": 52, "confidence": "low"},
    "recent_errors": ["개념 혼동: 표피층 순서"],
    "weak_units": ["SKIN_003", "LAW_012"]
  }
}
```

개인 식별 정보(이름, 이메일, user\_id)는 맥락에 넣지 않는다. 사용자별 메모리가 필요하면 PassOK 사용자와 DeepTutor 워크스페이스를 1:1로 매핑하는 방식을 별도 PoC로 검증한 뒤 v1.2에서 검토한다.

## 4. Cosmetic 도메인과 문항-개념 매핑

문항과 Knowledge Unit의 연결이 이 시스템의 기반 데이터다. 숙달도, 진단, 취약 개념, 기존 성적 반영이 모두 여기에 의존하므로 Phase 2의 독립 작업으로 둔다.

### 4.1 개념 체계

시험팩 ID는 `cosmetic`. 과목 코드는 기존 PassOK 과목 체계를 우선 재사용하고, 없으면 공식 출제기준의 과목 구분을 따른다.

| 과목 코드(예시) | 영역 |
| --- | --- |
| LAW | 화장품법·시행령·시행규칙, 제도 |
| QC | 제조·품질관리·위생·안전 |
| DIST | 유통·표시·광고·안전관리 |
| SKIN | 피부 구조·생리 |
| ING | 화장품 원료·성분·기능 |

- Knowledge Unit은 2단계(과목 → 단원 → 개념)로 제한한다. 파일럿 목표 규모는 개념 80\~150개다.
- 선수 관계는 `ai_unit_prerequisites` 테이블에 두고, 순환이 없는지 마이그레이션·적재 시 검사한다.
- 개념 체계는 버전을 둔다(`taxonomy_version`). 개념을 합치거나 나눌 때 숙달도 이관 규칙을 함께 기록한다.

### 4.2 문항-개념 매핑

- 기존 문제은행 문항과 승인된 AI 문항 모두 `ai_question_unit_map`에 연결한다.
- 한 문항에 개념 최대 3개, `weight` 합은 1.0. 주 개념 하나는 `is_primary = true`.
- 기존 문항은 `question_source = 'legacy'`와 기존 ID(`source_question_id`)로 참조하고, 기존 테이블은 수정하지 않는다.

### 4.3 태깅 작업 절차

1. 개념 목록 확정(출제기준 + 교재 목차 기반, 사람 검수)
2. Worker가 문항별 개념 후보와 근거 문장을 제안(`status = 'suggested'`)
3. 관리자 검수 화면에서 승인·수정(`status = 'approved'`, `reviewed_by` 기록)
4. 승인된 매핑만 숙달도 계산에 사용
5. 품질 점검: 20% 표본을 두 번째 검수자가 재태깅, 불일치율 10% 이하면 통과

1인 운영이므로 5단계는 일주일 뒤 본인이 다시 태깅하는 것으로 대체할 수 있다. 관리자 검수 화면은 Phase 2 범위에 포함한다.

## 5. Learner Model

숙달도는 난이도를 가중한 Beta-Binomial 모델로 계산하고, 망각은 FSRS 복습 모델이 담당한다. v1.0의 6요소 가중합은 요소 정의가 없어 구현과 검증이 불가능하므로 폐기한다.

### 5.1 학습 프로필

`user_id`, `exam_pack_id`, `learning_goal`, `preferred_style`(easy / balanced / deep), `target_exam_date`, `daily_minutes`, `last_assessed_at`. 개인정보는 이 범위를 넘어 수집하지 않는다.

### 5.2 숙달도 계산

학습자·개념마다 두 값 α(정답 증거), β(오답 증거)를 저장한다. 사전분포는 α₀ = β₀ = 1이다.

채점된 응답 하나가 들어오면, 그 문항에 매핑된 각 개념 u에 대해:

```latex
\text{정답: } \alpha_u \mathrel{+}= w_u \cdot s \cdot (0.6 + 0.2\,d) \qquad \text{오답: } \beta_u \mathrel{+}= w_u \cdot s \cdot (1.8 - 0.2\,d)
```

- d = 문항 난이도 1\~5. 어려운 문항을 맞히면 증거가 크고(d=5 → 1.6), 쉬운 문항을 틀리면 증거가 크다(d=1 → 1.6).
- wᵤ = 문항-개념 매핑 가중치(합 1.0).
- s = 출처 가중치: 모의고사·진단·맞춤 문제 1.0, 힌트 사용 또는 튜터 설명 직후 재시도 0.5, 로컬 기록 이관(`legacy_import`) 0.5, 연습 모드(실시간 생성 문항) 0.

오래된 증거는 새 증거를 더하기 전에 반감기 60일로 사전분포 쪽으로 줄인다(Δ = 마지막 평가 후 경과일).

```latex
\alpha_u \leftarrow \alpha_0 + (\alpha_u - \alpha_0)\cdot 0.5^{\Delta/60} \qquad \beta_u \leftarrow \beta_0 + (\beta_u - \beta_0)\cdot 0.5^{\Delta/60}
```

표시값:

```latex
\text{mastery} = 100 \cdot \frac{\alpha}{\alpha+\beta} \qquad n_{\text{eff}} = \alpha + \beta - 2
```

| 상태 | 조건 | 표시 |
| --- | --- | --- |
| 미평가 | n\_eff = 0 | 점수 없음(`mastery_score = null`) |
| 판정 보류 | 0 < n\_eff < 4 | 점수 + "데이터 부족", confidence = low |
| 판정 | n\_eff ≥ 4 | 아래 구간별 수준, confidence = medium(4\~9) / high(10 이상) |

| 점수 | 수준 | 학습 조치 |
| --- | --- | --- |
| 0\~39 | 취약 | 개념 학습 → 기초 문제 |
| 40\~59 | 부족 | 개념 요약 → 기초 문제 |
| 60\~74 | 보통 | 응용 문제 |
| 75\~89 | 양호 | 심화 문제 |
| 90\~100 | 숙달 | 복습만. 단, 90% 신뢰구간 하한이 80 이상일 때만 숙달로 표시 |

상수(사전분포, 난이도 계수, 반감기, 구간)는 설정 파일로 관리한다. 파일럿 데이터로 "숙달도가 다음 문항 정답을 얼마나 예측하는가"(로그 손실, AUC)를 측정해 보정한다. 계산은 `mastery_service`의 순수 함수로 구현하고 LLM은 관여하지 않는다.

### 5.3 복습 모델(FSRS)

- 복습 단위는 Knowledge Unit이다. 복습 1회 = 해당 개념의 승인 문항 2\~3개.
- 등급 산정: 모두 정답이고 평균 응답시간 이내 → Good(빠르면 Easy), 일부 정답 → Hard, 전부 오답 → Again.
- FSRS 기본 파라미터, 목표 기억률 0.9로 시작한다. 복습 기록이 1,000건을 넘으면 파라미터를 최적화한다.
- 시험일 보정: 다음 복습일이 시험일을 넘으면 `남은 일수 / 2`로 자른다.
- 복습 진입: 개념 학습 항목을 완료했거나, 숙달도 60 이상·confidence medium 이상이 됐을 때.
- 복습 결과는 5.2의 숙달도에도 일반 응답과 같은 규칙으로 반영한다.
- 다음 복습일의 원본은 `ai_review_schedules` 하나다. `ai_learner_mastery`에는 복습일을 저장하지 않는다.

### 5.4 오답 유형 판정

규칙을 위에서부터 적용하고, 어느 규칙에도 해당하지 않을 때만 LLM 배치 분류를 쓴다.

| 순서 | 조건 | 유형 |
| --- | --- | --- |
| 1 | 선택한 오답 선지에 `distractor_unit_code`가 있음 | 개념 혼동 |
| 2 | 문항 태그 `numeric_fact`(법정 기간·함량·수치) | 암기 부족 |
| 3 | 문항 태그 `calculation` | 계산 오류 |
| 4 | 응답시간 < 문항 중앙값의 30% 이고 해당 개념 숙달도 ≥ 75 | 단순 실수 |
| 5 | 같은 개념 최근 3회 중 2회 이상 오답 | 개념 미이해 |
| 6 | 그 외 | LLM 분류(문제 해석 오류 포함), 신뢰도 낮으면 `unknown` |

### 5.5 초기 진단과 학습 경로

**진단**: 과목별 5문항씩 총 25문항. 과목마다 난이도 3에서 시작해 정답이면 +1, 오답이면 −1. 이미 n\_eff ≥ 4인 개념이 많은 과목은 건너뛴다.

**경로**: 규칙 엔진이 생성·확정한다. LLM은 "왜 이 순서인가" 설명 문구만 쓴다.

1. 오늘 만기인 복습 항목을 먼저 넣는다(일일 학습 시간의 최대 40%).
2. 나머지 개념의 우선순위 = (100 − 숙달도) × 과목 배점 비중 × 시험 임박도. 미평가 개념은 숙달도 50으로 계산한다.
3. 선수 개념의 숙달도가 60 미만이면 선수 개념을 먼저 배치한다.
4. 수준별 조치(5.2 표)를 항목으로 변환하고 `daily_minutes` 안에서 자른다.
5. 경로는 매일 최초 접속 시, 그리고 세션 종료 시 재계산한다. 완료된 항목은 보존하고 남은 항목만 교체한다.

시험 임박도는 시험일 30일 이내면 배점 비중을 더 강하게 반영하는 가중치다. 파일럿에서는 1.0(30일 초과) / 1.5(30일 이내)로 시작한다.

## 6. 데이터베이스 설계

신규 테이블은 모두 `ai_` 접두사를 쓰고, 기존 테이블은 읽기만 한다. 기존 문항은 읽어서 `ai_question_items`에 등록하고 원본 ID를 보존한다. 그래야 서버가 정답 키로 채점할 수 있다.

### 6.1 테이블 목록

| 테이블 | 용도 | 소유 | 클라이언트 읽기 |
| --- | --- | --- | --- |
| `ai_learning_profiles` | 학습 프로필 | 사용자 | 본인 |
| `ai_knowledge_units` | 개념 단위 | 공유 | 로그인 사용자 |
| `ai_unit_prerequisites` | 선수 관계 | 공유 | 로그인 사용자 |
| `ai_question_items` | 문항 본문·선지(정답 없음), legacy + AI | 공유 | 승인 문항만 |
| `ai_question_keys` | 정답·해설·오답 선지 개념 | 서버 | 불가 |
| `ai_question_unit_map` | 문항-개념 매핑 | 공유 | 불가 |
| `ai_attempts` | 채점된 응답(숙달도의 입력) | 사용자 | 본인 |
| `ai_learner_mastery` | 개념별 α·β·숙달도 | 사용자 | 본인 |
| `ai_review_schedules` | FSRS 카드 상태·다음 복습일 | 사용자 | 본인 |
| `ai_review_logs` | 복습 등급 이력(FSRS 최적화용) | 사용자 | 본인 |
| `ai_learning_sessions` | 학습·튜터 세션 | 사용자 | 본인 |
| `ai_tutor_messages` | 튜터 대화 원본 | 사용자 | 본인 |
| `ai_tutor_feedback` | 답변 평가 | 사용자 | 본인 |
| `ai_learning_events` | 분석용 이벤트 | 사용자 | 불가 |
| `ai_learning_paths` / `_items` | 학습 경로 | 사용자 | 본인 |
| `ai_document_sources` | RAG 자료·버전·권리 | 서버 | 불가 |
| `ai_jobs` | 비동기 작업(시스템 작업은 user\_id null) | 서버 | 본인 작업만 |
| `ai_usage_logs` | 호출·토큰·비용 | 서버 | 불가 |

### 6.2 Up Migration

`exam_pack_id`는 기존 시험팩 테이블 조사 후 FK를 추가한다(`-- TODO(FK)` 표시). 사용자 ID 타입은 Supabase Auth 기준 uuid다.

```sql
-- 0001_ai_learning_up.sql
create extension if not exists pgcrypto;

create or replace function public.ai_set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- 1. 프로필
create table public.ai_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_pack_id text not null,                          -- TODO(FK)
  learning_goal text,
  preferred_style text not null default 'balanced'
    check (preferred_style in ('easy','balanced','deep')),
  target_exam_date date,
  daily_minutes integer not null default 30 check (daily_minutes between 5 and 600),
  last_assessed_at timestamptz,
  legacy_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exam_pack_id)
);

-- 2. 개념 체계
create table public.ai_knowledge_units (
  id uuid primary key default gen_random_uuid(),
  exam_pack_id text not null,                          -- TODO(FK)
  taxonomy_version text not null default 'v1',
  subject_code text not null,
  unit_code text not null,
  parent_id uuid references public.ai_knowledge_units(id),
  title text not null,
  description text,
  difficulty smallint not null default 2 check (difficulty between 1 and 5),
  objectives jsonb not null default '[]'::jsonb,
  exam_weight numeric(5,4),                            -- 과목 배점 비중
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_pack_id, unit_code)
);

create table public.ai_unit_prerequisites (
  unit_id uuid not null references public.ai_knowledge_units(id) on delete cascade,
  prerequisite_id uuid not null references public.ai_knowledge_units(id) on delete cascade,
  primary key (unit_id, prerequisite_id),
  check (unit_id <> prerequisite_id)
);

-- 3. 문항(정답 제외)
create table public.ai_question_items (
  id uuid primary key default gen_random_uuid(),
  exam_pack_id text not null,                          -- TODO(FK)
  source text not null check (source in ('legacy','ai','manual')),
  source_question_id text,                             -- 기존 문제은행 ID
  question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice','ox','short_answer')),
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  stem text not null,
  options jsonb not null default '[]'::jsonb,          -- [{"key":"1","text":"..."}]
  tags text[] not null default '{}',                   -- numeric_fact, calculation ...
  source_refs jsonb not null default '[]'::jsonb,      -- 교재·법령 근거
  status text not null default 'draft'
    check (status in ('draft','auto_checked','approved','rejected','retired')),
  validation_report jsonb not null default '{}'::jsonb,
  generation_job_id uuid,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  median_response_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_pack_id, source, source_question_id)
);
create index idx_ai_qitems_pack_status on public.ai_question_items(exam_pack_id, status);

create table public.ai_question_keys (
  question_id uuid primary key references public.ai_question_items(id) on delete cascade,
  answer jsonb not null,                               -- {"key":"3"} 또는 허용 답안 목록
  explanation text,
  distractor_units jsonb not null default '{}'::jsonb  -- {"1":"SKIN_003"} 오답 선지별 혼동 개념
);

create table public.ai_question_unit_map (
  question_id uuid not null references public.ai_question_items(id) on delete cascade,
  knowledge_unit_id uuid not null references public.ai_knowledge_units(id),
  weight numeric(3,2) not null default 1.0 check (weight > 0 and weight <= 1),
  is_primary boolean not null default false,
  status text not null default 'suggested' check (status in ('suggested','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  primary key (question_id, knowledge_unit_id)
);
create index idx_ai_qmap_unit on public.ai_question_unit_map(knowledge_unit_id) where status = 'approved';

-- 4. 세션·대화
create table public.ai_learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_pack_id text not null,
  session_type text not null check (session_type in ('tutor','diagnostic','path','review','practice')),
  title text,
  status text not null default 'active' check (status in ('active','ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index idx_ai_sessions_user on public.ai_learning_sessions(user_id, started_at desc);

create table public.ai_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_learning_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  knowledge_unit_id uuid references public.ai_knowledge_units(id),
  citations jsonb not null default '[]'::jsonb,
  grounded boolean,                                    -- 근거 확보 여부
  created_at timestamptz not null default now()
);
create index idx_ai_msgs_session on public.ai_tutor_messages(session_id, created_at);

create table public.ai_tutor_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_tutor_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  reason text check (reason in ('wrong','unclear','no_source','helpful','other')),
  comment text,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

-- 5. 응답·숙달도
create table public.ai_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_pack_id text not null,
  question_id uuid not null references public.ai_question_items(id),
  session_id uuid references public.ai_learning_sessions(id),
  context text not null check (context in ('diagnostic','path','review','mock','practice','legacy_import')),
  answer jsonb not null,
  is_correct boolean not null,
  response_ms integer check (response_ms >= 0),
  hint_used boolean not null default false,
  source_weight numeric(3,2) not null,
  error_type text check (error_type in ('misconception','confusion','memorization',
    'misreading','calculation','slip','unknown')),
  error_type_by text check (error_type_by in ('rule','llm')),
  idempotency_key text unique,
  answered_at timestamptz not null default now()
);
create index idx_ai_attempts_user_time on public.ai_attempts(user_id, answered_at desc);
create index idx_ai_attempts_question on public.ai_attempts(question_id);

create table public.ai_learner_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  knowledge_unit_id uuid not null references public.ai_knowledge_units(id),
  exam_pack_id text not null,
  alpha numeric(8,3) not null default 1,
  beta numeric(8,3) not null default 1,
  n_eff numeric(8,3) generated always as (alpha + beta - 2) stored,
  mastery_score numeric(5,2) generated always as (
    case when alpha + beta - 2 <= 0 then null
         else round(100 * alpha / (alpha + beta), 2) end) stored,
  attempt_count integer not null default 0,
  correct_count integer not null default 0,
  last_assessed_at timestamptz,
  model_version text not null default 'beta-v1',
  updated_at timestamptz not null default now(),
  primary key (user_id, knowledge_unit_id)
);
create index idx_ai_mastery_user_pack on public.ai_learner_mastery(user_id, exam_pack_id);

-- 6. 복습(FSRS)
create table public.ai_review_schedules (
  user_id uuid not null references auth.users(id) on delete cascade,
  knowledge_unit_id uuid not null references public.ai_knowledge_units(id),
  exam_pack_id text not null,
  state text not null default 'learning' check (state in ('learning','review','relearning','suspended')),
  stability numeric(10,4),
  difficulty numeric(6,4),
  due_at timestamptz not null,
  last_review_at timestamptz,
  reps integer not null default 0,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, knowledge_unit_id)
);
create index idx_ai_review_due on public.ai_review_schedules(user_id, due_at) where state <> 'suspended';

create table public.ai_review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  knowledge_unit_id uuid not null references public.ai_knowledge_units(id),
  rating smallint not null check (rating between 1 and 4),   -- Again/Hard/Good/Easy
  elapsed_days numeric(8,2),
  scheduled_days numeric(8,2),
  reviewed_at timestamptz not null default now()
);
create index idx_ai_review_logs_user on public.ai_review_logs(user_id, reviewed_at desc);

-- 7. 학습 경로
create table public.ai_learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_pack_id text not null,
  path_date date not null,
  status text not null default 'active' check (status in ('active','completed','superseded')),
  engine_version text not null,
  rationale text,                                      -- LLM 설명 문구(선택)
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index uq_ai_path_active on public.ai_learning_paths(user_id, exam_pack_id)
  where status = 'active';

create table public.ai_learning_path_items (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.ai_learning_paths(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,  -- RLS용 비정규화
  knowledge_unit_id uuid references public.ai_knowledge_units(id),
  item_type text not null check (item_type in ('concept_learning','concept_summary',
    'basic_quiz','applied_quiz','advanced_quiz','review')),
  sequence_no integer not null,
  status text not null default 'pending' check (status in ('pending','in_progress','done','skipped')),
  estimated_minutes integer,
  result jsonb not null default '{}'::jsonb,
  unique (path_id, sequence_no)
);
create index idx_ai_path_items_user on public.ai_learning_path_items(user_id);

-- 8. 분석 이벤트
create table public.ai_learning_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_pack_id text not null,
  session_id uuid references public.ai_learning_sessions(id) on delete set null,
  knowledge_unit_id uuid references public.ai_knowledge_units(id),
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index idx_ai_events_user_time on public.ai_learning_events(user_id, occurred_at desc);

-- 9. RAG 자료
create table public.ai_document_sources (
  id uuid primary key default gen_random_uuid(),
  exam_pack_id text not null,
  title text not null,
  source_type text not null check (source_type in ('textbook','official_guide','law',
    'regulation','exam_reference','internal_note')),
  source_authority text,
  document_version text not null,
  effective_date date,
  superseded_by uuid references public.ai_document_sources(id),
  storage_path text not null,
  copyright_status text not null check (copyright_status in ('owned','licensed','public_law','pending')),
  kb_id text,                                          -- DeepTutor KB 식별자
  index_status text not null default 'pending' check (index_status in ('pending','indexing','ready','failed')),
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (exam_pack_id, title, document_version)
);

-- 10. 작업·사용량
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,   -- 시스템 작업은 null
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index idx_ai_jobs_queue on public.ai_jobs(status, run_after) where status = 'queued';

create table public.ai_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.ai_learning_sessions(id) on delete set null,
  job_id uuid references public.ai_jobs(id) on delete set null,
  provider text not null,
  model text not null,
  operation text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(12,6),
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index idx_ai_usage_user_day on public.ai_usage_logs(user_id, created_at desc);

-- updated_at 트리거
create trigger trg_ai_profiles_upd before update on public.ai_learning_profiles
  for each row execute function public.ai_set_updated_at();
create trigger trg_ai_units_upd before update on public.ai_knowledge_units
  for each row execute function public.ai_set_updated_at();
create trigger trg_ai_qitems_upd before update on public.ai_question_items
  for each row execute function public.ai_set_updated_at();
create trigger trg_ai_mastery_upd before update on public.ai_learner_mastery
  for each row execute function public.ai_set_updated_at();
create trigger trg_ai_review_upd before update on public.ai_review_schedules
  for each row execute function public.ai_set_updated_at();
```

### 6.3 Down Migration

```sql
-- 0001_ai_learning_down.sql (역순 삭제, 기존 테이블 무영향)
drop table if exists public.ai_usage_logs, public.ai_jobs, public.ai_document_sources,
  public.ai_learning_events, public.ai_learning_path_items, public.ai_learning_paths,
  public.ai_review_logs, public.ai_review_schedules, public.ai_learner_mastery,
  public.ai_attempts, public.ai_tutor_feedback, public.ai_tutor_messages,
  public.ai_learning_sessions, public.ai_question_unit_map, public.ai_question_keys,
  public.ai_question_items, public.ai_unit_prerequisites, public.ai_knowledge_units,
  public.ai_learning_profiles cascade;
drop function if exists public.ai_set_updated_at();
```

### 6.4 쓰기 규칙

- 숙달도 갱신은 `ai_attempts` insert와 같은 트랜잭션에서 `select ... for update`로 행을 잠그고 수행한다. 동시 제출로 α·β가 유실되지 않게 한다.
- 제출은 클라이언트가 만든 `idempotency_key`를 필수로 받는다. 재전송은 기존 결과를 돌려준다.
- 모델을 바꾸면(`model_version`) `ai_attempts`를 재생해 숙달도를 재계산할 수 있다. `ai_attempts`가 숙달도의 원본이다.

## 7. RLS 정책과 쓰기 주체

클라이언트는 본인 데이터를 읽기만 하고, 모든 쓰기는 Python Host가 service role로 수행한다. 예외는 튜터 피드백과 프로필의 일부 필드이며, 이것도 API를 거치도록 통일한다.

- **모든 `ai_` 테이블에 RLS를 켜고, insert/update/delete 정책은 만들지 않는다.** 정책이 없으면 anon·authenticated 역할의 쓰기는 전부 거부된다.
- **`ai_question_keys`, `ai_question_unit_map`, `ai_document_sources`, `ai_usage_logs`, `ai_learning_events`에는 select 정책도 두지 않는다.** 정답과 매핑은 클라이언트에서 읽을 수 없다.
- **FastAPI는 요청 본문의 `user_id`를 무시한다.** JWT의 `sub`를 Supabase JWKS로 검증해 사용하고, 모든 쿼리에 `user_id = :sub` 조건을 명시한다(service role은 RLS를 우회하므로).
- **service role 키는 Python Host의 비밀 저장소에만 둔다.** Vercel 환경변수에도 넣지 않는다.

```sql
-- 0002_ai_learning_rls.sql
do $$
declare t text;
begin
  foreach t in array array[
    'ai_learning_profiles','ai_knowledge_units','ai_unit_prerequisites',
    'ai_question_items','ai_question_keys','ai_question_unit_map',
    'ai_attempts','ai_learner_mastery','ai_review_schedules','ai_review_logs',
    'ai_learning_sessions','ai_tutor_messages','ai_tutor_feedback',
    'ai_learning_events','ai_learning_paths','ai_learning_path_items',
    'ai_document_sources','ai_jobs','ai_usage_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- 본인 데이터: select 전용
do $$
declare t text;
begin
  foreach t in array array[
    'ai_learning_profiles','ai_attempts','ai_learner_mastery','ai_review_schedules',
    'ai_review_logs','ai_learning_sessions','ai_tutor_messages','ai_tutor_feedback',
    'ai_learning_paths','ai_learning_path_items','ai_jobs']
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      'own_select_' || t, t);
  end loop;
end $$;

-- 공유 콘텐츠: 로그인 사용자 읽기
create policy units_read on public.ai_knowledge_units
  for select to authenticated using (active);
create policy prereq_read on public.ai_unit_prerequisites
  for select to authenticated using (true);
create policy qitems_read_approved on public.ai_question_items
  for select to authenticated using (status = 'approved');
```

`force row level security`는 테이블 소유자에도 RLS를 적용한다. service role은 `bypassrls` 속성이 있어 영향을 받지 않는다. 이용권(Pro) 제한이 문항 열람에도 필요하면, 기존 이용권 테이블을 확인한 뒤 `qitems_read_approved`에 조건을 추가한다.

승인 문항 본문은 클라이언트가 읽을 수 있다. 하지만 문항 선택은 항상 API가 하므로, 전체 문항을 미리 읽어도 정답은 얻을 수 없다.

## 8. API 설계

모든 엔드포인트는 Python Host의 `/api/v1/learning` 아래에 두고 `Authorization: Bearer <Supabase JWT>`를 요구한다. 요청 본문에는 `user_id`를 받지 않는다.

### 8.1 엔드포인트

| Method | Endpoint | 기능 | 처리 |
| --- | --- | --- | --- |
| GET | `/profile` | 프로필 조회 | 동기 |
| PUT | `/profile` | 프로필 수정(스타일, 시험일, 일일 시간) | 동기 |
| POST | `/legacy-import` | 로컬 풀이 기록 1회 이관 | 작업 생성 |
| GET | `/dashboard` | 진도, 과목별 숙달도, 취약 개념 TOP 5, 오늘 항목 | 동기 |
| GET | `/mastery` | 과목·개념별 숙달도(지식 지도) | 동기 |
| GET | `/mastery/{unitId}` | 개념 상세: 숙달도, 최근 응답, 오답 유형 | 동기 |
| POST | `/diagnostic/start` | 진단 세션 생성, 첫 문항 | 동기 |
| POST | `/questions/next` | 다음 문항 선택(승인 풀에서) | 동기 |
| POST | `/attempts` | 응답 제출 → 채점 → 숙달도·복습 갱신 | 동기(오답 LLM 분류는 비동기) |
| POST | `/tutor/sessions` | 튜터 세션 생성 | 동기 |
| POST | `/tutor/sessions/{id}/messages` | 튜터 질문 | SSE 스트리밍 |
| POST | `/tutor/messages/{id}/feedback` | 답변 평가 | 동기 |
| GET | `/path/today` | 오늘의 학습 경로(없으면 생성) | 동기 |
| PATCH | `/path/items/{id}` | 항목 상태 변경 | 동기 |
| GET | `/review/today` | 오늘 만기 복습 개념 | 동기 |
| POST | `/practice/generate` | 연습 모드 실시간 문항(기록 미반영) | 동기, 별도 상한 |
| GET | `/jobs/{jobId}` | 본인 작업 상태 | 동기 |

관리자 API(`/admin/*`: 문항 검수·승인, 매핑 검수, 자료 등록·인덱싱, 비용 조회)는 별도 라우터로 두고 관리자 역할을 확인한다. 역할은 기존 PassOK 권한 체계를 재사용한다.

### 8.2 튜터 스트리밍

Request:

```json
{
  "message": "표피와 진피의 차이를 쉽게 설명해줘",
  "knowledge_unit_id": "uuid | null",
  "mode": "explain | example | summary | deep"
}
```

SSE 이벤트 순서:

```text
event: meta      data: {"message_id":"uuid","session_id":"uuid"}
event: delta     data: {"text":"표피는 피부의 가장 바깥층..."}   (반복)
event: citations data: [{"document_id":"uuid","title":"...","page":15,"section":"피부의 구조","effective_date":null}]
event: actions   data: [{"type":"quiz","unit_id":"uuid","label":"관련 문제 풀기"}]
event: done      data: {"grounded":true,"usage":{"input_tokens":1820,"output_tokens":410}}
```

- 검색 결과가 기준 점수를 넘지 못하면 `grounded:false`로 표시하고, 답변 첫 문장에 "교재에서 근거를 찾지 못했다"를 넣도록 지시한다.
- 인용은 검색된 청크의 메타데이터에서만 만든다. LLM이 쓴 페이지 번호는 쓰지 않는다.
- 스트림이 끝나면 사용자 메시지와 답변을 `ai_tutor_messages`에 저장하고 `ai_usage_logs`를 기록한다.
- 클라이언트는 `fetch` + `ReadableStream`으로 받는다(EventSource는 Authorization 헤더를 보낼 수 없음).

### 8.3 문항 선택·채점

`/questions/next` 선택 규칙: 대상 개념의 승인 문항 중 최근 14일 안에 푼 문항을 제외하고, 난이도가 목표 난이도(숙달도 구간으로 결정)에 가장 가까운 것을 고른다. 후보가 없으면 인접 난이도로 넓히고, 그래도 없으면 문항 부족 작업을 큐에 넣는다. 응답에는 문항 본문과 선지만 포함한다.

`/attempts` 응답 예시:

```json
{
  "attempt_id": "uuid",
  "is_correct": false,
  "correct_answer": {"key": "3"},
  "explanation": "...",
  "error_type": "confusion",
  "mastery": [{"unit_code": "SKIN_001", "before": 58.2, "after": 51.7, "confidence": "medium"}],
  "next_review_at": "2026-11-29T00:00:00+09:00"
}
```

정답과 해설은 제출이 저장된 뒤에만 반환한다.

### 8.4 사용량 상한

| 항목 | 무료 | Pro |
| --- | --- | --- |
| 튜터 질문 / 일 | 10 | 100 |
| 연습 모드 생성 / 일 | 0 | 20 |
| 질문 길이 | 500자 | 2,000자 |
| 학습자당 월 원가 상한 | 미정 | 미정 |

숫자는 초기값이며 설정으로 관리한다. 상한에 도달하면 HTTP 429와 `reset_at`을 반환하고, UI는 남은 횟수를 표시한다. 월 원가 상한은 Phase 4 비용 분석 후 정한다. 별도로 IP당 분당 60회 요청 제한과 요청 본문 64KB 제한을 둔다.

### 8.5 오류 형식

```json
{"error": {"code": "QUOTA_EXCEEDED", "message": "...", "reset_at": "..."}}
```

코드: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `QUOTA_EXCEEDED`, `ENGINE_UNAVAILABLE`, `NO_QUESTIONS_AVAILABLE`, `INTERNAL`.

## 9. 문제 풀 파이프라인

채점 기록에 반영되는 문항은 모두 사람이 승인한 문항이다. AI는 문항을 배치로 미리 만들고, 적응형 엔진은 승인된 풀에서 고르기만 한다.

### 9.1 흐름

1. **부족분 산출**: 개념×난이도 칸별 승인 문항 수를 집계한다. 목표는 개념당 최소 8문항(난이도 1\~2 / 3 / 4\~5가 각 2개 이상)이다.
2. **생성**(`ai_jobs`: `generate_questions`): 개념의 교재 청크를 검색해 근거로 붙이고, 정해진 JSON 스키마로 생성한다. 정답과 해설은 `ai_question_keys`로 분리 저장한다. 상태는 `draft`.
3. **자동 검증**: 아래 표의 항목을 통과하면 `auto_checked`, 실패하면 1회 재생성 후 다시 실패하면 `rejected`. 결과는 `validation_report`에 기록한다.
4. **사람 검수**: 관리자 화면에서 문항, 정답, 근거 문장, 검증 결과를 한 화면에 보고 승인·수정·반려한다. 승인 시 `approved_by`, `approved_at`을 기록하고 개념 매핑도 함께 승인한다.
5. **운영 중 통계**: 응답이 30건 이상 쌓이면 실제 정답률로 난이도를 보정한다. 정답률 95% 초과 또는 15% 미만이거나 피드백 신고가 2건 이상이면 재검수 대기열에 올린다.
6. **퇴역**: 법령 개정으로 근거 문서가 `superseded`되면 그 문서를 인용한 문항을 자동으로 재검수 대상에 넣는다.

### 9.2 자동 검증 항목

| 항목 | 방법 | 실패 기준 |
| --- | --- | --- |
| 스키마 | Pydantic | 필드 누락·타입 오류 |
| 선지 | 규칙 | 4\~5개가 아님, 중복 선지, "모두 정답" 류 |
| 단일 정답 | 독립 풀이: 다른 모델이 근거만 보고 풀이 | 답이 다르거나 복수 정답 가능 판단 |
| 근거 일치 | 정답 문장이 인용 청크에 포함되는지 LLM 판정 | 근거 없음 |
| 해설 일치 | 해설이 정답과 모순되는지 | 모순 |
| 유사도 | 기존 문항과 임베딩 코사인 유사도 | 0.92 초과 |
| 법령 기준일 | 근거가 법령이면 현행 버전인지 | 구버전 인용 |

독립 풀이는 생성 모델과 다른 모델 또는 다른 프롬프트로 수행해 같은 오류가 반복되는 것을 줄인다. 임계값은 파일럿 중 검수 결과와 비교해 보정한다.

### 9.3 연습 모드

`/practice/generate`는 학습자가 원할 때 즉석 문항을 만든다. 자동 검증은 스키마·선지 규칙만 적용하고, 화면에 "AI 연습 문제 · 검수 전"을 표시한다. 응답은 `context = 'practice'`, `source_weight = 0`으로 저장해 숙달도에 반영하지 않는다. 학습자가 오류를 신고한 연습 문항은 검수 후보로 넘길 수 있다.

## 10. RAG 및 교재 지식베이스

지식베이스는 시험팩당 하나를 두고 모든 학습자가 공유한다. 가장 큰 기술 리스크는 한국어 PDF 추출 품질이므로 Phase 0에서 먼저 측정한다.

### 10.1 파이프라인

1. `ai_document_sources`에 등록(저작권 상태가 `pending`이면 인덱싱 거부)
2. 파싱: 텍스트 PDF는 직접 추출, 스캔 PDF는 OCR. 표는 표 단위로 보존한다.
3. 정제: 머리말·쪽번호 제거, 하이픈·줄바꿈 복원
4. 청크: 교재는 절(section) 경계 우선, 법령은 조·항 단위. 청크마다 `page_number`, `section`, `knowledge_unit_code`(가능한 경우) 메타데이터
5. 임베딩: 다국어 모델(후보: bge-m3, OpenAI text-embedding-3 계열)을 Phase 0에서 비교해 선택
6. DeepTutor KB 적재 후 `kb_id`, `index_status = 'ready'` 기록

### 10.2 한국어 리스크 검증 항목(Phase 0)

| 항목 | 측정 | 통과 기준 |
| --- | --- | --- |
| 텍스트 추출 | 표본 30쪽 수작업 비교, 문자 오류율 | 2% 이하 |
| 표 추출 | 원료·함량 표 10개 구조 보존 | 8개 이상 |
| 검색 재현율 | 교재 질문 100개, 정답 청크가 상위 5개에 포함 | 85% 이상 |
| 인용 정확도 | 답변 인용 페이지가 실제 근거인지 | 90% 이상 |

DeepTutor는 지식베이스마다 RAG 엔진을 선택할 수 있다(기본 LlamaIndex, LightRAG는 추가 설치). 기본 엔진과 LightRAG를 같은 질문셋으로 비교한다.

### 10.3 검색 정책

1. 시험팩 KB로 범위 제한
2. 개념이 지정되면 해당 개념 태그 청크를 우선
3. 법령 질문은 `source_type in ('law','regulation')` 검색을 함께 수행
4. 검색 점수가 기준 미만이면 `grounded = false`
5. 법령과 교재가 다르면 현행 법령을 우선하고 답변에 시행일을 표시

검색된 문서 내용은 데이터로만 다루고, 문서 안의 명령문을 지시로 따르지 않도록 프롬프트에서 구분 태그로 감싼다.

### 10.4 법령 갱신

- 화장품법·시행령·시행규칙은 국가법령정보센터 Open API에서 받는다.
- Worker가 주 1회 개정 여부를 확인해, 개정되면 새 버전을 등록하고 기존 버전의 `superseded_by`를 채운다.
- 개정 시 관리자에게 알리고, 구버전을 인용한 문항을 재검수 대기열에 넣는다(9.1의 6단계).
- 시행일이 미래인 개정은 두 버전을 모두 두고, 시험일 기준으로 적용 버전을 고른다.

교재 PDF는 저작권이 `owned` 또는 `licensed`인 자료만 인덱싱한다. 튜터 답변에 교재 원문을 길게 인용하지 않도록 프롬프트에서 제한한다.

## 11. 보안·개인정보·비용

사용자 격리는 JWT 주체 강제, RLS, DeepTutor 무상태화의 세 겹으로 보장한다. 비용은 호출 상한과 모델 분리로 통제한다.

### 11.1 인증·API

- Supabase JWKS로 JWT 서명·만료·`aud` 검증. 키는 캐시하고 주기적으로 갱신
- `user_id`는 토큰에서만 취득. 작업·세션·경로 항목 조회 시 소유권 확인
- 관리자 역할은 기존 PassOK 권한 테이블로 확인. 관리자 API는 별도 라우터와 감사 로그
- CORS는 PassOK 도메인만 허용. Rate limit, 본문 크기 제한, Pydantic 입력 검증
- 비밀값(service role, LLM 키)은 Python Host 비밀 저장소에만 보관. 환경별 분리

### 11.2 AI 보안

- 검색 문서와 사용자 입력은 프롬프트 안에서 구분 태그로 감싸고 데이터로만 취급
- DeepTutor의 도구 실행·웹 검색·코드 실행 기능은 설정으로 끈다
- AI 출력은 스키마 검증 후에만 저장. AI가 만든 SQL이나 명령은 실행하지 않음
- 튜터는 시험 범위 밖 질문에 짧게 거절하고 사용량을 소모하지 않음(사전 분류는 소형 모델)

### 11.3 개인정보

- LLM 제공자에는 질문 본문과 3장의 학습 맥락만 전달. 이름·연락처·user\_id는 전달하지 않음
- 제공자의 데이터 보존·학습 이용 정책을 확인하고, 가능하면 학습 미사용 옵션을 쓴다
- 튜터 대화는 12개월 보관 후 삭제(초안). 회원 탈퇴 시 `on delete cascade`로 즉시 삭제
- 개인정보 처리방침에 AI 처리 목적과 국외 이전(해당 시) 항목 추가

### 11.4 비용

| 작업 | 모델 등급 | 호출 시점 |
| --- | --- | --- |
| 범위 분류, 단순 오답 분류 | 소형 | 실시간 / 배치 |
| 튜터 답변 | 중급 | 실시간 |
| 문항 생성 | 고성능 | 배치(야간) |
| 문항 독립 풀이 검증 | 중급(다른 모델) | 배치 |
| 경로 설명 문구 | 소형 | 일 1회 |
| 임베딩 | 임베딩 모델 | 자료 등록 시 |

- 모델명은 설정 파일로 관리한다.
- 캐시: 개념별 기본 설명(스타일별 3종)과 문항 해설은 미리 생성해 재사용. 개인 맥락이 들어간 답변은 캐시하지 않음
- 모든 호출을 `ai_usage_logs`에 기록하고, 학습자당 월 원가와 배치 작업별 원가를 대시보드로 본다.

## 12. 개발 단계와 Go/No-Go 기준

예상 총기간은 8\~12주다. v1.0보다 최대 1주 늘었는데, 기존 문항의 개념 태깅을 Phase 2에 넣었기 때문이다. 각 관문을 통과하지 못하면 다음 단계를 Devin에게 맡기지 않는다.

> ⚠️ **원본 임베디드 콘텐츠 미포함** — "개발 단계 · 5단계, 5개 관문" 도식에 G1~G3 관문 기준이 정의돼 있으나 본문에는 G0(§12.1)·G4(§14.8)만 텍스트로 존재. G1~G3 판정 기준은 원본 확보 또는 텍스트 재정의가 선행 필요 — §15 미결 사항에 등록됨.

### 12.1 G0 판정 절차

교재 질문 100개와 법령 질문 30개로 두 엔진(DeepTutor HTTP, pgvector 자체 RAG)을 비교한다. 측정 항목은 검색 재현율(상위 5개), 인용 정확도, 답변 정확도(전문가 기준 답안 대비), 첫 토큰 지연, 질문당 비용, 운영 부담(서비스 수·메모리 사용량)이다.

- 두 엔진 모두 기준 통과: 품질 차이가 5%p 이내면 운영이 단순한 쪽을 택한다.
- DeepTutor만 통과: DeepTutor 채택.
- 둘 다 미달: 파싱·청크 전략을 고친 뒤 1회 재측정하고, 그래도 미달이면 튜터 기능을 파일럿에서 빼고 학습 엔진(Phase 2\~3)부터 진행한다.

어느 쪽을 택해도 어댑터 인터페이스가 같아 이후 단계는 바뀌지 않는다.

### 12.2 진행 방식

- 한 번에 하나의 Phase만 Devin에게 지시한다. 관문 판정은 사용자가 직접 한다.
- Phase 2의 태깅 검수와 Phase 3의 문항 검수는 사람이 하는 일이다. 개발 일정과 별도로 검수 시간을 확보한다(문항 1,000개 기준 약 15\~25시간 추정).

## 13. 테스트와 KPI

자동화 테스트는 Mock 엔진으로 CI에서 돌리고, DeepTutor 계약 테스트만 실제 엔진을 쓴다. KPI는 시스템 지표와 학습 성과 지표를 함께 본다.

### 13.1 기능 테스트

| 테스트 | 통과 조건 |
| --- | --- |
| 인증 | 토큰 없음·만료·위조 서명 모두 401 |
| 사용자 격리 | A의 토큰으로 B의 세션·대화·작업·경로 항목 조회 시 404 |
| RLS | anon·authenticated 역할로 모든 ai\_ 테이블 쓰기 거부, `ai_question_keys` 조회 0행 |
| 본문 user\_id 무시 | 본문에 다른 user\_id를 넣어도 토큰 주체로 저장 |
| 채점 | 정답 키와 일치, 같은 idempotency\_key 재전송 시 중복 저장 없음 |
| 숙달도 | 고정 응답 시퀀스의 기대값과 소수점 둘째 자리까지 일치, 미평가는 null |
| 동시성 | 같은 개념에 동시 제출 20건 후 증거 증가분 합계가 일치 |
| 재생 | `ai_attempts` 재생 결과가 저장된 숙달도와 일치 |
| 복습 | FSRS 라이브러리 기대값과 일치, 시험일 상한 적용 |
| 경로 | 선수 개념 순서 준수, 일일 시간 초과 없음, 복습 비중 40% 이하 |
| 문항 선택 | 미승인 문항 출제 0건, 응답에 정답 필드 없음 |
| 튜터 | SSE 이벤트 순서 준수, 근거 없을 때 grounded=false |
| 사용량 | 상한 초과 시 429, 모든 LLM 호출이 usage\_logs에 기록 |
| 어댑터 계약 | 고정 버전 DeepTutor의 사용 엔드포인트 요청·응답 형식 유지 |
| 회귀 | 기존 로그인·결제·모의고사·오프라인 학습 시나리오 통과 |

### 13.2 교육 품질 평가 세트

| 세트 | 문항 수 | 평가 방법 |
| --- | --- | --- |
| 교재 기반 질문 | 100 | 전문가 기준 답안 대비 정확성·인용 |
| 법령 질문 | 50 | 현행 조문 일치, 시행일 표시 |
| 개념 설명 | 50 | 정확성·난이도 적합성 3점 척도 |
| 생성 문항 | 100 | 사람 검수 승인율, 자동 검증과 사람 판정 일치율 |
| 오답 분류 | 50 | 사람 분류와 일치율 |

이 세트는 Phase 0에 만들어 엔진·모델·프롬프트를 바꿀 때마다 다시 돌린다.

### 13.3 KPI

| 지표 | 초기 목표 | 측정 |
| --- | --- | --- |
| 튜터 답변 근거 제공률 | 95% 이상 | grounded=true 비율(범위 내 질문) |
| 튜터 답변 정확도 | 90% 이상 | 13.2 교재·법령 세트 |
| 생성 문항 사람 승인율 | 70% 이상 | 자동 검증 통과 문항 기준 |
| 숙달도 예측력 | AUC 0.70 이상 | 다음 문항 정답 예측 |
| 타 사용자 데이터 접근 | 0건 | 격리 테스트, 접근 로그 |
| 주요 API 성공률 | 99% 이상 | 5xx 제외 비율 |
| 튜터 첫 토큰 지연 | p95 3초 이하 | 서버 측정 |
| 취약 개념 개선 | 4주 내 평균 +15점 | 파일럿 시작 시 취약 개념의 숙달도 변화 |
| 모의고사 점수 변화 | 비교군 대비 우위 | AI 학습 사용자와 기존 학습 사용자 비교 |
| AI 답변 만족도 | 80% 이상 | 피드백 긍정 비율 |
| 학습자당 월 AI 원가 | Phase 4에서 설정 | usage\_logs 집계 |

목표치는 초기 가설이며 파일럿 결과로 보정한다. 숙달도 개선 지표는 숙달도 모델이 측정한 값이므로, 모의고사 점수 같은 외부 지표와 함께 봐야 한다.

## 14. Devin 개발 지시서 v1.1

이 장은 Devin에게 그대로 붙여 넣는 용도다. 한 번에 한 Phase만 지시하고, 아래 "공통 원칙"은 매번 함께 붙인다.

### 14.1 프로젝트명과 목표

PassOK AI Learning Engine — Cosmetic Pilot. 기존 PassOK에 개념 단위 숙달도, 적응형 문항 선택, 교재 근거 튜터, FSRS 복습을 추가한다. 시험팩은 `cosmetic` 하나다. 기존 로그인·결제·시험팩·문제은행·모의고사·오프라인 학습은 그대로 둔다.

### 14.2 공통 원칙(매 Phase 지시에 포함)

1. 기존 테이블을 수정·삭제·이름 변경하지 않는다. 신규 테이블은 `ai_` 접두사, up/down 마이그레이션 쌍으로 작성한다.
2. 기존 프론트엔드 코드는 새 메뉴 진입점과 새 화면 추가 외에는 고치지 않는다. 고쳐야 한다면 먼저 보고한다.
3. 서버는 요청 본문의 `user_id`를 쓰지 않는다. JWT `sub`만 쓰고, service role 쿼리에는 항상 `user_id` 조건을 넣는다.
4. service role 키와 LLM 키는 Python Host에만 둔다. 프론트엔드·Vercel 환경변수에 넣지 않는다.
5. DeepTutor는 `TutorEngine` 인터페이스로만 호출한다. DeepTutor 내부 모듈을 import하지 않고, PoC에서 확인하지 않은 엔드포인트를 쓰지 않는다.
6. 숙달도·채점·복습·경로는 설계서 5장의 수식과 규칙대로 구현하고, LLM 호출을 넣지 않는다. 설계서에 없는 가중치나 규칙을 만들지 말고 질문한다.
7. 모든 LLM 출력은 Pydantic 스키마로 검증하고, 모든 LLM 호출은 `ai_usage_logs`에 기록한다.
8. 모델명·상수·사용량 상한은 설정 파일로 뺀다.
9. 작은 단위로 커밋하고, 테스트 없이 완료 처리하지 않는다.
10. 기존 서비스에 영향이 있는 변경을 발견하면 작업을 멈추고 보고한다.

### 14.3 Phase 0 — 기존 시스템 조사와 PoC

조사 결과물 `docs/ai-learning/01-existing-system-audit.md`에 다음을 답한다.

- AI 학습을 올릴 앱과 프레임워크(Next.js / SPA), 라우팅 방식
- 모의고사·퀴즈·오답 기록의 저장 위치(Supabase 테이블 / localStorage 키)와 스키마
- 문제은행의 저장 위치, 안정적인 문항 ID 존재 여부, 문항 수(과목별)
- 시험팩·이용권(Pro)·관리자 권한 테이블과 FK 대상
- 기존 RLS 정책 목록과 문제점
- Python Host 후보(비용·리전·Docker 지원)

PoC 결과물 `docs/ai-learning/02-engine-poc.md`:

1. DeepTutor 최신 안정 릴리스를 Docker로 실행하고 버전을 기록한다.
2. 사용할 HTTP/SSE 엔드포인트의 요청·응답을 실제 호출로 문서화한다. 메모리·도구 실행을 끄는 설정과 auth 비활성화 상태에서 내부망 전용 배치를 확인한다.
3. 한국어 교재 PDF를 인덱싱하고 10.2의 추출 품질을 측정한다(기본 RAG 엔진, LightRAG).
4. 같은 자료로 pgvector 기반 `PgVectorEngine`을 만든다.
5. 13.2 평가 세트 중 교재 100·법령 30문항으로 두 엔진을 비교하고 12.1 기준으로 판정 제안을 쓴다.

평가 세트의 기준 답안은 사용자가 제공한다. 없으면 초안만 만들고 검수를 요청한다.

#### DeepTutor 벤더링·업데이트 절차 (Phase 0 작업)

2.2의 "DeepTutor 벤더링·업데이트 절차"를 따른다. Phase 0에서 할 일은 다음과 같다.

1. 기존 로컬 사본이 ZIP 등 git 이력이 없는 사본이면 폐기한다. `vendor/deeptutor`에 submodule로 다시 받는다.
2. 최신 안정 태그를 고르고 `passok/v<버전>` 브랜치를 만든다. 고른 근거(릴리스 노트 요약)를 기록한다.
3. 로컬 빌드 이미지 `passok/deeptutor:<버전>-p0`로 PoC를 수행한다. 원격 이미지(`latest`)는 쓰지 않는다.
4. 메모리 끄기, 도구 실행 끄기, auth 비활성, 내부망 전용을 소스 패치가 아닌 설정으로 처리할 수 있는지 확인한다. 패치가 필요하면 패치마다 사유를 기록한다.
5. 로컬 소스는 실제 HTTP/SSE 엔드포인트를 확인하는 데만 쓴다. PassOK 코드에서 DeepTutor 모듈을 import하지 않는다.
6. `scripts/deeptutor-check-update.sh`를 만든다. 새 태그 목록, 현재 버전과의 diff 통계, 사용 중인 엔드포인트 관련 파일의 변경 여부를 출력하는 점검 전용 스크립트다. 반영은 하지 않는다. §2.2 "주기적 신규 태그 감지·승격 후보 파이프라인"의 1단계(주기 감지)는 후속 Phase에서 이 스크립트를 worker 작업으로 호출해 구현한다.
7. `docs/ai-learning/deeptutor-version.md`를 처음 작성한다.

완료 조건: 네트워크를 끊은 상태에서 `docker compose up`으로 DeepTutor가 기동된다(LLM 호출 제외). 점검 스크립트가 다음 태그와의 차이를 출력한다.

### 14.4 Phase 1 — 기반 연동

```text
ai-learning/
├── app/
│   ├── main.py, config.py, deps.py
│   ├── api/v1/        profile, dashboard, mastery, diagnostic, questions,
│   │                  attempts, tutor, path, review, practice, jobs, admin/
│   ├── core/          mastery.py, fsrs_scheduler.py, path_engine.py,
│   │                  error_classifier.py, selector.py   (순수 함수, LLM 없음)
│   ├── services/      tutor_service, attempt_service, generation_service, usage_service
│   ├── engines/       base.py(TutorEngine), deeptutor_http.py, pgvector.py, mock.py
│   ├── db/            supabase.py, repositories/
│   ├── schemas/       Pydantic 모델
│   ├── security/      jwt.py, rate_limit.py, quotas.py
│   └── workers/       runner.py, jobs/
├── migrations/        0001_up/down, 0002_rls
├── tests/             unit/, api/, rls/, contract/
├── docker-compose.yml (api, worker, deeptutor)
└── README.md
```

구현: FastAPI, JWT(JWKS) 검증, `TutorEngine` 3종, 교재 인덱싱 작업, `/tutor/*` SSE, 사용량 기록과 상한, 구조화 로그. 완료 조건은 G1.

### 14.5 Phase 2 — Learner Model과 개념 태깅

- 6장 DDL과 7장 RLS를 적용한다. Phase 0에서 찾은 FK를 `TODO(FK)` 자리에 넣는다.
- 기존 문항을 읽어 `ai_question_items`·`ai_question_keys`에 등록하는 스크립트(재실행 가능, 원본 ID 기준 upsert).
- 개념 후보 제안 작업과 관리자 검수 화면(4.3).
- `core/mastery.py`, `core/fsrs_scheduler.py`와 `/attempts`. 수식 테스트를 먼저 작성한다.
- `/legacy-import`: 로컬 기록 업로드, 중복 방지, `source_weight = 0.5`.
- 완료 조건은 G2.

### 14.6 Phase 3 — 적응형 학습과 문제 풀

- 초기 진단(5.5), 문항 선택(8.3), 경로 규칙 엔진(5.5), 오답 분류(5.4).
- 문항 생성·자동 검증 작업과 검수 화면(9장). 생성 문항은 절대 자동 승인하지 않는다.
- 연습 모드(9.3)는 마지막에 구현한다.
- 완료 조건은 G3.

### 14.7 Phase 4 — UI와 파일럿

기존 디자인과 컴포넌트를 재사용한다. 화면: 학습 대시보드, AI 튜터(스트리밍·인용·피드백), 나의 지식 지도(미평가·판정 보류·취약·부족·보통·양호·숙달), 오늘의 학습 경로, 오늘의 복습, 오답 분석, 사용량 표시. 모바일 PWA 레이아웃을 우선한다. 라우트는 Phase 0에서 확인한 기존 규칙을 따른다. 완료 조건은 G4.

### 14.8 최종 완료 시나리오(G4)

1. 기존 PassOK 계정으로 로그인한다.
2. Cosmetic 시험팩에서 AI 학습을 시작한다.
3. 로컬 풀이 기록 이관에 동의하고 이관한다.
4. 초기 진단을 푼다(기존 기록이 있는 과목은 건너뜀).
5. 지식 지도에 미평가와 판정 개념이 구분되어 표시된다.
6. 취약 개념 TOP 5가 표시된다.
7. 튜터가 교재 인용과 함께 취약 개념을 설명한다.
8. 승인 문항이 숙달도에 맞는 난이도로 출제된다.
9. 오답에 유형이 표시된다.
10. 숙달도가 갱신되고 변화량이 보인다.
11. 다음 날 경로가 바뀐 숙달도를 반영한다.
12. 복습 일정이 생성되고 오늘의 복습에 나타난다.
13. 학습 리포트(기간별 숙달도 변화, 학습 시간, 오답 유형 분포)를 볼 수 있다.

### 14.9 Phase 완료 보고 형식

```text
[Phase]          단계명
[Gate]           관문 기준별 측정값과 통과 여부
[Implemented]    구현 기능
[Files]          수정 파일 / 신규 파일
[DB Changes]     마이그레이션, 롤백 확인 여부
[API Changes]    신규·변경 엔드포인트
[Tests]          실행한 테스트와 결과(실패 포함)
[Security]       인증, RLS, 사용자 격리 확인 결과
[Cost]           측정된 호출·토큰·비용
[Assumptions]    설계서에 없어 임시로 정한 것
[Known Issues]   남은 문제
[Next Steps]     다음 단계
```

## 15. 미결 사항

Phase 0 종료 전에 사용자가 결정할 항목이다.

- [ ] AI 학습을 올릴 앱: PassOK 본체 vs Passmula
- [ ] Python Host 호스팅 업체와 리전(한국 사용자 지연 고려)
- [ ] LLM·임베딩 제공자와 모델 등급별 후보
- [ ] 이용권별 사용량 상한(8.4)과 AI 기능의 무료 제공 범위
- [ ] 교재 PDF별 저작권 상태(자체 제작 / 이용 허락 / 미확인)
- [ ] 평가 세트 기준 답안 작성 주체와 일정
- [ ] 문항·매핑 검수 시간 확보 방안(1인 검수의 품질 점검 방식)
- [ ] 튜터 대화 보관 기간(초안 12개월)과 개인정보 처리방침 개정

### repo 규약 이식 시 추가된 검토 항목 (2026-11-27 저장소 리뷰)

- [ ] **G1~G3 관문 기준 텍스트 확보** — 원본 임베디드 콘텐츠(§12 도식)에만 정의. 14.4~14.6의 "완료 조건은 G1/G2/G3" 참조가 판정 불가 — 원본 확보 또는 본문에 관문별 측정 기준 재정의 필요
- [ ] **기존 인프라와의 관계 확정(흡수/병행/대체)** — ①숙달도: PassLoop `computeMastery`(AI-40, 사전 보정 정답률×반감) vs §5.2 Beta-Binomial ②복습: 클라이언트 FSRS-4.5/6(DOC-DSN-32) vs 서버 `ai_review_schedules` ③개념: 기존 conceptId(`subj:§N.M`, AI-09·AI-40) vs 신규 Knowledge Unit taxonomy ④튜터: 운영 중 `textbook_qa`(AI-36, SemanticIndex+인용 강제) — **G0 비교군에 현행 textbook_qa를 포함해야 진짜 질문에 답함** ⑤쿼터: `ai_usage`(AI-26) vs `ai_usage_logs` ⑥검증: gen-gate(AI-37)·dupcheck(AI-07)·check:answers(CQ-06)·CQ-07/08·AI-45/46(DOC-DSN-57) vs §9.2 자동 검증 ⑦법령 감시: LAW_OC_KEY 크론·`check:reffresh`·`ai:stale`(AI-12) vs §10.4 워처 ⑧RAG 소스: 기존 교재 md·`ref_md`(PDF 변환·검증 완료) 재사용 시 §10.2의 PDF 파싱 리스크 상당 부분 해소
- [ ] **`ai_attempts.idempotency_key` 전역 unique** — 클라이언트 생성 키라 사용자 간 충돌 시 타인 제출 차단·누설 가능 → `unique(user_id, idempotency_key)` 변경 검토
- [ ] **`ai_question_items` 중복 방지** — `source_question_id`가 NULL인 `ai`/`manual` 행은 unique 무력화(NULL distinct) → AI 문항 중복 방지 장치 별도 필요
- [ ] **숙달도 반감 감쇠 적용 시점** — §5.2는 신규 응답 시에만 감쇠(lazy)인데 `mastery_score`는 generated column — 응답 없는 동안 표시값이 감쇠하지 않음(묵은 "숙달" 유지). 야간 재계산 배치 적용 여부 확정
- [ ] **로컬 FSRS 카드 상태 이관 여부** — legacy_import는 "풀이 기록"만 정의. 로컬 복습 스케줄(stability·difficulty·due)은 버리고 재구축할지 이관할지 미정
- [ ] **AI 학습 온라인 전용 명시** — 채점이 서버로 이동하면 AI 학습 경로는 네트워크 필수. PWA 오프라인 기본값(기존 학습 유지)과의 기능 경계를 UX에 명시
- [ ] **`ai_document_sources.updated_at` 부재** — `index_status`가 pending→ready로 갱신되는데 갱신 시각 추적 컬럼·트리거 없음
- [ ] **`error_type` enum ↔ §5.4 한글 유형 매핑표 부재** — `misconception`/`confusion` 두 값이 "개념 미이해"/"개념 혼동"에 대응하는 매핑을 문서에 고정 필요

## 참고 자료

- [DeepTutor GitHub 저장소](https://github.com/HKUDS/DeepTutor) — Apache-2.0, 작성일 기준 최신 릴리스 v1.6.15(2026-10-19), `/api/*`·`/ws/*` 경로, 지식베이스별 RAG 엔진 선택, 계층형 메모리, 선택적 멀티유저·auth.json, Docker 이미지
- [DeepTutor Releases](https://github.com/HKUDS/DeepTutor/releases)
- v1.0 설계서: PassOK\_DeepTutor\_Hybrid\_AI\_Learning\_Design\_v1.0.md(2026-11-27)
