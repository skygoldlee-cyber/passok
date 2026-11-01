// tests/dom/exams/carework/care-views.test.js — carework 실무 뷰 커버리지
// @spec none — 시험 전용 실무 뷰 DOM 계약 (DA-13)
// 목적: carework 5개 실무 뷰의 핵심 핸들러를 jsdom에서 실행해 DOM 반영과
//       커버리지 임계(함수·라인)를 고정한다 — 실마크업 파셜을 주입해 사용한다.
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('../../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
}));
vi.mock('../../../../src/auth-sync/supabase-client.js', () => ({
    getAuthSession: vi.fn(() => Promise.resolve({ session: null })),
    getSupabase: vi.fn(() => Promise.resolve({})),
    onAuthChange: vi.fn(),
}));
vi.mock('../../../../src/pro/pro-upgrade.js', () => ({
    proFeatureNotice: vi.fn(() => false),
    hasProEntitlement: vi.fn(() => false),
    refreshProBadges: vi.fn(),
}));

import { careCalcRun, careCalcReset } from '../../../../src/exams/carework/views/care-calc.js';
import { careCardOpen, careCardClose, initCareCardView } from '../../../../src/exams/carework/views/care-card.js';
import { careLogGenerate, careLogCopy, initCareLogView } from '../../../../src/exams/carework/views/care-log.js';
import { careAuditReset, initCareAuditView } from '../../../../src/exams/carework/views/care-audit.js';
import { careHandoverGenerate, careHandoverSave, careHandoverCopy, careHandoverShare, initCareHandoverView } from '../../../../src/exams/carework/views/care-handover.js';
import { initFacilityJoinView } from '../../../../src/exams/carework/views/facility-join.js';
import { syncFacilityNav } from '../../../../src/exams/carework/facility.js';
import { ManualViewer } from '../../../../src/reader/manual-viewer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const loadPartial = (rel) => {
    document.body.innerHTML = readFileSync(join(ROOT, 'html', 'exams', 'carework', rel), 'utf-8');
};

describe('carework 실무 뷰 — 마크업↔핸들러 계약', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('careCalc — 계산 후 결과 카드 렌더', () => {
        loadPartial('care-calc.html');
        document.getElementById('care-grade').value = '1';
        document.getElementById('care-type').value = 'home';
        document.getElementById('care-use').value = '20';
        careCalcRun();
        expect(document.querySelector('#care-result')?.textContent).toMatch(/원/);
        careCalcReset();
    });

    it('careCard — 목록→상세→복귀', async () => {
        loadPartial('care-card.html');
        await initCareCardView();
        const btn = document.querySelector('.care-card-item');
        if (btn) careCardOpen({ currentTarget: btn });
        careCardClose();
        expect(document.getElementById('care-card-list')).toBeTruthy();
    });

    it('careLog — 초기화 후 생성·복사', () => {
        loadPartial('care-log.html');
        initCareLogView();
        document.getElementById('log-date').value = '2026-11-01';
        document.getElementById('log-client').value = '김○○';
        document.getElementById('log-service').value = 'visit-care';
        careLogGenerate();
        expect(document.querySelector('#log-preview pre')?.textContent).toMatch(/김○○/);
        careLogCopy();
    });

    it('careAudit — 로드 후 점검 초기화', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        careAuditReset();
        expect(document.getElementById('audit-list')).toBeTruthy();
    });

    it('careHandover — 생성·복사·공유 핸들러', () => {
        loadPartial('care-handover.html');
        initCareHandoverView();
        document.getElementById('ho-date').value = '2026-11-01';
        document.getElementById('ho-from').value = '김○○';
        document.getElementById('ho-to').value = '박○○';
        careHandoverGenerate();
        expect(document.querySelector('#ho-preview pre')?.textContent).toMatch(/인수인계서/);
        careHandoverShare(); // 미저장 상태 — 차단 토스트 (기록 우선 규칙)
        careHandoverSave();
        expect(document.getElementById('ho-saved')?.textContent).toMatch(/김○○/);
        careHandoverCopy();
        careHandoverShare(); // 저장 후 — 공유 진행
    });

    // @spec DA-18 — 권한 뷰 분리: facility-join은 클라이언트 뷰로 비로그인/비권한 시 안내만 표시
    it('careFacility — 미로그인 시 로그인 안내 렌더', async () => {
        loadPartial('facility-join.html');
        initFacilityJoinView();
        await new Promise(r => setTimeout(r, 0));
        expect(document.getElementById('facility-join-body')?.textContent).toMatch(/로그인/);
    });

    it('실무매뉴얼 — ManualViewer.openPracticeManual 뷰어 연결', () => {
        expect(typeof ManualViewer.openPracticeManual).toBe('function');
    });

    it('syncFacilityNav — manager만 기관관리 메뉴 표시 (DA-18 보안 기본값)', () => {
        document.body.innerHTML = '<button data-target="facility-admin-view" class="is-hidden"></button>';
        syncFacilityNav({ role: 'manager' });
        expect(document.querySelector('button').classList.contains('is-hidden')).toBe(false);
        syncFacilityNav({ role: 'worker' });
        expect(document.querySelector('button').classList.contains('is-hidden')).toBe(true);
        syncFacilityNav(null);
        expect(document.querySelector('button').classList.contains('is-hidden')).toBe(true);
    });

    // @spec DA-21 — select option 테마 강제: carework 폼의 option에도 다크 토큰 규칙 존재
    it('select option 다크 규칙 — .care-calc-form select option 테마 토큰 적용 (DA-21)', async () => {
        const { readFileSync } = await import('node:fs');
        const css = readFileSync('css/exams/carework/care-tools.css', 'utf-8');
        expect(css).toContain('.care-calc-form select option');
        expect(css).toContain('--bg-sidebar');
        expect(css).toContain('--color-text-main');
    });

});
