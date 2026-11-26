// src/passloop/ports.js — PassLoop 엔진 포트 계약 타입 정의 (AI-40)
// @spec AI-40
//
// 런타임 코드가 없는 순수 타입 선언 모듈 (core/types.js와 동형) — PassLoop
// 코어가 플랫폼(storage·exam-context·콘텐츠 번들)에 직접 의존하지 않도록,
// 어댑터(src/study/ 잔류 계층)가 주입하는 입력 계약을 선언한다.
// 설계: docs/dev/design/AI_PERSONALIZATION_DESIGN.md §3.7 (DOC-DSN-56)

/**
 * 콘텐츠 해석 포트 — PassOK 고유 개념 체계(§앵커·conceptId·카드 구조)를
 * 엔진이 모르게 하는 경계. 어댑터가 normalizeCidAnchor·questionCids 등
 * 기존 순수 함수로 구현해 주입한다.
 *
 * 개념 키 형식: `<subj>:§N.M` — §앵커는 과목별 Chapter 번호라 과목 간 충돌
 * (law §1.1 ≠ manufacturing §1.1)하므로 과목 키를 포함해 정규화한다.
 * @typedef {Object} ContentIndex
 * @property {(cid: string|undefined|null, ctxId?: string) => string|null} normalizeCid
 *   저장된 conceptId(§앵커·레거시 L####·의미 그룹명) → `subj:§N.M` 정규화.
 *   ctxId는 신호 항목 id(sid·quizId·cardId)로 과목 추론 힌트. 이미
 *   `subj:§` 형태면 그대로 통과. 해석 불가 시 null.
 * @property {(question: object) => string[]} [questionCids]
 *   문항 → 건드리는 개념 키 집합 (문항 conceptId + 진술 conceptId +
 *   단원 해석 앵커 — 정규화 전 원형과 정규화본 혼재 가능).
 * @property {(item: object) => string|null} [itemCid]
 *   카드 등 비문항 콘텐츠 항목 → 개념 키(`subj:§N.M`). 해석 불가 시 null.
 * @property {(cid: string) => string} [conceptTitle]
 *   개념 키 → 표시명 (과목명·단원명 등 — UI 라벨용, 선택).
 */

/**
 * 진술 단위 판정 누적 (statement_stats 항목 — storage 원본 스키마).
 * @typedef {Object} StatementStatEntry
 * @property {number} [j]     판정 횟수
 * @property {number} [w]     오판 횟수
 * @property {string|null} [lw] 마지막 오판일 ('YYYY-MM-DD')
 * @property {string|null} [cid] conceptId (§앵커·레거시 L####·그룹명 — normalizeCid 대상)
 */

/**
 * 퀴즈 판정 (quiz_results 항목).
 * @typedef {Object} QuizResultEntry
 * @property {boolean} [solved]  풀이 완료 여부
 * @property {boolean} [correct] 정답 여부
 * @property {number} [ts]       판정 시각 (ms epoch — 미기록이면 최근성 미반영)
 */

/**
 * 리뷰 로그 항목 (fc_review_log — {c,r,e,t} FSRS 이벤트 또는 {c,k:'q',ok,t} 퀴즈 판정).
 * @typedef {Object} ReviewLogEntry
 * @property {string} c        카드·진술·문항 id
 * @property {number} [r]      FSRS 레이팅 1~4 (1=Again 실패, 2~4=기억 성공)
 * @property {string} [k]      'q'이면 퀴즈 판정 이벤트
 * @property {number} [ok]     k==='q'일 때 정오 (1|0)
 * @property {number} [t]      시각 (ms epoch)
 */

/**
 * 엔진 입력 신호 묶음 — 어댑터가 저장소·콘텐츠 번들에서 수집해 주입.
 * @typedef {Object} MasterySignals
 * @property {Object<string, StatementStatEntry>} [statementStats] sid → 누적 통계 (정본 — 중복 집계 방지용)
 * @property {Object<string, QuizResultEntry>} [quizResults]       quizId → 결과
 * @property {Object<string, object>} [quizById]                   quizId → 문항 객체 (questionCids 해석용)
 * @property {ReviewLogEntry[]} [reviewLog]                        리뷰·퀴즈 판정 이벤트 로그
 * @property {Object<string, object>} [itemsById]                  itemId → 카드 등 콘텐츠 항목 (itemCid 해석용)
 */

/**
 * 개념별 집계 결과 (collectConceptStats 출력 — computeMastery 입력).
 * @typedef {Object} ConceptStat
 * @property {number} n        시도(판정) 수
 * @property {number} ok       정답·정판정 수
 * @property {number} lastTs   마지막 시도 시각 (ms epoch, 0=미기록)
 * @property {Set<string>} items 시도된 콘텐츠 항목 id 집합 (커버리지 분자)
 */

/**
 * 개념별 콘텐츠 총량 (커버리지 분모 — computeConceptTotals 출력).
 * @typedef {Object<string, number>} ConceptTotals  — `subj:§N.M` → 귀속 콘텐츠 항목 수
 */

/**
 * 숙련도 산출 설정.
 * @typedef {Object} MasteryConfig
 * @property {number} [prior]        베타 사전 가중 (기본 2 — 소표본 안정화)
 * @property {number} [halfLifeDays] 망각 반감일 (기본 14)
 * @property {number} [nowMs]        기준 시각 (기본 Date.now())
 * @property {number} [minCoverage]  추천 최소 커버리지 (기본 0.3)
 * @property {number} [limit]        추천 개수 상한 (기본 3)
 */

/**
 * 개념 숙련도 항목 (computeMastery 출력).
 * @typedef {Object} MasteryEntry
 * @property {number} n      시도 수
 * @property {number} ok     정답 수
 * @property {number} acc    사전 보정 정답률 (0~1)
 * @property {number} r      최근성 계수 (0~1)
 * @property {number} score  숙련도 점수 (0~100)
 * @property {number} cov    커버리지 (시도 항목/개념 총량, 0~1)
 * @property {string} grade  등급 — 미학습·도입·진행·숙련·유지 (MASTERY_GRADES)
 * @property {number} lastTs 마지막 시도 시각
 * @property {string} [title] 표시명 (conceptTitle 포트 제공 시)
 */

/**
 * 다음 학습 추천 항목 (nextActions 출력).
 * @typedef {Object} MasteryAction
 * @property {string} cid    개념 키 (`subj:§N.M`)
 * @property {number} score
 * @property {string} grade
 * @property {number} cov
 * @property {string} [title] 표시명
 */

export {};
