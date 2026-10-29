/* ============================================================
 * PassOK — Service Worker
 * 멀티시험 학습 플랫폼 PWA
 *
 * 캐시 전략:
 *  - Navigation (HTML)             : Cache First (캐시 스큐 방지)
 *  - /src/*.js + CSS               : Cache First (ESM 그래프 + CSS 세대 일관성)
 *  - 그 외 JS                       : Network First (구버전 잔류 방지)
 *  - 레지스트리 (registry.js)      : Network First (항상 최신 번들 URL 확보)
 *  - 학습 데이터 번들 (해시 파일명) : Cache First + 온디맨드 캐싱 (변경분만 새 URL로 갱신)
 *  - 외부 CDN (폰트/아이콘)        : Stale-While-Revalidate
 *  - MP3 오디오 (302MB)           : 네트워크 직행 (캐시 제외)
 *
 * ⚠️ 캐시 버전 규약 (MODULAR_DESIGN 4-3):
 *   - CACHE_VERSION(쉘/CDN)은 배포마다 갱신 → 코드/HTML은 항상 최신.
 *   - DATA_CACHE_VERSION(데이터)은 "안정" 이름으로, 콘텐츠 변경 시 올리지 않음.
 *     번들 파일명에 콘텐츠 해시가 포함되므로 변경된 과목만 새 URL이 되어
 *     Cache First로 자연 갱신되고, 미변경 번들 캐시는 배포 간 그대로 유지된다.
 *     (구 해시 번들은 activate의 pruneStaleDataBundles가 레지스트리 기준으로 정리)
 * ============================================================ */

// @spec P-01~06,O-04,UX-PWA-03,LP-07

const CACHE_VERSION = 'v20261029-c48092a';   // 배포 시 stamp_sw_version.js가 자동 갱신 (v<커밋날짜>-<해시>)
const DATA_CACHE_VERSION = 'v1';           // 데이터: 안정(해시 파일명이 변경 감지 담당) — 캐시 포맷이 바뀔 때만 수동 증가
// 캐시 접두사는 플랫폼 브랜드(passok) — 시험 무관 공유 캐시.
// 구 접두사(passory-*·cosmetic-pass-*)는 activate의 비현재 캐시 전수 삭제로 자동 정리된다.
const SHELL_CACHE = `passok-shell-${CACHE_VERSION}`;
const DATA_CACHE = `passok-data-${DATA_CACHE_VERSION}`;
const CDN_CACHE = `passok-cdn-${CACHE_VERSION}`;

/** 설치 시 미리 캐시할 App Shell 목록 */
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './css/base.css',
  './css/dashboard.css',
  './css/study.css',
  './css/exam.css',
  './css/trainer.css',
  './css/reader.css',
  './css/app-responsive.css',
  './css/reader-extras.css',
  './css/reader-mermaid.css',
  './css/html-viewer.css',
  './css/ui-overlay.css',
  './css/study-calendar.css',
  './manifest.webmanifest',
  './feature-plan.json',
  './ping.txt',
  './src/theme-init.js',
  './src/pwa/pwa-install-capture.js',
  './src/pwa/pwa-install.js',
  './src/pwa/version-watch.js',
  './src/theme-toggle.js',
  './src/ui-mode.js',
  './src/practice-registry.js',
  './src/auth-sync/supabase-config.js',
  './src/auth-sync/supabase-client.js',
  './src/auth-sync/auth-view.js',
  './src/auth-sync/sync.js',
  './src/sanitize.js',
  './src/state.js',
  './src/charts.js',
  './src/scratchpad.js',
  './src/utils.js',
  './src/trainer-calc.js',
  './src/storage-keys.js',
  './src/config/timing.js',
  './src/config/cache.js',
  './src/paths.js',
  './src/exam-context.js',
  './src/reader/reader-format.js',
  './src/reader/reader-toc.js',
  './src/reader/exam-viewer.js',
  './src/written-practice.js',
  './src/written-grading.js',
  './src/reader/manual-viewer.js',
  './src/doc-overlay.js',
  './src/reader/markdown-parser.js',
  './src/data-loader.js',
  './src/sha256.js',
  './src/reader/textbook-parser.js',
  './src/app.js',
  './src/app-fallback.js',
  './src/ui-utils.js',
  './src/pro-upgrade.js',
  './src/pwa/pwa-manifest.js',
  './src/router.js',
  './src/types.js',
  './src/reader/glossary-query.js',
  './src/keyword-index.js',
  './src/reader/mermaid-utils.js',
  './src/reader/mermaid-render.js',
  './src/web-vitals.js',
  './src/views/daily-challenge.js',
  './src/views/glossary-renderer.js',
  './src/views/pomodoro.js',
  './src/views/study-calendar.js',
  // data/audio_manifest.js, data/exams.js: 이전 app.js ESM import 그래프에
  // 포함되었으나 window 전역 참조 방식으로 변경되어 별도 프리캐시 필요 (오프라인 최초 실행 대비)
  // ※ registry.js는 시험별 dataRoot 아래에 있으므로 DATA_ASSETS에서 프리캐시
  './data/audio_manifest.js',
  './data/exams.js',
  './data/version.js',
  './data/release-notes.js',
  './src/whats-new.js',
  './src/feedback.js',
  './src/views/dashboard.js',
  './src/views/analysis-view.js',
  './src/views/personalization-view.js',
  './src/views/score-estimate.js',
  './src/views/subject-stats.js',
  './src/views/flashcard.js',
  './src/views/quiz.js',
  './src/views/trainer.js',
  './src/views/trainer-drills.js',
  './src/views/trainer-calc-practice.js',
  './src/questions.js',
  './src/statement-tracker.js',
  // 도메인 모듈(src/exams/<id>/)은 프리캐시 제외 — 활성 시험만 쓰는 자산이므로
  // 시험 간 프리캐시 비대화를 막는다. 지연 import 시 /src/ 규칙(cacheFirst)으로
  // 런타임 캐시되고, warmPracticeFeatures()의 유휴 예열이 오프라인 진입을 보장.
  // (formula 스토어·뷰·trainer-ingredients 등 전부 지연 그래프 — pro-upgrade도 hasFeature 게이트 아래 지연 import)
  './src/csv-utils.js',
  './src/study-tracker.js',
  './src/spaced-repetition.js',
  './src/recommendations.js',
  './src/command-palette.js',
  './src/views/dictionary.js',
  // 시험 콘텐츠 이미지는 EXAM_MEDIA_ASSETS로 분리 — 시험별 자산을 셸과 섞지 않는다.
  './src/views/backup.js',
  './src/views/textbook-search.js',
  './src/views/textbook-reader.js',
  './src/views/reader-audio.js',
  './src/views/exam-simulator.js',
  './src/views/exam-sim-state.js',
  './src/views/exam-sim-review.js',
  './src/views/offline-detection.js',
  './src/views/event-listeners.js',
  './src/views/listeners-app.js',
  './src/views/listeners-flashcard.js',
  './src/views/listeners-quiz.js',
  './src/views/listeners-simulator.js',
  './src/views/listeners-dictionary.js',
  './src/views/listeners-delegation.js',
  './src/views/navigation.js',
  './src/views/exam-select.js',
  './src/reader/html-viewer.js',
  './src/pdf-registry.js',
  './src/study-aids.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/bg-landscape.webp',
  // FontAwesome 자체 호스팅 (오프라인/모바일에서도 아이콘 확실히 표시)
  './vendor/supabase/supabase.js',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  // Noto Sans KR & Outfit 웹폰트 자체 호스팅
  './vendor/fonts/fonts.css',
  './vendor/fonts/noto-sans-kr-300.woff2',
  './vendor/fonts/noto-sans-kr-400.woff2',
  './vendor/fonts/noto-sans-kr-500.woff2',
  './vendor/fonts/noto-sans-kr-700.woff2',
  './vendor/fonts/noto-sans-kr-900.woff2',
  './vendor/fonts/outfit-300.woff2',
  './vendor/fonts/outfit-400.woff2',
  './vendor/fonts/outfit-600.woff2',
  './vendor/fonts/outfit-800.woff2',
  // Noto Color Emoji (이모지 렌더링 통일) — 5.4MB 단일 파일이라 프리캐시에서 제외.
  //   font-display: swap + CSS가 필요 시점에만 요청하므로 설치 페이로드를 절반으로 줄인다.
  //   최초 요청 시 fetch 규칙 6(SWR)이 SHELL_CACHE에 저장 → 이후 오프라인에서도 사용 가능.
  //   캐시 전 첫 방문·오프라인 시 신기기는 시스템 이모지로 폴백 (기능 영향 없음).
  // Mermaid(3.2MB) — 설치 프리캐시에서 제외 (설치 페이로드 절감, 사용 빈도 낮음).
  //   mermaid-render.js가 노드 존재 시에만 지연 로드하고, 규칙 5-4(networkFirst +
  //   SHELL_CACHE 폴백)가 최초 fetch를 캐시 → 이후 오프라인 사용 가능.
  //   오프라인 설치 직후 첫 다이어그램 조회만 네트워크 필요 (script.onerror → 폴백 메시지).
];

/**
 * 설치 시 프리캐시할 "경량" 데이터만 나열한다 (MODULAR_DESIGN 4-3).
 * 무거운 과목/시험/원료 번들은 해시 파일명 + fetch 핸들러의 Cache First
 * 온디맨드 캐싱으로 처리하므로 여기에 넣지 않는다.
 *   - 장점: 배포마다 전체(~2MB) 재프리캐시/재다운로드가 사라짐, 변경 과목만 갱신.
 *   - 트레이드오프: 아직 방문하지 않은 과목은 최초 1회 온라인 접속 시 캐시됨
 *     (그 전까지는 오프라인 미가용). 전체 오프라인 선(先)확보가 필요하면
 *     이 배열에 번들을 다시 추가할 수 있으나, 그 경우 변경-격리 이점을 일부 포기한다.
 */
const DATA_ASSETS = [
  './data/exams/cosmetic/registry.js',
  './data/exams/cosmetic/id_migration.js',
  './data/exams/skincare/registry.js',
  './data/exams/skincare/id_migration.js',
  './data/exams/hairdresser/registry.js',
  './data/exams/hairdresser/id_migration.js',
  './data/exams/insadj/registry.js',
  './data/exams/insadj/id_migration.js',
  './data/exams/lossadj/registry.js',
  './data/exams/lossadj/id_migration.js',
  './data/exams/admagent/registry.js',
  './data/exams/admagent/id_migration.js',
  './data/exams/appraisal/registry.js',
  './data/exams/appraisal/id_migration.js',
  './data/exams/broker/registry.js',
  './data/exams/broker/id_migration.js',
  './data/exams/labor/registry.js',
  './data/exams/labor/id_migration.js',
  './data/exams/indsafe/registry.js',
  './data/exams/indsafe/id_migration.js',
  './data/exams/indsafeind/registry.js',
  './data/exams/indsafeind/id_migration.js',
  './data/exams/iteng/registry.js',
  './data/exams/iteng/id_migration.js',
  './data/exams/itindeng/registry.js',
  './data/exams/itindeng/id_migration.js',
  './data/exams/eleceng/registry.js',
  './data/exams/eleceng/id_migration.js',
  './data/exams/elecindeng/registry.js',
  './data/exams/elecindeng/id_migration.js',
  './data/exams/compapp1/registry.js',
  './data/exams/compapp1/id_migration.js',
  './data/exams/compapp2/registry.js',
  './data/exams/compapp2/id_migration.js'
];

/** 설치 시 프리캐시할 마크다운 문서 (매뉴얼·요약집 — 오프라인 보장)
 *  MD_ASSETS:BEGIN/END 마커 안은 tools/sync/sync_textbook_files.js가
 *  manifest 선언 기준으로 재생성 — 마커 사이만 자동 갱신된다. */
const MD_ASSETS = [
  // MD_ASSETS:BEGIN
  './docs/user/user_manual.md',
  './content/exams/cosmetic/docs/formula_manual.md',
  './content/exams/cosmetic/docs/두음법_암기_총정리.md',
  './content/exams/cosmetic/docs/학습안내서.md',
  './content/exams/cosmetic/교재/law/1과목_화장품법의이해_표준형.md',
  './content/exams/cosmetic/교재/law/1과목_화장품법의이해_이야기형.md',
  './content/exams/cosmetic/교재/manufacturing/2과목_제조및품질관리_표준형.md',
  './content/exams/cosmetic/교재/manufacturing/2과목_제조및품질관리_이야기형.md',
  './content/exams/cosmetic/교재/safety/3과목_유통화장품안전관리_표준형.md',
  './content/exams/cosmetic/교재/safety/3과목_유통화장품안전관리_이야기형.md',
  './content/exams/cosmetic/교재/understanding/4과목_맞춤형화장품의이해_표준형.md',
  './content/exams/cosmetic/교재/understanding/4과목_맞춤형화장품의이해_이야기형.md',
  './content/exams/cosmetic/문제은행/과목1_문제은행.md',
  './content/exams/cosmetic/문제은행/과목2_문제은행.md',
  './content/exams/cosmetic/문제은행/과목3_문제은행.md',
  './content/exams/cosmetic/문제은행/과목4_문제은행.md',
  './content/exams/skincare/docs/시험_구조_안내.md',
  './content/exams/skincare/docs/학습안내서.md',
  './content/exams/skincare/교재/skinTheory/피부미용이론.md',
  './content/exams/skincare/교재/anatomy/해부생리학.md',
  './content/exams/skincare/교재/devices/피부미용기기학.md',
  './content/exams/skincare/교재/cosmetics/화장품학.md',
  './content/exams/skincare/교재/hygiene/공중위생관리학.md',
  './content/exams/skincare/교재/practical/피부미용실무.md',
  './content/exams/skincare/문제은행/과목1_피부미용이론_문제은행.md',
  './content/exams/skincare/문제은행/과목2_해부생리학_문제은행.md',
  './content/exams/skincare/문제은행/과목3_피부미용기기학_문제은행.md',
  './content/exams/skincare/문제은행/과목4_화장품학_문제은행.md',
  './content/exams/skincare/문제은행/과목5_공중위생관리학_문제은행.md',
  './content/exams/hairdresser/docs/시험_구조_안내.md',
  './content/exams/hairdresser/docs/학습안내서.md',
  './content/exams/hairdresser/교재/skin/피부학.md',
  './content/exams/hairdresser/교재/hair/모발학.md',
  './content/exams/hairdresser/교재/cosmetics/화장품학.md',
  './content/exams/hairdresser/교재/hygiene/공중위생관리학.md',
  './content/exams/hairdresser/교재/disinfection/소독학.md',
  './content/exams/hairdresser/교재/practical/미용실무.md',
  './content/exams/hairdresser/문제은행/과목1_피부학_문제은행.md',
  './content/exams/hairdresser/문제은행/과목2_모발학_문제은행.md',
  './content/exams/hairdresser/문제은행/과목3_화장품학_문제은행.md',
  './content/exams/hairdresser/문제은행/과목4_공중위생관리학_문제은행.md',
  './content/exams/hairdresser/문제은행/과목5_소독학_문제은행.md',
  './content/exams/insadj/docs/과목4_참고_문항.md',
  './content/exams/insadj/docs/시험_구조_안내.md',
  './content/exams/insadj/교재/contract/보험계약법.md',
  './content/exams/insadj/교재/act/보험업법.md',
  './content/exams/insadj/교재/theory/손해사정이론.md',
  './content/exams/insadj/교재/prop/재물_손해사정.md',
  './content/exams/insadj/교재/vehicle/차량_손해사정.md',
  './content/exams/insadj/교재/bodily/신체_손해사정.md',
  './content/exams/insadj/문제은행/과목1_문제은행.md',
  './content/exams/insadj/문제은행/과목2_문제은행.md',
  './content/exams/insadj/문제은행/과목3_문제은행.md',
  './content/exams/lossadj/docs/2028_개편_대비.md',
  './content/exams/lossadj/docs/2차_주관식_설계.md',
  './content/exams/lossadj/교재/insurance/1과목_상법보험편.md',
  './content/exams/lossadj/교재/disaster/2과목_농어업재해보험법령.md',
  './content/exams/lossadj/교재/agronomy/3과목_농학개론.md',
  './content/exams/lossadj/교재/secondTheory/2차_이론과실무.md',
  './content/exams/lossadj/교재/secondAssessment/2차_손해평가의이론과실무.md',
  './content/exams/lossadj/문제은행/과목1_문제은행.md',
  './content/exams/lossadj/문제은행/과목2_문제은행.md',
  './content/exams/lossadj/문제은행/과목3_문제은행.md',
  './content/exams/admagent/교재/civGen/민법_총칙.md',
  './content/exams/admagent/교재/admLaw/행정법.md',
  './content/exams/admagent/교재/admSci/행정학개론.md',
  './content/exams/admagent/교재/civContract/민법_계약.md',
  './content/exams/admagent/교재/admProc/행정절차론.md',
  './content/exams/admagent/교재/officeMgmt/사무관리론.md',
  './content/exams/admagent/교재/admPractice/행정사실무.md',
  './content/exams/admagent/문제은행/과목1_문제은행.md',
  './content/exams/admagent/문제은행/과목2_문제은행.md',
  './content/exams/admagent/문제은행/과목3_문제은행.md',
  './content/exams/appraisal/교재/civil/민법_총칙물권.md',
  './content/exams/appraisal/교재/econ/경제학원론.md',
  './content/exams/appraisal/교재/realestate/부동산학원론.md',
  './content/exams/appraisal/교재/realestate/../theory/부동산학개론.md',
  './content/exams/appraisal/교재/law/감정평가관련법규.md',
  './content/exams/appraisal/교재/accounting/회계학.md',
  './content/exams/appraisal/교재/appraisalthy/감정평가이론.md',
  './content/exams/appraisal/교재/appraisalthy/감정평가_통계원론.md',
  './content/exams/appraisal/교재/appraisallaw/감정평가및보상법규.md',
  './content/exams/appraisal/교재/appraisalwork/감정평가실무.md',
  './content/exams/appraisal/문제은행/과목1_문제은행.md',
  './content/exams/appraisal/문제은행/과목3_문제은행.md',
  './content/exams/appraisal/문제은행/과목2_문제은행.md',
  './content/exams/appraisal/문제은행/과목4_문제은행.md',
  './content/exams/appraisal/문제은행/과목5_문제은행.md',
  './content/exams/appraisal/문제은행/2차_평가이론_주관식.md',
  './content/exams/appraisal/문제은행/2차_보상법규_주관식.md',
  './content/exams/appraisal/문제은행/2차_평가실무_주관식.md',
  './content/exams/broker/교재/estate_intro/1과목_부동산학개론_표준형.md',
  './content/exams/broker/교재/civil_broker/2과목_민법_표준형.md',
  './content/exams/broker/교재/broker_law/3과목_공인중개사법_표준형.md',
  './content/exams/broker/교재/estate_publaw/4과목_부동산공법_표준형.md',
  './content/exams/broker/교재/estate_registry/5과목_부동산공시법_표준형.md',
  './content/exams/broker/교재/estate_tax/6과목_부동산세법_표준형.md',
  './content/exams/broker/교재/broker_practice/7과목_중개실무_표준형.md',
  './content/exams/broker/문제은행/과목1_부동산학개론_문제은행.md',
  './content/exams/broker/문제은행/과목2_민법_중개관련_문제은행.md',
  './content/exams/broker/문제은행/과목3_공인중개사법_문제은행.md',
  './content/exams/broker/문제은행/과목4_부동산공법_문제은행.md',
  './content/exams/broker/문제은행/과목5_부동산공시법_문제은행.md',
  './content/exams/broker/문제은행/과목6_부동산세법_문제은행.md',
  './content/exams/broker/문제은행/과목7_중개실무_문제은행.md',
  './content/exams/labor/교재/labor_law1/1과목_노동법(1)개별관계.md',
  './content/exams/labor/교재/labor_law2/2과목_노동법(2)집단관계.md',
  './content/exams/labor/교재/civil/3과목_민법.md',
  './content/exams/labor/교재/social_ins/4과목_사회보험법.md',
  './content/exams/labor/교재/elective/5과목_선택과목.md',
  './content/exams/labor/문제은행/과목1_문제은행.md',
  './content/exams/labor/문제은행/과목2_문제은행.md',
  './content/exams/labor/문제은행/과목3_문제은행.md',
  './content/exams/labor/문제은행/과목4_문제은행.md',
  './content/exams/indsafe/교재/safetyMgmt/산업재해예방_안전보건교육.md',
  './content/exams/indsafe/교재/ergonomics/인간공학_위험성평가.md',
  './content/exams/indsafe/교재/machinery/기계_기구_설비_안전.md',
  './content/exams/indsafe/교재/electric/전기설비_안전.md',
  './content/exams/indsafe/교재/chemical/화학설비_안전.md',
  './content/exams/indsafe/교재/construction/건설공사_안전.md',
  './content/exams/indsafe/교재/practical/산업안전관리_실무.md',
  './content/exams/indsafe/문제은행/과목1_문제은행.md',
  './content/exams/indsafe/문제은행/과목2_문제은행.md',
  './content/exams/indsafe/문제은행/과목3_문제은행.md',
  './content/exams/indsafe/문제은행/과목4_문제은행.md',
  './content/exams/indsafe/문제은행/과목5_문제은행.md',
  './content/exams/indsafe/문제은행/과목6_문제은행.md',
  './content/exams/indsafeind/교재/prevedu/1과목_산업재해 예방 및 안전보건교육.md',
  './content/exams/indsafeind/교재/human/2과목_인간공학 및 위험성 평가·관리.md',
  './content/exams/indsafeind/교재/mach/3과목_기계·기구 및 건설공사 안전관리.md',
  './content/exams/indsafeind/교재/elec/4과목_전기 및 화학설비 안전관리.md',
  './content/exams/iteng/교재/swdev/1과목_소프트웨어 개발.md',
  './content/exams/iteng/교재/db/2과목_데이터베이스 구축.md',
  './content/exams/iteng/교재/proglang/3과목_프로그래밍 언어 활용.md',
  './content/exams/iteng/교재/sysmgmt/4과목_정보시스템 구축관리.md',
  './content/exams/itindeng/교재/sysbase/1과목_정보시스템 기반 기술.md',
  './content/exams/itindeng/교재/proglang/2과목_프로그래밍언어 활용.md',
  './content/exams/itindeng/교재/db/3과목_데이터베이스 활용.md',
  './content/exams/eleceng/교재/em/1과목_전기자기학.md',
  './content/exams/eleceng/교재/power/2과목_전력공학.md',
  './content/exams/eleceng/교재/mach/3과목_전기기기.md',
  './content/exams/eleceng/교재/circuit/4과목_회로이론 및 제어공학.md',
  './content/exams/eleceng/교재/regs/5과목_전기설비기술기준 및 판단기준.md',
  './content/exams/elecindeng/교재/em/1과목_전기자기학.md',
  './content/exams/elecindeng/교재/power/2과목_전력공학.md',
  './content/exams/elecindeng/교재/mach/3과목_전기기기.md',
  './content/exams/elecindeng/교재/circuit/4과목_회로이론 및 제어공학.md',
  './content/exams/elecindeng/교재/regs/5과목_전기설비기술기준 및 판단기준.md',
  './content/exams/compapp1/교재/computer/1과목_컴퓨터 일반.md',
  './content/exams/compapp1/교재/spreadsheet/2과목_스프레드시트 일반.md',
  './content/exams/compapp1/교재/database/3과목_데이터베이스 일반.md',
  './content/exams/compapp1/문제은행/과목1_문제은행.md',
  './content/exams/compapp1/문제은행/과목2_문제은행.md',
  './content/exams/compapp1/문제은행/과목3_문제은행.md',
  './content/exams/compapp2/교재/computer/1과목_컴퓨터 일반.md',
  './content/exams/compapp2/교재/spreadsheet/2과목_스프레드시트 일반.md',
  './content/exams/compapp2/문제은행/과목1_문제은행.md',
  './content/exams/compapp2/문제은행/과목2_문제은행.md',
  // MD_ASSETS:END
];

/** 설치 시 프리캐시할 시험별 미디어 자산 (교재 삽화 — 오프라인 보장)
 *  EXAM_MEDIA:BEGIN/END 마커 안은 exam_targets.getPrecacheMediaAssets가
 *  각 시험 {contentRoot}/교재/**(images) 의 .webp를 스캔해 재생성한다.
 *  build:data(build:index.js)와 sync_textbook_files.js 양쪽에서 갱신. */
const EXAM_MEDIA_ASSETS = [
  // EXAM_MEDIA:BEGIN
  './content/exams/cosmetic/교재/law/images/1과목_삽화.webp',
  './content/exams/cosmetic/교재/law/images/1과목_암기요약.webp',
  './content/exams/cosmetic/교재/law/images/CCTV 설치안내판 예시.webp',
  './content/exams/cosmetic/교재/manufacturing/images/2과목_삽화.webp',
  './content/exams/cosmetic/교재/manufacturing/images/2과목_암기요약.webp',
  './content/exams/cosmetic/교재/manufacturing/images/계면활성제 구조와 유화.webp',
  './content/exams/cosmetic/교재/manufacturing/images/바코드의 종류 및 구성체계.webp',
  './content/exams/cosmetic/교재/safety/images/3과목_삽화.webp',
  './content/exams/cosmetic/교재/safety/images/3과목_암기요약.webp',
  './content/exams/cosmetic/교재/understanding/images/4과목_삽화.webp',
  './content/exams/cosmetic/교재/understanding/images/4과목_암기요약.webp',
  './content/exams/cosmetic/교재/understanding/images/모발의 구조 단면도 보완_인포그래픽.webp',
  './content/exams/cosmetic/교재/understanding/images/피부의 구조 단면도 보완_인포그래픽.webp',
  // EXAM_MEDIA:END
];

/** 캐시하지 않을 요청 패턴 (오디오 등 대용량 미디어) */
const BYPASS_PATTERNS = [
  /\.mp3$/i,
  /content\/exams\/[^/]+\/audiobook\/mp3\//i
];

/** 마크다운 원본 → Cache First (정적 원본, 배포 시 갱신) */
const MD_PATTERN = /\.md$/i;

/** 외부 CDN 호스트 (Stale-While-Revalidate 대상) */
const CDN_HOSTS = [
  // 외부 폰트/서체 CDN 사용 제거됨 (100% 로컬 자체 호스팅)
];

/* ------------------------------------------------------------
 * install: App Shell + 데이터 프리캐시
 * ---------------------------------------------------------- */
/**
 * addAll 의 원자성(all-or-nothing)을 버리고 자산을 개별 캐싱한다.
 * addAll 은 목록 중 하나만 404 여도 전체가 reject 되는데, 그러면 install 의
 * skipWaiting() 이 실행되지 않아 새 SW 가 영영 활성화되지 못한다. navigation 이
 * cacheFirst 인 구조에서는 그 결과 사용자가 구버전 셸에 '자동 갱신 없이' 갇힌다
 * (networkFirst 였을 때보다 오히려 나쁜 실패 모드).
 * 개별 add 를 allSettled 로 처리하면 일부가 실패해도 새 세대는 반드시 활성화되고,
 * 실패분은 cacheFirst 의 네트워크 폴백으로 온디맨드 자가 치유된다(온라인 한정).
 * @returns {Promise<string[]>} 실패한 자산 목록
 */
async function precacheResilient(cacheName, assets) {
  const cache = await caches.open(cacheName);
  const results = await Promise.allSettled(
    assets.map((asset) => cache.add(asset))
  );
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') failed.push(assets[i]);
  });
  if (failed.length) {
    console.warn(
      `[SW] 프리캐시 일부 실패 (${failed.length}/${assets.length}) — ` +
        '새 SW 는 정상 활성화됨, 실패분은 온디맨드 캐싱으로 폴백:',
      failed
    );
  }
  return failed;
}

// @spec P-14 — 팩별 지연 다운로드: 시험별 자산은 install 전체 프리캐시에서 제외하고
// 선택 시 cachePack 메시지로 해당 팩만 캐시한다 (설치 부하를 선택 팩으로 국한).
function packAssets(examId) {
  return MD_ASSETS.filter((a) => a.includes(`/exams/${examId}/`));
}
function sharedDocAssets() {
  return MD_ASSETS.filter((a) => !a.includes('/exams/'));
}
const PACK_MESSAGE_TYPE = 'passok:cachePack';
const EVICT_MESSAGE_TYPE = 'passok:evictPack';

// @spec P-14 — 팩 전환 시 구 팩 캐시 정리: 이전 시험의 지연 다운로드분을 해제한다.
// 프리캐시(공용·셸·데이터)에는 영향 없음 — packAssets 범위만 삭제.
async function evictPackAssets(examId) {
  const cache = await caches.open(SHELL_CACHE);
  const assets = packAssets(examId);
  await Promise.allSettled(assets.map((a) => cache.delete(a)));
  return assets.length;
}

self.addEventListener('install', (event) => {
  // 프리캐시는 관용적(resilient)으로 수행한다 — 이유는 precacheResilient 주석 참고.
  // 개별 실패를 허용하되 skipWaiting 은 절대 건너뛰지 않아 업데이트 경로가 브릭되지 않는다.
  // P-14: 시험별 MD(교재·문제은행)는 프리캐시하지 않고 선택 시 cachePack으로 지연 다운로드.
  // 데이터 번들은 소형이라 전 팩 유지 — registry 해석이 팩 선택 전에 필요하기 때문.
  event.waitUntil(
    Promise.all([
      precacheResilient(SHELL_CACHE, SHELL_ASSETS),
      precacheResilient(DATA_CACHE, DATA_ASSETS),
      precacheResilient(SHELL_CACHE, sharedDocAssets()),
      precacheResilient(SHELL_CACHE, EXAM_MEDIA_ASSETS)
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === EVICT_MESSAGE_TYPE && event.data.examId) {
    event.waitUntil(
      evictPackAssets(event.data.examId).then((removed) => {
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'passok:packEvicted',
            examId: event.data.examId,
            removed
          });
        }
      })
    );
    return;
  }
  if (!event.data || event.data.type !== PACK_MESSAGE_TYPE || !event.data.examId) return;
  const assets = packAssets(event.data.examId);
  event.waitUntil(
    precacheResilient(SHELL_CACHE, assets).then((failed) => {
      if (event.source && event.source.postMessage) {
        event.source.postMessage({
          type: 'passok:packCached',
          examId: event.data.examId,
          total: assets.length,
          failed: failed.length
        });
      }
    })
  );
});

/* ------------------------------------------------------------
 * activate: 이전 버전 캐시 정리
 * ---------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  // DATA_CACHE는 "안정" 이름이라 배포 간 유지된다 (통째 삭제하지 않음).
  // 구 버전 쉘/CDN 캐시만 제거하고, 데이터 캐시 내부는 레지스트리 기준으로 고아만 정리한다.
  const currentCaches = [SHELL_CACHE, DATA_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => /^(passok|passory|cosmetic-pass)-/.test(key) && !currentCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => pruneStaleDataBundles())
      .then(() => self.clients.claim())
  );
});

/**
 * 데이터 캐시는 배포 간 유지되므로, 최신 레지스트리가 더 이상 참조하지 않는
 * 구 해시 번들만 선별 삭제한다. 실패해도 무해한 best-effort (fetch 경로 영향 없음).
 * 루트/서브디렉터리 배포 모두 대응하기 위해 경로 끝 일치로 비교한다.
 */
async function pruneStaleDataBundles() {
  try {
    const cache = await caches.open(DATA_CACHE);
    const res = await fetch('./data/registry.js', { cache: 'no-cache' });
    if (!res || !res.ok) return;
    const text = await res.text();

    // 레지스트리가 참조하는 모든 ./data/*.js 경로 수집 (+ 항상 보존할 경량 파일)
    // 유니코드 경로 허용 — 한글 파일명 번들(예: docs_md/학습안내서.js)도 참조로 인식
    const referenced = new Set(text.match(/\.\/data\/[\p{L}\p{N}_./-]+\.js/gu) || []);
    referenced.add('./data/registry.js');
    referenced.add('./data/audio_manifest.js');
    referenced.add('./data/question_chapters.js'); // 단원별 취약 분석 인덱스 (init 시 로드)
    // data/drills/, data/supplements/, data/exams*(시험 레지스트리·타 시험 번들)는 프루닝에서 항상 보존
    const ALWAYS_KEEP = /\/data\/(drills|supplements|exams)\b/;
    const refSuffixes = [...referenced].map((r) => r.replace(/^\.\//, '/'));

    const requests = await cache.keys();
    await Promise.all(
      requests.map(async (req) => {
        // req.url은 퍼센트 인코딩 상태 — 한글 경로가 endsWith 비교에서 어긋나지 않게 디코딩
        let pathname;
        try { pathname = decodeURIComponent(new URL(req.url).pathname); }
        catch (_) { pathname = new URL(req.url).pathname; }
        if (!pathname.includes('/data/')) return; // 데이터 번들만 대상
        if (ALWAYS_KEEP.test(pathname)) return;   // drills 번들은 보존
        const isReferenced = refSuffixes.some((suffix) => pathname.endsWith(suffix));
        if (!isReferenced) await cache.delete(req);
      })
    );
  } catch (e) {
    // best-effort: 실패 시 아무 것도 하지 않음
  }
}

/* ------------------------------------------------------------
 * fetch: 요청 유형별 캐시 전략 적용
 * ---------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET 이외 메서드는 처리하지 않음
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 0) 연결 프로브(?_probe=) → 서비스 워커가 직접 네트워크에서 패치하여 반환.
  //    (일부 모바일 WebKit/웹뷰 standalone 환경에서 respondWith 없이 return하면
  //     네트워크 요청이 실패/차단되는 현상을 방지)
  if (url.searchParams.has('_probe')) {
    event.respondWith(fetch(request));
    return;
  }

  // 1) 오디오 등 대용량 미디어 → 캐시 우회 (네트워크 직행)
  if (BYPASS_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    return;
  }

  // 2) 외부 CDN (폰트/FontAwesome) → Stale-While-Revalidate
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  // 3) 동일 출처 요청만 처리 (그 외 cross-origin은 네트워크 직행)
  if (url.origin !== self.location.origin) return;

  // 3-1) 페이지 네비게이션(HTML 문서) → Cache First (캐시 스큐 방지)
  // HTML을 Network First로 서빙하면, 구 SW가 신버전 HTML(네트워크) + 구버전 JS(캐시)를
  // 섞어서 반환하여 ESM import 그래프가 붕괴하는 캐시 스큐가 발생한다.
  // Cache First로 변경하면 HTML과 JS가 항상 동일한 CACHE_VERSION 캐시에서 서빙되어
  // 세대 내 불일치가 원천 차단된다. 새 SW install + skipWaiting + controllerchange 리로드 후
  // 신버전 캐시로 일괄 전환되므로 업데이트 지연은 최대 1 page load 분량이다.
  if (request.mode === 'navigate') {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 4) 학습 데이터 파일 → 파일명에 콘텐츠 해시가 있는 번들만 Cache First.
  //    해시 번들(exams/subject4.<hash>.js 등)은 URL이 곧 버전이라 불변이지만,
  //    해시 없는 번들(drills/combo_index.js, exams_md·docs_md·study_md 등)은 같은
  //    경로로 내용이 갱신되므로 cacheFirst로 서빙하면 DATA_CACHE가 배포 간 유지되는
  //    특성상 구버전이 영구 서빙된다 → Network First (오프라인 시 캐시 폴백).
  if (url.pathname.includes('/data/')) {
    const basename = url.pathname.split('/').pop() || '';
    const isImmutable = /\.[0-9a-f]{8,}\.[a-z0-9]+$/i.test(basename);
    if (isImmutable) {
      event.respondWith(cacheFirst(request, DATA_CACHE));
    } else {
      event.respondWith(networkFirst(request, DATA_CACHE));
    }
    return;
  }

  // 4-1) 마크다운 원본 파일 → Stale-While-Revalidate (content/exams/*.md 등, 정적 원본)
  //      단, ref_md/*.md는 DATA_CACHE(배포 간 유지)로 분리 — SHELL_CACHE는 배포마다 전체 삭제되므로
  //      26MB 참조자료 MD가 매 배포마다 재다운로드되는 것을 방지.
  //      교재 MD는 SW 업데이트와 무관하게 백그라운드 갱신되도록 SWR 적용
  //      (cacheFirst일 때 SW가 갱신되지 않으면 구버전 MD가 영구 서빙되는 문제 방지)
  if (MD_PATTERN.test(url.pathname)) {
    const targetCache = url.pathname.includes('/ref_md/') ? DATA_CACHE : SHELL_CACHE;
    event.respondWith(staleWhileRevalidate(request, targetCache));
    return;
  }

  // 5-1) /src/ 하위 JS 모듈 → Cache First (캐시 스큐 방지)
  //      ESM import 그래프는 한 모듈이라도 버전이 어긋나면 전체가 드랍됨.
  //      networkFirst를 쓰면 모바일 불안정 네트워크에서 일부는 신버전(네트워크),
  //      일부는 구버전(캐시)이 섞여 import { 새이름 }이 구파일에 없어 그래프가 붕괴.
  //      cacheFirst + SHELL_ASSETS 프리캐시로 동일 버전 파일만 일관 서빙.
  //      새 SW install 시 새 CACHE_VERSION 캐시에 전체 셸을 원자적으로 프리캐시 → 세대 내 불일치 불가.
  if (url.pathname.includes('/src/') && /\.js$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 5-2) CSS → Cache First (캐시 스큐 방지 — /src/ JS와 동일 사유)
  //      배포 전환 순간 "구버전 HTML(cacheFirst) + 신버전 CSS(networkFirst)" 혼합으로
  //      화면 깨짐 방지. SHELL_ASSETS 프리캐시로 동일 버전만 서빙.
  if (/\.css$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 5-3) ref_md 정적 콘텐츠 (.html) → Cache First + DATA_CACHE (배포 간 유지)
  //      body-only HTML도 매 배포마다 재다운로드되지 않도록 MD와 동일 처리.
  if (url.pathname.includes('/ref_md/') && /\.html$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }

  // 5-4) 그 외 JS → Network First
  //      (온라인이면 항상 최신 배포본, 오프라인이면 캐시 폴백.
  //       버전 bump을 깜빡해도 폰에서 구버전이 남지 않도록 함)
  if (/\.js$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // 6) 그 외 App Shell(아이콘/이미지 등) → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

/* ------------------------------------------------------------
 * 캐시 전략 구현
 * ---------------------------------------------------------- */

/** Network First: 네트워크 우선, 실패 시 캐시 폴리백 (HTML 문서용) */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // respondWith settle 후 SW 종료로 쓰기가 드랍되지 않도록 완료를 기다린다
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/** Cache First: 캐시 우선, 없으면 네트워크 후 캐시에 저장 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return offlineFallback(request);
  }
}

/** Stale-While-Revalidate: 캐시 즉시 반환 + 백그라운드 갱신 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // 캐시가 있으면 즉시 반환, 없으면 네트워크 대기
  return cached || (await networkPromise) || offlineFallback(request);
}

/** 오프라인 폴리백: 페이지 요청이면 캐시된 index.html 반환, 이미지는 빈 투명 PNG */
async function offlineFallback(request) {
  if (request.mode === 'navigate') {
    const cached = await caches.match('./index.html');
    if (cached) return cached;
  }
  // 이미지 요청은 1x1 투명 PNG 반환 (UI 깨짐 방지)
  if (request.destination === 'image') {
    const transparentPng = Uint8Array.from(atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    ), c => c.charCodeAt(0));
    return new Response(transparentPng, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }
    });
  }
  // 기존 캐시에서 유사 요청 시도
  const cachedMatch = await caches.match(request);
  if (cachedMatch) return cachedMatch;
  return Response.error();
}
