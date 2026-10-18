# AI 제작 지원 설계 — 문제·해설 초안 자동화

> 상위 문서: `../ARCHITECTURE.md` (전체 구조) · `../SPEC.md` (요구사양) · `../runbooks/CONTENT_WORKFLOW.md` (콘텐츠 변경 절차) · `../runbooks/TEXTBOOK_AUTHORING_GUIDE.md` (교재 작성 지침)
> **문서 ID**: DOC-DSN-33
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `CQ-01~06` (콘텐츠 감사 게이트 — §3.17) · `SEM-05` (임베딩 번들 — 중복 탐지에 재사용) · `DA-02` (빌드 번들) · `DA-13` (시험 도메인 격리) · `AN-10` (개념 앵커 — 생성 문항의 인용 부여 기준)
> **상태**: 구현됨 (도구 9종 — `ai:explain` 등 `ai:*` npm 스크립트) — 요구사양은 SPEC.md §3.27 `AI-01~13`. LLM 의존 경로는 `--dry-run`/무키 시 스캔·골격만 출력하며, Phase A(`ai:explain`)부터 실사용 리뷰 데이터를 쌓는다 (§9)

## 1. 배경·목적

문제은행(`content/exams/<id>/문제은행/*.md`)은 `### Q{n}` 문항 + 파일 말미 정답 블록(정답·허용 정답·📖 근거 인용·해설) 포맷으로 수작업 제작 중이다. 제작 비용이 크고 해설 커버리지가 불완전하므로 LLM을 제작 보조로 도입하되, **품질 기준은 사람 작성과 동일하게 유지**한다.

핵심 전제: 이 저장소는 이미 "근거 강제 + 자동 검증" 체계를 갖추고 있다 — `check:answers`(CQ-06 정답↔인용 지지 검증)·`sync:citations`(인용 라인 동기화)·`audit:combo`(정답 유일성·모순쌍)·`check:manifest`(문항 수 정합)·`check:numbering`. AI 생성물도 동일 게이트를 통과해야만 머지되므로, 환각 리스크를 기존 인프라가 그대로 흡수한다.

## 2. 설계 원칙

1. **AI는 초안만 생산** — 생성물은 사람 리뷰·수정을 거쳐 `문제은행/*.md`에 편입된다. 리뷰 없는 직접 반영 경로는 만들지 않는다.
2. **근거 강제** — 모든 생성 문항·해설은 인용(교재 또는 참조자료 `파일#LNN`)을 동반해야 한다. 인용이 없는 초안은 폐기 대상으로 표시한다.
3. **콘텐츠 정본 불변** — 정본은 `content/` md이며 AI 산출물은 `tmp/ai_drafts/`(gitignore)에 둔다. `content/` 직하에 초안을 두면 `check:manifest` 미등록 md 역방향 경고를 유발한다.
4. **키는 로컬 전용** — LLM API 키는 `.env`·환경변수만 사용. 저장소·정적 번들·SW 캐시에 절대 포함하지 않는다 (supabase-config 주석과 동일 보안 모델).
5. **멀티시험 중립** — `exams.json`/`manifest.json`·콘텐츠 팩 구조만 의존하고 시험별 특화 로직은 두지 않는다 (DA-13).

## 3. 적용 범위 — 안별 판정

| 안 | 내용 | 판정 |
|---|---|---|
| A. 제작 시점(author-time) 도구 | `tools/ai/` 스크립트 → 초안 생성 → 리뷰 편입 | **채택** — 리뷰 깊이는 §3.1 수준표로 단계 하향 |
| B. 빌드타임 해설 사전생성 번들 | 빌드 시 해설을 생성해 정적 번들에 포함 | 기각 — 해설은 원문 md 관리 관례라 A로 흡수. 번들 팽창·신선도 게이트만 늘어남 |
| C. 런타임 AI (문항별 맞춤 해설·질의응답) | 앱에서 LLM 실시간 호출 | **보류** — §8 |

### 3.1 리뷰 자동화 수준 — 사람 리뷰는 자동화의 부재가 아니라 수동 게이트 단계

생성·인용 해석·정답 지지 검증·중복 탐지·포맷 정합은 전부 자동화되어 있고, 사람에게 남는 것은 채택 결정뿐이다. CI의 "required approval"처럼 수동 단계가 있어도 파이프라인 자체는 자동이다. 리뷰 깊이는 실측 데이터를 쌓으며 단계적으로 내린다:

| 수준 | 구조 | 리뷰 부담 |
|---|---|---|
| **L0 전수 리뷰** (Phase A 기본) | 모든 초안을 사람이 채택·수정·폐기 | 문항 전체 |
| **L1 예외만 리뷰** (승격 목표) | 자동 검증 전부 통과(인용 LNN 해석·`check:answers` 지지·`ai:dupcheck`·`audit:combo`) **+ 생성기 자기검증 + LLM-as-judge 합의** 시 자동 편입 — 의심 항목만 리뷰 큐 | 실패·모호분만 |
| **L2 샘플링 리뷰** | 자동 편입 + 배치 표본 검토. `ai-draft` 배치 태그로 롤백·오류율 추적 | 배치당 표본 |

- **생성기 자기검증**: 생성기가 출력 전에 자기 인용을 실제 라인으로 해석해 "지지 여부"를 확인, 실패 시 재생성 — 초안 품질 1차 필터
- **LLM-as-judge**: 생성과 다른 모델·프롬프트가 초안을 채점 — 단일 모델 편향 완화. 판정 불일치 = 자동으로 리뷰 큐행
- **승격 조건(제안)**: L0에서 채택률·`check:answers` 통과율로 자동 검증의 실효 오류율을 추정하고, 표본 오류율이 연속 N배치 임계 미만이면 L1 승격 — 수치는 Phase A 데이터로 확정

## 4. 도구 구성 (`tools/ai/`, npm 스크립트)

| 스크립트 | 도구 | 동작 |
|---|---|---|
| `ai:explain` | `tools/ai/ai_explain.js` | 해설 누락 문항 스캔 → 정답+인용 근거 구절을 컨텍스트로 해설 초안 생성 → `tmp/ai_drafts/explain_<과목>.md` |
| `ai:draft` | `tools/ai/ai_draft_questions.js` | 지정 교재 파일·섹션 범위를 청크 분할 → `### Q{n}` 초안(선지·정답·인용 LNN·해설) 생성 |
| `ai:distractors` | `tools/ai/ai_distractors.js` | 단답형 **허용 정답 변형**(띄어쓰기·약어·한자 병기)과 선다형 오답 선지 보강 제안 |
| `ai:dupcheck` | `tools/ai/ai_dupcheck.js` | `build:embeddings` 산출물(SEM-05 이웃 인덱스)로 초안↔기존 문항 유사도 상한 검사 — 중복 출제 방지 |
| `ai:statements` | `tools/ai/ai_statements.js` | 복수정답형 진술 설계 — 참 진술의 거짓 반전 변형(수치·주체·허용↔금지 바꿈) + `conceptId`별 진술 재조합 후보. 모순쌍·위치편향은 `audit:combo`가 그대로 게이트 |
| `ai:stale` | `tools/ai/ai_stale_scan.js` | 법령 개정 영향 분석 — ref_md 개정 diff를 해석해 인용 문항의 정답·해설 유효성을 재판정, stale 후보 리포트. `check:reffresh`의 해시 변경 감지를 의미 판정으로 확장 |
| `ai:coverage` | `tools/ai/ai_coverage.js` | 출제 커버리지 갭 분석 — 교재 청크 ↔ 기존 문항을 임베딩(SEM-05)으로 매핑해 미출제 중요 구간 리포트 → `ai:draft` 투입 범위 결정 근거 |
| `ai:tag` | `tools/ai/ai_tag.js` | `tags`(STANDARD_TAGS)·`difficulty`·`conceptId` 의미 라벨 자동 제안 — 규칙 기반 `inferTags`의 의미 판단 한계 보완 |
| `ai:lint` | `tools/ai/ai_lint.js` | 발문 품질 검수 — 이중부정·모호 지문·답이 새는 발문·진술만으로 추론 가능한 패턴 등 기계 게이트가 못 잡는 영역 |
| `ai:apply` | `tools/ai/ai_apply.js` | 리뷰된 `explain_*.md` 초안의 `> **해설**` 행을 문제은행 정답 블록에 편입 — 기본 미리보기, `--write` 반영. 초안 파일명은 `explain_<examId>_<examKey>.md` (시험 간 키 충돌 방지) |
| `ai:stmtfb` | `tools/ai/ai_stmt_feedback.js` | 진술 단위 오답 피드백 — combo 드릴의 각 진술(sid)에 "왜 참·거짓인지 + 혼동 유형(수치·주체·극성)" 1~2문장 초안 생성. `--apply` 시 리뷰된 초안을 `content/exams/<id>/피드백/stmt_explain.json` 정본에 편입 → `build:drills`가 `statement.explain`에 병합 → perStatement 오판 표시 경로에 노출. `--stats <백업JSON>`로 statement-tracker 오판 통계를 대상 선정에 연결 (오판수 내림차순·`--min-wrong`, 극단 오판율은 ⚠️ 콘텐츠 검수 후보 표시) |
| 공통 | `tools/ai/llm_client.js` | 공급자 추상화(OpenAI/Anthropic/Gemini 중 env로 선택)·키 로드·재시도·출력 JSON 스키마 검증·토큰 비용 로깅 |

공통 제약:
- **grounded generation만** — 프롬프트 컨텍스트는 해당 교재 청크 + `참조자료/ref_md` 원문 조각으로 제한. 모델의 사전 지식에 의존한 문장은 인용 단계에서 걸러진다.
- 출력은 문제은행 정답 블록 포맷(정답/허용 정답/`📖 근거` 링크+인용문/해설)을 그대로 따른다 — 파서·게이트 변경 불요.
- 초안 md 상단·문항별 메타 주석 `<!-- ai-draft: model=<id> date=<ISO> reviewed=no -->` — 리뷰 추적용, 편입 시 제거.
- 법령 인용은 `참조자료/ref_md`의 현행본만 — 생성 시점 고시 판본이 `notice_status.json`과 어긋나면 경고.

## 5. 검증·편입 절차

```
tools/ai 실행 → tmp/ai_drafts/*.md (초안)
  → 사람 리뷰 (채택·수정·폐기, 메타 주석 제거)
  → 문제은행/파일에 편입
  → npm.cmd run check:content -- --build  (전수 게이트)
      check:answers · sync:citations · audit:combo · audit:cards
      · check:manifest · check:numbering · check:metasections
  → 커밋 (pre-commit/pre-push 게이트 추가 통과)
```

추가 품질 장치:
- **배치 태깅**: 편입 커밋 subject에 `ai-draft` 포함 관례 — `check:answers` 기준선 변화와 상관시켜 AI 배치별 오류율을 사후 추적
- **dupcheck 게이트화**: `ai:dupcheck` 결과 유사도 임계 초과 문항은 리뷰 전 자동 폐기 표시

## 6. 비용·모델

| 항목 | 규모 추정 | 비고 |
|---|---|---|
| 해설 생성 | 문항당 ~1.5K 토큰 × N문 — 일회성 | 최저가 한국어 가능 모델로 충분 |
| 문제 초안 | 청크당 ~4K 토큰 — 회차별 세트 제작 시 | 인용 정확도가 모델 선택의 핵심 기준 |
| 운영 비용 | 없음 | 제작 시점 1회성 호출뿐 — 런타임 과금 없음 |

모델 선택 기준(미결 §10): 인용 LNN 정확도 · 한국어 법령 문체 · JSON 스키마 준수율. 평가는 소량 배치(10문)로 2~3개 공급자 비교 후 결정.

## 7. 리스크

| 리스크 | 완화 |
|---|---|
| 환각 정답·엉뚱한 인용 | 인용 LNN 강제 → `check:answers`(CQ-06)가 의미 지지 검증. 미지지 문항은 기준선 게이트가 차단 |
| 유사 문항 범람 | `ai:dupcheck` 임베딩 상한 + `audit:combo` 중복 진술집합 검사 |
| 법령 개정 후 stale 생성물 | ref_md 현행본만 컨텍스트 투입 + `check:reffresh`·`notice_status`로 고시 판본 추적 (기존 절차와 동일) |
| 교재 텍스트의 외부 API 전송 | 자체 저작 교재는 문제없음. 외부 저작물 발췌가 포함된 파일은 전송 범위에서 제외 (§10 미결 — 파일 단위 allowlist) |
| 생성 남용으로 기준 품질 하락 | 초안은 초안일 뿐 — 리뷰어 채택률을 배치 리포트로 기록해 저품질 배치 패턴 감지 |

## 8. 런타임 AI (보류 평가)

앱 내 실시간 AI(문항 맞춤 해설·질의응답)는 정적 PWA 특성상 API 키를 클라이언트에 둘 수 없어 두 경로뿐이다:

- **BYOK** — 사용자 자기 키 입력(localStorage). 서버 불요·공수 작으나 수험생 일반 UX로는 무리. 선례 있음: 기성품 사진 인식의 Gemini Flash BYOK (`PRODUCT_VISION_DESIGN.md`)
- **서버 프록시** — Vercel Function + Pro 게이팅. 호출당 비용·남용 방지(rate limit·월 상한) 설계 필요. `SUPABASE_DESIGN.md` §12.2의 Better Auth+Neon 경로와 결합 가능하나 "얇은 선택 계층" 원칙(§1-3)과 충돌 — Pro 수익모델 확정 후 별도 설계

## 9. 단계별 로드맵

| Phase | 내용 | 검증 |
|---|---|---|
| A | `ai:explain` 해설 보강 — 누락 문항 목록화 → 초안 → 리뷰 편입 (**L0 전수 리뷰**) | 초안 10문 수동 평가 → `check:answers` 통과율 |
| B | `ai:draft` 문제 초안 + `ai:dupcheck` 중복 게이트 + `ai:distractors` + `ai:statements`(진술 반전 변형) + `ai:tag`(태그·난이도) + `ai:lint`(발문 검수) | 회차 단위 배치 리뷰 — 채택률·게이트 통과율 기록 |
| B+ | **L1 승격** — 자동검증+자기검증+judge 합의 문항 자동 편입, 예외만 리뷰 큐 | §3.1 승격 조건 충족 시 — 자동 편입분의 샘플 오류율 추적 |
| B2 | `ai:coverage`(커버리지 갭) + `ai:stale`(법령 개정 영향) — 문항 생산이 아닌 **제작 우선순위·유지보수 판단** 지원. 오판 통계(perStatement·conceptId) 기반 보강 영역 제안은 이 단계 후보 | 갭 리포트의 실제 투입률 · stale 리포트 적중률 수동 검증 |
| C | 런타임 AI — BYOK 우선 평가, 프록시는 Pro 연동 시 재검토 | 별도 설계 문서 |

## 10. 미결 사항

1. 모델 공급자 선택 — 10문 샘플 배치 비교 후 결정
2. 외부 저작물 발췌 파일의 LLM 전송 범위 — allowlist 방식
3. 해설 어조·길이 스타일 가이드 — 기존 해설 예문을 few-shot으로 투입
4. `ai-draft` 배치 태그의 커밋 subject 규약 확정
5. 법령 개정 시 `ai:stale` 자동 실행 여부 — `check:reffresh` 변경 감지를 트리거로 워크플로화할지, 수동 실행에 둘지
