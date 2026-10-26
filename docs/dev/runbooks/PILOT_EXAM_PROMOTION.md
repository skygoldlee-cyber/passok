# 파일럿 시험 승격 계획 — 잔여 작업·절차 정리

> **문서 ID**: DOC-RBK-16
> **범위**: platform · 판본: none
> **관련 SPEC ID**: ES-01~07 (시험 선택·comingSoon 게이트), AI-01~23 (콘텐츠 제작 체인), DA-15 (콘텐츠 독립 게이트)
> **상위 문서**: `NEW_EXAM_RUNBOOK.md`(DOC-RBK-10) §파일럿 운영과 정식 승격 — 절차 원전은 런북, 본 문서는 **시험별 잔여 작업 트래커**

## 목적

등록된 4개 파일럿 팩(`comingSoon: true`)을 정식 시험으로 승격하기까지의 **시험별 잔여 작업과 공통 절차**를 한 문서에 모은다. 준비도 수치는 `npm run check:onboard`로 기계 갱신한다 — 본 문서의 수치는 작성 시점(2026-10-22) 스냅샷이며, 진행 시 체커 출력을 정본으로 삼는다.

## 현황 스냅샷 (2026-10-22, `check:onboard` 실측)

| 시험 | id | 과목 | 객관식 문항 (실측) | features | 과목당 승격 기준(≥20문) 충족 | 선택 자산 |
|------|----|------|-------------------|----------|------------------------------|-----------|
| 손해평가사 | lossadj | 5 (1차 3 + 2차 2 교재) | 24 (3과목×8) | `writtenPractice` | 0/3 | docs(2차 설계·2028 개편) |
| 손해사정사 | insadj | 7 (1차 3 + 2차 4) | 52 (16×3 + 참고 4) | **없음** | 0/4 | number-drills |
| 산업안전기사 | indsafe | 7 (필기 6 + 실기) | 132 (6과목×22) | `writtenPractice` | 0/6 | — |
| 일반행정사 | admagent | 7 | 24 (3과목×8) | `writtenPractice` | 0/3 | — |
| 미용사(피부) | skincare | 6 (필기 통합 5 + 실기) | 40 (5과목×8) + 서술 5 | `writtenPractice` | 0/5 | — |

공통: `comingSoon: true` (카드 노출·전환 차단), `참조자료/ref_md/`만 존재(원본 PDF 미편입), `manifest._pilot` 근거 주석 기입 완료.

## 공통 잔여 작업 (승격 필수)

1. **문항 증산 — 과목당 ≥20문** (정량 승격 기준, `check:onboard` 실측)
   - `npm run ai:coverage`로 인용 LNN ↔ 교재 갭 리포트 → `npm run ai:draft -- --subject <key>` 초안 → 사람 리뷰 → `문제은행/*.md` 편입 (AI_AUTHORING_DESIGN §3 절차, 리뷰 없는 직편입 금지)
   - 인용 근거가 `ref_md` 원문이면 우선순위가 높다 — 법령 개정 추적성 확보
2. **`manifest.uiText` 채움** — `data-uitext` 키 전수(cosmetic 블록 복사 후 교체). `check:uitext`가 미선언 키를 잡는다
3. **`manifest.synonyms`** — 시험 도메인 약어·통칭 (검색·해설 품질)
4. **`exams.json` 엔트리 브랜딩** — `desc` 수치를 `### Q` 실측과 정합(`check:manifest`가 "N제"·"N과목/N문" 대조), `theme`·`logoSub`·`icon` 검토
5. **`docs/` 시험 문서** — 학습 안내·시험 구조 설명. 헤더 `문서 ID` + `범위: exam:<id>` 필수 (`check:docs`)
6. **기능 플래그 최소 세트** — insadj는 현재 0개. 카드·드릴 핵심 루프가 플래그 밖이면 학습 불가 — `features` 선언 표(런북 §2)에서 최소 `{writtenPractice}` 여부와 추가 기능을 판단
7. **참조자료 PDF 외부화 결정** — 원본 PDF 편입 시 `pdf_hosting.json` 선언 + `fetch:refpdfs` 경로 (DOC-RBK-12). 미편입이면 ref_md 텍스트만으로 `check:reflayout` 통과
8. **승격 커밋** — `comingSoon` 제거 → `build:data` ×2 → 생성물 커밋 → `check:content`·`check:all` → `check:onboard` 등급 `정식` 확인 → `npm run deploy`
9. **Discord 카테고리 확장** (서버 운영 시) — 파일럿 축소 채널을 풀 카테고리(공지·질문포럼·오류제보·스터디)로 확장 + `exams.json.discordInvite`(ES-08) 선언으로 앱 내 초대 버튼 노출 (DOC-DSN-36 §6 Phase 4)

## 시험별 잔여 작업

### lossadj (농어업재해보험 손해평가사)

- [x] 1차 3과목 각 8→≥20문 (합계 60문 이상) → **2026-10-24 과목당 22문(총 66문) 편입 — ai:draft 초안 505건 중 기존 인용 라인 제외·섹션 균형 선별 14문×3**
- [ ] `integratedExam.questionsPerSubject`(현 8/8/8)·`examTimeMin`(38)을 실제 출제 형식으로 갱신
- [ ] 2차 주관식 `written` 문항 증설 — `content/exams/lossadj/docs/2차_주관식_설계.md` 기준
- [ ] **2028 개편 대비**(`content/exams/lossadj/docs/2028_개편_대비.md`) — 과목3 분화(재배학·가축사양학·식량작물학·원예작물학) 시 manifest·문제은행 재편. 시행일 2028-01-01 전 승격이면 개편 후 재구조화 작업이 다시 필요 — 승격 시점과 개편 스케줄을 함께 판단
- [ ] `uiText` 확장(현 1키) — 검색 placeholder 등 잔여 `data-uitext` 전수
- [ ] 참조자료(농어업재해보험법령·손해평가요령 별표) 원본 PDF 확보 시 `pdf_hosting.json` 외부화

### insadj (손해사정사)

- [x] **`features` 플래그 부재** — 4개 팩 중 유일하게 0개. 최소 `writtenPractice`(2차 주관식 시험) 또는 학습 핵심 플래그 선언 검토 — 미선언 시 정식 전환 후에도 기능 게이트로 화면이 비는 위험 → **2026-10-24 `writtenPractice` 선언 + `manifest.written` 3종(재물·차량·신체) 등록 — 주관식 파일이 빌드 제외 상태에서 번들로 편입**
- [x] 1차 3과목 16→≥20문 → **2026-10-24 과목당 22문(총 66문+참고4=70문) 편입** / 과목4(2차 준비 참고)는 `exams` 편입 여부 결정 — 참고용이면 `exams`에서 분리하거나 문항 체계 정리(현 4문) — **미결정, 참고용 유지 중**
- [x] `integratedExam`(40/40/40·120분)과 파일럿 문항 수 괴리 — 실측 문항으로 조정하거나 증산 후 유지 → **2026-10-24 20/20/20·60분으로 실측 정합**
- [ ] **정식 전환 차단 — 전 과목 ≥20문 게이트**: `second`(4문)·`prop`/`vehicle`/`bodily`(주관식 각 8·8·9문 — `exams` 미등록 `written` 전용)가 미달. 2026-10-24 승격 시도 → 게이트 경고+유닛 테스트 실패로 원복. 필요: ① 주관식 과목도 `### S` ≥20문 또는 ② written 전용 과목은 객관식 기준 예외(게이트 설계 변경) + 과목4 편입/분리 결정
- [x] `uiText` 0키 — 전면 작성 필요 (4개 팩 중 가장 미진) → **2026-10-24 12키 작성 (검색 placeholder 손해사정 도메인화·authHint 고객카드 조항 제거)**
- [x] `synonyms` 0키 — 손해사정 도메인 약어(손사·손해사정사·보사기 등) 정리 → **2026-10-24 18키 기입**
- [x] `docs/` 시험 문서 신설 — 1차 객관식 + 2차 주관식 구조 설명 → **2026-10-24 `content/exams/insadj/docs/시험_구조_안내.md` (DOC-USR-12)**

### indsafe (산업안전기사)

- [x] 필기 6과목 각 8→≥20문 (합계 120문 이상) → **2026-10-24 과목당 22문(총 132문) 편입 — 초안 선별 + 표·마커 라인 인용 5건 스왑(미발견 해소)**
- [ ] 실기 과목(`written: practical`) 문항 증설 — 필기/실기 2트랙 구조를 `desc`·문서에 명확화
- [ ] `synonyms` — KOSHA·안전보건규칙 약어 정리
- [ ] 출제기준(2024~) 명시된 `desc`와 `manifest.contentYear` 정합 확인 — 출제기준 개정 시 콘텐츠 재검증 루프
- [ ] `docs/` 시험 문서 신설

### admagent (일반행정사)

- [x] 1차 3과목 각 8→≥25문 → **2026-10-24 과목당 25문(총 75문) 편입 — desc 선언 정합 달성**
- [ ] 2차 과목(주관식) — `subjects` 7개 대비 `exams` 3개만 존재. 나머지 4과목(2차 포함)의 `exams`/`written` 편입 계획 수립
- [ ] `synonyms` — 행정사 도메인 약어 정리
- [ ] `docs/` 시험 문서 신설

### skincare (미용사(피부))

- [x] 파일럿 골격 — **2026-10-26 scaffold + 5과목 시드(과목당 8문, 총 40문) + 실기 서술 5문 + 공중위생관리법(제21098호, 20261112) ref_md 편입**
- [ ] 필기 5과목 각 ≥20문 증산 (승격 정량 기준)
- [ ] `integratedExam.questionsPerSubject`(31/6/5/6/12·60분) — 출제기준 비중 추정치, 실측 출제 경향 확인 후 갱신
- [ ] 공중위생관리법 시행령·시행규칙 + 「이용·미용기구별 소독기준 및 방법」 고시 ref_md 추가 — 시행규칙 별표(소독·행정처분 기준)가 법규 과목의 빈출 원천
- [ ] 화장품학 참조자료 — cosmetic 팩 화장품법 ref_md 복사 편입 검토 (DA-15 시험별 독립 원칙상 각 팩 디렉터리에 배치)
- [ ] **법령 개정 추적**: 공중위생관리법 법률 제21877호(2027.8.12 시행) 예정 — 2027 출제기준 적용 시점과 법 시행일 정합 확인 필요
- [ ] `uiText` 확장 — 잔여 `data-uitext` 전수
- [ ] `synonyms` 보강 — 피부미용 도메인 약어
- [ ] `docs/` 시험 문서 신설 — 필기 통합 1과목(과락 없음)·상시검정 구조 + 실기 범위 안내
- [ ] 실기 커버리지 명시 — 작업형 실습은 앱 범위 밖이므로 `desc`·문서에 서술·차트 연습 한정임을 유지

## 진행 순서 권장

1. **insadj `features`·`uiText` 보완** — 구조 결함 수준이라 가장 먼저 (문항 수와 무관하게 즉시 가능)
2. **문항 증산 배치** — 시험별 `ai:coverage` → `ai:draft` → 리뷰 → 편입. lossadj(2차 구조 확정됨) → insadj → indsafe → admagent 순이 콘텐츠 설계가 앞선 순
3. **시험별 승격 커밋** — 공통 잔여 작업 완료 시험부터 `comingSoon` 해제. 한 번에 하나씩 승격해 `check:onboard` 등급·E2E 영향을 분리
4. **정식 전환 후** — 통합모의고사 문항수·시간을 실제 출제 형식으로 정합 + 사용자 공지(whats-new 피드)

## 검증 명령 (승격 커밋 전)

```powershell
npm.cmd run check:onboard        # 등급 '정식' 전환 가능 여부 — 구조 오류 0 · 경고 0 확인
npm.cmd run check:manifest       # desc 수치 ↔ ### Q 실측 정합
npm.cmd run check:uitext         # data-uitext 키 전수 선언 확인
npm.cmd run build:data           # ×2회 — 생성물 재생성 후 커밋
npm.cmd run check:content        # 콘텐츠 통합 검증
npm.cmd run check:all            # 전체 게이트
```

> 진행 상황은 본 문서의 체크박스를 갱신해 추적한다 — 완료 시 `[x]`로 표시하고 CHANGES.md에 승격 이력을 기록.
