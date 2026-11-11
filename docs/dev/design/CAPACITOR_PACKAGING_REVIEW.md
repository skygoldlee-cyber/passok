# Capacitor 네이티브 패키징 적합성 검토 보고서

> **문서 ID**: DOC-DSN-47
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (패키징 전략 검토 — 앱 동작 요구사항 아님)
> **관련 문서**: DOC-DSN-39 (네이티브 앱 전환 전략 — 본 문서는 그 2단계 Capacitor의 실측 타당성 검토)
> **작성**: 2026-11-11 · **성격**: 적합성 검토 보고서 — 구현 착수 시 별도 설계 문서 신설

## 1. 목적·배경

DOC-DSN-39가 정한 단계 전략(TWA → Capacitor → Flutter) 중 2단계인 **Capacitor 래핑의 실제 적합성**을 리포지토리 실측값으로 검증한다. 질의 경위: "Rust로 재작성 가능한가" → Tauri 검토 과정에서 웹 래퍼 비교 대상으로 Capacitor가 부상 — iOS 지원·성숙도 면에서 이 프로젝트에는 Tauri보다 적합하다는 판단에 이르러 정식 검토를 문서화한다.

## 2. 결론 요약

**적합 — Android-first로 진행 가치 있음.** 빌드 없는 정적 산출물 구조가 Capacitor의 `webDir` 복사 모델과 이례적으로 잘 맞고, carework 단일 시험 패키징이면 앱 크기 ~17MB로 가볍다. 유일한 실질 수정 지점은 OAuth 딥링크이며, 콘텐츠 팩 배포 모델 설계가 중기 과제다.

| 판정 항목 | 결과 |
|---|---|
| 기술 호환성 | 통과 — 치명적 비호환 없음 (OAuth 딥링크만 수정 필요) |
| 앱 크기 | 통과 — 단일 시험 ~17MB, 전 시험 내장 ~70MB (Play 한도 200MB 이내) |
| 비용 | 수용 가능 — Spike 반나절~1일, Play 출시 수일 |
| 대안 대비 우위 | iOS 스토어 목표 시 최선의 경로 — TWA는 Android 전용, Tauri iOS는 미성숙, Flutter는 전면 재작성 |

## 3. 후보 비교 (재확인)

| 경로 | Android | iOS | 코드 재사용 | 비고 |
|---|---|---|---|---|
| **TWA (Bubblewrap)** | ✅ 최저비용 | ❌ 불가 | 100% | DSN-39 1단계. 스토어 등록만이 목적이면 이걸로 충분 |
| **Capacitor** | ✅ | ✅ WKWebView | JS 100% | 네이티브 플러그인으로 알림·딥링크 추가 가능. iOS 실적 풍부 |
| Tauri | ✅ | ⚠ 2.x 신생 | JS 100% | Rust 셸. iOS 사례·문서 부족 — 이 프로젝트 용도엔 Capacitor가 상위 |
| Flutter·네이티브 | ✅ | ✅ | 0% (전면 재작성) | DSN-39 재검토 트리거 충족 시에만 — 수개월 비용 |

TWA는 Android 전용이다. iOS를 포함한 스토어 커버가 목표일 때 Capacitor가 다음 단계다.

## 4. 호환성 실측

| 항목 | 현재 구현 | Capacitor에서 | 판정 |
|---|---|---|---|
| 빌드 산출물 | `build:html`+`build:data`의 정적 HTML·ESM·data 번들 — 번들러 없음 | `webDir` 통째 복사 모델과 정합 — 빌드 체인 변경 불필요 | ✅ |
| 오프라인 | SW precache | 앱 내장 자산으로 대체 — SW 불필요·오히려 더 강력한 오프라인 | ✅ |
| 진도 저장 | localStorage 1차 저장소 (`core/storage.js` 추상화) | WebView localStorage 그대로 동작. 단 iOS는 스토리지 압박 시 제거 가능 — 핵심 키는 Preferences 플러그인 이관 경로를 storage.js 어댑터로 열어둘 것 | ✅ (주의) |
| 이메일 로그인·동기화 | Supabase REST/Auth 호출 | WebView→supabase.co HTTPS 그대로 동작 | ✅ |
| 소셜 로그인 | `signInWithOAuth` Google·Kakao, `redirectTo: window.location.origin` | 앱 origin은 `capacitor://` — 커스텀 스킴 딥링크로 리다이렉트 변경 + `@capacitor/app` URL 리스너 + Supabase 대시보드 redirect URL 등록 필요 | ⚠ 수정 필요 |
| 학습 리마인더 | 없음 (study-tracker에 기록 인프라 존재) | `@capacitor/local-notifications` — 서버 불필요, DSR 스케줄과 직결 가능 | ✅ 신규 가치 |
| E2E | Playwright chromium/mobile/tablet | Android System WebView는 Chromium 계열이라 기존 검증과 엔진 괴리 작음. iOS WKWebView는 별도 실기기 검증 필요 | ✅ (iOS 주의) |

## 5. 앱 크기 분석 (2026-11-11 실측)

배포 페이로드 총 226MB 중 앱 런타임이 실제 사용하는 부분:

```
shell (index.html+style.css+src+vendor+html 파셜)  ≈ 13MB
data/exams/carework                                  =  4MB
data/exams/cosmetic                                  = 33MB
data/ 전체 (시험 8종)                                 = 58MB
```

- **carework 단일 패키징 ≈ 17MB** — 스토어 기준 매우 양호
- 전 시험 내장 ≈ 70MB — Play AAB 한도(200MB) 이내지만 비추천
- 나머지 페이로드(ref_md·문서 번들 등)는 런타임 비필수 또는 기존처럼 외부 호스팅 대상

**콘텐츠 팩 배포 모델 (중기 과제)**: 전부 내장하면 교재 개정이 앱 업데이트=스토어 심사를 요구한다. 시험 팩(DA-13) 구조가 이미 격리돼 있으므로, 활성 시험 팩만 내장 + 나머지 팩·개정분을 앱 내 다운로드(CDN)로 설계하면 심사와 콘텐츠 갱신이 분리된다.

## 6. 비용 추정

| 단계 | 내용 | 규모 |
|---|---|---|
| Spike | `cap add android` → 에뮬레이터 부팅 → ESM 로딩·localStorage·이메일 로그인·동기화 검증 | 반나절~1일 |
| Android 출시 | 앱 ID·아이콘·스플래시·서명·Play internal track | 수일 (계정 $25 일회성, 심사 며칠) |
| 네이티브 기능 | 로컬 알림 · OAuth 딥링크 · 시험 팩 다운로드 | 기능당 수일 |
| iOS 출시 | Xcode + 인증서 + macOS 빌드(장비 또는 CI 러너) + App Store 심사 | 수일+지속비 ($99/년) — 네이티브 기능 확보 후 진행 권장 |
| 지속 | 웹(Vercel 즉시 배포) + 앱(스토어 심사) 2개 릴리스 채널 | 상시 |

## 7. 리스크

1. **Apple 4.2 리젝** — "웹 래퍼" 판정 회피를 위해 네이티브 기능(알림 등)이 실질적으로 동반돼야 한다. iOS는 기능 확보 후 진입이 안전
2. **WKWebView 격차** — iOS는 엔진이 다르므로 레이아웃·localStorage 거동 실기기 검증 필수. Android는 Chromium 계열라 위험 낮음
3. **OAuth 리다이렉트 미구현 상태로 출시 금지** — 소셜 로그인이 죽는다. 이메일 로그인만으로 초기 출시 후 딥링크를 후속 적용하는 절충도 가능
4. **양 채널 버전 드리프트** — 웹은 즉시 배포, 앱은 심사 지연. 기능 플래그(feature-plan.json)로 채널별 노출 분리 메커니즘이 이미 있어 완화 가능

## 8. 권장 로드맵

1. **Spike** — Android 에뮬레이터 부팅·핵심 경로 확인 (webDir=빌드 산출물, carework 팩만 포함)
2. **Play internal 출시** — 이메일 로그인만으로 최소 출시, 스토어 유입 데이터 수집 (DSN-39의 TWA 역할을 Capacitor가 겸함 — TWA를 거치지 않아도 스토어 실측은 동일하게 얻음)
3. **네이티브 기능** — 로컬 알림(학습 리마인더) → OAuth 딥링크 → 시험 팩 다운로드
4. **iOS** — 네이티브 기능 실적 확보 후 App Store 진입 (4.2 대응)

DSN-39의 TWA 우선 권고와의 관계: "스토어 노출 검증"이라는 TWA의 목적은 Capacitor Android 출시로 동일하게 달성되며, 네이티브 기능 로드맵이 확정된 경우 TWA를 건너뛰고 Capacitor로 직행하는 것이 중복 패키징을 줄인다. 스토어 등록만 빠르게 원하면 TWA가 여전히 최저비용 — 둘은 배타적이지 않다.

## 9. 선행 조건·의존

- Android SDK (Android Studio) — Spike의 유일한 로컬 요구사항
- Play 개발자 계정 ($25)
- iOS 착수 시: Apple Developer ($99/년) + macOS 빌드 환경
- 서명키 보관 정책 — Play App Signing 사용 권장 (업로드키 분실 대비)
