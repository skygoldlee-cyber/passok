// src/zoom-gestures.js — 줌 모달 공용 핀치·패닝·더블탭 제스처.
// @spec TR-26
// 페이지 단위 브라우저 핀치줌의 대체 경로: 모달 내 콘텐츠 배율과 스크롤 패닝만
// 제어하므로 크롬·여백이 함께 확대되거나 레이아웃이 깨지지 않는다.
// 본문에 touch-action:none을 걸고 Pointer Events로 직접 구현한다
// (pan 계열 touch-action을 남기면 두 손가락 제스처가 브라우저 줌으로 흡수된다).

const PINCH_MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_PX = 12;
const TAP_GROUP_PX = 30;

/**
 * 스크롤 가능한 줌 본문에 핀치·드래그 패닝·더블탭 제스처를 바인딩한다.
 * - 2포인터: 간격 비율로 배율 조정 + 핀치 중심점 기준 스크롤 앵커 유지
 * - 1포인터: 드래그 = 본문 스크롤 (touch-action:none 대체 패닝)
 * - 더블탭: 맞춤 ↔ 2배율 토글
 * @param {HTMLElement} body - 스크롤 컨테이너 (.mermaid-zoom-body)
 * @param {{getScale:()=>number, setScale:(s:number)=>void, getFitScale:()=>number}} io
 */
export function bindZoomGestures(body, { getScale, setScale, getFitScale }) {
    if (!body || body.dataset.zoomGesturesBound) return;
    body.dataset.zoomGesturesBound = '1';
    /** @type {Map<number, {x:number, y:number}>} */
    const pts = new Map();
    /** @type {{startDist:number, startScale:number, startScrollL:number, startScrollT:number, startMidX:number, startMidY:number}|null} */
    let pinch = null;
    /** @type {{lastX:number, lastY:number, moved:number}|null} */
    let pan = null;
    let lastTap = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const minScale = () => Math.min(0.25, getFitScale() || 1);
    const clampScale = (s) => Math.min(PINCH_MAX_SCALE, Math.max(minScale(), s));

    const twoPts = () => {
        const it = [...pts.values()];
        return it.length >= 2 ? [it[0], it[1]] : null;
    };
    const midOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const distOf = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

    body.addEventListener('pointerdown', (e) => {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try { body.setPointerCapture(e.pointerId); } catch (err) { /* jsdom·구형 환경 */ }
        const pair = twoPts();
        if (pair) {
            const rect = body.getBoundingClientRect();
            const mid = midOf(pair[0], pair[1]);
            pinch = {
                startDist: Math.max(1, distOf(pair[0], pair[1])),
                startScale: getScale(),
                startScrollL: body.scrollLeft,
                startScrollT: body.scrollTop,
                startMidX: mid.x - rect.left,
                startMidY: mid.y - rect.top,
            };
            pan = null;
        } else {
            pan = { lastX: e.clientX, lastY: e.clientY, moved: 0 };
        }
    });

    body.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pair = twoPts();
        if (pair && pinch) {
            const rect = body.getBoundingClientRect();
            const mid = midOf(pair[0], pair[1]);
            const ratio = distOf(pair[0], pair[1]) / pinch.startDist;
            const next = clampScale(pinch.startScale * ratio);
            // 제스처 시작 시 중심점 아래 콘텐츠가 현재 중심점 아래에 머물도록 앵커
            body.scrollLeft = (pinch.startScrollL + pinch.startMidX) * (next / pinch.startScale) - (mid.x - rect.left);
            body.scrollTop = (pinch.startScrollT + pinch.startMidY) * (next / pinch.startScale) - (mid.y - rect.top);
            setScale(next);
        } else if (pan) {
            const dx = e.clientX - pan.lastX;
            const dy = e.clientY - pan.lastY;
            pan.moved += Math.abs(dx) + Math.abs(dy);
            pan.lastX = e.clientX;
            pan.lastY = e.clientY;
            body.scrollLeft -= dx;
            body.scrollTop -= dy;
        }
    });

    const release = (e) => {
        const hadPan = pan;
        const hadPinch = !!pinch;
        pts.delete(e.pointerId);
        if (!twoPts()) {
            pinch = null;
            const rest = [...pts.values()];
            pan = rest.length === 1 ? { lastX: rest[0].x, lastY: rest[0].y, moved: 0 } : null;
        }
        // 더블탭 판정 — 핀치 없이 한 손가락을 짧게 두 번 탭
        if (e.type === 'pointerup' && pts.size === 0 && !hadPinch && (!hadPan || hadPan.moved < TAP_MOVE_PX)) {
            const now = Date.now();
            if (now - lastTap < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < TAP_GROUP_PX) {
                lastTap = 0;
                const fit = getFitScale() || 1;
                setScale(getScale() > fit * 1.05 ? fit : Math.min(PINCH_MAX_SCALE, 2));
            } else {
                lastTap = now;
                lastTapX = e.clientX;
                lastTapY = e.clientY;
            }
        }
    };
    body.addEventListener('pointerup', release);
    body.addEventListener('pointercancel', release);
}
