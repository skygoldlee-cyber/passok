# Discord 운영 채널 셋업 — 알림 push + 조회 명령 봇

> Discord를 운영 표면으로 사용하기 위한 최초 1회 설정 절차.
> **관련 SPEC ID**: `AD-10` (알림 push) · `AD-11` (조회 명령 봇) · `FB-08` (피드백 webhook — 기존)
> **문서 ID**: DOC-RBK-17
> **범위**: platform · 판본: none

## 개요

| 경로 | 방향 | 구성 요소 |
|---|---|---|
| 피드백 알림 | Supabase → Discord | `feedback-notify` Edge Function (기존, FB-08) |
| 운영 알림 | 로컬 도구/CI → Discord | `tools/lib/discord.js` + `DISCORD_WEBHOOK_URL` (AD-10) |
| 조회 명령 | Discord → Supabase | `admin-bot` Edge Function + 슬래시 명령 (AD-11) |

Discord 측 필요 자산: **서버 1개 · 채널 1개 · 애플리케이션 1개(Bot)** — 모두 무료.

**설정 진행 상태** (2026-10-23 기준 — 진행하면서 갱신):

| 단계 | 상태 |
|---|---|
| §1~2 `DISCORD_WEBHOOK_URL` — `.env` 설정·연결 테스트·실배포 알림 도착 | ✅ 완료 |
| §2 CI `DISCORD_WEBHOOK_URL` GitHub Actions 시크릿 | ☐ 선택 |
| §3.1~3.5 앱·봇 생성 → 시크릿 → 함수 배포 → Endpoint | ☐ 대기 |
| §3.6 명령 사용 확인 (`/status` 등) | ☐ 대기 |

> 웹후크만 설정돼도 **배포 알림(AD-10)은 즉시 동작**합니다. §3의 조회 명령 봇은 별도 진행.

---

## 0. Discord 처음 사용자 전제

1. https://discord.com 계정 가입 (이메일 인증)
2. 데스크톱 앱 설치 권장 — 웹에서도 되지만 개발자 모드·ID 복사가 앱이 편함

## 1. 서버·채널 생성 (알림용)

1. Discord 왼쪽 사이드바 맨 아래 **「+」(서버 추가)** → **「직접 만들기」** → **「나와 친구들을 위한 서버」** → 이름 예: `passok-ops`
2. `#일반` 옆 **+** → 채널명 `passok-ops` → **비공개 채널 ON** (운영 정보가 올라가므로)
3. `passok-ops` 채널 → 톱니바퀴(채널 설정) → **연동(Integrations) → 웹후크 → 웹후크 만들기**
4. 이름 `passok-ops` 등으로 지정 → **「웹후크 URL 복사」**

이 URL이 `DISCORD_WEBHOOK_URL`입니다 — `https://discord.com/api/webhooks/…` 형태.

## 2. 로컬 알림 활성화 (AD-10)

`.env`의 Discord 섹션(`# ── Discord 운영 알림 …` 주석 아래)에 webhook URL을 설정:

```dotenv
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<token>
```

- `npm run deploy`가 배포 성공/실패·스모크 결과를 채널로 푸시
- 미설정 시 모든 발신 지점이 조용히 skip — 알림은 선택 계층
- 연결 확인: `node -e "require('./tools/lib/discord.js').postDiscord({title:'테스트',description:'webhook 연결 확인'}).then(console.log)"` → `{ sent: true }` + 채널 메시지 도착이면 성공

### CI(keepalive) 알림

GitHub repo → Settings → Secrets and variables → Actions → **`DISCORD_WEBHOOK_URL`** 추가.
설정 후 `supabase-keepalive.yml` 실패 시 이슈 생성과 함께 Discord 통지가 발송됩니다.
(기존 feedback-notify용 webhook을 쓰고 있다면 같은 URL 재사용 가능 — 채널 분리 원하면 별도 webhook)

## 3. 조회 명령 봇 (AD-11)

### 3.1 Discord 애플리케이션 생성

1. https://discord.com/developers/applications → 우상단 **「New Application」** → 이름 예: `passok-admin` → Create
2. **General Information** 탭에서 복사해 임시 보관:
   - **Application ID** (숫자)
   - **Public Key** (64자 16진수)
3. 왼쪽 **Bot** 탭 → **「Reset Token」** → 토큰 복사 (**1회만 표시 — 바로 저장**)
4. 같은 Bot 탭에서 **「Public Bot」 스위치 OFF** (타인이 내 서버 밖에 추가 불가)
5. 왼쪽 **OAuth2 → URL Generator**: scope에 `bot` + `applications.commands` 체크 → 아래 생성된 URL을 브라우저로 열기 → 서버 선택 → 승인 → 봇 입장

### 3.2 관리자 user id 확인

Discord 설정(좌하단 톱니) → **고급(Advanced) → 개발자 모드 ON** → 본인 이름 우클릭 → **「사용자 ID 복사」** — 이 숫자가 `ADMIN_DISCORD_ID`.

### 3.3 시크릿 설정

```powershell
# Supabase Edge Function 시크릿 — <ref>는 src/auth-sync/supabase-config.js의
# SUPABASE_URL에 있는 <ref>.supabase.co
npx.cmd supabase secrets set DISCORD_PUBLIC_KEY=<Public Key> --project-ref <ref>
npx.cmd supabase secrets set ADMIN_DISCORD_ID=<3.2의 내 user id> --project-ref <ref>
# SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY는 Edge Runtime이 자동 주입
```

```dotenv
# .env — 명령 등록 스크립트용
DISCORD_APP_ID=<Application ID>
DISCORD_BOT_TOKEN=<Bot Token>
```

### 3.4 함수 배포·명령 등록

```powershell
# supabase CLI 최초 1회 로그인 필요: npx.cmd supabase login
npx.cmd supabase functions deploy admin-bot --project-ref <ref>
npm.cmd run admin:discord           # 슬래시 명령 일괄 등록 (글로벌)
npm.cmd run admin:discord -- --list # 등록 상태 확인
```

### 3.5 Interactions Endpoint 연결

Developer Portal → **General Information → Interactions Endpoint URL**:

```
https://<project-ref>.supabase.co/functions/v1/admin-bot
```

저장 시 Discord가 `PING` 검증을 보냅니다 — 함수가 서명 검증 후 PONG을 반환하면 저장됩니다. 저장이 거부되면 함수 배포·`DISCORD_PUBLIC_KEY` 시크릿을 확인하세요.

### 3.6 사용 확인

서버 아무 채널에서 `/` 입력 → `/status` `/user` `/pro` `/errors` `/feedback` 목록 표시 (글로벌 명령 전파까지 최대 1시간 — 안 보이면 클라이언트 재시작). `ADMIN_DISCORD_ID` 외 사용자는 "관리자 전용" ephemeral 응답만 받습니다.

## 4. 명령 표

| 명령 | 인자 | 내용 | 대응 CLI |
|---|---|---|---|
| `/status` | — | 사용자·Pro·피드백·오류 카운트 | `report:pro` 요약판 |
| `/user` | `email` | plan·만료·사용 코드·동기화 메타 | `report:user` |
| `/pro` | — | 코드 재고·만료 버킷 | `report:pro` |
| `/errors` | `days` (기본 7) | 최근 N일 상위 오류 메시지 | `report:errors` |
| `/feedback` | `days` (기본 7) | 최근 N일 피드백 최신 10건 | `report:feedback` |

- **읽기 전용** — 상태 변경은 Discord에서 하지 않습니다 (Pro 부여 등은 `admin:grant-pro` 등 기존 CLI 경로·감사 체계 유지)
- `ADMIN_DISCORD_ID` 외 사용자가 실행하면 ephemeral "관리자 전용" 응답 — 다른 서버 멤버가 보아도 데이터 노출 없음
- 응답은 `allowed_mentions: []` — 멘션 해석 비활성화

## 5. 트러블슈팅

| 증상 | 확인 |
|---|---|
| Endpoint 저장 거부 | 함수 미배포 or `DISCORD_PUBLIC_KEY` 시크릿 오기재 |
| 명령이 목록에 안 뜸 | 글로벌 명령 전파 지연(최대 1시간) — `admin:discord -- --list`로 등록 확인 |
| `⚠️ 조회 실패` 응답 | 함수 로그: `supabase functions logs admin-bot` — Supabase service key·테이블 접근 오류 |
| 배포 알림 안 옴 | `.env`의 `DISCORD_WEBHOOK_URL` 오기재·채널 webhook 삭제 여부 |

## 보안 노트

- `DISCORD_WEBHOOK_URL`은 누출 시 해당 채널에 임의 메시지 발송 가능 — 코드에 커밋 금지, 유출 시 채널 설정에서 webhook 삭제 후 재생성
- `DISCORD_BOT_TOKEN`·`SUPABASE_SERVICE_ROLE_KEY`는 관리자 자격 — 같은 규칙
- 봇의 모든 명령은 단일 `ADMIN_DISCORD_ID`로 제한되지만, 조회 결과는 사용자 식별 정보를 포함하므로 **비공개 채널 또는 DM에서만 사용** 권장
