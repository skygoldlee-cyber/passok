# 📂 carework 시험 문서 인덱스

> **문서 ID**: DOC-IDX-04
> **범위**: exam:carework · 판본: none
> **관련 SPEC ID**: 해당 없음 (시험별 문서 인덱스)
> 상위 인덱스: [`docs/README.md`](../../README.md) · 시험 콘텐츠 팩: `content/exams/carework/`

`docs/exams/carework/` 아래 문서는 **요양보호사 시험·Care OS 실무도구에 종속**된 문서다. 플랫폼 공통 문서(아키텍처·명세·런북·공용 설계·참조)는 `docs/dev/`를 본다. 각 문서 헤더의 `> **범위**: … · 판본: …`가 종속성을 선언한다 — `판본: textbook`은 교재 교체 시, `판본: refmat`은 법령·고시 등 참조자료 판본 변경 시 갱신 대상이다.

## 디렉토리

| 디렉터리 | 내용 | 판본 의존 |
|------|------|------|
| `business/` | 사업 기획·시장 조사·마케팅 — `CareOS_경쟁전략.md`(경쟁사 분석·개선 로드맵)·`종사자_인터뷰_스크립트.md`(검증 인터뷰)·`유튜브-숏츠-시리즈-제작의뢰서.md`(숏츠 외주 브리프)·`이용자_관점_평가_2026-11-13.md`(외부 유료 전환 평가, DOC-BIZ-10) | none |
| `design/` | 시험 종속 설계 — `CAREWORK_PRACTICE_TOOL_DESIGN.md`(현장도구·시험→실무 구독 전환, DSN-42)·`CAREWORK_FACILITY_WORKSPACE.md`(기관 워크스페이스·기록 서버, DSN-43)·`CARE_OS_DATAHUB_DESIGN.md`(clientId·360° 카드·다이제스트, CO-01~05) | none |

## 관련 플랫폼 문서 (docs/dev/)

- `docs/dev/design/SUBSCRIPTION_ROADMAP.md` — 월 구독 전환 로드맵 (구독 수익모델의 플랫폼 기준서)

## 신규 문서 추가 규칙

- 상위 규약 정본: [`docs/DOC_CONVENTIONS.md`](../../DOC_CONVENTIONS.md) — 분류·명칭·배치·헤더·ID·생명주기.
- 시험 종속 문서는 이 디렉터리 아래에 둔다 (종류별 하위 디렉터리 유지 — 없으면 루트).
- 헤더에 `> **범위**: exam:carework · 판본: <none|textbook|refmat>` 표기 — `check:docs`가 위치↔선언 일치를 검증한다.
- 문서 ID는 종류별 접두사로 채번하고 `docs/README.md` 레지스트리에 등록한다 (이 파일의 인덱스 성격 문서는 `DOC-IDX`).
