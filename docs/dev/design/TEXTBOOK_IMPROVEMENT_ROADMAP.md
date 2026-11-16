# 📚 교재 보완 로드맵 (TEXTBOOK_IMPROVEMENT_ROADMAP)

> **문서 ID**: DOC-DSN-53
> **범위**: platform · 판본: none
> **관련 SPEC ID**: CS-12 (교재 번호체계) · DA-06/ES-01 (온보딩·승격) · AI-01 (AI 초안 검수) · AI-24 (교재 AI 집필) · AN-10 (§앵커) · DR-09~11 (인쇄 QR·목차·절 CTA)
> **최종 업데이트**: 2026-11-16
> 상위 문서: [docs/README.md](../../README.md) · [NEW_EXAM_RUNBOOK](../runbooks/NEW_EXAM_RUNBOOK.md) · [TEXTBOOK_AUTHORING_GUIDE](../runbooks/TEXTBOOK_AUTHORING_GUIDE.md)

전 시험 팩 표준형 교재의 **볼륨·구조·카드 규약** 개선 작업의 잔여 과제를 한곳에서 추적한다.
측정 도구: `tmp/measure_volume.js` (비공백 문자 기준, A4 ≈1,500자/쪽 환산). 온보딩 게이트 `check:onboard`가 active 티어 과목당 20,000자 하한을 감시한다.

## 1. 현재 상태 스냅샷 (2026-11-16 실측)

### 1.1 표준 체계 정의 (목표 형태)

```
# 과목명
## 📚 Chapter NN. (또는 앞머리 카드: 🧭🚀🎯🔢📋)
## N. 번호 절          ← 리더 카드 분할·§앵커·CTA·인쇄 QR의 단위
### M. 소절            ← 절 내 1,2,3… 연속
#### M.K 세부           ← 부모 ### 번호.연번
## 📌 챕터 핵심 요약     ← 챕터 말미 카드
## ✅ 확인문제          ← 요약 다음, 챕터별 5문 (팩별 선지 수 상이)
## ⚡/🧠/📖/📋 기타 카드  ← 자유 ## 카드 허용
```

### 1.2 팩별 현황

| 팩 | tier | 본문 | 추정 | 시중 대비 | 구조 | 📌/✅ | 상태 |
|--|--|--|--|--|--|--|--|
| cosmetic | active | 305k자 | ~204쪽 | ~50–60% | 표준 | 38/38 | ✅ 기준선 |
| hazmat | pilot | 431k자 | ~287쪽 | ~40–55% | 표준(전환됨) | 36/16 | ✅ 양호 |
| carework | active | 322k자 | ~215쪽 | ~50% | 표준 | 32/32 | ✅ 양호 |
| labor | pilot | 633k자 | ~422쪽 | ~20% | 표준(전환됨) | 59/0 | ⚠️ ✅ 카드 없음 |
| broker | active | 161k자 | ~107쪽 | ~10% | 표준(## N.) | 0/0 | ⚠️ ai-draft 미검수 |
| indsafe | active | 81k자 | ~54쪽 | ~10% | 구식 Chapter 체계 | 0/0 | ⚠️ 헤딩 비표준+미검수 |
| compapp2 | active | 39k자 | ~26쪽 | ~15% | 구식(### 절) | 0/0 | ⚠️ 헤딩 비표준+미검수 |
| insadj | pilot | 39k자 | ~26쪽 | ~3% | 구식 | 0/0 | 스텁 |
| lossadj | pilot | 33k자 | ~22쪽 | ~3% | 구식 | 0/0 | 스텁 |
| admagent | pilot | 32k자 | ~22쪽 | ~3% | 구식 | 0/0 | 스텁 |
| appraisal | pilot | 18k자 | ~12쪽 | <1% | 구식 | 0/0 | 스텁 |
| skincare | pilot | 14k자 | ~10쪽 | ~3% | 구식 | 0/0 | 스텁 |
| hairdresser | pilot | 14k자 | ~9쪽 | ~3% | 구식 | 0/0 | 스텁 |
| compapp1 | pilot | 2.9k자 | ~2쪽 | ~1% | 구식 | 0/0 | 스텁 |
| iteng | draft | 115k자 | ~77쪽 | — | 구식 | — | ⚠️ db 과목 편중 (113k) |
| 그 외 draft (6팩) | draft | <6k자 | <4쪽 | — | 구식 | — | 스텁(예정) |

### 1.3 완료 이력

- hazmat 헤딩 표준화 — 1,623라인 전환, `#### N.M`→`### M.` 재번호 (`19002bf1d2`)
- hazmat 📌 승격 36블록 + 확인문제 16챕터 80문, carework 📌 16카드 + ✅ 16챕터 (`cb8d6ffec4`, `f77eee23f3`)
- labor 헤딩 표준화 — `### N.`→`## N.` 2,739건 + `### 📖`→`## 📖` 59건 (`c8508989bc`)
- 볼륨 게이트 — active 과목당 20k자 하한 (`check_exam_onboard.js`, `c8508989bc`)
- active 스텁 1차 확장 — compapp2 슬롯 22개 + broker 160·indsafe 82소절 LLM 본문 (`c8508989bc`)

## 2. 잔여 과제 (우선순위순)

### 2.1 🔴 즉시 — AI 초안 검수 (차단 요소)

| 항목 | 규모 | 위치 | 작업 |
|--|--|--|--|
| 확장 본문 검수 | 263곳 (compapp2 22 · indsafe 82 · broker 159) | `<!-- ai-draft -->` 마커 | 사실·조호 대조 후 마커 제거. 원본 초안 `tmp/ai_drafts/` |
| 확인문제 검수 | 142문 (hazmat 80 · carework 62) | `## ✅` 카드 내 ai-draft 주석 | 정답 정확성 검수 (스팟 완료 — 정밀 검수 잔여) |
| carework 요약 카드 | 16개 | `## 📌` ai-draft | 내용 대조 후 마커 제거 |

⚠️ **주의**: 검수 전까지는 학습자에게 초안이 노출되는 상태 — 정확성 보증 없음. 마커 제거 = 검수 완료 선언.

### 2.2 🟡 구조 정규화 — 헤딩 비표준 팩 (labor 방식 재사용)

labor 전환 스크립트(`tmp/migrate_labor_headings.js`)를 팩별 변형 적용. 전환 시 §앵커가 `N.0`→`N.M`으로 세분화되고 번호 게이트(CS-12)가 실검증 대상이 된다.

| 팩 | 현 구조 | 예상 작업 |
|--|--|--|
| indsafe | `## Chapter NN.`(📚 없음) + `### N-M.` 소절 | `## Chapter`→`## 📚`, `### N-M.`→`## N.` 재번호 |
| compapp2 | `## Chapter` + `### N.` 절 | labor과 동일 패턴 — `### N.`→`## N.` + 📚 접두 |
| insadj·lossadj·admagent·appraisal·skincare·hairdresser | 구식 `###` 절 | 스텁이라 비용 작음 — 볼륨 확충 시 함께 처리 권장 |
| iteng·itindeng·eleceng·elecindeng·indsafeind·distmgr2/3 | 구식 | draft — 승격 시점에 일괄 |

전환 절차 (검증된 순서): ① 번호 연속성 사전 검증 ② 스크립트 변환 ③ `check:numbering` ④ `sync_citation_lines` ⑤ `build:data` ⑥ 커밋.

### 2.3 🟡 볼륨 하한 미달 과목 — 2차 확장

active 게이트 기준(과목당 20k자) 미달 잔여:

| 팩 | 과목 | 현재 | 부족분 | 방법 |
|--|--|--|--|--|
| broker | estate_registry | 15.5k | ~5k | 소절 추가 또는 기존 소절 심화 |
| broker | estate_tax | 14.4k | ~6k | 〃 |
| broker | broker_practice | 16.8k | ~3k | 〃 |
| compapp2 | computer | 15.6k | ~5k | 슬롯 없음 — `###` 소절 확장 방식 적용 |

도구: `tmp/expand_sections.js --exam=<id> --apply` (소절별 +800~1,200자) — 한 번 더 돌리면 소절당 본문 2단락이 되므로, **소절 수를 늘리는 방향**(출제기준 미커버 항목 신규 소절)이 더 건강하다. broker는 ref_md 93건이 있으므로 `ai:textbook`으로 미커버 소절 생성이 정석 경로.

### 2.4 🟢 카드 규약 확산

| 항목 | 대상 | 비고 |
|--|--|--|
| `## ✅ 확인문제` | labor 62챕터(📖 59건 이미 있음 — 챕터당 퀴즈 미배치) | 팩 문항 포맷 확인 후 gen_checkquiz 변형 |
| `## 📌` 요약 | labor·broker·indsafe·compapp2 | labor는 📖가 사실상 요약 역할 — 명칭 통일 여부 판단 |
| 📖→📌 통일 | labor 59카드 | 챕터 핵심 요약 규약 정합 시 |

### 2.5 🟢 볼륨 대형 팩 심화 (시중 40–60% → 목표 설정)

cosmetic·hazmat·carework는 시중 대비 ~40–60%로 일관 — 목표 비율을 정책으로 정하면 부족분이 정량화된다:

- 시중 비교 수치는 출판사 편차 있는 추정 — 정밀 비교 시 벤치마크 교재 1종 지정 필요
- 텍스트만 측정 — 삽화·도표(시중의 20~30%)를 빼면 실효 격차는 더 큼
- 확장 방향은 "절 신규 추가"보다 "기존 절 심화 + 미커버 출제항목 보강"이 구조 정합에 유리

## 3. 구조 이질성 세부 (전환 시 참고)

| 팩 | `##` 사용 | `###` 사용 | 특이점 |
|--|--|--|--|
| labor(전환 후) | 📚 Ch + N. 절 + 카드 | 소절 | 이야기형 없음(표준형만) |
| indsafe | `## Chapter`(📚 없음)·`## ⚡/🔑` 카드 | `### N-M.` | 과목 두 카드(목차·서두) 헤더 포함 |
| compapp2 | `## 출제기준 챕터 구성`·`## 📚 Chapter` | `### N.` | 슬롯 채움 완료 — `###` 승격만 남음 |
| broker | `## N.` 절 + 앞머리 카드 | `### N.` | 이미 `## N.` — Chapter 그룹핑만 없음 |
| iteng | 혼재 | `### N.` | db 과목만 대형(113k) — 3과목 스텁 |

## 4. 의사결정 미결 사항

1. **📖 vs 📌 통일** — labor의 `## 📖 기출 핵심 정리`를 표준 `## 📌`로 개칭할지, 📖를 별도 카드 규약으로 유지할지
2. **pilot 팩 볼륨 기준** — active 20k 하한과 별도로 pilot에도 볼륨 가이드(예: 10k)를 둘지
3. **확장 품질 바** — LLM 확장 본문의 검수 기준을 TEXTBOOK_AUTHORING_GUIDE에 명문화할지 (현재는 ai-draft 주석만)
4. **labor 확인문제** — 62챕터 × 5문 ≈ 310문 생성 비용 vs 📖 카드로 대체 여부
5. **스텁 팩 처리 방향** — insadj/lossadj/admagent/appraisal/skincare/hairdresser/compapp1은 볼륨 확충과 구조 전환을 한 세트로 할지 순차로 할지

## 5. 작업 규칙 메모 (이번 세션에서 확인된 함정)

- **PowerShell 리다이렉트 편집 금지** — `Set-Content`/`>` 출력이 cp949로 한글·이모지를 깨뜨림. 파일 수정은 edit/write 도구로
- **인용 라인 이동** — 본문 삽입·헤딩 승격 후 반드시 `node tools/sync/sync_citation_lines.js` 실행. compapp2에서 스켈레톤 시절 지문이 짧아 미발견 발생한 사례 있음 (헤딩 지문 `2.데이터편집` 7자 < 전체탐색 하한 10자 — key 매칭으로만 발견됨)
- **ai-draft 표기** — `<!-- ai-draft: ... 검수 필요 -->`는 `###` 소절 블록 끝에 삽입해 소절 경계를 보존할 것 (카드 단위 삽입 시 절 분할이 깨짐)
- **확장 본문 삽입 위치** — `###` 소절의 기존 불릿 뒤·다음 헤딩 앞. 헤딩 자체는 건드리지 않음
