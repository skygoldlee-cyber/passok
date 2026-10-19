# food — 참조 템플릿 팩 (Phase C 파일럿)

> 이 팩은 **완성된 시험이 아니라 멀티시험 아키텍처의 최소 구성 실증 템플릿**이다.
> 새 시험 온보딩 시 `docs/dev/runbooks/NEW_EXAM_RUNBOOK.md`와 함께 이 구조를 복사 기준으로 삼는다.

## 성격

- **역할**: 콘텐츠 팩 스키마(manifest·references·교재·문제은행·참조자료)와 플랫폼 체인(build:data·파서·인용·게이트)이 cosmetic 외 시험에서도 동작함을 입증한 파일럿
- **범위**: 식품위생법 1과목 축소본 — 나머지 과목은 후속 콘텐츠 확보 시 `manifest.subjects`에 추가
- **학습 완성도**: 실사용 학습 팩이 아님 — 문항 수·참조자료 커버리지가 cosmetic 대비 최소

## 최소 구성 체크리스트 (이 팩이 실증한 것)

| 요소 | 위치 | 비고 |
|---|---|---|
| 시험 선언 | `content/exams.json` 엔트리 | desc에 파일럿 명기 |
| 매니페스트 | `manifest.json` (`_pilot` 주석) | subjects·features·uiText 최소 세트 |
| 참조자료 | `참조자료/ref_md/과목1/` | 공식 PDF 미확보 시 ref_md 발췌본 + `references.json` comment 명기 가능 (food 선례) |
| 교재 | `교재/sanitation/` | 표준형 1권 — 이야기형은 선택 |
| 문제은행 | `문제은행/과목1_문제은행.md` | 인용 앵커 = 교재 `#LNN` |

## 새 시험 온보딩 시

`npm.cmd run scaffold:exam -- --id <id> --name "<명칭>"`으로 골격을 생성한 뒤,
이 팩의 파일 배치와 선언 형식을 기준으로 콘텐츠를 채운다 — 상세는 NEW_EXAM_RUNBOOK.
