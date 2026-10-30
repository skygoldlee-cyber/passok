# 서비스 소개 랜딩 페이지 설계

> **문서 ID**: DOC-DSN-38
> **범위**: platform · 판본: none
> **관련 SPEC ID**: LP-01~09 (SPEC.md §3.29) · DA-15 (콘텐츠 독립 — 시험 식별자는 `exams.json` 순회로만) · ES-01~08 (시험 선택·comingSoon — 카드 데이터 원천) · P-07 (beforeinstallprompt 조기 캡처 — 재사용 자산)
> **최종 업데이트**: 2026-10-25
> **상태**: 설계안 — §0 결정 확정, 미착수
> 상위 문서: [docs/README.md](../../README.md) · 관련 문서: [PROMOTION_DESIGN.md](PROMOTION_DESIGN.md) (홍보·유입 백로그 — OG 태그·SEO 항목 연계) · [UIUX_DESIGN_GUIDE.md](UIUX_DESIGN_GUIDE.md) (표면 모델 규약)

## 0. 확정된 결정 (2026-10-25)

| 항목 | 결정 |
|------|------|
| 배치 | `/landing.html` — 앱(`index.html`)과 분리된 별도 정적 페이지 |
| 첫 방문 처리 | 리다이렉트 없음 — 도움말 메뉴·시험 선택 뷰에 링크만 추가 (재방문 UX 보존) |
| 시각 자산 | 스크린샷 없이 아이콘·카드·CSS로 구성 |
| 산출 순서 | 본 설계 문서 저장 → 구현 |

## 1. 목적·배경

현재 `passok.vercel.app` 진입은 곧 앱 셸이다. 첫 방문자는 시험 선택 뷰 + 온보딩 오버레이가 첫 화면이고, 외부 공유 시 노출되는 것은 `description` 한 줄뿐이다. 서비스 가치·지원 시험·시작 방법을 소개하는 **공개 착륙 페이지**가 필요하다 — 홍보 링크·QR·검색 유입의 목적지이자 앱으로의 관문.

랜딩은 "밖으로 향하는 문"이다. 기존 사용자의 동선(`index.html` 직행·설치형 PWA)에는 영향을 주지 않는다.

## 2. 범위

- **포함**: 정적 소개 페이지 1개 + 빌드 파이프라인 + 앱 내 진입 링크 2곳 (도움말 메뉴·시험 선택 뷰)
- **제외**: 별도 도메인, 다국어, 블로그·콘텐츠 마케팅, SSR, 웹폼(문의는 기존 피드백·Discord 경로로 안내), 페이지뷰 계측

## 3. 배치 결정 — 대안 비교

| 방안 | 내용 | 판단 |
|------|------|------|
| **A. `/landing.html`** | 앱과 분리된 독립 정적 페이지 | **채택** — SEO·OG 미리보기 확보, 앱 부트 JS 없는 즉시 렌더, 기존 동선 무영향 |
| B. 앱 내 뷰 (`#/about`) | `.view-section` + 해시 슬러그 | 기각 — 앱 셸 안이라 "홈피"가 아니고, 크롤러에 빈 셸만 노출, 첫 방문자는 온보딩에 가려짐 |
| C. 루트 전환 (index=랜딩, 앱=app.html) | 도메인 루트가 곧 소개 | 기각 — PWA `start_url`·기존 `#/slug` 딥링크·북마크·SW 폴백 전부 파괴 |

## 4. 정보 구조

1. **Hero** — PassOK 로고·슬로건·CTA 2개: "앱 열기"(`./index.html`) / "앱 설치"(`beforeinstallprompt` 프롬프트)
2. **지금 바로 체험 (인터랙티브 데모)** — 차별성을 설명 없이 한 번에 체험하는 퀴즈 위젯 (§4-1)
3. **교재·CBT·인강 vs PassOK (차별점 비교표)** — 기존 학습 수단이 제공하지 못하는 기능을 PassOK가 제공함을 명시 (§4-2)
4. **지원 시험** — `exams.json` 순회 카드 그리드 (`appName`·`desc`·`icon`·`theme` accent, `comingSoon` 배지) — `exam-select-card` 스타일 계열 재해석
5. **주요 기능** — 플랫폼 공통 6~8개 (플래시카드·퀴즈·모의고사·FSRS 복습·교재 리더/검색·학습 캘린더·오프라인 PWA·실무 모드)
6. **시작 방법** — 3스텝 (설치 없이 열기 → 홈 화면 추가 → 오프라인 사용)
7. **문의·커뮤니티** — `discordInvite` 선언 시험의 초대 링크 + 앱 내 '의견 보내기' 안내
8. **푸터** — © PassOK · 버전 · "학습 데이터는 기기에만 저장됩니다" (로컬 퍼스트 프라이버시 = 마케팅 포인트)

### 4-1. 체험 데모 — 차별성의 즉시 체감

랜딩의 핵심 차별 장치. 방문자가 앱 설치·계정 없이 서비스의 핵심 경험을 페이지 안에서 바로 겪게 한다 — "읽는 소개"가 아니라 "겪는 소개". 위젯 2종:

**① 미니 퀴즈** — 핵심 루프(문항 풀이 → 정오답 피드백 → 해설 + 교재 인용 근거) 체험
- 시험별 3문항 — 선지 클릭 → 정오답 스타일링 → 해설 + 📌출처 인용 스니펫 노출 → 다음 문항 → 완료 시 "N/3 정답 — 앱에서 계속하기" CTA
- 데이터: 시험별 `content/exams/<id>/landing_demo.json` (선택 자산) — `contentRoot`에서 유도되므로 DA-15 준수. 미선언 시험은 블록 미렌더
- 데모 문항은 실제 문제은행에서 큐레이션 (첫 인상용이므로 쉽고 대표적인 문항)

**② 학습계획 미리보기** — 시험일 등록 → 추천 학습계획 산출 체험
- 시험일(`<input type="date">`) 입력 → "계획 보기" → D-day·잔여 주수·단계별 로드맵(통독 → 문제 풀이·복습 → 모의고사 마무리 주차 배분) + 과목별 문항 비중 바 노출 → "이 계획으로 시작하기" CTA (앱 링크)
- 데이터: `{contentRoot}/manifest.json`의 `subjects`(과목명)·`exams`(문항 수 → 비중)·`study.minExamLeadDays`(권장 리드타임) — 빌드가 주입하므로 별도 콘텐츠 파일 불요. 권장 리드타임 미만 입력 시 "압축 플랜" 안내
- 플랜 알고리즘은 데모용 단순화 — 실제 앱은 FSRS·약점 가중으로 개인화된다는 점을 카피로 명시

**공통**: 데모 데이터는 `<script type="application/json">` 블록으로 페이지에 내장 — fetch 없이 즉시 동작·오프라인 친화, `src/shell/landing.js`가 파싱해 위젯 렌더. 데모 자산이 하나도 없으면 섹션 자체 미렌더. 다중 시험은 세로 나열 (탭 UI는 후속)

### 4-2. 차별점 비교표 — 교재·CBT·인강이 못 하는 것

데모(체험)와 별개로, 기존 학습 수단 대비 PassOK만의 기능을 **비교표로 명시**한다 — 방문자가 "왜 이 앱인가"를 한눈에 판단. 정적 마크업(템플릿 인라인), 카피는 실제 구현 기능만:

| 축 | 교재 | CBT | 인강 | PassOK |
|----|------|-----|------|--------|
| 문항 → 근거 원문 연결 | — | ✗ | ✗ | ○ (모든 문항에 교재/법령 인용 링크) |
| 잊기 직전 복습 타이밍 | ✗ | ✗ | ✗ | ○ (FSRS 개인화 스케줄) |
| 진술 단위 약점 진단 | ✗ | ✗ | ✗ | ○ (복수정답형 진술별 오판 추적·취약 단원 분석) |
| 시험일 역산 주간 계획 | ✗ | ✗ | 정해진 커리큘럼 | ○ (D-day·출제 비중·약점 가중 배분) |
| 오프라인 학습 | ○ | △ | ✗ | ○ (설치형 PWA, 완전 오프라인) |
| 계정 없이 바로 사용 | ○ | ✗ | ✗ | ○ (로컬 퍼스트 — 데이터는 기기에만) |
| 합격 후 실무 도구 | ✗ | ✗ | ✗ | ○ (실무 모드 — 시험별 지원) |

비교표는 "깎기"가 아니라 "못 하는 것"의 명시가 목적 — 기존 수단의 강점(교재의 정독·인강의 강의)은 인정하되, 개인화·연결·지속 루프의 공백을 PassOK가 메운다는 메시지로 정리한다. 카피는 SPEC 기능과 1:1 대응되는 것만 사용 (미구현 과장 금지).

## 5. 콘텐츠 소싱 (DA-15)

- **시험 카드**: 빌드타임에 `content/exams.json`을 순회해 주입 — 새 시험 온보딩 시 랜딩 자동 반영. 시험 id 리터럴 하드코딩 금지 (`check:contentind` 게이트 준수)
- **체험 데모 (퀴즈)**: `content/exams/<id>/landing_demo.json` — 시험별 선택 자산. 스키마:
  ```json
  { "items": [ { "question": "…", "choices": ["…"], "answer": 0, "explanation": "…", "citation": "…" } ] }
  ```
  `answer`는 0-based 선지 인덱스, `citation`은 📌출처 문구. 빌드가 스키마를 검증하고 `{contentRoot}/landing_demo.json` 존재 시험만 주입
- **체험 데모 (학습계획)**: `{contentRoot}/manifest.json` — 별도 파일 불요. 빌드가 `subjects[].shortName`·`exams[].title`의 `(N제)` 비중·`study.minExamLeadDays`를 추출해 주입
- **나머지 문구**(슬로건·기능 설명·FAQ 등): `landing.template.html`에 인라인 — 플랫폼 레벨 콘텐츠로 UI 텍스트와 동일 취급. 별도 content 파일 분리는 불요 (구조 단순화)

## 6. 빌드 체인 — index.html과 동형

```
landing.template.html + content/exams.json + content/exams/<id>/landing_demo.json
  → tools/build/build_landing.js → landing.html (gitignore 생성물)
```

- 템플릿 내 `<!-- @landing-exams -->` 마커 위치에 카드 HTML 주입, `<!-- @landing-demo -->` 마커에 데모 JSON 내장 블록 주입 — `build_html.js`의 `@include` 치환과 같은 패턴
- `package.json`: `build:landing` + `check:landing`(`--check` 신선도 검증, 개행 정규화 비교 — `check:html`과 동형)
- `build:derived` 체인에 포함 — 콘텐츠 변경 시 함께 재생성
- `check:fresh` 프리셋에 랜딩 신선도 단계 등록 (`tools/check/steps.js`)
- `landing.html`은 `index.html`과 동일하게 gitignore·배포 스테이징 대상 — `.gitignore`·deploy 패키징에 동일 처리 확인

## 7. 스타일·스크립트

- **CSS**: `style.css` (디자인 토큰·vendor 폰트·`btn`·`glass-card` 재사용 — SW 프리캐시 공유) + `css/landing.css` 신규 (섹션 레이아웃·히어로·카드 그리드·모바일 대응)
- **JS**: `src/shell/theme-init.js` (FOUC 방지 — 그대로 링크) + `src/pwa/pwa-install-capture.js` (SW 조기 등록·`__deferredPrompt` 캡처 — 그대로 링크) + `src/shell/landing.js` 신규:
  - 설치 버튼 — `pwa-install-available` 이벤트/`__deferredPrompt`로 프롬프트, standalone 감지 시 CTA를 "앱 열기"로 전환
  - 체험 데모 위젯 — 내장 JSON(`#landing-demo-data`) 파싱 → 선지 클릭 피드백·해설/인용 노출·진행/결과 CTA 렌더
  - 버전 표기 — `data/version.js` 읽어 푸터에 주입
- CSP `script-src 'self'` — 인라인 스크립트 금지 (현행 규약과 동일, `theme-init.js` 주석 참조)

## 8. SEO·공유 메타

- `<title>`/`description`/canonical + OG(`og:type=website`·title·description·`og:image` = `icons/icon-512.png` 재사용) + `twitter:card`
- JSON-LD `SoftwareApplication`/`WebSite` 블록 — CSP상 외부 스크립트로는 못 넣지만 `application/ld+json`은 스크립트 실행이 아니라 데이터 블록이라 CSP 비적용 (검증 필요 — `script-src`는 ld+json을 차단하지 않음이 일반적)
- robots: 별도 `robots.txt` 불필요 (기본 허용). 필요 시 루트 정적 파일로 추가

## 9. SW·오프라인 정책

- `SHELL_ASSETS` **미포함** — 프리캐시 경량화. `verify:assets`가 추적 자산만 검사하므로 생성물 미등록이 정합
- 오프라인에서 `/landing.html` 요청 시 기존 SW 네비게이션 폴백이 캐시된 `index.html`을 서빙 — 무동작 없음
- `pwa-install-capture.js`가 랜딩에서도 SW를 등록 → 랜딩 자체가 PWA 설치 표면 역할 (`beforeinstallprompt`는 SW 등록 후에만 발생)

## 10. 진입점

- **도움말 패널**(`#help-panel`) '안내' 그룹에 "서비스 소개" 항목 추가 → `landing.html` 새 탭 (`noopener`)
- **시험 선택 뷰** 하단에 "서비스 소개" 텍스트 링크 — 첫 방문자(시험 미선택)가 랜딩으로 나갈 출구
- UX-SET-07 불변 테스트의 도움말 항목 목록 갱신
- 외부 진입점(README·Discord 프로필·QR 자산)은 후속 과제

## 11. 테스트·게이트

- **test-first 게이트**: `build_landing.js`의 순수 함수(카드 렌더·데모 JSON 수집·마커 주입·comingSoon 처리·데모 스키마 검증) 유닛 테스트 필수
- **`check:landing`**: 생성물 신선도 (check:html 동형)
- **`check:orphans`**: `css/landing.css`·`src/shell/landing.js`가 `landing.template.html`에서 참조되는지 — 미참조 오탐 방지 확인
- **불변 테스트**: 도움말 패널 진입 링크 존재·템플릿 마커 존재 (ux-invariants 확장 또는 LP 전용)
- **E2E (선택)**: `landing.html` 200 + 시험 카드 수 = `exams.json` 엔트리 수 스모크. 시각 회귀 기준선은 미채택
- **`check:contentind`**: 빌드 스크립트에 시험 id·경로 리터럴 없음 (`exams.json` 순회만)

## 12. 구현 순서

1. SPEC.md §3.29 LP-01~08 등록 + `content/exams/cosmetic/landing_demo.json` 큐레이션 (실제 문제은행 대표 문항 3개)
2. `landing.template.html` + `css/landing.css` + `src/shell/landing.js` (섹션 골격·스타일·CTA·데모 위젯)
3. `tools/build/build_landing.js` + package.json 스크립트 + `.gitignore` 확인
4. `check:landing` 단계 등록 (`tools/check/steps.js` → `check:fresh` 편입)
5. 도움말 패널·시험 선택 뷰 링크 + 관련 테스트 갱신
6. SEO·OG 메타 삽입
7. `check:all` → CHANGES.md

## 13. 리스크·오픈 이슈

- **확장자 없는 접근**(`/landing`): Vercel 정적 서빙의 확장자 해석 여부를 배포 후 확인 — 미지원 시 `vercel.json` rewrites 추가 검토
- **OG 이미지**: 1차는 `icon-512.png` 재사용 — 전용 OG 이미지(1200×630)는 후속
- **시험별 앵커**: 카드에 `#exam-<id>` 앵커를 부여해 시험별 공유 링크를 확보할지 — 구현 시 결정
- **향후 백로그**: 스크린샷 섹션(Playwright 자동 캡처), 커스텀 도메인, 랜딩→온보딩 딥링크 (`index.html?from=landing`)
