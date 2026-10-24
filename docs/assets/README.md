# docs/assets — 플랫폼 공용 자산 인덱스

> **문서 ID**: DOC-IDX-03
> **범위**: platform · 판본: none
> 오프라인·외부 배포용 정적 자산의 정본 목록. 시험별 비즈니스 자산은 `docs/exams/<id>/business/`에 둔다.

## QR 자산 전체 목록

| 파일 | 인코딩 대상 | 용도 | 위치 |
|---|---|---|---|
| `discord-invite-qr.svg` / `.png` | https://discord.gg/eHerSQG9hj | 커뮤니티 서버 초대 (인쇄·전단) | 여기 |
| `passok-app-qr.svg` | https://passok.vercel.app | 앱 랜딩 CTA (유튜브·오프라인) | `docs/exams/cosmetic/business/` |
| `passmula-legacy-qr.svg` | 구 passmula 도메인 | 레거시 전단 잔재용 — 도메인 만료 시 삭제 | `docs/exams/cosmetic/business/` |
| `openchat-pro-qr.svg` | 카카오 오픈채팅 | Pro 결제 문의 입장 | `docs/exams/cosmetic/business/` |

## 재생성

```powershell
# SVG (벡터 — 인쇄 정본)
npx qrcode "<대상URL>" -t svg -o <파일>.svg
# PNG (래스터 — 슬라이드·문서 삽입용, 1024px·여백4)
npx qrcode "<대상URL>" -t png -o <파일>.png -w 1024 -m 4
```

## 규칙

- 네이밍: `kebab-case` + `<용도>-qr.<ext>` — 한글 파일명 금지 (git 경로 인코딩·도구 마찰)
- QR은 클릭 링크의 보조 수단 — 앱 내 화면에는 배치하지 않는다 (같은 기기에서 스캔 불가)
- 대상 URL 교체 시 해당 파일 재생성 + 본 표의 대상 열 갱신
