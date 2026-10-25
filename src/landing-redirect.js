// src/landing-redirect.js — 신규 방문자를 서비스 소개 랜딩으로 안내
// @spec LP-10
// 앱 부트(index.html) 이전에 동기 실행돼 깜빡임 없이 판정한다.
// 리다이렉트 조건 — 전부 해당하는 최초 방문자만:
//   · 해시 라우트 없음 (#/slug 딥링크는 앱으로 직행)
//   · ?app=1 파라미터 없음 (랜딩 CTA 경유 진입 표시)
//   · 설치형 PWA 아님 (start_url은 index.html — 설치 사용자는 앱으로)
//   · 이 기기에 저장된 키가 하나도 없음 (사용 흔적이 있으면 앱으로)
// 랜딩을 한 번이라도 열면 landing.js가 'passok_landing_seen'을 기록해
// 이후 '/'는 앱으로 곧장 진입한다.
// localStorage 직접 접근은 부트 이전 동기 판정이 필요해 ALLOWED_FILES 등록.
(function () {
    try {
        if (location.hash || /(?:\?|&)app=1\b/.test(location.search)) return;
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
        if (navigator.standalone === true) return;
        if (localStorage.length > 0) return;
        location.replace('landing.html');
    } catch (_) { /* 스토리지 접근 불가(사생활 모드 등)면 리다이렉트 생략 */ }
})();
