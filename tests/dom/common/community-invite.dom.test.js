// tests/dom/common/community-invite.dom.test.js — Discord 커뮤니티 초대 버튼
// @spec ES-08
// exams.json `discordInvite` 선언 시험만 설정 메뉴에 버튼 노출 — 미선언/레지스트리
// 부재 시 숨김 유지, 클릭 시 새 탭(noopener)으로 초대 URL 오픈.

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import { loadIndexHtml, el } from '../helpers.js';
import { bindAppListeners } from '../../../src/views/listeners-app.js';

const INVITE = 'https://discord.gg/test-invite';

describe('Discord 커뮤니티 초대 버튼 (ES-08)', () => {
    beforeEach(() => {
        localStorage.clear();
        loadIndexHtml();
        vi.clearAllMocks();
    });

    afterEach(() => {
        delete window.EXAMS_LIST;
        vi.restoreAllMocks();
    });

    it('discordInvite 선언 — 버튼 노출 + 클릭 시 새 탭으로 초대 URL 오픈 (H/P)', () => {
        window.EXAMS_LIST = { exams: [{ id: 'examA', name: '시험A', default: true, discordInvite: INVITE }] };
        bindAppListeners();

        const btn = el('community-btn');
        expect(btn.classList.contains('is-hidden')).toBe(false);

        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        btn.click();
        expect(openSpy).toHaveBeenCalledWith(INVITE, '_blank', 'noopener');
    });

    it('discordInvite 미선언 — 버튼 숨김 유지 (H)', () => {
        window.EXAMS_LIST = { exams: [{ id: 'examA', name: '시험A', default: true }] };
        bindAppListeners();

        expect(el('community-btn').classList.contains('is-hidden')).toBe(true);
    });

    it('레지스트리 부재(EXAMS_LIST 없음) — 버튼 숨김 유지 (E)', () => {
        bindAppListeners();

        expect(el('community-btn').classList.contains('is-hidden')).toBe(true);
    });
});
