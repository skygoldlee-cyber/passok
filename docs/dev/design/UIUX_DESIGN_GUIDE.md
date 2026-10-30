# UI/UX 설계 가이드 — 국제 표준 기반 표면·상호작용 규약

> 상위 문서: [SPEC](../SPEC.md) §4.5~4.10 (UI/UX 요구사항·기기별 계약) · [SCREEN_MAP](../reference/SCREEN_MAP.md) · [USER_FLOW](USER_FLOW.md)
> **문서 ID**: DOC-DSN-25
> **범위**: platform · 판본: none
> **관련 SPEC ID**: UX-NAV-01~14 · UX-SET-01~05 · UX-FB-01~06 · UX-VFY-01~06 · UX-SCR-01~02 · UX-FORM-01~02 · UX-PWA-01~05 · A-01~07 · R-01~08 · TH-01~06 · ES-02 · UM-01~05

## 1. 목적·적용 범위

본 문서는 PassOK 플랫폼 UI/UX의 **표면(surface) 배치·상호작용 규약의 단일 출처**다. 기능별 요구사항 ID의 원천은 [SPEC](../SPEC.md)이고, 본 문서는 그 요구사항들이 따르는 **배치·노출 원칙**을 국제 표준에 근거해 규정한다.

적용 대상: 셸 네비게이션(사이드바·상단 바·하단 탭바·더보기 시트), 헤더, 설정 패널, 다이얼로그·오버레이, 뷰 내 상호작용 요소 전반. 신규 UI 요소는 본 규약을 통과해야 하며, 정적 검사 가능한 규약은 `check:*` 게이트로 기계화한다.

## 2. 준거 국제 표준

| 표준 | 적용 영역 |
|---|---|
| WCAG 2.2 (W3C) — AA 목표 | 대비 4.5:1/3:1, 타깃 크기 ≥24px, 키보드·포커스·이름-역할-값 |
| WAI-ARIA Authoring Practices (APG) | `role="dialog"`·탭·메뉴 패턴, `aria-modal`·`aria-expanded`·`aria-current` 계약 |
| Apple Human Interface Guidelines | 최소 터치 타깃 44pt, 탭바 도달권, 시트(sheet) 프레젠테이션 |
| Material Design 3 | 적응형 내비게이션(navigation bar↔rail↔drawer), 터치 타깃 48dp |
| Nielsen 사용성 휴리스틱 10 | 상태 가시성·일관성·오류 방지·사용자 통제 |
| ISO 9241-110 | 상호작용 원칙 — 적합성·자기설명성·제어 가능성·오류 관용성 |
| W3C Internationalization | `lang`·로케일·텍스트 방향성 등 다국어 확장 기반 |

프로젝트 수치는 위 표준을 상회하는 쪽으로 고정한다 (예: 터치 타깃 44px — HIG 44pt·Material 48dp 구간, WCAG 2.2 최소 24px 상회).

## 3. 표면(surface) 모델

화면을 구성하는 UI 표면은 6종으로 한정한다 — 신규 표면 추가는 설계 문서 선행이 필요하다.

| 표면 | 대역 | 성격 |
|---|---|---|
| 사이드바 | >900px | 1차 내비 + 푸터 토글 (R-01, UX-NAV-01) |
| 상단 바 | 769–900px | 사이드바의 가로 스크롤 변형, 푸터 없음 (UX-NAV-01) |
| 하단 탭바 + 더보기 시트 | ≤768px | 핵심 탭 + `role="dialog"` 시트 (UX-NAV-01, §4.10.1) |
| 헤더 | 전 대역 | 검색·테마·설정 진입 (UX-NAV-02) |
| 설정 패널 | 전 대역 | 관리·기능 통합 드롭다운 (UX-SET-01~05) |
| 뷰 콘텐츠 | 전 대역 | 화면 본연의 작업 요소 |

## 4. 기능 버튼 노출 규약 (Canonical Surface Rule)

**"기능 버튼"** = 뷰 전환이 아닌 동작을 수행하는 버튼 (테마·시험 전환·모드 전환·매뉴얼·설정 항목 등). 뷰 내비게이션(`data-target`)은 §5 내비게이션 규약을 따른다.

- **EXP-1 단일 노출**: 동일 뷰포트×UI 모드에서 하나의 기능 버튼은 정확히 1개 표면에만 존재한다. 같은 화면에 두 경로가 보이는 상태는 금지한다 — 근거: Nielsen #4 일관성, ISO 9241-110 자기설명성(동일 동작의 분산은 선택 비용·발견성 혼란 유발).
- **EXP-2 정본 우선순위**: 기능의 정본은 **전 대역 표면(헤더·설정 패널)**이다. 전 대역 표면에 존재하는 기능을 조건부 표면(더보기 시트 등)에 중복 배치하지 않는다.
- **EXP-3 뷰포트 상호배타 면제**: 뷰포트로 상호배타인 표면(사이드바 ↔ 탭바·시트)에 같은 항목이 있어도 동시 노출이 불가하므로 중복이 아니다 (예: 매뉴얼 — 사이드바 링크 ↔ 시트 항목).
- **EXP-4 뷰포트 분담**: 표면이 대역별로 소멸하면 전이 지점에서 역할을 인계한다 (예: 모드 전환 — 사이드바 푸터 >900px ↔ 설정 패널 ≤900px). 양쪽이 공존하는 대역에서는 조건부 쪽을 CSS로 숨긴다.
- **EXP-5 진입점 보장**: 어떤 뷰포트×모드 조합에서도 활성 기능의 진입 경로는 ≥1 존재해야 한다. `data-feature` 게이트로 기능 자체가 꺼진 경우는 예외.
- **EXP-6 선언적 게이팅**: 모드·피처 조건부 노출은 클래스 마킹(`nav-study-only`/`nav-practice-only`·`data-feature`)과 CSS 게이트로 처리한다. JS 인라인 `display` 조작은 금지 — 정적 검사·캐스케이드 예측 가능성 확보 (UM-02).

현재 기능 버튼 정본 매핑:

| 기능 | 정본 표면 | 비고 |
|---|---|---|
| 테마 전환 | 헤더 `#theme-toggle-btn` | 전 대역 단일 |
| 통합 검색 | 헤더 🔍 + Ctrl/Cmd+K | 전 대역 단일 |
| 시험 전환 | 설정 패널 | `examSwitch` — 시험 ≥2 (ES-02) |
| 모드 전환 | 사이드바 푸터 >900px ↔ 설정 ≤900px | EXP-4 분담 (UM-01) |
| 사용자/실무 매뉴얼 | 사이드바 링크 ↔ 시트 | EXP-3 상호배타 |
| 학습도구 펼침 | 사이드바 라벨 ↔ 시트 기타 | EXP-3, 실무 모드 전용 |
| PWA 설치 | 헤더 | `beforeinstallprompt` 조건부 |

## 5. 내비게이션 규약

- **적응형 3단계** — `>900px` 사이드바 / `769–900px` 상단 바 / `≤768px` 하단 탭바+시트. 동일 대역에 2개 내비 표면 공존 금지 (UX-NAV-01).
- **탭 상한** — 하단 탭바 콘텐츠 탭 ≤5 + 더보기. 초과분은 `#mobile-more-sheet` 수용 — 모드×기능 조합표는 SPEC §4.10.1이 정본.
- **정본 우선 노출** — 탭바 슬롯은 최빈 뷰만; 저빈도 뷰·기능은 시트로 수렴.
- **해시 라우팅·뒤로가기** — 모든 뷰 전환은 `pushState` + `#/슬러그` (UX-NAV-08). 내비 분기 신설 금지 — 실행은 기존 경로 재사용 (UX-NAV-06).
- **활성 표시** — `active` 클래스 + `aria-current="page"`, 화면 밖 탭 `scrollIntoView` (UX-NAV-01).

## 6. 접근성 규약 (A-01~07)

- **대비**: 본문 텍스트 ≥4.5:1, 대형/UI 요소 ≥3:1 — 다크·라이트 양 테마 검증 (A-03).
- **타깃 크기**: 상호작용 요소 `min-height:44px` — HIG 44pt·Material 48dp·WCAG 2.2(≥24px) 상회 (UX-SET-03).
- **키보드·포커스**: 전 기능 키보드 도달, `focus-visible` 표시, 스킵 링크 필수 (A-02, A-05).
- **이름·역할·값**: 아이콘 전용 버튼 `aria-label`, 토글 `aria-expanded`/`aria-pressed`, 활성 탭 `aria-current` — APG 패턴 준수 (A-01).
- **모션**: `prefers-reduced-motion` 존중, 애니메이션 필수 아님 (A-06).
- **상태 전달**: 상태 변화는 `role="status"`/`aria-live`로 보조기술에 전달 (A-04).

## 7. 반응형·뷰포트 규약 (R-01~08)

- 대역 경계(768/900)에서 내비·레이아웃·스크롤 소유자가 함께 전환 (R-01).
- 너비는 `100%` (`100vw` 금지 — 스크롤바 폭 포함 오버플로), 높이는 `dvh` 계열 + `--app-height` 실측 (UX-NAV-04, R-02, UX-PWA-05).
- 하단 고정 요소는 탭바 위 `calc(70px + env(safe-area-inset-bottom))` (UX-NAV-05, R-03).
- 가로 모드(높이 ≤500px)는 전용 레이아웃 — 탭바·시트 비활성 (R-08, landscape-mode).

## 8. 다이얼로그·시트 규약 (UX-FB-06, UX-VFY-06)

- 모달·시트는 `role="dialog"` + `aria-modal="true"` + 명명 (`aria-label`/`aria-labelledby`).
- 카드는 `.dialog-card` 규약 — `max-height ≤90dvh` + 내부 스크롤, 액션 버튼이 항상 화면 안에 잔류.
- 모바일 버튼 2+ 나열 행은 줄바꿈 허용 필수 — `check:mobilesafe`가 정적 차단 (UX-VFY-06).
- 모바일 뒤로가기는 `modal-back.js` 마커로 최상위 오버레이만 닫힘 — 오버레이 신설 시 규약 준수.
- 네이티브 `alert`/`confirm` 금지 — 공용 커스텀 컨펌 사용 (UX-FB-02).

## 9. 피드백·오류 규약 (UX-FB)

- 액션 결과는 토스트(`role="status"`, `aria-live`)로 즉시 피드백 — Nielsen #1 상태 가시성.
- 위험 동작(삭제·초기화)은 확인 다이얼로그 경유 — Nielsen #5 오류 방지.
- 파괴적 버튼은 `.settings-item-danger` 등 위험 시각 규약 준수.

## 10. 테마·시각 규약 (TH-01~06)

- FOUC 방지: 페인트 전 `src/shell/theme-init.js`가 `<html>` 클래스·`theme-color`를 적용 — 인라인 스크립트 금지(CSP), 외부 파일 선로드.
- 테마 결정 우선순위: `localStorage` > `prefers-color-scheme` > 다크. 수동 선택 후 시스템 추종 중단 (TH-03).
- 신규 컴포넌트는 디자인 토큰(`--color-*`·`--bg-*`)만 사용 — 하드코딩 색 금지, 라이트 오버라이드는 `.light-theme` 하위.
- 테마 전환은 헤더 단일 버튼 (§4 정본) — `themechange` 이벤트로 전 모듈 동기화.

## 11. 스크롤·포커스 규약 (UX-SCR-01~02, R-04)

- 내비/복귀는 `scrollTop` 복원, 액션 딥링크·인트라뷰 전환은 맨 위 리셋 (`resetMainScroll`) (UX-NAV-07).
- `.main-content` 하단 `padding-bottom`·`scroll-padding-bottom`으로 마지막 요소가 탭바에 붙지 않도록 보호.
- 스크롤 컨테이너 소유자는 대역별 고정 — `body` 스크롤 가정 금지 (UX-SCR-01).

## 12. 텍스트·국제화 규약

- UI 텍스트는 `data-uitext` 매니페스트로 관리 — `check:uitext` 양방향 정합. 플랫폼 셸에 시험명 하드코딩 금지.
- 탭·버튼 라벨은 `white-space: nowrap` + 말줄임 규약 — 라벨 2줄 줄바꿈 금지.
- 다국어 확장 기반: `<html lang>`, 텍스트는 마크업에 문자열로만 존재(CSS 생성 콘텐츠로 본문 텍스트 금지), 향후 로케일 번들·`dir="rtl"` 대응은 매니페스트 키 단위로 확장한다.

## 13. 성능·지각 품질 규약

- 셸 자산은 `check:perf` 예산 내 (SHELL_ASSETS 총량·단일 파일 상한).
- 도메인·대형 자산은 지연 로딩 — 진입 시 전역 로딩 표시 + 실패 시 토스트.
- 오프라인 상태는 배너로 가시화 (소멸성 오버레이 예외 아님).

## 14. 규약 ↔ 검증 게이트 매핑

| 규약 | 정적 게이트 | 런타임/E2E |
|---|---|---|
| 다이얼로그·버튼 행 잘림 | `check:mobilesafe` | mobile-overflow.spec 히트 테스트·실측 |
| UI 텍스트 매니페스트 | `check:uitext` | — |
| HTML 이스케이프 싱크 | `check:escape` (기준선 단조 감소) | — |
| 기능 플래그 정합 | `check:featflags` | — |
| 성능 예산 | `check:perf` | — |
| 접근성 | `check:specrefs` (테스트 갭) | a11y.spec axe 스캔·실기기 |
| 노출 규약 (§4) | `check:uistyle` (EXP-6 인라인 display·style 속성 금지 + JS 템플릿 정적 style 기준선 래칫) | common-uimode·ui-structure DOM 테스트 |

## 15. 규약 변경 절차 (Docs-First)

1. 규약 추가·변경은 본 문서 또는 SPEC에 ID/규칙을 먼저 선언한다 (`check:docsync` 게이트).
2. 정적 검사 가능한 규약은 `tools/check/` 단계로 기계화해 `run.js` 레지스트리에 등록한다.
3. 런타임 계약은 DOM/E2E 테스트로 고정한다 (`check:testfirst` 게이트).
4. 변경 완료 시 [CHANGES](../CHANGES.md)에 이력을 남기고 `npm run build:trace`로 추적 매트릭스를 갱신한다.
