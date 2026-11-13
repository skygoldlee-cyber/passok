// tests/e2e/support/geometry.js — 뷰 기하 계측 공용 헬퍼 (실브라우저)
// @spec none
//
// 스윕·오클루전 스펙이 공유하는 계측 프리미티브:
//  - waitForViewSettled: 뷰 전환 후 비동기 렌더 정착 대기 — 고정 sleep 대신
//    활성 클래스·scrollHeight 안정·폰트 로드를 폴링한다 (CI 스윕 플레이크 근본 수정).
//  - findOcclusion / expectNotOccluded: 대상 요소가 고정·sticky 크롬(앱 헤더·
//    모바일 탭 바·리더 크롬·문서 오버레이 바)에 가려지지 않았는지
//    elementFromPoint 실측 — 스크롤 점프 대상 가림 회귀용.
//  - viewTopOcclusion: 활성 뷰의 첫 가시 콘텐츠가 크롬 아래에서 시작하는지 검사
//    — 뷰 상단 가림(헤더가 콘텐츠를 덮는) 회귀용.
//
// 주의: 프로덕션 CSP(script-src 'self') 하에서 evaluate 내부 eval/Function은
// 차단되므로 헬퍼 라벨 함수는 각 evaluate 본문에 인라인한다.
import { expect } from '@playwright/test';

// 소멸성 오버레이 — 타이밍상 일시 가림이라 오클루전 판정에서 제외한다
const TRANSIENT = '#app-toast, .offline-banner, #global-loading-overlay, #mobile-more-sheet';

/**
 * 뷰 전환 후 렌더 정착 대기 — waitForTimeout(700) 대체.
 * 활성 뷰 id 일치 → (scrollHeight·자식 수)가 연속 폴링에서 동일 → 폰트 로드 완료
 * 순으로 확인한다. DataLoader 경유 비동기 렌더(사전·분석·시험 팩 뷰)가 끝난 뒤에만
 * 반환되어 러너 부하에 따른 스윕 타이밍 플레이크를 제거한다.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} viewId `.view-section` id
 * @param {{timeout?: number, activeTimeout?: number, stableMs?: number}} [opts]
 * @returns {Promise<boolean>} 활성화까지 도달하면 true, activeTimeout 내
 *   미활성화(이 컨텍스트에서 진입 불가한 뷰)면 false — 스윕은 false 시 건너뛸 것.
 */
export async function waitForViewSettled(page, viewId, { timeout = 15_000, activeTimeout = 10_000, stableMs = 150 } = {}) {
    try {
        await expect(page.locator('#' + viewId)).toHaveClass(/active/, { timeout: activeTimeout });
    } catch {
        return false;
    }
    const sig = () => page.evaluate((id) => {
        const el = document.getElementById(id);
        return el ? `${el.scrollHeight}:${el.childElementCount}` : 'missing';
    }, viewId);
    await expect.poll(async () => {
        const a = await sig();
        await page.waitForTimeout(stableMs);
        const b = await sig();
        return a !== 'missing' && a === b;
    }, { timeout, intervals: [100, 250, 500, 1000] }).toBe(true);
    // 웹폰트 로드는 레이아웃을 뒤바꾼다 — 최대 5초까지만 대기해 무한 지연은 막는다
    await page.evaluate(() => Promise.race([
        document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true),
        new Promise((r) => setTimeout(() => r(true), 5_000)),
    ]));
    return true;
}

/**
 * 대상 요소의 가림 실측 — 요소 상·중·하단 중앙점의 elementFromPoint가
 * 대상 자신/자손/조상이 아니면 다른 요소가 위에 덮인 것이다.
 * 뷰포트 밖 지점은 elementFromPoint가 null이라 자동 제외된다.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector 대상 CSS 셀렉터
 * @param {{ignore?: string}} [opts] 추가 면제 셀렉터 (소멸성 오버레이류)
 * @returns {Promise<string[]>} 가림 설명 목록 — 빈 배열이면 정상
 */
export async function findOcclusion(page, selector, { ignore = '' } = {}) {
    return page.evaluate(({ sel, transient, ig }) => {
        const lbl = (n) => n.tagName.toLowerCase()
            + (n.id ? '#' + n.id : '')
            + (typeof n.className === 'string' && n.className.trim()
                ? '.' + n.className.trim().split(/\s+/)[0] : '');
        const el = document.querySelector(sel);
        if (!el) return [`${sel} — 요소 없음`];
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return [`${sel} — 미렌더(크기 0)`];
        const exempt = transient + (ig ? ', ' + ig : '');
        const bad = [];
        for (const fy of [0.05, 0.5, 0.95]) {
            const x = r.left + r.width / 2;
            const y = r.top + Math.min(Math.max(r.height * fy, 2), r.height - 2);
            if (y < 0 || y >= innerHeight || x < 0 || x >= innerWidth) continue;
            const hit = document.elementFromPoint(x, y);
            if (!hit) continue;
            if (hit === el || el.contains(hit) || hit.contains(el)) continue;
            if (hit.closest(exempt)) continue;
            bad.push(`${lbl(el)} @y=${Math.round(y)} ← ${lbl(hit)}`);
        }
        return bad;
    }, { sel: selector, transient: TRANSIENT, ig: ignore });
}

/**
 * 스크롤 점프·뷰 전환 후 대상이 고정 크롬에 가려지지 않았는지 단언한다.
 * smooth 스크롤 직후 등 진행 중 상태에서 호출할 때는 expect.poll로
 * findOcclusion을 폴링해 정착 후 판정할 것.
 */
export async function expectNotOccluded(page, selector, { label, ignore } = {}) {
    const bad = await findOcclusion(page, selector, { ignore });
    expect(bad, `${label || selector} — 요소를 덮는 요소`).toEqual([]);
}

/**
 * 활성 뷰의 첫 가시 콘텐츠가 고정 크롬에 가려지는지 실측 — 뷰 상단 가림 회귀
 * (헤더가 뷰 콘텐츠를 덮는 버그) 전용. 뷰 트리를 순회해 첫 리프 콘텐츠
 * (헤딩·카드·컨트롤)의 상단 중앙점을 hit-test한다.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string|null>} 가림 설명 또는 null (정상/판정 불가)
 */
export async function viewTopOcclusion(page) {
    return page.evaluate((transient) => {
        const lbl = (n) => n.tagName.toLowerCase()
            + (n.id ? '#' + n.id : '')
            + (typeof n.className === 'string' && n.className.trim()
                ? '.' + n.className.trim().split(/\s+/)[0] : '');
        const view = document.querySelector('.view-section.active');
        if (!view) return '활성 뷰 없음';
        const CONTENT = 'H1,H2,H3,H4,H5,P,BUTTON,A,SELECT,INPUT,TEXTAREA,SECTION,'
            + 'ARTICLE,UL,OL,TABLE,FORM,IMG,CANVAS,SVG,VIDEO,LABEL,FIELDSET,DETAILS';
        const walker = document.createTreeWalker(view, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (n) => {
                const cs = getComputedStyle(n);
                const r = n.getBoundingClientRect();
                if (cs.display === 'none' || cs.visibility === 'hidden' || !r.width || !r.height) {
                    return NodeFilter.FILTER_REJECT;
                }
                return n.matches(CONTENT) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            },
        });
        let el = walker.nextNode();
        while (el && el.closest(transient)) el = walker.nextNode();
        if (!el) return null; // 빈 뷰 — 판정할 콘텐츠 없음
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + Math.min(6, r.height / 2);
        if (y < 0 || y >= innerHeight || x < 0 || x >= innerWidth) return null;
        const hit = document.elementFromPoint(x, y);
        if (!hit || hit === el || el.contains(hit) || hit.contains(el) || hit.closest(transient)) return null;
        return `${lbl(el)} ← ${lbl(hit)}`;
    }, TRANSIENT);
}
