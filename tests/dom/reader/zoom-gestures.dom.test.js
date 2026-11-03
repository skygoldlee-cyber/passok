// @spec TR-26
// zoom-gestures.js — 줌 모달 공용 핀치·패닝·더블탭 제스처 (모바일 핀치줌 대체 경로)
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { bindZoomGestures } from '../../../src/reader/zoom-gestures.js';

/** jsdom은 PointerEvent 미지원 — MouseEvent로 시뮬레이션하고 pointerId를 주입한다 */
function ptr(type, id, x, y) {
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperty(ev, 'pointerId', { value: id });
    return ev;
}

function setup(fitScale = 1) {
    document.body.innerHTML = '<div id="zoom-body" style="overflow:auto"></div>';
    const body = document.getElementById('zoom-body');
    let scale = 1;
    const setScale = vi.fn((s) => { scale = s; });
    bindZoomGestures(body, {
        getScale: () => scale,
        setScale,
        getFitScale: () => fitScale,
    });
    return { body, setScale, getScale: () => scale };
}

describe('줌 제스처 (TR-26)', () => {
    beforeEach(() => { vi.useRealTimers(); });

    it('두 포인터 핀치 확장 → 배율이 간격 비율만큼 커진다', () => {
        const { body, setScale, getScale } = setup();
        body.dispatchEvent(ptr('pointerdown', 1, 0, 0));
        body.dispatchEvent(ptr('pointerdown', 2, 100, 0)); // 시작 간격 100
        body.dispatchEvent(ptr('pointermove', 2, 200, 0)); // 간격 200 → 2배
        expect(setScale).toHaveBeenCalled();
        expect(getScale()).toBeCloseTo(2, 5);
    });

    it('핀치 배율은 최대 4x로 클램프된다', () => {
        const { body, getScale } = setup();
        body.dispatchEvent(ptr('pointerdown', 1, 0, 0));
        body.dispatchEvent(ptr('pointerdown', 2, 100, 0));
        body.dispatchEvent(ptr('pointermove', 2, 1200, 0)); // 간격 12배 → 클램프
        expect(getScale()).toBe(4);
    });

    it('핀치 중심점 이동 시 콘텐츠 앵커가 유지되도록 스크롤이 조정된다', () => {
        const { body } = setup();
        body.dispatchEvent(ptr('pointerdown', 1, 0, 0));
        body.dispatchEvent(ptr('pointerdown', 2, 100, 0)); // 중심 x=50, scroll 0
        // 간격 2배 + 중심 x=100으로 이동 → scrollLeft = (0+50)*2 - 100 = 0
        body.dispatchEvent(ptr('pointermove', 2, 200, 0));
        expect(body.scrollLeft).toBe(0);
        expect(body.scrollTop).toBe(0);
    });

    it('단일 포인터 드래그 → 본문 스크롤 패닝', () => {
        const { body } = setup();
        body.dispatchEvent(ptr('pointerdown', 1, 50, 50));
        body.dispatchEvent(ptr('pointermove', 1, 40, 30)); // dx=-10, dy=-20
        expect(body.scrollLeft).toBe(10);
        expect(body.scrollTop).toBe(20);
    });

    it('핀치 후 한 손가락이 남으면 그 위치에서 패닝이 이어진다', () => {
        const { body } = setup();
        body.dispatchEvent(ptr('pointerdown', 1, 0, 0));
        body.dispatchEvent(ptr('pointerdown', 2, 100, 0));
        body.dispatchEvent(ptr('pointerup', 2, 100, 0)); // 포인터1만 남음 → 패닝 리셋
        body.dispatchEvent(ptr('pointermove', 1, -10, 0));
        expect(body.scrollLeft).toBe(10);
    });

    it('더블탭 → 맞춤 ↔ 2배율 토글', () => {
        const { body, getScale } = setup();
        const tap = () => {
            body.dispatchEvent(ptr('pointerdown', 1, 50, 50));
            body.dispatchEvent(ptr('pointerup', 1, 50, 50));
        };
        tap(); // 첫 탭 — 대기
        tap(); // 두 번째 탭 — 더블탭 → 2x
        expect(getScale()).toBe(2);
        tap();
        tap(); // 다시 더블탭 → 맞춤으로 복귀
        expect(getScale()).toBe(1);
    });

    it('드래그 후 떼면 탭으로 인식하지 않는다 (더블탭 오발동 방지)', () => {
        const { body, setScale } = setup();
        const dragTap = () => {
            body.dispatchEvent(ptr('pointerdown', 1, 50, 50));
            body.dispatchEvent(ptr('pointermove', 1, 90, 50)); // moved > 임계
            body.dispatchEvent(ptr('pointerup', 1, 90, 50));
        };
        dragTap();
        dragTap();
        expect(setScale).not.toHaveBeenCalled();
    });

    it('이미 바인딩된 본문에는 중복 바인딩하지 않는다', () => {
        const { body } = setup();
        const listener = vi.fn();
        bindZoomGestures(body, { getScale: () => 1, setScale: listener, getFitScale: () => 1 });
        body.dispatchEvent(ptr('pointerdown', 1, 0, 0));
        body.dispatchEvent(ptr('pointerdown', 2, 100, 0));
        body.dispatchEvent(ptr('pointermove', 2, 200, 0));
        expect(listener).not.toHaveBeenCalled(); // 첫 바인딩의 setScale만 동작
    });
});
