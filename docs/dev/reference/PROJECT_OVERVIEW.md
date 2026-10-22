# PassOK 프로젝트 개요

> **문서 ID**: DOC-REF-16
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (요약 문서 — 세부는 하위 문서 참조)
> **독자**: 신규 합류자·의사결정자 — 전체 그림을 한 문서로 파악. 입문은 `PROJECT_STRUCTURE_TOUR.md`, 설계 원전은 `ARCHITECTURE.md`

## 한 줄 정의

**PassOK** — 한국 자격시험 대비 **멀티시험 학습 PWA**. 시험은 콘텐츠 팩 단위로 온보딩되며, 기본 팩은 맞춤형화장품 조제관리사(`cosmetic`, 앱명 Passmula + Formula OS 실무 배합).

- 프로덕션: https://passok.vercel.app
- 저장소: github.com/skygoldlee-cyber/passok

## 무엇을 하는가

| 영역 | 내용 |
|------|------|
| 학습 | 교재 리더(검색·북마크·메모·이어보기), 플래시카드(SM-2 계열 간격반복), OX·4지선다·복수정답 드릴, 통합 모의고사 |
| 분석 | 학습 진단·취약 단원 분석·D-day 추적·주간 배분, 사용 통계 대시보드 |
| 실무 | cosmetic 전용 Formula OS — 처방 배합·안정성·규제 컴플라이언스·원료 DB (`features` 플래그로 시험별 게이트) |
| 계정 | 선택적 Supabase 동기화 — 미로그인도 localStorage로 전 기능 사용 가능 |
| PWA | 오프라인 캐시·홈화면 설치·시험별 독립 manifest·업데이트 배너 |

## 멀티시험 구조 (현재 5개 팩)

```
content/exams/<id>/   ← 콘텐츠 팩 (교재·문제은행·참조자료·manifest.json)
content/exams.json    ← 시험 레지스트리 (features·comingSoon·브랜딩)
src/exams/<id>/       ← 시험 전용 런타임 (DA-13 격리)
data/exams/<id>/      ← 빌드 산출 번들 (build:data)
```

| 시험 | 상태 | 문항 |
|------|------|------|
| cosmetic 맞춤형화장품 조제관리사 | 정식 | 1,979 |
| lossadj 손해평가사 · insadj 손해사정사 · indsafe 산업안전기사 · admagent 일반행정사 | 파일럿 (`comingSoon`) | 24~52 |

파일럿 승격 기준·잔여 작업은 `runbooks/PILOT_EXAM_PROMOTION.md`(DOC-RBK-16). 신규 시험 추가는 `runbooks/NEW_EXAM_RUNBOOK.md`(DOC-RBK-10) + `npm run scaffold:exam`.

## 기술 스택 원칙

- **Vanilla ES Modules** — 프레임워크 없음, 런타임 의존성 0개 (공급망 공격면 최소화, vendor는 해시 매니페스트 검증)
- **Local-First** — localStorage가 1차 저장소, Supabase는 opt-in 증강
- **콘텐츠=SSOT** — `content/*.md`가 정본, `data/` 번들은 전부 빌드 산출물 (수동 편집 금지, 신선도 게이트가 차단)
- **시험 독립** — 플랫폼 코드에 시험 id·과목 키 하드코딩 금지 (`check:contentind`, DA-15)

## 품질 게이트 체계

| 계층 | 규모 |
|------|------|
| 테스트 | unit ~1,510 · DOM ~785 · E2E 345실행 (Playwright 6샤드) |
| 로컬 체인 | `check:ci` 26단계 — lint·타입·도메인맵·이스케이프·문서동기화·테스트선행·SPEC 추적·생성물 신선도 등 |
| 커버리지 | 병합 임계값 — stmts 68.5 · branches 65.5 · funcs 70.0 · lines 80.5 (실측 대비 ~1.2%p 여유 정책) |
| 훅 | pre-commit(시크릿·인코딩·린트) · pre-push(영향 테스트·신선도) |
| 추적성 | 575개 요구사항 ↔ SPEC/소스/테스트 TRACE_MATRIX — 신규 기능은 SPEC ID 부여 + `@spec` 태그 필수 |

## 배포

`npm run deploy` 하나로 완결 — 가드(clean tree·CI success 확인) → 버전 스탬프 → `vercel --prod` → `deploy/<버전>` 태그 + 스탬프 확정 커밋 → 프로덕션 스모크(sw CACHE_VERSION·APP_VERSION 정합). `vercel --prod` 직접 실행 금지.

## 문서 지도

| 목적 | 문서 |
|------|------|
| 그림 중심 입문 | `PROJECT_STRUCTURE_TOUR.md` (DOC-REF-11) |
| 설계 결정·철학 | `ARCHITECTURE.md` (DOC-DEV-02) |
| 화면·기능 명세 | `SCREEN_MAP.md` · `FEATURE_MAP.md` |
| 게이트 전체 지도 | `GATE_MAP.md` (DOC-REF-14) |
| 새 시험 추가 | `NEW_EXAM_RUNBOOK.md` → 파일럿 추적 `PILOT_EXAM_PROMOTION.md` |
| 장애 대응 | `WHEN_THINGS_BREAK.md` (DOC-RBK-14) |
| 변경 이력 | `CHANGES.md` (DOC-DEV-03) |
