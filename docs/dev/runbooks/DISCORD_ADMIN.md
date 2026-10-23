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

---

## 1. 서버·채널 생성 (알림용)

1. Discord 앱 → 좌측 **+** → "직접 만들기" → 개인 운영 서버 생성
2. 채널 생성 — 예: `#passok-ops` (비공개 권장 — 알림에 운영 정보가 포함됨)
3. 채널 설정 → **연동 → 웹후크 만들기** → URL 복사

이 URL이 `DISCORD_WEBHOOK_URL`입니다 — `https://discord.com/api/webhooks/…` 형태.

## 2. 로컬 알림 활성화 (AD-10)

`.env`에 한 줄 추가:

```dotenv
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<token>
```

- `npm run deploy`가 배포 성공/실패·스모크 결과를 채널로 푸시
- 미설정 시 모든 발신 지점이 조용히 skip — 알림은 선택 계층

### CI(keepalive) 알림

GitHub repo → Settings → Secrets and variables → Actions → **`DISCORD_WEBHOOK_URL`** 추가.
설정 후 `supabase-keepalive.yml` 실패 시 이슈 생성과 함께 Discord 통지가 발송됩니다.
(기존 feedback-notify용 webhook을 쓰고 있다면 같은 URL 재사용 가능 — 채널 분리 원하면 별도 webhook)

## 3. 조회 명령 봇 (AD-11)

### 3.1 Discord 애플리케이션 생성

1. https://discord.com/developers/applications → **New Application** (이름 예: `passok-admin`)
2. **General Information** → **Application ID**·**Public Key** 복사
3. **Bot** → **Reset Token** → 토큰 복사 (1회만 표시)
4. **Bot → Public Bot OFF** 권장 (타인이 서버에 추가 불가)
5. **OAuth2 → URL Generator**: scope `bot` + `applications.commands` → 생성된 URL로 내 서버에 초대

### 3.2 시크릿 설정

```powershell
# Supabase Edge Function 시크릿
supabase secrets set DISCORD_PUBLIC_KEY=<Public Key> --project-ref <ref>
supabase secrets set ADMIN_DISCORD_ID=<내 Discord user id> --project-ref <ref>
# SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY는 Edge Runtime이 자동 주입

# Discord user id 확인: Discord 설정 → 고급 → 개발자 모드 ON → 내 아바타 우클릭 → "사용자 ID 복사"
```

```dotenv
# .env — 명령 등록 스크립트용
DISCORD_APP_ID=<Application ID>
DISCORD_BOT_TOKEN=<Bot Token>
```

### 3.3 함수 배포·명령 등록

```powershell
supabase functions deploy admin-bot --project-ref <ref>
npm.cmd run admin:discord          # 슬래시 명령 일괄 등록 (글로벌)
npm.cmd run admin:discord -- --list # 등록 상태 확인
```

### 3.4 Interactions Endpoint 연결

Developer Portal → **General Information → Interactions Endpoint URL**:

```
https://<project-ref>.supabase.co/functions/v1/admin-bot
```

저장 시 Discord가 `PING` 검증을 보냅니다 — 함수가 서명 검증 후 PONG을 반환하면 저장됩니다. 저장이 거부되면 함수 배포·`DISCORD_PUBLIC_KEY` 시크릿을 확인하세요.

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
