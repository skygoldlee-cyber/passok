# 📂 skincare 시험 문서 인덱스

> **문서 ID**: DOC-IDX-05
> **범위**: exam:skincare · 판본: none
> **관련 SPEC ID**: 해당 없음 (시험별 문서 인덱스)
> 상위 인덱스: [`docs/README.md`](../../README.md) · 시험 콘텐츠 팩: `content/exams/skincare/`

`docs/exams/skincare/` 아래 문서는 **미용사(피부) 시험·BeautyOS 업종 확장에 종속**된 문서다. 플랫폼 공통 문서(아키텍처·명세·런북·공용 설계·참조)는 `docs/dev/`를 본다. 각 문서 헤더의 `> **범위**: … · 판본: …`가 종속성을 선언한다 — `판본: textbook`은 교재 교체 시, `판본: refmat`은 법령·고시 등 참조자료 판본 변경 시 갱신 대상이다.

## 디렉터리

| 디렉터리 | 내용 | 판본 의존 |
|------|------|------|
| `business/` | 사업 기획·시장 조사 — `BeautyOS_MVP.md`(피부샵 케어 연속성 MVP v1.2, DOC-BIZ-14) | none |

## 관련 플랫폼 문서 (docs/dev/)

- `docs/dev/business/자격시험_학습매체_경쟁분석.md` — 전 팩 공통 매체 경쟁 분석 (DOC-BIZ-13)
- `docs/exams/carework/business/CareOS_경쟁전략.md` — 자매 제품 Care OS 경쟁 지도 (DOC-BIZ-06) — §20 우선순위 게이트의 비교 대상

## 신규 문서 추가 규칙

- 상위 규약 정본: [`docs/DOC_CONVENTIONS.md`](../../DOC_CONVENTIONS.md) — 분류·명칭·배치·헤더·ID·생명주기.
- 시험 종속 문서는 이 디렉터리 아래에 둔다 (종류별 하위 디렉터리 유지 — 없으면 루트).
- 헤더에 `> **범위**: exam:skincare · 판본: <none|textbook|refmat>` 표기 — `check:docs`가 위치↔선언 일치를 검증한다.
- 문서 ID는 종류별 접두사로 채번하고 `docs/README.md` 레지스트리에 등록한다 (이 파일의 인덱스 성격 문서는 `DOC-IDX`).
