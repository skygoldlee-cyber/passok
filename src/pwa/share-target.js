// src/pwa/share-target.js — 다른 앱의 공유 인텐트 수신 (manifest share_target)
// @spec P-18
// GET share_target은 공유 title/text/url이 쿼리 파라미터로 진입한다.
// 부팅 시 파라미터를 소비해 통합 검색 팔레트를 해당 텍스트로 열고 URL을 정리한다.
// GET 방식 한계: 텍스트·링크만 수신 — 파일·이미지 공유는 POST+SW fetch가 필요해 별도 검토.

/**
 * 쿼리스트링에서 공유 텍스트 추출 — 순수 함수 (테스트용).
 * text 우선, 없으면 title, 둘 다 없고 url만 있으면 url 사용.
 * @param {string} search - location.search
 * @returns {string|null}
 */
export function parseSharePayload(search) {
    if (!search) return null;
    const p = new URLSearchParams(search);
    /** @param {string} k */
    const pick = (k) => (p.get(k) || '').trim();
    const text = pick('text') || pick('title') || pick('url');
    return text || null;
}

/** 공유 파라미터가 실제 존재할 때만 팔레트를 열고 URL에서 파라미터를 제거한다 */
export function consumeShareTarget() {
    if (typeof window === 'undefined' || typeof location === 'undefined') return;
    const text = parseSharePayload(location.search);
    if (!text) return;
    try {
        const url = new URL(location.href);
        url.searchParams.delete('title');
        url.searchParams.delete('text');
        url.searchParams.delete('url');
        history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) { /* URL 정리 실패해도 팔레트는 연다 */ }
    // 팔레트 모듈은 지연 로드 — 부팅 경로에서 무거운 인덱스 초기화를 앞당기지 않는다
    import('../shell/command-palette.js').then((m) => m.openCommandPalette(text));
}
