# 🔗 TRACE MATRIX — 요구사양 추적 매트릭스

> **문서 ID**: DOC-DEV-04
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (본 문서가 추적 산출물)
> ⚠️ 자동 생성 파일 — `npm run build:trace`로 재생성. 직접 편집 금지.
> 입력 해시: bb910c3eb24ed4e8
> 생성: 2026-10-22 · 원천: SPEC.md(578개 ID) + @spec 태그 + 문서 헤더

| 열 | 의미 | 원천 |
|----|------|------|
| 상태 | SPEC의 구현 상태 (✅·🟡·미구현 등) | SPEC.md 표 마지막 셀 |
| 검증 수단 | 파생 분류 — E2E 테스트(tests/e2e 참조)/테스트/도구 검증/구현(테스트 갭)/문서 검토 | 연결된 산출물 유형 |
| 문서 | 해당 요구사항을 다루는 문서 (DOC-ID) | 각 문서 헤더 "관련 SPEC ID" |
| 소스 | 구현 코드 파일 | `// @spec` 태그 |
| 테스트 | 검증 테스트 파일 | `// @spec` 태그 (tests/) |
| 보고서 | 분석·결과 보고서 | report_archive 헤더 |
| 출처 | 요구사항의 기원 (법령·시험 규정·사업 문서) | SPEC 부록 "요구사항 출처" 표 |

**커버리지 요약**: 요구사항 578개 — 문서 연결 427 · 소스 연결 515 · 테스트 연결 549 · 보고서 연결 109

---

## 3.1 대시보드

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| D-01 | ✅ | 테스트 | — | html/views/dashboard.html<br>index.html<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-02 | ✅ | 테스트 | — | src/app-dashboard.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-03 | ✅ | 테스트 | — | src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-04 | ✅ | 테스트 | — | src/app-dashboard.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-05 | ✅ | 테스트 | — | src/app-dashboard.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-06 | ✅ | 테스트 | — | src/app-dashboard.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-07 | ✅ | 테스트 | — | src/views/daily-challenge.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-challenge.dom.test.js<br>tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-08 | ✅ | 테스트 | DOC-DSN-21 | src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-09 | ✅ | 테스트 | — | css/dashboard.css<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-10 | ✅ | 테스트 | — | src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-11 | ✅ | 테스트 | — | src/recommendations.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-12 | ✅ | 테스트 | — | src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-13 | ✅ | 테스트 | — | src/recommendations.js<br>src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-14 | ✅ | 테스트 | — | src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-15 | ✅ | 테스트 | DOC-DSN-32 | src/views/dashboard.js<br>src/views/subject-stats.js | tests/dom/study/study-dashboard.dom.test.js | DOC-ARC-05<br>DOC-ARC-10 | — |
| D-16 | ✅ | 테스트 | — | html/views/dashboard.html<br>index.html<br>src/analysis-engine.js<br>src/views/dashboard.js<br>…외 1개 | tests/unit/engine/analysis-engine.test.js | — | — |
| D-17 | ✅ | 테스트 | DOC-DSN-16 | src/study-tracker.js<br>src/views/dashboard.js<br>src/views/study-calendar.js<br>src/views/subject-stats.js | tests/dom/study/study-calendar.dom.test.js<br>tests/dom/study/study-dashboard.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| D-18 | ✅ | 테스트 | DOC-ADR-18<br>DOC-DSN-32 | src/spaced-repetition.js | tests/unit/engine/fsrs.test.js | — | — |
| D-19 | ✅ | E2E 테스트 | DOC-DSN-32 | src/spaced-repetition.js | tests/e2e/exam-risk.spec.js<br>tests/unit/engine/fsrs.test.js<br>tests/unit/engine/today-queue.test.js | — | — |
| D-20 | ✅ | E2E 테스트 | DOC-DSN-32 | src/spaced-repetition.js | tests/e2e/exam-risk.spec.js<br>tests/unit/engine/fsrs.test.js | — | — |
| D-21 | ✅ | 테스트 | DOC-DSN-32 | src/analysis-engine.js | tests/unit/engine/analysis-engine.test.js | — | — |
| D-22 | ✅ | E2E 테스트 | DOC-ADR-18<br>DOC-DSN-32 | src/analysis-engine.js<br>src/knowledge-tracing.js<br>src/spaced-repetition.js<br>src/views/exam-sim-arena.js<br>…외 1개 | tests/e2e/analysis-view.spec.js<br>tests/unit/engine/analysis-engine.test.js<br>tests/unit/engine/fsrs.test.js<br>tests/unit/engine/knowledge-tracing.test.js | — | — |
| D-23 | ✅ | 테스트 | — | src/study-tracker.js<br>src/views/analysis-view.js<br>src/views/dashboard-queue.js | tests/unit/engine/study-tracker.test.js | — | — |
| TQ-01 | ✅ | 테스트 | DOC-DSN-32 | src/views/dashboard-queue.js<br>src/views/dashboard.js | tests/dom/study/study-dashboard.dom.test.js<br>tests/unit/engine/today-queue.test.js | — | — |
| TQ-02 | ✅ | 테스트 | — | src/views/dashboard-queue.js | tests/unit/engine/today-queue.test.js | — | — |
| TQ-03 | ✅ | 테스트 | — | src/views/dashboard-queue.js | tests/dom/study/study-dashboard.dom.test.js<br>tests/unit/engine/today-queue.test.js | — | — |
| TQ-04 | ✅ | 테스트 | — | — | tests/unit/engine/today-queue.test.js | — | — |
| TQ-05 | ✅ | 테스트 | — | src/views/dashboard-queue.js | tests/dom/study/study-dashboard.dom.test.js | — | — |

## 3.1.5 학습 진단

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| AN-01 | ✅ | E2E 테스트 | DOC-DSN-07 | html/views/analysis.html<br>index.html<br>src/analysis-engine.js<br>src/views/analysis-view.js | tests/dom/study/study-dashboard.dom.test.js<br>tests/e2e/analysis-view.spec.js<br>tests/fixtures/analysis-seed.js<br>tests/unit/engine/analysis-engine.test.js | DOC-ARC-09 | — |
| AN-02 | ✅ | E2E 테스트 | DOC-DSN-07<br>DOC-DSN-18<br>DOC-DSN-21 | src/analysis-engine.js<br>src/views/analysis-view.js<br>src/views/quiz-wrong-cause.js | tests/dom/study/study-dashboard.dom.test.js<br>tests/e2e/analysis-view.spec.js<br>tests/fixtures/analysis-seed.js<br>tests/unit/engine/analysis-engine.test.js | DOC-ARC-09 | — |
| AN-03 | ✅ | E2E 테스트 | DOC-DSN-07 | src/views/analysis-view.js | tests/dom/study/study-dashboard.dom.test.js<br>tests/e2e/analysis-view.spec.js<br>tests/fixtures/analysis-seed.js | DOC-ARC-09 | — |
| AN-04 | ✅ | E2E 테스트 | — | src/views/analysis-view.js | tests/e2e/analysis-view.spec.js<br>tests/fixtures/analysis-seed.js<br>tests/unit/gates/reader-analysis-gates.test.js | — | — |
| AN-05 | ✅ | E2E 테스트 | — | src/recommendations.js<br>src/views/analysis-view.js<br>src/views/score-estimate.js | tests/e2e/analysis-view.spec.js<br>tests/fixtures/analysis-seed.js<br>tests/unit/engine/analysis-deepening.test.js | — | — |
| AN-06 | ✅ | 테스트 | — | src/recommendations.js<br>src/views/analysis-view.js | tests/unit/engine/analysis-deepening.test.js | — | — |
| AN-07 | ✅ | 테스트 | DOC-DSN-18 | src/analysis-engine.js<br>src/recommendations.js<br>src/views/analysis-view.js | tests/unit/engine/analysis-deepening.test.js | — | — |
| AN-08 | ✅ | 테스트 | — | src/analysis-engine.js<br>src/views/analysis-view.js | tests/fixtures/analysis-seed.js<br>tests/unit/engine/analysis-deepening.test.js | — | — |
| AN-09 | ✅ | E2E 테스트 | DOC-DSN-18 | html/views/analysis.html<br>index.html<br>src/analysis-engine.js<br>src/views/analysis-view.js | tests/dom/study/study-dashboard.dom.test.js<br>tests/e2e/analysis-view.spec.js<br>tests/unit/engine/analysis-deepening.test.js | — | — |
| AN-10 | ✅ | E2E 테스트 | DOC-DSN-18<br>DOC-DSN-33 | tools/build/textbook_anchors.js | tests/e2e/analysis-view.spec.js<br>tests/unit/content/textbook-anchors.test.js | — | — |

## 3.2 플래시카드

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| F-01 | ✅ | 테스트 | DOC-REF-03 | css/study.css<br>html/views/flashcard.html<br>index.html<br>src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-02 | ✅ | 테스트 | DOC-REF-03 | css/study.css<br>src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-03 | ✅ | 테스트 | DOC-REF-03 | src/views/flashcard.js<br>src/views/listeners-flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-04 | ✅ | 테스트 | DOC-REF-03 | src/views/flashcard.js<br>src/views/listeners-flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-05 | ✅ | 테스트 | DOC-REF-03 | src/utils.js<br>src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-06 | ✅ | 테스트 | DOC-REF-03 | src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-07 | ✅ | 테스트 | DOC-ADR-18<br>DOC-DSN-32<br>DOC-REF-03 | src/fsrs.js<br>src/spaced-repetition.js<br>src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js<br>tests/unit/app/property-based.test.js<br>tests/unit/engine/fsrs.test.js | DOC-ARC-05 | — |
| F-08 | ✅ | 테스트 | DOC-ADR-18<br>DOC-DSN-32<br>DOC-REF-03 | src/fsrs.js<br>src/spaced-repetition.js<br>src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js<br>tests/unit/app/property-based.test.js<br>tests/unit/engine/fsrs.test.js | DOC-ARC-05 | — |
| F-09 | ✅ | 테스트 | DOC-DSN-32<br>DOC-REF-03 | src/spaced-repetition.js<br>src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js<br>tests/unit/app/property-based.test.js<br>tests/unit/engine/fsrs.test.js | DOC-ARC-05 | — |
| F-10 | ✅ | 테스트 | DOC-REF-03 | src/views/flashcard.js | tests/dom/study/study-flashcard.dom.test.js | DOC-ARC-05 | — |
| F-11 | ✅ | 테스트 | DOC-ADR-18<br>DOC-DSN-32 | src/fsrs.js | tests/unit/engine/fsrs.test.js | — | — |

## 3.3 퀴즈

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| Q-01 | ✅ | 테스트 | DOC-REF-01 | html/views/quiz.html<br>index.html<br>src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-02 | ✅ | E2E 테스트 | DOC-REF-01 | src/views/listeners-quiz.js<br>src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js<br>tests/e2e/flows.spec.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-03 | ✅ | 테스트 | DOC-REF-01 | src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-04 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/listeners-quiz.js<br>src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-05 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/utils.js<br>src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-06 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/daily-challenge.js<br>src/views/quiz.js | tests/dom/study/study-challenge.dom.test.js<br>tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-07 | ✅ | E2E 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js<br>tests/e2e/flows.spec.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-08 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/quiz.js<br>src/weak-items.js | tests/dom/study/study-quiz.dom.test.js<br>tests/unit/app/property-based.test.js<br>tests/unit/engine/weak-items.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-09 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-10 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-11 | ✅ | 테스트 | DOC-DSN-04<br>DOC-REF-01 | src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js | DOC-ARC-05<br>DOC-ARC-09<br>DOC-ARC-11 | — |
| Q-12 | ✅ | 테스트 | DOC-REF-01 | src/study-tracker.js<br>src/views/quiz.js | tests/dom/study/study-quiz.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |

## 3.4 모의고사

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| E-01 | ✅ | 테스트 | — | css/exam.css<br>html/views/exam.html<br>index.html<br>src/views/exam-sim-session.js<br>…외 2개 | tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | 조제관리사 국가시험 형식 — 4과목 OMR·시간 제한 (한국산업인력공단 시행 규정) |
| E-02 | ✅ | 테스트 | — | src/views/exam-sim-session.js<br>src/views/exam-simulator.js | tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | — |
| E-03 | ✅ | 테스트 | — | src/views/exam-sim-arena.js<br>src/views/exam-sim-state.js<br>src/views/exam-simulator.js | tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | — |
| E-04 | ✅ | 테스트 | — | src/views/exam-sim-arena.js<br>src/views/exam-sim-review.js<br>src/views/exam-sim-weak.js<br>src/views/exam-simulator.js | tests/dom/exam/exam-sim-review.dom.test.js<br>tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | — |
| E-05 | ✅ | 테스트 | — | src/views/exam-sim-arena.js<br>src/views/exam-sim-draft.js<br>src/views/exam-sim-session.js<br>src/views/exam-simulator.js | tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | — |
| E-06 | ✅ | 테스트 | — | src/views/exam-sim-arena.js<br>src/views/exam-sim-review.js<br>src/views/exam-simulator.js | tests/dom/exam/exam-sim-review.dom.test.js<br>tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | — |
| E-07 | ✅ | 테스트 | — | css/exam.css<br>src/views/exam-sim-review.js<br>src/views/exam-sim-session.js<br>src/views/exam-simulator.js | tests/dom/exam/exam-sim-review.dom.test.js<br>tests/dom/study/study-simulator.dom.test.js<br>tests/unit/engine/exam-simulator-facade.test.js | DOC-ARC-05<br>DOC-ARC-10<br>DOC-ARC-11 | 시험 합격 기준 — 과목별 40점 미만 과락·전 과목 평균 60점 이상 |

## 3.5 교재 리더

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| TR-01 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-03<br>DOC-REF-04<br>…외 1개 | html/views/textbook-reader.html<br>index.html<br>src/reader/markdown-parser.js<br>src/reader/reader-format.js<br>…외 4개 | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js<br>tests/unit/content/markdown-parser-general.test.js<br>tests/unit/content/reader-format-general.test.js<br>…외 1개 | — | — |
| TR-02 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/reader-render.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-03 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-04 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-05 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/reader-render.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-markers.spec.js | — | — |
| TR-06 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader-mermaid.css<br>src/reader/mermaid-render.js<br>src/reader/mermaid-utils.js<br>src/reader/reader-toc.js<br>…외 1개 | tests/dom/reader/mermaid-zoom.dom.test.js<br>tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-advanced.spec.js<br>tests/unit/content/reader-toc.test.js<br>…외 6개 | — | — |
| TR-07 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/reader/mermaid-render.js<br>src/reader/mermaid-utils.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-markers.spec.js<br>tests/unit/mermaid/mermaid-parser.test.js<br>tests/unit/mermaid/mermaid-pipeline.test.js<br>…외 4개 | — | — |
| TR-08 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/reader/mermaid-render.js<br>src/reader/mermaid-utils.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-markers.spec.js<br>tests/unit/mermaid/mermaid-parser.test.js<br>tests/unit/mermaid/mermaid-pipeline.test.js<br>…외 4개 | — | — |
| TR-09 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/reader/markdown-parser.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-markers.spec.js<br>tests/unit/content/markdown-parser-general.test.js | — | — |
| TR-10 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/reader-ref-links.js<br>src/views/textbook-reader.js | tests/dom/reader/reader-ref-links.dom.test.js<br>tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-advanced.spec.js | — | — |
| TR-11 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-12 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/reader-progress.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-13 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-markers.spec.js | — | — |
| TR-14 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-15 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader-extras.css<br>css/reader.css<br>src/views/reader-render.js<br>src/views/reader-toolbar.js<br>…외 1개 | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-advanced.spec.js | — | — |
| TR-16 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader-extras.css<br>css/reader.css<br>src/views/reader-toolbar.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-advanced.spec.js | — | — |
| TR-16a | ✅ | E2E 테스트 | DOC-RBK-07<br>DOC-REF-05 | src/views/reader-toolbar.js | tests/e2e/reader-advanced.spec.js<br>tests/unit/gates/content-engineering.test.js | — | — |
| TR-17 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader-extras.css<br>css/reader.css<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-18 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader-extras.css<br>css/reader.css<br>src/views/reader-toolbar.js<br>src/views/textbook-reader.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-19 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/views/textbook-reader.js | tests/e2e/reader-flow.spec.js<br>tests/unit/gates/reader-analysis-gates.test.js | — | — |
| TR-20 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | src/reader/image-zoom.js<br>src/views/reader-render.js | tests/dom/misc/onboarding-zoom.dom.test.js<br>tests/e2e/reader-advanced.spec.js | — | — |
| TR-21 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader.css<br>html/views/textbook-reader.html<br>index.html<br>src/views/reader-toolbar.js | tests/e2e/toc-sidebar.spec.js | — | — |
| TR-22 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader.css<br>html/views/textbook-reader.html<br>index.html<br>src/views/reader-toolbar.js | tests/e2e/toc-sidebar.spec.js | — | — |
| TR-23 | ✅ | E2E 테스트 | DOC-DSN-11<br>DOC-RBK-07<br>DOC-REF-05 | css/reader.css<br>html/views/textbook-reader.html<br>index.html<br>src/views/reader-toolbar.js | tests/e2e/toc-sidebar.spec.js | — | — |
| TR-24 | ✅ | 테스트 | DOC-RBK-07<br>DOC-REF-05 | — | tests/dom/reader/reader-keyboard.dom.test.js | — | — |
| TR-25 | ✅ | 테스트 | DOC-RBK-07<br>DOC-REF-05 | — | tests/dom/reader/reader-keyboard.dom.test.js | — | — |
| TR-26 | ✅ | E2E 테스트 | DOC-RBK-07<br>DOC-REF-05 | src/reader/zoom-gestures.js | tests/dom/misc/zoom-gestures.dom.test.js<br>tests/e2e/reader-advanced.spec.js | — | — |
| TR-27 | ✅ | E2E 테스트 | DOC-ADR-08<br>DOC-RBK-07<br>DOC-REF-05 | src/views/reader-render.js<br>src/views/reader-toolbar.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-advanced.spec.js | — | — |
| TR-28 | ✅ | E2E 테스트 | DOC-RBK-07<br>DOC-REF-05 | src/views/reader-progress.js | tests/dom/study/study-reader.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| TR-30 | ID-05 준수 — 위치 좌표 미사용. 본문 구간 드래그 하이라이트는 판본 갱신 시 드리프트 불가피로 범위 제외(섹션 단위로 수렴) | E2E 테스트 | DOC-RBK-07<br>DOC-REF-05 | src/reader-notes.js | tests/dom/reader/reader-notes.dom.test.js<br>tests/e2e/ux-surfaces.spec.js<br>tests/unit/app/reader-notes.test.js | — | — |

## 3.6 교재 리더 — 학습 보조 도구

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| SA-01 | ✅ | E2E 테스트 | — | — | tests/e2e/reader-flow.spec.js | — | — |
| SA-02 | ✅ | 테스트 | — | src/study-aids.js<br>src/views/reader-render.js<br>src/views/textbook-reader.js | tests/unit/engine/study-aids.test.js | — | — |
| SA-03 | ✅ | 테스트 | — | src/study-aids.js<br>src/views/reader-render.js<br>src/views/textbook-reader.js | tests/unit/engine/study-aids.test.js | — | — |
| SA-04 | ✅ | 테스트 | — | src/study-aids.js<br>src/views/textbook-reader.js | tests/unit/engine/study-aids.test.js | — | — |
| SA-05 | ✅ | 테스트 | — | src/study-aids.js<br>src/views/textbook-reader.js | tests/unit/engine/study-aids.test.js | — | — |

## 3.7 교재 리더 — 용어집

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| G-01 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |
| G-02 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |
| G-03 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/reader-ref-links.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js<br>tests/dom/reader/reader-ref-links.dom.test.js | — | — |
| G-04 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |
| G-05 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |
| G-06 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |
| G-07 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |
| G-08 | ✅ | 테스트 | — | src/reader/glossary-query.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js<br>tests/unit/content/glossary-query.test.js | — | — |
| G-09 | ✅ | 테스트 | — | src/views/glossary-renderer.js<br>src/views/textbook-reader.js | tests/dom/common/common-glossary.dom.test.js | — | — |

## 3.8 교재 리더 — 참조자료 연결

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| RR-01 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js<br>tools/build/build_ref_mapping.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-02 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/views/reader-ref-links.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/dom/reader/reader-ref-links.dom.test.js | — | — |
| RR-03 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/views/reader-ref-links.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/dom/reader/reader-ref-links.dom.test.js | — | — |
| RR-04 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/keyword-index.js<br>src/views/reader-ref-links.js<br>tools/build/build_keyword_index.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/dom/reader/reader-ref-links.dom.test.js | — | — |
| RR-05 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js<br>src/views/reader-ref-links.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/dom/reader/reader-ref-links.dom.test.js | — | — |
| RR-06 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js<br>src/views/reader-ref-links.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/dom/reader/reader-ref-links.dom.test.js | — | — |
| RR-07 | ✅ | E2E 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/e2e/reader-flow.spec.js | — | — |
| RR-08 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-09 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-10 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-11 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-12 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-13 | ✅ | 테스트 | DOC-DSN-10<br>DOC-RBK-12<br>DOC-REF-04<br>DOC-REF-07 | src/pdf-registry.js<br>src/reader/html-viewer.js<br>tools/build/build_pdf_registry.js<br>tools/check/check_link_lint.js | tests/dom/common/common-htmlviewer.dom.test.js<br>tests/unit/content/ref-link-labels.test.js<br>tests/unit/gates/link-lint.test.js<br>tests/unit/gates/markdown-links.test.js<br>…외 1개 | — | — |
| RR-14 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | css/print.css<br>src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-15 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | css/html-viewer.css<br>src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-16 | ✅ | 테스트 | DOC-REF-04<br>DOC-REF-07 | src/reader/html-viewer.js | tests/dom/common/common-htmlviewer.dom.test.js | — | — |
| RR-17 | ✅ | 테스트 | DOC-DSN-10 | src/law-links.js<br>src/views/reader-ref-links.js<br>tools/build/build_pdf_registry.js<br>tools/check/check_law_urls.js | tests/dom/reader/reader-ref-links.dom.test.js<br>tests/unit/gates/law-links.test.js | — | 국가법령정보센터(law.go.kr) 한글주소 — 공식 최신 통합본 링크 규약 |
| RR-18 | ✅ | 테스트 | — | src/reader/reader-format.js | tests/unit/content/reader-format-general.test.js | — | — |
| RR-19 | ✅ | 테스트 | DOC-DEV-05<br>DOC-DSN-10 | src/notice-check.js<br>src/views/reader-ref-links.js | tests/dom/reader/reader-ref-links.dom.test.js<br>tests/unit/gates/notice-check.test.js | — | 식약처 고시 개정 감지 — 시행 예정본(현행 아님) 구분, `notice_status.json` |

## 3.9 교재 검색

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| TS-01 | ✅ | 테스트 | — | html/views/textbook.html<br>index.html<br>src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-02 | ✅ | 테스트 | — | src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-03 | ✅ | 테스트 | — | src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-04 | ✅ | 테스트 | — | src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-05 | ✅ | 테스트 | — | src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-06 | ✅ | 테스트 | — | src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-07 | ✅ | 테스트 | — | src/reader/mermaid-render.js<br>src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-08 | ✅ | 테스트 | DOC-DSN-18 | src/search-index.js<br>src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-09 | ✅ | 테스트 | DOC-DSN-18 | src/search-index.js<br>src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js | — | — |
| TS-10 | ✅ | 테스트 | DOC-DSN-18<br>DOC-RBK-13 | src/search-sources.js<br>src/views/textbook-search.js | tests/dom/reader/story-search.dom.test.js | — | — |
| TS-11 | ✅ | 테스트 | DOC-DSN-18 | src/search-sources.js<br>src/views/textbook-search.js | tests/unit/content/textbook-search-ref.test.js | — | — |
| TS-12 | ✅ | 테스트 | — | src/search-sources.js<br>src/views/textbook-search.js | tests/dom/exam/exam-search.dom.test.js<br>tests/unit/app/search-index.test.js<br>tests/unit/content/textbook-search-exam.test.js | — | — |
| TS-13 | ✅ | 테스트 | — | src/search-index.js<br>src/search-morpheme.js<br>src/views/textbook-search.js | tests/dom/misc/morph-search.dom.test.js<br>tests/unit/app/search-index.test.js<br>tests/unit/app/search-morpheme.test.js | — | — |
| TS-14 | ✅ | 테스트 | — | src/search-index.js<br>src/search-morpheme.js<br>src/views/textbook-search.js | tests/dom/misc/morph-search.dom.test.js<br>tests/unit/app/search-index.test.js<br>tests/unit/app/search-morpheme.test.js | — | — |
| TS-15 | ✅ | 테스트 | DOC-RBK-08 | src/search-index.js<br>src/search-sources.js<br>src/views/textbook-search.js | tests/dom/misc/glossary-search.dom.test.js | — | — |
| TS-16 | ✅ | 테스트 | DOC-RBK-08 | src/search-index.js<br>src/search-sources.js<br>src/views/textbook-search.js | tests/dom/misc/glossary-search.dom.test.js<br>tests/unit/app/search-morpheme.test.js | — | — |
| TS-17 | ✅ | 테스트 | DOC-RBK-08 | src/search-index.js<br>tools/check/check_meta_sections.js | tests/dom/exam/exam-index-scope.dom.test.js<br>tests/unit/gates/check-meta-sections.test.js | — | — |
| TS-18 | ✅ | 테스트 | DOC-RBK-08 | src/search-index.js<br>src/search-sources.js<br>src/views/textbook-search.js | tests/dom/study/study-search.dom.test.js<br>tests/unit/app/search-index.test.js | — | — |

## 3.10 성분 사전

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| DI-01 | ✅ | 테스트 | — | html/views/dictionary.html<br>index.html<br>src/views/dictionary.js<br>tools/build/plugins/knowledge.plugin.js | tests/dom/misc/dictionary-schema.dom.test.js<br>tests/dom/study/study-dictionary.dom.test.js | — | — |
| DI-02 | ✅ | 테스트 | — | src/views/dictionary.js<br>src/views/listeners-dictionary.js | tests/dom/misc/dictionary-schema.dom.test.js<br>tests/dom/study/study-dictionary.dom.test.js | — | — |
| DI-03 | ✅ | 테스트 | — | src/views/dictionary.js | tests/dom/misc/dictionary-schema.dom.test.js<br>tests/dom/study/study-dictionary.dom.test.js | — | — |
| DI-04 | ✅ | 테스트 | — | html/views/dictionary.html<br>index.html<br>src/views/dictionary.js | tests/dom/exams/cosmetic/review-drills-formula.dom.test.js | — | — |
| DI-05 | ✅ | 테스트 | DOC-DEV-05 | html/views/dictionary.html<br>index.html<br>src/views/dictionary.js | tests/dom/exams/cosmetic/review-drills-formula.dom.test.js | — | — |
| DI-06 | ✅ | 테스트 | — | src/exams/cosmetic/custom-ingredient-store.js<br>src/exams/cosmetic/views/formula-calc.js<br>src/exams/cosmetic/views/formula-ing-modal.js<br>src/exams/cosmetic/views/formula.js<br>…외 1개 | tests/dom/misc/dictionary-custom.dom.test.js<br>tests/unit/exams/cosmetic/custom-ingredient-store.test.js | — | — |
| DI-07 | ✅ | 테스트 | — | src/exams/cosmetic/custom-ingredient-store.js<br>src/exams/cosmetic/formula-check.js<br>src/exams/cosmetic/views/formula-calc.js<br>src/exams/cosmetic/views/formula-ing-modal.js<br>…외 1개 | tests/dom/exams/cosmetic/formula-calc.dom.test.js<br>tests/unit/exams/cosmetic/custom-ingredient-store.test.js | — | — |
| DI-08 | ✅ | 테스트 | — | src/exams/cosmetic/custom-ingredient-store.js<br>src/exams/cosmetic/views/formula-core.js<br>src/exams/cosmetic/views/formula-ing-modal.js<br>src/exams/cosmetic/views/formula.js<br>…외 1개 | tests/dom/misc/dictionary-custom.dom.test.js<br>tests/unit/exams/cosmetic/custom-ingredient-store.test.js | — | — |
| DI-09 | ✅ | 테스트 | — | src/exams/cosmetic/custom-ingredient-store.js<br>src/exams/cosmetic/views/formula-core.js<br>src/exams/cosmetic/views/formula-ing-modal.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js | — | — |
| DI-10 | ✅ | 테스트 | — | src/views/dictionary.js | tests/dom/study/study-dictionary.dom.test.js | — | — |
| DI-11 | ✅ | 테스트 | — | src/notice-check.js<br>src/views/dictionary.js | tests/dom/study/study-dictionary.dom.test.js<br>tests/unit/gates/notice-check.test.js | — | — |

## 3.11 훈련소

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| T-01 | ✅ | 테스트 | DOC-DSN-21 | html/views/trainer.html<br>index.html<br>src/trainer-calc.js<br>src/views/trainer-calc-practice.js<br>…외 1개 | tests/dom/study/study-trainer.dom.test.js<br>tests/unit/engine/trainer-calc.test.js | DOC-ARC-05 | — |
| T-02 | ✅ | 테스트 | DOC-DSN-21 | src/exams/cosmetic/views/trainer-ingredients.js<br>src/utils.js<br>src/views/trainer.js | tests/dom/study/study-trainer.dom.test.js | DOC-ARC-05 | — |
| T-03 | ✅ | 테스트 | DOC-DSN-21 | src/views/pomodoro.js<br>src/views/trainer.js | tests/dom/study/study-pomodoro.dom.test.js<br>tests/dom/study/study-trainer.dom.test.js<br>tests/unit/app/utils.test.js | DOC-ARC-05 | — |
| T-04 | ✅ | 테스트 | DOC-DSN-21 | css/trainer.css<br>src/scratchpad.js<br>src/views/trainer.js | tests/dom/common/common-scratchpad.dom.test.js<br>tests/dom/study/study-trainer.dom.test.js | DOC-ARC-05 | — |
| T-05 | ✅ | 테스트 | DOC-DSN-21 | css/trainer.css<br>src/views/trainer-calc-practice.js<br>src/views/trainer.js | tests/dom/study/study-trainer.dom.test.js | DOC-ARC-05 | — |

## 3.12 오디오북

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| AO-01 | ✅ | 테스트 | DOC-PPL-01<br>DOC-PPL-02<br>DOC-PPL-03<br>DOC-RBK-01 | ref-pipeline/audiobook/generate_all_mp3.py<br>ref-pipeline/audiobook/run_pipeline.py<br>ref-pipeline/audiobook/tts_elevenlabs.py<br>ref-pipeline/audiobook/tts_google_direct.py<br>…외 1개 | tests/dom/reader/reader-audio.dom.test.js | — | — |
| AO-02 | ✅ | 테스트 | DOC-PPL-01<br>DOC-PPL-02<br>DOC-PPL-03<br>DOC-RBK-01 | src/views/reader-audio.js | tests/dom/reader/reader-audio.dom.test.js | — | — |
| AO-03 | ✅ | 테스트 | DOC-PPL-01<br>DOC-PPL-02<br>DOC-PPL-03<br>DOC-RBK-01 | src/views/reader-audio.js | tests/dom/reader/reader-audio.dom.test.js | — | — |
| AO-04 | ✅ | 테스트 | DOC-PPL-01<br>DOC-PPL-02<br>DOC-PPL-03<br>DOC-RBK-01 | src/views/reader-audio.js | tests/dom/reader/reader-audio.dom.test.js | — | — |
| AO-05 | ✅ | 테스트 | DOC-PPL-01<br>DOC-PPL-02<br>DOC-PPL-03<br>DOC-RBK-01 | src/views/reader-audio.js | tests/dom/reader/reader-audio.dom.test.js | — | — |
| AO-06 | ✅ | 테스트 | — | tools/build/build_audio_manifest.js | tests/unit/content/audio-manifest.test.js | — | — |

## 3.13 데이터 백업/복원

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| B-01 | ✅ | 테스트 | — | src/views/backup.js | tests/dom/misc/backup.dom.test.js | — | — |
| B-02 | ✅ | 테스트 | — | src/views/backup.js | tests/dom/misc/backup.dom.test.js | — | — |
| B-03 | ✅ | 테스트 | — | src/views/backup.js | tests/dom/misc/backup.dom.test.js | — | — |
| B-04 | ✅ | 테스트 | DOC-ADR-07 | src/views/backup.js | tests/dom/misc/backup.dom.test.js | — | — |

## 3.14 문제집 뷰어

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| EV-01 | ✅ | 테스트 | DOC-REF-04 | src/combo-doc.js<br>src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js<br>tests/unit/content/combo-doc.test.js | — | — |
| EV-02 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |
| EV-03 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |
| EV-04 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |
| EV-05 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |
| EV-06 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |
| EV-07 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |
| EV-08 | ✅ | 테스트 | DOC-REF-04 | src/doc-overlay.js<br>src/reader/exam-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-examviewer.dom.test.js | — | — |

## 3.15 학습안내서/사용자매뉴얼 뷰어

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| MV-01 | ✅ | E2E 테스트 | DOC-REF-04<br>DOC-USR-07 | src/doc-overlay.js<br>src/reader/manual-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-manual.dom.test.js<br>tests/e2e/flows.spec.js | — | — |
| MV-02 | ✅ | E2E 테스트 | DOC-REF-04<br>DOC-USR-07 | src/doc-overlay.js<br>src/reader/manual-viewer.js<br>src/reader/mermaid-render.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-manual.dom.test.js<br>tests/e2e/flows.spec.js | — | — |
| MV-03 | ✅ | 테스트 | DOC-REF-04<br>DOC-USR-07 | src/doc-overlay.js<br>src/reader/manual-viewer.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-manual.dom.test.js | — | — |
| MV-04 | ✅ | 테스트 | DOC-REF-04<br>DOC-USR-07 | src/doc-overlay.js<br>src/reader/manual-viewer.js<br>tools/build/build_doc_bundles.js | tests/dom/misc/doc-overlay.dom.test.js<br>tests/dom/study/study-manual.dom.test.js | — | — |

## 3.16 차트 및 시각화

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| C-01 | ✅ | 테스트 | DOC-RBK-04 | src/charts.js | tests/dom/misc/charts.dom.test.js | — | — |
| C-02 | ✅ | 테스트 | DOC-RBK-04 | src/charts.js | tests/dom/misc/charts.dom.test.js | — | — |
| C-03 | ✅ | 테스트 | DOC-RBK-04 | src/charts.js | tests/dom/misc/charts.dom.test.js | — | — |
| C-04 | ✅ | 테스트 | DOC-RBK-04 | src/charts.js | tests/dom/misc/charts.dom.test.js | — | — |
| C-05 | ✅ | 테스트 | DOC-RBK-04 | src/charts.js | tests/dom/misc/charts.dom.test.js | — | — |

## 3.17 콘텐츠 품질 감사

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| CQ-01 | ✅ | 테스트 | DOC-DSN-33 | tools/check/audit_card_quality.js | tests/unit/gates/audit-quality.test.js | — | — |
| CQ-02 | ✅ | 테스트 | DOC-DSN-33 | tools/check/audit_card_quality.js | tests/unit/gates/audit-quality.test.js | — | — |
| CQ-03 | ✅ | 테스트 | DOC-DSN-33 | tools/check/audit_card_quality.js | tests/unit/gates/audit-quality.test.js | — | — |
| CQ-04 | ✅ | 테스트 | DOC-DSN-33 | tools/check/audit_card_quality.js | tests/unit/gates/audit-quality.test.js | — | — |
| CQ-05 | ✅ | 테스트 | DOC-DSN-33 | tools/check/audit_combo.js<br>tools/check/check_combo_pilot.js | tests/unit/gates/audit-quality.test.js | — | — |
| CQ-06 | ✅ | 테스트 | DOC-DSN-33 | tools/check/check_answer_overlap.js<br>tools/sync/fix_answer_quotes.js<br>tools/sync/fix_citation_targets.js | tests/unit/gates/answer-overlap.test.js | — | — |

## 3.18 Formula OS — 실전 배합 작업실

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| FO-01 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula-core.js<br>src/exams/cosmetic/views/formula-list.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-02 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/formula-check.js<br>src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-check.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | 화장품 안전기준 등에 관한 규정(식약처고시 제2026-19호) — 원료별 사용 한도·금지 |
| FO-03 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-os.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-04 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-os.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-05 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DEV-05<br>DOC-DSN-02<br>…외 1개 | src/exams/cosmetic/formula-rules.js<br>src/exams/cosmetic/views/formula-recommend.js<br>src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-rules.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-06 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/formula-rules.js<br>src/exams/cosmetic/views/formula-fields.js<br>src/exams/cosmetic/views/formula-recommend.js<br>src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-rules.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-07 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula-fields.js<br>src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-os.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-08 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/formula-store.js<br>src/exams/cosmetic/views/formula-fields.js<br>src/exams/cosmetic/views/formula-recommend.js<br>src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-store.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-09 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula.js | tests/unit/exams/cosmetic/formula-os.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-10 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | css/exams/cosmetic/formula.css<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/review-drills-formula.dom.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-11 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/review-drills-formula.dom.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-12 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/formula-stability.js | tests/unit/exams/cosmetic/formula-stability.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-13 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/formula-stability.js | tests/unit/exams/cosmetic/formula-stability.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-14 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11<br>…외 2개 | src/exams/cosmetic/formula-stability.js<br>src/exams/cosmetic/views/formula-print.js | tests/unit/exams/cosmetic/formula-stability.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | 화장품법 시행규칙 — 전성분 표기 순서 (1% 초과 내림차순 → 1% 이하 → 색소 최하단) |
| FO-15 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | css/exams/cosmetic/formula.css<br>css/trainer.css<br>html/exams/cosmetic/formula.html<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-nav.dom.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-16 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11<br>…외 1개 | src/exams/cosmetic/batch-store.js<br>src/exams/cosmetic/store-utils.js<br>src/exams/cosmetic/views/formula-batch-form.js<br>src/exams/cosmetic/views/formula-batch.js | tests/dom/exams/cosmetic/formula-batch.dom.test.js<br>tests/unit/exams/cosmetic/batch-store.test.js<br>tests/unit/exams/cosmetic/store-utils.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | 화장품법·시행규칙 — 맞춤형화장품 판매업의 조제 기록 의무 |
| FO-17 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/customer-store.js<br>src/exams/cosmetic/store-utils.js<br>src/exams/cosmetic/views/formula-customer.js | tests/dom/exams/cosmetic/formula-customer.dom.test.js<br>tests/unit/exams/cosmetic/customer-store.test.js<br>tests/unit/exams/cosmetic/store-utils.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-18 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11<br>…외 1개 | src/exams/cosmetic/material-ledger.js<br>src/exams/cosmetic/store-utils.js<br>src/exams/cosmetic/views/formula-material.js | tests/dom/exams/cosmetic/formula-material.dom.test.js<br>tests/unit/exams/cosmetic/material-ledger.test.js<br>tests/unit/exams/cosmetic/store-utils.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-19 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/views/formula-compliance.js | tests/dom/exams/cosmetic/formula-compliance.dom.test.js<br>tests/unit/exams/cosmetic/formula-compliance.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | 화장품법·시행규칙 전반 — 영업·자격·표시·기록 준수 의무 |
| FO-20 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/usage-guide.js | tests/unit/exams/cosmetic/usage-guide.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-21 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | css/print.css<br>src/exams/cosmetic/views/formula-print.js | tests/dom/exams/cosmetic/formula-print.dom.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | 화장품법 표시 규정 — 용기 라벨 기재사항·조제 기록지 |
| FO-22 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/csv-utils.js | tests/unit/exams/cosmetic/csv-import.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | — |
| FO-23 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-05<br>DOC-DSN-02<br>DOC-DSN-11 | src/exams/cosmetic/batch-store.js<br>src/exams/cosmetic/formula-store.js | tests/unit/exams/cosmetic/batch-store.test.js<br>tests/unit/exams/cosmetic/formula-store.test.js | DOC-ARC-01<br>DOC-ARC-04<br>DOC-ARC-06 | 사업 판단 — docs/dev/design/SUBSCRIPTION_ROADMAP.md |
| FO-24 | ✅ | 테스트 | DOC-DEV-05<br>DOC-DSN-10<br>DOC-DSN-14 | html/exams/cosmetic/formula.html<br>ref-pipeline/check_mfds_notice.py<br>ref-pipeline/fetch_revision.py<br>src/notice-check.js<br>…외 1개 | tests/dom/exams/cosmetic/formula-nav.dom.test.js<br>tests/unit/gates/notice-check.test.js<br>tests/unit/gates/notice-diff.test.js | — | 식약처 고시 개정 추적 — law.go.kr 오픈API(법제처) + `content/exams/cosmetic/참조자료/법령고시/` PDF 기준본 |
| FO-25 | ✅ | 테스트 | — | html/exams/cosmetic/formula.html | tests/dom/exams/cosmetic/formula-nav.dom.test.js | — | 화장품 안전기준 등에 관한 규정(별표1·2) — 네거티브 리스트 판정 원칙 · 색소/기능성 고시 — 지정 목록 예외 |
| FO-26 | ✅ | E2E 테스트 | — | css/exams/cosmetic/formula.css<br>html/exams/cosmetic/formula.html | tests/e2e/exams/cosmetic/formula-tablet.spec.js | — | — |
| FO-27 | ✅ | E2E 테스트 | — | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/views/formula-calc.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js<br>tests/e2e/exams/cosmetic/formula-tablet.spec.js | — | — |
| FO-28 | ✅ | E2E 테스트 | — | css/exams/cosmetic/formula.css<br>html/exams/cosmetic/formula.html<br>src/exams/cosmetic/views/formula-weigh.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js<br>tests/e2e/exams/cosmetic/formula-tablet.spec.js | — | — |
| FO-29 | ✅ | E2E 테스트 | — | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/views/formula-io.js<br>src/exams/cosmetic/views/formula-print.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-print.dom.test.js<br>tests/e2e/exams/cosmetic/formula-tablet.spec.js | — | — |
| FO-30 | ✅ | E2E 테스트 | — | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/views/formula-calc.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js<br>tests/e2e/exams/cosmetic/formula-tablet.spec.js | — | — |
| FO-31 | ✅ | E2E 테스트 | — | css/exams/cosmetic/formula.css<br>html/exams/cosmetic/formula.html<br>src/exams/cosmetic/views/formula-hub.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js<br>tests/e2e/exams/cosmetic/formula-tablet.spec.js | — | — |
| FO-32 | ✅ | 테스트 | DOC-DSN-12<br>DOC-DSN-13 | src/exams/cosmetic/views/formula-calc.js<br>src/exams/cosmetic/views/formula-ing-modal.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-calc.dom.test.js | — | — |
| FO-33 | ✅ | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/biz-profile.js<br>src/exams/cosmetic/views/formula-compliance.js<br>src/exams/cosmetic/views/formula-core.js<br>src/exams/cosmetic/views/formula-hub.js<br>…외 1개 | tests/dom/exams/cosmetic/formula-sales.dom.test.js<br>tests/unit/exams/cosmetic/formula-sales.test.js | — | — |
| FO-34 | ✅ | 테스트 | DOC-BIZ-02<br>DOC-DSN-14<br>DOC-DSN-15 | src/exams/cosmetic/biz-profile.js<br>src/exams/cosmetic/views/formula-compliance.js | tests/dom/exams/cosmetic/formula-sales.dom.test.js<br>tests/unit/exams/cosmetic/formula-sales.test.js | — | — |
| FO-35 | ✅ | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/views/formula-sales.js | tests/dom/exams/cosmetic/formula-sales.dom.test.js | — | — |
| FO-36 | ✅ | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/ad-lint.js<br>src/exams/cosmetic/views/formula-sales.js | tests/dom/exams/cosmetic/formula-sales.dom.test.js<br>tests/unit/exams/cosmetic/formula-sales.test.js | — | — |
| FO-37 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-store.js<br>src/exams/cosmetic/views/formula-products.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-38 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-store.js<br>src/exams/cosmetic/views/formula-prod-state.js<br>src/exams/cosmetic/views/formula-products.js | tests/dom/exams/cosmetic/formula-nav.dom.test.js<br>tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-39 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-store.js<br>src/exams/cosmetic/views/formula-prod-detail.js<br>src/exams/cosmetic/views/formula-products.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-40 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-store.js<br>src/exams/cosmetic/views/formula-customer.js<br>src/exams/cosmetic/views/formula-prod-detail.js<br>…외 2개 | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-41 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-13 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-vision.js<br>src/exams/cosmetic/views/formula-prod-vision.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-vision.test.js | — | — |
| FO-42 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-13 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-vision.js<br>src/exams/cosmetic/views/formula-prod-vision.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-vision.test.js | — | — |
| FO-43 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-13 | html/exams/cosmetic/formula.html<br>src/exams/cosmetic/product-vision.js<br>src/exams/cosmetic/views/formula-prod-vision.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-vision.test.js | — | — |
| FO-44 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/product-store.js<br>src/exams/cosmetic/views/formula-prod-detail.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-45 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/product-store.js<br>src/exams/cosmetic/views/formula-prod-detail.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-46 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-13 | src/exams/cosmetic/product-vision.js<br>src/exams/cosmetic/views/formula-prod-vision.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-vision.test.js | — | — |
| FO-47 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | — | tests/dom/exams/cosmetic/formula-products.dom.test.js | — | — |
| FO-48 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/product-store.js | tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-49 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/product-store.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-50 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/formula-check.js<br>src/exams/cosmetic/product-store.js | tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-51 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/product-store.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-52 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/product-store.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-53 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-12 | src/exams/cosmetic/formula-store.js<br>src/exams/cosmetic/product-store.js | tests/unit/exams/cosmetic/product-store.test.js | — | — |
| FO-54 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-13 | src/exams/cosmetic/product-vision.js<br>src/exams/cosmetic/views/formula-prod-vision.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/product-vision.test.js | — | — |
| FO-55 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-13 | src/exams/cosmetic/formula-check.js<br>src/exams/cosmetic/product-vision.js<br>src/exams/cosmetic/views/formula-prod-vision.js | tests/dom/exams/cosmetic/formula-products.dom.test.js<br>tests/unit/exams/cosmetic/formula-check.test.js | — | — |
| FO-56 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/formula-check.js<br>src/exams/cosmetic/views/formula-audit.js<br>src/exams/cosmetic/views/formula-print.js<br>src/exams/cosmetic/views/formula-sales.js | tests/dom/exams/cosmetic/formula-audit.dom.test.js<br>tests/unit/exams/cosmetic/formula-audit.test.js | — | — |
| FO-57 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/views/formula-material.js<br>src/exams/cosmetic/views/formula-print.js | tests/dom/exams/cosmetic/formula-practical.dom.test.js<br>tests/unit/exams/cosmetic/formula-practical.test.js | — | — |
| FO-58 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/views/formula-batch.js<br>src/exams/cosmetic/views/formula-print.js | tests/dom/exams/cosmetic/formula-practical.dom.test.js | — | — |
| FO-59 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/adverse-store.js<br>src/exams/cosmetic/views/formula-adverse.js<br>src/exams/cosmetic/views/formula-audit.js | tests/dom/exams/cosmetic/formula-practical.dom.test.js<br>tests/unit/exams/cosmetic/formula-practical.test.js | — | — |
| FO-60 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/views/formula-print.js | tests/dom/exams/cosmetic/formula-practical.dom.test.js | — | — |
| FO-61 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/views/formula-batch-form.js<br>src/exams/cosmetic/views/formula-batch.js<br>src/exams/cosmetic/views/formula-material.js | tests/unit/exams/cosmetic/formula-practical.test.js | — | — |
| FO-62 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-15 | src/exams/cosmetic/views/formula-hub.js<br>src/exams/cosmetic/views/formula.js | tests/dom/exams/cosmetic/formula-practical.dom.test.js | — | — |
| FO-63 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14<br>DOC-DSN-15 | src/exams/cosmetic/views/formula-audit.js<br>src/exams/cosmetic/views/formula-compliance.js | tests/dom/exams/cosmetic/formula-practical.dom.test.js<br>tests/unit/exams/cosmetic/formula-practical.test.js | — | — |
| FO-64 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/views/formula-audit.js | tests/unit/exams/cosmetic/formula-audit.test.js | — | — |
| FO-65 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/views/formula-hub.js | tests/dom/exams/cosmetic/formula-nav.dom.test.js | — | — |
| FO-66 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/views/formula-audit.js | tests/unit/exams/cosmetic/formula-audit.test.js | — | — |
| FO-67 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | src/exams/cosmetic/views/formula-audit.js | tests/unit/exams/cosmetic/formula-audit.test.js | — | — |
| FO-68 | 구현 | 테스트 | DOC-BIZ-02<br>DOC-DSN-14 | tools/check/check_adlint_coverage.js | tests/unit/exams/cosmetic/formula-sales.test.js | — | — |
| FO-69 | — | 테스트 | — | src/exams/cosmetic/biz-profile.js<br>src/exams/cosmetic/views/formula-audit.js<br>src/exams/cosmetic/views/formula-compliance.js<br>src/exams/cosmetic/views/formula-print.js | tests/dom/exams/cosmetic/formula-audit.dom.test.js<br>tests/unit/exams/cosmetic/formula-audit.test.js | — | — |
| FO-70 | 구현 | 테스트 | — | src/exams/cosmetic/views/formula-print.js | tests/unit/exams/cosmetic/formula-audit.test.js | — | — |

## 3.19 계정·클라우드 동기화

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| AU-01 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 2개 | src/auth-sync/auth-view.js | tests/dom/common/common-auth.dom.test.js | — | — |
| AU-02 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 3개 | src/auth-sync/auth-view.js<br>src/auth-sync/supabase-client.js | tests/dom/common/common-auth.dom.test.js<br>tests/unit/app/supabase-client.test.js | — | — |
| AU-03 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 3개 | src/auth-sync/auth-view.js | tests/dom/common/common-auth.dom.test.js | — | — |
| AU-04 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 3개 | src/auth-sync/auth-view.js | tests/dom/common/common-auth.dom.test.js | — | — |
| AU-05 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 2개 | src/auth-sync/sync.js | tests/dom/common/common-sync.dom.test.js | — | — |
| AU-06 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 2개 | src/auth-sync/sync.js | tests/dom/common/common-sync.dom.test.js | — | — |
| AU-07 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 2개 | src/auth-sync/sync.js | tests/dom/common/common-sync.dom.test.js<br>tests/unit/gates/storage-key-sync.test.js | — | 개인정보보호법 — 타인(고객) PII의 서버 저장 제한 원칙 |
| AU-08 | ✅ | 테스트 | DOC-ADR-03<br>DOC-DSN-08<br>DOC-DSN-09<br>DOC-DSN-11<br>…외 2개 | src/auth-sync/auth-view.js<br>src/auth-sync/supabase-client.js<br>src/auth-sync/supabase-config.js<br>src/auth-sync/sync.js | tests/dom/common/common-auth.dom.test.js<br>tests/dom/common/common-sync.dom.test.js<br>tests/unit/app/supabase-client.test.js | — | — |

## 3.20 학습 캘린더·복습·드릴

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| DR-01 | ✅ | 테스트 | DOC-DSN-21 | html/views/trainer.html<br>index.html<br>src/views/trainer-drills.js<br>tools/build/build_ox_drills.js<br>…외 1개 | tests/dom/study/study-trainer-drills.dom.test.js | DOC-ARC-05<br>DOC-ARC-09 | — |
| DR-02 | ✅ | 테스트 | DOC-DSN-04<br>DOC-DSN-21<br>DOC-RBK-02<br>DOC-REF-01 | src/views/trainer-drill-combo.js<br>src/views/trainer-drills.js<br>tools/build/build_combo_drills.js<br>tools/build/drill-utils.js | tests/dom/study/study-trainer-drills.dom.test.js<br>tests/unit/engine/combo-transform.test.js | DOC-ARC-05<br>DOC-ARC-09 | — |
| DR-03 | ✅ | 테스트 | DOC-DSN-32<br>DOC-RBK-02<br>DOC-REF-01 | src/statement-tracker.js<br>src/views/trainer-drills.js | tests/dom/study/study-trainer-drills.dom.test.js<br>tests/unit/engine/statement-tracker.test.js | DOC-ARC-05<br>DOC-ARC-09 | — |
| DR-04 | ✅ | 테스트 | DOC-DSN-21<br>DOC-RBK-02<br>DOC-REF-01 | src/statement-tracker.js<br>src/views/trainer-drills.js<br>src/weak-items.js | tests/dom/study/study-trainer-drills.dom.test.js<br>tests/unit/engine/statement-tracker.test.js<br>tests/unit/engine/weak-items.test.js | DOC-ARC-05<br>DOC-ARC-09 | 법령·고시 수치 (드릴 콘텐츠의 기원 — 문항 자체는 내부 제작) |
| DR-05 | ✅ | 테스트 | DOC-DSN-18<br>DOC-DSN-21<br>DOC-RBK-02<br>DOC-REF-01 | src/statement-tracker.js<br>src/views/trainer-drills.js | tests/dom/study/study-trainer-drills.dom.test.js<br>tests/unit/engine/statement-tracker.test.js | DOC-ARC-05<br>DOC-ARC-09 | — |
| DR-06 | ✅ | 테스트 | DOC-RBK-02<br>DOC-REF-01 | src/views/exam-sim-arena.js<br>src/views/exam-simulator.js<br>src/views/trainer-drills.js | tests/dom/study/study-trainer-drills.dom.test.js | DOC-ARC-05<br>DOC-ARC-09 | — |
| DR-07 | ✅ | 테스트 | DOC-RBK-02<br>DOC-REF-01 | src/questions.js<br>src/views/trainer-drills.js | tests/dom/study/study-trainer-drills.dom.test.js<br>tests/fixtures/sample-questions.js<br>tests/unit/app/property-based.test.js<br>tests/unit/content/questions.test.js<br>…외 1개 | DOC-ARC-05<br>DOC-ARC-09 | — |
| ND-01 | ✅ | 테스트 | DOC-USR-03<br>DOC-USR-04<br>DOC-USR-05<br>DOC-USR-06 | src/views/trainer-drills.js<br>src/views/trainer.js | tests/dom/exams/cosmetic/review-drills-formula.dom.test.js | — | — |
| RV-01 | ✅ | 테스트 | DOC-DSN-21 | html/views/review.html<br>index.html<br>src/views/quiz.js<br>src/views/trainer.js | tests/dom/exams/cosmetic/review-drills-formula.dom.test.js<br>tests/dom/study/study-review.dom.test.js | — | — |
| RV-02 | ✅ | 테스트 | DOC-DSN-21 | html/views/review.html<br>index.html | tests/dom/study/study-review.dom.test.js | — | — |
| RV-03 | ✅ | 테스트 | DOC-DSN-21 | html/views/review.html<br>index.html | tests/dom/study/study-review.dom.test.js | — | — |
| RV-04 | ✅ | 테스트 | DOC-DSN-21 | html/views/review.html<br>index.html | tests/dom/study/study-review.dom.test.js | — | — |
| SC-01 | ✅ | 테스트 | — | css/study-calendar.css<br>html/views/calendar.html<br>index.html<br>src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js | DOC-ARC-05 | — |
| SC-02 | ✅ | 테스트 | — | src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js | DOC-ARC-05 | — |
| SC-03 | ✅ | 테스트 | — | src/study-tracker.js | tests/unit/app/utils.test.js<br>tests/unit/engine/study-tracker.test.js | DOC-ARC-05 | — |
| SC-04 | ✅ | 테스트 | — | html/views/dashboard.html<br>index.html<br>src/views/daily-challenge.js<br>src/views/dashboard.js | tests/dom/study/study-challenge.dom.test.js | — | — |
| SC-05 | ✅ | 테스트 | — | css/study-calendar.css<br>src/study-tracker.js<br>src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| SC-06 | ✅ | 테스트 | DOC-DSN-16 | css/study-calendar.css<br>src/study-tracker.js<br>src/views/dashboard.js<br>src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| SC-07 | ✅ | 테스트 | DOC-DSN-16 | src/study-tracker.js<br>src/views/dashboard.js<br>src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| SC-08 | ✅ | 테스트 | DOC-DSN-16<br>DOC-DSN-21 | css/study-calendar.css<br>src/study-tracker.js<br>src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| SC-09 | ✅ | 테스트 | DOC-DSN-21 | src/study-tracker.js<br>src/views/study-calendar.js | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| SC-10 | ✅ | 테스트 | DOC-DSN-21 | css/dashboard.css<br>src/views/dashboard.js | tests/dom/study/study-dashboard.dom.test.js | — | — |
| SC-11 | ✅ | 테스트 | DOC-DSN-21 | src/views/analysis-view.js | tests/dom/study/study-calendar.dom.test.js<br>tests/dom/study/study-dashboard.dom.test.js | — | — |
| SC-12 | ✅ | 테스트 | DOC-DSN-21 | src/views/analysis-view.js | tests/unit/engine/study-tracker.test.js | — | — |
| SC-13 | ✅ | 테스트 | DOC-DSN-21<br>DOC-DSN-32 | — | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |
| SC-14 | ✅ | 테스트 | DOC-DSN-32 | — | tests/dom/study/study-dashboard.dom.test.js | — | — |
| SC-15 | ✅ | 테스트 | — | src/analysis-engine.js<br>src/study-tracker.js<br>src/views/reader-progress.js | tests/dom/study/study-calendar.dom.test.js<br>tests/unit/engine/study-tracker.test.js | — | — |

## 3.21 UI 모드 전환

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| UM-01 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-02<br>DOC-DSN-11<br>DOC-DSN-25<br>…외 1개 | src/practice-registry.js<br>src/ui-mode.js | tests/dom/common/common-uimode.dom.test.js<br>tests/unit/app/practice-registry.test.js | DOC-ARC-06 | — |
| UM-02 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-02<br>DOC-DSN-11<br>DOC-DSN-25<br>…외 1개 | src/practice-registry.js<br>src/ui-mode.js | tests/dom/common/common-uimode.dom.test.js<br>tests/unit/app/practice-registry.test.js | DOC-ARC-06 | — |
| UM-03 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-02<br>DOC-DSN-11<br>DOC-DSN-25<br>…외 1개 | src/practice-registry.js<br>src/ui-mode.js | tests/dom/common/common-uimode.dom.test.js<br>tests/unit/app/practice-registry.test.js | DOC-ARC-06 | — |
| UM-04 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-02<br>DOC-DSN-11<br>DOC-DSN-25<br>…외 1개 | src/practice-registry.js<br>src/router.js<br>src/ui-mode.js | tests/dom/common/common-uimode.dom.test.js<br>tests/dom/misc/router.dom.test.js<br>tests/dom/misc/ui-structure.dom.test.js<br>tests/unit/app/practice-registry.test.js | DOC-ARC-06 | — |
| UM-05 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-02<br>DOC-DSN-11<br>DOC-DSN-25<br>…외 1개 | src/practice-registry.js<br>src/ui-mode.js | tests/dom/common/common-uimode.dom.test.js<br>tests/unit/app/practice-registry.test.js | DOC-ARC-06 | — |

## 3.22 시험 선택·전환

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| ES-01 | ✅ | 테스트 | DOC-DSN-10<br>DOC-RBK-10<br>DOC-RBK-16 | html/views/exam-select.html<br>index.html<br>src/app-dashboard.js<br>src/exam-context.js<br>…외 3개 | tests/dom/exam/exam-switching.dom.test.js<br>tests/dom/study/study-examselect.dom.test.js<br>tests/unit/app/exam-context.test.js<br>tests/unit/gates/exam-onboard.test.js | DOC-ARC-07 | — |
| ES-02 | ✅ | 테스트 | DOC-DSN-10<br>DOC-DSN-25<br>DOC-RBK-16 | src/app-shell.js<br>src/exam-context.js<br>src/views/exam-select.js | tests/dom/exam/exam-switching.dom.test.js<br>tests/dom/study/study-examselect.dom.test.js<br>tests/unit/app/exam-context.test.js | DOC-ARC-07 | — |
| ES-03 | ✅ | E2E 테스트 | DOC-DSN-10<br>DOC-RBK-16 | src/app-shell.js<br>src/exam-context.js<br>src/views/exam-select.js | tests/dom/exam/exam-switching.dom.test.js<br>tests/dom/study/study-examselect.dom.test.js<br>tests/e2e/exam-switch.spec.js<br>tests/unit/app/exam-context.test.js | DOC-ARC-07 | — |
| ES-04 | ✅ | 테스트 | DOC-DSN-10<br>DOC-RBK-16 | src/exam-context.js | tests/dom/exam/exam-switching.dom.test.js<br>tests/unit/app/exam-context.test.js | DOC-ARC-07 | — |
| ES-05 | ✅ | E2E 테스트 | DOC-DSN-10<br>DOC-RBK-16 | src/app-shell.js<br>src/exam-context.js | tests/dom/exam/exam-switching.dom.test.js<br>tests/e2e/exam-switch.spec.js<br>tests/unit/app/exam-context.test.js | DOC-ARC-07 | — |
| ES-06 | ✅ | 테스트 | DOC-RBK-16 | src/exam-context.js<br>src/views/exam-select.js | tests/dom/study/study-examselect.dom.test.js<br>tests/unit/app/exam-select-summary.test.js | — | — |
| ES-07 | ✅ | 테스트 | DOC-RBK-16 | — | tests/dom/study/study-examselect.dom.test.js | — | — |

## 3.23 사용자 의견 수신

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| FB-01 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-02 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-03 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-04 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-05 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-06 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-07 | ✅ | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |
| FB-08 | ✅ (코드) / ⚙️ (대시보드 설정 필요) | 테스트 | DOC-DSN-09<br>DOC-DSN-30 | src/feedback.js<br>tools/supabase/functions/feedback-notify/index.ts | tests/dom/misc/feedback.dom.test.js<br>tests/unit/app/feedback.test.js | — | 사업 판단 — docs/dev/design/USER_FEEDBACK_DESIGN.md (유튜브 유입 대응) |

## 3.24 학습 품질 감사

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| SQ-01 | ✅ | 테스트 | — | tools/check/audit_study_quality.js | tests/unit/gates/study-quality-audit.test.js | — | — |
| SQ-02 | ✅ | 테스트 | — | tools/check/audit_study_quality.js | tests/unit/gates/study-quality-audit.test.js | — | — |
| SQ-03 | ✅ | 테스트 | DOC-DSN-32 | tools/check/audit_study_quality.js | tests/unit/gates/study-quality-audit.test.js | — | — |
| SQ-04 | ✅ | 테스트 | — | tools/check/audit_study_quality.js | tests/unit/gates/study-quality-audit.test.js | — | — |

## 3.25 의미 유사도

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| SEM-01 | ✅ | 테스트 | — | — | tests/unit/gates/emb-manifest.test.js | — | — |
| SEM-02 | ✅ | 테스트 | — | src/semantic-index.js | tests/unit/gates/semantic-index.test.js | — | — |
| SEM-03 | ✅ | 테스트 | — | — | tests/unit/gates/semantic-index.test.js | — | — |
| SEM-04 | ✅ | 테스트 | — | src/semantic-index.js | tests/unit/gates/semantic-index.test.js | — | — |
| SEM-05 | ✅ | 테스트 | DOC-DSN-18<br>DOC-DSN-33 | tools/check/check_emb_freshness.js | tests/unit/gates/emb-manifest.test.js | — | — |
| SEM-06 | 미구현 (로드맵) | — | — | — | — | — | — |
| SEM-07 | 미구현 (로드맵) | — | — | — | — | — | — |
| SEM-08 | ✅ v1 (앵커 프록시) | 테스트 | — | src/semantic-index.js | tests/unit/gates/semantic-index.test.js | — | — |

## 3.26 관리자

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| AD-01 | 미구현 (로드맵) | 문서 검토 | DOC-DSN-30 | — | — | — | — |
| AD-02 | 미구현 (로드맵) | 문서 검토 | DOC-DSN-30 | — | — | — | — |
| AD-03 | 미구현 (로드맵) | 문서 검토 | DOC-DSN-30 | — | — | — | — |
| AD-04 | 미구현 (로드맵) | 문서 검토 | DOC-DSN-30 | — | — | — | — |
| AD-05 | 미구현 (로드맵) | 문서 검토 | DOC-DSN-30 | — | — | — | — |
| AD-06 | ✅ | 테스트 | DOC-DSN-30 | tools/check/feedback_report.js<br>tools/check/grant_pro.js<br>tools/check/user_report.js<br>tools/lib/supabase_ops.js | tests/unit/app/feedback-report.test.js<br>tests/unit/app/grant-pro.test.js<br>tests/unit/app/user-report.test.js | — | — |
| AD-07 | ✅ | 테스트 | — | tools/check/dashboard_report.js | tests/unit/app/dashboard-report.test.js | — | — |

## 3.27 AI 제작 지원

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| AI-01 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_apply.js<br>tools/ai/ai_textbook.js<br>tools/ai/lib/ai_common.js<br>tools/ai/lib/qbank.js | tests/unit/content/ai-textbook.test.js<br>tests/unit/content/ai-tools.test.js | — | — |
| AI-02 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_distractors.js<br>tools/ai/ai_draft_questions.js<br>tools/ai/ai_explain.js<br>tools/ai/ai_lint.js<br>…외 5개 | tests/unit/content/ai-tools.test.js | — | — |
| AI-03 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_draft_questions.js<br>tools/ai/ai_explain.js<br>tools/ai/ai_stmt_feedback.js<br>tools/ai/ai_textbook.js<br>…외 2개 | tests/unit/content/ai-textbook.test.js<br>tests/unit/content/ai-tools.test.js | — | — |
| AI-04 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_apply.js<br>tools/ai/ai_explain.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-05 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_apply.js<br>tools/ai/ai_draft_questions.js<br>tools/ai/lib/textbook.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-06 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_distractors.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-07 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_dupcheck.js<br>tools/ai/lib/similarity.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-08 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_statements.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-09 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_tag.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-10 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_lint.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-11 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_coverage.js<br>tools/ai/lib/textbook.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-12 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_stale_scan.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-13 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_coverage.js<br>tools/ai/ai_dupcheck.js<br>tools/ai/ai_stale_scan.js<br>tools/ai/ai_textbook.js<br>…외 1개 | tests/unit/content/ai-tools.test.js | — | — |
| AI-14 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_stmt_feedback.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-15 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_stmt_feedback.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-16 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_stmt_feedback.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-17 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_story.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-18 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_cards.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-19 | ✅ | 테스트 | DOC-RBK-16 | — | tests/unit/content/ai-tools.test.js | — | — |
| AI-20 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_glossary.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-21 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_adphrases.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-22 | ✅ | 테스트 | DOC-RBK-16 | src/data-loader.js<br>tools/ai/ai_cards.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-23 | ✅ | 테스트 | DOC-RBK-16 | tools/ai/ai_adoption.js | tests/unit/content/ai-tools.test.js | — | — |
| AI-24 | ✅ | 테스트 | — | tools/ai/ai_textbook.js | tests/unit/content/ai-textbook.test.js | — | — |

## 3.28 주관식 연습 자기채점

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| WP-01 | ✅ | 테스트 | — | src/written-practice.js | tests/unit/engine/written-practice.test.js | — | — |
| WP-02 | ✅ | 테스트 | — | src/written-practice.js | tests/unit/engine/written-practice.test.js | — | — |
| WP-03 | ✅ | 테스트 | — | src/written-practice.js | tests/unit/engine/written-practice.test.js | — | — |
| WP-04 | ✅ | 테스트 | — | src/written-practice.js | tests/unit/engine/written-practice.test.js | — | — |
| WP-05 | ✅ | 테스트 | — | src/written-practice.js | tests/unit/engine/written-practice.test.js | — | — |
| WP-06 | ✅ | 테스트 | — | src/written-practice.js | tests/unit/engine/written-practice.test.js | — | — |
| WP-07 | ✅ | 테스트 | — | src/written-grading.js | tests/unit/engine/written-grading.test.js | — | — |
| WP-08 | ✅ | 테스트 | — | src/written-grading.js | tests/unit/engine/written-grading.test.js | — | — |

## 4.1 PWA & 오프라인

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| P-01 | ✅ | E2E 테스트 | DOC-ADR-01<br>DOC-ADR-02<br>DOC-ADR-05<br>DOC-RBK-01<br>…외 1개 | sw.js | tests/e2e/app.spec.js<br>tests/unit/app/pwa-sw.test.js | — | — |
| P-02 | ✅ | E2E 테스트 | DOC-ADR-01<br>DOC-ADR-02<br>DOC-ADR-05<br>DOC-DSN-19<br>…외 2개 | src/config/cache.js<br>sw.js | tests/e2e/app.spec.js<br>tests/unit/app/pwa-sw.test.js | — | — |
| P-03 | ✅ | 테스트 | DOC-ADR-01<br>DOC-ADR-02<br>DOC-ADR-05<br>DOC-RBK-01<br>…외 1개 | sw.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-04 | ✅ | 테스트 | DOC-ADR-01<br>DOC-ADR-02<br>DOC-ADR-05<br>DOC-RBK-01<br>…외 1개 | sw.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-04a | ✅ | 테스트 | DOC-RBK-01 | css/app-responsive.css | tests/unit/app/pwa-sw.test.js | — | — |
| P-05 | ✅ | 테스트 | DOC-ADR-01<br>DOC-ADR-02<br>DOC-ADR-05<br>DOC-RBK-01<br>…외 1개 | sw.js<br>tools/build/stamp_sw_version.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-06 | ✅ | 테스트 | DOC-ADR-01<br>DOC-ADR-02<br>DOC-ADR-05<br>DOC-RBK-01<br>…외 1개 | sw.js | tests/unit/app/pwa-sw.test.js<br>tests/unit/app/sw-prune.test.js | — | — |
| P-07 | ✅ | 테스트 | DOC-RBK-01<br>DOC-RBK-04 | css/app-responsive.css<br>src/pwa/pwa-install-capture.js<br>src/pwa/pwa-install.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-08 | ✅ | 테스트 | DOC-RBK-01<br>DOC-RBK-04 | src/app-shell.js<br>src/pwa/pwa-install.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-09 | ✅ | 테스트 | DOC-RBK-01<br>DOC-RBK-04 | src/pwa/pwa-install.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-10 | ✅ | E2E 테스트 | DOC-RBK-01<br>DOC-RBK-04 | src/pwa/pwa-manifest.js | tests/e2e/app.spec.js<br>tests/unit/app/pwa-sw.test.js | — | — |
| P-11 | ✅ | E2E 테스트 | DOC-RBK-01<br>DOC-RBK-04 | src/app-fallback.js | tests/e2e/app.spec.js<br>tests/unit/app/pwa-sw.test.js | — | — |
| P-12 | ✅ | 테스트 | DOC-RBK-01<br>DOC-RBK-04 | tools/check/verify_shell_assets.js | tests/unit/app/pwa-sw.test.js | — | — |
| P-13 | ✅ | 테스트 | DOC-ADR-13<br>DOC-RBK-01<br>DOC-RBK-04<br>DOC-RBK-09 | src/app-version.js<br>src/whats-new.js<br>tools/build/stamp_release_notes.js | tests/dom/misc/whats-new.dom.test.js<br>tests/unit/app/whats-new.test.js | — | — |
| P-14 | ✅ | 테스트 | DOC-RBK-01<br>DOC-RBK-08 | html/views/dashboard.html<br>index.html<br>src/reader/textbook-edition.js | tests/dom/reader/textbook-edition.dom.test.js<br>tests/unit/content/textbook-edition.test.js | — | — |

## 4.2 오프라인 감지

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| O-01 | ✅ | E2E 테스트 | — | css/app-responsive.css<br>src/views/offline-detection.js | tests/dom/common/common-offline.dom.test.js<br>tests/e2e/flows.spec.js | — | — |
| O-02 | ✅ | 테스트 | — | src/views/offline-detection.js | tests/dom/common/common-offline.dom.test.js | — | — |
| O-03 | ✅ | 테스트 | — | src/views/offline-detection.js | tests/dom/common/common-offline.dom.test.js | — | — |
| O-04 | ✅ | 테스트 | — | src/app-shell.js<br>sw.js | tests/dom/common/common-offline.dom.test.js | — | — |
| O-05 | ✅ | E2E 테스트 | — | src/views/offline-detection.js | tests/dom/common/common-offline.dom.test.js<br>tests/e2e/flows.spec.js | — | — |
| O-06 | ✅ | 테스트 | — | src/config/timing.js<br>src/views/offline-detection.js | tests/dom/common/common-offline.dom.test.js | — | — |
| O-07 | ✅ | 테스트 | — | src/views/offline-detection.js | tests/dom/common/common-offline.dom.test.js | — | — |

## 4.3 보안

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| S-01 | ✅ | 테스트 | DOC-ADR-07<br>DOC-DSN-08<br>DOC-DSN-09 | index.html<br>tools/build/build_html.js | tests/unit/app/security.test.js | — | — |
| S-02 | ✅ | 테스트 | DOC-ADR-07 | src/app.js<br>src/views/event-listeners.js<br>src/views/listeners-delegation.js | tests/dom/common/common-eventlisteners.dom.test.js | — | — |
| S-03 | ✅ | 테스트 | — | src/app.js<br>src/views/event-listeners.js<br>src/views/listeners-delegation.js | tests/dom/common/common-eventlisteners.dom.test.js | — | — |
| S-04 | ✅ | 테스트 | — | — | tests/unit/app/delegation-guard.test.js | — | — |
| S-05 | ✅ | 테스트 | DOC-DEV-09 | src/sanitize.js<br>tools/check/check_html_escape.js | tests/unit/app/sanitize.test.js | — | — |
| S-06 | ✅ | 테스트 | — | src/storage-keys.js<br>src/views/backup.js | tests/dom/misc/backup.dom.test.js | — | — |
| S-07 | ✅ | 테스트 | — | index.html | tests/unit/app/security.test.js | — | — |
| S-08 | ✅ | 테스트 | — | src/app.js | tests/unit/app/security.test.js | — | — |

## 4.4 성능

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| PF-01 | ✅ | 테스트 | — | src/data-loader.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-02 | ✅ | 테스트 | DOC-DSN-18 | src/data-loader.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-03 | ✅ | 테스트 | — | src/data-loader.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-04 | ✅ | 테스트 | — | src/reader/html-viewer.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-05 | ✅ | 테스트 | — | src/reader/html-viewer.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-06 | ✅ | 테스트 | — | src/reader/html-viewer.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-07 | ✅ | 테스트 | — | src/data-loader.js<br>src/views/dashboard.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-08 | ✅ | 테스트 | — | src/views/textbook-search.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-09 | ✅ | 테스트 | — | src/views/dictionary.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-10 | ✅ | 테스트 | — | src/app.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-11 | ✅ | 테스트 | — | ref-pipeline/convert.py<br>ref-pipeline/pdf2md.py | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-12 | ✅ | 테스트 | — | src/keyword-index.js<br>tools/build/build_keyword_index.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-13 | ✅ | 테스트 | — | src/reader/mermaid-render.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-14 | ✅ | 테스트 | — | css/base.css | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-15 | ✅ | 테스트 | — | ref-pipeline/convert.py | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-16 | ✅ | 테스트 | — | src/reader/mermaid-render.js | tests/unit/gates/perf-invariants.test.js | — | — |
| PF-17 | ✅ (목표 확정) | 테스트 | DOC-DSN-20 | — | tests/unit/gates/perf-invariants.test.js | — | — |

## 4.5 접근성

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| A-01 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | index.html | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y.spec.js | — | — |
| A-02 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | src/views/flashcard.js | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y-interaction.spec.js | — | — |
| A-03 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>css/dashboard.css<br>css/ui-overlay.css | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y.spec.js | — | — |
| A-04 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y.spec.js | — | — |
| A-05 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>css/ui-overlay.css | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y-interaction.spec.js | — | — |
| A-06 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>css/study.css | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y-interaction.spec.js | — | — |
| A-07 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | src/ui-utils.js | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/a11y-interaction.spec.js | — | — |

## 4.6 반응형 & 모바일

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| R-01 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| R-02 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/responsive-flow.spec.js | — | — |
| R-03 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/app-chrome.spec.js | — | — |
| R-04 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | src/views/navigation.js | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/responsive-flow.spec.js | — | — |
| R-05 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/dashboard.css | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/responsive-flow.spec.js | — | — |
| R-06 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| R-07 | ✅ | 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| R-08 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | src/app-shell.js | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/responsive-flow.spec.js | — | — |
| R-09 | ✅ | 테스트 | DOC-DSN-01 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| R-10 | ✅ | E2E 테스트 | — | css/reader.css | tests/e2e/toc-sidebar.spec.js | — | — |

## 4.7 테마 시스템

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| TH-01 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>css/reader-extras.css<br>src/theme-toggle.js | tests/dom/common/common-theme.dom.test.js<br>tests/e2e/theme.spec.js | — | — |
| TH-02 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>index.html<br>src/theme-init.js<br>src/theme-toggle.js | tests/dom/common/common-theme.dom.test.js<br>tests/e2e/theme.spec.js | — | — |
| TH-03 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>src/theme-init.js<br>src/theme-toggle.js | tests/dom/common/common-theme.dom.test.js<br>tests/e2e/theme.spec.js | — | — |
| TH-04 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>src/theme-toggle.js | tests/dom/common/common-theme.dom.test.js<br>tests/e2e/theme.spec.js | — | — |
| TH-05 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>css/reader-extras.css<br>src/theme-toggle.js | tests/dom/common/common-theme.dom.test.js<br>tests/e2e/theme.spec.js | — | — |
| TH-06 | ✅ | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | css/base.css<br>css/reader-mermaid.css<br>src/reader/mermaid-utils.js | tests/dom/common/common-theme.dom.test.js<br>tests/e2e/flows.spec.js<br>tests/unit/mermaid/mermaid-utils.test.js | — | — |

## 4.8 UI/UX 설계 요구사양

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| OB-01 | `onboarding.js` — 단계 진행 도트·건너뛰기·이전 지원, 목표 검증 실패 시 진행 차단. 학습 실행은 `data-click` 위임(모듈 import 없이 기존 액션 재사용). UX-FB-05의 1회성·재열람 계약은 불변 | 테스트 | — | src/onboarding.js | tests/dom/misc/onboarding-zoom.dom.test.js | — | — |
| UX-FB-01 | `@media (max-width: 768px) { #app-toast { top:auto; bottom: calc(80px + safe-area) } }` — 하단 탭 바 위 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css<br>src/ui-utils.js | tests/e2e/a11y-interaction.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-FB-02 | 네이티브 대화상자는 PWA 설치 흐름을 깨고 스타일 제어 불가. 커스텀 모달은 포커스 트랩 + Escape + 배경 클릭 닫기 포함 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css<br>src/ui-utils.js | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-FB-03 | `animationend` 리스너로 클래스 해제 — `display:none` 상태에서는 애니메이션이 안 돌아 첫 실제 표시에 실행됨. `prefers-reduced-motion`에서는 자동으로 0.01ms 처리됨 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css<br>src/ui-utils.js | tests/e2e/reader-markers.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-FB-04 | 부분 스켈레톤보다 구현 비용이 낮고 일관됨 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css<br>src/ui-utils.js | tests/e2e/app.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-FB-05 | 기존 사용자는 플래그만 기록해 방해하지 않음 — 재방문 강제 안내 금지 | E2E 테스트 | DOC-DSN-11<br>DOC-DSN-25 | src/onboarding.js | tests/dom/misc/onboarding-zoom.dom.test.js<br>tests/e2e/a11y-interaction.spec.js | — | — |
| UX-FB-06 | 자가 등록 모달(`.cing-*`)이 필드 5개로 `90dvh`를 넘겨 등록·취소 버튼이 잘린 실사례. 공용 `.app-confirm-dialog`(컨펌·의견·Pro·온보딩·통계 공유)와 `.auth-modal-card`·`.f-weigh-card`에 적용 — UX-SET-02(설정 패널)의 다이얼로그 일반화. E2E가 세로·가로 뷰포트에서 푸터 버튼 위치를 실측. 신규 카드는 공용 규약 클래스 `.dialog-card`(css/base.css — 90dvh 상한+스크롤) 사용, `check:mobilesafe`가 `role="dialog"` 마크업에 클래스 부재를 정적 검사 | E2E 테스트 | DOC-DSN-25 | — | tests/dom/common/common-a11y.dom.test.js<br>tests/e2e/mobile-overflow.spec.js | — | — |
| UX-FB-07 | `.skeleton` 유틸은 base.css 공용 — `skeleton-text`/`skeleton-block`·폭 변형(`w-60`/`w-80`). shimmer는 `@media (prefers-reduced-motion)` 전역 무효화에 포함. 전체화면 fetch는 기존 UX-FB-04 오버레이 유지 (혼용 금지 — 부분 본문 교체에만 스켈레톤) | — | — | — | — | — | — |
| UX-FB-08 | `_prevQueueLen`(직전 큐 길이)로 전이만 감지. `prefers-reduced-motion`에서는 애니메이션 자동 소거 — 상태 메시지 텍스트 자체가 보조 수단 | — | — | — | — | — | — |
| UX-FORM-01 | 16px 미만이면 iOS Safari가 포커스 시 자동 확대 | E2E 테스트 | DOC-DSN-25 | css/reader.css | tests/e2e/responsive-flow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-FORM-02 | 모바일에서 물리적 눌림감 제공 | E2E 테스트 | DOC-DSN-25 | css/base.css | tests/e2e/responsive-flow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-HELP-01 | 입력 필드·수식키 조합에서는 미동작. `Esc`·`?`·배경 클릭 닫기, 포커스 트랩 적용. 단축키 조합표는 모듈 상수로 분리해 단위 테스트 가능 | E2E 테스트 | — | src/shortcuts-help.js | tests/dom/misc/shortcut-help.dom.test.js<br>tests/e2e/ux-surfaces.spec.js<br>tests/unit/app/shortcuts-help.test.js | — | — |
| UX-NAV-01 | 한 번에 하나의 네비게이션만 노출 — 중복 방지. 하단 탭 바는 엄지 도달권, 탭 수가 늘어나면 가로 스크롤보다 핵심 5탭 + `role="dialog"` 시트(`#mobile-more-sheet`)가 발견성·터치 안정성에 유리. 활성 탭은 `scrollIntoView({inline:'center'})`로 가시화 + `aria-current="page"`, 시트 소속 뷰 활성 시 더보기 탭에 활성 표시 | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25<br>DOC-REF-09 | css/app-responsive.css<br>src/app.js<br>src/router.js | tests/dom/common/common-navigation.dom.test.js<br>tests/dom/misc/router.dom.test.js<br>tests/dom/misc/ui-structure.dom.test.js<br>tests/e2e/app.spec.js<br>…외 1개 | — | — |
| UX-NAV-02 | 스크롤 중에도 설정·테마에 접근 가능. 단, 부모가 스크롤 컨테이너(`overflow-y: auto`)일 때만 작동 — `body` 스크롤 구조면 의도대로 동작하는지 확인할 것 | 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| UX-NAV-03 | 드롭다운은 절대위치로 헤더 경계를 넘어야 함. 넘침 제어는 `min-width:0`+말줄임과 `flex-shrink:0`으로 처리 | 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| UX-NAV-04 | `.app-container { width: 100% }`. 특히 클래식 스크롤바가 상시 표시되는 데스크톱에서 차이 발생 | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/a11y.spec.js | — | — |
| UX-NAV-05 | back-to-top(`bottom:1.25rem`)이 탭 바(z 1400)에 완전히 가려진 실제 사례. 배너·토스트·플로팅 버튼 신규 추가 시에도 동일 규칙 적용. `.main-content`는 `padding-bottom: calc(80px + safe)` + `scroll-padding-bottom`으로 콘텐츠·포커스 요소 보호 | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/mobile-overflow.spec.js | — | — |
| UX-NAV-06 | `searchAll()`은 소스 주입 가능한 순수 함수로 분리해 테스트 가능. 실행은 기존 경로 재사용(nav 클릭 시뮬레이션, `startSubjectStudy/Quiz`, `openSubjectChapter`, `ExamViewer.openExam`) — 네비게이션 분기 신설 금지. 뷰 목록은 nav-item DOM 스캔이라 feature 게이팅(`is-hidden`)을 자동 반영. z-index 2500 (탭 바·모달 위). 전 소스 로컬 데이터로 오프라인 동작 | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-11<br>DOC-DSN-25 | src/command-palette.js | tests/dom/common/common-navigation.dom.test.js<br>tests/dom/study/study-commandpalette.dom.test.js<br>tests/e2e/responsive-flow.spec.js<br>tests/unit/app/command-palette.test.js | — | — |
| UX-NAV-07 | 내비게이션(사이드바·탭 바·뒤로가기)은 사용자의 이전 위치를 보존하는 게 기대 동작이지만, "맞춤 리포트 보기"·"퀴즈 풀기" 같은 액션 버튼이 이전 스크롤을 복원하면 중간에서 열려 맥락을 잃는다. `restoreScrollPosition`의 `pendingTop` 플래그가 복원 시점에 소비되어 `saveScrollPosition` 덮어쓰기와 무관하게 동작. 새 액션 딥링크 추가 시 `scrollTop: true` 필수 — `data-args='["view-id", {"scrollTop": true}]'` 또는 직접 호출 모두 지원. `.main-content`는 전 뷰 공유 스크롤 컨테이너라 인트라뷰 패널 전환 시 scrollTop이 잔류해 새 화면 상단이 잘림 — `navigation.js`의 `resetMainScroll()`을 각 전환 지점(훈련소 서브패널·드릴/퀴즈/모의고사 문항·결과 전이, Formula OS showPanel, 자체 스크롤 오버레이는 해당 컨테이너 scrollTop)에 호출 | E2E 테스트 | DOC-DSN-01<br>DOC-DSN-11<br>DOC-DSN-21<br>DOC-DSN-25 | src/views/navigation.js | tests/dom/common/common-navigation.dom.test.js<br>tests/e2e/responsive-flow.spec.js | — | — |
| UX-NAV-08 | SPA에서 뒤로가기가 없으면 Android/PWA 뒤로가기 시 앱이 종료됨. 해시는 공유 가능한 딥링크도 제공. `navigateToView` 재진입은 `_hashNavigating` 플래그로 pushState를 생략해 무한 루프 방지. nav-item 없는 뷰(exam-select)는 `registerViewNavigator`로 등록된 라우터 경로가 `switchView` 폴백을 대신해 제목·해시·렌더를 동일하게 동기화 | E2E 테스트 | DOC-DSN-11<br>DOC-DSN-21<br>DOC-DSN-25<br>DOC-REF-09 | src/modal-back.js<br>src/router.js | tests/dom/misc/router.dom.test.js<br>tests/dom/misc/ui-structure.dom.test.js<br>tests/e2e/app.spec.js<br>tests/e2e/more-sheet.spec.js | — | — |
| UX-NAV-09 | 인플로우 크롬은 본문 높이를 영구 잠식하고, transform만 적용한 숨김은 공간을 회수하지 못함(실측: 본문 63%→89% vh). 오버레이 시 콘텐츠 스크롤 컨테이너에 `padding-top`=크롬 높이를 줘 첫 화면이 크롬 아래 묻히지 않게 함 — 패딩은 스크롤과 함께 밀려나므로 읽는 중 잠식 0. 크롬 아래를 지나는 다른 오버레이(섹션 표시줄 등)는 `~` 시빌링 셀렉터로 숨김 상태와 위치를 연동할 것 | E2E 테스트 | DOC-DSN-25 | css/reader.css | tests/e2e/toc-sidebar.spec.js | — | — |
| UX-NAV-10 | 성분사전 검색 행이 버튼 4개(초기화·CSV·전체 CSV·성분 추가)를 nowrap으로 나열해 모바일에서 '성분 추가'가 잘린 실사례. `text-overflow:ellipsis` 말줄임과 가로 스크롤 컨테이너(표 wrapper 등)는 의도된 클립이라 예외. E2E 스윕(`mobile-overflow.spec.js`)이 전 뷰를 프로젝트 뷰포트별로 실측 | E2E 테스트 | DOC-DSN-25 | — | tests/e2e/mobile-overflow.spec.js | — | — |
| UX-NAV-11 | UX-NAV-05의 실측 확장 — 탭 바 위치 계약을 요소 단위로 검증. 스크롤 컨테이너 가장자리 클립은 스크롤로 도달 가능하므로 예외, 일시 오버레이(토스트·오프라인 배너)는 소멸성이라 예외. E2E(`mobile-overflow.spec.js`)가 전 뷰의 상호작용 요소를 `scrollIntoView`+히트 테스트로 순회 | E2E 테스트 | DOC-DSN-25 | — | tests/e2e/mobile-overflow.spec.js | — | — |
| UX-NAV-12 | 그룹 라벨은 `index.template.html`의 `.nav-group-label` 정적 마크업 — 모바일 시트는 동일 DOM 슬롯을 공유해 분류가 대역 간 자동 일치. 표시명만 바뀌고 `data-target`·라우트 ID는 불변 | 테스트 | DOC-DSN-21<br>DOC-DSN-25 | — | tests/dom/common/common-navigation.dom.test.js | — | — |
| UX-NAV-13 | `html/views/{quiz,exam,trainer,review}.html` 정적 문구 — manifest `uiText` subtitle과 별도 본문 표기라 `check:uitext` 비대상 | 테스트 | DOC-DSN-21<br>DOC-DSN-25 | — | tests/dom/study/study-review.dom.test.js | — | — |
| UX-NAV-14 | `html/views/trainer.html` 정적 구조 — 카드 DOM·`data-click`·`data-feature`·배지 id 불변, 그룹 이동만. 라벨은 본문 텍스트라 `check:uitext` 비대상 | E2E 테스트 | DOC-DSN-21<br>DOC-DSN-25 | css/trainer.css<br>html/views/trainer.html<br>index.html | tests/dom/study/study-trainer.dom.test.js<br>tests/e2e/app.spec.js | — | — |
| UX-PWA-01 | 모바일 OS(Android/iOS)는 웹의 자체 종료를 차단 — 프로그래밍으로 완전 종료 불가. 데스크톱 설치 PWA는 `close()`가 동작하므로 모바일 안내는 불필요. 차단되면 "최근 앱 목록에서 밀어 닫으세요"(터치)/"창을 닫아주세요"(데스크톱) 안내 화면으로 대체하는 것이 최선 | E2E 테스트 | DOC-DSN-25 | src/app.js | tests/e2e/responsive-flow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-PWA-02 | 브라우저 탭에서 의미 없는 버튼(앱 종료 등)을 숨겨 혼란 방지. iOS는 `navigator.standalone`만 지원하므로 둘 다 확인 필수 | E2E 테스트 | DOC-DSN-25 | src/pwa/pwa-install.js | tests/e2e/responsive-flow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-PWA-03 | "배포했는데 안 바뀐다" 보고의 대부분이 이 패턴. 사용자 안내 문구와 업데이트 토스트 필수 | E2E 테스트 | DOC-DSN-25 | sw.js<br>tools/check/check_perf_budget.js | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-PWA-04 | 미설치 상태에서만 노출, 설치 후 자동 숨김 — 헤더 공간 절약 | E2E 테스트 | DOC-DSN-25 | src/pwa/pwa-install.js | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-PWA-05 | PWA 콜드 스타트에서 `dvh`가 실제 화면보다 크게 측정되면 `.main-content` 끝이 화면 밖으로 밀려 스크롤 끝 콘텐츠가 탭 바에 가려짐(대시보드 '내 학습 분석·도구' 실제 장애). JS 미실행 시 `100dvh` 폴백 | E2E 테스트 | DOC-DSN-25 | src/app.js | tests/dom/common/app-shell.dom.test.js<br>tests/e2e/responsive-flow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-PWA-06 | 현장(실습·조제실)에서 대시보드 경유 탭을 생략. 시험 도메인 기능이라 플랫폼 공통 `manifest.webmanifest`가 아닌 시험별 매니페스트에만 선언 — exams.json `pwaShortcuts` → `build_exams_list.js` 패스스루 | E2E 테스트 | — | tools/build/build_exams_list.js | tests/e2e/exams/cosmetic/formula-tablet.spec.js<br>tests/unit/app/pwa-sw.test.js | — | — |
| UX-PWA-07 | `id`가 다르면 브라우저가 별개 앱으로 인식해 중복 설치되고, `name`이 다르면 아이콘이 설치 시점 시험명으로 고정된다(설치 후 시험 전환해도 갱신 불가 — 설치 시 manifest URL만 재조회). 시험 구분은 document.title·로고·shortcuts 등 앱 내부 브랜딩으로 표현 | E2E 테스트 | — | src/pwa/pwa-manifest.js<br>tools/build/build_exams_list.js | tests/e2e/exam-switch.spec.js<br>tests/unit/app/pwa-sw.test.js | — | — |
| UX-SCR-01 | `@media (pointer: coarse), (max-width: 900px) { * { scrollbar-width: none } ::-webkit-scrollbar { width:0; height:0 } }` — `pointer: coarse`만 믿지 말고 폭 기준을 병기할 것(일부 기기에서 pointer 감지 실패 사례 있음). 모바일 스크롤바는 드래그용이 아니므로 위치 표시도 불필요 | E2E 테스트 | DOC-DSN-25 | css/reader.css<br>src/views/reader-toolbar.js | tests/e2e/responsive-flow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SCR-02 | `*` 또는 개별 컨테이너에 지정 | E2E 테스트 | DOC-DSN-25 | css/reader.css | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SCR-03 | 하드코딩 색상은 다크/라이트 한쪽에서 묻힘 (실제로 미정의 변수 폴백으로 라이트 배경에 흰 카드가 되는 사고 있었음 — `.comp-item` 사례) | E2E 테스트 | — | css/reader.css | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SET-01 | 헤더에 아이콘 버튼을 늘리면 모바일에서 제목과 경쟁. 자주 쓰지 않는 토글(가로/세로 보기 등)은 설정 안으로 이동 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css | tests/e2e/app.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SET-02 | 항목이 늘어나도 뷰포트를 넘지 않음. 없으면 소형 기기에서 하단 항목이 잘림 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css | tests/e2e/app.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SET-03 | Apple HIG/Google Material 최소 터치 영역. 인라인 링크·네이티브 체크박스/라디오(라벨이 타깃)는 면제 — 기준선 축소로 점진 개선 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css | tests/e2e/app.spec.js<br>tests/e2e/mobile-overflow.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SET-04 | 사용자가 "몇 버전인지" 문의할 때 유일한 확인 경로. SW 등록 스크립트 URL에서 버전 자동 추출 | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-SET-05 | 일관된 드롭다운 UX | E2E 테스트 | DOC-DSN-25 | css/ui-overlay.css<br>src/views/listeners-app.js | tests/e2e/app-chrome.spec.js<br>tests/unit/app/ux-invariants.test.js | — | — |
| UX-VFY-01 | 요구사양 없는 UI 변경은 추적·리뷰 불가 — TR-21~23처럼 선 정의 후 구현하는 관행을 규약화 | 문서 검토 | DOC-DSN-25<br>DOC-RBK-11 | — | — | — | — |
| UX-VFY-02 | jsdom은 레이아웃을 계산하지 않으므로 DOM/단위 테스트로는 기하 요구사항을 검증할 수 없음 | E2E 테스트 | DOC-DSN-25<br>DOC-RBK-11 | — | tests/e2e/mobile-overflow.spec.js | — | — |
| UX-VFY-03 | 신규 UI/UX 요구사항은 E2E와 함께 진입 — 기존 백로그(규약형 다수)는 기준선 승계 후 점진 축소 | 문서 검토 | DOC-DSN-25<br>DOC-RBK-11 | — | — | — | — |
| UX-VFY-04 | 선언이 아닌 계측으로 증명 — 리더 개선(349→527→652px)처럼 전후 수치를 이력에 남김 | 문서 검토 | DOC-DSN-25<br>DOC-RBK-11 | — | — | — | — |
| UX-VFY-05 | SW Cache First로 즉시 반영되지 않고(UX-PWA-03), 기기별 뷰포트·safe-area는 로컬 에뮬레이션과 다를 수 있음 | 문서 검토 | DOC-DSN-25<br>DOC-RBK-11 | — | — | — | — |
| UX-VFY-06 | E2E 스윕이 런타임 실측이라면 체커는 패턴 기반 조기 차단 — 마크업만 봐도 새 다이얼로그·버튼 행의 잘림 위험을 알 수 있음. 자체 스크롤 계약(more-sheet·리더 표 모달 등)은 예외 목록에 사유와 함께 선언, 의도된 nowrap은 `data-msafe-ok`로 명시적 면제 | 테스트 | DOC-DEV-09<br>DOC-DSN-25 | tools/check/check_mobile_safe.js | tests/dom/common/common-a11y.dom.test.js | — | — |

## 5.1 데이터 아키텍처

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| DA-01 | ✅ | 테스트 | DOC-RBK-03<br>DOC-RBK-08<br>DOC-REF-08 | tools/build/index.js<br>tools/build/manifest_loader.js | tests/unit/app/data-architecture.test.js | — | — |
| DA-02 | ✅ | 테스트 | DOC-DSN-18<br>DOC-DSN-19<br>DOC-DSN-20<br>DOC-DSN-33<br>…외 2개 | src/data-loader.js<br>tools/build/index.js | tests/unit/app/data-architecture.test.js | — | — |
| DA-03 | ✅ | 테스트 | DOC-RBK-03<br>DOC-REF-08 | src/data-loader.js | tests/unit/app/data-loader.test.js | — | — |
| DA-04 | ✅ | 테스트 | DOC-RBK-03<br>DOC-REF-08 | tools/build/build_study_md_bundle.js | tests/unit/app/data-architecture.test.js | — | — |
| DA-05 | ✅ | 테스트 | DOC-DEV-09<br>DOC-DSN-18<br>DOC-RBK-03<br>DOC-REF-08 | src/state.js<br>src/storage.js | tests/unit/app/state.test.js | — | — |
| DA-06 | ✅ | 테스트 | DOC-DSN-10<br>DOC-DSN-18<br>DOC-RBK-03<br>DOC-REF-08 | src/exam-context.js<br>src/paths.js<br>src/pwa/pwa-manifest.js<br>tools/build/exam_targets.js<br>…외 2개 | tests/unit/app/data-architecture.test.js<br>tests/unit/gates/exam-onboard.test.js | — | — |
| DA-07 | ✅ | 테스트 | DOC-DEV-09<br>DOC-DSN-10<br>DOC-RBK-03<br>DOC-REF-08 | src/exam-context.js<br>src/storage-keys.js<br>src/storage.js | tests/unit/gates/storage-key-sync.test.js | — | — |
| DA-08 | ✅ | 테스트 | DOC-ADR-16<br>DOC-DSN-08<br>DOC-DSN-10<br>DOC-DSN-18<br>…외 2개 | src/exam-context.js | tests/unit/app/data-architecture.test.js | — | — |
| DA-09 | ✅ | 테스트 | DOC-ADR-06<br>DOC-DEV-09<br>DOC-RBK-03<br>DOC-REF-08 | src/storage.js | tests/unit/app/storage.test.js | — | — |
| DA-10 | ✅ | 테스트 | — | src/auth-sync/sync.js<br>src/exams/cosmetic/customer-store.js | tests/unit/exams/cosmetic/customer-store.test.js | — | 개인정보보호법 — 상동 (조제관리사가 고객 개인정보를 클라우드에 올리지 않는 설계) |
| DA-11 | ✅ | 테스트 | DOC-RBK-10 | tools/check/check_domain_map.js | tests/unit/gates/multi-exam-gates.test.js | — | — |
| DA-12 | ✅ | 테스트 | DOC-DEV-09<br>DOC-RBK-10 | tools/check/check_uitext.js | tests/unit/gates/multi-exam-gates.test.js | — | — |
| DA-13 | ✅ | E2E 테스트 | DOC-ADR-16<br>DOC-DEV-08<br>DOC-DEV-09<br>DOC-DSN-33 | — | tests/e2e/exam-switch.spec.js | — | — |
| DA-14 | ✅ | 테스트 | — | src/app-shell.js<br>src/pwa/pwa-manifest.js | tests/unit/app/exam-context.test.js | — | — |
| DA-15 | ✅ | 테스트 | DOC-RBK-16 | src/exam-context.js<br>tools/check/check_content_independence.js | tests/unit/app/exam-context.test.js<br>tests/unit/gates/da15-content-independence.test.js | — | — |

## 5.2 안정적 ID 체계

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| ID-01 | ✅ | 테스트 | DOC-DSN-04<br>DOC-RBK-08<br>DOC-REF-03<br>DOC-REF-05 | src/sha256.js<br>tools/build/id_factory.js | tests/unit/app/id-factory.test.js<br>tests/unit/app/sha256.test.js | — | — |
| ID-02 | ✅ | 테스트 | DOC-DSN-04<br>DOC-RBK-08<br>DOC-REF-03<br>DOC-REF-05 | src/sha256.js<br>tools/build/id_factory.js | tests/unit/app/id-factory.test.js<br>tests/unit/app/sha256.test.js | — | — |
| ID-03 | ✅ | 테스트 | DOC-DSN-04<br>DOC-RBK-08<br>DOC-REF-03<br>DOC-REF-05 | tools/build/id_factory.js | tests/unit/app/id-factory.test.js | — | — |
| ID-04 | ✅ | 테스트 | DOC-DSN-04<br>DOC-RBK-08<br>DOC-REF-03<br>DOC-REF-05 | tools/build/build_id_migration.js<br>tools/build/id_factory.js | tests/unit/app/id-factory.test.js | — | — |
| ID-05 | ✅ | 테스트 | DOC-ADR-08<br>DOC-DEV-09 | tools/check/check_position_independence.js | tests/unit/gates/posindep.test.js | — | — |

## 5.3 빌드 파이프라인

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| BP-01 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | src/reader/textbook-core.js<br>tools/build/build_all_data.js<br>tools/build/build_audio_manifest.js<br>tools/build/build_combo_drills.js<br>…외 20개 | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-02 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/build/index.js<br>tools/build/schema.js<br>tools/check/check_imports.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-03 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/build/index.js<br>tools/build/manifest_loader.js<br>tools/check/check_manifest.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-04 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/build/build_exam_bundles.js<br>tools/build/index.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-05 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/check/check_parser_parity.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-06 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/build/build_keyword_index.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-07 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/build/stamp_release_notes.js<br>tools/build/stamp_sw_version.js<br>tools/deploy/deploy.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-08 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-02<br>DOC-RBK-03<br>…외 3개 | tools/check/audit_card_quality.js | tests/unit/gates/build-pipeline.test.js | — | — |
| BP-09 | ✅ | 테스트 | DOC-ADR-12<br>DOC-RBK-02<br>DOC-RBK-10 | tools/build/build_doc_bundles.js | tests/unit/gates/multi-exam-gates.test.js | — | — |
| BP-10 | ✅ | 테스트 | DOC-ADR-12<br>DOC-RBK-02<br>DOC-RBK-13 | tools/build/build_story_textbooks.js | tests/unit/gates/reader-analysis-gates.test.js | — | — |
| BP-11 | ✅ | 테스트 | DOC-ADR-12<br>DOC-RBK-02<br>DOC-RBK-13 | tools/build/build_story_textbooks.js | tests/unit/content/story-merge.test.js | — | — |
| BP-12 | ✅ | 테스트 | DOC-ADR-12<br>DOC-RBK-02<br>DOC-RBK-13 | tools/build/build_story_textbooks.js | tests/unit/content/story-merge.test.js | — | — |
| BP-13 | ✅ | 테스트 | DOC-ADR-12<br>DOC-ADR-17<br>DOC-DSN-20<br>DOC-RBK-02 | tools/check/check_vendor.js<br>tools/sync/sync_vendor.js | tests/unit/gates/vendor-manifest.test.js | — | — |
| BP-14 | ✅ | 테스트 | DOC-RBK-02 | tools/build/extract_glossary_candidates.js<br>tools/check/check_glossary_signal.js | tests/unit/content/glossary-extract.test.js<br>tests/unit/gates/check-glossary-signal.test.js | — | — |
| BP-15 | ✅ | 테스트 | DOC-RBK-02<br>DOC-RBK-07 | tools/build/scaffold_chapter.js | tests/unit/content/scaffold-chapter.test.js | — | — |

## 5.4 콘텐츠 구조

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| CS-01 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | ref-pipeline/batch_convert.py<br>ref-pipeline/md2doc.py<br>src/reader/textbook-core.js<br>tools/build/build_study_md_bundle.js<br>…외 2개 | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-02 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | tools/build/index.js<br>tools/build/plugins/exams.plugin.js | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-03 | ✅ | 테스트 | DOC-ADR-12<br>DOC-DSN-19<br>DOC-PPL-01<br>DOC-RBK-03<br>…외 4개 | ref-pipeline/check_laws.py<br>ref-pipeline/convert.py<br>ref-pipeline/pdf2md.py<br>tools/check/check_ref_freshness.js<br>…외 2개 | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-04 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | tools/build/index.js | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-05 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | ref-pipeline/batch_convert.py<br>ref-pipeline/md2doc.py | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-06 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | tools/build/build_keyword_index.js | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-07 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | ref-pipeline/audiobook/cleanup_empty_mp3.py<br>ref-pipeline/audiobook/generate_all_mp3.py<br>ref-pipeline/audiobook/md_chunker.py<br>ref-pipeline/audiobook/mp3_merger.py<br>…외 6개 | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-08 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | tools/build/build_study_md_bundle.js | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-09 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | ref-pipeline/convert.py<br>tools/check/check_ref_subjects.js<br>tools/check/check_reflayout.js<br>tools/check/check_refmerge.js | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-10 | ✅ | 테스트 | DOC-ADR-12<br>DOC-PPL-01<br>DOC-RBK-03<br>DOC-RBK-07<br>…외 3개 | ref-pipeline/convert.py<br>ref-pipeline/pdf2md.py | tests/unit/gates/content-structure.test.js | DOC-ARC-08 | — |
| CS-11 | ✅ | 테스트 | DOC-RBK-07<br>DOC-REF-07 | tools/ai/ai_textbook.js | tests/unit/content/ai-textbook.test.js<br>tests/unit/content/scaffold-chapter.test.js | — | — |

## 5.5 교재 콘텐츠 학습 보조 요소

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| CE-01 | ✅ | 테스트 | DOC-RBK-07 | — | tests/unit/gates/content-engineering.test.js | — | — |
| CE-02 | ✅ | 테스트 | DOC-RBK-07 | — | tests/unit/gates/content-engineering.test.js | — | — |
| CE-03 | ✅ | 테스트 | DOC-RBK-07 | — | tests/unit/gates/content-engineering.test.js | — | — |
| CE-04 | ✅ | 테스트 | DOC-RBK-07 | — | tests/unit/gates/content-engineering.test.js | — | — |
| CE-05 | ✅ | 테스트 | DOC-RBK-07 | — | tests/unit/gates/content-engineering.test.js | — | — |

## 5.6 이야기형 교재 서사 구조

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| ST-01 | ✅ | 테스트 | DOC-ADR-03<br>DOC-RBK-07<br>DOC-RBK-13 | src/views/reader-loader.js<br>src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |
| ST-02 | ✅ | 테스트 | DOC-ADR-03<br>DOC-RBK-07<br>DOC-RBK-13 | src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |
| ST-03 | ✅ | 테스트 | DOC-ADR-03<br>DOC-RBK-07<br>DOC-RBK-13 | src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |
| ST-04 | ✅ | 테스트 | DOC-ADR-03<br>DOC-RBK-07<br>DOC-RBK-13 | src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |
| ST-05 | ✅ | 테스트 | DOC-ADR-03<br>DOC-RBK-07<br>DOC-RBK-13 | src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |
| ST-06 | ✅ | 테스트 | DOC-RBK-07<br>DOC-RBK-13 | src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |
| ST-07 | ✅ | 테스트 | DOC-RBK-07<br>DOC-RBK-13 | src/views/textbook-reader.js | tests/unit/content/story-textbook.test.js | — | — |

## 7.2 유료화 인프라

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| ROAD-P0 | ✅ | 테스트 | DOC-BIZ-01<br>DOC-BIZ-02<br>DOC-BIZ-03<br>DOC-BIZ-04<br>…외 6개 | src/pro-upgrade.js<br>tools/check/check_plan_features.js | tests/dom/misc/pro-plan.dom.test.js<br>tests/unit/app/learning-pro.test.js | DOC-ARC-01<br>DOC-ARC-03<br>DOC-ARC-06 | — |
| ROAD-P1 | 미구현 (유일한 Phase 1~2 잔여) | 문서 검토 | DOC-BIZ-01<br>DOC-BIZ-02<br>DOC-BIZ-03<br>DOC-BIZ-04<br>…외 4개 | — | — | DOC-ARC-01<br>DOC-ARC-03<br>DOC-ARC-06 | 사업 문서 — docs/exams/cosmetic/report_archive/FEATURE_PROPOSALS.md · SUBSCRIPTION_ROADMAP.md |
| ROAD-P2 | 미구현 | 문서 검토 | DOC-BIZ-01<br>DOC-BIZ-02<br>DOC-BIZ-03<br>DOC-BIZ-04<br>…외 3개 | — | — | DOC-ARC-01<br>DOC-ARC-03<br>DOC-ARC-06 | 사업 문서 — docs/exams/cosmetic/report_archive/FEATURE_PROPOSALS.md · SUBSCRIPTION_ROADMAP.md |
| ROAD-P3 | 미구현 | 문서 검토 | DOC-BIZ-01<br>DOC-BIZ-02<br>DOC-BIZ-03<br>DOC-BIZ-04<br>…외 3개 | — | — | DOC-ARC-01<br>DOC-ARC-02<br>DOC-ARC-03<br>DOC-ARC-06 | 사업 문서 — docs/exams/cosmetic/report_archive/FEATURE_PROPOSALS.md · SUBSCRIPTION_ROADMAP.md |
| ROAD-P4 | ✅ 결정·게이트 구현 | 테스트 | DOC-BIZ-01<br>DOC-BIZ-02<br>DOC-BIZ-03<br>DOC-BIZ-04<br>…외 3개 | src/auth-sync/sync.js | tests/dom/common/common-sync.dom.test.js | DOC-ARC-01<br>DOC-ARC-03<br>DOC-ARC-06<br>DOC-ARC-07 | 사업 문서 — docs/exams/cosmetic/report_archive/FEATURE_PROPOSALS.md · SUBSCRIPTION_ROADMAP.md |
| ROAD-P5 | ✅ | 테스트 | DOC-DSN-21<br>DOC-DSN-35 | — | tests/dom/misc/pro-notice.dom.test.js | — | — |
| ROAD-P6 | ✅ | 문서 검토 | DOC-DSN-35 | — | — | — | — |

## 7.3 Learning Pro 잔여·차별화

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| ROAD-L1 | 🟡 부분 (예상 점수만) | 테스트 | — | src/recommendations.js | tests/unit/app/learning-pro.test.js | — | 사업 문서 — docs/exams/cosmetic/report_archive/PRO_MULTI_EXAM_EVALUATION.md · FEATURE_PROPOSALS.md |
| ROAD-L10 | 미구현 | — | — | — | — | — | — |
| ROAD-L11 | 미구현 | — | — | — | — | — | — |
| ROAD-L2 | 미구현 | — | — | — | — | — | 사업 문서 — docs/exams/cosmetic/report_archive/PRO_MULTI_EXAM_EVALUATION.md · FEATURE_PROPOSALS.md |
| ROAD-L3 | 미구현 | — | — | — | — | — | 사업 문서 — docs/exams/cosmetic/report_archive/PRO_MULTI_EXAM_EVALUATION.md · FEATURE_PROPOSALS.md |
| ROAD-L4 | 미구현 | — | — | — | — | — | 사업 문서 — docs/exams/cosmetic/report_archive/PRO_MULTI_EXAM_EVALUATION.md · FEATURE_PROPOSALS.md |
| ROAD-L5 | ✅ 카운터 구현 (판정 데이터 수집 중) | 테스트 | DOC-DSN-21<br>DOC-DSN-35 | src/usage-stats.js | tests/dom/misc/usage-stats.dom.test.js | — | 사업 문서 — docs/exams/cosmetic/report_archive/PRO_MULTI_EXAM_EVALUATION.md · FEATURE_PROPOSALS.md |
| ROAD-L6 | ①④완료 ⑤보류, 나머지 미구현 | — | — | — | — | — | ML 기법 검토 산출 — LEARNING_ALGORITHM_DESIGN.md (FSRS 적용·RL 보류 판정 근거) |
| ROAD-L7 | 미구현 | — | — | — | — | — | — |
| ROAD-L8 | 미구현 | — | — | — | — | — | — |
| ROAD-L9 | 미구현 | — | — | — | — | — | — |

## 7.6 학습 표면 계측·구조 축소

| ID | 상태 | 검증 수단 | 문서 | 소스 | 테스트 | 보고서 | 출처 |
|----|------|-----------|------|------|--------|--------|------|
| UX-GATE-01 | 미구현 | 문서 검토 | DOC-DSN-21 | — | — | — | — |
| UX-GATE-02 | 미구현 | 문서 검토 | DOC-DSN-21 | — | — | — | — |
| UX-GATE-03 | 미구현 | 문서 검토 | DOC-DSN-21 | — | — | — | — |
| UX-MET-01 | 구현 (2026-10-13) | E2E 테스트 | DOC-DSN-21 | src/usage-stats.js<br>src/views/event-listeners.js<br>src/views/trainer-drills.js | tests/dom/misc/usage-stats.dom.test.js<br>tests/e2e/usage-metrics.spec.js<br>tests/unit/app/usage-metrics.test.js | — | — |
| UX-MET-02 | 구현 (2026-10-13) | E2E 테스트 | DOC-DSN-21<br>DOC-DSN-35 | src/usage-stats.js | tests/dom/misc/usage-stats.dom.test.js<br>tests/e2e/usage-metrics.spec.js | — | — |
| UX-MET-03 | 구현 (2026-10-13) | E2E 테스트 | DOC-DSN-21 | src/usage-stats.js<br>tools/check/aggregate_usage.js | tests/dom/misc/usage-stats.dom.test.js<br>tests/e2e/usage-metrics.spec.js | — | — |
| UX-MET-04 | 구현 (2026-10-13) | E2E 테스트 | DOC-DSN-21 | src/usage-stats.js | tests/dom/misc/usage-stats.dom.test.js<br>tests/e2e/usage-metrics.spec.js<br>tests/unit/app/usage-metrics.test.js | — | — |
| UX-MET-05 | 익명 insert 정책 재사용, session_id만 포함(영속 식별자 미전송), `usage_snapshot_sent` 하루 1회 상한. Supabase 미설정 환경 no-op. 학습 내용 미포함 — 카운터 수치만 | 테스트 | DOC-ADR-19<br>DOC-DSN-35 | src/usage-telemetry.js | tests/unit/app/usage-telemetry.test.js | — | — |
| UX-MET-06 | 구현 (2026-10-22) | E2E 테스트 | DOC-ADR-19<br>DOC-DSN-35 | src/telemetry-consent.js<br>src/usage-telemetry.js | tests/dom/misc/telemetry-consent.dom.test.js<br>tests/e2e/usage-metrics.spec.js<br>tests/unit/app/telemetry-consent.test.js<br>tests/unit/app/usage-telemetry.test.js | — | — |
| UX-MET-07 | 구현 (2026-10-22) | 테스트 | DOC-ADR-19<br>DOC-DSN-35 | src/telemetry-consent.js<br>src/usage-telemetry.js | tests/unit/app/telemetry-consent.test.js<br>tests/unit/app/usage-telemetry.test.js | — | — |
| UX-MET-08 | 구현 (2026-10-22) | 테스트 | DOC-ADR-19<br>DOC-DSN-35 | src/usage-telemetry.js | tests/unit/app/usage-telemetry.test.js | — | — |

---

## 부록 A — 문서 → 요구사양 역방향 매핑

| 문서 ID | 파일 | 관련 SPEC ID |
|---------|------|--------------|
| DOC-ADR-00 | docs/dev/adr/README.md | — |
| DOC-ADR-01 | docs/dev/adr/0001-exam-data-boot-document-write.md | P-01, P-02, P-03, P-04, P-05, P-06 |
| DOC-ADR-02 | docs/dev/adr/0002-domain-asset-convention-paths.md | P-01, P-02, P-03, P-04, P-05, P-06 |
| DOC-ADR-03 | docs/dev/adr/0003-localstorage-first-storage.md | AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08, ST-01, ST-02, ST-03, ST-04, ST-05 |
| DOC-ADR-04 | docs/dev/adr/0004-vanilla-js-no-framework.md | — |
| DOC-ADR-05 | docs/dev/adr/0005-window-global-data-bundles.md | P-01, P-02, P-03, P-04, P-05, P-06 |
| DOC-ADR-06 | docs/dev/adr/0006-storage-single-funnel.md | DA-09 |
| DOC-ADR-07 | docs/dev/adr/0007-csp-self-event-delegation.md | B-04, S-01, S-02 |
| DOC-ADR-08 | docs/dev/adr/0008-position-independence-gate.md | ID-05, TR-27 |
| DOC-ADR-09 | docs/dev/adr/0009-conventions-as-gates.md | — |
| DOC-ADR-10 | docs/dev/adr/0010-ratchet-baselines.md | — |
| DOC-ADR-11 | docs/dev/adr/0011-html-partial-assembly.md | — |
| DOC-ADR-12 | docs/dev/adr/0012-content-md-ssot-committed-bundles.md | BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09, BP-10, BP-11, BP-12, BP-13, CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10 |
| DOC-ADR-13 | docs/dev/adr/0013-single-deploy-path.md | P-13 |
| DOC-ADR-14 | docs/dev/adr/0014-three-tier-test-stack.md | — |
| DOC-ADR-15 | docs/dev/adr/0015-jsdoc-checkjs-over-typescript.md | — |
| DOC-ADR-16 | docs/dev/adr/0016-multi-exam-registry-feature-flags.md | DA-08, DA-13 |
| DOC-ADR-17 | docs/dev/adr/0017-vendored-assets-hash-manifest.md | BP-13 |
| DOC-ADR-18 | docs/dev/adr/0018-fsrs-over-sm2.md | D-18, D-22, F-07, F-08, F-11 |
| DOC-ADR-19 | docs/dev/adr/0019-telemetry-consent-first-party.md | UX-MET-05, UX-MET-06, UX-MET-07, UX-MET-08 |
| DOC-ARC-01 | docs/exams/cosmetic/report_archive/Cosmetic Master Business Plan.md | FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-ARC-02 | docs/exams/cosmetic/report_archive/EXTERNAL_REVIEW_LEARNING_PRO.md | ROAD-P3 |
| DOC-ARC-03 | docs/exams/cosmetic/report_archive/FEATURE_PROPOSALS.md | ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-ARC-04 | docs/exams/cosmetic/report_archive/FORMULA_OS_DESIGN.md | FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23 |
| DOC-ARC-05 | docs/exams/cosmetic/report_archive/PASS_CORE_LOOP_REVIEW.md | D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, DR-01, DR-02, DR-03, DR-04, DR-05, DR-06, DR-07, E-01, E-02, E-03, E-04, E-05, E-06, E-07, F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07, Q-08, Q-09, Q-10, Q-11, SC-01, SC-02, SC-03, T-01, T-02, T-03, T-04, T-05 |
| DOC-ARC-06 | docs/exams/cosmetic/report_archive/PASS_TO_PRACTICE_STRATEGY.md | FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4, UM-01, UM-02, UM-03, UM-04, UM-05 |
| DOC-ARC-07 | docs/exams/cosmetic/report_archive/PRO_MULTI_EXAM_EVALUATION.md | ES-01, ES-02, ES-03, ES-04, ES-05, ROAD-P4 |
| DOC-ARC-08 | docs/exams/cosmetic/report_archive/법령최신확인결과.md | CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10 |
| DOC-ARC-09 | docs/exams/cosmetic/report_archive/오답위험_분석보고서.md | AN-01, AN-02, AN-03, DR-01, DR-02, DR-03, DR-04, DR-05, DR-06, DR-07, Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07, Q-08, Q-09, Q-10, Q-11 |
| DOC-ARC-10 | docs/exams/cosmetic/report_archive/출제비중기반학습방법.md | D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, E-01, E-02, E-03, E-04, E-05, E-06, E-07 |
| DOC-ARC-11 | docs/exams/cosmetic/report_archive/출제비중분포조사결과.md | E-01, E-02, E-03, E-04, E-05, E-06, E-07, Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07, Q-08, Q-09, Q-10, Q-11 |
| DOC-BIZ-01 | docs/exams/cosmetic/business/FORMULA_OS_경쟁전략.md | FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-BIZ-02 | docs/exams/cosmetic/business/맞춤형화장품_조제관리사_자격증플랫폼_사업기획서.md | FO-33, FO-34, FO-35, FO-36, FO-37, FO-38, FO-39, FO-40, FO-41, FO-42, FO-43, FO-44, FO-45, FO-46, FO-47, FO-48, FO-49, FO-50, FO-51, FO-52, FO-53, FO-54, FO-55, FO-56, FO-57, FO-58, FO-59, FO-60, FO-61, FO-62, FO-63, FO-64, FO-65, FO-66, FO-67, FO-68, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-BIZ-03 | docs/exams/cosmetic/business/맞춤형화장품판매업소_조사_2026-09.md | ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-BIZ-04 | docs/exams/cosmetic/business/유튜브_홍보동영상_제작의뢰서.md | ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-BIZ-05 | docs/exams/cosmetic/business/판매업소_인터뷰_스크립트.md | FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-DEV-01 | docs/dev/SPEC.md | — |
| DOC-DEV-02 | docs/dev/ARCHITECTURE.md | — |
| DOC-DEV-03 | docs/dev/CHANGES.md | — |
| DOC-DEV-04 | docs/dev/TRACE_MATRIX.md | — |
| DOC-DEV-05 | docs/exams/cosmetic/ingredients_audit_제2026-19호.md | DI-05, FO-05, FO-24, RR-19 |
| DOC-DEV-07 | docs/dev/UIUX_외주전달_패키지.md | — |
| DOC-DEV-08 | docs/DOC_CONVENTIONS.md | DA-13 |
| DOC-DEV-09 | docs/CODE_CONVENTIONS.md | DA-05, DA-07, DA-09, DA-12, DA-13, ID-05, S-05, UX-VFY-06 |
| DOC-DEV-10 | docs/dev/evals/EVAL_BASELINE_2026-10-14.md | — |
| DOC-DEV-11 | docs/dev/evals/EVAL_2026-10-16.md | — |
| DOC-DEV-12 | docs/dev/evals/EVAL_2026-10-16_2.md | — |
| DOC-DSN-01 | docs/dev/design/DOM_TEST_DESIGN.md | A-01, A-02, A-03, A-04, A-05, A-06, A-07, R-01, R-02, R-03, R-04, R-05, R-06, R-07, R-08, R-09, TH-01, TH-02, TH-03, TH-04, TH-05, TH-06, UM-01, UM-02, UM-03, UM-04, UM-05, UX-NAV-01, UX-NAV-02, UX-NAV-03, UX-NAV-04, UX-NAV-05, UX-NAV-06, UX-NAV-07 |
| DOC-DSN-02 | docs/exams/cosmetic/design/FORMULA_OS_WORKFLOW_DESIGN.md | FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23, UM-01, UM-02, UM-03, UM-04, UM-05 |
| DOC-DSN-04 | docs/dev/design/QUESTION_SCHEMA_DESIGN.md | DR-02, ID-01, ID-02, ID-03, ID-04, Q-04, Q-05, Q-06, Q-07, Q-08, Q-09, Q-10, Q-11 |
| DOC-DSN-06 | docs/dev/design/STUDY_APP_DESIGN_GUIDE.md | — |
| DOC-DSN-07 | docs/dev/design/SUBSCRIPTION_ROADMAP.md | AN-01, AN-02, AN-03, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4 |
| DOC-DSN-08 | docs/dev/design/SUPABASE_DESIGN.md | AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08, DA-08, ROAD-P0, S-01 |
| DOC-DSN-09 | docs/dev/design/USER_FEEDBACK_DESIGN.md | AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08, FB-01, FB-02, FB-03, FB-04, FB-05, FB-06, FB-07, FB-08, S-01 |
| DOC-DSN-10 | docs/dev/design/MULTI_EXAM_DB_DESIGN.md | DA-06, DA-07, DA-08, ES-01, ES-02, ES-03, ES-04, ES-05, FO-24, RR-13, RR-17, RR-19 |
| DOC-DSN-11 | docs/dev/design/USER_FLOW.md | AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08, FO-01, FO-02, FO-03, FO-04, FO-05, FO-06, FO-07, FO-08, FO-09, FO-10, FO-11, FO-12, FO-13, FO-14, FO-15, FO-16, FO-17, FO-18, FO-19, FO-20, FO-21, FO-22, FO-23, TR-01, TR-02, TR-03, TR-04, TR-05, TR-06, TR-07, TR-08, TR-09, TR-10, TR-11, TR-12, TR-13, TR-14, TR-15, TR-16, TR-17, TR-18, TR-19, TR-20, TR-21, TR-22, TR-23, UM-01, UM-02, UM-03, UM-04, UM-05, UX-FB-05, UX-NAV-06, UX-NAV-07, UX-NAV-08 |
| DOC-DSN-12 | docs/exams/cosmetic/design/PRODUCT_DB_DESIGN.md | FO-14, FO-32, FO-37, FO-38, FO-39, FO-40, FO-44, FO-45, FO-47, FO-48, FO-49, FO-50, FO-51, FO-52, FO-53 |
| DOC-DSN-13 | docs/exams/cosmetic/design/PRODUCT_VISION_DESIGN.md | FO-32, FO-41, FO-42, FO-43, FO-46, FO-54, FO-55 |
| DOC-DSN-14 | docs/exams/cosmetic/design/AUDIT_REPORT_DESIGN.md | FO-14, FO-24, FO-34, FO-35, FO-36, FO-56, FO-63, FO-64, FO-65, FO-66, FO-67, FO-68 |
| DOC-DSN-15 | docs/exams/cosmetic/design/PRACTICAL_TOOLS_DESIGN.md | FO-16, FO-18, FO-33, FO-34, FO-57, FO-58, FO-59, FO-60, FO-61, FO-62, FO-63 |
| DOC-DSN-16 | docs/dev/design/STUDY_PLAN_PRO_DESIGN.md | D-17, SC-06, SC-07, SC-08 |
| DOC-DSN-18 | docs/dev/design/SEMANTIC_EMBEDDING_DESIGN.md | AN-02, AN-07, AN-09, AN-10, DA-02, DA-05, DA-06, DA-08, DR-05, PF-02, SEM-05, TS-08, TS-09, TS-10, TS-11 |
| DOC-DSN-19 | docs/dev/design/ASSET_STORAGE_REVIEW.md | CS-03, DA-02, P-02 |
| DOC-DSN-20 | docs/dev/design/VENDOR_MANAGEMENT_DESIGN.md | BP-13, DA-02, PF-17 |
| DOC-DSN-21 | docs/dev/design/LEARNING_UX_SIMPLIFICATION_DESIGN.md | AN-02, D-08, DR-01, DR-02, DR-04, DR-05, ROAD-L5, ROAD-P0, ROAD-P5, RV-01, RV-02, RV-03, RV-04, SC-08, SC-09, SC-10, SC-11, SC-12, SC-13, T-01, T-02, T-03, T-04, T-05, UX-GATE-01, UX-GATE-02, UX-GATE-03, UX-MET-01, UX-MET-02, UX-MET-03, UX-MET-04, UX-NAV-07, UX-NAV-08, UX-NAV-12, UX-NAV-13, UX-NAV-14 |
| DOC-DSN-25 | docs/dev/design/UIUX_DESIGN_GUIDE.md | A-01, A-02, A-03, A-04, A-05, A-06, A-07, ES-02, R-01, R-02, R-03, R-04, R-05, R-06, R-07, R-08, TH-01, TH-02, TH-03, TH-04, TH-05, TH-06, UM-01, UM-02, UM-03, UM-04, UM-05, UX-FB-01, UX-FB-02, UX-FB-03, UX-FB-04, UX-FB-05, UX-FB-06, UX-FORM-01, UX-FORM-02, UX-NAV-01, UX-NAV-02, UX-NAV-03, UX-NAV-04, UX-NAV-05, UX-NAV-06, UX-NAV-07, UX-NAV-08, UX-NAV-09, UX-NAV-10, UX-NAV-11, UX-NAV-12, UX-NAV-13, UX-NAV-14, UX-PWA-01, UX-PWA-02, UX-PWA-03, UX-PWA-04, UX-PWA-05, UX-SCR-01, UX-SCR-02, UX-SET-01, UX-SET-02, UX-SET-03, UX-SET-04, UX-SET-05, UX-VFY-01, UX-VFY-02, UX-VFY-03, UX-VFY-04, UX-VFY-05, UX-VFY-06 |
| DOC-DSN-30 | docs/dev/design/ADMIN_DESIGN.md | AD-01, AD-02, AD-03, AD-04, AD-05, AD-06, AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08, FB-01, FB-02, FB-03, FB-04, FB-05, FB-06, FB-07, FB-08, ROAD-P0, ROAD-P1 |
| DOC-DSN-32 | docs/dev/design/LEARNING_ALGORITHM_DESIGN.md | D-15, D-18, D-19, D-20, D-21, D-22, DR-03, F-07, F-08, F-09, F-11, SC-13, SC-14, SQ-03, TQ-01 |
| DOC-DSN-33 | docs/dev/design/AI_AUTHORING_DESIGN.md | AN-10, CQ-01, CQ-02, CQ-03, CQ-04, CQ-05, CQ-06, DA-02, DA-13, SEM-05 |
| DOC-DSN-34 | docs/dev/design/BUSINESS_VALIDATION.md | — |
| DOC-DSN-35 | docs/dev/design/PAYMENT_PILOT_DESIGN.md | ROAD-L5, ROAD-P0, ROAD-P1, ROAD-P2, ROAD-P3, ROAD-P4, ROAD-P5, ROAD-P6, UX-MET-02, UX-MET-05, UX-MET-06, UX-MET-07, UX-MET-08 |
| DOC-IDX-01 | docs/README.md | — |
| DOC-IDX-02 | docs/exams/cosmetic/README.md | — |
| DOC-PPL-01 | ref-pipeline/README.md | AO-01, AO-02, AO-03, AO-04, AO-05, BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10 |
| DOC-PPL-02 | ref-pipeline/audiobook/README.md | AO-01, AO-02, AO-03, AO-04, AO-05 |
| DOC-PPL-03 | ref-pipeline/audiobook/AUDIOBOOK_SUMMARY.md | AO-01, AO-02, AO-03, AO-04, AO-05 |
| DOC-RBK-01 | docs/dev/runbooks/AUDIO_HOSTING_GUIDE.md | AO-01, AO-02, AO-03, AO-04, AO-05, P-01, P-02, P-03, P-04, P-04a, P-05, P-06, P-07, P-08, P-09, P-10, P-11, P-12, P-13, P-14 |
| DOC-RBK-02 | docs/dev/runbooks/COMBO_GENERATION_GUIDE.md | BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09, BP-10, BP-11, BP-12, BP-13, BP-14, BP-15, DR-02, DR-03, DR-04, DR-05, DR-06, DR-07 |
| DOC-RBK-03 | docs/dev/runbooks/CONTENT_WORKFLOW.md | BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10, DA-01, DA-02, DA-03, DA-04, DA-05, DA-06, DA-07, DA-08, DA-09 |
| DOC-RBK-04 | docs/dev/runbooks/DEPLOYMENT_GUIDE.md | C-01, C-02, C-03, C-04, C-05, P-01, P-02, P-03, P-04, P-05, P-06, P-07, P-08, P-09, P-10, P-11, P-12, P-13 |
| DOC-RBK-05 | docs/dev/runbooks/MULTI_MACHINE_SETUP.md | — |
| DOC-RBK-06 | docs/dev/runbooks/Supabase_Custom_SMTP_MagicLink_OTP_설정가이드.md | AU-02, AU-03, AU-04 |
| DOC-RBK-07 | docs/dev/runbooks/TEXTBOOK_AUTHORING_GUIDE.md | BP-15, CE-01, CE-02, CE-03, CE-04, CE-05, CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10, CS-11, ST-01, ST-02, ST-03, ST-04, ST-05, ST-06, ST-07, TR-01, TR-02, TR-03, TR-04, TR-05, TR-06, TR-07, TR-08, TR-09, TR-10, TR-11, TR-12, TR-13, TR-14, TR-15, TR-16, TR-16a, TR-17, TR-18, TR-19, TR-20, TR-21, TR-22, TR-23, TR-24, TR-25, TR-26, TR-27, TR-28, TR-30 |
| DOC-RBK-08 | docs/dev/runbooks/TEXTBOOK_REPLACEMENT_RUNBOOK.md | BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10, DA-01, ID-01, ID-02, ID-03, ID-04, P-14, TS-15, TS-16, TS-17, TS-18 |
| DOC-RBK-09 | docs/dev/runbooks/VERIFY_DEPLOY_PIPELINE.md | BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, P-13 |
| DOC-RBK-10 | docs/dev/runbooks/NEW_EXAM_RUNBOOK.md | BP-09, DA-11, DA-12, ES-01 |
| DOC-RBK-11 | docs/dev/runbooks/UIUX_VERIFY_RUNBOOK.md | UX-VFY-01, UX-VFY-02, UX-VFY-03, UX-VFY-04, UX-VFY-05 |
| DOC-RBK-12 | docs/dev/runbooks/REF_PDF_EXTERNALIZATION.md | RR-13 |
| DOC-RBK-13 | docs/dev/runbooks/STORY_PATCH_GUIDE.md | BP-10, BP-11, BP-12, ST-01, ST-02, ST-03, ST-04, ST-05, ST-06, ST-07, TS-10 |
| DOC-RBK-14 | docs/dev/runbooks/WHEN_THINGS_BREAK.md | — |
| DOC-RBK-15 | docs/dev/runbooks/INCIDENT_2026-10-17_SUPABASE_PAUSE.md | AU-01, AU-02, AU-03, AU-04, AU-05, AU-06, AU-07, AU-08 |
| DOC-RBK-16 | docs/dev/runbooks/PILOT_EXAM_PROMOTION.md | AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, AI-09, AI-10, AI-11, AI-12, AI-13, AI-14, AI-15, AI-16, AI-17, AI-18, AI-19, AI-20, AI-21, AI-22, AI-23, DA-15, ES-01, ES-02, ES-03, ES-04, ES-05, ES-06, ES-07 |
| DOC-REF-01 | docs/dev/reference/COMBO_STUDY_STRATEGY.md | DR-02, DR-03, DR-04, DR-05, DR-06, DR-07, Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07, Q-08, Q-09, Q-10, Q-11, Q-12 |
| DOC-REF-02 | docs/dev/reference/DEV_ENVIRONMENT.md | — |
| DOC-REF-03 | docs/dev/reference/FLASHCARD_LOGIC.md | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, ID-01, ID-02, ID-03, ID-04, TR-01 |
| DOC-REF-04 | docs/dev/reference/MD_TO_HTML_LOGIC.md | EV-01, EV-02, EV-03, EV-04, EV-05, EV-06, EV-07, EV-08, MV-01, MV-02, MV-03, MV-04, RR-01, RR-02, RR-03, RR-04, RR-05, RR-06, RR-07, RR-08, RR-09, RR-10, RR-11, RR-12, RR-13, RR-14, RR-15, RR-16, TR-01 |
| DOC-REF-05 | docs/exams/cosmetic/reference/NUMBERING_SYSTEM.md | CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10, ID-01, ID-02, ID-03, ID-04, TR-01, TR-02, TR-03, TR-04, TR-05, TR-06, TR-07, TR-08, TR-09, TR-10, TR-11, TR-12, TR-13, TR-14, TR-15, TR-16, TR-16a, TR-17, TR-18, TR-19, TR-20, TR-21, TR-22, TR-23, TR-24, TR-25, TR-26, TR-27, TR-28, TR-30 |
| DOC-REF-06 | docs/dev/reference/TESTING.md | — |
| DOC-REF-07 | docs/exams/cosmetic/reference/TEXTBOOK_REFERENCE_MAPPING.md | CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08, CS-09, CS-10, CS-11, RR-01, RR-02, RR-03, RR-04, RR-05, RR-06, RR-07, RR-08, RR-09, RR-10, RR-11, RR-12, RR-13, RR-14, RR-15, RR-16 |
| DOC-REF-08 | docs/dev/reference/ENGINEERING_PRACTICES.md | BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, DA-01, DA-02, DA-03, DA-04, DA-05, DA-06, DA-07, DA-08, DA-09 |
| DOC-REF-09 | docs/dev/reference/SCREEN_MAP.md | UM-01, UM-02, UM-03, UM-04, UM-05, UX-NAV-01, UX-NAV-08 |
| DOC-REF-10 | docs/dev/reference/SOFTWARE_ENGINEERING_TECHNIQUES.md | — |
| DOC-REF-11 | docs/dev/reference/PROJECT_STRUCTURE_TOUR.md | — |
| DOC-REF-12 | docs/dev/reference/CODE_READING_GUIDE.md | — |
| DOC-REF-13 | docs/dev/reference/FEATURE_MAP.md | — |
| DOC-REF-14 | docs/dev/reference/GATE_MAP.md | — |
| DOC-REF-15 | docs/dev/reference/PROJECT_METRICS.md | — |
| DOC-REF-16 | docs/dev/reference/PROJECT_OVERVIEW.md | — |
| DOC-ROOT-01 | README.md | — |
| DOC-ROOT-02 | AGENTS.md | — |
| DOC-USR-01 | docs/exams/cosmetic/user/exam_strategy.md | — |
| DOC-USR-03 | docs/exams/cosmetic/user/subject1_numbers.md | ND-01 |
| DOC-USR-04 | docs/exams/cosmetic/user/subject2_numbers.md | ND-01 |
| DOC-USR-05 | docs/exams/cosmetic/user/subject3_numbers.md | ND-01 |
| DOC-USR-06 | docs/exams/cosmetic/user/subject4_numbers.md | ND-01 |
| DOC-USR-07 | docs/user/user_manual.md | MV-01, MV-02, MV-03, MV-04 |

## 부록 B — 테스트 갭 (소스 연결 있으나 테스트 @spec 미연결)

없음 — 소스 연결된 모든 요구사항에 테스트 참조가 있음.
