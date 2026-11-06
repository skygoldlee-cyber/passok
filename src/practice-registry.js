// src/practice-registry.js — 실무작업실 피처 레지스트리
// @spec UM-01~05 · UM-06
//
// 실무 피처 = 시험 features 키 → 실무작업실 뷰 정의의 선언적 매핑.
// 신규 실무 피처(예: 다른 시험의 제조·검사 도구)는 여기에 엔트리를
// 추가하고 exams.json에 features 키를 선언하면 된다 — ui-mode 랜딩,
// 뷰 타이틀·해시 슬러그, 지연 로더·핸들러 등록이 전부 이 표에서 유도된다.
//
// 시험별 자산 격리: 피처 뷰 모듈은 SHELL_ASSETS 프리캐시에 두지 않고
// (활성 시험만 쓰는 자산이므로) 뷰 마크업도 셸에 빈 스텁만 둔 채
// markup 필드의 파셜을 진입/예열 시 주입한다. warmPracticeFeatures()가
// 유휴 시점에 유효 피처의 모듈·마크업을 미리 요청해 SW 캐시(cacheFirst/
// SWR 경유)에 적재 — 오프라인 진입과 첫 진입 지연을 함께 확보한다.
//
// 의존성 규칙: 이 모듈의 정적 import는 exam-context 하나로 제한한다.
// 피처 뷰 모듈·DataLoader·ui-utils·도메인 훅은 전부 enter() 내부의
// 지연 import()로 참조해, import 시점의 모듈 그래프 팽창·순환을 막는다.
import { hasFeature, getActiveExamId, getActiveExam } from './core/exam-context.js';

const _lazyImport = (load) => { let p = null; return () => (p ??= load()); };

// 도메인 경로 규약 — 실무 피처 자산은 활성 시험 id 아래 시험 무관 동일 상대
// 경로에 둔다: 모듈 src/exams/<시험id>/<rel>, 마크업 html/exams/<시험id>/<rel>.
// 로더 호출 시점의 활성 시험으로 경로를 해석하므로 플랫폼 코드에 시험 id
// 리터럴이 남지 않고, 신규 시험은 같은 구조로 파일만 배치하면 된다.
// .rel은 규약 선언 자체 — 유닛 테스트가 "features 키 보유 시험 → 파일 실존"을 검증한다.
/**
 * @param {string} rel - src/exams/<시험id>/ 아래 상대 모듈 경로
 * @returns {(() => Promise<any>) & { rel: string }}
 */
const _domainImport = (rel) => Object.assign(
    _lazyImport(() => import(/* @vite-ignore */ `./exams/${getActiveExamId()}/${rel}`)),
    { rel }
);
const _domainMarkup = (rel) => `./html/exams/${getActiveExamId()}/${rel}`;
const _domainCss = (rel) => `./css/exams/${getActiveExamId()}/${rel}`;

const formula = {
    viewId: 'formula-view',
    slug: 'formula',
    // 랜딩 우선순위 — 복수 실무 피처가 유효한 시험에서 작은 값이 랜딩된다 (미지정=0)
    priority: 0,
    // 표시 카피는 시험 소유 — manifest uiText[uiTextKey]가 아래 중립 기본값을
    // 덮어쓴다 (title·subtitle은 뷰 타이틀, loading·error·dataError는 enter()의
    // 로딩·실패 토스트). 미선언 시험에는 도메인 중립 문구가 노출된다.
    uiTextKey: 'formula',
    title: '실습',
    subtitle: '도메인 실습 도구',
    loadingText: '실습 데이터를 불러오는 중입니다...',
    loadErrorText: '실습 화면을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    // 뷰 마크업 파셜 — 셸(index.html)에는 빈 <section id> 스텁만 존재,
    // enter()/예열 시 fetch로 주입된다. 파셜은 자체 <section>을 포함하므로
    // 스텁을 outerHTML 교체한다. 상대 경로는 html/exams/<활성시험>/ 규약.
    markup: 'formula.html',
    // 도메인 스타일 — css/exams/<활성시험>/ 규약. style.css의 정적 @import가
    // 아니라 피처 진입·예열 시 <link> 주입 — 비활성 시험은 도메인 CSS를
    // 요청하지 않는다 (네트워크 격리).
    styles: 'formula.css',
    // 도메인 뷰 모듈 — src/exams/<활성시험>/views/ 규약. 플랫폼 공용 모듈은
    // (notice-check) 시험 무관 단일 경로라 리터럴을 유지한다.
    loaders: {
        main: _domainImport('views/formula.js'),
        batch: _domainImport('views/formula-batch.js'),
        customer: _domainImport('views/formula-customer.js'),
        material: _domainImport('views/formula-material.js'),
        compliance: _domainImport('views/formula-compliance.js'),
        audit: _domainImport('views/formula-audit.js'),
        adverse: _domainImport('views/formula-adverse.js'),
        sales: _domainImport('views/formula-sales.js'),
        products: _domainImport('views/formula-products.js'),
        notice: _lazyImport(() => import('./shell/notice-check.js')),
    },
    // [loaderKey, data-click 핸들러명 목록] — app.js 위임 디스패치에 브리지된다
    /** @type {Array<[string, string[]]>} */
    handlers: [
        ['main', [
            'exitFormulaSubView', 'openFormulaList', 'openFormulaCalc', 'openIngredientDict',
            'formulaNew', 'formulaOpen', 'formulaDuplicate', 'formulaDelete',
            'formulaCalcAddRow', 'formulaCalcRemoveRow', 'formulaCalcSave', 'formulaAddIngredient',
            'formulaRecAdd', 'formulaRecAddBase', 'formulaLoadBase',
            'formulaRuleAdd', 'formulaRuleRemove', 'formulaRuleReset',
            'formulaRuleExport', 'formulaRuleImport',
            'formulaSortPhase', 'formulaStepAdd', 'formulaStepRemove',
            'formulaPrint', 'formulaExportJson', 'formulaCardExport', 'formulaImportJson',
            'formulaWeighOpen', 'formulaWeighNext', 'formulaWeighPrev', 'formulaWeighClose',
            'formulaToggleContrast', 'formulaPrintWorkOrder',
            'customIngAdd', 'customIngEdit', 'customIngSave', 'customIngDelete', 'customIngClose',
            'formulaAllergyAdd', 'formulaAllergyRemove', 'formulaCustLoad', 'formulaCustSaveAs',
            'formulaSetBizType',
        ]],
        ['batch', [
            'openBatchPanel', 'batchNew', 'batchEdit', 'batchSave', 'batchOpen', 'batchDelete',
            'batchFormulaChanged', 'batchCustChanged', 'batchPrintRecord', 'batchPrintLabel',
            'batchPrintGuide', 'batchFilterReset', 'batchExportCsv', 'batchPrintSales',
        ]],
        ['customer', [
            'openCustomerPanel', 'custNew', 'custEdit', 'custSave', 'custOpen', 'custDelete',
            'custLogAdd', 'custAllergyAdd', 'custAllergyRemove',
            'custImportCsv', 'custExportCsv', 'custCsvTemplate', 'custPrintConsent',
        ]],
        ['material', [
            'openMaterialPanel', 'matNew', 'matEdit', 'matSave', 'matDelete',
            'matImportCsv', 'matExportCsv', 'matCsvTemplate',
            'matTrace', 'matTracePrint', 'matTraceClose',
        ]],
        ['adverse', [
            'openAdversePanel', 'advSave', 'advEdit', 'advDelete', 'advCancel',
        ]],
        ['compliance', [
            'openCompliancePanel', 'compToggle', 'compReset', 'compOpenLaw', 'compAuditLogClear',
        ]],
        ['audit', [
            'auditPrintReport',
        ]],
        ['sales', [
            'openLabelPanel', 'labelFormulaImport', 'labelPrintSheet',
            'openAdLintPanel', 'adlintRun', 'adlintClear',
        ]],
        ['products', [
            'openProductPanel', 'productNew', 'productEdit', 'productSave', 'productOpen',
            'productDelete', 'productChipRemove', 'productIngRegister', 'productIngRegisterAll',
            'productClearFilter',
            'productCardExport', 'productAnalysisExport', 'productImportJson', 'productOpenByIngredient',
            'productRankPick',
            'productVisionToggle', 'productPhotoPick', 'productPhotoRemove',
            'productVisionRead', 'productVisionCancel',
            'productVisionKeySave', 'productVisionKeyClear',
            'productVisionKeyTest', 'productVisionModelSave', 'productVisionHiRes',
        ]],
        ['notice', [
            'checkMfdsNoticeNow', 'dismissMfdsNotice', 'viewMfdsNoticeStatus', 'dismissRefRevision',
        ]],
    ],
    // 뷰 진입 — 피처가 자체 로딩·데이터 선행·초기화·도메인 훅을 소유한다.
    // renderFn은 비동기 — navigateToView가 반환값을 기다리지 않으므로
    // 내부에서 모든 실패를 삼켜야 한다 (토스트로 보고).
    // ROAD-Q3 — gen은 라우터가 부여한 렌더 세대. await 재개 지점마다
    // isStaleViewGen으로 판정해 다른 뷰로 전환된 뒤의 늦은 DOM·로딩·토스트
    // 쓰기를 차단한다. 스테일이면 로딩 해제도 건너뛴다 — navigateToView가
    // 전환 시점에 전역 로딩을 이미 내렸고 새 뷰의 스피너를 지우면 안 된다.
    async enter(gen) {
        const [{ DataLoader }, { showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([
                import('./content/data-loader.js'),
                import('./ui-utils.js'),
                import('./views/navigation.js'),
                formula.loaders.notice(), // 모듈 선로딩 유지 — 허브 버튼 핸들러용
            ]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        // 표시 카피는 시험 소유 — manifest uiText.formula가 정의 기본값을 덮어쓴다
        const ut = (DataLoader.registry && DataLoader.registry.uiText && DataLoader.registry.uiText.formula) || {};
        showGlobalLoading(ut.loading || formula.loadingText);
        try {
            // 배너·허브 버튼이 뷰 마크업에 의존하므로 주입을 선행한다
            await ensureViewMarkup(formula);
            if (stale()) return;
            // 고시 감지 배너 확인은 부팅 경로로 이전됨 (RR-20 bootLawNotice — 시험 활성화 시 1회)
            const m = await formula.loaders.main();
            if (stale()) return;
            try {
                await DataLoader.loadIngredients();
            } catch (e) {
                if (!stale()) showToast(ut.dataError || formula.dataErrorText, 'error');
            }
            if (stale()) return;
            m.initFormulaView();
        } catch (e) {
            if (!stale()) showToast(ut.error || formula.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};

/**
 * 뷰 마크업 지연 주입 — 셸의 빈 스텁 <section>(data-lazy-view 보유)을
 * 파셜 파일의 내용으로 통째 교체한다. 파셜 자체가 <section id>를 포함하므로
 * 주입 후 스텁은 사라지고 data-lazy-view 부재가 "주입 완료" 표식이 된다.
 * (DOM 테스트는 helpers가 동일 파셜을 미리 주입하므로 이 경로는
 *  실제 런타임 최초 진입에서만 실행된다)
 */
/**
 * 도메인 스타일 지연 주입 — feat.styles를 활성 시험 css/exams/<id>/ 규약으로
 * 해석해 <link>를 1회 삽입한다. style.css의 정적 @import는 모든 시험에
 * 로드되므로 도메인 CSS는 이 경로만 거친다.
 */
function ensureDomainStyles(feat) {
    if (!feat.styles || typeof document === 'undefined') return;
    const href = _domainCss(feat.styles);
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

async function ensureViewMarkup(feat) {
    ensureDomainStyles(feat);
    if (!feat.markup) return;
    const el = document.getElementById(feat.viewId);
    if (!el || !el.hasAttribute('data-lazy-view')) return;
    const url = _domainMarkup(feat.markup);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`view markup ${res.status}: ${url}`);
    // 스텁의 런타임 상태 보존 — 딥링크로 navigateToView가 먼저 'active'를
    // 부여한 뒤 enter()의 본 주입이 스텁을 통째 교체하면 클래스가 소실돼
    // 뷰가 숨는다 (부팅 딥링크 → 지연 뷰 경로의 실결함).
    const wasActive = el.classList.contains('active');
    el.outerHTML = await res.text();
    if (wasActive) {
        const injected = document.getElementById(feat.viewId);
        if (injected) injected.classList.add('active');
    }
}

/**
 * 유휴 시점 예열 — 유효 실무 피처의 뷰 모듈·마크업을 미리 요청한다.
 * 요청은 SW cacheFirst/SWR을 경유해 캐시에 적재되므로, 활성 시험의 실무
 * 피처만 프리캐시 없이도 오프라인 진입·첫 진입 즉시성을 확보한다.
 * 실패는 무시 — 예열은 최적화이며 실제 진입 시 다시 시도된다.
 */
export function warmPracticeFeatures() {
    for (const f of getEnabledPracticeFeatures()) {
        for (const load of Object.values(f.loaders)) load().catch(() => {});
        ensureViewMarkup(f).catch(() => {});
    }
}

/** 실무 피처 정의 — 키는 exams.json의 features 키와 1:1 대응한다 */
const careHome = {
    viewId: 'care-home-view',
    slug: 'care-home',
    priority: -1,
    uiTextKey: 'careHome',
    title: 'Care OS 홈',
    subtitle: '오늘 근무 요약',
    loadingText: '홈을 불러오는 중입니다...',
    loadErrorText: '홈을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-home.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-home.js'), ai: _domainImport('care-ai.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careDocSignSave', 'careSignImagePick']], ['ai', ['careAiDraft']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careHome.loadingText);
        try {
            await ensureViewMarkup(careHome);
            if (stale()) return;
            const m = await careHome.loaders.main();
            if (stale()) return;
            m.initCareHomeView();
        } catch (e) {
            if (!stale()) showToast(careHome.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careCalc = {
    viewId: 'care-calc-view',
    slug: 'care-calc',
    priority: 0,
    uiTextKey: 'careCalc',
    title: '본인부담금 계산',
    subtitle: '등급·서비스별 본인부담금 산출',
    loadingText: '계산기를 불러오는 중입니다...',
    loadErrorText: '계산기를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-calc.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-calc.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careCalcRun', 'careCalcReset', 'careCalcPrint']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careCalc.loadingText);
        try {
            await ensureViewMarkup(careCalc);
            if (stale()) return;
            const m = await careCalc.loaders.main();
            if (stale()) return;
            m.initCareCalcView();
        } catch (e) {
            if (!stale()) showToast(careCalc.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careCard = {
    viewId: 'care-card-view',
    slug: 'care-card',
    priority: 2,
    uiTextKey: 'careCard',
    title: '대처카드',
    subtitle: '상황별 현장 판단 플로우',
    loadingText: '대처카드를 불러오는 중입니다...',
    loadErrorText: '대처카드를 불러오지 못했습니다.',
    dataErrorText: '카드 데이터를 불러오지 못했습니다.',
    markup: 'care-card.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-card.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careCardOpen', 'careCardClose']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careCard.loadingText);
        try {
            await ensureViewMarkup(careCard);
            if (stale()) return;
            const m = await careCard.loaders.main();
            if (stale()) return;
            await m.initCareCardView();
        } catch (e) {
            if (!stale()) showToast(careCard.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careLog = {
    viewId: 'care-log-view',
    slug: 'care-log',
    priority: 1,
    uiTextKey: 'careLog',
    title: '요양일지',
    subtitle: '서비스 기록 자동 작성',
    loadingText: '요양일지를 불러오는 중입니다...',
    loadErrorText: '요양일지를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-log.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-log.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careLogGenerate', 'careLogSave', 'careLogDelete', 'careLogPrint', 'careLogCsvExport', 'careLogRecordCopy', 'careShare', 'careLogDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careLog.loadingText);
        try {
            await ensureViewMarkup(careLog);
            if (stale()) return;
            const m = await careLog.loaders.main();
            if (stale()) return;
            m.initCareLogView();
        } catch (e) {
            if (!stale()) showToast(careLog.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careWebtoon = {
    viewId: 'care-webtoon-view',
    slug: 'care-webtoon',
    priority: 1,
    uiTextKey: 'careWebtoon',
    title: '이야기 웹툰',
    subtitle: '서사를 말풍선 컷으로',
    loadingText: '웹툰을 불러오는 중입니다...',
    loadErrorText: '웹툰을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-webtoon.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-webtoon.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['webtoonPrev', 'webtoonNext']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careWebtoon.loadingText);
        try {
            await ensureViewMarkup(careWebtoon);
            if (stale()) return;
            const m = await careWebtoon.loaders.main();
            if (stale()) return;
            m.initCareWebtoonView();
        } catch (e) {
            if (!stale()) showToast(careWebtoon.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careFlow = {
    viewId: 'care-flow-view',
    slug: 'care-flow',
    priority: 1,
    uiTextKey: 'careFlow',
    title: '개념 학습',
    subtitle: '미리풀기 → 이야기 → 요약 → 시나리오',
    loadingText: '개념 학습을 불러오는 중입니다...',
    loadErrorText: '개념 학습을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-flow.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-flow.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['flowBack', 'flowNext', 'flowOpt']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careFlow.loadingText);
        try {
            await ensureViewMarkup(careFlow);
            if (stale()) return;
            const m = await careFlow.loaders.main();
            if (stale()) return;
            m.initCareFlowView();
        } catch (e) {
            if (!stale()) showToast(careFlow.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careAudit = {
    viewId: 'care-audit-view',
    slug: 'care-audit',
    priority: 3,
    uiTextKey: 'careAudit',
    title: '평가 체크리스트',
    subtitle: '기관 평가 대비 점검',
    loadingText: '체크리스트를 불러오는 중입니다...',
    loadErrorText: '체크리스트를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-audit.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-audit.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careAuditReset', 'careAuditPrint', 'careAuditDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careAudit.loadingText);
        try {
            await ensureViewMarkup(careAudit);
            if (stale()) return;
            const m = await careAudit.loaders.main();
            if (stale()) return;
            await m.initCareAuditView();
        } catch (e) {
            if (!stale()) showToast(careAudit.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careHandover = {
    viewId: 'care-handover-view',
    slug: 'care-handover',
    priority: 4,
    uiTextKey: 'careHandover',
    title: '인수인계서',
    subtitle: '교대근무 인수인계 작성',
    loadingText: '인수인계서를 불러오는 중입니다...',
    loadErrorText: '인수인계서를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-handover.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-handover.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careHandoverGenerate', 'careHandoverSave', 'careHandoverDelete', 'careHandoverExport', 'careHandoverPrint', 'careHandoverCsvExport', 'careFacilityHandoverSubmit', 'careHandoverAck', 'careHandoverDigest', 'careHandoverDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careHandover.loadingText);
        try {
            await ensureViewMarkup(careHandover);
            if (stale()) return;
            const m = await careHandover.loaders.main();
            if (stale()) return;
            m.initCareHandoverView();
        } catch (e) {
            if (!stale()) showToast(careHandover.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careVisit = {
    viewId: 'care-visit-view',
    slug: 'care-visit',
    uiTextKey: 'careVisit',
    title: '면회·방문 기록',
    subtitle: '방문 예약·결과 기록 도구',
    loadingText: '방문 기록을 불러오는 중입니다...',
    loadErrorText: '방문 기록을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-visit.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-visit.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careVisitAdd', 'careVisitResultOpen', 'careVisitResultSave', 'careVisitResultClose', 'careVisitCancel', 'careVisitDelete', 'careVisitPreview', 'careVisitPrint', 'careVisitCsvExport', 'careVisitFacilitySubmit', 'careVisitDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careVisit.loadingText);
        try {
            await ensureViewMarkup(careVisit);
            if (stale()) return;
            const m = await careVisit.loaders.main();
            if (stale()) return;
            m.initCareVisitView();
        } catch (e) {
            if (!stale()) showToast(careVisit.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careClients = {
    viewId: 'care-client-view',
    slug: 'care-client',
    uiTextKey: 'careClients',
    title: '수급자 관리',
    subtitle: '수급자 등록·주의사항·서류 현황 관리',
    loadingText: '수급자 관리를 불러오는 중입니다...',
    loadErrorText: '수급자 관리를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-client.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-client.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careClientSave', 'careClientNew', 'careClientLoad', 'careClientReport', 'careClientDelete', 'careClientPreview', 'careClientPrint', 'careClientCsvExport', 'careClientCsvImport', 'careClientDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careClients.loadingText);
        try {
            await ensureViewMarkup(careClients);
            if (stale()) return;
            const m = await careClients.loaders.main();
            if (stale()) return;
            m.initCareClientView();
        } catch (e) {
            if (!stale()) showToast(careClients.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careIncident = {
    viewId: 'care-incident-view',
    slug: 'care-incident',
    uiTextKey: 'careIncident',
    title: '사고·낙상 보고서',
    subtitle: '사고 기록·증적 서식',
    loadingText: '사고 보고서를 불러오는 중입니다...',
    loadErrorText: '사고 보고서를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-incident.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-incident.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careIncidentGenerate', 'careIncidentSave', 'careIncidentPrint', 'careIncidentCsvExport', 'careIncidentDelete', 'careIncidentFacilitySubmit', 'careIncidentDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careIncident.loadingText);
        try {
            await ensureViewMarkup(careIncident);
            if (stale()) return;
            const m = await careIncident.loaders.main();
            if (stale()) return;
            m.initCareIncidentView();
        } catch (e) {
            if (!stale()) showToast(careIncident.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careRoster = {
    viewId: 'care-roster-view',
    slug: 'care-roster',
    uiTextKey: 'careRoster',
    title: '교대 근무표',
    subtitle: '근무일·근무조 배정',
    loadingText: '근무표를 불러오는 중입니다...',
    loadErrorText: '근무표를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-roster.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-roster.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careRosterAdd', 'careRosterDelete', 'careRosterPreview', 'careRosterPrint', 'careRosterCsvExport', 'careRosterCsvImport', 'careRosterDocMd']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careRoster.loadingText);
        try {
            await ensureViewMarkup(careRoster);
            if (stale()) return;
            const m = await careRoster.loaders.main();
            if (stale()) return;
            m.initCareRosterView();
        } catch (e) {
            if (!stale()) showToast(careRoster.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careFinder = {
    viewId: 'care-finder-view',
    slug: 'care-finder',
    uiTextKey: 'careFinder',
    title: '요양기관 찾기',
    subtitle: '장기요양기관 검색',
    loadingText: '시설 목록을 불러오는 중입니다...',
    loadErrorText: '시설 목록을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-finder.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-finder.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['careFinderSearch', 'careFinderUseOrg']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careFinder.loadingText);
        try {
            await ensureViewMarkup(careFinder);
            if (stale()) return;
            const m = await careFinder.loaders.main();
            if (stale()) return;
            m.initCareFinderView();
        } catch (e) {
            if (!stale()) showToast(careFinder.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careForms = {
    viewId: 'care-forms-view',
    slug: 'care-forms',
    uiTextKey: 'careForms',
    title: '보고서·서식 모음',
    subtitle: '정기 제출 서식 발급처',
    loadingText: '서식 모음을 불러오는 중입니다...',
    loadErrorText: '서식 모음을 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'care-forms.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/care-forms.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', []]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careForms.loadingText);
        try {
            await ensureViewMarkup(careForms);
            if (stale()) return;
            const m = await careForms.loaders.main();
            if (stale()) return;
            m.initCareFormsView();
        } catch (e) {
            if (!stale()) showToast(careForms.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careFacilityJoin = {
    viewId: 'facility-join-view',
    slug: 'facility-join',
    priority: 5,
    uiTextKey: 'careFacilityJoin',
    title: '기관 가입',
    subtitle: '초대 코드로 소속 기관 연결',
    loadingText: '기관 정보를 불러오는 중입니다...',
    loadErrorText: '기관 정보를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'facility-join.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/facility-join.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['facilityJoin', 'facilityOrgNameSave']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careFacilityJoin.loadingText);
        try {
            await ensureViewMarkup(careFacilityJoin);
            if (stale()) return;
            const m = await careFacilityJoin.loaders.main();
            if (stale()) return;
            m.initFacilityJoinView();
        } catch (e) {
            if (!stale()) showToast(careFacilityJoin.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const careFacilityAdmin = {
    viewId: 'facility-admin-view',
    slug: 'facility-admin',
    priority: 6,
    uiTextKey: 'careFacilityAdmin',
    title: '기관 관리',
    subtitle: '관리책임자 — 멤버·초대 관리',
    loadingText: '기관 정보를 불러오는 중입니다...',
    loadErrorText: '기관 정보를 불러오지 못했습니다.',
    dataErrorText: '데이터를 불러오지 못했습니다.',
    markup: 'facility-admin.html',
    styles: 'care-tools.css',
    loaders: { main: _domainImport('views/facility-admin.js') },
    /** @type {Array<[string, string[]]>} */
    handlers: [['main', ['facilityAdminCreate', 'facilityAdminWebhook']]],
    async enter(gen) {
        const [{ showGlobalLoading, hideGlobalLoading, showToast }, { isStaleViewGen }] =
            await Promise.all([import('./ui-utils.js'), import('./views/navigation.js')]);
        const stale = () => typeof gen === 'number' && isStaleViewGen(gen);
        if (stale()) return;
        showGlobalLoading(careFacilityAdmin.loadingText);
        try {
            await ensureViewMarkup(careFacilityAdmin);
            if (stale()) return;
            const m = await careFacilityAdmin.loaders.main();
            if (stale()) return;
            m.initFacilityAdminView();
        } catch (e) {
            if (!stale()) showToast(careFacilityAdmin.loadErrorText, 'error');
        } finally {
            if (!stale()) hideGlobalLoading();
        }
    },
};
const PRACTICE_FEATURES = { formula, careHome, careCalc, careCard, careLog, careWebtoon, careFlow, careAudit, careHandover, careVisit, careClients, careIncident, careRoster, careFinder, careForms, careFacilityJoin, careFacilityAdmin };

/** 활성 시험이 실무 피처를 1개 이상 보유하는가 — 실무 모드 진입 가능 조건 */
export function isPracticeCapable() {
    return Object.keys(PRACTICE_FEATURES).some(k => hasFeature(k));
}

/** 활성 시험에서 유효한 실무 피처 엔트리 (레지스트리 선언 순서 유지) */
export function getEnabledPracticeFeatures() {
    return Object.keys(PRACTICE_FEATURES)
        .filter(k => hasFeature(k))
        .map(k => PRACTICE_FEATURES[k]);
}

/**
 * 실무 모드 랜딩 뷰 — 유효 피처 중 `priority`가 가장 작은 뷰 (@spec DA-22).
 * priority 미지정은 0으로 간주하고, 동률은 레지스트리 선언 순서가 이긴다
 * (안정 정렬). 복수 실무 피처를 보유한 시험에서도 랜딩을 선언으로 제어할 수 있다.
 */
export function getPracticeLanding() {
    const enabled = getEnabledPracticeFeatures();
    if (!enabled.length) return 'dashboard-view';
    return [...enabled]
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))[0].viewId;
}

/** router 타이틀 맵용 — 선언된 모든 실무 뷰의 {title, subtitle}.
 * registry.uiText[feature.uiTextKey]가 있으면 정의의 중립 기본값을 덮어쓴다.
 * exams.json의 `practiceName`(실무 브랜드)은 서브타이틀에 자동 병기한다 —
 * 뷰 타이틀이 이미 브랜드명이거나(uiText title='Formula OS'처럼 title 자체가
 * 브랜드) 서브타이틀에 수동 병기된 경우는 중복 없이 스킵한다. */
export function getPracticeViewTitles(registry) {
    const uiText = (registry && registry.uiText) || {};
    const practiceName = getActiveExam()?.practiceName;
    const out = {};
    for (const f of Object.values(PRACTICE_FEATURES)) {
        const t = (f.uiTextKey && uiText[f.uiTextKey]) || {};
        const title = t.title || f.title;
        let subtitle = t.subtitle || f.subtitle;
        if (practiceName && subtitle && !title.includes(practiceName) && !subtitle.includes(practiceName)) {
            subtitle = `${practiceName} — ${subtitle}`;
        }
        out[f.viewId] = { title, subtitle };
    }
    return out;
}

/** router 해시 슬러그용 — {viewId: slug} */
export function getPracticeHashSlugs() {
    const out = {};
    for (const f of Object.values(PRACTICE_FEATURES)) {
        out[f.viewId] = f.slug;
    }
    return out;
}

/**
 * app.js LAZY_MODULE_HANDLERS용 — [[모듈로더, 핸들러명 배열]]
 * @returns {Array<[() => Promise<any>, string[]]>}
 */
export function getPracticeLazyHandlers() {
    /** @type {Array<[() => Promise<any>, string[]]>} */
    const out = [];
    for (const f of Object.values(PRACTICE_FEATURES)) {
        for (const [loaderKey, names] of f.handlers || []) {
            if (!names.length) continue; // 핸들러 없는 정적 뷰 허용 (careForms 등)
            out.push([f.loaders[loaderKey], names]);
        }
    }
    return out;
}

/** app.js viewRenderers용 — {viewId: 렌더 함수} (비동기 enter를 발화만) */
export function getPracticeViewRenderers() {
    const out = {};
    for (const f of Object.values(PRACTICE_FEATURES)) {
        out[f.viewId] = (gen) => { void f.enter(gen); };
    }
    return out;
}

/**
 * 도메인 경로 규약 검증용 — {featureKey: {markup, modules[]}}.
 * markup·modules는 시험 무관 상대 경로이며 실제 위치는
 * html/exams/<시험id>/ · src/exams/<시험id>/ 로 해석된다.
 * 유닛 테스트가 exams.json에서 해당 feature를 켠 시험마다 파일 실존을 확인한다.
 */
export function getPracticeDomainSpec() {
    const out = {};
    for (const [key, f] of Object.entries(PRACTICE_FEATURES)) {
        out[key] = {
            markup: f.markup || null,
            styles: f.styles || null,
            modules: Object.values(f.loaders)
                .map(l => /** @type {any} */ (l).rel)
                .filter(Boolean),
        };
    }
    return out;
}
