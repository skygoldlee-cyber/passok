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
- 분해 순서: 복잡도 점수 내림차순 — 상위부터 처리해야 곡선이 꺾인다
- 분해 완료 시 해당 행을 표에서 제거하고 재측정치를 갱신한다
- 분해 규약: 렌더 분기는 `if` 체인 → early return·테이블 조회·서브함수 추출로 내리고, 동작 변경 없이 구조만 정리한다. 대형 렌더 함수는 섹션별 private 렌더 함수로 분할

## 분해 대상 (상위 30 — 2026-10-30 측정)

| # | 복잡도 | 위치 | 함수 |
|---|--------|------|------|
| 1 | 74 | src/exams/cosmetic/views/formula-calc.js:333 | openFormulaCalc |
| 2 | 55 | src/reader/markdown-parser.js:368 | (익명) |
| 3 | 50 | src/reader/reader-format.js:511 | markStoryNarrative |
| 4 | 45 | src/exams/cosmetic/formula-stability.js:133 | evaluateStability |
| 5 | 40 | src/views/flashcard.js:88 | renderFlashcard |
| 6 | 38 | src/reader/textbook-core.js:158 | parseMarkdownContent |
| 7 | 36 | src/reader/textbook-core.js:190 | (익명) |
| 8 | 34 | src/exams/cosmetic/formula-rules.js:250 | recommendFor |
| 9 | 34 | src/exams/cosmetic/views/trainer-ingredients.js:40 | generateIngredientsQuestions |
| 10 | 33 | src/search/search-index.js:306 | runUnifiedSearch |
| 11 | 33 | src/shell/app-dashboard.js:95 | populateExamCards |
| 12 | 30 | src/content/questions.js:167 | gradeAnswer |
| 13 | 30 | src/study/study-tracker-alloc.js:295 | (익명) |
| 14 | 30 | src/views/analysis-view.js:358 | _renderPassGapInsight |
| 15 | 30 | src/views/exam-sim/exam-sim-arena.js:298 | submitExam |
| 16 | 30 | src/views/exam-sim/exam-sim-weak.js:47 | _startWeakExamImpl |
| 17 | 30 | src/views/reader/reader-toolbar.js:266 | (익명) |
| 18 | 29 | src/pwa/pwa-manifest.js:11 | (익명) |
| 19 | 29 | src/shell/command-palette.js:103 | searchAll |
| 20 | 29 | src/study/analysis-engine.js:637 | buildWeeklyReportText |
| 21 | 29 | src/views/quiz/quiz.js:155 | renderQuizQuestion |
| 22 | 28 | src/content/questions.js:117 | validateQuestion |
| 23 | 28 | src/exams/cosmetic/views/formula-io.js:36 | buildPrintHtml |
| 24 | 28 | src/views/dashboard-queue.js:48 | buildTodayQueue |
| 25 | 28 | src/views/trainer-drill-combo.js:162 | submitComboAnswer |
| 26 | 27 | src/views/exam-sim/exam-sim-session.js:168 | _startIntegratedMockExamImpl |
| 27 | 27 | src/views/textbook-search.js:155 | performTextbookSearch |
| 28 | 26 | src/views/reader/reader-toolbar.js:333 | initReaderToolbar |
| 29 | 25 | src/search/search-sources.js:228 | _listRefDocs |
| 30 | 25 | src/views/dictionary.js:347 | createEntityCard |

## 클러스터 관찰

- **Formula OS 집중** (1·4·8·9·23): cosmetic 전용 모듈에 고복잡도 5건 — 도메인 규칙 평가기 특성상 분기 밀집, 규칙 테이블화 후보부터
- **파서 계열** (2·3·6·7): markdown→HTML 변환 경로 — 상태 머신이 본질적으로 분기가 많아 분해 효과가 제한적일 수 있음, 신중 검토
- **렌더 함수** (5·11·14·21·30): 섹션별 서브 렌더 추출이 통상 해법
