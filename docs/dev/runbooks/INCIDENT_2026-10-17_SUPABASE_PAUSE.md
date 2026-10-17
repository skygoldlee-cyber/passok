# 인시던트 보고서 — Supabase 프로젝트 일시정지 (2026-10-17)

> **문서 ID**: DOC-RBK-15
> **범위**: platform · 판본: none
> **관련 SPEC ID**: AU-01~08 (인증 계층 영향) — 절차 정본은 [SUPABASE_DESIGN.md §12](../design/SUPABASE_DESIGN.md#12-비시즌-비용-평가-supabase-free-keep-alive-채택-2026-10-17) · [WHEN_THINGS_BREAK.md §1](WHEN_THINGS_BREAK.md#1-배포된-앱-사용자-표면-증상)
> **상태**: ✅ 해결 완료 — 재발 방지 장치 가동 중

---

## 1. 요약

비시즌(시험 연 2회) 무트래픽으로 Supabase Free 프로젝트가 **7일 무활동 자동 일시정지**됐다.
정지 시 DNS 레코드 자체가 제거되어 로그인·클라우드 동기화가 전면 불가한 상태였으나,
대시보드 Resume으로 **데이터 무손실 복구**했다. 이후 GitHub Actions 일일 핑(keep-alive)을
도입해 재발 방지 + 자동 감지 체계를 구축했다. 비용은 연 $0 유지.

| 항목 | 내용 |
|---|---|
| 영향 | 로그인·클라우드 동기화·텔레메트리 전면 불가 (localStorage 기반 로컬 기능은 무영향) |
| 지속 | 정확한 정지일 불명 — 2026-09-23(최종 정상 확인) 이후 ~ 2026-10-17 사이 |
| 원인 | Free 티어 7일 무활동 자동 일시정지 (정책상 정상 동작) |
| 복구 | 대시보드 Resume project → DNS 재전파 → REST 200 확인 (데이터 무손실) |
| 재발 방지 | `supabase-keepalive.yml` 일일 핑 + 실패 시 이슈 자동 생성 |

---

## 2. 타임라인

| 시각 (KST) | 사건 |
|---|---|
| 2026-09-23 | 연결 테스트 정상 — §A.6 실측 기록 (REST·Auth 200, 이메일 인증 동작) |
| ~10월 중순 | 오프시즌 무트래픽 → 7일 무활동 판정 → **자동 일시정지** (사전 경고 메일 수신 여부 미확인) |
| 2026-10-17 | 비시즌 비용 대안 평가 중 `hunpzznyiaddekuggupu.supabase.co`가 NXDOMAIN임을 실측 → 정지 발견 |
| 2026-10-17 | 대시보드에서 **Resume project** → DNS 재전파 확인 → REST 200 복구 확인 |
| 2026-10-17 | keep-alive 워크플로 도입 → 커밋·푸시 → workflow_dispatch 수동 실행 `HTTP 200` 검증 |

---

## 3. 근본 원인 분석

### 3.1 직접 원인

Supabase Free 플랜은 **7일간 사용자 DB 활동이 부족하면 프로젝트를 자동 일시정지**한다.
서비스가 연 2회 시험(5월·9월) 중심이라 비시즌에는 트래픽이 없어 정지 조건을 충족했다.

### 3.2 증폭 요인 — 정지 = DNS 레코드 제거

정지가 단순한 서비스 중단(503)이 아니라 **프로젝트 호스트명의 DNS 레코드 자체가 제거**된다.
이로 인해:

- 모든 공용 리졸버(로컬 ISP·8.8.8.8·1.1.1.1·dns.google)에서 NXDOMAIN 반환
- 클라이언트 입장에서 **정지와 삭제의 증상이 완전히 동일** — 브라우저는 `ERR_NAME_NOT_RESOLVED`
- 구분은 Supabase 대시보드에서만 가능 (프로젝트 목록 존재 + Paused 표시 → 정지)

### 3.3 감지가 늦은 이유

- 정지 사전 경고 메일(정지 1주 전 발송)을 모니터링하는 경로가 없었다
- 텔레메트리(`client_errors`·`usage_events`)가 익명 insert로 들어오므로 소수 사용자만 앱을 열어도 활동이 될 것이라 기대했으나, 완전 무트래픽 기간이 7일을 넘었다

---

## 4. 감지·진단 절차 (재현용)

```powershell
# ① 복수 리졸버에서 DNS 확인 — 모두 NXDOMAIN이면 정지 또는 삭제
nslookup <프로젝트ref>.supabase.co 8.8.8.8
nslookup <프로젝트ref>.supabase.co 1.1.1.1
curl "https://dns.google/resolve?name=<프로젝트ref>.supabase.co&type=A"   # Status:3 = NXDOMAIN

# ② 대시보드에서 구분 — 목록에 있고 Paused면 정지, 없으면 삭제
#    https://supabase.com/dashboard
```

| 관측 결과 | 해석 |
|---|---|
| 일부 리졸버만 NXDOMAIN | 로컬 DNS·ISP 캐시 문제 (프로젝트 무관) |
| 모든 리졸버 NXDOMAIN | 정지 또는 삭제 — 대시보드 확인 필수 |
| DNS 해석되나 HTTP 오류 | 서비스 장애 (정지 아님) — 대시보드 health 확인 |

---

## 5. 복구 절차

1. <https://supabase.com/dashboard> 로그인 → 프로젝트 선택 (Paused 표시) → **Resume project**
2. 대기: 프로젝트 Active 전환 수 분 + DNS 재전파 수 분~수 시간
3. 검증 — IP가 반환되고 REST가 200이면 완료:

```powershell
nslookup <프로젝트ref>.supabase.co 8.8.8.8        # A 레코드 반환 확인
# 앱 로그인·동기화 확인
```

- 데이터·스키마·설정은 정지 중에도 보존되며, 정지 후 **1년 내**에는 복원 가능
- 대시보드에 프로젝트 자체가 없으면 삭제 → 재생성 + `tools/supabase/schema.sql` 재실행 + `src/supabase-config.js` 갱신 필요

---

## 6. 재발 방지 로직 (구축 완료)

### 6.1 활동 유지 — `.github/workflows/supabase-keepalive.yml`

매일 13:30 KST 두 엔드포인트에 핑:

| 대상 | 목적 |
|---|---|
| `GET /rest/v1/sync_snapshots?select=user_id&limit=1` | 실제 DB 쿼리 — 공식 문서의 "주 수회 DB 활동" 판정 충족 |
| `GET /auth/v1/settings` | 인증 서비스(GoTrue) 생존 감시 |

URL·publishable key는 `src/supabase-config.js`에서 실행 시 추출 — 공개 설계(RLS가 보안 담당)라
시크릿 등록 불필요, 프로젝트 교체 시 자동 추적.

### 6.2 실패 감지 — 이중 경로

```
핑 실패 → ① Actions 실패 이메일 (Notifications → Actions 설정 확인됨)
        → ② gh issue create — 복구 절차가 담긴 이슈 자동 발행
             (열린 동일 제목 이슈가 있으면 신규 생성 대신 댓글 누적 — 일일 중복 방지)
```

### 6.3 운영 절차 연결

- 시즌 재개 배포 체크리스트: 대시보드 Active 확인 + keep-alive 실행 이력 + 알림 설정 확인 ([DEPLOYMENT_GUIDE.md §3-1](DEPLOYMENT_GUIDE.md#3-1-시즌-재개-배포-시-추가-supabase-상태-확인))
- 증상 색인: "로그인·동기화 실패 + NXDOMAIN" → 복구 라우팅 ([WHEN_THINGS_BREAK.md §1](WHEN_THINGS_BREAK.md#1-배포된-앱-사용자-표면-증상))

---

## 7. 잔존 리스크와 대응

| 리스크 | 실질 영향 | 대응 |
|---|---|---|
| GitHub 스케줄 지연·스킵 | 정지 기준 7일 대비 하루 이틀 누락은 무해 — 연속 7일 누락 필요 | 여유 7배, 사실상 무시 가능 |
| 저장소 60일 무활동 → 스케줄 자동 비활성화 | 비시즌 장기 무커밋 시 크론 정지 → 이후 Supabase 정지 가능 | GitHub이 비활성화 전 이메일 통지 — 수신 시 재활성화 또는 커밋. 필요하면 외부 이중 핑(cron-job.org 등 커스텀 헤더 지원 크론) 추가 — SUPABASE_DESIGN §12.5 |
| Supabase 활동 판정 기준 변경 | 하루 1쿼리가 부족 판정될 가능성 | §12.4 재검토 트리거 — Firebase/PocketBase 비교로 회귀 (설계안 보존됨) |
| 프로젝트 삭제 (정지 후 1년 초과 등) | 클라우드 스냅샷 유실 — 단, localStorage가 1차 저장소라 사용자 데이터는 기기에 남음 | schema.sql 재실행 절차 문서화됨. 주기 덤프는 secret 관리 비용 대비 가치 낮아 기각 (§12.5) |

---

## 8. 비용 결론

유료 플랜(Pro $25/월) 대신 **Free + keep-alive로 연 $0 유지**를 채택했다.
비교 평가·Firebase 이관 기각 사유·재검토 조건은 SUPABASE_DESIGN §12가 정본이다.

---

## 🔗 관련 문서

- [SUPABASE_DESIGN.md §12](../design/SUPABASE_DESIGN.md#12-비시즌-비용-평가-supabase-free-keep-alive-채택-2026-10-17) — 비용 평가·keep-alive 설계·보완 설계 (정본)
- [WHEN_THINGS_BREAK.md](WHEN_THINGS_BREAK.md) — 증상→정본 라우팅 색인
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — 배포 전 체크리스트 (시즌 재개 점검 §3-1)
- `.github/workflows/supabase-keepalive.yml` — 구현체
