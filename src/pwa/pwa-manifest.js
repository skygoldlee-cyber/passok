// src/pwa-manifest.js — 활성 시험 기준 PWA 매니페스트 링크 교체 (클래식 스크립트, 모듈 아님)
// @spec P-10,DA-06,DA-14,UX-PWA-07
// 정적 manifest.webmanifest는 부팅 전 플레이스홀더 겸 최후 폴백이고,
// 활성 시험이 확인되면 빌드가 생성한 실제 파일 manifest.<id>.webmanifest로 링크를 교체한다
// (기본 시험 포함 — 시험별 pwaShortcuts·description이 실제 설치 매니페스트에 반영되어야 한다).
// ⚠️ 모든 manifest.<id>.webmanifest는 id='passok'·name='PassOK'로 통일된 단일 앱이다 —
//    어느 시험에서 설치해도 같은 PWA 하나(중복 설치·시험명 고정 아이콘 방지).
// ⚠️ blob:/data: URL 주입은 금지 — Chrome이 설치 요건에서 유효하지 않은 스킴으로
//    판정해 beforeinstallprompt가 발생하지 않고, connect-src 'self'가 fetch도 차단한다.
// data/exams.js 이후, app.js(모듈) 이전에 로드되어야 한다.
(function () {
    try {
        const exams = (window.EXAMS_LIST && window.EXAMS_LIST.exams) || [];
        if (!exams.length) return;
        let id = null;
        try { id = localStorage.getItem('current_exam'); } catch (e) { /* noop */ }
        let exam = null;
        for (let i = 0; i < exams.length; i++) {
            if (exams[i].id === id) { exam = exams[i]; break; }
        }
        if (!exam) {
            for (let j = 0; j < exams.length; j++) {
                if (exams[j].default) { exam = exams[j]; break; }
            }
        }
        if (!exam) exam = exams[0];
        if (!exam) return;

        const link = /** @type {HTMLLinkElement|null} */ (document.querySelector('link[rel="manifest"]'));
        if (!link) return;

        // 빌드 산출물 manifest.<id>.webmanifest(실제 파일)로 교체 — 시험별 shortcuts·id 반영.
        // 생성물이 누락되면 링크가 404가 되어 설치가 깨질 수 있으므로, build:data 산출물 검증과
        // check:datafresh가 파일 존재·신선도를 보장한다 (manifest.webmanifest 자체는 부팅 전까지의 폴백).
        link.href = 'manifest.' + encodeURIComponent(exam.id) + '.webmanifest';
        // 파비콘(탭/홈 브랜드 아이콘)은 시험 아이콘으로 전환하지 않는다 —
        // PassOK 브랜드 아이콘은 시험 무관 독립 정체성이어야 한다 (팩별 아이콘은 카드·manifest에만).
        // 다만 URL에 APP_VERSION 스탬프를 붙여 SW 프리캐시 키와 분리한다 —
        // 구 SW 캐시가 하드 리프레시 후에도 구 아이콘을 서빙하는 문제를 배포마다 무효화.
        const v = typeof window !== 'undefined' && window.APP_VERSION ? `?v=${window.APP_VERSION}` : '';
        for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
            const el = /** @type {HTMLLinkElement|null} */ (document.querySelector(sel));
            if (el) el.href = `icons/icon-192.png${v}`;
        }

        // 문서 제목/설명도 활성 시험 기준으로 갱신
        if (exam.title) document.title = exam.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && exam.desc) metaDesc.setAttribute('content', exam.desc);

        // iOS '홈 화면에 추가' 시 사용되는 앱 이름 — 단일 앱 정책으로 'PassOK' 고정
        // (webmanifest name과 동일 정체성 — 어느 시험에서 추가해도 같은 아이콘 라벨.
        //  iOS는 추가 시점의 메타 값을 읽으므로 부팅 시 반영되어야 한다)
        const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appleTitle) appleTitle.setAttribute('content', 'PassOK');

        // 시험별 스킨 (DA-14) — 부팅 최초 프레임부터 활성 시험 팔레트를 적용한다.
        // html[data-exam]은 CSS 측 규약 오버라이드(cascade)용 속성,
        // theme 필드 토큰은 인라인 변수라 라이트/다크 양쪽 테마 위에서 유효.
        // ⚠️ 화이트리스트 정규식은 exam-context.js THEME_TOKEN_RE와 동일 — 함께 갱신.
        document.documentElement.dataset.exam = exam.id;
        const theme = (exam && typeof exam.theme === 'object' && exam.theme) || {};
        for (const token of Object.keys(theme)) {
            const value = theme[token];
            if (!/^--(?:color|bg|border|stroke)-[a-z][a-z0-9-]*$/i.test(token)
                || typeof value !== 'string' || !value.trim()) continue;
            document.documentElement.style.setProperty(token, value);
        }
    } catch (e) { /* 정적 매니페스트 폴백 유지 */ }
})();
