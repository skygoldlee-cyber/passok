// tests/dom/common/ux-feedback.dom.test.js — UX-FB-09~11 · UX-PWA-08 검증
// @spec UX-FB-09,UX-FB-10,UX-FB-11,UX-PWA-08
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import { loadIndexHtml, el } from '../helpers.js';
import {
    showConfirm, showChoiceModal, showActionToast, showGlobalLoading, hideGlobalLoading,
    runWithLoading,
} from '../../../src/ui-utils.js';
import { enqueueBootModal, _resetBootModalQueue } from '../../../src/shell/boot-modal-queue.js';
import { initBannerCap, _stopBannerCap } from '../../../src/shell/banner-mgr.js';
import { initOfflineGate, setOfflineFeatureMode, isOfflineMode } from '../../../src/shell/offline-gate.js';

async function tick(ms = 0) { await new Promise(r => setTimeout(r, ms)); }

describe('UX-FB-09 — 부팅 모달 우선순위 큐', () => {
    beforeEach(() => { document.body.innerHTML = ''; _resetBootModalQueue(); });
    afterEach(() => _resetBootModalQueue());

    it('우선순위 순으로 1개씩 표시 — 앞 모달이 닫혀야 다음 모달이 열림', async () => {
        const order = [];
        const mk = (id) => () => {
            order.push(id);
            const d = document.createElement('div');
            d.id = id;
            document.body.appendChild(d);
        };
        // 낮은 우선순위를 먼저 등록해도 priority 순으로 정렬
        enqueueBootModal(30, 'modal-low', mk('modal-low'));
        enqueueBootModal(10, 'modal-high', mk('modal-high'));
        await tick(20);

        expect(order).toEqual(['modal-high']);
        expect(document.getElementById('modal-high')).not.toBeNull();
        expect(document.getElementById('modal-low')).toBeNull();

        document.getElementById('modal-high').remove();
        await tick(80);
        expect(order).toEqual(['modal-high', 'modal-low']);
        expect(document.getElementById('modal-low')).not.toBeNull();
    });

    it('표시 조건 미충족(모달 미생성) 항목은 건너뜀', async () => {
        const order = [];
        enqueueBootModal(10, 'skip-me', () => { order.push('skip'); /* 모달 미생성 */ });
        enqueueBootModal(20, 'next-modal', () => {
            order.push('next');
            const d = document.createElement('div'); d.id = 'next-modal'; document.body.appendChild(d);
        });
        await tick(30);
        expect(order).toEqual(['skip', 'next']);
        expect(document.getElementById('next-modal')).not.toBeNull();
    });
});

describe('UX-FB-09 — 배너 동시 표시 상한 2', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        _stopBannerCap();
    });
    afterEach(() => _stopBannerCap());

    function mkBanner(id, cls = 'show') {
        const d = document.createElement('div');
        d.id = id;
        d.className = cls;
        document.body.appendChild(d);
        return d;
    }

    it('3개 동시 표시 시 우선순위 낮은 배너가 숨겨짐', async () => {
        mkBanner('offline-banner');       // pri 10
        mkBanner('textbook-edition-banner'); // pri 20
        mkBanner('pro-expiry-banner');    // pri 30 — 초과분
        initBannerCap();
        await tick(20);

        expect(el('offline-banner').classList.contains('show')).toBe(true);
        expect(el('textbook-edition-banner').classList.contains('show')).toBe(true);
        expect(el('pro-expiry-banner').classList.contains('show')).toBe(false);
    });

    it('우선순위 배너가 닫히면 숨겨진 배너가 회전 복귀', async () => {
        mkBanner('offline-banner');
        mkBanner('textbook-edition-banner');
        mkBanner('pro-expiry-banner');
        initBannerCap();
        await tick(20);

        el('offline-banner').classList.remove('show');
        await tick(20);
        expect(el('pro-expiry-banner').classList.contains('show')).toBe(true);
    });
});

describe('UX-FB-10 — 파괴 확인·다지선다·되돌리기 토스트', () => {
    beforeEach(() => { document.body.innerHTML = ''; loadIndexHtml(); });

    it('showConfirm — 삭제·초기화 키워드 시 danger 스타일 자동 적용', async () => {
        const p = showConfirm('정말 삭제할까요?', '삭제 확인');
        await tick(20);
        expect(document.querySelector('.app-confirm-ok.danger')).not.toBeNull();
        document.querySelector('.app-confirm-cancel').click();
        expect(await p).toBe(false);
    });

    it('showConfirm — 비파괴 동작은 danger 미적용', async () => {
        const p = showConfirm('AI에 전송할까요?', '전송 확인');
        await tick(20);
        expect(document.querySelector('.app-confirm-ok.danger')).toBeNull();
        document.querySelector('.app-confirm-ok').click();
        expect(await p).toBe(true);
    });

    it('showChoiceModal — 선택지별 value 반환·취소는 null', async () => {
        const p = showChoiceModal('요약', '복원 방식', [
            { label: '병합', value: 'merge' },
            { label: '덮어쓰기', value: 'overwrite', danger: true },
        ]);
        await tick(20);
        const dangerBtn = document.querySelector('[data-choice="overwrite"]');
        expect(dangerBtn.classList.contains('danger')).toBe(true);
        document.querySelector('[data-choice="merge"]').click();
        expect(await p).toBe('merge');

        const p2 = showChoiceModal('요약2', 't', [{ label: 'a', value: 'a' }]);
        await tick(20);
        document.querySelector('.app-confirm-cancel').click();
        expect(await p2).toBeNull();
    });

    it('showActionToast — 액션 버튼 클릭 시 onAction 호출', async () => {
        const onAction = vi.fn();
        showActionToast('평가가 저장되었습니다.', { label: '되돌리기', duration: 5000, onAction });
        const btn = document.querySelector('.app-toast-action');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('되돌리기');
        btn.click();
        expect(onAction).toHaveBeenCalledTimes(1);
    });
});

describe('UX-FB-11 — 장시간 작업 상태', () => {
    beforeEach(() => { document.body.innerHTML = ''; });
    afterEach(() => hideGlobalLoading());

    it('300ms 미만 작업은 오버레이를 표시하지 않음 (플리커 방지)', async () => {
        showGlobalLoading('테스트');
        await tick(50);
        hideGlobalLoading();
        await tick(400);
        expect(el('global-loading-overlay').classList.contains('is-visible')).toBe(false);
    });

    it('300ms 초과 작업은 오버레이 표시 → hide 시 제거', async () => {
        showGlobalLoading('테스트');
        await tick(350);
        expect(el('global-loading-overlay').classList.contains('is-visible')).toBe(true);
        hideGlobalLoading();
        expect(el('global-loading-overlay').classList.contains('is-visible')).toBe(false);
    });

    it('runWithLoading — 트리거 비활성·결과 반환·정리', async () => {
        const btn = document.createElement('button');
        document.body.appendChild(btn);
        const result = await runWithLoading(async () => {
            expect(btn.disabled).toBe(true);
            expect(btn.getAttribute('aria-busy')).toBe('true');
            return 'done';
        }, { triggerEl: btn });
        expect(result).toBe('done');
        expect(btn.disabled).toBe(false);
        expect(btn.getAttribute('aria-busy')).toBeNull();
    });

    it('runWithLoading — 취소 버튼 클릭 시 AbortError', async () => {
        const p = runWithLoading((signal) => new Promise((_, rej) => {
            signal.addEventListener('abort', () => { const e = new Error('x'); e.name = 'AbortError'; rej(e); });
        }), { cancellable: true, timeoutMs: 5000 });
        await tick(350);
        document.querySelector('.global-loading-cancel')?.click();
        await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('runWithLoading — timeoutMs 초과 시 AbortError', async () => {
        await expect(runWithLoading(() => new Promise(() => {}), { timeoutMs: 50 }))
            .rejects.toMatchObject({ name: 'AbortError' });
    });
});

describe('UX-PWA-08 — 오프라인 기능 표시', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        setOfflineFeatureMode(false);
    });
    afterEach(() => setOfflineFeatureMode(false));

    it('오프라인 전환 시 대상 버튼 비활성 표시 + 사유 title', () => {
        const btn = document.createElement('button');
        btn.dataset.click = 'syncNow';
        document.body.appendChild(btn);
        initOfflineGate();
        setOfflineFeatureMode(true);

        expect(isOfflineMode()).toBe(true);
        expect(btn.getAttribute('aria-disabled')).toBe('true');
        expect(btn.classList.contains('offline-blocked')).toBe(true);
        expect(btn.title).toContain('오프라인');
    });

    it('오프라인 클릭은 차단되고 토스트로 사유 안내', () => {
        const btn = document.createElement('button');
        btn.dataset.click = 'syncNow';
        const handler = vi.fn();
        btn.addEventListener('click', handler);
        document.body.appendChild(btn);
        initOfflineGate();
        setOfflineFeatureMode(true);

        btn.click();
        expect(handler).not.toHaveBeenCalled();
        expect(el('app-toast')?.textContent).toContain('오프라인에서는 사용할 수 없습니다');
    });

    it('온라인 복귀 시 비활성 표시 해제·클릭 허용', () => {
        const btn = document.createElement('button');
        btn.dataset.click = 'syncNow';
        const handler = vi.fn();
        btn.addEventListener('click', handler);
        document.body.appendChild(btn);
        initOfflineGate();
        setOfflineFeatureMode(true);
        setOfflineFeatureMode(false);

        expect(btn.getAttribute('aria-disabled')).toBeNull();
        btn.click();
        expect(handler).toHaveBeenCalled();
    });

    it('오프라인 중 동적 추가 버튼도 자동 비활성 표시', async () => {
        initOfflineGate();
        setOfflineFeatureMode(true);
        const btn = document.createElement('button');
        btn.className = 'ai-coach-btn';
        document.body.appendChild(btn);
        await tick(20);
        expect(btn.getAttribute('aria-disabled')).toBe('true');
    });
});
