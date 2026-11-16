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

### 3.3 진입점 (인앱 — QR 없이도 동일 경로) ✅ (DR-11, 2026-11-16)

- 교재 리더 절 카드 본문 말미에 "이 절 문항 풀기 §N.M" 링크 — 인쇄 QR 칩과 동일 배치(절 말미)·동일 라벨의 디지털 대응판
- §앵커는 렌더 시점에 계산 — `📚 Chapter NN.` 컨텍스트 추적 + `getTocLevel(title)===1`(`M.` 번호 절)만 부여. Chapter 헤더·비번호 절(📌 요약·✅ 확인문제·📝 이야기 회상)·첫 Chapter 이전 서두는 링크 없음
- `<a href="#/trainer/concept/<cid>">` 해시 네비게이션 — 라우터가 `trainer` 슬러그로 뷰 전환 후 `initTrainer`의 DR-08 인터셉트가 개념 드릴을 열고 해시를 `#/quiz`로 정규화(뒤로가기=리더 복귀). 별도 data-click 핸들러 불필요
- 표준형·이야기형 공통 동작 — 두 형식 모두 `Chapter NN. > M.` 번호 체계를 공유 (`buildSectionsHtml` 공용 경로). 웹툰 씬 카드는 별도 렌더 경로라 대상 아님

## 4. Phase 2 — 종이 교재 QR ✅ (DR-09, 2026-11-16 정식화)

- 교재 DOCX/PDF 산출 시 각 절 말미에 "QR → 이 절 문항 n개" 칩 삽입
- QR payload: `https://<호스트>/#/trainer/concept/<cid>` — 스캔 즉시 앱(또는 브라우저) 진입
- 절별 문항 수는 문제은행 교재 인용→§앵커 해석으로 집계 → 0개 절은 칩 생략

**정식 구현**: `tools/build/build_textbook_print.js` (`npm run build:textbook-print -- --exam <id>`)
- 표준형 MD → 절 말미 `<div class="concept-qr" data-cid>` 칩 주입 → `dist/textbook-print/<exam>/<subject>/`에 스테이징(MD+images 복사) → md2doc으로 PDF·DOCX·인쇄HTML 산출
- 문항 집계는 인용 파일이 현재 교재와 일치하는 것만 유효 — 과목 내 다중 교재 파일의 앵커 번호는 파일 독립
- 칩에 문항 수 표기("이 절 문항 N개 풀기"), 0문 절 자동 생략, `:::page` 펜스 앞에 절 말미 배치
- 검증: carework — 1과목 17칩(2~14문/절)·2과목 25칩(0문 절 1개 생략), DOCX 미디어 정상 임베딩
- **교재 전용 템플릿 (DR-10, 2026-11-16)**: `ref-pipeline/textbook_pdf.py` + `template/print-textbook.html` — 표지(서명·시험명·발행일·QR 안내 배지)·내부링크 목차(점선 리더+쪽수)·러닝헤드(좌 서명·우 장명)·중앙 쪽수. Chrome print의 마진박스·counter(page)·outline 미지원을 2패스로 해소: 1패스 PDF의 h2 크기 스팬으로 절별 쪽 추출 → 목차 쪽수 주입 2패스 → PyMuPDF 스탬프. 장별 `:::page` 쪽나눔. 산출 검증: carework 1과목 A4 145쪽, 표지·목차·러닝헤드·쪽수 전부 렌더 확인

### 4-1. 파일럿 결과 (2026-11-16, cosmetic 1과목)

기존 `ref-pipeline/md2doc.py`로 **절별 QR 칩이 들어간 A4 인쇄물 89쪽**을 실제 생성해 검증했다 (`tmp/print_pilot/`).

- **방식**: 표준형 MD에 절 말미 `<div class="concept-qr"><img data-URI>` 칩을 주입하는 전처리(`inject_qr.mjs`) → md2doc `--pdf --docx --new-page-h2` 변환. `qr.js`의 `qrPng`가 Node에서도 동작해 동일 인코더 재사용
- **검증**: PDF 9개 절(§1.1~1.5·§2.1~2.4) 말미에 칩 렌더 확인, `page-break-inside:avoid`로 칩 분할 방지. h2 쪽 나눔·표 머리행 반복 등 기존 인쇄 로직 그대로 유효
- **발견된 경계 조건**:
  1. `--keep-html`은 `--out-dir`이 아니라 **입력 MD 옆**에 `.print.html`을 쓴다 — 콘텐츠 폴더 오염 주의
  2. ~~DOCX 경로는 SVG·WebP 이미지를 심지 못함~~ → **해소(2026-11-16)**: `_emit_image`가 SVG 감지 후 `_svg_png` 래스터·실패 포맷은 `_pil_png`(Pillow) PNG 재인코딩 폴백. 발견된 부수 버그 2건도 함께 수정 — SVG 감지 `[:5]` 슬라이스가 4바이트 `b"<svg"`와 불일치(직접 시작 SVG 미감지), 로컬 경로 `%20` 미디코딩(파일 미발견)
  3. `images/` 상대경로는 변환할 MD 위치 기준 — 전처리 산출 MD는 원본 옆에 두거나 이미지를 함께 복사해야 함
  4. `<!-- story:slot -->` 서사 슬롯 주석은 출력에 무해하게 통과
- **정식화 방향**: 칩 주입은 표준형→인쇄 전처리 단계로 두되, 절별 문항 수 집계(0개 절 칩 생략)와 교재 전용 템플릿(목차·러닝헤드)은 별도 구현 과제

## 5. Phase 3 — 함정 태그 🔶 (AI-39, 2026-11-16 부분 구현)

- 문항 메타에 `trap` 필드 추가(선택): 함정 유형 어휘 — `유사용어혼동`·`수치바꿔치기`·`절대표현`·`주어치환`·`예외조항`. STANDARD_TAGS(DOC-DSN-04)와 별도 축으로 두어 주제 태그와 혼합 방지 → **구현됨** (`TRAP_TAGS` 정본은 `src/content/questions.js`)
- 오답 분석(AN-02)이 trap 분포를 집계해 "당신은 수치바꿔치기에 약합니다" 유형 진단으로 확장 → **후속** (태그 데이터가 쌓인 뒤 집계·표시)
- 태깅 작업: 한 팩 파일럿 → `ai:*` 제작 도구로 초안 → 사람 검수 → **구현됨** — `ai:trap` 규칙(lib/traps.js: 수치마스크·절대 화행·예외 표현·선지 bigram 유사도) + LLM 보완(주어치환 등) → `tmp/ai_drafts/<exam>/traps_*.md` → `--write`가 `> **함정:**` 행 편입
- 게이트: `check:content` 스키마 검증에 trap 어휘집 화이트리스트 추가 → **구현됨** — `exams.plugin.js`가 어휘 밖 값에서 빌드 실패, `validateQuestion`도 동일 검증

### 5-1. 파일럿 결과 (2026-11-16, carework)

- `ai:trap --exam carework`: 규칙+LLM 초안 262문 중 202문 태깅 제안 → **기계 리뷰 필터** 적용(LLM 전용 태그는 근거 검증 — 절대표현은 선지 내 절대 화행·수치바꿔치기는 숫자 선지·유사용어혼동은 유사도 재확인, 주어치환은 규칙 비검출이라 LLM 존중) → **142문 확정 편입** (과목1 62 + 과목2 80)
- 발견: LLM은 "옳은 것은?"형 발문에서 절대표현을 과적용 — 근거 없는 태그를 리뷰 단계에서 걸러야 한다는 초안→리뷰 절차의 타당성 확인

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
