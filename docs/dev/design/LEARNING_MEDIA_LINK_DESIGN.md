# 학습매체 연결 설계 — 교재 QR → 개념 문항 딥링크 + 함정 태그

> **문서 ID**: DOC-DSN-52
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `CO-22` (QR 인프라) · `UX-NAV-08` (해시 라우팅) · `AN-10` (conceptId→§앵커) · `PS-05` (취약→교재 딥링크) · `TQ-02` (액션 딥링크 재사용 규약)
> **근거 문서**: DOC-BIZ-13 §3~5 — 경쟁 매체(교재·인강·CBT) 공통 약점 "매체 간 단절·인출 연습 부재"에 대한 대응. 부록 A 갭 중 **개념 태그·QR 연동** 두 항목의 실행 설계

## 1. 배경과 목표

DOC-BIZ-13의 핵심 통찰: 종이 교재·인강·CBT는 모두 정보 공급에 집중하고 매체가 서로 끊겨 있다. PassOK는 이미 FSRS·conceptId·라인 인용·해시 라우팅·QR 인코더를 보유해, 남은 것은 **교재의 한 지점(개념)에서 문항 세션으로 직행하는 연결면**이다.

목표 플로우 (DOC-BIZ-13 부록 A의 고유 플로우):

```
종이/화면 교재의 개념 QR 스캔 → 앱이 해당 개념 문항 5개 드릴 오픈 → 완료 시 FSRS 복습 큐 등록
```

## 2. 기존 자산 재사용 점검

| 필요 요소 | 기존 자산 | 상태 |
|---|---|---|
| 개념 식별자 | `conceptId` — 진술·문항 모두 보유, §앵커로 정규화 (`statement-tracker.js`, `questions.js`) | ✅ 존재 |
| 개념 → 교재 구간 해석 | `cidSection` 맵 — conceptId → §챕터.절 (`data-loader.js`, AN-10) | ✅ 존재 |
| 개념 → 문항 선별 | `weak-items.js` `pickWeak*` — 취약 conceptId 집합으로 문항 추출, cap 지원 | ✅ 패턴 존재 |
| 딥링크 | `#/슬러그` 라우터 + `#/trainer/<slug>` 깊이 해시 + `data-click` 액션 위임 (TQ-02) | ✅ 존재 |
| QR 생성 | `qr.js` `qrDataUrl/qrPng` — 의존성 0 | ✅ 존재 (용도만 문서번호 → URL로 확장) |
| 복습 등록 | FSRS-6 `spaced-repetition.js` 어댑터 | ✅ 존재 |
| QR 인쇄면 | `docx-utils.js`·`pdf-utils.js`·`doc-export.css` 문서 산출 파이프라인 (CO-13/CO-22) | ✅ 존재 |

→ 신규 작성 범위는 **해시 파라미터 해석 1곳 + 개념 드릴 세션 조립 1곳 + 교재 QR 삽입 지점**으로 좁다.

## 3. Phase 1 — 개념 문항 딥링크 (플랫폼 공통)

### 3.1 URL 규약

```
#/trainer/concept/<cid>
```

- `cid` = §앵커 형태 conceptId (`2.3` 등). 레거시 `L####`는 `cidSection` 역해석으로 정규화
- 해시 라우팅 규약(UX-NAV-08)의 trainer 깊이 해시 확장 — `trainer.js` 서브패널 해석기에 `concept` 슬러그 추가
- 시험 미선택 상태면 ES-09 중앙 가드가 피커로 보냄 — 외부 QR 유입도 동일 경로라 별도 처리 불요

### 3.2 세션 조립

- `pickConceptQuestions(cid, {cap:5})` 순수 함수 신규 — `weak-items.js` 패턴 재사용:
  1. 문항 `conceptId`가 cid와 일치 → 1순위
  2. 진술 `conceptId` 일치하는 복수정답 문항 → 2순위
  3. `cidSection`으로 §범위 내 문항(같은 절의 인접 개념) → 보충
  4. 미풀이 문항 우선, 풀이 이력 있으면 오답 우선 — seeded shuffle로 재현성
- 문항 0개 → "이 개념의 문항이 아직 없습니다" + 교재 해당 절 딥링크 폴백 (PS-05 패턴)
- 결과 화면 → 오답 문항 FSRS 큐 등록 제안(기존 복습 등록 플로우 재사용)

### 3.3 진입점 (인앱 — QR 없이도 동일 경로)

- 교재 리더 섹션 도구에 "이 개념 문항 풀기" — 이미 §앵커를 알므로 `#/trainer/concept/<cid>`로 이동만 하면 됨
- 취약 분석(AN-04)·약점 리뷰의 기존 단원 딥링크와 같은 data-click 위임 규약

## 4. Phase 2 — 종이 교재 QR

- 교재 DOCX/PDF 산출 시 각 절 말미에 "QR → 이 절 문항 n개" 칩 삽입
- QR payload: `https://<호스트>/#/trainer/concept/<cid>` — 스캔 즉시 앱(또는 브라우저) 진입
- 삽입 지점: `docx-utils.js`/`pdf-utils.js`의 섹션 렌더 훅. `wm` 인자와 같은 옵션 체계(`qr: {concept: cid}`)로 주입
- 절별 문항 수는 build:data 시점 집계 → 0개 절은 칩 생략
- **전제**: 인쇄 교재 산출물이 실제로 만들어져야 노출됨 — CE-06 유보 항목(인쇄 판형)과 연동되는 첫 인쇄 표면. 파일럿은 리더 인앱 버튼(3.3)부터 검증하고, 인쇄 산출물 도입 시 Phase 2 활성화

## 5. Phase 3 — 함정 태그

- 문항 메타에 `trap` 필드 추가(선택): 함정 유형 어휘 — `유사용어혼동`·`수치바꿔치기`·`절대표현`·`주어치환`·`예외조항` 등. STANDARD_TAGS(DOC-DSN-04)와 별도 축으로 두어 주제 태그와 혼합 방지
- 오답 분석(AN-02)이 trap 분포를 집계해 "당신은 수치바꿔치기에 약합니다" 유형 진단으로 확장
- 태깅 작업: 한 팩(cosmetic) 파일럿 → `ai:*` 제작 도구로 전 팩 자동 부여 초안 → 사람 검수. 교재 인용이 있는 문항은 LLM이 함정 유형 추론 가능
- 게이트: `check:content` 스키마 검증에 trap 어휘집 화이트리스트 추가

## 6. 후속 (유보)

- 복습 알림(push) — FSRS due 시점은 이미 계산됨. Supabase Edge + VAPID, 미설정 시 인앱 배지 폴백. Phase 1~3 효과 계측 후 판단
- AI 튜터(DOC-DSN-40) — 별도 설계 추적

## 7. 검증 계획

- `pickConceptQuestions` 단위 테스트 — 우선순위·cap·빈 결과 폴백·seeded 재현성
- DOM 테스트 — `#/trainer/concept/<cid>` 진입 → 세션 오픈, 잘못된 cid → 교재 폴백
- 계측: QR/딥링크 진입 → 세션 완료율 → FSRS 등록률 (DOC-BIZ-13 §5 가설 "QR 스캔율"은 Phase 2 이후)

## 8. 범위 경계

- 신규 문항 생성 아님 — 기존 문제은행 재편성만
- 콘텐츠(문항·교재) 수정 없음 — 플랫폼 코드 + 스키마 확장(Phase 3 trap은 선택 필드라 하위호환)
- 팩 격리(DA-13) 유지 — conceptId·트레이너는 이미 공통, 팩별 추가 작업은 태그 데이터뿐
