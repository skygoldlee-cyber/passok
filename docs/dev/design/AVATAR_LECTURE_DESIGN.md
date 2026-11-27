# AI 아바타 강의 설계 — 런타임 아바타 오버레이 + 조건부 요약 강의 영상

> 상위 문서: `../ARCHITECTURE.md` (전체 구조) · `../runbooks/AUDIO_HOSTING_GUIDE.md` (오디오 자산 호스팅) · `AI_COACH_DESIGN.md` (DOC-DSN-40, AI 런타임) · `CONTENT_SAFETY_DESIGN.md` (DOC-DSN-57, AI 콘텐츠 검수)
> **문서 ID**: DOC-DSN-59
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `AV-01~10`(신규 제안 — 본 문서 §9) · `AO-01~06`(오디오북 재사용) · `A-09`(오디오 대체 수단 논리) · `AI-29`(무표시 계약) · `AI-30`(구조화 입력 계약) · `CQ-07`(AI 산출물 패턴 게이트) · `ROAD-P0`(Pro 안내 계층)
> **상태**: 설계안 (미구현 — 승인 후 §10 단계 순서로 구현. SPEC.md에 AV-01~09 로드맵 행 등록됨)

## 1. 배경·목표

"AI 아바타가 교재를 강의하는 기능"의 도입을 검토한다. 목표 경험은 ① 음성으로 교재를 설명해주고 ② 화면에 말하는 존재(아바타)가 있는 것이다.

이미 갖춘 자산이 크다 — cosmetic 시험은 교재 전체의 오디오 낭독(오디오북)이 운영 중이고, 리더에 재생 UI·외부 호스팅·매니페스트 패턴이 확립돼 있다. 남은 질문은 **"목소리 위에 얼굴을 어떻게 얹는가"**다. 본 문서는 후보 방식의 비용·효과를 비교하고, 비용 대비 효과가 최적인 진입 경로를 확정한다.

## 2. 결정 요약

- **Phase 0 — 런타임 아바타 오버레이(채택)**: 기존 오디오북 재생 위에 브라우저 렌더 캐릭터를 얹어 "아바타 강의" 경험을 제공. 증분 벤더 비용 0원, 모든 오디오북 보유 시험에 동일 코드 적용. §5
- **Phase 1 — 선별 요약 강의 영상(조건부)**: Phase 0 사용량·반응 확인 후, 단원당 3~5분 압축 강의를 토킹헤드 API로 제작해 시범 온보딩. §7
- **유료 기능(확정)**: 구현 시 `feature-plan.json` `avatar_lecture: "pro"`로 등록 — PRO 배지 + 진입 1회 안내(ROAD-P0 soft gate, §5.3·§5.4). Phase 0·1 모두 같은 키로 게이트한다.
- **기각 — 전량 토킹헤드 영상·실시간 스트리밍 아바타**: 비용 대비 학습 효과 증분이 가장 낮거나(전량 영상), 정적 PWA 구조·비용 모델과 부조화(실시간). §4·§11

## 3. 기존 자산 재사용 점검

| 자산 | 위치 | 재사용 방식 |
|---|---|---|
| 오디오북 파이프라인 | `ref-pipeline/audiobook/` | MD → 청취용 원고 정제 → TTS → 챕터 MP3. "강의 음성" 제작 공정 그대로 — 아바타는 음성 위의 표현층일 뿐 |
| 오디오 자산 호스팅 | `data/audio_manifest.js` · `../runbooks/AUDIO_HOSTING_GUIDE.md` | 외부 호스팅(GitHub Releases/CDN) + `getAudioUrl()` 변환 패턴. 영상 자산(Phase 1)도 동일 패턴으로 외부화 — Vercel 배포 용량 제한 회피 선례 |
| 리더 오디오 플레이어 | `src/views/reader/reader-audio.js` | `readerAudioState.audio`(HTMLAudioElement)·재생 상태·이어듣기·자동스크롤. 아바타 모듈은 이 상태를 구독해 구동 |
| 피처 플래그 | `content/exams.json` `features.audiobook` | `features.avatarLecture` 신규 플래그 — 시험별 온보딩·미지원 시험 무표시 |
| 무표시 계약 | `ai-client.js` `aiFeedbackAvailable` (AI-29) | 아바타도 동일 계약 — 오디오 없음/기능 비활성 시 UI를 렌더하지 않는다 |
| AI 콘텐츠 검수 경로 | `AI_AUTHORING_DESIGN.md` · `CONTENT_SAFETY_DESIGN.md` | Phase 1 강의 대본은 `tmp/ai_drafts/` 초안 → 사람 검수 → 편입 경로. AI 산출물 패턴 게이트(CQ-07) 적용 |

## 4. 후보 방식 비교

| 방식 | 구조 | 비용(cosmetic 660분 기준) | 교재 갱신 시 | 판정 |
|---|---|---|---|---|
| A. 전량 토킹헤드 영상 (HeyGen/D-ID API) | 대본→영상 생성→MP4 외부 호스팅 | **$400~4,700**(분당 $0.60~7.20) + 시험 수 배가 | 구간 재생성 비용 재발 | 기각 — 토킹헤드는 시각 정보 증분이 적어 분당 비용 대비 효과 최하 |
| **B. 런타임 아바타 + 기존 오디오** | audiobook MP3 재생 + 브라우저 캐릭터 오버레이(의사 립싱크) | **증분 0원** | 오디오만 재생성 — 아바타 재작업 없음 | **채택 (Phase 0)** |
| C. 선별 요약 강의 영상 | 단원당 3~5분 대본→아바타 영상 | 챕터당 ~$3(Avatar III Digital Twin $0.60/분) — 파일럿 1과목 수십 달러 | 해당 단원만 재생성 | 조건부 (Phase 1 — Phase 0 반응 후) |
| D. 실시간 스트리밍 아바타 (HeyGen Realtime 등) | WebRTC 세션 + 실시간 렌더 | 분당 ~$3 — 최고가 | — | 기각 — "튜터" 영역. AI_LEARNING_ENGINE(DOC-DSN-58 AL-15) 스트리밍 튜터와 역할 중복, 그 계획에 통합 검토 |

### 4.1 B안 비용·효과 근거

- **효과**: 사용자가 체감하는 "아바타 강의"의 본질(목소리 설명 + 말하는 존재감)을 충족. 진폭 기반 입모양은 정밀 viseme이 아니지만 "말하고 있는 느낌" 전달에는 충분
- **비용**: 벤더 API 호출 없음. 구현물은 SVG 캐릭터 + Web Audio 분석 루프 수준
- **범용성**: 오디오북만 있으면 전 시험 팩 동일 적용 — 시험별 제작·검수 공정 불필요
- **전략 위치**: B로 수요를 무투자 검증 → 반응 확인 시 C로 실물 영상 품질 업그레이드. 처음부터 C에 지출하면 수요 검증 전 제작비·검수비를 쓰게 됨

## 5. Phase 0 — 런타임 아바타 오버레이

### 5.1 아키텍처·모듈 배치

```
src/views/reader/reader-avatar.js   # 아바타 오버레이 모듈 (신규)
  - readerAudioState 구독 — 재생/일시정지/정지 이벤트에 연동
  - SVG 캐릭터 DOM 주입·제거, 입모양 상태 머신
  - Web Audio AnalyserNode 진폭 분석 → 립싱크, 실패 시 시간기반 폴백
css/reader-avatar.css               # 캐릭터·오버레이 스타일 (신규, style.css @import)
src/views/reader/reader-audio.js    # (수정) 오디오 엘리먼트 crossOrigin 설정·아바타 훅 호출
```

- 캐릭터는 **인라인 SVG**(외부 에셋 fetch 없음 — 오프라인·SW 캐시 규약 정합, DOC-RBK 선례와 동일하게 자산 외부화 대상 아님)
- 뷰 파셀 마크업 추가 없음 — JS가 오디오 플레이어 영역(`#reader-audio-player-area`) 인접에 오버레이 컨테이너를 동적 생성. 피처 미활성 시험의 마크업·CSS 부하를 없앰

### 5.2 립싱크 — 2단계 폴백

**1단계(기본) — AnalyserNode 진폭 분석**:
`AudioContext` → `MediaElementAudioSourceNode(readerAudioState.audio)` → `AnalyserNode` → RMS 진폭을 프레임마다 읽어 입 개도(closed/half/open)에 매핑.

⚠️ **CORS 전제**: 외부 CDN 오디오를 분석하려면 `<audio crossorigin="anonymous">` + CDN의 `Access-Control-Allow-Origin`이 필요 — 미충족 시 MediaElementSource 출력이 무음 처리된다. GitHub Releases는 ACAO `*`를 서빙하므로 기본 경로에서 유효. `reader-audio.js`의 `new Audio()` 생성부에 `crossOrigin` 설정을 추가하고, CORS 실패·AudioContext 미지원(iOS 구형 등) 시 2단계로 내려간다.

**2단계(폴백) — 시간기반 절차적 입모양**: `audio.currentTime`과 재생 상태만으로 의사 주기 입모양(개폐 패턴 + 미세 랜덤). 음성 분석 없이 "말하는 느낌" 수준 — 분석 불가 환경에서도 기능이 죽지 않는다.

**공통 보조 동작**: 눈 깜빡임(주기 타이머)·고개 미동(저주파 사인). 재생 정지·일시정지 시 뉴트럴 표정으로 복귀. `prefers-reduced-motion` 시 보조 동작·입모양 정지(정지 캐릭터만 표시 — AV-05).

### 5.3 UI·진입점

- **진입**: 오디오 재생 가능 단원에서 플레이어에 "👤 아바타" 토글 버튼. 토글 상태는 시험 스코프 키(`readerAvatarOn`)에 저장 — 다음 재생 시 유지
- **Pro 게이트(AV-10)**: 토글 버튼에 `data-pro-feature="avatar_lecture"`를 부여해 `refreshProBadges`가 PRO 배지를 제어하고, 토글 ON 시 `proFeatureNotice('avatar_lecture', 'AI 아바타 강의')`로 1회 안내 — ROAD-P0 soft gate 계약(접근 차단 없이 유료 경계만 인지). hard gate 전환 시 별도 정책 필요 — 오디오북(`audiobook: "pro"`)과 동일 모델
- **배치**: 오디오 플레이어 영역 하단에 가로형 미니 패널(캐릭터 + 재생 중 단원명). 모바일은 플레이어 위 플로팅 — 본문 스크롤을 가리지 않는 크기(대략 96~120px)
- **무표시 계약(AV-01)**: `hasFeature('avatarLecture')` 거짓이거나 `getAudioPathForChapter()`가 null이면 토글·패널을 렌더하지 않는다. 오디오 소스 로드 실패 시에도 아바타만 남지 않는다 — 패널 자체를 철거
- **접근성(AV-05)**: 아바타는 장식 보조 — `aria-hidden="true"`, 포커스 대상 아님. 학습 대체 수단은 원문 텍스트·오디오(A-09 논리 연장 — 아바타는 정보 전달 채널이 아니므로 별도 대체재 불요)

### 5.4 피처 플래그·브랜딩

- `exams.json` `features.avatarLecture: true` — `features.audiobook`에 의존(오디오 없는 시험에 단독 활성화는 무의미, 빌드 체크에서 경고 검토)
- `feature-plan.json` `features.avatar_lecture: "pro"` — 유료 전환 등록(구현 시 함께). Pro 전용 혜택 목록(`_proBenefitItems`)에 "AI 아바타 강의" 행 추가 — 플랜 비교 모달 노출
- `features.audiobook`이 현재 cosmetic만 활성 — 다른 팩 온보딩은 기존 오디오북 파이프라인(Google TTS 무료 경로)으로 음원 선생성이 전제
- 캐릭터 브랜딩(AV-06): 기본 1종(플랫폼 공용). 시험별 교체는 `manifest.uiText`/exams.json 메타로 캐릭터 키를 지정할 수 있는 확장점만 열어둠 — Phase 0에서는 기본 캐릭터만

### 5.5 계측

`reportEvent('avatar_lecture', { action: 'show'|'hide'|'blocked_cors', exam, subj })` — 표시·토글·폴백 진입만 집계, 학습 내용 미수집(AI-28 계측 방침 준용).

## 6. Phase 0 구현 경계

- 립싱크 정밀도(viseme·음소 단위)는 목표하지 않는다 — 목표는 "설명하는 존재"의 시각적 동반
- 아바타와 텍스트 싱크(읽는 문장 하이라이트)는 기존 `sectionBoundaries` 자동스크롤로 커버 — 신규 싱크 개발 없음
- 영상·실사 아바타는 Phase 0 범위 밖

## 7. Phase 1 — 선별 요약 강의 영상 (조건부)

**트리거**: Phase 0 배포 후 `avatar_lecture` 이벤트로 사용률 확인 — 단원당 아바타 표시율·재생 완료율이 기준(제작 착수 판정값은 착수 시 확정)을 넘으면 진행.

**파이프라인** (오디오북 파이프라인과 동형):

```
교재 MD → LLM 대본 초안(tmp/ai_drafts/lectures/) → 사람 검수
  → content/exams/<id>/lectures/scripts/ 편입 → 토킹헤드 API 생성
  → MP4 외부 호스팅(GitHub Releases/R2) → data/video_manifest.js 매니페스트
```

- **대본**: 단원당 3~5분 압축 해설 — 원문 낭독이 아닌 "핵심 설명" 신규 콘텐츠. CQ-07 패턴 게이트 + 사람 검수 경로 필수(교재 근거 범위 계약 — AI-30식 구조화 입력으로 과목·단원·근거 구절만 전달)
- **생성**: HeyGen API `Avatar III Digital Twin`($0.60/분·1크레딧=$0.05 — 2026-11 확인가, 변동성 있으므로 착수 시 재확인). 스크립트당 음성은 내장 TTS 또는 기존 ElevenLabs 음원 업로드(`audio_url` 인자)
- **매니페스트**: `tools/build/build_video_manifest.js` → `data/video_manifest.js` — audio_manifest 패턴 미러, `features.lectureVideo` 플래그로 게이트(AV-08)
- **재생 UI(AV-09)**: 매니페스트에 해당 단원 영상이 있으면 아바타 토글 옆 "🎬 강의" 진입 — `<video>` 재생. 영상 없는 단원은 Phase 0 아바타로 폴백(두 기능 공존, 영상 우선)
- **Pro 게이트**: 영상도 동일 `avatar_lecture` 키 — 아바타/영상 두 모드를 하나의 유료 기능으로 묶어 게이트한다(별도 키 분리는 Phase 1 착수 시 재검토 — 영상은 제작 원가가 있어 higher 티어 분리 선택지)

## 8. 안전·품질·규약 정합

| 항목 | 정합 대상 |
|---|---|
| AI 대본 콘텐츠 신뢰성 | CQ-07 패턴 게이트·사람 검수(Phase 1 대본) — Phase 0는 음성이 기존 검수 완료 오디오북이라 신규 콘텐츠 리스크 없음 |
| 무표시·폴백 | AI-29 무표시 계약 — 기능 불가 시 UI 비노출. CORS·AudioContext 실패는 시간기반 폴백으로 기능 유지 |
| 저작권 | 캐릭터는 자체 SVG — 외부 캐릭터 IP 미사용(상업 이용 분쟁 원천 차단). Phase 1 아바타는 벤더 상용 라이선스 확인 후 선택 |
| 외부 자산 | 영상·음원은 git 미추적 외부 호스팅 원칙(ASSET_STORAGE_REVIEW, DOC-DSN-48) 준수 — SVG 캐릭터는 인라인이라 대상 아님 |
| 유료 게이팅·용어 표기 | `feature-plan.json` `avatar_lecture: "pro"` + `data-pro-feature` 배지 + `proFeatureNotice` 1회 안내(ROAD-P0). "유료"/"무료 제공" 표기는 pro-upgrade 컴포넌트 정본 — PLAN_TERMS(check:terms) 준수 |

## 9. 신규 SPEC ID 제안

| ID | 내용 |
|----|------|
| AV-01 | **아바타 강의 피처 게이트·무표시 계약** — `features.avatarLecture`(audiobook 의존)로 시험별 온보딩, 오디오 없음·기능 비활성·로드 실패 시 토글·패널 미렌더 |
| AV-02 | **아바타 오버레이 패널** — 오디오 재생 중 인라인 SVG 캐릭터 표시(플레이어 인접·모바일 플로팅), 토글 상태 시험 스코프 저장·재진입 유지 |
| AV-03 | **의사 립싱크 2단계 폴백** — AnalyserNode 진폭→입 개도 기본, CORS·AudioContext 불가 시 `currentTime` 기반 절차적 입모양 폴백. `crossorigin="anonymous"` 설정 선행 |
| AV-04 | **캐릭터 생동감·상태 머신** — 눈깜빡임·고개 미동, 재생/일시정지/정지에 따른 표정 상태(말함·뉴트럴) |
| AV-05 | **접근성** — `aria-hidden` 장식 요소, 포커스 제외, `prefers-reduced-motion` 시 동작 정지(정지 캐릭터 표시). 학습 대체 수단은 원문·오디오(A-09 연장) |
| AV-06 | **캐릭터 브랜딩 확장점** — 기본 캐릭터 1종 + 시험별 캐릭터 키 지정 인터페이스(Phase 0은 기본만) |
| AV-07 | **계측** — `avatar_lecture` 표시·토글·폴백 이벤트(내용 미수집) |
| AV-08 | **요약 강의 영상 파이프라인** — 대본 검수 경로(ai_drafts→검수→편입)·토킹헤드 생성·외부 호스팅·`build_video_manifest.js`→`data/video_manifest.js`·`features.lectureVideo` 게이트 (Phase 1 예약) |
| AV-09 | **강의 영상 재생 UI** — 매니페스트 존재 단원 "강의" 진입·`<video>` 재생, 없는 단원은 아바타 오버레이 폴백(영상 우선 공존 — Phase 1 예약) |
| AV-10 | **Pro 게이팅** — `feature-plan.json avatar_lecture: "pro"` 등록, 토글·영상 진입에 `data-pro-feature="avatar_lecture"` 배지 + `proFeatureNotice` 1회 안내(ROAD-P0 soft gate). `_proBenefitItems`에 "AI 아바타 강의" 행 추가. 아바타·영상 두 모드는 같은 키로 게이트(Phase 1에서 상위 티어 분리 재검토) |

## 10. 단계별 작업·검증

**Phase 0 작업 순서**: ① `reader-avatar.js`+CSS+토글(플래그 게이트) → ② 립싱크 2단계 → ③ 생동감·접근성 → ④ 계측 → ⑤ cosmetic 파일럿.

**검증**:
- 유닛: 입 개도 매핑(진폭→상태)·폴백 선택 로직·토글 상태 저장
- DOM(`tests/dom/reader/reader-avatar.dom.test.js`): 플래그 on/off 렌더·재생 상태 연동 표정·무표시 계약
- E2E: cosmetic 리더 → 오디오 재생 → 아바타 표시·토글 유지 (오디오 소스는 mock/로컬)
- 게이트: `check:imports`(reader 모듈 경계)·ux-invariants(컨트롤 높이 토큰)·check:terms(표기)

## 11. 범위 경계

- **제외 — 전량 토킹헤드 영상**: 비용·유지비 대비 효과 열위 (§4 A)
- **제외 — 실시간 스트리밍 아바타/대화형 튜터**: DOC-DSN-58 AL-15(튜터 스트리밍)와 역할 중복 — 아바타 튜터는 그 계획의 표현층 검토 사항으로 이관
- **제외 — viseme·음소 정밀 립싱크**: Phase 0 목표 아님 (§6)
- **제외 — 아바타 신규 낭독 콘텐츠**: Phase 0는 기존 오디오북 재생 위 표현층. 신규 음성 콘텐츠(요약 강의 음성 등)는 Phase 1 대본 경로에서 다룸
