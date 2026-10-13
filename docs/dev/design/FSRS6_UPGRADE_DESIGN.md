# FSRS-4.5 → FSRS-6 엔진 업그레이드 설계 — F-11

> 상위 문서: [`SPEC.md`](../SPEC.md) F-07~F-09 · [`FSRS_DESIGN.md`](FSRS_DESIGN.md) (DOC-DSN-17) · [`EXAM_R_SCHEDULING_DESIGN.md`](EXAM_R_SCHEDULING_DESIGN.md) (DOC-DSN-26)
> 범위: `src/fsrs.js` 수식·파라미터를 FSRS-6(21 파라미터)으로 포팅 — 어댑터·레코드·UI 무수정
> 상태: ⏳ 설계 확정 (2026-10-13) — 구현 착수 전
> **관련 SPEC ID**: `F-11`(FSRS-6 엔진) · `F-07`(스케줄링) · `D-18`(리뷰 로그 — w20 피팅 입력) · `D-19`(R_exam — 신곡선 적용)
> **문서 ID**: DOC-DSN-27
> **범위**: platform · 판본: none

## 1. 배경·목적

FSRS-6은 현행 프로덕션 버전(Anki 24.11+·fsrs-rs 6.x·ts-fsrs 기본). 4.5 대비 변경이 세 갈래이며 모두 이 앱에 직접 실익이 있다:

- **학습 가능한 망각 곡선 지수 `w20`** — 곡선 쇄도가 고정 상수(-0.5)에서 피팅 가능 파라미터로 승격. 공식 벤치 RMSE(bins) −6%. D-18 리뷰 로그의 첫 피팅 대상.
- **당일 복습 수식** `S' = S·e^{w17(G-3+w18)}·S^{-w19}` — 4.5에서는 `elapsed=0`이면 r=1이라 성공 복습의 안정도 증분이 0이었다. FSRS-6은 저안정도 카드의 당일 성공을 실질 성장(`sinc` 하한 1, 성숙 카드는 비감소)으로, 당일 실패를 전용 단기 감소로 모델링한다.
- **난이도 선형 감쇠 + 지수 초기 난이도 + 랩스 하한** — d 포화 보정, 실패 시 단기 하한 적용.

**비목표**: 서브일 learning steps(당일 시간 단계) 도입, ts-fsrs 의존성(수식 포팅으로 충분, ~150줄), 퍼즈(fuzz) 적용, 4버튼 UI, 개인 파라미터 피팅.

## 2. 수식 델타 (fsrs-rs 6.x / ts-fsrs 정본 기준)

파라미터 벡터 `w0..w20` — 공개 기본값:

```
[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]
```

`S_MIN` 0.1→0.01, `S_MAX`·`MAX_INTERVAL` 36500 유지.

| 함수 | FSRS-4.5 | FSRS-6 |
|---|---|---|
| `initStability(G)` | `w[G-1]`, 하한 0.1 | 동형, 하한 0.01 (신규 기본값) |
| `initDifficulty(G)` | `w4 − w5·(G−3)` 선형 | **`w4 − e^{w5·(G−1)} + 1`** 지수형, clamp[1,10] |
| `retrievability(t,s)` | `(1 + 19/81·t/s)^{-0.5}` | `(1 + FACTOR·t/s)^{-w20}`, `FACTOR = 0.9^{-1/w20} − 1 ≈ 0.98035`. `R(s,s)=0.9` 불변식은 파라미터 무관 유지 |
| `nextInterval(s)` | `s/19·81·(0.9^{-2}−1)` | `s/FACTOR·(r^{-1/w20} − 1)` — 목표 0.9면 **정확히 `s`**로 환산 (반올림·하한1·상한 동일) |
| `nextDifficulty(d,G)` | `d − w6(G−3)` → 평균 회귀 | `Δd = −w6(G−3)`, **`Δd' = Δd·(10−d)/9`**(선형 감쇠), `d' = w7·D0(4) + (1−w7)·(d+Δd')` |
| `recallStability` | `s·(1 + e^{w8}(11−d)s^{-w9}(e^{w10(1−r)}−1)·hard·easy)` | **무수정** |
| `forgetStability` | `min(w11·d^{-w12}((s+1)^{w13}−1)e^{w14(1−r)}, s)` | `min(max(s_f, S_MIN), s·e^{−w17·w18})` — 랩스 시 안정도가 반드시 당일-Again 계수만큼 이하로 감소하는 상한 (단기 하한 아닌 상한) |
| — | (없음) | **`sameDayStability(s,G) = s·e^{w17·(G−3+w18)}·s^{-w19}`** — `sinc`는 `G≥Hard`에서 하한 1.0 (당일 성공은 감소 없음) |

## 3. 어댑터 라우팅 결정

`elapsedDays`(정수 일, 날짜 경계 기준)로 FSRS-6의 당일 경로를 해석한다:

| 조건 | 안정도 갱신 | 난이도 | due |
|---|---|---|---|
| 신규(cur=null) | `initStability(G)` | `initDifficulty(G)` | today + interval(s) |
| `elapsedDays === 0` (당일 재복습) | `sameDayStability` | `nextDifficulty` | today + interval(s') |
| `elapsedDays ≥ 1` + 성공 | `recallStability` | `nextDifficulty` | today + interval(s') |
| `elapsedDays ≥ 1` + Again | `forgetStability` (상한 적용) | `nextDifficulty` | today + interval(s') |

- `fsrsReview(cur, rating, elapsedDays)`의 **시그니처 무수정** — `spaced-repetition.js`·statement-tracker 호출부 변경 없음.
- 당일 복습의 due 전진은 현행 어댑터 정책 계승(신 안정도로 재스케줄) — Anki의 당일 step 개념과 달리 일 단위 스케줄러라 별도 intraday 큐는 두지 않는다.
- 진술 트래커(DR-03)·리뷰 로그(D-18)·R_exam(D-19)은 동일 경로를 경유하므로 자동 승계 — `getExamRiskCards`는 신곡선 R로 계산되며 임계값 0.85는 의미 유지.

## 4. 레코드·데이터 정합

- **레코드 형식 무수정** — `{v:2, d, s, due, lastReview, reps, lapses}` 그대로. d·s는 기억 추정치라 구 파라미터 산출값도 유효 → **마이그레이션 없음**, 다음 복습부터 신 수식 적용.
- 구 SM-2 지연 변환(`migrateSm2Record`)은 어댑터 수준이라 무수정.
- 로그 스키마 `{c,r,e,t}` 무수정 — 후속 피팅에서 곡선 지수 w20이 첫 대상.

## 5. 검증 계획

| 검증 | 방법 |
|---|---|
| 수식 정합 | ts-fsrs `algorithm.test.ts` 골든 벡터 이식 — `next_difficulty(5.0, G=1..4)` → `[8.34176237, 6.66599536, 4.99022837, 3.31446137]` 등. 부동소수 기대치는 ±1e-6 허용 |
| 불변식 | `R(0)=1`·`R(s,s)≈0.9`(±0.02)·단조 감소, `I(0.9,s)=round(s)`, sameDay: G≥2에서 s 비감소 |
| 회귀 | fsrs.test 기대값 전면 재기록 — initS/D·성공/실패 전이·간격 산출의 신 골든값 |
| 감사 | T3 30일 시뮬(`audit_study_quality`) 통과 — 안정도 성장·백로그 수렴 경계 신 수식으로 재검증, 기준선 갱신 판단 |
| D-19 | R_exam 선별 테스트 기대값 재조정(곡선 변경으로 위험 판정 시드값 이동 가능) |
| 게이트 | check:specrefs(D-19 @spec 유지, F-11 신규 태그)·check:types·lint·unit·dom |

## 6. 롤아웃·리스크

- **롤아웃**: 단일 커밋 전환(파라미터+수식 동시) — 레코드 호환이라 롤백은 수식 되돌리기뿐. 사용자 체감은 복습 간격 재분포(당일 복습은 즉시 유효화).
- **리스크**: ① 당일 Good 복습이 갑자기 안정도를 올려 due가 전진 — 같은 날 반복 소진이 과하면 카드가 밀려남. 완화: sameDay `sinc`가 S^{-w19}로 자기 수렴형이라 무한 연쇄는 자연 감쇠. ② T3 기준선 재조정 — 감사 목적(발산 감지) 유지 조건으로 경계 완화. ③ 개인 피팅 전까지는 집단 파라미터 — 4.5와 동일 한계, 악화 아님.

## 7. 구현 순서

| 단계 | 내용 |
|---|---|
| 1 | `fsrs.js` W 벡터 21개·FACTOR 유도식·신 수식 6종 포팅, `sameDayStability` 추가 |
| 2 | `fsrsReview`에 `elapsedDays===0` 라우팅 추가 (시그니처·반환 형상 유지) |
| 3 | SPEC `F-11` 행 추가 + @spec 태그(fsrs.js 헤더 F-07,F-08→+F-11) |
| 4 | fsrs.test 골든 벡터·회귀값 재기록, 같은 날 복습 케이스 추가 |
| 5 | T3 감사·D-19 테스트 재검증, FSRS_DESIGN §1 버전 표기 갱신 + CHANGES·TRACE |
