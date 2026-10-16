# Firebase 연동 설계 — 인증·DB를 Supabase에서 Firebase로 옮길 경우

> 상위 문서: `ARCHITECTURE.md` (전체 구조), `SUPABASE_DESIGN.md` (DOC-DSN-08 — 현행 구현의 원본 설계)
> **관련 SPEC ID**: `AU-01~08` (SPEC §3.19) · `DA-08` (고객 PII 동기화 제외) · `S-01` (CSP) · `ROAD-P0` (Pro entitlement) · `FB-05~08` (피드백 수신)
> 목적: 백엔드를 Supabase → **Firebase(Authentication + Cloud Firestore + Cloud Functions)**로 교체하는 경우의 설계. 기능 요구사양(계정·스냅샷 동기화·Pro entitlement·텔레메트리)은 SUPABASE_DESIGN과 동일하고, 본 문서는 **플랫폼 대응 매핑과 차이점**에 집중한다.
> **구현 상태**: 설계안 (미구현) — 채택 시 SUPABASE_DESIGN Phase 1~3을 Firebase 경로로 재수행
> 전제: 오프라인 PWA·Zero-Backend 철학 유지 — Firebase도 "없어도 되는" 선택 계층
> **문서 ID**: DOC-DSN-31
> **범위**: platform · 판본: none

---

## 1. 설계 원칙

SUPABASE_DESIGN §1의 원칙을 그대로 계승하고, Firebase 특유의 차이만 추가한다.

1. **로컬 우선 (offline-first)** — localStorage가 계속 1차 저장소. Firestore 오프라인 캐시·실시간 리스너는 사용하지 않는다 (§6).
2. **로그인은 선택** — 동일.
3. **Firebase는 얇은 계층** — Authentication + Firestore + (필요 시) Cloud Function 1개. 콘텐츠는 계속 정적 번들.
4. **기존 자산 재사용** — `sync.js`의 push/pull·디바운스·LWW·충돌 모달 로직은 그대로, transport만 교체.
5. **보안은 Security Rules가 담당** — Firebase `apiKey`는 Supabase publishable key와 마찬가지로 **클라이언트 노출이 정상**인 식별자다. 행 접근은 Firestore Security Rules로 제한. 서비스 계정(Admin SDK) 키는 절대 번들하지 않는다.
6. **개인정보 분리** — 고객 카드·상담 이력 동기화 제외 동일 (SUPABASE_DESIGN §7).

---

## 2. Supabase → Firebase 대응 매핑

| Supabase (현행) | Firebase (본 설계) | 비고 |
|---|---|---|
| `vendor/supabase/supabase.js` (UMD, self-host) | `vendor/firebase/` ESM 번들 (app + auth + firestore-lite) | firebase-js-sdk는 ESM 전용 — 번들링 단계 필요 (§3.2) |
| `auth.users` + `supabase.auth` | Firebase Authentication | `src/firebase-client.js`의 lazy init으로 대체 |
| `signInWithPassword` | `signInWithEmailAndPassword` | 직접 대응 |
| `signUp` (확인 메일 자동 발송) | `createUserWithEmailAndPassword` + `sendEmailVerification` | ⚠️ 인증 메일이 자동 발송되지 않음 (§5) |
| `signInWithOtp` (링크+6자리 코드 동봉) | `sendSignInLinkToEmail` | ⚠️ **숫자 코드 없음 — 링크 전용** (§5.1, 최대 UX 차이) |
| `verifyOtp` (코드/token_hash) | `isSignInWithEmailLink` + `signInWithEmailLink` | 랜딩 URL에서 완료 |
| `updateUser({password})` | `updatePassword(currentUser, pw)` | 직접 대응 |
| — (OTP 메일로 비밀번호 재설정 대용) | `sendPasswordResetEmail` | 전용 재설정 플로우 — 오히려 개선 |
| `getSession` / `onAuthStateChange` | `auth.currentUser` / `onAuthStateChanged` | 세션은 IndexedDB에 기본 지속·자동 갱신 |
| `sync_snapshots` 테이블 + upsert | `users/{uid}/sync_snapshots/{examId}` 문서 + `setDoc` | 덮어쓰기 = upsert와 동일 의미론 (§4) |
| `profiles.plan` | `users/{uid}` 문서의 `plan` 필드 | 문서 없음 = free |
| `pro_codes` + `redeem_code` RPC | `pro_codes/{code}` + callable `redeemCode` | plan 갱신의 유일한 경로 (§7) |
| RLS 정책 | Firestore Security Rules | §4.1 |
| `feedback`·`client_errors`·`usage_events` (익명 insert) | 동일 이름의 create-only 컬렉션 | Rules에서 필드 화이트리스트·길이 검증 (§8) |
| Edge Function `feedback-notify` | `onDocumentCreated` 트리거 함수 | ⚠️ Functions 배포는 **Blaze 플랜 필수** (§8.1) |
| Secret(service_role) 키 — `tools/lib/supabase_ops.js` | 서비스 계정 JSON — `tools/lib/firebase_ops.js` | Admin SDK가 Rules를 우회 (§9) |
| `supabase start` 로컬 검증 | Firebase Emulator Suite | `firebase emulators:start` |

---

## 3. 아키텍처

```
[기존] localStorage (scopedKey <examId>:*)      ← 1차 저장소, 변경 없음
   ↕ src/sync.js (변경 최소)                     ← push/pull · 디바운스 · 충돌 처리
   ↕ src/firebase-client.js (신규)              ← vendored firebase lazy init · 세션 복원
[Firebase] Authentication + Firestore (users·sync_snapshots·feedback·client_errors·usage_events·pro_codes)
```

### 3.1 플랫폼 역할 분담 (Vercel vs Firebase)

| 영역 | Vercel | Firebase |
|---|---|---|
| 앱 호스팅·CDN·배포 | 동일 (정적 전용) | — |
| 서버 코드 | 없음 — 단, Blaze를 피하려면 Vercel serverless function으로 `redeemCode`·알림을 대행하는 선택지 (§7.1) | Cloud Functions (callable + Firestore 트리거) — **Blaze 플랜 필요** |
| 인증 | — | 이메일/PW·이메일 링크·Google OAuth (Kakao는 내장 없음 — 커스텀 토큰 필요) |
| DB | — | Firestore 문서 6개 컬렉션 경로 |
| 접근 제어 | — | Security Rules (`request.auth.uid == uid` 등) |
| 실시간 동기화 | — | 사용 안 함 — 스냅샷 push/pull만 (firestore/lite) |
| 오프라인 | PWA SW가 담당 | 미연결 시 앱 정상 동작 (localStorage 1차) |
| 비용 | 동일 | Spark 무료 티어 — 단 Functions는 Blaze 필수 (§11) |

### 3.2 배포·CSP·벤더링 제약

| 제약 | 현황 | Firebase 대응 |
|---|---|---|
| `connect-src 'self' https://*.supabase.co` | `vercel.json` | `connect-src`를 `https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com`으로 교체. Google OAuth 팝업 쓰면 `frame-src https://*.firebaseapp.com`도 추가 |
| `script-src 'self'` | CDN 스크립트 불가 | firebase-js-sdk를 `vendor/firebase/`에 self-host. **npm 패키지가 ESM 전용**이므로 `sync:vendor`에 esbuild 번들링 단계(`--bundle --format=esm --splitting` 또는 단일 번들)를 추가하거나, 빌드 산출물을 vendor에 수동 등록 |
| Service Worker | 비오리진 network-only | `url.origin !== location.origin` 규약이 `*.googleapis.com`을 자동 커버 — sw.js 변경은 vendor 자산 등록뿐 |
| 번들 크기 | supabase-js ~100KB | auth + firestore/lite ≈ 120~160KB min — **firestore/lite 채택 필수**. 전체 firestore(리스너·오프라인 캐시 포함)는 2배 이상이라 기각 |
| `<iframe>` 기반 OAuth | 미사용 | `signInWithPopup`은 `*.firebaseapp.com` iframe을 띄움 — frame-src 추가 또는 `signInWithRedirect`로 회피 |

### 3.3 신규/변경 파일

| 파일 | 역할 |
|---|---|
| `vendor/firebase/` | firebase ESM 번들 (app·auth·firestore-lite — self-host) |
| `src/firebase-config.js` | apiKey·authDomain·projectId·appId + `isFirebaseConfigured()` — 공개 설계 (supabase-config.js 대응) |
| `src/firebase-client.js` | `getFirebaseAuth()`·`getFirestoreDb()` lazy init, `onAuthChange` (supabase-client.js 대응) |
| `src/sync.js` | `sb.from().upsert` → `setDoc`/`getDoc` 호출부만 교체 (§6) |
| `src/auth-view.js` | 인증 호출부 교체 + OTP 코드 UI 제거·이메일 링크 랜딩(`isSignInWithEmailLink`) 처리 (§5) |
| `src/feedback.js`·`error-telemetry.js`·`usage-telemetry.js` | `insert` → `addDoc`/`writeBatch` 호출부 교체 |
| `tools/lib/firebase_ops.js` | Admin SDK 공용 헬퍼 (supabase_ops.js 대응, §9) |
| `tools/firebase/firestore.rules` | Security Rules 정본 + `firebase.json` |
| `tools/firebase/functions/` | `redeemCode` callable + `feedback-notify` 트리거 (Blaze 채택 시) |
| `vercel.json` | connect-src 교체 |
| `sw.js` | vendor/firebase 자산 등록 |

> 선택지: `supabase-client.js`/`sync.js`를 교체하는 대신 `src/cloud-client.js` 파사드를 두고 provider를 config로 전환할 수도 있다. 다만 두 백엔드를 동시 지원할 실수요가 없으므로 **기본안은 교체(swap)**, 파사드는 기각 — 이중 추상화 비용만 남는다.

---

## 4. Firestore 데이터 모델 + Security Rules

```
users/{uid}                                   — profiles 대응
    plan: 'free'|'pro', proSince: timestamp, createdAt: timestamp
users/{uid}/sync_snapshots/{examId}           — sync_snapshots 대응
    payload: map (논리 키→값 문자열), updatedAt: string(ISO), deviceId: string
pro_codes/{code}                              — redeemed_by, redeemed_at, created_at
feedback/{autoId}·client_errors/{autoId}·usage_events/{autoId}
    — schema.sql의 check 제약을 Rules 필드 검증으로 이식
```

- `sync_snapshots`를 `users` **서브컬렉션**으로 두면 소유권 경계가 경로에 내재화되어 규칙이 단순하다. 최상위 `sync_snapshots/{uid}_{examId}` 합성키도 가능하나 서브컬렉션 권장.
- `profiles` 트리거(`handle_new_user`)는 Firebase에 직접 대응물이 없다 — 대신 **문서 부재 = free**로 간주하고, 최초 로그인 시 클라이언트가 `plan:'free'`로 생성하게 한다 (Rules가 `plan=='free'` 생성만 허용). `redeemCode`가 문서를 만들거나 덮어쓴다.
- `updatedAt`은 **클라이언트 ISO 문자열을 유지** — LWW 비교 로직(sync.js `remoteTs <= localTs`)이 문자열 비교에 의존. `serverTimestamp()`는 읽기 시점에 `Timestamp` 객체로 오므로 비교 필드로 쓰지 않고 필요 시 별도 감사 필드로 둔다.

### 4.1 Security Rules (`tools/firebase/firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // profiles 대응 — 본인 문서만 읽기. plan 갱신은 redeemCode(Admin SDK)만 가능
    match /users/{uid} {
      allow get, list: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.resource.data.plan == 'free';
      allow update, delete: if false;

      match /sync_snapshots/{examId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // pro_codes — 클라이언트 접근 전면 차단 (RPC 경유와 동일 의미론)
    match /pro_codes/{code} {
      allow read, write: if false;
    }

    // 익명 insert-only — feedback과 동일 패턴. 필드 화이트리스트 + 길이 검증
    match /feedback/{id} {
      allow create: if request.resource.data.keys().hasOnly(
            ['kind','rating','body','view','app_version','entry_src','exam_id',
             'user_agent','user_id','meta','created_at'])
          && request.resource.data.kind in ['praise','improve','bug','idea']
          && request.resource.data.body is string
          && request.resource.data.body.size() >= 4
          && request.resource.data.body.size() <= 2000;
      allow get, list, update, delete: if false;
    }
    match /client_errors/{id} {
      allow create: if request.resource.data.kind in ['error','unhandledrejection','session']
          && request.resource.data.message is string
          && request.resource.data.message.size() <= 500;
      allow get, list, update, delete: if false;
    }
    match /usage_events/{id} {
      allow create: if request.resource.data.event is string
          && request.resource.data.event.size() <= 60;
      allow get, list, update, delete: if false;
    }
  }
}
```

- Postgres `check` 제약이 Rules 표현식으로 이식된다 — 스키마 정본이 SQL에서 rules 파일로 이동.
- 익명 `create: if ...필드검증`은 Supabase의 `for insert to anon` 정책과 동일 의미론.
- 규칙 검증은 Firebase Emulator Suite에서 로컬 수행 (`supabase start` 대응).

---

## 5. 인증 플로우 차이 (★ 가장 큰 설계 변경점)

### 5.1 이메일 링크 = 링크 전용 — 숫자 코드가 없다

현행(Supabase)은 한 통의 메일에 **매직링크 + 6자리 OTP 코드가 동봉**되어, PWA처럼 리다이렉트가 다른 저장 공간에 세션을 만드는 환경에서도 "코드 입력"으로 앱 안에서 완결했다 (SUPABASE_DESIGN §A.7).

Firebase의 `sendSignInLinkToEmail`은 **링크만** 보낸다. 링크를 연 컨텍스트(브라우저)에서만 `signInWithEmailLink`로 세션이 성립하므로, **PWA 내부 완결 경로가 사라진다**. 대응 선택지:

| 선택지 | 내용 | 평가 |
|---|---|---|
| ① 비밀번호 경로를 PWA 수단으로 (권장) | PWA에서는 이메일+비밀번호 로그인. 계정 모달의 "비밀번호 설정" UI는 이미 존재 | 추가 인프라 없음. 링크 가입 계정은 여전히 비밀번호 설정 선행 필요 — 현행과 동일한 안내 |
| ② 커스텀 OTP | callable 함수가 6자리 코드 발급·보관 + 외부 SMTP로 발송 + 검증 후 `createCustomToken` → `signInWithCustomToken` | 현행 UX와 동일하나 SMTP 연동·코드 테이블·함수 2개 필요 — Blaze + 외부 메일 서비스 비용 |
| ③ App Links / Universal Links | 메일 링크가 설치된 PWA를 직접 연다 | TWA·assetlinks.json 설정 필요 — PWA 설치 경로(iOS 수동 설치 등)에서 불안정 |

**권장**: ① + 모달 문구 조정("PWA에서는 비밀번호 로그인을 이용하세요"). ②는 Pro 도입 후 마찰이 문제되면 검토.

### 5.2 그 외 차이

| 항목 | Supabase | Firebase |
|---|---|---|
| 회원가입 확인 메일 | `signUp` 시 자동 발송 | 자동 발송 없음 — `createUserWithEmailAndPassword` 후 `sendEmailVerification` 명시 호출. 미인증 상태로도 세션이 성립하므로 `user.emailVerified`로 UI 분기 |
| 비밀번호 재설정 | OTP 로그인으로 대용 | `sendPasswordResetEmail` 전용 플로우 — 재설정 링크 랜딩 → `confirmPasswordReset` |
| 이메일 열거 | 존재 여부가 오류로 노출 | **Email Enumeration Protection 기본 ON** — `signUp`에 기존 이메일을 넣어도 확인 메일만 재발송되고 구분 오류가 안 옴. ERR_MAP의 "이미 가입된 이메일" 분기는 `signInWithEmailAndPassword` 실패 메시지로 흡수 재설계 |
| OAuth | Google·Kakao 내장 프로바이더 | Google 내장. **Kakao 없음** — 카카오 로그인이 필요하면 커스텀 토큰 발급 함수 필요 |
| 세션 저장 | localStorage | IndexedDB 기본(`indexedDBLocalPersistence`). PWA 재시작 유지 동일 |
| 랜딩 처리 | `?token_hash=` 확인 → `verifyOtp` | `isSignInWithEmailLink(url)` → localStorage의 `emailForSignIn`(발송 시 저장) + `signInWithEmailLink`. 이메일이 없으면(다른 기기에서 링크 엶) 프롬프트 |

---

## 6. 동기화 전략 — 로직 동일, 호출부만 교체

`sync.js`의 디바운스·dirty flag·LWW·충돌 모달·백업 보존 로직은 provider 무관 — 아래 두 호출부만 바뀐다.

```js
// pushSync — upsert 대응 (setDoc은 문서 전체 덮어쓰기 = upsert와 동일)
await setDoc(doc(db, 'users', uid, 'sync_snapshots', getActiveExamId()), {
    payload: collectSyncPayload(),
    updatedAt: new Date().toISOString(),   // 문자열 유지 — LWW 비교 동일
    deviceId: getDeviceId(),
});

// pullSync — maybeSingle 대응
const snap = await getDoc(doc(db, 'users', uid, 'sync_snapshots', getActiveExamId()));
const data = snap.exists() ? snap.data() : null;
```

- Firestore 오프라인 지속·리스너(`onSnapshot`)는 사용하지 않는다 — localStorage가 1차라 이중 캐시는 상태 불일치만 낳는다. `firebase/firestore/lite` 사용이 전제.
- 다중 문항 insert(피드백 큐 플러시 등)는 `writeBatch`로 묶는다.
- 동기화 시점·충돌 정책·device_id·제외 키(`customer_*`)는 SUPABASE_DESIGN §4·§7 그대로.

---

## 7. Pro 연동 — callable `redeemCode`

```js
// tools/firebase/functions/index.js (Node, firebase-functions v2)
const { onCall, HttpsError } = require('firebase-functions/v2/https');
exports.redeemCode = onCall(async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'login required');
    const code = String(req.data?.code || '');
    const ref = db.collection('pro_codes').doc(code);
    const snap = await ref.get();
    if (!snap.exists || snap.data().redeemed_by) return { ok: false };
    await ref.update({ redeemed_by: req.auth.uid, redeemed_at: FieldValue.serverTimestamp() });
    await db.collection('users').doc(req.auth.uid)
        .set({ plan: 'pro', proSince: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
});
```

- 클라이언트: `httpsCallable(functions, 'redeemCode')({ code })` — `rpc('redeem_code')` 대응.
- `users/{uid}` update를 클라이언트에 허용하지 않으므로(§4.1) plan 갱신은 함수가 유일 경로 — `security definer` RPC와 동일한 우회 차단 구조.

### 7.1 서버 코드 위치 선택지

| 안 | 내용 | 조건 |
|---|---|---|
| A. Cloud Functions (기본) | callable + `onDocumentCreated` 알림을 같은 functions 디렉터리에 | **Blaze 플랜 필수** — Spark는 Functions 배포 불가. Blaze도 월 200만 호출·36만 GB-초 무료라 본 규모에서는 실비 0원 수준 |
| B. Vercel serverless + Admin SDK | `api/redeem.js` 같은 Vercel function이 Admin SDK로 `pro_codes` 검증·`users` 갱신. 알림은 Vercel cron + function | Firebase를 "인증+DB"로 한정, Spark 유지 가능. Admin SDK 자격 증명을 Vercel env로 관리 — 서버 코드가 두 플랫폼에 걸침 |

Firebase만으로 운영하려면 A, 비용 최소화/플랫폼 단순화는 B가 우세 — 미결 사항 (§13).

---

## 8. 피드백·텔레메트리

- `feedback.js`·`error-telemetry.js`·`usage-telemetry.js`의 `sb.from(table).insert(rows)` → `addDoc`/`writeBatch`로 교체. 큐·상한·중복 억제 로직은 그대로.
- `session_id` 상관 키(bug 피드백 ↔ client_errors join) 구조 동일 — 조회는 §9의 Admin CLI가 수행.
- **8.1 알림**: `feedback-notify` Edge Function → `onDocumentCreated('feedback/{id}')` 트리거 → Discord webhook. Functions 배포에 Blaze 필요 (§7.1). Spark 유지 시 대안: `report:feedback` CLI 폴링에 알림을 붙이거나 GitHub Actions cron.

---

## 9. 운영 CLI — `tools/lib/firebase_ops.js`

- `supabase_ops.js`의 `SUPABASE_SECRET_KEY` + PostgREST 패턴 → **firebase-admin SDK + 서비스 계정 JSON**. env는 `GOOGLE_APPLICATION_CREDENTIALS`(파일 경로) 또는 `FIREBASE_SERVICE_ACCOUNT`(JSON 문자열). Admin SDK는 Security Rules를 우회 — service_role과 동일한 취급 (파일·인자·커밋 금지).
- PostgREST 쿼리스트링(`select=...&order=...`) → Firestore 쿼리(`collection().orderBy().where()`)로 이식: `report:errors`·`report:funnel`·`report:feedback`·`report:user`·`admin:grant-pro`.
- firebase-admin은 무거운 의존성 — tools 전용 `devDependencies`에 고정 버전으로 추가. 설치를 피하려면 REST(`firestore.googleapis.com`) + OAuth2 토큰 발급을 직접 구현하는 경로도 있으나 복잡도가 높아 기각 권장.

---

## 10. 배포·환경 체크리스트

- `vercel.json`: `connect-src`에서 `https://*.supabase.co` 제거 → googleapis 4종 추가 (§3.2)
- `sw.js`: `vendor/firebase/*` 자산 등록 (비오리진 network-only는 자동 커버)
- `vendor-manifest.json`: firebase 번들 항목 + 해시 (번들링 단계 도입 시 `sync:vendor` 파이프라인 확장 — VENDOR_MANAGEMENT_DESIGN에 절차 추가)
- Firebase 콘솔: Authentication → Settings → **Authorized domains**에 `passory.vercel.app` 추가 — 이메일 링크 `actionCodeSettings.url`이 이 도메인을 가리켜야 함 (Supabase Site URL 대응)
- `src/firebase-config.js`: `apiKey`·`authDomain`·`projectId`·`appId` — 공개 정보, `isFirebaseConfigured()`로 자리표시자 감지
- 도메인맵: 신규 `src/firebase-*.js`·`tools/firebase/`를 `domain-map.json`에 등록 (`check:domainmap`)

---

## 11. 단계별 로드맵

| Phase | 내용 | 검증 |
|---|---|---|
| 1 | Firebase 프로젝트(asia-northeast3 Seoul) + Auth(email) + Rules 배포 → `firebase-client` + 로그인 모달 이식 | 로그인·로그아웃·세션 복원 DOM 테스트 (firebase 모듈 vi.mock) |
| 2 | `sync.js` 호출부 교체 + Firestore 스냅샷 push/pull | 동기화·충돌·오프라인 시나리오 기존 DOM 테스트 재통과 |
| 3 | `users.plan` + `redeemCode` callable (또는 Vercel function) + Pro 게이팅 | 코드 활성화·한도 분기 |
| 4 (선택) | 커스텀 OTP(§5.1 ②)·Kakao 커스텀 토큰·고객 동기화(동의+암호화) | 별도 설계 |

---

## 12. 테스트 전략

- firebase 모듈은 `vi.mock('firebase/auth')` 등으로 교체 — 현행 `common-auth.dom.test.js`의 authStub 패턴을 Firebase 시그니처로 이식 (signInWithEmailAndPassword·sendSignInLinkToEmail·isSignInWithEmailLink·signInWithEmailLink·onAuthStateChanged)
- Security Rules는 Firebase Emulator Suite(`firebase emulators:start --only firestore`)에서 `@firebase/rules-unit-testing`으로 검증 — `supabase start` 대응
- `check:imports`·`verify:assets`·`check:vendor`에 vendor/firebase 반영

---

## 13. 미결 사항 (착수 전 결정 필요)

1. **PWA 로그인 경로** — 비밀번호만(권장) / 커스텀 OTP 함수 병행
2. **서버 코드 위치** — Cloud Functions(Blaze 전환) / Vercel function + Spark 유지
3. **기존 Supabase 사용자 이관 여부** — §14
4. **OAuth 범위** — Google만 / Kakao 커스텀 토큰 추가
5. **교체 vs 병존** — 기본 교체(권장) / `cloud-client.js` 파사드로 provider 전환 가능 구조
6. **Firebase 프로젝트** — 신규 생성 / 기존 GCP 프로젝트 재사용

---

## 14. 데이터 이관 (기존 Supabase 배포판에서 전환 시)

- **계정**: Supabase auth.users는 bcrypt 해시 — `firebase auth:import`가 bcrypt를 지원하나 해시 파라미터를 Supabase에서 추출할 수 없어 **비밀번호 이관 불가**. 현실적 절차: 이메일 목록 이관 + 전원 비밀번호 재설정 유도, 또는 신규 시작.
- **스냅샷**: `sync_snapshots` 행 → `users/{uid}/sync_snapshots/{examId}` 문서 일회성 변환 스크립트 (payload jsonb → map은 무손실).
- **profiles.plan** → `users/{uid}` 필드.
- 병존 운영을 원하면 기간 한정으로 두 client 모듈을 둘 수 있으나, 학습 앱 규모에서는 컷오버가 단순하다.

---

## 15. 리스크

| 리스크 | 완화 |
|---|---|
| **이메일 OTP 코드 소멸로 PWA 로그인 경로 축소** | §5.1 ① 비밀번호 경로 + 안내 문구. 커스텀 OTP는 후속 과제로 보존 |
| Functions 배포에 Blaze 플랜 필요 (Spark 불가) | §7.1-B Vercel function 대안 — Firebase는 인증+DB로 한정 |
| 번들 크기 증가 (~100KB → ~160KB) | firestore/lite + 필요 API만 re-export한 커스텀 번들. lazy init이라 초기 로드 무영향 |
| vendored 번들 갱신 파이프라인 부재 (ESM 번들링 필요) | `sync:vendor`에 esbuild 단계 추가 + `check:vendor` 게이트 그대로 적용 |
| Spark 쓰기 한도 20k/일 | 스냅샷 upsert는 2.5s 디바운스 배치 — 사용자당 일 수십 건. 한도 근접 시 Blaze로 자동 전환되나 과금 상한 설정 필수 |
| vercel.app 도메인의 이메일 링크 신뢰도 | Authorized domains 등록 + 커스텀 도메인 도입 시 함께 갱신 |
| 서비스 계정 키 유출 | env 전용 전달 + `check:secrets` 패턴에 `serviceAccount`/`private_key` JSON 추가 검토 |

---

## 부록 A. Firebase 프로젝트 생성 절차

### A.1 프로젝트 생성

1. <https://console.firebase.google.com> → **프로젝트 추가** → 이름 `passmula` (임의)
2. Google Analytics 연동 — 텔레메트리를 자체 수집하므로 **끄기** 권장 (켜도 무방)
3. 프로젝트 생성 후: 빌드 → **Authentication** → Sign-in method → **Email/Password** + **Email link (passwordless)** 활성화
4. 빌드 → **Firestore Database** → 데이터베이스 만들기 → 리전 **`asia-northeast3` (Seoul)** → 프로덕션 모드
5. 프로젝트 설정 → 내 앱 → **웹 앱 등록** (`</>`) → `apiKey`·`authDomain`·`projectId`·`appId` 4종 발급 → `src/firebase-config.js`에 반영

### A.2 대시보드 값 — 노출 가능 여부

| 항목 | 필요? | 용도 |
|---|---|---|
| apiKey·authDomain·projectId·appId | ✅ 앱 연동 | 클라이언트 노출이 정상 — Firebase 공식 문서상 API key는 "식별자"이며 보안은 Security Rules가 담당 |
| 웹 API 키(GCP 콘솔) | 선택 | apiKey와 동일 객체 — 애플리케이션 제한(HTTP referrer) 설정으로 악용 완화 가능 |
| 서비스 계정 JSON | ⚠️ 관리자용 | Admin SDK 자격 — `tools/` env 전용. 저장소 포함 금지 (service_role과 동급) |

### A.3 생성 후 작업 순서

1. **Authentication → Settings → Authorized domains**에 `passory.vercel.app`(프로덕션) 추가 — `localhost`는 기본 포함
2. **Firestore → Rules**에 `tools/firebase/firestore.rules` 내용 배포 (또는 `firebase deploy --only firestore:rules`)
3. Functions 채택 시: 프로젝트를 **Blaze로 업그레이드** → `firebase deploy --only functions` → 예산 알림·사용량 상한 설정
4. 앱에서 가입·로그인 → 진도 변경 → Firestore 콘솔 `users/{uid}/sync_snapshots`에 문서 생성 확인
