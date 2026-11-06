# 명령 카탈로그 — npm 스크립트·검증 단계 전체 (COMMANDS.md)

> ⚙️ **생성물** — `npm run build:commands`로 재생성. 직접 편집 금지.
> 정본: `package.json` scripts + `tools/check/steps.js` 단계 레지스트리 + 각 도구 헤더 주석.
> **문서 ID**: DOC-REF-19
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (명령 카탈로그 — 개별 단계는 각 SPEC에 귀속)

---

## 1. 검증 실행기 (run.js 프리셋)

단일 진입점은 `tools/check/run.js` — 프리셋이 `steps.js`에 선언된 단계 묶음을 실행한다.

```powershell
npm.cmd run check -- --preset <이름> [--quick|--content-only|--build|--jobs N|--ref <ref>]
npm.cmd run check -- --step <id>      # 단일 단계만 (--list로 id 조회)
```

| 프리셋 | 단계 수 | 용도 |
|---|---|---|
| `content` | 32 | 콘텐츠 통합 검증 — 교재 교체 등 대규모 콘텐츠 변경 후 (--quick, --content-only, --build 옵션) |
| `docs` | 20 | 문서 정합 묶음 — 경로 참조·문서 ID·트리·명령 정합 등 |
| `ci` | 32 | CI 게이트 로컬 재현 — ci.yml과 토큰 1:1 대응 |
| `all` | 61 | 저장소 전체 검증 — lint·types·docs·콘텐츠·테스트 일괄 |
| `refs` | 6 | 참조자료 검증 묶음 — 레이아웃·귀속·신선도·인용 라인·병합 품질 |
| `freshness` | 10 | 생성물 신선도 묶음 — 파생물 미재생성 감지 |
| `audit` | 13 | 감시·감사 묶음 — P2 advisory (실패해도 종료 0·차단 없음) |

## 2. 검증 단계 카탈로그 (steps.js 레지스트리)

| 단계 id | 티어 | 분류 | 명령 | 설명 |
|---|---|---|---|---|
| `html` | P1 | 빌드 | `node tools/build/build_html.js --check` | index.html 조립 신선도 (파셜 편집 시 build:html 필요) |
| `landing` | P1 | 빌드 | `node tools/build/build_landing.js --check` | landing.html 조립 신선도 (템플릿·exams.json 편집 시 build:landing 필요) |
| `content:manifest` | P1 | 선언 | `node tools/check/check_manifest.js` | manifest 선언 ↔ 파일/과목 자산 정합성 |
| `content:structure` | P1 | 구조 | `node tools/sync/sync_textbook_files.js --check` | 교재/문제은행 파일 ↔ manifest·sw.js MD_ASSETS 구조 드리프트 |
| `content:citations` | P1 | 인용 | `node tools/sync/sync_citation_lines.js --check` | 문제은행 → 교재 #L라인번호 인용 동기화 상태 |
| `content:numbering` | P1 | 번호 | `node tools/check/check_numbering.js` | 교재 십진법 번호체계 — 구식 잔재·연속성·계층·중복 (표준↔이야기 동기화는 경고) |
| `content:answers` | P1 | 인용 | `node tools/check/check_answer_overlap.js` | 문제 정답 ↔ 인용 근거 구절 의미적 지지 (정답 미지지 기준선 게이트) |
| `content:refsubjects` | P2 | 귀속 | `node tools/check/check_ref_subjects.js` | ref_md 문서의 과목 귀속 vs 실제 인용 득표 (정보 단계 — 불일치는 참고 보고) |
| `content:reflayout` | P1 | 레이아웃 | `node tools/check/check_reflayout.js` | 참조자료 폴더/레지스트리 정합성 |
| `content:reffresh` | P1 | 신선도 | `node tools/check/check_ref_freshness.js` | 참조자료 PDF 해시 ↔ ref_md 변환본 (PDF 교체 감지) |
| `content:reflines` | P1 | 참조라인 | `node tools/check/check_ref_lines.js` | 교재/문제은행 (LNN) 참조 라인 ↔ ref_md 실제 내용 |
| `content:refformat` | P1 | 형식 | `node tools/check/check_refmd_format.js` | ref_md 추출 잔재·평탄화 형식 — lone CR·제어문자·PUA 글리프·초장문 줄 차단 |
| `content:drillfresh` | P1 | 드릴신선도 | `node tools/check/check_drill_freshness.js` | 드릴 번들 ↔ 문제은행 번들 (build:drills 필요 감지) |
| `content:embfresh` | P1 | 임베딩신선도 | `node tools/check/check_emb_freshness.js` | 임베딩 manifest.inputs(sha1) ↔ 원본 번들 (build:embeddings 필요 감지 — SEM-05) |
| `content:combo` | P1 | 드릴 | `node tools/check/check_combo_pilot.js` | 복수정답형(combo) 드릴 데이터 정합성 |
| `content:id-migration` | P1 | ID이관 | `node tools/build/build_id_migration.js --check` | 카드/퀴즈 ID 스냅샷 ↔ 콘텐츠 (build:data 누락·진도 손실 감지) |
| `content:datafresh` | P1 | 데이터신선도 | `node tools/check/check_data_freshness.js` | data/·생성물 ↔ 원본 (빌드 체인 실행 후 git diff — build:data 누락 감지) |
| `content:linklint` | P1 | 링크 | `node tools/check/check_link_lint.js` | 렌더 출력 링크 린트 — 원시 경로·좌표/파일명 라벨·QA 스탬프·미승인 외부 링크 노출 탐지 |
| `content:parser` | P0 | 파서 | `node tools/check/check_parser_parity.js` | 빌드 파서 ↔ 런타임 파서 출력 등가성 |
| `content:imports` | P0 | 임포트 | `node tools/check/check_imports.js` | src/ ES 모듈 import/export 교차 검증 |
| `content:posind` | P0 | 규칙 | `node tools/check/check_position_independence.js` | 교재 좌표 비의존 — 위치 기반 식별자·저장 키 정적 탐지 (ID-05) |
| `content:contentind` | P0 | 규칙 | `node tools/check/check_content_independence.js` | 로직 콘텐츠 독립 — 시험 id·과목 키 리터럴 하드코딩 정적 탐지 (DA-15) |
| `content:assets` | P0 | 자산 | `node tools/check/verify_shell_assets.js` | sw.js SHELL_ASSETS/DATA_ASSETS 파일 존재 |
| `content:cards` | P2 | 카드 | `node tools/audit/audit_card_quality.js` | 카드 품질 감사 (짧은 설명·중복·참조 링크) |
| `content:docbundles` | P1 | 문서번들 | `node tools/build/build_doc_bundles.js --check` | docs_md 번들 ↔ 원본 문서 신선도 (build_doc_bundles 필요 감지) |
| `content:refmap` | P1 | 문서신선도 | `node tools/build/build_ref_mapping.js --check` | TEXTBOOK_REFERENCE_MAPPING §2 표 ↔ 교재 📌출처 ref_md 링크 (build:refmap 필요 감지) |
| `content:textbookdocs` | P1 | 문서신선도 | `node tools/check/check_textbook_docs.js` | 교재 갱신 ↔ 판본:textbook 문서 (교재 교체 후 방치 문서 감지) |
| `content:metasections` | P1 | 검색규약 | `node tools/check/check_meta_sections.js` | 메타 섹션 규약 기준선 — reader 미렌더 패턴 미매칭 메타 의심 헤딩 신규 유입 차단 (TS-17) |
| `content:glossarysignal` | P2 | 용어집 | `node tools/check/check_glossary_signal.js` | 저신호 일반명사 기준선 — 자동 추출 단일어 키워드의 정의 카드 노출 감시 (BP-14) |
| `content:docpaths` | P1 | 문서 | `node tools/check/check_docs_paths.js` | README·AGENTS·docs/*.md 경로 참조 존재 검증 (스테일 탐지) |
| `content:specrefs` | P0 | 추적 | `node tools/check/check_spec_refs.js` | SPEC ID ↔ 코드 @spec 태그 양방향 정합성 (스테일 참조 탐지) |
| `content:trace` | P1 | 추적 | `node tools/build/build_trace_matrix.js --check` | TRACE_MATRIX 입력 해시 신선도 (SPEC·@spec·문서 헤더 변경 시 재생성 강제) |
| `content:unit` | P0 | 테스트 | `node --test tests/unit/**/*.test.js` | 유닛 테스트 (node --test) |
| `content:dom` | P0 | 테스트 | `node node_modules/vitest/vitest.mjs run` | DOM 테스트 (vitest + jsdom) |
| `content:build` | P0 | 빌드 | `npm.cmd run build:data` | build:data — data/ 번들 전체 재생성 (+인용 라인 동기화) |
| `docs:paths` | P1 | 문서 | `node tools/check/check_docs_paths.js` | README·AGENTS·docs/*.md 경로 참조 존재 검증 |
| `docs:ids` | P1 | 문서 | `node tools/check/check_doc_ids.js` | 문서 ID 누락·중복·범위·판본 헤더 검증 |
| `docs:textbook` | P1 | 문서 | `node tools/check/check_textbook_docs.js` | 교재 갱신 ↔ 판본:textbook 문서 신선도 |
| `docs:inventory` | P1 | 문서 | `node tools/check/check_inventory.js` | 디렉토리 구조 정합 (AGENTS·ARCHITECTURE 트리 ↔ 실물) |
| `docs:commands` | P1 | 문서 | `node tools/check/check_npm_commands.js` | npm 명령 정합 (스크립트 ↔ 문서 인용 양방향) |
| `docs:plan` | P1 | 문서 | `node tools/check/check_plan_features.js` | feature-plan 키 ↔ 코드 사용 ↔ 로드맵 정합 |
| `docs:featflags` | P1 | 문서 | `node tools/check/check_feature_flags.js` | exams.json features 키 ↔ 코드 사용 정합 |
| `docs:storage` | P0 | 문서 | `node tools/check/check_storage_access.js` | localStorage 직접 접근 탐지 (storage.js 우회 차단) |
| `docs:seedkeys` | P1 | 문서 | `node tools/check/check_seed_keys.js` | 테스트 시드 키 ↔ GLOBAL_KEYS 스코프 정합 (스코프 시드 무력화 차단) |
| `docs:notes` | P1 | 문서 | `node tools/check/check_release_notes.js` | 릴리스 노트 스키마·버전 해시·APP_VERSION 정합 |
| `docs:teststats` | P1 | 문서 | `node tools/check/check_test_stats.js` | 문서 테스트 수치 ↔ test_stats.json 실측 정합 (스테일 수치 차단 — stats:stamp으로 갱신) |
| `docs:enc` | P1 | 인코딩 | `node tools/check/check_replacement_char.js` | U+FFFD 치환 문자 잔존 — 저장 시 이모지 변조 유입 차단 (replacement_char_baseline.json 단조 감소) |
| `docs:orphans` | P1 | 자산 | `node tools/check/check_orphan_assets.js` | 미참조 자산(고아 자산) 유입 차단 — orphan_assets_baseline.json 예외 명단 |
| `docs:ciparity` | P1 | 문서 | `node tools/check/check_ci_parity.js` | ci.yml 워크플로 ↔ check:ci 프리셋 양방향 정합 |
| `docs:runbooks` | P1 | 문서 | `node tools/check/check_runbook_links.js` | 런북 링크·앵커 정본 도달 검증 + WHEN_THINGS_BREAK 증상 행 커버리지 |
| `docs:binary` | P0 | 자산 | `node tools/check/check_binary.js` | 대형·외부화 대상 바이너리 신규 유입 차단 (참조자료 PDF·500KB+ 바이너리 — DOC-RBK-12 정착 가드) |
| `docs:webp` | P1 | 자산 | `node tools/check/check_webp_only.js` | 배포 이미지 webp 강제 — 서빙 이미지는 .webp만, png/jpg는 마스터(vercelignore)·예외만 |
| `docs:navicons` | P1 | 문서 | `node tools/check/check_nav_icons.js` | 메뉴 아이콘 고유성 — 사이드바·모바일 탭·설정/도움말 영역 기능별 고유 아이콘 강제 |
| `docs:toolslayout` | P0 | 분류 | `node tools/check/check_tools_layout.js` | tools/ 배치 규약 — 감사 도구 audit_*은 tools/audit/ 전용 |
| `docs:cmdref` | P1 | 문서 | `node tools/build/build_command_reference.js --check` | COMMANDS.md 명령 카탈로그 신선도 (스크립트·단계 변경 시 build:commands 필요) |
| `ci:hooks` | P2 | 로컬 | `npm.cmd run check:hooks` | Git 훅 설치 여부 (미설치 시 로컬 게이트 우회 경고) |
| `ci:secrets` | P0 | 보안 | `npm.cmd run check:secrets` | 추적 파일 시크릿 패턴 스캔 |
| `env` | P2 | 보안 | `node tools/check/check_env.js` | .env 시크릿 신선도 — 만료 토큰·미선언·빈 키 탐지 (.env 부재 시 스킵 — CI에는 .env 없음, LOCAL_ONLY) |
| `lint` | P0 | 품질 | `npm.cmd run lint` | ESLint — 에러 0 필수 |
| `types` | P0 | 품질 | `npm.cmd run check:types` | tsc --noEmit (jsconfig checkJs — JSDoc 타입 진단) |
| `ci:imports` | P0 | 품질 | `npm.cmd run check:imports` | ES 모듈 import/export 교차 검증 |
| `supabase` | P1 | 외부 | `npm.cmd run check:supabase` | Supabase 스키마 적용 상태 — schema.sql 선언 테이블의 프로덕션 존재 프로브 (미적용 시 차단, 네트워크 불가 시 경고+통과) |
| `rls` | P1 | 보안 | `npm.cmd run check:rls` | RLS 익명 침투 검증 — anon 키로 select 유출·insert·스푸핑·RPC 차단 실측 (허용 시 차단, 네트워크 불가 시 경고+통과) |
| `ci:posind` | P0 | 규칙 | `npm.cmd run check:posind` | 교재 좌표 비의존 — 위치 기반 식별자·저장 키 정적 탐지 (ID-05) |
| `ci:contentind` | P0 | 규칙 | `npm.cmd run check:contentind` | 로직 콘텐츠 독립 — 시험 id·과목 키 리터럴 하드코딩 정적 탐지 (DA-15) |
| `ci:docs` | P1 | 문서 | `npm.cmd run check:docs` | 문서 정합 묶음 (docs 프리셋 위임) |
| `domainmap` | P0 | 분류 | `npm.cmd run check:domainmap` | 파일 계층 분류 강제 (domain-map.json) |
| `uitext` | P1 | 문서 | `npm.cmd run check:uitext` | UI 텍스트 커버리지 (data-uitext ↔ manifest.uiText) |
| `ci:mobilesafe` | P0 | 규약 | `npm.cmd run check:mobilesafe` | 모바일 잘림 규약 (다이얼로그·버튼 행 줄바꿈) |
| `ci:escape` | P0 | 규약 | `npm.cmd run check:escape` | HTML 이스케이프 싱크 규약 (innerHTML 미이스케이프 보간) |
| `ci:uistyle` | P0 | 규약 | `npm.cmd run check:uistyle` | UI 스타일 규약 — 인라인 style·JS display 조작·인라인 핸들러·네이티브 다이얼로그 금지 |
| `ci:contrast` | P1 | 규약 | `node tools/check/check_contrast.js` | 테마 토큰 WCAG 대비 — 텍스트용 시맨틱 색 ↔ 배경 (AA 4.5·의미 전달 3.0) |
| `ci:zlayer` | P0 | 규약 | `npm.cmd run check:zlayer` | z-index 계층 계약 — 앱 크롬 대역 보호·금지 대역 차단 (UX-SET-06) |
| `ci:filenames` | P0 | 규약 | `npm.cmd run check:filenames` | 파일명 대소문자 규약 — 영역별 kebab/snake/SCREAMING 패턴, 신규 위반 차단 (CODE_CONVENTIONS §2.1) |
| `ci:docsync` | P1 | 문서 | `node tools/check/check_doc_sync.js --ref origin/main` | 소스 변경 시 문서 갱신 강제 |
| `ci:testfirst` | P0 | 테스트 | `node tools/check/check_test_first.js --ref origin/main` | 로직 변경 시 테스트 동반 강제 |
| `ci:specrefs` | P0 | 추적 | `npm.cmd run check:specrefs` | SPEC↔@spec 스테일 참조 + 테스트 갭 기준선 |
| `ci:trace` | P1 | 추적 | `npm.cmd run check:trace` | TRACE_MATRIX 입력 해시 신선도 |
| `ci:html` | P1 | 빌드 | `npm.cmd run check:html` | index.html 조립 신선도 (파셜 편집 시 build:html 필요) |
| `ci:content` | P1 | 콘텐츠 | `node tools/check/check_content.js --content-only --quick` | 콘텐츠 추적 단계 전체 (content 프리셋 위임) |
| `ci:unit` | P0 | 테스트 | `npm.cmd test` | 유닛 테스트 (node --test) |
| `ci:assets` | P0 | 자산 | `npm.cmd run verify:assets` | SHELL_ASSETS/DATA_ASSETS 파일 존재 |
| `vendor` | P0 | 자산 | `npm.cmd run check:vendor` | vendor 매니페스트 ↔ 파일 해시·버전 정합 (BP-13, 무단 교체·미등록 파일 차단) |
| `ci:parser` | P0 | 파서 | `npm.cmd run check:parser` | 빌드 파서 ↔ 런타임 파서 등가성 |
| `ci:perf` | P0 | 성능 | `npm.cmd run check:perf` | SHELL_ASSETS 크기 예산 상한 |
| `ci:studyq` | P2 | 품질 | `node tools/audit/audit_study_quality.js --check` | 학습 품질 감사 — 스마트학습 배분·맞춤학습 추천 규칙 정합 (기준선 회귀 게이트) |
| `ci:diffcov` | P0 | 테스트 | `node tools/check/check_diff_coverage.js` | 변경 라인 차등 커버리지 — diff 헝크 브랜치 ≥80%·신규 ≥85% (리포트 부재 시 스킵) |
| `refs:layout` | P1 | 참조 | `node tools/check/check_reflayout.js` | 참조자료 4계층 정합성 — 전 시험 (PDF 폴더↔ref_md↔references.json↔규칙) |
| `refs:subjects` | P2 | 참조 | `node tools/check/check_ref_subjects.js` | ref_md 인용 득표 ↔ 과목 귀속 교차 검증 |
| `refs:fresh` | P1 | 참조 | `node tools/check/check_ref_freshness.js` | 참조자료 PDF 해시 ↔ ref_md 신선도 (PDF 교체 감지) |
| `refs:lines` | P1 | 참조 | `node tools/check/check_ref_lines.js` | 교재 (LNN)/📌출처 조문 ↔ ref_md 실제 내용 |
| `refs:format` | P1 | 참조 | `node tools/check/check_refmd_format.js` | ref_md 추출 잔재·평탄화 형식 — lone CR·제어문자·PUA·초장문 줄 차단 |
| `refs:merge` | P2 | 참조 | `node tools/check/check_refmerge.js` | ref_md joinWraps 병합 품질 감사 |

## 3. npm 스크립트 전체 (package.json)

### `build:*` — 22개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run build:data` | `npm run sync:citations && npm run build:exams-list && npm run build:pdf-registry && npm run build:keyword-index && node tools/build/build_all_data.js && npm run build:story && npm run build:study-md && npm run build:exam-bundles && npm run build:audio-manifest && npm run build:question-chapters && npm run build:id-migration && npm run build:noticediff` | build:data — data/ 번들 전체 재생성 (+인용 라인 동기화) |
| `npm run build:noticediff` | `node tools/build/build_notice_diff.js` | 참조 문서 개정 조문 diff 생성 (FO-24 연장) |
| `npm run build:question-chapters` | `node tools/build/build_question_chapters.js` | file:// 호환) |
| `npm run build:id-migration` | `node tools/build/build_id_migration.js` | 콘텐츠 갱신으로 바뀐 카드/퀴즈 ID의 이관 맵 생성 |
| `npm run build:exams-list` | `node tools/build/build_exams_list.js` | content/exams.json → data/exams.js 번들 생성 |
| `npm run build:pdf-registry` | `node tools/build/build_pdf_registry.js` | 골격 시험 허용) */ |
| `npm run build:keyword-index` | `node tools/build/build_keyword_index.js` | 인라인 참조 링크는 콘텐츠 존재로 발화) |
| `npm run build:exam-bundles` | `node tools/build/build_exam_bundles.js` | 문제은행 MD → {dataRoot}/exams_md/<stem>.js 번들 생성 |
| `npm run build:audio-manifest` | `node tools/build/build_audio_manifest.js` | manifest 챕터 수 ↔ 스캔 MP3 수 대조, 불일치 경고) |
| `npm run build:derived` | `npm run build:html && npm run build:landing && npm run build:data && npm run build:drills && node tools/build/build_doc_bundles.js && npm run build:trace && npm run stats:stamp && npm run build:commands` | 앱 공용), content/exams/<id>/docs/*.md (디렉터리 스캔 — 시험별) |
| `npm run build:derived:full` | `npm run build:derived && npm run build:embeddings` | 체인: build:derived → build:embeddings |
| `npm run build:embeddings` | `node tools/build/build_embeddings.js` | 콘텐츠 문장 임베딩 사전 계산 (DOC-DSN-18 PoC) |
| `npm run build:html` | `node tools/build/build_html.js` | content/exams.json의 default(또는 첫) 시험의 |
| `npm run build:landing` | `node tools/build/build_landing.js` | 시험 id 리터럴 없이 contentRoot에서 유도): |
| `npm run build:trace` | `node tools/build/build_trace_matrix.js` | TRACE MATRIX 자동 생성 |
| `npm run build:drills` | `node tools/build/build_ox_drills.js && node tools/build/build_combo_drills.js` | "이 보기의 내용이 옳은가?"  명제형 선지(문장형) |
| `npm run build:study-md` | `node tools/build/build_study_md_bundle.js` | manifest JSON (~3KB) |
| `npm run build:story` | `node tools/build/build_story_textbooks.js` | 표준형 + 서사 패치 → _이야기형.md 생성 |
| `npm run build:refmap` | `node tools/build/build_ref_mapping.js` | 교재는 content/exams/<id>/교재/ 의 *_표준형.md) |
| `npm run build:ogimage` | `node tools/build/build_og_image.js` | 1200×630 OG 공유 미리보기 이미지 생성 |
| `npm run build:icons` | `node tools/build/build_icons.js` | 앱 아이콘 파생 생성·검증 파이프라인 |
| `npm run build:commands` | `node tools/build/build_command_reference.js` | docs/dev/reference/COMMANDS.md 생성기 |

### `sync:*` — 2개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run sync:citations` | `node tools/sync/sync_citation_lines.js` |  |
| `npm run sync:vendor` | `node tools/sync/sync_vendor.js` | vendor/ npm 패키지 갱신 (BP-13) |

### `postbuild:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run postbuild:data` | `npm run check:parser` | 체인: check:parser |

### `check:*` — 73개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run check:parser` | `node tools/check/check_parser_parity.js` | 빌드 파서 ↔ 런타임 파서 등가성 |
| `npm run check:imports` | `node tools/check/check_imports.js` | ES 모듈 import/export 교차 검증 |
| `npm run check:posind` | `node tools/check/check_position_independence.js` | 교재 좌표 비의존 — 위치 기반 식별자·저장 키 정적 탐지 (ID-05) |
| `npm run check:contentind` | `node tools/check/check_content_independence.js` | 로직 콘텐츠 독립 — 시험 id·과목 키 리터럴 하드코딩 정적 탐지 (DA-15) |
| `npm run check:combo` | `node tools/check/check_combo_pilot.js` | 스키마 검증 + 정답 유일성 + perStatement 채점 경로 확인 |
| `npm run check:refsubjects` | `node tools/check/check_ref_subjects.js` | ref_md 문서의 실제 인용 과목 vs docSubjectRules(references.json) 귀속 교차 검증 |
| `npm run check:refmerge` | `node tools/check/check_refmerge.js` | ref_md joinWraps 병합 품질 감사 |
| `npm run check:refs` | `node tools/check/run.js --preset refs` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:fresh` | `node tools/check/run.js --preset freshness` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:reflayout` | `node tools/check/check_reflayout.js` | 참조자료 4계층 정합성 검증 (전 시험 순회) |
| `npm run check:reffresh` | `node tools/check/check_ref_freshness.js` | 참조자료 PDF ↔ ref_md 변환본 신선도 검증 |
| `npm run check:reflines` | `node tools/check/check_ref_lines.js` | 교재/문제은행 본문의 (LNN) 참조 라인 검증 |
| `npm run check:numbering` | `node tools/check/check_numbering.js` | 교재 번호체계 정합성 게이트 |
| `npm run check:drillfresh` | `node tools/check/check_drill_freshness.js` | 드릴 번들 ↔ 문제은행 번들 신선도 검증 |
| `npm run check:embfresh` | `node tools/check/check_emb_freshness.js` | 임베딩 번들 ↔ 소비 원본 번들 신선도 검증 (SEM-05) |
| `npm run check:vendor` | `node tools/check/check_vendor.js` | vendor 매니페스트 ↔ 파일 해시·버전 정합 (BP-13, 무단 교체·미등록 파일 차단) |
| `npm run check:answers` | `node tools/check/check_answer_overlap.js` | 문제 정답 ↔ 인용 근거 구절 의미적 지지 검증 |
| `npm run check:docbundles` | `node tools/build/build_doc_bundles.js --check` | 앱 공용), content/exams/<id>/docs/*.md (디렉터리 스캔 — 시험별) |
| `npm run check:datafresh` | `node tools/check/check_data_freshness.js` | 생성물(data/ 번들·keyword-index·sw.js 자산 목록 등)과 |
| `npm run check:hooks` | `node tools/check/check_hooks.js` | Git 훅 설치 여부 (미설치 시 로컬 게이트 우회 경고) |
| `npm run check:lawurls` | `node tools/check/check_law_urls.js` | law.go.kr 한글주소 유효성 전수 검증 |
| `npm run check:linklint` | `node tools/check/check_link_lint.js` | 렌더 출력 기준 사용자 노출 링크 린트 |
| `npm run check:docs` | `node tools/check/run.js --preset docs` | 문서 정합 묶음 (docs 프리셋 위임) |
| `npm run check:textbookdocs` | `node tools/check/check_textbook_docs.js` | 교재 갱신 ↔ `판본: textbook` 문서 신선도 |
| `npm run check:metasections` | `node tools/check/check_meta_sections.js` | 메타 섹션 규약 기준선 래칫 (TS-17) |
| `npm run check:glossarysignal` | `node tools/check/check_glossary_signal.js` | 용어집 저신호 일반명사 카드 노출 감시 (BP-14 후속) |
| `npm run check:domainmap` | `node tools/check/check_domain_map.js` | 파일 계층 분류 강제 (domain-map.json) |
| `npm run check:html` | `node tools/build/build_html.js --check` | index.html 조립 신선도 (파셜 편집 시 build:html 필요) |
| `npm run check:landing` | `node tools/build/build_landing.js --check` | 시험 id 리터럴 없이 contentRoot에서 유도): |
| `npm run check:docsync` | `node tools/check/check_doc_sync.js` | 소스 변경 시 관련 문서 갱신 강제 게이트 |
| `npm run check:testfirst` | `node tools/check/check_test_first.js` | 소스 변경 시 테스트 동반 강제 게이트 (Docs-First) |
| `npm run check:webp` | `node tools/check/check_webp_only.js` | 서빙 이미지는 .webp만 허용 |
| `npm run check:navicons` | `node tools/check/check_nav_icons.js` | 사이드바(nav-menu)·모바일 탭(mobile-tab-bar)· |
| `npm run check:inventory` | `node tools/check/check_inventory.js` | AGENTS.md 디렉토리 구조 트리 ↔ 실제 파일시스템 정합성 |
| `npm run check:commands` | `node tools/check/check_npm_commands.js` | 문서의 npm 명령 인용 ↔ package.json scripts 정합성 |
| `npm run check:plan` | `node tools/check/check_plan_features.js` | feature-plan.json 키 ↔ 코드 사용 ↔ 로드맵 문서 정합성 |
| `npm run check:featflags` | `node tools/check/check_feature_flags.js` | exams.json features 플래그 ↔ 코드 사용 정합성 (도메인 축) |
| `npm run check:storage` | `node tools/check/check_storage_access.js` | localStorage 직접 접근 탐지 |
| `npm run check:ciparity` | `node tools/check/check_ci_parity.js` | .github/workflows/ci.yml ↔ package.json check:ci 정합성 |
| `npm run check:secrets` | `node tools/check/check_secrets.js` | 추적 파일 시크릿 패턴 스캔 |
| `npm run check:env` | `node tools/check/check_env.js` | .env 로컬 시크릿 신선도 게이트 |
| `npm run check:supabase` | `node tools/check/check_supabase_schema.js` | Supabase 스키마 적용 상태 — schema.sql 선언 테이블의 프로덕션 존재 프로브 (미적용 시 차단, 네트워크 불가 시 경고+통과) |
| `npm run check:rls` | `node tools/check/rls_probe.js` | RLS 익명 침투 검증 — anon 키로 select 유출·insert·스푸핑·RPC 차단 실측 (허용 시 차단, 네트워크 불가 시 경고+통과) |
| `npm run check:enc` | `node tools/check/check_replacement_char.js` | U+FFFD 치환 문자 잔존 게이트 |
| `npm run check:orphans` | `node tools/check/check_orphan_assets.js` | 고아 자산(미참조 파일) 게이트 |
| `npm run check:notes` | `node tools/check/check_release_notes.js` | data/release-notes.json ↔ git 이력·버전 스탬프 정합성 |
| `npm run check:specrefs` | `node tools/check/check_spec_refs.js` | SPEC↔@spec 스테일 참조 + 테스트 갭 기준선 |
| `npm run check:perf` | `node tools/check/check_perf_budget.js` | SHELL_ASSETS 크기 예산 상한 |
| `npm run check:trace` | `node tools/build/build_trace_matrix.js --check` | TRACE_MATRIX 입력 해시 신선도 |
| `npm run check:types` | `tsc -p jsconfig.json --noEmit` | tsc --noEmit (jsconfig checkJs — JSDoc 타입 진단) |
| `npm run check:adlint` | `node tools/check/check_adlint_coverage.js` | 광고 점검 사전 커버리지 감사 (FO-68) |
| `npm run check:binary` | `node tools/check/check_binary.js` | 대형·외부화 대상 바이너리 신규 유입 게이트 |
| `npm run check:manifest` | `node tools/check/check_manifest.js` | manifest 선언 ↔ 실제 파일/자산 정합성 검증 |
| `npm run check:content` | `node tools/check/run.js --preset content` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:all` | `node tools/check/run.js --preset all` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:all:quick` | `node tools/check/run.js --preset all --quick` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:all:e2e` | `node tools/check/run.js --preset all && npm run test:e2e` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:ci` | `node tools/check/run.js --preset ci` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:audit` | `node tools/check/run.js --preset audit` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run check:onboard` | `node tools/check/check_exam_onboard.js` | 시험 팩 온보딩·승격 진단 |
| `npm run check:uitext` | `node tools/check/check_uitext.js` | UI 텍스트 커버리지 (data-uitext ↔ manifest.uiText) |
| `npm run check:teststats` | `node tools/check/check_test_stats.js` | 문서의 테스트 수치 인용 ↔ 실측 정합 게이트 |
| `npm run check:mobilesafe` | `node tools/check/check_mobile_safe.js` | 모바일 잘림 규약 (다이얼로그·버튼 행 줄바꿈) |
| `npm run check:escape` | `node tools/check/check_html_escape.js` | HTML 이스케이프 싱크 규약 (innerHTML 미이스케이프 보간) |
| `npm run check:uistyle` | `node tools/check/check_ui_style.js` | UI 스타일 규약 — 인라인 style·JS display 조작·인라인 핸들러·네이티브 다이얼로그 금지 |
| `npm run check:contrast` | `node tools/check/check_contrast.js` | CSS 테마 토큰 WCAG 대비 감사 |
| `npm run check:zlayer` | `node tools/check/check_zlayer.js` | z-index 계층 계약 — 앱 크롬 대역 보호·금지 대역 차단 (UX-SET-06) |
| `npm run check:diffcov` | `node tools/check/check_diff_coverage.js` | 변경 라인 차등 커버리지 게이트 (diff coverage) |
| `npm run check:seedkeys` | `node tools/check/check_seed_keys.js` | 테스트 시드 저장 키 ↔ 스토리지 스코프 정합 정적 검사 |
| `npm run check:runbooks` | `node tools/check/check_runbook_links.js` | 런북 정본 도달 검증 (런북 커버리지 측정, §2.5) |
| `npm run check:filenames` | `node tools/check/check_filenames.js` | 파일명 대소문자 규약 — 영역별 kebab/snake/SCREAMING 패턴, 신규 위반 차단 (CODE_CONVENTIONS §2.1) |
| `npm run check:icons` | `node tools/build/build_icons.js --check` | 앱 아이콘 파생 생성·검증 파이프라인 |
| `npm run check:scenario` | `node tools/check/check_scenario_items.js` | 4단계 선택형 시나리오 문항 검증 |

### `fix:*` — 2개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run fix:quotes` | `node tools/sync/fix_answer_quotes.js` | 부실 인용문 자동 보강 |
| `npm run fix:citations` | `node tools/sync/fix_citation_targets.js` | 정답 미지지 문항의 인용 위치 자동 교정 |

### 기타 — 9개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run check` | `node tools/check/run.js` | 통합 검증 실행기 (모든 check 프리셋의 단일 진입점) |
| `npm run lint` | `eslint src/ tools/ tests/ sw.js serve.js --max-warnings 0 --cache --cache-location node_modules/.cache/eslint` | ESLint — 에러 0 필수 |
| `npm run sbom` | `npm sbom --sbom-format spdx > sbom.spdx.json` |  |
| `npm run test` | `node --test "tests/unit/**/*.test.js"` |  |
| `npm run coverage` | `vitest run --coverage` |  |
| `npm run serve` | `node serve.js` |  |
| `npm run doctor` | `node tools/check/env_doctor.js` | 개발환경 기능별 가용성 진단 리포트 |
| `npm run deploy` | `node tools/deploy/deploy.js` | 안전한 Vercel 배포 가드 |
| `npm run mutate` | `stryker run` |  |

### `schema:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run schema:apply` | `node tools/supabase/apply_schema.js` | tools/supabase/schema.sql을 프로덕션에 Management API로 적용 |

### `hooks:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run hooks:install` | `git config core.hooksPath .githooks && git config merge.stamps.driver "node tools/merge/merge_stamps.js %O %A %B %P" && git config merge.stamps.name "PassOK release-stamp merger" && echo 'pre-commit/pre-push 훅 + merge.stamps 드라이버 활성화됨 (.githooks, .gitattributes)'` | 배포 스탬프 파일 전용 git 머지 드라이버 |

### `convert:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run convert:refs` | `python ref-pipeline/convert.py` | 참조자료 PDF → ref_md 스테이징 변환 래퍼 (독립 실행) |

### `fetch:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run fetch:refpdfs` | `node tools/sync/fetch_ref_pdfs.js` | 외부 호스팅 참조자료 PDF 복원 (DOC-RBK-12) |

### `verify:*` — 2개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run verify:refs` | `python ref-pipeline/convert.py --verify` | 참조자료 PDF → ref_md 스테이징 변환 래퍼 (독립 실행) |
| `npm run verify:assets` | `node tools/check/verify_shell_assets.js` | SHELL_ASSETS/DATA_ASSETS 파일 존재 |

### `stamp:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run stamp:sw` | `node tools/build/stamp_sw_version.js` | 배포 머신 |

### `notes:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run notes:draft` | `node tools/build/stamp_release_notes.js --draft` | 직접 편집 금지) |

### `test:*` — 4개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run test:dom` | `vitest run` |  |
| `npm run test:all` | `node --test "tests/unit/**/*.test.js" && node tools/check/check_parser_parity.js && node tools/check/check_imports.js && vitest run` |  |
| `npm run test:e2e` | `playwright test` |  |
| `npm run test:watch` | `node --test --watch "tests/unit/**/*.test.js"` |  |

### `coverage:*` — 3개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run coverage:unit` | `c8 --reporter=json --report-dir=coverage-unit --include "src/**/*.js" node --test "tests/unit/**/*.test.js"` |  |
| `npm run coverage:all` | `npm run coverage && npm run coverage:unit && node tools/check/coverage_merge.js --check` | 유닛(node:test + c8)과 DOM(vitest) 커버리지 병합 |
| `npm run coverage:gaps` | `node tools/check/coverage_gaps.js` | 분기 커버리지 하위 파일 리포트 (표적 보강용) |

### `ratchet:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run ratchet:coverage` | `node tools/check/coverage_merge.js --ratchet` | 유닛(node:test + c8)과 DOM(vitest) 커버리지 병합 |

### `audit:*` — 6개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run audit:cards` | `node tools/audit/audit_card_quality.js` | 콘텐츠 품질 자동 감사 도구 |
| `npm run audit:combo` | `node tools/audit/audit_combo.js` | 복수정답형 생성 번들 품질 감사 |
| `npm run audit:study` | `node tools/audit/audit_study_quality.js` | 스마트학습·맞춤학습 품질 감사 |
| `npm run audit:tools` | `node tools/audit/audit_tool_usage.js` | tools/ 도달성·단계 생존 감사 (advisory 전용, 종료 0) |
| `npm run audit:gates` | `node tools/audit/audit_gate_utility.js` | P2(감시·감사) 단계 효용 감사 (advisory 전용, 종료 0) |
| `npm run audit:syllabus` | `node tools/audit/audit_syllabus_alignment.js` | 교재 과목·챕터 구조 ↔ 출제기준 문서 정합성 감사 |

### `ci:*` — 3개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run ci:watch` | `node tools/check/ci_watch.js` | CI 감시 래퍼: HEAD의 최신 CI run을 감시하고, 실패 시 실패 잡 로그를 |
| `npm run ci:diagnose` | `node tools/ci/ci_diagnose.js` | CI 실패 위치 진단 (npm run ci:diagnose [sha] [--specs]) |
| `npm run ci:retrigger` | `node tools/ci/ci_retrigger.js` | CI 플레이크 재실행 트리거 (npm run ci:retrigger) |

### `stats:*` — 1개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run stats:stamp` | `node tools/check/check_test_stats.js --stamp` | 문서의 테스트 수치 인용 ↔ 실측 정합 게이트 |

### `scaffold:*` — 2개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run scaffold:exam` | `node tools/build/scaffold_exam.js` | 신규 시험 팩 스캐폴더 (Phase B, MULTI_EXAM_DB_DESIGN §7) |
| `npm run scaffold:chapter` | `node tools/build/scaffold_chapter.js` | 참조자료→교재 챕터 스캐폴더 (CS-11 도출 계약) |

### `report:*` — 7개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run report:errors` | `node tools/check/error_report.js` | client_errors 오류율 리포트 (PROJECT_METRICS §2.6 측정 경로) |
| `npm run report:funnel` | `node tools/check/funnel_report.js` | usage_events 과업 완주율 리포트 (PROJECT_METRICS §2.6 측정 경로) |
| `npm run report:feedback` | `node tools/check/feedback_report.js` | 피드백 인박스 조회 리포트 (ADMIN_DESIGN.md §5 Phase 1) |
| `npm run report:dashboard` | `node tools/check/dashboard_report.js` | 로컬 HTML 운영 대시보드 (ADMIN_DESIGN.md §5 Phase 1.5) |
| `npm run report:user` | `node tools/check/user_report.js` | 사용자 조회 리포트 (ADMIN_DESIGN.md §5 Phase 1) |
| `npm run report:glossary` | `node tools/build/extract_glossary_candidates.js` | 따옴표 정의 + 항목 기호 정의 + 교재 헤딩 정의 |
| `npm run report:pro` | `node tools/check/pro_report.js` | Pro 현황 리포트 (AD-09) |

### `admin:*` — 3개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run admin:grant-pro` | `node tools/check/grant_pro.js` | Pro 플랜 부여·회수 (ADMIN_DESIGN.md §5 Phase 1) |
| `npm run admin:issue-code` | `node tools/check/issue_pro_code.js` | 라이선스 코드 발급 CLI (PAYMENT_PILOT_DESIGN §3, P-OPS-1) |
| `npm run admin:discord` | `node tools/deploy/register_admin_bot.js` | Discord 슬래시 명령 일괄 등록 (AD-11) |

### `ai:*` — 18개

| 스크립트 | 실행 내용 | 설명 |
|---|---|---|
| `npm run ai:explain` | `node tools/ai/ai_explain.js` | 해설 누락·부실 문항 스캔 → 해설 초안 생성 |
| `npm run ai:draft` | `node tools/ai/ai_draft_questions.js` | 교재 청크 → `### Q{n}` 문제 초안 생성 |
| `npm run ai:distractors` | `node tools/ai/ai_distractors.js` | 허용 정답 변형 + 오답 선지 보강 제안 |
| `npm run ai:dupcheck` | `node tools/ai/ai_dupcheck.js` | 초안 ↔ 기존 문항 유사도 상한 검사 (중복 출제 방지) |
| `npm run ai:statements` | `node tools/ai/ai_statements.js` | 복수정답형 진술 설계: 참 진술의 거짓 반전 변형 + 재조합 후보 |
| `npm run ai:tag` | `node tools/ai/ai_tag.js` | STANDARD_TAGS·난이도·conceptId 자동 제안 |
| `npm run ai:lint` | `node tools/ai/ai_lint.js` | 발문 품질 검수 (기계 게이트가 못 잡는 영역) |
| `npm run ai:coverage` | `node tools/ai/ai_coverage.js` | 출제 커버리지 갭 분석 |
| `npm run ai:stale` | `node tools/ai/ai_stale_scan.js` | 법령 개정 영향 분석 (ref_md 변경 ↔ 인용 문항 재판정) |
| `npm run ai:apply` | `node tools/ai/ai_apply.js` | 리뷰된 해설 초안을 문제은행 정답 블록에 편입 |
| `npm run ai:stmtfb` | `node tools/ai/ai_stmt_feedback.js` | 진술 단위 오답 피드백 초안 생성 + 편입 |
| `npm run ai:seedcheck` | `node tools/ai/ai_seed_eval.js` | 콜드스타트 난이도 시딩 오프라인 검증 (AI-32) |
| `npm run ai:textbook` | `node tools/ai/ai_textbook.js` | ref_md 청크 → 교재 본문 초안 생성 (CS-11 도출 계약의 AI 단계) |
| `npm run ai:story` | `node tools/ai/ai_story.js` | 표준형 story:slot 미작성분 스캔 → 서사 패치(@insert) 초안 생성 |
| `npm run ai:cards` | `node tools/ai/ai_cards.js` | 플래시카드 암기팁 초안 생성 → 피드백/card_tip.json 오버레이 반영 |
| `npm run ai:glossary` | `node tools/ai/ai_glossary.js` | 용어집 부실 정의 보강 초안 생성 → glossary/subjectN.json 병합 |
| `npm run ai:adphrases` | `node tools/ai/ai_adphrases.js` | 광고문구 사전 확장 후보 초안 생성 (cosmetic 전용 — ad-lint.js 사전) |
| `npm run ai:adoption` | `node tools/ai/ai_adoption.js` | AI 배치 채택률 리포트 |

---

※ 이 파일은 생성물이다. 스크립트·단계 추가 시 package.json / steps.js를 수정한 뒤 `npm run build:commands`로 재생성할 것.
