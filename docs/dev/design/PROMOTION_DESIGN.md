# 홍보·유입 기능 보완 설계 — 유입 채널 확장 백로그

> **문서 ID**: DOC-DSN-37
> **범위**: platform · 판본: none
> **관련 SPEC ID**: ES-08 (시험별 커뮤니티 초대 링크), AD-10~12 (Discord 운영 표면·공지 fan-out), AU-09 (카카오 OAuth — 공유 유입 접점), DA-15 (시험별 링크·문구는 `exams.json` 선언 경로 — 코드 리터럴 금지)
> **최종 업데이트**: 2026-10-24
> **상태**: 설계안(백로그) — P0은 코드 변경 없는 운영 절차, P1 이하는 미구현
> 상위 문서: [docs/README.md](../../README.md) · 관련 문서: [DISCORD_COMMUNITY_DESIGN.md](DISCORD_COMMUNITY_DESIGN.md) (DOC-DSN-36 — 커뮤니티 채널 설계) · [BUSINESS_VALIDATION.md](BUSINESS_VALIDATION.md) (DOC-DSN-34 — 가설·KPI) · [PAYMENT_PILOT_DESIGN.md](PAYMENT_PILOT_DESIGN.md) (DOC-DSN-35 — 전환 계측)

## 0. 배경 — 홍보 표면 현황 인벤토리

사업 검증(DOC-DSN-34)이 전환·유입 지표를 요구하는 단계에 진입했으나, 유입을 만드는 표면이 일부만 구현됐고 구현된 것도 미가동 상태다. 2026-10-24 시점 인벤토리:

| 표면 | 상태 | 위치 |
|------|------|------|
| 주간 학습 리포트 공유 (`navigator.share`) | ✅ 구현 — 공유 경로 1곳뿐 | `src/views/analysis-view.js` |
| Discord 커뮤니티 초대 버튼 (ES-08) | ✅ 구현 — `discordInvite` **미선언**으로 미노출 | `content/exams.json` · `src/views/listeners-app.js` |
| Discord 릴리스 공지 fan-out (AD-12) | ✅ 구현 — `.env`의 `DISCORD_ANNOUNCE*`가 **플레이스홀더**라 발송 스킵 (2026-10-24 배포에서 확인) | `tools/lib/discord.js` |
| 오픈채팅 결제 문의 | ✅ 운용 중 | `src/pro-upgrade.js` (`contactUrl`) |
| redeem_code | ✅ 구현 — 추천 프로그램으로 재활용 가능한 원자적 소비 구조 | `src/pro-redeem.js` · Supabase RPC |
| OG·Twitter 메타 태그 | ❌ 없음 — 링크 공유 시 미리보기 카드 미표시 | `index.template.html` |
| UTM·referrer 유입 계측 | ❌ 없음 — 채널별 전환 측정 불가 | `src/usage-telemetry.js` |
| sitemap·검색 노출면 | ❌ 없음 — SPA 단일 페이지라 검색 유입면이 좁음 | — |

## 1. P0 — 기존 인프라 가동 (운영 절차, 코드 변경 없음)

구현됐지만 꺼져 있는 채널을 켠다. 가장 저비용·즉시 효과.

1. 커뮤니티 서버 개설 — `DISCORD_COMMUNITY_SETUP.md`(DOC-RBK-18) 절차 수행
2. `.env`의 `DISCORD_ANNOUNCE`(전체-공지)·`DISCORD_ANNOUNCE_COSMETIC`(시험별)에 실제 webhook URL 기입 — 플레이스홀더(`<… 채널 webhook>`) 그대로면 URL 파싱 실패로 조용히 스킵된다
3. `content/exams.json`의 cosmetic 엔트리에 `discordInvite` 기입 → 설정 메뉴 버튼 노출
4. 검증: 다음 배포에서 `announceRelease()` 발송 로그 확인 + 설정 메뉴 버튼 노출 확인

## 2. P1 — OG·링크 프리뷰 메타

카카오톡·디스코드에 URL을 붙여넣으면 OG 카드가 첫인상이다 — 현재 `index.template.html`에 og:/twitter: 태그가 없어 미리보기가 빈 상태로 나간다.

- `index.template.html` `<head>`에 `og:title`·`og:description`·`og:image`·`og:url`·`twitter:card` 추가
- `og:image`는 시험 공용 1장(1200×630)으로 시작 — `images/` 정적 자산 + `check:assets`/`verify:assets` 명단 등록 필요 (SHELL_ASSETS 아님, 정적 파일 참조라 별도 캐시 불요)
- **확장 경로(DA-15 정합)**: 시험이 늘면 `exams.json`에 `promo: { description, ogImage }` 선택 필드를 두고 빌드 시 템플릿 주입 — 시험 문구를 코드에 하드코딩하지 않는다

## 3. P2 — 성과 공유 카드 (바이럴 루프)

수험생이 자발적으로 공유하는 시점은 **점수·스트릭**이다. 기존 리포트 텍스트 공유(§0)를 이미지 카드로 확장한다.

- 모의고사 결과·주간 리포트 → canvas로 점수 카드 렌더 (예: "조제관리사 모의 85점 · Passmula") → `navigator.share` 또는 `shareTarget`
- 카드에 앱 로고·설치 URL 포함 → 공유 행위 자체가 홍보 소재
- 제약: 외부 공유 SDK(카카오 SDK 등)는 `vendor/` 매니페스트(BP-13) + CSP(`vercel.json`) 변경이 필요 — Web Share API 우선, 네이티브 SDK는 수요 확인 후

## 4. P3 — 다중 커뮤니티 링크 (카카오 병행)

DOC-DSN-36 §3 메모의 확정안: 한국 수험생 커뮤니티는 오픈채팅·네이버 카페가 지배적이고, 고연령 시험(손해사정사·행정사)은 Discord 도달률이 낮다.

- `exams.json.discordInvite` → `communityLinks: [{ type: "discord" | "kakao" | "naver-cafe", url, label? }]`로 일반화 (기존 `discordInvite`는 마이그레이션으로 흡수)
- 설정 메뉴에 선언된 링크만큼 버튼 노출 — 현재 1버튼 규약(`community-btn`)을 목록으로 확장
- 결제 문의 오픈채팅(`pro-upgrade.js`의 `contactUrl`)과 커뮤니티 채널은 **목적이 다르다** — 같은 채널 재사용은 지양

## 5. P4 — 추천 코드 (기존 인프라 재활용)

`redeem_code`가 TOCTOU까지 해결된 원자적 소비 구조라 추천 프로그램의 기반이 이미 있다.

- 초대 코드 = redeem_code 변형 발급 → 초대받은 사용자 Pro 체험(예: 7일) + 초대자 혜택(기간 연장 등)
- 초대 경로 계측(`redeem`에 `referred_by` 기록)으로 추천 전환율 측정
- 남용 방어: 1계정 1회·동일 디바이스 반복 소비 제한 설계 필요

## 6. P5 — 검색 유입 (SEO)

"조제관리사 기출문제"류 검색량이 유기적 유입의 원천이다 — SPA라 노출면이 좁은 공백.

- `sitemap.xml` + `robots.txt` 추가, 네이버 서치어드바이저·Google Search Console 등록
- 시험별 랜딩 섹션 또는 정적 소개 페이지로 검색 노출면 확장 — `build:html` 파셜 조립 경로 재사용 가능

## 7. P6 — 유입 계측 (UTM·referrer)

어떤 홍보가 설치·가입으로 이어지는지 측정하는 수단이 없다 — 홍보 채널 확장 전에 계측을 먼저 둔다.

- 첫 진입 시 `utm_source/medium/campaign`·`document.referrer` 캡처 → `usage-telemetry` 채널 필드로 기록
- Discord 초대·오픈채팅 공유 링크에 UTM을 붙여 채널별 전환 추적
- PWA 설치 유도 화면 진입원 분석에도 재사용 가능

## 8. 우선순위·실행 순서

| 순서 | 항목 | 성격 | 비고 |
|------|------|------|------|
| 1 | P0 인프라 가동 | 운영 절차 | 코드 불요 — 런북 절차 + .env·exams.json 기입 |
| 2 | P1 OG 태그 | 소규모 마크업 | 링크 공유의 최소 기반 |
| 3 | P3 다중 커뮤니티 링크 | 선언 구조 확장 | DOC-DSN-36 메모의 구현 — 카카오 병행 |
| 4 | P2 성과 공유 카드 | 바이럴 표면 | 점수 자랑 = 수험생의 자발적 홍보 |
| 5 | P6 유입 계측 | 측정 기반 | 채널 확장 효과 판정에 선행 투자 |
| 6 | P4 추천 코드 | 전환 장치 | 유입 채널이 살아난 뒤 효과 증폭 |
| 7 | P5 SEO | 장기 유입 | 콘텐츠·시험 수 확장과 궤를 같이 함 |

## 9. 미결정 사항

- **커뮤니티 플랫폼 우선순위**: Discord 정본 vs 카카오 오픈채팅 병행의 기본값 — 시험 타깃 연령대별로 다를 수 있어 `communityLinks` 도입 시 시험별 선택으로 유보
- **추천 코드 혜택 형태**: Pro 체험 기간·초대자 보상 규모 — 결제 파일럿(DOC-DSN-35) 지표 확인 후 확정
- **네이티브 공유 SDK 도입 여부**: 카카오톡 공유 SDK는 vendor 번들링·CSP·콘솔 등록 비용이 있다 — Web Share API 커버리지로 부족하다는 데이터(공유 시도↔완료율)가 나오면 재검토
