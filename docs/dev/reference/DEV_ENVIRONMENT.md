# 🛠️ 개발환경 요구사양 (Development Environment Requirements)

> **대상 프로젝트**: Passmula (Cosmetic Pass Master) — 맞춤형화장품 조제관리사 스마트 학습 + Formula OS 실무 플랫폼
> **목적**: 이 저장소를 clone해 개발·빌드·테스트·배포까지 수행하는 데 필요한 도구·버전·설정을 한 문서에 명세
> **관련 문서**: [MULTI_MACHINE_SETUP.md](../runbooks/MULTI_MACHINE_SETUP.md) (인증·배포 계정 설정), [DEPLOYMENT_GUIDE.md](../runbooks/DEPLOYMENT_GUIDE.md) (배포 절차), `AGENTS.md` (작업 규칙·명령어)
> **문서 ID**: DOC-REF-02
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (개발환경 요구사양 — 인프라)

---

## 1. 지원 플랫폼

| 환경 | 지원 여부 | 비고 |
|------|-----------|------|
| **Windows 10/11 + PowerShell** | ✅ 주 개발환경 | `npm`/`npx`가 실행 정책으로 차단되므로 **`npm.cmd`/`npx.cmd`** 사용. `&&` 연결자 불가 → `;` 사용 |
| **macOS / Linux** | ✅ | bash/zsh에서 일반 `npm` 사용 |
| **GitHub Actions (ubuntu-latest)** | ✅ CI | Node 24로 unit/DOM 테스트·자산 검증 실행 (`.github/workflows/ci.yml`) |

---

## 2. 필수 도구

| 도구 | 최소 버전 | 확인 명령 | 용도 |
|------|-----------|-----------|------|
| **Node.js** | 24+ (`.nvmrc`·`engines` = 24 계열) | `node --version` | 앱·빌드·테스트 런타임 전체 — CI는 Node 24 고정이므로 버전 관리자(nvm/fnm) 사용 시 `.nvmrc`가 24로 정렬. `jsdom@30`(vitest DOM 테스트)이 Node `^22.22.2 || ^24.15.0`를 요구하므로 20 계열에서는 `webidl.util.markAsUncloneable` 오류로 DOM 테스트가 기동 불가 |
| **npm** | Node 동반 | `npm --version` | devDependencies 설치 (`npm install`) |
| **Git** | 최신 | `git --version` | 소스 관리 — `deploy` 가드가 clean tree + origin/main 동기화 요구 |

> **외부 런타임 의존성 없음**: 앱 자체는 빌드 도구(Webpack/Vite) 없이 ES Modules 그대로 동작합니다. `npm install`은 테스트 도구(vitest·jsdom·커버리지)만 설치합니다.

## 3. 선택 도구 (기능별로만 필요)

| 도구 | 버전 | 필요한 작업 |
|------|------|-------------|
| **Python 3** | 3.10+ (3.12 확인 — `.python-version` 핀) | `ref-pipeline/` 콘텐츠 변환 — `convert:refs`, `verify:refs`, `check_laws.py`, MD→HTML. **venv 격리 권장** (§4 참조) |
| pip 패키지 | `pdfplumber>=0.11`, `PyMuPDF>=1.24`, `markdown>=3.5` | `pip install -r ref-pipeline/requirements.txt` — PDF→MD·MD→HTML 필수 |
| pip 패키지 (오디오북) | `gtts`, `pyttsx3`, `pydub`, `elevenlabs` | `pip install -r ref-pipeline/audiobook/requirements.txt` — MP3 TTS 생성 시에만 |
| pip 패키지 (임베딩 참조) | `sentence-transformers` | `ref-pipeline/embeddings/requirements.txt` — **참조 구현 전용** (운영 경로는 Node `build:embeddings`). Python 수치 대조 시에만 |
| **ffmpeg** | 최신 | 오디오북 MP3 병합 (`winget install ffmpeg`) — 선택 |
| **PySide6** | ≥6.6 | ref-pipeline GUI 사용 시에만 (`python ref-pipeline/pdf2md.py` — 기본 모드) |
| **Vercel CLI** | 최신 | 프로덕션 배포 — `npm run deploy`가 내부 호출 (전역 설치 `npm i -g vercel` 또는 npx) |
| **GitHub CLI (`gh`)** | 최신 | 새 머신 인증 간소화 (SSH 키 대체) — [MULTI_MACHINE_SETUP](../runbooks/MULTI_MACHINE_SETUP.md) |
| **Supabase 계정** | — | 계정·동기화·피드백 기능을 실제 서비스로 운영할 때만. 미설정이어도 앱 정상 동작 |
| **Deno** | 선택 | `tools/supabase/functions/` Edge Function 로컬 수정·테스트 시 |
| **Discord 서버·앱** | — | 운영 알림(AD-10)·조회 봇(AD-11) 사용 시 — 서버·채널·webhook·봇 생성 절차는 [DISCORD_ADMIN](../runbooks/DISCORD_ADMIN.md) 런북 |

---

## 4. 최초 설정 절차

```powershell
# 1. 클론
git clone <repo-url> && cd passok

# 2. 테스트 도구 설치
npm.cmd install

# 3. 생성물 빌드 — index.html·data/ 번들은 git 미추적이라 클론에 없음 (필수)
npm.cmd run build:html && npm.cmd run build:data && npm.cmd run build:drills && node tools/build/build_doc_bundles.js

# 4. 로컬 서버 — http://localhost:3000
npm.cmd run serve
```

> 서버 없이 `index.html`을 직접 열면 **동작하지 않습니다** — ES Modules는 `file://`에서 CORS로 차단됩니다. 반드시 `npm run serve`(또는 임의 정적 서버)로 접속하세요.

### (선택) Python 제작 경로 — venv 격리

`convert:refs`·오디오북 TTS 등 Python 도구가 필요할 때만 설치합니다. **글로벌 pip 대신 venv 권장** — 다른 프로젝트의 Python 환경과 충돌하지 않고 삭제가 깔끔합니다 (`.venv/`는 gitignore 처리됨):

```powershell
# 1. venv 생성·활성화 (최초 1회)
python -m venv .venv
.venv\Scripts\Activate.ps1    # POSIX는: source .venv/bin/activate

# 2. 필요한 그룹만 설치
pip install -r ref-pipeline/requirements.txt            # PDF→MD·MD→HTML
pip install -r ref-pipeline/audiobook/requirements.txt  # 오디오북 TTS 시에만

# 3. venv 활성화 상태에서 doctor 실행 — pip 그룹이 venv 기준으로 진단됨
npm.cmd run doctor
```

버전 관리자(pyenv·uv) 사용 시 `.python-version`(3.12)이 자동 정렬됩니다.

> `serve.js`는 `vercel.json`의 프로덕션 헤더(CSP·캐시 정책)를 응답에 미러링합니다 — CSP 변경 등 헤더 수정은 로컬과 `test:e2e`에서 배포 환경과 동일하게 검증됩니다.

## 5. 검증 명령어 (환경 정상 여부 확인)

```powershell
npm.cmd run doctor            # 환경 진단 — 필수(Node≥24·git·node_modules) vs 선택 도구 가용성을 명령 단위로 리포트 (신규 머신·이상 징후 시 첫 명령, --json 지원)
npm.cmd test                  # 유닛 테스트 (node --test) — Node만으로 실행
npm.cmd run test:dom          # DOM 테스트 (Vitest + jsdom) — npm install 필요
npm.cmd run test:all          # unit + parser + dom 일괄
npm.cmd run test:e2e          # E2E 테스트 (Playwright — 최초 1회 `npx playwright install chromium` 필요)
npm.cmd run check:imports     # ES 모듈 import/export 교차 검증
npm.cmd run verify:assets     # sw.js SHELL_ASSETS/DATA_ASSETS 파일 존재 검증
npm.cmd run check:docs        # 문서 내 경로 참조 유효성 + 문서 ID 누락·중복 검증
npm.cmd run check:docsync     # 소스 변경 시 문서 갱신 강제 (우회: [no-docs] 메시지·SKIP_DOCSYNC=1)
npm.cmd run check:testfirst   # 로직(src/·ref-pipeline/) 변경 시 테스트 동반 강제 — Docs-First (주석·공백 전용 diff는 자동 면제, 우회: [no-test] 메시지·SKIP_TESTFIRST=1 — 우회는 gate_bypasses.jsonl 누적)
npm.cmd run check:specrefs    # SPEC ID ↔ 코드 @spec 태그 양방향 검증 + 테스트 갭 기준선
npm.cmd run check:trace       # TRACE_MATRIX 신선도 (입력 해시 — 스테일 시 실패)
npm.cmd run lint              # ESLint — 0 problems 필수 (--max-warnings 0, 경고도 차단)
npm.cmd run check:types       # tsc --noEmit — jsconfig checkJs JSDoc 타입 진단 (src 전체 검사)
npm.cmd run coverage          # DOM 테스트 + 커버리지 임계값 (lines 60/stmts 57/funcs 55/branches 45)
npm.cmd run check:content     # 콘텐츠 통합 검증 (대규모 콘텐츠 변경 후)
```

CI(`.github/workflows/ci.yml`)가 push/PR마다 `npm ci` → `npm audit`(high+) → `lint`·`check:types`·`check:imports`·`check:docs`·`check_doc_sync`(문서 동기화 게이트)·`check:specrefs`·`check:trace` → **생성 번들 빌드**(`build:html`+`build:data`+`build:drills`+`build_doc_bundles.js` — index.html·`data/exams.js`·`data/exams/*/` 번들·registry·question_chapters·notice_diff 등 생성물은 .gitignore 대상이라 클론에 없음. embeddings/·id_migration·스냅샷류·release-notes.js·version.js·manifest.*만 추적) → `check_content.js --content-only --quick`(교재/문제은행 콘텐츠 추적 게이트: manifest·인용 라인·참조라인·신선도·드릴·ID 이관·카드) → `test`·`coverage`·`coverage:unit`·병합 임계값(`coverage_merge.js --check`)·`verify:assets`·`check:parser` → Playwright 설치 + `test:e2e`를 Node 24로 실행합니다. PR에는 영향 요구사항 리포트(`tools/check/impact_tests.js --ref origin/main`)가 추가됩니다.

**선택적 Git 훅**: `npm.cmd run hooks:install`로 `.githooks/` 활성화 — `pre-commit`은 `check:types`+`lint`+문서 동기화 게이트(`check_doc_sync.js --staged`: 소스 스테이징 시 문서 동반 스테이징 강제, `--no-verify` 우회), `pre-push`는 `check:trace`·`check:specrefs`·`check:docs`·문서 동기화(`--ref origin/main`) 추가 (`SKIP_PREPUSH=1 git push` 우회).

**IDE 버전 차이 대응**: PC·IDE마다 번들된 TypeScript 버전이 달라 같은 코드에 다른 진단이 뜰 수 있습니다. 프로젝트는 `typescript@5.9.3`을 devDependency로 고정하고 `.vscode/settings.json`의 `typescript.tsdk`로 VS Code 계열(VS Code·Windsurf·Cursor)이 워크스페이스 TS를 쓰게 지정했습니다 — **IDE에 보이는 오류 = `check:types` 결과**가 모든 PC에서 일치합니다. WebStorm 등 다른 IDE는 설정에서 `node_modules/typescript`를 TS 서비스로 지정하면 동일해집니다. 실제 차단(훅·CI·deploy 가드)은 항상 워크스페이스 tsc 기준이라 IDE 종류와 무관하게 동작합니다.

## 6. 빌드 명령어

| 명령 | 용도 | 사전 요구 |
|------|------|-----------|
| `npm run build:derived` | 파생 생성물 일괄 재생성 (html·data·drills·docs_md·trace·stats) | Node만 — **임베딩 미포함** |
| `npm run build:derived:full` | 위 + 임베딩까지 전체 재생성 | Node만 — 최초 1회 ONNX 모델 ~470MB 다운로드(HuggingFace) |
| `npm run build:embeddings` | 문장 임베딩 사전 계산 → `embeddings/` 번들 (stale 시 `check:embfresh`가 감지) | Node만 — `@huggingface/transformers` + ONNX fp32 (파리티 검증: Python 산출물과 int8 벡터 완전 일치) |
| `npm run build:data` | `content/` → `data/` 전체 번들 재생성 | Node만 |
| `node tools/build/build_doc_bundles.js` | 사용자 매뉴얼·학습안내서 앱 내 번들 | Node만 |
| `npm run convert:refs` | 참조자료 PDF → ref_md_v2 스테이징 | **Python + pdfplumber** |
| `npm run build:drills` | O/X·복수정답형 드릴 번들 | Node만 |

멀티시험 대상 지정: `EXAM_ID`/`EXAM_CONTENT_ROOT`/`EXAM_DATA_ROOT` 환경변수 (기본 `cosmetic`).

## 7. 배포 환경

```powershell
npm.cmd run deploy   # 배포 가드(clean tree + origin/main 동기화) → sw 스탬프 → vercel --prod
```

- **Vercel CLI** 필요 — `.vercel/project.json`이 Git 추적되므로 토큰만 있으면 비대화형 배포 가능
- `vercel --prod` 직접 실행 금지 — `deploy.js` 가드 경유 필수
- 계정·토큰 설정은 [MULTI_MACHINE_SETUP.md](../runbooks/MULTI_MACHINE_SETUP.md) 참조

## 8. IDE 권장 설정

| 항목 | 내용 |
|------|------|
| **VSCode** | `jsconfig.json` — `checkJs` + 경로 매핑으로 IntelliSense 제공 (저장소에 포함) |
| **Deno 확장** | `tools/supabase/functions/` 편집 시 — `deno.d.ts`로 `Deno` 전역 타입 해석 (jsr: specifier 미사용) |
| **라인 엔딩** | 생성 번들(`data/`)은 LF 정규화 — CRLF 변환 경고는 무시 가능 |

## 9. 선택적 백엔드 (Supabase)

앱은 Supabase 없이 완전히 동작합니다. 계정·동기화·피드백을 실제로 운영하려면:

1. Supabase 프로젝트 생성 → `tools/supabase/schema.sql`을 SQL Editor에서 실행
2. `src/auth-sync/supabase-config.js`에 프로젝트 URL·Publishable key 입력 (공개 설계상 키 — RLS로 보호)
3. 피드백 알림 원하면 `feedback-notify` Edge Function 배포 + webhook secret 설정 ([USER_FEEDBACK_DESIGN.md](../design/USER_FEEDBACK_DESIGN.md))

## 10. 요약 체크리스트

```
[ ] npm run doctor — 필수 ✅·선택 도구 가용성 한눈에 확인 (아래 항목의 자동 검증)
[ ] Node.js 24+ — node --version
[ ] npm install 완료 — node_modules/ 존재
[ ] npm run serve → http://localhost:3000 접속 확인
[ ] npm test + npm run test:dom 통과
[ ] (콘텐츠 변환 시) Python + venv(§4) + ref-pipeline/requirements.txt
[ ] (배포 시) Vercel CLI + 토큰
```
