/**
 * steps.js — 검증 단계 레지스트리 (run.js 실행기 · check_ci_parity 프리셋 확장 공용)
 *
 * 모든 게이트 단계를 이 테이블 한 곳에 선언한다. package.json 스크립트와
 * ci.yml은 프리셋 호출만 남기므로 "명령 문자열 재조합" 중복이 소멸한다.
 *
 * 단계 항목: { id, bin, args, shell, layer, desc, token, content, slow, prio }
 *   token   — ci.yml run: 라인의 비교 토큰 (npm run X → "npm run X", node 스크립트 → 파일명)
 *   content — 콘텐츠 추적 단계 여부 (--content-only 필터 대상)
 *   slow    — --quick 시 생략되는 느린 단계 (DOM 테스트 등)
 *   prio    — 우선순위 티어 (기본 p1):
 *     p0 코어 불변식 — 코드 결함·보안·아키텍처 규칙 위반 (실패 = 반드시 차단)
 *     p1 정합·신선도 — 생성물 drift·문서/콘텐츠 정합 (기본값 — 차단하되 재생성으로 해소)
 *     p2 감시·감사 — 기준선 회귀·정보 단계 (audit 프리셋에서 수집 — 비차단 리포트)
 *
 * 신규 검증 추가 시: nodeStep/npmStep으로 등록 → 원하는 프리셋 배열에 편입.
 */

// @spec none (검증 레지스트리)
const path = require('path');

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function nodeStep(id, script, layer, desc, { args = [], content = false, slow = false, token, diffScoped = false, serial = false, inProcess = false, prio = 'p1' } = {}) {
  return { id, bin: 'node', args: [script, ...args], shell: false, layer, desc,
    token: token ?? path.basename(script), content, slow, diffScoped, serial, prio,
    // run({args,cwd}) → {status,output} 계약을 export하는 체커는 인프로세스 실행
    ...(inProcess ? { inProcess: script } : {}) };
}

function npmStep(id, script, layer, desc, opts = {}) {
  const isTest = script === 'test';
  return { id, bin: NPM, args: isTest ? ['test'] : ['run', script], shell: true, layer, desc,
    token: isTest ? 'npm test' : `npm run ${script}`, content: false, slow: false, prio: 'p1', ...opts };
}

// ── 기초 품질 단계 (all·ci 프리셋 공용) ────────────────────────────────
const STEP_LINT = npmStep('lint', 'lint', '품질', 'ESLint — 에러 0 필수', { prio: 'p0' });
const STEP_TYPES = npmStep('types', 'check:types', '품질', 'tsc --noEmit (jsconfig checkJs — JSDoc 타입 진단)', { prio: 'p0' });
const STEP_HTML = nodeStep('html', 'tools/build/build_html.js', '빌드', 'index.html 조립 신선도 (파셜 편집 시 build:html 필요)', { args: ['--check'] });
const STEP_LANDING = nodeStep('landing', 'tools/build/build_landing.js', '빌드', 'landing.html 조립 신선도 (템플릿·exams.json 편집 시 build:landing 필요)', { args: ['--check'] });
const STEP_DOMAINMAP = npmStep('domainmap', 'check:domainmap', '분류', '파일 계층 분류 강제 (domain-map.json)', { prio: 'p0' });
const STEP_VENDOR = npmStep('vendor', 'check:vendor', '자산', 'vendor 매니페스트 ↔ 파일 해시·버전 정합 (BP-13, 무단 교체·미등록 파일 차단)', { prio: 'p0' });
const STEP_UITEXT = npmStep('uitext', 'check:uitext', '문서', 'UI 텍스트 커버리지 (data-uitext ↔ manifest.uiText)');
const STEP_STUDYQ = nodeStep('studyq', 'tools/check/audit_study_quality.js', '품질', '학습 품질 감사 — 스마트학습 배분·맞춤학습 추천 규칙 정합 (기준선 회귀 게이트)', { args: ['--check'], prio: 'p2' });
const STEP_ENV = nodeStep('env', 'tools/check/check_env.js', '보안', '.env 시크릿 신선도 — 만료 토큰·미선언·빈 키 탐지 (.env 부재 시 스킵 — CI에는 .env 없음, LOCAL_ONLY)', { prio: 'p2' });
const STEP_SUPABASE = npmStep('supabase', 'check:supabase', '외부', 'Supabase 스키마 적용 상태 — schema.sql 선언 테이블의 프로덕션 존재 프로브 (미적용 시 차단, 네트워크 불가 시 경고+통과)', { prio: 'p1' });
const STEP_RLS = npmStep('rls', 'check:rls', '보안', 'RLS 익명 침투 검증 — anon 키로 select 유출·insert·스푸핑·RPC 차단 실측 (허용 시 차단, 네트워크 불가 시 경고+통과)', { prio: 'p1' });

// ── 문서 정합 묶음 (check:docs → docs 프리셋) ──────────────────────────
const DOCS_STEPS = [
  nodeStep('docs:paths', 'tools/check/check_docs_paths.js', '문서', 'README·AGENTS·docs/*.md 경로 참조 존재 검증', { diffScoped: true }),
  nodeStep('docs:ids', 'tools/check/check_doc_ids.js', '문서', '문서 ID 누락·중복·범위·판본 헤더 검증'),
  nodeStep('docs:textbook', 'tools/check/check_textbook_docs.js', '문서', '교재 갱신 ↔ 판본:textbook 문서 신선도'),
  nodeStep('docs:inventory', 'tools/check/check_inventory.js', '문서', '디렉토리 구조 정합 (AGENTS·ARCHITECTURE 트리 ↔ 실물)'),
  nodeStep('docs:commands', 'tools/check/check_npm_commands.js', '문서', 'npm 명령 정합 (스크립트 ↔ 문서 인용 양방향)'),
  nodeStep('docs:plan', 'tools/check/check_plan_features.js', '문서', 'feature-plan 키 ↔ 코드 사용 ↔ 로드맵 정합'),
  nodeStep('docs:featflags', 'tools/check/check_feature_flags.js', '문서', 'exams.json features 키 ↔ 코드 사용 정합'),
  nodeStep('docs:storage', 'tools/check/check_storage_access.js', '문서', 'localStorage 직접 접근 탐지 (storage.js 우회 차단)', { diffScoped: true, prio: 'p0' }),
  nodeStep('docs:seedkeys', 'tools/check/check_seed_keys.js', '문서', '테스트 시드 키 ↔ GLOBAL_KEYS 스코프 정합 (스코프 시드 무력화 차단)'),
  nodeStep('docs:notes', 'tools/check/check_release_notes.js', '문서', '릴리스 노트 스키마·버전 해시·APP_VERSION 정합'),
  nodeStep('docs:teststats', 'tools/check/check_test_stats.js', '문서', '문서 테스트 수치 ↔ test_stats.json 실측 정합 (스테일 수치 차단 — stats:stamp으로 갱신)'),
  nodeStep('docs:enc', 'tools/check/check_replacement_char.js', '인코딩', 'U+FFFD 치환 문자 잔존 — 저장 시 이모지 변조 유입 차단 (replacement_char_baseline.json 단조 감소)', { diffScoped: true }),
  nodeStep('docs:orphans', 'tools/check/check_orphan_assets.js', '자산', '미참조 자산(고아 자산) 유입 차단 — orphan_assets_baseline.json 예외 명단'),
  nodeStep('docs:ciparity', 'tools/check/check_ci_parity.js', '문서', 'ci.yml 워크플로 ↔ check:ci 프리셋 양방향 정합'),
  nodeStep('docs:runbooks', 'tools/check/check_runbook_links.js', '문서', '런북 링크·앵커 정본 도달 검증 + WHEN_THINGS_BREAK 증상 행 커버리지'),
  nodeStep('docs:binary', 'tools/check/check_binary.js', '자산', '대형·외부화 대상 바이너리 신규 유입 차단 (참조자료 PDF·500KB+ 바이너리 — DOC-RBK-12 정착 가드)', { diffScoped: true, prio: 'p0' }),
  nodeStep('docs:webp', 'tools/check/check_webp_only.js', '자산', '배포 이미지 webp 강제 — 서빙 이미지는 .webp만, png/jpg는 마스터(vercelignore)·예외만'),
  nodeStep('docs:navicons', 'tools/check/check_nav_icons.js', '문서', '메뉴 아이콘 고유성 — 사이드바·모바일 탭·설정/도움말 영역 기능별 고유 아이콘 강제'),
];

// ── 콘텐츠 의존성 단계 (check:content → content 프리셋) ────────────────
const BUILD_STEP = { id: 'content:build', bin: NPM, args: ['run', 'build:data'], shell: true,
  layer: '빌드', desc: 'build:data — data/ 번들 전체 재생성 (+인용 라인 동기화)', token: 'npm run build:data', content: true, slow: false, serial: true, prio: 'p0' };

const CONTENT_STEPS = [
  nodeStep('content:manifest', 'tools/check/check_manifest.js', '선언', 'manifest 선언 ↔ 파일/과목 자산 정합성', { content: true }),
  nodeStep('content:structure', 'tools/sync/sync_textbook_files.js', '구조', '교재/문제은행 파일 ↔ manifest·sw.js MD_ASSETS 구조 드리프트', { args: ['--check'], content: true }),
  nodeStep('content:citations', 'tools/sync/sync_citation_lines.js', '인용', '문제은행 → 교재 #L라인번호 인용 동기화 상태', { args: ['--check'], content: true }),
  nodeStep('content:numbering', 'tools/check/check_numbering.js', '번호', '교재 십진법 번호체계 — 구식 잔재·연속성·계층·중복 (표준↔이야기 동기화는 경고)', { content: true }),
  nodeStep('content:answers', 'tools/check/check_answer_overlap.js', '인용', '문제 정답 ↔ 인용 근거 구절 의미적 지지 (정답 미지지 기준선 게이트)', { content: true }),
  nodeStep('content:refsubjects', 'tools/check/check_ref_subjects.js', '귀속', 'ref_md 문서의 과목 귀속 vs 실제 인용 득표 (정보 단계 — 불일치는 참고 보고)', { content: true, prio: 'p2' }),
  nodeStep('content:reflayout', 'tools/check/check_reflayout.js', '레이아웃', '참조자료 폴더/레지스트리 정합성', { content: true }),
  nodeStep('content:reffresh', 'tools/check/check_ref_freshness.js', '신선도', '참조자료 PDF 해시 ↔ ref_md 변환본 (PDF 교체 감지)', { content: true }),
  nodeStep('content:reflines', 'tools/check/check_ref_lines.js', '참조라인', '교재/문제은행 (LNN) 참조 라인 ↔ ref_md 실제 내용', { content: true }),
  nodeStep('content:refformat', 'tools/check/check_refmd_format.js', '형식', 'ref_md 추출 잔재·평탄화 형식 — lone CR·제어문자·PUA 글리프·초장문 줄 차단', { content: true }),
  nodeStep('content:drillfresh', 'tools/check/check_drill_freshness.js', '드릴신선도', '드릴 번들 ↔ 문제은행 번들 (build:drills 필요 감지)', { content: true }),
  nodeStep('content:embfresh', 'tools/check/check_emb_freshness.js', '임베딩신선도', '임베딩 manifest.inputs(sha1) ↔ 원본 번들 (build:embeddings 필요 감지 — SEM-05)', { content: true }),
  nodeStep('content:combo', 'tools/check/check_combo_pilot.js', '드릴', '복수정답형(combo) 드릴 데이터 정합성', { content: true }),
  nodeStep('content:id-migration', 'tools/build/build_id_migration.js', 'ID이관', '카드/퀴즈 ID 스냅샷 ↔ 콘텐츠 (build:data 누락·진도 손실 감지)', { args: ['--check'], content: true }),
  nodeStep('content:datafresh', 'tools/check/check_data_freshness.js', '데이터신선도', 'data/·생성물 ↔ 원본 (빌드 체인 실행 후 git diff — build:data 누락 감지)', { content: true, serial: true }),
  nodeStep('content:linklint', 'tools/check/check_link_lint.js', '링크', '렌더 출력 링크 린트 — 원시 경로·좌표/파일명 라벨·QA 스탬프·미승인 외부 링크 노출 탐지', { content: true }),
  nodeStep('content:parser', 'tools/check/check_parser_parity.js', '파서', '빌드 파서 ↔ 런타임 파서 출력 등가성', { prio: 'p0' }),
  nodeStep('content:imports', 'tools/check/check_imports.js', '임포트', 'src/ ES 모듈 import/export 교차 검증', { prio: 'p0' }),
  nodeStep('content:posind', 'tools/check/check_position_independence.js', '규칙', '교재 좌표 비의존 — 위치 기반 식별자·저장 키 정적 탐지 (ID-05)', { diffScoped: true, inProcess: true, prio: 'p0' }),
  nodeStep('content:contentind', 'tools/check/check_content_independence.js', '규칙', '로직 콘텐츠 독립 — 시험 id·과목 키 리터럴 하드코딩 정적 탐지 (DA-15)', { diffScoped: true, inProcess: true, prio: 'p0' }),
  nodeStep('content:assets', 'tools/check/verify_shell_assets.js', '자산', 'sw.js SHELL_ASSETS/DATA_ASSETS 파일 존재', { prio: 'p0' }),
  nodeStep('content:cards', 'tools/check/audit_card_quality.js', '카드', '카드 품질 감사 (짧은 설명·중복·참조 링크)', { content: true, prio: 'p2' }),
  nodeStep('content:docbundles', 'tools/build/build_doc_bundles.js', '문서번들', 'docs_md 번들 ↔ 원본 문서 신선도 (build_doc_bundles 필요 감지)', { args: ['--check'], content: true }),
  nodeStep('content:refmap', 'tools/build/build_ref_mapping.js', '문서신선도', 'TEXTBOOK_REFERENCE_MAPPING §2 표 ↔ 교재 📌출처 ref_md 링크 (build:refmap 필요 감지)', { args: ['--check'], content: true }),
  nodeStep('content:textbookdocs', 'tools/check/check_textbook_docs.js', '문서신선도', '교재 갱신 ↔ 판본:textbook 문서 (교재 교체 후 방치 문서 감지)', { content: true }),
  nodeStep('content:metasections', 'tools/check/check_meta_sections.js', '검색규약', '메타 섹션 규약 기준선 — reader 미렌더 패턴 미매칭 메타 의심 헤딩 신규 유입 차단 (TS-17)', { content: true }),
  nodeStep('content:glossarysignal', 'tools/check/check_glossary_signal.js', '용어집', '저신호 일반명사 기준선 — 자동 추출 단일어 키워드의 정의 카드 노출 감시 (BP-14)', { content: true, prio: 'p2' }),
  nodeStep('content:docpaths', 'tools/check/check_docs_paths.js', '문서', 'README·AGENTS·docs/*.md 경로 참조 존재 검증 (스테일 탐지)'),
  nodeStep('content:specrefs', 'tools/check/check_spec_refs.js', '추적', 'SPEC ID ↔ 코드 @spec 태그 양방향 정합성 (스테일 참조 탐지)', { prio: 'p0' }),
  nodeStep('content:trace', 'tools/build/build_trace_matrix.js', '추적', 'TRACE_MATRIX 입력 해시 신선도 (SPEC·@spec·문서 헤더 변경 시 재생성 강제)', { args: ['--check'] }),
  nodeStep('content:unit', '--test', '테스트', '유닛 테스트 (node --test)', { args: ['tests/unit/**/*.test.js'], token: 'node --test', prio: 'p0' }),
  nodeStep('content:dom', 'node_modules/vitest/vitest.mjs', '테스트', 'DOM 테스트 (vitest + jsdom)', { args: ['run'], slow: true, prio: 'p0' }),
];

// ── CI 게이트 로컬 재현 (check:ci → ci 프리셋) ─────────────────────────
// 각 단계의 token은 ci.yml run: 라인의 토큰과 1:1 대응 — check_ci_parity가 검증.
const CI_STEPS = [
  npmStep('ci:hooks', 'check:hooks', '로컬', 'Git 훅 설치 여부 (미설치 시 로컬 게이트 우회 경고)', { prio: 'p2' }),
  npmStep('ci:secrets', 'check:secrets', '보안', '추적 파일 시크릿 패턴 스캔', { diffScoped: true, prio: 'p0' }),
  STEP_ENV,
  STEP_LINT,
  STEP_TYPES,
  npmStep('ci:imports', 'check:imports', '품질', 'ES 모듈 import/export 교차 검증', { prio: 'p0' }),
  STEP_SUPABASE,
  STEP_RLS,
  npmStep('ci:posind', 'check:posind', '규칙', '교재 좌표 비의존 — 위치 기반 식별자·저장 키 정적 탐지 (ID-05)', { prio: 'p0' }),
  npmStep('ci:contentind', 'check:contentind', '규칙', '로직 콘텐츠 독립 — 시험 id·과목 키 리터럴 하드코딩 정적 탐지 (DA-15)', { prio: 'p0' }),
  npmStep('ci:docs', 'check:docs', '문서', '문서 정합 묶음 (docs 프리셋 위임)'),
  STEP_DOMAINMAP,
  STEP_UITEXT,
  npmStep('ci:mobilesafe', 'check:mobilesafe', '규약', '모바일 잘림 규약 (다이얼로그·버튼 행 줄바꿈)', { prio: 'p0' }),
  npmStep('ci:escape', 'check:escape', '규약', 'HTML 이스케이프 싱크 규약 (innerHTML 미이스케이프 보간)', { diffScoped: true, prio: 'p0' }),
  npmStep('ci:uistyle', 'check:uistyle', '규약', 'UI 스타일 규약 — 인라인 style·JS display 조작·인라인 핸들러·네이티브 다이얼로그 금지', { diffScoped: true, prio: 'p0' }),
  npmStep('ci:zlayer', 'check:zlayer', '규약', 'z-index 계층 계약 — 앱 크롬 대역 보호·금지 대역 차단 (UX-SET-06)', { diffScoped: true, prio: 'p0' }),
  npmStep('ci:filenames', 'check:filenames', '규약', '파일명 대소문자 규약 — 영역별 kebab/snake/SCREAMING 패턴, 신규 위반 차단 (CODE_CONVENTIONS §2.1)', { prio: 'p0' }),
  nodeStep('ci:docsync', 'tools/check/check_doc_sync.js', '문서', '소스 변경 시 문서 갱신 강제', { args: ['--ref', 'origin/main'] }),
  nodeStep('ci:testfirst', 'tools/check/check_test_first.js', '테스트', '로직 변경 시 테스트 동반 강제', { args: ['--ref', 'origin/main'], prio: 'p0' }),
  npmStep('ci:specrefs', 'check:specrefs', '추적', 'SPEC↔@spec 스테일 참조 + 테스트 갭 기준선', { prio: 'p0' }),
  npmStep('ci:trace', 'check:trace', '추적', 'TRACE_MATRIX 입력 해시 신선도'),
  npmStep('ci:html', 'check:html', '빌드', 'index.html 조립 신선도 (파셜 편집 시 build:html 필요)'),
  nodeStep('ci:content', 'tools/check/check_content.js', '콘텐츠', '콘텐츠 추적 단계 전체 (content 프리셋 위임)', { args: ['--content-only', '--quick'] }),
  npmStep('ci:unit', 'test', '테스트', '유닛 테스트 (node --test)', { prio: 'p0' }),
  npmStep('ci:assets', 'verify:assets', '자산', 'SHELL_ASSETS/DATA_ASSETS 파일 존재', { prio: 'p0' }),
  STEP_VENDOR,
  npmStep('ci:parser', 'check:parser', '파서', '빌드 파서 ↔ 런타임 파서 등가성', { prio: 'p0' }),
  npmStep('ci:perf', 'check:perf', '성능', 'SHELL_ASSETS 크기 예산 상한', { prio: 'p0' }),
  nodeStep('ci:studyq', 'tools/check/audit_study_quality.js', '품질', '학습 품질 감사 — 스마트학습 배분·맞춤학습 추천 규칙 정합 (기준선 회귀 게이트)', { args: ['--check'], prio: 'p2' }),
  nodeStep('ci:diffcov', 'tools/check/check_diff_coverage.js', '테스트', '변경 라인 차등 커버리지 — diff 헝크 브랜치 ≥80%·신규 ≥85% (리포트 부재 시 스킵)', { diffScoped: true, prio: 'p0' }),
];

// ── 참조자료 묶음 (check:refs → refs 프리셋) ──────────────────────────
const REFS_STEPS = [
  nodeStep('refs:layout', 'tools/check/check_reflayout.js', '참조', '참조자료 4계층 정합성 — 전 시험 (PDF 폴더↔ref_md↔references.json↔규칙)'),
  nodeStep('refs:subjects', 'tools/check/check_ref_subjects.js', '참조', 'ref_md 인용 득표 ↔ 과목 귀속 교차 검증', { prio: 'p2' }),
  nodeStep('refs:fresh', 'tools/check/check_ref_freshness.js', '참조', '참조자료 PDF 해시 ↔ ref_md 신선도 (PDF 교체 감지)'),
  nodeStep('refs:lines', 'tools/check/check_ref_lines.js', '참조', '교재 (LNN)/📌출처 조문 ↔ ref_md 실제 내용'),
  nodeStep('refs:format', 'tools/check/check_refmd_format.js', '참조', 'ref_md 추출 잔재·평탄화 형식 — lone CR·제어문자·PUA·초장문 줄 차단'),
  nodeStep('refs:merge', 'tools/check/check_refmerge.js', '참조', 'ref_md joinWraps 병합 품질 감사', { prio: 'p2' }),
];

// ── 생성물 신선도 묶음 (check:fresh → freshness 프리셋) ────────────────
// "원본 → 산출물" 신선도 검사를 한 프리셋에 모은다 (content 프리셋 단계 재사용).
function pickContent(id) {
  const s = CONTENT_STEPS.find((x) => x.id === id);
  if (!s) throw new Error(`content 단계 없음: ${id}`);
  return s;
}
const FRESH_STEPS = [
  STEP_HTML,
  STEP_LANDING,
  pickContent('content:trace'),
  pickContent('content:datafresh'),
  pickContent('content:drillfresh'),
  pickContent('content:embfresh'),
  pickContent('content:reffresh'),
  pickContent('content:docbundles'),
  pickContent('content:refmap'),
  pickContent('content:textbookdocs'),
];

// ── 감시·감사 묶음 (check:audit → audit 프리셋) ────────────────────────
// prio p2 단계 모음 — 기준선 회귀·품질 감사·정보 단계. run.js에서
// advisory로 실행되어 실패해도 종료코드 0 (리포트 전용). push/PR 차단 없음.
// 주의: 같은 단계가 ci·all 프리셋에도 있으면 거기서는 여전히 차단된다 —
// 완전 비차단화는 해당 프리셋에서의 제외를 동반해야 한다.
const AUDIT_STEPS = [
  STEP_STUDYQ,
  STEP_ENV,
  pickContent('content:refsubjects'),
  pickContent('content:glossarysignal'),
  pickContent('content:cards'),
  REFS_STEPS.find((s) => s.id === 'refs:merge'),
  npmStep('audit:combo', 'audit:combo', '감사', '복수정답형 품질 감사 (정답 유일성·중복 진술집합·모순쌍·위치편향)', { prio: 'p2' }),
  npmStep('audit:syllabus', 'audit:syllabus', '감사', '출제기준 정합 감사 — 교재 과목·챕터 ↔ 출제기준 문서 대조 (문서부재·미반영 리포트)', { prio: 'p2' }),
  npmStep('audit:adlint', 'check:adlint', '감사', '광고 문구 사전 커버리지 감사 (FO-68)', { prio: 'p2' }),
  npmStep('audit:lawurls', 'check:lawurls', '감사', 'law.go.kr 라이브 링크 검증 (외부 드리프트 — 네트워크 필요)', { prio: 'p2' }),
  nodeStep('audit:onboard', 'tools/check/check_exam_onboard.js', '감사', '시험 팩 온보딩·승격 진단 (comingSoon↔콘텐츠 정합·필수 선언·선택 자산)', { prio: 'p2' }),
  nodeStep('audit:tools', 'tools/check/audit_tool_usage.js', '감사', 'tools/ 도달성·죽은 단계 감사 — 진입점→import 그래프 도달 불가 파일·프리셋 미소속 단계', { prio: 'p2' }),
  nodeStep('audit:gateutil', 'tools/check/audit_gate_utility.js', '감사', 'P2 단계 효용 감사 — 실행 텔레메트리·기준선 갱신 이력으로 미발화/고빈도 게이트 식별', { prio: 'p2' }),
];

// ── 실패 복구 안내 (run.js 요약의 근본원인 그룹핑) ─────────────────────
// DERIVED_IDS: `build:derived` 일괄 재생성으로 해결되는 신선도 계열 단계.
// 파생물 미재생성이라는 같은 원인이 여러 단계 실패로 중복 보고될 때 묶어서 안내.
const DERIVED_IDS = new Set([
  'html', 'ci:html', 'landing', 'content:trace', 'ci:trace',
  'content:datafresh', 'content:drillfresh', 'content:docbundles',
]);
// 개별 복구 힌트 — derived 묶음에 속하지 않는 재생성·스탬프 계열
const REMEDIES = {
  'content:embfresh': 'npm.cmd run build:embeddings — Node-only (최초 실행 시 ONNX 모델 ~470MB 다운로드, build:derived 미포함 — 임베딩은 build:derived:full)',
  'content:reffresh': 'npm.cmd run convert:refs — ref-pipeline Python으로 PDF→ref_md 재변환',
  'refs:fresh': 'npm.cmd run convert:refs — ref-pipeline Python으로 PDF→ref_md 재변환',
  'content:textbookdocs': '교재 종속 문서(판본: textbook)를 최신 교재에 맞춰 갱신',
  'docs:textbook': '교재 종속 문서(판본: textbook)를 최신 교재에 맞춰 갱신',
  'docs:teststats': 'npm.cmd run stats:stamp — 테스트 수치 실측 스탬프 갱신',
  'content:id-migration': 'npm.cmd run build:data — ID 이관 맵 미재생성',
  'content:refformat': 'node tools/sync/fix_refmd_glyphs.js (PUA·잔재 치환) · node tools/sync/reflow_flat_lines.js (평탄화 분할)',
  'refs:format': 'node tools/sync/fix_refmd_glyphs.js (PUA·잔재 치환) · node tools/sync/reflow_flat_lines.js (평탄화 분할)',
};

// ── 프리셋 해석 ───────────────────────────────────────────────────────
function contentSteps({ quick = false, contentOnly = false, withBuild = false } = {}) {
  let steps = CONTENT_STEPS.slice();
  if (quick) steps = steps.filter((s) => !s.slow);
  if (contentOnly) steps = steps.filter((s) => s.content);
  if (withBuild) steps.unshift(BUILD_STEP);
  return steps;
}

const PRESETS = {
  content: (opts) => contentSteps(opts),
  docs: () => DOCS_STEPS.slice(),
  ci: () => CI_STEPS.slice(),
  all: (opts) => [STEP_LINT, STEP_TYPES, STEP_HTML, STEP_LANDING, ...DOCS_STEPS, STEP_DOMAINMAP, STEP_VENDOR, STEP_ENV, STEP_UITEXT, STEP_STUDYQ, ...contentSteps(opts)],
  refs: () => REFS_STEPS.slice(),
  freshness: () => FRESH_STEPS.slice(),
  audit: () => AUDIT_STEPS.slice(),
};

function resolveSteps(preset, opts = {}) {
  const fn = PRESETS[preset];
  if (!fn) throw new Error(`알 수 없는 프리셋: ${preset} (사용 가능: ${Object.keys(PRESETS).join(', ')})`);
  return fn(opts);
}

/** --step 조회용 통합 레지스트리 (프리셋 간 id 중복은 같은 명령이므로 첫 등록 유지) */
function allSteps() {
  const map = new Map();
  for (const s of [STEP_HTML, STEP_LANDING, ...contentSteps({}), BUILD_STEP, ...DOCS_STEPS, ...CI_STEPS, ...REFS_STEPS]) {
    if (!map.has(s.id)) map.set(s.id, s);
  }
  return [...map.values()];
}

/** id·id 접미사·스크립트 파일명·npm 스크립트명으로 단계 검색 */
function findStep(query) {
  const q = query.replace(/^check:/, '').replace(/\.js$/, '');
  return allSteps().find((s) =>
    s.id === query || s.id === q || s.id.endsWith(`:${q}`) ||
    s.token === `npm run ${query}` || s.token === `npm run check:${q}` ||
    s.args.some((a) => path.basename(a, '.js') === q || path.basename(a, '.js') === `check_${q.replace(/-/g, '_')}`));
}

module.exports = { NPM, nodeStep, npmStep, DOCS_STEPS, CONTENT_STEPS, BUILD_STEP, CI_STEPS, REFS_STEPS, AUDIT_STEPS, PRESETS, DERIVED_IDS, REMEDIES, resolveSteps, allSteps, findStep };
