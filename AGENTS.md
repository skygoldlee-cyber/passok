# AGENTS.md — AI 에이전트 프로젝트 가이드라인

> 이 파일은 Devin, Claude Code, Cursor 등 AI 코딩 에이전트가 프로젝트에 진입했을 때 참조하는 가이드라인입니다.
> **문서 ID**: DOC-ROOT-02
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (작업 가이드 — ID 인용 규약은 별도 절)

## 프로젝트 개요

**Passory** — 멀티시험 자격시험 학습 플랫폼. 시험은 콘텐츠 팩(`content/exams/<id>/` + `exams.json` 엔트리)으로 온보딩되며, 기본 팩은 맞춤형화장품 조제관리사(`cosmetic`, 앱명 Passmula + Formula OS 실무 배합). 시험 전용 실행 모듈은 `src/exams/<id>/`에 격리된다 (SPEC DA-13).

- 순수 HTML/CSS/JavaScript (Vanilla ES Modules, 프레임워크 없음)
- PWA (Service Worker 오프라인 캐시, 설치 가능)
- Vercel 정적 배포 + **선택적 Supabase** (로그인 사용자 클라우드 동기화 — 미설정 시 앱 정상 동작)
- 사용자 진행 상황은 localStorage가 1차 저장소 (계정 없이 전 기능 사용 가능)

## 핵심 명령어

> **주의**: Windows PowerShell 환경. `npm`/`npx` 스크립트가 실행 정책으로 차단되므로 `npm.cmd`/`npx.cmd` 사용.
> **환경 요구사양**(Node/Python 버전, 선택 도구, 최초 설정 절차)은 `docs/dev/reference/DEV_ENVIRONMENT.md` 참조.

```powershell
# 테스트
npm.cmd test                          # 유닛 테스트 (node --test)
npm.cmd run test:dom                  # DOM 테스트 (Vitest + jsdom)
npm.cmd run test:e2e                   # E2E 테스트 (Playwright 실브라우저 — 부트스트랩·SW·PWA·네비게이션, serve.js 자동 기동)
npm.cmd run test:all                   # 전체 테스트 (unit + parser + dom)

# 빌드
npm.cmd run build:data                 # content/exams/<id>/*.md → data/exams/<id>/ 번들 생성 (모든 시험 순회)
node tools/build/build_doc_bundles.js        # content/exams/<id>/docs/*.md → {dataRoot}/docs_md/ 번들 (앱 내 문서 갱신 시 필수 — 매뉴얼·학습안내서 모두 시험별 문서)
npm.cmd run build:html                # index.template.html + html/views/*.html → index.html 조립 (뷰 마크업 변경 시 필수)
npm.cmd run check:html                # index.html이 파셜 조립 결과와 일치하는지 비교 (개행 정규화 — pre-push·CI 게이트)
npm.cmd run check:parser               # 빌드 파서 ↔ 런타임 파서 등가성 검증
npm.cmd run check:imports              # src/ 내 ES 모듈 import/export 교차 검증
npm.cmd run check:posind               # 교재 좌표 비의존 게이트 — 위치 좌표(라인·인덱스)를 식별자/영속 키로 쓰는 패턴 차단 (ID-05, check:ci·CI·pre-push 게이트) + 계층 방향 규칙 (코어→views/ 역참조 차단, 셸 명단 SHELL_MODULES)
npm.cmd run check:contentind           # 로직 콘텐츠 독립 게이트 — 플랫폼·도구 코드의 시험 id·과목 키·시험 경로 리터럴 하드코딩 차단 (DA-15, check:ci·CI·check:all 게이트)
npm.cmd run stamp:sw                   # sw.js CACHE_VERSION을 커밋 해시로 스탬프
npm.cmd run notes:draft                # 릴리스 노트 pending 초안 생성 (커밋 subject 기반 → data/release-notes.json 수동 편집 후 배포)
npm.cmd run verify:assets              # SHELL_ASSETS/DATA_ASSETS 파일 존재 검증
npm.cmd run check:vendor               # vendor/ 매니페스트(vendor-manifest.json) ↔ 파일 해시·버전 정합 (BP-13 — check:ci·CI·check:all 게이트, --update=해시 재스탬프, -- --latest=레지스트리 최신 비교)
npm.cmd run sync:vendor                # vendor npm 패키지 갱신 — sync:vendor -- <key>[@버전] (npm pack → syncMap 복사 → 매니페스트 스탬프, fonts 등 versionFree 수동 자산은 거부)
npm.cmd run build:embeddings           # 문장 임베딩 사전 계산 → {dataRoot}/embeddings/ 정적 번들 (Python3 + sentence-transformers, ref-pipeline/embeddings/requirements.txt — DOC-DSN-18, 의미 유사 진술·이웃 인덱스)

npm.cmd run build:story                 # 표준형 + story/*_서사.md 패치 → _이야기형.md 생성 (build:data에 포함, --check=일치 검증 + 서사 커버리지 리포트 — 0블록 패치는 오류, -- --scaffold <subjectKey>=신규 과목 패치 골격)
#   이야기형 패치 작성법(슬롯 마커·지시어 문법): docs/dev/runbooks/STORY_PATCH_GUIDE.md
# 콘텐츠 동기화 (build:data에 자동 통합됨)
npm.cmd run sync:citations              # 문제은행 인용 라인번호 동기화
node tools/sync/sync_citation_lines.js --check  # 변경사항 확인만 (수정 안 함)
node tools/sync/sync_textbook_files.js       # 교재/문제은행 파일 ↔ manifest·sw.js MD_ASSETS 구조 동기화 (--check=보고만, --rename <구> <신>=파일명 변경 전파)

# 로컬 서버 (vercel.json 헤더 미러링 — 프로덕션 CSP·캐시 정책 그대로 적용)
npm.cmd run serve                      # http://localhost:3000

# 배포
npm.cmd run deploy                     # 배포 가드(clean tree + origin/main 동기화 + 대상 커밋 CI success 확인) → sw/버전 스탬프(비커밋, 배포 후 원복) → vercel --prod → deploy/<버전> 태그 이력
# ※ 사용자가 "배포"라고 요청하면 이 명령 하나로 전체 단계 수행
# ※ `vercel --prod` 직접 실행 금지 — 미푸시 커밋/미커밋 변경이 프로덕션에 올라감

# 감사
npm.cmd run audit:cards                 # 카드 품질 자동 감사 (짧은 설명, 중복, 참조 링크 유효성)
npm.cmd run sbom                        # SPDX 형식 SBOM 생성 → sbom.spdx.json (CI 아티팩트, gitignore 대상)
npm.cmd run audit:combo                 # 복수정답형 품질 감사 (정답 유일성·중복 진술집합·모순쌍·위치편향·경로별 통계)
npm.cmd run audit:study                 # 학습 품질 감사 — 주간 배분·학습 진단 추천 규칙 정합 시나리오 검증 (SQ-01~04, --check=기준선 회귀, --update=기준선 갱신)
npm.cmd run check:adlint                # 광고 문구 사전 커버리지 감사 — 별표5 2항 호별 대표 표현·term 품질·자기 검출 (FO-68)

# AI 제작 지원 (초안만 생산 → tmp/ai_drafts/ → 사람 리뷰 후 content/ 편입 — AI_AUTHORING_DESIGN.md, AI-01~23)
#   키: AI_PROVIDER=openai|anthropic|gemini + AI_API_KEY (또는 공급자별 키) — .env 로컬 전용, --dry-run=무키 검증
npm.cmd run ai:explain                   # 해설 누락 문항 초안 (정답+인용 근거 컨텍스트)
npm.cmd run ai:draft                     # 교재 청크 → 문제 초안 (--subject <key> --lines A-B --type choice)
npm.cmd run ai:distractors               # 단답형 허용 정답 변형·오답 선지 보강 제안
npm.cmd run ai:dupcheck                  # 초안↔기존 문항 유사도 상한 검사 (--all=기존 상호 감사, --check=게이트)
npm.cmd run ai:statements                # 복수정답형 진술 반전 변형 + conceptId 재조합 후보
npm.cmd run ai:tag                       # 태그·난이도·conceptId 자동 제안
npm.cmd run ai:lint                      # 발문 품질 검수 (이중부정·길이불균형·답노출·인용부재, --check=게이트)
npm.cmd run ai:coverage                  # 인용 LNN ↔ 교재 커버리지 갭 리포트 (draft 투입 범위 근거)
npm.cmd run ai:stale                     # ref_md 변경 ↔ 인용 문항 재검증 대기 목록 (--ref <ref>, --llm=영향 판정)
npm.cmd run ai:apply                     # 리뷰된 해설 초안을 문제은행 정답 블록에 편입 (기본 미리보기, --write=반영)
npm.cmd run ai:stmtfb                    # combo 진술별 오답 피드백 초안 (기본 거짓 진술, --all=전체). --stats <백업JSON>=오판 통계로 대상 선정(오판수순, --min-wrong N). --apply [--write]=리뷰본을 피드백/stmt_explain.json 정본 편입 → build:drills가 진술 explain 병합
npm.cmd run ai:adoption                  # AI 배치 채택률 리포트 — ai_apply --write가 기록한 adoption_log.jsonl의 배치별·누적 채택률·리뷰수정률 (AI-23, 설계 §3.1 L1 승격 판단 데이터)

# 전체 점검 (단일 진입점 — tools/check/run.js 실행기 + steps.js 단계 레지스트리로 구동
#   비-serial 단계는 워커풀 병렬 실행(--jobs N, 기본 3 · serial 단계는 배치 사이 단독),
#   --ref <ref> 지정 시 diffScoped 단계만 ref..HEAD+미커밋 변경 파일 대상으로 축소)
npm.cmd run check:all                    # 저장소 전체 검증 일괄 실행 (run.js --preset all)
npm.cmd run check:all:quick              # DOM 테스트 생략 빠른 점검 (= run.js --preset all --quick)
npm.cmd run check:all:e2e                # 전체 점검 + E2E 실브라우저 (배포 전 완전 검증 — serve 자동 기동, 시간 소요)
npm.cmd run check:ci                     # CI 게이트 로컬 재현 (= run.js --preset ci — coverage·E2E·audit는 CI 전용). `-- --affected`는 유닛을 영향 테스트 권장 세트로 치환하는 빠른 로컬 재현
npm.cmd run check -- --preset <all|ci|content|docs> [--quick|--content-only|--build]  # 통합 실행기 직접 호출
npm.cmd run check -- --step <id>         # 단일 단계만 실행 (예: --step manifest, --list로 id 조회)

# 콘텐츠 통합 검증 (교재 교체 등 대규모 콘텐츠 변경 후)
npm.cmd run check:content               # 콘텐츠 통합 검증 (= run.js --preset content — 단계 선언은 tools/check/steps.js)
npm.cmd run check:content -- --build    # build:data 선실행 후 검증 (교재 교체 시 권장)
npm.cmd run check:content -- --quick    # DOM 테스트 생략
npm.cmd run check:content -- --content-only  # 콘텐츠 추적 단계만 (CI용 — 파서·임포트·테스트 등 별도 게이트 제외)
npm.cmd run check:manifest              # manifest 선언 ↔ 파일/과목 자산 정합성 + 미등록 .md 역방향 경고 + study 값 범위·wrongCauses autoPattern 정규식 검증 + 표시 수치 정합 (exams.json desc N과목/N문·exams[].title N제 ↔ 문제은행 ###Q 실측 — 교재 교체 시 stale 문구 차단)
npm.cmd run check:reflayout             # 참조자료 4계층 정합성 (PDF 폴더↔ref_md↔references.json↔규칙, 링크 해석)
npm.cmd run check:refsubjects           # ref_md 문서의 인용 득표↔과목 귀속 교차 검증
npm.cmd run check:reffresh              # 참조자료 PDF 해시 ↔ ref_md 신선도 (PDF 교체 감지)
npm.cmd run check:reflines              # 교재 (LNN)/📌출처 조문 ↔ ref_md 실제 내용 검증
npm.cmd run check:refs                  # 참조자료 검증 묶음 (= run.js --preset refs — layout·subjects·fresh·lines·merge)
npm.cmd run check:fresh                 # 생성물 신선도 묶음 (= run.js --preset freshness — html·trace·data·drill·ref·임베딩·문서번들·교재문서)
npm.cmd run check:numbering             # 교재 십진법 번호체계 — 구식 잔재·연속성·계층·헤더-본문 중복 게이트 (표준↔이야기 동기화 불일치는 경고)
npm.cmd run check:drillfresh            # 드릴 번들 ↔ 문제은행 번들 신선도 (stale 시 npm run build:drills)
npm.cmd run check:embfresh              # 임베딩 manifest.inputs(sha1) ↔ 원본 번들 신선도 (stale 시 npm run build:embeddings — SEM-05, features.semantic 시험만)
npm.cmd run check:answers               # 문제 정답 ↔ 인용 근거 구절 의미적 지지 (내장 인용문→인용 원문 2단계, 정답 미지지 기준선 게이트 — 신규 무근거 인용 차단)
npm.cmd run fix:quotes                  # 부실 인용문 자동 보강 — 원문이 정답을 지지하는데 내장 구절이 절단된 경우 인용 라인 이후로 확장·블록 내 지지 라인으로 교체 (--check=보고만)
npm.cmd run fix:citations               # 정답 미지지 문항 인용 위치 자동 교정 — 인용 파일→시험 코퍼스(교재→참조자료) 순으로 실제 지지 위치를 탐색해 링크·인용문 재지정 (--check=보고만, --annotate=미검증 인용에 ⚠️ 마커 표기·해제)
npm.cmd run check:docbundles           # docs_md 번들 ↔ 원본 문서 신선도 (check:content에 포함)
npm.cmd run check:textbookdocs         # 교재 갱신 ↔ `판본: textbook` 문서 신선도 — git 이력으로 교재 커밋 이후 미갱신 교재 종속 문서 게이트 (check:docs·check:content에 포함)
npm.cmd run check:metasections         # 메타 섹션 규약 기준선 — 교재 `##` 헤딩 중 메타 의심 제목이 reader-toc.js 패턴에 미매칭이면 신규 유입 차단 (TS-17, check:content 포함, --update=기준선 갱신)
npm.cmd run check:glossarysignal       # 용어집 저신호 감시 기준선 — 자동 추출된 2~4자 일반명사 키워드의 통합검색 정의 카드 노출 감시 (BP-14, check:content 포함, --update=검토 후 기준선 갱신)
npm.cmd run check:datafresh            # data/·생성물 ↔ 원본 신선도 — 빌드 체인 실행 후 git diff 비교·자동 원복 (생성물 경로가 clean이어야 실행 가능)
npm.cmd run check:docs                  # README·AGENTS·docs/*.md 내 경로 참조 존재 검증 + 문서 ID 누락·중복 검증 + 디렉토리 구조 정합 (check_inventory) + npm 명령 정합 (check_npm_commands) + 플랜 키 정합 (check_plan_features) + 도메인 기능 플래그 정합 (check_feature_flags) + 저장소 접근 탐지 (check_storage_access) + 릴리스 노트 정합 (check_release_notes) + CI 패리티 (check_ci_parity) + 런북 정본 도달 (check_runbook_links)
npm.cmd run check:inventory             # AGENTS.md 디렉토리 구조 트리 ↔ 실제 파일시스템 정합 (전 트리 존재성 + src/ 전수·css 목록 양방향 + N개 개수 표기) + ARCHITECTURE.md box 트리(├──/└──) 존재성
npm.cmd run check:commands              # 문서의 npm 명령 인용 ↔ package.json 스크립트 양방향 정합
npm.cmd run check:plan                  # feature-plan.json 키 ↔ 코드 사용(isProFeature·data-pro-feature·proFeatureNotice) ↔ 로드맵 문서 정합
npm.cmd run check:featflags             # exams.json features 키 ↔ 코드 사용(hasFeature·features.X·data-feature) 양방향 — 미선언 키 사용 = 영구 falsy 죽은 경로로 오류
npm.cmd run check:storage               # src/ 내 localStorage 직접 접근 탐지 — storage.js 추상화 우회 금지 (부트스크립트·인프라 모듈은 ALLOWED_FILES)
npm.cmd run check:ciparity              # ci.yml 워크플로 명령 ↔ check:ci 체인 양방향 정합 (비대칭은 CI_ONLY·LOCAL_ONLY 명단에 사유 명시)
npm.cmd run check:runbooks              # 런북 정본 도달 — docs/dev/runbooks 링크 파일 존재 + #앵커↔헤딩 해석 + WHEN_THINGS_BREAK 증상 행 정본 커버리지 출력 (check:docs 단계)
npm.cmd run check:secrets               # 추적 파일 시크릿 패턴 스캔 (개인키·service_role·토큰 — 공개키는 ALLOWLIST, pre-commit 게이트)
npm.cmd run check:env                   # .env 로컬 시크릿 신선도 — 만료 JWT·미선언·빈 키 탐지 (스키마 정본 .env.example, .env 부재 시 스킵 — 로컬 전용, check:ci·check:all 게이트)
npm.cmd run check:enc                   # U+FFFD 치환 문자 잔존 — 저장 시 이모지 변조 유입 차단 (기준선 단조 감소, --update=잔재 정리 후 하향 — pre-commit·check:docs 게이트)
npm.cmd run check:orphans               # 미참조 자산(고아 자산) 유입 차단 — 추적 자산 파일의 파일명이 다른 추적 파일에 등장하지 않으면 실패 (_archive/·e2e 스냅샷 규약 제외, 예외는 orphan_assets_baseline.json — pre-commit·check:docs 게이트)
npm.cmd run check:notes                 # release-notes.json 스키마·버전 해시→커밋 해석·최신 항목↔APP_VERSION 정합
npm.cmd run check:domainmap             # 파일 계층 분류 강제 — src/css/html/data/content/tests 전 파일이 domain-map.json에 선언 필수 (분류 규약: ARCHITECTURE.md "파일 계층 분류")
npm.cmd run check:uitext                # UI 텍스트 커버리지 — data-uitext↔manifest.uiText 양방향 + platform HTML 시험명 잔존 검사
npm.cmd run check:mobilesafe            # 모바일 잘림 규약 — role="dialog" 카드의 .dialog-card + 버튼 2+ 나열 행 줄바꿈 정적 검사 (check:ci·CI 게이트, UX-VFY-06)
npm.cmd run check:escape                # HTML 이스케이프 싱크 규약 — innerHTML/insertAdjacentHTML 직접 대입 템플릿의 미이스케이프 보간 탐지, 기준선 단조 감소 (check:ci·CI 게이트, ROAD-Q5 — 신규 코드는 sanitize.js의 html`` 태그드 템플릿 권장)
npm.cmd run check:uistyle               # UI 스타일 규약 — 마크업 인라인 style 속성 전면 금지 + JS .style.display 조작·인라인 on* 핸들러·네이티브 alert/confirm/prompt + JS 템플릿 정적 style= 기준선 래칫(display:none 즉시 금지·동적 --var:${x}만 허용) (check:ci·CI 게이트, CODE_CONVENTIONS §4, 명시 면제: 라인에 style-ok 토큰)
npm.cmd run check:seedkeys              # 테스트 시드 키 스코프 정합 — GLOBAL_KEYS 전환 키의 `examId:` 스코프 시드 차단 (시드 무력화 드리프트, check:docs 단계, 명시 면제: 라인에 seedkey-ok 토큰)
npm.cmd run check:teststats             # 문서 테스트 수치 ↔ test_stats.json 실측 정합 — README·TESTING의 고정 수치 스테일 차단 (check:docs 단계 — 정적 카운트 드리프트 ±12%·인용 밴드 0.80~1.05×, 갱신은 stats:stamp)
npm.cmd run stats:stamp                 # 테스트 수치 재스탬프 — unit 실행·vitest list·playwright --list 실측 → test_stats.json + 문서 인용을 `N+` 바닥 표기로 갱신
npm.cmd run ratchet:coverage            # 병합 커버리지 임계값 래칫 상향 — 실측−0.8%p로 MERGED_THRESHOLDS 인플레이스 갱신 (단조 증가, coverage:all 실행 후 사용)
npm.cmd run scaffold:exam -- <id> --name "시험명"  # 새 시험 스캐폴딩 — exams.json 등록 + manifest/references 골격 + 샘플 교재·문제은행·docs/ 생성 (--dry-run=미리보기, <id> --remove=제거)
npm.cmd run lint                        # ESLint — 에러 0 필수 (--cache 웜 캐시, 기존 경고는 점진 정리 대상)
npm.cmd run check:types                 # tsc --noEmit (jsconfig checkJs — JSDoc 타입 진단)
npm.cmd run check:specrefs              # SPEC↔@spec 스테일 참조 + 테스트 갭 기준선(기준선 0 — 신규 갭 즉시 실패)
npm.cmd run check:perf                  # 성능 예산 — sw.js SHELL_ASSETS 크기 계측 (총량·JS·단일파일·index.html 상한, check:ci/CI 게이트)
npm.cmd run mutate                      # 변이 테스트 (Stryker, 수동 스팟 체크 — 순수 핵심 모듈 스코프: questions·spaced-repetition·weak-items·statement-tracker)
npm.cmd run report:errors               # 오류율 리포트 — client_errors 조회 → 오류/세션·일별·상위 메시지 (SUPABASE_SECRET_KEY env 필요, 미설정 시 대시보드용 SQL 출력 · -- --days N · --session <uuid>=bug 신고의 meta.session_id로 해당 페이지 로드 오류+퍼널 이력 조회)
npm.cmd run report:funnel               # 과업 완주율 리포트 — usage_events 조회 → quiz/daily start→complete 완주율·이탈·평균 점수·소요 (동일 키 요건 · -- --days N)
npm.cmd run report:feedback             # 피드백 인박스 — feedback 테이블 kind별 건수·평점·일별·최근 본문 (동일 키 요건 · -- --days N · --kind bug · bug의 meta.session_id→report:errors --session 연결, AD-06)
npm.cmd run report:user                 # 사용자 조회 — npm run report:user -- <email>: GoTrue Admin API 해석 → plan·sync 메타(payload 미열람)·피드백 이력 (동일 키 요건, AD-06)
npm.cmd run admin:grant-pro             # Pro 부여/회수 — npm run admin:grant-pro -- <email> [--revoke]: 기본 dry-run, --apply로만 실갱신 (동일 키 요건, AD-06)
npm.cmd run report:dashboard            # 로컬 HTML 운영 대시보드 — 오류율·퍼널·피드백 조감을 단일 HTML로 생성 (동일 키 요건 · -- --days N · --out <path> · 산출물 gitignore, AD-07)
npm.cmd run report:glossary             # 용어 후보 추출 리포트 — 참조자료 ref_md + 교재 표준형의 정의 조항·약칭·영문 병기를 스캔해 용어설명집 대비 신규/기존 분류 (BP-14 · 도구 직접 실행 `--apply`=신규 정의→glossary subjectN.json, `--apply-synonyms`=약칭·영문→manifest.synonyms, `--patterns`로 범위 조정)
npm.cmd run check:docsync               # 소스 변경 시 문서 갱신 강제 — src/tools/tests/설정 변경에 docs/·AGENTS·README 갱신 동반 필수. 우회: SKIP_DOCSYNC=1 (모든 단계) · 커밋 메시지 행 끝의 [no-docs] (pre-push --ref 단계에서만 인식 — 마크된 커밋의 파일만 면제되며 다른 커밋은 계속 검사. pre-commit은 메시지 미존재로 불가)
npm.cmd run check:testfirst             # 로직(src/*.js·ref-pipeline/*.py) 변경 시 테스트(tests/·ref-pipeline/tests/) 동반 강제 — Docs-First 기계화. 우회: SKIP_TESTFIRST=1 · 커밋 메시지 행 끝 [no-test] (--ref 모드, 그 커밋만 면제)
npm.cmd run check:trace                 # TRACE_MATRIX 입력 해시 신선도
npm.cmd run check:lawurls               # law.go.kr 한글주소 유효성 전수 검증 (law-links.js 매핑 실호출, 오류 페이지 본문 판별)
npm.cmd run check:linklint              # 렌더 출력 링크 린트 — 콘텐츠 md를 표면별 렌더러(교재→reader-format, 문서·생성 번들→exam-viewer 경로) 통과 후 원시 경로 href·절단 URL·좌표/파일명 라벨·미승인 외부 링크·본문 경로 누출·QA 스탬프 잔존·위험 스킴 탐지 (check:content·check:ci 게이트, LL-01~08)
node tools/check/impact_tests.js              # 변경 파일 → 영향 요구사항·권장 테스트 (미커밋 변경 자동 분석, --ref <ref>로 diff 분석, --run으로 권장 테스트 실제 실행 — pre-push 게이트)
npm.cmd run hooks:install               # Git 훅 활성화 (opt-in) — pre-commit: check:types+lint (IDE 오류 시 커밋 차단) / pre-push: tools/check/push_gate.js 적응형 게이트 — 파일 경로 태그(STEP_NEEDS 표)로 필요 단계만 실행, 미분류 파일은 전체 폴백·전체 강제 PUSH_GATE_ALL=1 · 통과 결과 캐시(동일 입력 재실행 생략, --no-cache 우회)·병렬(4)·failFast·diff 스코프 단계는 --ref 대상 (우회 SKIP_PREPUSH=1)
npm.cmd run check:hooks                 # 훅 설치 여부 확인 (권고 — 미설치 시 로컬 게이트 우회됨, check:ci 첫 단계)

# 참조자료 PDF → ref_md 변환 (Python 3 + pdfplumber, 이미지 추출 시 pymupdf 필요)
npm.cmd run convert:refs                # 참조자료 PDF 전체 → ref_md_v2/ 스테이징 변환 (파일명 필터 인자 가능)
npm.cmd run verify:refs                 # ref_md_v2 vs ref_md 골든 비교 (내용 누락 시 exit 1)
npm.cmd run check:reffresh -- --update  # 승격 완료 후 PDF 해시 매니페스트(pdf_hashes.json) 스탬프
# ※ PDF 교체/재변환 절차: ① PDF 교체 ② convert:refs ③ verify:refs ④ ref_md_v2 → ref_md/과목N/{문서}/ 수동 승격 ⑤ check:reffresh -- --update
# ※ ref_md는 `#L####` 라인 인용이 의존하므로 항상 시각적 줄 그대로(segment=False) 변환 — 엔진의 --no-segment 상당

# 식약처 고시 감지 (참조 법령·고시 다문서 추적 — references.json referenceLaw에서 자동 유도)
python ref-pipeline/check_mfds_notice.py --update   # 키: LAW_OC_KEY — 루트 .env 또는 환경변수 (gitignore 대상)
# ※ 대상 시험 해석(--exam > EXAM_CONTENT_ROOT > EXAM_ID > exams.json default)은 _exam_root.py 공용.
#   baseline↔latest 비교를 notice_status.json docs[]에 기록 — 신규 고시 시 Actions 이슈 생성 +
#   check_law_urls.js 검증. currentUrl=현행본 시리얼 URL — 앱이 ↗원문 링크 보정+'⏳ 시행 예정 개정본'
#   배지 표시(markStaleRefLinks). 앱은 Formula OS 배너 + 허브 '식약처 고시 확인' 버튼으로 실시간 조회.
npm.cmd run build:noticediff           # ref_md 현행본 ↔ _archive 구본 조문 단위 diff → data/exams/<id>/notice_diff.json
#   (build:data 체인에 포함 — 신설·개정·삭제 조문을 개정 배너 + '고시 정보 보기' 패널에 표시)

# 개정 원문 자동 확보 — 감지 다음 단계 (check_mfds_notice의 신규 판정분을 대상으로)
python ref-pipeline/fetch_revision.py [--doc <이름>] [--apply]
#   고시(admrul): 전문 PDF 자동 다운로드 + .src.json 출처 병기. --apply: 구본 _archive 이동·references.json 치환
#   법령(target=law): DRF 파일 미제공 — 다운로드 페이지 URL·파일명·요지 안내만. 이후 승격 절차는 위와 동일
# ※ Actions 크론은 선택(Settings→Secrets LAW_OC_KEY) — 미등록 시 앱 내 실시간 버튼이 커버.
#   대조 절차: docs/exams/cosmetic/ingredients_audit_제2026-19호.md
```

## 디렉토리 구조

```
index.template.html     # App Shell 템플릿 — <!-- @include --> 마커로 뷰 파셜 조립
index.html              # App Shell (생성물 — npm run build:html 산출, 직접 편집 금지)
html/views/             # 뷰 마크업 파셜 12개 — 뷰 HTML 편집은 여기서, build:html로 재생성
html/exams/<id>/        # 시험 도메인 뷰 파셜 (지연 주입 — formula.html 등, data-lazy-view)
style.css               # CSS 진입점 (@import로 모듈 로드)
sw.js                   # Service Worker
manifest.webmanifest    # PWA 매니페스트
feature-plan.json       # 기능별 무료/Pro 전환 설정 (pro = 배지+안내, free = 완전 무료)
.env.example            # 루트 .env 스키마 정본 — 선언 키 목록·용도 (check:env 대조 기준, 시크릿 값 기재 금지)
serve.js                # 로컬 개발 서버
src/                    # ES Modules
  app.js                # 메인 애플리케이션 로직 (초기화, 이벤트 위임, 라우팅)
  app-dashboard.js      # 대시보드 셀렉트·시험/리소스 카드·스토리지 경고 (app.js 분리)
  app-shell.js          # 뷰포트·가로세로·data-click 접근성·시험 브랜딩(타이틀·로고·아이콘·앱명)·기능 플래그 (app.js 분리)
  app-fallback.js       # ESM 로드 실패 시 자동 복구 (모바일 PWA 대응)
  router.js             # 뷰 라우터 (navigateToView, getViewTitles, initViewHashRouting — #/슬러그 딥링크·뒤로가기)
  state.js              # 전역 상태 + 진행 영속성 (saveProgress — 저장은 storage.js 위임)
  storage.js            # 저장소 추상화 계층 — 백엔드 교체 가능(getItem/setItem 동기·Async 이중 API), 스코프·쓰기훅·쿼터 감지 중앙화
  ui-utils.js           # showToast, showConfirm, trapFocus + 훈련 공용 마크업(markChoiceButtons·wrongReviewHtml·trainerResultHtml·showAnswerFeedback)
  sanitize.js           # XSS 방어 (escapeHTML, safeTextWithBreaks, esc, stripTags)
  search-index.js       # 통합검색 인덱스 코어 순수 로직 (소스 레지스트리·시험 스코프 무효화·지연 소드 상태머신·어절 역색인·티어 랭킹 — TS-08~09,TS-13~18)
  search-sources.js     # 통합검색 콘텐츠 소스 프로바이더 (교재 섹션 수집·서사/참조/문제은행 로더·리더 이동 페이로드 해석 — TS-10~12,TS-18)
  search-morpheme.js    # 검색 형태소 경계 판정·동의어 확장 순수 로직 (어휘 마이닝·DP 커버·termHitQuality·expandSynonyms — TS-13/TS-14)
  data-loader.js        # 온디맨드 콘텐츠 로더 (DataLoader)
  scratchpad.js          # 스크래치패드 캔버스 (계산 연습용)
  trainer-calc.js       # 계산 트레이너 문제 생성기 (순수 로직, 전역 스코프 실행)
  fsrs.js               # FSRS-6 기억 모델 순수 함수 (DSR 상태 전이·간격 산출·SM-2 지연 변환)
  knowledge-tracing.js  # BKT 단원 숙달 추정 순수 함수 (관측 시퀀스 → P(L), D-22)
  spaced-repetition.js  # FSRS 간격 반복 저장 어댑터 (스케줄 수학은 fsrs.js 위임, 공용 API)
  study-aids.js         # 학습 보조 (기출·중요 마커 추출 카드, 숫자 암기표)
  study-tracker.js      # 학습 캘린더/목표 추적 헬퍼 (recordStudyActivity, getStudyGoals)
  statement-tracker.js  # 진술 원자(sid) 단위 오판 통계·졸업 추적 (FSRS 연동)
  semantic-index.js     # 의미 유사도 이웃 인덱스 조회 — 사전계산 임베딩 번들 지연 로드 (SEM-02~04, features.semantic)
  recommendations.js    # 합격 전략 추천 엔진 + 예상 점수 추정 + 실제 결과 보고 (순수 로직)
  analysis-engine.js    # 학습 진단 심층 분석 순수 로직 (AN-01~09 — 예측 점수·취약 단원·주간 리포트)
  command-palette.js    # 통합 검색 팔레트 (Ctrl+K) — 뷰/교재/카드/퀴즈/성분/문제집 검색·실행
  weak-items.js         # 약점(오답) 항목 ID 문법·해석 공용 모듈 (weak_quiz_/weak_sim_ 접두사, 퀴즈·카드 인덱스 캐시, DOM 비의존)
  questions.js          # 문항 스키마 (single/combo/short/ox), deriveComboAnswer, validateQuestion (샘플 문항은 tests/fixtures/sample-questions.js)
  exam-viewer.js        # 문제집/참조자료 MD 뷰어
  combo-doc.js          # 복수정답형 드릴 → 문제집 MD 런타임 직렬화 (과목N_복수정답형.md 산출물 대체)
  manual-viewer.js      # 학습안내서/매뉴얼 MD 뷰어
  doc-overlay.js        # MD 문서 오버레이 공용 베이스 — 세션 캐시·번들 주입·TOC·셸 수명주기 (exam/manual 뷰어 공용)
  modal-back.js         # 모달/오버레이 뒤로가기 닫기 — is-hidden 토글 감시 + 동일 URL 마커 pushState/popstate
  charts.js             # SVG 레이더/꺾은선 차트
  pdf-registry.js       # 참조자료 경로 매핑 (생성물 — 시험별 테이블, getRefTables())
  law-links.js          # 참조 문서 → law.go.kr 원문 링크 매퍼 (생성물 — content/lawdb.json + references.json lawRefs → build:pdf-registry)
  notice-check.js       # 식약처 고시 감시 — 다문서 배너·실시간 확인 버튼·상태 패널·참조 링크 현행본 보정
  glossary-query.js     # 용어집 인덱스 쿼리 API (getGlossaryIndex())
  html-viewer.js        # 외부 HTML 콘텐츠 뷰어
  reader-format.js      # 교재 본문 포맷터
  reader-toc.js         # 리더 목차 추출 순수 헬퍼 (메타 섹션 필터·계층 판정·하위 헤딩)
  textbook-core.js      # 교재 MD 파싱 공통 코어 (런타임·빌드 플러그인 공유)
  textbook-parser.js    # 교재 MD 파서 런타임 진입점 (textbook-core.js 어댑터)
  textbook-edition.js   # 교재 개정 감지 배너 — registry.textbookEdition vs textbook_edition_seen (P-14)
  markdown-parser.js    # 공통 MD 파서
  mermaid-utils.js       # Mermaid 다이어그램 설정
  mermaid-render.js      # Mermaid 지연 로딩 + 컨테이너 렌더링 + 다이어그램 확대 모달 (reader/search/manual 공용, 모바일은 모달 내 핀치 제스처 — TR-26)
  image-zoom.js          # 교재 본문 이미지(.reader-img) 라이트박스 확대 모달 — 모바일도 바인딩, 모달 내 핀치 제스처 (TR-26)
  zoom-gestures.js       # 줌 모달 공용 핀치·패닝·더블탭 제스처 (Pointer Events, touch-action:none 표면, 이미지·머메이드 모달 공용 — TR-26)
  pwa-manifest.js        # 시험별 동적 PWA 매니페스트 (클래식 스크립트 — 빌드 산출물 manifest.<id>.webmanifest 실제 파일로 링크 교체 + 문서 제목·설명·apple-mobile-web-app-title 갱신, blob: 금지)
  keyword-index.js      # 교재 셀→참조자료 키워드 매핑 (시험별 — 자동 생성)
  web-vitals.js         # Core Web Vitals 모니터링
  sha256.js             # 안정적 ID 해시
  utils.js              # 공통 유틸리티 (shuffle·todayKey/localDateKey·getChosung·escapeRegExp·debounce·fmtClock/fmtMMSS)
  types.js              # 중앙 JSDoc 타입 정의 모듈 (@spec none)
  storage-keys.js       # localStorage 키 중앙 관리
  paths.js              # 파일 경로 상수 중앙 관리 (시험 루트 인지형)
  error-telemetry.js    # 런타임 오류 텔레메트리 — error/unhandledrejection 수집 + 세션 핑(kind=session, 오류율 분모) → client_errors 익명 insert (미설정 시 no-op, 오류 세션 상한·중복 억제)
  usage-telemetry.js    # 과업 퍼널 텔레메트리 — quiz/daily start↔complete 이벤트 → usage_events 익명 insert (세션당 랜덤 UUID 쌍 묶기·이벤트 상한, 미설정 시 no-op)
  telemetry-session.js  # 텔레메트리 공유 세션 ID — 페이지 로드당 랜덤 UUID 1개를 client_errors·usage_events·bug 피드백(meta.session_id)이 공유하는 join 키 (사용자 식별 아님)
  exam-context.js       # 활성 시험 해석/전환, scopedKey 네임스페이스, hasFeature, getExamAppName(시험별 앱 이름 — exams.json appName)
  exam-data-boot.js     # 활성 시험 데이터 번들 부트 (클래식) — 파싱 중 {dataRoot}/registry.js·id_migration.js 동기 삽입, 비활성 시험 번들 미로드
  csv-utils.js          # CSV 파서·EUC-KR 폴백 디코딩·BOM 직렬화 (사전 내보내기 등 공용)
  pwa-install.js        # PWA 설치 프롬프트 설정
  pwa-install-capture.js # beforeinstallprompt 조기 캡처 + SW 조기 등록 (<head> 즉시 실행, 클래식 스크립트)
  app-version.js        # 앱 버전 접근·표시 포맷터 (window.APP_VERSION → formatAppVersion)
  whats-new.js          # 새 버전 변경 이력 알림 (APP_VERSION 비교 → 모달, 설정 "변경 이력" 재열람)
  onboarding.js         # 첫 방문 시작 안내 모달 (학습 데이터 없는 최초 방문 1회, 설정에서 재열람)
  feedback.js           # 의견 수신 — 설정 "의견 보내기" 모달, ?src= 유입 추적, 익명 insert, 오프라인 큐
  pro-upgrade.js        # Pro 안내 — feature-plan.json 로드, PRO 배지(data-pro-feature) 제어, 한도 초과 업그레이드 모달, Free/Pro 플랜 비교 모달 (showPlanCompare — 설정 '플랜 안내')
  usage-stats.js        # 로컬 사용 카운터 (ROAD-L5) — 뷰·액션 횟수를 기기 단위(익명 device_id) localStorage에 누적, Pro 후보 액션 20회 판정, 설정 '내 사용 통계' 모달
  theme-init.js         # 테마 초기화 (즉시 실행)
  theme-toggle.js       # 테마 토글 UI
  ui-mode.js            # 학습/실무 UI 모드 전환 (ui_mode 전역 키, 학습 도구 접이식)
  practice-registry.js  # 실무작업실 피처 레지스트리 — 시험 features 키 → 뷰/랜딩/지연로더/핸들러 정의 (신규 실무 피처는 여기 엔트리 추가)
  supabase-config.js    # Supabase 프로젝트 URL·Publishable key (공개 설계상 키)
  supabase-client.js    # Supabase lazy init — vendor/supabase UMD 동적 로드
  auth-view.js          # 계정/로그인 모달 (이메일+PW·회원가입·매직링크)
  sync.js               # 클라우드 스냅샷 동기화 (sync_snapshots push/pull, dirty 훅·디바운스·충돌 확인, 고객 키 제외, Pro entitlement 게이트)
  globals.d.ts          # 전역 타입 선언 (jsconfig checkJs용)
  package.json          # {"type":"module"} — src/ ESM 선언
  config/
    timing.js           # 타이밍 상수 (PWA 프로브, 스와이프 임계값 등)
    cache.js            # 캐시 설정 상수
  exams/                # 시험 도메인 모듈 격리 (DA-13) — 시험 전용 실행 코드
    cosmetic/           # 맞춤형화장품 조제관리사 도메인 (domain:cosmetic)
      formula-store.js      # Formula OS — 포뮬러 CRUD·저장 한도(5개), 고객·원료 스키마 정제
      formula-rules.js      # Formula OS — 추천 규칙 (베이스·고민/피부 매핑, 안전 필터, 맞춤 규칙)
      formula-check.js      # Formula OS — 고시 한도 규정 검증 엔진 (원료 인덱스, 4상태 판정)
      formula-stability.js  # Formula OS — 제형 안정성 체크 (상 비율·상호작용·단계·pH)
      store-utils.js        # Formula OS — 스토어 공통 헬퍼 (loadItems/newId/clamp…)
      batch-store.js        # Formula OS — 조제 기록(배치) 채번·QC·위생·스냅샷 (50건)
      customer-store.js     # Formula OS — 고객 카드·상담 이력(append-only) (20명)
      product-store.js      # Formula OS — 기성품 전성분 DB (순서보존·라이브분석·역조회·JSON) (30종)
      product-vision.js     # Formula OS — 기성품 사진 인식 (BYOK Gemini·이미지 전처리·JSON 추출)
      material-ledger.js    # Formula OS — 원료 입고·사용기한·재고, 기한 경고·재고 차감 (30종)
      adverse-store.js      # Formula OS — 소비자 이상사례(부작용) 기록 (30건, FO-59)
      custom-ingredient-store.js # Formula OS — 자가 등록 성분 CRUD·공식 동명 차단·superseded (50종)
      biz-profile.js        # Formula OS — 사업 유형 프로파일 (맞춤형·제조업·책임판매업, 패널 게이트)
      ad-lint.js            # Formula OS — 광고 문구 금지 표현 린트 엔진 (화장품법 제13조)
      usage-guide.js        # Formula OS — 사용 안내문 생성기 (제형 템플릿+원료 주의)
      views/            # Formula OS 뷰 모듈 (practice-registry 지연 로드)
        formula.js          # Formula OS 공용 진입점 파사드 (named export 재수출 — data-click 디스패치·테스트 호환)
        formula-core.js     # 공용 상태(calc)·패널 전환·서브내비·성분 인덱스
        formula-hub.js      # 허브 초기화·사업 유형 프로파일·점검/백업 리마인더·고대비
        formula-list.js     # My 포뮬러 목록·열기/복제/삭제
        formula-calc.js     # 배합 계산기 행 렌더·검증·드래프트 자동 저장·저장
        formula-weigh.js    # 계량 모드 오버레이 (원료별 투입량 순회)
        formula-ing-modal.js # 자가 등록 성분 모달·CRUD
        formula-io.js       # 조제 기록지·작업지시서 인쇄·JSON 보내기/가져오기
        formula-recommend.js # 추천 베이스·원료 패널 + 맞춤 규칙 UI
        formula-fields.js   # 처방 작업대 고객·안정성 필드 블록
        formula-batch.js    # 조제 기록(배치) 목록·상세·저장·인쇄 + 폼 핸들러 재수출
        formula-batch-form.js # 배치 신규·보정 폼 (처방/고객 바인딩·QC·위생·LOT·기한 제안)
        formula-customer.js # 고객 관리 패널 (카드·상담 이력·역참조·기성품 알레르기 교차)
        formula-products.js # 기성품 DB 패널 (목록·폼 액션·JSON IO + 분리 모듈 재수출)
        formula-prod-state.js # 기성품 폼 공유 상태 (prodForm·전성분 칩 렌더)
        formula-prod-vision.js # 기성품 사진 인식 (LLM 초안→칩 검토, FO-41~43·46·54·55)
        formula-prod-detail.js # 기성품 상세·교차·비교 (분석·알레르기 교차·포뮬러/기성품 비교)
        formula-material.js # 원료 장부 패널 (기한 배지·경고·LOT 추적)
        formula-adverse.js  # 소비자 이상사례 기록 패널 (FO-59)
        formula-compliance.js # 법규 준수 체크리스트 + 법령 MD 링크 (유형별 세트)
        formula-sales.js    # 표시사항 검토 + 광고 문구 점검 패널 (mfg·sales 유형)
        formula-audit.js    # 종합 규정 점검 보고서 수집기 (FO-56, 유형별 게이트)
        formula-print.js    # 인쇄 빌더 (조제 기록지·라벨·안내문·종합 보고서)
        trainer-ingredients.js # 원료 배합 챌린지 (features.ingredients)
  views/                # 뷰 컨트롤러 (43개)
    navigation.js       # 뷰 전환 유틸 (switchView)
    textbook-reader.js  # 교재 리더 오케스트레이터 (과목·챕터 선택·진입점)
    reader-render.js    # 챕터 본문 렌더 — TOC·섹션 카드·바인딩 (textbook-reader.js에서 분리)
    reader-loader.js    # 이야기형 챕터 로딩 + LRU 캐시 (textbook-reader.js에서 분리)
    reader-progress.js  # 리더 세션 상태 + 읽기 위치·진척 영속화 (textbook-reader.js에서 분리)
    reader-ref-links.js # 참조자료 링크 생성·프리뷰·클릭 위임 (textbook-reader.js에서 분리)
    reader-toolbar.js   # 교재 리더 툴바·독서 설정·스크롤 이벤트 (textbook-reader.js에서 분리)
    reader-audio.js     # 오디오북 플레이어
    textbook-search.js # 교재 검색 (역색인)
    quiz.js             # 기출 퀴즈
    quiz-wrong-cause.js # 오답 원인 태깅·재학습 액션 (quiz.js에서 분리)
    flashcard.js        # 3D 플래시카드
    daily-challenge.js  # 데일리 챌린지
    dashboard.js        # 대시보드 뷰 (과목 카드·통계·히트맵)
    dashboard-queue.js  # "오늘 할 일" 단일 큐 — 추천 소스 병합·렌더 (TQ-01~05)
    analysis-view.js    # 학습 진단 뷰 (개인화 진단 카드·주간 리포트, dashboard.js에서 분리)
    score-estimate.js   # 복합 예상 점수·실제 결과 기록 (dashboard.js에서 분리)
    subject-stats.js    # 과목별 진행 통계 집계 공용 헬퍼 (dashboard.js에서 분리)
    trainer.js          # 훈련소 허브 (재수출)
    trainer-calc-practice.js  # 계산 연습기
    trainer-drills.js   # O/X 드릴 + 드릴 공통 오케스트레이션
    trainer-drill-combo.js # 복수정답형(combo) 드릴 (trainer-drills.js에서 분리)
    pomodoro.js         # 뽀모도로 타이머
    exam-simulator.js   # 실전 모의고사 파사드 — 분리 모듈 재수출 + 성적 이력 저장
    exam-sim-session.js # 모의고사 세션 수명주기 (시험 구성·시작·드래프트 복구·나가기)
    exam-sim-arena.js   # 모의고사 아레나 (타이머·OMR·문항 렌더·응답·채점 제출)
    exam-sim-draft.js   # 모의고사 임시 세션(드래프트) 저장·복구 배너
    exam-sim-state.js   # 시뮬레이터 상태
    exam-sim-review.js  # 시뮬레이터 결과 리뷰
    exam-sim-weak.js    # 오답 모의고사 (exam-simulator.js에서 분리)
    exam-select.js      # 시험 선택/전환 뷰
    dictionary.js       # 지식DB 사전 (스키마 드리븐 — manifest.knowledge → registry.knowledge)
    study-calendar.js    # 학습 캘린더/목표 뷰
    glossary-renderer.js # 용어집 렌더링
    event-listeners.js  # 이벤트 리스너 진입점 — 도메인 바인딩 합성 (listeners-*.js)
    listeners-app.js    #   앱 셸 공통 (진도 초기화·설정 메뉴·접이식)
    listeners-flashcard.js # 플래시카드 (플립·스와이프·단축키)
    listeners-quiz.js   #   퀴즈·훈련소 (제출·숫자/OX 단축키)
    listeners-simulator.js # 모의고사 (OMR 이동·제출·단축키)
    listeners-dictionary.js # 성분 사전 검색 디바운스
    listeners-delegation.js # data-click/data-input 위임 (CSP 대응)
    backup.js           # 백업/복원
    offline-detection.js # 오프라인 감지 (app.js에서 분리)
css/                    # 스타일시트 모듈 (base.css, reader.css, app-responsive.css, reader-extras.css, reader-mermaid.css, trainer.css, exam.css, dashboard.css, study.css, study-calendar.css, print.css, ui-overlay.css, html-viewer.css — @import 순서가 캐스케이드, style.css 참조)
  exams/<id>/           # 시험 도메인 스타일 (cosmetic/formula.css 등) — 피처 진입 시 practice-registry가 <link> 지연 주입 (style.css @import 아님 — 비활성 시험 미로드)
content/                # 시험 콘텐츠 컨테이너
  exams.json            # 시험 레지스트리 (멀티시험 엔트리 — 멀티시험 구조 섹션 참조)
  lawdb.json            # 공용 법령DB — law.go.kr 메타데이터 SSOT (id·slug·type·matchKeys·watch). 시험별 사용 목록은 references.json.lawRefs가 지정 → build:pdf-registry가 src/law-links.js 생성
  exams/cosmetic/       # 기본 시험 콘텐츠 루트 (contentRoot)
    manifest.json       # 과목/교재/문제은행 선언 + textbookEdition(교재 판본 라벨 — check:manifest 필수, 교체 시 런북 0d에서 갱신) + knowledge(사전 뷰 엔티티 스키마)
    references.json     # 참조자료 매핑 설정 + lawRefs(법령 링크 대상) + noticeCore(고시 감시 기준 문서)
    law_verified.json   # check_laws.py 수동 검증값 {"문서명": ["번호","시행일","판정"]}
    교재/                # 4과목 MD 파일 (표준형 4 + 이야기형 4 = 8파일, 총 19챕터 — 과목별 2·5·5·7)
    문제은행/            # 과목별 문제은행 MD
    참조자료/            # 법령고시/별표/참조자료 — PDF는 공통·과목1~4 폴더, MD 변환본은 ref_md/과목N/{문서}/{문서}.md (과목 폴더가 귀속의 진실)
      원료/              # 원료 참조자료 MD — GENERATED-TABLE 표는 knowledge/ingredients.json에서 빌드 재생성 (마커 밖 서술만 수기)
    knowledge/          # 지식DB SSOT — ingredients.json (원료 1,402종 items + meta 버전·이력, db_version.json 계승)
    audiobook/          # 오디오북 MP3 산출물 (생성 스크립트는 ref-pipeline/audiobook/)
    number-drills/      # 숫자 암기 드릴 JSON
    피드백/              # 피드백 정본 — stmt_explain.json (sid→해설, ai:stmtfb --apply 편입 → build:drills가 진술 explain에 병합, AI-15) · card_tip.json (cardId→암기팁, ai:cards --apply 편입 → 런타임 오버레이, AI-19) · card_exclude.json (cardId→사유, 런타임 카드 목록 제외, AI-22)
  exams/<id>/           # 추가 시험도 동일한 내부 구조 (대칭)
data/                   # 빌드 생성 번들
  exams.js              # 전역 시험 목록 (window.EXAMS_LIST)
  audio_manifest.js     # 전역 오디오 매니페스트 (시험 id 키 분리)
  version.js            # window.APP_VERSION — 배포 스탬프와 동기화
  release-notes.json    # 사용자용 변경 이력 진실 소스 (notes:draft → JSON 편집 → deploy)
  release-notes.js      # window.RELEASE_NOTES — 생성 파일 (직접 편집 금지)
  docs_md/              # 앱 공용 문서 번들 (현재 비어 있음 — 인앱 문서는 전부 시험별, MV-04)
  exams/cosmetic/       # 기본 시험 데이터 루트 (dataRoot: registry.js, subjects/, exams/, drills/, study_md/, docs_md/, id_migration.js 등)
  exams/<id>/           # 추가 시험 데이터 루트 (동일 구조)
tools/                  # 빌드·검증 스크립트
  build/                # 데이터 파이프라인 (manifest → registry + 해시 번들) + 생성기 (build_trace_matrix·scaffold_exam·drill-utils·trace)
  check/                # 검증·감사 스크립트 (run.js 통합 실행기·steps.js 단계 레지스트리·push_gate.js pre-push 적응형 게이트·check_*·audit_*·verify_shell_assets·coverage_merge·impact_tests)
  sync/                 # 콘텐츠 동기화 (sync_citation_lines·sync_textbook_files)
  deploy/               # 배포 가드 (deploy.js)
  lib/                  # 공용 스캔·파싱 라이브러리 (trace_scan.js)
  ai/                   # AI 제작 지원 도구 (llm_client + 초안 생성·검수 9종, lib/ 공용 파서 — AI-01~13)
ref-pipeline/           # 교재·참조자료 생성/변환 독립 도구함 (PDF→MD, MD→HTML, 오디오북 TTS, 법령 검증) — 사용 절차는 ref-pipeline/README.md 참조
vendor/                 # 자체 호스팅 자산 (fonts/, fontawesome/)
tests/                  # 테스트
  unit/                 # node --test 유닛 테스트 (도메인 테스트는 unit/exams/<id>/ 하위)
  dom/                  # Vitest + jsdom DOM 테스트 (도메인 테스트는 dom/exams/<id>/ 하위)
docs/                   # 문서 (인덱스: docs/README.md · 규약 정본: docs/DOC_CONVENTIONS.md=문서 · docs/CODE_CONVENTIONS.md=코드)
  dev/                  # 플랫폼 공통 개발 문서 — 아키텍처, 명세, 런북, 설계, 참조
    adr/                # 아키텍처 결정 기록 (ADR — 결정의 "왜" 보존, README.md 템플릿·규약)
  exams/cosmetic/       # 시험 종속 문서 — user·business·design·reference·report_archive (범위·판본 헤더로 선언)
```

## 아키텍처 핵심

1. **Local-First + Optional Cloud**: 순수 프론트엔드 + Vercel 정적 호스팅이 기본, Supabase는 로그인 사용자에게만 붙는 선택 레이어 (미설정 시 완전 정상 동작)
2. **Vanilla ES Modules**: `<script type="module">`, import/export, 프레임워크 없음
3. **DataLoader 온디맨드**: `{contentRoot}/*.md`를 런타임 fetch + parseMarkdown으로 렌더링
4. **Service Worker**: Cache First (HTML/JS/CSS), DATA_CACHE (MD/참조자료, 배포 간 유지)
5. **이벤트 위임**: `data-click`/`data-arg` 속성 기반, CSP `script-src 'self'` 호환
6. **멀티시험 플랫폼**: 시험별 `contentRoot`/`dataRoot` 분리 — 아래 "멀티시험 구조" 참조

## 멀티시험 구조

- **시험 레지스트리**: `content/exams.json` → `data/exams.js` 번들(`window.EXAMS_LIST`, `npm run build:data`에 포함). 각 시험 엔트리: `id`, `name`, `appName`(시험별 앱 이름 — 브랜드면 표기), `title`/`logoMain`/`logoSub`(브랜딩), `desc`, `icon`, `year`, `default`, `contentRoot`, `dataRoot`, `registryBundle`, `registryGlobal`, `features`(기능 플래그). **`year`가 시험 연도의 유일한 진실 소스(SSOT)** — `build:exams-list`가 각 시험의 `manifest.json` `contentYear`와 `index.html`·`manifest.webmanifest`의 연도 텍스트(기본 시험 기준)로 자동 전파하므로, 연도 변경은 `exams.json`만 수정 후 `build:data` 재실행
- **시험별 루트 (대칭)**: 모든 시험이 `content/exams/<id>/`(manifest.json + references.json + 교재/문제은행/참조자료/audiobook 등)와 `data/exams/<id>/`(registry.js, subjects/, exams/, drills/, embeddings/, study_md/, docs_md/, supplements/, id_migration.js 등) 구조 — 기본 시험(cosmetic)도 예외 없음. `content/`·`data/` 루트에는 전역 파일만: `exams.json`/`exams.js`, `audio_manifest.js`(시험 id 키 분리), `docs_md/`(앱 공용 문서)
- **시험 컨텍스트**: `src/exam-context.js` — `contentPath()`/`dataPath()`(경로 해석), `hasFeature()`(기능 게이팅), `selectExam()`(전환 = `location.reload()`로 모듈 상태 리셋), `scopedKey()`(진도 네임스페이스 `<examId>:key`)
- **진도 격리**: `safeGetItem`/`safeSetItem` 등이 자동으로 시험 접두사 적용. 테마·리더 설정 등 `GLOBAL_KEYS`만 비네임스페이스. 백업 파일은 비접두사 논리 키(시험 간 호환)
- **새 시험 추가 절차**: ① `npm.cmd run scaffold:exam -- <id> --name "시험명"`으로 골격 생성(권장 — 수동으로 디렉터리를 먼저 만들면 domainmap 미등록 오류) 후 manifest.json + references.json + 교재/문제은행 배치 — 법령 참조가 있으면 `content/lawdb.json`에 엔트리 + `references.json.lawRefs`·`noticeCore` 설정, 사전이 있으면 `manifest.knowledge` 스키마 선언 ② `content/exams.json`에 엔트리 추가 (`contentRoot`/`dataRoot`/`registryBundle`/`registryGlobal` 지정 — 비기본 시험은 `registryGlobal: "DATA_REGISTRY_<id>"`) ③ `npm.cmd run check:content -- --build` → 끝 (앱 로직 변경 불필요). **도메인 자산 규약**: 시험 전용 코드·마크업·스타일·테스트는 `src/exams/<id>/`·`html/exams/<id>/`·`css/exams/<id>/`·`tests/{unit,dom}/exams/<id>/`에, 시험 종속 문서는 `docs/exams/<id>/`에 배치 — 플랫폼 레지스트리가 `exams/${getActiveExamId()}/` 규약으로 해석하므로 기존 실무 피처 재사용은 파일 배치만으로 동작. 상세: `docs/dev/runbooks/NEW_EXAM_RUNBOOK.md`·`docs/dev/design/MULTI_EXAM_DB_DESIGN.md`
- **기능 플래그**: `features`에 없는 기능은 `data-feature` 속성/`hasFeature()`로 자동 숨김 — 성분사전·원료배합·계산연습·오디오북·참조자료 등 도메인 특화 기능
- **Node 도구**: `EXAM_ID`/`EXAM_CONTENT_ROOT`/`EXAM_DATA_ROOT` env로 대상 시험 지정 (예: `EXAM_ID=<id> node tools/build/index.js`)
- **Python 도구**: ref-pipeline 전 스크립트가 `ref-pipeline/_exam_root.py`로 동일 순서 해석 — `--exam` 인자 > `EXAM_CONTENT_ROOT` > `EXAM_ID` > exams.json default (예: `python ref-pipeline/check_laws.py --exam <id>`)

## 작업 절차 — 설계 문서 우선 (Docs-First)

- 소스(`src/`, `tools/` 등)를 수정하기 **전에** 항상 설계 문서를 먼저 점검·갱신한다:
  1. **SPEC 점검** — 변경 대상 기능의 요구사양(`docs/dev/SPEC.md`의 SPEC ID)과 현재 설계(`docs/dev/ARCHITECTURE.md`·`docs/dev/design/`)를 확인하고, 의도하는 동작 변경이 문서와 어긋나면 문서를 먼저 수정한다. 신규 기능이면 SPEC에 ID를 부여한 뒤 구현에 들어간다.
  2. **테스트 선행** — 버그 수정은 재현 테스트(실패하는 테스트)를 먼저 작성하고, 기능 변경은 기대 동작을 테스트로 고정한 뒤 구현한다.
  3. 그 다음 소스를 구현하고, 완료 시 문서↔코드 정합은 기존 게이트(`check:docs`, `check:docsync`, `build:trace`)가 검증한다.
- 사후 문서화(check:docsync)는 최소 안전망일 뿐이며, 이 규칙의 선행 절차를 대체하지 않는다.
- **기계적 강제**: `check:testfirst`가 실행 로직(`src/*.js`·`ref-pipeline/*.py`) 변경에 테스트(`tests/`·`ref-pipeline/tests/`) 변경 동반을 요구한다 — pre-commit(`--staged`)·pre-push/CI(`--ref origin/main`)·`check:ci` 3층에서 작동하므로 머신과 무관하게 강제된다. 브랜치에 커밋된 테스트 변경도 인정돼 "테스트→구현" 커밋 분할이 가능하다. 기존 테스트로 충분한 변경은 `[no-test]` 또는 `SKIP_TESTFIRST=1`로 면제.

## 구조 변경 시 문서 갱신 규칙

- 디렉터리/파일 이동·삭제·추가 시 경로를 참조하는 문서를 함께 갱신: `README.md`·`AGENTS.md` 디렉터리 트리, `docs/dev/ARCHITECTURE.md` 트리·변경 매트릭스, `docs/README.md` 인덱스, 관련 런북(`docs/dev/runbooks/CONTENT_WORKFLOW.md`, `docs/dev/runbooks/TEXTBOOK_REPLACEMENT_RUNBOOK.md`, `ref-pipeline/README.md`)
- 갱신 후 `npm.cmd run check:docs` 통과 필수 — 문서 내 스테일 경로 참조를 자동 탐지 (`check:content`에도 통합돼 자동 실행)
- 계획/미구현 경로·이력 서술 등 의도적 참조는 `tools/config/docs_paths_allowlist.json`에 `reason`과 함께 등록

## 요구사양 ID 체계 (SPEC ID)

- `docs/dev/SPEC.md`의 기능/비기능/데이터 요구사항은 **접두사+번호 ID**로 식별 (예: `Q-05`, `FB-01`, `UX-NAV-07`). 접두사는 절별 유일 — 신규 기능은 SPEC에 먼저 ID를 부여한다.
- ID → 구현 매핑은 `docs/dev/ARCHITECTURE.md` "🔗 요구사양 추적 (SPEC ID 매트릭스)" 절 참조.
- 다른 dev 문서는 헤더에 `> **관련 SPEC ID**: XX-##` 행으로 자신이 다루는 요구사항을 표기한다. 복수 ID 나열 구분자는 `,` `·` `/` 모두 허용 (`FO-24/RR-19` 가능 — 단 접두사 생략형 `FO-24/25`는 비지원). CHANGES.md·커밋 메시지에서도 관련 ID 인용 권장.
- **코드 추적**: 소스/테스트 파일의 헤더 주석에 `// @spec FB-01~08` (JS/TS), `/* @spec TH-01 */` (CSS), `# @spec CS-03` (Python), `<!-- @spec S-01 -->` (HTML) 형태로 구현 범위를 표기. SPEC 미해당 인프라 파일은 `@spec none (사유)` 표기로 "의도적 미커버"를 명시. 비자명한 로직에는 함수 직상단에 `// @spec UX-NAV-07 — 이유` 형태의 선택 태그 권장.
- `npm.cmd run check:specrefs`로 양방향 검증 — 코드가 참조하는 ID가 SPEC에 없으면 실패(ID 삭제·개명 시 스테일 참조 탐지), SPEC ID가 어떤 코드에도 없으면 커버리지 공백 경고. `check:content`에 통합됨.

## 문서 ID 체계 (DOC ID)

- 모든 마크다운 문서(`docs/`, `ref-pipeline/`, `content/exams/<id>/docs/`(앱 내 문서), 루트 `README.md`·`AGENTS.md`)는 상단에 `> **문서 ID**: DOC-XX-NN` 헤더를 갖는다.
- **대상 제외**: `content/exams/<id>/참조자료/ref_md/`·`교재/*.md` — 판본이 파일명(제N호·시행일)과 변환 파이프라인(pdf_hashes·고시 감지)에 내재화된 자동 변환물이라 헤더를 부여하지 않는다.
- 접두사는 문서 종류별 구분 — `DOC-ROOT`(루트) · `DOC-IDX`(인덱스) · `DOC-DEV`(수위 문서) · `DOC-DSN`(design/) · `DOC-REF`(reference/) · `DOC-RBK`(runbooks/) · `DOC-USR`(사용자 문서) · `DOC-BIZ`(사업 문서) · `DOC-ARC`(아카이브) · `DOC-PPL`(ref-pipeline/). 시험 종속 문서도 같은 종류 접두사를 쓰되 위치는 `docs/exams/<id>/` 또는 `content/exams/<id>/docs/`다.
- 모든 문서는 `> **범위**: platform | exam:<id>` + `· 판본: none | textbook | refmat` 헤더로 시험·판본 종속성을 선언한다 — `check:docs`가 누락·위치 불일치를 검증. `판본: textbook`은 교재 교체 시, `판본: refmat`은 법령·고시 등 참조자료 판본 변경 시 갱신 대상. 기준 판본 라벨은 `manifest.json`의 `textbookEdition`이 선언한다(check:manifest 필수).
- ID → 파일 매핑 레지스트리는 `docs/README.md` "문서 ID 레지스트리" 절 — 신규 문서는 해당 영역 다음 번호를 채번해 표에 등록한다.
- `npm.cmd run check:docs`(check_doc_ids.js 포함)가 헤더 누락·형식 오류·ID 중복을 검증한다.
- 문서 분류·명칭·배치·헤더·생명주기 규약의 정본은 `docs/DOC_CONVENTIONS.md` (DOC-DEV-08) — 신규 문서 배치 판정·버킷 정의·이동 절차는 거기를 따른다.

## 추적 매트릭스 (TRACE MATRIX)

- 요구사양(SPEC ID) ↔ 문서(DOC ID) ↔ 소스·테스트(@spec) ↔ 보고서(report_archive 헤더)의 유기적 추적은 `docs/dev/TRACE_MATRIX.md`(DOC-DEV-04)가 담당 — `npm.cmd run build:trace`로 재생성하는 자동 산출물(직접 편집 금지).
- 연결 규약: 각 문서 헤더의 `> **관련 SPEC ID**: XX-##` 행 + 코드의 `@spec` 태그가 원천. `check:specrefs`가 양쪽 모두 SPEC 존재 여부를 검증한다.
- SPEC ID 변경·문서 추가·@spec 태그 변경 후에는 `npm.cmd run build:trace`로 매트릭스를 갱신한다. `npm.cmd run check:trace`가 입력 해시로 신선도를 검증(check:content 포함) — 스테일이면 실패.
- 활용 도구: `node tools/build/trace.js Q-05`(요구사항 도시어 — 문서·소스·테스트·보고서 즉시 조회), `node tools/check/impact_tests.js [파일…]`(변경 파일 → 영향 요구사항·권장 테스트 역산 — 인자 없으면 미커밋 변경 자동 분석).

## 코드 스타일 및 규칙

> 코드 규약(배치·계층·명칭·금지 패턴·저장소/UI/추적성)의 정본은 `docs/CODE_CONVENTIONS.md` (DOC-DEV-09) — 아래는 실무 속성표다.

### 공통
- **로컬 폴더명·절대 경로 하드코딩 금지** — `C:\Project\...` 같은 로컬 절대 경로는 폴더 리네임·멀티 머신에서 깨짐. 코드는 `__file__`/`import.meta` 기준 상대 경로로 해석하고, 문서의 파일 참조는 저장소 루트 상대(`@/src/...`)로 표기. GitHub 리포 slug(`skygoldlee-cyber/passory`)·Vercel 프로젝트명 같은 원격 식별자는 예외.

### JavaScript
- ES Modules (`import`/`export`), 클래식 스크립트는 데이터 파일/외부 라이브러리만
- 4-space 들여쓰기 (`.editorconfig` + 실물 코드 정본 — JS 소스는 4칸 공백)
- `window` 전역 노출: `data-click` 이벤트 위임을 위해 `app.js`에서 `window`에 핸들러 매핑
- 인라인 `onclick`/`oninput` 금지 (CSP 차단) → `data-click`/`data-input` 사용 (`check:uistyle` 게이트)
- `element.style.display = '...'` 금지 → `classList.add/remove('is-hidden')` 사용 (`check:uistyle` 게이트)
- `alert()`/`confirm()` 금지 → `showToast()`/`showConfirm()` 사용 (src/ui-utils.js, `check:uistyle` 게이트)
- **강건성 규칙** (상세: `docs/dev/ARCHITECTURE.md` 강건성 가이드라인 섹션):
  - 배열 접근 후 bounds 체크: `if (!item) return;`
  - `window.X` 접근 시 존재 체크: `window.X && window.X[key]`
  - `parseInt()` 결과 `isNaN()` 체크
  - `localStorage` 접근 시 `try/catch` 래핑 (또는 `safeGetItem`/`safeSetItem` 사용)
  - `document.getElementById()` 결과 null 체크
  - Promise 체인에 `.catch()` 추가

### CSS
- `style.css`가 진입점, `@import`로 `css/*.css` 로드
- 디자인 토큰은 `css/base.css` `:root`의 CSS 변수 사용 (`--color-primary`, `--radius-md` 등)
- `!important` 최소화 (Mermaid 다이어그램 규칙은 예외 — 인라인 스타일 덮어쓰기용)
- 미디어 쿼리 브레이크포인트: 768px / 900px / 1200px (3단계)
- 마크업 인라인 `style="…"` 속성 전면 금지 → CSS 클래스·유틸리티 사용 (`check:uistyle` 게이트, 면제는 `style-ok` 토큰)
- 유틸리티 클래스: `.is-hidden`, `.text-muted`, `.mb-4`~`.mb-7`, `.mt-3`~`.mt-7`, `.ml-2` (css/base.css)

### HTML
- 단일 `index.html` (App Shell)
- `<h1>`은 페이지당 1개 (사이드바 브랜드)
- 헤딩 위계: h1 → h2 → h3 → h4 순서 준수 (h5/h6는 위계 역행 주의)
- 인라인 이벤트 핸들러 (`onclick`, `oninput` 등) 금지
- 아이콘 전용 버튼에는 `aria-label` 필수
- 동적 피드백 영역에는 `role="status" aria-live="polite"` 권장

## Service Worker 캐시 규칙

- `sw.js`의 `CACHE_VERSION`은 배포마다 bump 필요
- 형식: `v{번호}-{날짜}-{설명 또는 커밋해시}`
- `stamp:sw` 스크립트로 커밋 해시 자동 스탬프 가능
- `SHELL_CACHE`: HTML/JS/CSS (배포마다 삭제 후 재캐시)
- `DATA_CACHE`: MD/참조자료 (배포 간 유지, 해시 파일명으로 갱신 감지)

## 검증 체크리스트 (변경 후 필수)

1. `node --check` — 수정한 JS 파일 문법 검증
2. `npm.cmd test` — 유닛 테스트 통과 확인
3. `npm.cmd run check:parser` — 콘텐츠 변경 시 파서 등가성 검증
4. `npm.cmd run check:imports` — src/ 내 ES 모듈 import/export 교차 검증
5. `npm.cmd run verify:assets` — SHELL_ASSETS 파일 존재 확인
6. `git status` — 임시 파일(`_temp_*.js`, `.git/COMMIT_MSG.txt`) 제거 확인
7. `sw.js` `CACHE_VERSION` bump 확인
8. `npm run deploy`의 배포 후 스모크 자동 통과 확인 (200·sw.js·APP_VERSION 스탬프 — passory.vercel.app)

## 주의사항

- **PowerShell 환경**: `&&` 연산자 사용 불가 → `;` 사용. `npm` → `npm.cmd`.
- **Mermaid `!important`**: `css/reader.css`의 Mermaid 규칙 `!important`는 제거 금지 (Mermaid 라이브러리 인라인 스타일 덮어쓰기용)
- **콘텐츠 편집 후**: `npm.cmd run build:data` 실행 후 `data/` 번들 커밋 필요. `check:content`(CI의 `--content-only` 단계 포함)가 스냅샷 drift·인용 대상 파일 부재·미등록 md·구조 드리프트를 차단 — 교재 파일 추가/이름 변경/삭제 시 `node tools/sync/sync_textbook_files.js`(`--rename` 포함)로 선언·프리캐시·인용 경로를 먼저 동기화할 것
- **CSP**: `vercel.json`에 `script-src 'self'` (인라인 스크립트 금지)
- **DOM 테스트**: `tests/dom/` — Phase 1~5 전 뷰 커버 (매트릭스·작성 규칙은 `docs/dev/design/DOM_TEST_DESIGN.md`, 파일별 목록·정책은 `docs/dev/reference/TESTING.md`)

## 관련 문서

- `docs/dev/ARCHITECTURE.md` — 시스템 아키텍처 상세
- `docs/dev/design/UIUX_DESIGN_GUIDE.md` — UI/UX 설계 가이드 — 국제 표준 기반 표면 모델·기능 버튼 노출(정본) 규약
- `docs/dev/runbooks/DEPLOYMENT_GUIDE.md` — 배포 가이드
- `docs/dev/reference/GATE_MAP.md` — 검증 게이트 전체 지도 (훅→CI→배포 4층·실패별 복구 표 — 게이트 실패 시 먼저)
- `docs/dev/runbooks/VERIFY_DEPLOY_PIPELINE.md` — 전체구조 점검→배포 게이트 파이프라인 (신선도 게이트·실패 복구 표)
- `docs/dev/runbooks/WHEN_THINGS_BREAK.md` — 장애 증상 색인 (증상→정본 문서 라우팅·우회 장치 일람·기준선 갱신 규약)
- `docs/dev/runbooks/CONTENT_WORKFLOW.md` — content 변경 시 작업 절차 가이드
- `docs/dev/CHANGES.md` — 변경 이력
- `docs/dev/reference/TESTING.md` — 테스트 가이드
- `docs/dev/reference/ENGINEERING_PRACTICES.md` — 소프트웨어 공학 요소 정리 (SSOT·신선도 게이트·추적성)
- `docs/dev/reference/SOFTWARE_ENGINEERING_TECHNIQUES.md` — 적용 공학 기법 카탈로그 (PBT·변이·성능 예산·ADR·도메인 경계·텔레메트리 포함 전 기법 색인)
- `docs/dev/design/DOM_TEST_DESIGN.md` — jsdom UI 시나리오 테스트 설계
- `docs/dev/design/SEMANTIC_EMBEDDING_DESIGN.md` — 임베딩 기반 의미 유사도 설계 (인프라 구현됨 + 오답 원인 분류 설계 통합, 구 DSN-19)
- `docs/dev/design/LEARNING_ALGORITHM_DESIGN.md` — 학습 알고리즘 통합 설계안 (FSRS·시험일 최적화·지식 추적 — 구 DSN-17·26~29, DOC-DSN-32)
- `docs/dev/design/SUPABASE_DESIGN.md` — 계정·클라우드 동기화 설계안 (Phase 1~2 구현 완료, Pro entitlement는 미구현 + Firebase 대안 부록, 구 DSN-31)
- `docs/dev/design/ADMIN_DESIGN.md` — 관리자 콘솔 설계안 (권한 모델·피드백 인박스·사용자 관리 — 미구현, AD-01~06)
- `docs/dev/runbooks/TEXTBOOK_AUTHORING_GUIDE.md` — 교재 작성 가이드
- `docs/exams/cosmetic/reference/NUMBERING_SYSTEM.md` — 교재 번호체계 가이드 (십진법)
- `docs/dev/design/QUESTION_SCHEMA_DESIGN.md` — 문항 스키마 + 복수정답형 변환 파이프라인 설계
- `docs/dev/design/AI_AUTHORING_DESIGN.md` — AI 제작 지원 설계안 (문제·해설 초안 자동화 — 미구현, DOC-DSN-33)
- `docs/exams/cosmetic/design/FORMULA_OS_WORKFLOW_DESIGN.md` — 조제관리사 9개 업무 전체 커버리지 확장 설계안 (고객·배치·원료장부·안내문)
- `docs/dev/runbooks/COMBO_GENERATION_GUIDE.md` — 복수정답형 문항 생성 절차·품질 게이트·수치 조정 가이드
- `docs/dev/reference/COMBO_STUDY_STRATEGY.md` — 복수정답형 학습 전략 (전략→기능 매핑 포함)
- `content/exams/cosmetic/docs/user_manual.md` — 학습 매뉴얼 (시험 대비 — 시험별 문서)
- `content/exams/cosmetic/docs/formula_manual.md` — 실무 매뉴얼 (Formula OS — 시험별 문서)
