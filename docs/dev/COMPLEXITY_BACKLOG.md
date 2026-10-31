# 복잡도 분해 백로그 — 순환복잡도 상위 함수 목록

> **문서 ID**: DOC-DEV-14
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (유지보수 백로그 — 측정 규약은 [PROJECT_METRICS.md](reference/PROJECT_METRICS.md) §8 순환 복잡도 행)

## 측정 규약

`EVAL_2026-10-30`에서 지적된 상승 추세(207→225→253)의 반전 대상. 측정 명령(임계 10 고정 — Δ 비교는 동일 임계 유지 필수):

```powershell
node node_modules/eslint/bin/eslint.js "src/**/*.js" --no-config-lookup --rule '{"complexity":["warn",10]}'
```

- 기준선(2026-10-30): **253건 경고 / 임계 10 초과**
- 재측정(2026-10-31): **264건** — 상위 2건 분해 완료(openFormulaCalc 74·파서 콜백 55 해소)이나 AI·신규 뷰 진입으로 총량 +11, 상승 추세 지속
- 분해 순서: 복잡도 점수 내림차순 — 상위부터 처리해야 곡선이 꺾인다
- 분해 완료 시 해당 행을 표에서 제거하고 재측정치를 갱신한다
- 분해 규약: 렌더 분기는 `if` 체인 → early return·테이블 조회·서브함수 추출로 내리고, 동작 변경 없이 구조만 정리한다. 대형 렌더 함수는 섹션별 private 렌더 함수로 분할

## 분해 대상 (상위 30 — 2026-10-31 측정)

| # | 복잡도 | 위치 | 함수 |
|---|--------|------|------|
| 1 | 50 | src/reader/reader-format.js:511 | markStoryNarrative |
| 2 | 45 | src/exams/cosmetic/formula-stability.js:133 | evaluateStability |
| 3 | 44 | src/ai/ai-client.js:164 | _requestAi |
| 4 | 41 | src/pwa/pwa-install.js:76 | openInstallModal |
| 5 | 38 | src/reader/textbook-core.js:158 | parseMarkdownContent |
| 6 | 36 | src/reader/textbook-core.js:190 | (익명) |
| 7 | 36 | src/views/flashcard.js:88 | renderFlashcard |
| 8 | 34 | src/exams/cosmetic/formula-rules.js:250 | recommendFor |
| 9 | 34 | src/exams/cosmetic/views/trainer-ingredients.js:40 | generateIngredientsQuestions |
| 10 | 34 | src/reader/html-viewer.js:127 | openHtmlViewer |
| 11 | 33 | src/search/search-index.js:306 | runUnifiedSearch |
| 12 | 33 | src/shell/app-dashboard.js:95 | populateExamCards |
| 13 | 30 | src/content/questions.js:167 | gradeAnswer |
| 14 | 30 | src/study/study-tracker-alloc.js:295 | (익명) |
| 15 | 30 | src/views/analysis-view.js:499 | _renderPassGapInsight |
| 16 | 30 | src/views/exam-sim/exam-sim-arena.js:298 | submitExam |
| 17 | 30 | src/views/exam-sim/exam-sim-weak.js:47 | _startWeakExamImpl |
| 18 | 30 | src/views/reader/reader-toolbar.js:266 | (익명) |
| 19 | 29 | src/pwa/pwa-manifest.js:11 | (익명) |
| 20 | 29 | src/shell/command-palette.js:103 | searchAll |
| 21 | 29 | src/study/analysis-engine.js:637 | buildWeeklyReportText |
| 22 | 29 | src/views/quiz/quiz.js:156 | renderQuizQuestion |
| 23 | 28 | src/content/questions.js:117 | validateQuestion |
| 24 | 28 | src/exams/cosmetic/views/formula-io.js:36 | buildPrintHtml |
| 25 | 28 | src/views/dashboard-queue.js:48 | buildTodayQueue |
| 26 | 28 | src/views/trainer-drill-combo.js:162 | submitComboAnswer |
| 27 | 27 | src/views/exam-sim/exam-sim-session.js:168 | _startIntegratedMockExamImpl |
| 28 | 27 | src/views/textbook-search.js:155 | performTextbookSearch |
| 29 | 26 | src/views/reader/reader-toolbar.js:333 | initReaderToolbar |
| 30 | 25 | src/ai/ai-client.js:297 | buildWeeklyDiagnosisPrompt |

## 분해 완료 기록

- 2026-10-31: `openFormulaCalc`(74) — 초기화 시퀀스를 필드 초기화·드래프트 복원·리스너 바인딩·배너·접이식 헬퍼로 분할 (formula-calc DOM 33건 통과)
- 2026-10-31: markdown-parser 라인 콜백(55) — 순차 if 체인을 `try*` 매처 디스패치로 분할 (unit 전량·check:parser 파리티 통과)

## 클러스터 관찰

- **Formula OS 집중** (2·8·9·24): cosmetic 전용 모듈에 고복잡도 4건 — 도메인 규칙 평가기 특성상 분기 밀집, 규칙 테이블화 후보부터
- **파서 계열** (1·5·6): markdown→HTML 변환 경로 — 상태 머신이 본질적으로 분기가 많아 분해 효과가 제한적일 수 있음, 신중 검토 (단, 라인 분류 콜백은 매처 디스패치로 해소 실증)
- **AI 계열 신규** (3·30): ai-client가 신규 클러스터로 등장 — AI 코치 기능 확장에 따른 분기 팽창, 프롬프트 조립 분리 검토
- **렌더 함수** (7·10·12·15·22): 섹션별 서브 렌더 추출이 통상 해법
