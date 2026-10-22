// src/exam-context.js — 멀티시험 컨텍스트 (활성 시험 해석 + 경로/기능 해결)
// @spec ES-01~05,DA-06~08,DA-15
//
// 시험 목록: data/exams.js 클래식 번들이 window.EXAMS_LIST를 채운다
// (file:// 호환 — fetch 불가 환경에서도 스크립트 태그로 로드).
// 시험 전환은 location.reload()로 모든 모듈 상태를 리셋한다.
// 의존성 없는 리프 모듈 — 다른 모듈이 import해도 순환 참조가 생기지 않는다.

const CURRENT_EXAM_KEY = 'current_exam';

// 레지스트리 부재 시 최후 폴백 — EXAMS_LIST 번들 → (Node) content/exams.json 원본
// 순으로 해석한다. 특정 시험 id를 코드에 박지 않는다 (DA-15).
// 지연 해석: 번들 미로드 상태의 모듈 평가 시점 순서에 의존하지 않기 위해 첫 호출에서 해석.
let _defaultExamId;
function resolveDefaultExamId() {
    if (_defaultExamId !== undefined) return _defaultExamId;
    const list = ((globalThis.EXAMS_LIST && globalThis.EXAMS_LIST.exams)
        || (typeof window !== 'undefined' && window.EXAMS_LIST && window.EXAMS_LIST.exams)) || [];
    const def = (Array.isArray(list) && (list.find(e => e && e.default) || list[0])) || null;
    if (def && def.id) {
        _defaultExamId = def.id;
    } else {
        const proc = /** @type {any} */ (globalThis.process);
        if (proc && proc.versions && proc.versions.node && proc.getBuiltinModule) {
            // Node·테스트 환경 — 번들 없이도 레지스트리 원본(content/exams.json)을 직접 읽는다.
            try {
                const fs = proc.getBuiltinModule('fs');
                const pathMod = proc.getBuiltinModule('path');
                const { fileURLToPath } = proc.getBuiltinModule('url');
                // import.meta.url이 file: 스킴이 아닌 변환 환경(vitest SSR 등)은 cwd에서 해석
                let file = pathMod.resolve(proc.cwd(), 'content', 'exams.json');
                try { file = fileURLToPath(new URL('../content/exams.json', import.meta.url)); } catch { /* cwd 경로 사용 */ }
                const raw = fs.readFileSync(file, 'utf-8');
                const exams = JSON.parse(raw).exams || [];
                const d = exams.find(e => e && e.default) || exams[0];
                _defaultExamId = (d && d.id) || null;
            } catch (e) {
                _defaultExamId = null;
            }
        } else {
            _defaultExamId = null;
        }
    }
    return _defaultExamId;
}

/** 시험 목록 (exams.json → data/exams.js 번들) */
export function getExamList() {
    const list = (typeof window !== 'undefined' && window.EXAMS_LIST && window.EXAMS_LIST.exams) || [];
    return Array.isArray(list) ? list : [];
}

/** 사용자가 선택한 시험 id (미선택 시 null) */
export function getCurrentExamId() {
    try {
        return localStorage.getItem(CURRENT_EXAM_KEY) || null;
    } catch (e) {
        return null;
    }
}

/**
 * 활성 시험 엔트리 해석.
 * 우선순위: 선택된 시험 → default 플래그 → 목록 첫 항목 → null(레지스트리 없음).
 */
export function getActiveExam() {
    const exams = getExamList();
    if (!exams.length) return null;
    const id = getCurrentExamId();
    return exams.find(e => e.id === id)
        || exams.find(e => e.default)
        || exams[0];
}

/**
 * 활성 시험의 레지스트리 오브젝트 — exams.json의 registryGlobal 규약 해석.
 * window.DATA_REGISTRY 직독은 정적 스크립트가 채우는 "기본 시험 전역"만 보게 되어
 * 비기본 시험 활성 시 엉뚱한 콘텐츠(기본 시험 과목·규칙·문제은행 맵)를 읽는다.
 * 플랫폼 모듈은 이 접근자로만 레지스트리에 접근한다 — 예외는 로딩 경로를
 * 소유하는 data-loader.js뿐이다 (DA-15 R4).
 * @returns {object|null}
 */
export function getActiveRegistry() {
    if (typeof window === 'undefined') return null;
    const exam = getActiveExam();
    const g = window[(exam && exam.registryGlobal) || 'DATA_REGISTRY'];
    return g || null;
}

/** 활성 시험 id (목록 부재 시 레지스트리 기본값 — 해석 불가면 null). Node 도구에서는 EXAM_ID 환경변수로 지정 가능. */
export function getActiveExamId() {
    const exam = getActiveExam();
    if (exam) return exam.id;
    if (typeof process !== 'undefined' && process.env && process.env.EXAM_ID) {
        return process.env.EXAM_ID;
    }
    return resolveDefaultExamId();
}

/**
 * 시험 선택 — 다른 시험이면 선택 저장 후 리로드(모듈/전역 상태 리셋),
 * 같은 시험이면 false 반환(호출자가 뷰 전환만 처리).
 * @returns {boolean} 리로드가 발생하면 true
 */
export function selectExam(id) {
    const exams = getExamList();
    const exam = exams.find(e => e.id === id);
    if (!exam) return false;
    if (getActiveExamId() === id) {
        // 같은 시험: 리로드 불필요. 단, 미선택 상태에서 기본 시험을 고른 경우도
        // current_exam을 저장해야 한다 — 저장 생략 시 매번 피커가 뜨는 회귀.
        try {
            localStorage.setItem(CURRENT_EXAM_KEY, id);
        } catch (e) { /* noop */ }
        return false;
    }
    try {
        localStorage.setItem(CURRENT_EXAM_KEY, id);
    } catch (e) { /* noop */ }
    try { location.reload(); } catch (e) { /* noop */ }
    return true;
}

/**
 * 활성 시험의 앱 이름 — 브랜드면(iOS 홈화면 타이틀·푸터·온보딩·미디어 세션)에 쓰는 단일 이름.
 * 우선순위: exam.appName → logoMain+logoSub → exam.name → 'PassOK'(플랫폼 브랜드 폴백).
 * 영문 별칭(appNameEn)은 별도 보존 필드 — 표기용 부브랜드(로고·문서 병기 등).
 * @returns {string}
 */
export function getExamAppName() {
    const exam = getActiveExam();
    if (!exam) return 'PassOK';
    return exam.appName
        || ((exam.logoMain || '') + (exam.logoSub || '')).trim()
        || exam.name
        || 'PassOK';
}

/** 시험 기능 플래그 (exams.json의 features — 미지정 시 false) */
export function hasFeature(name) {
    const exam = getActiveExam();
    return !!(exam && exam.features && exam.features[name]);
}

/* =======================================================
   시험별 스킨 토큰 (exams.json theme — DA-14)
   ======================================================= */

// 주입 허용 토큰 화이트리스트 — 색·배경·테두리 계열만. 레이아웃/치수 변수를
// 열어두면 콘텐츠 팩이 플랫폼 골격을 깰 수 있어 제한한다.
// ⚠️ pwa-manifest.js(클래식 스크립트, import 불가)에 동일 정규식이 복제돼 있다 — 함께 갱신.
const THEME_TOKEN_RE = /^--(?:color|bg|border|stroke)-[a-z][a-z0-9-]*$/i;

/**
 * exams.json `theme` 객체 → {CSS 토큰: 값} 정제 (순수 함수 — DOM 없이 테스트 가능).
 * 화이트리스트 밖 토큰·비문자열 값은 버린다.
 * @param {object|null} exam
 * @returns {Object<string,string>}
 */
export function resolveExamThemeTokens(exam) {
    const theme = (exam && typeof exam.theme === 'object' && exam.theme) || {};
    /** @type {Object<string,string>} */
    const out = {};
    for (const [token, value] of Object.entries(theme)) {
        if (!THEME_TOKEN_RE.test(token) || typeof value !== 'string' || !value.trim()) continue;
        out[token] = value;
    }
    return out;
}

/**
 * 활성 시험 스킨 적용 — `<html data-exam>` 속성 부여 + theme 토큰을
 * documentElement 인라인 변수로 주입 (라이트/다크 양쪽 테마 위에 적용).
 * 부팅 초기에는 pwa-manifest.js가 먼저 같은 일을 하므로 여기서는
 * 브랜딩 재적용 경로의 일관성만 보장한다.
 * @param {object|null} [exam]
 */
export function applyExamTheme(exam) {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const target = exam !== undefined ? exam : getActiveExam();
    if (target && target.id) document.documentElement.dataset.exam = target.id;
    for (const [token, value] of Object.entries(resolveExamThemeTokens(target))) {
        document.documentElement.style.setProperty(token, value);
    }
}

/** 시험 콘텐츠 루트 기준 상대 경로 (예: contentPath('교재/law/a.md')) */
export function contentPath(rel) {
    const exam = getActiveExam();
    const root = (exam && exam.contentRoot)
        || (typeof process !== 'undefined' && process.env && process.env.EXAM_CONTENT_ROOT)
        || `content/exams/${resolveDefaultExamId()}`;
    return `${root}/${rel}`;
}

/** 시험 데이터 루트 기준 상대 경로 (예: dataPath('drills/ox_subject1.js')) */
export function dataPath(rel) {
    const exam = getActiveExam();
    const root = (exam && exam.dataRoot)
        || (typeof process !== 'undefined' && process.env && process.env.EXAM_DATA_ROOT)
        || `data/exams/${resolveDefaultExamId()}`;
    return `${root}/${rel}`;
}

/* =======================================================
   localStorage 네임스페이스 (시험별 진도 격리)
   ======================================================= */

// 앱 전역(기기/세션 수준)으로 유지할 키 — 시험과 무관하게 공유
const GLOBAL_KEYS = new Set([
    CURRENT_EXAM_KEY,
    'ns_migrated_v2',
    'appTheme',
    'preferredOrientation',
    '__inappGuideShown',
    'readerAudioRate',
    'readerAudioAutoScroll',
    'ui_analysis_open',
    'ui_toc_hint_seen',
    'ui_mode',
    'ui_study_tools_open',
    'device_id',                   // 동기화 기기 식별 — 시험 무관
    'telemetry_opt_out',           // 사용 텔레메트리 거부 — 기기 단위 (UX-MET-06)
    'telemetry_notice_shown',      // 텔레메트리 최초 고지 표시 — 기기 단위 (UX-MET-06)
    'telemetry_queue',             // 오프라인 이벤트 큐 — 기기 단위 (UX-MET-08)
    'pro_entitled',                // Pro 이용 권한 — 사용자 수준, 시험 무관
    'pro_notice_seen',             // Pro 안내 전역 1회 seen (ROAD-P5) — 플랜 안내는 시험 무관 사용자 수준
    'usage_stats',                 // 사용 카운터 — 기기(익명 유저) 단위, 시험 전환해도 누적 유지
    'usage_snapshot_sent',         // 사용 스냅샷 전송일 — 기기 단위 (UX-MET-05)
    'passmula_auth_mail_cooldown_until', // 로그인 메일 재발송 쿨다운 — 시험 무관
    'last_seen_version',       // 새 버전 알림 마지막 확인 버전 — 시험 무관
    'entry_source',            // 최초 유입 채널 (?src= 파라미터) — 시험 무관
    'feedback_last_ts',        // 의견 제출 쿨다운 타임스탬프 — 시험 무관
    'pending_feedback',        // 오프라인 의견 제출 큐 — 시험 무관
    'feedback_hint_seen',      // "의견 보내기" NEW 배지 확인 — 시험 무관
    'feedback_dot_seen',       // 설정 버튼 점 확인 — 시험 무관
    'exam_stamp_seen'          // 시험별 콘텐츠 스탬프 확인 맵 {examId:stamp} (ES-07) — 시험 무관
]);

// @spec DA-06~08,ES-03
/** 시험별 진도 네임스페이스 — 진도 키에 시험 접두사 부여 (`fc_memorized` → `cosmetic:fc_memorized`, GLOBAL_KEYS 제외) */
export function scopedKey(key) {
    if (GLOBAL_KEYS.has(key)) return key;
    return `${getActiveExamId()}:${key}`;
}

/** 네임스페이스된 실제 저장키에서 원래 키를 복원 (현재 시험 소속이 아니면 null) */
export function unscopedKey(raw) {
    const prefix = `${getActiveExamId()}:`;
    return (raw && raw.startsWith(prefix)) ? raw.slice(prefix.length) : null;
}

// @spec ES-06
/**
 * 임의 시험 네임스페이스의 진도 키를 읽기 전용으로 조회 — 시험 선택 카드 요약용.
 * 활성 시험과 무관하게 `<examId>:<key>`를 읽는다. GLOBAL_KEYS는 비접두사라 그대로 조회.
 * 쓰기는 제공하지 않는다 — 다른 시험 진도의 변경 경로는 시험 전환뿐이다.
 * @param {string} examId
 * @param {string} key - 비접두사 논리 키 (예: 'fc_memorized')
 * @returns {string|null}
 */
export function peekExamValue(examId, key) {
    const actual = GLOBAL_KEYS.has(key) ? key : `${examId}:${key}`;
    try { return localStorage.getItem(actual); } catch (e) { return null; }
}

/**
 * 레거시(비네임스페이스) 진도 키 일괄 삭제 — 1회 실행.
 * 멀티시험 전환으로 기존 진도는 초기화 정책(사용자 승인). 앱 전역 키(GLOBAL_KEYS)는 보존.
 * @param {string[]} knownKeys - 제거할 레거시 정적 키 목록
 * @param {string[]} knownPrefixes - 제거할 레거시 동적 키 접두사 목록
 */
export function purgeLegacyStorage(knownKeys, knownPrefixes) {
    const FLAG = 'ns_migrated_v2';
    try {
        if (localStorage.getItem(FLAG)) return;
        const known = new Set(knownKeys);
        const doomed = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || GLOBAL_KEYS.has(key)) continue; // 앱 전역 키(테마·리더 설정 등)는 보존
            if (key.indexOf(':') !== -1) continue; // 이미 네임스페이스됨
            if (known.has(key) || knownPrefixes.some(p => key.startsWith(p))) doomed.push(key);
        }
        doomed.forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* noop */ } });
        localStorage.setItem(FLAG, '1');
    } catch (e) { /* noop */ }
}

/**
 * 활성 시험의 합격/과락 규칙 — manifest `integratedExam` 필드에서 읽는다.
 * 교재/시험 교체 시 매니페스트만 바꾸면 판정 로직이 그대로 유효하다.
 * @returns {{passAverage:number, subjectFailBelow:number}}
 *   passAverage: 평균 합격선(기본 60) / subjectFailBelow: 과목 과락선(기본 40)
 */
export function getExamRules() {
    const ie = (getActiveRegistry() || {}).integratedExam || {};
    return {
        passAverage: typeof ie.passAverage === 'number' ? ie.passAverage : 60,
        subjectFailBelow: typeof ie.subjectFailBelow === 'number' ? ie.subjectFailBelow : 40
    };
}

/* =========================================================
   📚 시험별 학습 계획 설정 (manifest study 블록 — D-17/SC-15)
   ========================================================= */

function _registryStudy() {
    return (getActiveRegistry() || {}).study || {};
}

function _registrySubjectTotals() {
    const subjects = (getActiveRegistry() || {}).subjects || [];
    return subjects.reduce((t, s) => ({
        cards: t.cards + (((s.stats && (s.stats.targetCards || s.stats.cards)) || 0)),
        quizzes: t.quizzes + (((s.stats && (s.stats.targetQuizzes || s.stats.quizzes)) || 0)),
    }), { cards: 0, quizzes: 0 });
}

/**
 * 최소 권장 준비 기간(일) — manifest study.minExamLeadDays 우선 (D-17).
 * 미선언 시 콘텐츠 규모로 유도: 카드 1회전(학습일당 50장)을 달력일 환산해 FSRS
 * 마진 1.5배, 문제은행 1회전(학습일당 10문) 달력일 환산과 큰 쪽.
 * 모든 학습량은 주 5일 학습일 기준으로 산정 후 ×7/5로 달력일 변환.
 * 레지스트리 없으면 50.
 */
export function getMinExamLeadDays() {
    const s = _registryStudy();
    if (typeof s.minExamLeadDays === 'number' && s.minExamLeadDays > 0) return s.minExamLeadDays;
    const { cards, quizzes } = _registrySubjectTotals();
    if (!cards && !quizzes) return 50;
    const cardCalDays = Math.ceil(cards / 50) * (7 / 5);   // 학습일 → 달력일
    const quizCalDays = Math.ceil(quizzes / 10) * (7 / 5); // 학습일 → 달력일
    return Math.ceil(Math.max(cardCalDays * 1.5, quizCalDays));
}

/**
 * 교재 일독 예상 기간(학습일) — manifest study.readThroughDays 우선 (SC-15).
 * 미선언 시 기본 10일 (cosmetic 4과목 ≈1.3만 줄 ÷ 학습일당 ~1,300줄 기준).
 */
export function getReadThroughDays() {
    const s = _registryStudy();
    return (typeof s.readThroughDays === 'number' && s.readThroughDays > 0) ? s.readThroughDays : 10;
}

/**
 * 일독 기간 중 통독 1일이 대치하는 카드 학습일 비율 (0~1) — manifest study.readDayShare.
 * 1 = 통독일은 카드 학습 불가(보수적 기본), <1 = 읽기·카드 병행을 인정해 부분 차감.
 * 미선언·범위 외 값이면 1.
 */
export function getReadDayShare() {
    const s = _registryStudy();
    return (typeof s.readDayShare === 'number' && s.readDayShare > 0 && s.readDayShare <= 1)
        ? s.readDayShare : 1;
}

/**
 * 활성 시험의 과목 수 — registry.subjects 길이. 레지스트리 미로딩 시 0.
 * getTextbookReadProgress 분모 등 과목 수가 필요한 집계에서 사용 (SC-15).
 */
export function getActiveSubjectCount() {
    const subjects = (getActiveRegistry() || {}).subjects || [];
    return subjects.length;
}

/**
 * 'subjectN' 형식 키 → 레지스트리의 과목 키로 매핑.
 * subjectN은 레거시가 아니라 문제은행(exams[])의 현행 키 규약이다 — 문항 id
 * (subject1_q3 등)·문제은행 번들·구버전 진도 키가 모두 이 규약을 공유하므로
 * 과목 키(law 등)로 환산할 때 이 함수를 거친다.
 * (charts.js 성적 집계와 recommendations.js 과락 추천이 같은 규칙을 쓴다).
 * @param {string} subj
 * @returns {string} 매핑된 과목 키 (subjectN이 아니거나 매핑 실패 시 입력 그대로)
 */
export function resolveLegacySubjectKey(subj) {
    if (!subj || !subj.startsWith('subject')) return subj;
    const exams = (getActiveRegistry() || {}).exams || [];
    const exam = exams.find(e => e.key === subj || e.key.startsWith(subj));
    return exam ? exam.subject : subj;
}

/**
 * 문제집(exam) 키 → 과목 키 매핑.
 * 정확 일치 → 접두 매칭(subject2_p1 ↔ subject2 호환) → 첫 과목 폴백 순.
 */
export function examIdToSubjectId(examId) {
    const registry = getActiveRegistry();
    if (registry && registry.exams) {
        const exam = registry.exams.find(e => e.key === examId);
        if (exam) return exam.subject;
        // prefix 매칭 호환성 (예: subject2_p1 또는 subject2)
        const partialExam = registry.exams.find(e => examId.startsWith(e.key) || e.key.startsWith(examId));
        if (partialExam) return partialExam.subject;
    }
    if (registry && registry.subjects && registry.subjects.length > 0) {
        return registry.subjects[0].key;
    }
    return null;
}
