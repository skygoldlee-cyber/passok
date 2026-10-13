# 시험일 목표 R 스케줄링 + 리뷰 로그 설계 — D-18·D-19

> 상위 문서: [`SPEC.md`](../SPEC.md) D-18·D-19 · [`FSRS_DESIGN.md`](FSRS_DESIGN.md) §8·§9 (후속 단계·리드타임 근거)
> 범위: FSRS 스케줄 데이터에 대한 관측 계층(리뷰 로그)과 시험일 최적화 인출 경로(최종 인출 큐)
> 상태: ✅ 구현됨 (2026-10-13) — D-18·D-19 반영, 설계 §3.1의 위험 집합은 `due > examDate`로 확정
> ⚠️ **정정 (2026-10-13, D-20 착수 검증)**: §3.1의 `EXAM_R_THRESHOLD = 0.85`는 공집합 — `nextInterval ≈ s` 불변식상 `due > examDate`이면 `R_exam > 0.9`이므로 0.85 미만은 실데이터 불도달. 구현은 **`EXAM_TARGET_R = 0.95`**로 교정됨 (EXAM_DUE_CLAMP_DESIGN §1.2) — 위험 집합은 `due > exam ∧ R_exam < 0.95`
> **관련 SPEC ID**: `D-18`(리뷰 로그 링버퍼) · `D-19`(시험일 목표 R 최종 인출 큐) · `F-07`(간격 반복 스케줄링) · `TQ-01`(오늘 할 일 단일 큐)
> **문서 ID**: DOC-DSN-26
> **범위**: platform · 판본: none

## 1. 배경·목적

### 1.1 현재 구조의 두 한계

- **관측 불가**: FSRS는 카드별 `s`·`d`를 추적하지만 레이팅 이력을 보존하지 않는다 — 모델 예측 R과 실제 응답의 대조(효능 실측), 개인 파라미터 피팅(FSRS_DESIGN §8), 이진 레이팅의 손실 정량화가 전부 불가능하다.
- **목표 불일치**: FSRS의 목적 함수는 장기 유지(간격 극대화 하의 R=0.9 유지)다. 시험 대비의 실제 목적 함수는 **시험일 시점의 R 최대화**다 — 기한 미도래 카드 중 시험일까지 망각이 진행될 카드는 현재 큐 어디에도 표면화되지 않는다.

### 1.2 목표

- `updateCardSchedule`의 단일 funnel에 리뷰 로그 링버퍼를 부착해 레이팅 이력을 영속화한다 (D-18).
- 저장된 `s`·`lastReview`만으로 계산 가능한 `R_exam`을 이용해, 시험 임박 구간에서 "시험일까지 잊을 카드"를 추가 인출 세션으로 표면화한다 (D-19). **간격 재작성이 아닌 추가 세션** — 스케줄 왜곡 없음.

### 1.3 비목표

- **4단계 레이팅 UI** (Again/Hard/Good/Easy): FSRS_DESIGN §8의 별도 개정. 로그로 이진 레이팅의 실측 손실을 먼저 정량화한 뒤 재평가한다.
- **개인 파라미터 피팅**: 로그 누적 후 후속 단계. 본 설계는 수집 계층만 만든다.
- **스케줄 알고리즘 자체 변경**: `fsrs.js` 갱신식·간격 함수 무수정.
- **시험일 목표 R의 진술 드릴 적용**: 진술 트래커는 동일 스케줄 키를 공유하지만, 최종 인출 세션은 카드 세션으로 범위를 한정한다 (진술 확장은 후속).

## 2. 리뷰 로그 링버퍼 (D-18)

### 2.1 스키마

`storage-keys.js`에 키 추가 — 다른 학습 이력과 동일하게 `scopedKey()` 시험 접두사:

```js
FC_REVIEW_LOG: 'fc_review_log', // [{c, r, e, t}...] — 최대 2,000건 FIFO
```

레코드 (compact 키 — `statement_stats`의 `{j,w,cid,t}` 관례 준용):

| 필드 | 의미 |
|---|---|
| `c` | 카드·진술 id |
| `r` | FSRS 레이팅 — 이진 입력이라 `1`(Again)·`3`(Good)만 발생 |
| `e` | 직전 복습 이후 경과일(실수) — 최초 학습은 `0` |
| `t` | 복습 시각 unix ms |

- **상한 2,000건 FIFO**: Anki 최적화기 실질 하한 ~1,000리뷰(FSRS_DESIGN §9.3)의 2배 여유. 약 120KB — localStorage·백업 부담 이내.
- **진술 공용 경로 자동 포함**: DR-03이 동일 `updateCardSchedule`을 경유하므로 진술 레이팅도 함께 쌓인다 — 피팅 시 카드/진술 분리는 id 접두사로 판별 가능.

### 2.2 기입점·API

`spaced-repetition.js` 내부에 append — `updateCardSchedule`이 카드·진술 공용의 유일한 스케줄 갱신 통로이므로 호출부 추가 없음:

```js
appendReviewLog({ c: cardId, r: rating, e: elapsedDays, t: nowMs() });
```

- 읽기는 `getReviewLog()` (후속 피팅·진단용, 이번 범위는 테스트에서만 사용).
- 쓰기 비용: 카드 뒤집기 1회당 localStorage 쓰기 1건 추가 — 기존 스케줄 쓰기와 동일 주기, 성능 영향 없음.

### 2.3 백업·동기화·초기화 정합

- `BACKUP_KEYS` 추가 — 학습 이력(`quiz_results`·`statement_stats`)과 동일 성격이며 복원 시 피팅 데이터 손실 방지. `RESET_KEYS`는 `...BACKUP_KEYS` 전개로 자동 포함.
- `SYNC_EXCLUDE` 미포함 — 동기화는 다른 학습 데이터와 동일 정책 (불투명 blob, 스키마 변경 전파 없음).
- 카드 id·시각만 담아 학습 내용 비포함 — `내 사용 통계`와 동일한 프라이버시 등급.

## 3. 시험일 목표 R 최종 인출 (D-19)

### 3.1 위험 카드 선별

저장된 스케줄 레코드 `{s, due, lastReview}`로 시험일 기억률을 추정:

```
R_exam(card) = retrievability(examDate − lastReview, s)   // fsrs.js 기존 함수 재사용
risk = { card | due > examDate ∧ R_exam < EXAM_R_THRESHOLD }
```

- **`due > examDate` 조건**: 다음 예정 복습이 시험일 이후인 카드만이 "스케줄 사각지대"다. 기한 도래 카드(due ≤ today)는 due 큐가 소유해 중복 노출·CTA 이원화 차단 (EXP-1), 기한이 시험일 전인 카드는 예정 복습으로 R이 회복되므로 제외한다.
- **`EXAM_TARGET_R = 0.95`**: 시험일 목표 기억률 미달 카드 (원안 0.85는 `due > exam`이면 R>0.9인 불변식으로 공집합 — 헤더 정정 노트 참조). 기한 내 복습이 예정된 카드는 제외되므로 남은 것은 "다음 복습이 시험 후이거나 없는" 카드다.
- 상수는 모듈 내 상수 — 시험별 조정 필요 시 manifest `study` 확장은 후속으로 유보.

### 3.2 큐 항목

`buildTodayQueue`에 `kind: 'examr'` 항목 — 위치는 ④ 취약 진술 직후 (취약 인출 계열의 연장), ⑤ 일일 챌린지·⑥ 개인화 추천 앞:

```js
if (dday !== null && 0 <= dday && dday <= EXAM_R_WINDOW_DAYS && risk.length) {
    title: `시험 전 최종 인출 ${n}장`,
    reason: `시험일까지 기억률 ${threshold}% 미만 예상 — 지금 한 번 더 인출`,
    actions: [{ click: 'startExamRiskReview', label: '인출 세션', ... }]
}
```

- **`EXAM_R_WINDOW_DAYS = 14`**: D-5 플랜의 "최종 인출" 구간을 약간 넓게 커버. dday 부호·null 방어 필수 (미설정·D+ 경과 시 비표시).
- **`EXAM_R_SESSION_CAP = 60`**: 세션 상한 — risk 정렬(R_exam 오름차순) 상위만. 대량 누적 시 크램 벽 방지.

### 3.3 세션 동선 — `onlyIds` 일반화

현재 `startDueReview`는 `state.flashcards.dueOnly`(1회성 플래그)로 due 집합을 넘긴다. 시험 위험 카드는 임의 id 집합이라 동일 패턴을 일반화:

```js
state.flashcards.onlyIds = riskSortedIds;   // 1회 적용 후 자동 해제 (dueOnly와 동형)
```

- `loadFlashcards()`는 `onlyIds` 우선 확인 — `dueOnly`는 기존 호출부 호환으로 유지, 신규 경로는 `onlyIds` 사용.
- 세션 시작은 `startExamRiskReview`(analysis-view.js, `startDueReview`와 동형): 과목 로드 → `onlyIds` 설정 → flashcard-view.

### 3.4 순서 정합

R_exam 오름차순 정렬로 "가장 잊을 카드"를 먼저 출제 — 세션 도중 이탈해도 고위험분부터 소화된다.

## 4. 로그로 열리는 후속 (본 범위 외)

| 후속 | 로그의 역할 |
|---|---|
| 실측 기억률 대시보드 | 경과일 버킷별 성공률 vs 예측 R — T4 시뮬의 실데이터판 |
| 개인 `w` 피팅 | `{c,r,e,t}` 시퀀스가 optimizer 입력 형식과 동형 |
| 4버튼 레이팅 판단 | 이진 입력의 Again 과다/Good 남발 분포로 세분화 필요성 정량화 |
| 임계값·윈도 튜닝 | 실제 시험 전후 로그로 threshold 유효성 검증 |

## 5. 리스크·완화

| 리스크 | 완화 |
|---|---|
| 로그 무한 증가 | FIFO 2,000건 상한 |
| 큐 항목 과다 (due+weak+examr 동시) | 최종 인출은 윈도(≤14일) 진입 시에만 표시 — 평시 큐 불변 |
| 위험 카드 폭증으로 크램 유도 | 세션 상한 60장 + 큐는 표시만, 실행은 사용자 선택 |
| 미학습 카드 오인 | 스케줄 레코드 없는 카드는 R 계산 불가 — 위험 집합 비포함 (미학습은 별도 추천 경로) |
| 진술까지 포함 시 노이즈 | `c` id로 카드/진술 구분 — 최종 인출은 카드 세션만 대상 |
| threshold 근거 약함 | §4 실측 로그로 사후 검증 예정 — 상수라 조정 비용 없음 |

## 6. 구현 순서·검증

| 단계 | 내용 | 검증 |
|---|---|---|
| 1 | `FC_REVIEW_LOG` 키 + `appendReviewLog` + BACKUP_KEYS 등록 | 단위: append·FIFO 상한·v-스키마 |
| 2 | `updateCardSchedule`에 로그 append + `getReviewLog` | 단위: rating·elapsed 기록 정합 |
| 3 | `getExamRiskCards(dday)` 순수 함수 (spaced-repetition.js) | 단위: due 제외·threshold·정렬·dday 방어 |
| 4 | `onlyIds` 세션 일반화 + 큐 `examr` 항목 + `startExamRiskReview` | DOM: 큐 표시·세션 동선·윈도 경계 |
| 5 | SPEC D-18/D-19 행 ✅ 전환·CHANGES·TRACE | check:specrefs·check:ci |
